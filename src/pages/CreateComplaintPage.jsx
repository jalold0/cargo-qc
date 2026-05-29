import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Eye, ListChecks, Package, Phone, Plus, Save, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  STATUS_OPTIONS,
  addOtkEntries,
  findTrackConflicts,
  getOtkSettings,
  parseTrackNumbers,
} from '../services/localData';
import { getTrackInfo } from '../services/trackDatabase';
import TrackDetailModal from '../components/TrackDetailModal';
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

  // Trek soni cheklanmagan — katta hajmdagi ma'lumotlar bilan ishlash uchun
  const trackNumbers = useMemo(() => parseTrackNumbers(form.tracks), [form.tracks]);
  const trackConflicts = useMemo(() => findTrackConflicts(trackNumbers), [trackNumbers]);
  const trackPreviews = useMemo(
    () => trackNumbers.map((code) => getTrackInfo(code)).filter(Boolean),
    [trackNumbers]
  );
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [openTrackCode, setOpenTrackCode] = useState(null);

  useEffect(() => {
    if (selectedTrackIndex >= trackPreviews.length) {
      setSelectedTrackIndex(0);
    }
  }, [trackPreviews.length, selectedTrackIndex]);

  const activePreview = trackPreviews[selectedTrackIndex] || trackPreviews[0] || null;
  const activeTrackConflicts = trackConflicts.filter((item) => item.activeCount > 0);
  const archivedTrackConflicts = trackConflicts.filter((item) => !item.activeCount && item.archivedCount > 0);
  const problemTypeOptions = useMemo(
    () => settings.problemTypes.map((item) => ({ value: item.name, label: item.minutes ? `${item.name} • ${item.minutes} daqiqa` : item.name })),
    [settings.problemTypes]
  );
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
      toast.error('Saqlashda xatolik');
      return;
    }

    // Takror treklar endi bloklanmaydi — har biri o'z kiritganiga yoziladi
    const repeatedCount = result.repeated || 0;
    toast.success(
      repeatedCount > 0
        ? `${result.inserted} ta trek saqlandi (${repeatedCount} ta takror — sizning hisobingizga)`
        : `${result.inserted} ${t('readyTracks')}`
    );
    navigate('/complaints');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-3 animate-fade-in">
      <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          title="Orqaga"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
          <Plus size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">{t('createTitle')}</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('createSubtitle')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Trek raqamlari — to'liq enini egallaydi */}
        <div>
          <Section title={t('trackNumbers')} icon={ListChecks}>
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {t('enterTrackNumbers')}
                </span>
                <span
                  className={clsx(
                    'rounded-md px-2 py-0.5 text-[10px] font-bold',
                    trackNumbers.length > 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {trackNumbers.length} {t('readyTracks')}
                </span>
              </div>
              <textarea
                value={form.tracks}
                onChange={(event) => update('tracks', event.target.value)}
                rows={4}
                placeholder={"777381337851564\n9813658857643\n777381449004598"}
                style={{ minHeight: '110px', maxHeight: '260px' }}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-500/15"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Enter, probel, vergul yoki nuqtali vergul bilan ajratish mumkin. Cheklov yo'q.</span>
            </div>

            {activePreview && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                {/* Header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                      ● Bazadan
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      {trackPreviews.length === 1
                        ? "Trek bo'yicha avtomatik ma'lumotlar"
                        : `${trackPreviews.length} ta trekdan ${selectedTrackIndex + 1}-chisi`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenTrackCode(activePreview.trackCode)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800"
                  >
                    <Eye size={13} />
                    Batafsil
                  </button>
                </div>

                {/* Track selector chips — faqat 1 dan ortiq bo'lsa */}
                {trackPreviews.length > 1 && (() => {
                  const VISIBLE_CHIPS = 6;
                  // Tanlangan trek 6 ichida bo'lishi uchun window'ni hisoblash
                  const half = Math.floor(VISIBLE_CHIPS / 2);
                  let windowStart = Math.max(0, selectedTrackIndex - half);
                  let windowEnd = Math.min(trackPreviews.length, windowStart + VISIBLE_CHIPS);
                  windowStart = Math.max(0, windowEnd - VISIBLE_CHIPS);
                  const visibleChips = trackPreviews.slice(windowStart, windowEnd);
                  const remaining = trackPreviews.length - windowEnd;
                  const hiddenBefore = windowStart;
                  return (
                    <div className="mb-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTrackIndex((i) => Math.max(0, i - 1))}
                        disabled={selectedTrackIndex === 0}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <div className="flex flex-1 flex-wrap gap-1.5">
                        {hiddenBefore > 0 && (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400" title={`${hiddenBefore} ta oldingi trek`}>
                            …+{hiddenBefore}
                          </span>
                        )}
                        {visibleChips.map((preview, vIndex) => {
                          const index = windowStart + vIndex;
                          const isActive = index === selectedTrackIndex;
                          const toneStyles = {
                            emerald: 'bg-emerald-500',
                            sky: 'bg-sky-500',
                            amber: 'bg-amber-500',
                            red: 'bg-rose-500',
                          };
                          return (
                            <button
                              key={`${preview.trackCode}-${index}`}
                              type="button"
                              onClick={() => setSelectedTrackIndex(index)}
                              className={clsx(
                                'shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition',
                                isActive
                                  ? 'border-blue-500 bg-blue-600 text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                              )}
                              title={`${preview.customer} · ${preview.status}`}
                            >
                              <span
                                className={clsx(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  toneStyles[preview.statusTone] || 'bg-slate-400'
                                )}
                              />
                              <span className="opacity-70">#{index + 1}</span>
                              <span className="max-w-[110px] truncate">{preview.trackCode}</span>
                            </button>
                          );
                        })}
                        {remaining > 0 && (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400" title={`Yana ${remaining} ta trek — pastdagi jadvalda`}>
                            …+{remaining}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTrackIndex((i) => Math.min(trackPreviews.length - 1, i + 1))}
                        disabled={selectedTrackIndex >= trackPreviews.length - 1}
                        className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                })()}

                {/* Active track header */}
                {trackPreviews.length > 1 && (
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        #{selectedTrackIndex + 1}
                      </span>
                      <span className="truncate font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {activePreview.trackCode}
                      </span>
                    </div>
                  </div>
                )}

                {/* Preview grid */}
                <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <PreviewItem icon={UserRound} label="Mijoz" value={activePreview.customer} />
                  <PreviewItem icon={Phone} label="Telefon" value={activePreview.phone} />
                  <PreviewItem icon={Package} label="Vazn" value={`${activePreview.weight.toFixed(2)} kg`} />
                  <PreviewItem label="Yo'nalish" value={`${activePreview.route.from} → ${activePreview.route.to}`} />
                  <PreviewItem label="Xizmat" value={activePreview.service} />
                  <PreviewItem label="Holat" value={activePreview.status} tone={activePreview.statusTone} />
                </div>

                {/* All tracks summary footer — agar 2 dan ortiq bo'lsa */}
                {trackPreviews.length > 1 && (
                  <details className="mt-3 group">
                    <summary className="cursor-pointer list-none text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">
                      <span className="group-open:hidden">▸ Barcha trekni jadval ko'rinishida ko'rish</span>
                      <span className="hidden group-open:inline">▾ Yashirish</span>
                    </summary>
                    <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2 font-semibold">#</th>
                            <th className="px-3 py-2 font-semibold">Trek</th>
                            <th className="px-3 py-2 font-semibold">Mijoz</th>
                            <th className="px-3 py-2 font-semibold">Telefon</th>
                            <th className="px-3 py-2 font-semibold">Vazn</th>
                            <th className="px-3 py-2 font-semibold">Holat</th>
                            <th className="px-3 py-2 font-semibold"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {trackPreviews.map((row, index) => {
                            const isActive = index === selectedTrackIndex;
                            const toneStyles = {
                              emerald: 'text-emerald-600 dark:text-emerald-400',
                              sky: 'text-sky-600 dark:text-sky-300',
                              amber: 'text-amber-700 dark:text-amber-400',
                              red: 'text-rose-600 dark:text-rose-400',
                            };
                            return (
                              <tr
                                key={`${row.trackCode}-row-${index}`}
                                onClick={() => setSelectedTrackIndex(index)}
                                className={clsx(
                                  'cursor-pointer transition',
                                  isActive
                                    ? 'bg-blue-50 dark:bg-blue-500/10'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                )}
                              >
                                <td className="px-3 py-2 font-bold text-slate-500">{index + 1}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-white">{row.trackCode}</td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.customer}</td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.phone}</td>
                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.weight.toFixed(2)} kg</td>
                                <td className={clsx('px-3 py-2 font-semibold', toneStyles[row.statusTone] || 'text-slate-700')}>
                                  {row.status}
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenTrackCode(row.trackCode);
                                    }}
                                    className="rounded-md p-1 text-slate-400 transition hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-500/20 dark:hover:text-blue-300"
                                    title="Batafsil"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )}

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
        </div>

        {/* Muammo ma'lumoti + Saqlash xulosasi — yonma-yon */}
        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
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

          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <Save size={14} />
                </div>
                <h2 className="text-sm font-bold text-slate-950 dark:text-white">{t('saveSummary')}</h2>
              </div>
              <dl className="space-y-2 text-sm">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Save size={17} />
              {t('save')}
            </button>
          </aside>
        </div>
      </form>

      <TrackDetailModal
        trackCode={openTrackCode}
        open={Boolean(openTrackCode)}
        onClose={() => setOpenTrackCode(null)}
      />
    </div>
  );
}

function PreviewItem({ icon: Icon, label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'text-slate-900 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    sky: 'text-sky-600 dark:text-sky-300',
    amber: 'text-amber-700 dark:text-amber-400',
    red: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className={clsx('truncate text-sm font-semibold', toneClasses[tone] || toneClasses.default)}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          <Icon size={14} />
        </div>
        <h2 className="text-sm font-bold text-slate-950 dark:text-white">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
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
