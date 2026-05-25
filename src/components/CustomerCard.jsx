// src/components/CustomerCard.jsx
// iPost_MijozKartochkasi.html dan moslashtirildi.
// Loyihaning tailwind + dark mode uslubiga moslangan.

import { clsx } from 'clsx';
import {
  AlertTriangle,
  Headphones,
  Package,
  Star,
  UserRound,
  Wallet,
} from 'lucide-react';

function formatUZS(value) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('uz-UZ').format(Math.round(value));
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CustomerCard({ profile }) {
  if (!profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        Mijoz ma'lumoti topilmadi.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-5 text-white shadow-lg">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
            {profile.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold tracking-tight">{profile.fullName}</div>
            <div className="mt-0.5 text-xs text-white/80">
              ID-{profile.customerCode} · {profile.phone}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {profile.tier === 'Gold' && (
              <span className="rounded-md border border-amber-400 bg-gradient-to-br from-amber-100 to-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                ★ Gold
              </span>
            )}
            {profile.tier === 'Silver' && (
              <span className="rounded-md border border-slate-300 bg-gradient-to-br from-slate-100 to-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-700">
                ★ Silver
              </span>
            )}
            {profile.tier === 'Bronze' && (
              <span className="rounded-md border border-orange-400 bg-gradient-to-br from-orange-100 to-orange-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-orange-800">
                ★ Bronze
              </span>
            )}
            <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
              ★ {profile.klass} · {profile.isTop ? 'top' : 'reg'}
            </span>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <HeroCell label="ID OLGAN" value={formatDate(profile.joinedAt)} />
          <HeroCell label="1-BUYURTMA" value={formatDate(profile.firstOrderAt)} />
          <HeroCell label="JAMI KG" value={`${formatUZS(profile.totalKg)} kg`} />
        </div>
      </div>

      {/* OPERATSION */}
      <Section title="Operatsion ko'rsatkichlar" icon={Package}>
        <div className="mb-3 grid grid-cols-4 gap-2">
          <Stat label="Jami trek" value={profile.tracks.total} />
          <Stat label="Yetkazilgan" value={profile.tracks.delivered} tone="green" />
          <Stat label="Yo'lda" value={profile.tracks.inTransit} tone="blue" />
          <Stat label="Bu oy" value={profile.tracks.thisMonth} />
        </div>
        <ProgressRow label="Yetkazib berish darajasi" pct={profile.tracks.deliveryRate} tone="green" />
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Stat label="Avto (7–9 kun)" value={`${profile.tracks.avto} ta`} small />
          <Stat label="Avia (3–5 kun)" value={`${profile.tracks.avia} ta`} small />
        </div>
      </Section>

      {/* MOLIYAVIY */}
      <Section title="Moliyaviy ko'rsatkichlar" icon={Wallet}>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <Stat label="Jami to'langan" value={formatUZS(profile.finance.totalPaid)} sub="so'm (umr bo'yi)" big />
          <Stat label="O'rtacha buyurtma" value={formatUZS(profile.finance.avgOrder)} sub="so'm / buyurtma" big />
        </div>
        <div className="mb-2 grid grid-cols-3 gap-2">
          <Stat label="Ballar" value={formatUZS(profile.finance.points)} tone="blue" small />
          <Stat label="Keshbek (3%)" value={formatUZS(profile.finance.cashback)} tone="green" small />
          <Stat
            label="Qarzdorlik"
            value={formatUZS(profile.finance.debt)}
            tone={profile.finance.debt > 0 ? 'red' : 'green'}
            small
            danger={profile.finance.debt > 0}
          />
        </div>
        {profile.finance.debt > 0 && (
          <Alert tone="warn" icon={AlertTriangle} title="Muddati o'tgan qarzdorlik">
            {formatUZS(profile.finance.debt)} so'm — {profile.finance.debtDays} kundan beri to'lanmagan.
            Menejerga topshirish tavsiya etiladi.
          </Alert>
        )}
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <ProgressRow label="To'lov intizomi" pct={profile.finance.paymentDiscipline} tone="blue" />
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{profile.finance.paymentOnTime} ta</span> o'z vaqtida ·{' '}
            <span className="font-bold text-rose-600 dark:text-rose-400">{profile.finance.paymentLate} ta</span> kechikkan
          </p>
        </div>
      </Section>

      {/* MUROJAAT */}
      <Section title="Murojaat tarixi" icon={Headphones}>
        <div className="mb-2 grid grid-cols-3 gap-2">
          <Stat label="Jami murojaat" value={profile.complaints.total} />
          <Stat label="102 murojaati" value={profile.complaints.code102} tone="red" danger={profile.complaints.code102 > 0} />
          <Stat label="Raqobat rivojl." value={profile.complaints.competition} tone="amber" danger={profile.complaints.competition > 0} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.complaints.delay > 0 && <Tag tone="red">Kechikish — {profile.complaints.delay}</Tag>}
          {profile.complaints.statusReq > 0 && <Tag tone="blue">Holat so'rovi — {profile.complaints.statusReq}</Tag>}
          {profile.complaints.other > 0 && <Tag tone="gray">Boshqa — {profile.complaints.other}</Tag>}
        </div>
        {profile.complaints.code102 > 0 && (
          <Alert tone="danger" icon={AlertTriangle} title="Diqqat talab qiladi">
            102 murojaati {profile.complaints.code102} ta — monitoring zarur.
            {profile.complaints.competition > 0 && ' Raqobat rivojlantirishga 1 murojaat qayd etilgan.'}
          </Alert>
        )}
      </Section>

      {/* REYTING */}
      <Section title="Mijoz reytingi" icon={Star}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-extrabold text-white">
            {profile.klass}
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              Klass {profile.klass} · {profile.isTop ? 'top mijoz' : 'oddiy mijoz'}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {profile.isTop
                ? 'Eng faol segment. Yuqori hajm, tez-tez buyurtma.'
                : 'Standart segment. Muntazam mijoz.'}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-1.5 rounded-full bg-blue-600" style={{ width: `${profile.isTop ? 88 : 55}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Keyingi darajaga yana 3 ta posylka kerak
            </p>
          </div>
        </div>
        <div className="mb-3 flex gap-1.5">
          {['A', 'B', 'C', 'D', 'E'].map((g) => (
            <div
              key={g}
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold',
                g === profile.klass
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {g}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          {profile.flags.active && <Tag tone="green">✓ Faol mijoz</Tag>}
          {profile.flags.repeat && <Tag tone="green">✓ Qayta buyurtma</Tag>}
          {profile.flags.gold && <Tag tone="blue">★ Gold tarif</Tag>}
          {profile.flags.hasComplaints && <Tag tone="amber">⚠ Shikoyatlari bor</Tag>}
          {profile.flags.has102 && <Tag tone="red">🚨 102 murojaat</Tag>}
        </div>
      </Section>

      {/* MENEJER */}
      <Section title="Mas'ul menejer" icon={UserRound}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
            {profile.manager.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{profile.manager.name}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {profile.manager.tier} ·{' '}
              {profile.manager.online ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400">● onlayn</span>
              ) : (
                <span className="text-slate-400">○ oflayn</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Oxirgi muloqot</div>
            <div className="text-[11px] font-bold text-slate-900 dark:text-white">{profile.manager.lastContact}</div>
          </div>
        </div>
        <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          <MetaRow label="Keyingi qo'ng'iroq" value={profile.manager.nextCall} valueClass="text-blue-600 dark:text-blue-300" />
          <MetaRow label="Ichki izoh" value={profile.manager.note} />
          <MetaRow label="Bildirishnoma kanali" value={profile.manager.channels} />
        </div>
      </Section>
    </div>
  );
}

// ============================================================
// Yordamchi komponentlar
// ============================================================
function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {Icon && <Icon size={13} />}
        {title}
      </div>
      {children}
    </div>
  );
}

function HeroCell({ label, value }) {
  return (
    <div className="rounded-lg bg-white/10 p-2.5 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-white/80">{label}</div>
      <div className="mt-0.5 text-[13px] font-extrabold">{value}</div>
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default', small = false, big = false, danger = false }) {
  const toneClasses = {
    default: 'text-slate-900 dark:text-white',
    green: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-300',
    red: 'text-rose-600 dark:text-rose-400',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div
      className={clsx(
        'rounded-lg p-2.5 text-center',
        danger ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-slate-50 dark:bg-slate-950/50'
      )}
    >
      <div
        className={clsx(
          'text-[10px] font-semibold',
          danger ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'
        )}
      >
        {label}
      </div>
      <div
        className={clsx(
          'mt-1 font-extrabold',
          toneClasses[tone] || toneClasses.default,
          big ? 'text-lg' : small ? 'text-sm' : 'text-xl'
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

function ProgressRow({ label, pct, tone = 'blue' }) {
  const toneClasses = tone === 'green' ? 'bg-emerald-500' : 'bg-blue-600';
  const textTone = tone === 'green' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-300';
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className={clsx('h-1.5 rounded-full', toneClasses)} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <span className={clsx('text-xs font-bold', textTone)}>{pct}%</span>
      </div>
    </div>
  );
}

function Alert({ tone = 'warn', icon: Icon, title, children }) {
  const palette = tone === 'danger'
    ? 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
    : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200';
  return (
    <div className={clsx('mt-3 flex gap-2 rounded-lg border p-2.5', palette)}>
      {Icon && <Icon size={15} className="mt-0.5 shrink-0" />}
      <div>
        <div className="text-xs font-bold">{title}</div>
        <div className="mt-0.5 text-[11px] leading-snug">{children}</div>
      </div>
    </div>
  );
}

function Tag({ tone = 'gray', children }) {
  const tones = {
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  };
  return (
    <span className={clsx('rounded-md px-2 py-0.5 text-[11px] font-semibold', tones[tone] || tones.gray)}>
      {children}
    </span>
  );
}

function MetaRow({ label, value, valueClass = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={clsx('font-bold', valueClass)}>{value}</span>
    </div>
  );
}
