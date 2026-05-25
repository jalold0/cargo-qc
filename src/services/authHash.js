// src/services/authHash.js
// Parolni client-side SHA-256 bilan hashlash.
// MUHIM: Bu BACKEND yo'q paytdagi vaqtinchalik yechim.
// Real backend ulansa, hash'lash backendda bcrypt/argon2 bilan qilinishi shart.
//
// Bu hashlash:
//   - localStorage'da plain-text parolni saqlanishini oldini oladi
//   - DevTools orqali parolni darrov o'qishni qiyinlashtiradi
//   - Lekin to'g'ridan-to'g'ri brute-force/rainbow table'ga qarshi himoya emas

const HASH_PREFIX = 'sha256:';
const ENCODER = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

/**
 * Parolni SHA-256 hash qiladi.
 * Plain-text bo'lsa hash'laydi.
 * Allaqachon hash'langan bo'lsa, qaytarib beradi (idempotent).
 */
export async function hashPassword(value) {
  const text = String(value ?? '');
  if (!text) return '';
  // Allaqachon hash bo'lsa, qayta hashlash kerak emas
  if (text.startsWith(HASH_PREFIX)) return text;
  if (!ENCODER || typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: hashlash imkoni yo'q (eski brauzer / non-secure context)
    return text;
  }
  try {
    const buffer = ENCODER.encode(text);
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = new Uint8Array(digest);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${HASH_PREFIX}${hex}`;
  } catch (error) {
    console.error('hashPassword failed', error);
    return text;
  }
}

/**
 * Plain-text parol va hashlangan parolni solishtiradi.
 * - storedPassword hash bo'lsa, kiritilgan parolni hash qilib solishtiradi.
 * - storedPassword plain bo'lsa, to'g'ridan-to'g'ri solishtiradi (legacy support).
 */
export async function verifyPassword(plainPassword, storedPassword) {
  const plain = String(plainPassword ?? '');
  const stored = String(storedPassword ?? '');
  if (!plain || !stored) return false;
  // Eski plain-text parol (migratsiya kerak)
  if (!stored.startsWith(HASH_PREFIX)) {
    return plain === stored;
  }
  const hashed = await hashPassword(plain);
  return hashed === stored;
}

/**
 * Tekshiradi: parol hash holatda yoki yo'q
 */
export function isHashed(value) {
  return String(value ?? '').startsWith(HASH_PREFIX);
}
