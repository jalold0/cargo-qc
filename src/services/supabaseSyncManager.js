// ============================================================
// supabaseSyncManager.js — Sync Now (manual bulk push)
// ------------------------------------------------------------
// "Sync to Supabase" tugmasi shu servisni chaqiradi. Barcha
// localStorage ma'lumotlarini Supabase'ga ko'chiradi va
// progress'ni bosqichma-bosqich qaytaradi.
//
// Foydalanish:
//   const result = await syncAllToSupabase({
//     onProgress: ({ step, total, label, status }) => { ... }
//   });
// ============================================================

import {
  getAssistantAiRequests,
  getCompensatedLoadRegistry,
  getOtkArchive,
  getOtkEntries,
  getOtkSettings,
  getSystemUsers,
} from './localData';
import * as supabase from './supabaseRest';
import { bulkUpsertUsersRemote, isUsersRemoteEnabled } from './usersRemote';

const STEPS = [
  { key: 'users', label: 'Foydalanuvchilar' },
  { key: 'settings', label: 'Sozlamalar' },
  { key: 'complaints', label: 'Murojaatlar (faol + arxiv)' },
  { key: 'compensated', label: '104 Moliya yozuvlari' },
  { key: 'assistant', label: 'Assistant AI murojaatlari' },
];

// Bitta INSERT'da yuboriladigan max yozuv soni.
// Supabase free tier'da statement_timeout = 8s.
// 100 yozuv — xavfsiz limit (katta payload bilan ham yetadi).
const BATCH_SIZE = 100;
const MIN_BATCH_SIZE = 1; // bisect retry minimum

// Massivni teng partiyalarga ajratish
function chunk(items, size = BATCH_SIZE) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Recursive bisect retry — agar batch xato bersa, ikkiga bo'lib qayta sinash.
// Bu yo'l bilan TIMEOUT (oddiy 1-2 ta yirik yozuv) yoki BAD RECORD (1 ta xato yozuv)
// holatlari topiladi. Toza batch'lar saqlanadi.
async function trySendBatch(batch, sender, failedRecords = []) {
  if (batch.length === 0) return { processed: 0, failed: 0, failedRecords };

  try {
    await sender(batch);
    return { processed: batch.length, failed: 0, failedRecords };
  } catch (error) {
    // Bitta yozuv qolganda — bu yozuvning o'zi muammoli
    if (batch.length <= MIN_BATCH_SIZE) {
      failedRecords.push({
        item: batch[0],
        error: error?.message || String(error),
      });
      return { processed: 0, failed: batch.length, failedRecords };
    }

    // Ikkiga bo'lib qayta sinash
    const mid = Math.floor(batch.length / 2);
    const left = await trySendBatch(batch.slice(0, mid), sender, failedRecords);
    const right = await trySendBatch(batch.slice(mid), sender, failedRecords);

    return {
      processed: left.processed + right.processed,
      failed: left.failed + right.failed,
      failedRecords,
    };
  }
}

// Partiyali yuborish — har batch alohida await, progress oraliq xabar.
// Bisect retry bilan — xato batch ikkiga bo'linib qayta sinaladi.
async function sendInBatches(items, sender, onBatch) {
  const batches = chunk(items, BATCH_SIZE);
  if (batches.length === 0) return { processed: 0, failed: 0, failedRecords: [] };

  let processed = 0;
  let failed = 0;
  const failedRecords = [];

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    // eslint-disable-next-line no-await-in-loop
    const result = await trySendBatch(batch, sender, failedRecords);
    processed += result.processed;
    failed += result.failed;

    onBatch?.({
      batchIndex: i + 1,
      totalBatches: batches.length,
      processed,
      total: items.length,
      failed,
    });
  }

  return { processed, failed, failedRecords };
}

export function getSyncSteps() {
  return STEPS.slice();
}

