import { normalizeEntries, normalizeOtkEntry, parseAppDate } from './entryNormalizer';
import * as supabase from './supabaseRest';
import {
  bulkUpsertUsersRemote,
  fetchUsersRemote,
  isUsersRemoteEnabled,
} from './usersRemote';

// Pure helperlar dataHelpers.js moduliga ko'chirildi —
// mavjud importlar ishlashda davom etishi uchun re-export qilamiz.
export {
  applyPriorityRules,
  getPriorityByWaitingDays,
  getWaitingDays,
  parseTrackNumbers,
  publicUser,
  toDateKey,
} from './dataHelpers';
// Lokal foydalanish uchun (faqat ichkarida ishlatilganlar):
import { applyPriorityRules, getWaitingDays, toDateKey } from './dataHelpers';

// Predicate/normalizer helperlar dataPredicates.js'ga ko'chirildi
export {
  compareTrackEntryOrder,
  isCompensatedProblemType,
  isCompensatedRecoveredProblemType,
  isIsfandiyorLabel,
  isJaloldinMirzakbarovUser,
  isLegacyAdminUser,
  normalizeAssignmentPersonKey,
  normalizePersonLabel,
  normalizeTrackCode,
  resolveEntryOrderTime,
} from './dataPredicates';
// Lokal foydalanish uchun:
import {
  DEPARTMENT_ASSIGNMENT_NAME_ALIASES,
  compareTrackEntryOrder,
  isCompensatedProblemType,
  isCompensatedRecoveredProblemType,
  isIsfandiyorLabel,
  isJaloldinMirzakbarovUser,
  isLegacyAdminUser,
  normalizeAssignmentPersonKey,
  normalizePersonLabel,
  normalizeTrackCode,
  resolveEntryOrderTime,
} from './dataPredicates';

// Assistant AI normalizatorlari assistantAiNormalizer.js'ga ko'chirildi
export {
  isAssistantAiSeedRecord,
  mergeAssistantAiRequests,
  normalizeAssistantAiRequest,
} from './assistantAiNormalizer';
// Lokal foydalanish uchun:
import {
  isAssistantAiSeedRecord,
  mergeAssistantAiRequests,
  normalizeAssistantAiRequest,
} from './assistantAiNormalizer';

// Compensated registry normalizatorlari compensatedNormalizer.js'ga ko'chirildi
export {
  normalizeCompensatedPaymentStatus,
  normalizeCompensatedRecoveryStatus,
  normalizeCompensatedRegistry,
  normalizeOptionalRegistryDate,
  normalizePaymentAmount,
} from './compensatedNormalizer';
// Lokal foydalanish uchun:
import {
  normalizeCompensatedPaymentStatus,
  normalizeCompensatedRecoveryStatus,
  normalizeCompensatedRegistry,
  normalizeOptionalRegistryDate,
  normalizePaymentAmount,
} from './compensatedNormalizer';

// ============================================================
// Konstantalar — dataConstants.js moduliga ko'chirildi.
// Mavjud importlar ishlashda davom etishi uchun re-export qilamiz.
// ============================================================
export {
  DEFAULT_PROBLEM_TYPES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_REQUEST_SOURCES,
  DEFAULT_ROLES,
  DEFAULT_DEPARTMENT_ORDER_CONTENT,
  STATUS_OPTIONS,
  DEFAULT_USERS,
} from './dataConstants';
// Lokal foydalanish uchun:
import {
  DEFAULT_PROBLEM_TYPES,
  DEFAULT_DEPARTMENTS,
  DEFAULT_REQUEST_SOURCES,
  DEFAULT_ROLES,
  DEFAULT_DEPARTMENT_ORDER_CONTENT,
  DEFAULT_USERS,
} from './dataConstants';

const DEFAULT_ASSISTANT_AI_REQUESTS = [];

function normalizeSystemUserRecord(user) {
  const safeUser = user && typeof user === 'object' ? user : {};
  const role = String(safeUser.role || '').trim().toLowerCase();
  const needsWorkTime = role === 'admin' || role === 'menejer' || role === 'manager';
  const workStart = typeof safeUser.workStart === 'string' ? safeUser.workStart : '';
  const workEnd = typeof safeUser.workEnd === 'string' ? safeUser.workEnd : '';

  if (needsWorkTime) {
    return {
      ...safeUser,
      workStart: workStart || '09:00',
      workEnd: workEnd || '18:00',
    };
  }

  return {
    ...safeUser,
    workStart,
    workEnd,
  };
}

const SETTINGS_KEY = 'cargo-qc-otk-settings';
const ENTRIES_KEY = 'cargo-qc-otk-entries';
const ARCHIVE_KEY = 'cargo-qc-otk-archive';
const COMPENSATED_REGISTRY_KEY = 'cargo-qc-compensated-registry';
const ASSISTANT_AI_KEY = 'cargo-qc-assistant-ai-requests';
const USERS_KEY = 'cargo-qc-users';
const MIGRATIONS_KEY = 'cargo-qc-migrations';
const AUDIT_KEY = 'cargo-qc-audit-log';
const MAX_AUDIT_LOGS = 500;
const SLA_WARNING_DAYS = 2;
const SLA_CRITICAL_DAYS = 5;

const rawStorageCache = new Map();
const computedCache = {
  settings: { raw: null, value: null },
  users: { raw: null, value: null },
  entries: { raw: null, value: null },
  archive: { raw: null, value: null },
  compensatedRegistry: { raw: null, value: null },
  assistantAi: { raw: null, value: null },
  audit: { raw: null, value: null },
  allRecords: { entriesRaw: null, archiveRaw: null, value: null },
  dashboard: new Map(),
};

let complaintsRemoteHydrationStarted = false;
let complaintsRemoteSyncTimer = null;
let compensatedRemoteHydrationStarted = false;
let compensatedRemoteSyncTimer = null;
let settingsRemoteHydrationStarted = false;
let settingsRemoteSyncTimer = null;
let usersRemoteHydrationStarted = false;
let usersRemoteSyncTimer = null;
let assistantRemoteHydrationStarted = false;
let assistantRemoteSyncTimer = null;
let remoteRefreshPromise = null;
let lastRemoteRefreshAt = 0;
const REMOTE_SYNC_GRACE_MS = 15000;
const remoteSyncPendingUntil = {
  complaints: 0,
  compensated: 0,
  settings: 0,
  assistant: 0,
  users: 0,
};

function markRemoteSyncPending(scope, durationMs = REMOTE_SYNC_GRACE_MS) {
  remoteSyncPendingUntil[scope] = Date.now() + durationMs;
}

// Helper: data change'ni boshqa modullarga e'lon qilish
function dispatchDataChanged(key) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('cargo-qc-data-changed', { detail: { key } }));
}

function clearRemoteSyncPending(scope) {
  remoteSyncPendingUntil[scope] = 0;
}

function isRemoteSyncPending(scope) {
  return Date.now() < (remoteSyncPendingUntil[scope] || 0);
}

function clearComputedCaches(changedKey = '') {
  if (!changedKey || changedKey === SETTINGS_KEY) {
    computedCache.settings = { raw: null, value: null };
  }
  if (!changedKey || changedKey === USERS_KEY) {
    computedCache.users = { raw: null, value: null };
  }
  if (!changedKey || changedKey === ENTRIES_KEY) {
    computedCache.entries = { raw: null, value: null };
  }
  if (!changedKey || changedKey === ARCHIVE_KEY) {
    computedCache.archive = { raw: null, value: null };
  }
  if (!changedKey || changedKey === COMPENSATED_REGISTRY_KEY) {
    computedCache.compensatedRegistry = { raw: null, value: null };
  }
  if (!changedKey || changedKey === ASSISTANT_AI_KEY) {
    computedCache.assistantAi = { raw: null, value: null };
  }
  if (!changedKey || changedKey === AUDIT_KEY) {
    computedCache.audit = { raw: null, value: null };
  }
  if (!changedKey || [ENTRIES_KEY, ARCHIVE_KEY].includes(changedKey)) {
    computedCache.allRecords = { entriesRaw: null, archiveRaw: null, value: null };
  }
  if (!changedKey || [SETTINGS_KEY, ENTRIES_KEY, ARCHIVE_KEY, COMPENSATED_REGISTRY_KEY, ASSISTANT_AI_KEY, AUDIT_KEY].includes(changedKey)) {
    computedCache.dashboard.clear();
  }
}

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    const cached = rawStorageCache.get(key);

    if (cached && cached.raw === raw) {
      return cached.value;
    }

    const parsed = raw ? JSON.parse(raw) : fallback;
    rawStorageCache.set(key, { raw, value: parsed });
    return parsed;
  } catch {
    rawStorageCache.delete(key);
    return fallback;
  }
};

// localStorage quota'sini boshqarish — ko'pchilik brauzerda ~5MB chegara bor
let lastQuotaWarningAt = 0;

const writeJson = (key, value) => {
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
  } catch (error) {
    // QuotaExceededError yoki shu turdagi xato
    const isQuotaError =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014;
    if (isQuotaError) {
      // Foydalanuvchiga ogohlantirish (1 daqiqaga bir martadan ko'p emas)
      const now = Date.now();
      if (now - lastQuotaWarningAt > 60_000) {
        lastQuotaWarningAt = now;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cargo-qc-storage-full', { detail: { key, attemptedBytes: raw.length } }));
        }
        console.warn(`[storage] QuotaExceededError: localStorage to'lib qoldi. Kalit: ${key}, hajm: ${raw.length} bayt. Audit log yoki eski yozuvlarni tozalash kerak.`);
      }
      // Audit logni qisqartirib qayta urinish (eng kichik xavfsiz harakat)
      try {
        const auditRaw = localStorage.getItem(AUDIT_KEY);
        if (auditRaw) {
          const auditList = JSON.parse(auditRaw);
          if (Array.isArray(auditList) && auditList.length > 100) {
            const trimmed = auditList.slice(-100); // oxirgi 100 ta yozuv qoldiriladi
            localStorage.setItem(AUDIT_KEY, JSON.stringify(trimmed));
            // Yana urinib ko'rish
            localStorage.setItem(key, raw);
            console.warn('[storage] Audit log qisqartirildi va qayta saqlash muvaffaqiyatli');
          }
        }
      } catch {
        // Hech narsa qila olmaymiz — xato yutib yuboriladi
      }
    } else {
      console.error('[storage] writeJson xato:', error);
    }
  }
  rawStorageCache.set(key, { raw, value });
  clearComputedCaches(key);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cargo-qc-data-changed', { detail: { key } }));
  }
};

function replaceComplaintSnapshotsLocal(activeEntries, archiveEntries) {
  writeJson(ENTRIES_KEY, encodeEntryCollection(normalizeEntries(activeEntries)));
  writeJson(ARCHIVE_KEY, encodeEntryCollection(normalizeEntries(archiveEntries)));
}

function resolveComplaintEntryFreshness(entry) {
  return [
    entry?.updatedAt,
    entry?.archivedAt,
    entry?.closedAt,
    entry?.importedAt,
    entry?.date,
  ]
    .map((value) => parseAppDate(value))
    .map((value) => value?.getTime())
    .find((value) => Number.isFinite(value))
    ?? 0;
}

function mergeComplaintSnapshots(localActive = [], localArchive = [], remoteActive = [], remoteArchive = []) {
  const merged = new Map();

  const push = (entry, archived) => {
    if (!entry?.id) return;
    const normalized = normalizeOtkEntry({
      ...entry,
      isArchived: archived,
    });
    const nextFreshness = resolveComplaintEntryFreshness(normalized);
    const current = merged.get(normalized.id);

    if (!current || nextFreshness >= current.freshness) {
      merged.set(normalized.id, {
        entry: normalized,
        freshness: nextFreshness,
      });
    }
  };

  localActive.forEach((entry) => push(entry, false));
  localArchive.forEach((entry) => push(entry, true));
  remoteActive.forEach((entry) => push(entry, false));
  remoteArchive.forEach((entry) => push(entry, true));

  const active = [];
  const archive = [];

  Array.from(merged.values())
    .map((item) => item.entry)
    .forEach((entry) => {
      if (entry.isArchived) {
        archive.push(entry);
      } else {
        active.push(entry);
      }
    });

  return {
    active: applyPriorityRules(normalizeEntries(active)),
    archive: normalizeEntries(archive),
  };
}

function scheduleComplaintsRemoteSync() {
  if (typeof window === 'undefined') return;
  markRemoteSyncPending('complaints');

  if (complaintsRemoteSyncTimer) {
    window.clearTimeout(complaintsRemoteSyncTimer);
  }

  complaintsRemoteSyncTimer = window.setTimeout(async () => {
    complaintsRemoteSyncTimer = null;

    try {
      if (!supabase.isSupabaseEnabled) return;

      const active = normalizeEntries(decodeEntryCollection(readJson(ENTRIES_KEY, [])));
      const archive = normalizeEntries(decodeEntryCollection(readJson(ARCHIVE_KEY, [])));
      await supabase.upsertComplaintsSnapshotRemote(active, archive);
      clearRemoteSyncPending('complaints');
    } catch {
      // local fallback stays active
      markRemoteSyncPending('complaints');
    }
  }, 180);
}

function hydrateComplaintsFromRemoteInBackground() {
  if (typeof window === 'undefined' || complaintsRemoteHydrationStarted) return;
  complaintsRemoteHydrationStarted = true;

  window.setTimeout(async () => {
    try {
      if (!supabase.isSupabaseEnabled) return;
      if (isRemoteSyncPending('complaints')) return;

      const probe = await supabase.testComplaintsSupabaseConnection();
      if (!probe.ok) return;

      const remote = await supabase.fetchComplaintsRemote();
      const localActive = normalizeEntries(decodeEntryCollection(readJson(ENTRIES_KEY, [])));
      const localArchive = normalizeEntries(decodeEntryCollection(readJson(ARCHIVE_KEY, [])));
      const merged = mergeComplaintSnapshots(localActive, localArchive, remote.active || [], remote.archive || []);

      if (
        JSON.stringify(localActive) !== JSON.stringify(merged.active) ||
        JSON.stringify(localArchive) !== JSON.stringify(merged.archive)
      ) {
        replaceComplaintSnapshotsLocal(merged.active, merged.archive);
      }

      if (
        JSON.stringify(remote.active || []) !== JSON.stringify(merged.active) ||
        JSON.stringify(remote.archive || []) !== JSON.stringify(merged.archive)
      ) {
        await supabase.upsertComplaintsSnapshotRemote(merged.active, merged.archive);
      }
    } catch {
      // keep local mode if remote is unavailable
    }
  }, 0);
}

