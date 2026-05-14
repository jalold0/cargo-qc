import { normalizeEntries, normalizeOtkEntry, parseAppDate } from './entryNormalizer';

export const DEFAULT_PROBLEM_TYPES = [
  'Status muammosi',
  'Xitoy ombori',
  'Toshkent ombori',
  'Kilo / gabarit xatolari',
  "Noto'g'ri ID / trek biriktirish",
  'Tovar shikastlanishi',
  'Yetkazish kechikishi',
  'Filial yuklari yetib bormasligi',
  "To'lov masalasi",
  'Integratsiya',
  'Adashgan yuk',
  "Yo'qolgan yuk",
  'Vozvrat muammolari',
  "Mijoz boshqa manzilga ko'chgan",
  'Qoplab berilgan',
  'NO CLIENT',
  "Botda ko'rinmagan",
  'Sortirovka ID si chiqmagan',
  'Emu bazasiga tushmagan yuklar',
  "BTS filialida noma'lum bo'lib turgan",
  'BTS filiallaridagi ostatkalar',
  'Yopilgan filial',
];

export const DEFAULT_DEPARTMENTS = [
  "IT bo'limi",
  'Xitoy ombori',
  'Toshkent ombori',
  'Logistika',
  'BTS',
  'EMU',
  'Kuryerka',
  "Sotuv bo'limi",
  "Moliya bo'limi",
];

export const DEFAULT_REQUEST_SOURCES = [
  'Telegram',
  'Call center',
  'Xitoy',
  'Toshkent ombori',
  'RS lar',
  'IPOST filiali',
  'Mijozlar',
  'EMU',
  'BTS',
];

export const DEFAULT_ROLES = ['admin', 'operator', 'supervisor'];

export const STATUS_OPTIONS = ['Yopildi', 'Jarayonda', "Moliyaga yo'naltirildi"];

export const DEFAULT_USERS = [
  { id: 1, username: 'admin', password: 'admin123', full_name: 'Admin', role: 'admin', active: true, avatarUrl: '' },
  { id: 2, username: 'operator1', password: 'op123', full_name: 'Operator', role: 'operator', active: true, avatarUrl: '' },
  { id: 3, username: 'supervisor1', password: 'sup123', full_name: 'Supervisor', role: 'supervisor', active: true, avatarUrl: '' },
];

const SETTINGS_KEY = 'cargo-qc-otk-settings';
const ENTRIES_KEY = 'cargo-qc-otk-entries';
const ARCHIVE_KEY = 'cargo-qc-otk-archive';
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
  audit: { raw: null, value: null },
  allRecords: { entriesRaw: null, archiveRaw: null, value: null },
  dashboard: new Map(),
};

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
  if (!changedKey || changedKey === AUDIT_KEY) {
    computedCache.audit = { raw: null, value: null };
  }
  if (!changedKey || [ENTRIES_KEY, ARCHIVE_KEY].includes(changedKey)) {
    computedCache.allRecords = { entriesRaw: null, archiveRaw: null, value: null };
  }
  if (!changedKey || [SETTINGS_KEY, ENTRIES_KEY, ARCHIVE_KEY, AUDIT_KEY].includes(changedKey)) {
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

const writeJson = (key, value) => {
  const raw = JSON.stringify(value);
  localStorage.setItem(key, raw);
  rawStorageCache.set(key, { raw, value });
  clearComputedCaches(key);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cargo-qc-data-changed', { detail: { key } }));
  }
};

function getStorageRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getOtkSettings() {
  const raw = getStorageRaw(SETTINGS_KEY);
  if (computedCache.settings.raw === raw && computedCache.settings.value) {
    return computedCache.settings.value;
  }

  const saved = readJson(SETTINGS_KEY, {});
  const value = {
    problemTypes: saved.problemTypes?.length ? saved.problemTypes : DEFAULT_PROBLEM_TYPES,
    departments: saved.departments?.length ? saved.departments : DEFAULT_DEPARTMENTS,
    requestSources: saved.requestSources?.length ? saved.requestSources : DEFAULT_REQUEST_SOURCES,
    roles: saved.roles?.length ? saved.roles : DEFAULT_ROLES,
  };

  computedCache.settings = { raw, value };
  return value;
}

export function saveOtkSettings(settings) {
  writeJson(SETTINGS_KEY, settings);
}

export function getSystemUsers() {
  const raw = getStorageRaw(USERS_KEY);
  if (computedCache.users.raw === raw && computedCache.users.value) {
    return computedCache.users.value;
  }

  const saved = readJson(USERS_KEY, []);
  const value = saved.length ? saved : DEFAULT_USERS;
  computedCache.users = { raw, value };
  return value;
}

