// src/services/salesData.js
// Oylik sotuv ma'lumotlari (treklar soni va vazn kg).
// Hozircha lokal/manual rejim — kelajakda CRM bazasiga ulanadi.
// Bu service:
//   1. localStorage'dan oylik sotuv ma'lumotlarini o'qiydi (qo'lda kiritilgan bo'lsa)
//   2. Kelajakda backend/CRM API'ga so'rov yuborishi mumkin (fetchRemoteMonthlySales)
//   3. Muammo trek foizini hisoblash uchun yordamchi funksiya beradi

const STORAGE_KEY = 'cargo-qc-monthly-sales';
const REMOTE_ENDPOINT_KEY = 'cargo-qc-sales-endpoint';

// ============================================================
// Asosiy o'qish: oylik sotuv ma'lumotlari
// Returns: { [year]: { [monthIndex 0..11]: { totalTracks, totalKg, syncedAt } } }
// ============================================================
export function getMonthlySales() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Monthly sales storage parse error', error);
    return {};
  }
}

export function getMonthlySalesForYear(year) {
  const all = getMonthlySales();
  return all?.[String(year)] || {};
}

// Bitta oy uchun {totalTracks, totalKg}
export function getMonthSales(year, monthIndex) {
  const yearData = getMonthlySalesForYear(year);
  const m = yearData?.[String(monthIndex)];
  if (!m) return { totalTracks: 0, totalKg: 0, hasData: false };
  return {
    totalTracks: Number(m.totalTracks) || 0,
    totalKg: Number(m.totalKg) || 0,
    syncedAt: m.syncedAt || null,
    hasData: Boolean(Number(m.totalTracks) || Number(m.totalKg)),
  };
}

// Saqlash (qo'lda kiritish yoki backend'dan sinxron)
export function setMonthSales(year, monthIndex, { totalTracks, totalKg }) {
  if (typeof window === 'undefined') return false;
  try {
    const all = getMonthlySales();
    const ystr = String(year);
    const mstr = String(monthIndex);
    if (!all[ystr]) all[ystr] = {};
    all[ystr][mstr] = {
      totalTracks: Number(totalTracks) || 0,
      totalKg: Number(totalKg) || 0,
      syncedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.error('Monthly sales save error', error);
    return false;
  }
}

// Toza oylik sotuv kiritish (toplu ma'lumot)
export function setMonthlySales(year, monthMap) {
  if (typeof window === 'undefined') return false;
  try {
    const all = getMonthlySales();
    const ystr = String(year);
    all[ystr] = {};
    Object.entries(monthMap || {}).forEach(([mstr, value]) => {
      all[ystr][mstr] = {
        totalTracks: Number(value?.totalTracks) || 0,
        totalKg: Number(value?.totalKg) || 0,
        syncedAt: value?.syncedAt || new Date().toISOString(),
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.error('Monthly sales bulk save error', error);
    return false;
  }
}

// ============================================================
// Yillik jami
// ============================================================
export function getYearTotals(year) {
  const data = getMonthlySalesForYear(year);
  let totalTracks = 0;
  let totalKg = 0;
  let monthsWithData = 0;
  Object.values(data).forEach((m) => {
    const t = Number(m.totalTracks) || 0;
    const k = Number(m.totalKg) || 0;
    totalTracks += t;
    totalKg += k;
    if (t > 0 || k > 0) monthsWithData += 1;
  });
  return { totalTracks, totalKg, monthsWithData };
}

// ============================================================
// Muammo trek foizi (problem track ratio) hisoblovchi
// problemCount — muammoli treklar soni (OTK records'dan)
// salesCount — umumiy yetkazib berilgan treklar (sotuv ma'lumotlaridan)
// ============================================================
export function calcProblemRatio(problemCount, salesCount) {
  const p = Number(problemCount) || 0;
  const s = Number(salesCount) || 0;
  if (s <= 0) return null; // ma'lumot yo'q
  return (p / s) * 100;
}

// Statistik xulosa: muammoli trek foizi (rangli baholash uchun)
export function classifyProblemRatio(percent) {
  if (percent == null) return { level: 'unknown', tone: 'slate', label: "Ma'lumot yo'q" };
  if (percent < 1) return { level: 'excellent', tone: 'emerald', label: "A'lo (< 1%)" };
  if (percent < 3) return { level: 'good', tone: 'emerald', label: 'Yaxshi' };
  if (percent < 5) return { level: 'warning', tone: 'amber', label: 'Diqqat' };
  if (percent < 10) return { level: 'high', tone: 'orange', label: 'Yuqori' };
  return { level: 'critical', tone: 'rose', label: 'Kritik' };
}

// ============================================================
// Remote endpoint (kelajakda backend bilan ulanish uchun)
// ============================================================
export function getRemoteEndpoint() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(REMOTE_ENDPOINT_KEY) || '';
  } catch {
    return '';
  }
}

export function setRemoteEndpoint(url) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(REMOTE_ENDPOINT_KEY, String(url || '').trim());
    return true;
  } catch {
    return false;
  }
}

// Kelajakda — CRM API'dan sotuv ma'lumotlarini olish
// Hozircha bo'sh — backend mavjud bo'lganda implement qilinadi
export async function fetchRemoteMonthlySales(year) {
  const endpoint = getRemoteEndpoint();
  if (!endpoint) return { ok: false, reason: 'no_endpoint' };
  try {
    const response = await fetch(`${endpoint}?year=${encodeURIComponent(year)}`, {
      credentials: 'omit',
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}` };
    const data = await response.json();
    // data format: { [monthIndex]: { totalTracks, totalKg } }
    if (data && typeof data === 'object') {
      setMonthlySales(year, data);
      return { ok: true, data };
    }
    return { ok: false, reason: 'invalid_format' };
  } catch (error) {
    console.warn('Remote sales fetch failed', error);
    return { ok: false, reason: 'network_error', error };
  }
}

// ============================================================
// Format yordamchilari
// ============================================================
export function formatTracks(count) {
  if (!Number.isFinite(Number(count))) return '—';
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(count)));
}

export function formatKg(kg) {
  if (!Number.isFinite(Number(kg))) return '—';
  const num = Number(kg);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M kg`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K kg`;
  return `${num.toFixed(0)} kg`;
}

export function formatPercent(percent, decimals = 2) {
  if (percent == null || !Number.isFinite(Number(percent))) return '—';
  return `${Number(percent).toFixed(decimals)}%`;
}
