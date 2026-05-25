// ============================================================
// dataHelpers.js — pure helper funksiyalar
// ------------------------------------------------------------
// localData.js fayli juda katta bo'lgani sababli, hech qanday
// storage'ga tegmaydigan kichik utility funksiyalar shu yerga
// ko'chirildi. localData.js ularni qayta-export qiladi, shuning
// uchun barcha mavjud importlar ishlashida davom etadi.
// ============================================================

import { parseAppDate } from './entryNormalizer';

// ------------------------------------------------------------
// publicUser — foydalanuvchi obyektidan password olib tashlash
// ------------------------------------------------------------
export function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// ------------------------------------------------------------
// toDateKey — ixtiyoriy sanani 'YYYY-MM-DD' shakliga keltirish
// ------------------------------------------------------------
export function toDateKey(date) {
  const value = parseAppDate(date);
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toISOString().slice(0, 10);
}

// ------------------------------------------------------------
// parseTrackNumbers — vergul/probel bilan ajratilgan trek
// raqamlari ro'yxatini qaytaradi (takrorlanmagan)
// ------------------------------------------------------------
export function parseTrackNumbers(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[\s,;]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

// ------------------------------------------------------------
// getWaitingDays — yozuv yaratilganidan beri kun soni
// ------------------------------------------------------------
export function getWaitingDays(date) {
  const created = parseAppDate(date);
  if (!created || Number.isNaN(created.getTime())) return 0;
  const today = new Date();
  const start = new Date(created.getFullYear(), created.getMonth(), created.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}

// ------------------------------------------------------------
// getPriorityByWaitingDays — kutilgan kun bo'yicha prioritet
// ------------------------------------------------------------
export function getPriorityByWaitingDays(days) {
  if (days >= 5) return 'Yuqori';
  if (days >= 2) return "O'rta";
  return 'Past';
}

// ------------------------------------------------------------
// applyPriorityRules — yopilmagan yozuvlarga priority hisoblash
// ------------------------------------------------------------
export function applyPriorityRules(entries) {
  return entries.map((entry) => {
    if (entry.status === 'Yopildi') return entry;
    return {
      ...entry,
      priority: getPriorityByWaitingDays(getWaitingDays(entry.date)),
    };
  });
}
