import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  findTrackConflicts,
  STATUS_OPTIONS,
  getOtkEntryById,
  getOtkSettings,
  getPriorityByWaitingDays,
  getWaitingDays,
  updateOtkEntry,
} from '../services/localData';
import { isAdminRole } from '../services/access';
import { useAuthStore } from '../store/authStore';
import { useT, useValueLabel } from '../i18n';

export default function ComplaintDetailPage() {
  const t = useT();
  const valueLabel = useValueLabel();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [settings] = useState(() => getOtkSettings());
  const [entry] = useState(() => getOtkEntryById(id));
  const isArchivedEntry = entry?.status === 'Yopildi';
  const canEditEntry = !isArchivedEntry || isAdminRole(user?.role);
  const [form, setForm] = useState(() => ({
    trackCode: entry?.trackCode || '',
    date: entry?.date ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    problemType: entry?.problemType || settings.problemTypes[0]?.name || '',
    department: entry?.department || settings.departments[0] || '',
    requestSource: entry?.requestSource || settings.requestSources[0] || '',
    status: entry?.status || 'Jarayonda',
    priority: entry?.priority || 'Past',
    comment: entry?.comment || '',
    handledBy: entry?.handledBy || 'OTK workplace',
  }));

  const autoPriority = useMemo(() => {
    if (form.status === 'Yopildi') return form.priority;
    return getPriorityByWaitingDays(getWaitingDays(form.date));
  }, [form.date, form.priority, form.status]);
  const trackConflicts = useMemo(() => findTrackConflicts([form.trackCode], { excludeId: id }), [form.trackCode, id]);
  const activeTrackConflicts = trackConflicts.filter((item) => item.activeCount > 0);
  const problemTypeOptions = useMemo(
    () => settings.problemTypes.map((item) => ({ value: item.name, label: item.minutes ? `${item.name} • ${item.minutes} daqiqa` : item.name })),
    [settings.problemTypes]
  );
  const departmentOptions = useMemo(() => settings.departments.map((item) => ({ value: item, label: item })), [settings.departments]);
  const sourceOptions = useMemo(() => settings.requestSources.map((item) => ({ value: item, label: item })), [settings.requestSources]);
  const statusOptions = useMemo(() => STATUS_OPTIONS.map((item) => ({ value: item, label: valueLabel(item) })), [valueLabel]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canEditEntry) {
      toast.error("Arxivdagi trekni faqat admin o'zgartira oladi.");
      return;
    }

    if (!form.trackCode.trim()) {
      toast.error(`${t('track')} majburiy.`);
      return;
    }

    if (!form.problemType || !form.department || !form.requestSource || !form.status) {
      toast.error(`${t('problem')}, ${t('department')}, ${t('source')} va ${t('status')} majburiy.`);
      return;
    }

    const saved = updateOtkEntry(id, {
      trackCode: form.trackCode.trim(),
      date: new Date(form.date).toISOString(),
      problemType: form.problemType,
      department: form.department,
      requestSource: form.requestSource,
      status: form.status,
      priority: autoPriority,
      comment: form.comment.trim(),
      handledBy: form.handledBy.trim() || 'OTK workplace',
      lastUpdatedBy: user?.full_name || user?.username || 'OTK workplace',
      lastUpdatedById: user?.id || null,
      lastUpdatedByRole: user?.role || '',
    }, { actor: user });

    if (!saved?.ok && saved?.reason === 'duplicate_track') {
      toast.error(t('duplicateTrackBlocked'));
      return;
    }

    if (!saved?.ok) {
      toast.error(t('notFound'));
      return;
    }

    toast.success(t('save'));
    navigate('/complaints');
  };

  if (!entry) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('notFound')}</p>
        <button
          onClick={() => navigate('/complaints')}
          className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          {t('backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('editTrack')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {canEditEntry ? `${t('activeTracksSubtitle')}.` : "Arxivdagi trek ma'lumoti faqat admin tomonidan tahrirlanadi."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('track')}>
              <input value={form.trackCode} onChange={(event) => update('trackCode', event.target.value)} disabled={!canEditEntry} className={inputClass(!canEditEntry)} />
            </Field>

            <Field label={t('date')}>
              <input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} disabled={!canEditEntry} className={inputClass(!canEditEntry)} />
            </Field>

            <Field label={t('problem')}>
              <PremiumSelect
                value={form.problemType}
                onChange={(value) => update('problemType', value)}
                placeholder={t('selectProblemType')}
                options={problemTypeOptions}
                disabled={!canEditEntry}
              />
            </Field>

            <Field label={t('department')}>
              <PremiumSelect
                value={form.department}
                onChange={(value) => update('department', value)}
                placeholder={t('selectDepartment')}
                options={departmentOptions}
                disabled={!canEditEntry}
              />
            </Field>

            <Field label={t('source')}>
              <PremiumSelect
                value={form.requestSource}
                onChange={(value) => update('requestSource', value)}
                placeholder={t('selectRequestSource')}
                options={sourceOptions}
                disabled={!canEditEntry}
              />
            </Field>

            <Field label={t('status')}>
              <PremiumSelect
                value={form.status}
                onChange={(value) => update('status', value)}
                placeholder={t('selectStatus')}
                options={statusOptions}
                disabled={!canEditEntry}
              />
            </Field>

            <Field label={t('takenBy')}>
              <input value={form.handledBy} onChange={(event) => update('handledBy', event.target.value)} disabled={!canEditEntry} className={inputClass(!canEditEntry)} />
            </Field>

            <Field label={t('priority')}>
              <input value={valueLabel(autoPriority)} readOnly className={`${inputClass(true)} cursor-not-allowed bg-slate-50 dark:bg-slate-800`} />
            </Field>
          </div>

          {activeTrackConflicts.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="font-semibold">{t('duplicateTrackWarning')}</p>
              <p className="mt-1">{t('duplicateTrackActiveHint')}: {activeTrackConflicts.map((item) => item.trackCode).join(', ')}</p>
            </div>
          )}

          <Field label={t('comment')}>
            <textarea
              value={form.comment}
              onChange={(event) => update('comment', event.target.value)}
              rows={5}
              disabled={!canEditEntry}
              className={`${inputClass(!canEditEntry)} resize-y`}
            />
          </Field>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('notifications')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label={t('inProgress')} value={`${getWaitingDays(form.date)} kun`} />
              <SummaryRow label={t('priority')} value={valueLabel(autoPriority)} />
              <SummaryRow label={t('status')} value={valueLabel(form.status)} />
            </dl>
          </div>

          {canEditEntry ? (
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Save size={17} />
              {t('save')}
            </button>
          ) : null}
        </aside>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="max-w-[160px] text-right font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function inputClass(disabled = false) {
  return clsx(
    'mt-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition dark:border-slate-700 dark:bg-slate-950 dark:text-white',
    disabled
      ? 'cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
      : 'focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:focus:ring-slate-800'
  );
}

