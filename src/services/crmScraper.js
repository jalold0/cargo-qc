const CRM_BASE = 'http://192.168.4.100:3000';

async function fetchCRMPage(path = '/module-102') {
  try {
    const response = await fetch(`${CRM_BASE}${path}`, {
      credentials: 'include',
      headers: {
        Accept: 'text/html',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.warn('[crmScraper] fetch xato:', error.message);
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
