import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronsRight,
  ChevronRight,
  Clock,
  Lock,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  MODULE_102_STATUSES,
  computeWaitingHours,
  createComplaint,
  formatWaitingTime,
  getModule102Entries,
  getModule102Stats,
  getModule102SyncMeta,
  startModule102AutoSync,
  stopModule102AutoSync,
  subscribeToModule102,
  syncFromCRM,
} from '../services/module102Data';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';

const PAGE_SIZE = 20;

const STATUS_TONES = {
  qabul_qilindi: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  jarayonda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  yopildi: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  finansga_yuborish: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
};

const SIDEBAR_FILTERS = [
  { value: 'all', label: 'Barchasi', tone: 'text-slate-900 dark:text-white' },
  { value: 'mine', label: 'Mening jarayondagilarim', tone: 'text-indigo-600 dark:text-indigo-300' },
  { value: 'qabul_qilindi', label: 'Qabul qilindi', tone: 'text-sky-600 dark:text-sky-300' },
  { value: 'jarayonda', label: 'Jarayonda', tone: 'text-amber-600 dark:text-amber-300' },
  { value: 'yopildi', label: 'Yopildi', tone: 'text-emerald-600 dark:text-emerald-300' },
  { value: 'finansga_yuborish', label: 'Finansga yuborildi', tone: 'text-violet-600 dark:text-violet-300' },
];

