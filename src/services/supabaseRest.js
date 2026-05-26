const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const REST_BASE = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1` : '';

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function buildHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// Bitta so'rovning maksimal timeout'i — 15 soniya.
// Sekin internet yoki Supabase javob bermasa, hang qilmaslik.
const REQUEST_TIMEOUT_MS = 15000;

// Free tier loyiha "uyqudan uyg'onish" 5-15 soniya olishi mumkin.
// 503/504 status — bu vaqtinchalik, retry'da ishlaydi.
const RETRY_STATUS_CODES = new Set([502, 503, 504, 408, 429]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function supabaseRequest(path, init = {}, attempt = 0) {
  if (!isSupabaseEnabled) {
    throw new Error('Supabase is not configured.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${REST_BASE}/${path}`, {
      ...init,
      headers: buildHeaders(init.headers),
      signal: controller.signal,
    });

    // Vaqtinchalik xato'lar uchun retry — Supabase "uyg'onish" yoki
    // tarmoq qisqa muddatli xato'lari uchun avtomatik takrorlash
    if (!response.ok && RETRY_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
      clearTimeout(timer);
      const delay = RETRY_DELAY_MS * (attempt + 1); // 2s, 4s, 6s — backoff
      await sleep(delay);
      return supabaseRequest(path, init, attempt + 1);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Supabase request failed with ${response.status}`);
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    // Network/abort xato'lari uchun ham retry (faqat birinchi 1 marta)
    if (
      attempt < 1 &&
      error?.name !== 'AbortError' &&
      typeof error?.message === 'string' &&
      /network|fetch|connect/i.test(error.message)
    ) {
      clearTimeout(timer);
      await sleep(RETRY_DELAY_MS);
      return supabaseRequest(path, init, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// PAGINATION HELPER — PostgREST default max-rows = 1000
// ------------------------------------------------------------
// Katta jadvallar uchun (complaints_entries 19K+) — limit+offset
// orqali sahifalab to'liq olib kelamiz.
// ============================================================
const PAGE_SIZE = 1000;

async function fetchAllPaginated(basePath) {
  if (!isSupabaseEnabled) {
    throw new Error('Supabase is not configured.');
  }

  const allRows = [];
  let offset = 0;
  // Safety cap: 200 sahifa × 1000 = 200K yozuv (yetar)
  for (let i = 0; i < 200; i += 1) {
    const sep = basePath.includes('?') ? '&' : '?';
    const path = `${basePath}${sep}limit=${PAGE_SIZE}&offset=${offset}`;
    // eslint-disable-next-line no-await-in-loop
    const rows = await supabaseRequest(path);
    if (!Array.isArray(rows) || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;
  }
  return allRows;
}

function toRemoteAssistantAiRecord(item) {
  return {
    id: item.id,
    track_code: item.trackCode || '',
    customer_id: item.customerId || '',
    phone: item.phone || '',
    full_name: item.fullName || '',
    problem_type: item.problemType || '',
    status: item.status || 'Qabul qildi',
    source: item.source || 'telegram_bot',
    handled_by: item.handledBy || '',
    comment: item.comment || '',
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fromRemoteAssistantAiRecord(row) {
  return {
    id: row.id,
    trackCode: row.track_code || '',
    customerId: row.customer_id || '',
    phone: row.phone || '',
    fullName: row.full_name || '',
    problemType: row.problem_type || '',
    status: row.status || 'Qabul qildi',
    source: row.source || 'telegram_bot',
    handledBy: row.handled_by || '',
    comment: row.comment || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export async function fetchAssistantAiRequestsRemote() {
  const rows = await fetchAllPaginated('assistant_ai_requests?select=*&order=created_at.desc');
  return Array.isArray(rows) ? rows.map(fromRemoteAssistantAiRecord) : [];
}

export async function upsertAssistantAiRequestRemote(item) {
  const payload = toRemoteAssistantAiRecord(item);
  const rows = await supabaseRequest('assistant_ai_requests?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  return Array.isArray(rows) && rows[0] ? fromRemoteAssistantAiRecord(rows[0]) : item;
}

export async function seedAssistantAiRequestsRemote(items) {
  const payload = (items || []).map(toRemoteAssistantAiRecord);
  if (!payload.length) return [];

  const rows = await supabaseRequest('assistant_ai_requests?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  return Array.isArray(rows) ? rows.map(fromRemoteAssistantAiRecord) : [];
}

export async function testSupabaseConnection() {
  try {
    await supabaseRequest('assistant_ai_requests?select=id&limit=1');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Supabase connection failed.' };
  }
}

function toRemoteComplaintEntry(entry, isArchived = false) {
  return {
    id: entry.id,
    date: entry.date || new Date().toISOString(),
    track_code: entry.trackCode || '',
    problem_type: entry.problemType || '',
    department: entry.department || '',
    request_source: entry.requestSource || '',
    status: entry.status || 'Jarayonda',
    priority: entry.priority || 'Past',
    comment: entry.comment || '',
    handled_by: entry.handledBy || '',
    handled_by_id: entry.handledById ?? null,
    handled_by_role: entry.handledByRole || '',
    created_by: entry.createdBy || '',
    created_by_id: entry.createdById ?? null,
    created_by_role: entry.createdByRole || '',
    last_updated_by: entry.lastUpdatedBy || '',
    last_updated_by_id: entry.lastUpdatedById ?? null,
    last_updated_by_role: entry.lastUpdatedByRole || '',
    source_system: entry.sourceSystem || 'cargo-qc-ui',
    source_row_key: entry.sourceRowKey || '',
    import_batch_id: entry.importBatchId || '',
    imported_at: entry.importedAt || null,
    updated_at: entry.updatedAt || new Date().toISOString(),
    closed_at: entry.closedAt || null,
    archived_at: entry.archivedAt || null,
    is_archived: Boolean(isArchived),
    is_deleted: false,
    payload: entry,
  };
}

function fromRemoteComplaintEntry(row) {
  return {
    ...(row.payload && typeof row.payload === 'object' ? row.payload : {}),
    id: row.id,
    date: row.date,
    trackCode: row.track_code || '',
    problemType: row.problem_type || '',
    department: row.department || '',
    requestSource: row.request_source || '',
    status: row.status || 'Jarayonda',
    priority: row.priority || 'Past',
    comment: row.comment || '',
    handledBy: row.handled_by || '',
    handledById: row.handled_by_id ?? null,
    handledByRole: row.handled_by_role || '',
    createdBy: row.created_by || '',
    createdById: row.created_by_id ?? null,
    createdByRole: row.created_by_role || '',
    lastUpdatedBy: row.last_updated_by || '',
    lastUpdatedById: row.last_updated_by_id ?? null,
    lastUpdatedByRole: row.last_updated_by_role || '',
    sourceSystem: row.source_system || 'cargo-qc-ui',
    sourceRowKey: row.source_row_key || '',
    importBatchId: row.import_batch_id || '',
    importedAt: row.imported_at || '',
    updatedAt: row.updated_at || row.date,
    closedAt: row.closed_at || '',
    archivedAt: row.archived_at || '',
    isArchived: Boolean(row.is_archived),
  };
}

// ============================================================
// Complaints fetch — bir nechta strategiya:
//   - dateFrom/dateTo bilan: oraliq filtri (eng tez)
//   - includeArchive=false: faqat active
//   - archiveLimit=N: active + so'nggi N archive
//   - hammasi default: to'liq baza (manual sync uchun)
// PostgREST sintaksisi: date=gte.YYYY-MM-DD&date=lte.YYYY-MM-DD
// ============================================================
export async function fetchComplaintsRemote({
  includeArchive = true,
  archiveLimit = null,
  dateFrom = null,
  dateTo = null,
} = {}) {
  // Sana oraliq filtri eng yuqori ustuvorlikda
  if (dateFrom || dateTo) {
    const filters = ['select=*', 'is_deleted=eq.false'];
    if (dateFrom) filters.push(`date=gte.${encodeURIComponent(dateFrom)}`);
    if (dateTo) filters.push(`date=lte.${encodeURIComponent(dateTo)}`);
    filters.push('order=date.desc');
    const rows = await fetchAllPaginated(`complaints_entries?${filters.join('&')}`);
    const mapped = Array.isArray(rows) ? rows.map(fromRemoteComplaintEntry) : [];
    return {
      active: mapped.filter((item) => !item.isArchived),
      archive: mapped.filter((item) => item.isArchived),
    };
  }

  if (!includeArchive) {
    // Faqat active complaints (is_archived=false)
    const rows = await fetchAllPaginated(
      'complaints_entries?select=*&is_deleted=eq.false&is_archived=eq.false&order=date.desc'
    );
    const mapped = Array.isArray(rows) ? rows.map(fromRemoteComplaintEntry) : [];
    return { active: mapped, archive: [] };
  }

  if (archiveLimit && archiveLimit > 0) {
    // Active + so'nggi N archive yozuv (boot uchun light variant)
    const [activeRows, archiveRows] = await Promise.all([
      fetchAllPaginated('complaints_entries?select=*&is_deleted=eq.false&is_archived=eq.false&order=date.desc'),
      supabaseRequest(
        `complaints_entries?select=*&is_deleted=eq.false&is_archived=eq.true&order=date.desc&limit=${archiveLimit}`
      ),
    ]);
    const active = Array.isArray(activeRows) ? activeRows.map(fromRemoteComplaintEntry) : [];
    const archive = Array.isArray(archiveRows) ? archiveRows.map(fromRemoteComplaintEntry) : [];
    return { active, archive };
  }

  // To'liq — barcha active + barcha archive (manual sync uchun)
  const rows = await fetchAllPaginated('complaints_entries?select=*&is_deleted=eq.false&order=date.desc');
  const mapped = Array.isArray(rows) ? rows.map(fromRemoteComplaintEntry) : [];
  return {
    active: mapped.filter((item) => !item.isArchived),
    archive: mapped.filter((item) => item.isArchived),
  };
}

export async function upsertComplaintsSnapshotRemote(activeItems = [], archiveItems = []) {
  const payload = [
    ...(activeItems || []).map((item) => toRemoteComplaintEntry(item, false)),
    ...(archiveItems || []).map((item) => toRemoteComplaintEntry(item, true)),
  ];

  if (!payload.length) return [];

  const rows = await supabaseRequest('complaints_entries?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  return Array.isArray(rows) ? rows.map(fromRemoteComplaintEntry) : [];
}

export async function markComplaintDeletedRemote(id) {
  await supabaseRequest(`complaints_entries?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function testComplaintsSupabaseConnection() {
  try {
    await supabaseRequest('complaints_entries?select=id&limit=1');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Supabase complaints connection failed.' };
  }
}

function toRemoteCompensatedRegistryItem(item) {
  return {
    id: item.id,
    track_code: item.trackCode || '',
    compensated_date: item.compensatedDate || null,
    phone: item.phone || '',
    customer: item.customer || '',
    payment_amount: item.paymentAmount || '',
    payment_status: item.paymentStatus || 'Kutmoqda',
    comment: item.comment || '',
    found_case_outcome: item.foundCaseOutcome || '',
    found_resolution_status: item.foundResolutionStatus || 'Jarayonda',
    imported_at: item.importedAt || null,
    updated_at: new Date().toISOString(),
    payload: item,
  };
}

function fromRemoteCompensatedRegistryItem(row) {
  return {
    ...(row.payload && typeof row.payload === 'object' ? row.payload : {}),
    id: row.id,
    trackCode: row.track_code || '',
    compensatedDate: row.compensated_date || '',
    phone: row.phone || '',
    customer: row.customer || '',
    paymentAmount: row.payment_amount || '',
    paymentStatus: row.payment_status || 'Kutmoqda',
    comment: row.comment || '',
    foundCaseOutcome: row.found_case_outcome || '',
    foundResolutionStatus: row.found_resolution_status || 'Jarayonda',
    importedAt: row.imported_at || '',
    updatedAt: row.updated_at || '',
  };
}

export async function fetchCompensatedRegistryRemote() {
  const rows = await fetchAllPaginated('compensated_loads_registry?select=*&order=track_code.asc');
  return Array.isArray(rows) ? rows.map(fromRemoteCompensatedRegistryItem) : [];
}

export async function upsertCompensatedRegistryRemote(items = []) {
  const payload = (items || []).map(toRemoteCompensatedRegistryItem);
  if (!payload.length) return [];

  const rows = await supabaseRequest('compensated_loads_registry?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  return Array.isArray(rows) ? rows.map(fromRemoteCompensatedRegistryItem) : [];
}

export async function testCompensatedSupabaseConnection() {
  try {
    await supabaseRequest('compensated_loads_registry?select=id&limit=1');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Supabase compensated connection failed.' };
  }
}

export async function fetchOtkSettingsRemote() {
  const rows = await supabaseRequest('app_settings?select=payload&id=eq.otk_settings&limit=1');
  if (!Array.isArray(rows) || !rows[0]) return null;
  return rows[0].payload && typeof rows[0].payload === 'object' ? rows[0].payload : null;
}

export async function upsertOtkSettingsRemote(settings) {
  const rows = await supabaseRequest('app_settings?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      id: 'otk_settings',
      payload: settings,
      updated_at: new Date().toISOString(),
    }),
  });

  return Array.isArray(rows) && rows[0] ? rows[0].payload : settings;
}

export async function testSettingsSupabaseConnection() {
  try {
    await supabaseRequest('app_settings?select=id&limit=1');
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Supabase settings connection failed.' };
  }
}
