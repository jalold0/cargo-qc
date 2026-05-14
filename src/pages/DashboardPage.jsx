import { useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle,
  Clock,
  CopyMinus,
  Download,
  FileText,
  Gauge,
  History,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { getAllOtkRecords, getOtkAuditLogs, getOtkDashboardStats, getSystemUsers, getWaitingDays, subscribeToOtkData, toDateKey } from '../services/localData';
import { isAdminRole, isManagerRole } from '../services/access';
import { exportMonthlyReportWorkbook } from '../services/monthlyReportExport';
import { useAuthStore, useLanguageStore } from '../store/authStore';
import { useT, useValueLabel } from '../i18n';

const DEMO_DATA = {
  summary: {
    today_total: 24,
    today_resolved: 17,
    in_progress: 36,
    overdue: 4,
  },
  weekly_trend: [
    { date: '2026-05-02', total: 18, resolved: 11 },
    { date: '2026-05-03', total: 22, resolved: 15 },
    { date: '2026-05-04', total: 16, resolved: 13 },
    { date: '2026-05-05', total: 31, resolved: 20 },
    { date: '2026-05-06', total: 28, resolved: 21 },
    { date: '2026-05-07', total: 34, resolved: 25 },
    { date: '2026-05-08', total: 24, resolved: 17 },
  ],
  type_counts: [
    { name: 'Keckish', count: 34 },
    { name: 'Shikastlangan', count: 18 },
    { name: "Yo'qolgan", count: 13 },
    { name: "Noto'g'ri filial", count: 9 },
  ],
  all_type_counts: [
    { name: 'Keckish', count: 34 },
    { name: 'Shikastlangan', count: 18 },
    { name: "Yo'qolgan", count: 13 },
    { name: "Noto'g'ri filial", count: 9 },
  ],
  source_counts: [
    { name: 'Telegram', count: 42 },
    { name: 'Call center', count: 31 },
    { name: 'Mijozlar', count: 24 },
    { name: 'Toshkent ombori', count: 16 },
  ],
  all_source_counts: [
    { name: 'Telegram', count: 42 },
    { name: 'Call center', count: 31 },
    { name: 'Mijozlar', count: 24 },
    { name: 'Toshkent ombori', count: 16 },
  ],
  monthly_report: {
    year: 2026,
    selectedYear: 2026,
    availableYears: [2031, 2030, 2029, 2028, 2027, 2026],
    firstMonth: 4,
    lastActiveMonth: 4,
    latestMonth: 4,
    previousMonth: 4,
    months: [
      { monthIndex: 4 },
      { monthIndex: 5 },
      { monthIndex: 6 },
      { monthIndex: 7 },
      { monthIndex: 8 },
      { monthIndex: 9 },
      { monthIndex: 10 },
      { monthIndex: 11 },
    ],
    totalRecords: 74,
    topProblem: { name: 'Keckish', count: 34 },
    increasedCount: 0,
    decreasedCount: 0,
    totals: [
      { monthIndex: 4, count: 74, trend: { direction: 'start', percent: null } },
      { monthIndex: 5, count: 0, trend: { direction: 'down', percent: -100 } },
      { monthIndex: 6, count: 0, trend: { direction: 'neutral', percent: 0 } },
      { monthIndex: 7, count: 0, trend: { direction: 'neutral', percent: 0 } },
      { monthIndex: 8, count: 0, trend: { direction: 'neutral', percent: 0 } },
      { monthIndex: 9, count: 0, trend: { direction: 'neutral', percent: 0 } },
      { monthIndex: 10, count: 0, trend: { direction: 'neutral', percent: 0 } },
      { monthIndex: 11, count: 0, trend: { direction: 'neutral', percent: 0 } },
    ],
    rows: [
      {
        problemType: 'Keckish',
        total: 34,
        months: [
          { monthIndex: 4, count: 34, trend: { direction: 'start', percent: null } },
          { monthIndex: 5, count: 0, trend: { direction: 'down', percent: -100 } },
          { monthIndex: 6, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 7, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 8, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 9, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 10, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 11, count: 0, trend: { direction: 'neutral', percent: 0 } },
        ],
      },
      {
        problemType: 'Shikastlangan',
        total: 18,
        months: [
          { monthIndex: 4, count: 18, trend: { direction: 'start', percent: null } },
          { monthIndex: 5, count: 0, trend: { direction: 'down', percent: -100 } },
          { monthIndex: 6, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 7, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 8, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 9, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 10, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 11, count: 0, trend: { direction: 'neutral', percent: 0 } },
        ],
      },
      {
        problemType: "Yo'qolgan",
        total: 13,
        months: [
          { monthIndex: 4, count: 13, trend: { direction: 'start', percent: null } },
          { monthIndex: 5, count: 0, trend: { direction: 'down', percent: -100 } },
          { monthIndex: 6, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 7, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 8, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 9, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 10, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 11, count: 0, trend: { direction: 'neutral', percent: 0 } },
        ],
      },
      {
        problemType: "Noto'g'ri filial",
        total: 9,
        months: [
          { monthIndex: 4, count: 9, trend: { direction: 'start', percent: null } },
          { monthIndex: 5, count: 0, trend: { direction: 'down', percent: -100 } },
          { monthIndex: 6, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 7, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 8, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 9, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 10, count: 0, trend: { direction: 'neutral', percent: 0 } },
          { monthIndex: 11, count: 0, trend: { direction: 'neutral', percent: 0 } },
        ],
      },
    ],
  },
  operator_performance: [
    { id: 1, full_name: 'Operator', resolved: 38, total_assigned: 44, resolve_rate: 86 },
    { id: 2, full_name: 'Supervisor', resolved: 31, total_assigned: 39, resolve_rate: 79 },
    { id: 3, full_name: 'Admin', resolved: 22, total_assigned: 26, resolve_rate: 85 },
  ],
  branch_counts: [
    { branch_name: 'Chilonzor', total: 32, resolved: 24, in_progress: 8 },
    { branch_name: 'Yunusobod', total: 26, resolved: 21, in_progress: 5 },
    { branch_name: 'Samarqand', total: 19, resolved: 14, in_progress: 5 },
    { branch_name: 'Fargona', total: 16, resolved: 12, in_progress: 4 },
  ],
  active_entries: [
    {
      id: 'demo-1',
      date: '2026-05-04',
      trackCode: '777381337851564',
      problemType: 'Yetkazish kechikishi',
      department: 'Logistika',
      requestSource: 'Telegram',
      status: 'Jarayonda',
      priority: 'Yuqori',
      comment: 'Filialga chiqishi kutilmoqda',
      handledBy: 'Operator',
      waitingDays: 4,
    },
  ],
};

const SUMMARY_CARDS = [
  {
    key: 'today_total',
    labelKey: 'totalTracks',
    subKey: 'selectedPeriod',
    icon: FileText,
    tone: 'from-blue-500 to-sky-400',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
  {
    key: 'today_resolved',
    labelKey: 'resolvedItems',
    subKey: 'closedItems',
    icon: CheckCircle,
    tone: 'from-emerald-500 to-teal-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  {
    key: 'in_progress',
    labelKey: 'inProgress',
    subKey: 'activeWork',
    icon: Clock,
    tone: 'from-amber-400 to-orange-400',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  {
    key: 'overdue',
    labelKey: 'overdue',
    subKey: 'attentionNeeded',
    icon: AlertTriangle,
    tone: 'from-rose-500 to-red-500',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  },
];

const PIE_COLORS = ['#2563eb', '#0f766e', '#f59e0b', '#e11d48', '#7c3aed'];
const REPORT_MONTH_LABELS = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const PRIORITY_BADGE = {
  Yuqori: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  "O'rta": 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  Past: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
};

function shouldShowDemo(localStats, range) {
  const filterActive = Boolean(range.from || range.to);
  if (filterActive) return false;
  return !localStats.summary?.today_total && !localStats.active_count && !localStats.archived_count;
}

function buildDemoMonthlyTemplate(selectedYear) {
  const months = Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex }));
  const rows = (DEMO_DATA.monthly_report.rows || []).map((row) => ({
    ...row,
    total: 0,
    months: months.map((month, index) => ({
      monthIndex: month.monthIndex,
      count: 0,
      trend: index === 0 ? { direction: 'start', percent: null } : { direction: 'neutral', percent: 0 },
    })),
  }));

  return {
    ...DEMO_DATA.monthly_report,
    year: selectedYear,
    selectedYear,
    firstMonth: 0,
    lastActiveMonth: null,
    latestMonth: null,
    previousMonth: null,
    totalRecords: 0,
    topProblem: null,
    increasedCount: 0,
    decreasedCount: 0,
    months,
    totals: months.map((month, index) => ({
      monthIndex: month.monthIndex,
      count: 0,
      trend: index === 0 ? { direction: 'start', percent: null } : { direction: 'neutral', percent: 0 },
    })),
    rows,
  };
}