function replaceCompensatedRegistryLocal(items) {
  writeJson(COMPENSATED_REGISTRY_KEY, normalizeCompensatedRegistry(items));
}

function resolveCompensatedItemFreshness(item) {
  return [
    item?.updatedAt,
    item?.importedAt,
    item?.compensatedDate,
  ]
    .map((value) => parseAppDate(value))
    .map((value) => value?.getTime())
    .find((value) => Number.isFinite(value))
    ?? 0;
}

function mergeCompensatedRegistry(localItems = [], remoteItems = []) {
  const merged = new Map();

  const push = (item) => {
    const normalized = normalizeCompensatedRegistry([item])[0];
    if (!normalized) return;

    const key = normalized.id || normalizeTrackCode(normalized.trackCode);
    const freshness = resolveCompensatedItemFreshness(normalized);
    const current = merged.get(key);

    if (!current || freshness >= current.freshness) {
      merged.set(key, { item: normalized, freshness });
    }
  };

  localItems.forEach(push);
  remoteItems.forEach(push);

  return Array.from(merged.values())
    .map((entry) => entry.item)
    .sort((left, right) => left.trackCode.localeCompare(right.trackCode));
}

function scheduleCompensatedRemoteSync() {
  if (typeof window === 'undefined') return;
  markRemoteSyncPending('compensated');

  if (compensatedRemoteSyncTimer) {
    window.clearTimeout(compensatedRemoteSyncTimer);
  }

  compensatedRemoteSyncTimer = window.setTimeout(async () => {
    compensatedRemoteSyncTimer = null;

    try {
      if (!supabase.isSupabaseEnabled) return;

      const registry = normalizeCompensatedRegistry(readJson(COMPENSATED_REGISTRY_KEY, []));
      await supabase.upsertCompensatedRegistryRemote(registry);
      clearRemoteSyncPending('compensated');
    } catch {
      // local fallback stays active
      markRemoteSyncPending('compensated');
    }
  }, 180);
}

function hydrateCompensatedFromRemoteInBackground() {
  if (typeof window === 'undefined' || compensatedRemoteHydrationStarted) return;
  compensatedRemoteHydrationStarted = true;

  window.setTimeout(async () => {
    try {
      if (!supabase.isSupabaseEnabled) return;
      if (isRemoteSyncPending('compensated')) return;

      const probe = await supabase.testCompensatedSupabaseConnection();
      if (!probe.ok) return;

      const remote = await supabase.fetchCompensatedRegistryRemote();
      const local = normalizeCompensatedRegistry(readJson(COMPENSATED_REGISTRY_KEY, []));
      const merged = mergeCompensatedRegistry(local, remote || []);

      if (JSON.stringify(local) !== JSON.stringify(merged)) {
        replaceCompensatedRegistryLocal(merged);
      }

      if (JSON.stringify(remote || []) !== JSON.stringify(merged) && merged.length) {
        await supabase.upsertCompensatedRegistryRemote(merged);
      }
    } catch {
      // keep local mode if remote is unavailable
    }
  }, 0);
}

function replaceOtkSettingsLocal(settings) {
  writeJson(SETTINGS_KEY, settings);
}

function mergeSettings(localSettings = {}, remoteSettings = {}) {
  const local = localSettings && typeof localSettings === 'object' ? localSettings : {};
  const remote = remoteSettings && typeof remoteSettings === 'object' ? remoteSettings : {};

  return {
    problemTypes: normalizeProblemTypes(
      (local.problemTypes?.length ? local.problemTypes : []).concat(remote.problemTypes?.length ? remote.problemTypes : [])
    ),
    departments: Array.from(new Set([...(local.departments || []), ...(remote.departments || [])].filter(Boolean))),
    requestSources: Array.from(new Set([...(local.requestSources || []), ...(remote.requestSources || [])].filter(Boolean))),
    roles: Array.from(new Set([...(local.roles || []), ...(remote.roles || [])].filter(Boolean))),
    departmentOrderContent: normalizeDepartmentOrderContent({
      ...(remote.departmentOrderContent || {}),
      ...(local.departmentOrderContent || {}),
    }),
  };
}

function scheduleSettingsRemoteSync(nextSettings) {
  if (typeof window === 'undefined') return;
  markRemoteSyncPending('settings');

  if (settingsRemoteSyncTimer) {
    window.clearTimeout(settingsRemoteSyncTimer);
  }

  settingsRemoteSyncTimer = window.setTimeout(async () => {
    settingsRemoteSyncTimer = null;

    try {
      if (!supabase.isSupabaseEnabled) return;
      await supabase.upsertOtkSettingsRemote(nextSettings);
      clearRemoteSyncPending('settings');
    } catch {
      // local fallback stays active
      markRemoteSyncPending('settings');
    }
  }, 180);
}

function hydrateSettingsFromRemoteInBackground() {
  if (typeof window === 'undefined' || settingsRemoteHydrationStarted) return;
  settingsRemoteHydrationStarted = true;

  window.setTimeout(async () => {
    try {
      if (!supabase.isSupabaseEnabled) return;
      if (isRemoteSyncPending('settings')) return;

      const probe = await supabase.testSettingsSupabaseConnection();
      if (!probe.ok) return;

      const remote = await supabase.fetchOtkSettingsRemote();
      const local = readJson(SETTINGS_KEY, {});
      const merged = mergeSettings(local, remote || {});

      if (JSON.stringify(getOtkSettings()) !== JSON.stringify(merged)) {
        replaceOtkSettingsLocal(merged);
      }

      if (JSON.stringify(remote || {}) !== JSON.stringify(merged) && Object.keys(merged).length) {
        await supabase.upsertOtkSettingsRemote(merged);
      }
    } catch {
      // keep local mode if remote is unavailable
    }
  }, 0);
}

// ============================================================
// USERS — Supabase sync (Bosqich 3)
// ============================================================
function scheduleUsersRemoteSync(usersList) {
  if (typeof window === 'undefined') return;
  markRemoteSyncPending('users');

  if (usersRemoteSyncTimer) {
    window.clearTimeout(usersRemoteSyncTimer);
  }

  usersRemoteSyncTimer = window.setTimeout(async () => {
    usersRemoteSyncTimer = null;
    try {
      if (!isUsersRemoteEnabled) return;
      await bulkUpsertUsersRemote(usersList);
      clearRemoteSyncPending('users');
    } catch {
      // local fallback active
      markRemoteSyncPending('users');
    }
  }, 200);
}

function hydrateUsersFromRemoteInBackground() {
  if (typeof window === 'undefined' || usersRemoteHydrationStarted) return;
  usersRemoteHydrationStarted = true;

  window.setTimeout(async () => {
    try {
      if (!isUsersRemoteEnabled) return;
      if (isRemoteSyncPending('users')) return;

      const remote = await fetchUsersRemote();
      if (!Array.isArray(remote) || remote.length === 0) return;

      // Merge: remote yangiroq bo'lsa (updated_at), uni saqlaymiz; local-only userlar qoladi
      const local = readJson(USERS_KEY, []);
      const byUsername = new Map();
      local.forEach((u) => {
        const k = String(u?.username || '').trim().toLowerCase();
        if (k) byUsername.set(k, u);
      });
      remote.forEach((r) => {
        const k = String(r?.username || '').trim().toLowerCase();
        if (!k) return;
        const existing = byUsername.get(k);
        if (!existing) {
          byUsername.set(k, r);
          return;
        }
        // Eng yangi versiyani saqlash
        const remoteTime = new Date(r.updatedAt || r.createdAt || 0).getTime();
        const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (remoteTime >= localTime) byUsername.set(k, r);
      });

      const merged = Array.from(byUsername.values()).map(normalizeSystemUserRecord);
      const localStr = JSON.stringify(local);
      const mergedStr = JSON.stringify(merged);
      if (localStr !== mergedStr) {
        writeJson(USERS_KEY, merged);
        computedCache.users = { raw: null, value: null }; // cache invalidation
        dispatchDataChanged('users');
      }
    } catch {
      // silent fallback
    }
  }, 0);
}

// ============================================================
// ASSISTANT AI — Supabase sync (Bosqich 3)
// ============================================================
function scheduleAssistantRemoteSync(items) {
  if (typeof window === 'undefined') return;
  markRemoteSyncPending('assistant');

  if (assistantRemoteSyncTimer) {
    window.clearTimeout(assistantRemoteSyncTimer);
  }

  assistantRemoteSyncTimer = window.setTimeout(async () => {
    assistantRemoteSyncTimer = null;
    try {
      if (!supabase.isSupabaseEnabled) return;
      await supabase.seedAssistantAiRequestsRemote(items);
      clearRemoteSyncPending('assistant');
    } catch {
      markRemoteSyncPending('assistant');
    }
  }, 200);
}

function hydrateAssistantFromRemoteInBackground() {
  if (typeof window === 'undefined' || assistantRemoteHydrationStarted) return;
  assistantRemoteHydrationStarted = true;

  window.setTimeout(async () => {
    try {
      if (!supabase.isSupabaseEnabled) return;
      if (isRemoteSyncPending('assistant')) return;

      const probe = await supabase.testSupabaseConnection();
      if (!probe.ok) return;

      const remote = await supabase.fetchAssistantAiRequestsRemote();
      if (!Array.isArray(remote)) return;

      const local = readJson(ASSISTANT_AI_KEY, []);
      const merged = mergeAssistantAiRequests(local, remote);
      const localStr = JSON.stringify(local);
      const mergedStr = JSON.stringify(merged);

      if (localStr !== mergedStr) {
        writeJson(ASSISTANT_AI_KEY, merged);
        computedCache.assistantAi = { raw: null, value: null };
        dispatchDataChanged('assistant_ai');
      }
    } catch {
      // silent fallback
    }
  }, 0);
}

function getStorageRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function normalizeProblemTypeItem(item) {
  const defaultMinutesByName = new Map(
    DEFAULT_PROBLEM_TYPES.map((entry) => [String(entry.name || '').trim().toLowerCase(), Math.max(0, Number(entry.minutes) || 0)])
  );

  if (typeof item === 'string') {
    const name = String(item || '').trim();
    return { name, minutes: defaultMinutesByName.get(name.toLowerCase()) || 0 };
  }

  if (item && typeof item === 'object') {
    const name = String(item.name || item.title || '').trim();
    const savedMinutes = Math.max(0, Number(item.minutes) || 0);
    return {
      name,
      minutes: savedMinutes || defaultMinutesByName.get(name.toLowerCase()) || 0,
    };
  }

  return { name: '', minutes: 0 };
}

function normalizeProblemTypes(items = []) {
  return items
    .map(normalizeProblemTypeItem)
    .filter((item) => item.name)
    .filter((item, index, source) => source.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index);
}

export function getOtkSettings() {
  hydrateSettingsFromRemoteInBackground();
  const raw = getStorageRaw(SETTINGS_KEY);
  if (computedCache.settings.raw === raw && computedCache.settings.value) {
    return computedCache.settings.value;
  }

  const saved = readJson(SETTINGS_KEY, {});
  const value = {
    problemTypes: normalizeProblemTypes(saved.problemTypes?.length ? saved.problemTypes : DEFAULT_PROBLEM_TYPES),
    departments: saved.departments?.length ? saved.departments : DEFAULT_DEPARTMENTS,
    requestSources: saved.requestSources?.length ? saved.requestSources : DEFAULT_REQUEST_SOURCES,
    roles: saved.roles?.length ? saved.roles : DEFAULT_ROLES,
    departmentOrderContent: normalizeDepartmentOrderContent(saved.departmentOrderContent),
    // Inaktiv hodimlar (yangi murojaatlar tushmaydi, yuklari taqsimlanadi)
    inactiveEmployeeNames: Array.isArray(saved.inactiveEmployeeNames) && saved.inactiveEmployeeNames.length
      ? saved.inactiveEmployeeNames
      : ['isfandiyor', 'abduvali'],
    // Aktiv asosiy hodimlar (yuklar bularning orasida teng taqsimlanadi)
    activeTargetEmployees: Array.isArray(saved.activeTargetEmployees) && saved.activeTargetEmployees.length
      ? saved.activeTargetEmployees
      : [
          { key: 'jaloldin', fallbackName: 'Jaloldin Mirzakbarov', fallbackRole: 'admin' },
          { key: 'saidali', fallbackName: 'Saidali', fallbackRole: 'manager' },
          { key: 'jasur', fallbackName: 'Jasur', fallbackRole: 'manager' },
          { key: 'shahnoza', fallbackName: 'Shahnoza', fallbackRole: 'manager' },
        ],
  };

  computedCache.settings = { raw, value };
  return value;
}

export function saveOtkSettings(settings) {
  const normalized = {
    ...settings,
    problemTypes: normalizeProblemTypes(settings.problemTypes),
    departmentOrderContent: normalizeDepartmentOrderContent(settings.departmentOrderContent),
  };
  writeJson(SETTINGS_KEY, normalized);
  scheduleSettingsRemoteSync(normalized);
}

export function getSystemUsers() {
  hydrateUsersFromRemoteInBackground();
  const raw = getStorageRaw(USERS_KEY);
  if (computedCache.users.raw === raw && computedCache.users.value) {
    return computedCache.users.value;
  }

  const saved = readJson(USERS_KEY, []);
  const value = (saved.length ? saved : DEFAULT_USERS).map(normalizeSystemUserRecord);
  computedCache.users = { raw, value };
  return value;
}

export function saveSystemUsers(users) {
  const normalized = (users || []).map(normalizeSystemUserRecord);
  writeJson(USERS_KEY, normalized);
  scheduleUsersRemoteSync(normalized);
}

// Assistant AI normalizatorlari assistantAiNormalizer.js'ga ko'chirildi:
// normalizeAssistantAiRequest, isAssistantAiSeedRecord,
// resolveAssistantAiFreshness, mergeAssistantAiRequests

export function getAssistantAiRequests() {
  hydrateAssistantFromRemoteInBackground();
  const raw = getStorageRaw(ASSISTANT_AI_KEY);
  if (computedCache.assistantAi.raw === raw && computedCache.assistantAi.value) {
    return computedCache.assistantAi.value;
  }

  const saved = readJson(ASSISTANT_AI_KEY, []);
  const source = saved.length ? saved : DEFAULT_ASSISTANT_AI_REQUESTS;
  const value = source
    .map(normalizeAssistantAiRequest)
    .filter((item) => !isAssistantAiSeedRecord(item))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  computedCache.assistantAi = { raw, value };
  if (!saved.length) {
    writeJson(ASSISTANT_AI_KEY, value);
  }
  return value;
}

