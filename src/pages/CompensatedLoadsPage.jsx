import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, CheckCircle2, Clock, Clock3, Download, Eye, FileCheck2, FileSpreadsheet, FileUp, PackageCheck, PackageSearch, Paperclip, Search, TrendingUp, Truck, Upload, User, UserCheck, Wallet, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  getCompensatedLoadRegistry,
  getRecoveredCompensatedLoads,
  importCompensatedLoadRegistry,
  subscribeToOtkData,
  updateCompensatedRecoveryWorkflow,
} from '../services/localData';
import {
  downloadCompensatedLoadsTemplate104,
  parseCompensatedLoadsWorkbook,
} from '../services/excelImport';
import TrackDetailModal from '../components/TrackDetailModal';
import { useAuthStore } from '../store/authStore';
import { useT, useValueLabel } from '../i18n';

const STATUS_STYLE = {
  Yopildi: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  Jarayonda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  "Moliyaga yo'naltirildi": 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
};

const PAYMENT_STATUS_ORDER = ["To'langan", 'Kutmoqda', 'Tasdiqlangan', 'Rad etilgan'];
const FOUND_CASE_OUTCOME_OPTIONS = ["Mijoz pulni qaytardi", 'Musodara'];
const FOUND_CASE_STATUS_OPTIONS = ['Qabul qilindi', 'Jarayonda', 'Yopildi'];
const PAYMENT_STATUS_STYLE = {
  "To'langan": 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  Kutmoqda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  Tasdiqlangan: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  'Rad etilgan': 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
};
const FOUND_CASE_STATUS_STYLE = {
  'Qabul qilindi': 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  Jarayonda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  Yopildi: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
};

