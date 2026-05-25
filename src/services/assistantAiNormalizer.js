// ============================================================
// assistantAiNormalizer.js — Assistant AI uchun pure helperlar
// ------------------------------------------------------------
// localData.js ichidan ko'chirildi. Bu funksiyalar storage'ga
// tegmaydi — faqat xom Assistant AI yozuvini canonical shaklga
// keltiradi, freshness'ini hisoblaydi va localdaki/remote'dagi
// ro'yxatlarni birlashtiradi.
// ============================================================

import { parseAppDate } from './entryNormalizer';

// ------------------------------------------------------------
// normalizeAssistantAiRequest — xom yozuvni standart shaklga
// keltiradi (ID, status, sana maydonlari)
// ------------------------------------------------------------
export function normalizeAssistantAiRequest(item) {
  const safeItem = item && typeof item === 'object' ? item : {};
  const normalizedStatus = safeItem.status === 'Yangi' ? 'Qabul qildi' : safeItem.status;
  return {
    id:
      safeItem.id ||
      `assistant-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    trackCode: String(safeItem.trackCode || '').trim(),
    customerId: String(safeItem.customerId || '').trim(),
    phone: String(safeItem.phone || '').trim(),
    fullName: String(safeItem.fullName || '').trim(),
    problemType: String(safeItem.problemType || '').trim(),
    status: ['Qabul qildi', 'Jarayonda', 'Yopildi'].includes(normalizedStatus)
      ? normalizedStatus
      : 'Qabul qildi',
    source: safeItem.source || 'telegram_bot',
    handledBy: String(safeItem.handledBy || '').trim(),
    comment: String(safeItem.comment || '').trim(),
    createdAt: safeItem.createdAt || new Date().toISOString(),
    updatedAt: safeItem.updatedAt || safeItem.createdAt || new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// Seed (boshlang'ich namuna) yozuvlarni aniqlash —
// `assistant-ai-1` va `assistant-ai-2` ID'lari namuna sifatida
// olib tashlangan, ular hech qachon ko'rinmasligi kerak.
// ------------------------------------------------------------
export function isAssistantAiSeedRecord(item) {
  const id = String(item?.id || '').trim().toLowerCase();
  return id === 'assistant-ai-1' || id === 'assistant-ai-2';
}

// ------------------------------------------------------------
// resolveAssistantAiFreshness — yozuv qachon oxirgi marta
// yangilanganini millisekundlarda qaytaradi. Mahalliy va remote
// versiyalarni solishtirish uchun ishlatiladi.
// ------------------------------------------------------------
export function resolveAssistantAiFreshness(item) {
  return (
    [item?.updatedAt, item?.createdAt]
      .map((value) => parseAppDate(value))
      .map((value) => value?.getTime())
      .find((value) => Number.isFinite(value)) ?? 0
  );
}

// ------------------------------------------------------------
// mergeAssistantAiRequests — mahalliy va remote ro'yxatlarni
// ID bo'yicha birlashtiradi, eng yangi versiyani saqlaydi.
// ------------------------------------------------------------
export function mergeAssistantAiRequests(localItems = [], remoteItems = []) {
  const merged = new Map();

  const push = (item) => {
    const normalized = normalizeAssistantAiRequest(item);
    if (!normalized?.id || isAssistantAiSeedRecord(normalized)) return;

    const freshness = resolveAssistantAiFreshness(normalized);
    const current = merged.get(normalized.id);

    if (!current || freshness >= current.freshness) {
      merged.set(normalized.id, { item: normalized, freshness });
    }
  };

  localItems.forEach(push);
  remoteItems.forEach(push);

  return Array.from(merged.values())
    .map((entry) => entry.item)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}
