// ============================================================
// Dashboard kichik prezentatsion kartochkalar
// ------------------------------------------------------------
// DashboardPage.jsx ichidan ajratilgan kichik leaf komponentlar.
// Hech qanday hook chaqirishi yoki tashqi state'ga bog'liqligi
// bo'lmagan, faqat props orqali render qiladigan kartalar.
// ============================================================

import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { formatPercent } from '../../services/salesData';

// ------------------------------------------------------------
// EmployeeMetric — kichik metrik (hodim natijasi va h.k.)
// ------------------------------------------------------------
export function EmployeeMetric({ label, value, tone = 'slate' }) {
  const toneClass = {
    slate:
      'bg-slate-50 text-slate-950 ring-slate-200 dark:bg-slate-950 dark:text-white dark:ring-slate-800',
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    amber:
      'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  };

  return (
    <div className={clsx('rounded-2xl p-4 ring-1', toneClass[tone])}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

// ------------------------------------------------------------
// KpiMetricCard — yuqoridagi KPI kartochka (icon + value + hint)
// ------------------------------------------------------------
export function KpiMetricCard({ icon: Icon, label, value, hint, tone = 'blue', onClick = null }) {
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
    <button
      type="button"
      onClick={onClick || undefined}
      className={clsx(
        'flex min-h-[164px] flex-col rounded-2xl bg-white p-4 text-left ring-1 transition dark:bg-slate-950/80',
        toneClass[tone],
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default',
      )}
    >
      <div className={clsx('mb-4 h-1.5 rounded-full bg-gradient-to-r', accentClass[tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-5 opacity-80">{label}</p>
          <p className="mt-3 break-words text-[clamp(1.9rem,3vw,2.5rem)] font-semibold leading-none tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2.5 text-current ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </button>
  );
}

// ------------------------------------------------------------
// ExecutivePulse — kompakt yorqin pulse metrika
// ------------------------------------------------------------
export function ExecutivePulse({ label, value, tone = 'slate' }) {
  const toneClass = {
    slate:
      'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  };

  return (
    <div className={clsx('rounded-2xl px-3 py-3 ring-1', toneClass[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

// ------------------------------------------------------------
// MiniKpiStat — kichik KPI label+value rang ko'rsatkichi
// ------------------------------------------------------------
export function MiniKpiStat({ label, value, tone = 'slate' }) {
  const toneClass = {
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
    slate:
      'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
  };

  return (
    <div className={clsx('rounded-xl px-3 py-3 ring-1', toneClass[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

// ------------------------------------------------------------
// DuplicateDetailField — duplicate modal ichidagi label/value
// ------------------------------------------------------------
export function DuplicateDetailField({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{value || '-'}</p>
    </div>
  );
}

// ------------------------------------------------------------
// ProgressRow — label, value va max bilan progress chizig'i
// ------------------------------------------------------------
export function ProgressRow({ label, value, max }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100/70 dark:bg-slate-800 dark:ring-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-500"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ActivityRow — audit log/recent activity satr
// ------------------------------------------------------------
export function ActivityRow({ item }) {
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

// ------------------------------------------------------------
// TrendBadge — oylik hisobotdagi trend foiz badgesi
// ------------------------------------------------------------
export function TrendBadge({ trend }) {
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
    neutral:
      'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    start:
      'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  };

  const prefix = trend.percent > 0 ? '+' : '';
  const Icon =
    trend.direction === 'up'
      ? ArrowUpRight
      : trend.direction === 'down'
        ? ArrowDownRight
        : null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
        toneClass[trend.direction] || toneClass.neutral,
      )}
    >
      {Icon ? <Icon size={12} /> : null}
      {prefix}
      {trend.percent}%
    </span>
  );
}

// ------------------------------------------------------------
// SalesStatCard — sotuv statistika kartochkasi
// ------------------------------------------------------------
export function SalesStatCard({ label, value, sub, tone = 'slate', icon }) {
  const tones = {
    blue: {
      bg: 'from-blue-50 to-sky-50/40 dark:from-blue-500/10 dark:to-sky-500/5',
      accent: 'from-blue-500 to-sky-500',
      text: 'text-blue-700 dark:text-blue-300',
    },
    violet: {
      bg: 'from-violet-50 to-purple-50/40 dark:from-violet-500/10 dark:to-purple-500/5',
      accent: 'from-violet-500 to-purple-500',
      text: 'text-violet-700 dark:text-violet-300',
    },
    amber: {
      bg: 'from-amber-50 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5',
      accent: 'from-amber-500 to-orange-500',
      text: 'text-amber-700 dark:text-amber-300',
    },
    emerald: {
      bg: 'from-emerald-50 to-teal-50/40 dark:from-emerald-500/10 dark:to-teal-500/5',
      accent: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
    slate: {
      bg: 'from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      accent: 'from-slate-400 to-slate-500',
      text: 'text-slate-700 dark:text-slate-200',
    },
  };
  const palette = tones[tone] || tones.slate;
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br p-3 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800',
        palette.bg,
      )}
    >
      <div className={clsx('absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r', palette.accent)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div
            className={clsx('mt-1 text-xl font-extrabold tracking-tight truncate', palette.text)}
            title={String(value)}
          >
            {value}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{sub}</div>
        </div>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ProblemRatioCard — muammo/sotuv foiz kartasi
// ------------------------------------------------------------
export function ProblemRatioCard({ percent, classification }) {
  const cls = classification || { tone: 'slate', label: "Ma'lumot yo'q" };
  const tones = {
    emerald: {
      bg: 'from-emerald-50 to-teal-50/40 dark:from-emerald-500/10 dark:to-teal-500/5',
      accent: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-700 dark:text-emerald-300',
      sub: 'text-emerald-600',
    },
    amber: {
      bg: 'from-amber-50 to-orange-50/40 dark:from-amber-500/10 dark:to-orange-500/5',
      accent: 'from-amber-500 to-orange-500',
      text: 'text-amber-700 dark:text-amber-300',
      sub: 'text-amber-600',
    },
    orange: {
      bg: 'from-orange-50 to-red-50/40 dark:from-orange-500/10 dark:to-red-500/5',
      accent: 'from-orange-500 to-red-500',
      text: 'text-orange-700 dark:text-orange-300',
      sub: 'text-orange-600',
    },
    rose: {
      bg: 'from-rose-50 to-red-50/40 dark:from-rose-500/10 dark:to-red-500/5',
      accent: 'from-rose-500 to-red-500',
      text: 'text-rose-700 dark:text-rose-300',
      sub: 'text-rose-600',
    },
    slate: {
      bg: 'from-slate-50 to-white dark:from-slate-800 dark:to-slate-900',
      accent: 'from-slate-400 to-slate-500',
      text: 'text-slate-700 dark:text-slate-200',
      sub: 'text-slate-500',
    },
  };
  const palette = tones[cls.tone] || tones.slate;
  const display = percent != null ? formatPercent(percent, 2) : '—';
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border-2 bg-gradient-to-br p-3 transition-all hover:-translate-y-0.5 hover:shadow-md',
        palette.bg,
        cls.tone === 'slate' ? 'border-slate-200 dark:border-slate-800' : 'border-current/20',
      )}
    >
      <div className={clsx('absolute left-0 right-0 top-0 h-1 bg-gradient-to-r', palette.accent)} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Muammo / Sotuv
          </div>
          <div className={clsx('mt-1 text-2xl font-extrabold tracking-tight', palette.text)}>
            {display}
          </div>
          <div className={clsx('mt-0.5 text-[10px] font-bold', palette.sub)}>{cls.label}</div>
        </div>
        <span className="text-lg">
          {cls.tone === 'emerald'
            ? '✓'
            : cls.tone === 'amber'
              ? '⚠'
              : cls.tone === 'rose' || cls.tone === 'orange'
                ? '⛔'
                : '⁞'}
        </span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// SimpleRankList — kichik label+count tartiblangan ro'yxat
// ------------------------------------------------------------
export function SimpleRankList({ title, items, emptyLabel }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <span className="truncate text-sm text-slate-600 dark:text-slate-300">{item.name}</span>
              <span className="text-sm font-semibold text-slate-950 dark:text-white">{item.count}</span>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
            {emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// RatioRow — bo'lim ulushlari uchun progress bar satri
// ------------------------------------------------------------
export function RatioRow({ label, value, percent, barClass, textClass }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span className={clsx('font-semibold', textClass)}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div
          className={clsx('h-full rounded-full', barClass)}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}
