// ============================================================
// Dashboard utilities — pure helper funksiyalar
// ------------------------------------------------------------
// DashboardPage.jsx 4000+ qator bo'lib ketgani uchun, hech qanday
// React state'ga bog'liq bo'lmagan pure funksiyalar shu yerga
// ko'chirildi. Hech qanday hook chaqirishi, side-effect yoki
// React import'i bo'lmasligi shart — shu sababli tree-shake,
// test va boshqa joyda qayta ishlatish oson.
// ============================================================

import { toDateKey } from '../../services/localData';

export function formatDateLabel(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export function formatMoneyShort(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "0 so'm";
  return `${numeric.toLocaleString('ru-RU')} so'm`;
}

export function normalizeDashboardMoney(value) {
  if (value == null || value === '') return 0;
  const numeric = Number(
    String(value)
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '')
  );
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeDashboardText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function buildCompensatedBreakdown(items, key) {
  const map = new Map();
  items.forEach((item) => {
    const name = String(item?.[key] || 'Belgilanmagan').trim() || 'Belgilanmagan';
    map.set(name, (map.get(name) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 8);
}

export function buildCompensatedOverview(registry = [], recoveredItems = []) {
  const totalCompensated = registry.length;
  const recoveredCount = recoveredItems.length;
  const paymentTotal = registry.reduce(
    (sum, item) => sum + normalizeDashboardMoney(item.paymentAmount),
    0,
  );
  const inProgressCount = recoveredItems.filter(
    (item) => item.foundResolutionStatus !== 'Yopildi',
  ).length;
  const closedCount = recoveredItems.filter(
    (item) => item.foundResolutionStatus === 'Yopildi',
  ).length;
  const refundedCount = recoveredItems.filter((item) =>
    normalizeDashboardText(item.foundCaseOutcome).includes('qaytardi'),
  ).length;
  const confiscatedCount = recoveredItems.filter((item) =>
    normalizeDashboardText(item.foundCaseOutcome).includes('musodara'),
  ).length;
  const pendingAmount = recoveredItems
    .filter((item) => item.foundResolutionStatus !== 'Yopildi')
    .reduce((sum, item) => sum + normalizeDashboardMoney(item.paymentAmount), 0);

  return {
    totalCompensated,
    recoveredCount,
    inProgressCount,
    closedCount,
    paymentTotal,
    refundedCount,
    confiscatedCount,
    pendingAmount,
    departmentBreakdown: buildCompensatedBreakdown(recoveredItems, 'department'),
    sourceBreakdown: buildCompensatedBreakdown(recoveredItems, 'requestSource'),
    largestCases: recoveredItems
      .slice()
      .sort(
        (left, right) =>
          normalizeDashboardMoney(right.paymentAmount) -
          normalizeDashboardMoney(left.paymentAmount),
      )
      .slice(0, 8),
    longestCases: recoveredItems
      .filter((item) => item.foundResolutionStatus !== 'Yopildi')
      .slice()
      .sort((left, right) => (right.recoveredDays || 0) - (left.recoveredDays || 0))
      .slice(0, 6),
  };
}

export function getInitialMonth(value) {
  const dateValue = value.from || value.to;
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function formatMonthTitle(date) {
  const monthNames = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function normalizeRange(range) {
  if (range.from && range.to && range.to < range.from) {
    return { from: range.to, to: range.from };
  }
  return range;
}
