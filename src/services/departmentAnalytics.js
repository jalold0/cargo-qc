import { toDateKey } from './localData';

function normalizePersonKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['`‘’"]/g, '')
    .replace(/o‘|o'|g‘|g'/g, (match) => (match.startsWith('o') ? 'o' : 'g'))
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLeaderKeySet(users = []) {
  const values = new Set();

  users.forEach((item) => {
    const full = normalizePersonKey(item?.full_name);
    const username = normalizePersonKey(item?.username);

    [full, username].filter(Boolean).forEach((value) => {
      values.add(value);
      value
        .split(' ')
        .map((part) => part.trim())
        .filter((part) => part.length >= 4)
        .forEach((part) => values.add(part));
    });
  });

  values.add('jaloldin');
  values.add('jaloliddin');
  values.add('jallolidin');
  values.add('mirzakbarov jaloldin');

  return values;
}

function buildProblemMinutesLookup(problemTypes = []) {
  return new Map(
    (problemTypes || [])
      .map((item) => ({
        name: String(item?.name || '').trim().toLowerCase(),
        minutes: Math.max(0, Number(item?.minutes) || 0),
      }))
      .filter((item) => item.name)
      .map((item) => [item.name, item.minutes])
  );
}

function getEntryEstimatedMinutes(entry, minutesLookup) {
  const key = String(entry?.problemType || '').trim().toLowerCase();
  if (!key) return 0;
  return Math.max(0, Number(minutesLookup.get(key)) || 0);
}

function parseWorkTimeToMinutes(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const [hoursText, minutesText = '0'] = raw.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

const DEFAULT_LUNCH_BREAK_MINUTES = 60;

function getUserWorkdayMinutes(user) {
  const startMinutes = parseWorkTimeToMinutes(user?.workStart);
  const endMinutes = parseWorkTimeToMinutes(user?.workEnd);

  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return 0;
  return Math.max(0, (endMinutes - startMinutes) - DEFAULT_LUNCH_BREAK_MINUTES);
}

function getMonthLabel(monthIndex) {
  const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
  return months[monthIndex] || `Oy ${monthIndex + 1}`;
}

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function formatDuration(totalMinutes) {
  if (!totalMinutes) return '0 soat';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} daqiqa`;
  if (!minutes) return `${hours} soat`;
  return `${hours} soat ${minutes} daqiqa`;
}

function pluralizeEmployees(count) {
  return count === 1 ? 'hodim' : 'hodim';
}

function isAdditionalDepartmentWorkEntry(entry) {
  const haystack = normalizePersonKey(
    [
      entry?.problemType,
      entry?.department,
      entry?.requestSource,
      entry?.comment,
      entry?.status,
      entry?.trackCode,
    ].join(' ')
  );

  const additionalPatterns = [
    '102',
    'qoplab',
    'kompens',
    'musodara',
    'inventar',
    'adashgan',
    'moliya',
    'tolov',
    'to lov',
    'operator',
    'zapros',
    'zayavka',
    'zayavkalar',
    'raqobatni rivojlantirish',
    'istemolchilar huquqlari',
    'qomita',
    'qo mita',
    'vozvrat',
    'relog',
    'fargo',
    '32057',
    '62025',
    '006',
    'filialga yonaltirish',
    'filialga yonaltir',
    'yonaltirish',
    'yonaltir',
    'baza',
    'botda korinmagan',
    'sortirovka id si chiqmagan',
  ];

  return additionalPatterns.some((pattern) => haystack.includes(pattern));
}

// Ish kunlari: faqat Yakshanba (kuni=0) dam, qolgan 6 kun ish.
// Uzbekistondagi standart ish rejimi — 6 kunlik (Du-Sha).
function countWorkdays(year, month, referenceDate) {
  const cursor = new Date(year, month, 1);
  const isCurrentPeriod = year === referenceDate.getFullYear() && month === referenceDate.getMonth();
  const end = isCurrentPeriod
    ? new Date(year, month, referenceDate.getDate())
    : new Date(year, month + 1, 0);
  let total = 0;

  while (cursor <= end) {
    const day = cursor.getDay();
    // Faqat Yakshanba (0) dam. Shanba (6) ham ish kuni.
    if (day !== 0) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total || 1;
}

function buildForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, trend, total }) {
  const drivers = [];

  if (trend < 0) {
    drivers.push({
      tone: 'negative',
      title: "Joriy oy oldingi oydan past",
      value: `${Math.abs(trend)} trek`,
      description: `Oldingi oyda ${previousValue} ta, joriy oyda ${currentValue} ta trek qayd etilgan.`,
    });
  } else if (trend > 0) {
    drivers.push({
      tone: 'positive',
      title: "Joriy oy sur'ati yuqori",
      value: `+${trend} trek`,
      description: `Joriy oy oldingi oyga nisbatan ${trend} ta ko'proq trek yig'di.`,
    });
  } else {
    drivers.push({
      tone: 'neutral',
      title: "Joriy oy sur'ati barqaror",
      value: `${currentValue} trek`,
      description: "Joriy oy va oldingi oy hajmi deyarli bir xil bo'lib turibdi.",
    });
  }

  const recentGap = roundMetric(currentValue - recentAverage);
  drivers.push({
    title: "So'nggi oylar ritmi",
    value: `${recentGap > 0 ? '+' : ''}${recentGap} trek`,
    description: `So'nggi 4 oy o'rtachasi ${roundMetric(recentAverage)} ta bo'lib, joriy oy shu temp bilan solishtirildi.`,
    tone: recentGap > 0 ? 'positive' : recentGap < 0 ? 'negative' : 'neutral',
  });

  drivers.push({
    title: 'Umumiy tarixiy fon',
    value: `${roundMetric(overallAverage)} trek`,
    description: `Prognoz umumiy tarix bo'yicha o'rtacha ${roundMetric(overallAverage)} trek fonini ham hisobga oladi.`,
    tone: 'neutral',
  });

  drivers.push({
    title: 'Yakuni prognoz',
    value: `${total} trek`,
    description: "Bu qiymat joriy oy, yaqin 4 oy ritmi va umumiy tarixiy oqimning aralash formulasi asosida hisoblandi.",
    tone: 'neutral',
  });

  return drivers;
}

