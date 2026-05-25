import { clsx } from 'clsx';

// ============================================================
// PageHeader — har sahifaning yuqori sarlavhasi
// ------------------------------------------------------------
// title (majburiy), subtitle, eyebrow (kichik label), icon,
// actions (oxirgi qismida), breadcrumb (yuqorida)
//
// Namuna:
//   <PageHeader
//     title="Murojaatlar"
//     subtitle="OTK bo'limining tezkor ish maydoni"
//     icon={MessageSquare}
//     actions={<Button>Yangi murojaat</Button>}
//   />
// ============================================================

export function PageHeader({
  title,
  subtitle = null,
  eyebrow = null,
  icon: Icon = null,
  actions = null,
  breadcrumb = null,
  className = '',
}) {
  return (
    <header className={clsx('flex flex-col gap-3', className)}>
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
              <Icon size={22} aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