export function saveSystemUsers(users) {
  writeJson(USERS_KEY, users);
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
      id: '2026-05-12-close-isfandiyor-active',
      run: migrateIsfandiyorInProgressEntries,
      shouldPersist: (result) => result.updated > 0,
    },
    {
      id: '2026-05-12-dedupe-tracks-keep-first-owner',
      run: dedupeTracksKeepFirstOwner,
      shouldPersist: () => false,
    },
  ];

  const nextCompleted = [...completed];
  const results = [];

  migrations.forEach((migration) => {
    if (nextCompleted.includes(migration.id)) {
      results.push({ migrationId: migration.id, ran: false, updated: 0, removed: 0 });
      return;
    }

    const result = migration.run();
    results.push({
      migrationId: migration.id,
      ran: Boolean(result?.updated || result?.removed || result?.distributedTo),
      ...result,
    });
    if (migration.shouldPersist(result)) {
      nextCompleted.push(migration.id);
    }
  });

  if (nextCompleted.length !== completed.length) {
    writeJson(MIGRATIONS_KEY, nextCompleted);
  }

  return results;
}

export function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export function getOtkEntries() {
  const raw = getStorageRaw(ENTRIES_KEY);
  if (computedCache.entries.raw === raw && computedCache.entries.value) {
    return computedCache.entries.value;
  }

  const value = applyPriorityRules(normalizeEntries(decodeEntryCollection(readJson(ENTRIES_KEY, []))));
  computedCache.entries = { raw, value };
  return value;
}

export function getOtkArchive() {
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
}

export function saveOtkArchive(entries) {
  writeJson(ARCHIVE_KEY, encodeEntryCollection(normalizeEntries(entries)));
}

export function addOtkEntries(entries, options = {}) {
  const current = getOtkEntries();
  const normalized = normalizeEntries(entries);
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

  const updatedEntry = normalizeOtkEntry({
    ...currentEntry,
    ...changes,
    updatedAt: new Date().toISOString(),
  });

  const activeWithoutCurrent = active.filter((entry) => entry.id !== id);
  const archiveWithoutCurrent = archive.filter((entry) => entry.id !== id);

  if (updatedEntry.status === 'Yopildi') {
    saveOtkEntries(activeWithoutCurrent);
    saveOtkArchive(normalizeEntries([updatedEntry, ...archiveWithoutCurrent]));
    appendAuditLogs([
      createAuditLog('update', updatedEntry, resolveActorMeta(options.actor, updatedEntry), {
        message: `${updatedEntry.trackCode} trek yangilandi va arxivga o'tdi`,
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

export function toDateKey(date) {
  const value = parseAppDate(date);
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
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

export function subscribeToOtkData(callback, options = {}) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const debounceMs = Number.isFinite(options.debounceMs) ? options.debounceMs : 80;
  let timeoutId = null;

  const run = () => {
    timeoutId = null;
    clearComputedCaches();
    callback();
  };

  const schedule = () => {
    if (timeoutId != null) {
      return;
    }
    timeoutId = window.setTimeout(run, debounceMs);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      schedule();
    }
  };

  window.addEventListener('cargo-qc-data-changed', schedule);
  window.addEventListener('storage', schedule);
  window.addEventListener('focus', schedule);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
    }
    window.removeEventListener('cargo-qc-data-changed', schedule);
    window.removeEventListener('storage', schedule);
    window.removeEventListener('focus', schedule);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export function parseTrackNumbers(value) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function getWaitingDays(date) {
  const created = parseAppDate(date);
  if (!created || Number.isNaN(created.getTime())) return 0;
  const today = new Date();
  const start = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}

export function getPriorityByWaitingDays(days) {
  if (days >= 5) return 'Yuqori';
  if (days >= 2) return "O'rta";
  return 'Past';
}

export function applyPriorityRules(entries) {
  return entries.map((entry) => {
    if (entry.status === 'Yopildi') return entry;
    return {
      ...entry,
      priority: getPriorityByWaitingDays(getWaitingDays(entry.date)),
    };
  });
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
    if (entry.archiveStatus === 'archived' || entry.status === 'Yopildi') {
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
  const activeTrackKeys = new Set(currentEntries.map((entry) => normalizeTrackCode(entry.trackCode)).filter(Boolean));
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

function isIsfandiyorLabel(value) {
  return normalizePersonLabel(value).includes('isfandiyor');
}

function normalizePersonLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeTrackCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function compareTrackEntryOrder(left, right) {
  const leftTime = resolveEntryOrderTime(left);
  const rightTime = resolveEntryOrderTime(right);

  if (leftTime !== rightTime) return leftTime - rightTime;

  const leftStatusRank = left.archiveStatus === 'active' ? 0 : 1;
  const rightStatusRank = right.archiveStatus === 'active' ? 0 : 1;
  if (leftStatusRank !== rightStatusRank) return leftStatusRank - rightStatusRank;

  return String(left.id).localeCompare(String(right.id));
}

function resolveEntryOrderTime(entry) {
  return [
    entry?.date,
    entry?.importedAt,
    entry?.updatedAt,
  ]
    .map((value) => Date.parse(value))
    .find((value) => Number.isFinite(value))
    ?? Number.MAX_SAFE_INTEGER;
}

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
        count: 0,
        activeCount: 0,
        archivedCount: 0,
      });
    }
    const group = groups.get(key);
    group.count += 1;
    if (entry.archiveStatus === 'archived' || entry.status === 'Yopildi') {
      group.archivedCount += 1;
    } else {
      group.activeCount += 1;
    }
  });

  const duplicates = Array.from(groups.values())
    .filter((group) => group.count > 1)
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

  const configuredTypes = getOtkSettings().problemTypes || [];
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
