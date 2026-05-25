// src/pages/MyInProgressPage.jsx
// "Jarayondagi murojaatlar" — barcha bo'limlardan jamlangan IShXONA.
// 104 — Moliya yuklari uchun TO'LIQ ish maydoni:
//   status o'zgartirish, natija tanlash, chek yuklash, izoh yozish.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileUp,
  Headphones,
  ListChecks,
  MessageSquareWarning,
  Paperclip,
  Search,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  getAllOtkRecords,
  getAssistantAiRequests,
  getCompensatedLoadRegistry,
  getRecoveredCompensatedLoads,
  subscribeToOtkData,
  updateCompensatedRecoveryWorkflow,
} from '../services/localData';
import {
  getModule102Entries,
  subscribeToModule102,
} from '../services/module102Data';
import TrackDetailModal from '../components/TrackDetailModal';
import { useAuthStore } from '../store/authStore';

const FOUND_CASE_OUTCOME_OPTIONS = ["Mijoz pulni qaytardi", 'Musodara'];
const FOUND_CASE_STATUS_OPTIONS = ['Qabul qilindi', 'Jarayonda', 'Yopildi'];

function formatDate(value) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd.MM.yyyy HH:mm');
  } catch {
    return String(value);
  }
}

function formatMoney(value) {
  if (value === '' || value == null) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return new Intl.NumberFormat('uz-UZ').format(num) + ' UZS';
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

const MODULES = {
  complaints: { label: 'Murojaatlar', short: 'OTK', icon: MessageSquareWarning, accent: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300', href: (item) => `/complaints/${item.sourceId}` },
  module102: { label: '102', short: '102', icon: Headphones, accent: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', href: () => '/module-102' },
  compensated: { label: '104 — Moliya', short: '104', icon: Wallet, accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', href: () => '/compensated' },
  assistant: { label: 'AI', short: 'AI', icon: Bot, accent: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', href: () => '/assistant-ai' },
};

export default function MyInProgressPage() {
  const { user } = useAuthStore();
  const [otkRecords, setOtkRecords] = useState(() => getAllOtkRecords());
  const [recoveryItems, setRecoveryItems] = useState(() => getRecoveredCompensatedLoads());
  const [assistantRequests, setAssistantRequests] = useState(() => getAssistantAiRequests());
  const [module102Entries, setModule102Entries] = useState(() => getModule102Entries());
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [openTrackCode, setOpenTrackCode] = useState(null);
  const [openModule, setOpenModule] = useState(null);

  const receiptFileInputRef = useRef(null);
  const pendingReceiptTrackRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      setOtkRecords(getAllOtkRecords());
      setRecoveryItems(getRecoveredCompensatedLoads());
      setAssistantRequests(getAssistantAiRequests());
    };
    return subscribeToOtkData(sync, { debounceMs: 80 });
  }, []);

  useEffect(() => {
    const sync = () => setModule102Entries(getModule102Entries());
    return subscribeToModule102(sync);
  }, []);

  const userNames = useMemo(
    () => [user?.full_name, user?.username].filter(Boolean).map(normalizeName),
    [user]
  );
  const userId = user?.id;

  const matchesUser = (assigneeName, assigneeId) => {
    if (assigneeId != null && userId != null && String(assigneeId) === String(userId)) return true;
    const norm = normalizeName(assigneeName);
    if (!norm) return false;
    return userNames.includes(norm);
  };

  // 104 Moliya yuklari (bu kontekstda alohida — to'liq ish maydoni)
  const my104Items = useMemo(() => {
    return recoveryItems
      .filter((item) => item.foundResolutionStatus === 'Jarayonda')
      .filter((item) => matchesUser(item.assignedTo, item.assignedToId));
  }, [recoveryItems, userNames, userId]);

  // Har bir modul uchun ALOHIDA ro'yxat — aralashib ketmasligi uchun
  const myComplaintsItems = useMemo(() => {
    return otkRecords
      .filter((entry) => entry.status === 'Jarayonda' && entry.archiveStatus !== 'archived')
      .filter((entry) => matchesUser(entry.handledBy, entry.handledById))
      .map((entry) => ({
        module: 'complaints',
        id: `complaints-${entry.id}`,
        sourceId: entry.id,
        trackCode: entry.trackCode,
        problem: entry.problemType,
        department: entry.department,
        source: entry.requestSource,
        priority: entry.priority,
        assignedTo: entry.handledBy,
        assignedAt: entry.updatedAt || entry.date,
        comment: entry.comment,
      }))
      .sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
  }, [otkRecords, userNames, userId]);

  const myModule102Items = useMemo(() => {
    return module102Entries
      .filter((entry) => entry.status === 'jarayonda')
      .filter((entry) => matchesUser(entry.lockedBy))
      .map((entry) => {
        const firstTrack = entry.tracks?.[0];
        return {
          module: 'module102',
          id: `module102-${entry.id}`,
          sourceId: entry.id,
          trackCode: firstTrack?.trackNumber || entry.phone || entry.id,
          customer: entry.customer,
          phone: entry.phone,
          amount: firstTrack?.total || '',
          assignedTo: entry.lockedBy,
          assignedAt: entry.lockedAt || entry.updatedAt,
          comment: entry.note,
          tracksCount: entry.tracks?.length || 0,
        };
      })
      .sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
  }, [module102Entries, userNames, userId]);

  const myAssistantItems = useMemo(() => {
    return assistantRequests
      .filter((req) => req.status === 'Jarayonda')
      .filter((req) => matchesUser(req.handledBy))
      .map((req) => ({
        module: 'assistant',
        id: `assistant-${req.id}`,
        sourceId: req.id,
        trackCode: req.trackCode || '—',
        customer: req.fullName,
        phone: req.phone,
        customerId: req.customerId,
        problem: req.problemType,
        source: req.source,
        assignedTo: req.handledBy,
        assignedAt: req.updatedAt || req.createdAt,
        comment: req.comment,
      }))
      .sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
  }, [assistantRequests, userNames, userId]);

  const stats = useMemo(() => ({
    total: my104Items.length + myComplaintsItems.length + myModule102Items.length + myAssistantItems.length,
    moliya: my104Items.length,
    complaints: myComplaintsItems.length,
    module102: myModule102Items.length,
    assistant: myAssistantItems.length,
  }), [my104Items, myComplaintsItems, myModule102Items, myAssistantItems]);

  // Yordamchi: qidiruv filter
  const applySearch = (list, fields) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      fields.map((f) => item[f]).filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  };

  // Modul filtri va qidiruv bilan filter qilingan ro'yxatlar
  const filtered104 = useMemo(() => {
    if (moduleFilter !== 'all' && moduleFilter !== 'compensated') return [];
    return applySearch(my104Items, ['trackCode', 'customer', 'phone', 'department', 'foundCaseOutcome', 'workflowComment']);
  }, [my104Items, search, moduleFilter]);

  const filteredComplaints = useMemo(() => {
    if (moduleFilter !== 'all' && moduleFilter !== 'complaints') return [];
    return applySearch(myComplaintsItems, ['trackCode', 'problem', 'department', 'source', 'comment']);
  }, [myComplaintsItems, search, moduleFilter]);

  const filteredModule102 = useMemo(() => {
    if (moduleFilter !== 'all' && moduleFilter !== 'module102') return [];
    return applySearch(myModule102Items, ['trackCode', 'customer', 'phone', 'comment']);
  }, [myModule102Items, search, moduleFilter]);

  const filteredAssistant = useMemo(() => {
    if (moduleFilter !== 'all' && moduleFilter !== 'assistant') return [];
    return applySearch(myAssistantItems, ['trackCode', 'customer', 'phone', 'customerId', 'problem', 'comment']);
  }, [myAssistantItems, search, moduleFilter]);

  // 104 Moliya: status, natija, comment, receipt — barcha o'zgarishlar
  const update104Field = (trackCode, field, value) => {
    if (!trackCode) return;
    try {
      const result = updateCompensatedRecoveryWorkflow(trackCode, { [field]: value }, { actor: user });
      if (result.ok) {
        setRecoveryItems(getRecoveredCompensatedLoads());
        toast.success('Saqlandi');
      } else {
        toast.error('Saqlanmadi');
      }
    } catch (error) {
      console.error(error);
      toast.error('Xato');
    }
  };

  const openReceiptPicker = (trackCode) => {
    pendingReceiptTrackRef.current = trackCode;
    if (receiptFileInputRef.current) {
      receiptFileInputRef.current.value = '';
      receiptFileInputRef.current.click();
    }
  };

  const handleReceiptFile = async (event) => {
    const file = event.target.files?.[0];
    const trackCode = pendingReceiptTrackRef.current;
    pendingReceiptTrackRef.current = null;
    if (!file || !trackCode) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fayl 5 MB dan oshmasligi kerak");
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      update104Field(trackCode, 'receiptFile', {
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
      toast.error("Chekni o'qib bo'lmadi");
    }
  };

  const removeReceipt = (trackCode) => {
    update104Field(trackCode, 'receiptFile', null);
  };

  const openedItem = useMemo(() => {
    if (!openTrackCode || !openModule) return null;
    if (openModule === 'compensated') return my104Items.find((row) => row.trackCode === openTrackCode) || null;
    if (openModule === 'complaints') return myComplaintsItems.find((row) => row.trackCode === openTrackCode) || null;
    if (openModule === 'module102') return myModule102Items.find((row) => row.trackCode === openTrackCode) || null;
    if (openModule === 'assistant') return myAssistantItems.find((row) => row.trackCode === openTrackCode) || null;
    return null;
  }, [my104Items, myComplaintsItems, myModule102Items, myAssistantItems, openTrackCode, openModule]);

  const isEmpty =
    filtered104.length === 0 &&
    filteredComplaints.length === 0 &&
    filteredModule102.length === 0 &&
    filteredAssistant.length === 0;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* HEADER */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4 shadow-sm dark:border-slate-800 dark:from-blue-500/10 dark:via-slate-900 dark:to-emerald-500/10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <ListChecks size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Jarayondagi murojaatlar
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.full_name || user?.username || 'Sizning'} hisobi · jami {stats.total} ta yuk
            </p>
          </div>
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label="Hammasi" value={stats.total} tone="slate" active={moduleFilter === 'all'} onClick={() => setModuleFilter('all')} />
            <FilterChip label="104 Moliya" value={stats.moliya} tone="emerald" active={moduleFilter === 'compensated'} onClick={() => setModuleFilter(moduleFilter === 'compensated' ? 'all' : 'compensated')} />
            <FilterChip label="Murojaatlar" value={stats.complaints} tone="blue" active={moduleFilter === 'complaints'} onClick={() => setModuleFilter(moduleFilter === 'complaints' ? 'all' : 'complaints')} />
            <FilterChip label="102" value={stats.module102} tone="violet" active={moduleFilter === 'module102'} onClick={() => setModuleFilter(moduleFilter === 'module102' ? 'all' : 'module102')} />
            <FilterChip label="AI" value={stats.assistant} tone="amber" active={moduleFilter === 'assistant'} onClick={() => setModuleFilter(moduleFilter === 'assistant' ? 'all' : 'assistant')} />
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Qidirish: trek, mijoz, telefon..."
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
      </section>

      {/* EMPTY STATE */}
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <ListChecks size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            {stats.total === 0
              ? "Hozircha siz hech qanday yukni jarayonga olmagansiz"
              : "Qidiruv yoki filtr bo'yicha topilmadi"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            104 — Moliya yoki boshqa modullardan biror yukni "Men olaman" tugmasi bilan oling.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ============ 104 MOLIYA — ISH MAYDONI ============ */}
          {filtered104.length > 0 && (
            <ModuleSection
              title="104 — Moliya"
              subtitle="Topilgan yuklar — to'liq ish maydoni"
              count={filtered104.length}
              icon={Wallet}
              tone="emerald"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {filtered104.map((item) => (
                  <WorkstationCard
                    key={item.id}
                    item={item}
                    onView={() => { setOpenTrackCode(item.trackCode); setOpenModule('compensated'); }}
                    onChangeStatus={(value) => update104Field(item.trackCode, 'foundResolutionStatus', value)}
                    onChangeOutcome={(value) => update104Field(item.trackCode, 'foundCaseOutcome', value)}
                    onSaveComment={(value) => update104Field(item.trackCode, 'workflowComment', value)}
                    onUploadReceipt={() => openReceiptPicker(item.trackCode)}
                    onRemoveReceipt={() => removeReceipt(item.trackCode)}
                  />
                ))}
              </div>
            </ModuleSection>
          )}

          {/* ============ MUROJAATLAR (OTK) ============ */}
          {filteredComplaints.length > 0 && (
            <ModuleSection
              title="Murojaatlar"
              subtitle="OTK murojaatlari — sizning faol ishlaringiz"
              count={filteredComplaints.length}
              icon={MessageSquareWarning}
              tone="blue"
            >
              <ModuleTable
                items={filteredComplaints}
                columns={[
                  { key: 'trackCode', label: 'Trek', render: (item) => (
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => { setOpenTrackCode(item.trackCode); setOpenModule('complaints'); }} className="rounded p-0.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/15">
                        <Eye size={13} />
                      </button>
                      <Link to={`/complaints/${item.sourceId}`} className="font-mono font-semibold text-slate-900 hover:text-blue-700 dark:text-white dark:hover:text-blue-300">
                        {item.trackCode}
                      </Link>
                    </div>
                  )},
                  { key: 'problem', label: 'Muammo', render: (item) => (
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.problem || '—'}</div>
                      <div className="text-[10px] text-slate-500">{item.department}</div>
                    </div>
                  )},
                  { key: 'source', label: 'Manba', render: (item) => <span className="text-xs text-slate-600 dark:text-slate-300">{item.source || '—'}</span> },
                  { key: 'priority', label: 'Daraja', render: (item) => (
                    <span className={clsx(
                      'inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                      item.priority === 'Yuqori' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        : item.priority === "O'rta" ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}>
                      {item.priority || '—'}
                    </span>
                  )},
                  { key: 'assignedAt', label: 'Olindi', render: (item) => <span className="text-[11px] text-slate-500">{formatDate(item.assignedAt)}</span> },
                  { key: 'actions', label: '', render: (item) => (
                    <Link to={`/complaints/${item.sourceId}`} className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-blue-700">
                      Ishlash →
                    </Link>
                  )},
                ]}
              />
            </ModuleSection>
          )}

          {/* ============ 102 — MODUL ============ */}
          {filteredModule102.length > 0 && (
            <ModuleSection
              title="102 — Modul"
              subtitle="Mijoz murojaatlari (call center)"
              count={filteredModule102.length}
              icon={Headphones}
              tone="violet"
            >
              <ModuleTable
                items={filteredModule102}
                columns={[
                  { key: 'trackCode', label: 'Trek', render: (item) => (
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => { setOpenTrackCode(item.trackCode); setOpenModule('module102'); }} className="rounded p-0.5 text-slate-400 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-500/15">
                        <Eye size={13} />
                      </button>
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{item.trackCode}</span>
                      {item.tracksCount > 1 && (
                        <span className="rounded bg-violet-100 px-1 text-[9px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                          +{item.tracksCount - 1}
                        </span>
                      )}
                    </div>
                  )},
                  { key: 'customer', label: 'Mijoz', render: (item) => (
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.customer || '—'}</div>
                      <div className="text-[10px] text-slate-500">{item.phone}</div>
                    </div>
                  )},
                  { key: 'amount', label: 'Summa', render: (item) => (
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {item.amount ? formatMoney(item.amount) : '—'}
                    </span>
                  )},
                  { key: 'comment', label: 'Izoh', render: (item) => (
                    <span className="line-clamp-2 text-[11px] text-slate-500" title={item.comment}>{item.comment || '—'}</span>
                  )},
                  { key: 'assignedAt', label: 'Olindi', render: (item) => <span className="text-[11px] text-slate-500">{formatDate(item.assignedAt)}</span> },
                  { key: 'actions', label: '', render: () => (
                    <Link to="/module-102" className="inline-flex items-center rounded-md bg-violet-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-violet-700">
                      Ishlash →
                    </Link>
                  )},
                ]}
              />
            </ModuleSection>
          )}

          {/* ============ AI YORDAMCHI ============ */}
          {filteredAssistant.length > 0 && (
            <ModuleSection
              title="AI Yordamchi"
              subtitle="Bot orqali kelgan murojaatlar"
              count={filteredAssistant.length}
              icon={Bot}
              tone="amber"
            >
              <ModuleTable
                items={filteredAssistant}
                columns={[
                  { key: 'trackCode', label: 'Trek/ID', render: (item) => (
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => { setOpenTrackCode(item.trackCode); setOpenModule('assistant'); }} className="rounded p-0.5 text-slate-400 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-500/15">
                        <Eye size={13} />
                      </button>
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {item.trackCode !== '—' ? item.trackCode : `ID-${item.customerId || '?'}`}
                      </span>
                    </div>
                  )},
                  { key: 'customer', label: 'Mijoz', render: (item) => (
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.customer || '—'}</div>
                      <div className="text-[10px] text-slate-500">{item.phone}</div>
                    </div>
                  )},
                  { key: 'problem', label: 'Muammo turi', render: (item) => (
                    <span className="text-xs text-slate-700 dark:text-slate-300">{item.problem || '—'}</span>
                  )},
                  { key: 'source', label: 'Manba', render: (item) => (
                    <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      {item.source || '—'}
                    </span>
                  )},
                  { key: 'assignedAt', label: 'Olindi', render: (item) => <span className="text-[11px] text-slate-500">{formatDate(item.assignedAt)}</span> },
                  { key: 'actions', label: '', render: () => (
                    <Link to="/assistant-ai" className="inline-flex items-center rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-amber-700">
                      Ishlash →
                    </Link>
                  )},
                ]}
              />
            </ModuleSection>
          )}
        </div>
      )}

      {/* Modal */}
      <TrackDetailModal
        trackCode={openTrackCode}
        open={Boolean(openTrackCode)}
        onClose={() => { setOpenTrackCode(null); setOpenModule(null); }}
        recoveryInfo={openedItem?.module === 'compensated' ? openedItem : null}
      />

      <input
        ref={receiptFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleReceiptFile}
        className="hidden"
      />
    </div>
  );
}

