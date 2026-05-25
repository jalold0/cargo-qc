import { module102Seed } from './module102Seed';
import { scrapeCRMStats, getCachedCRMStats, setCachedCRMStats } from './crmScraper';

const STORAGE_KEY = 'cargo-qc-module-102';
const SYNC_META_KEY = 'cargo-qc-module-102-sync';
const COMPENSATED_KEY = 'cargo-qc-compensated-registry';

export const MODULE_102_STATUSES = ['qabul_qilindi', 'jarayonda', 'yopildi', 'finansga_yuborish'];

const subscribers = new Set();
let syncTimer = null;

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      console.warn(error);
    }
  });
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('module-102 storage parse error', error);
    return null;
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notifySubscribers();
  } catch (error) {
    console.warn('module-102 storage save error', error);
  }
}

function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return { lastSyncAt: null, lastSyncCount: 0, status: 'idle' };
    return JSON.parse(raw);
  } catch {
    return { lastSyncAt: null, lastSyncCount: 0, status: 'idle' };
  }
}

function saveSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
    notifySubscribers();
  } catch (error) {
    console.warn('module-102 sync meta save error', error);
  }
}

export function getModule102Entries() {
  let items = loadFromStorage();
  if (!items) {
    items = module102Seed.map(normalizeEntry);
    saveToStorage(items);
  }
  return items;
}

export function getModule102SyncMeta() {
  return loadSyncMeta();
}

export function getModule102Entry(id) {
  return getModule102Entries().find((entry) => entry.id === id) || null;
}

// ============================================================
// Yangi murojaat yaratish (manual yoki bot orqali)
// ============================================================
export function createComplaint({ phone, customerName = '', tracks = [], courier = '', goodsCondition = '', clientNote = '', actor = null }) {
  const cleanPhone = String(phone || '').replace(/\D+/g, '').trim();
  if (!cleanPhone) return { ok: false, reason: 'phone_required' };

  const items = getModule102Entries();
  const entries = [];
  const trackList = Array.isArray(tracks) ? tracks : [];
  const safeTracks = trackList.length ? trackList : [{ trackNumber: '' }];

  // Har bir trek alohida murojaat
  safeTracks.forEach((track) => {
    const trackNumber = typeof track === 'string' ? track : String(track?.trackNumber || '').trim();
    const id = generateId();
    const entry = normalizeEntry({
      id,
      phone: cleanPhone,
      customer: customerName || '',
      status: 'qabul_qilindi',
      source: 'manual',
      lockedBy: null,
      note: clientNote,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: [{
        id: `${id}-t1`,
        trackNumber,
        customerNote: clientNote,
        responsible: courier,
        reason104: goodsCondition,
        status: 'qabul_qilindi',
        attempts: 0,
      }],
    });
    entries.push(entry);
  });

  const next = [...entries, ...items];
  saveToStorage(next);

  // Audit log
  entries.forEach((entry) => {
    appendAuditLog(entry.id, {
      module: '102-modul',
      actorId: actor?.id ?? null,
      actorName: actor?.full_name || actor?.username || 'System',
      action: 'create',
      fromStatus: null,
      toStatus: 'qabul_qilindi',
      note: clientNote ? `Yangi murojaat: ${clientNote}` : 'Yangi murojaat yaratildi',
      attempts: 0,
    });
  });

  return { ok: true, count: entries.length, entries };
}

// ============================================================
// Trek qatorini yangilash (status, prices, comment, etc.)
// ============================================================
export function updateTrackInComplaint(entryId, trackId, updates, options = {}) {
  const items = getModule102Entries();
  const index = items.findIndex((item) => item.id === entryId);
  if (index === -1) return { ok: false, reason: 'not_found' };

  const entry = items[index];
  const tracks = entry.tracks || [];
  const trackIndex = tracks.findIndex((t) => t.id === trackId);
  if (trackIndex === -1) return { ok: false, reason: 'track_not_found' };

  const oldTrack = tracks[trackIndex];
  const newAttempts = (oldTrack.attempts || 0) + 1;
  const updatedTrack = {
    ...oldTrack,
    ...updates,
    attempts: updates.attempts != null ? updates.attempts : newAttempts,
    updatedAt: new Date().toISOString(),
  };

  // Operator izohi majburiy
  if (updates.operatorNote != null && !String(updates.operatorNote).trim()) {
    return { ok: false, reason: 'operator_note_required' };
  }

  const nextTracks = [...tracks];
  nextTracks[trackIndex] = updatedTrack;

  // Murojaat statusini ham yangilash (agar update'da trek statusi bo'lsa)
  const nextStatus = updates.status || entry.status;
  const lockedBy = (nextStatus === 'jarayonda') ? (options.actor?.full_name || options.actor?.username || entry.lockedBy || '') : entry.lockedBy;
  const lockedAt = (nextStatus === 'jarayonda' && !entry.lockedAt) ? new Date().toISOString() : entry.lockedAt;

  items[index] = {
    ...entry,
    status: nextStatus,
    lockedBy,
    lockedAt,
    tracks: nextTracks,
    updatedAt: new Date().toISOString(),
  };

  saveToStorage(items);

  // Audit log
  appendAuditLog(entryId, {
    module: '102-modul',
    actorId: options.actor?.id ?? null,
    actorName: options.actor?.full_name || options.actor?.username || 'System',
    action: 'update',
    fromStatus: oldTrack.status,
    toStatus: updates.status || oldTrack.status,
    note: updates.operatorNote || '',
    attempts: updatedTrack.attempts,
  });

  // Finansga yo'naltirilsa, kompensatsiya tizimiga uzatish
  if (nextStatus === 'finansga_yuborish') {
    syncFinansToCompensated(items[index]);
  }

  return { ok: true, entry: items[index], track: updatedTrack };
}