function resolveDashboardStats(localStats, range, reportYear) {
  if (!shouldShowDemo(localStats, range)) return localStats;

  const selectedYear = Number(reportYear);
  if (Number.isFinite(selectedYear) && selectedYear !== DEMO_DATA.monthly_report.selectedYear) {
    return {
      ...DEMO_DATA,
      monthly_report: buildDemoMonthlyTemplate(selectedYear),
    };
  }

  return DEMO_DATA;
}

export default function DashboardPage() {
  const t = useT();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [problemTypesModalOpen, setProblemTypesModalOpen] = useState(false);
  const [requestSourcesModalOpen, setRequestSourcesModalOpen] = useState(false);
  const [activeTracksModalOpen, setActiveTracksModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [employeeDateRange, setEmployeeDateRange] = useState({ from: '', to: '' });
  const [monthlyReportYear, setMonthlyReportYear] = useState('');
  const [allRecords, setAllRecords] = useState(() => getAllOtkRecords());
  const [systemUsers, setSystemUsers] = useState(() => getSystemUsers());
  const [auditLogs, setAuditLogs] = useState(() => getOtkAuditLogs());
  const [stats, setStats] = useState(() => {
    const localStats = getOtkDashboardStats({}, { reportYear: '' });
    return resolveDashboardStats(localStats, { from: '', to: '' }, '');
  });
  const [isFetching, setIsFetching] = useState(false);
  const valueLabel = useValueLabel();
  const isDemo = stats === DEMO_DATA;
  const canCreateOrder = isAdminRole(user?.role) || isManagerRole(user?.role);
  const canViewLeaderKpi = isAdminRole(user?.role) || isManagerRole(user?.role);
  const {
    summary,
    type_counts,
    all_type_counts,
    source_counts,
    all_source_counts,
    operator_performance,
    weekly_trend,
    branch_counts,
    active_entries,
    all_active_entries,
    kpi = {},
    recent_activity = [],
    monthly_report = {},
  } = stats;
  const employeeStats = useMemo(() => buildEmployeeStats(employeeDateRange, allRecords, systemUsers), [employeeDateRange, allRecords, systemUsers]);
  const employeeTotals = useMemo(() => summarizeEmployees(employeeStats), [employeeStats]);
  const fullTypeCounts = all_type_counts?.length ? all_type_counts : type_counts || [];
  const fullSourceCounts = all_source_counts?.length ? all_source_counts : source_counts || [];
  const sourceChartData = fullSourceCounts.filter((item) => item.count > 0);
  const reportMonthLabels = REPORT_MONTH_LABELS[language] || REPORT_MONTH_LABELS.uz;
  const formatMonthLabel = (_year, monthIndex) => reportMonthLabels[monthIndex] || '-';
  const monthlyReportRows = monthly_report.rows || [];
  const monthlyReportYearOptions = monthly_report.availableYears?.length
    ? monthly_report.availableYears.map((year) => String(year))
    : [String(new Date().getFullYear())];
  const monthlyReportMonths = useMemo(
    () => (monthly_report.months || []).map((month) => ({
      ...month,
      label: formatMonthLabel(monthly_report.year || new Date().getFullYear(), month.monthIndex),
    })),
    [monthly_report.months, monthly_report.year, reportMonthLabels]
  );
  const monthlyReportPreviewRows = monthlyReportRows.slice(0, 8);
  const monthlyReportPeriodLabel = monthlyReportMonths.length
    ? `${monthlyReportMonths[0].label} - ${monthlyReportMonths[monthlyReportMonths.length - 1].label}`
    : '-';
  const monthlyReportLatestLabel = monthly_report.latestMonth != null
    ? formatMonthLabel(monthly_report.year || new Date().getFullYear(), monthly_report.latestMonth)
    : '-';
  const fullActiveEntries = all_active_entries?.length ? all_active_entries : active_entries || [];
  const oldestOpenTracks = fullActiveEntries.slice(0, 5);
  const duplicateGroups = useMemo(() => buildDuplicateGroups(allRecords, dateRange), [allRecords, dateRange]);
  const slaDetailEntries = useMemo(
    () => fullActiveEntries
      .filter((entry) => entry.waitingDays >= 2)
      .map((entry) => ({
        ...entry,
        slaState: entry.waitingDays >= 5 ? 'critical' : 'warning',
      }))
      .sort((a, b) => b.waitingDays - a.waitingDays || new Date(a.date) - new Date(b.date)),
    [fullActiveEntries]
  );

  useEffect(() => {
    const syncDashboard = () => {
      const localStats = getOtkDashboardStats(dateRange, { reportYear: monthlyReportYear });
      setAllRecords(getAllOtkRecords());
      setSystemUsers(getSystemUsers());
      setAuditLogs(getOtkAuditLogs());
      setStats(resolveDashboardStats(localStats, dateRange, monthlyReportYear));
    };

    return subscribeToOtkData(syncDashboard, { debounceMs: 90 });
  }, [dateRange, monthlyReportYear]);

  const refetch = () => {
    setIsFetching(true);
    const localStats = getOtkDashboardStats(dateRange, { reportYear: monthlyReportYear });
    setAllRecords(getAllOtkRecords());
    setSystemUsers(getSystemUsers());
    setAuditLogs(getOtkAuditLogs());
    setStats(resolveDashboardStats(localStats, dateRange, monthlyReportYear));
    window.setTimeout(() => setIsFetching(false), 250);
  };

  const exportMonthlyReport = async () => {
    try {
      await exportMonthlyReportWorkbook({
        report: monthly_report,
        monthLabels: monthlyReportMonths,
        periodLabel: monthlyReportPeriodLabel,
        latestLabel: monthlyReportLatestLabel,
        title: t('monthlyReport'),
        subtitle: t('monthlyReportSubtitle'),
        totalLabel: t('totalRecordsLabel'),
        topProblemLabel: t('topProblemLabel'),
        topProblemHint: t('topProblemHint'),
        decreasedLabel: t('decreasedLabel'),
        increasedLabel: t('increasedLabel'),
        greenSignalLabel: t('greenSignal'),
        redSignalLabel: t('redSignal'),
        periodKeyLabel: t('periodLabel'),
        lastActiveMonthKeyLabel: t('lastActiveMonthLabel'),
        generatedAtLabel: t('generatedAt'),
        monthlyChangeHint: t('monthlyChangeHint'),
        problemTypeLabel: t('problemType'),
        totalColumnLabel: t('total'),
      });
      toast.success(t('exportMonthlyReportSuccess'));
    } catch (error) {
      console.error('Monthly report export failed', error);
      toast.error(t('exportMonthlyReportFailed'));
    }
  };

  const applyDateFilter = (nextRange) => {
    setDateRange(nextRange);
    setIsFetching(true);
    const localStats = getOtkDashboardStats(nextRange, { reportYear: monthlyReportYear });
    setAllRecords(getAllOtkRecords());
    setSystemUsers(getSystemUsers());
    setAuditLogs(getOtkAuditLogs());
    setStats(resolveDashboardStats(localStats, nextRange, monthlyReportYear));
    window.setTimeout(() => setIsFetching(false), 250);
  };

  const applyMonthlyReportYear = (year) => {
    setMonthlyReportYear(year);
    setIsFetching(true);
    const localStats = getOtkDashboardStats(dateRange, { reportYear: year });
    setAllRecords(getAllOtkRecords());
    setSystemUsers(getSystemUsers());
    setAuditLogs(getOtkAuditLogs());
    setStats(resolveDashboardStats(localStats, dateRange, year));
    window.setTimeout(() => setIsFetching(false), 250);
  };

  const trendData = (weekly_trend || []).map((d) => ({
    name: format(new Date(d.date), 'dd MMM', { locale: uz }),
    Jami: Number(d.total),
    Yopildi: Number(d.resolved),
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="qc-panel relative z-50 rounded-2xl">
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {canViewLeaderKpi ? t('executiveOverview') : t('operationsPanel')}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-3xl">
              {t('overview')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {format(new Date(), 'dd MMMM yyyy, EEEE', { locale: uz })}. {canViewLeaderKpi ? t('dashboardExecutiveSubtitle') : t('dashboardSubtitle')}
            </p>
          </div>

          <div className="space-y-3">
            {canViewLeaderKpi && (
              <div className="grid gap-2 sm:grid-cols-3">
                <ExecutivePulse label={t('resolvedItems')} value={`${summary?.today_resolved || 0}/${summary?.today_total || 0}`} tone="emerald" />
                <ExecutivePulse label={t('overdue')} value={summary?.overdue || 0} tone="rose" />
                <ExecutivePulse label={t('duplicateRisk')} value={kpi.duplicateGroups || 0} tone="slate" />
              </div>
            )}
            <div className="flex flex-wrap gap-2 xl:justify-end">
              {isDemo && (
                <span className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                  {t('demoData')}
                </span>
              )}
              <DateRangeFilter
                value={dateRange}
                onChange={applyDateFilter}
                label={t('dateFilter')}
              />
              <button
                onClick={refetch}
                disabled={isFetching}
                className="qc-button inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60"
              >
                <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                {t('refresh')}
              </button>
              {canCreateOrder && (
                <Link
                  to="/complaints/new"
                  className="qc-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
                >
                  <Plus size={16} />
                  {t('newComplaint')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map(({ key, labelKey, subKey, icon: Icon, tone, badge }) => (
          <div
            key={key}
            className="qc-soft-card rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
          >
            <div className={clsx('mb-4 h-1.5 rounded-full bg-gradient-to-r', tone)} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(labelKey)}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {summary?.[key] || 0}
                </p>
              </div>
              <div className={clsx('rounded-xl bg-gradient-to-br p-2.5 text-white shadow-[0_10px_20px_rgba(15,23,42,0.14)]', tone)}>
                <Icon size={20} />
              </div>
            </div>
            <div className={clsx('mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-medium', badge)}>{t(subKey)}</div>
          </div>
        ))}
      </section>

      {canViewLeaderKpi && (
        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel title={t('leaderKpi')} subtitle={t('leaderKpiSubtitle')}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <KpiMetricCard
                icon={Gauge}
                label={t('closeRate')}
                value={`${kpi.closeRate || 0}%`}
                hint={`${summary?.today_resolved || 0}/${summary?.today_total || 0}`}
                tone="blue"
              />
              <KpiMetricCard
                icon={CheckCircle}
                label={t('averageCloseDays')}
                value={`${kpi.averageCloseDays || 0} ${t('daysShort')}`}
                hint={t('closedItems')}
                tone="emerald"
              />
              <KpiMetricCard
                icon={Clock}
                label={t('averageOpenDays')}
                value={`${kpi.averageOpenDays || 0} ${t('daysShort')}`}
                hint={t('inProgress')}
                tone="amber"
              />
              <KpiMetricCard
                icon={CopyMinus}
                label={t('duplicateRisk')}
                value={kpi.duplicateGroups || 0}
                hint={`${kpi.duplicateRecords || 0} ${t('duplicateRecordsLabel')}`}
                tone="rose"
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-white p-2 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      <ShieldAlert size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('slaOverview')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('leaderSlaSubtitle')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlaModalOpen(true)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('expand')}
                  </button>
                </div>

                <div className="space-y-3">
                  <ProgressRow label={t('healthy')} value={kpi.sla?.healthy || 0} max={kpi.sla?.total || 1} />
                  <ProgressRow label={t('warning')} value={kpi.sla?.warning || 0} max={kpi.sla?.total || 1} />
                  <ProgressRow label={t('critical')} value={kpi.sla?.critical || 0} max={kpi.sla?.total || 1} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniKpiStat label={t('overdue')} value={kpi.overdueOpen || 0} tone="rose" />
                  <MiniKpiStat label={t('financeQueue')} value={summary?.finance || 0} tone="sky" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl bg-white p-2 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                      <History size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('recentActivity')}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('recentActivitySubtitle')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuditModalOpen(true)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('expand')}
                  </button>
                </div>

                <div className="space-y-3">
                  {recent_activity.length ? recent_activity.map((item) => (
                    <ActivityRow key={item.id} item={item} />
                  )) : (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
                      {t('noActivityYet')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title={t('executiveFocus') || t('leaderFocus')} subtitle={t('executiveFocusSubtitle') || t('leaderFocusSubtitle')}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-500" />
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('duplicateExamples')}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDuplicateModalOpen(true)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('expand')}
                  </button>
                </div>
                <div className="space-y-2">
                  {kpi.duplicateExamples?.length ? kpi.duplicateExamples.map((item) => (
                    <div key={item.trackCode} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-slate-950 dark:text-white">{item.trackCode}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.activeCount} {t('active').toLowerCase()}, {item.archivedCount} {t('archive').toLowerCase()}
                        </p>
                      </div>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                        {item.count}x
                      </span>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400">{t('noDuplicateRisk')}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('oldestOpenTracks')}</h3>
                </div>
                <div className="space-y-2">
                  {oldestOpenTracks.length ? oldestOpenTracks.map((item) => (
                    <div key={item.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <Link to={`/complaints/${item.id}`} className="font-mono text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                          {item.trackCode}
                        </Link>
                        <span className={clsx('rounded-full px-2 py-1 text-xs font-semibold ring-1', PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.Past)}>
                          {item.waitingDays} {t('daysShort')}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {item.department || '-'} • {item.requestSource || '-'} • {item.handledBy || '-'}
                      </p>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400">{t('noActiveTracks')}</p>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </section>
      )}

      {auditModalOpen && (
        <InsightModal
          title={t('recentActivity')}
          subtitle={t('recentActivitySubtitle')}
          onClose={() => setAuditModalOpen(false)}
        >
          <div className="space-y-3">
            {auditLogs.length ? auditLogs.map((item) => (
              <ActivityRow key={item.id} item={item} />
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
                {t('noActivityYet')}
              </p>
            )}
          </div>
        </InsightModal>
      )}

      {duplicateModalOpen && (
        <InsightModal
          title={t('duplicateExamples')}
          subtitle={t('duplicateModalSubtitle')}
          onClose={() => setDuplicateModalOpen(false)}
        >
          <div className="space-y-3">
            {duplicateGroups.length ? duplicateGroups.map((item) => (
              <div key={item.trackCode} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/tracking?search=${encodeURIComponent(item.trackCode)}`} className="font-mono text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                    {item.trackCode}
                  </Link>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                    {item.count}x
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <MiniKpiStat label={t('active')} value={item.activeCount} tone="amber" />
                  <MiniKpiStat label={t('archive')} value={item.archivedCount} tone="sky" />
                  <MiniKpiStat label={t('totalTracks')} value={item.count} tone="rose" />
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
                {t('noDuplicateRisk')}
              </p>
            )}
          </div>
        </InsightModal>
      )}

      {slaModalOpen && (
        <InsightModal
          title={t('slaOverview')}
          subtitle={t('slaModalSubtitle')}
          onClose={() => setSlaModalOpen(false)}
        >
          <div className="space-y-3">
            {slaDetailEntries.length ? slaDetailEntries.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to={`/complaints/${item.id}`} className="font-mono text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                      {item.trackCode}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(item.date), 'dd.MM.yyyy')} / {item.department || '-'} / {item.requestSource || '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', item.slaState === 'critical' ? PRIORITY_BADGE.Yuqori : PRIORITY_BADGE["O'rta"])}>
                      {item.waitingDays} {t('daysShort')}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                      {item.handledBy || '-'}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.problemType}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.comment || '-'}</p>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
                {t('noActiveTracks')}
              </p>
            )}
          </div>
        </InsightModal>
      )}

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={t('weeklyTrend')} subtitle={t('weeklyTrendSubtitle')}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="total" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="Jami" stroke="#2563eb" strokeWidth={2.8} fill="url(#total)" />
              <Area type="monotone" dataKey="Yopildi" stroke="#0f766e" strokeWidth={2.8} fill="url(#resolved)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title={t('problemTypes')}
          subtitle={t('last30Days')}
          onHeaderClick={() => setProblemTypesModalOpen(true)}
          actionLabel={t('expand')}
        >
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={type_counts || []} dataKey="count" nameKey="name" innerRadius={50} outerRadius={76} paddingAngle={3}>
                {(type_counts || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {(type_counts || []).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-950 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {problemTypesModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="qc-panel flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Maximize2 size={14} />
                  {t('problemTypes')}
                </div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{t('problemTypes')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('last30Days')}</p>
              </div>
              <button
                onClick={() => setProblemTypesModalOpen(false)}
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={fullTypeCounts} dataKey="count" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={3}>
                        {fullTypeCounts.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <div className="space-y-3 p-4">
                      {fullTypeCounts.map((item, i) => (
                        <div key={item.name} className="rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-950/70">
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              <span className="truncate font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                            </div>
                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                              {item.count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500"
                              style={{ width: `${Math.max(6, (item.count / (fullTypeCounts[0]?.count || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {!fullTypeCounts.length && (
                        <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t('requestSources')}
          subtitle={t('requestSourcesSubtitle')}
          onHeaderClick={() => setRequestSourcesModalOpen(true)}
          actionLabel={t('expand')}
        >
          <div className="space-y-4">
            {(source_counts || []).map(({ name, count }) => (
              <ProgressRow
                key={name}
                label={name}
                value={count}
                max={source_counts?.[0]?.count || 1}
              />
            ))}
          </div>
        </Panel>

        <Panel
          title={t('employeePerformance')}
          subtitle={t('employeePerformanceSubtitle')}
          onHeaderClick={() => setEmployeeModalOpen(true)}
          actionLabel={t('expand')}
        >
          <div className="space-y-3">
            {(employeeStats.length ? employeeStats : operator_performance || []).slice(0, 5).map((op) => (
              <div key={op.id} className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/62 p-3 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/38">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                  {op.avatarUrl ? <img src={op.avatarUrl} alt={op.full_name} className="h-9 w-9 rounded-full object-cover" /> : op.full_name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{op.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {op.resolved}/{op.total_assigned || op.total || 0} murojaat yopildi
                  </p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {op.resolve_rate || 0}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {requestSourcesModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="qc-panel flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Maximize2 size={14} />
                  {t('requestSources')}
                </div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{t('requestSources')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('requestSourcesModalSubtitle')}</p>
              </div>
              <button
                onClick={() => setRequestSourcesModalOpen(false)}
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Yopish"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('requestSources')}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('last30Days')}</p>
                  {sourceChartData.length ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={sourceChartData} dataKey="count" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={3}>
                          {sourceChartData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-800">
                      {t('noData')}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('allSources')}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                      {fullSourceCounts.length} ta
                    </span>
                  </div>
                  <div className="space-y-3">
                    {fullSourceCounts.map((item) => (
                      <div key={item.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <ProgressRow
                          label={item.name}
                          value={item.count}
                          max={fullSourceCounts[0]?.count || 1}
                        />
                      </div>
                    ))}
                    {!fullSourceCounts.length && (
                      <p className="py-6 text-center text-sm text-slate-400">{t('noData')}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {employeeModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="qc-panel flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
              <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Maximize2 size={14} />
                    {t('employeesSection')}
                  </div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{t('employeePerformance')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('employeeModalSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                  <DateRangeFilter
                    value={employeeDateRange}
                    onChange={setEmployeeDateRange}
                    label={t('dateFilter')}
                  />
                <button
                  onClick={() => setEmployeeModalOpen(false)}
                  className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <EmployeeMetric label={t('totalTrack')} value={employeeTotals.total} />
                <EmployeeMetric label={t('resolved')} value={employeeTotals.resolved} tone="emerald" />
                <EmployeeMetric label={t('inProgress')} value={employeeTotals.active} tone="amber" />
                <EmployeeMetric label="5+ kun" value={employeeTotals.highRisk} tone="rose" />
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('employee')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('enteredTracks')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('resolved')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('inProgress')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">5+ kun</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('result')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {employeeStats.map((employee) => (
                        <tr key={employee.key} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                                {employee.avatarUrl ? <img src={employee.avatarUrl} alt={employee.full_name} className="h-9 w-9 rounded-full object-cover" /> : employee.full_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-950 dark:text-white">{employee.full_name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{employee.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{employee.total}</td>
                          <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300">{employee.resolved}</td>
                          <td className="px-4 py-3 text-amber-700 dark:text-amber-300">{employee.active}</td>
                          <td className="px-4 py-3 text-rose-700 dark:text-rose-300">{employee.highRisk}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${employee.resolve_rate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{employee.resolve_rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {employeeStats.map((employee) => (
                  <div key={employee.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-950 dark:text-white">{employee.full_name} treklari</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        {employee.entries.length} ta
                      </span>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {employee.entries.length === 0 ? (
                        <p className="py-5 text-center text-sm text-slate-400">{t('noTracksEntered')}</p>
                      ) : (
                        employee.entries.slice(0, 20).map((entry) => (
                          <Link
                            key={entry.id}
                            to={`/complaints/${entry.id}`}
                            onClick={() => setEmployeeModalOpen(false)}
                            className="grid gap-2 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono font-semibold text-slate-950 dark:text-white">{entry.trackCode}</span>
                              <span className={clsx('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', PRIORITY_BADGE[entry.priority])}>
                                {valueLabel(entry.priority)}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              <span>{format(new Date(entry.date), 'dd.MM.yyyy')}</span>
                              <span>{valueLabel(entry.status)}</span>
                              <span>{entry.department}</span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTracksModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="qc-panel flex max-h-[92vh] w-full max-w-7xl flex-col rounded-2xl shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Maximize2 size={14} />
                  {t('monthlyReport')}
                </div>
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{t('monthlyReport')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('monthlyReportSubtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-[150px]">
                  <DashboardSelect
                    value={monthlyReportYear || String(monthly_report.selectedYear || monthlyReportYearOptions[0])}
                    onChange={applyMonthlyReportYear}
                    options={monthlyReportYearOptions}
                    labels={Object.fromEntries(monthlyReportYearOptions.map((year) => [year, `${t('monthlyReportYear')}: ${year}`]))}
                  />
                </div>
                <button
                  onClick={exportMonthlyReport}
                  className="qc-button inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition"
                >
                  <Download size={15} />
                  {t('exportMonthlyReport')}
                </button>
                <button
                  onClick={() => setActiveTracksModalOpen(false)}
                  className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <MonthlyReportContent
                t={t}
                report={monthly_report}
                monthLabels={monthlyReportMonths}
                periodLabel={monthlyReportPeriodLabel}
                latestLabel={monthlyReportLatestLabel}
                full
              />
            </div>
          </div>
        </div>
      )}

      <Panel title={t('responsibleDepartment')} subtitle={t('departmentSubtitle')}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(branch_counts || []).map((item) => (
            <DepartmentCard key={item.branch_name} item={item} />
          ))}
        </div>
      </Panel>

      <Panel
        title={t('monthlyReport')}
        subtitle={t('monthlyReportSubtitle')}
        onHeaderClick={() => setActiveTracksModalOpen(true)}
        actionLabel={t('expand')}
        actions={(
          <>
            <div className="min-w-[120px]">
              <DashboardSelect
                value={monthlyReportYear || String(monthly_report.selectedYear || monthlyReportYearOptions[0])}
                onChange={applyMonthlyReportYear}
                options={monthlyReportYearOptions}
              />
            </div>
            <button
              onClick={exportMonthlyReport}
              className="qc-button inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              <Download size={15} />
              {t('exportMonthlyReport')}
            </button>
          </>
        )}
      >
        <MonthlyReportContent
          t={t}
          report={monthly_report}
          monthLabels={monthlyReportMonths}
          periodLabel={monthlyReportPeriodLabel}
          latestLabel={monthlyReportLatestLabel}
          rows={monthlyReportPreviewRows}
        />
      </Panel>
    </div>
  );
}

function Panel({ title, subtitle, className, children, onHeaderClick, actionLabel, actions = null }) {
  return (
    <div className={clsx('qc-panel rounded-2xl p-4', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {onHeaderClick && (
            <button
              onClick={onHeaderClick}
              className="qc-button inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
            >
              <Maximize2 size={15} />
              {actionLabel}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function MonthlyReportContent({ t, report, monthLabels, periodLabel, latestLabel, rows, full = false }) {
  const visibleRows = rows || report.rows || [];
  const totalProblemTypes = report.rows?.length || 0;
  const decreasedShare = totalProblemTypes ? Math.round(((report.decreasedCount || 0) / totalProblemTypes) * 100) : 0;
  const increasedShare = totalProblemTypes ? Math.round(((report.increasedCount || 0) / totalProblemTypes) * 100) : 0;
  const totalRow = {
    problemType: t('total'),
    total: report.totalRecords || 0,
    months: report.totals || [],
  };

  return (
    <div className="space-y-4">
      {full && (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">WORKPLACE CRM</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('monthlyReport')}</h3>
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-4">
        <MonthlyReportMetricCard
          label={t('totalRecordsLabel')}
          value={report.totalRecords || 0}
          hint={periodLabel}
          tone="blue"
        />
        <MonthlyReportMetricCard
          label={t('topProblemLabel')}
          value={report.topProblem?.name || t('noData')}
          secondaryValue={report.topProblem ? report.topProblem.count : null}
          hint={t('topProblemHint')}
          tone="blue"
          compactText
        />
        <MonthlyReportMetricCard
          label={t('decreasedLabel')}
          value={report.decreasedCount || 0}
          hint={t('greenSignal')}
          tone="emerald"
          metaBadge={`${decreasedShare}%`}
        />
        <MonthlyReportMetricCard
          label={t('increasedLabel')}
          value={report.increasedCount || 0}
          hint={t('redSignal')}
          tone="rose"
          metaBadge={`${increasedShare}%`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t('periodLabel')}: {periodLabel}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t('lastActiveMonthLabel')}: {latestLabel}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t('monthlyChangeHint')}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                <th className="min-w-[280px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('problemType')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('total')}</th>
                {monthLabels.map((month) => (
                  <th key={month.monthIndex} className="min-w-[160px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <MonthlyReportRow row={totalRow} monthLabels={monthLabels} />
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={monthLabels.length + 2} className="px-4 py-12 text-center text-slate-400">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <MonthlyReportRow key={row.problemType} row={row} monthLabels={monthLabels} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!full && report.rows?.length > visibleRows.length && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('showing')} {visibleRows.length} / {report.rows.length}
        </p>
      )}
    </div>
  );
}

function MonthlyReportRow({ row, monthLabels }) {
  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{row.problemType}</td>
      <td className="px-4 py-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{row.total}</td>
      {monthLabels.map((month) => {
        const monthData = row.months?.find((item) => item.monthIndex === month.monthIndex) || { count: 0, trend: { direction: 'neutral', percent: 0 } };
        return (
          <td key={month.monthIndex} className="px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{monthData.count}</span>
              <TrendBadge trend={monthData.trend} />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function MonthlyReportMetricCard({
  label,
  value,
  hint,
  tone = 'blue',
  secondaryValue = null,
  metaBadge = null,
  compactText = false,
}) {
  const toneClass = {
    blue: 'border-blue-200/80 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10',
    emerald: 'border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    rose: 'border-rose-200/80 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/10',
  };
  const accentClass = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
  };
  const isNumericValue = typeof value === 'number';
  const displayValue = isNumericValue ? value.toLocaleString() : value;
  const valueToneClass = {
    blue: 'text-slate-950 dark:text-white',
    emerald: 'text-slate-950 dark:text-white',
    rose: 'text-slate-950 dark:text-white',
  };
  const badgeToneClass = {
    blue: 'bg-white/85 text-blue-700 ring-blue-200 dark:bg-slate-900/70 dark:text-blue-300 dark:ring-blue-500/20',
    emerald: 'bg-white/85 text-emerald-700 ring-emerald-200 dark:bg-slate-900/70 dark:text-emerald-300 dark:ring-emerald-500/20',
    rose: 'bg-white/85 text-rose-700 ring-rose-200 dark:bg-slate-900/70 dark:text-rose-300 dark:ring-rose-500/20',
  };

  return (
    <div className={clsx('relative h-full overflow-hidden rounded-2xl border p-4', toneClass[tone])}>
      <div className={clsx('absolute inset-y-0 left-0 w-1.5', accentClass[tone])} />
      <div className="flex min-h-[156px] flex-col justify-between pl-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{label}</p>
          {metaBadge && (
            <span className={clsx('inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1', badgeToneClass[tone])}>
              {metaBadge}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p
            className={clsx(
              'break-words font-semibold tracking-tight',
              valueToneClass[tone],
              isNumericValue
                ? 'text-[clamp(1.8rem,2.6vw,2.4rem)]'
                : compactText
                  ? 'max-w-[14ch] text-[clamp(1.05rem,1.65vw,1.55rem)] leading-tight'
                  : 'text-[clamp(1.15rem,1.9vw,1.9rem)] leading-tight'
            )}
          >
            {displayValue}
          </p>
          {secondaryValue != null && (
            <p className="text-[clamp(1.2rem,1.7vw,1.6rem)] font-semibold tracking-tight text-slate-950 dark:text-white">
              {Number(secondaryValue).toLocaleString()}
            </p>
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

function TrendBadge({ trend }) {
  if (!trend || trend.percent == null) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        -
      </span>
    );
  }

  const toneClass = {
    up: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    down: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    neutral: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    start: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  };

  const prefix = trend.percent > 0 ? '+' : '';
  const Icon = trend.direction === 'up'
    ? ArrowUpRight
    : trend.direction === 'down'
      ? ArrowDownRight
      : null;

  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1', toneClass[trend.direction] || toneClass.neutral)}>
      {Icon ? <Icon size={12} /> : null}
      {prefix}{trend.percent}%
    </span>
  );
}

function DashboardSelect({ value, onChange, options, labels = {} }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-800"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option] || option}
        </option>
      ))}
    </select>
  );
}

function DateRangeFilter({ value, onChange, label }) {
  const t = useT();
  const pickerId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [monthCursor, setMonthCursor] = useState(() => getInitialMonth(value));
  const hasValue = value.from || value.to;
  const text = hasValue ? `${formatDateLabel(value.from) || '...'} - ${formatDateLabel(value.to) || '...'}` : label;

  useEffect(() => {
    setDraft(value);
    setMonthCursor(getInitialMonth(value));
  }, [value]);

  useEffect(() => {
    const closePicker = (event) => {
      if (event.detail?.source !== pickerId) {
        setOpen(false);
      }
    };
    window.addEventListener('qc-close-popovers', closePicker);
    return () => window.removeEventListener('qc-close-popovers', closePicker);
  }, [pickerId]);

  const openPicker = () => {
    window.dispatchEvent(new CustomEvent('qc-close-popovers', { detail: { source: pickerId } }));
    setDraft(value);
    setMonthCursor(getInitialMonth(value));
    setOpen((current) => !current);
  };

  const selectDate = (dateKey) => {
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: dateKey, to: '' });
      return;
    }

    if (dateKey < draft.from) {
      setDraft({ from: dateKey, to: draft.from });
      return;
    }

    setDraft({ from: draft.from, to: dateKey });
  };

  const apply = () => {
    onChange(normalizeRange(draft));
    setOpen(false);
  };

  const clear = () => {
    onChange({ from: '', to: '' });
    setDraft({ from: '', to: '' });
    setOpen(false);
  };

  const days = buildCalendarDays(monthCursor);

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={openPicker}
        className={clsx(
          'inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition',
          hasValue
            ? 'border-blue-200 bg-white text-slate-900 shadow-sm dark:border-blue-500/30 dark:bg-slate-900 dark:text-white'
            : 'qc-button text-slate-600'
        )}
      >
        <CalendarDays size={16} />
        <span className="whitespace-nowrap">{text}</span>
      </button>
      {hasValue && (
        <button
          type="button"
          onClick={clear}
          className="qc-button rounded-xl px-3 py-2.5 text-sm font-medium transition"
        >
          Tozalash
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-12 z-[220] w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{label}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Yopish"
            >
              <X size={16} />
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                className="rounded-lg px-2 py-1 text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                &lt;
              </button>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{formatMonthTitle(monthCursor)}</p>
              <button
                type="button"
                onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                className="rounded-lg px-2 py-1 text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                &gt;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((day) => (
                <span key={day} className="py-1">{day}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const selected = day.key === draft.from || day.key === draft.to;
                const inRange = draft.from && draft.to && day.key > draft.from && day.key < draft.to;

                return (
                  <button
                    key={`${day.key}-${day.inMonth}`}
                    type="button"
                    onClick={() => selectDate(day.key)}
                    className={clsx(
                      'h-9 rounded-lg text-sm font-medium transition',
                      !day.inMonth && 'text-slate-300 dark:text-slate-600',
                      inRange && 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
                      selected && 'bg-slate-950 text-white dark:bg-white dark:text-slate-950',
                      !selected && !inRange && day.inMonth && 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
            <div className="flex items-center justify-between gap-3">
              <span>{t('start')}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateLabel(draft.from) || '-'}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>{t('end')}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDateLabel(draft.to) || '-'}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={apply}
              className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {t('apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateLabel(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function getInitialMonth(value) {
  const dateValue = value.from || value.to;
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatMonthTitle(date) {
  const monthNames = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function normalizeRange(range) {
  if (range.from && range.to && range.to < range.from) {
    return { from: range.to, to: range.from };
  }
  return range;
}

function EmployeeMetric({ label, value, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-950 ring-slate-200 dark:bg-slate-950 dark:text-white dark:ring-slate-800',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  };

  return (
    <div className={clsx('rounded-2xl p-4 ring-1', toneClass[tone])}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function KpiMetricCard({ icon: Icon, label, value, hint, tone = 'blue' }) {
  const toneClass = {
    blue: 'text-blue-700 ring-blue-100 dark:text-blue-300 dark:ring-blue-500/20',
    emerald: 'text-emerald-700 ring-emerald-100 dark:text-emerald-300 dark:ring-emerald-500/20',
    amber: 'text-amber-700 ring-amber-100 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'text-rose-700 ring-rose-100 dark:text-rose-300 dark:ring-rose-500/20',
  };
  const accentClass = {
    blue: 'from-blue-600 to-sky-500',
    emerald: 'from-emerald-600 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-500',
  };

  return (
    <div className={clsx('flex min-h-[164px] flex-col rounded-2xl bg-white p-4 ring-1 dark:bg-slate-950/80', toneClass[tone])}>
      <div className={clsx('mb-4 h-1.5 rounded-full bg-gradient-to-r', accentClass[tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5 opacity-80">{label}</p>
          <p className="mt-3 break-words text-[clamp(1.9rem,3vw,2.5rem)] font-semibold leading-none tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5 text-current ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function ExecutivePulse({ label, value, tone = 'slate' }) {
  const toneClass = {
    slate: 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  };

  return (
    <div className={clsx('rounded-2xl px-3 py-3 ring-1', toneClass[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function MiniKpiStat({ label, value, tone = 'slate' }) {
  const toneClass = {
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
  };

  return (
    <div className={clsx('rounded-xl px-3 py-3 ring-1', toneClass[tone])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value, max }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100/70 dark:bg-slate-800 dark:ring-slate-700">
        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function ActivityRow({ item }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.message || '-'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {item.actorName || 'System'} • {format(new Date(item.timestamp), 'dd.MM.yyyy HH:mm')}
          </p>
        </div>
        {item.trackCode ? (
          <span className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700">
            {item.trackCode}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function InsightModal({ title, subtitle, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="qc-panel flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Maximize2 size={14} />
              {title}
            </div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Yopish"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function DepartmentCard({ item }) {
  const t = useT();
  const total = Number(item.total) || 0;
  const resolved = Number(item.resolved) || 0;
  const inProgress = Number(item.in_progress) || Math.max(0, total - resolved);
  const resolvedPercent = total ? Math.round((resolved / total) * 100) : 0;
  const progressPercent = total ? Math.round((inProgress / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/66 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{item.branch_name}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('totalRequests')}</p>
        </div>
        <span className="rounded-lg bg-white px-2.5 py-1 text-sm font-semibold text-slate-950 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700">
          {total}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <RatioRow
          label={t('resolvedItems')}
          value={`${resolved}/${total}`}
          percent={resolvedPercent}
          barClass="bg-emerald-500"
          textClass="text-emerald-700 dark:text-emerald-300"
        />
        <RatioRow
          label={t('inProgress')}
          value={`${inProgress}/${total}`}
          percent={progressPercent}
          barClass="bg-amber-500"
          textClass="text-amber-700 dark:text-amber-300"
        />
      </div>
    </div>
  );
}

function RatioRow({ label, value, percent, barClass, textClass }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={clsx('font-semibold', textClass)}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className={clsx('h-full rounded-full', barClass)} style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
    </div>
  );
}

function buildEmployeeStats(range, recordsSource = [], usersSource = []) {
  const records = filterRecordsByEmployeeRange(recordsSource, range);
  const users = usersSource;
  const employeeUsers = users.filter((user) => isAdminRole(user.role) || isManagerRole(user.role));
  const distributionUsers = employeeUsers.filter((user) => !isAdminRole(user.role));
  const fallbackDistributionUsers = distributionUsers.length ? distributionUsers : employeeUsers;
  const employeeBuckets = new Map(employeeUsers.map((user) => [String(user.id), []]));
  const employeeNameKeys = employeeUsers.map((user) => ({
    user,
    ...buildEmployeeMatchKeys(user),
  }));
  const distributableEntries = [];
  const unassignedEntries = [];

  records.forEach((entry) => {
    const owner = normalizeName(resolveEntryOwner(entry));
    const directUser = employeeUsers.find(
      (user) => user.id === entry.handledById || user.id === entry.createdById
    );

    if (directUser) {
      if (isAdminRole(directUser.role) && (!owner || owner === 'admin')) {
        distributableEntries.push(entry);
        return;
      }
      employeeBuckets.get(String(directUser.id))?.push(entry);
      return;
    }

    if (!owner) {
      distributableEntries.push(entry);
      return;
    }

    if (owner === 'isfandiyor' || owner === 'admin') {
      distributableEntries.push(entry);
      return;
    }

    const matchedUser = employeeNameKeys.find(({ keys, tokens }) => {
      if (keys.has(owner)) return true;
      const ownerTokens = tokenizeName(owner);
      if (!ownerTokens.length) return false;
      return ownerTokens.every((token) => tokens.has(token));
    })?.user;
    if (matchedUser) {
      if (isAdminRole(matchedUser.role) && owner === 'admin') {
        distributableEntries.push(entry);
        return;
      }
      employeeBuckets.get(String(matchedUser.id))?.push(entry);
      return;
    }

    distributableEntries.push(entry);
  });

  distributableEntries
    .sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.trackCode).localeCompare(String(b.trackCode)))
    .forEach((entry) => {
      const targetUser = fallbackDistributionUsers
        .slice()
        .sort((left, right) => {
          const leftCount = employeeBuckets.get(String(left.id))?.length || 0;
          const rightCount = employeeBuckets.get(String(right.id))?.length || 0;
          if (leftCount !== rightCount) return leftCount - rightCount;
          return String(left.full_name || left.username || left.id).localeCompare(
            String(right.full_name || right.username || right.id)
          );
        })[0];

      if (targetUser) {
        employeeBuckets.get(String(targetUser.id))?.push(entry);
      } else {
        unassignedEntries.push(entry);
      }
    });

  const rows = employeeUsers
    .map((user) => {
      const entries = [...(employeeBuckets.get(String(user.id)) || [])];
      const resolved = entries.filter((entry) => entry.status === 'Yopildi').length;
      const active = entries.filter((entry) => entry.status !== 'Yopildi').length;
      const highRisk = entries.filter((entry) => entry.status !== 'Yopildi' && getWaitingDays(entry.date) >= 5).length;
      const total = entries.length;

      return {
        id: user.id,
        key: String(user.id),
        full_name: user.full_name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        total,
        total_assigned: total,
        resolved,
        active,
        highRisk,
        resolve_rate: total ? Math.round((resolved / total) * 100) : 0,
        entries: entries.sort((a, b) => new Date(b.date) - new Date(a.date)),
      };
    })
    .filter((employee) => !isAdminRole(employee.role) || employee.total > 0)
    .sort((a, b) => b.total - a.total || b.resolved - a.resolved);

  if (unassignedEntries.length) {
    const resolved = unassignedEntries.filter((entry) => entry.status === 'Yopildi').length;
    const active = unassignedEntries.filter((entry) => entry.status !== 'Yopildi').length;
    const highRisk = unassignedEntries.filter((entry) => entry.status !== 'Yopildi' && getWaitingDays(entry.date) >= 5).length;

    rows.push({
      id: 'unassigned',
      key: 'unassigned',
      full_name: 'Belgilanmagan',
      role: 'Eski yozuv',
      avatarUrl: '',
      total: unassignedEntries.length,
      total_assigned: unassignedEntries.length,
      resolved,
      active,
      highRisk,
      resolve_rate: unassignedEntries.length ? Math.round((resolved / unassignedEntries.length) * 100) : 0,
      entries: unassignedEntries.sort((a, b) => new Date(b.date) - new Date(a.date)),
    });
  }

  return rows;
}

function buildDuplicateGroups(records, range) {
  const from = range?.from || '';
  const to = range?.to || '';
  const groups = new Map();

  records.forEach((entry) => {
    const key = normalizeTrackKey(entry.trackCode);
    const dateKey = toDateKey(entry.date);
    if (!key) return;
    if (from && dateKey < from) return;
    if (to && dateKey > to) return;

    if (!groups.has(key)) {
      groups.set(key, {
        trackCode: entry.trackCode,
        count: 0,
        activeCount: 0,
        archivedCount: 0,
      });
    }

    const bucket = groups.get(key);
    bucket.count += 1;
    if (entry.archiveStatus === 'archived' || entry.status === 'Yopildi') {
      bucket.archivedCount += 1;
    } else {
      bucket.activeCount += 1;
    }
  });

  return Array.from(groups.values())
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count || a.trackCode.localeCompare(b.trackCode));
}

function normalizeTrackKey(value) {
  return String(value || '').trim().toLowerCase();
}

function summarizeEmployees(employees) {
  return employees.reduce(
    (acc, employee) => ({
      total: acc.total + employee.total,
      resolved: acc.resolved + employee.resolved,
      active: acc.active + employee.active,
      highRisk: acc.highRisk + employee.highRisk,
    }),
    { total: 0, resolved: 0, active: 0, highRisk: 0 }
  );
}

function filterRecordsByEmployeeRange(records, range) {
  return records.filter((entry) => {
    const key = toDateKey(entry.date);
    if (range.from && key < range.from) return false;
    if (range.to && key > range.to) return false;
    return true;
  });
}

function resolveEntryOwner(entry) {
  const owner = entry.handledBy || entry.createdBy || entry.lastUpdatedBy;
  if (!owner || normalizeName(owner) === 'otk workplace') return '';
  return owner;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function buildEmployeeMatchKeys(user) {
  const keys = new Set();
  const tokens = new Set();
  const values = [user.full_name, user.username]
    .map(normalizeName)
    .filter(Boolean);

  values.forEach((value) => {
    keys.add(value);
    const parts = tokenizeName(value);
    parts.forEach((part) => {
      keys.add(part);
      tokens.add(part);
    });
    if (parts.length > 1) {
      keys.add([...parts].reverse().join(' '));
      keys.add([...parts].sort().join(' '));
    }
  });

  return { keys, tokens };
}

function tokenizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 xl:col-span-2" />
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