export function saveAssistantAiRequests(items) {
  const normalized = (items || [])
    .map(normalizeAssistantAiRequest)
    .filter((item) => !isAssistantAiSeedRecord(item));
  writeJson(ASSISTANT_AI_KEY, normalized);
  scheduleAssistantRemoteSync(normalized);
}

export function replaceAssistantAiRequests(items) {
  saveAssistantAiRequests(items);
  return getAssistantAiRequests();
}

export function createAssistantAiRequest(payload, options = {}) {
  const nextItem = normalizeAssistantAiRequest(payload);
  saveAssistantAiRequests([nextItem, ...getAssistantAiRequests()]);

  const auditLog = createAuditLog('assistant_ai_create', null, resolveActorMeta(options.actor), {
    trackCode: nextItem.trackCode,
    message: `Assistent AI murojaati qo'shildi: ${nextItem.trackCode || nextItem.phone || nextItem.fullName}`,
    details: nextItem,
  });
  writeJson(AUDIT_KEY, [auditLog, ...getOtkAuditLogs()].slice(0, MAX_AUDIT_LOGS));
  return nextItem;
}

export function updateAssistantAiRequest(id, patch, options = {}) {
  const current = getAssistantAiRequests();
  const existing = current.find((item) => item.id === id);
  if (!existing) return null;

  const updated = normalizeAssistantAiRequest({
    ...existing,
    ...patch,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  });

  saveAssistantAiRequests(current.map((item) => (item.id === id ? updated : item)));

  const auditLog = createAuditLog('assistant_ai_update', null, resolveActorMeta(options.actor), {
    trackCode: updated.trackCode,
    message: `Assistent AI murojaati yangilandi: ${updated.trackCode || updated.phone || updated.fullName}`,
    details: { before: existing, after: updated },
  });
  writeJson(AUDIT_KEY, [auditLog, ...getOtkAuditLogs()].slice(0, MAX_AUDIT_LOGS));
  return updated;
}

export function assignAssistantAiRequest(id, actor) {
  const actorName = actor?.full_name || actor?.actorName || actor?.username || '';
  return updateAssistantAiRequest(
    id,
    {
      handledBy: actorName,
      status: "Qabul qildi",
    },
    { actor }
  );
}

async function refreshRemoteBackedData(force = false) {
  if (typeof window === 'undefined') return;
  if (remoteRefreshPromise) return remoteRefreshPromise;

  const now = Date.now();
  if (!force && now - lastRemoteRefreshAt < 12000) return;

  remoteRefreshPromise = (async () => {
    try {
      if (!supabase.isSupabaseEnabled) return;

      const [
        settingsProbe,
        complaintsProbe,
        compensatedProbe,
        assistantProbe,
      ] = await Promise.all([
        supabase.testSettingsSupabaseConnection?.(),
        supabase.testComplaintsSupabaseConnection?.(),
        supabase.testCompensatedSupabaseConnection?.(),
        supabase.testSupabaseConnection?.(),
      ]);

      if (settingsProbe?.ok) {
        if (isRemoteSyncPending('settings')) {
          // skip stale remote settings while local changes are settling
        } else {
        const remoteSettings = await supabase.fetchOtkSettingsRemote();
        const mergedSettings = mergeSettings(getOtkSettings(), remoteSettings || {});
        if (JSON.stringify(getOtkSettings()) !== JSON.stringify(mergedSettings)) {
          replaceOtkSettingsLocal(mergedSettings);
        }
        if (JSON.stringify(remoteSettings || {}) !== JSON.stringify(mergedSettings) && Object.keys(mergedSettings).length) {
          await supabase.upsertOtkSettingsRemote(mergedSettings);
        }
        }
      }

      if (complaintsProbe?.ok) {
        if (isRemoteSyncPending('complaints')) {
          // skip stale remote complaints while local changes are settling
        } else {
        const remoteComplaints = await supabase.fetchComplaintsRemote();
        const localActive = getOtkEntries();
        const localArchive = getOtkArchive();
        const merged = mergeComplaintSnapshots(localActive, localArchive, remoteComplaints.active || [], remoteComplaints.archive || []);
        if (
          JSON.stringify(localActive) !== JSON.stringify(merged.active) ||
          JSON.stringify(localArchive) !== JSON.stringify(merged.archive)
        ) {
          replaceComplaintSnapshotsLocal(merged.active, merged.archive);
        }
        if (
          JSON.stringify(remoteComplaints.active || []) !== JSON.stringify(merged.active) ||
          JSON.stringify(remoteComplaints.archive || []) !== JSON.stringify(merged.archive)
        ) {
          await supabase.upsertComplaintsSnapshotRemote(merged.active, merged.archive);
        }
        }
      }

      if (compensatedProbe?.ok) {
        if (isRemoteSyncPending('compensated')) {
          // skip stale remote compensated data while local changes are settling
        } else {
        const remoteCompensated = normalizeCompensatedRegistry(await supabase.fetchCompensatedRegistryRemote());
        const localCompensated = getCompensatedLoadRegistry();
        const mergedCompensated = mergeCompensatedRegistry(localCompensated, remoteCompensated);
        if (JSON.stringify(localCompensated) !== JSON.stringify(mergedCompensated)) {
          replaceCompensatedRegistryLocal(mergedCompensated);
        }
        if (JSON.stringify(remoteCompensated) !== JSON.stringify(mergedCompensated) && mergedCompensated.length) {
          await supabase.upsertCompensatedRegistryRemote(mergedCompensated);
        }
        }
      }

      if (assistantProbe?.ok) {
        if (isRemoteSyncPending('assistant')) {
          // skip stale remote assistant data while local changes are settling
        } else {
        const remoteAssistant = (await supabase.fetchAssistantAiRequestsRemote()).map(normalizeAssistantAiRequest);
        const localAssistant = getAssistantAiRequests();
        const mergedAssistant = mergeAssistantAiRequests(localAssistant, remoteAssistant);
        if (JSON.stringify(localAssistant) !== JSON.stringify(mergedAssistant)) {
          replaceAssistantAiRequests(mergedAssistant);
        }
        if (JSON.stringify(remoteAssistant) !== JSON.stringify(mergedAssistant) && mergedAssistant.length) {
          await supabase.seedAssistantAiRequestsRemote(mergedAssistant);
        }
        }
      }

      // Users — multi-device sync uchun
      if (isUsersRemoteEnabled) {
        if (isRemoteSyncPending('users')) {
          // skip stale remote users while local changes are settling
        } else {
          try {
            const remoteUsers = await fetchUsersRemote();
            if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
              const local = readJson(USERS_KEY, []);
              const byUsername = new Map();
              local.forEach((u) => {
                const k = String(u?.username || '').trim().toLowerCase();
                if (k) byUsername.set(k, u);
              });
              remoteUsers.forEach((r) => {
                const k = String(r?.username || '').trim().toLowerCase();
                if (!k) return;
                const existing = byUsername.get(k);
                if (!existing) {
                  byUsername.set(k, r);
                  return;
                }
                const remoteTime = new Date(r.updatedAt || r.createdAt || 0).getTime();
                const localTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                if (remoteTime >= localTime) byUsername.set(k, r);
              });
              const merged = Array.from(byUsername.values()).map(normalizeSystemUserRecord);
              const localStr = JSON.stringify(local);
              const mergedStr = JSON.stringify(merged);
              if (localStr !== mergedStr) {
                writeJson(USERS_KEY, merged);
                computedCache.users = { raw: null, value: null };
                dispatchDataChanged('users');
              }
            }
          } catch {
            // silent fallback
          }
        }
      }

      lastRemoteRefreshAt = Date.now();
    } catch {
      // stay in local mode silently
    } finally {
      remoteRefreshPromise = null;
    }
  })();

  return remoteRefreshPromise;
}

function normalizeDepartmentOrderContent(value) {
  const fallback = DEFAULT_DEPARTMENT_ORDER_CONTENT;
  const source = value && typeof value === 'object' ? value : {};
  const assignmentSeed =
    source.actualAssignments?.length > fallback.actualAssignments.length
      ? source.actualAssignments
      : fallback.actualAssignments;

  const actualAssignments = assignmentSeed.map((item, index) => ({
    task: String(source.actualAssignments?.[index]?.task || item.task || ''),
    responsible: String(source.actualAssignments?.[index]?.responsible || item.responsible || ''),
    assistants: Array.from({ length: 4 }, (_, assistantIndex) =>
      String(source.actualAssignments?.[index]?.assistants?.[assistantIndex] || item.assistants?.[assistantIndex] || '')
    ),
  }));

  return {
    subtitle: String(source.subtitle || fallback.subtitle),
    leaderResponsibilities: fallback.leaderResponsibilities.map((item, index) => ({
      title: String(source.leaderResponsibilities?.[index]?.title || item.title),
      description: String(source.leaderResponsibilities?.[index]?.description || item.description),
    })),
    core: fallback.core.map((item, index) => ({
      title: String(source.core?.[index]?.title || item.title),
      description: String(source.core?.[index]?.description || item.description),
    })),
    actual: fallback.actual.map((item, index) => ({
      title: String(source.actual?.[index]?.title || item.title),
      description: String(source.actual?.[index]?.description || item.description),
    })),
    actualAssignments: syncDepartmentAssignmentPeople(actualAssignments),
    workflow: fallback.workflow.map((item, index) => String(source.workflow?.[index] || item)),
    indicators: fallback.indicators.map((item, index) => String(source.indicators?.[index] || item)),
  };
}

function syncDepartmentAssignmentPeople(assignments = []) {
  const users = getSystemUsers().filter((item) => item.active !== false);
  if (!users.length) return assignments;

  return assignments.map((item) => ({
    ...item,
    responsible: resolveAssignmentPersonLabel(item.responsible, users),
    assistants: Array.from({ length: 4 }, (_, index) =>
      resolveAssignmentPersonLabel(item.assistants?.[index], users)
    ),
  }));
}

function resolveAssignmentPersonLabel(value, users = []) {
  const original = String(value || '').trim();
  if (!original) return '';
  const normalized = normalizeAssignmentPersonKey(original);
  if (!normalized) return original;

  const direct = users.find((item) => {
    const fullName = normalizeAssignmentPersonKey(item.full_name || '');
    const username = normalizeAssignmentPersonKey(item.username || '');
    return normalized === fullName || normalized === username;
  });
  if (direct) return direct.full_name || direct.username || original;

  const tokens = normalized.split(' ').filter(Boolean);
  const tokenMatch = users.find((item) => {
    const userTokens = normalizeAssignmentPersonKey(item.full_name || item.username || '').split(' ').filter(Boolean);
    return tokens.some((token) =>
      userTokens.some((userToken) => token.length >= 5 && userToken.length >= 5 && token.slice(0, 5) === userToken.slice(0, 5))
    );
  });

  if (tokenMatch) {
    return tokenMatch.full_name || tokenMatch.username || original;
  }

  const aliasMatch = DEPARTMENT_ASSIGNMENT_NAME_ALIASES[normalized];
  return aliasMatch || original;
}

// Predicate va normalizer helperlar dataPredicates.js'ga ko'chirildi.

export function migrateAdminToJaloldinAccount() {
  const users = getSystemUsers();
  if (!users.length) return { updated: 0, removed: 0 };

  const legacyAdmins = users.filter(isLegacyAdminUser);
  const jaloldinAccount = users.find(isJaloldinMirzakbarovUser);

  if (!legacyAdmins.length && (!jaloldinAccount || jaloldinAccount.role === 'admin')) {
    return { updated: 0, removed: 0 };
  }

  let updated = 0;
  let removed = 0;
  let nextUsers = [...users];

  if (jaloldinAccount) {
    nextUsers = nextUsers.map((item) => {
      if (item.id !== jaloldinAccount.id) return item;

      const hadCustomPermissions = Object.prototype.hasOwnProperty.call(item, 'permissions');
      const { permissions, customPermissionsEnabled, ...rest } = item;
      const shouldUpdate =
        item.role !== 'admin' ||
        item.active === false ||
        hadCustomPermissions ||
        customPermissionsEnabled;

      if (shouldUpdate) updated += 1;

      return {
        ...rest,
        role: 'admin',
        active: true,
      };
    });

    const beforeLength = nextUsers.length;
    nextUsers = nextUsers.filter((item) => item.id === jaloldinAccount.id || !isLegacyAdminUser(item));
    removed = beforeLength - nextUsers.length;
  } else if (legacyAdmins.length) {
    const sourceAdmin = legacyAdmins[0];

    nextUsers = nextUsers.map((item) => {
      if (item.id !== sourceAdmin.id) return item;

      const { permissions, customPermissionsEnabled, ...rest } = item;
      updated += 1;

      return {
        ...rest,
        username: 'jaloldin.mirzakbarov',
        full_name: 'Jaloldin Mirzakbarov',
        role: 'admin',
        active: true,
      };
    });

    const beforeLength = nextUsers.length;
    nextUsers = nextUsers.filter((item) => item.id === sourceAdmin.id || !isLegacyAdminUser(item));
    removed = beforeLength - nextUsers.length;
  }

  if (!updated && !removed) {
    return { updated: 0, removed: 0 };
  }

  saveSystemUsers(nextUsers);
  return { updated, removed };
}

export function getCompensatedLoadRegistry() {
  hydrateCompensatedFromRemoteInBackground();
  const raw = getStorageRaw(COMPENSATED_REGISTRY_KEY);
  if (computedCache.compensatedRegistry.raw === raw && computedCache.compensatedRegistry.value) {
    return computedCache.compensatedRegistry.value;
  }

  const saved = readJson(COMPENSATED_REGISTRY_KEY, []);
  const value = normalizeCompensatedRegistry(saved);
  computedCache.compensatedRegistry = { raw, value };
  return value;
}

export function saveCompensatedLoadRegistry(items) {
  writeJson(COMPENSATED_REGISTRY_KEY, normalizeCompensatedRegistry(items));
  scheduleCompensatedRemoteSync();
}