// Asosiy sync funksiyasi
export async function syncAllToSupabase({ onProgress } = {}) {
  const isEnabled = supabase.isSupabaseEnabled && isUsersRemoteEnabled;
  if (!isEnabled) {
    return {
      ok: false,
      message:
        'Supabase env to\'ldirilmagan. .env.local da VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni to\'ldiring.',
      results: [],
    };
  }

  const results = [];
  const total = STEPS.length;

  const notify = (step, status, message = '', count = 0) => {
    const info = STEPS[step];
    onProgress?.({
      step: step + 1,
      total,
      key: info.key,
      label: info.label,
      status,
      message,
      count,
    });
  };

  // ============================================================
  // 1) USERS
  // ============================================================
  notify(0, 'progress');
  try {
    const users = getSystemUsers().filter((u) => u && u.username);
    const result = await bulkUpsertUsersRemote(users);
    const count = (result?.items?.length || users.length);
    results.push({ key: 'users', ok: true, count });
    notify(0, 'success', `${count} ta yozuv`, count);
  } catch (error) {
    const msg = error?.message || String(error);
    results.push({ key: 'users', ok: false, message: msg });
    notify(0, 'error', msg);
  }

  // ============================================================
  // 2) SETTINGS
  // ============================================================
  notify(1, 'progress');
  try {
    const settings = getOtkSettings();
    await supabase.upsertOtkSettingsRemote(settings);
    results.push({ key: 'settings', ok: true, count: 1 });
    notify(1, 'success', '1 ta sozlamalar yozuvi', 1);
  } catch (error) {
    const msg = error?.message || String(error);
    results.push({ key: 'settings', ok: false, message: msg });
    notify(1, 'error', msg);
  }

  // ============================================================
  // 3) COMPLAINTS (active + archive) — partiyalarda
  // ============================================================
  notify(2, 'progress');
  try {
    const active = getOtkEntries();
    const archive = getOtkArchive();
    const totalCount = active.length + archive.length;

    if (totalCount > 0) {
      // Faol va arxivni alohida batch'larda yuboramiz (is_archived flag farqli)
      const activeRes = await sendInBatches(
        active,
        (batch) => supabase.upsertComplaintsSnapshotRemote(batch, []),
        ({ batchIndex, totalBatches, processed, total }) => {
          notify(
            2,
            'progress',
            `Faol: ${processed}/${active.length} · batch ${batchIndex}/${totalBatches}`,
            processed,
          );
        },
      );

      const archiveRes = await sendInBatches(
        archive,
        (batch) => supabase.upsertComplaintsSnapshotRemote([], batch),
        ({ batchIndex, totalBatches, processed }) => {
          notify(
            2,
            'progress',
            `Arxiv: ${processed}/${archive.length} · batch ${batchIndex}/${totalBatches}`,
            activeRes.processed + processed,
          );
        },
      );

      const ok = activeRes.failed === 0 && archiveRes.failed === 0;
      const totalProcessed = activeRes.processed + archiveRes.processed;
      const totalFailed = activeRes.failed + archiveRes.failed;
      const allFailed = [...activeRes.failedRecords, ...archiveRes.failedRecords];

      // Failed yozuvlarni konsolga log qilamiz — sabab tahlili uchun
      if (allFailed.length > 0 && typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.warn('[Sync] Complaints failed records:', allFailed.slice(0, 5));
      }

      results.push({
        key: 'complaints',
        ok,
        count: totalProcessed,
        failed: totalFailed,
        failedRecords: allFailed,
      });
      notify(
        2,
        ok ? 'success' : 'error',
        ok
          ? `${totalProcessed} ta yozuv (${active.length} faol + ${archive.length} arxiv)`
          : `${totalProcessed} ta yuborildi, ${totalFailed} ta xato`,
        totalProcessed,
      );
    } else {
      results.push({ key: 'complaints', ok: true, count: 0 });
      notify(2, 'success', '0 ta yozuv', 0);
    }
  } catch (error) {
    const msg = error?.message || String(error);
    results.push({ key: 'complaints', ok: false, message: msg });
    notify(2, 'error', msg);
  }

  // ============================================================
  // 4) COMPENSATED LOADS — partiyalarda
  // ============================================================
  notify(3, 'progress');
  try {
    const registry = getCompensatedLoadRegistry();
    if (registry.length > 0) {
      const res = await sendInBatches(
        registry,
        (batch) => supabase.upsertCompensatedRegistryRemote(batch),
        ({ batchIndex, totalBatches, processed, total }) => {
          notify(
            3,
            'progress',
            `${processed}/${total} · batch ${batchIndex}/${totalBatches}`,
            processed,
          );
        },
      );
      const ok = res.failed === 0;
      results.push({ key: 'compensated', ok, count: res.processed, failed: res.failed });
      notify(
        3,
        ok ? 'success' : 'error',
        ok ? `${res.processed} ta yozuv` : `${res.processed} ta yuborildi, ${res.failed} ta xato`,
        res.processed,
      );
    } else {
      results.push({ key: 'compensated', ok: true, count: 0 });
      notify(3, 'success', '0 ta yozuv', 0);
    }
  } catch (error) {
    const msg = error?.message || String(error);
    results.push({ key: 'compensated', ok: false, message: msg });
    notify(3, 'error', msg);
  }

  // ============================================================
  // 5) ASSISTANT AI REQUESTS — partiyalarda
  // ============================================================
  notify(4, 'progress');
  try {
    const requests = getAssistantAiRequests();
    if (requests.length > 0) {
      const res = await sendInBatches(
        requests,
        (batch) => supabase.seedAssistantAiRequestsRemote(batch),
        ({ batchIndex, totalBatches, processed, total }) => {
          notify(
            4,
            'progress',
            `${processed}/${total} · batch ${batchIndex}/${totalBatches}`,
            processed,
          );
        },
      );
      const ok = res.failed === 0;
      results.push({ key: 'assistant', ok, count: res.processed, failed: res.failed });
      notify(
        4,
        ok ? 'success' : 'error',
        ok ? `${res.processed} ta yozuv` : `${res.processed} ta yuborildi, ${res.failed} ta xato`,
        res.processed,
      );
    } else {
      results.push({ key: 'assistant', ok: true, count: 0 });
      notify(4, 'success', '0 ta yozuv', 0);
    }
  } catch (error) {
    const msg = error?.message || String(error);
    results.push({ key: 'assistant', ok: false, message: msg });
    notify(4, 'error', msg);
  }

  const allOk = results.every((r) => r.ok);
  const totalSynced = results.reduce((sum, r) => sum + (r.count || 0), 0);

  return {
    ok: allOk,
    message: allOk
      ? `✅ Hammasi muvaffaqiyatli — jami ${totalSynced} ta yozuv ko'chirildi`
      : '⚠️ Ba\'zi bosqichlarda xato bo\'ldi. Tafsilot uchun results massivini ko\'ring.',
    results,
    totalSynced,
  };
}

