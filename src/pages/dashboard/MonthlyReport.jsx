// ============================================================
// MonthlyReport — Oylik hisobot komponentlari
// ------------------------------------------------------------
// DashboardPage.jsx 3990 qator bo'lib ketgani sababli, oylik
// hisobot bilan bog'liq komponentlar shu yerga ko'chirildi:
//   - MonthlyReportContent — to'liq hisobot bloki
//   - MonthlyReportRow     — jadval satri
//   - MonthlyReportMetricCard — yuqori KPI kartochka
//   - TrendListModal       — kamaygan/ko'paygan muammolar
//   - buildMonthlyReportShareText — share matni
//
// Hech qanday tashqi closure'ga bog'liq emas — barcha kerakli
// ma'lumotlar props orqali uzatiladi.
// ============================================================

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import {
  calcProblemRatio,
  classifyProblemRatio,
  formatKg,
  formatTracks,
  getYearTotals,
} from '../../services/salesData';
import { ProblemRatioCard, SalesStatCard, TrendBadge } from './cards';

// ------------------------------------------------------------
// MonthlyReportRow — jadval satri (umumiy yoki muammo turi)
// ------------------------------------------------------------
export function MonthlyReportRow({ row, monthLabels }) {
  return (
    <tr className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{row.problemType}</td>
      <td className="px-4 py-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        {row.total}
      </td>
      {monthLabels.map((month) => {
        const monthData = row.months?.find((item) => item.monthIndex === month.monthIndex) || {
          count: 0,
          trend: { direction: 'neutral', percent: 0 },
        };
        return (
          <td key={month.monthIndex} className="px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {monthData.count}
              </span>
              <TrendBadge trend={monthData.trend} />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ------------------------------------------------------------
// MonthlyReportMetricCard — yuqori KPI kartochka (4 ta)
// ------------------------------------------------------------
export function MonthlyReportMetricCard({
  label,
  value,
  hint,
  tone = 'blue',
  secondaryValue = null,
  metaBadge = null,
  compactText = false,
  onClick = null,
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
    emerald:
      'bg-white/85 text-emerald-700 ring-emerald-200 dark:bg-slate-900/70 dark:text-emerald-300 dark:ring-emerald-500/20',
    rose: 'bg-white/85 text-rose-700 ring-rose-200 dark:bg-slate-900/70 dark:text-rose-300 dark:ring-rose-500/20',
  };

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        type: 'button',
        onClick,
        title: "Batafsil ko'rish uchun bosing",
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={clsx(
        'group relative h-full w-full overflow-hidden rounded-2xl border p-4 text-left transition-all',
        toneClass[tone],
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-400',
      )}
    >
      <div
        className={clsx(
          'absolute inset-y-0 left-0 w-1.5 transition-all',
          accentClass[tone],
          onClick && 'group-hover:w-2',
        )}
      />
      <div className="flex min-h-[156px] flex-col justify-between pl-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{label}</p>
          {metaBadge && (
            <span
              className={clsx(
                'inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
                badgeToneClass[tone],
              )}
            >
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
                  : 'text-[clamp(1.15rem,1.9vw,1.9rem)] leading-tight',
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

        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hint}
          {onClick && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-60 transition group-hover:opacity-100">
              Batafsil →
            </span>
          )}
        </p>
      </div>
    </Wrapper>
  );
}

// ------------------------------------------------------------
// TrendListModal — Kamaygan / Ko'paygan muammolar modali
// ------------------------------------------------------------
export function TrendListModal({ direction, rows, latestMonth, previousMonth, monthLabels, onClose }) {
  const isIncreased = direction === 'increased';

  const items = useMemo(() => {
    return (rows || [])
      .filter((row) => Number(row.total) > 0)
      .map((row) => {
        const latest = row.months?.find((m) => m.monthIndex === latestMonth)?.count || 0;
        const previous = row.months?.find((m) => m.monthIndex === previousMonth)?.count || 0;
        const change = latest - previous;
        const percent = previous > 0 ? (change / previous) * 100 : latest > 0 ? 100 : 0;
        return {
          name: row.problemType,
          total: row.total,
          latest,
          previous,
          change,
          percent,
        };
      })
      .filter((item) => (isIncreased ? item.change > 0 : item.change < 0))
      .sort((a, b) => (isIncreased ? b.percent - a.percent : a.percent - b.percent));
  }, [rows, latestMonth, previousMonth, isIncreased]);

  const latestLabel = monthLabels?.find((m) => m.monthIndex === latestMonth)?.label || '—';
  const previousLabel = monthLabels?.find((m) => m.monthIndex === previousMonth)?.label || '—';

  const palette = isIncreased
    ? {
        bg: 'from-rose-50 via-white to-orange-50/40',
        accent: 'from-rose-500 to-red-500',
        icon: '📈',
        title: "Ko'paygan muammolar",
        subtitle: `${previousLabel} → ${latestLabel} ga nisbatan o'sgan muammo turlari`,
        chip: 'bg-rose-100 text-rose-700 ring-rose-200',
        arrow: 'text-rose-600',
      }
    : {
        bg: 'from-emerald-50 via-white to-teal-50/40',
        accent: 'from-emerald-500 to-teal-500',
        icon: '📉',
        title: 'Kamaygan muammolar',
        subtitle: `${previousLabel} → ${latestLabel} ga nisbatan kamaygan muammo turlari`,
        chip: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        arrow: 'text-emerald-600',
      };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={clsx(
          'flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-gradient-to-br shadow-2xl dark:from-slate-900 dark:via-slate-900 dark:to-slate-800',
          palette.bg,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-white/60 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className={clsx('absolute left-0 right-0 top-0 h-1 bg-gradient-to-r', palette.accent)} />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-xl text-white shadow-md',
                  palette.accent,
                )}
              >
                {palette.icon}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950 dark:text-white">{palette.title}</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{palette.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx('rounded-full px-2.5 py-1 text-xs font-bold ring-1', palette.chip)}>
                {items.length} ta tur
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl">{isIncreased ? '🎉' : '🌱'}</p>
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isIncreased ? "Ko'paygan muammo yo'q" : "Kamaygan muammo yo'q"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Hozircha tegishli ma'lumot mavjud emas
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item, index) => {
                const absPercent = Math.abs(item.percent);
                const sign = isIncreased ? '+' : '−';
                return (
                  <li
                    key={item.name}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 p-2.5 transition hover:border-current/30 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    {/* Rank */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>

                    {/* Name + transition */}
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-bold text-slate-900 dark:text-white"
                        title={item.name}
                      >
                        {item.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>
                          {previousLabel}: <b className="text-slate-700 dark:text-slate-200">{item.previous}</b>
                        </span>
                        <span className={palette.arrow}>→</span>
                        <span>
                          {latestLabel}: <b className="text-slate-700 dark:text-slate-200">{item.latest}</b>
                        </span>
                        <span className="mx-0.5 opacity-50">·</span>
                        <span>
                          Jami: <b className="text-slate-700 dark:text-slate-200">{item.total}</b>
                        </span>
                      </div>
                    </div>

                    {/* Diff + percent */}
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className={clsx('text-sm font-extrabold tabular-nums', palette.arrow)}>
                        {sign}
                        {Math.abs(item.change)}
                      </span>
                      <span
                        className={clsx('rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1', palette.chip)}
                      >
                        {sign}
                        {absPercent.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white/40 px-4 py-2 text-[11px] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <span className="font-bold">{previousLabel}</span> →{' '}
          <span className="font-bold">{latestLabel}</span> oyiga nisbatan
          {isIncreased ? " o'sish" : ' kamayish'} bo'yicha saralangan
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MonthlyReportContent — to'liq hisobot bloki
// ------------------------------------------------------------
export function MonthlyReportContent({
  t,
  report,
  monthLabels,
  periodLabel,
  latestLabel,
  rows,
  full = false,
}) {
  const visibleRows = rows || report.rows || [];
  const totalProblemTypes = report.rows?.length || 0;
  const decreasedShare = totalProblemTypes
    ? Math.round(((report.decreasedCount || 0) / totalProblemTypes) * 100)
    : 0;
  const increasedShare = totalProblemTypes
    ? Math.round(((report.increasedCount || 0) / totalProblemTypes) * 100)
    : 0;
  const totalRow = {
    problemType: t('total'),
    total: report.totalRecords || 0,
    months: report.totals || [],
  };
  // Trend modal state
  const [trendModalDirection, setTrendModalDirection] = useState(null);

  // Sotuv ma'lumotlari (baza bilan kelajakda ulanadi) — yillik jami
  const reportYear = report.year || report.selectedYear || new Date().getFullYear();
  const salesTotals = getYearTotals(reportYear);
  const problemTracks = report.totalRecords || 0;
  const ratioTracks = calcProblemRatio(problemTracks, salesTotals.totalTracks);
  const ratioClass = classifyProblemRatio(ratioTracks);
  const hasSalesData = salesTotals.totalTracks > 0 || salesTotals.totalKg > 0;

  return (
    <div className="space-y-4">
      {full && (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30">
            📊
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
              WORKPLACE CRM
            </p>
            <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t('monthlyReport')}
            </h3>
          </div>
        </div>
      )}

      {/* 4 ta asosiy KPI karta — gradient + hover effects */}
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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
          onClick={(report.decreasedCount || 0) > 0 ? () => setTrendModalDirection('decreased') : null}
        />
        <MonthlyReportMetricCard
          label={t('increasedLabel')}
          value={report.increasedCount || 0}
          hint={t('redSignal')}
          tone="rose"
          metaBadge={`${increasedShare}%`}
          onClick={(report.increasedCount || 0) > 0 ? () => setTrendModalDirection('increased') : null}
        />
      </div>

      {/* ============================================================
          OYLIK SOTUV vs MUAMMO TREK FOIZI bo'limi
          Baza bilan ulanmagan bo'lsa, "Ma'lumot yo'q" holatida ko'rinadi
          ============================================================ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-blue-500/5">
        <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                📈 Oylik Sotuv vs Muammo treklar
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {hasSalesData
                  ? `${reportYear}-yil bo'yicha — ${salesTotals.monthsWithData} oy ma'lumotlari`
                  : "Sotuv ma'lumotlari ulanmagan — CRM bazasi bilan integratsiyada to'ldiriladi"}
              </p>
            </div>
            <span
              className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                hasSalesData
                  ? 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400',
              )}
            >
              {hasSalesData ? '● Aktiv' : '○ Kutilmoqda'}
            </span>
          </div>
        </div>

        <div className="grid gap-2.5 p-3 sm:grid-cols-2 xl:grid-cols-4">
          <SalesStatCard
            label="Sotilgan treklar"
            value={hasSalesData ? formatTracks(salesTotals.totalTracks) : '—'}
            sub={hasSalesData ? 'yillik jami' : "ma'lumot yo'q"}
            tone="blue"
            icon="📦"
          />
          <SalesStatCard
            label="Sotilgan vazn"
            value={hasSalesData ? formatKg(salesTotals.totalKg) : '—'}
            sub={hasSalesData ? 'yillik jami' : "ma'lumot yo'q"}
            tone="violet"
            icon="⚖"
          />
          <SalesStatCard
            label="Muammoli treklar"
            value={formatTracks(problemTracks)}
            sub={t('totalRecordsLabel')}
            tone="amber"
            icon="⚠"
          />
          <ProblemRatioCard percent={ratioTracks} classification={ratioClass} />
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          📅 {t('periodLabel')}: {periodLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          ★ {t('lastActiveMonthLabel')}: {latestLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          ℹ {t('monthlyChangeHint')}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                <th className="min-w-[280px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('problemType')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('total')}
                </th>
                {monthLabels.map((month) => (
                  <th
                    key={month.monthIndex}
                    className="min-w-[160px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {month.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <MonthlyReportRow row={totalRow} monthLabels={monthLabels} />
              {visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={monthLabels.length + 2}
                    className="px-4 py-12 text-center text-slate-400"
                  >
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

      {/* Kamaygan / Ko'paygan muammolar tafsilot modali */}
      {trendModalDirection && (
        <TrendListModal
          direction={trendModalDirection}
          rows={report.rows || []}
          latestMonth={report.latestMonth}
          previousMonth={report.previousMonth}
          monthLabels={monthLabels}
          onClose={() => setTrendModalDirection(null)}
        />
      )}

      {!full && report.rows?.length > visibleRows.length && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('showing')} {visibleRows.length} / {report.rows.length}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// buildMonthlyReportShareText — Telegram/email share matni
// ------------------------------------------------------------
export function buildMonthlyReportShareText({ report, t, periodLabel, latestLabel }) {
  const topProblemName = report?.topProblem?.name || '-';
  const topProblemCount = report?.topProblem?.count || 0;
  const totalRecords = report?.totalRecords || 0;
  const decreasedCount = report?.decreasedCount || 0;
  const increasedCount = report?.increasedCount || 0;
  const year = report?.selectedYear || report?.year || new Date().getFullYear();

  return [
    `${t('monthlyReport')} ${year}`,
    `${t('periodLabel')}: ${periodLabel}`,
    `${t('lastActiveMonthLabel')}: ${latestLabel}`,
    `${t('totalRecordsLabel')}: ${Number(totalRecords).toLocaleString('ru-RU')}`,
    `${t('topProblemLabel')}: ${topProblemName} (${Number(topProblemCount).toLocaleString('ru-RU')})`,
    `${t('decreasedLabel')}: ${Number(decreasedCount).toLocaleString('ru-RU')}`,
    `${t('increasedLabel')}: ${Number(increasedCount).toLocaleString('ru-RU')}`,
  ].join('\n');
}
