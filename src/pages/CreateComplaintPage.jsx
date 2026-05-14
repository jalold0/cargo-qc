import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ListChecks, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  STATUS_OPTIONS,
  addOtkEntries,
  findTrackConflicts,
  getOtkSettings,
  parseTrackNumbers,
} from '../services/localData';
import { useAuthStore } from '../store/authStore';
import { useT, useValueLabel } from '../i18n';

const PRIORITIES = [
  { value: 'Yuqori', label: 'Yuqori' },
  { value: "O'rta", label: "O'rta" },
  { value: 'Past', label: 'Past' },
];

export default function CreateComplaintPage() {
  const t = useT();
  const valueLabel = useValueLabel();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [settings] = useState(() => getOtkSettings());
  const [form, setForm] = useState({
    tracks: '',
    problemType: '',
    department: '',
    requestSource: '',
    status: '',
    comment: '',
    priority: '',
  });

  const trackNumbers = useMemo(() => parseTrackNumbers(form.tracks).slice(0, 100), [form.tracks]);
  const overLimit = parseTrackNumbers(form.tracks).length > 100;
  const trackConflicts = useMemo(() => findTrackConflicts(trackNumbers), [trackNumbers]);
  const activeTrackConflicts = trackConflicts.filter((item) => item.activeCount > 0);
  const archivedTrackConflicts = trackConflicts.filter((item) => !item.activeCount && item.archivedCount > 0);
  const problemTypeOptions = useMemo(() => settings.problemTypes.map((item) => ({ value: item, label: item })), [settings.problemTypes]);
  const departmentOptions = useMemo(() => settings.departments.map((item) => ({ value: item, label: item })), [settings.departments]);
  const sourceOptions = useMemo(() => settings.requestSources.map((item) => ({ value: item, label: item })), [settings.requestSources]);
  const statusOptions = useMemo(() => STATUS_OPTIONS.map((item) => ({ value: item, label: valueLabel(item) })), [valueLabel]);
  const priorityOptions = useMemo(() => PRIORITIES.map((item) => ({ value: item.value, label: valueLabel(item.value) })), [valueLabel]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!trackNumbers.length) {
      toast.error(t('enterTrackNumbers'));
      return;
    }

    if (!form.problemType || !form.department || !form.requestSource || !form.status || !form.priority) {
      toast.error(`${t('problemType')}, ${t('department')}, ${t('source')}, ${t('status')} va ${t('priority')} majburiy.`);
      return;
    }

    const now = new Date().toISOString();
    const entries = trackNumbers.map((trackCode, index) => ({
      id: `${Date.now()}-${index}`,
      date: now,
      trackCode,
      problemType: form.problemType,
      department: form.department,
      requestSource: form.requestSource,
      status: form.status,
      comment: form.comment.trim(),
      priority: form.priority,
      handledBy: user?.full_name || user?.username || 'OTK workplace',
      handledById: user?.id || null,
      handledByRole: user?.role || '',
      createdBy: user?.full_name || user?.username || 'OTK workplace',
      createdById: user?.id || null,
      createdByRole: user?.role || '',
    }));

    const result = addOtkEntries(entries, { actor: user });
    if (!result.inserted) {
      toast.error(t('duplicateTrackBlocked'));
      return;
    }

    toast.success(
      `${result.inserted} ${t('readyTracks')}${result.skippedDuplicates ? `. ${result.skippedDuplicates} ${t('duplicateSkipped')}` : ''}`
    );
    navigate('/complaints');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('createTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('createSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Section title={t('trackNumbers')} icon={ListChecks}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {t('enterTrackNumbers')}
              </span>
              <textarea
                value={form.tracks}
                onChange={(event) => update('tracks', event.target.value)}
                rows={12}
                placeholder={"777381337851564\n9813658857643\n777381449004598"}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={clsx(
                  'rounded-full px-3 py-1 font-medium',
                  overLimit
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                )}
              >
                {trackNumbers.length} {t('readyTracks')}
              </span>
              {overLimit && <span className="text-rose-500">Faqat birinchi 100 tasi saqlanadi.</span>}
              <span className="text-slate-500 dark:text-slate-400">
                Enter, probel, vergul yoki nuqtali vergul bilan ajratish mumkin.
              </span>
            </div>

            {!!(activeTrackConflicts.length || archivedTrackConflicts.length) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-500/20 dark:bg-amber-500/10">
                <p className="font-semibold text-amber-800 dark:text-amber-300">{t('duplicateTrackWarning')}</p>
                {activeTrackConflicts.length > 0 && (
                  <p className="mt-1 text-amber-700/90 dark:text-amber-200">
                    {t('duplicateTrackActiveHint')}: {activeTrackConflicts.slice(0, 6).map((item) => item.trackCode).join(', ')}
                    {activeTrackConflicts.length > 6 ? '...' : ''}
                  </p>
                )}
                {archivedTrackConflicts.length > 0 && (
                  <p className="mt-1 text-amber-700/90 dark:text-amber-200">
                    {t('duplicateTrackArchiveHint')}: {archivedTrackConflicts.slice(0, 6).map((item) => item.trackCode).join(', ')}
                    {archivedTrackConflicts.length > 6 ? '...' : ''}
                  </p>
                )}
              </div>
            )}
          </Section>

          <Section title={t('problemInfo')} icon={CheckCircle2}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('problemType')}>
                <PremiumSelect
                  value={form.problemType}
                  onChange={(value) => update('problemType', value)}
                  placeholder={t('selectProblemType')}
                  options={problemTypeOptions}
                />
              </Field>

              <Field label={t('department')}>
                <PremiumSelect
                  value={form.department}
                  onChange={(value) => update('department', value)}
                  placeholder={t('selectDepartment')}
                  options={departmentOptions}
                />
              </Field>

              <Field label={t('requestSource')}>
                <PremiumSelect
                  value={form.requestSource}
                  onChange={(value) => update('requestSource', value)}
                  placeholder={t('selectRequestSource')}
                  options={sourceOptions}
                />
              </Field>

              <Field label={t('status')}>
                <PremiumSelect
                  value={form.status}
                  onChange={(value) => update('status', value)}
                  placeholder={t('selectStatus')}
                  options={statusOptions}
                />
              </Field>

              <Field label={t('priority')}>
                <PremiumSelect
                  value={form.priority}
                  onChange={(value) => update('priority', value)}
                  placeholder={t('selectPriority')}
                  options={priorityOptions}
                />
              </Field>
            </div>

            <Field label={t('comment')}>
              <textarea
                value={form.comment}
                onChange={(event) => update('comment', event.target.value)}
                rows={4}
                placeholder="Masalan: mijoz tovarlari mijozdan uzilib qolgan..."
                className={clsx(inputClass(), 'resize-y')}
              />
            </Field>
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('saveSummary')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <SummaryRow label={t('trackNumbers')} value={`${trackNumbers.length} ta`} />
              <SummaryRow label={t('problem')} value={form.problemType || '-'} />
              <SummaryRow label={t('department')} value={form.department || '-'} />
              <SummaryRow label={t('source')} value={form.requestSource || '-'} />
              <SummaryRow label={t('status')} value={valueLabel(form.status) || '-'} />
              <SummaryRow label={t('priority')} value={valueLabel(form.priority) || '-'} />
            </dl>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Save size={17} />
            {t('save')}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon size={17} />
        </div>
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
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
      <dd className="max-w-[170px] text-right font-medium text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

function inputClass() {
  return 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800';
}

function PremiumSelect({ value, onChange, options, placeholder }) {
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
        className={clsx(
          'flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm outline-none transition hover:border-slate-300 hover:shadow-md focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 dark:focus:ring-slate-800',
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