export function importCompensatedLoadRegistry(items = [], options = {}) {
  const current = getCompensatedLoadRegistry();
  const index = new Map(current.map((item) => [normalizeTrackCode(item.trackCode), item]));
  let inserted = 0;
  let updated = 0;

  normalizeCompensatedRegistry(items).forEach((item) => {
    const key = normalizeTrackCode(item.trackCode);
    if (!key) return;
    if (index.has(key)) {
      updated += 1;
    } else {
      inserted += 1;
    }
    index.set(key, {
      ...(index.get(key) || {}),
      ...item,
      updatedAt: new Date().toISOString(),
    });
  });

  const next = Array.from(index.values()).sort((left, right) => left.trackCode.localeCompare(right.trackCode));
  saveCompensatedLoadRegistry(next);
  appendAuditLogs([
    createAuditLog('compensated_registry_import', null, resolveActorMeta(options.actor), {
      message: `${inserted} ta yangi qoplab berilgan yuk yozuvi yuklandi`,
      details: { inserted, updated, total: next.length },
    }),
  ]);

  return { inserted, updated, total: next.length };
}

export function updateCompensatedRecoveryWorkflow(trackCode, updates = {}, options = {}) {
  const key = normalizeTrackCode(trackCode);
  if (!key) return { ok: false, reason: 'invalid_track' };

  const current = getCompensatedLoadRegistry();
  const index = current.findIndex((item) => normalizeTrackCode(item.trackCode) === key);
  const baseItem = index === -1
    ? {
        id: `compensated-registry-${Date.now()}`,
        trackCode: String(trackCode || '').trim(),
        compensatedDate: '',
        phone: '',
        customer: '',
        paymentAmount: '',
        paymentStatus: 'Kutmoqda',
        comment: '',
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    : current[index];

  const next = [...current];
  const nextOutcome = String(updates.foundCaseOutcome ?? baseItem.foundCaseOutcome ?? '').trim();
  const nextStatus = normalizeCompensatedRecoveryStatus(updates.foundResolutionStatus ?? baseItem.foundResolutionStatus);

  // Chek fayli — faqat "Mijoz pulni qaytardi" natija uchun saqlanadi
  let nextReceipt = baseItem.receiptFile || null;
  if (Object.prototype.hasOwnProperty.call(updates, 'receiptFile')) {
    nextReceipt = updates.receiptFile || null;
  }
  // Agar natija "Mijoz pulni qaytardi" emas bo'lsa, chekni avtomatik tozalash
  if (nextOutcome !== 'Mijoz pulni qaytardi') {
    nextReceipt = null;
  }

  // Hodimga biriktirish mantig'i:
  // - Foydalanuvchi statusni "Jarayonda"ga aniq tanlasa, ushbu hodimga biriktirish
  //   (avvalgi status nima bo'lganidan qat'iy nazar — eski yozuvlar bilan ham ishlashi uchun)
  // - "Qabul qilindi"ga qaytarilsa biriktirishni bekor qilish
  const actor = resolveActorMeta(options.actor);
  let assignedTo = baseItem.assignedTo || '';
  let assignedToId = baseItem.assignedToId || null;
  let assignedAt = baseItem.assignedAt || null;

  const statusExplicitlySet = Object.prototype.hasOwnProperty.call(updates, 'foundResolutionStatus');

  if (Object.prototype.hasOwnProperty.call(updates, 'assignedTo')) {
    // Aniq biriktirish
    assignedTo = String(updates.assignedTo || '').trim();
    assignedToId = updates.assignedToId ?? null;
    assignedAt = updates.assignedAt || (assignedTo ? new Date().toISOString() : null);
  } else if (statusExplicitlySet && (nextStatus === 'Jarayonda' || nextStatus === 'Yopildi')) {
    // Status "Jarayonda"ga yoki "Yopildi"ga aniq tanlandi — hozirgi hodimga biriktirish
    // Jarayonda: kim olgan bo'lsa
    // Yopildi: kim yopgan bo'lsa
    const actorName = actor?.actorName;
    if (actorName && actorName !== 'System') {
      assignedTo = actorName;
      assignedToId = actor?.actorId ?? null;
      assignedAt = new Date().toISOString();
    }
  } else if (statusExplicitlySet && nextStatus === 'Qabul qilindi') {
    // Qabul qilindiga qaytarilsa biriktirish bekor qilinadi
    assignedTo = '';
    assignedToId = null;
    assignedAt = null;
  }

  // Workflow izohi
  let workflowComment = baseItem.workflowComment || '';
  if (Object.prototype.hasOwnProperty.call(updates, 'workflowComment')) {
    workflowComment = String(updates.workflowComment || '').trim();
  }

  const nextItem = {
    ...baseItem,
    foundCaseOutcome: nextOutcome,
    foundResolutionStatus: nextStatus,
    receiptFile: nextReceipt,
    assignedTo,
    assignedToId,
    assignedAt,
    workflowComment,
    updatedAt: new Date().toISOString(),
  };
  if (index === -1) {
    next.push(nextItem);
  } else {
    next[index] = nextItem;
  }

  saveCompensatedLoadRegistry(next);
  appendAuditLogs([
    createAuditLog(index === -1 ? 'compensated_recovery_workflow_created' : 'compensated_recovery_workflow_updated', null, resolveActorMeta(options.actor), {
      message: `${nextItem.trackCode} bo'yicha topilgan yuk jarayoni yangilandi`,
      details: {
        trackCode: nextItem.trackCode,
        foundCaseOutcome: nextItem.foundCaseOutcome,
        foundResolutionStatus: nextItem.foundResolutionStatus,
      },
    }),
  ]);

  return { ok: true, item: nextItem };
}

export function getOtkAuditLogs(limit = null) {
  const raw = getStorageRaw(AUDIT_KEY);
  if (computedCache.audit.raw === raw && computedCache.audit.value) {
    return typeof limit === 'number' ? computedCache.audit.value.slice(0, limit) : computedCache.audit.value;
  }

  const value = readJson(AUDIT_KEY, []);
  computedCache.audit = { raw, value };
  return typeof limit === 'number' ? value.slice(0, limit) : value;
}

function appendAuditLogs(items = []) {
  if (!items.length) return;
  const current = getOtkAuditLogs();
  const next = [...items, ...current].slice(0, MAX_AUDIT_LOGS);
  writeJson(AUDIT_KEY, next);
}

export function runAppDataMigrations() {
  const completed = readJson(MIGRATIONS_KEY, []);
  const migrations = [
    {
      id: '2026-05-16-transfer-admin-to-jaloldin',
      run: migrateAdminToJaloldinAccount,
      shouldPersist: (result) => result.updated > 0 || result.removed > 0,
    },
    {
      id: '2026-05-15-refresh-department-order-core',
      run: migrateDepartmentOrderCoreTasks,
      shouldPersist: (result) => result.updated > 0,
    },
    {
      id: '2026-05-15-add-department-order-assignments',
      run: migrateDepartmentOrderAssignments,
      shouldPersist: (result) => result.updated > 0,
    },
    {
      id: '2026-05-12-close-isfandiyor-active',
      run: migrateIsfandiyorInProgressEntries,
      shouldPersist: (result) => result.updated > 0,
    },
    {
      id: '2026-05-12-dedupe-tracks-keep-first-owner',
      run: dedupeTracksKeepFirstOwner,
      shouldPersist: () => false,
    },
    {
      // Recovery workflow: orphan items (status='Jarayonda' lekin egasi yo'q)
      // ni 'Qabul qilindi'ga qaytarish — yangi UX talabiga muvofiq.
      // alwaysRun: true — bir martalik gate bilan emas, har safar tekshiriladi
      // (idempotent; orphan bo'lmasa hech narsa o'zgarmaydi)
      id: '2026-05-23-recovery-reset-orphan-jarayonda',
      run: migrateRecoveryOrphansToAccepted,
      shouldPersist: () => false,
      alwaysRun: true,
    },
    {
      // Inaktiv hodimlar (Isfandiyor, Abduvali) treklarini Bosh manager ga o'tkazish
      // Barcha modullarda: OTK, 102, 104, AI
      // alwaysRun: idempotent (mavjud bo'lmasa hech narsa o'zgarmaydi)
      id: '2026-05-23-reassign-inactive-employees',
      run: migrateInactiveEmployeesToBoshManager,
      shouldPersist: () => false,
      alwaysRun: true,
    },
  ];

  const nextCompleted = [...completed];
  const results = [];

  migrations.forEach((migration) => {
    // alwaysRun migratsiyalari completed ro'yxatga e'tibor bermay har safar ishlaydi
    if (!migration.alwaysRun && nextCompleted.includes(migration.id)) {
      results.push({ migrationId: migration.id, ran: false, updated: 0, removed: 0 });
      return;
    }

    const result = migration.run();
    results.push({
      migrationId: migration.id,
      ran: Boolean(result?.updated || result?.removed || result?.distributedTo),
      ...result,
    });
    if (!migration.alwaysRun && migration.shouldPersist(result)) {
      nextCompleted.push(migration.id);
    }
  });

  if (nextCompleted.length !== completed.length) {
    writeJson(MIGRATIONS_KEY, nextCompleted);
  }

  return results;
}

export function migrateDepartmentOrderCoreTasks() {
  const settings = getOtkSettings();
  const currentCore = settings.departmentOrderContent?.core || [];
  const legacyTitles = [
    'Murojaatlarni tizimli nazorat qilish',
    "Yo'qolgan va kechikkan yuklarni boshqarish",
    "Bo'limlararo muvofiqlashtirish",
    "Hisobot va sifat ko'rsatkichlari",
  ];
  const shouldReplace =
    !currentCore.length ||
    currentCore.length <= 4 ||
    legacyTitles.some((title, index) => currentCore[index]?.title === title);

  if (!shouldReplace) {
    return { updated: 0 };
  }

  saveOtkSettings({
    ...settings,
    departmentOrderContent: {
      ...(settings.departmentOrderContent || {}),
      core: DEFAULT_DEPARTMENT_ORDER_CONTENT.core,
    },
  });

  return { updated: DEFAULT_DEPARTMENT_ORDER_CONTENT.core.length };
}

export function migrateDepartmentOrderAssignments() {
  const settings = getOtkSettings();
  const currentAssignments = settings.departmentOrderContent?.actualAssignments || [];
  const hasCyrillic = currentAssignments.some((item) =>
    [item.task, item.responsible, ...(item.assistants || [])].some((value) => /[\u0400-\u04FF]/.test(String(value || '')))
  );

  if (currentAssignments.length >= DEFAULT_DEPARTMENT_ORDER_CONTENT.actualAssignments.length && !hasCyrillic) {
    return { updated: 0 };
  }

  saveOtkSettings({
    ...settings,
    departmentOrderContent: {
      ...(settings.departmentOrderContent || {}),
      actualAssignments: DEFAULT_DEPARTMENT_ORDER_CONTENT.actualAssignments,
    },
  });

  return { updated: DEFAULT_DEPARTMENT_ORDER_CONTENT.actualAssignments.length };
}

export function getOtkEntries() {
  hydrateComplaintsFromRemoteInBackground();
  const raw = getStorageRaw(ENTRIES_KEY);
  if (computedCache.entries.raw === raw && computedCache.entries.value) {
    return computedCache.entries.value;
  }

  const value = applyPriorityRules(normalizeEntries(decodeEntryCollection(readJson(ENTRIES_KEY, []))));
  computedCache.entries = { raw, value };
  return value;
}

export function getOtkArchive() {
  hydrateComplaintsFromRemoteInBackground();
  const raw = getStorageRaw(ARCHIVE_KEY);
  if (computedCache.archive.raw === raw && computedCache.archive.value) {
    return computedCache.archive.value;
  }

  const value = normalizeEntries(decodeEntryCollection(readJson(ARCHIVE_KEY, [])));
  computedCache.archive = { raw, value };
  return value;
}

export function saveOtkEntries(entries) {
  writeJson(ENTRIES_KEY, encodeEntryCollection(normalizeEntries(entries)));
  scheduleComplaintsRemoteSync();
}

export function saveOtkArchive(entries) {
  writeJson(ARCHIVE_KEY, encodeEntryCollection(normalizeEntries(entries)));
  scheduleComplaintsRemoteSync();
}

export function addOtkEntries(entries, options = {}) {
  const current = getOtkEntries();
  const normalized = normalizeEntries(entries).map((entry) =>
    entry.status === 'Yopildi' && !entry.closedAt
      ? { ...entry, closedAt: new Date().toISOString() }
      : entry
  );
  const { accepted, duplicates } = splitEntriesByActiveTrackConflicts(normalized, current);
  const next = applyPriorityRules([...accepted, ...current]);
  saveOtkEntries(next);
  const actor = resolveActorMeta(options.actor, normalized[0]);
  appendAuditLogs(
    accepted.map((entry) =>
      createAuditLog('create', entry, actor, {
        message: `${entry.trackCode} trek kiritildi`,
      })
    )
  );
  if (duplicates.length) {
    appendAuditLogs([
      createAuditLog('duplicate_skipped', duplicates[0], actor, {
        message: `${duplicates.length} ta takror trek kiritilmadi`,
        details: {
          tracks: duplicates.map((entry) => entry.trackCode),
        },
      }),
    ]);
  }

  return {
    items: next,
    inserted: accepted.length,
    skippedDuplicates: duplicates.length,
    duplicateTracks: duplicates.map((entry) => entry.trackCode),
  };
}

export function importOtkEntries(entries, options = {}) {
  const mode = options.mode === 'replace' ? 'replace' : 'merge';
  const incoming = applyPriorityRules(normalizeEntries(entries));
  const incomingActive = incoming.filter((entry) => entry.status !== 'Yopildi');
  const incomingArchive = incoming.filter((entry) => entry.status === 'Yopildi');

  if (mode === 'replace') {
    saveOtkEntries(incomingActive);
    saveOtkArchive(incomingArchive);
    appendAuditLogs([
      createAuditLog('import_replace', null, resolveActorMeta(options.actor), {
        message: `${incoming.length} ta yozuv Excel orqali to'liq almashtirildi`,
        details: {
          total: incoming.length,
          active: incomingActive.length,
          archived: incomingArchive.length,
        },
      }),
    ]);
    return {
      mode,
      inserted: incoming.length,
      updated: 0,
      total: incoming.length,
      active: incomingActive.length,
      archived: incomingArchive.length,
    };
  }

  const activeResult = mergeEntryLists(getOtkEntries(), incomingActive);
  const archiveResult = mergeEntryLists(getOtkArchive(), incomingArchive);

  const incomingActiveKeys = new Set(incomingActive.map((entry) => buildImportKey(entry)));
  const incomingArchiveKeys = new Set(incomingArchive.map((entry) => buildImportKey(entry)));

  const nextActive = activeResult.items.filter((entry) => !incomingArchiveKeys.has(buildImportKey(entry)));
  const nextArchive = archiveResult.items.filter((entry) => !incomingActiveKeys.has(buildImportKey(entry)));

  saveOtkEntries(nextActive);
  saveOtkArchive(nextArchive);

  appendAuditLogs([
    createAuditLog('import_merge', null, resolveActorMeta(options.actor), {
      message: `${activeResult.inserted + archiveResult.inserted} ta yangi yozuv import qilindi`,
      details: {
        inserted: activeResult.inserted + archiveResult.inserted,
        updated: activeResult.updated + archiveResult.updated,
        active: nextActive.length,
        archived: nextArchive.length,
      },
    }),
  ]);

  return {
    mode,
    inserted: activeResult.inserted + archiveResult.inserted,
    updated: activeResult.updated + archiveResult.updated,
    total: nextActive.length + nextArchive.length,
    active: nextActive.length,
    archived: nextArchive.length,
  };
}

export function getOtkEntryById(id) {
  return getOtkEntries().find((entry) => entry.id === id)
    || getOtkArchive().find((entry) => entry.id === id)
    || null;
}

export function updateOtkEntry(id, changes, options = {}) {
  const active = getOtkEntries();
  const archive = getOtkArchive();
  const currentEntry = active.find((entry) => entry.id === id) || archive.find((entry) => entry.id === id);

  if (!currentEntry) return { ok: false, reason: 'not_found' };

  const nextTrackCode = String(changes.trackCode || currentEntry.trackCode || '').trim();
  const conflicts = findTrackConflicts([nextTrackCode], { excludeId: id });
  if (conflicts.some((item) => item.activeCount > 0)) {
    return { ok: false, reason: 'duplicate_track', conflicts };
  }

  const nextStatus = changes.status || currentEntry.status;

  // Avtomatik biriktirish:
  // Foydalanuvchi statusni "Jarayonda"ga aniq tanlasa — handledBy
  // hozirgi hodimga o'zgartiriladi (kim oxirgi marta jarayonga olsa, shu egasi).
  // Agar handledBy explicit boshqa qiymat berilgan bo'lsa, uni saqlaymiz.
  const actor = resolveActorMeta(options.actor, currentEntry);
  const statusExplicitlySet = Object.prototype.hasOwnProperty.call(changes, 'status');
  let resolvedChanges = { ...changes };
  const handledByExplicit =
    Object.prototype.hasOwnProperty.call(changes, 'handledBy') &&
    changes.handledBy &&
    changes.handledBy !== 'OTK workplace';

  if (statusExplicitlySet && nextStatus === 'Jarayonda' && !handledByExplicit) {
    const actorName = actor?.actorName;
    if (actorName && actorName !== 'System' && actorName !== 'OTK workplace') {
      resolvedChanges = {
        ...resolvedChanges,
        handledBy: actorName,
        handledById: actor.actorId ?? resolvedChanges.handledById ?? null,
        handledByRole: actor.actorRole ?? resolvedChanges.handledByRole ?? '',
      };
    }
  }

  const updatedEntry = normalizeOtkEntry({
    ...currentEntry,
    ...resolvedChanges,
    closedAt:
      nextStatus === 'Yopildi'
        ? currentEntry.status === 'Yopildi'
          ? currentEntry.closedAt || currentEntry.updatedAt || new Date().toISOString()
          : new Date().toISOString()
        : resolvedChanges.closedAt ?? currentEntry.closedAt ?? '',
    updatedAt: new Date().toISOString(),
  });

  const activeWithoutCurrent = active.filter((entry) => entry.id !== id);
  const archiveWithoutCurrent = archive.filter((entry) => entry.id !== id);
  const wasArchived = archive.some((entry) => entry.id === id);

  if (currentEntry.status !== 'Yopildi' && updatedEntry.status === 'Yopildi') {
    saveOtkArchive(archiveWithoutCurrent);
    saveOtkEntries(applyPriorityRules([updatedEntry, ...activeWithoutCurrent]));
    appendAuditLogs([
      createAuditLog('update', updatedEntry, resolveActorMeta(options.actor, updatedEntry), {
        message: `${updatedEntry.trackCode} trek yangilandi va yopildi`,
        details: buildChangeSummary(currentEntry, updatedEntry),
      }),
    ]);
    return { ok: true, entry: updatedEntry };
  }

  if (currentEntry.status === 'Yopildi' && updatedEntry.status === 'Yopildi') {
    if (wasArchived) {
      saveOtkEntries(activeWithoutCurrent);
      saveOtkArchive(normalizeEntries([updatedEntry, ...archiveWithoutCurrent]));
    } else {
      saveOtkArchive(archiveWithoutCurrent);
      saveOtkEntries(applyPriorityRules([updatedEntry, ...activeWithoutCurrent]));
    }
    appendAuditLogs([
      createAuditLog('update', updatedEntry, resolveActorMeta(options.actor, updatedEntry), {
        message: `${updatedEntry.trackCode} yopilgan trek yangilandi`,
        details: buildChangeSummary(currentEntry, updatedEntry),
      }),
    ]);
    return { ok: true, entry: updatedEntry };
  }

  saveOtkArchive(archiveWithoutCurrent);
  saveOtkEntries(applyPriorityRules([updatedEntry, ...activeWithoutCurrent]));
  appendAuditLogs([
    createAuditLog('update', updatedEntry, resolveActorMeta(options.actor, updatedEntry), {
      message: `${updatedEntry.trackCode} trek yangilandi`,
      details: buildChangeSummary(currentEntry, updatedEntry),
    }),
  ]);
  return { ok: true, entry: updatedEntry };
}

export function archiveClosedEntriesByDayEnd(now = new Date(), options = {}) {
  const todayKey = toDateKey(now);
  if (!todayKey) return { archived: 0, remaining: getOtkEntries() };

  const current = getOtkEntries();
  const archive = getOtkArchive();
  const toArchive = current
    .filter((entry) => {
      if (entry.status !== 'Yopildi') return false;
      const closeKey = toDateKey(entry.closedAt || entry.updatedAt || entry.date);
      return closeKey && closeKey < todayKey;
    })
    .map((entry) => ({ ...entry, archivedAt: new Date().toISOString() }));

  if (!toArchive.length) {
    return { archived: 0, remaining: current };
  }

  const archivedIds = new Set(toArchive.map((entry) => entry.id));
  const remaining = current.filter((entry) => !archivedIds.has(entry.id));

  saveOtkEntries(remaining);
  saveOtkArchive(normalizeEntries([...toArchive, ...archive]));
  appendAuditLogs([
    createAuditLog('auto_archive_closed', null, resolveActorMeta(options.actor), {
      message: `${toArchive.length} ta yopilgan trek avtomatik arxivga o'tdi`,
      details: {
        date: todayKey,
        count: toArchive.length,
      },
    }),
  ]);

  return { archived: toArchive.length, remaining };
}

export function deleteOtkEntry(id, options = {}) {
  const active = getOtkEntries();
  const archive = getOtkArchive();
  const entry = active.find((item) => item.id === id) || archive.find((item) => item.id === id);

  if (!entry) return null;

  const isArchived = entry.status === 'Yopildi' || archive.some((item) => item.id === id);
  if (isArchived) {
    saveOtkArchive(archive.filter((item) => item.id !== id));
  } else {
    saveOtkEntries(active.filter((item) => item.id !== id));
  }

  appendAuditLogs([
    createAuditLog('delete', entry, resolveActorMeta(options.actor, entry), {
      message: `${entry.trackCode} trek o'chirildi`,
      details: {
        from: isArchived ? 'archive' : 'active',
      },
    }),
  ]);

  if (typeof window !== 'undefined' && supabase.isSupabaseEnabled) {
    Promise.resolve()
      .then(() => supabase.markComplaintDeletedRemote(id))
      .catch(() => {
        // local delete already applied
      });
  }

  return entry;
}

export function migrateIsfandiyorInProgressEntries() {
  const active = getOtkEntries();
  const archive = getOtkArchive();
  const users = getSystemUsers().filter((user) => user.active !== false);
  const targetUsers = users.filter((user) => !isIsfandiyorLabel(user.full_name) && !isIsfandiyorLabel(user.username));
  const matchingEntries = active.filter((entry) => entry.status === 'Jarayonda' && isIsfandiyorLabel(entry.handledBy));

  if (!matchingEntries.length || !targetUsers.length) {
    return { updated: 0, distributedTo: 0 };
  }

  const activeWithoutMatches = active.filter((entry) => !(entry.status === 'Jarayonda' && isIsfandiyorLabel(entry.handledBy)));
  const workloadEntries = [...activeWithoutMatches, ...archive];
  const workloadMap = new Map(targetUsers.map((user) => [String(user.id), countAssignedEntries(workloadEntries, user)]));
  const sortedTargets = targetUsers
    .slice()
    .sort((left, right) =>
      String(left.full_name || left.username || left.id).localeCompare(String(right.full_name || right.username || right.id))
    );
  const now = new Date().toISOString();

  const migratedEntries = matchingEntries
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.trackCode).localeCompare(String(b.trackCode)))
    .map((entry) => {
      const targetUser = sortedTargets
        .slice()
        .sort((left, right) => {
          const leftCount = workloadMap.get(String(left.id)) || 0;
          const rightCount = workloadMap.get(String(right.id)) || 0;
          if (leftCount !== rightCount) return leftCount - rightCount;
          return String(left.full_name || left.username || left.id).localeCompare(String(right.full_name || right.username || right.id));
        })[0];

      workloadMap.set(String(targetUser.id), (workloadMap.get(String(targetUser.id)) || 0) + 1);

      return normalizeOtkEntry({
        ...entry,
        status: 'Yopildi',
        handledBy: targetUser.full_name || targetUser.username || 'OTK workplace',
        handledById: targetUser.id ?? null,
        handledByRole: targetUser.role || '',
        lastUpdatedBy: 'System migration',
        lastUpdatedByRole: 'system',
        updatedAt: now,
      });
    });

  saveOtkEntries(activeWithoutMatches);
  saveOtkArchive(normalizeEntries([...migratedEntries, ...archive]));
  appendAuditLogs([
    createAuditLog('migration', null, null, {
      message: `${migratedEntries.length} ta Isfandiyor treki yopildi va taqsimlandi`,
      details: {
        updated: migratedEntries.length,
        distributedTo: targetUsers.length,
      },
    }),
  ]);

  return { updated: migratedEntries.length, distributedTo: targetUsers.length };
}

