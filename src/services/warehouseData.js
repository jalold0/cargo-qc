// ============================================================
// warehouseData.js — Toshkent ombori (returns) service
// ------------------------------------------------------------
// Omborga qaytgan yuklarni boshqaradi:
//   - localStorage'da kesh
//   - Supabase orqali multi-device sync
//   - Avtomatik 104 — Moliyaga "Topilgan yuk" sifatida yozadi
// ============================================================

import {
  isSupabaseEnabled,
  fetchWarehouseReturnsRemote,
  upsertWarehouseReturnRemote,
  bulkUpsertWarehouseReturnsRemote,
  deleteWarehouseReturnRemote,
  testWarehouseReturnsSupabaseConnection,
  markComplaintDeletedRemote,
} from './supabaseRest';

const STORAGE_KEY = 'cargo-qc-warehouse-returns';
const COMPENSATED_KEY = 'cargo-qc-compensated-registry';

const subscribers = new Set();
let hydrationStarted = false;
let remoteSyncTimer = null;
const pendingRemoteUpserts = new Map();

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (error) {
      console.warn('[warehouse] subscriber error:', error);
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
    console.warn('[warehouse] storage parse error:', error);
    return null;
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notifySubscribers();
  } catch (error) {
    console.warn('[warehouse] storage save error:', error);
  }
}

function normalizeEntry(entry) {
  const safe = entry && typeof entry === 'object' ? entry : {};
  return {
    id: safe.id || generateId(),
    trackCode: String(safe.trackCode || '').trim(),
    returnDate: safe.returnDate || new Date().toISOString(),
    problemType: String(safe.problemType || '').trim(),
    responsible: String(safe.responsible || '').trim(),
    customerPhone: String(safe.customerPhone || '').trim(),
    customerName: String(safe.customerName || '').trim(),
    note: String(safe.note || ''),
    status: String(safe.status || 'qabul_qilindi'),
    createdAt: safe.createdAt || new Date().toISOString(),
    updatedAt: safe.updatedAt || new Date().toISOString(),
  };
}

function generateId() {
  const now = new Date();
  const pad = (v, len = 2) => String(v).padStart(len, '0');
  const date = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = String(Math.floor(Math.random() * 900000000) + 100000000);
  return `wh-${date}-${time}-${rand}`;
}

// ============================================================
// Supabase sync (debounced batch)
// ============================================================
function scheduleRemoteSync(entry) {
  if (typeof window === 'undefined' || !isSupabaseEnabled) return;
  if (!entry || !entry.id) return;

  pendingRemoteUpserts.set(entry.id, entry);

  if (remoteSyncTimer) {
    window.clearTimeout(remoteSyncTimer);
  }

  remoteSyncTimer = window.setTimeout(async () => {
    remoteSyncTimer = null;
    const batch = Array.from(pendingRemoteUpserts.values());
    pendingRemoteUpserts.clear();
    if (!batch.length) return;

    try {
      if (batch.length === 1) {
        await upsertWarehouseReturnRemote(batch[0]);
      } else {
        await bulkUpsertWarehouseReturnsRemote(batch);
      }
    } catch (error) {
      // Network xatosi — qayta urinish uchun pending'ga qaytaramiz
      batch.forEach((item) => pendingRemoteUpserts.set(item.id, item));
      console.warn('[warehouse] remote sync xatosi:', error?.message || error);
    }
  }, 250);
}

// ============================================================
// Hydration — Supabase'dan joriy oyni boot vaqtida tortish
// ============================================================
function getCurrentMonthStartIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function mergeEntries(localItems = [], remoteItems = []) {
  const byId = new Map();
  localItems.forEach((it) => {
    if (it?.id) byId.set(it.id, it);
  });
  remoteItems.forEach((rem) => {
    if (!rem?.id) return;
    const local = byId.get(rem.id);
    if (!local) {
      byId.set(rem.id, rem);
      return;
    }
    const remTime = new Date(rem.updatedAt || 0).getTime();
    const locTime = new Date(local.updatedAt || 0).getTime();
    if (remTime > locTime) byId.set(rem.id, rem);
  });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.returnDate || 0) - new Date(a.returnDate || 0),
  );
}

