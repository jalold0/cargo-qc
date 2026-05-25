import { useEffect, useState } from 'react';
import { CheckCircle2, CloudUpload, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  getSyncSteps,
  syncAllToSupabase,
  testAllConnections,
} from '../services/supabaseSyncManager';

// ============================================================
// SyncToSupabasePanel — Settings sahifasida ko'rinadigan
// Supabase bilan sync paneli.
// ------------------------------------------------------------
//   - Connection test tugmasi (qaysi jadvallarga ulanish bor)
//   - "Sync All to Supabase" tugmasi (bulk push)
//   - Har bir bosqich progress + status
// ============================================================

const STATUS_STYLES = {
  idle: 'text-slate-500 dark:text-slate-400',
  progress: 'text-blue-700 dark:text-blue-300',
  success: 'text-emerald-700 dark:text-emerald-400',
  error: 'text-rose-700 dark:text-rose-400',
};

const STATUS_ICON = {
  idle: null,
  progress: Loader2,
  success: CheckCircle2,
  error: XCircle,
};

const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export default function SyncToSupabasePanel() {
  const allSteps = getSyncSteps();
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(allSteps.map((s) => [s.key, { status: 'idle', message: '', count: 0 }])),
  );
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connTests, setConnTests] = useState(null);

  // Componеnt mount: avtomatik connection test
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      const result = await testAllConnections();
      if (!cancelled) setConnTests(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testAllConnections();
      setConnTests(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSyncAll = async () => {
    if (busy) return;
    if (!isSupabaseConfigured) {
      toast.error('Supabase env to\'ldirilmagan');
      return;
    }
    setBusy(true);
    // Statuslarni reset qilamiz
    setStatuses(
      Object.fromEntries(allSteps.map((s) => [s.key, { status: 'idle', message: '', count: 0 }])),
    );

    try {
      const result = await syncAllToSupabase({
        onProgress: ({ key, status, message, count }) => {
          setStatuses((prev) => ({
            ...prev,
            [key]: { status, message, count: count || prev[key]?.count || 0 },
          }));
        },
      });

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Sync paytida xatolik');
      }
    } catch (error) {
      toast.error(error?.message || 'Sync paytida xatolik');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-start gap-3">
          <CloudUpload size={20} className="mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Supabase ulanmagan
            </h3>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/90">
              <code className="rounded bg-white/70 px-1 dark:bg-slate-900/40">.env.local</code>{' '}
              faylida <code>VITE_SUPABASE_URL</code> va{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to'ldiring, keyin dev serverni qayta ishga
              tushiring.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
            <CloudUpload size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Supabase'ga sync
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              localStorage'dagi barcha yozuvlar Supabase'ga ko'chiriladi
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          title="Ulanishni tekshirish"
        >
          <RefreshCw size={12} className={clsx(testing && 'animate-spin')} />
          Test
        </button>
      </div>

      {/* Connection tests */}
      {connTests && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {connTests.tests?.map((t) => (
            <div
              key={t.key}
              className={clsx(
                'rounded-lg px-2.5 py-1.5 text-[11px] ring-1 ring-inset',
                t.ok
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
                  : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
              )}
            >
              <div className="flex items-center gap-1.5">
                {t.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                <span className="font-semibold uppercase tracking-wide">{t.key}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Steps list */}
      <ol className="mt-4 space-y-2">
        {allSteps.map((step, index) => {
          const s = statuses[step.key] || { status: 'idle' };
          const Icon = STATUS_ICON[s.status];
          return (
            <li
              key={step.key}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{step.label}</p>
                {s.message && (
                  <p className={clsx('text-[11px]', STATUS_STYLES[s.status])}>{s.message}</p>
                )}
              </div>
              {Icon && (
                <Icon
                  size={18}
                  className={clsx(STATUS_STYLES[s.status], s.status === 'progress' && 'animate-spin')}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Sync All button */}
      <button
        type="button"
        onClick={handleSyncAll}
        disabled={busy}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sync ketmoqda...
          </>
        ) : (
          <>
            <CloudUpload size={16} />
            Hammasini Supabase'ga sync qilish
          </>
        )}
      </button>

      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        Bu funksiya localStorage'dagi yozuvlarni Supabase'ga upsert qiladi. Bir xil id'li yozuvlar
        yangilanadi, yangilari qo'shiladi.
      </p>
    </div>
  );
}
