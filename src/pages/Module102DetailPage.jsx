// src/pages/Module102DetailPage.jsx
// 102 — OTK detail sahifasi: bir mijoz/murojaatning batafsil treklari va boshqarish

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Clock3,
  History,
  Loader2,
  Paperclip,
  Phone,
  Save,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import {
  getAuditLog,
  getModule102Entry,
  subscribeToModule102,
  updateTrackInComplaint,
} from '../services/module102Data';
import { useAuthStore } from '../store/authStore';

const STATUS_OPTIONS = [
  { value: 'qabul_qilindi', label: 'Qabul qilindi', tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
  { value: 'jarayonda', label: 'Jarayonda', tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  { value: 'yopildi', label: 'Yopildi', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  { value: 'finansga_yuborish', label: 'Finansga yuborish', tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
];

const RESPONSIBLE_DEPTS = [
  'BTS', 'EMU', 'FARGO', 'FILIALLAR', 'IPOST', "IT BO'LIMI", 'KURYERKA',
  'LOGISTIKA', "SOTUV BO'LIMI", 'STAREX', 'TOSHKENT', 'XITOY',
];

const REASON_OPTIONS = [
  { value: 'boshqa_mijoz_olgan', label: 'Boshqa mijoz olgan' },
  { value: 'singan', label: 'Singan' },
  { value: "yo'qolgan", label: "Yo'qolgan" },
];

function formatMoney(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat('uz-UZ').format(num);
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd.MM.yyyy HH:mm');
  } catch {
    return String(value);
  }
}

export default function Module102DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [entry, setEntry] = useState(() => getModule102Entry(id));
  const [drafts, setDrafts] = useState({}); // { trackId: { field: value } }
  const [saving, setSaving] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditFor, setAuditFor] = useState(null); // trackId yoki murojaat ID

  useEffect(() => {
    const sync = () => setEntry(getModule102Entry(id));
    return subscribeToModule102(sync);
  }, [id]);

  const tracks = entry?.tracks || [];

  const updateDraft = (trackId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [trackId]: { ...(prev[trackId] || {}), [field]: value },
    }));
  };

  const getValue = (track, field) => {
    const draft = drafts[track.id];
    if (draft && Object.prototype.hasOwnProperty.call(draft, field)) {
      return draft[field];
    }
    return track[field] ?? '';
  };

  const dirtyTrackIds = useMemo(() => Object.keys(drafts).filter((tid) => {
    const d = drafts[tid];
    return d && Object.keys(d).length > 0;
  }), [drafts]);

  const validateBeforeSave = () => {
    // Operator izohi majburiy — har dirty trekda
    for (const tid of dirtyTrackIds) {
      const track = tracks.find((t) => t.id === tid);
      const note = getValue(track || {}, 'operatorNote');
      if (!String(note || '').trim()) {
        return { ok: false, reason: 'operator_note_required', trackId: tid };
      }
      // Finansga yuborish — sabab va karta raqami majburiy
      const status = getValue(track || {}, 'status');
      if (status === 'finansga_yuborish') {
        if (!getValue(track, 'reason104')) {
          return { ok: false, reason: 'reason_required', trackId: tid };
        }
        if (!String(getValue(track, 'cardNumber') || '').trim()) {
          return { ok: false, reason: 'card_required', trackId: tid };
        }
      }
    }
    return { ok: true };
  };

  const handleSave = async () => {
    if (dirtyTrackIds.length === 0) {
      toast("O'zgarish yo'q");
      return;
    }
    const validation = validateBeforeSave();
    if (!validation.ok) {
      const msg = {
        operator_note_required: '✍️ Operator izohi majburiy',
        reason_required: 'Finansga yuborish uchun sabab majburiy',
        card_required: 'Finansga yuborish uchun karta raqami majburiy',
      }[validation.reason] || 'Saqlashda xato';
      toast.error(msg);
      return;
    }

    setSaving(true);
    try {
      for (const tid of dirtyTrackIds) {
        const updates = drafts[tid];
        const result = updateTrackInComplaint(entry.id, tid, updates, { actor: user });
        if (!result.ok) {
          toast.error(`Saqlashda xato: ${result.reason}`);
          setSaving(false);
          return;
        }
      }
      setDrafts({});
      setEntry(getModule102Entry(id));
      toast.success(`${dirtyTrackIds.length} ta trek saqlandi`);
    } catch (error) {
      console.error(error);
      toast.error('Saqlashda xato');
    } finally {
      setSaving(false);
    }
  };

  if (!entry) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">Murojaat topilmadi</p>
        <button
          onClick={() => navigate('/module-102')}
          className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          Ro'yxatga qaytish
        </button>
      </div>
    );
  }

  const openAudit = (trackId = null) => {
    setAuditFor(trackId);
    setAuditModalOpen(true);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => navigate('/module-102')}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          title="Orqaga"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
            <span className="font-mono">{entry.phone}</span>
            {entry.customer && <span className="ml-2 text-sm font-normal text-slate-500">· {entry.customer}</span>}
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {tracks.length} ta trek · OTK tekshiruvi
            {entry.createdAt && <> · {formatDateTime(entry.createdAt)}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAudit(null)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <History size={13} />
          Marshrut
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || dirtyTrackIds.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          SAQLASH {dirtyTrackIds.length > 0 && `(${dirtyTrackIds.length})`}
        </button>
      </div>

      {/* Tracks table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-[1800px] w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">#</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">ID</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Trek</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">💬 Mijoz izohi</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Urinish</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Tovar narxi</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Cargo narxi</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Jami</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Karta raqami</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Javobgar</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">🔴 Sabab</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">✍️ Operator izohi *</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">⏱</th>
                <th className="px-2.5 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">📎</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tracks.map((track, index) => {
                const status = getValue(track, 'status');
                const isClosed = status === 'yopildi';
                const goodsPrice = Number(getValue(track, 'goodsPrice')) || 0;
                const cargoPrice = Number(getValue(track, 'cargoPrice')) || 0;
                const total = goodsPrice + cargoPrice;
                const attempts = track.attempts || 0;
                const isDirty = !!drafts[track.id] && Object.keys(drafts[track.id]).length > 0;

                return (
                  <tr key={track.id} className={clsx('align-top transition', isDirty && 'bg-blue-50/50 dark:bg-blue-500/5', isClosed && 'opacity-60')}>
                    <td className="px-2.5 py-2 text-[10px] font-bold text-slate-400">{index + 1}</td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-slate-500">
                      <div className="truncate" title={track.id}>{track.id}</div>
                      {isClosed && <div className="mt-0.5 text-[9px] font-bold text-emerald-600">✓ 102 da yopildi</div>}
                    </td>
                    <td className="px-2.5 py-2 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1">
                        <Truck size={11} className="shrink-0 text-orange-500" />
                        <span className="truncate">{track.trackNumber || '—'}</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="max-w-[180px] line-clamp-2" title={track.customerNote}>{track.customerNote || '—'}</div>
                    </td>
                    <td className="px-2.5 py-2 text-[11px] font-bold">
                      <span className={clsx(attempts >= 3 ? 'text-rose-600' : attempts >= 2 ? 'text-amber-600' : 'text-slate-600')}>
                        {attempts}/3
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        disabled={isClosed}
                        value={getValue(track, 'goodsPrice')}
                        onChange={(e) => updateDraft(track.id, 'goodsPrice', e.target.value)}
                        className="w-24 rounded border border-slate-200 px-1.5 py-1 text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="number"
                        disabled={isClosed}
                        value={getValue(track, 'cargoPrice')}
                        onChange={(e) => updateDraft(track.id, 'cargoPrice', e.target.value)}
                        className="w-24 rounded border border-slate-200 px-1.5 py-1 text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2.5 py-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {formatMoney(total)}
                    </td>
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        disabled={isClosed}
                        value={getValue(track, 'cardNumber')}
                        onChange={(e) => updateDraft(track.id, 'cardNumber', e.target.value)}
                        className="w-36 rounded border border-slate-200 px-1.5 py-1 font-mono text-[10px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="8600 XXXX XXXX XXXX"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <select
                        disabled={isClosed}
                        value={getValue(track, 'responsible')}
                        onChange={(e) => updateDraft(track.id, 'responsible', e.target.value)}
                        className="w-28 rounded border border-slate-200 px-1.5 py-1 text-[10px] outline-none focus:border-blue-400 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">—</option>
                        {RESPONSIBLE_DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="px-2.5 py-2">
                      <select
                        disabled={isClosed}
                        value={getValue(track, 'reason104')}
                        onChange={(e) => updateDraft(track.id, 'reason104', e.target.value)}
                        className="w-32 rounded border border-slate-200 px-1.5 py-1 text-[10px] outline-none focus:border-blue-400 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">—</option>
                        {REASON_OPTIONS.map((r) => <option key={r.value} value={r.label}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2.5 py-2">
                      <textarea
                        disabled={isClosed}
                        value={getValue(track, 'operatorNote')}
                        onChange={(e) => updateDraft(track.id, 'operatorNote', e.target.value)}
                        rows={2}
                        className={clsx(
                          'w-52 resize-y rounded border px-1.5 py-1 text-[11px] outline-none focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-950 dark:text-white',
                          isDirty && !String(getValue(track, 'operatorNote') || '').trim()
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                            : 'border-slate-200 focus:border-blue-400 focus:ring-blue-200 dark:border-slate-700'
                        )}
                        placeholder="Operator izohi (majburiy)"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <select
                        disabled={isClosed}
                        value={status}
                        onChange={(e) => updateDraft(track.id, 'status', e.target.value)}
                        className={clsx(
                          'w-32 rounded border px-1.5 py-1 text-[10px] font-bold outline-none focus:border-blue-400 disabled:bg-slate-50',
                          STATUS_OPTIONS.find((s) => s.value === status)?.tone || 'bg-slate-100 text-slate-700'
                        )}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => openAudit(track.id)}
                        title="Marshrut"
                        className="rounded p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/15"
                      >
                        <Clock3 size={13} />
                      </button>
                    </td>
                    <td className="px-2.5 py-2">
                      <button
                        type="button"
                        title="Fayl biriktirish"
                        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      >
                        <Paperclip size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit log modal */}
      {auditModalOpen && (
        <AuditLogModal
          entryId={entry.id}
          trackId={auditFor}
          trackNumber={tracks.find((t) => t.id === auditFor)?.trackNumber}
          onClose={() => setAuditModalOpen(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Audit log (marshrut) modal
// ============================================================
function AuditLogModal({ entryId, trackId, trackNumber, onClose }) {
  const logs = useMemo(() => getAuditLog(entryId), [entryId]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Murojaat marshruti</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {entryId} {trackNumber && <>· <span className="font-mono font-bold">{trackNumber}</span></>}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {logs.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Marshrut yozuvi yo'q</p>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-blue-100 pl-5 dark:border-blue-500/20">
              {logs.map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[27px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900">
                    <Clock3 size={11} className="text-white" />
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(log.timestamp)} · <b>{log.module}</b>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {log.actorName} — {log.action === 'create' ? 'Yangi murojaat yaratdi' : 'Yangiladi'}
                  </div>
                  {(log.fromStatus || log.toStatus) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                      {log.fromStatus && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {log.fromStatus}
                        </span>
                      )}
                      {log.fromStatus && log.toStatus && <span className="text-slate-400">→</span>}
                      {log.toStatus && (
                        <span className={clsx('rounded px-1.5 py-0.5 font-bold', STATUS_OPTIONS.find((s) => s.value === log.toStatus)?.tone || 'bg-blue-100 text-blue-700')}>
                          {STATUS_OPTIONS.find((s) => s.value === log.toStatus)?.label || log.toStatus}
                        </span>
                      )}
                    </div>
                  )}
                  {log.note && (
                    <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-[11px] italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      "{log.note}"
                    </div>
                  )}
                  {log.attempts != null && log.attempts > 0 && (
                    <div className="mt-1 text-[10px] text-slate-500">
                      Urinish: <b>{log.attempts}</b>/3
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