// ============================================================
// Audit log (marshrut tarixi)
// ============================================================
const AUDIT_KEY = 'cargo-qc-module-102-audit';

export function getAuditLog(complaintId) {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((entry) => !complaintId || entry.complaintId === complaintId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch {
    return [];
  }
}

function appendAuditLog(complaintId, payload) {
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(list) ? list : [];
    items.push({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      complaintId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
    // Maks 5000 yozuv saqlash (eski xotirani ortiqcha to'ldirmaslik uchun)
    const limited = items.slice(-5000);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(limited));
  } catch (error) {
    console.warn('Audit log save failed', error);
  }
}

export function upsertModule102Entry(entry) {
  const items = getModule102Entries();
  const normalized = normalizeEntry(entry);
  const index = items.findIndex((item) => item.id === normalized.id);

  if (index >= 0) {
    items[index] = { ...items[index], ...normalized, updatedAt: new Date().toISOString() };
  } else {
    items.unshift({
      ...normalized,
      createdAt: normalized.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  saveToStorage(items);

  if (normalized.status === 'finansga_yuborish') {
    syncFinansToCompensated(normalized);
  }

  return normalized;
}

export function subscribeToModule102(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function computeWaitingHours(entry) {
  const now = new Date();
  const created = new Date(entry.createdAt || now);
  return Math.max(0, (now.getTime() - created.getTime()) / (1000 * 60 * 60));
}

export function formatWaitingTime(hours) {
  if (hours < 1) return '< 1 soat';
  if (hours < 24) return `${Math.round(hours)} soat`;
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return remHours > 0 ? `${days} kun ${remHours} soat` : `${days} kun`;
}

export function getModule102Stats() {
  const items = getModule102Entries();
  const crmCache = getCachedCRMStats();

  let totalTracks = 0;
  let todayCount = 0;
  const byStatus = {};
  MODULE_102_STATUSES.forEach((status) => {
    byStatus[status] = 0;
  });

  const today = new Date().toDateString();
  items.forEach((item) => {
    totalTracks += (item.tracks || []).length;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    if (new Date(item.createdAt).toDateString() === today) todayCount += 1;
  });

  const openItems = items.filter((item) => item.status === 'qabul_qilindi' || item.status === 'jarayonda');
  const avgWaitingHours = openItems.length
    ? openItems.reduce((sum, item) => sum + computeWaitingHours(item), 0) / openItems.length
    : 0;

  const crm = crmCache || {};

  return {
    totalEntries: crm.total || items.length,
    totalTracks: crm.totalTrek || totalTracks,
    totalCustomers: crm.totalMijoz || new Set(items.map((item) => item.phone)).size,
    todayCount,
    byStatus: {
      qabul_qilindi: (crm.qabul_qilindi || 0) + byStatus.qabul_qilindi,
      jarayonda: (crm.jarayonda || 0) + byStatus.jarayonda,
      yopildi: (crm.yopildi || 0) + byStatus.yopildi,
      finansga_yuborish: (crm.finansga_yuborish || 0) + byStatus.finansga_yuborish,
    },
    avgWaitingHours,
    openCount: crm.jarayonda != null ? (crm.qabul_qilindi || 0) + (crm.jarayonda || 0) : openItems.length,
    closedCount: crm.yopildi != null ? crm.yopildi : items.filter((item) => item.status === 'yopildi').length,
    finansCount: crm.finansga_yuborish != null ? crm.finansga_yuborish : byStatus.finansga_yuborish,
    crmSyncedAt: crm.scrapedAt || null,
    hasCRMData: Boolean(crmCache),
  };
}

export async function syncFromCRM({ silent = false } = {}) {
  const meta = loadSyncMeta();
  saveSyncMeta({ ...meta, status: 'running', startedAt: new Date().toISOString() });

  try {
    const crmStats = await scrapeCRMStats();
    if (crmStats) setCachedCRMStats(crmStats);

    const localItems = getModule102Entries();
    localItems
      .filter((entry) => entry.status === 'finansga_yuborish')
      .forEach((entry) => syncFinansToCompensated(entry));

    const hasCRM = Boolean(crmStats);
    const lastSyncCount = crmStats ? crmStats.total : meta.lastSyncCount || 0;

    saveSyncMeta({
      lastSyncAt: new Date().toISOString(),
      lastSyncCount,
      lastSyncSource: hasCRM ? 'crm-live' : 'demo-stub',
      status: 'ok',
      message: silent
        ? null
        : hasCRM
          ? `CRM dan sinxronlandi: ${crmStats.totalMijoz} mijoz, ${crmStats.totalTrek} trek`
          : "CRM ga ulanib bo'lmadi - lokal ma'lumot ishlatilmoqda",
    });

    notifySubscribers();
    return { ok: true, count: lastSyncCount, hasCRM };
  } catch (error) {
    saveSyncMeta({
      ...meta,
      status: 'error',
      lastError: String(error?.message || error),
    });
    return { ok: false, error: String(error?.message || error) };
  }
}

export function startModule102AutoSync({ intervalMinutes = 5 } = {}) {
  stopModule102AutoSync();
  syncFromCRM({ silent: true });
  syncTimer = window.setInterval(() => syncFromCRM({ silent: true }), intervalMinutes * 60 * 1000);
}

export function stopModule102AutoSync() {
  if (syncTimer) {
    window.clearInterval(syncTimer);
    syncTimer = null;
  }
}

function syncFinansToCompensated(entry) {
  try {
    const raw = localStorage.getItem(COMPENSATED_KEY);
    const registry = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(registry)) return;

    (entry.tracks || []).forEach((track) => {
      if (!track.trackNumber) return;

      const exists = registry.some(
        (item) => item.trackCode === track.trackNumber || item.id === `102-finans-${track.id}`
      );
      if (exists) return;

      registry.unshift({
        id: `102-finans-${track.id}`,
        trackCode: track.trackNumber,
        compensatedDate: entry.closedAt || entry.updatedAt || new Date().toISOString(),
        phone: entry.phone,
        customer: entry.customer,
        paymentAmount: track.total || track.cargoPrice || 0,
        paymentStatus: 'Kutmoqda',
        foundCaseOutcome: '',
        foundResolutionStatus: 'Jarayonda',
        comment: `102-OTK dan moliyaga yo'naltirildi. ${track.customerNote || ''}`.trim(),
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _source: 'module-102',
        _entryId: entry.id,
        _trackId: track.id,
      });
    });

    localStorage.setItem(COMPENSATED_KEY, JSON.stringify(registry));
  } catch (error) {
    console.warn('[module102] compensated sync xato:', error.message);
  }
}

function normalizeEntry(entry) {
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  return {
    id: safeEntry.id || generateId(),
    phone: safeEntry.phone || '',
    customer: safeEntry.customer || '',
    source: safeEntry.source || 'manual',
    status: safeEntry.status || 'qabul_qilindi',
    lockedBy: safeEntry.lockedBy || null,
    lockedAt: safeEntry.lockedAt || null,
    note: safeEntry.note || '',
    createdAt: safeEntry.createdAt || new Date().toISOString(),
    updatedAt: safeEntry.updatedAt || new Date().toISOString(),
    closedAt: safeEntry.closedAt || null,
    tracks: Array.isArray(safeEntry.tracks) ? safeEntry.tracks.map(normalizeTrack) : [],
  };
}

function normalizeTrack(track) {
  const safeTrack = track && typeof track === 'object' ? track : {};
  const goodsPrice = Number(safeTrack.goodsPrice) || 0;
  const cargoPrice = Number(safeTrack.cargoPrice) || 0;
  return {
    id: safeTrack.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    trackNumber: safeTrack.trackNumber || '',
    customerNote: safeTrack.customerNote || '',
    attempts: Number(safeTrack.attempts) || 0,
    goodsPrice,
    cargoPrice,
    total: Number(safeTrack.total) || goodsPrice + cargoPrice,
    cardNumber: safeTrack.cardNumber || '',
    responsible: safeTrack.responsible || '',
    reason104: safeTrack.reason104 || '',
    status: safeTrack.status || 'jarayonda',
    isRepeat: Boolean(safeTrack.isRepeat),
    files: Array.isArray(safeTrack.files) ? safeTrack.files : [],
    createdAt: safeTrack.createdAt || new Date().toISOString(),
  };
}

function generateId() {
  const now = new Date();
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  const dateStr = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = String(Math.floor(Math.random() * 900000000) + 100000000);
  return `${dateStr}-${timeStr}-${rand}-001`;
}
