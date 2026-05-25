// ============================================================
// crmScraper.js — IPOST ichki tarmoq CRM'idan ma'lumot olish
// ------------------------------------------------------------
// Bu skreper FAQAT ichki tarmoq (LAN)'dan ishlaydi:
//   - IPOST ofis kompyuterida (192.168.4.100:3000 ko'rinadi)
//   - Yoki localhost dev rejimida
//
// Internet (https://cargo-qc.vercel.app) orqali:
//   - HTTPS sahifadan HTTP IP'ga so'rov — Mixed Content xato
//   - CORS to'sadi (lokal tarmoq access denied)
//   - Vaqt yo'qotish + console error spam
//
// Shu sababli production HTTPS'da skreper avtomatik o'chiriladi.
// ============================================================

// CRM base URL — env'dan o'qiladi, default LAN IP
const CRM_BASE = import.meta.env.VITE_CRM_BASE_URL || 'http://192.168.4.100:3000';

// Production HTTPS'da skreperni ishlatish mantiqsiz
function isScraperUsable() {
  if (typeof window === 'undefined') return false;
  // HTTPS sahifadan HTTP'ga so'rov yuborib bo'lmaydi (Mixed Content)
  const isHttpsPage = window.location.protocol === 'https:';
  const isHttpCrm = CRM_BASE.startsWith('http://');
  if (isHttpsPage && isHttpCrm) return false;
  // localhost'da test qilish mumkin
  return true;
}

async function fetchCRMPage(path = '/module-102') {
  if (!isScraperUsable()) return null;

  try {
    // 5 soniya timeout — internal LAN bo'lsa juda tez bo'ladi
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${CRM_BASE}${path}`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    // Silent fail — agar LAN'da bo'lmasangiz, normal
    return null;
  }
}

export async function scrapeCRMStats() {
  const html = await fetchCRMPage('/module-102');
  if (!html) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const text = doc.body?.innerText || doc.body?.textContent || '';

  const grab = (pattern) => {
    const match = text.match(pattern);
    return match ? parseInt(match[1], 10) : 0;
  };

  return {
    total: grab(/Barchasi\s+(\d+)/),
    qabul_qilindi: grab(/Qabul qilindi\s+(\d+)/),
    jarayonda: grab(/Jarayonda\s+(\d+)/),
    yopildi: grab(/Yopildi\s+(\d+)/),
    finansga_yuborish: grab(/Finansga yuborilgan\s+(\d+)/),
    totalMijoz: grab(/(\d+)\s*mijoz/),
    totalTrek: grab(/(\d+)\s*trek/),
    scrapedAt: new Date().toISOString(),
  };
}

const CRM_STATS_KEY = 'cargo-qc-crm-stats-cache';

export function getCachedCRMStats() {
  try {
    const raw = localStorage.getItem(CRM_STATS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedCRMStats(stats) {
  try {
    localStorage.setItem(CRM_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}
