import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, MessageCircleMore, Plus, Search, UserRound, X } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import {
  createAssistantAiRequest,
  getAssistantAiRequests,
  getOtkSettings,
  replaceAssistantAiRequests,
  subscribeToOtkData,
  updateAssistantAiRequest,
} from '../services/localData';
import {
  fetchAssistantAiRequestsRemote,
  isSupabaseEnabled,
  seedAssistantAiRequestsRemote,
  testSupabaseConnection,
  upsertAssistantAiRequestRemote,
} from '../services/supabaseRest';

const STATUS_TONES = {
  "Qabul qildi": 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
  Jarayonda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  Yopildi: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
};

const INITIAL_FORM = {
  trackCode: '',
  customerId: '',
  phone: '',
  fullName: '',
  problemType: '',
  comment: '',
};

export default function AssistantAiPage() {
  const t = useT();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState(() => getAssistantAiRequests());
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [remoteState, setRemoteState] = useState(() => (isSupabaseEnabled ? 'checking' : 'local'));

  useEffect(() => {
    const sync = () => {
      setRequests(getAssistantAiRequests());
      setSettings(getOtkSettings());
    };

    return subscribeToOtkData(sync, { debounceMs: 70 });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateFromSupabase() {
      if (!isSupabaseEnabled) {
        setRemoteState('local');
        return;
      }

      const probe = await testSupabaseConnection();
      if (!probe.ok) {
        if (!cancelled) {
          setRemoteState('local');
        }
        return;
      }

      try {
        const remoteItems = await fetchAssistantAiRequestsRemote();
        if (cancelled) return;

        if (remoteItems.length) {
          replaceAssistantAiRequests(remoteItems);
        } else {
          await seedAssistantAiRequestsRemote(getAssistantAiRequests());
        }
        setRemoteState('connected');
      } catch {
        if (!cancelled) {
          setRemoteState('local');
        }
      }
    }

    hydrateFromSupabase();
    return () => {
      cancelled = true;
    };
  }, []);

  const problemTypes = useMemo(
    () => (settings.problemTypes || []).map((item) => item.name).filter(Boolean),
    [settings.problemTypes]
  );

  const stats = useMemo(() => ({
    total: requests.length,
    newCount: requests.filter((item) => item.status === "Qabul qildi").length,
    inProgress: requests.filter((item) => item.status === 'Jarayonda').length,
    closed: requests.filter((item) => item.status === 'Yopildi').length,
  }), [requests]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((item) => {
      const matchStatus = statusFilter === 'all' ? true : item.status === statusFilter;
      if (!matchStatus) return false;
      if (!query) return true;

      return [
        item.trackCode,
        item.customerId,
        item.phone,
        item.fullName,
        item.problemType,
        item.handledBy,
        item.comment,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [requests, search, statusFilter]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.trackCode.trim() || !form.phone.trim() || !form.fullName.trim() || !form.problemType.trim()) {
      toast.error(t('assistantAiRequired'));
      return;
    }

    const nextPayload = {
      ...form,
      source: 'telegram_bot',
      status: "Qabul qildi",
    };

    setCreateOpen(false);
    setForm({ ...INITIAL_FORM });
    const nextItem = createAssistantAiRequest(nextPayload, { actor: user });
    if (isSupabaseEnabled) {
      try {
        await upsertAssistantAiRequestRemote(nextItem);
        setRemoteState('connected');
      } catch {
        setRemoteState('local');
        toast.error(t('assistantAiSyncWarning'));
      }
    }
    toast.success(t('assistantAiCreated'));
  };

  const handleStatus = async (id, status) => {
    const current = requests.find((item) => item.id === id);
    const actorName = user?.full_name || user?.actorName || user?.username || '';
    const patch = { status };

    if (!current?.handledBy && actorName) {
      patch.handledBy = actorName;
    }

    const updated = updateAssistantAiRequest(id, patch, { actor: user });
    if (isSupabaseEnabled && updated) {
      try {
        await upsertAssistantAiRequestRemote(updated);
        setRemoteState('connected');
      } catch {
        setRemoteState('local');
        toast.error(t('assistantAiSyncWarning'));
      }
    }

    if (status === 'Yopildi') {
      toast.success(t('assistantAiClosedToast'));
      return;
    }

    toast.success(t('assistantAiMovedToProgress'));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
            <Bot size={14} />
            Assistent AI
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('assistantAiTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('assistantAiSubtitle')}</p>
          <div className={clsx(
            'mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1',
            remoteState === 'connected' || isSupabaseEnabled
              ? 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20'
              : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
          )}>
            <span className={clsx(
              'h-2 w-2 rounded-full',
              remoteState === 'connected' || isSupabaseEnabled
                ? 'animate-pulse bg-sky-500'
                : 'bg-amber-400',
            )} />
            {remoteState === 'connected'
              ? t('assistantAiSupabaseConnected')
              : isSupabaseEnabled
                ? 'Bulutli baza'
                : t('assistantAiSupabaseLocal')}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <Plus size={16} />
          {t('assistantAiNewRequest')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AssistantAiStatCard title={t('assistantAiTotal')} value={stats.total} tone="blue" />
        <AssistantAiStatCard title={t('assistantAiNew')} value={stats.newCount} tone="violet" />
        <AssistantAiStatCard title={t('assistantAiInProgress')} value={stats.inProgress} tone="amber" />
        <AssistantAiStatCard title={t('assistantAiClosed')} value={stats.closed} tone="emerald" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{t('assistantAiFlowTitle')}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('assistantAiFlowSubtitle')}</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('assistantAiSearchPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
              {[
                ['all', t('allStatuses')],
                ["Qabul qildi", t('assistantAiNew')],
                ['Jarayonda', t('assistantAiInProgress')],
                ['Yopildi', t('assistantAiClosed')],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    statusFilter === value
                      ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1120px] w-full text-sm">
            <thead className="border-y border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t('date')}</th>
                <th className="px-4 py-3">Trek</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">{t('phone')}</th>
                <th className="px-4 py-3">{t('customer')}</th>
                <th className="px-4 py-3">{t('problemType')}</th>
                <th className="px-4 py-3">{t('handledBy')}</th>
                <th className="px-4 py-3">{t('status')}</th>
                <th className="px-4 py-3">{t('comment')}</th>
                <th className="px-4 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-sm text-slate-400">
                    {t('assistantAiEmpty')}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.trackCode || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.customerId || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{item.fullName || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.problemType || '-'}</td>
                    <td className="px-4 py-3">
                      {item.handledBy ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                          <UserRound size={12} />
                          {item.handledBy}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', STATUS_TONES[item.status] || STATUS_TONES["Qabul qildi"])}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.comment || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {item.status !== 'Jarayonda' && item.status !== 'Yopildi' && (
                          <button
                            type="button"
                            onClick={() => handleStatus(item.id, 'Jarayonda')}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            {t('assistantAiMoveToProgress')}
                          </button>
                        )}
                        {item.status !== 'Yopildi' ? (
                          <button
                            type="button"
                            onClick={() => handleStatus(item.id, 'Yopildi')}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            {t('assistantAiCloseAction')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStatus(item.id, 'Jarayonda')}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                          >
                            {t('assistantAiReopenAction')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[460] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
                  <MessageCircleMore size={14} />
                  Assistent AI
                </div>
                <h2 className="mt-3 text-xl font-semibold text-slate-950 dark:text-white">{t('assistantAiModalTitle')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('assistantAiModalSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <LabeledInput label="Trek raqam" value={form.trackCode} onChange={(value) => updateForm('trackCode', value)} />
                <LabeledInput label="ID" value={form.customerId} onChange={(value) => updateForm('customerId', value)} />
                <LabeledInput label={t('phone')} value={form.phone} onChange={(value) => updateForm('phone', value)} />
                <LabeledInput label={t('customer')} value={form.fullName} onChange={(value) => updateForm('fullName', value)} />
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('problemType')}</label>
                  <select
                    value={form.problemType}
                    onChange={(event) => updateForm('problemType', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  >
                    <option value="">{t('selectProblemType')}</option>
                    {problemTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('comment')}</label>
                  <textarea
                    value={form.comment}
                    onChange={(event) => updateForm('comment', event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                    placeholder={t('assistantAiCommentPlaceholder')}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                {t('assistantAiBotNote')}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <CheckCircle2 size={16} />
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AssistantAiStatCard({ title, value, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
    violet: 'border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  };

  return (
    <div className={clsx('rounded-2xl border p-4 shadow-sm', tones[tone] || tones.blue)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
      />
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