// ============================================================
// AUTO-SYNC — admin login bo'lganda fonda avtomatik chaqiriladi.
// ------------------------------------------------------------
// Strategiya:
//   - localStorage va Supabase yozuv sonlarini taqqoslaymiz
//   - Farq sezilarli bo'lsa (10+ yozuv), sync ishga tushadi
//   - Bir sessiya'da faqat 1 marta ishlaydi (cache: sessionStorage)
//   - Background — UI bloklamaydi
// ============================================================

const AUTO_SYNC_SESSION_KEY = 'cargo-qc-last-auto-sync';
const AUTO_SYNC_COOLDOWN_MS = 30 * 60 * 1000; // 30 daqiqa

export function shouldRunAutoSync() {
  if (typeof window === 'undefined') return false;
  if (!supabase.isSupabaseEnabled || !isUsersRemoteEnabled) return false;

  try {
    const lastSync = sessionStorage.getItem(AUTO_SYNC_SESSION_KEY);
    if (!lastSync) return true;
    const elapsed = Date.now() - parseInt(lastSync, 10);
    return elapsed >= AUTO_SYNC_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markAutoSyncRun() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(AUTO_SYNC_SESSION_KEY, String(Date.now()));
  } catch {
    // sessionStorage band yoki o'chirilgan — silent fail
  }
}

