// ============================================================
// usersRemote.js — Supabase `users` jadvali bilan ishlash
// ------------------------------------------------------------
// Custom auth (Supabase Auth ishlatilmaydi). Faqat REST API:
//   - fetchUsersRemote()       — barcha foydalanuvchilarni o'qish
//   - findUserByUsernameRemote — username bo'yicha bitta yozuv
//   - upsertUserRemote         — yaratish yoki yangilash
//   - deleteUserRemote         — o'chirish
//   - bulkUpsertUsersRemote    — sync uchun bir-zumda ko'plab yozuvlar
//
// Eslatma: agar `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env'lar
// to'ldirilmagan bo'lsa, barcha funksiyalar `null` yoki bo'sh qaytaradi.
// Hech qachon throw qilmaydi — frontend graceful fallback'ga tushadi.
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const REST_BASE = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1` : '';

export const isUsersRemoteEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function buildHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function safeRequest(path, init = {}, timeoutMs = 15000) {
  if (!isUsersRemoteEnabled) return null;

  // AbortController — timeout chiqsa request bekor qilinadi (15s)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${REST_BASE}/${path}`, {
      ...init,
      headers: buildHeaders(init.headers),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Xato matnini console'da ko'rsatamiz — diagnostika oson bo'lsin.
      // Avval silently fail edi, debug qilish imkonsiz edi.
      let body = '';
      try {
        body = await response.text();
      } catch {
        // ignore
      }
      console.warn(
        `[usersRemote] ${init.method || 'GET'} ${path} → ${response.status} ${response.statusText}`,
        body.slice(0, 500),
      );
      return null;
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    console.warn(
      `[usersRemote] ${init.method || 'GET'} ${path} — network/timeout xato:`,
      error?.message || error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// Field mapping — Supabase snake_case ↔ frontend camelCase
// ------------------------------------------------------------

function toRemoteUser(user) {
  return {
    // id ni faqat yangi yozuvlar uchun yubormaymiz (Supabase generate qiladi)
    // lekin upsert uchun, mavjud id'ni saqlash kerak
    ...(typeof user.id === 'string' && user.id.length >= 30 ? { id: user.id } : {}),
    username: String(user.username || '').trim(),
    password_hash: String(user.password || user.password_hash || ''),
    full_name: String(user.full_name || user.fullName || '').trim(),
    role: String(user.role || 'operator').trim(),
    avatar_url: String(user.avatarUrl || user.avatar_url || ''),
    active: user.active !== false,
    work_start: String(user.workStart || user.work_start || ''),
    work_end: String(user.workEnd || user.work_end || ''),
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
  };
}

function fromRemoteUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username || '',
    password: row.password_hash || '',  // legacy frontend nomi
    full_name: row.full_name || '',
    role: row.role || 'operator',
    avatarUrl: row.avatar_url || '',
    active: row.active !== false,
    workStart: row.work_start || '',
    workEnd: row.work_end || '',
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export async function fetchUsersRemote() {
  // Users — odatda 100tagacha, lekin pagination xavfsizlik uchun
  const allUsers = [];
  let offset = 0;
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await safeRequest(`users?select=*&order=created_at.asc&limit=1000&offset=${offset}`);
    if (!Array.isArray(rows) || rows.length === 0) break;
    allUsers.push(...rows);
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return allUsers.map(fromRemoteUser).filter(Boolean);
}

// Username bo'yicha qidirish — login uchun asosiy entry point.
// Case-insensitive: 'mirzakbarov.jaloldin' va 'MIRZAKBAROV.JALOLDIN' bir xil.
export async function findUserByUsernameRemote(username) {
  if (!isUsersRemoteEnabled) return null;
  const normalized = String(username || '').trim().toLowerCase();
  if (!normalized) return null;

  // PostgREST ilike — case-insensitive match
  const rows = await safeRequest(
    `users?select=*&username=ilike.${encodeURIComponent(normalized)}&active=eq.true&limit=1`,
  );

  if (Array.isArray(rows) && rows[0]) return fromRemoteUser(rows[0]);
  return null;
}

// ------------------------------------------------------------
// WRITE
// ------------------------------------------------------------

export async function upsertUserRemote(user) {
  if (!isUsersRemoteEnabled) return null;

  const payload = toRemoteUser(user);
  // username unique constraint asosida upsert
  const rows = await safeRequest('users?on_conflict=username', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (Array.isArray(rows) && rows[0]) return fromRemoteUser(rows[0]);
  return null;
}

export async function bulkUpsertUsersRemote(users = []) {
  if (!isUsersRemoteEnabled) {
    return { inserted: 0, updated: 0, failed: 0, reason: 'remote-disabled' };
  }
  if (!Array.isArray(users) || users.length === 0) {
    return { inserted: 0, updated: 0, failed: 0 };
  }

  // KRITIK: PostgREST `on_conflict=username` batch ichida bir xil
  // username ikki marta uchrasa 400 qaytaradi:
  // "21000: ON CONFLICT DO UPDATE command cannot affect row a second time"
  // Username bo'yicha dedupe — oxirgisi g'olib (eng yangi tahrir).
  const seen = new Map();
  users.forEach((u) => {
    const key = String(u?.username || '').trim().toLowerCase();
    if (!key) return; // bo'sh usernameni ham o'tkazib yuboramiz
    seen.set(key, u);
  });
  const deduped = Array.from(seen.values());

  const payload = deduped.map(toRemoteUser);
  const rows = await safeRequest('users?on_conflict=username', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (Array.isArray(rows)) {
    return { inserted: 0, updated: rows.length, failed: 0, items: rows.map(fromRemoteUser) };
  }
  // safeRequest null qaytarsa, xato console'da log qilingan.
  // Bu yerda explicit diagnostika qo'shamiz — caller bilsin.
  return {
    inserted: 0,
    updated: 0,
    failed: payload.length,
    reason: 'network-or-server-error',
  };
}

export async function deleteUserRemote(id) {
  if (!isUsersRemoteEnabled || !id) return false;

  const result = await safeRequest(`users?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });

  // DELETE 204 → null qaytaradi (success)
  // Xato bo'lsa safeRequest null qaytaradi — farqlanmaydi
  // Bu yerda just return true (best-effort)
  return result !== undefined;
}

// ------------------------------------------------------------
// Connection test
// ------------------------------------------------------------

export async function testUsersRemoteConnection() {
  if (!isUsersRemoteEnabled) {
    return { ok: false, message: 'Supabase env to\'ldirilmagan' };
  }

  const rows = await safeRequest('users?select=id&limit=1');
  if (rows === null) {
    return { ok: false, message: 'Supabase ga ulanish yo\'q yoki permission xatolik' };
  }
  return { ok: true, message: 'Ulanish muvaffaqiyatli' };
}
