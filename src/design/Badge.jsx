import { clsx } from 'clsx';

// ============================================================
// Badge — status, kategoriya, soni uchun kichik chiplar
// ------------------------------------------------------------
// Variants (rang): neutral | brand | success | warning | danger | info
// Sizes:           sm | md
// Tone:            soft (default, kichik fon) | solid (to'ldirilgan) | outline (chegara)
//
// Namuna:
//   <Badge>Yangi</Badge>
//   <Badge variant="success">Yopildi</Badge>
//   <Badge variant="warning" tone="solid">Kechikgan</Badge>
//   <Badge variant="info" size="sm" tone="outline">3 ta</Badge>
// ============================================================

// Tailwind built-in ranglardan foydalanamiz — har qanday muhitda ishlaydi
const SOFT_VARIANT = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
};

const SOLID_VARIANT = {
  neutral: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900',
  brand: 'bg-indigo-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-rose-600 text-white',
  info: 'bg-blue-600 text-white',
};

const OUTLINE_VARIANT = {
  neutral: 'bg-transparent text-slate-700 ring-1 ring-inset ring-slate-300 dark:text-slate-300 dark:ring-slate-600',
  brand: 'bg-transparent text-indigo-700 ring-1 ring-inset ring-indigo-300 dark:text-indigo-300 dark:ring-indigo-700',
  success: 'bg-transparent text-emerald-700 ring-1 ring-inset ring-emerald-300 dark:text-emerald-400 dark:ring-emerald-700',
  warning: 'bg-transparent text-amber-700 ring-1 ring-inset ring-amber-300 dark:text-amber-400 dark:ring-amber-700',
  danger: 'bg-transparent text-rose-700 ring-1 ring-inset ring-rose-300 dark:text-rose-400 dark:ring-rose-700',
  info: 'bg-transparent text-blue-700 ring-1 ring-inset ring-blue-300 dark:text-blue-400 dark:ring-blue-700',
};

const SIZE_CLASS = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  tone = 'soft',
  className = '',
  ...rest
}) {
  const toneMap = tone === 'solid' ? SOLID_VARIANT : tone === 'outline' ? OUTLINE_VARIANT : SOFT_VARIANT;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide',
        SIZE_CLASS[size] || SIZE_CLASS.md,
        toneMap[variant] || toneMap.neutral,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

export default Badge;
