import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowDownAZ, Building2, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, MessageSquare, Search, ShieldAlert, Truck, X } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { getAllOtkRecords, subscribeToOtkData } from '../services/localData';
import { useT, useValueLabel } from '../i18n';
import TrackDetailModal from '../components/TrackDetailModal';

const STATUS_STYLE = {
  Yopildi: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  Jarayonda: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  "Qabul qildi": 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  "Moliyaga yo'naltirildi": 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
};

const PRIORITY_STYLE = {
  Yuqori: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  "O'rta": 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  Past: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const ITEMS_PER_PAGE = 30;

export default function TrackingPage() {
  const t = useT();
  const valueLabel = useValueLabel();
  const [records, setRecords] = useState(() => getAllOtkRecords());
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [openTrackCode, setOpenTrackCode] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | closed | archive
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest

  useEffect(() => {
    const syncRecords = () => setRecords(getAllOtkRecords());
    return subscribeToOtkData(syncRecords, { debounceMs: 70 });
  }, []);

  const summary = useMemo(() => ({
    total: records.length,
    active: records.filter((record) => record.archiveStatus === 'active').length,
    closed: records.filter((record) => record.status === 'Yopildi').length,
    archived: records.filter((record) => record.archiveStatus === 'archived').length,
  }), [records]);

  const departments = useMemo(() => {
    const set = new Set();
    records.forEach((record) => {
      if (record.department) set.add(record.department);
    });
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = records;

    // Status filter
    if (statusFilter === 'active') list = list.filter((r) => r.archiveStatus === 'active');
    else if (statusFilter === 'closed') list = list.filter((r) => r.status === 'Yopildi');
    else if (statusFilter === 'archive') list = list.filter((r) => r.archiveStatus === 'archived');

    // Department filter
    if (departmentFilter !== 'all') list = list.filter((r) => r.department === departmentFilter);

    // Search filter
    if (q) {
      list = list.filter((record) =>
        [record.trackCode, record.problemType, record.department, record.status, record.comment]
          .filter(Boolean)
          .some((item) => String(item).toLowerCase().includes(q))
      );
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      return sortBy === 'oldest' ? -diff : diff;
    });
    return sorted;
  }, [records, query, statusFilter, departmentFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, departmentFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const activeFiltersCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (departmentFilter !== 'all' ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter('all');
    setDepartmentFilter('all');
    setQuery('');
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* KOMPAKT HEADER — title + KPI inline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30">
              <Truck size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">{t('tracking')}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('trackingSubtitle')}</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <KpiChip label={t('total')} value={summary.total} icon={Truck} tone="slate" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <KpiChip label={t('active')} value={summary.active} icon={Clock} tone="amber" active={statusFilter === 'active'} onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')} />
            <KpiChip label={t('resolved')} value={summary.closed} icon={CheckCircle2} tone="emerald" active={statusFilter === 'closed'} onClick={() => setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')} />
            <KpiChip label={t('archive')} value={summary.archived} icon={Archive} tone="slate" active={statusFilter === 'archive'} onClick={() => setStatusFilter(statusFilter === 'archive' ? 'all' : 'archive')} />
          </div>
        </div>

        {/* Search + filters bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchTracking') || 'Trek, mijoz, izoh...'}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">🏢 Barcha bo'limlar</option>
            {departments.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="newest">↓ Yangi</option>
            <option value="oldest">↑ Eski</option>
          </select>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-1.5 text-[11px] font-bold text-rose-700 transition hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30"
            >
              <X size={12} />
              {activeFiltersCount} ta filtr tozalash
            </button>
          )}

          <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span> ta natija
          </span>
        </div>
      </section>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Truck size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('notFound')}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Filtr yoki qidiruv so'zini o'zgartiring</p>
        </div>
      ) : (
        <>
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {paginatedRecords.map((record) => (
              <TrackCard
                key={`${record.archiveStatus}-${record.id}`}
                record={record}
                t={t}
                valueLabel={valueLabel}
                onOpen={() => setOpenTrackCode(record.trackCode)}
              />
            ))}
          </section>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}
                {' – '}
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)}
                {' / '}
                <span className="font-bold text-slate-700 dark:text-slate-200">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
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

      <TrackDetailModal
        trackCode={openTrackCode}
        open={Boolean(openTrackCode)}
        onClose={() => setOpenTrackCode(null)}
      />
    </div>
  );
}

// ============================================================
// KPI Chip — klik qilinadigan filter chip
// ============================================================
function KpiChip({ label, value, icon: Icon, tone = 'slate', active = false, onClick }) {
  const tones = {
    slate: { bg: 'bg-slate-50 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-200', icon: 'text-slate-500', activeRing: 'ring-slate-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600', activeRing: 'ring-amber-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-600', activeRing: 'ring-emerald-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-600', activeRing: 'ring-blue-400' },
  };
  const palette = tones[tone] || tones.slate;
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition hover:brightness-105',
        palette.bg,
        palette.text,
        active && `ring-2 ${palette.activeRing}`
      )}
    >
      {Icon && <Icon size={13} className={palette.icon} />}
      <span>{label}</span>
      <span className="rounded bg-white/70 px-1 text-[10px] tabular-nums dark:bg-white/10">{value}</span>
    </button>
  );
}

// ============================================================
// Track Card — kompakt va dense (4 ustun gridda sig'adi)
// ============================================================
function TrackCard({ record, t, valueLabel, onOpen }) {
  const isArchived = record.archiveStatus === 'archived';
  const statusKey = record.status || 'Jarayonda';
  const priorityKey = record.priority || 'Past';

  return (
    <article className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30">
      {/* Header: eye + trek + status */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpen}
            title="Trek tafsilotini ko'rish"
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
          >
            <Eye size={14} />
          </button>
          <h2 className="truncate font-mono text-xs font-bold text-slate-950 dark:text-white" title={record.trackCode}>
            {record.trackCode}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={clsx('rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase', STATUS_STYLE[statusKey] || STATUS_STYLE.Jarayonda)}>
            {valueLabel(statusKey)}
          </span>
          {isArchived && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={t('archive')}>
              <Archive size={9} className="inline" />
            </span>
          )}
        </div>
      </div>

      {/* Date + department */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} />
          {format(new Date(record.date), 'dd.MM.yyyy HH:mm')}
        </span>
        <span className="inline-flex items-center gap-1 truncate" title={record.department}>
          <Building2 size={10} />
          <span className="truncate">{record.department || '—'}</span>
        </span>
      </div>

      {/* Body — Problem + Priority */}
      <div className="space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Problem</span>
          <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold', PRIORITY_STYLE[priorityKey] || PRIORITY_STYLE.Past)}>
            {valueLabel(priorityKey)}
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1" title={record.problemType}>
          {record.problemType || '—'}
        </div>
      </div>

      {/* Comment (faqat bor bo'lsa) */}
      {record.comment && (
        <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <MessageSquare size={9} />
            Izoh
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300" title={record.comment}>
            {record.comment}
          </p>
        </div>
      )}
    </article>
  );
}