// ============================================================
// Inaktiv hodimlar (Isfandiyor, Abduvali) treklarini 4 ta faol hodimga
// TENG taqsimlash (round-robin + workload balance):
//   Jaloldin Mirzakbarov, Saidali, Jasur, Shahnoza
// Barcha modullarda: OTK, Module 102, 104 Moliya, Assistant AI
// ============================================================
// Settings'dan inaktiv hodimlar ro'yxatini o'qish (default'lar: isfandiyor, abduvali)
function getInactiveEmployeeNames() {
  const settings = getOtkSettings();
  return Array.isArray(settings.inactiveEmployeeNames) && settings.inactiveEmployeeNames.length
    ? settings.inactiveEmployeeNames.map((s) => String(s).toLowerCase())
    : ['isfandiyor', 'abduvali'];
}

function isInactiveEmployee(value) {
  const norm = normalizePersonLabel(value);
  if (!norm) return false;
  return getInactiveEmployeeNames().some((pattern) => norm.includes(pattern));
}

function buildTargetEmployees() {
  // System users'dan mos hodimlarni topish; topilmasa fallback
  const users = getSystemUsers().filter((u) => u.active !== false);
  const settings = getOtkSettings();
  const targets = Array.isArray(settings.activeTargetEmployees) && settings.activeTargetEmployees.length
    ? settings.activeTargetEmployees
    : [
        { key: 'jaloldin', fallbackName: 'Jaloldin Mirzakbarov', fallbackRole: 'admin' },
        { key: 'saidali', fallbackName: 'Saidali', fallbackRole: 'manager' },
        { key: 'jasur', fallbackName: 'Jasur', fallbackRole: 'manager' },
        { key: 'shahnoza', fallbackName: 'Shahnoza', fallbackRole: 'manager' },
      ];
  return targets.map((pattern) => {
    const match = users.find((u) => {
      const full = String(u.full_name || '').toLowerCase();
      const uname = String(u.username || '').toLowerCase();
      return full.includes(pattern.key) || uname.includes(pattern.key);
    });
    if (match) {
      return {
        id: match.id ?? null,
        name: match.full_name || match.username || pattern.fallbackName,
        role: match.role || pattern.fallbackRole,
      };
    }
    return { id: null, name: pattern.fallbackName, role: pattern.fallbackRole };
  });
}

// Round-robin + workload balance picker
function makeBalancedPicker(targets, initialLoad = {}) {
  // initialLoad: { name -> count }  — boshlang'ich yuklama
  const load = new Map(targets.map((t) => [t.name, initialLoad[t.name] || 0]));
  return () => {
    let minName = null;
    let minCount = Infinity;
    // Birinchi (eng kam yuklangan) hodimni topish (deterministik tartibda)
    for (const t of targets) {
      const c = load.get(t.name) || 0;
      if (c < minCount) {
        minCount = c;
        minName = t.name;
      }
    }
    if (!minName) minName = targets[0].name;
    load.set(minName, (load.get(minName) || 0) + 1);
    return targets.find((t) => t.name === minName) || targets[0];
  };
}

