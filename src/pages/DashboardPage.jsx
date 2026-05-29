import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle,
  Clock,
  Clock3,
  CopyMinus,
  Download,
  FileText,
  Gauge,
  History,
  Maximize2,
  PackageSearch,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users2,
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
import {
  getAllOtkRecords,
  getCompensatedLoadRegistry,
  getOtkAuditLogs,
  getOtkDashboardStats,
  getOtkSettings,
  getRecoveredCompensatedLoads,
  getSystemUsers,
  getWaitingDays,
  hydrateComplaintsByDateRange,
  subscribeToOtkData,
  toDateKey,
} from '../services/localData';
import {
  getWarehouseReturns,
  subscribeToWarehouseReturns,
} from '../services/warehouseData';
import { Warehouse } from 'lucide-react';
import { buildDepartmentStatsAligned as buildUnifiedDepartmentStats } from '../services/departmentAnalytics';
import { isAdminRole, isManagerRole } from '../services/access';
import { exportMonthlyReportWorkbook } from '../services/monthlyReportExport';
import {
  calcProblemRatio,
  classifyProblemRatio,
  formatKg,
  formatTracks,
  getYearTotals,
} from '../services/salesData';
import { useAuthStore, useLanguageStore } from '../store/authStore';
import { useT, useValueLabel } from '../i18n';
import {
  addMonths,
  buildCalendarDays,
  buildCompensatedBreakdown,
  buildCompensatedOverview,
  formatDateLabel,
  formatMoneyShort,
  formatMonthTitle,
  getInitialMonth,
  normalizeDashboardMoney,
  normalizeDashboardText,
  normalizeRange,
} from './dashboard/utils';
import {
  ActivityRow,
  DuplicateDetailField,
  EmployeeMetric,
  ExecutivePulse,
  KpiMetricCard,
  MiniKpiStat,
  ProblemRatioCard,
  ProgressRow,
  RatioRow,
  SalesStatCard,
  SimpleRankList,
  TrendBadge,
} from './dashboard/cards';
import {
  MonthlyReportContent,
  buildMonthlyReportShareText,
} from './dashboard/MonthlyReport';

// DEMO_DATA faqat DEV rejimida ishlaydi (boshlang'ich ma'lumot yo'q holatda preview uchun).
// Production buildda Vite tree-shake qiladi, lekin biz ham guard qo'shamiz.
const DEMO_DATA = import.meta.env.DEV ? {
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
    { id: 3, full_name: 'Jaloldin Mirzakbarov', resolved: 22, total_assigned: 26, resolve_rate: 85 },
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
} : null;

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
  // Productionda DEMO_DATA umuman ko'rsatilmaydi
  if (!DEMO_DATA) return false;
  const filterActive = Boolean(range.from || range.to);
  if (filterActive) return false;
  return !localStats.summary?.today_total && !localStats.active_count && !localStats.archived_count;
}

function buildDemoMonthlyTemplate(selectedYear) {
  if (!DEMO_DATA) return null;
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
  if (!DEMO_DATA) return localStats;

  const selectedYear = Number(reportYear);
  if (Number.isFinite(selectedYear) && selectedYear !== DEMO_DATA.monthly_report.selectedYear) {
    return {
      ...DEMO_DATA,
      monthly_report: buildDemoMonthlyTemplate(selectedYear),
    };
  }

  return DEMO_DATA;
}