function hydrateFromRemoteInBackground() {
  if (typeof window === 'undefined' || hydrationStarted) return;
  if (!isSupabaseEnabled) return;
  hydrationStarted = true;

  window.setTimeout(async () => {
    let success = false;
    try {
      const probe = await testWarehouseReturnsSupabaseConnection();
      if (!probe.ok) return;
      const remote = await fetchWarehouseReturnsRemote({ dateFrom: getCurrentMonthStartIso() });
      if (!Array.isArray(remote)) return;
      const local = loadFromStorage() || [];
      const merged = mergeEntries(local, remote);
      if (JSON.stringify(local) !== JSON.stringify(merged)) {
        saveToStorage(merged);
      }
      success = true;
    } catch (error) {
      console.warn('[warehouse] hydrate xato:', error?.message || error);
    } finally {
      if (!success) hydrationStarted = false;
    }
  }, 0);
}

export async function hydrateWarehouseByDateRange(from, to) {
  if (typeof window === 'undefined') return { ok: false };
  if (!isSupabaseEnabled) return { ok: false, reason: 'remote-disabled' };
  try {
    const remote = await fetchWarehouseReturnsRemote({
      dateFrom: from || null,
      dateTo: to || null,
    });
    const local = loadFromStorage() || [];
    const merged = mergeEntries(local, remote);
    if (JSON.stringify(local) !== JSON.stringify(merged)) {
      saveToStorage(merged);
    }
    return { ok: true, fetchedCount: remote.length, totalCount: merged.length };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

// ============================================================
// 104 — Moliya bilan ulanish (PASSIVE)
// ------------------------------------------------------------
// Warehouse — bu alohida baza. 104'ga yangi yozuv yaratmaymiz.
// Faqat: agar 104'da shu trek mavjud bo'lsa, uning yozuvini
// "Topildi — Toshkent ombori" metadata bilan boyitamiz.
// 104 da bo'lmasa — hech narsa qilmaymiz, omborda qoladi.
// ============================================================
function markCompensatedAsFoundIfPresent(entry) {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(COMPENSATED_KEY);
    const registry = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(registry)) return false;

    const idx = registry.findIndex(
      (item) => String(item.trackCode || '').trim() === entry.trackCode,
    );
    if (idx === -1) return false; // 104 da yo'q — tegmaslik

    // Mavjud 104 yozuvini "topildi" metadata bilan boyitamiz
    const existing = registry[idx];
    const outcomeText = `Topildi — Toshkent ombori${entry.problemType ? ` (${entry.problemType})` : ''}`;

    registry[idx] = {
      ...existing,
      foundCaseOutcome: existing.foundCaseOutcome || outcomeText,
      _warehouseRef: entry.id,
      _warehouseFoundAt: entry.returnDate,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(COMPENSATED_KEY, JSON.stringify(registry));
    window.dispatchEvent(new CustomEvent('cargo-qc-compensated-changed'));
    return true;
  } catch (error) {
    console.warn('[warehouse] 104 belgilashda xato:', error?.message || error);
    return false;
  }
}

// ============================================================
// Public API
// ============================================================
export function getWarehouseReturns() {
  let items = loadFromStorage();
  if (!items) {
    items = [];
    saveToStorage(items);
  }
  hydrateFromRemoteInBackground();
  return items;
}

export function subscribeToWarehouseReturns(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function createWarehouseReturn(payload) {
  const items = getWarehouseReturns();
  const entry = normalizeEntry({ ...payload, id: generateId() });
  if (!entry.trackCode) {
    return { ok: false, reason: 'track_required' };
  }

  // Dublikat tekshirish (oxirgi 30 kun ichida)
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const duplicate = items.find(
    (item) =>
      item.trackCode === entry.trackCode &&
      new Date(item.returnDate).getTime() > thirtyDaysAgo,
  );
  if (duplicate) {
    return { ok: false, reason: 'duplicate', existing: duplicate };
  }

  const next = [entry, ...items];
  saveToStorage(next);
  scheduleRemoteSync(entry);
  markCompensatedAsFoundIfPresent(entry);

  return { ok: true, entry };
}

// Bulk yaratish (Excel import yoki textarea uchun)
export function bulkCreateWarehouseReturns(rows = [], commonFields = {}) {
  const items = getWarehouseReturns();
  const created = [];
  const skipped = [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const existingByTrack = new Map();
  items.forEach((item) => {
    if (item.trackCode && new Date(item.returnDate).getTime() > thirtyDaysAgo) {
      existingByTrack.set(item.trackCode, item);
    }
  });

  rows.forEach((row) => {
    const trackCode = String(row?.trackCode || row || '').trim();
    if (!trackCode) {
      skipped.push({ reason: 'empty', row });
      return;
    }
    if (existingByTrack.has(trackCode)) {
      skipped.push({ reason: 'duplicate', trackCode });
      return;
    }

    const entry = normalizeEntry({
      trackCode,
      problemType: row?.problemType || commonFields.problemType || '',
      responsible: row?.responsible || commonFields.responsible || '',
      customerPhone: row?.customerPhone || row?.phone || '',
      customerName: row?.customerName || '',
      note: row?.note || commonFields.note || '',
      returnDate: row?.returnDate || commonFields.returnDate || new Date().toISOString(),
      id: generateId(),
    });
    created.push(entry);
    existingByTrack.set(trackCode, entry);
  });

  if (created.length) {
    const next = [...created, ...items];
    saveToStorage(next);
    // Batch ravishda Supabase'ga
    created.forEach((e) => {
      scheduleRemoteSync(e);
      markCompensatedAsFoundIfPresent(e);
    });
  }

  return {
    ok: true,
    created: created.length,
    skipped: skipped.length,
    skippedDetails: skipped,
  };
}

export function updateWarehouseReturn(id, updates) {
  const items = getWarehouseReturns();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return { ok: false, reason: 'not_found' };

  const merged = normalizeEntry({
    ...items[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  });
  items[index] = merged;
  saveToStorage(items);
  scheduleRemoteSync(merged);

  return { ok: true, entry: merged };
}

export function deleteWarehouseReturn(id) {
  const items = getWarehouseReturns();
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return { ok: false };

  saveToStorage(filtered);

  // Supabase soft delete (fonda)
  if (isSupabaseEnabled) {
    deleteWarehouseReturnRemote(id).catch((error) => {
      console.warn('[warehouse] remote delete xato:', error?.message || error);
    });
  }

  return { ok: true };
}

// ============================================================
// MIGRATSIYA: OTK complaints'da problemType="Vozvrat" treklarini
// Toshkent omboriga ko'chirish
// ------------------------------------------------------------
// - OTK murojaatlardan vozvrat'ga aloqador yozuvlarni topadi
// - warehouse_returns ga ko'chiradi (104 bilan ham bog'laydi)
// - migrationDone bayrog'i orqali qaytadan ishlamaydi
// ============================================================
const MIGRATION_KEY = 'cargo-qc-warehouse-vozvrat-migrated';

function isVozvratProblem(value) {
  return String(value || '').toLowerCase().includes('vozvrat');
}

export function previewVozvratCandidates() {
  try {
    const activeRaw = localStorage.getItem('cargo-qc-otk-entries');
    const archiveRaw = localStorage.getItem('cargo-qc-otk-archive');
    const active = activeRaw ? JSON.parse(activeRaw) : [];
    const archive = archiveRaw ? JSON.parse(archiveRaw) : [];
    const all = [...(Array.isArray(active) ? active : []), ...(Array.isArray(archive) ? archive : [])];

    const candidates = all.filter((entry) => isVozvratProblem(entry?.problemType));
    return { count: candidates.length, candidates };
  } catch {
    return { count: 0, candidates: [] };
  }
}

export function isVozvratMigrationDone() {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'done';
  } catch {
    return false;
  }
}

export function markVozvratMigrationDone() {
  try {
    localStorage.setItem(MIGRATION_KEY, 'done');
  } catch {
    // ignore
  }
}

export function migrateVozvratToWarehouse({ removeFromOtk = false } = {}) {
  const { candidates } = previewVozvratCandidates();
  if (!candidates.length) {
    markVozvratMigrationDone();
    return { ok: true, migrated: 0, skipped: 0 };
  }

  const items = getWarehouseReturns();
  const existingTracks = new Set(items.map((it) => String(it.trackCode || '').trim()));

  const created = [];
  const skipped = [];

  candidates.forEach((entry) => {
    const trackCode = String(entry.trackCode || '').trim();
    if (!trackCode) {
      skipped.push({ reason: 'no_track' });
      return;
    }
    if (existingTracks.has(trackCode)) {
      skipped.push({ reason: 'duplicate', trackCode });
      return;
    }

    const warehouseEntry = normalizeEntry({
      id: generateId(),
      trackCode,
      returnDate: entry.date || entry.createdAt || new Date().toISOString(),
      problemType: entry.problemType || 'Vozvrat',
      responsible: entry.handledBy || '',
      customerPhone: entry.phone || '',
      customerName: entry.customer || '',
      note: entry.comment || entry.note || '',
      status: 'qabul_qilindi',
    });
    created.push(warehouseEntry);
    existingTracks.add(trackCode);
  });

  if (created.length) {
    const next = [...created, ...items];
    saveToStorage(next);
    created.forEach((e) => {
      scheduleRemoteSync(e);
      markCompensatedAsFoundIfPresent(e);
    });
  }

  // Original OTK yozuvlarini o'chirish (faqat removeFromOtk=true bo'lsa)
  // MUHIM: Faqat lokaldan emas, Supabase'dan ham soft-delete qilamiz —
  // aks holda keyingi sync'da yozuvlar qaytib keladi.
  if (removeFromOtk && created.length) {
    try {
      const activeRaw = localStorage.getItem('cargo-qc-otk-entries');
      const archiveRaw = localStorage.getItem('cargo-qc-otk-archive');
      const active = activeRaw ? JSON.parse(activeRaw) : [];
      const archive = archiveRaw ? JSON.parse(archiveRaw) : [];

      // Vozvrat yozuvlarini topib, ID'larini yig'amiz
      const vozvratIds = [];
      const collect = (list) => {
        if (!Array.isArray(list)) return;
        list.forEach((e) => {
          if (isVozvratProblem(e?.problemType) && e?.id) {
            vozvratIds.push(e.id);
          }
        });
      };
      collect(active);
      collect(archive);

      // Lokal cache'dan olib tashlash
      const filterFn = (list) =>
        Array.isArray(list) ? list.filter((e) => !isVozvratProblem(e?.problemType)) : [];

      localStorage.setItem('cargo-qc-otk-entries', JSON.stringify(filterFn(active)));
      localStorage.setItem('cargo-qc-otk-archive', JSON.stringify(filterFn(archive)));
      window.dispatchEvent(new CustomEvent('cargo-qc-data-changed', { detail: { source: 'warehouse-migration' } }));

      // Supabase'da ham soft-delete (fonda, bir-biriga to'sqinlik qilmasin)
      if (isSupabaseEnabled && vozvratIds.length) {
        Promise.allSettled(
          vozvratIds.map((id) => markComplaintDeletedRemote(id)),
        ).then((results) => {
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) {
            console.warn(
              `[warehouse] ${failed} / ${vozvratIds.length} OTK yozuvini Supabase'dan o'chirib bo'lmadi`,
            );
          }
        });
      }
    } catch (err) {
      console.warn('[warehouse] OTK tozalashda xato:', err?.message || err);
    }
  }

  markVozvratMigrationDone();

  return {
    ok: true,
    migrated: created.length,
    skipped: skipped.length,
    skippedDetails: skipped,
  };
}

export function getWarehouseStats() {
  const items = getWarehouseReturns();
  const today = new Date().toDateString();

  const byProblem = {};
  let todayCount = 0;
  items.forEach((item) => {
    const problem = item.problemType || "Ko'rsatilmagan";
    byProblem[problem] = (byProblem[problem] || 0) + 1;
    if (new Date(item.returnDate).toDateString() === today) todayCount += 1;
  });

  return {
    totalReturns: items.length,
    todayCount,
    byProblem,
  };
}
