import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, CalendarClock, Filter, PackageCheck, RefreshCw, Search, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { getOtkEntries, getOtkSettings, subscribeToOtkData } from '../services/localData';
import { useT } from '../i18n';

const WARNING_DAYS = 3;
const ITEMS_PER_PAGE = 20;

export default function BranchesPage() {
  const t = useT();
  const [entries, setEntries] = useState(() => getOtkEntries());
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [branch, setBranch] = useState('all');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const refreshData = () => {
    setEntries(getOtkEntries());
    setSettings(getOtkSettings());
  };

  useEffect(() => {
    const sync = () => {
      setIsRefreshing(true);
      refreshData();
      window.setTimeout(() => setIsRefreshing(false), 180);
    };

    return subscribeToOtkData(sync, { debounceMs: 90 });
  }, []);

  const activeEntries = useMemo(
    () => entries.filter((entry) => entry.status !== 'Yopildi'),
    [entries]
  );

  const reminders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeEntries
      .map((entry) => ({ ...entry, waitingDays: getWaitingDays(entry.date) }))
      .filter((entry) => branch === 'all' || entry.department === branch)
      .filter((entry) => source === 'all' || entry.requestSource === source)
      .filter((entry) => {
        if (!query) return true;
        return [
          entry.trackCode,
          entry.problemType,
          entry.department,
          entry.requestSource,
          entry.comment,
          entry.status,
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [activeEntries, branch, source, search]);

  useEffect(() => {
    setPage(1);
  }, [branch, source, search]);

  const pageCount = Math.max(1, Math.ceil(reminders.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const paginatedReminders = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return reminders.slice(start, start + ITEMS_PER_PAGE);
  }, [reminders, page]);

  const overdueCount = reminders.filter((entry) => entry.waitingDays > WARNING_DAYS).length;
  const branchStats = summarize(activeEntries, 'department');
  const sourceStats = summarize(activeEntries, 'requestSource');

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
              <CalendarClock size={14} />
              {t('branchReminderTitle')}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('departmentsSources')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('branchReminderSubtitle')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Live sync
              </span>
              <button
                type="button"
                onClick={refreshData}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                Yangilash
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <HeroMetric
              label={t('inProgress')}
              value={activeEntries.length}
              note={t('activeWork')}
              icon={PackageCheck}
              tone="slate"
            />
            <HeroMetric
              label={t('reminders')}
              value={reminders.length}
              note={t('selectedPeriod')}
              icon={CalendarClock}
              tone="blue"
            />
            <HeroMetric
              label={t('days3Plus')}
              value={overdueCount}
              note={t('attentionNeeded')}
              icon={AlertTriangle}
              tone="rose"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SummaryCard title={t('departmentsTitle')} icon={Building2} items={branchStats} t={t} tone="slate" />
        <SummaryCard title={t('requestSources')} icon={Send} items={sourceStats} t={t} tone="blue" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:justify-between lg:grid-cols-[minmax(0,520px)_220px_220px] xl:grid-cols-[minmax(0,560px)_220px_220px]">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchComplaints')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-12 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800"
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

          <SelectFilter icon={Filter} value={branch} onChange={setBranch} options={settings.departments} allLabel={t('allDepartments')} />
          <SelectFilter value={source} onChange={setSource} options={settings.requestSources} allLabel={t('allSources')} />
        </div>
      </section>

      <section className="space-y-3">
        {reminders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <PackageCheck size={42} className="mx-auto mb-4 opacity-40" />
            <p className="text-base font-medium">{t('noActiveCargo')}</p>
          </div>
        ) : (
          <>
            {paginatedReminders.map((entry, index) => (
              <ReminderCard key={entry.id} entry={entry} t={t} index={(page - 1) * ITEMS_PER_PAGE + index} />
            ))}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('showing')} {Math.min((page - 1) * ITEMS_PER_PAGE + 1, reminders.length)}-
                {Math.min(page * ITEMS_PER_PAGE, reminders.length)} / {reminders.length}
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

function ReminderCard({ entry, t, index }) {
  const overdue = entry.waitingDays > WARNING_DAYS;

  return (
    <article
      className={clsx(
        'rounded-2xl border bg-white px-4 py-3 shadow-sm transition dark:bg-slate-900',
        overdue
          ? 'border-rose-200 ring-1 ring-rose-200 dark:border-rose-500/30 dark:ring-rose-500/20'
          : 'border-slate-200 dark:border-slate-800'
      )}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
        <div className="flex items-center gap-4 xl:min-w-[360px]">
          <div
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold',
              overdue
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            )}
          >
            {String(index + 1).padStart(2, '0')}
          </div>

          <div className="min-w-[92px]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('date')}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {format(new Date(entry.date), 'dd.MM.yyyy')}
            </p>
          </div>

          <div className="min-w-0 flex-1 xl:max-w-[190px]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('track')}
            </p>
            <p className="mt-0.5 truncate font-mono text-sm font-semibold text-slate-950 dark:text-white">{entry.trackCode}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{entry.department || t('notSpecified')}</Tag>
            <Tag tone="blue">{entry.requestSource || t('notSpecified')}</Tag>
            <Tag tone={overdue ? 'rose' : 'amber'}>{entry.waitingDays} {t('days')}</Tag>
          </div>
          <div className="mt-2 min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{entry.problemType}</p>
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{entry.comment || '-'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:ml-auto xl:flex-nowrap">
          <CompactInfoRow label={t('status')} value={entry.status} />
          <CompactInfoRow label={t('takenBy')} value={entry.handledBy || 'OTK workplace'} />
        </div>
      </div>
    </article>
  );
}

function CompactInfoRow({ label, value }) {
  return (
    <div className="min-w-[140px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value || '-'}</p>
    </div>
  );
}

function SummaryCard({ title, icon: Icon, items, t, tone }) {
  const max = items[0]?.count || 1;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center gap-3">
        <div className={clsx('rounded-2xl p-2.5', tone === 'blue' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{items.length || 0} ta guruh</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.slice(0, 6).map((item) => (
          <div key={item.name} className="rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-950/70">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                {item.count}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <div
                className={clsx('h-full rounded-full', tone === 'blue' ? 'bg-gradient-to-r from-blue-600 to-sky-500' : 'bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300')}
                style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-slate-400">{t('noData')}</p>}
      </div>
    </section>
  );
}

function SelectFilter({ icon: Icon, value, onChange, options, allLabel }) {
  return (
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      className={clsx(
        'w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pr-9 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800',
        Icon ? 'pl-9' : 'pl-3'
      )}
      >
        <option value="all">{allLabel}</option>
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );
}

function HeroMetric({ label, value, note, icon: Icon, tone }) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
  };

  return (
    <div className={clsx('rounded-2xl border p-4', toneClass[tone])}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-2.5 dark:bg-slate-900/60">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-xs opacity-80">{note}</p>
    </div>
  );
}

function Tag({ children, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  };

  return <span className={clsx('rounded-full px-2.5 py-1 text-xs font-medium', toneClass[tone])}>{children}</span>;
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">{value || '-'}</p>
    </div>
  );
}

function MiniInfoRow({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value || '-'}</p>
    </div>
  );
}

function summarize(items, key) {
  const counts = items.reduce((acc, item) => {
    const name = item[key] || 'Belgilanmagan';
    acc.set(name, (acc.get(name) || 0) + 1);
    return acc;
  }, new Map());

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function getWaitingDays(date) {
  const created = new Date(date);
  if (Number.isNaN(created.getTime())) return 0;
  const today = new Date();
  const start = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}
