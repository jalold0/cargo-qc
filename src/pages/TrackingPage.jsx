import { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Clock, Search, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { getAllOtkRecords, subscribeToOtkData } from '../services/localData';
import { useT, useValueLabel } from '../i18n';

const STATUS_STYLE = {
  Yopildi: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  Jarayonda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  "Moliyaga yo'naltirildi": 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
};

const ITEMS_PER_PAGE = 20;

export default function TrackingPage() {
  const t = useT();
  const valueLabel = useValueLabel();
  const [records, setRecords] = useState(() => getAllOtkRecords());
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const syncRecords = () => setRecords(getAllOtkRecords());
    return subscribeToOtkData(syncRecords, { debounceMs: 70 });
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!value) return sorted;
    return sorted.filter((record) =>
      [record.trackCode, record.problemType, record.department, record.status, record.comment]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(value))
    );
  }, [records, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const summary = useMemo(() => ({
    total: records.length,
    active: records.filter((record) => record.archiveStatus === 'active').length,
    closed: records.filter((record) => record.status === 'Yopildi').length,
    archived: records.filter((record) => record.archiveStatus === 'archived').length,
  }), [records]);

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('tracking')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('trackingSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric icon={Truck} label={t('total')} value={summary.total} />
            <Metric icon={Clock} label={t('active')} value={summary.active} />
            <Metric icon={CheckCircle2} label={t('resolved')} value={summary.closed} />
            <Metric icon={Archive} label={t('archive')} value={summary.archived} />
          </div>
        </div>
      </section>

      <div className="relative">
        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchTracking')}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
        />
      </div>

      <section className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Truck size={40} className="mx-auto mb-3 opacity-40" />
            <p>{t('notFound')}</p>
          </div>
        ) : (
          <>
            {paginatedRecords.map((record) => (
              <TrackCard key={`${record.archiveStatus}-${record.id}`} record={record} t={t} valueLabel={valueLabel} />
            ))}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('showing')} {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}-
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)} / {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t('page')} {page} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t('previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page === pageCount}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function TrackCard({ record, t, valueLabel }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-semibold text-slate-950 dark:text-white">{record.trackCode}</h2>
            <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', STATUS_STYLE[record.status])}>
              {valueLabel(record.status)}
            </span>
            <span
              className={clsx(
                'rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                record.archiveStatus === 'archived'
                  ? 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                  : 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20'
              )}
            >
              {record.archiveStatus === 'archived' ? t('archive') : t('active')}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {format(new Date(record.date), 'dd.MM.yyyy HH:mm')} · {record.department}
          </p>
        </div>

        <div className="grid gap-2 text-sm lg:min-w-[360px]">
          <Info label={t('problem')} value={record.problemType} />
          <Info label={t('priority')} value={valueLabel(record.priority)} />
          <Info label={t('comment')} value={record.comment || '-'} />
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}