function countByOwner(items, getOwner) {
  const counts = {};
  for (const item of items || []) {
    const name = String(getOwner(item) || '').trim();
    if (!name) continue;
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

export function migrateInactiveEmployeesToBoshManager() {
  const targets = buildTargetEmployees();
  if (!targets.length) return { updated: 0 };

  const now = new Date().toISOString();
  let totalUpdated = 0;
  const targetNames = targets.map((t) => t.name);

  // Mavjud yuklamani hisoblash (faqat aktiv yozuvlar)
  const otkActive = getOtkEntries();
  const otkArchive = getOtkArchive();
  const registry = getCompensatedLoadRegistry();
  const aiRequests = Array.isArray(readJson(ASSISTANT_AI_KEY, [])) ? readJson(ASSISTANT_AI_KEY, []) : [];
  let m102Items = [];
  try {
    const raw = localStorage.getItem('cargo-qc-module-102');
    if (raw) m102Items = JSON.parse(raw) || [];
  } catch { /* ignore */ }

  // Inaktiv emas + targetNames ichidagi yozuvlar bo'yicha mavjud yuklamani hisoblash
  const filterValid = (val) => targetNames.includes(String(val || '').trim());
  const initialLoad = {};
  for (const name of targetNames) initialLoad[name] = 0;

  const addLoad = (items, getOwner) => {
    for (const item of items) {
      const owner = String(getOwner(item) || '').trim();
      if (filterValid(owner)) {
        initialLoad[owner] = (initialLoad[owner] || 0) + 1;
      }
    }
  };
  addLoad(otkActive, (e) => e.handledBy);
  addLoad(registry, (e) => e.assignedTo);
  addLoad(aiRequests, (e) => e.handledBy);
  addLoad(m102Items, (e) => e.lockedBy);

  const pick = makeBalancedPicker(targets, initialLoad);

  // 1) OTK Murojaatlar (faol + arxiv)
  let otkActiveChanged = false;
  const otkActiveNext = otkActive.map((entry) => {
    if (!isInactiveEmployee(entry.handledBy) && !isInactiveEmployee(entry.lastUpdatedBy)) return entry;
    const assignee = pick();
    totalUpdated += 1;
    otkActiveChanged = true;
    return normalizeOtkEntry({
      ...entry,
      handledBy: assignee.name,
      handledById: assignee.id,
      handledByRole: assignee.role,
      lastUpdatedBy: assignee.name,
      lastUpdatedById: assignee.id,
      lastUpdatedByRole: assignee.role,
      updatedAt: now,
    });
  });
  let otkArchiveChanged = false;
  const otkArchiveNext = otkArchive.map((entry) => {
    if (!isInactiveEmployee(entry.handledBy)) return entry;
    const assignee = pick();
    totalUpdated += 1;
    otkArchiveChanged = true;
    return normalizeOtkEntry({
      ...entry,
      handledBy: assignee.name,
      handledById: assignee.id,
      handledByRole: assignee.role,
      updatedAt: now,
    });
  });
  if (otkActiveChanged) saveOtkEntries(otkActiveNext);
  if (otkArchiveChanged) saveOtkArchive(otkArchiveNext);

  // 2) 104 Moliya — assignedTo
  let registryChanged = false;
  const registryNext = registry.map((item) => {
    if (!isInactiveEmployee(item?.assignedTo)) return item;
    const assignee = pick();
    totalUpdated += 1;
    registryChanged = true;
    return {
      ...item,
      assignedTo: assignee.name,
      assignedToId: assignee.id,
      assignedAt: item.assignedAt || now,
      updatedAt: now,
    };
  });
  if (registryChanged) saveCompensatedLoadRegistry(registryNext);

  // 3) Assistant AI requests
  if (Array.isArray(aiRequests) && aiRequests.length) {
    let aiChanged = false;
    const aiNext = aiRequests.map((req) => {
      if (!isInactiveEmployee(req?.handledBy)) return req;
      const assignee = pick();
      totalUpdated += 1;
      aiChanged = true;
      return { ...req, handledBy: assignee.name, updatedAt: now };
    });
    if (aiChanged) writeJson(ASSISTANT_AI_KEY, aiNext);
  }

  // 4) Module 102 — lockedBy
  try {
    if (Array.isArray(m102Items) && m102Items.length) {
      let m102Changed = false;
      const next102 = m102Items.map((entry) => {
        if (!isInactiveEmployee(entry?.lockedBy)) return entry;
        const assignee = pick();
        totalUpdated += 1;
        m102Changed = true;
        return { ...entry, lockedBy: assignee.name, lockedAt: entry.lockedAt || now, updatedAt: now };
      });
      if (m102Changed) localStorage.setItem('cargo-qc-module-102', JSON.stringify(next102));
    }
  } catch {
    // Module 102 — silent fail
  }

  if (totalUpdated > 0) {
    appendAuditLogs([
      createAuditLog('migration', null, null, {
        message: `Inaktiv hodimlar (${getInactiveEmployeeNames().join(', ')}) ${totalUpdated} ta yozuvi ${targetNames.join(', ')} orasida teng taqsimlandi`,
        details: { updated: totalUpdated, targets: targetNames },
      }),
    ]);
  }

  return { updated: totalUpdated, targets: targetNames };
}

// Recovery workflow migration:
// Eski yozuvlarda foundResolutionStatus='Jarayonda' edi (default), lekin
// hodim biriktirilmagan. Bularni 'Qabul qilindi'ga qaytaramiz — yangi UX bo'yicha.
export function migrateRecoveryOrphansToAccepted() {
  const registry = getCompensatedLoadRegistry();
  if (!Array.isArray(registry) || registry.length === 0) {
    return { updated: 0 };
  }

  let updated = 0;
  const next = registry.map((item) => {
    const status = normalizeCompensatedRecoveryStatus(item?.foundResolutionStatus);
    const hasOwner = Boolean(String(item?.assignedTo || '').trim() || item?.assignedToId);
    if (status === 'Jarayonda' && !hasOwner) {
      updated += 1;
      return {
        ...item,
        foundResolutionStatus: 'Qabul qilindi',
        updatedAt: new Date().toISOString(),
      };
    }
    return item;
  });

  if (updated > 0) {
    saveCompensatedLoadRegistry(next);
  }
  return { updated };
}

export function dedupeTracksKeepFirstOwner() {
  const active = getOtkEntries();
  const archive = getOtkArchive();
  const all = [
    ...active.map((entry) => ({ ...entry, archiveStatus: 'active' })),
    ...archive.map((entry) => ({ ...entry, archiveStatus: 'archived' })),
  ];

  const groups = new Map();
  all.forEach((entry) => {
    const key = normalizeTrackCode(entry.trackCode);
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  });

  const keepIds = new Set();
  const removedEntries = [];
  let affectedGroups = 0;

  groups.forEach((entries) => {
    if (entries.length <= 1) {
      keepIds.add(entries[0]?.id);
      return;
    }

    if (findCompensatedRecoveryPair(entries)) {
      entries.forEach((entry) => keepIds.add(entry.id));
      return;
    }

    affectedGroups += 1;
    const sorted = entries
      .slice()
      .sort((left, right) => compareTrackEntryOrder(left, right));

    keepIds.add(sorted[0].id);
    removedEntries.push(...sorted.slice(1));
  });

  if (!removedEntries.length) {
    return { removed: 0, affectedGroups: 0 };
  }

  const nextActive = active.filter((entry) => keepIds.has(entry.id));
  const nextArchive = archive.filter((entry) => keepIds.has(entry.id));

  saveOtkEntries(nextActive);
  saveOtkArchive(nextArchive);
  appendAuditLogs([
    createAuditLog('dedupe', null, null, {
      message: `${removedEntries.length} ta takror trek o'chirildi, birinchi kiritilgan yozuv qoldi`,
      details: {
        removed: removedEntries.length,
        affectedGroups,
        tracks: removedEntries.slice(0, 30).map((entry) => entry.trackCode),
      },
    }),
  ]);

  return { removed: removedEntries.length, affectedGroups };
}

export function archiveEntriesForDate(date = new Date(), options = {}) {
  const target = toDateKey(date);
  const current = getOtkEntries();
  const archive = getOtkArchive();
  const toArchive = current
    .filter((entry) => toDateKey(entry.date) === target)
    .map((entry) => ({ ...entry, archivedAt: new Date().toISOString() }));
  const remaining = current.filter((entry) => toDateKey(entry.date) !== target);

  saveOtkEntries(remaining);
  saveOtkArchive([...toArchive, ...archive]);
  appendAuditLogs([
    createAuditLog('archive_day', null, resolveActorMeta(options.actor), {
      message: `${target} sanasidagi ${toArchive.length} ta trek arxivlandi`,
      details: {
        date: target,
        count: toArchive.length,
      },
    }),
  ]);

  return { archived: toArchive.length, remaining };
}

export function getRecoveredCompensatedLoads() {
  return buildRecoveredCompensatedLoads(getAllOtkRecords());
}

export function getAllOtkRecords() {
  const entriesRaw = getStorageRaw(ENTRIES_KEY);
  const archiveRaw = getStorageRaw(ARCHIVE_KEY);

  if (
    computedCache.allRecords.entriesRaw === entriesRaw
    && computedCache.allRecords.archiveRaw === archiveRaw
    && computedCache.allRecords.value
  ) {
    return computedCache.allRecords.value;
  }

  const value = [
    ...getOtkEntries().map((entry) => ({ ...entry, archiveStatus: 'active' })),
    ...getOtkArchive().map((entry) => ({ ...entry, archiveStatus: 'archived' })),
  ];

  computedCache.allRecords = { entriesRaw, archiveRaw, value };
  return value;
}

export function getOtkDashboardStats(range = {}, options = {}) {
  const entriesRaw = getStorageRaw(ENTRIES_KEY);
  const archiveRaw = getStorageRaw(ARCHIVE_KEY);
  const settingsRaw = getStorageRaw(SETTINGS_KEY);
  const auditRaw = getStorageRaw(AUDIT_KEY);
  const reportYear = options.reportYear || '';
  const cacheKey = [entriesRaw || '', archiveRaw || '', settingsRaw || '', auditRaw || '', range.from || '', range.to || '', reportYear].join('::');
  const cached = computedCache.dashboard.get(cacheKey);
  if (cached) {
    return cached;
  }

  const active = getOtkEntries();
  const archive = getOtkArchive();
  const configuredSources = getOtkSettings().requestSources || [];
  const auditLogs = getOtkAuditLogs(8);
  const from = range.from || '';
  const to = range.to || '';
  const weekDates = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return toDateKey(date);
  });
  const weekSet = new Set(weekDates);
  const weekTotals = new Map(weekDates.map((key) => [key, { total: 0, resolved: 0 }]));
  const typeMap = new Map();
  const sourceMap = new Map();
  const branchMap = new Map();
  const activeEntries = [];

  configuredSources.forEach((source) => {
    const name = source || 'Belgilanmagan';
    if (!sourceMap.has(name)) {
      sourceMap.set(name, 0);
    }
  });

  let total = 0;
  let closed = 0;
  let inProgress = 0;
  let finance = 0;
  let overdue = 0;
  let activeTotalAge = 0;
  let activeWithAge = 0;
  let closedCycleTotal = 0;
  let closedWithCycle = 0;
  let slaHealthy = 0;
  let slaWarning = 0;
  let slaCritical = 0;

  const inRange = (entry) => {
    const key = toDateKey(entry.date);
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  };

  const addCount = (map, key) => {
    const name = key || 'Belgilanmagan';
    map.set(name, (map.get(name) || 0) + 1);
  };

  const ensureBranch = (name) => {
    const key = name || 'Belgilanmagan';
    if (!branchMap.has(key)) {
      branchMap.set(key, { branch_name: key, total: 0, resolved: 0, in_progress: 0 });
    }
    return branchMap.get(key);
  };

  const processEntry = (entry, archiveStatus) => {
    if (!inRange(entry)) return;

    total += 1;
    addCount(typeMap, entry.problemType);
    addCount(sourceMap, entry.requestSource);

    const branch = ensureBranch(entry.department);
    branch.total += 1;

    const dateKey = toDateKey(entry.date);
    if (weekSet.has(dateKey)) {
      const bucket = weekTotals.get(dateKey);
      bucket.total += 1;
      if (entry.status === 'Yopildi') bucket.resolved += 1;
    }

    if (entry.status === 'Yopildi') {
      closed += 1;
      branch.resolved += 1;
      const cycleDays = getCycleDays(entry);
      if (cycleDays != null) {
        closedCycleTotal += cycleDays;
        closedWithCycle += 1;
      }
      return;
    }

    if (archiveStatus === 'active' && entry.status === 'Jarayonda') {
      const waitingDays = getWaitingDays(entry.date);
      inProgress += 1;
      branch.in_progress += 1;
      activeEntries.push({
        ...entry,
        waitingDays,
      });
      activeTotalAge += waitingDays;
      activeWithAge += 1;
      if (waitingDays >= SLA_CRITICAL_DAYS) {
        overdue += 1;
        slaCritical += 1;
      } else if (waitingDays >= SLA_WARNING_DAYS) {
        slaWarning += 1;
      } else {
        slaHealthy += 1;
      }
    }

    if (archiveStatus === 'active' && entry.status === "Moliyaga yo'naltirildi") {
      finance += 1;
    }
  };

  active.forEach((entry) => processEntry(entry, 'active'));
  archive.forEach((entry) => processEntry(entry, 'archived'));

  const mapToSortedCounts = (map, limit = null) => {
    const rows = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  };

  const branchCounts = Array.from(branchMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const sortedActiveEntries = [...activeEntries].sort((a, b) => {
    const left = parseAppDate(a.date)?.getTime() || 0;
    const right = parseAppDate(b.date)?.getTime() || 0;
    return left - right;
  });
  const duplicateStats = buildDuplicateTrackStats([
    ...active.filter(inRange).map((entry) => ({ ...entry, archiveStatus: 'active' })),
    ...archive.filter(inRange).map((entry) => ({ ...entry, archiveStatus: 'archived' })),
  ]);
  const totalSlaOpen = slaHealthy + slaWarning + slaCritical;
  const monthlyReport = buildMonthlyReport([
    ...active.map((entry) => ({ ...entry, archiveStatus: 'active' })),
    ...archive.map((entry) => ({ ...entry, archiveStatus: 'archived' })),
  ], { reportYear });

  const value = {
    summary: {
      today_total: total,
      today_resolved: closed,
      in_progress: inProgress,
      overdue,
      finance,
    },
    weekly_trend: weekDates.map((date) => ({
      date,
      total: weekTotals.get(date)?.total || 0,
      resolved: weekTotals.get(date)?.resolved || 0,
    })),
    type_counts: mapToSortedCounts(typeMap, 8),
    all_type_counts: mapToSortedCounts(typeMap),
    source_counts: mapToSortedCounts(sourceMap, 4),
    all_source_counts: mapToSortedCounts(sourceMap),
    operator_performance: [
      {
        id: 1,
        full_name: 'OTK workplace',
        resolved: closed,
        total_assigned: total,
        resolve_rate: total ? Math.round((closed / total) * 100) : 0,
      },
    ],
    branch_counts: branchCounts,
    active_entries: sortedActiveEntries.slice(0, 12),
    all_active_entries: sortedActiveEntries,
    active_count: active.length,
    archived_count: archive.length,
    kpi: {
      closeRate: total ? Math.round((closed / total) * 100) : 0,
      averageCloseDays: closedWithCycle ? roundMetric(closedCycleTotal / closedWithCycle) : 0,
      averageOpenDays: activeWithAge ? roundMetric(activeTotalAge / activeWithAge) : 0,
      duplicateGroups: duplicateStats.groups.length,
      duplicateRecords: duplicateStats.records,
      overdueOpen: overdue,
      financeQueue: finance,
      sla: {
        healthy: slaHealthy,
        warning: slaWarning,
        critical: slaCritical,
        total: totalSlaOpen,
      },
      duplicateExamples: duplicateStats.groups.slice(0, 6),
    },
    recent_activity: auditLogs,
    monthly_report: monthlyReport,
  };

  computedCache.dashboard.set(cacheKey, value);
  if (computedCache.dashboard.size > 12) {
    const firstKey = computedCache.dashboard.keys().next().value;
    computedCache.dashboard.delete(firstKey);
  }

  return value;
}

// ============================================================
// SINGLETON subscribe hub — har sahifa alohida interval/listener
// o'rniga, butun ilova uchun bitta global event manbai.
// Bu memory leak'larni oldini oladi va performansga ta'sirini
// kamaytiradi (multiplier effect yo'q).
// ============================================================
const otkSubscribers = new Set();
let otkHubInitialized = false;
let otkHubTimeoutId = null;
let otkHubIntervalId = null;

function notifyOtkSubscribers() {
  otkHubTimeoutId = null;
  clearComputedCaches();
  otkSubscribers.forEach((sub) => {
    try {
      sub.callback();
    } catch (error) {
      console.error('[subscribeToOtkData] subscriber callback error:', error);
    }
  });
}

function scheduleOtkHubNotify(debounceMs = 80) {
  if (otkHubTimeoutId != null) return;
  otkHubTimeoutId = window.setTimeout(notifyOtkSubscribers, debounceMs);
}

function initOtkHubIfNeeded() {
  if (otkHubInitialized || typeof window === 'undefined') return;
  otkHubInitialized = true;

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      refreshRemoteBackedData(true);
      scheduleOtkHubNotify();
    }
  };
  const onFocus = () => {
    refreshRemoteBackedData(true);
    scheduleOtkHubNotify();
  };
  const onChange = () => scheduleOtkHubNotify();

  window.addEventListener('cargo-qc-data-changed', onChange);
  window.addEventListener('storage', onChange);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  refreshRemoteBackedData(true);
  // Bitta global interval — barcha subscriber'lar uchun.
  // 60 soniya — performance uchun (19K yozuv qayta tortilishi og'ir).
  // Realtime subscription darrov yangilanadi, interval faqat zaxira.
  // Tab ko'rinmaganda interval skip qiladi (CPU/network tejash).
  otkHubIntervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshRemoteBackedData();
    }
  }, 60000);
}