// Local va remote count'larini taqqoslab, sync kerakmi aniqlash.
// Endpoint: HEAD request bilan Content-Range header'dan count olamiz.
async function getRemoteCount(table) {
  if (!supabase.isSupabaseEnabled) return null;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}?select=*`;
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        Prefer: 'count=exact',
        'Range-Unit': 'items',
        Range: '0-0',
      },
    });
    if (!response.ok) return null;
    const contentRange = response.headers.get('content-range');
    // Format: "0-0/19303" yoki "*/19303"
    const match = contentRange?.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

// Auto-sync entry point — admin login'dan keyin chaqiriladi
export async function autoSyncIfNeeded({ onProgress } = {}) {
  if (!shouldRunAutoSync()) {
    return { ok: true, skipped: true, reason: 'cooldown' };
  }

  // Local counts
  const localComplaints = getOtkEntries().length + getOtkArchive().length;
  const localCompensated = getCompensatedLoadRegistry().length;
  const localUsers = getSystemUsers().length;

  // ============================================================
  // KRITIK XAVFSIZLIK: bo'sh qurilmada hech narsa push qilmaymiz!
  // Aks holda DEFAULT_USERS (3 ta) real users (9 ta) ustiga
  // yozilib, server ma'lumotini buzishi mumkin edi.
  // ============================================================
  const isFreshDevice =
    localComplaints === 0 &&
    localCompensated === 0 &&
    localUsers <= 3; // faqat DEFAULT_USERS

  if (isFreshDevice) {
    markAutoSyncRun();
    return {
      ok: true,
      skipped: true,
      reason: 'fresh_device',
      message: 'Bo\'sh qurilma — ma\'lumot pull qilinmoqda, push qilinmaydi',
    };
  }

  // Remote counts (parallel)
  const [remoteComplaintsCount, remoteCompensatedCount, remoteUsersCount] = await Promise.all([
    getRemoteCount('complaints_entries'),
    getRemoteCount('compensated_loads_registry'),
    getRemoteCount('users'),
  ]);

  // Sezilarli farq — local'da ko'proq bor (10+ yozuv).
  // Remote unavailable bo'lsa — sync qilmaymiz (xavf: ma'lumot buzish)
  if (remoteComplaintsCount === null || remoteCompensatedCount === null || remoteUsersCount === null) {
    return {
      ok: false,
      skipped: true,
      reason: 'remote_count_unavailable',
      message: 'Supabase count olib bo\'lmadi, sync xavfli',
    };
  }

  const needsSync =
    localComplaints - remoteComplaintsCount >= 10 ||
    localCompensated - remoteCompensatedCount >= 5 ||
    localUsers - remoteUsersCount >= 1;

  if (!needsSync) {
    markAutoSyncRun();
    return {
      ok: true,
      skipped: true,
      reason: 'in_sync',
      counts: {
        complaints: { local: localComplaints, remote: remoteComplaintsCount },
        compensated: { local: localCompensated, remote: remoteCompensatedCount },
        users: { local: localUsers, remote: remoteUsersCount },
      },
    };
  }

  // Sync ishga tushadi
  const result = await syncAllToSupabase({ onProgress });
  if (result.ok) markAutoSyncRun();
  return { ...result, autoTriggered: true };
}

// Connection test — har bir jadvalga alohida
export async function testAllConnections() {
  const tests = [];

  if (!supabase.isSupabaseEnabled) {
    return {
      ok: false,
      message: 'Supabase env to\'ldirilmagan',
      tests: [],
    };
  }

  tests.push({ key: 'complaints', ...(await supabase.testComplaintsSupabaseConnection()) });
  tests.push({ key: 'compensated', ...(await supabase.testCompensatedSupabaseConnection()) });
  tests.push({ key: 'assistant', ...(await supabase.testSupabaseConnection()) });
  tests.push({ key: 'settings', ...(await supabase.testSettingsSupabaseConnection()) });

  const allOk = tests.every((t) => t.ok);
  return {
    ok: allOk,
    message: allOk
      ? '✅ Barcha jadvallarga ulanish ishlamoqda'
      : '⚠️ Ba\'zi jadvallarga ulanish yo\'q',
    tests,
  };
}