// ============================================================
// Workstation Card — 104 Moliya yuki uchun TO'LIQ ish maydoni
// ============================================================
function WorkstationCard({ item, onView, onChangeStatus, onChangeOutcome, onSaveComment, onUploadReceipt, onRemoveReceipt }) {
  const status = item.foundResolutionStatus || 'Jarayonda';
  const outcome = item.foundCaseOutcome || '';
  const isClosed = status === 'Yopildi';

  return (
    <article className="overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-md ring-2 ring-amber-200 dark:border-amber-500/30 dark:bg-slate-900 dark:ring-amber-500/20">
      {/* Header */}
      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/10">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onView}
            className="group inline-flex min-w-0 items-center gap-2"
            title="Tafsilot"
          >
            <Eye size={14} className="shrink-0 text-amber-600 transition group-hover:text-amber-700" />
            <span className="truncate font-mono text-sm font-extrabold text-slate-900 transition group-hover:text-amber-700 dark:text-white">
              {item.trackCode}
            </span>
          </button>
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 ring-1 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/40">
            ● {status}
          </span>
        </div>
        {item.customer && (
          <p className="mt-1 truncate text-xs text-slate-600 dark:text-slate-400">{item.customer}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <div className="text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Summa</div>
          <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">{formatMoney(item.paymentAmount)}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Topildi</div>
          <div className="text-xs font-bold text-slate-900 dark:text-white">{item.foundDate ? format(new Date(item.foundDate), 'dd.MM.yyyy') : '—'}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Kun</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">{item.recoveredDays ?? 0}</div>
        </div>
      </div>

      {/* Owner */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-blue-50/40 px-4 py-2 dark:border-slate-800 dark:bg-blue-500/5">
        <div className="flex items-center gap-1.5 text-xs">
          <User size={12} className="text-blue-600 dark:text-blue-400" />
          <span className="text-slate-500 dark:text-slate-400">Kim oldi:</span>
        </div>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          👤 {item.assignedTo || '—'}
        </span>
      </div>

      {/* Workstation controls */}
      <div className="space-y-3 p-3">
        {/* Status + Outcome */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Natija</label>
            <select
              value={outcome}
              onChange={(event) => onChangeOutcome(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Tanlanmagan</option>
              {FOUND_CASE_OUTCOME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</label>
            <select
              value={status}
              onChange={(event) => onChangeStatus(event.target.value)}
              className={clsx(
                'w-full rounded-lg border px-2 py-1.5 text-xs font-bold outline-none transition focus:ring-2',
                isClosed
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 focus:ring-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-200 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
              )}
            >
              {FOUND_CASE_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chek (faqat Mijoz pulni qaytardi) */}
        {outcome === 'Mijoz pulni qaytardi' && (
          <div>
            <label className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Chek</span>
              {!item.receiptFile && (
                <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">Talab qilinadi</span>
              )}
            </label>
            <ReceiptInline receipt={item.receiptFile} onUpload={onUploadReceipt} onRemove={onRemoveReceipt} />
          </div>
        )}

        {/* Hodim izohi */}
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Hodim izohi</label>
          <InlineCommentEditor value={item.workflowComment || ''} onSave={onSaveComment} />
        </div>

        {/* Yopish tugmasi (agar natija va kerakli ma'lumotlar bo'lsa) */}
        {!isClosed && outcome && (outcome !== 'Mijoz pulni qaytardi' || item.receiptFile) && (
          <button
            type="button"
            onClick={() => onChangeStatus('Yopildi')}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <CheckCircle2 size={14} />
            Yukni yopish
          </button>
        )}
        {!isClosed && (!outcome || (outcome === 'Mijoz pulni qaytardi' && !item.receiptFile)) && (
          <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-300">
            <AlertCircle size={11} className="mr-1 inline-block" />
            Yopish uchun {!outcome ? 'natija tanlang' : 'chek yuklang'}
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================
// Module Section — har bir modul uchun ajratilgan sarlavhali bo'lim
// ============================================================
function ModuleSection({ title, subtitle, count, icon: Icon, tone = 'slate', children }) {
  const tones = {
    slate: { iconBg: 'bg-slate-100 dark:bg-slate-800', iconColor: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', accent: 'border-slate-200 dark:border-slate-800' },
    blue: { iconBg: 'bg-blue-100 dark:bg-blue-500/20', iconColor: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', accent: 'border-blue-200 dark:border-blue-500/30' },
    violet: { iconBg: 'bg-violet-100 dark:bg-violet-500/20', iconColor: 'text-violet-700 dark:text-violet-300', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300', accent: 'border-violet-200 dark:border-violet-500/30' },
    emerald: { iconBg: 'bg-emerald-100 dark:bg-emerald-500/20', iconColor: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300', accent: 'border-emerald-200 dark:border-emerald-500/30' },
    amber: { iconBg: 'bg-amber-100 dark:bg-amber-500/20', iconColor: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300', accent: 'border-amber-200 dark:border-amber-500/30' },
  };
  const palette = tones[tone] || tones.slate;
  return (
    <section className={clsx('overflow-hidden rounded-2xl border-2 bg-white shadow-sm dark:bg-slate-900', palette.accent)}>
      {/* Sarlavha */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', palette.iconBg)}>
          {Icon && <Icon size={18} className={palette.iconColor} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            <span className={clsx('rounded-md px-1.5 py-0.5 text-[10px] font-extrabold', palette.badge)}>
              {count} ta
            </span>
          </div>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {/* Tarkib */}
      <div className="p-3">
        {children}
      </div>
    </section>
  );
}

// ============================================================
// Module Table — modullar uchun umumiy jadval
// ============================================================
function ModuleTable({ items, columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-3 py-2.5 align-top">
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Yordamchi komponentlar
// ============================================================
function FilterChip({ label, value, tone = 'slate', active = false, onClick }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
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

function ReceiptInline({ receipt, onUpload, onRemove }) {
  if (!receipt) {
    return (
      <button
        type="button"
        onClick={onUpload}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-500 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
      >
        <FileUp size={13} />
        Chek yuklash
      </button>
    );
  }
  const sizeKb = receipt.size ? Math.round(receipt.size / 1024) : 0;
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <FileCheck2 size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
      <a href={receipt.dataUrl} download={receipt.name} className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
        {receipt.name}
      </a>
      {sizeKb > 0 && <span className="shrink-0 text-[10px] text-emerald-600/70">{sizeKb} KB</span>}
      <button type="button" onClick={onUpload} title="Almashtirish" className="shrink-0 rounded-md p-1 text-emerald-600 hover:bg-emerald-100">
        <Paperclip size={12} />
      </button>
      <button type="button" onClick={onRemove} title="O'chirish" className="shrink-0 rounded-md p-1 text-rose-500 hover:bg-rose-100">
        <X size={12} />
      </button>
    </div>
  );
}

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
          <button type="button" onClick={handleSave} disabled={!dirty} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40">
            Saqlash
          </button>
          <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Bekor
          </button>
          <span className="ml-1 text-[9px] italic text-slate-400">Ctrl+Enter</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
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