export function subscribeToOtkData(callback, options = {}) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }
  initOtkHubIfNeeded();

  // Har subscriberning o'z debounce intervali bo'lishi shart emas —
  // global hub allaqachon 80ms debounce qiladi. options qabul qilamiz
  // lekin asosan e'tiborga olmaymiz (backward compat).
  const subscriber = { callback, debounceMs: options.debounceMs || 80 };
  otkSubscribers.add(subscriber);

  return () => {
    otkSubscribers.delete(subscriber);
  };
}

function countBy(items, key) {
  const counts = items.reduce((acc, item) => {
    const name = item[key] || 'Belgilanmagan';
    acc.set(name, (acc.get(name) || 0) + 1);
    return acc;
  }, new Map());

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function buildWeeklyTrend(items) {
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = toDateKey(date);
    const dayItems = items.filter((entry) => toDateKey(entry.date) === key);
    return {
      date: key,
      total: dayItems.length,
      resolved: dayItems.filter((entry) => entry.status === 'Yopildi').length,
    };
  });
}

function filterByDateRange(items, range = {}) {
  const from = range.from || '';
  const to = range.to || '';
  return items.filter((entry) => {
    const key = toDateKey(entry.date);
    if (from && key < from) return false;
    if (to && key > to) return false;
    return true;
  });
}

function buildImportKey(entry) {
  if (entry.sourceSystem && entry.sourceRowKey) {
    return `${entry.sourceSystem}::${entry.sourceRowKey}`;
  }

  return [
    entry.trackCode || '',
    entry.date || '',
    entry.problemType || '',
    entry.status || '',
    entry.comment || '',
  ].join('::');
}

function mergeEntryLists(currentEntries, incomingEntries) {
  const itemsByKey = new Map();
  const currentOrder = [];
  const newOrder = [];

  currentEntries.forEach((entry) => {
    const key = buildImportKey(entry);
    itemsByKey.set(key, entry);
    currentOrder.push(key);
  });

  let inserted = 0;
  let updated = 0;

  incomingEntries.forEach((entry) => {
    const key = buildImportKey(entry);
    if (itemsByKey.has(key)) {
      itemsByKey.set(
        key,
        normalizeOtkEntry({
          ...itemsByKey.get(key),
          ...entry,
          id: itemsByKey.get(key).id,
        })
      );
      updated += 1;
      return;
    }

    itemsByKey.set(key, entry);
    newOrder.push(key);
    inserted += 1;
  });

  const newKeys = new Set(newOrder);

  return {
    items: [...newOrder, ...currentOrder.filter((key) => !newKeys.has(key))].map((key) => itemsByKey.get(key)),
    inserted,
    updated,
  };
}

export function findTrackConflicts(trackCodes = [], options = {}) {
  const excludeId = options.excludeId ?? null;
  const records = getAllOtkRecords().filter((entry) => entry.id !== excludeId);
  const index = new Map();

  records.forEach((entry) => {
    const key = normalizeTrackCode(entry.trackCode);
    if (!key) return;
    if (!index.has(key)) {
      index.set(key, {
        trackCode: entry.trackCode,
        activeMatches: [],
        archivedMatches: [],
      });
    }
    const bucket = index.get(key);
    if (entry.archiveStatus === 'archived' || entry.status === 'Yopildi' || isCompensatedProblemType(entry.problemType)) {
      bucket.archivedMatches.push(entry);
    } else {
      bucket.activeMatches.push(entry);
    }
  });

  return Array.from(
    new Set(
      (trackCodes || [])
        .map((trackCode) => String(trackCode || '').trim())
        .filter(Boolean)
    )
  )
    .map((trackCode) => {
      const matches = index.get(normalizeTrackCode(trackCode)) || { activeMatches: [], archivedMatches: [] };
      return {
        trackCode,
        activeCount: matches.activeMatches.length,
        archivedCount: matches.archivedMatches.length,
        totalCount: matches.activeMatches.length + matches.archivedMatches.length,
        activeMatches: matches.activeMatches,
        archivedMatches: matches.archivedMatches,
      };
    })
    .filter((item) => item.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount || a.trackCode.localeCompare(b.trackCode));
}

function splitEntriesByActiveTrackConflicts(entries, currentEntries = []) {
  const activeTrackKeys = new Set(
    currentEntries
      .filter((entry) => !isCompensatedProblemType(entry.problemType))
      .map((entry) => normalizeTrackCode(entry.trackCode))
      .filter(Boolean)
  );
  const seenIncoming = new Set();
  const accepted = [];
  const duplicates = [];

  entries.forEach((entry) => {
    const trackKey = normalizeTrackCode(entry.trackCode);
    if (!trackKey) {
      accepted.push(entry);
      return;
    }

    if (activeTrackKeys.has(trackKey) || seenIncoming.has(trackKey)) {
      duplicates.push(entry);
      return;
    }

    seenIncoming.add(trackKey);
    activeTrackKeys.add(trackKey);
    accepted.push(entry);
  });

  return { accepted, duplicates };
}

function compactEntriesForStorage(entries) {
  return entries.map((entry) => compactEntryForStorage(entry));
}

function compactEntryForStorage(entry) {
  const compact = {
    id: entry.id,
    date: entry.date,
    trackCode: entry.trackCode,
    problemType: entry.problemType,
    status: entry.status,
  };

  if (entry.department && entry.department !== 'Belgilanmagan') compact.department = entry.department;
  if (entry.requestSource && entry.requestSource !== 'Belgilanmagan') compact.requestSource = entry.requestSource;
  if (entry.priority && entry.priority !== 'Past') compact.priority = entry.priority;
  if (entry.comment) compact.comment = entry.comment;
  if (entry.handledBy && entry.handledBy !== 'OTK workplace') compact.handledBy = entry.handledBy;
  if (entry.handledById != null) compact.handledById = entry.handledById;
  if (entry.handledByRole) compact.handledByRole = entry.handledByRole;
  if (entry.createdBy && entry.createdBy !== entry.handledBy && entry.createdBy !== 'OTK workplace') compact.createdBy = entry.createdBy;
  if (entry.createdById != null) compact.createdById = entry.createdById;
  if (entry.createdByRole) compact.createdByRole = entry.createdByRole;
  if (entry.lastUpdatedBy) compact.lastUpdatedBy = entry.lastUpdatedBy;
  if (entry.lastUpdatedById != null) compact.lastUpdatedById = entry.lastUpdatedById;
  if (entry.lastUpdatedByRole) compact.lastUpdatedByRole = entry.lastUpdatedByRole;
  if (entry.sourceSystem && entry.sourceSystem !== 'cargo-qc-ui') compact.sourceSystem = entry.sourceSystem;
  if (entry.sourceRowKey) compact.sourceRowKey = entry.sourceRowKey;
  if (entry.importBatchId) compact.importBatchId = entry.importBatchId;
  if (entry.importedAt) compact.importedAt = entry.importedAt;
  if (entry.updatedAt && entry.updatedAt !== entry.date) compact.updatedAt = entry.updatedAt;

  return compact;
}

function encodeEntryCollection(entries) {
  return {
    v: 1,
    rows: entries.map((entry) => packEntry(entry)),
  };
}

function decodeEntryCollection(value) {
  if (Array.isArray(value)) return value;
  if (value?.v === 1 && Array.isArray(value.rows)) {
    return value.rows.map((row) => unpackEntry(row));
  }
  return [];
}

function packEntry(entry) {
  const compact = compactEntryForStorage(entry);
  const row = [
    compact.id,
    encodeDateValue(compact.date),
    compact.trackCode,
    compact.problemType,
  ];

  if (compact.department) row[4] = compact.department;
  if (compact.requestSource) row[5] = compact.requestSource;
  if (compact.status && compact.status !== 'Jarayonda') row[6] = encodeStatus(compact.status);
  if (compact.priority && compact.priority !== 'Past') row[7] = encodePriority(compact.priority);
  if (compact.comment) row[8] = compact.comment;
  if (compact.handledBy) row[9] = compact.handledBy;
  if (compact.handledById != null) row[10] = compact.handledById;
  if (compact.handledByRole) row[11] = compact.handledByRole;
  if (compact.createdBy) row[12] = compact.createdBy;
  if (compact.createdById != null) row[13] = compact.createdById;
  if (compact.createdByRole) row[14] = compact.createdByRole;
  if (compact.lastUpdatedBy) row[15] = compact.lastUpdatedBy;
  if (compact.lastUpdatedById != null) row[16] = compact.lastUpdatedById;
  if (compact.lastUpdatedByRole) row[17] = compact.lastUpdatedByRole;
  if (compact.sourceSystem) row[18] = compact.sourceSystem;
  if (compact.sourceRowKey) row[19] = compact.sourceRowKey;
  if (compact.importBatchId) row[20] = compact.importBatchId;
  if (compact.importedAt) row[21] = encodeDateValue(compact.importedAt);
  if (compact.updatedAt) row[22] = encodeDateValue(compact.updatedAt);

  while (row.length && row[row.length - 1] == null) {
    row.pop();
  }

  return row;
}

function unpackEntry(row) {
  if (!Array.isArray(row)) return row;

  const entry = {
    id: row[0],
    date: decodeDateValue(row[1]),
    trackCode: row[2],
    problemType: row[3],
  };

  if (row[4] != null) entry.department = row[4];
  if (row[5] != null) entry.requestSource = row[5];
  if (row[6] != null) entry.status = decodeStatus(row[6]);
  if (row[7] != null) entry.priority = decodePriority(row[7]);
  if (row[8] != null) entry.comment = row[8];
  if (row[9] != null) entry.handledBy = row[9];
  if (row[10] != null && row[10] !== '') entry.handledById = row[10];
  if (row[11] != null) entry.handledByRole = row[11];
  if (row[12] != null) entry.createdBy = row[12];
  if (row[13] != null && row[13] !== '') entry.createdById = row[13];
  if (row[14] != null) entry.createdByRole = row[14];
  if (row[15] != null) entry.lastUpdatedBy = row[15];
  if (row[16] != null && row[16] !== '') entry.lastUpdatedById = row[16];
  if (row[17] != null) entry.lastUpdatedByRole = row[17];
  if (row[18] != null) entry.sourceSystem = row[18];
  if (row[19] != null) entry.sourceRowKey = row[19];
  if (row[20] != null) entry.importBatchId = row[20];
  if (row[21] != null) entry.importedAt = decodeDateValue(row[21]);
  if (row[22] != null) entry.updatedAt = decodeDateValue(row[22]);

  return entry;
}

function encodeDateValue(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? value : timestamp;
}

function decodeDateValue(value) {
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  return value;
}

function encodeStatus(value) {
  if (value === 'Yopildi') return 0;
  if (value === "Moliyaga yo'naltirildi") return 2;
  return value;
}

function decodeStatus(value) {
  if (value === 0) return 'Yopildi';
  if (value === 2) return "Moliyaga yo'naltirildi";
  return value;
}

function encodePriority(value) {
  if (value === "O'rta") return 1;
  if (value === 'Yuqori') return 2;
  return value;
}

function decodePriority(value) {
  if (value === 1) return "O'rta";
  if (value === 2) return 'Yuqori';
  return value;
}

function countAssignedEntries(entries, user) {
  const userId = user?.id;
  const userNames = [user?.full_name, user?.username].map(normalizePersonLabel).filter(Boolean);

  return entries.filter((entry) => {
    if (userId != null && (entry.handledById === userId || entry.createdById === userId)) {
      return true;
    }

    const handledBy = normalizePersonLabel(entry.handledBy);
    const createdBy = normalizePersonLabel(entry.createdBy);
    return userNames.includes(handledBy) || userNames.includes(createdBy);
  }).length;
}

// Predicate va normalizer helperlar dataPredicates.js'ga ko'chirildi:
// isIsfandiyorLabel, normalizePersonLabel, isCompensatedProblemType,
// isCompensatedRecoveredProblemType, normalizeTrackCode,
// compareTrackEntryOrder, resolveEntryOrderTime

