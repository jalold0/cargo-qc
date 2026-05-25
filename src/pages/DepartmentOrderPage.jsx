import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Activity, BriefcaseBusiness, CheckCircle2, ClipboardList, Clock3, Download, FileText, Maximize2, PackageSearch, ShieldCheck, TrendingUp, Users2, Workflow, X } from 'lucide-react';
import { DEFAULT_DEPARTMENT_ORDER_CONTENT, getAllOtkRecords, getCompensatedLoadRegistry, getOtkSettings, getRecoveredCompensatedLoads, getSystemUsers, subscribeToOtkData, toDateKey } from '../services/localData';
import { isAdminRole, isManagerRole } from '../services/access';
import {
  buildDepartmentStatsAligned as buildSyncedDepartmentStats,
  buildProjectPassportOverview as buildSyncedProjectPassportOverview,
} from '../services/departmentAnalytics';
import { useT } from '../i18n';
import { exportDepartmentOrderWorkbook } from '../services/departmentOrderExport';

const LEADER_ICONS = [Users2, BriefcaseBusiness, Workflow, TrendingUp];
const CORE_ICONS = [ShieldCheck, ClipboardList, FileText, CheckCircle2];
export default function DepartmentOrderPage() {
  const t = useT();
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [records, setRecords] = useState(() => getAllOtkRecords());
  const [users, setUsers] = useState(() => getSystemUsers());
  const [compensatedRegistry, setCompensatedRegistry] = useState(() => getCompensatedLoadRegistry());
  const [recoveredCompensated, setRecoveredCompensated] = useState(() => getRecoveredCompensatedLoads());
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isForecastModalOpen, setIsForecastModalOpen] = useState(false);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSettings(getOtkSettings());
      setRecords(getAllOtkRecords());
      setUsers(getSystemUsers());
      setCompensatedRegistry(getCompensatedLoadRegistry());
      setRecoveredCompensated(getRecoveredCompensatedLoads());
    };

    return subscribeToOtkData(sync, { debounceMs: 80 });
  }, []);

  const content = useMemo(
    () => sanitizeContent(settings.departmentOrderContent || DEFAULT_DEPARTMENT_ORDER_CONTENT),
    [settings.departmentOrderContent]
  );
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({ value: index, label: getMonthLabel(index) })),
    []
  );
  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, index) => currentYear - 2 + index),
    [currentYear]
  );
  const departmentStats = useMemo(
    () => buildSyncedDepartmentStats(records, users, settings.problemTypes || [], selectedMonth, selectedYear),
    [records, users, settings.problemTypes, selectedMonth, selectedYear]
  );
  const projectPassport = useMemo(
    () => buildSyncedProjectPassportOverview({
      recordsSource: records,
      usersSource: users,
      settings,
      compensatedRegistry,
      recoveredCompensated,
    }),
    [records, users, settings, compensatedRegistry, recoveredCompensated]
  );
  const exportLabels = useMemo(
    () => ({
      pageTitle: t('departmentOrder'),
      periodLabel: t('periodLabel'),
      generatedAtLabel: t('generatedAt'),
      coreShareTitle: t('departmentCoreShare'),
      coreShareMeta: 'trek asosiy oqimda',
      extraShareTitle: t('departmentExtraShare'),
      extraShareMeta: "trek qo'shimcha ishda",
      monthlyFlowTitle: t('departmentMonthlyFlow'),
      monthlyFlowMeta: t('departmentMonthlyMeta'),
      employeeFlowTitle: t('departmentEmployeeDailyFlow'),
      estimatedTimeTitle: t('departmentEstimatedTime'),
      forecastTitle: t('departmentForecastTitle'),
      leaderResponsibilitiesTitle: t('departmentLeaderResponsibilitiesTitle'),
      vsCurrentMonth: t('vsCurrentMonth'),
      tracksShort: t('tracksShort'),
      coreTitle: t('departmentCoreTitle'),
      coreTaskColumn: t('departmentCoreTaskColumn'),
      descriptionColumn: t('description'),
      assignmentsTitle: t('departmentAssignmentsTitle'),
      assignmentsSubtitle: t('departmentAssignmentsSubtitle'),
      departmentTask: t('departmentTask'),
      responsiblePerson: t('responsiblePerson'),
      assistant: t('assistant'),
      workflowTitle: t('departmentWorkflowTitle'),
      indicatorsTitle: t('departmentIndicatorsTitle'),
    }),
    [t]
  );

  const handleExport = async () => {
    try {
      await exportDepartmentOrderWorkbook({
        content,
        stats: departmentStats,
        monthLabel: getMonthLabel(selectedMonth),
        selectedMonth,
        selectedYear,
        labels: exportLabels,
      });
      toast.success(t('exportDepartmentOrderSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('exportDepartmentOrderFailed'));
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
              <ShieldCheck size={14} />
              {t('departmentOrderBadge')}
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {t('departmentOrder')}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {content.subtitle}
            </p>
          </div>
          <div className="w-full max-w-[420px] space-y-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 sm:col-span-2"
            >
              <Download size={16} />
              {t('exportDepartmentOrder')}
            </button>
            <button
              type="button"
              onClick={() => setIsPassportModalOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
            >
              <FileText size={16} />
              Loyiha pasporti
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              <Activity size={14} />
              {t('departmentMonthlyFlow')}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Bu filtr faqat quyidagi statistika kartalariga ta'sir qiladi.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-500 dark:text-slate-400">
                {t('monthFilter')}
              </label>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              >
                {monthOptions.map((month) => (
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
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <DepartmentStatCard
          tone="blue"
          icon={ShieldCheck}
          title={t('departmentCoreShare')}
          value={`${departmentStats.coreShare}%`}
          meta={`${departmentStats.coreTrackCount.toLocaleString('ru-RU')} ${t('tracksShort')} asosiy oqimda`}
        />
        <DepartmentStatCard
          tone="violet"
          icon={BriefcaseBusiness}
          title={t('departmentExtraShare')}
          value={`${departmentStats.extraShare}%`}
          meta={`${departmentStats.extraTrackCount.toLocaleString('ru-RU')} ${t('tracksShort')} qo'shimcha ishda`}
        />
        <DepartmentStatCard
          tone="emerald"
          icon={Activity}
          title={t('departmentMonthlyFlow')}
          value={departmentStats.monthlyTracks.toLocaleString('ru-RU')}
          meta={`${departmentStats.monthLabel} ${t('departmentMonthlyMeta')}`}
        />
        <DepartmentStatCard
          tone="amber"
          icon={Users2}
          title={t('departmentEmployeeDailyFlow')}
          value={`${departmentStats.leaderDailyFlow} ${t('tracksShort')}`}
          meta={departmentStats.employeeFlowMeta}
        />
        <DepartmentStatCard
          tone="rose"
          icon={Clock3}
          title={t('departmentEstimatedTime')}
          value={departmentStats.estimatedDailyTime}
          meta={departmentStats.employeeTimeMeta}
        />
        <DepartmentStatCard
          tone="indigo"
          icon={TrendingUp}
          title={t('departmentForecastTitle')}
          value={`${departmentStats.nextMonthForecast.toLocaleString('ru-RU')} ${t('tracksShort')}`}
          meta={departmentStats.forecastMeta}
          badgeText={`${formatSignedPercent(departmentStats.nextMonthChangePct)} ${t('vsCurrentMonth')}`}
          badgeTone={getForecastBadgeTone(departmentStats.nextMonthChangePct)}
          actionLabel={t('expand')}
          onAction={() => setIsForecastModalOpen(true)}
        />
      </section>

      <section>
        <EditableInfoPanel title={t('departmentLeaderResponsibilitiesTitle')} tone="amber" columns={2}>
          {content.leaderResponsibilities.map((item, index) => {
            const Icon = LEADER_ICONS[index] || ShieldCheck;
            return (
              <EditableInfoItem
                key={`leader-${index}`}
                icon={<Icon size={18} />}
                title={item.title}
                description={item.description}
              />
            );
          })}
        </EditableInfoPanel>
      </section>

      <section>
        <EditableInfoPanel title={t('departmentCoreTitle')} tone="blue" columns={2}>
          {content.core.map((item, index) => {
            const Icon = CORE_ICONS[index] || ClipboardList;
            return (
              <EditableInfoItem
                key={`core-${index}`}
                icon={<Icon size={18} />}
                title={item.title}
                description={item.description}
              />
            );
          })}
        </EditableInfoPanel>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
            <Users2 size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('departmentAssignmentsTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('departmentAssignmentsSubtitle')}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-[1100px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50/90 dark:bg-slate-800/80">
              <tr>
                <th className="w-14 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('number')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('departmentTask')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('responsiblePerson')}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 1</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 2</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 3</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {content.actualAssignments.map((item, index) => (
                <tr key={`assignment-${index}`} className="align-top">
                  <td className="px-3 py-3 font-semibold text-slate-500 dark:text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    <span className="block leading-6">{item.task}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                    {item.responsible || '-'}
                  </td>
                  {item.assistants.map((assistant, assistantIndex) => (
                    <td key={`assistant-${index}-${assistantIndex}`} className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {assistant || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <Workflow size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('departmentWorkflowTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('departmentWorkflowSubtitle')}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {content.workflow.map((text, index) => (
              <div
                key={`workflow-${index}`}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('departmentIndicatorsTitle')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('departmentIndicatorsSubtitle')}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {content.indicators.map((text, index) => (
              <div
                key={`indicator-${index}`}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ForecastDetailModal
        open={isForecastModalOpen}
        onClose={() => setIsForecastModalOpen(false)}
        t={t}
        stats={departmentStats}
      />
      <ProjectPassportModal
        open={isPassportModalOpen}
        onClose={() => setIsPassportModalOpen(false)}
        passport={projectPassport}
      />
    </div>
  );
}

function buildDepartmentStats(content, selectedMonth, selectedYear) {
  const now = new Date();
  const targetMonth = Number.isInteger(selectedMonth) ? selectedMonth : now.getMonth();
  const targetYear = Number.isInteger(selectedYear) ? selectedYear : now.getFullYear();
  const targetMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const monthLabel = getMonthLabel(targetMonth);
  const records = getAllOtkRecords();
  const minutesLookup = buildProblemMinutesLookup(getOtkSettings().problemTypes || []);
  const users = getSystemUsers().filter((item) => item.active !== false);
  const leaders = users.filter((item) => isAdminRole(item.role) || isManagerRole(item.role));
  const leaderKeys = buildLeaderKeySet(leaders);

  const monthlyRecords = records.filter((entry) => toDateKey(entry.date).startsWith(targetMonthPrefix));
  const leaderMonthlyRecords = monthlyRecords.filter((entry) => {
    const ownerKey = normalizePersonKey(entry.handledBy || entry.createdBy);
    return ownerKey && leaderKeys.has(ownerKey);
  });
  const workloadSplit = monthlyRecords.reduce(
    (accumulator, entry) => {
      if (isAdditionalWorkEntry(entry)) {
        accumulator.extra += 1;
      } else {
        accumulator.core += 1;
      }
      return accumulator;
    },
    { core: 0, extra: 0 }
  );

  const workdaysElapsed = countWorkdaysForPeriod(targetYear, targetMonth, now);
  const leaderDailyAverageRaw = workdaysElapsed ? leaderMonthlyRecords.length / workdaysElapsed : 0;
  const leaderDailyFlow = roundMetric(leaderDailyAverageRaw);
  const leaderCount = leaders.length || 1;
  const perEmployeeDailyFlow = roundMetric(leaderDailyAverageRaw / leaderCount);
  const monthlyLeaderMinutes = leaderMonthlyRecords.reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const estimatedMinutes = workdaysElapsed ? Math.round(monthlyLeaderMinutes / workdaysElapsed) : 0;
  const perEmployeeMinutes = leaderCount ? Math.round(estimatedMinutes / leaderCount) : 0;
  const totalLeaderWorkMinutesPerDay = leaders.reduce((sum, leader) => sum + getUserWorkdayMinutes(leader), 0);
  const perEmployeeCapacityMinutes = leaderCount ? Math.round(totalLeaderWorkMinutesPerDay / leaderCount) : 0;
  const forecast = forecastNextMonth(records, now.getFullYear(), now.getMonth(), minutesLookup);

  return {
    coreTrackCount: workloadSplit.core,
    extraTrackCount: workloadSplit.extra,
    coreShare: monthlyRecords.length ? Math.round((workloadSplit.core / monthlyRecords.length) * 100) : 0,
    extraShare: monthlyRecords.length ? Math.round((workloadSplit.extra / monthlyRecords.length) * 100) : 0,
    monthlyTracks: monthlyRecords.length,
    monthLabel,
    leaderDailyFlow,
    estimatedDailyTime: formatDuration(estimatedMinutes),
    employeeFlowMeta: `${leaderCount} ${pluralizeEmployees(leaderCount)} orasida har biriga o'rtacha ${perEmployeeDailyFlow} trek`,
    employeeTimeMeta: `${leaderCount} ${pluralizeEmployees(leaderCount)} orasida har biriga o'rtacha ${formatDuration(perEmployeeMinutes)} / me'yor ${formatDuration(perEmployeeCapacityMinutes)}`,
    nextMonthForecast: forecast.total,
    nextMonthChangePct: forecast.changePct,
    forecastMeta: `${forecast.label} uchun taxmin • ${formatDuration(forecast.estimatedMinutes)}`,
    forecast,
  };
}

function buildProjectPassportOverview(settings) {
  const records = getAllOtkRecords();
  const users = getSystemUsers().filter((item) => item.active !== false);
  const compensatedRegistry = getCompensatedLoadRegistry();
  const recoveredCompensated = getRecoveredCompensatedLoads();

  return {
    totalRecords: records.length,
    inProgress: records.filter((item) => item.status !== 'Yopildi').length,
    closed: records.filter((item) => item.status === 'Yopildi').length,
    activeUsers: users.length,
    problemTypes: (settings.problemTypes || []).length,
    departments: (settings.departments || []).length,
    sources: (settings.requestSources || []).length,
    compensatedCases: compensatedRegistry.length,
    recoveredCompensated: recoveredCompensated.length,
  };
}

function DepartmentStatCard({ title, value, meta, icon: Icon, tone = 'blue', badgeText = '', badgeTone = 'neutral', actionLabel = '', onAction }) {
  const toneMap = {
    blue: {
      shell: 'border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(255,255,255,1))] dark:border-blue-500/20 dark:bg-[linear-gradient(180deg,rgba(30,64,175,0.14),rgba(15,23,42,0.92))]',
      icon: 'border-blue-200 bg-white/90 text-blue-700 shadow-sm dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
      line: 'bg-blue-500',
    },
    violet: {
      shell: 'border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.95),rgba(255,255,255,1))] dark:border-violet-500/20 dark:bg-[linear-gradient(180deg,rgba(109,40,217,0.14),rgba(15,23,42,0.92))]',
      icon: 'border-violet-200 bg-white/90 text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
      line: 'bg-violet-500',
    },
    emerald: {
      shell: 'border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,1))] dark:border-emerald-500/20 dark:bg-[linear-gradient(180deg,rgba(5,150,105,0.12),rgba(15,23,42,0.92))]',
      icon: 'border-emerald-200 bg-white/90 text-emerald-700 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
      line: 'bg-emerald-500',
    },
    amber: {
      shell: 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,1))] dark:border-amber-500/20 dark:bg-[linear-gradient(180deg,rgba(217,119,6,0.12),rgba(15,23,42,0.92))]',
      icon: 'border-amber-200 bg-white/90 text-amber-700 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
      line: 'bg-amber-500',
    },
    rose: {
      shell: 'border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.95),rgba(255,255,255,1))] dark:border-rose-500/20 dark:bg-[linear-gradient(180deg,rgba(225,29,72,0.12),rgba(15,23,42,0.92))]',
      icon: 'border-rose-200 bg-white/90 text-rose-700 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
      line: 'bg-rose-500',
    },
    indigo: {
      shell: 'border-indigo-200/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.95),rgba(255,255,255,1))] dark:border-indigo-500/20 dark:bg-[linear-gradient(180deg,rgba(79,70,229,0.14),rgba(15,23,42,0.92))]',
      icon: 'border-indigo-200 bg-white/90 text-indigo-700 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300',
      line: 'bg-indigo-500',
    },
  };
  const badgeToneMap = {
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    negative: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };
  const toneStyle = toneMap[tone] || toneMap.blue;
  const compactValue = String(value).length > 14;

  return (
    <div className={`relative overflow-hidden rounded-[28px] border p-5 shadow-sm transition-shadow hover:shadow-md dark:shadow-none ${toneStyle.shell}`}>
      <div className={`absolute inset-x-0 top-0 h-1.5 ${toneStyle.line}`} />
      <div className="flex min-h-[236px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="pr-2">
            <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{title}</p>
          </div>
          <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${toneStyle.icon}`}>
            <Icon size={22} />
          </div>
        </div>
        <div className="mt-6">
          <p className={`font-semibold tracking-tight text-slate-950 dark:text-white ${compactValue ? 'text-[2rem] leading-[2.35rem]' : 'text-[3rem] leading-[3.2rem]'}`}>
            {value}
          </p>
        </div>
        {badgeText ? (
          <div className="mt-3">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeToneMap[badgeTone] || badgeToneMap.neutral}`}>
              {badgeText}
            </span>
          </div>
        ) : null}
        <div className="mt-auto pt-4">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Maximize2 size={14} />
              {actionLabel}
            </button>
          ) : null}
          <div className="max-w-full rounded-2xl border border-white/70 bg-white/75 px-3 py-2 text-sm font-medium leading-5 text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <span className="block whitespace-normal break-words">{meta}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PassportInfoCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function PassportMetricCard({ icon: Icon, label, value, tone = 'blue' }) {
  const toneMap = {
    blue: 'border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    violet: 'border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    indigo: 'border-indigo-200 bg-indigo-50/70 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300',
  };

  return (
    <div className={clsx('rounded-2xl border p-4', toneMap[tone] || toneMap.blue)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function EditableInfoPanel({ title, tone = 'blue', columns = 1, children }) {
  const toneClasses =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
        : 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneClasses}`}>{title}</div>
      <div className={`mt-5 grid gap-3 ${columns > 1 ? 'xl:grid-cols-2' : ''}`}>{children}</div>
    </div>
  );
}

function ForecastDetailModal({ open, onClose, t, stats }) {
  if (!open) return null;

  const detailRows = [
    { label: t('departmentForecastCurrentMonth'), value: `${stats.forecast.currentValue.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastPreviousMonth'), value: `${stats.forecast.previousValue.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastRecentAverage'), value: `${stats.forecast.recentAverage.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastOverallAverage'), value: `${stats.forecast.overallAverage.toLocaleString('ru-RU')} ${t('tracksShort')}` },
    { label: t('departmentForecastTrend'), value: `${stats.forecast.trend > 0 ? '+' : ''}${stats.forecast.trend} ${t('tracksShort')}` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[460] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
              {t('departmentForecastTitle')}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
              {stats.forecast.label}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('departmentForecastSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-indigo-200/80 bg-[linear-gradient(180deg,rgba(238,242,255,0.95),rgba(255,255,255,1))] p-5 dark:border-indigo-500/20 dark:bg-[linear-gradient(180deg,rgba(79,70,229,0.14),rgba(15,23,42,0.92))]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('departmentForecastExpectedLoad')}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    {stats.nextMonthForecast.toLocaleString('ru-RU')} {t('tracksShort')}
                  </p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  stats.nextMonthChangePct > 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : stats.nextMonthChangePct < 0
                      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {formatSignedPercent(stats.nextMonthChangePct)} {t('vsCurrentMonth')}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('departmentForecastExplanation')}
              </p>
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
                    className={`rounded-2xl border px-4 py-3 ${
                      driver.tone === 'positive'
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                        : driver.tone === 'negative'
                          ? 'border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80'
                    }`}
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
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                {stats.nextMonthChangePct < 0 ? t('departmentForecastDecreaseNote') : t('departmentForecastIncreaseNote')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProjectPassportModal({ open, onClose, passport }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[460] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
              <Maximize2 size={14} />
              Loyiha pasporti
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Loyiha pasporti</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Tizimning maqsadi, qamrovi va sinxron yangilanadigan asosiy ko'rsatkichlari.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Yopish"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-92px)] overflow-y-auto px-6 py-6">
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Loyiha pasporti</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tizimning maqsadi, qamrovi va rahbar uchun asosiy ko'rinishi.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <PassportInfoCard
                  label="Loyiha nomi"
                  value="iPOST Cargo QC System"
                  description="Sifat nazorati, murojaatlar, kompensatsiya va rahbar nazoratini birlashtiruvchi ichki ishchi tizim."
                />
                <PassportInfoCard
                  label="Maqsadi"
                  value="Jarayonni markazlashtirish"
                  description="Treklar, muammo turlari, bo'limlar, manbalar va rahbar statistikalarini bitta boshqaruv oynasida yuritish."
                />
                <PassportInfoCard
                  label="Asosiy foydalanuvchilar"
                  value="Admin, menejer, sifat nazorati hodimlari"
                  description="Rahbarlar uchun ko'rinish, hodimlar uchun esa operatsion ish jarayoni va nazorat oqimi mavjud."
                />
                <PassportInfoCard
                  label="Biznes natijasi"
                  value="Nazorat + tezkorlik + hisobot"
                  description="Kechikishlar, takror treklar, qoplangan yuklar va yuklama ko'rsatkichlarini aniq ko'rsatib, qaror qabul qilishni tezlashtiradi."
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Avtomatik ko'rsatkichlar</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bu blok tizimdagi o'zgarishlar bilan sinxron yangilanadi.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <PassportMetricCard icon={PackageSearch} label="Jami treklar" value={passport.totalRecords.toLocaleString('ru-RU')} tone="blue" />
                <PassportMetricCard icon={Clock3} label="Jarayondagi yuklar" value={passport.inProgress.toLocaleString('ru-RU')} tone="amber" />
                <PassportMetricCard icon={CheckCircle2} label="Yopilgan yuklar" value={passport.closed.toLocaleString('ru-RU')} tone="emerald" />
                <PassportMetricCard icon={Users2} label="Faol hodimlar" value={passport.activeUsers.toLocaleString('ru-RU')} tone="violet" />
                <PassportMetricCard icon={ClipboardList} label="Muammo turlari" value={passport.problemTypes.toLocaleString('ru-RU')} tone="rose" />
                <PassportMetricCard icon={ShieldCheck} label="Bo'lim va manbalar" value={`${passport.departments} / ${passport.sources}`} tone="indigo" />
                <PassportMetricCard icon={BriefcaseBusiness} label="Qoplangan yuklar" value={passport.compensatedCases.toLocaleString('ru-RU')} tone="emerald" />
                <PassportMetricCard icon={TrendingUp} label="Topilgan qoplanganlar" value={passport.recoveredCompensated.toLocaleString('ru-RU')} tone="blue" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditableInfoItem({ icon, title, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
          {icon}
        </div>
        <div className="flex-1">
          <>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
          </>
        </div>
      </div>
    </div>
  );
}

function sanitizeContent(value) {
  const source = value && typeof value === 'object' ? value : DEFAULT_DEPARTMENT_ORDER_CONTENT;
  const assignmentSeed =
    source.actualAssignments?.length > DEFAULT_DEPARTMENT_ORDER_CONTENT.actualAssignments.length
      ? source.actualAssignments
      : DEFAULT_DEPARTMENT_ORDER_CONTENT.actualAssignments;
  return {
    subtitle: (source.subtitle || DEFAULT_DEPARTMENT_ORDER_CONTENT.subtitle).trim(),
    leaderResponsibilities: DEFAULT_DEPARTMENT_ORDER_CONTENT.leaderResponsibilities.map((item, index) => ({
      title: (source.leaderResponsibilities?.[index]?.title || item.title).trim(),
      description: (source.leaderResponsibilities?.[index]?.description || item.description).trim(),
    })),
    core: DEFAULT_DEPARTMENT_ORDER_CONTENT.core.map((item, index) => ({
      title: (source.core?.[index]?.title || item.title).trim(),
      description: (source.core?.[index]?.description || item.description).trim(),
    })),
    actual: DEFAULT_DEPARTMENT_ORDER_CONTENT.actual.map((item, index) => ({
      title: (source.actual?.[index]?.title || item.title).trim(),
      description: (source.actual?.[index]?.description || item.description).trim(),
    })),
    actualAssignments: assignmentSeed.map((item, index) => ({
      task: (source.actualAssignments?.[index]?.task || item.task || '').trim(),
      responsible: (source.actualAssignments?.[index]?.responsible || item.responsible || '').trim(),
      assistants: Array.from({ length: 4 }, (_, assistantIndex) =>
        (source.actualAssignments?.[index]?.assistants?.[assistantIndex] || item.assistants?.[assistantIndex] || '').trim()
      ),
    })),
    workflow: DEFAULT_DEPARTMENT_ORDER_CONTENT.workflow.map((item, index) => (source.workflow?.[index] || item).trim()),
    indicators: DEFAULT_DEPARTMENT_ORDER_CONTENT.indicators.map((item, index) => (source.indicators?.[index] || item).trim()),
  };
}

function normalizePersonKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['`‘’"]/g, '')
    .replace(/o‘|o'|g‘|g'/g, (match) => (match.startsWith('o') ? 'o' : 'g'))
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLeaderKeySet(users) {
  const values = new Set();
  users.forEach((item) => {
    const full = normalizePersonKey(item.full_name);
    const username = normalizePersonKey(item.username);
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

function forecastNextMonth(records, year, month, minutesLookup = new Map()) {
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
    total,
    label: `${getMonthLabel(nextDate.getMonth())} ${nextDate.getFullYear()}`,
    estimatedMinutes: Math.round(total * averageMinutes),
    changePct,
    currentValue,
    previousValue,
    recentAverage: roundMetric(recentAverage),
    overallAverage: roundMetric(overallAverage),
    trend,
    drivers: buildForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, trend, total }),
  };
}

function buildForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, trend, total }) {
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

  const recentGap = roundMetric(currentValue - recentAverage);
  if (recentGap < 0) {
    drivers.push({
      tone: 'negative',
      title: "So'nggi 4 oy o'rtachasidan past",
      value: `${Math.abs(recentGap)} trek`,
      description: `So'nggi 4 oy o'rtachasi ${roundMetric(recentAverage)} ta bo'lib, joriy oy bundan past kelyapti.`,
    });
  } else if (recentGap > 0) {
    drivers.push({
      tone: 'positive',
      title: "So'nggi 4 oy o'rtachasidan yuqori",
      value: `${recentGap} trek`,
      description: `So'nggi 4 oy o'rtachasi ${roundMetric(recentAverage)} ta bo'lib, joriy oy bundan yuqori kelyapti.`,
    });
  }

  const overallGap = roundMetric(total - overallAverage);
  drivers.push({
    tone: overallGap >= 0 ? 'positive' : 'negative',
    title: 'Umumiy tarixiy fon',
    value: `${roundMetric(overallAverage)} trek`,
    description: `Prognoz umumiy tarix bo'yicha o'rtacha ${roundMetric(overallAverage)} trek atrofidagi fonni ham hisobga oladi.`,
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

function isAdditionalWorkEntry(entry) {
  const haystack = normalizePersonKey(
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

function countWorkdaysForPeriod(year, month, referenceDate) {
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

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function formatDuration(totalMinutes) {
  if (!totalMinutes) return '0 soat';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} daqiqa`;
  if (!minutes) return `${hours} soat`;
  return `${hours} soat ${minutes} daqiqa`;
}

function getMonthLabel(monthIndex) {
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  return months[monthIndex] || `Oy ${monthIndex + 1}`;
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

function pluralizeEmployees(count) {
  return count === 1 ? 'xodim' : 'xodim';
}

