import { clsx } from 'clsx';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from './Button';

// ============================================================
// EmptyState / LoadingState / ErrorState — yagona ko'rinish
// ------------------------------------------------------------
// Ma'lumot yo'q, yuklanmoqda yoki xatolik holatlari uchun
// yagona dizayn. Har sahifa o'zicha "ma'lumot yo'q" yozmasin.
//
// Namuna:
//   <EmptyState title="Hali murojaat yo'q" />
//   <EmptyState
//     icon={Inbox}
//     title="Hech narsa topilmadi"
//     description="Filtrlarni o'zgartirib ko'ring"
//     action={<Button>Filterni tozalash</Button>}
//   />
//
//   <LoadingState message="Ma'lumotlar yuklanmoqda..." />
//
//   <ErrorState
//     title="Xatolik yuz berdi"
//     description="Server bilan ulanish yo'qotildi"
//     onRetry={() => refetch()}
//   />
// ============================================================

export function EmptyState({
  icon: Icon = Inbox,
  title = "Ma'lumot yo'q",
  description = null,
  action = null,
  className = '',
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700">
        <Icon size={22} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Yuklanmoqda…', size = 'md', className = '' }) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
  return (
    <div
      className={clsx(
        'flex items-center justify-center gap-3 rounded-lg px-6 py-8 text-slate-500 dark:text-slate-400',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={iconSize} className="animate-spin text-indigo-500" aria-hidden="true" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

export function ErrorState({
  title = 'Xatolik yuz berdi',
  description = null,
  onRetry = null,
  className = '',
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-lg border border-rose-200 bg-rose-50/50 px-6 py-10 text-center dark:border-rose-500/30 dark:bg-rose-500/10',
        className,
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:ring-rose-500/30">
        <AlertCircle size={22} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-rose-700 dark:text-rose-300">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-rose-600 dark:text-rose-400">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Qaytadan urinish
        </Button>
      )}
    </div>
  );
}
