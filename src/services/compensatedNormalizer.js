// ============================================================
// compensatedNormalizer.js — 104 Moliya yozuvlari uchun pure
// normalizatorlar
// ------------------------------------------------------------
// localData.js ichidan ko'chirildi. Bu funksiyalar hech qanday
// storage'ga tegmaydi — Excel import yoki backend'dan kelgan
// xom ma'lumotni canonical shaklga keltiradi.
//
// CRITICAL: bu fayldagi `normalizeCompensatedRegistry` ilgari
// `assignedTo`, `workflowComment`, `receiptFile` kabi yangi
// maydonlarni tushirib qoldirardi (Bug #51). Endi barcha yangi
// maydonlar to'liq saqlanadi.
// ============================================================

import { parseAppDate } from './entryNormalizer';
import { normalizePersonLabel } from './dataPredicates';

// ------------------------------------------------------------
// normalizeOptionalRegistryDate — sana matnini ISO formatga
// ------------------------------------------------------------
export function normalizeOptionalRegistryDate(value) {
  if (!value) return '';
  const parsed = parseAppDate(value);
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toISOString()
    : String(value).trim();
}

// ------------------------------------------------------------
// normalizePaymentAmount — to'lov summasini raqamga keltirish
// ------------------------------------------------------------
export function normalizePaymentAmount(value) {
  if (value == null || value === '') return '';
  const raw = String(value).trim().replace(/\s+/g, '').replace(',', '.');
  const numeric = Number(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : String(value).trim();
}

// ------------------------------------------------------------
// normalizeCompensatedPaymentStatus — to'lov holatini taniqli
// ro'yxatdan biriga moslash
// ------------------------------------------------------------
export function normalizeCompensatedPaymentStatus(value) {
  const normalized = normalizePersonLabel(value);
  if (!normalized) return 'Kutmoqda';
  if (
    normalized.includes('tolangan') ||
    normalized.includes("to'langan") ||
    normalized.includes('оплач')
  )
    return "To'langan";
  if (normalized.includes('tasdiqlangan') || normalized.includes('подтверж'))
    return 'Tasdiqlangan';
  if (
    normalized.includes('rad etilgan') ||
    normalized.includes('otkazilmadi') ||
    normalized.includes('otkazilmagan') ||
    normalized.includes('отказ')
  )
    return 'Rad etilgan';
  if (normalized.includes('kutmoqda') || normalized.includes('ожида'))
    return 'Kutmoqda';
  return String(value || '').trim() || 'Kutmoqda';
}

// ------------------------------------------------------------
// normalizeCompensatedRecoveryStatus — topilgan yuk workflow
// holati (Qabul qilindi / Jarayonda / Yopildi)
// ------------------------------------------------------------
export function normalizeCompensatedRecoveryStatus(value) {
  const normalized = normalizePersonLabel(value);
  // Yangi default — yangi topilgan yuk birinchi "Qabul qilindi" holatida bo'ladi
  if (!normalized) return 'Qabul qilindi';
  if (
    normalized.includes('yopildi') ||
    normalized.includes('закры') ||
    normalized.includes('closed')
  )
    return 'Yopildi';
  if (
    normalized.includes('jarayon') ||
    normalized.includes('работе') ||
    normalized.includes('progress')
  )
    return 'Jarayonda';
  if (
    normalized.includes('qabul') ||
    normalized.includes('принят') ||
    normalized.includes('accepted') ||
    normalized.includes('accept')
  )
    return 'Qabul qilindi';
  return String(value || '').trim() || 'Qabul qilindi';
}

// ------------------------------------------------------------
// normalizeCompensatedRegistry — to'liq registry yozuvini
// kanonik shaklga keltirish. Yangi workflow maydonlari to'liq
// saqlanadi (Bug #51 tuzatildi).
// ------------------------------------------------------------
export function normalizeCompensatedRegistry(items = []) {
  return (items || [])
    .map((item, index) => {
      const trackCode = String(item?.trackCode || item?.track || '').trim();
      if (!trackCode) return null;
      const compensatedDate = normalizeOptionalRegistryDate(
        item?.compensatedDate || item?.date || item?.compensated_at || item?.compensatedAt,
      );

      return {
        id: item?.id || `compensated-registry-${Date.now()}-${index}`,
        trackCode,
        compensatedDate,
        phone: String(item?.phone || item?.telefon || '').trim(),
        customer: String(item?.customer || item?.mijoz || '').trim(),
        paymentAmount: normalizePaymentAmount(
          item?.paymentAmount || item?.payment || item?.summa || item?.amount,
        ),
        paymentStatus: normalizeCompensatedPaymentStatus(
          item?.paymentStatus ||
            item?.payment_state ||
            item?.paymentState ||
            item?.status ||
            item?.tolovHolati,
        ),
        foundCaseOutcome: String(
          item?.foundCaseOutcome || item?.found_case_outcome || item?.recoveredOutcome || '',
        ).trim(),
        foundResolutionStatus: normalizeCompensatedRecoveryStatus(
          item?.foundResolutionStatus || item?.found_resolution_status || item?.recoveredStatus,
        ),
        // Workflow holatini saqlash uchun yangi maydonlar (avval normalize bularni o'chirib yuborardi!)
        assignedTo: String(item?.assignedTo || '').trim(),
        assignedToId: item?.assignedToId ?? null,
        assignedAt: item?.assignedAt || null,
        workflowComment: String(item?.workflowComment || '').trim(),
        receiptFile: item?.receiptFile || null,
        // CRM-104 maxsus maydonlari (Excel import'dan)
        javobgar: String(item?.javobgar || item?.javobgarShaxs || '').trim(),
        barakaStatus: String(item?.barakaStatus || item?.barakaHolati || '').trim(),
        enteredDate104: item?.enteredDate104 || '',
        comment: String(item?.comment || item?.izoh || '').trim(),
        importedAt: item?.importedAt || new Date().toISOString(),
        updatedAt: item?.updatedAt || item?.importedAt || new Date().toISOString(),
      };
    })
    .filter(Boolean);
}
