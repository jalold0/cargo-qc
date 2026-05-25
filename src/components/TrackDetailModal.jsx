// src/components/TrackDetailModal.jsx
// 2 ustunli trek detali modali.
// Chap: bazadagi ma'lumotlar + logistika tarixi.
// O'ng: murojaat holati + mijoz kartochkasi (tab).

import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import {
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  MapPin,
  PackageCheck,
  Phone,
  Send,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { getCustomerProfile, lookupTrack } from '../services/trackDatabase';
import CustomerCard from './CustomerCard';

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return iso;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm');
  } catch {
    return iso;
  }
}

export default function TrackDetailModal({
  trackCode,
  open,
  onClose,
  recoveryInfo = null,
  onTakeOwnership = null,
  // eslint-disable-next-line no-unused-vars
  onCommentSave = null, // legacy — endi modal'da izoh yozish yo'q
}) {
  const [tab, setTab] = useState('murojaat'); // murojaat | mijoz
  const [logTab, setLogTab] = useState('logistika'); // logistika | yetkazib

  const data = useMemo(() => (trackCode ? lookupTrack(trackCode) : null), [trackCode]);
  const profile = useMemo(() => (data ? getCustomerProfile(data) : null), [data]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  const firstComplaint = data.complaints?.[0] || null;
  const hasComplaint = Boolean(firstComplaint);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-detail-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 id="track-detail-title" className="text-base font-semibold text-slate-900 dark:text-white">
            Trek raqami: <span className="font-mono">{data.trackCode}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Modalni yopish"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — 2 columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
            {/* ============ LEFT COLUMN ============ */}
            <div className="space-y-4">
              {/* Asosiy ma'lumotlar */}
              <Card title="Asosiy ma'lumotlar" badge={{ label: 'Bazadan', tone: 'emerald' }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Item label="Trek raqami" value={data.trackCode} tone="blue" />
                  <Item label="Yaratilgan sana" value={formatDateTime(data.createdAt)} />
                  <Item label="Qabul qiluvchi" value={data.customer} />
                  <Item label="Telefon" value={data.phone} icon={Phone} />
                  <Item label="Mijoz kodi" value={data.customerCode} tone="blue" />
                  <Item label="Qimmatbaho izoh" value={data.valuableNote} />
                  <Item label="Xizmat" value={data.service} tone="orange" />
                  <Item label="Qadoqlash" value={data.packaging} tone="blue" />
                  <Item label="Manzil" value={data.address} icon={MapPin} colSpan={2} />
                  <Item label="Buyurtma raqami" value={data.orderNumber} />
                  <Item label="To'lov raqami" value={data.paymentRef || '—'} />
                </div>
              </Card>

              {/* Xarajat ma'lumotlari */}
              <Card title="Xarajat ma'lumotlari">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Item label="Og'irlik (kg)" value={data.weight.toFixed(2)} />
                  <Item label="Yuk haqi ($)" value={data.cargoPrice.toFixed(2)} />
                  <Item label="Qo'shimcha ($)" value={data.extraPrice ? data.extraPrice.toFixed(2) : 'Hech narsa'} />
                  <Item
                    label="To'lov holati"
                    value={
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 text-sm font-semibold',
                          data.paymentStatus === "To'langan"
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        <span className={clsx(
                          'h-1.5 w-1.5 rounded-full',
                          data.paymentStatus === "To'langan" ? 'bg-emerald-500' : 'bg-amber-500'
                        )} />
                        {data.paymentStatus}
                      </span>
                    }
                  />
                  <Item
                    label="To'lov miqdori"
                    value={
                      <span>
                        {data.paymentAmount.toFixed(2)}{' '}
                        <span className="text-xs text-slate-400">(1)</span>
                      </span>
                    }
                  />
                  <Item label="To'lov vaqti" value={formatDateTime(data.paymentDate)} />
                </div>
              </Card>

              {/* Kuzatuv tarixi */}
              <Card title="Kuzatuv haqida ma'lumotlar">
                <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <TabBtn active={logTab === 'logistika'} onClick={() => setLogTab('logistika')}>
                    Logistika kuzatuvi
                  </TabBtn>
                  <TabBtn active={logTab === 'yetkazib'} onClick={() => setLogTab('yetkazib')}>
                    Yetkazib berish tarixi
                  </TabBtn>
                </div>

                <Timeline events={logTab === 'logistika' ? data.events : data.events.slice(-3)} />
              </Card>
            </div>

            {/* ============ RIGHT COLUMN ============ */}
            <div className="space-y-3">
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <TabBtn active={tab === 'murojaat'} onClick={() => setTab('murojaat')}>
                  Murojaat
                </TabBtn>
                <TabBtn active={tab === 'mijoz'} onClick={() => setTab('mijoz')}>
                  Mijoz kartochkasi
                </TabBtn>
              </div>

              {tab === 'murojaat' ? (
                <ComplaintPanel complaint={firstComplaint} hasComplaint={hasComplaint} />
              ) : (
                <CustomerCard profile={profile} />
              )}

              {/* 104 Moliya topilgan yuk holati — faqat berilgan bo'lsa */}
              {recoveryInfo && (
                <RecoveryPanel
                  info={recoveryInfo}
                  onTakeOwnership={onTakeOwnership}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Chiqish
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Murojaat paneli (o'ng ustun)
// ============================================================
function ComplaintPanel({ complaint, hasComplaint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Murojaat holati</h3>
        {hasComplaint ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
            ● Murojaat
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Murojaat yo'q
          </span>
        )}
      </div>

      {/* Status timeline */}
      <div className="space-y-2.5">
        <StatusStep
          label="Qabul qilindi"
          done
          current={complaint?.status === 'Jarayonda' && !hasComplaint}
        />
        <StatusStep
          label="Jarayonda"
          done={!!complaint && complaint.status !== "Qabul qildi"}
          current={complaint?.status === 'Jarayonda'}
        />
        <StatusStep
          label="Yopildi"
          done={complaint?.status === 'Yopildi'}
          current={complaint?.status === 'Yopildi'}
          subLabel={complaint?.status === 'Yopildi' ? 'Joriy holat' : null}
          timeLabel={complaint?.status === 'Yopildi' ? 'Hozir' : null}
        />
      </div>

      {hasComplaint ? (
        <>
          <div className="my-4 h-px bg-slate-100 dark:bg-slate-800" />
          <div className="space-y-3">
            <Item label="Muammo turi" value={complaint.problemType || '—'} icon={Tag} />
            <Item label="Mas'ul bo'lim" value={complaint.department || '—'} icon={Building2} />
            <Item label="Manba" value={complaint.requestSource || '—'} icon={Send} dotTone="blue" />
            <Item label="Daraja" value={complaint.priority || 'Past'} tone="slate" />
            {complaint.comment && (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <ClipboardList size={13} />
                  Izoh
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {complaint.comment}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <MetaLine label="Kim oldi" value={complaint.handledBy || '—'} />
            <MetaLine label="Ochilgan" value={formatDate(complaint.date)} />
            <MetaLine
              label="Yopilgan"
              value={complaint.status === 'Yopildi' ? formatDate(complaint.updatedAt || complaint.date) : '—'}
              valueClass="text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
          <UserRound className="mx-auto mb-2 opacity-50" size={28} />
          Bu trek bo'yicha murojaat yo'q.
        </div>
      )}
    </div>
  );
}

function StatusStep({ label, done, current, subLabel, timeLabel }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <CheckCircle2
          size={20}
          className={clsx(
            done
              ? 'fill-emerald-500 text-white'
              : current
                ? 'text-emerald-500'
                : 'text-slate-300 dark:text-slate-600'
          )}
        />
        <div>
          <div className={clsx(
            'text-sm font-semibold',
            done || current ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
          )}>
            {label}
          </div>
          {subLabel && <div className="text-[10px] text-slate-400">{subLabel}</div>}
        </div>
      </div>
      {timeLabel && (
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{timeLabel}</span>
      )}
    </div>
  );
}

// ============================================================
// 104 Moliya — Topilgan yuk holati paneli
// ============================================================
function RecoveryPanel({ info, onTakeOwnership }) {
  if (!info) return null;
  const status = info.foundResolutionStatus || 'Qabul qilindi';
  const outcome = info.foundCaseOutcome || '';
  const isClosed = status === 'Yopildi';
  const isInProgress = status === 'Jarayonda';
  const isAccepted = status === 'Qabul qilindi';
  const isReturned = outcome === 'Mijoz pulni qaytardi';
  const isConfiscated = outcome === 'Musodara';
  const formatMoney = (value) => {
    if (!value && value !== 0) return '—';
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return new Intl.NumberFormat('uz-UZ').format(num) + ' UZS';
  };

  const statusBadge = isClosed
    ? { text: '● Yopildi', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/40' }
    : isInProgress
      ? { text: '● Jarayonda', cls: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/40' }
      : { text: '● Qabul qilindi', cls: 'bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:ring-sky-500/40' };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-sky-50/60 p-4 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-sky-500/10">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
            <PackageCheck size={15} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Topilgan yuk holati</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">104 — Moliya · qaytarish jarayoni</p>
          </div>
        </div>
        <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ring-1', statusBadge.cls)}>
          {statusBadge.text}
        </span>
      </div>

      {/* Asosiy ma'lumotlar grid */}
      <div className="grid gap-2.5 text-xs sm:grid-cols-2">
        <RecoveryItem
          icon={Banknote}
          label="Natija"
          value={
            outcome ? (
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                  isReturned
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : isConfiscated
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                )}
              >
                {outcome}
              </span>
            ) : (
              <span className="text-slate-400">Tanlanmagan</span>
            )
          }
        />
        <RecoveryItem
          icon={CalendarClock}
          label="Topilgan sana"
          value={info.foundDate ? formatDateTime(info.foundDate) : '—'}
        />
        <RecoveryItem
          label="Kun (recovered)"
          value={
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700/60 dark:text-slate-200">
              {info.recoveredDays ?? 0} kun
            </span>
          }
        />
        <RecoveryItem
          icon={Banknote}
          label="To'lov summasi"
          value={
            <span className="font-bold text-emerald-700 dark:text-emerald-300">
              {formatMoney(info.paymentAmount)}
            </span>
          }
        />
        <RecoveryItem icon={Building2} label="Bo'lim" value={info.department || '—'} />
        <RecoveryItem icon={Send} label="Manba" value={info.requestSource || '—'} />
        <RecoveryItem
          icon={UserRound}
          label="Kim oldi"
          value={
            info.assignedTo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                👤 {info.assignedTo}
                {info.assignedAt && (
                  <span className="text-[9px] font-medium opacity-70">· {formatDate(info.assignedAt)}</span>
                )}
              </span>
            ) : onTakeOwnership ? (
              <button
                type="button"
                onClick={() => onTakeOwnership(info.trackCode)}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <UserRound size={11} />
                Olish (men ishlayman)
              </button>
            ) : (
              <span className="italic text-slate-400">Hodim biriktirilmagan</span>
            )
          }
          colSpan={2}
        />
        {info.foundComment && (
          <div className="sm:col-span-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <ClipboardList size={11} /> Topilgan yuk izohi
            </div>
            <div className="rounded-lg bg-white/70 p-2 text-[11px] text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              {info.foundComment}
            </div>
          </div>
        )}
      </div>

      {/* Hodim izohi — faqat o'qish (yozish jadval ichida) */}
      <div className="mt-3 border-t border-emerald-200 pt-3 dark:border-emerald-500/30">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <ClipboardList size={11} /> Hodim izohi
        </div>
        {info.workflowComment ? (
          <div className="rounded-lg bg-white/70 p-2 text-[11px] leading-relaxed text-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
            {info.workflowComment}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 px-2 py-1.5 text-[11px] italic text-slate-400 dark:border-slate-700">
            Izoh yo'q
          </div>
        )}
      </div>

      {/* Chek (faqat "Mijoz pulni qaytardi" bo'lsa) */}
      {isReturned && (
        <div className="mt-3 border-t border-emerald-200 pt-3 dark:border-emerald-500/30">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <FileCheck2 size={11} /> Chek (to'lov qabul qilingani)
          </div>
          {info.receiptFile ? (
            <a
              href={info.receiptFile.dataUrl}
              download={info.receiptFile.name}
              className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
            >
              <FileCheck2 size={14} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{info.receiptFile.name}</span>
              {info.receiptFile.size > 0 && (
                <span className="shrink-0 text-[10px] opacity-70">
                  {Math.round(info.receiptFile.size / 1024)} KB
                </span>
              )}
            </a>
          ) : (
            <div className="rounded-lg border border-dashed border-rose-300 bg-rose-50/50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              ⚠ Chek hali yuklanmagan
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecoveryItem({ icon: Icon, label, value, colSpan }) {
  return (
    <div className={clsx(colSpan === 2 && 'sm:col-span-2')}>
      <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={11} />}
        {label}
      </div>
      <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

// ============================================================
// Logistika timeline
// ============================================================
function Timeline({ events }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-emerald-100 pl-5 dark:border-emerald-500/20">
      {events.map((event, index) => (
        <li key={index} className="relative">
          <span className="absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900">
            <CheckCircle2 size={12} className="text-white" />
          </span>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</div>
          {event.description && (
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.description}</div>
          )}
          {event.actor && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <UserRound size={12} /> Kim tomonidan: <span className="text-blue-600 dark:text-blue-300">{event.actor}</span>
            </div>
          )}
          <div className="mt-0.5 text-xs text-slate-400">{formatDateTime(event.at)}</div>
        </li>
      ))}
    </ol>
  );
}

// ============================================================
// Yordamchi komponentlar
// ============================================================
function Card({ title, badge, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {badge && (
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
              badge.tone === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30'
                : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
            )}
          >
            ● {badge.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Item({ label, value, icon: Icon, tone = 'default', colSpan, dotTone }) {
  const toneClasses = {
    default: 'text-slate-900 dark:text-white',
    blue: 'text-blue-600 dark:text-blue-300',
    orange: 'text-orange-600 dark:text-orange-400',
    slate: 'text-slate-500 dark:text-slate-400',
  };
  return (
    <div className={clsx(colSpan === 2 && 'sm:col-span-2')}>
      <div className="mb-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <div className={clsx('text-sm font-semibold', toneClasses[tone] || toneClasses.default)}>
        {dotTone && <span className={clsx('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', `bg-${dotTone}-500`)} />}
        {value}
      </div>
    </div>
  );
}

function MetaLine({ label, value, valueClass = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}:</span>
      <span className={clsx('font-semibold', valueClass)}>{value}</span>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition',
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
      )}
    >
      {children}
    </button>
  );
}
