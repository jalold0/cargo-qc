import { clsx } from 'clsx';
import { forwardRef } from 'react';

// ============================================================
// Button — barcha sahifalarda ishlatiladigan tugma
// ------------------------------------------------------------
// Variants: primary | secondary | ghost | danger | success
// Sizes:    sm | md | lg
// Modifiers: fullWidth, loading, disabled, iconOnly
//
// Namuna:
//   <Button>Saqlash</Button>
//   <Button variant="ghost" size="sm">Bekor qilish</Button>
//   <Button variant="danger" loading>O'chirilmoqda</Button>
//   <Button iconOnly aria-label="Yopish"><X size={16} /></Button>
// ============================================================

// PRIMARY uchun indigo-600 (Tailwind built-in) — brand tokens ulanmagan
// bo'lsa ham ishlaydi. brand-600 ham ushbu hex qiymatga teng (#4f46e5).
const VARIANT_CLASS = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500 shadow-sm',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500 shadow-sm',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-sm',
};

const SIZE_CLASS = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

const ICON_ONLY_SIZE = {
  sm: 'h-8 w-8 p-0',
  md: 'h-10 w-10 p-0',
  lg: 'h-12 w-12 p-0',
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    fullWidth = false,
    loading = false,
    disabled = false,
    iconOnly = false,
    className = '',
    leftIcon: LeftIcon = null,
    rightIcon: RightIcon = null,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={clsx(
        // base
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        // variant
        VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
        // size
        iconOnly ? ICON_ONLY_SIZE[size] || ICON_ONLY_SIZE.md : SIZE_CLASS[size] || SIZE_CLASS.md,
        // modifiers
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : (
        LeftIcon && <LeftIcon size={size === 'lg' ? 18 : 16} aria-hidden="true" />
      )}
      {!iconOnly && children}
      {!loading && RightIcon && <RightIcon size={size === 'lg' ? 18 : 16} aria-hidden="true" />}
    </button>
  );
});

export default Button;