function forecastNextMonth(records, year, month, minutesLookup = new Map()) {
  const counts = new Map();

  records.forEach((entry) => {
    const key = toDateKey(entry?.date).slice(0, 7);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const currentKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const previousKeys = [];

  for (let offset = 0; offset < 4; offset += 1) {
    const cursor = new Date(year, month - offset, 1);
    previousKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
  }

  const currentValue = counts.get(currentKey) || 0;
  const previousValue = counts.get(previousKeys[1]) || currentValue;
  const recentValues = previousKeys.map((key) => counts.get(key) || 0);
  const recentAverage = recentValues.length ? recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length : 0;
  const overallAverage = counts.size
    ? Array.from(counts.values()).reduce((sum, value) => sum + value, 0) / counts.size
    : 0;
  const trend = currentValue - previousValue;
  const blended = (recentAverage * 0.5) + (overallAverage * 0.35) + (currentValue * 0.15) + (trend * 0.25);
  const total = Math.max(0, Math.round(blended));
  const nextDate = new Date(year, month + 1, 1);
  const changePct = currentValue > 0
    ? Math.round(((total - currentValue) / currentValue) * 100)
    : (total > 0 ? 100 : 0);

  const currentMonthMinutes = records
    .filter((entry) => toDateKey(entry?.date).startsWith(currentKey))
    .reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const averageMinutes = currentValue ? (currentMonthMinutes / currentValue) : 0;

  return {
    label: `${getMonthLabel(nextDate.getMonth())} ${nextDate.getFullYear()}`,
    total,
    changePct,
    currentValue,
    previousValue,
    recentAverage: roundMetric(recentAverage),
    overallAverage: roundMetric(overallAverage),
    trend,
    estimatedMinutes: Math.round(total * averageMinutes),
    drivers: buildForecastDrivers({ currentValue, previousValue, recentAverage, overallAverage, trend, total }),
  };
}

/**
 * Department analytics — Rahbar ko'rinishi va prognozlar uchun.
 *
 * @param {Array}  recordsSource — Murojaatlar yozuvlari
 * @param {Array}  usersSource — Hodimlar ro'yxati
 * @param {Array}  problemTypes — muammo turlari (vaqt me'yorlari uchun)
 * @param {number} selectedMonth — 0..11
 * @param {number} selectedYear — masalan 2026
 * @param {Object} extraSources — qo'shimcha manbalardan ham trek oqimini hisobga olish uchun:
 *                  { warehouse?: Array<{returnDate|createdAt}>, module102?: Array<{createdAt, tracks?: Array}>,
 *                    assistantAi?: Array<{createdAt|updatedAt}> }
 *                  Bu funksiyalar har bir manbadan virtual yozuvlar yaratadi (faqat `date` va `isExtra` flag bilan)
 *                  va `records` ga qo'shadi — natija prognoz formulasiga ham ta'sir qiladi.
 */
export function buildDepartmentStatsAligned(
  recordsSource = [],
  usersSource = [],
  problemTypes = [],
  selectedMonth,
  selectedYear,
  extraSources = {}
) {
  const now = new Date();
  const targetMonth = Number.isInteger(selectedMonth) ? selectedMonth : now.getMonth();
  const targetYear = Number.isInteger(selectedYear) ? selectedYear : now.getFullYear();
  const targetMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const baseRecords = Array.isArray(recordsSource) ? recordsSource : [];

  // Qo'shimcha manbalardan virtual yozuvlar yasaymiz — har biri `date` va
  // `isExtra` markeriga ega. `isAdditionalDepartmentWorkEntry()` Toshkent
  // ombori yozuvlarini "qo'shimcha ish" deb belgilashi uchun maxsus
  // marker maydonlardan foydalanamiz.
  const extraRecords = [];
  const fmt = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Warehouse — har bir vozvrat = 1 trek, isExtra=true (yordamchi ish)
  (extraSources.warehouse || []).forEach((item) => {
    const dateKey = fmt(item?.returnDate || item?.createdAt);
    if (!dateKey) return;
    extraRecords.push({ date: dateKey, problemType: item?.problemType || 'Vozvrat', __isExtraWork: true });
  });

  // Module 102 — har entry ichidagi tracks soni (entry yo'qsa 1)
  (extraSources.module102 || []).forEach((entry) => {
    const dateKey = fmt(entry?.createdAt);
    if (!dateKey) return;
    const tracks = Array.isArray(entry?.tracks) && entry.tracks.length > 0 ? entry.tracks : [{}];
    tracks.forEach((t) => {
      extraRecords.push({ date: dateKey, problemType: t?.reason104 || t?.problemType || '102 — Murojaat' });
    });
  });

  // Assistent AI — har request = 1 trek
  (extraSources.assistantAi || []).forEach((item) => {
    const dateKey = fmt(item?.createdAt || item?.updatedAt);
    if (!dateKey) return;
    extraRecords.push({ date: dateKey, problemType: item?.problemType || 'Assistent AI' });
  });

  const records = baseRecords.concat(extraRecords);
  const users = Array.isArray(usersSource) ? usersSource.filter((item) => item?.active !== false) : [];
  const minutesLookup = buildProblemMinutesLookup(problemTypes);
  const leaders = users.filter((item) => {
    const role = String(item?.role || '').trim().toLowerCase();
    return role === 'admin' || role === 'manager' || role === 'menejer';
  });

  const monthlyRecords = records.filter((entry) => toDateKey(entry?.date).startsWith(targetMonthPrefix));

  // "Hodimlar kunlik oqimi" — barcha hodimlarning to'liq trek oqimi
  // (faqat admin/manager rolidagi `handledBy` yozuvlari bilan emas).
  // Sababi: Excel import qilingan yozuvlarning ko'pi `handledBy='OTK workplace'`
  // bo'ladi va leader filtridan o'tmasdi → kunlik oqim juda kichik chiqardi.
  // Endi oydagi hamma yozuvlar / oyning haqiqiy ish kunlari (Shanba ham
  // ish kuni — faqat Yakshanba dam).

  const workloadSplit = monthlyRecords.reduce(
    (accumulator, entry) => {
      if (isAdditionalDepartmentWorkEntry(entry)) {
        accumulator.extra += 1;
      } else {
        accumulator.core += 1;
      }
      return accumulator;
    },
    { core: 0, extra: 0 }
  );

  const workdaysElapsed = countWorkdays(targetYear, targetMonth, now);
  // Butun jamoa kunlik oqimi — oyning JAMI yozuvlari / ish kunlari
  const teamDailyAverageRaw = workdaysElapsed ? monthlyRecords.length / workdaysElapsed : 0;
  const leaderDailyFlow = roundMetric(teamDailyAverageRaw);
  const leaderCount = leaders.length || 1;
  const perEmployeeDailyFlow = roundMetric(teamDailyAverageRaw / leaderCount);
  // Ish vaqti — har bir yozuvga muammo turi bo'yicha taxminiy daqiqalar
  const monthlyTeamMinutes = monthlyRecords.reduce(
    (sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup),
    0
  );
  const estimatedMinutes = workdaysElapsed ? Math.round(monthlyTeamMinutes / workdaysElapsed) : 0;
  const perEmployeeMinutes = leaderCount ? Math.round(estimatedMinutes / leaderCount) : 0;
  const totalLeaderWorkMinutesPerDay = leaders.reduce((sum, leader) => sum + getUserWorkdayMinutes(leader), 0);
  const perEmployeeCapacityMinutes = leaderCount ? Math.round(totalLeaderWorkMinutesPerDay / leaderCount) : 0;
  const forecast = forecastNextMonth(records, targetYear, targetMonth, minutesLookup);

  return {
    coreTrackCount: workloadSplit.core,
    extraTrackCount: workloadSplit.extra,
    coreShare: monthlyRecords.length ? Math.round((workloadSplit.core / monthlyRecords.length) * 100) : 0,
    extraShare: monthlyRecords.length ? Math.round((workloadSplit.extra / monthlyRecords.length) * 100) : 0,
    monthlyTracks: monthlyRecords.length,
    monthLabel: getMonthLabel(targetMonth),
    leaderDailyFlow,
    estimatedDailyTime: formatDuration(estimatedMinutes),
    employeeFlowMeta: `${leaderCount} ${pluralizeEmployees(leaderCount)} orasida har biriga o'rtacha ${perEmployeeDailyFlow} trek`,
    employeeTimeMeta: `${leaderCount} ${pluralizeEmployees(leaderCount)} orasida har biriga o'rtacha ${formatDuration(perEmployeeMinutes)} / me'yor ${formatDuration(perEmployeeCapacityMinutes)}`,
    nextMonthForecast: forecast.total,
    nextMonthChangePct: forecast.changePct,
    forecastMeta: `${forecast.label} uchun taxmin • ${formatDuration(forecast.estimatedMinutes)}`,
    forecast,
  };
}

export function buildProjectPassportOverview({
  recordsSource = [],
  usersSource = [],
  settings = {},
  compensatedRegistry = [],
  recoveredCompensated = [],
  extraSources = {},
} = {}) {
  const records = Array.isArray(recordsSource) ? recordsSource : [];
  const users = Array.isArray(usersSource) ? usersSource.filter((item) => item?.active !== false) : [];
  const safeSettings = settings && typeof settings === 'object' ? settings : {};

  // Murojaatlar (asosiy)
  let totalRecords = records.length;
  let inProgress = records.filter((item) => item?.status !== 'Yopildi').length;
  let closed = records.filter((item) => item?.status === 'Yopildi').length;

  // Toshkent ombori — vozvrat treklarini "closed" deb hisoblaymiz
  // (omborga keldi = oqim yopildi)
  const warehouseList = Array.isArray(extraSources.warehouse) ? extraSources.warehouse : [];
  totalRecords += warehouseList.length;
  closed += warehouseList.length;

  // 102 — OTK — entrylar va ulardagi tracklar
  const module102List = Array.isArray(extraSources.module102) ? extraSources.module102 : [];
  module102List.forEach((entry) => {
    const tracks = Array.isArray(entry?.tracks) && entry.tracks.length > 0 ? entry.tracks : [{ status: entry?.status }];
    tracks.forEach((t) => {
      totalRecords += 1;
      const trackStatus = String(t?.status || entry?.status || '').toLowerCase();
      if (trackStatus === 'yopildi') closed += 1;
      else inProgress += 1;
    });
  });

  // Assistent AI
  const assistantAiList = Array.isArray(extraSources.assistantAi) ? extraSources.assistantAi : [];
  assistantAiList.forEach((item) => {
    totalRecords += 1;
    const aiStatus = String(item?.status || '').toLowerCase();
    if (aiStatus === 'yopildi') closed += 1;
    else inProgress += 1;
  });

  return {
    totalRecords,
    inProgress,
    closed,
    activeUsers: users.length,
    problemTypes: Array.isArray(safeSettings.problemTypes) ? safeSettings.problemTypes.length : 0,
    departments: Array.isArray(safeSettings.departments) ? safeSettings.departments.length : 0,
    sources: Array.isArray(safeSettings.requestSources) ? safeSettings.requestSources.length : 0,
    compensatedCases: Array.isArray(compensatedRegistry) ? compensatedRegistry.length : 0,
    recoveredCompensated: Array.isArray(recoveredCompensated) ? recoveredCompensated.length : 0,
  };
}
