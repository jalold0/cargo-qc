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

function countWorkdays(year, month, referenceDate) {
  const cursor = new Date(year, month, 1);
  const isCurrentPeriod = year === referenceDate.getFullYear() && month === referenceDate.getMonth();
  const end = isCurrentPeriod
    ? new Date(year, month, referenceDate.getDate())
    : new Date(year, month + 1, 0);
  let total = 0;

  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
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

export function buildDepartmentStatsAligned(recordsSource = [], usersSource = [], problemTypes = [], selectedMonth, selectedYear) {
  const now = new Date();
  const targetMonth = Number.isInteger(selectedMonth) ? selectedMonth : now.getMonth();
  const targetYear = Number.isInteger(selectedYear) ? selectedYear : now.getFullYear();
  const targetMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const records = Array.isArray(recordsSource) ? recordsSource : [];
  const users = Array.isArray(usersSource) ? usersSource.filter((item) => item?.active !== false) : [];
  const minutesLookup = buildProblemMinutesLookup(problemTypes);
  const leaders = users.filter((item) => {
    const role = String(item?.role || '').trim().toLowerCase();
    return role === 'admin' || role === 'manager' || role === 'menejer';
  });
  const leaderKeys = buildLeaderKeySet(leaders);

  const monthlyRecords = records.filter((entry) => toDateKey(entry?.date).startsWith(targetMonthPrefix));
  const leaderMonthlyRecords = monthlyRecords.filter((entry) => {
    const ownerKey = normalizePersonKey(entry?.handledBy || entry?.createdBy);
    return ownerKey && leaderKeys.has(ownerKey);
  });

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
  const leaderDailyAverageRaw = workdaysElapsed ? leaderMonthlyRecords.length / workdaysElapsed : 0;
  const leaderDailyFlow = roundMetric(leaderDailyAverageRaw);
  const leaderCount = leaders.length || 1;
  const perEmployeeDailyFlow = roundMetric(leaderDailyAverageRaw / leaderCount);
  const monthlyLeaderMinutes = leaderMonthlyRecords.reduce((sum, entry) => sum + getEntryEstimatedMinutes(entry, minutesLookup), 0);
  const estimatedMinutes = workdaysElapsed ? Math.round(monthlyLeaderMinutes / workdaysElapsed) : 0;
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
} = {}) {
  const records = Array.isArray(recordsSource) ? recordsSource : [];
  const users = Array.isArray(usersSource) ? usersSource.filter((item) => item?.active !== false) : [];
  const safeSettings = settings && typeof settings === 'object' ? settings : {};

  return {
    totalRecords: records.length,
    inProgress: records.filter((item) => item?.status !== 'Yopildi').length,
    closed: records.filter((item) => item?.status === 'Yopildi').length,
    activeUsers: users.length,
    problemTypes: Array.isArray(safeSettings.problemTypes) ? safeSettings.problemTypes.length : 0,
    departments: Array.isArray(safeSettings.departments) ? safeSettings.departments.length : 0,
    sources: Array.isArray(safeSettings.requestSources) ? safeSettings.requestSources.length : 0,
    compensatedCases: Array.isArray(compensatedRegistry) ? compensatedRegistry.length : 0,
    recoveredCompensated: Array.isArray(recoveredCompensated) ? recoveredCompensated.length : 0,
  };
}