export default function Module102Page() {
  const t = useT();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userName = user?.full_name || user?.username || '';
  const [newComplaintOpen, setNewComplaintOpen] = useState(false);
  const [trackSearchOpen, setTrackSearchOpen] = useState(false);

  const [entries, setEntries] = useState(() => getModule102Entries());
  const [syncMeta, setSyncMeta] = useState(() => getModule102SyncMeta());
  const [stats, setStats] = useState(() => getModule102Stats());
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const unsubscribe = subscribeToModule102(() => {
      setEntries(getModule102Entries());
      setSyncMeta(getModule102SyncMeta());
      setStats(getModule102Stats());
    });

    startModule102AutoSync({ intervalMinutes: 5 });
    // Memory leak'ni oldini olish — unmount'da interval'ni to'xtatish
    return () => {
      unsubscribe();
      stopModule102AutoSync();
    };
  }, []);

  const counts = useMemo(() => {
    const localMap = { all: entries.length, mine: 0 };
    MODULE_102_STATUSES.forEach((status) => {
      localMap[status] = 0;
    });

    entries.forEach((entry) => {
      if (localMap[entry.status] !== undefined) {
        localMap[entry.status] += 1;
      }
      if (entry.lockedBy === userName) {
        localMap.mine += 1;
      }
    });

    const crmBy = stats.hasCRMData ? stats.byStatus : null;
    if (!crmBy) return localMap;

    return {
      all: stats.totalEntries,
      mine: localMap.mine,
      qabul_qilindi: crmBy.qabul_qilindi,
      jarayonda: crmBy.jarayonda,
      yopildi: crmBy.yopildi,
      finansga_yuborish: crmBy.finansga_yuborish,
    };
  }, [entries, stats, userName]);

  const filteredByStatus = useMemo(() => {
    if (statusFilter === 'all') return entries;
    if (statusFilter === 'mine') {
      return entries.filter((entry) => entry.lockedBy === userName);
    }
    return entries.filter((entry) => entry.status === statusFilter);
  }, [entries, statusFilter, userName]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return filteredByStatus;
    return filteredByStatus.filter((entry) => {
      const haystack = [
        entry.phone,
        entry.customer,
        entry.id,
        ...(entry.tracks || []).map((track) => track.trackNumber),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filteredByStatus, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleManualSync() {
    setSyncing(true);
    const result = await syncFromCRM();
    setSyncing(false);
    setStats(getModule102Stats());

    if (result.ok) {
      if (result.hasCRM) {
        toast.success(`CRM dan sinxronlandi: ${result.count} ta yozuv`);
      } else {
        toast("Lokal ma'lumot yangilandi (CRM ga ulanib bo'lmadi)", { icon: '⚠️' });
      }
    } else {
      toast.error(`Sinxronlash xato: ${result.error}`);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              102 - OTK
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('module102Subtitle')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncIndicator meta={syncMeta} hasCRM={stats.hasCRMData} />
          <button
            type="button"
            onClick={() => setTrackSearchOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <Search size={15} />
            Trek qidirish
          </button>
          <button
            type="button"
            onClick={() => setNewComplaintOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-orange-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
          >
            <Plus size={15} />
            Yangi murojaat
          </button>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="qc-button h-10 rounded-xl px-3.5 text-sm font-semibold"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? t('refreshing') : t('refresh')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={t('module102TotalCustomers')} value={stats.totalCustomers} accent="from-blue-500/15" crmBadge={stats.hasCRMData} />
        <KpiCard label={t('module102TotalTracks')} value={stats.totalTracks} accent="from-orange-500/15" crmBadge={stats.hasCRMData} />
        <KpiCard label={t('module102OpenEntries')} value={stats.openCount} accent="from-amber-500/15" />
        <KpiCard label={t('module102SentToFinance')} value={stats.finansCount ?? counts.finansga_yuborish ?? 0} accent="from-violet-500/15" highlight />
      </div>

      {stats.hasCRMData && (
        <div className="flex flex-wrap gap-3">
          <StatPill label={t('module102Accepted')} value={stats.byStatus.qabul_qilindi} color="sky" />
          <StatPill label={t('module102InProgress')} value={stats.byStatus.jarayonda} color="amber" />
          <StatPill label={t('module102Closed')} value={stats.byStatus.yopildi} color="emerald" />
          <StatPill label={t('module102Finance')} value={stats.byStatus.finansga_yuborish} color="violet" />
          <span className="ml-auto self-center text-[11px] text-slate-400 dark:text-slate-500">
            CRM manba - {stats.crmSyncedAt ? format(new Date(stats.crmSyncedAt), 'HH:mm') : '-'}
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="qc-soft-card p-4">
          <p className="qc-section-title mb-3">{t('module102StatusFilter')}</p>
          <div className="space-y-1">
            {SIDEBAR_FILTERS.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  className={clsx(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    active
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : `${filter.tone} hover:bg-slate-100 dark:hover:bg-slate-800/60`
                  )}
                >
                  <span className="truncate">{filter.label}</span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-bold',
                      active
                        ? 'bg-white/15 text-white dark:bg-slate-900/15 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {counts[filter.value] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="qc-soft-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200/60 p-3 dark:border-slate-800/60">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t('module102SearchPlaceholder')}
                className="w-full rounded-xl bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-slate-400 dark:bg-slate-800/60 dark:ring-slate-700 dark:focus:ring-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="qc-button h-9 w-9 rounded-xl"
              title={t('refresh')}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-slate-50/60 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    <span className="inline-flex items-center gap-1.5"><Phone size={12} />{t('phone')}</span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">{t('customer')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('tracksShort')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('status')}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t('date')}</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    <span className="inline-flex items-center gap-1.5"><Clock size={12} />{t('waitingTime') || 'Kutish'}</span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">{t('responsiblePerson')}</th>
                  <th className="w-12 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400">
                      {t('module102Empty')}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((entry) => {
                    const waitingHours = computeWaitingHours(entry);
                    const waitingTone =
                      waitingHours < 4
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : waitingHours < 24
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-rose-600 dark:text-rose-300';

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => navigate(`/module-102/${entry.id}`)}
                        className="cursor-pointer transition hover:bg-orange-50 dark:hover:bg-orange-500/5"
                        title="Detail sahifasini ochish"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{entry.phone}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{entry.customer || <span className="text-slate-300">-</span>}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{(entry.tracks || []).length} ta trek</td>
                        <td className="px-4 py-3">
                          <span className={clsx('inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ring-1', STATUS_TONES[entry.status] || STATUS_TONES.qabul_qilindi)}>
                            {SIDEBAR_FILTERS.find((filter) => filter.value === entry.status)?.label || entry.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          {entry.createdAt ? format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm') : '-'}
                        </td>
                        <td className={clsx('px-4 py-3 text-xs font-semibold', waitingTone)}>{formatWaitingTime(waitingHours)}</td>
                        <td className="px-4 py-3 text-xs">
                          {entry.lockedBy ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                              <Lock size={11} />
                              {entry.lockedBy}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-300">
                          <ChevronRight size={16} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 p-3 text-xs text-slate-500 dark:border-slate-800/60 dark:text-slate-400">
            <p>
              {filtered.length === 0
                ? '0 ta yozuv'
                : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} ta`}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="qc-button h-8 rounded-lg px-3 text-xs disabled:opacity-40"
              >
                <ChevronLeft size={13} />
                <span>{t('previous') || 'Oldingi'}</span>
              </button>
              <span className="px-2 font-semibold text-slate-700 dark:text-slate-200">
                {t('page') || 'Sahifa'} {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                className="qc-button h-8 rounded-lg px-3 text-xs disabled:opacity-40"
              >
                <span>{t('next') || 'Keyingi'}</span>
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 text-xs font-medium text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Phone size={12} />
          {stats.totalCustomers} mijoz
        </span>
        <span className="text-slate-200 dark:text-slate-700">/</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-orange-500" />
          {stats.totalTracks} trek
        </span>
      </div>

      {newComplaintOpen && (
        <NewComplaintModal
          user={user}
          onClose={() => setNewComplaintOpen(false)}
          onCreated={(result) => {
            toast.success(`${result.count} ta murojaat yaratildi`);
            setNewComplaintOpen(false);
            if (result.entries?.[0]) {
              setTimeout(() => navigate(`/module-102/${result.entries[0].id}`), 200);
            }
          }}
        />
      )}

      {trackSearchOpen && (
        <TrackSearchModal
          entries={entries}
          onClose={() => setTrackSearchOpen(false)}
          onPick={(id) => {
            setTrackSearchOpen(false);
            navigate(`/module-102/${id}`);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Yangi murojaat yaratish modali
// ============================================================
function NewComplaintModal({ user, onClose, onCreated }) {
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tracks, setTracks] = useState('');
  const [courier, setCourier] = useState('');
  const [goodsCondition, setGoodsCondition] = useState('');
  const [clientNote, setClientNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleanPhone = phone.replace(/\D+/g, '').trim();
    if (!cleanPhone) {
      toast.error('Telefon raqami majburiy');
      return;
    }
    setSubmitting(true);
    try {
      const trackList = tracks
        .split(/[\n,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((t) => ({ trackNumber: t }));
      const result = createComplaint({
        phone: cleanPhone,
        customerName: customerName.trim(),
        tracks: trackList,
        courier,
        goodsCondition,
        clientNote: clientNote.trim(),
        actor: user,
      });
      if (result.ok) {
        onCreated(result);
      } else {
        toast.error('Yaratishda xato');
      }
    } catch (error) {
      console.error(error);
      toast.error('Yaratishda xato');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Yangi murojaat yaratish (102)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mijozdan keladigan formatda. Bu murojaat to'g'ridan-to'g'ri 102 ga tushadi.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Telefon raqami <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="943010737 yoki +998 94 301 07 37"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Mijoz ismi</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Aliyev Sardor"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Trek raqami(lari)</label>
            <textarea
              value={tracks}
              onChange={(e) => setTracks(e.target.value)}
              rows={3}
              placeholder={"Bir yoki bir necha trek. Yangi qatorda yoki vergul bilan ajratish.\nBir nechta trek bo'lsa — har biriga alohida murojaat yaratiladi."}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Kuryer / Kategoriya</label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">—</option>
                <option value="BTS">BTS</option>
                <option value="EMU">EMU</option>
                <option value="FARGO">FARGO</option>
                <option value="IPOST">IPOST</option>
                <option value="KURYERKA">KURYERKA</option>
                <option value="STAREX">STAREX</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Tovar holati</label>
              <select
                value={goodsCondition}
                onChange={(e) => setGoodsCondition(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">—</option>
                <option value="Boshqa mijoz olgan">Boshqa mijoz olgan</option>
                <option value="Singan">Singan</option>
                <option value="Yo'qolgan">Yo'qolgan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-200">Mijoz izohi</label>
            <textarea
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              rows={3}
              placeholder="Mijoz nimani aytdi"
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-40"
          >
            {submitting ? '⏳ Yaratilmoqda...' : '✅ Yaratish'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// Trek qidirish modali (global)
// ============================================================
function TrackSearchModal({ entries, onClose, onPick }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((entry) => {
      const haystack = [
        entry.phone,
        entry.customer,
        entry.id,
        ...(entry.tracks || []).map((t) => t.trackNumber),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    }).slice(0, 20);
  }, [entries, query]);

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-slate-900/60 p-4 pt-20 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Trek / Telefon / ID bo'yicha qidirish</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mijoz qayta qo'ng'iroq qilganida, trek raqam kiritib uning joriy holatini biling
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Trek raqam, telefon, ID yoki mijoz ismi..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {!query.trim() ? (
            <p className="py-10 text-center text-sm text-slate-400">Qidiruv so'zini kiriting...</p>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Hech narsa topilmadi</p>
          ) : (
            <ul className="space-y-1.5">
              {results.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onPick(entry.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-orange-300 hover:bg-orange-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/30 dark:hover:bg-orange-500/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-slate-400" />
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{entry.phone}</span>
                        {entry.customer && <span className="text-xs text-slate-500">· {entry.customer}</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold dark:bg-slate-800">
                          {(entry.tracks || []).length} ta trek
                        </span>
                        {(entry.tracks || []).slice(0, 2).map((t, i) => (
                          <span key={i} className="font-mono text-[10px]">{t.trackNumber}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, crmBadge, highlight }) {
  return (
    <div className={clsx('qc-kpi relative', highlight && 'ring-1 ring-violet-200 dark:ring-violet-500/20')}>
      <div className={clsx('pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-80', accent)} />
      <p className="relative qc-section-title">{label}</p>
      <p className="relative mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
      {crmBadge && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20">
          <Wifi size={9} />
          CRM
        </span>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  };

  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1', tones[color] || tones.sky)}>
      <TrendingUp size={11} />
      {label}: <strong>{value ?? 0}</strong>
    </span>
  );
}

function SyncIndicator({ meta, hasCRM }) {
  // Supabase ulanmaganmi tekshirish (custom CRM ham yo'q, Supabase ham yo'q)
  const supabaseOn = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );

  // Supabase ulangan, lekin CRM scraper ishlamaydi (HTTPS muhitda normal) —
  // bu "Bulutli baza" rejimi; lokal emas.
  const isCloudMode = supabaseOn && !hasCRM;

  if (!meta?.lastSyncAt && !isCloudMode) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Sinxronlash kutilmoqda
      </span>
    );
  }

  const ago = meta?.lastSyncAt
    ? Math.round((Date.now() - new Date(meta.lastSyncAt).getTime()) / 60000)
    : 0;
  const isError = meta?.status === 'error';

  // Cloud mode badge
  if (isCloudMode && !isError) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
        Bulutli baza
      </span>
    );
  }

  return (
    <span
      title={meta?.message || ''}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        isError
          ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
          : hasCRM
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      )}
    >
      {isError ? <WifiOff size={11} /> : hasCRM ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
      {isError ? 'Ulanish xatosi' : hasCRM ? (ago === 0 ? 'Hozir sinxronlandi' : `${ago} daq oldin sinxronlandi`) : 'Lokal rejim'}
    </span>
  );
}
