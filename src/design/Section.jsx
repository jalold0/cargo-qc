import { clsx } from 'clsx';

// ============================================================
// Section — sarlavhali bo'lim wrapper
// ------------------------------------------------------------
// Sahifa ichidagi alohida ma'no bo'limlari uchun.
//
// Namuna:
//   <Section title="Sotuv ko'rsatkichlari" subtitle="2026-yil">
//     <div>...</div>
//   </Section>
//
//   <Section title="Treklar" actions={<Button size="sm">Eksport</Button>}>
//     ...
//   </Section>
// ============================================================

export function Section({
  title,
  subtitle = null,
  actions = null,
  children,
  className = '',
  variant = 'default', // default | bare
  ...rest
}) {
  const isBare = variant === 'bare';

  return (
    <section
      className={clsx(
        !isBare &&
          'rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 dark:bg-slate-900 dark:ring-slate-800',
        className,
      )}
      {...rest}
    >
      {(title || subtitle || actions) && (
        <div
          className={clsx(
            'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
            !isBare && 'mb-4 border-b border-slate-100 pb-3 dark:border-slate-800',
          )}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export default Section;