function PremiumSelect({ value, onChange, options, placeholder, disabled = false }) {
  const pickerId = useId();
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const closePicker = (event) => {
      if (event.detail?.source !== pickerId) {
        setOpen(false);
      }
    };

    window.addEventListener('qc-close-popovers', closePicker);
    return () => window.removeEventListener('qc-close-popovers', closePicker);
  }, [pickerId]);

  const toggleOpen = () => {
    if (disabled) return;
    window.dispatchEvent(new CustomEvent('qc-close-popovers', { detail: { source: pickerId } }));
    setOpen((current) => !current);
  };

  const selectOption = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={clsx(
          'flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm outline-none transition dark:border-slate-700 dark:bg-slate-950',
          disabled
            ? 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500'
            : 'hover:border-slate-300 hover:shadow-md focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:hover:border-slate-600 dark:focus:ring-slate-800',
          open && 'border-slate-400 ring-4 ring-slate-200/70 dark:border-slate-500 dark:ring-slate-800',
          selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
        )}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <span className={clsx('shrink-0 text-slate-400 transition', open && 'rotate-180')}>
          <ChevronDown size={18} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[240] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40">
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option.value)}
                  className={clsx(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                    selected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <span className={clsx('shrink-0', selected ? 'opacity-100' : 'opacity-0')}>
                    <Check size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
