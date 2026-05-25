import { clsx } from 'clsx';

// ============================================================
// Toolbar — filter va action satri
// ------------------------------------------------------------
// Jadval ustidagi yoki sahifa boshidagi filter/qidiruv/action
// satrlari uchun yagona ko'rinish.
//
// Namuna:
//   <Toolbar
//     start={<Input placeholder="Qidiruv..." />}
//     middle={<Select>...</Select>}
//     end={<Button>Yangi</Button>}
//   />
// ============================================================

export function Toolbar({
  start = null,
  middle = null,
  end = null,
  className = '',
  ...rest
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:flex-wrap dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
      {...rest}
    >
      {start && <div className="flex flex-1 items-center gap-2 sm:max-w-md">{start}</div>}
      {middle && <div className="flex flex-wrap items-center gap-2">{middle}</div>}
      {end && <div className="flex items-center gap-2 sm:ml-auto">{end}</div>}
    </div>
  );
}

export default Toolbar;