export default function CompensatedLoadsPage() {
  const t = useT();
  const valueLabel = useValueLabel();
  const { user } = useAuthStore();
  const [items, setItems] = useState(() => getRecoveredCompensatedLoads());
  const [registry, setRegistry] = useState(() => getCompensatedLoadRegistry());
  const [search, setSearch] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [lastImportReport, setLastImportReport] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Kutmoqda');
  const [openTrackCode, setOpenTrackCode] = useState(null);
  const [exportingFound, setExportingFound] = useState(false);
  // CRM-104 yuqori bo'lim filterlari
  const [crmTab, setCrmTab] = useState('all'); // all | Kutmoqda | Tasdiqlangan | To'langan | Rad etilgan
  const [crmJavobgar, setCrmJavobgar] = useState('all');
  const [crmBaraka, setCrmBaraka] = useState('all');
  // Yangi: Topilgan yuklar fiksatsiyasi UI state
  const [workflowFilter, setWorkflowFilter] = useState('all'); // all | accepted | inProgress | closed | mine
  const [workflowSearch, setWorkflowSearch] = useState('');
  const [workflowSort, setWorkflowSort] = useState('newest'); // newest | oldest | amountHigh | daysLong
  const fileInputRef = useRef(null);
  const receiptFileInputRef = useRef(null);
  const pendingReceiptTrackRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      setItems(getRecoveredCompensatedLoads());
      setRegistry(getCompensatedLoadRegistry());
    };

    return subscribeToOtkData(sync, { debounceMs: 70 });
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        item.trackCode,
        item.department,
        item.requestSource,
        item.handledBy,
        item.status,
        item.customer,
        item.phone,
        item.paymentAmount,
        item.paymentStatus,
        item.compensationComment,
        item.foundComment,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [items, search]);

  const groupedItems = useMemo(() => (
    PAYMENT_STATUS_ORDER.map((status) => ({
      status,
      foundItems: filteredItems.filter((item) => resolvePaymentStatus(item.paymentStatus) === status),
      totalItems: registry.filter((item) => resolvePaymentStatus(item.paymentStatus) === status),
    }))
  ), [filteredItems, registry]);

  // ============================================================
  // CRM-104 yuqori bo'limi: KPI hisoblar, tab counts, filterlar
  // ============================================================
  const crmTotals = useMemo(() => {
    let total = 0, paid = 0, pending = 0;
    let paidCount = 0, pendingCount = 0, approvedCount = 0, rejectedCount = 0;
    registry.forEach((item) => {
      const amount = Number(item.paymentAmount) || 0;
      const status = resolvePaymentStatus(item.paymentStatus);
      total += amount;
      if (status === "To'langan") { paid += amount; paidCount += 1; }
      else if (status === 'Kutmoqda') { pending += amount; pendingCount += 1; }
      else if (status === 'Tasdiqlangan') { approvedCount += 1; }
      else if (status === 'Rad etilgan') { rejectedCount += 1; }
    });
    return {
      totalSum: total,
      paidSum: paid,
      pendingSum: pending,
      paidCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      paymentRate: registry.length > 0 ? (paidCount / registry.length) * 100 : 0,
    };
  }, [registry]);

  const crmJavobgarOptions = useMemo(() => {
    const set = new Set();
    registry.forEach((item) => { if (item.javobgar) set.add(item.javobgar); });
    return Array.from(set).sort();
  }, [registry]);

  const crmBarakaOptions = useMemo(() => {
    const set = new Set();
    registry.forEach((item) => { if (item.barakaStatus) set.add(item.barakaStatus); });
    return Array.from(set).sort();
  }, [registry]);

  const crmFilteredRegistry = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registry.filter((item) => {
      const status = resolvePaymentStatus(item.paymentStatus);
      if (crmTab !== 'all' && status !== crmTab) return false;
      if (crmJavobgar !== 'all' && item.javobgar !== crmJavobgar) return false;
      if (crmBaraka !== 'all' && item.barakaStatus !== crmBaraka) return false;
      if (!q) return true;
      return [item.trackCode, item.customer, item.phone, item.javobgar, item.barakaStatus, item.comment]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [registry, crmTab, crmJavobgar, crmBaraka, search]);

  const crmFilterSum = useMemo(() => {
    return crmFilteredRegistry.reduce((acc, item) => acc + (Number(item.paymentAmount) || 0), 0);
  }, [crmFilteredRegistry]);

  const searchQuery = search.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];

    const foundByTrack = new Map(items.map((item) => [String(item.trackCode || '').trim().toLowerCase(), item]));

    return registry
      .map((entry) => ({
        ...entry,
        foundItem: foundByTrack.get(String(entry.trackCode || '').trim().toLowerCase()) || null,
      }))
      .filter((entry) =>
        [
          entry.trackCode,
          entry.phone,
          entry.customer,
          entry.paymentStatus,
          entry.paymentAmount,
          entry.comment,
          entry.foundItem?.department,
          entry.foundItem?.handledBy,
          entry.foundItem?.foundComment,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchQuery))
      );
  }, [items, registry, searchQuery]);

  const selectedGroup = useMemo(
    () => groupedItems.find((group) => group.status === selectedStatus) || groupedItems[0] || { status: selectedStatus, totalItems: [], foundItems: [] },
    [groupedItems, selectedStatus]
  );

  const recoveredWorkflowSummary = useMemo(() => {
    const itemsInWorkflow = filteredItems;
    const accepted = itemsInWorkflow.filter((item) => resolveFoundCaseStatus(item.foundResolutionStatus) === 'Qabul qilindi').length;
    const inProgress = itemsInWorkflow.filter((item) => resolveFoundCaseStatus(item.foundResolutionStatus) === 'Jarayonda').length;
    const closed = itemsInWorkflow.filter((item) => resolveFoundCaseStatus(item.foundResolutionStatus) === 'Yopildi').length;

    return {
      total: itemsInWorkflow.length,
      accepted,
      inProgress,
      closed,
    };
  }, [filteredItems]);

  // Card-based view uchun filtered + sorted items
  const userNamesLower = useMemo(
    () => [user?.full_name, user?.username].filter(Boolean).map((v) => String(v).trim().toLowerCase()),
    [user]
  );
  const displayedWorkflowItems = useMemo(() => {
    const q = workflowSearch.trim().toLowerCase();
    let list = filteredItems.filter((item) => {
      const status = resolveFoundCaseStatus(item.foundResolutionStatus);
      if (workflowFilter === 'accepted' && status !== 'Qabul qilindi') return false;
      if (workflowFilter === 'inProgress' && status !== 'Jarayonda') return false;
      if (workflowFilter === 'closed' && status !== 'Yopildi') return false;
      if (workflowFilter === 'mine') {
        const ownerMatch =
          (user?.id != null && item.assignedToId != null && String(item.assignedToId) === String(user.id)) ||
          userNamesLower.includes(String(item.assignedTo || '').trim().toLowerCase());
        if (!ownerMatch) return false;
      }
      if (q) {
        const haystack = [item.trackCode, item.customer, item.phone, item.department, item.requestSource, item.assignedTo, item.foundCaseOutcome, item.workflowComment]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(' ');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    switch (workflowSort) {
      case 'oldest':
        list = [...list].sort((a, b) => new Date(a.foundDate || 0) - new Date(b.foundDate || 0));
        break;
      case 'amountHigh':
        list = [...list].sort((a, b) => (Number(b.paymentAmount) || 0) - (Number(a.paymentAmount) || 0));
        break;
      case 'daysLong':
        list = [...list].sort((a, b) => (b.recoveredDays || 0) - (a.recoveredDays || 0));
        break;
      case 'newest':
      default:
        list = [...list].sort((a, b) => new Date(b.foundDate || 0) - new Date(a.foundDate || 0));
        break;
    }
    return list;
  }, [filteredItems, workflowFilter, workflowSearch, workflowSort, user, userNamesLower]);

  const mineCount = useMemo(() => {
    return filteredItems.filter((item) => {
      return (user?.id != null && item.assignedToId != null && String(item.assignedToId) === String(user.id)) ||
        userNamesLower.includes(String(item.assignedTo || '').trim().toLowerCase());
    }).length;
  }, [filteredItems, user, userNamesLower]);

  const takeOwnership = (trackCode) => {
    const assigneeName = (user?.full_name || user?.username || '').trim();
    if (!assigneeName) {
      toast.error("Hisobingiz aniqlanmadi. Iltimos qaytadan kiring.");
      return;
    }
    if (!trackCode) {
      toast.error("Trek raqami yo'q");
      return;
    }
    try {
      const result = updateCompensatedRecoveryWorkflow(
        trackCode,
        {
          assignedTo: assigneeName,
          assignedToId: user?.id ?? null,
          assignedAt: new Date().toISOString(),
          foundResolutionStatus: 'Jarayonda',
        },
        { actor: user }
      );
      if (result.ok) {
        setItems(getRecoveredCompensatedLoads());
        setRegistry(getCompensatedLoadRegistry());
        toast.success(`Yuk ${assigneeName} hisobingizga o'tdi → Jarayondagi murojaatlar`);
      } else {
        toast.error(result.reason === 'invalid_track' ? "Trek raqami noto'g'ri" : "Saqlanmadi");
      }
    } catch (error) {
      console.error('takeOwnership failed', error);
      toast.error("Olishda xato");
    }
  };

  useEffect(() => {
    if (!PAYMENT_STATUS_ORDER.includes(selectedStatus)) {
      setSelectedStatus('Kutmoqda');
      return;
    }

    const exists = groupedItems.some((group) => group.status === selectedStatus);
    if (!exists && groupedItems[0]) {
      setSelectedStatus(groupedItems[0].status);
    }
  }, [groupedItems, selectedStatus]);

  const summary = useMemo(() => {
    const active = items.filter((item) => item.status !== 'Yopildi').length;
    const avgDaysSource = items.filter((item) => typeof item.recoveredDays === 'number');
    const avgDays = avgDaysSource.length
      ? Math.round((avgDaysSource.reduce((sum, item) => sum + item.recoveredDays, 0) / avgDaysSource.length) * 10) / 10
      : 0;
    const paymentTotal = items.reduce((sum, item) => sum + normalizeMoney(item.paymentAmount), 0);
    const paymentCounts = Object.fromEntries(PAYMENT_STATUS_ORDER.map((status) => [status, 0]));

    registry.forEach((item) => {
      const status = resolvePaymentStatus(item.paymentStatus);
      paymentCounts[status] += 1;
    });

    return {
      total: items.length,
      active,
      avgDays,
      paymentTotal,
      registryTotal: registry.length,
      paymentCounts,
    };
  }, [items, registry]);

  const importPreviewSummary = useMemo(() => {
    const rows = importPreview?.entries || [];
    return {
      total: rows.length,
      paymentTotal: rows.reduce((sum, row) => sum + normalizeMoney(row.paymentAmount), 0),
    };
  }, [importPreview]);

  const openImportPicker = () => {
    setImportModalOpen(true);
    window.setTimeout(() => fileInputRef.current?.click(), 60);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const parsed = await parseCompensatedLoadsWorkbook(file);
      setImportPreview(parsed);
    } catch (error) {
      console.error('Compensated loads import read failed', error);
      toast.error(t('importFailed'));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const applyImport = () => {
    if (!importPreview?.entries?.length) {
      toast.error(t('chooseExcelFile'));
      return;
    }

    try {
      const result = importCompensatedLoadRegistry(importPreview.entries, { actor: user });
      setItems(getRecoveredCompensatedLoads());
      setRegistry(getCompensatedLoadRegistry());
      setLastImportReport({
        ...result,
        fileName: importPreview.fileName,
        appliedAt: new Date().toISOString(),
      });
      setImportModalOpen(false);
      setImportPreview(null);
      toast.success(`${result.inserted} ${t('added')}${result.updated ? `, ${result.updated} ${t('updated')}` : ''}.`);
    } catch (error) {
      console.error('Compensated loads import apply failed', error);
      toast.error(t('importApplyFailed'));
    }
  };

  const updateRecoveredWorkflowField = (trackCode, field, value) => {
    try {
      const result = updateCompensatedRecoveryWorkflow(trackCode, { [field]: value }, { actor: user });
      if (!result.ok) {
        toast.error(t('saveFailed'));
        return;
      }
      setItems(getRecoveredCompensatedLoads());
      setRegistry(getCompensatedLoadRegistry());
      toast.success(t('profileSaved'));
    } catch (error) {
      console.error('Compensated recovery workflow update failed', error);
      toast.error(t('saveFailed'));
    }
  };

  // ============== Chek (receipt) yuklash ==============
  const openReceiptPicker = (trackCode) => {
    pendingReceiptTrackRef.current = trackCode;
    if (receiptFileInputRef.current) {
      receiptFileInputRef.current.value = '';
      receiptFileInputRef.current.click();
    }
  };

  const handleReceiptFileChange = async (event) => {
    const file = event.target.files?.[0];
    const trackCode = pendingReceiptTrackRef.current;
    pendingReceiptTrackRef.current = null;
    if (!file || !trackCode) return;

    // 5 MB chegara — localStorage'ni to'ldirib yubormaslik uchun
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fayl hajmi 5 MB dan oshmasligi kerak");
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const receiptFile = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      const result = updateCompensatedRecoveryWorkflow(trackCode, { receiptFile }, { actor: user });
      if (!result.ok) {
        toast.error("Chek saqlanmadi");
        return;
      }
      setItems(getRecoveredCompensatedLoads());
      setRegistry(getCompensatedLoadRegistry());
      toast.success(`Chek yuklandi: ${file.name}`);
    } catch (error) {
      console.error('Receipt upload failed', error);
      toast.error("Chekni o'qib bo'lmadi");
    }
  };

  const removeReceipt = (trackCode) => {
    try {
      const result = updateCompensatedRecoveryWorkflow(trackCode, { receiptFile: null }, { actor: user });
      if (!result.ok) {
        toast.error("Chek o'chmadi");
        return;
      }
      setItems(getRecoveredCompensatedLoads());
      setRegistry(getCompensatedLoadRegistry());
      toast.success("Chek o'chirildi");
    } catch (error) {
      console.error('Receipt remove failed', error);
      toast.error("Chek o'chmadi");
    }
  };

  // ============== Topilgan yuklar — Excel export ==============
  const exportFoundExcel = async () => {
    if (!filteredItems.length) {
      toast.error("Eksport uchun ma'lumot yo'q");
      return;
    }
    setExportingFound(true);
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'Trek',
        'Mijoz',
        "To'lov summasi",
        'Topilgan sana',
        'Kun (recovered)',
        "Bo'lim",
        'Manba',
        'Kim oldi',
        'Natija',
        'Status',
        'Chek',
      ];
      const rows = filteredItems.map((item) => [
        item.trackCode,
        item.customer || '',
        item.paymentAmount || '',
        item.foundDate ? format(new Date(item.foundDate), 'yyyy-MM-dd HH:mm') : '',
        item.recoveredDays ?? '',
        item.department || '',
        item.requestSource || '',
        item.handledBy || '',
        item.foundCaseOutcome || '',
        item.foundResolutionStatus || 'Jarayonda',
        item.receiptFile?.name || '',
      ]);
      const aoa = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [
        { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 10 },
        { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Topilgan yuklar');
      const fileName = `Topilgan_yuklar_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`${rows.length} ta yozuv eksport qilindi`);
    } catch (error) {
      console.error('Found loads export failed', error);
      toast.error('Excel eksport amalga oshmadi');
    } finally {
      setExportingFound(false);
    }
  };

  const exportExcel = () => {
    const headers = [
      t('track'),
      t('compensatedAt'),
      t('foundAt'),
      t('recoveredAfter'),
      t('department'),
      t('source'),
      t('takenBy'),
      t('customer'),
      t('phone'),
      t('paymentAmount'),
      "To'lov holati",
      t('status'),
      t('compensationNote'),
      t('foundNote'),
    ];

    const rows = filteredItems.map((item) => [
      item.trackCode,
      formatDate(item.compensationDate),
      formatDate(item.foundDate),
      `${item.recoveredDays ?? 0} ${t('days')}`,
      item.department,
      item.requestSource,
      item.handledBy || '-',
      item.customer || '-',
      item.phone || '-',
      formatMoney(item.paymentAmount),
      resolvePaymentStatus(item.paymentStatus),
      valueLabel(item.status),
      item.compensationComment || '-',
      item.foundComment || '-',
    ]);

    const tableRows = [headers, ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body><table border="1">${tableRows}</table></body>
      </html>
    `;
    const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `qoplab-berilgan-yuklar_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* ====== 1. HEADER — icon + title + Real CRM data badge + actions ====== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <Wallet size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">{t('compensatedLoads')}</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              CRM-104 ma'lumotlari · <b>{registry.length}</b> yozuv · <b>{formatMoney(crmTotals.totalSum)}</b>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
            ● Real CRM data
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={openImportPicker}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
            >
              <Upload size={13} />
              Import
            </button>
            <button
              type="button"
              onClick={async () => {
                try { await downloadCompensatedLoadsTemplate104(); }
                catch (error) { console.error(error); toast.error(t('importFailed')); }
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download size={13} />
              Shablon
            </button>
            <button
              type="button"
              onClick={exportExcel}
              disabled={!filteredItems.length}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <FileSpreadsheet size={13} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* ====== 2. KPI CARDS — 4 ta katta karta ====== */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="JAMI SUMMA"
          value={formatMoney(crmTotals.totalSum)}
          sub={`${registry.length} ta yozuv`}
          tone="slate"
        />
        <KpiCard
          icon={CheckCircle2}
          label="TO'LANGAN"
          value={formatMoney(crmTotals.paidSum)}
          sub={`↗ ${crmTotals.paymentRate.toFixed(1)}% to'lov foizi`}
          tone="emerald"
        />
        <KpiCard
          icon={Clock}
          label="KUTMOQDA"
          value={formatMoney(crmTotals.pendingSum)}
          sub={`${crmTotals.pendingCount} ta`}
          tone="amber"
        />
        <KpiCard
          icon={TrendingUp}
          label="TO'LOV TEZLIGI"
          value={`${crmTotals.paymentRate.toFixed(1)}%`}
          tone="blue"
        />
      </div>

      {/* ====== 3. FILTER BAR — tabs + search ====== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
            <CrmTab label="Barchasi" count={registry.length} active={crmTab === 'all'} onClick={() => setCrmTab('all')} />
            <CrmTab label="Kutmoqda" count={crmTotals.pendingCount} active={crmTab === 'Kutmoqda'} onClick={() => setCrmTab('Kutmoqda')} />
            <CrmTab label="Tasdiqlangan" count={crmTotals.approvedCount} active={crmTab === 'Tasdiqlangan'} onClick={() => setCrmTab('Tasdiqlangan')} />
            <CrmTab label="To'langan" count={crmTotals.paidCount} active={crmTab === "To'langan"} onClick={() => setCrmTab("To'langan")} />
            <CrmTab label="Rad etilgan" count={crmTotals.rejectedCount} active={crmTab === 'Rad etilgan'} onClick={() => setCrmTab('Rad etilgan')} />
          </div>

          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Trek, telefon, mijoz..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={crmJavobgar}
            onChange={(event) => setCrmJavobgar(event.target.value)}
            className={clsx(
              'rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium outline-none transition focus:ring-2 dark:bg-slate-950',
              crmJavobgar !== 'all'
                ? 'border-emerald-300 ring-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
                : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            )}
          >
            <option value="all">Barcha javobgarlar</option>
            {crmJavobgarOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <select
            value={crmBaraka}
            onChange={(event) => setCrmBaraka(event.target.value)}
            className={clsx(
              'rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium outline-none transition focus:ring-2 dark:bg-slate-950',
              crmBaraka !== 'all'
                ? 'border-emerald-300 ring-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300'
                : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            )}
          >
            <option value="all">Barcha Baraka holatlari</option>
            {crmBarakaOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            Filtr summa: <b className="text-emerald-700 dark:text-emerald-300">{formatMoney(crmFilterSum)}</b>
          </span>
        </div>
      </div>

      {/* ====== 4. CRM TABLE ====== */}
      <CrmRegistryTable
        items={crmFilteredRegistry}
        onOpenTrack={setOpenTrackCode}
      />

      {/* Import natijasi (conditional) */}
      {lastImportReport && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-slate-900 dark:to-sky-500/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-2xl bg-emerald-500 p-2.5 text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('importResult')}</h2>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{lastImportReport.fileName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('completedAt')}: {format(new Date(lastImportReport.appliedAt), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastImportReport(null)}
              className="self-start rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={t('close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ImportReportStat label={t('rowsProcessed')} value={lastImportReport.total} tone="slate" />
            <ImportReportStat label={t('newRows')} value={lastImportReport.inserted} tone="emerald" />
            <ImportReportStat label={t('updatedRows')} value={lastImportReport.updated} tone="blue" />
          </div>
        </div>
      )}

      {/* Eski max-w-2xl search bar va groupedItems olib tashlandi — yangi CRM dizayn tepada */}
      {false && (<>
      <div className="max-w-2xl">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('searchCompensatedLoads')}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={t('clear')}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {searchQuery ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Qidiruv natijasi</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Trek, telefon, ism yoki familiya bo'yicha topilgan yozuvlar.</p>
          </div>
          {!searchResults.length ? (
            <div className="px-4 py-10 text-sm text-slate-400">Qidiruv bo'yicha ma'lumot topilmadi.</div>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Trek</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mijoz</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Telefon</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">To'lov holati</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">To'lov summasi</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Qoplab berilgan sana</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Topilgan sana</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Bo'lim</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Kim oldi</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Izoh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((item) => (
                    <tr key={`${item.id}-${item.trackCode}`} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-slate-950 dark:text-white">
                        {item.foundItem ? (
                          <Link to={`/complaints/${item.foundItem.id}`} className="text-slate-950 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-300">
                            {item.trackCode}
                          </Link>
                        ) : item.trackCode}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.customer || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.phone || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', PAYMENT_STATUS_STYLE[resolvePaymentStatus(item.paymentStatus)])}>
                          {resolvePaymentStatus(item.paymentStatus)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatMoney(item.paymentAmount)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(item.compensatedDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(item.foundItem?.foundDate)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.foundItem?.department || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.foundItem?.handledBy || '-'}</td>
                      <td className="min-w-[320px] px-4 py-3 text-slate-500 dark:text-slate-400">
                        <div className="space-y-1">
                          <p>{item.comment || '-'}</p>
                          {item.foundItem?.foundComment ? <p>{item.foundItem.foundComment}</p> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {filteredItems.length === 0 && registry.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-16 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <PackageSearch size={38} className="mx-auto mb-3 opacity-40" />
          <p>{t('noCompensatedLoads')}</p>
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Moliyaga yo'naltirilgan yuklar bo'limi</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">To'lov holati bo'yicha nazorat</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {groupedItems.map((group) => (
              <StatusSelectorCard
                key={group.status}
                status={group.status}
                total={group.totalItems.length}
                found={group.foundItems.length}
                active={selectedGroup.status === group.status}
                onClick={() => setSelectedStatus(group.status)}
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <SubTableCard title="Umumiy treklar" count={selectedGroup.totalItems.length}>
              <RegistryStatusTable items={selectedGroup.totalItems} />
            </SubTableCard>
            <SubTableCard title="Topilgan treklar" count={selectedGroup.foundItems.length}>
              <FoundStatusTable items={selectedGroup.foundItems} t={t} valueLabel={valueLabel} />
            </SubTableCard>
          </div>
        </section>
      )}
      </>)}{/* /false && — eski blok */}

      {/* ============================================================
          TOPILGAN YUKLAR FIKSATSIYASI — kompakt + block tizimi
          Pool (Qabul qilindi) — bu yerda "Men olaman" ko'rinadi.
          Jarayonda — band sifatida ko'rinadi, edit faqat MyInProgress'da.
          Yopildi — read-only xulosa.
          ============================================================ */}
      <section className="space-y-3">
        {/* KOMPAKT HEADER: title + KPI + search bir qatorda */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PackageCheck size={18} className="shrink-0 text-emerald-500" />
                <h2 className="truncate text-base font-bold text-slate-950 dark:text-white">
                  Topilgan yuklar fiksatsiyasi
                </h2>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {recoveredWorkflowSummary.total}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Pool dan oling → jarayonga oling → yoping. Bir yuk bilan bitta hodim ishlaydi.
              </p>
            </div>

            {/* Mini KPI chiplar */}
            <div className="flex flex-wrap items-center gap-1.5">
              <MiniChip label="Pool" value={recoveredWorkflowSummary.accepted} tone="sky" active={workflowFilter === 'accepted'} onClick={() => setWorkflowFilter(workflowFilter === 'accepted' ? 'all' : 'accepted')} />
              <MiniChip label="Jarayonda" value={recoveredWorkflowSummary.inProgress} tone="amber" active={workflowFilter === 'inProgress'} onClick={() => setWorkflowFilter(workflowFilter === 'inProgress' ? 'all' : 'inProgress')} />
              <MiniChip label="Yopildi" value={recoveredWorkflowSummary.closed} tone="emerald" active={workflowFilter === 'closed'} onClick={() => setWorkflowFilter(workflowFilter === 'closed' ? 'all' : 'closed')} />
              <MiniChip label="Meniki" value={mineCount} tone="blue" active={workflowFilter === 'mine'} onClick={() => setWorkflowFilter(workflowFilter === 'mine' ? 'all' : 'mine')} />
              {workflowFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setWorkflowFilter('all')}
                  className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  title="Filtr tozalash"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={exportFoundExcel}
              disabled={exportingFound || !filteredItems.length}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              title="Excel'ga yuklab olish"
            >
              <FileSpreadsheet size={13} />
              Excel
            </button>
          </div>

          {/* Search + sort qatori — kompakt */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={workflowSearch}
                onChange={(event) => setWorkflowSearch(event.target.value)}
                placeholder="Qidirish: trek, mijoz, telefon..."
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              {workflowSearch && (
                <button
                  type="button"
                  onClick={() => setWorkflowSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              value={workflowSort}
              onChange={(event) => setWorkflowSort(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="newest">↓ Yangi</option>
              <option value="oldest">↑ Eski</option>
              <option value="amountHigh">$ Yuqori</option>
              <option value="daysLong">⏱ Ko'p kun</option>
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {displayedWorkflowItems.length} ta
            </span>
          </div>
        </div>

        {/* Cards grid — kompakt */}
        {!displayedWorkflowItems.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <PackageSearch size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {filteredItems.length === 0
                ? "Topilgan yuk yo'q"
                : "Filtr bo'yicha topilmadi"}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filteredItems.length === 0
                ? "Yangi topilgan yuklar shu yerda paydo bo'ladi"
                : "Filtr yoki qidiruvni o'zgartiring"}
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {displayedWorkflowItems.map((item) => {
              const isMine =
                (user?.id != null && item.assignedToId != null && String(item.assignedToId) === String(user.id)) ||
                userNamesLower.includes(String(item.assignedTo || '').trim().toLowerCase());
              return (
                <WorkflowCard
                  key={item.id}
                  item={item}
                  isMine={isMine}
                  onView={() => setOpenTrackCode(item.trackCode)}
                  onTake={() => takeOwnership(item.trackCode)}
                />
              );
            })}
          </div>
        )}
      </section>

      {importModalOpen && (
        <div className="fixed inset-0 z-[550] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('importExcel')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('compensatedImportDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview(null);
                }}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
              />

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {importPreview?.fileName || 'CRM_104_IMPORT_TEMPLATE.xlsx'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {importPreview ? `${importPreview.totalRows} ${t('rowsProcessed')}` : t('compensatedImportDescription')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload size={16} />
                  {importing ? t('loading') : t('chooseFile')}
                </button>
              </div>

              {importPreview && (
                <div className="grid gap-3 md:grid-cols-2">
                  <ImportReportStat label={t('rowsProcessed')} value={importPreviewSummary.total} tone="slate" />
                  <ImportReportStat label={t('paymentAmount')} value={formatMoney(importPreviewSummary.paymentTotal)} tone="emerald" />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{t('importTemplate')}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('compensatedTemplateDescription')}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadCompensatedLoadsTemplate104();
                    } catch {
                      toast.error(t('importFailed'));
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Download size={16} />
                  {t('downloadTemplate')}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('preview')}</h3>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  {!importPreview ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">{t('noData')}</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('track')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('compensatedAt')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('customer')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('phone')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('paymentAmount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.preview.map((row) => (
                          <tr key={row.id}>
                            <td className="px-4 py-2.5 font-mono text-slate-950 dark:text-white">{row.trackCode}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatDate(row.compensatedDate)}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.customer || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.phone || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{formatMoney(row.paymentAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('close')}
              </button>
              <button
                type="button"
                disabled={!importPreview?.entries?.length}
                onClick={applyImport}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trek tafsilotini ko'rish uchun modal — 104 Moliya recoveryInfo bilan */}
      <TrackDetailModal
        trackCode={openTrackCode}
        open={Boolean(openTrackCode)}
        onClose={() => setOpenTrackCode(null)}
        recoveryInfo={openTrackCode ? filteredItems.find((row) => row.trackCode === openTrackCode) || null : null}
        onTakeOwnership={(trackCode) => {
          // Hodimga aniq biriktirish — status ham Jarayondaga o'tkaziladi
          try {
            const result = updateCompensatedRecoveryWorkflow(
              trackCode,
              {
                assignedTo: user?.full_name || user?.username || '',
                assignedToId: user?.id ?? null,
                assignedAt: new Date().toISOString(),
                foundResolutionStatus: 'Jarayonda',
              },
              { actor: user }
            );
            if (result.ok) {
              setItems(getRecoveredCompensatedLoads());
              setRegistry(getCompensatedLoadRegistry());
              toast.success("Yuk siz hisobingizga o'tkazildi");
            } else {
              toast.error("O'tkazib bo'lmadi");
            }
          } catch (error) {
            console.error('Take ownership failed', error);
            toast.error("O'tkazib bo'lmadi");
          }
        }}
      />

      {/* Yashirin chek file input */}
      <input
        ref={receiptFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleReceiptFileChange}
        className="hidden"
      />
    </div>
  );
}

// ============================================================
// CRM-104 KPI Card — yuqori bo'limdagi 4 ta katta karta
// ============================================================
function KpiCard({ icon: Icon, label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: { iconBg: 'from-slate-100 to-slate-200', iconColor: 'text-slate-600', text: 'text-slate-900 dark:text-white' },
    emerald: { iconBg: 'from-emerald-100 to-emerald-200', iconColor: 'text-emerald-600', text: 'text-emerald-700 dark:text-emerald-300' },
    amber: { iconBg: 'from-amber-100 to-amber-200', iconColor: 'text-amber-600', text: 'text-amber-700 dark:text-amber-300' },
    blue: { iconBg: 'from-blue-100 to-blue-200', iconColor: 'text-blue-600', text: 'text-blue-700 dark:text-blue-300' },
  };
  const palette = tones[tone] || tones.slate;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={clsx('absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-60', palette.iconBg)} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
          <div className={clsx('mt-1 text-xl font-extrabold tracking-tight', palette.text)}>{value}</div>
          {sub && (
            <div className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">{sub}</div>
          )}
        </div>
        {Icon && (
          <div className={clsx('relative shrink-0 rounded-xl bg-white/80 p-2 shadow-sm dark:bg-slate-800/80', palette.iconColor)}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CRM Tab — status tab (Barchasi/Kutmoqda/...) bilan count
// ============================================================
function CrmTab({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition',
        active
          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
      )}
    >
      <span>{label}</span>
      <span className={clsx('rounded px-1 text-[9px]', active ? 'bg-slate-100 text-slate-700 dark:bg-slate-600' : 'bg-slate-200/70 text-slate-600 dark:bg-slate-700/70')}>
        {count}
      </span>
    </button>
  );
}

// ============================================================
// CRM Registry Table — asosiy jadval (Trek/Mijoz/Telefon/Summa/...)
// ============================================================
function CrmRegistryTable({ items, onOpenTrack }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <PackageSearch size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filtr bo'yicha yozuv topilmadi</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tab yoki qidiruv so'zini o'zgartiring</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Trek</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Mijoz</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Telefon</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Summa</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">To'lov holati</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Javobgar</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Baraka</th>
              <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">104 ga kirgan</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
              const status = resolvePaymentStatus(item.paymentStatus);
              const statusStyle = PAYMENT_STATUS_STYLE[status] || PAYMENT_STATUS_STYLE.Kutmoqda;
              const barakaStatus = item.barakaStatus || '';
              const isDelivered = barakaStatus.toLowerCase().includes('deliver');
              return (
                <tr key={item.id || item.trackCode} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white">{item.trackCode}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200">{item.customer || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{item.phone || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white">
                    {item.paymentAmount ? `${formatMoney(item.paymentAmount)}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1', statusStyle)}>
                      ● {status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200">{item.javobgar || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                    {barakaStatus ? (
                      <span className={clsx('font-bold', isDelivered ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300')}>
                        {barakaStatus}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {item.enteredDate104 ? formatDate(item.enteredDate104) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenTrack(item.trackCode)}
                      title="Tafsilot"
                      className="rounded-md p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Workflow Card — Kompakt + block tizimi
// Pool (Qabul qilindi): "Men olaman" tugmasi prominent
// Jarayonda: BAND — egasi nomi, edit faqat MyInProgress'da
// Yopildi: yakuniy xulosa, read-only
// ============================================================
function WorkflowCard({ item, isMine, onView, onTake }) {
  const status = item.foundResolutionStatus || 'Qabul qilindi';
  const isAccepted = status === 'Qabul qilindi';
  const isInProgress = status === 'Jarayonda';
  const isClosed = status === 'Yopildi';

  const theme = isClosed
    ? {
        border: 'border-emerald-200 dark:border-emerald-500/30',
        accent: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
        label: 'Yopildi',
      }
    : isInProgress
      ? {
          border: 'border-amber-200 dark:border-amber-500/30',
          accent: 'bg-amber-500',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
          label: 'Band',
        }
      : {
          border: 'border-sky-200 dark:border-sky-500/30',
          accent: 'bg-sky-500',
          badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
          label: 'Bo\'sh',
        };

  return (
    <article
      className={clsx(
        'relative flex flex-col gap-2 rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-slate-900',
        theme.border,
        isMine && 'ring-2 ring-blue-400 dark:ring-blue-500/40',
        isInProgress && !isMine && 'opacity-80'
      )}
    >
      {/* Accent strip */}
      <div className={clsx('absolute left-0 top-0 h-full w-1 rounded-l-xl', theme.accent)} />

      {/* Row 1: status badge + eye + trek */}
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <button
          type="button"
          onClick={onView}
          className="group inline-flex min-w-0 items-center gap-1.5"
          title="Tafsilot"
        >
          <Eye size={13} className="shrink-0 text-slate-400 transition group-hover:text-blue-600" />
          <span className="truncate font-mono text-xs font-bold text-slate-900 transition group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
            {item.trackCode}
          </span>
        </button>
        <span className={clsx('shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider', theme.badge)}>
          ● {theme.label}
        </span>
      </div>

      {/* Row 2: customer (small) */}
      {item.customer && (
        <div className="truncate pl-1.5 text-xs text-slate-600 dark:text-slate-400">{item.customer}</div>
      )}

      {/* Row 3: Summa + Kun (kompakt) */}
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
          {formatMoney(item.paymentAmount)}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          <Clock3 size={10} />
          {item.recoveredDays ?? 0} kun · {item.foundDate ? formatDate(item.foundDate) : '—'}
        </span>
      </div>

      {/* Pastki blok — statusga qarab */}
      {isAccepted ? (
        // Bo'sh (Pool) — Men olaman
        <div className="mt-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          <button
            type="button"
            onClick={onTake}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            ➕ Men olaman
          </button>
        </div>
      ) : isInProgress ? (
        // Jarayonda — BAND
        <div className="mt-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5 text-[11px]">
              <User size={11} className={clsx('shrink-0', item.assignedTo ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500')} />
              {item.assignedTo ? (
                <span className="truncate font-bold text-slate-800 dark:text-slate-200" title={item.assignedTo}>
                  {item.assignedTo}
                </span>
              ) : (
                <span className="truncate italic text-rose-500" title="Egasi yo'q — buzuq ma'lumot">
                  egasi yo'q
                </span>
              )}
            </div>
            {isMine ? (
              <Link
                to="/my-in-progress"
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Ishlash →
              </Link>
            ) : !item.assignedTo ? (
              <button
                type="button"
                onClick={onTake}
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm transition hover:bg-blue-700"
                title="Egasi yo'q — siz olishingiz mumkin"
              >
                ➕ Olish
              </button>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" title="Boshqa hodim ishlamoqda">
                🔒 Band
              </span>
            )}
          </div>
        </div>
      ) : (
        // Yopildi — yakuniy xulosa
        <div className="mt-1 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <div className="min-w-0 flex items-center gap-1.5">
              <User size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate font-bold text-slate-700 dark:text-slate-300" title={item.assignedTo}>
                {item.assignedTo || '—'}
              </span>
            </div>
            {item.foundCaseOutcome && (
              <span className={clsx(
                'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold',
                item.foundCaseOutcome === 'Mijoz pulni qaytardi'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
              )}>
                {item.foundCaseOutcome === 'Mijoz pulni qaytardi' ? '✓ Qaytardi' : '⊘ Musodara'}
              </span>
            )}
          </div>
          {item.receiptFile && (
            <a
              href={item.receiptFile.dataUrl}
              download={item.receiptFile.name}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              <FileCheck2 size={10} /> Chek
            </a>
          )}
        </div>
      )}
    </article>
  );
}

// Mini KPI chip — header'da kompakt filter
function MiniChip({ label, value, tone = 'slate', active = false, onClick }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition hover:brightness-105',
        tones[tone] || tones.slate,
        active && 'ring-2 ring-offset-1 ring-current'
      )}
    >
      <span>{label}</span>
      <span className="rounded bg-white/60 px-1 text-[9px] dark:bg-white/10">{value}</span>
    </button>
  );
}

// Inline comment editor — jadval ichida hodim izohini yozish/yangilash
function InlineCommentEditor({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  const dirty = (draft || '').trim() !== (value || '').trim();

  const handleSave = () => {
    onSave((draft || '').trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              handleSave();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              handleCancel();
            }
          }}
          rows={3}
          placeholder="Izoh yozing: nima qilingan, mijoz bilan suhbat va h.k."
          className="w-full resize-y rounded-lg border border-blue-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-blue-500/40 dark:bg-slate-950 dark:text-slate-100"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
          >
            Saqlash
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            Bekor
          </button>
          <span className="ml-1 text-[9px] italic text-slate-400">Ctrl+Enter saqlaydi</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Izohni tahrirlash"
      className="group flex w-full items-start gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
    >
      <span className="min-w-0 flex-1 text-xs">
        {value ? (
          <span className="line-clamp-3 text-slate-700 dark:text-slate-200">{value}</span>
        ) : (
          <span className="italic text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">+ Izoh yozish…</span>
        )}
      </span>
    </button>
  );
}

// Chek (receipt) — yuklash / ko'rish / o'chirish nazorati
function ReceiptControl({ receipt, onUpload, onRemove }) {
  if (!receipt) {
    return (
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-500 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
      >
        <FileUp size={13} />
        Chek yuklash
      </button>
    );
  }

  const sizeKb = receipt.size ? Math.round(receipt.size / 1024) : 0;
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <FileCheck2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      <a
        href={receipt.dataUrl}
        download={receipt.name}
        title={receipt.name}
        className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
      >
        {receipt.name}
      </a>
      {sizeKb > 0 && (
        <span className="shrink-0 text-[10px] text-emerald-600/70 dark:text-emerald-400/70">{sizeKb} KB</span>
      )}
      <button
        type="button"
        onClick={onUpload}
        title="Almashtirish"
        className="shrink-0 rounded-md p-1 text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-500/15"
      >
        <Paperclip size={12} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        title="O'chirish"
        className="shrink-0 rounded-md p-1 text-rose-500 transition hover:bg-rose-100 dark:hover:bg-rose-500/15"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  try {
    return format(new Date(value), 'dd.MM.yyyy');
  } catch {
    return String(value || '-');
  }
}

function normalizeMoney(value) {
  if (value == null || value === '') return 0;
  const numeric = Number(String(value).replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatMoney(value) {
  const numeric = normalizeMoney(value);
  return numeric
    ? `${numeric.toLocaleString('ru-RU')} so'm`
    : '-';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function resolvePaymentStatus(value) {
  return PAYMENT_STATUS_ORDER.includes(value) ? value : 'Kutmoqda';
}

function resolveFoundCaseStatus(value) {
  return FOUND_CASE_STATUS_OPTIONS.includes(value) ? value : 'Jarayonda';
}

function StatusSummaryCard({ status, total, found }) {
  const emoji = status === "To'langan" ? '✅' : status === 'Kutmoqda' ? '⏳' : status === 'Tasdiqlangan' ? '🟡' : '🔴';
  const tone = PAYMENT_STATUS_STYLE[resolvePaymentStatus(status)];

  return (
    <div className={clsx('rounded-2xl border p-5 ring-1', tone)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{emoji} {status}</p>
          <p className="mt-5 text-sm opacity-80">Umumiy: {total}</p>
          <p className="mt-1 text-sm opacity-80">Topilgani: {found}</p>
        </div>
      </div>
    </div>
  );
}

function StatusSelectorCard({ status, total, found, active, onClick }) {
  const emoji = status === "To'langan" ? '✅' : status === 'Kutmoqda' ? '⏳' : status === 'Tasdiqlangan' ? '🟡' : '🔴';
  const tone = PAYMENT_STATUS_STYLE[resolvePaymentStatus(status)];

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-2xl border p-4 text-left ring-1 transition',
        tone,
        active ? 'scale-[1.01] shadow-lg shadow-slate-200/70 dark:shadow-black/20' : 'opacity-90 hover:opacity-100'
      )}
    >
      <p className="text-sm font-semibold">{emoji} {status}</p>
      <p className="mt-4 text-sm opacity-80">Umumiy treklar</p>
      <p className="text-2xl font-semibold tracking-tight">{total}</p>
      <p className="mt-3 text-sm opacity-80">Topilgan treklar</p>
      <p className="text-2xl font-semibold tracking-tight">{found}</p>
    </button>
  );
}

function SubTableCard({ title, count, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
          {count} ta
        </span>
      </div>
      {children}
    </div>
  );
}

function RegistryStatusTable({ items }) {
  if (!items.length) {
    return <div className="px-4 py-8 text-sm text-slate-400">Bu statusda umumiy trek topilmadi.</div>;
  }

  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white text-left dark:border-slate-800 dark:bg-slate-900/80">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Trek</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Mijoz</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Telefon</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">To'lov summasi</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">To'lov holati</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Qoplab berilgan sana</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Izoh</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-slate-950 dark:text-white">{item.trackCode}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.customer || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.phone || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatMoney(item.paymentAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', PAYMENT_STATUS_STYLE[resolvePaymentStatus(item.paymentStatus)])}>
                  {resolvePaymentStatus(item.paymentStatus)}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(item.compensatedDate)}</td>
              <td className="min-w-[260px] px-4 py-3 text-slate-500 dark:text-slate-400">{item.comment || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FoundStatusTable({ items, t, valueLabel }) {
  if (!items.length) {
    return <div className="px-4 py-8 text-sm text-slate-400">Bu statusda topilgan trek yo'q.</div>;
  }

  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-white text-left dark:border-slate-800 dark:bg-slate-900/80">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('track')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('customer')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('paymentAmount')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('foundAt')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('recoveredAfter')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('department')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('source')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('takenBy')}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('status')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                <Link to={`/complaints/${item.foundEntry.id}`} className="text-slate-950 transition hover:text-sky-600 dark:text-white dark:hover:text-sky-300">
                  {item.trackCode}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.customer || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatMoney(item.paymentAmount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(item.foundDate)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  <Clock3 size={12} />
                  {item.recoveredDays ?? 0} {t('days')}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.department}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.requestSource}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.handledBy || '-'}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', STATUS_STYLE[item.status])}>
                  {valueLabel(item.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ label, value, note, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  };

  return (
    <div className={clsx('rounded-2xl px-4 py-4 ring-1', toneClass[tone])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {note ? <p className="mt-2 text-xs opacity-75">{note}</p> : null}
    </div>
  );
}

function ImportReportStat({ label, value, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
  };

  return (
    <div className={clsx('rounded-2xl px-3 py-3 ring-1', toneClass[tone])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
