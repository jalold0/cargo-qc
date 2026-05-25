// ============================================================
// dataPredicates.js — pure predicate va normalizer funksiyalar
// ------------------------------------------------------------
// localData.js ichidan ko'chirildi. Hech qanday storage'ga
// tegmaydi, hech qanday tashqi state'ga bog'liq emas. Faqat
// kirgan qiymatni tahlil qiladi yoki normallashtiradi.
// ============================================================

import { parseAppDate } from './entryNormalizer';

// ------------------------------------------------------------
// Person label normalizer (lowercase + trim + bitta probel)
// ------------------------------------------------------------
export function normalizePersonLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Isfandiyor nomli foydalanuvchini aniqlash
export function isIsfandiyorLabel(value) {
  return normalizePersonLabel(value).includes('isfandiyor');
}

// ------------------------------------------------------------
// Trek raqami normalizatori (lowercase + trim)
// ------------------------------------------------------------
export function normalizeTrackCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

// ------------------------------------------------------------
// Muammo turi tekshiruvchilari (qoplab berilgan / vozvrat)
// ------------------------------------------------------------
export function isCompensatedProblemType(value) {
  return normalizePersonLabel(value).includes('qoplab berilgan');
}

export function isCompensatedRecoveredProblemType(value) {
  return normalizePersonLabel(value).includes('vozvrat');
}

// ------------------------------------------------------------
// Ism qidirish kalitini normallashtirish (Mirzakbarov / Jaloldin
// imloviy farqlarini bir xil shaklga keltirish)
// ------------------------------------------------------------
export function normalizeAssignmentPersonKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/mirzakbarov/g, 'mirzakbarov')
    .replace(/jallol/g, 'jalol')
    .replace(/mi[r]?zakbarov/g, 'mirzakbarov')
    .replace(/['`‘’"]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Bo'lim rahbari rolimi (admin / manager / menejer)?
export function isDepartmentLeadRole(role) {
  const value = String(role || '').trim().toLowerCase();
  return value === 'admin' || value === 'manager' || value === 'menejer';
}

// ------------------------------------------------------------
// Eski "admin" username/hisobini tekshirish — Jaloldinga migratsiya
// ------------------------------------------------------------
export function isLegacyAdminUser(user) {
  const username = String(user?.username || '').trim().toLowerCase();
  const fullName = String(user?.full_name || '').trim().toLowerCase();
  return username === 'admin' || fullName === 'admin';
}

export function isJaloldinMirzakbarovUser(user) {
  const normalized = normalizeAssignmentPersonKey(
    `${user?.full_name || ''} ${user?.username || ''}`,
  );
  if (!normalized) return false;

  return (
    normalized.includes('jaloldin') ||
    normalized.includes('jaloliddin') ||
    normalized.includes('jallolidin') ||
    (normalized.includes('mirzakbarov') && normalized.includes('jal'))
  );
}

// ------------------------------------------------------------
// Departament uchun ism aliaslari (Imlo xilma-xilliklari)
// ------------------------------------------------------------
export const DEPARTMENT_ASSIGNMENT_NAME_ALIASES = {
  jaloliddin: 'Jaloldin Mirzakbarov',
  jallolidin: 'Jaloldin Mirzakbarov',
  jaloldin: 'Jaloldin Mirzakbarov',
  saidali: 'Saidali',
  jasur: 'Jasur',
  shahnoza: 'Shahnoza',
  ulugbek: "Ulug'bek",
  admin: 'Jaloldin Mirzakbarov',
};

// ------------------------------------------------------------
// Yozuvning tartiblash vaqti (sana yo'q bo'lsa importedAt yoki
// updatedAt'ga tushish) — eng katta son qaytarsa, oxirgi
// pozitsiyaga joylashadi.
// ------------------------------------------------------------
export function resolveEntryOrderTime(entry) {
  return (
    [entry?.date, entry?.importedAt, entry?.updatedAt]
      .map((value) => parseAppDate(value))
      .map((value) => value?.getTime())
      .find((value) => Number.isFinite(value)) ?? Number.MAX_SAFE_INTEGER
  );
}

// Trek yozuvi tartiblash uchun comparator (sana → status → id)
export function compareTrackEntryOrder(left, right) {
  const leftTime = resolveEntryOrderTime(left);
  const rightTime = resolveEntryOrderTime(right);

  if (leftTime !== rightTime) return leftTime - rightTime;

  const leftStatusRank = left.archiveStatus === 'active' ? 0 : 1;
  const rightStatusRank = right.archiveStatus === 'active' ? 0 : 1;
  if (leftStatusRank !== rightStatusRank) return leftStatusRank - rightStatusRank;

  return String(left.id).localeCompare(String(right.id));
}
