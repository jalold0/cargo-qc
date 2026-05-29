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
// localStorage cheklovi (5-10MB) tugamasligi uchun lokal cache'da
// faqat eng so'nggi N yozuv saqlanadi. Qolganlari Supabase'da.
// Sahifa qayta yuklansa, hydrate barchasini qaytarib oladi.
const LOCAL_CACHE_LIMIT = 5000;

const subscribers = new Set();
let hydrationStarted = false;
let remoteSyncTimer = null;
const pendingRemoteUpserts = new Map();

// In-memory mirror — localStorage quota tugaganda ham source of truth
// shu joyda saqlanadi. Sahifa yopilmaguncha ishlaydi.
let memoryCache = null;

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
  // In-memory cache eng so'nggi truthsource
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryCache = parsed;
      return parsed;
    }
    return null;
  } catch (error) {
    console.warn('[warehouse] storage parse error:', error);
    return null;
  }
}

function saveToStorage(items) {
  // Memory cache to'liq saqlanadi (subscriber'lar bularni ko'radi)
  memoryCache = Array.isArray(items) ? items : [];

  // localStorage — quota tugamasligi uchun faqat eng so'nggi N yozuv
  try {
    const slice = memoryCache.slice(0, LOCAL_CACHE_LIMIT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch (error) {
    // Quota exceeded — ehtimol juda ko'p yozuv. Avval kichikroq slice
    // yozishni urinib ko'ramiz.
    try {
      const smaller = memoryCache.slice(0, 500);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(smaller));
      console.warn(
        `[warehouse] storage quota tugadi, faqat oxirgi 500 yozuv saqlandi (jami ${memoryCache.length}). Qolganlari Supabase'da.`,
      );
    } catch {
      console.warn('[warehouse] storage save xatosi:', error);
    }
  }

  // Memory cache'da hammasi bor — subscribers'ga doim xabar yetadi
  notifySubscribers();
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
    isRepeat: Boolean(safe.isRepeat),
    repeatOfId: safe.repeatOfId || null,
    repeatIndex: Number(safe.repeatIndex) || 0,
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
// Supabase POST hajmi cheklangan; 100 ta yozuvga bo'lib jo'natamiz.
const REMOTE_BATCH_SIZE = 100;

async function flushRemoteBatch(items) {
  if (!items.length) return;
  // Bo'laklarga ajratamiz
  const chunks = [];
  for (let i = 0; i < items.length; i += REMOTE_BATCH_SIZE) {
    chunks.push(items.slice(i, i + REMOTE_BATCH_SIZE));
  }
  // Ketma-ket — Supabase'ni cho'kkitirmaslik uchun
  for (const chunk of chunks) {
    try {
      if (chunk.length === 1) {
        // eslint-disable-next-line no-await-in-loop
        await upsertWarehouseReturnRemote(chunk[0]);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await bulkUpsertWarehouseReturnsRemote(chunk);
      }
    } catch (error) {
      // Failed chunk pending'ga qaytariladi — keyingi safar urinib ko'riladi
      chunk.forEach((item) => pendingRemoteUpserts.set(item.id, item));
      console.warn(
        `[warehouse] remote sync chunk xatosi (${chunk.length} yozuv):`,
        error?.message || error,
      );
    }
  }
}

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
    await flushRemoteBatch(batch);
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

// ============================================================
// Realtime → service ko'prik
// ------------------------------------------------------------
// DashboardLayout'da Supabase Realtime warehouse_returns jadvalini
// kuzatadi. Boshqa qurilmadan o'zgarish kelsa, `cargo-qc-data-changed`
// event'i yuboriladi. Biz uni eshitib, joriy oyni qayta tortib olamiz
// — boshqa qurilmadagi import/o'chirish darrov bu sahifada ko'rinadi.
// ============================================================
if (typeof window !== 'undefined') {
  window.addEventListener('cargo-qc-data-changed', (event) => {
    const key = event?.detail?.key;
    if (key === 'remote:warehouse') {
      hydrationStarted = false; // qayta hydrate qilishga ruxsat
      hydrateFromRemoteInBackground();
    }
  });
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

  // ============================================================
  // Takror trek — BLOKLAMAYMIZ. Foydalanuvchi explicit ravishda
  // bir xil trekni qayta kiritsa, har ikkala yozuv saqlanadi va
  // har biri o'z kiritganiga (responsible) hisoblanadi. Sababi: bitta
  // yukni omborga olib kelish + skladdagi muammosini hal qilish kabi
  // ikki bosqichli ishlar ikkita hodimning vaqtini oladi.
  // ------------------------------------------------------------
  // Lekin isRepeat=true flag bilan markirovka qilamiz, takror
  // ro'yxatida ko'rinishi uchun. repeatOfId — birinchi yozuv ID'si.
  // ============================================================
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const earlier = items.find(
    (item) =>
      item.trackCode === entry.trackCode &&
      new Date(item.returnDate).getTime() > thirtyDaysAgo,
  );
  if (earlier) {
    entry.isRepeat = true;
    entry.repeatOfId = earlier.repeatOfId || earlier.id;
    const repeats = items.filter(
      (item) =>
        item.trackCode === entry.trackCode &&
        (item.repeatOfId === entry.repeatOfId || item.id === entry.repeatOfId),
    );
    entry.repeatIndex = repeats.length;
  }

  const next = [entry, ...items];
  saveToStorage(next);
  scheduleRemoteSync(entry);
  markCompensatedAsFoundIfPresent(entry);

  return { ok: true, entry, repeated: Boolean(entry.isRepeat), repeatIndex: entry.repeatIndex };
}

// Bulk yaratish (Excel import yoki textarea uchun)
//
// MUHIM: Takror treklar BLOKLANMAYDI — har biri alohida yozuv sifatida
// saqlanadi (isRepeat=true bilan). Har bir takror trek o'z kiritganiga
// (responsible) hisoblanadi. Bu hodimlar vaqtini to'g'ri hisoblash uchun.
export function bulkCreateWarehouseReturns(rows = [], commonFields = {}) {
  const items = getWarehouseReturns();
  const created = [];
  const skipped = [];
  const repeated = [];

  // Mavjud treklarni ID bo'yicha guruhlash — repeatIndex uchun
  const existingByTrack = new Map();
  items.forEach((item) => {
    const code = String(item.trackCode || '').trim();
    if (!code) return;
    if (!existingByTrack.has(code)) existingByTrack.set(code, []);
    existingByTrack.get(code).push(item);
  });

  rows.forEach((row) => {
    const trackCode = String(row?.trackCode || row || '').trim();
    if (!trackCode) {
      skipped.push({ reason: 'empty', row });
      return;
    }

    const prior = existingByTrack.get(trackCode) || [];
    const repeatOf = prior.length > 0 ? (prior[0].repeatOfId || prior[0].id) : null;
    const isRepeat = prior.length > 0;
    const repeatIndex = prior.length;

    const entry = normalizeEntry({
      trackCode,
      problemType: row?.problemType || commonFields.problemType || '',
      responsible: row?.responsible || commonFields.responsible || '',
      customerPhone: row?.customerPhone || row?.phone || '',
      customerName: row?.customerName || '',
      note: row?.note || commonFields.note || '',
      returnDate: row?.returnDate || commonFields.returnDate || new Date().toISOString(),
      id: generateId(),
      isRepeat,
      repeatOfId: repeatOf,
      repeatIndex,
    });

    created.push(entry);
    if (isRepeat) repeated.push(entry);

    // Yangi treklarni ham guruhga qo'shamiz — keyingi rowlar uchun
    if (!existingByTrack.has(trackCode)) existingByTrack.set(trackCode, []);
    existingByTrack.get(trackCode).push(entry);
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
    repeated: repeated.length,
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
// REPLACE — barcha mavjud yozuvlarni o'chirib, yangi list bilan
// to'ldirish (Excel "To'liq almashtirish" rejimi uchun)
// Eslatma: Supabase'da soft-delete fonda — UI darrov yangilanadi.
// ============================================================
export function replaceAllWarehouseReturns(newRows = []) {
  const oldItems = getWarehouseReturns();
  const created = [];
  const existingTracks = new Set();

  newRows.forEach((row) => {
    const trackCode = String(row?.trackCode || '').trim();
    if (!trackCode || existingTracks.has(trackCode)) return;
    existingTracks.add(trackCode);
    const entry = normalizeEntry({
      ...row,
      trackCode,
      id: generateId(),
    });
    created.push(entry);
  });

  saveToStorage(created);

  // Supabase'ga yangi yozuvlarni jo'natish
  created.forEach((e) => scheduleRemoteSync(e));

  // Eski yozuvlarni Supabase'dan soft-delete (fonda, parallel)
  if (isSupabaseEnabled) {
    const oldIds = oldItems.map((it) => it.id).filter(Boolean);
    if (oldIds.length) {
      Promise.allSettled(oldIds.map((id) => deleteWarehouseReturnRemote(id))).catch(() => {});
    }
  }

  return { ok: true, replaced: created.length, removed: oldItems.length };
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

// Vozvrat indikatorlari: problemType yoki mas'ul hodim nomi.
// Bazada vozvrat treklari "Ulug'bek" nomli ombor hodimiga biriktirilgan,
// shuning uchun u ham vozvrat sifatida tanib olinadi.
const VOZVRAT_HANDLER_TOKENS = ['ulug', 'ulugbek', "ulug'bek", "ulug‘bek"];

function isVozvratProblem(value) {
  return String(value || '').toLowerCase().includes('vozvrat');
}

function isWarehouseHandler(value) {
  const v = String(value || '').toLowerCase().trim();
  if (!v) return false;
  return VOZVRAT_HANDLER_TOKENS.some((token) => v.includes(token));
}

// Universal vozvrat tanib olish: problemType "vozvrat" yoki
// mas'ul hodim "Ulug'bek" (asosiy/handledBy/assignedTo/lockedBy maydonlari)
function isVozvratEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (isVozvratProblem(entry.problemType)) return true;
  // Mas'ul hodim turli xil maydonlarda saqlanishi mumkin
  if (
    isWarehouseHandler(entry.handledBy) ||
    isWarehouseHandler(entry.assignedTo) ||
    isWarehouseHandler(entry.lockedBy) ||
    isWarehouseHandler(entry.responsible) ||
    isWarehouseHandler(entry.javobgar)
  ) {
    return true;
  }
  return false;
}

export function previewVozvratCandidates() {
  try {
    const activeRaw = localStorage.getItem('cargo-qc-otk-entries');
    const archiveRaw = localStorage.getItem('cargo-qc-otk-archive');
    const active = activeRaw ? JSON.parse(activeRaw) : [];
    const archive = archiveRaw ? JSON.parse(archiveRaw) : [];
    const all = [...(Array.isArray(active) ? active : []), ...(Array.isArray(archive) ? archive : [])];

    const candidates = all.filter(isVozvratEntry);
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
  const existingByTrack = new Map();
  items.forEach((item) => {
    const code = String(item.trackCode || '').trim();
    if (!code) return;
    if (!existingByTrack.has(code)) existingByTrack.set(code, []);
    existingByTrack.get(code).push(item);
  });

  const created = [];
  const skipped = [];

  candidates.forEach((entry) => {
    const trackCode = String(entry.trackCode || '').trim();
    if (!trackCode) {
      skipped.push({ reason: 'no_track' });
      return;
    }

    // Takror trek — bloklamaymiz, isRepeat=true bilan qo'shamiz
    const prior = existingByTrack.get(trackCode) || [];
    const isRepeat = prior.length > 0;
    const repeatOf = isRepeat ? (prior[0].repeatOfId || prior[0].id) : null;
    const repeatIndex = prior.length;

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
      isRepeat,
      repeatOfId: repeatOf,
      repeatIndex,
    });
    created.push(warehouseEntry);
    if (!existingByTrack.has(trackCode)) existingByTrack.set(trackCode, []);
    existingByTrack.get(trackCode).push(warehouseEntry);
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

      // Vozvrat yozuvlarini topib, ID'larini yig'amiz (problemType + Ulug'bek)
      const vozvratIds = [];
      const collect = (list) => {
        if (!Array.isArray(list)) return;
        list.forEach((e) => {
          if (isVozvratEntry(e) && e?.id) {
            vozvratIds.push(e.id);
          }
        });
      };
      collect(active);
      collect(archive);

      // Lokal cache'dan olib tashlash (problemType yoki Ulug'bek hodimi)
      const filterFn = (list) =>
        Array.isArray(list) ? list.filter((e) => !isVozvratEntry(e)) : [];

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