function buildRecoveredCompensatedLoads(records = []) {
  const registry = getCompensatedLoadRegistry();
  const grouped = new Map();

  records.forEach((entry) => {
    const key = normalizeTrackCode(entry.trackCode);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  });

  const trackKeys = Array.from(new Set([...grouped.keys(), ...registry.map((item) => normalizeTrackCode(item.trackCode)).filter(Boolean)]));

  return trackKeys
    .map((trackKey) => {
      const entries = grouped.get(trackKey) || [];
      const registryItem = registry.find((item) => normalizeTrackCode(item.trackCode) === trackKey) || null;
      const latestPair = findCompensatedRecoveryPair(entries);
      const foundEntry = latestPair?.foundEntry || findLatestFoundEntry(entries);
      const compensationEntry = latestPair?.compensationEntry || findLatestCompensationEntry(entries);

      if (!registryItem && !latestPair) return null;
      if (!foundEntry) return null;

      const compensationDateRaw = registryItem?.compensatedDate || compensationEntry?.date || null;
      const compensationDate = parseAppDate(compensationDateRaw);
      const foundDate = parseAppDate(foundEntry.date);
      const compensationDay = compensationDate
        ? new Date(compensationDate.getFullYear(), compensationDate.getMonth(), compensationDate.getDate())
        : null;
      const foundDay = foundDate
        ? new Date(foundDate.getFullYear(), foundDate.getMonth(), foundDate.getDate())
        : null;
      const recoveredDays = compensationDay && foundDay
        ? Math.max(0, Math.round((foundDay - compensationDay) / 86400000))
        : null;

      return {
        id: `compensated-${foundEntry.id || trackKey}`,
        trackCode: foundEntry.trackCode || registryItem?.trackCode || compensationEntry?.trackCode || '',
        compensationEntry,
        foundEntry,
        compensationDate: compensationDateRaw,
        foundDate: foundEntry.date,
        recoveredDays,
        department: foundEntry.department || compensationEntry?.department || 'Belgilanmagan',
        requestSource: foundEntry.requestSource || compensationEntry?.requestSource || 'Belgilanmagan',
        handledBy: foundEntry.handledBy || compensationEntry?.handledBy || '',
        status: foundEntry.status,
        priority: foundEntry.priority,
        phone: registryItem?.phone || '',
        customer: registryItem?.customer || '',
        paymentAmount: registryItem?.paymentAmount || '',
        paymentStatus: normalizeCompensatedPaymentStatus(registryItem?.paymentStatus),
        foundCaseOutcome: String(registryItem?.foundCaseOutcome || '').trim(),
        foundResolutionStatus: normalizeCompensatedRecoveryStatus(registryItem?.foundResolutionStatus),
        receiptFile: registryItem?.receiptFile || null,
        assignedTo: String(registryItem?.assignedTo || '').trim(),
        assignedToId: registryItem?.assignedToId ?? null,
        assignedAt: registryItem?.assignedAt || null,
        workflowComment: String(registryItem?.workflowComment || '').trim(),
        compensationComment: registryItem?.comment || compensationEntry?.comment || '',
        foundComment: foundEntry.comment || '',
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const timeDiff = resolveEntryOrderTime(right.foundEntry) - resolveEntryOrderTime(left.foundEntry);
      if (timeDiff !== 0) return timeDiff;
      return left.trackCode.localeCompare(right.trackCode);
    });
}

function findCompensatedRecoveryPair(entries = []) {
  const sorted = entries.slice().sort(compareTrackEntryOrder);
  let latestPair = null;
  let latestCompensation = null;

  sorted.forEach((entry) => {
    if (isCompensatedProblemType(entry.problemType)) {
      latestCompensation = entry;
      return;
    }

    if (latestCompensation && latestCompensation.id !== entry.id && isCompensatedRecoveredProblemType(entry.problemType)) {
      latestPair = {
        compensationEntry: latestCompensation,
        foundEntry: entry,
      };
    }
  });

  return latestPair;
}

function findLatestCompensationEntry(entries = []) {
  return entries
    .filter((entry) => isCompensatedProblemType(entry.problemType))
    .sort((left, right) => resolveEntryOrderTime(right) - resolveEntryOrderTime(left) || String(left.id).localeCompare(String(right.id)))[0]
    || null;
}

function findLatestFoundEntry(entries = []) {
  return entries
    .filter((entry) => !isCompensatedProblemType(entry.problemType) && isCompensatedRecoveredProblemType(entry.problemType))
    .sort((left, right) => resolveEntryOrderTime(right) - resolveEntryOrderTime(left) || String(left.id).localeCompare(String(right.id)))[0]
    || null;
}

// Compensated registry normalizatorlari compensatedNormalizer.js'ga ko'chirildi:
// normalizeCompensatedRegistry, normalizeOptionalRegistryDate,
// normalizePaymentAmount, normalizeCompensatedPaymentStatus,
// normalizeCompensatedRecoveryStatus

function resolveActorMeta(actor, fallbackEntry = null) {
  return {
    actorId: actor?.id ?? actor?.actorId ?? fallbackEntry?.lastUpdatedById ?? fallbackEntry?.createdById ?? fallbackEntry?.handledById ?? null,
    actorName:
      actor?.full_name
      || actor?.username
      || actor?.actorName
      || fallbackEntry?.lastUpdatedBy
      || fallbackEntry?.createdBy
      || fallbackEntry?.handledBy
      || 'System',
    actorRole:
      actor?.role
      || actor?.actorRole
      || fallbackEntry?.lastUpdatedByRole
      || fallbackEntry?.createdByRole
      || fallbackEntry?.handledByRole
      || 'system',
  };
}

function createAuditLog(action, entry, actor, extra = {}) {
  const meta = resolveActorMeta(actor, entry);
  const timestamp = extra.timestamp || new Date().toISOString();

  return {
    id: `${action}-${entry?.id || 'global'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    timestamp,
    entityId: entry?.id || null,
    trackCode: entry?.trackCode || extra.trackCode || '',
    actorId: meta.actorId,
    actorName: meta.actorName,
    actorRole: meta.actorRole,
    message: extra.message || '',
    details: extra.details || null,
  };
}

function buildChangeSummary(previousEntry, nextEntry) {
  const changes = {};
  ['trackCode', 'problemType', 'department', 'requestSource', 'status', 'priority', 'comment', 'handledBy', 'date'].forEach((field) => {
    if ((previousEntry?.[field] || '') !== (nextEntry?.[field] || '')) {
      changes[field] = {
        from: previousEntry?.[field] || '',
        to: nextEntry?.[field] || '',
      };
    }
  });
  return changes;
}

function getCycleDays(entry) {
  if (!entry || entry.status !== 'Yopildi') return null;

  const start = parseAppDate(entry.date);
  const end = parseAppDate(entry.updatedAt || entry.importedAt || entry.date);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() < start.getTime()) return null;

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const cycleDays = Math.max(0, Math.round((endDay - startDay) / 86400000));
  if (cycleDays > 3650) return null;
  return cycleDays;
}

function buildDuplicateTrackStats(records = []) {
  const groups = new Map();

  records.forEach((entry) => {
    const key = normalizeTrackCode(entry.trackCode);
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, {
        trackCode: entry.trackCode,
        entries: [],
      });
    }
    const group = groups.get(key);
    group.entries.push(entry);
  });

  const duplicates = Array.from(groups.values())
    .map((group) => {
      const activeCount = group.entries.filter((entry) => entry.archiveStatus !== 'archived' && entry.status !== 'Yopildi').length;
      const archivedCount = group.entries.length - activeCount;
      return {
        trackCode: group.trackCode,
        count: group.entries.length,
        activeCount,
        archivedCount,
      };
    })
    .filter((group) => group.count > 1)
    .filter((group) => !findCompensatedRecoveryPair(records.filter((entry) => normalizeTrackCode(entry.trackCode) === normalizeTrackCode(group.trackCode))))
    .sort((a, b) => b.count - a.count || a.trackCode.localeCompare(b.trackCode));

  return {
    groups: duplicates,
    records: duplicates.reduce((sum, group) => sum + group.count, 0),
  };
}

function buildMonthlyReport(records = [], options = {}) {
  const datedRecords = records
    .map((entry) => {
      const date = parseAppDate(entry.date);
      return !date || Number.isNaN(date.getTime()) ? null : { entry, date };
    })
    .filter(Boolean);

  const configuredTypes = (getOtkSettings().problemTypes || []).map((item) => item.name).filter(Boolean);
  const nowYear = new Date().getFullYear();
  const requestedYear = Number(options.reportYear);
  const createTemplateReport = (selectedYear, availableYears) => {
    const months = buildReportMonths(0, 11);
    const rows = configuredTypes
      .map((typeName) => createMonthlyRow(typeName || 'Belgilanmagan', months))
      .map((row) => ({
        ...row,
        months: row.months.map((month, index) => ({
          ...month,
          trend: computeMonthTrend(row.months, index),
        })),
      }))
      .sort((left, right) => left.problemType.localeCompare(right.problemType));
    const totals = months.map((month, index) => ({
      monthIndex: month.monthIndex,
      count: 0,
      trend: computeMonthTrend(months.map((item) => ({ count: 0, monthIndex: item.monthIndex })), index),
    }));

    return {
      year: selectedYear,
      selectedYear,
      availableYears,
      firstMonth: 0,
      lastActiveMonth: null,
      latestMonth: null,
      previousMonth: null,
      months,
      totalRecords: 0,
      topProblem: null,
      increasedCount: 0,
      decreasedCount: 0,
      rows,
      totals,
    };
  };

  if (!datedRecords.length) {
    const availableYears = Array.from({ length: 6 }, (_, index) => nowYear + index).sort((a, b) => b - a);
    const selectedYear = Number.isFinite(requestedYear) && availableYears.includes(requestedYear)
      ? requestedYear
      : nowYear;
    return createTemplateReport(selectedYear, availableYears);
  }

  const latestRecord = datedRecords
    .slice()
    .sort((left, right) => right.date - left.date)[0];
  const actualYears = Array.from(new Set(datedRecords.map((item) => item.date.getFullYear())));
  const baseFutureYear = Math.max(nowYear, latestRecord.date.getFullYear());
  const futureYears = Array.from({ length: 6 }, (_, index) => baseFutureYear + index);
  const availableYears = Array.from(new Set([...actualYears, ...futureYears])).sort((a, b) => b - a);
  const targetYear = Number.isFinite(requestedYear) && availableYears.includes(requestedYear)
    ? requestedYear
    : latestRecord.date.getFullYear();
  const yearRecords = datedRecords.filter((item) => item.date.getFullYear() === targetYear);

  if (!yearRecords.length) {
    return createTemplateReport(targetYear, availableYears);
  }

  const activeMonths = Array.from(new Set(yearRecords.map((item) => item.date.getMonth()))).sort((a, b) => a - b);
  const firstMonth = activeMonths[0] ?? latestRecord.date.getMonth();
  const latestMonth = activeMonths[activeMonths.length - 1] ?? latestRecord.date.getMonth();
  const previousMonth = Math.max(firstMonth, latestMonth - 1);
  const months = buildReportMonths(firstMonth, 11);
  const monthIndexMap = new Map(months.map((month, index) => [month.monthIndex, index]));
  const rowMap = new Map();
  const totals = months.map((month) => ({
    monthIndex: month.monthIndex,
    count: 0,
  }));

  configuredTypes.forEach((typeName) => {
    const key = typeName || 'Belgilanmagan';
    if (!rowMap.has(key)) {
      rowMap.set(key, createMonthlyRow(key, months));
    }
  });

  yearRecords.forEach(({ entry, date }) => {
    const problemType = entry.problemType || 'Belgilanmagan';
    if (!rowMap.has(problemType)) {
      rowMap.set(problemType, createMonthlyRow(problemType, months));
    }

    const monthIndex = date.getMonth();
    const columnIndex = monthIndexMap.get(monthIndex);
    if (columnIndex == null) return;

    const row = rowMap.get(problemType);
    row.total += 1;
    row.months[columnIndex].count += 1;
    totals[columnIndex].count += 1;
  });

  const rows = Array.from(rowMap.values())
    .map((row) => ({
      ...row,
      months: row.months.map((month, index) => ({
        ...month,
        trend: computeMonthTrend(row.months, index),
      })),
    }))
    .sort((left, right) => right.total - left.total || left.problemType.localeCompare(right.problemType));

  const topProblemRow = rows.find((row) => row.total > 0);
  const topProblem = topProblemRow
    ? { name: topProblemRow.problemType, count: topProblemRow.total }
    : null;

  const increasedCount = rows
    .filter((row) => row.total > 0)
    .filter((row) => compareLatestMonth(row.months, latestMonth, previousMonth) > 0).length;
  const decreasedCount = rows
    .filter((row) => row.total > 0)
    .filter((row) => compareLatestMonth(row.months, latestMonth, previousMonth) < 0).length;

  return {
    year: targetYear,
    selectedYear: targetYear,
    availableYears,
    firstMonth,
    lastActiveMonth: latestMonth,
    latestMonth,
    previousMonth,
    months,
    totalRecords: rows.reduce((sum, row) => sum + row.total, 0),
    topProblem,
    increasedCount,
    decreasedCount,
    rows,
    totals: totals.map((month, index) => ({
      ...month,
      trend: computeMonthTrend(totals, index),
    })),
  };
}

function buildReportMonths(startMonth, endMonth) {
  const months = [];
  for (let monthIndex = startMonth; monthIndex <= endMonth; monthIndex += 1) {
    months.push({ monthIndex });
  }
  return months;
}

function createMonthlyRow(problemType, months) {
  return {
    problemType,
    total: 0,
    months: months.map((month) => ({
      monthIndex: month.monthIndex,
      count: 0,
    })),
  };
}

function computeMonthTrend(months, index) {
  const current = months[index]?.count || 0;
  const previous = months[index - 1]?.count;

  if (previous == null) {
    return { direction: 'start', percent: null };
  }

  if (previous === 0 && current === 0) {
    return { direction: 'neutral', percent: 0 };
  }

  if (previous === 0 && current > 0) {
    return { direction: 'up', percent: 100 };
  }

  if (previous > 0 && current === 0) {
    return { direction: 'down', percent: -100 };
  }

  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent > 0) return { direction: 'up', percent };
  if (percent < 0) return { direction: 'down', percent };
  return { direction: 'neutral', percent: 0 };
}

function compareLatestMonth(months, latestMonth, previousMonth) {
  const latest = months.find((month) => month.monthIndex === latestMonth)?.count || 0;
  const previous = months.find((month) => month.monthIndex === previousMonth)?.count || 0;
  if (latest > previous) return 1;
  if (latest < previous) return -1;
  return 0;
}

function roundMetric(value) {
  return Math.round(value * 10) / 10;
}