// Joriy kalendar oy boshini ISO formatda qaytaradi: "2026-05-01"
function getCurrentMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// Bugun ISO formatda: "2026-05-26"
function getTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const t = useT();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  // DEFAULT: joriy kalendar oy (masalan 1 May - 26 May).
  // User'lar kerak bo'lsa filtr orqali kengaytiradi.
  const [dateRange, setDateRange] = useState(() => ({
    from: getCurrentMonthStart(),
    to: getTodayIso(),
  }));
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [problemTypesModalOpen, setProblemTypesModalOpen] = useState(false);
  const [requestSourcesModalOpen, setRequestSourcesModalOpen] = useState(false);
  const [activeTracksModalOpen, setActiveTracksModalOpen] = useState(false);
  const [leaderPanelOpen, setLeaderPanelOpen] = useState(false);
  const [departmentsModalOpen, setDepartmentsModalOpen] = useState(false);
  const [compensatedControlModalOpen, setCompensatedControlModalOpen] = useState(false);
  const [dashboardBreakdownView, setDashboardBreakdownView] = useState('problems');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateDetailModalOpen, setDuplicateDetailModalOpen] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState(null);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [departmentForecastModalOpen, setDepartmentForecastModalOpen] = useState(false);
  const [departmentSelectedMonth, setDepartmentSelectedMonth] = useState(() => currentDate.getMonth());
  const [departmentSelectedYear, setDepartmentSelectedYear] = useState(currentYear);
  const [employeeDateRange, setEmployeeDateRange] = useState({ from: '', to: '' });
  const [monthlyReportYear, setMonthlyReportYear] = useState('');
  const [allRecords, setAllRecords] = useState(() => getAllOtkRecords());
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [compensatedRegistry, setCompensatedRegistry] = useState(() => getCompensatedLoadRegistry());
  const [recoveredCompensatedLoads, setRecoveredCompensatedLoads] = useState(() => getRecoveredCompensatedLoads());
  const [warehouseReturns, setWarehouseReturns] = useState(() => getWarehouseReturns());
  const [systemUsers, setSystemUsers] = useState(() => getSystemUsers());
  const [auditLogs, setAuditLogs] = useState(() => getOtkAuditLogs());
  const [stats, setStats] = useState(() => {
    const localStats = getOtkDashboardStats({}, { reportYear: '' });
    return resolveDashboardStats(localStats, { from: '', to: '' }, '');
  });
  const [isFetching, setIsFetching] = useState(false);
  const valueLabel = useValueLabel();
  const isDemo = stats === DEMO_DATA;
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
  const departmentStats = useMemo(
    () => buildUnifiedDepartmentStats(allRecords, systemUsers, settings.problemTypes || [], departmentSelectedMonth, departmentSelectedYear),
    [allRecords, systemUsers, settings.problemTypes, departmentSelectedMonth, departmentSelectedYear]
  );

  // ============================================================
  // JAMI TREKLAR va HAL QILINGANLAR — Toshkent ombori ham qo'shiladi
  // ------------------------------------------------------------
  // Asosiy 4 ta KPI Toshkent ombori treklarini ham hisoblaydi (sana
  // filtri bo'yicha). Foydalanuvchi: "Toshkent ombori jami treklarga
  // qo'shilib chiqsin, alohida bo'limda ham tursin".
  // ============================================================
  // (warehouseStats memo'si pastda — bu yerda foydalanish uchun
  // forward reference qilamiz; useMemo dependency sifatida pastdagi memo'ga
  // qaramaymiz, balki to'g'ridan-to'g'ri warehouseReturns'ni o'qiymiz)
  const augmentedSummary = useMemo(() => {
    if (!summary) return summary;

    // Sana filtriga moslab warehouse'larni hisoblash
    const fromTime = dateRange?.from ? new Date(dateRange.from).getTime() : null;
    const toTime = dateRange?.to ? new Date(dateRange.to).getTime() + 86_399_000 : null;
    const filteredWh = (warehouseReturns || []).filter((item) => {
      const t = new Date(item.returnDate || item.createdAt || 0).getTime();
      if (fromTime && t < fromTime) return false;
      if (toTime && t > toTime) return false;
      return true;
    });

    // Warehouse barcha yozuvlari — "vozvrat" deb qabul qilingan,
    // ya'ni "hal qilingan" deb hisoblanadi (omborda saqlangan).
    const whTotal = filteredWh.length;

    return {
      ...summary,
      today_total: (summary.today_total || 0) + whTotal,
      today_resolved: (summary.today_resolved || 0) + whTotal,
    };
  }, [summary, warehouseReturns, dateRange?.from, dateRange?.to]);

  // ============================================================
  // Toshkent ombori statistikasi — bosh sahifa ichidagi mini-dashboard
  // ------------------------------------------------------------
  // CEO/Rahbar uchun: omborga qaytgan yuklarning umumiy holati,
  // 104 da topilganlari va eng faol muammo turlari.
  // Sana filtri va davriy filtrlar bilan moslashadi.
  // ============================================================
  const warehouseStats = useMemo(() => {
    const compensatedTracksSet = new Set(
      (compensatedRegistry || []).map((item) => String(item.trackCode || '').trim()).filter(Boolean),
    );

    // Sana filtriga moslab kesamiz
    const fromTime = dateRange?.from ? new Date(dateRange.from).getTime() : null;
    const toTime = dateRange?.to ? new Date(dateRange.to).getTime() + 86_399_000 : null;
    const filtered = (warehouseReturns || []).filter((item) => {
      const t = new Date(item.returnDate || item.createdAt || 0).getTime();
      if (fromTime && t < fromTime) return false;
      if (toTime && t > toTime) return false;
      return true;
    });

    const todayKey = new Date().toDateString();
    let todayCount = 0;
    let matchedIn104 = 0;
    const byProblem = new Map();
    const byResponsible = new Map();

    filtered.forEach((item) => {
      if (new Date(item.returnDate || item.createdAt).toDateString() === todayKey) {
        todayCount += 1;
      }
      if (item.trackCode && compensatedTracksSet.has(item.trackCode)) {
        matchedIn104 += 1;
      }
      const problem = (item.problemType || '').trim() || "Ko'rsatilmagan";
      byProblem.set(problem, (byProblem.get(problem) || 0) + 1);
      const resp = (item.responsible || '').trim() || "Belgilanmagan";
      byResponsible.set(resp, (byResponsible.get(resp) || 0) + 1);
    });

    const topProblems = Array.from(byProblem.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topResponsibles = Array.from(byResponsible.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: filtered.length,
      totalAllTime: warehouseReturns?.length || 0,
      todayCount,
      matchedIn104,
      onlyInWarehouse: filtered.length - matchedIn104,
      matchPercent: filtered.length ? Math.round((matchedIn104 / filtered.length) * 100) : 0,
      topProblems,
      topResponsibles,
    };
  }, [warehouseReturns, compensatedRegistry, dateRange?.from, dateRange?.to]);
  const employeeTotals = useMemo(() => summarizeEmployees(employeeStats), [employeeStats]);
  const compensatedOverview = useMemo(
    () => buildCompensatedOverview(compensatedRegistry, recoveredCompensatedLoads),
    [compensatedRegistry, recoveredCompensatedLoads]
  );
  const fullTypeCounts = all_type_counts?.length ? all_type_counts : type_counts || [];
  const fullSourceCounts = all_source_counts?.length ? all_source_counts : source_counts || [];
  const sourceChartData = fullSourceCounts.filter((item) => item.count > 0);
  const reportMonthLabels = REPORT_MONTH_LABELS[language] || REPORT_MONTH_LABELS.uz;
  const departmentMonthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({ value: index, label: reportMonthLabels[index] || `Oy ${index + 1}` })),
    [reportMonthLabels]
  );
  const departmentYearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, index) => currentYear - 2 + index),
    [currentYear]
  );
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
  const workspaceLaunchers = useMemo(() => {
    const totalDepartmentIssues = (branch_counts || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    return [
      canViewLeaderKpi
        ? {
            key: 'leader',
            title: t('leaderKpi'),
            subtitle: t('leaderKpiSubtitle'),
            metric: `${kpi.closeRate || 0}%`,
            meta: `${t('overdue')}: ${summary?.overdue || 0}`,
            icon: Gauge,
            tone: 'blue',
            onClick: () => setLeaderPanelOpen(true),
          }
        : null,
      {
        key: 'monthly',
        title: t('monthlyReport'),
        subtitle: t('monthlyReportSubtitle'),
        metric: Number(monthly_report.totalRecords || 0).toLocaleString('ru-RU'),
        meta: `${t('lastActiveMonthLabel')}: ${monthlyReportLatestLabel}`,
        icon: CalendarDays,
        tone: 'indigo',
        onClick: () => setActiveTracksModalOpen(true),
      },
      {
        key: 'employees',
        title: t('employeePerformance'),
        subtitle: t('employeePerformanceSubtitle'),
        metric: Number(employeeTotals.total || 0).toLocaleString('ru-RU'),
        meta: `${employeeStats.length} ${t('employee').toLowerCase()}`,
        icon: CheckCircle,
        tone: 'amber',
        onClick: () => setEmployeeModalOpen(true),
      },
      {
        key: 'departments',
        title: t('responsibleDepartment'),
        subtitle: t('departmentSubtitle'),
        metric: Number(totalDepartmentIssues || 0).toLocaleString('ru-RU'),
        meta: `${branch_counts?.length || 0} ${t('departmentsSources').toLowerCase()}`,
        icon: ShieldAlert,
        tone: 'rose',
        onClick: () => setDepartmentsModalOpen(true),
      },
      {
        key: 'compensated-control',
        title: t('compensatedControlTitle'),
        subtitle: t('compensatedControlSubtitle'),
        metric: Number(compensatedOverview.totalCompensated || 0).toLocaleString('ru-RU'),
        meta: `${t('foundAt')}: ${compensatedOverview.recoveredCount} • ${t('statusInProgress')}: ${compensatedOverview.inProgressCount} • ${formatMoneyShort(compensatedOverview.paymentTotal)}`,
        icon: BriefcaseBusiness,
        tone: 'emerald',
        onClick: () => setCompensatedControlModalOpen(true),
      },
    ]
      .filter(Boolean)
      .map((item) => (
        item.key === 'compensated-control'
          ? {
              ...item,
              meta: (
                <div className="space-y-1.5">
                  <div>{t('compensatedRecovered')}: {compensatedOverview.recoveredCount}</div>
                  <div>{t('statusInProgress')}: {compensatedOverview.inProgressCount}</div>
                  <div>{t('compensatedTotalAmount')}: {formatMoneyShort(compensatedOverview.paymentTotal)}</div>
                </div>
              ),
            }
          : item
      ));
  }, [
    branch_counts,
    canViewLeaderKpi,
    compensatedOverview.inProgressCount,
    compensatedOverview.paymentTotal,
    compensatedOverview.recoveredCount,
    compensatedOverview.totalCompensated,
    employeeStats.length,
    employeeTotals.total,
    kpi.closeRate,
    monthly_report.totalRecords,
    monthlyReportLatestLabel,
    summary?.overdue,
    t,
  ]);

  const openDuplicateGroupDetails = (group) => {
    setSelectedDuplicateGroup(group);
    setDuplicateDetailModalOpen(true);
  };

  useEffect(() => {
    const syncDashboard = () => {
      const localStats = getOtkDashboardStats(dateRange, { reportYear: monthlyReportYear });
      setAllRecords(getAllOtkRecords());
      setSettings(getOtkSettings());
      setCompensatedRegistry(getCompensatedLoadRegistry());
      setRecoveredCompensatedLoads(getRecoveredCompensatedLoads());
      setSystemUsers(getSystemUsers());
      setAuditLogs(getOtkAuditLogs());
      setStats(resolveDashboardStats(localStats, dateRange, monthlyReportYear));
    };

    return subscribeToOtkData(syncDashboard, { debounceMs: 90 });
  }, [dateRange, monthlyReportYear]);

  // Toshkent ombori — alohida subscription
  useEffect(() => {
    const sync = () => setWarehouseReturns(getWarehouseReturns());
    return subscribeToWarehouseReturns(sync);
  }, []);

  // ============================================================
  // Sana filtri o'zgarganda Supabase'dan o'sha oraliqni tortish
  // ------------------------------------------------------------
  // Boot vaqtida default joriy oy bo'lganligi sababli — hydrate boot
  // chaqiruvi avtomatik shu sanalarni tortadi. Bu yerda foydalanuvchi
  // filtrini O'ZGARTIRGANDA yangi oraliqni Supabase'dan olamiz.
  // Birinchi mount'da skip qilamiz — boot hydration takrorlanmasin.
  // ============================================================
  const initialDateRangeRef = useRef(true);
  useEffect(() => {
    const { from, to } = dateRange || {};

    // Birinchi mount — boot hydration allaqachon ishga tushgan, skip
    if (initialDateRangeRef.current) {
      initialDateRangeRef.current = false;
      return;
    }

    // Filter olib tashlangan — mahalliy keshdan ko'rsatamiz, fetch shart emas
    if (!from && !to) return;

    let cancelled = false;
    const toastId = toast.loading('Sana bo\'yicha yuklanmoqda…');
    hydrateComplaintsByDateRange(from || null, to || null)
      .then((result) => {
        if (cancelled) return;
        if (result?.ok) {
          toast.success(
            `${result.fetchedCount.toLocaleString()} yozuv yuklandi`,
            { id: toastId, duration: 2500 },
          );
        } else if (result?.reason === 'remote-disabled') {
          toast.dismiss(toastId);
        } else {
          toast.error('Yuklashda xato', { id: toastId });
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Yuklashda xato', { id: toastId });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to]);

  // ============================================================
  // Rahbar statistikasi (departmentSelectedMonth/Year) — har bir
  // qurilmada bir xil natija ko'rsatishi uchun, tanlangan oy
  // ma'lumotlarini Supabase'dan to'liq tortib olamiz.
  // Bu mahalliy keshdagi farqdan qutqaradi (3 qurilma = 3 statistika
  // muammosini hal qiladi).
  // ============================================================
  useEffect(() => {
    const year = Number(departmentSelectedYear);
    const month = Number(departmentSelectedMonth); // 0-based
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;

    // Oraliqni yasash: YYYY-MM-01 dan oxirgi kungacha
    const pad = (n) => String(n).padStart(2, '0');
    const from = `${year}-${pad(month + 1)}-01`;
    // Keyingi oyning 1-kunidan oldin (exclusive) — lekin biz inclusive
    // `lte` ishlatamiz, shuning uchun oxirgi kunni hisoblaymiz
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${pad(month + 1)}-${pad(lastDay)}`;

    let cancelled = false;
    hydrateComplaintsByDateRange(from, to)
      .then((result) => {
        if (cancelled || !result?.ok) return;
        // Sync subscribeToOtkData orqali state yangilanadi —
        // departmentStats avtomatik qayta hisoblanadi
      })
      .catch(() => {
        // Sokin xato — local kesh ishlatiladi
      });

    return () => {
      cancelled = true;
    };
  }, [departmentSelectedMonth, departmentSelectedYear]);

  const refetch = () => {
    setIsFetching(true);
    const localStats = getOtkDashboardStats(dateRange, { reportYear: monthlyReportYear });
    setAllRecords(getAllOtkRecords());
    setSettings(getOtkSettings());
    setCompensatedRegistry(getCompensatedLoadRegistry());
    setRecoveredCompensatedLoads(getRecoveredCompensatedLoads());
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

  const shareMonthlyReport = async () => {
    try {
      const shareText = buildMonthlyReportShareText({
        report: monthly_report,
        t,
        periodLabel: monthlyReportPeriodLabel,
        latestLabel: monthlyReportLatestLabel,
      });

      if (navigator.share) {
        await navigator.share({
          title: `${t('monthlyReport')} ${monthly_report.selectedYear || monthlyReportYear || ''}`.trim(),
          text: shareText,
          url: window.location.href,
        });
        toast.success(t('shareMonthlyReportSuccess'));
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        toast.success(t('shareMonthlyReportCopied'));
        return;
      }

      toast.error(t('shareMonthlyReportFailed'));
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('Monthly report share failed', error);
      toast.error(t('shareMonthlyReportFailed'));
    }
  };

  const applyDateFilter = (nextRange) => {
    setDateRange(nextRange);
    setIsFetching(true);
    const localStats = getOtkDashboardStats(nextRange, { reportYear: monthlyReportYear });
    setAllRecords(getAllOtkRecords());
    setCompensatedRegistry(getCompensatedLoadRegistry());
    setRecoveredCompensatedLoads(getRecoveredCompensatedLoads());
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
    setCompensatedRegistry(getCompensatedLoadRegistry());
    setRecoveredCompensatedLoads(getRecoveredCompensatedLoads());
    setSystemUsers(getSystemUsers());
    setAuditLogs(getOtkAuditLogs());
    setStats(resolveDashboardStats(localStats, dateRange, year));
    window.setTimeout(() => setIsFetching(false), 250);
  };

  const trendData = monthlyReportMonths.map((month, index) => ({
    name: month.label,
    Jami: Number(monthly_report.totals?.[index]?.count || 0),
    Trend: Number(monthly_report.totals?.[index]?.trend?.percent ?? 0),
  }));
  const latestMonthTotal = monthly_report.latestMonth != null
    ? Number(monthly_report.totals?.find((month) => month.monthIndex === monthly_report.latestMonth)?.count || 0)
    : 0;
  const averageMonthlyLoad = trendData.length
    ? Math.round(trendData.reduce((sum, item) => sum + (item.Jami || 0), 0) / trendData.length)
    : 0;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* ======== PROFESSIONAL HEADER — kompakt va clean ======== */}
      <section className="relative z-[120] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/40 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-blue-500/5">
        {/* Decorative gradient blob */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/15 via-cyan-400/10 to-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-gradient-to-tr from-violet-400/10 to-pink-400/10 blur-2xl" />

        <div className="relative flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/30">
              <Gauge size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t('overview')}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {canViewLeaderKpi ? t('executiveOverview') : t('operationsPanel')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold capitalize">{format(new Date(), 'dd MMMM yyyy, EEEE', { locale: uz })}</span>
                <span className="mx-1.5 opacity-50">·</span>
                {canViewLeaderKpi ? t('dashboardExecutiveSubtitle') : t('dashboardSubtitle')}
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {isDemo && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300">
                ⚠ {t('demoData')}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              {t('refresh')}
            </button>
          </div>
        </div>
      </section>

      {/* ======== SUMMARY KPI CARDS — professional 4 cards ======== */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map(({ key, labelKey, subKey, icon: Icon, tone, badge }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30"
          >
            {/* Background gradient blob */}
            <div className={clsx('pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br opacity-15 blur-xl transition-opacity group-hover:opacity-25', tone)} />

            {/* Top accent bar */}
            <div className={clsx('absolute left-0 right-0 top-0 h-1 bg-gradient-to-r transition-all group-hover:h-1.5', tone)} />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t(labelKey)}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 transition-transform duration-300 group-hover:translate-x-0.5 dark:text-white">
                    {(augmentedSummary?.[key] || 0).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className={clsx('shrink-0 rounded-xl bg-gradient-to-br p-2.5 text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3', tone)}>
                  <Icon size={18} />
                </div>
              </div>
              <div className={clsx('mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-transform duration-300 group-hover:translate-x-0.5', badge)}>
                {t(subKey)}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ======== TOSHKENT OMBORI mini-dashboard (CEO view) ======== */}
      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 shadow-sm dark:border-amber-500/20 dark:from-amber-500/5 dark:via-slate-900 dark:to-orange-500/5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-200/60 px-4 py-3 dark:border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-2 text-white shadow-md">
              <Warehouse size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Toshkent ombori</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Omborga qaytgan yuklar va 104 — Moliya bilan moslashuv
              </p>
            </div>
          </div>
          <Link
            to="/warehouse"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/30 dark:bg-slate-900 dark:text-amber-300"
          >
            Bo'limga o'tish →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
          <WarehouseStat
            label="Jami qaytaruvlar"
            value={warehouseStats.total.toLocaleString('ru-RU')}
            sub={`Davr bo'yicha · jami: ${warehouseStats.totalAllTime.toLocaleString('ru-RU')}`}
            tone="amber"
          />
          <WarehouseStat
            label="Bugun"
            value={warehouseStats.todayCount.toLocaleString('ru-RU')}
            sub="Bugun qabul qilindi"
            tone="sky"
          />
          <WarehouseStat
            label="104 da topilgan"
            value={warehouseStats.matchedIn104.toLocaleString('ru-RU')}
            sub={`${warehouseStats.matchPercent}% — Topilgan yuk sifatida`}
            tone="emerald"
          />
          <WarehouseStat
            label="Faqat omborda"
            value={warehouseStats.onlyInWarehouse.toLocaleString('ru-RU')}
            sub="104'da hozircha yo'q"
            tone="slate"
          />
        </div>

        {(warehouseStats.topProblems.length > 0 || warehouseStats.topResponsibles.length > 0) && (
          <div className="grid gap-3 border-t border-amber-200/60 p-3 sm:grid-cols-2 dark:border-amber-500/20">
            <WarehouseTopList
              title="Muammo turlari (top 5)"
              items={warehouseStats.topProblems}
              total={warehouseStats.total}
              emptyText="Davr bo'yicha qaytaruv yo'q"
            />
            <WarehouseTopList
              title="Mas'ul hodimlar (top 5)"
              items={warehouseStats.topResponsibles}
              total={warehouseStats.total}
              emptyText="Davr bo'yicha qaytaruv yo'q"
            />
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title={t('monthlyDynamics')}
          subtitle={t('monthlyDynamicsSubtitle')}
          actions={(
            <div className="min-w-[150px]">
              <DashboardSelect
                value={monthlyReportYear || String(monthly_report.selectedYear || monthlyReportYearOptions[0])}
                onChange={applyMonthlyReportYear}
                options={monthlyReportYearOptions}
                labels={Object.fromEntries(monthlyReportYearOptions.map((year) => [year, `${t('monthlyReportYear')}: ${year}`]))}
              />
            </div>
          )}
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="total-compact" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="Jami" stroke="#2563eb" strokeWidth={2.6} fill="url(#total-compact)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniKpiStat label={t('lastActiveMonthLabel')} value={latestMonthTotal} tone="sky" />
            <MiniKpiStat label={t('monthlyAverageLabel')} value={averageMonthlyLoad} tone="rose" />
          </div>
        </Panel>

        <Panel
          title={dashboardBreakdownView === 'problems' ? t('problemTypes') : t('requestSources')}
          subtitle={dashboardBreakdownView === 'problems' ? t('last30Days') : t('requestSourcesSubtitle')}
          onHeaderClick={() => (dashboardBreakdownView === 'problems' ? setProblemTypesModalOpen(true) : setRequestSourcesModalOpen(true))}
          actionLabel={t('expand')}
          actions={(
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setDashboardBreakdownView('problems')}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  dashboardBreakdownView === 'problems'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {t('problemTypes')}
              </button>
              <button
                type="button"
                onClick={() => setDashboardBreakdownView('sources')}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  dashboardBreakdownView === 'sources'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {t('requestSources')}
              </button>
            </div>
          )}
        >
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={dashboardBreakdownView === 'problems' ? type_counts || [] : sourceChartData || []} dataKey="count" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={3}>
                {(dashboardBreakdownView === 'problems' ? type_counts || [] : sourceChartData || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {(dashboardBreakdownView === 'problems' ? type_counts || [] : sourceChartData || []).map((item, i) => (
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

      <section>
        <Panel
          title={canViewLeaderKpi ? t('executiveOverview') : t('operationsPanel')}
          subtitle={canViewLeaderKpi ? t('dashboardExecutiveSubtitle') : t('dashboardSubtitle')}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {workspaceLaunchers.map((item) => (
                <WorkspaceLauncherCard
                  key={item.key}
                  title={item.title}
                  subtitle={item.subtitle}
                  metric={item.metric}
                  meta={item.meta}
                  tone={item.tone}
                  icon={item.icon}
                  onClick={item.onClick}
                  actionLabel={t('expand')}
                />
              ))}
          </div>

          {canViewLeaderKpi ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                      <Activity size={14} />
                      {t('departmentMonthlyFlow')}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Bu filtr faqat quyidagi rahbar statistikasi uchun ishlaydi.
                    </p>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t('monthFilter')}
                      </label>
                      <select
                        value={departmentSelectedMonth}
                        onChange={(event) => setDepartmentSelectedMonth(Number(event.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      >
                        {departmentMonthOptions.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t('yearFilter')}
                      </label>
                      <select
                        value={departmentSelectedYear}
                        onChange={(event) => setDepartmentSelectedYear(Number(event.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      >
                        {departmentYearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <CompactDepartmentStatCard
                  tone="blue"
                  icon={ShieldCheck}
                  title={t('departmentCoreShare')}
                  value={`${departmentStats.coreShare}%`}
                  meta={`${departmentStats.coreTrackCount.toLocaleString('ru-RU')} ${t('tracksShort')} asosiy oqimda`}
                />
                <CompactDepartmentStatCard
                  tone="violet"
                  icon={BriefcaseBusiness}
                  title={t('departmentExtraShare')}
                  value={`${departmentStats.extraShare}%`}
                  meta={`${departmentStats.extraTrackCount.toLocaleString('ru-RU')} ${t('tracksShort')} qo'shimcha ishda`}
                />
                <CompactDepartmentStatCard
                  tone="emerald"
                  icon={Activity}
                  title={t('departmentMonthlyFlow')}
                  value={departmentStats.monthlyTracks.toLocaleString('ru-RU')}
                  meta={`${departmentStats.monthLabel} ${t('departmentMonthlyMeta')}`}
                />
                <CompactDepartmentStatCard
                  tone="amber"
                  icon={Users2}
                  title={t('departmentEmployeeDailyFlow')}
                  value={`${departmentStats.leaderDailyFlow} ${t('tracksShort')}`}
                  meta={departmentStats.employeeFlowMeta}
                />
                <CompactDepartmentStatCard
                  tone="rose"
                  icon={Clock3}
                  title={t('departmentEstimatedTime')}
                  value={departmentStats.estimatedDailyTime}
                  meta={departmentStats.employeeTimeMeta}
                />
                <CompactDepartmentStatCard
                  tone="indigo"
                  icon={TrendingUp}
                  title={t('departmentForecastTitle')}
                  value={`${departmentStats.nextMonthForecast.toLocaleString('ru-RU')} ${t('tracksShort')}`}
                  meta={departmentStats.forecastMeta}
                  badgeText={`${formatSignedPercent(departmentStats.nextMonthChangePct)} ${t('vsCurrentMonth')}`}
                  badgeTone={getForecastBadgeTone(departmentStats.nextMonthChangePct)}
                  actionLabel={t('expand')}
                  onAction={() => setDepartmentForecastModalOpen(true)}
                />
              </div>
            </div>
          ) : null}
        </Panel>
      </section>

      {false && canViewLeaderKpi && (
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

      {leaderPanelOpen && (
        <InsightModal
          title={t('leaderKpi')}
          subtitle={t('leaderKpiSubtitle')}
          onClose={() => setLeaderPanelOpen(false)}
        >
          <LeaderKpiContent
            t={t}
            kpi={kpi}
            summary={summary}
            recentActivity={recent_activity}
            onOpenSla={() => setSlaModalOpen(true)}
            onOpenRecentActivity={() => setAuditModalOpen(true)}
            onOpenDuplicates={() => setDuplicateModalOpen(true)}
          />
        </InsightModal>
      )}

      {departmentsModalOpen && (
        <InsightModal
          title={t('responsibleDepartment')}
          subtitle={t('departmentSubtitle')}
          onClose={() => setDepartmentsModalOpen(false)}
        >
          <DepartmentOverviewContent items={branch_counts || []} />
        </InsightModal>
      )}

      {compensatedControlModalOpen && (
        <InsightModal
          title={t('compensatedControlTitle')}
          subtitle={t('compensatedControlSubtitle')}
          onClose={() => setCompensatedControlModalOpen(false)}
        >
          <CompensatedControlContent t={t} overview={compensatedOverview} valueLabel={valueLabel} />
        </InsightModal>
      )}

      {duplicateModalOpen && (
        <InsightModal
          title={t('duplicateExamples')}
          subtitle={t('duplicateModalSubtitle')}
          onClose={() => {
            setDuplicateModalOpen(false);
            setSelectedDuplicateGroup(null);
            setDuplicateDetailModalOpen(false);
          }}
        >
          <div className="space-y-3">
            {duplicateGroups.length ? duplicateGroups.map((item) => (
              <div
                key={item.trackCode}
                role="button"
                tabIndex={0}
                onClick={() => openDuplicateGroupDetails(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDuplicateGroupDetails(item);
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link
                    to={`/tracking?search=${encodeURIComponent(item.trackCode)}`}
                    onClick={(event) => event.stopPropagation()}
                    className="font-mono text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
                  >
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

      {duplicateDetailModalOpen && selectedDuplicateGroup && (
        <InsightModal
          title={selectedDuplicateGroup.trackCode}
          subtitle={`${selectedDuplicateGroup.count}x ${t('duplicateRecordsLabel')}`}
          onClose={() => {
            setDuplicateDetailModalOpen(false);
            setSelectedDuplicateGroup(null);
          }}
        >
          <div className="space-y-3">
            {selectedDuplicateGroup.entries
              .slice()
              .sort((left, right) => resolveEntrySortTime(left) - resolveEntrySortTime(right))
              .map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link to={`/complaints/${entry.id}`} className="font-mono text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                        {entry.trackCode}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(entry.date), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        {entry.status || '-'}
                      </span>
                      <span className={clsx('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', PRIORITY_BADGE[entry.priority] || PRIORITY_BADGE.Past)}>
                        {entry.priority || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <DuplicateDetailField label={t('problemType')} value={entry.problemType} />
                    <DuplicateDetailField label={t('responsibleDepartment')} value={entry.department} />
                    <DuplicateDetailField label={t('requestSource')} value={entry.requestSource} />
                    <DuplicateDetailField label={t('employee')} value={entry.handledBy || entry.createdBy || entry.lastUpdatedBy} />
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-slate-300 dark:ring-slate-800">
                    {entry.comment || '-'}
                  </div>
                </div>
              ))}
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

      {departmentForecastModalOpen && (
        <InsightModal
          title={t('departmentForecastTitle')}
          subtitle={t('departmentForecastSubtitle')}
          onClose={() => setDepartmentForecastModalOpen(false)}
        >
          <DepartmentForecastInsight t={t} stats={departmentStats} />
        </InsightModal>
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

      {false && (
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
      )}

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

      {false && (
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
      )}

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
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('workSchedule')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('workload')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('norm')}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('efficiency')}</th>
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
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{employee.workScheduleLabel}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{formatAlignedDepartmentDuration(employee.totalMinutes)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                            {employee.capacityMinutes ? `${employee.normTracks} trek / ${formatAlignedDepartmentDuration(employee.capacityMinutes)}` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={clsx(
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                              employee.efficiencyRate >= 85
                                ? PRIORITY_BADGE.Past
                                : employee.efficiencyRate >= 60
                                  ? PRIORITY_BADGE["O'rta"]
                                  : PRIORITY_BADGE.Yuqori
                            )}>
                              {employee.efficiencyRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(employee.efficiencyRate || 0, 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{employee.efficiencyRate}%</span>
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
                  onClick={shareMonthlyReport}
                  className="qc-button inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition"
                >
                  <Share2 size={15} />
                  {t('shareMonthlyReport')}
                </button>
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

      {false && (
        <>
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
                  onClick={shareMonthlyReport}
                  className="qc-button inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition"
                >
                  <Share2 size={15} />
                  {t('shareMonthlyReport')}
                </button>
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
        </>
      )}
    </div>
  );
}

function WorkspaceLauncherCard({ title, subtitle, metric, meta, tone = 'blue', icon: Icon, onClick, actionLabel }) {
  const toneMap = {
    blue: 'border-blue-200/70 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/10',
    indigo: 'border-indigo-200/70 bg-indigo-50/40 dark:border-indigo-500/20 dark:bg-indigo-500/10',
    violet: 'border-violet-200/70 bg-violet-50/40 dark:border-violet-500/20 dark:bg-violet-500/10',
    emerald: 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/10',
    amber: 'border-amber-200/70 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/10',
    rose: 'border-rose-200/70 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-500/10',
  };
  const accentMap = {
    blue: 'from-blue-600 to-sky-500',
    indigo: 'from-indigo-600 to-blue-500',
    violet: 'from-violet-600 to-fuchsia-500',
    emerald: 'from-emerald-600 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-red-500',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]',
        toneMap[tone] || toneMap.blue
      )}
    >
      <div className={clsx('absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r', accentMap[tone] || accentMap.blue)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-white/90 p-2.5 text-slate-700 ring-1 ring-white/70 transition group-hover:scale-105 group-hover:text-blue-700 dark:bg-slate-950/80 dark:text-slate-200 dark:ring-slate-800">
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-4 min-h-[70px]">
        <p className="text-[clamp(1.45rem,2.2vw,2rem)] font-semibold tracking-tight text-slate-950 dark:text-white">{metric}</p>
        <div className="mt-1.5 text-sm leading-5 text-slate-500 dark:text-slate-400">{meta}</div>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition group-hover:translate-x-0.5 group-hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-200 dark:group-hover:text-blue-300">
        <ArrowUpRight size={13} />
        {actionLabel}
      </div>
    </button>
  );
}

function LeaderKpiContent({ t, kpi, summary, recentActivity, onOpenSla, onOpenRecentActivity, onOpenDuplicates }) {
  return (
    <div className="space-y-4">
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
          onClick={onOpenDuplicates}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              onClick={onOpenSla}
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
            {recentActivity.length > 0 && (
              <button
                type="button"
                onClick={onOpenRecentActivity}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('expand')}
              </button>
            )}
          </div>

          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {recentActivity.length ? recentActivity.slice(0, 6).map((item) => (
              <ActivityRow key={item.id} item={item} />
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
                {t('noActivityYet')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepartmentOverviewContent({ items }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <DepartmentCard key={item.branch_name} item={item} />
      ))}
    </div>
  );
}

function CompensatedControlContent({ t, overview, valueLabel }) {
  const safeOverview = {
    totalCompensated: Number(overview?.totalCompensated || 0),
    recoveredCount: Number(overview?.recoveredCount || 0),
    inProgressCount: Number(overview?.inProgressCount || 0),
    closedCount: Number(overview?.closedCount || 0),
    paymentTotal: Number(overview?.paymentTotal || 0),
    refundedCount: Number(overview?.refundedCount || 0),
    confiscatedCount: Number(overview?.confiscatedCount || 0),
    pendingAmount: Number(overview?.pendingAmount || 0),
    departmentBreakdown: Array.isArray(overview?.departmentBreakdown) ? overview.departmentBreakdown : [],
    sourceBreakdown: Array.isArray(overview?.sourceBreakdown) ? overview.sourceBreakdown : [],
    largestCases: Array.isArray(overview?.largestCases) ? overview.largestCases : [],
    longestCases: Array.isArray(overview?.longestCases) ? overview.longestCases : [],
  };
  const formatStatus = typeof valueLabel === 'function' ? valueLabel : (value) => value || '-';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiMetricCard
          icon={BriefcaseBusiness}
          label={t('compensatedTotalCases')}
          value={safeOverview.totalCompensated.toLocaleString('ru-RU')}
          hint={t('compensatedLoads')}
          tone="emerald"
        />
        <KpiMetricCard
          icon={PackageSearch}
          label={t('compensatedRecovered')}
          value={safeOverview.recoveredCount.toLocaleString('ru-RU')}
          hint={t('foundTracksFixed')}
          tone="blue"
        />
        <KpiMetricCard
          icon={Clock}
          label={t('statusInProgress')}
          value={safeOverview.inProgressCount.toLocaleString('ru-RU')}
          hint={t('activeWork')}
          tone="amber"
        />
        <KpiMetricCard
          icon={FileText}
          label={t('compensatedTotalAmount')}
          value={formatMoneyShort(safeOverview.paymentTotal)}
          hint={t('paymentAmount')}
          tone="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-white p-2 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
              <CheckCircle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('compensatedWorkflowSnapshot')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('compensatedWorkflowSnapshotSubtitle')}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniKpiStat label={t('statusClosed')} value={safeOverview.closedCount} tone="emerald" />
            <MiniKpiStat label={t('statusInProgress')} value={safeOverview.inProgressCount} tone="amber" />
            <MiniKpiStat label={t('customerRefunded')} value={safeOverview.refundedCount} tone="sky" />
            <MiniKpiStat label={t('confiscatedLoads')} value={safeOverview.confiscatedCount} tone="rose" />
          </div>
          <div className="mt-3 rounded-xl bg-white px-3 py-3 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
            {t('expectedReturnAmount')}: <span className="font-semibold text-slate-950 dark:text-white">{formatMoneyShort(safeOverview.pendingAmount)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-white p-2 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('compensatedRiskCases')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('compensatedRiskCasesSubtitle')}</p>
            </div>
          </div>
          <div className="space-y-3">
            {safeOverview.longestCases.length ? safeOverview.longestCases.map((item) => (
              <div key={item.id} className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/complaints/${item.foundEntry?.id || item.id}`} className="font-mono text-sm font-semibold text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                    {item.trackCode}
                  </Link>
                  <span className={clsx('rounded-full px-2 py-1 text-xs font-semibold ring-1', item.foundResolutionStatus === 'Yopildi' ? PRIORITY_BADGE.Past : PRIORITY_BADGE["O'rta"])}>
                    {item.recoveredDays ?? 0} {t('daysShort')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {item.department || '-'} • {item.requestSource || '-'} • {item.handledBy || '-'}
                </p>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
                {t('noData')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleRankList title={t('responsibleDepartment')} items={safeOverview.departmentBreakdown} emptyLabel={t('noData')} />
        <SimpleRankList title={t('requestSources')} items={safeOverview.sourceBreakdown} emptyLabel={t('noData')} />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('compensatedLargestCases')}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            {safeOverview.largestCases.length} ta
          </span>
        </div>
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('track')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('customer')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('paymentAmount')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('workflowOutcome')}</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {safeOverview.largestCases.map((item) => (
                <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                    <Link to={`/complaints/${item.foundEntry?.id || item.id}`} className="text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300">
                      {item.trackCode}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.customer || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatMoneyShort(item.paymentAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">{item.foundCaseOutcome || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', item.foundResolutionStatus === 'Yopildi' ? PRIORITY_BADGE.Past : PRIORITY_BADGE["O'rta"])}>
                      {formatStatus(item.foundResolutionStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, className, children, onHeaderClick, actionLabel, actions = null }) {
  return (
    <div className={clsx('qc-panel overflow-hidden rounded-2xl p-4 xl:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>}
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

// ============================================================
// Toshkent ombori mini-dashboard yordamchilari
// ============================================================
function WarehouseStat({ label, value, sub, tone = 'amber' }) {
  const tones = {
    amber: 'from-amber-400 to-orange-500 text-amber-700 dark:text-amber-300',
    sky: 'from-sky-400 to-blue-500 text-sky-700 dark:text-sky-300',
    emerald: 'from-emerald-400 to-green-500 text-emerald-700 dark:text-emerald-300',
    slate: 'from-slate-400 to-slate-500 text-slate-700 dark:text-slate-300',
  };
  const toneText = tones[tone] || tones.amber;
  return (
    <div className="rounded-xl border border-white/60 bg-white p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={clsx('mt-1 text-2xl font-extrabold tracking-tight', toneText.split(' ').slice(2).join(' '))}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          {sub}
        </p>
      )}
    </div>
  );
}

function WarehouseTopList({ title, items, total, emptyText }) {
  return (
    <div className="rounded-xl border border-white/60 bg-white p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/80">
      <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const pct = total ? Math.round((item.count / total) * 100) : 0;
            return (
              <li key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-slate-600 dark:text-slate-300" title={item.name}>
                    {item.name}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold text-slate-900 dark:text-slate-100">
                    {item.count} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DateRangeFilter({ value, onChange, label }) {
  const t = useT();
  const pickerId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [monthCursor, setMonthCursor] = useState(() => getInitialMonth(value));
  const [popoverPos, setPopoverPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);
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

  // Popover ochiq paytda — scroll/resize'da position'ni yangilash
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  const openPicker = () => {
    window.dispatchEvent(new CustomEvent('qc-close-popovers', { detail: { source: pickerId } }));
    setDraft(value);
    setMonthCursor(getInitialMonth(value));
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
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
    <div className="flex items-center gap-2">
      <button
        ref={buttonRef}
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
        <div
          className="fixed z-[9999] w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
          style={{ top: `${popoverPos.top}px`, right: `${popoverPos.right}px` }}
        >
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

function CompactDepartmentStatCard({ title, value, meta, icon: Icon, tone = 'blue', badgeText = '', badgeTone = 'neutral', actionLabel = '', onAction }) {
  const toneMap = {
    blue: 'border-blue-200/90 bg-[linear-gradient(180deg,rgba(219,234,254,0.95),rgba(239,246,255,0.92))] dark:border-blue-500/25 dark:bg-[linear-gradient(180deg,rgba(37,99,235,0.24),rgba(15,23,42,0.94))]',
    violet: 'border-violet-200/90 bg-[linear-gradient(180deg,rgba(237,233,254,0.95),rgba(245,243,255,0.92))] dark:border-violet-500/25 dark:bg-[linear-gradient(180deg,rgba(124,58,237,0.22),rgba(15,23,42,0.94))]',
    emerald: 'border-emerald-200/90 bg-[linear-gradient(180deg,rgba(209,250,229,0.95),rgba(236,253,245,0.92))] dark:border-emerald-500/25 dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.2),rgba(15,23,42,0.94))]',
    amber: 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.95),rgba(255,251,235,0.92))] dark:border-amber-500/25 dark:bg-[linear-gradient(180deg,rgba(245,158,11,0.2),rgba(15,23,42,0.94))]',
    rose: 'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,228,230,0.95),rgba(255,241,242,0.92))] dark:border-rose-500/25 dark:bg-[linear-gradient(180deg,rgba(244,63,94,0.22),rgba(15,23,42,0.94))]',
    indigo: 'border-indigo-200/90 bg-[linear-gradient(180deg,rgba(224,231,255,0.95),rgba(238,242,255,0.92))] dark:border-indigo-500/25 dark:bg-[linear-gradient(180deg,rgba(99,102,241,0.24),rgba(15,23,42,0.94))]',
  };
  const iconToneMap = {
    blue: 'border-blue-200 bg-white text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-300',
    violet: 'border-violet-200 bg-white text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300',
    emerald: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'border-amber-200 bg-white text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300',
    rose: 'border-rose-200 bg-white text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300',
    indigo: 'border-indigo-200 bg-white text-indigo-700 dark:border-indigo-500/25 dark:bg-indigo-500/15 dark:text-indigo-300',
  };
  const lineToneMap = {
    blue: 'bg-blue-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
  };
  const badgeToneMap = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    negative: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <div className={clsx('relative overflow-hidden rounded-2xl border p-4 shadow-sm', toneMap[tone] || toneMap.blue)}>
      <div className={clsx('absolute inset-x-0 top-0 h-1.5', lineToneMap[tone] || lineToneMap.blue)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
          <p className="mt-3 text-[clamp(1.5rem,2.4vw,2.25rem)] font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className={clsx('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm', iconToneMap[tone] || iconToneMap.blue)}>
          <Icon size={20} />
        </div>
      </div>
      {badgeText ? (
        <div className="mt-3">
          <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', badgeToneMap[badgeTone] || badgeToneMap.neutral)}>
            {badgeText}
          </span>
        </div>
      ) : null}
      <div className="mt-4 rounded-2xl border border-white/85 bg-white/90 px-3 py-2 text-sm font-medium leading-5 text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
        {meta}
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/85 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          <Maximize2 size={14} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function DepartmentForecastInsight({ t, stats }) {
  const detailRows = [
    { label: t('departmentForecastCurrentMonth'), value: `${stats.forecast.currentValue.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastPreviousMonth'), value: `${stats.forecast.previousValue.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastRecentAverage'), value: `${stats.forecast.recentAverage.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastOverallAverage'), value: `${stats.forecast.overallAverage.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastTrend'), value: `${stats.forecast.trend > 0 ? '+' : ''}${stats.forecast.trend} ${t('tracksShort')}` },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-indigo-200/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.95),rgba(255,255,255,1))] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(180deg,rgba(79,70,229,0.14),rgba(15,23,42,0.92))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('departmentForecastExpectedLoad')}</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {stats.nextMonthForecast.toLocaleString('ru-RU')} {t('tracksShort')}
            </p>
          </div>
          <span className={clsx(
            'inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold',
            stats.nextMonthChangePct > 0
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
              : stats.nextMonthChangePct < 0
                ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
          )}>
            {formatSignedPercent(stats.nextMonthChangePct)} {t('vsCurrentMonth')}
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('departmentForecastExplanation')}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {detailRows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold text-slate-950 dark:text-white">{t('departmentForecastDriversTitle')}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('departmentForecastDriversSubtitle')}</p>
        <div className="mt-4 space-y-3">
          {stats.forecast.drivers.map((driver) => (
            <div
              key={`${driver.title}-${driver.value}`}
              className={clsx(
                'rounded-2xl border px-4 py-3',
                driver.tone === 'positive'
                  ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                  : driver.tone === 'negative'
                    ? 'border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{driver.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{driver.description}</p>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{driver.value}</span>
              </div>
            </div>
          ))}
        </div>
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

function buildDepartmentStatsFromSources(recordsSource = [], usersSource = [], selectedMonth, selectedYear) {
  const now = new Date();
  const targetMonth = Number.isInteger(selectedMonth) ? selectedMonth : now.getMonth();
  const targetYear = Number.isInteger(selectedYear) ? selectedYear : now.getFullYear();
  const targetMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const monthLabel = REPORT_MONTH_LABELS.uz[targetMonth] || '-';
  const records = Array.isArray(recordsSource) ? recordsSource : [];
  const users = Array.isArray(usersSource) ? usersSource.filter((item) => item.active !== false) : [];
  const minutesLookup = buildProblemMinutesLookup(getOtkSettings().problemTypes || []);
  const leaders = users.filter((item) => isAdminRole(item.role) || isManagerRole(item.role));
  const leaderKeys = buildDepartmentLeaderKeySet(leaders);

  const monthlyRecords = records.filter((entry) => toDateKey(entry.date).startsWith(targetMonthPrefix));
  const leaderMonthlyRecords = monthlyRecords.filter((entry) => {
    const ownerKey = normalizeDepartmentPersonKey(entry.handledBy || entry.createdBy);
    return ownerKey && leaderKeys.has(ownerKey);
  });

  const workloadSplit = monthlyRecords.reduce(
    (accumulator, entry) => {
      if (isAdditionalDepartmentWorkEntry(entry)) {
        accumulator.extra += 1;
      } else {
        accumulator.core += 1;
      }
      return accumulator;
    },
    { core: 0, extra: 0 }
  );

  const workdaysElapsed = countDepartmentWorkdays(targetYear, targetMonth, now);
  const leaderDailyAverageRaw = workdaysElapsed ? leaderMonthlyRecords.length / workdaysElapsed : 0;
  const leaderDailyFlow = roundDepartmentMetric(leaderDailyAverageRaw);
  const leaderCount = leaders.length || 1;
  const perEmployeeDailyFlow = roundDepartmentMetric(leaderDailyAverageRaw / leaderCount);
  const monthlyLeaderMinutes = leaderMonthlyRecords.reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const estimatedMinutes = workdaysElapsed ? Math.round(monthlyLeaderMinutes / workdaysElapsed) : 0;
  const perEmployeeMinutes = leaderCount ? Math.round(estimatedMinutes / leaderCount) : 0;
  const totalLeaderWorkMinutesPerDay = leaders.reduce((sum, leader) => sum + getUserWorkdayMinutes(leader), 0);
  const perEmployeeCapacityMinutes = leaderCount ? Math.round(totalLeaderWorkMinutesPerDay / leaderCount) : 0;
  const forecast = forecastDepartmentNextMonth(records, now.getFullYear(), now.getMonth(), minutesLookup);

  return {
    coreTrackCount: workloadSplit.core,
    extraTrackCount: workloadSplit.extra,
    coreShare: monthlyRecords.length ? Math.round((workloadSplit.core / monthlyRecords.length) * 100) : 0,
    extraShare: monthlyRecords.length ? Math.round((workloadSplit.extra / monthlyRecords.length) * 100) : 0,
    monthlyTracks: monthlyRecords.length,
    monthLabel,
    leaderDailyFlow,
    estimatedDailyTime: formatDepartmentDuration(estimatedMinutes),
    employeeFlowMeta: `${leaderCount} ${pluralizeDepartmentEmployees(leaderCount)} orasida har biriga o'rtacha ${perEmployeeDailyFlow} trek`,
    employeeTimeMeta: `${leaderCount} ${pluralizeDepartmentEmployees(leaderCount)} orasida har biriga o'rtacha ${formatDepartmentDuration(perEmployeeMinutes)} / me'yor ${formatDepartmentDuration(perEmployeeCapacityMinutes)}`,
    nextMonthForecast: forecast.total,
    nextMonthChangePct: forecast.changePct,
    forecastMeta: `${forecast.label} uchun taxmin • ${formatDepartmentDuration(forecast.estimatedMinutes)}`,
    forecast,
  };
}

function normalizeDepartmentPersonKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['`‘’"]/g, '')
    .replace(/o‘|o'|g‘|g'/g, (match) => (match.startsWith('o') ? 'o' : 'g'))
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDepartmentLeaderKeySet(users) {
  const values = new Set();
  users.forEach((item) => {
    const full = normalizeDepartmentPersonKey(item.full_name);
    const username = normalizeDepartmentPersonKey(item.username);
    if (full) values.add(full);
    if (username) values.add(username);
  });
  return values;
}

function isAdditionalDepartmentWorkEntry(entry) {
  const haystack = normalizeDepartmentPersonKey(
    [entry.problemType, entry.department, entry.requestSource, entry.comment].filter(Boolean).join(' ')
  );

  const extraKeywords = [
    'vozvrat',
    'qoplab',
    'kompensatsiya',
    'musodara',
    'inventar',
    '102',
    'raqobatni rivojlantirish',
    'istemolchilar huquqlari',
    'rahbariyat',
    'ichki bolim',
    'ichki bulim',
    'direct mijoz',
    'pryamoy mijoz',
    'operatorlarga ruyhat',
    'operator обработка',
    'omboridagi muamoli yuklar',
  ];

  return extraKeywords.some((keyword) => haystack.includes(normalizeDepartmentPersonKey(keyword)));
}

function countDepartmentWorkdays(year, month, referenceDate) {
  const start = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const end = referenceDate.getFullYear() === year && referenceDate.getMonth() === month ? referenceDate : endOfMonth;
  let count = 0;

  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const weekday = day.getDay();
    if (weekday !== 0) count += 1;
  }

  return Math.max(count, 1);
}

function roundDepartmentMetric(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function formatDepartmentDuration(totalMinutes) {
  const safe = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours} soat ${minutes} daqiqa`;
}

function formatSignedPercent(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return `+${numeric}%`;
  if (numeric < 0) return `${numeric}%`;
  return '0%';
}

function getForecastBadgeTone(value) {
  const numeric = Number(value) || 0;
  if (numeric > 0) return 'positive';
  if (numeric < 0) return 'negative';
  return 'neutral';
}

function pluralizeDepartmentEmployees(count) {
  return count === 1 ? 'hodim' : 'hodim';
}

function forecastDepartmentNextMonth(records, year, month, minutesLookup = new Map()) {
  const currentValue = countDepartmentMonthRecords(records, year, month);
  const previousValue = countDepartmentMonthRecords(records, month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  const recentValues = Array.from({ length: 4 }, (_, index) => {
    const offsetMonth = month - index;
    const date = new Date(year, offsetMonth, 1);
    return countDepartmentMonthRecords(records, date.getFullYear(), date.getMonth());
  });
  const recentAverage = recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length;
  const allMonthlyMap = new Map();
  records.forEach((entry) => {
    const key = toDateKey(entry.date).slice(0, 7);
    allMonthlyMap.set(key, (allMonthlyMap.get(key) || 0) + 1);
  });
  const overallValues = Array.from(allMonthlyMap.values());
  const overallAverage = overallValues.length ? overallValues.reduce((sum, value) => sum + value, 0) / overallValues.length : 0;
  const total = Math.max(0, Math.round((currentValue * 0.55) + (recentAverage * 0.3) + (overallAverage * 0.15)));
  const changePct = currentValue ? Math.round(((total - currentValue) / currentValue) * 100) : 0;
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const currentMonthMinutes = records
    .filter((entry) => toDateKey(entry.date).startsWith(currentMonthPrefix))
    .reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const averageMinutes = currentValue ? (currentMonthMinutes / currentValue) : 0;
  const estimatedMinutes = Math.round(total * averageMinutes);
  const nextDate = new Date(year, month + 1, 1);
  const label = `${REPORT_MONTH_LABELS.uz[nextDate.getMonth()]} ${nextDate.getFullYear()}`;
  const trend = total - currentValue;

  return {
    label,
    total,
    changePct,
    currentValue,
    previousValue,
    recentAverage: roundDepartmentMetric(recentAverage),
    overallAverage: roundDepartmentMetric(overallAverage),
    trend,
    estimatedMinutes,
    drivers: buildDepartmentForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, total }),
  };
}

function countDepartmentMonthRecords(records, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return records.filter((entry) => toDateKey(entry.date).startsWith(prefix)).length;
}

function buildDepartmentForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, total }) {
  const drivers = [];
  const prevDiff = total - previousValue;
  drivers.push({
    title: 'Oldingi oy bilan farq',
    value: `${prevDiff > 0 ? '+' : ''}${prevDiff} trek`,
    description: `Oldingi oy ${previousValue} ta bo'lgan, prognoz esa ${total} ta trekni ko'rsatmoqda.`,
    tone: prevDiff > 0 ? 'positive' : prevDiff < 0 ? 'negative' : 'neutral',
  });

  const recentGap = roundDepartmentMetric(currentValue - recentAverage);
  drivers.push({
    title: "So'nggi oylar ritmi",
    value: `${recentGap > 0 ? '+' : ''}${recentGap} trek`,
    description: `So'nggi 4 oy o'rtachasi ${roundDepartmentMetric(recentAverage)} ta bo'lib, joriy oy shu temp bilan solishtirildi.`,
    tone: recentGap > 0 ? 'positive' : recentGap < 0 ? 'negative' : 'neutral',
  });

  drivers.push({
    title: 'Umumiy tarixiy fon',
    value: `${roundDepartmentMetric(overallAverage)} trek`,
    description: `Prognoz umumiy tarix bo'yicha o'rtacha ${roundDepartmentMetric(overallAverage)} trek fonini ham hisobga oladi.`,
    tone: 'neutral',
  });

  return drivers;
}

function buildDepartmentStatsAligned(recordsSource = [], usersSource = [], selectedMonth, selectedYear) {
  const now = new Date();
  const targetMonth = Number.isInteger(selectedMonth) ? selectedMonth : now.getMonth();
  const targetYear = Number.isInteger(selectedYear) ? selectedYear : now.getFullYear();
  const targetMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const monthLabel = getAlignedDepartmentMonthLabel(targetMonth);
  const records = Array.isArray(recordsSource) ? recordsSource : [];
  const users = Array.isArray(usersSource) ? usersSource.filter((item) => item.active !== false) : [];
  const minutesLookup = buildProblemMinutesLookup(getOtkSettings().problemTypes || []);
  const leaders = users.filter((item) => isAdminRole(item.role) || isManagerRole(item.role));
  const leaderKeys = buildAlignedDepartmentLeaderKeySet(leaders);

  const monthlyRecords = records.filter((entry) => toDateKey(entry.date).startsWith(targetMonthPrefix));
  const leaderMonthlyRecords = monthlyRecords.filter((entry) => {
    const ownerKey = normalizeAlignedDepartmentPersonKey(entry.handledBy || entry.createdBy);
    return ownerKey && leaderKeys.has(ownerKey);
  });

  const workloadSplit = monthlyRecords.reduce(
    (accumulator, entry) => {
      if (isAlignedAdditionalDepartmentWorkEntry(entry)) {
        accumulator.extra += 1;
      } else {
        accumulator.core += 1;
      }
      return accumulator;
    },
    { core: 0, extra: 0 }
  );

  const workdaysElapsed = countAlignedDepartmentWorkdays(targetYear, targetMonth, now);
  const leaderDailyAverageRaw = workdaysElapsed ? leaderMonthlyRecords.length / workdaysElapsed : 0;
  const leaderDailyFlow = roundAlignedDepartmentMetric(leaderDailyAverageRaw);
  const leaderCount = leaders.length || 1;
  const perEmployeeDailyFlow = roundAlignedDepartmentMetric(leaderDailyAverageRaw / leaderCount);
  const monthlyLeaderMinutes = leaderMonthlyRecords.reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const estimatedMinutes = workdaysElapsed ? Math.round(monthlyLeaderMinutes / workdaysElapsed) : 0;
  const perEmployeeMinutes = leaderCount ? Math.round(estimatedMinutes / leaderCount) : 0;
  const totalLeaderWorkMinutesPerDay = leaders.reduce((sum, leader) => sum + getUserWorkdayMinutes(leader), 0);
  const perEmployeeCapacityMinutes = leaderCount ? Math.round(totalLeaderWorkMinutesPerDay / leaderCount) : 0;
  const forecast = forecastAlignedDepartmentNextMonth(records, targetYear, targetMonth, minutesLookup);

  return {
    coreTrackCount: workloadSplit.core,
    extraTrackCount: workloadSplit.extra,
    coreShare: monthlyRecords.length ? Math.round((workloadSplit.core / monthlyRecords.length) * 100) : 0,
    extraShare: monthlyRecords.length ? Math.round((workloadSplit.extra / monthlyRecords.length) * 100) : 0,
    monthlyTracks: monthlyRecords.length,
    monthLabel,
    leaderDailyFlow,
    estimatedDailyTime: formatAlignedDepartmentDuration(estimatedMinutes),
    employeeFlowMeta: `${leaderCount} ${pluralizeAlignedDepartmentEmployees(leaderCount)} orasida har biriga o'rtacha ${perEmployeeDailyFlow} trek`,
    employeeTimeMeta: `${leaderCount} ${pluralizeAlignedDepartmentEmployees(leaderCount)} orasida har biriga o'rtacha ${formatAlignedDepartmentDuration(perEmployeeMinutes)} / me'yor ${formatAlignedDepartmentDuration(perEmployeeCapacityMinutes)}`,
    nextMonthForecast: forecast.total,
    nextMonthChangePct: forecast.changePct,
    forecastMeta: `${forecast.label} uchun taxmin • ${formatAlignedDepartmentDuration(forecast.estimatedMinutes)}`,
    forecast,
  };
}

function normalizeAlignedDepartmentPersonKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['`‘’"]/g, '')
    .replace(/o‘|o'|g‘|g'/g, (match) => (match.startsWith('o') ? 'o' : 'g'))
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAlignedDepartmentLeaderKeySet(users) {
  const values = new Set();
  users.forEach((item) => {
    const full = normalizeAlignedDepartmentPersonKey(item.full_name);
    const username = normalizeAlignedDepartmentPersonKey(item.username);
    [full, username].filter(Boolean).forEach((value) => {
      values.add(value);
      value
        .split(' ')
        .map((part) => part.trim())
        .filter((part) => part.length >= 4)
        .forEach((part) => values.add(part));
    });
  });

  values.add('jaloldin');
  values.add('jaloliddin');
  values.add('jallolidin');
  values.add('mirzakbarov jaloldin');

  return values;
}

function isAlignedAdditionalDepartmentWorkEntry(entry) {
  const haystack = normalizeAlignedDepartmentPersonKey(
    [
      entry.problemType,
      entry.department,
      entry.requestSource,
      entry.comment,
      entry.status,
      entry.trackCode,
    ].join(' ')
  );

  const additionalPatterns = [
    '102',
    'qoplab',
    'kompens',
    'musodara',
    'inventar',
    'adashgan',
    'moliya',
    'tolov',
    'to lov',
    'operator',
    'zapros',
    'zayavka',
    'zayavkalar',
    'raqobatni rivojlantirish',
    'istemolchilar huquqlari',
    'qomita',
    'qo mita',
    'vozvrat',
    'relog',
    'fargo',
    '32057',
    '62025',
    '006',
    'filialga yonaltirish',
    'filialga yonaltir',
    'yonaltirish',
    'yonaltir',
    'baza',
    'botda korinmagan',
    'sortirovka id si chiqmagan',
  ];

  return additionalPatterns.some((pattern) => haystack.includes(pattern));
}

function countAlignedDepartmentWorkdays(year, month, referenceDate) {
  const cursor = new Date(year, month, 1);
  const isCurrentPeriod = year === referenceDate.getFullYear() && month === referenceDate.getMonth();
  const end = isCurrentPeriod
    ? new Date(year, month, referenceDate.getDate())
    : new Date(year, month + 1, 0);
  let total = 0;

  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total || 1;
}

function roundAlignedDepartmentMetric(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function formatAlignedDepartmentDuration(totalMinutes) {
  if (!totalMinutes) return '0 soat';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} daqiqa`;
  if (!minutes) return `${hours} soat`;
  return `${hours} soat ${minutes} daqiqa`;
}

function getAlignedDepartmentMonthLabel(monthIndex) {
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  return months[monthIndex] || `Oy ${monthIndex + 1}`;
}

function pluralizeAlignedDepartmentEmployees(count) {
  return count === 1 ? 'hodim' : 'hodim';
}

function forecastAlignedDepartmentNextMonth(records, year, month, minutesLookup = new Map()) {
  const counts = new Map();
  records.forEach((entry) => {
    const key = toDateKey(entry.date).slice(0, 7);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const currentKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const previousKeys = [];
  for (let offset = 0; offset < 4; offset += 1) {
    const cursor = new Date(year, month - offset, 1);
    previousKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
  }

  const currentValue = counts.get(currentKey) || 0;
  const previousValue = counts.get(previousKeys[1]) || currentValue;
  const recentValues = previousKeys.map((key) => counts.get(key) || 0);
  const recentAverage = recentValues.length ? recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length : 0;
  const overallAverage = counts.size
    ? Array.from(counts.values()).reduce((sum, value) => sum + value, 0) / counts.size
    : 0;
  const trend = currentValue - previousValue;

  const blended = (recentAverage * 0.5) + (overallAverage * 0.35) + (currentValue * 0.15) + (trend * 0.25);
  const total = Math.max(0, Math.round(blended));
  const nextDate = new Date(year, month + 1, 1);
  const changePct = currentValue > 0
    ? Math.round(((total - currentValue) / currentValue) * 100)
    : (total > 0 ? 100 : 0);

  const currentMonthMinutes = records
    .filter((entry) => toDateKey(entry.date).startsWith(currentKey))
    .reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const averageMinutes = currentValue ? (currentMonthMinutes / currentValue) : 0;

  return {
    label: `${getAlignedDepartmentMonthLabel(nextDate.getMonth())} ${nextDate.getFullYear()}`,
    total,
    changePct,
    currentValue,
    previousValue,
    recentAverage: roundAlignedDepartmentMetric(recentAverage),
    overallAverage: roundAlignedDepartmentMetric(overallAverage),
    trend,
    estimatedMinutes: Math.round(total * averageMinutes),
    drivers: buildAlignedDepartmentForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, trend, total }),
  };
}

function buildAlignedDepartmentForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, trend, total }) {
  const drivers = [];

  if (trend < 0) {
    drivers.push({
      tone: 'negative',
      title: "Joriy oy oldingi oydan past",
      value: `${Math.abs(trend)} trek`,
      description: `Oldingi oyda ${previousValue} ta, joriy oyda ${currentValue} ta trek qayd etilgan.`,
    });
  } else if (trend > 0) {
    drivers.push({
      tone: 'positive',
      title: "Joriy oy oldingi oydan yuqori",
      value: `${trend} trek`,
      description: `Oldingi oyda ${previousValue} ta, joriy oyda ${currentValue} ta trek qayd etilgan.`,
    });
  }

  const recentGap = roundAlignedDepartmentMetric(currentValue - recentAverage);
  if (recentGap < 0) {
    drivers.push({
      tone: 'negative',
      title: "So'nggi 4 oy o'rtachasidan past",
      value: `${Math.abs(recentGap)} trek`,
      description: `So'nggi 4 oy o'rtachasi ${roundAlignedDepartmentMetric(recentAverage)} ta bo'lib, joriy oy bundan past kelyapti.`,
    });
  } else if (recentGap > 0) {
    drivers.push({
      tone: 'positive',
      title: "So'nggi 4 oy o'rtachasidan yuqori",
      value: `${recentGap} trek`,
      description: `So'nggi 4 oy o'rtachasi ${roundAlignedDepartmentMetric(recentAverage)} ta bo'lib, joriy oy bundan yuqori kelyapti.`,
    });
  }

  const overallGap = roundAlignedDepartmentMetric(total - overallAverage);
  drivers.push({
    tone: overallGap >= 0 ? 'positive' : 'negative',
    title: 'Umumiy tarixiy fon',
    value: `${roundAlignedDepartmentMetric(overallAverage)} trek`,
    description: `Prognoz umumiy tarix bo'yicha o'rtacha ${roundAlignedDepartmentMetric(overallAverage)} trek atrofidagi fonni ham hisobga oladi.`,
  });

  if (!drivers.length) {
    drivers.push({
      tone: 'neutral',
      title: 'Barqaror holat',
      value: '0',
      description: "Joriy oy va oldingi trend o'rtasida keskin farq yo'q, prognoz neytral holatda tuzildi.",
    });
  }

  return drivers;
}

function buildProblemMinutesLookup(problemTypes = []) {
  return new Map(
    (problemTypes || [])
      .map((item) => ({
        name: String(item?.name || '').trim().toLowerCase(),
        minutes: Math.max(0, Number(item?.minutes) || 0),
      }))
      .filter((item) => item.name)
      .map((item) => [item.name, item.minutes])
  );
}

function getEntryEstimatedMinutes(entry, minutesLookup) {
  const key = String(entry?.problemType || '').trim().toLowerCase();
  if (!key) return 0;
  return Math.max(0, Number(minutesLookup.get(key)) || 0);
}

function parseWorkTimeToMinutes(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const [hoursText, minutesText = '0'] = raw.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

const DEFAULT_LUNCH_BREAK_MINUTES = 60;

function getUserWorkdayMinutes(user) {
  const startMinutes = parseWorkTimeToMinutes(user?.workStart);
  const endMinutes = parseWorkTimeToMinutes(user?.workEnd);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return 0;
  return Math.max(0, (endMinutes - startMinutes) - DEFAULT_LUNCH_BREAK_MINUTES);
}

function countBusinessDaysInRange(fromDate, toDate) {
  if (!(fromDate instanceof Date) || !(toDate instanceof Date)) return 0;
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  if (end < start) return 0;

  let total = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

function resolveEmployeeStatsRange(range, entries = []) {
  if (range?.from || range?.to) {
    const from = range?.from ? new Date(`${range.from}T00:00:00`) : (range?.to ? new Date(`${range.to}T00:00:00`) : null);
    const to = range?.to ? new Date(`${range.to}T00:00:00`) : (range?.from ? new Date(`${range.from}T00:00:00`) : null);
    return { from, to };
  }

  if (!entries.length) return { from: null, to: null };

  const timestamps = entries
    .map((entry) => new Date(entry?.date))
    .map((date) => date.getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) return { from: null, to: null };

  return {
    from: new Date(Math.min(...timestamps)),
    to: new Date(Math.max(...timestamps)),
  };
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

function buildEmployeeStats(range, recordsSource = [], usersSource = []) {
  const records = filterRecordsByEmployeeRange(recordsSource, range);
  const users = usersSource;
  const minutesLookup = buildProblemMinutesLookup(getOtkSettings().problemTypes || []);
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
      const totalMinutes = entries.reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
      const resolvedMinutes = entries
        .filter((entry) => entry.status === 'Yopildi')
        .reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
      const periodRange = resolveEmployeeStatsRange(range, entries);
      const workdays = periodRange.from && periodRange.to ? countBusinessDaysInRange(periodRange.from, periodRange.to) : 0;
      const dailyWorkMinutes = getUserWorkdayMinutes(user);
      const capacityMinutes = workdays * dailyWorkMinutes;
      const averageTrackMinutes = total ? Math.round(totalMinutes / total) : 0;
      const normTracks = averageTrackMinutes ? Math.round(capacityMinutes / averageTrackMinutes) : 0;
      const efficiencyRate = capacityMinutes ? Math.round((resolvedMinutes / capacityMinutes) * 100) : 0;
      const loadRate = capacityMinutes ? Math.round((totalMinutes / capacityMinutes) * 100) : 0;

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
        totalMinutes,
        resolvedMinutes,
        capacityMinutes,
        averageTrackMinutes,
        normTracks,
        efficiencyRate,
        loadRate,
        workScheduleLabel: dailyWorkMinutes ? `${user.workStart || '09:00'} - ${user.workEnd || '18:00'}` : '-',
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
      totalMinutes: unassignedEntries.reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0),
      resolvedMinutes: unassignedEntries.filter((entry) => entry.status === 'Yopildi').reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0),
      capacityMinutes: 0,
      averageTrackMinutes: 0,
      normTracks: 0,
      efficiencyRate: 0,
      loadRate: 0,
      workScheduleLabel: '-',
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
        entries: [],
      });
    }

    const bucket = groups.get(key);
    bucket.entries.push(entry);
  });

  return Array.from(groups.values())
    .map((item) => ({
      trackCode: item.trackCode,
      count: item.entries.length,
      activeCount: item.entries.filter((entry) => entry.archiveStatus !== 'archived' && entry.status !== 'Yopildi').length,
      archivedCount: item.entries.filter((entry) => entry.archiveStatus === 'archived' || entry.status === 'Yopildi').length,
      entries: item.entries,
    }))
    .filter((item) => item.count > 1)
    .filter((item) => !findCompensatedRecoveryPair(item.entries))
    .sort((a, b) => b.count - a.count || a.trackCode.localeCompare(b.trackCode));
}

function normalizeTrackKey(value) {
  return String(value || '').trim().toLowerCase();
}

function findCompensatedRecoveryPair(entries = []) {
  const sorted = entries
    .slice()
    .sort((left, right) => resolveEntrySortTime(left) - resolveEntrySortTime(right) || String(left.id).localeCompare(String(right.id)));
  let latestPair = null;
  let latestCompensation = null;

  sorted.forEach((entry) => {
    if (normalizeName(entry.problemType).includes('qoplab berilgan')) {
      latestCompensation = entry;
      return;
    }

    if (latestCompensation && latestCompensation.id !== entry.id) {
      latestPair = { compensationEntry: latestCompensation, foundEntry: entry };
    }
  });

  return latestPair;
}

function resolveEntrySortTime(entry) {
  return [entry?.date, entry?.importedAt, entry?.updatedAt]
    .map((value) => new Date(value))
    .map((value) => value.getTime())
    .find((value) => Number.isFinite(value))
    ?? Number.MAX_SAFE_INTEGER;
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

