import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eraser,
  Eye,
  Filter,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  User as UserIcon,
  Warehouse,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import {
  getWarehouseReturns,
  subscribeToWarehouseReturns,
  createWarehouseReturn,
  bulkCreateWarehouseReturns,
  deleteWarehouseReturn,
  updateWarehouseReturn,
  replaceAllWarehouseReturns,
  previewVozvratCandidates,
  migrateVozvratToWarehouse,
} from '../services/warehouseData';
import { getOtkSettings, getSystemUsers } from '../services/localData';
import { getTrackInfo } from '../services/trackDatabase';
import { useAuthStore } from '../store/authStore';
import { isAdminRole } from '../services/access';

const ITEMS_PER_PAGE = 24;

const INITIAL_FORM = {
  trackCode: '',
  problemType: '',
  customerPhone: '',
  customerName: '',
  note: '',
};

export default function WarehousePage() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const [items, setItems] = useState(() => getWarehouseReturns());
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [users, setUsers] = useState(() => getSystemUsers());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Filtrlar
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterProblem, setFilterProblem] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');

  // Modal'lar
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);

  // Form state
  const [form, setForm] = useState(INITIAL_FORM);
  const [bulkTracks, setBulkTracks] = useState('');
  const [bulkCommon, setBulkCommon] = useState({ problemType: '', note: '' });

  // Delete confirmation (floating popover like ComplaintsPage)
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Migratsiya
  const [migrationCount, setMigrationCount] = useState(0);
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);

  // Excel import (Murojaatlar dizayniga o'xshash modal)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importMode, setImportMode] = useState('merge'); // 'merge' yoki 'replace'
  const [importing, setImporting] = useState(false);

  // Hammasini tozalash (faqat admin)
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      setItems(getWarehouseReturns());
      setSettings(getOtkSettings());
      setUsers(getSystemUsers());
    };
    return subscribeToWarehouseReturns(sync);
  }, []);

  useEffect(() => {
    const { count } = previewVozvratCandidates();
    setMigrationCount(count);
  }, [items]);

  // Scroll yoki resize'da delete popover'ni yopish (like ComplaintsPage)
  useEffect(() => {
    const close = () => setDeleteConfirm(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  const problemTypes = useMemo(
    () => settings.warehouseProblemTypes || [],
    [settings.warehouseProblemTypes],
  );

  const responsibleNames = useMemo(
    () =>
      (users || [])
        .filter((u) => u.active !== false)
        .map((u) => u.full_name || u.username)
        .filter(Boolean),
    [users],
  );

  // Filter dropdown uchun unique qiymatlar
  const filterOptions = useMemo(() => {
    const problems = new Set();
    const responsibles = new Set();
    items.forEach((item) => {
      if (item.problemType) problems.add(item.problemType);
      if (item.responsible) responsibles.add(item.responsible);
    });
    return {
      problems: Array.from(problems).sort(),
      responsibles: Array.from(responsibles).sort(),
    };
  }, [items]);

  const activeFilterCount =
    (filterProblem !== 'all' ? 1 : 0) +
    (filterResponsible !== 'all' ? 1 : 0);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filterProblem !== 'all' && item.problemType !== filterProblem) return false;
      if (filterResponsible !== 'all' && item.responsible !== filterResponsible) return false;
      if (!query) return true;
      return [
        item.trackCode,
        item.customerPhone,
        item.customerName,
        item.problemType,
        item.responsible,
        item.note,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    });
  }, [items, search, filterProblem, filterResponsible]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  useEffect(() => {
    setPage(1);
  }, [search, filterProblem, filterResponsible]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const resetFilters = () => {
    setFilterProblem('all');
    setFilterResponsible('all');
  };

  // ----------------------------------------------------------------
  // CRUD
  // ----------------------------------------------------------------
  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitCreate = (event) => {
    event.preventDefault();
    if (!form.trackCode.trim()) {
      toast.error('Trek raqami kerak');
      return;
    }
    // Mas'ul hodim — login qilgan user
    const result = createWarehouseReturn({
      ...form,
      responsible: user?.full_name || user?.username || '',
    });
    if (!result.ok) {
      toast.error("Yozuvni saqlashda xato");
      return;
    }
    if (result.repeated) {
      toast.success(`Takror — ${result.repeatIndex || 1}-marta kiritildi (sizning hisobingizga yozildi)`);
    } else {
      toast.success("Omborga qaytdi");
    }
    setForm({ ...INITIAL_FORM });
    setCreateOpen(false);
  };

  const submitEdit = (event) => {
    event.preventDefault();
    if (!editItem || !editItem.trackCode.trim()) {
      toast.error('Trek raqami kerak');
      return;
    }
    const result = updateWarehouseReturn(editItem.id, editItem);
    if (result?.ok) {
      toast.success('Yangilandi');
      setEditItem(null);
    } else {
      toast.error('Yangilashda xato');
    }
  };

  const submitBulkText = () => {
    const lines = bulkTracks
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Hech bo'lmaganda 1 ta trek kiriting");
      return;
    }
    // Har bir trek uchun bazadan mijoz ma'lumotlarini tortib olamiz
    const rows = lines.map((trackCode) => {
      const info = getTrackInfo(trackCode);
      return {
        trackCode,
        customerName: info?.customer || '',
        customerPhone: info?.phone || '',
      };
    });
    // Mas'ul hodim — login qilgan user, qo'lda tanlash kerak emas
    const commonWithUser = {
      ...bulkCommon,
      responsible: user?.full_name || user?.username || '',
    };
    const result = bulkCreateWarehouseReturns(rows, commonWithUser);
    toast.success(
      `${result.created} ta trek qo'shildi${result.repeated ? ` · ${result.repeated} ta takror` : ''}${result.skipped ? ` · ${result.skipped} ta bo'sh` : ''}`,
    );
    setBulkTracks('');
    setBulkCommon({ problemType: '', note: '' });
    setBulkOpen(false);
  };

  const openImportModal = () => {
    setImportPreview(null);
    setImportMode('merge');
    setImportModalOpen(true);
  };

  const triggerFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Hodim ismi — login qilgan foydalanuvchi (excel'dagi "Name" ustun
      // ahamiyat bermaymiz, hammasi joriy foydalanuvchi hisobiga yoziladi)
      const currentUserName = user?.full_name || user?.username || '';

      const mapped = rows
        .map((row) => {
          // Calon keylar: Excel ustun nomlarini ko'p variant orqali aniqlash
          const keys = Object.keys(row);
          const trackKey = keys.find((k) => /track|trek/i.test(k)) || keys.find((k) => /^id$/i.test(k));
          const dateKey = keys.find((k) => /date|sana/i.test(k));
          const phoneKey = keys.find((k) => /telefon|phone/i.test(k));
          const customerKey = keys.find((k) => /mijoz|customer/i.test(k));
          const problemKey = keys.find((k) => /muammo|problem/i.test(k));
          const noteKey = keys.find((k) => /izoh|note|comment|coment/i.test(k));
          const statusKey = keys.find((k) => /status|holat/i.test(k));

          if (!trackKey) return null;
          const trackCode = String(row[trackKey] || '').trim();
          if (!trackCode) return null;

          // Excel serial date → ISO. Excel epoch: 1900-01-01 = 1.
          // Unix epoch farqi: 25569 kun. Bir kun: 86400 soniya.
          let returnDate = new Date().toISOString();
          if (dateKey && row[dateKey] !== '' && row[dateKey] != null) {
            const rawDate = row[dateKey];
            if (typeof rawDate === 'number' && rawDate > 1000) {
              returnDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000)).toISOString();
            } else {
              const parsed = new Date(rawDate);
              if (!Number.isNaN(parsed.getTime())) returnDate = parsed.toISOString();
            }
          }

          // Excel'da mijoz/telefon bo'lmasa — bazadan tortib olamiz
          let excelPhone = phoneKey ? String(row[phoneKey] || '').trim() : '';
          let excelCustomer = customerKey ? String(row[customerKey] || '').trim() : '';

          if (!excelPhone || !excelCustomer) {
            const trackInfo = getTrackInfo(trackCode);
            if (trackInfo) {
              if (!excelPhone) excelPhone = trackInfo.phone || '';
              if (!excelCustomer) excelCustomer = trackInfo.customer || '';
            }
          }

          return {
            trackCode,
            returnDate,
            customerPhone: excelPhone,
            customerName: excelCustomer,
            problemType: problemKey ? String(row[problemKey] || '').trim() : '',
            responsible: currentUserName, // Login qilgan user hisobiga
            note: noteKey ? String(row[noteKey] || '').trim() : '',
            status: statusKey ? String(row[statusKey] || 'qabul_qilindi').toLowerCase() : 'qabul_qilindi',
          };
        })
        .filter(Boolean);

      if (!mapped.length) {
        toast.error("Excel'da trek raqami topilmadi");
        event.target.value = '';
        setImporting(false);
        return;
      }

      // PREVIEW — darrov import qilmaymiz. Foydalanuvchi modalda
      // "Qo'llash" tugmasini bosgandan keyin amalga oshiriladi.
      setImportPreview({
        fileName: file.name,
        totalRows: mapped.length,
        preview: mapped.slice(0, 50), // dastlab 50 ta qator preview uchun
        entries: mapped,
      });
    } catch (error) {
      toast.error(`Excel xato: ${error?.message || 'noma\'lum'}`);
    }
    setImporting(false);
    event.target.value = '';
  };

  // Apply import — modal ichidagi "Qo'llash" tugmasi bosilganda
  const applyImport = async () => {
    if (!importPreview?.entries?.length) return;
    // Xavfsizlik: To'liq almashtirish faqat admin uchun
    const effectiveMode = importMode === 'replace' && !isAdmin ? 'merge' : importMode;
    setImporting(true);
    try {
      if (effectiveMode === 'replace') {
        const result = replaceAllWarehouseReturns(importPreview.entries);
        toast.success(
          `Almashtirildi: ${result.replaced} ta yangi · ${result.removed} ta eski o'chirildi`,
        );
      } else {
        const result = bulkCreateWarehouseReturns(importPreview.entries);
        toast.success(
          `${result.created} ta trek qo'shildi${result.repeated ? ` · ${result.repeated} ta takror` : ''}${result.skipped ? ` · ${result.skipped} ta bo'sh` : ''}`,
        );
      }
      setImportPreview(null);
      setImportModalOpen(false);
    } catch (error) {
      toast.error(`Importda xato: ${error?.message || 'noma\'lum'}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        'Trek raqami': '12345678901',
        'Mijoz telefoni': '+998901234567',
        'Mijoz ismi': 'Komiljonov Aziz',
        'Muammo turi': 'Yetkazib bera olmadi',
        "Mas'ul hodim": 'Ulug\'bek',
        'Izoh': 'Manzilda yo\'q edi',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Toshkent ombori');
    XLSX.writeFile(wb, 'toshkent-ombori-namuna.xlsx');
  };

  const exportExcel = () => {
    if (!filteredItems.length) return;
    const ws = XLSX.utils.json_to_sheet(
      filteredItems.map((item) => ({
        'Trek raqami': item.trackCode,
        'Sana': new Date(item.returnDate).toLocaleDateString('uz-UZ'),
        'Muammo turi': item.problemType,
        "Mas'ul hodim": item.responsible,
        'Mijoz ismi': item.customerName,
        'Mijoz telefoni': item.customerPhone,
        'Izoh': item.note,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Toshkent ombori');
    XLSX.writeFile(wb, `toshkent-ombori-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const removeItem = (id) => {
    const result = deleteWarehouseReturn(id);
    if (result.ok) {
      toast.success("O'chirildi");
    } else {
      toast.error("O'chirishda xato");
    }
    setDeleteConfirm(null);
  };

  const dismissMigration = () => setMigrationDismissed(true);

  // Hammasini tozalash — faqat admin, tasdiqlash bilan
  const runClearAll = async () => {
    if (!isAdmin) return;
    setClearingAll(true);
    await new Promise((r) => setTimeout(r, 100));
    const result = replaceAllWarehouseReturns([]);
    setClearingAll(false);
    setClearAllOpen(false);
    setClearConfirmText('');
    if (result.ok) {
      toast.success(`${result.removed.toLocaleString('ru-RU')} ta yozuv tozalandi`);
    } else {
      toast.error('Tozalashda xato');
    }
  };

  const runMigration = async () => {
    setMigrationLoading(true);
    await new Promise((r) => setTimeout(r, 100));
    const result = migrateVozvratToWarehouse({ removeFromOtk: false });
    setMigrationLoading(false);

    if (result.ok) {
      toast.success(
        `${result.migrated} ta vozvrat omborga ko'chirildi${result.skipped ? ` · ${result.skipped} dublikat o'tkazib yuborildi` : ''}`,
      );
      setMigrationCount(0);
      setMigrationModalOpen(false);
      setItems(getWarehouseReturns());
    } else {
      toast.error("Ko'chirishda xato");
    }
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* KOMPAKT HEADER — title + amallar inline (Murojaatlar bilan bir xil) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30">
              <Warehouse size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">Toshkent ombori</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Jami: <b>{items.length}</b>
                {' · '}Ko'rinmoqda: <b>{filteredItems.length}</b>
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button
              onClick={openImportModal}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Upload size={13} />
              Import
            </button>
            <button
              onClick={exportExcel}
              disabled={!filteredItems.length}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download size={13} />
              Export
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
            >
              <Plus size={13} />
              Bir nechta
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
            >
              <Plus size={13} />
              Yangi qaytaruv
            </button>
            {/* Hammasini tozalash — faqat admin uchun (xavfli amal) */}
            {isAdmin && items.length > 0 && (
              <button
                onClick={() => {
                  setClearConfirmText('');
                  setClearAllOpen(true);
                }}
                title="Barcha yozuvlarni o'chirish"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <Eraser size={13} />
                Tozalash
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vozvrat migratsiya banner */}
      {!migrationDismissed && migrationCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {migrationCount} ta vozvrat trek murojaatlarda topildi
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">
                  Bu treklarni Toshkent omboriga ko'chirib o'tkazing.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={dismissMigration}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-300"
              >
                Keyin
              </button>
              <button
                onClick={() => setMigrationModalOpen(true)}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Ko'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOOLBAR: Search + Filter (Murojaatlar bilan bir xil) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Qidirish: trek, telefon, mijoz, muammo turi, izoh..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title="Tozalash"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
              filtersOpen || activeFilterCount > 0
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            )}
          >
            <Filter size={16} />
            Filtr
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 text-[11px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FilterSelect
                label="Muammo turi"
                value={filterProblem}
                onChange={setFilterProblem}
                options={filterOptions.problems}
              />
              <FilterSelect
                label="Mas'ul hodim"
                value={filterResponsible}
                onChange={setFilterResponsible}
                options={filterOptions.responsibles}
              />
            </div>
            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {activeFilterCount} ta filtr · {filteredItems.length} ta natija
                </span>
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <X size={12} />
                  Tozalash
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD GRID (Murojaatlar bilan bir xil) */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Warehouse size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {search || activeFilterCount > 0 ? 'Hech narsa topilmadi' : 'Hozircha qaytaruv yo\'q'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {search || activeFilterCount > 0 ? "Filtrlarni o'zgartiring" : '"Yangi qaytaruv" tugmasini bosing'}
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {paginatedItems.map((item) => (
              <WarehouseCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onPreview={() => setPreviewItem(item)}
                onEdit={() => setEditItem({ ...item })}
                onDelete={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDeleteConfirm((current) =>
                    current?.id === item.id
                      ? null
                      : {
                          id: item.id,
                          x: Math.min(rect.right - 288, window.innerWidth - 304),
                          y: rect.bottom + 8,
                        },
                  );
                }}
              />
            ))}
          </section>

          {pageCount > 1 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filteredItems.length)}
                {' – '}
                {Math.min(page * ITEMS_PER_PAGE, filteredItems.length)}
                {' / '}
                <span className="font-bold text-slate-700 dark:text-slate-200">{filteredItems.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} />
                  Oldingi
                </button>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {page} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page === pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Keyingi
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hammasini tozalash — tasdiqlash modali (faqat admin) */}
      {clearAllOpen && isAdmin && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Hammasini tozalash
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Toshkent omboridagi <b className="text-rose-600 dark:text-rose-300">{items.length.toLocaleString('ru-RU')} ta</b> yozuv
                  butunlay o'chiriladi (lokal va Supabase'dan). Bu amal qaytarilmaydi.
                </p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Tasdiqlash uchun pastdagi maydonga <b>TOZALASH</b> deb yozing:
                </p>
                <input
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="TOZALASH"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono tracking-wider dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  autoFocus
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                disabled={clearingAll}
                onClick={() => {
                  setClearAllOpen(false);
                  setClearConfirmText('');
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
              <button
                disabled={clearingAll || clearConfirmText.trim().toUpperCase() !== 'TOZALASH'}
                onClick={runClearAll}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {clearingAll ? "Tozalanmoqda…" : "Ha, hammasini o'chir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating delete confirm (Murojaatlar bilan bir xil) */}
      {deleteConfirm && (
        <div
          className="fixed z-[520] w-72 rounded-2xl border border-rose-100 bg-white p-3 text-left shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:border-rose-500/20 dark:bg-slate-900 dark:shadow-black/40"
          style={{ left: deleteConfirm.x, top: deleteConfirm.y }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">Yozuvni o'chirish</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Bu trek ombor bazasidan olib tashlanadi. Davom etasizmi?
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Yo'q
            </button>
            <button
              onClick={() => removeItem(deleteConfirm.id)}
              className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              Ha, o'chir
            </button>
          </div>
        </div>
      )}

      {/* Migratsiya modal */}
      {migrationModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {migrationCount} ta vozvratni ko'chirish
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bu treklar Toshkent omboriga qo'shiladi. Murojaatlar bo'limidan o'chirilmaydi —
              JAMI TREKLAR hisoblanishda davom etadi.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                disabled={migrationLoading}
                onClick={runMigration}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {migrationLoading ? "Ko'chirilmoqda…" : "Ko'chir"}
              </button>
              <button
                disabled={migrationLoading}
                onClick={() => setMigrationModalOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yangi qaytaruv modal */}
      {createOpen && (
        <FormModal
          title="Yangi qaytaruv"
          onClose={() => setCreateOpen(false)}
          form={form}
          updateForm={updateForm}
          problemTypes={problemTypes}
          currentUserName={user?.full_name || user?.username || ''}
          onSubmit={submitCreate}
          submitLabel="Saqlash"
        />
      )}

      {/* Tahrirlash modal */}
      {editItem && (
        <FormModal
          title="Yozuvni tahrirlash"
          onClose={() => setEditItem(null)}
          form={editItem}
          updateForm={(key, value) => setEditItem((current) => ({ ...current, [key]: value }))}
          problemTypes={problemTypes}
          currentUserName={editItem.responsible || user?.full_name || user?.username || ''}
          onSubmit={submitEdit}
          submitLabel="Saqlash"
        />
      )}

      {/* Bulk modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Ko'p trekni qo'shish</h2>
              <button
                onClick={() => setBulkOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Treklar (har qatorga bittadan)">
                <textarea
                  value={bulkTracks}
                  onChange={(e) => setBulkTracks(e.target.value)}
                  rows={6}
                  placeholder={'12345678901\n23456789012'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <Field label="Umumiy muammo turi">
                <select
                  value={bulkCommon.problemType}
                  onChange={(e) => setBulkCommon((c) => ({ ...c, problemType: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">— Tanlang —</option>
                  {problemTypes.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Umumiy izoh">
                <input
                  value={bulkCommon.note}
                  onChange={(e) => setBulkCommon((c) => ({ ...c, note: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <UserIcon size={12} />
                <span>
                  Mas'ul hodim: <b>{user?.full_name || user?.username || 'Aniqlanmagan'}</b>
                  <span className="ml-1 text-amber-600/70 dark:text-amber-300/70">(joriy hisob)</span>
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setBulkOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={submitBulkText}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Hammasini saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import modal (Murojaatlar dizayniga o'xshash) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[550] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Excel import</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Excel fayl nomi muhim emas. Shablondagi ustunlar bo'yicha preview bilan yuklang.
                </p>
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
              {/* File picker row */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {importPreview?.fileName || 'WAREHOUSE_TEMPLATE.xlsx'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {importPreview
                      ? `${importPreview.totalRows.toLocaleString('ru-RU')} ta qator`
                      : 'Excel fayl nomi muhim emas. Shablondagi ustunlar bo\'yicha preview bilan yuklang.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={triggerFilePick}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload size={16} />
                  {importing ? 'Yuklanmoqda…' : 'Fayl tanlash'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFile}
                  className="hidden"
                />
              </div>

              {/* Import mode: oddiy hodimlarga faqat "Qo'shib import" */}
              <div className={clsx('grid gap-4', isAdmin ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={clsx(
                    'rounded-2xl border p-4 text-left transition',
                    importMode === 'merge'
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Qo'shib import</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Mavjud ma'lumotlar saqlanadi, mos qatorlar yangilanadi.
                  </p>
                </button>
                {/* "To'liq almashtirish" — faqat admin uchun (xavfli amal) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={clsx(
                      'rounded-2xl border p-4 text-left transition',
                      importMode === 'replace'
                        ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'
                        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">To'liq almashtirish</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Hozirgi ro'yxat Excel ma'lumotlari bilan almashtiriladi.
                    </p>
                  </button>
                )}
              </div>

              {/* Template download */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Import shabloni</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Fayl nomi erkin. Ustunlar shu shablon bilan mos bo'lsa kifoya.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Download size={16} />
                  Shablonni yuklab olish
                </button>
              </div>

              {/* Preview table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Ko'rib chiqish</h3>
                  {importPreview && importPreview.totalRows > 50 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Dastlabki 50 ta qator ko'rsatilmoqda
                    </span>
                  )}
                </div>
                <div className="max-h-[320px] overflow-auto">
                  {!importPreview ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">
                      Ma'lumot yo'q. Fayl tanlang.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="sticky top-0 border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sana</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trek</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Muammo</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Mijoz</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Telefon</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.preview.map((row, idx) => (
                          <tr key={`${row.trackCode}-${idx}`}>
                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                              {new Date(row.returnDate).toLocaleDateString('uz-UZ')}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-950 dark:text-white">{row.trackCode}</td>
                            <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
                              {row.problemType || '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                              {row.customerName || '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                              {row.customerPhone || '—'}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                              {row.status || 'qabul_qilindi'}
                            </td>
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
                Yopish
              </button>
              <button
                type="button"
                disabled={!importPreview?.entries?.length || importing}
                onClick={applyImport}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {importing ? 'Bajarilmoqda…' : 'Qo\'llash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Qaytaruv tafsiloti</h2>
              <button
                onClick={() => setPreviewItem(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <Detail label="Trek raqami" value={previewItem.trackCode} mono />
              <Detail label="Sana" value={new Date(previewItem.returnDate).toLocaleString('uz-UZ')} />
              <Detail label="Muammo turi" value={previewItem.problemType || '—'} />
              <Detail label="Mas'ul hodim" value={previewItem.responsible || '—'} />
              <Detail label="Mijoz" value={previewItem.customerName || '—'} />
              <Detail label="Telefon" value={previewItem.customerPhone || '—'} />
              <Detail label="Izoh" value={previewItem.note || '—'} />
              <Detail label="ID" value={previewItem.id} mono small />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// WarehouseCard — Murojaatlar dizayniga aynan o'xshash
// ============================================================
function WarehouseCard({ item, isAdmin, onPreview, onEdit, onDelete }) {
  const has104Marker = false; // Future: badge if matched in 104

  return (
    <article className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500/30">
      {/* Row 1: trek + eye + status badge */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPreview}
            title="Ko'rish"
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/15 dark:hover:text-amber-300"
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            onClick={onPreview}
            className="truncate font-mono text-xs font-bold text-slate-950 transition hover:text-amber-700 dark:text-white dark:hover:text-amber-300"
            title={item.trackCode}
          >
            {item.trackCode}
          </button>
        </div>
        <span className="shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase ring-1 ring-amber-200 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
          Vozvrat
        </span>
      </div>

      {/* Row 2: Sana + Status */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} />
          {format(new Date(item.returnDate), 'dd.MM.yyyy')}
        </span>
        {has104Marker && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
            <Building2 size={10} />
            <span className="truncate">104'da topilgan</span>
          </span>
        )}
      </div>

      {/* Row 3: Muammo turi */}
      <div className="space-y-0.5 border-t border-slate-100 pt-2 dark:border-slate-800">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Muammo turi
        </span>
        <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1" title={item.problemType}>
          {item.problemType || '—'}
        </div>
      </div>

      {/* Row 4: Mas'ul + Mijoz */}
      {(item.responsible || item.customerName || item.customerPhone) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          {item.responsible && (
            <span
              className="inline-flex items-center gap-1 truncate font-semibold text-amber-700 dark:text-amber-300"
              title={item.responsible}
            >
              <UserIcon size={10} />
              <span className="truncate">{item.responsible}</span>
            </span>
          )}
          {(item.customerName || item.customerPhone) && (
            <span
              className="inline-flex items-center gap-1 truncate"
              title={`${item.customerName || ''} ${item.customerPhone || ''}`.trim()}
            >
              <Phone size={10} />
              <span className="truncate">
                {item.customerName || item.customerPhone}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Row 5: Izoh */}
      {item.note && (
        <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <MessageSquare size={9} />
            Izoh
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300" title={item.note}>
            {item.note}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        <button
          type="button"
          onClick={onEdit}
          title="Tahrirlash"
          className="rounded-md p-1 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/15 dark:hover:text-sky-300"
        >
          <Pencil size={14} />
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            title="O'chirish"
            className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/15"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

// ============================================================
// Yordamchi komponentlar
// ============================================================
function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-amber-500/10"
      >
        <option value="all">Hammasi</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function FormModal({ title, onClose, form, updateForm, problemTypes, currentUserName, onSubmit, submitLabel }) {
  // Trek raqami yozilsa — bazadan mijoz ma'lumotlarini tortib olish
  const trackPreview = useMemo(() => {
    const code = String(form.trackCode || '').trim();
    if (code.length < 4) return null;
    return getTrackInfo(code);
  }, [form.trackCode]);

  // Trek o'zgarganda bo'sh customer maydonlarini bazadan to'ldirish
  useEffect(() => {
    if (!trackPreview) return;
    if (!form.customerName && trackPreview.customer) {
      updateForm('customerName', trackPreview.customer);
    }
    if (!form.customerPhone && trackPreview.phone) {
      updateForm('customerPhone', trackPreview.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackPreview]);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Trek raqami *">
            <input
              required
              value={form.trackCode}
              onChange={(e) => updateForm('trackCode', e.target.value)}
              placeholder="Masalan: YT8859171872977"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </Field>

          {/* BAZADAN — trek bo'yicha avtomatik ma'lumotlar */}
          {trackPreview && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-500/20 dark:bg-blue-500/10">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  ● Bazadan
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Trek bo'yicha avtomatik ma'lumotlar
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Mijoz
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">{trackPreview.customer}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Telefon
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white">{trackPreview.phone}</p>
                </div>
              </div>
            </div>
          )}
          <Field label="Muammo turi">
            <select
              value={form.problemType}
              onChange={(e) => updateForm('problemType', e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">— Tanlang —</option>
              {problemTypes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mijoz telefoni">
              <input
                value={form.customerPhone}
                onChange={(e) => updateForm('customerPhone', e.target.value)}
                placeholder="+998901234567"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </Field>
            <Field label="Mijoz ismi">
              <input
                value={form.customerName}
                onChange={(e) => updateForm('customerName', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </Field>
          </div>
          <Field label="Izoh">
            <textarea
              value={form.note}
              onChange={(e) => updateForm('note', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </Field>
          {/* Mas'ul hodim — avtomatik (login qilgan user) */}
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <UserIcon size={12} />
            <span>
              Mas'ul hodim: <b>{currentUserName || 'Aniqlanmagan'}</b>
              <span className="ml-1 text-amber-600/70 dark:text-amber-300/70">(joriy hisob)</span>
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Detail({ label, value, mono = false, small = false }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800">
      <span className="w-28 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={clsx(
          'flex-1 break-words text-slate-900 dark:text-slate-100',
          mono && 'font-mono',
          small ? 'text-[11px]' : 'text-sm',
        )}
      >
        {value}
      </span>
    </div>
  );
}
