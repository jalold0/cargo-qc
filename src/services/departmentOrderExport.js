import { format } from 'date-fns';

function safeText(value) {
  return String(value ?? '').trim();
}

function safeSheetName(value) {
  return safeText(value).replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet';
}

function addSheet(XLSX, workbook, name, rows, widths = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = widths.map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(name));
}

function buildMetricRows(stats, monthLabel, labels) {
  return [
    [labels.coreShareTitle, `${stats.coreShare}%`, `${stats.coreTrackCount.toLocaleString('ru-RU')} ${labels.coreShareMeta}`],
    [labels.extraShareTitle, `${stats.extraShare}%`, `${stats.extraTrackCount.toLocaleString('ru-RU')} ${labels.extraShareMeta}`],
    [labels.monthlyFlowTitle, stats.monthlyTracks, `${monthLabel} ${labels.monthlyFlowMeta}`],
    [labels.employeeFlowTitle, `${stats.leaderDailyFlow} ${labels.tracksShort}`, stats.employeeFlowMeta],
    [labels.estimatedTimeTitle, stats.estimatedDailyTime, stats.employeeTimeMeta],
    [
      labels.forecastTitle,
      `${stats.nextMonthForecast.toLocaleString('ru-RU')} ${labels.tracksShort}`,
      `${stats.forecastMeta} (${labels.vsCurrentMonth}: ${stats.nextMonthChangePct > 0 ? '+' : ''}${stats.nextMonthChangePct}%)`,
    ],
  ];
}

function buildSummarySheetRows({ content, stats, labels, periodLabel, generatedAt }) {
  const rows = [
    ['WORKPLACE CRM'],
    [labels.pageTitle],
    [content.subtitle],
    [],
    [`${labels.periodLabel}: ${periodLabel}`],
    [`${labels.generatedAtLabel}: ${generatedAt}`],
    [],
    ['Statistika', 'Qiymat', 'Izoh'],
    ...buildMetricRows(stats, periodLabel.split(' ')[0], labels),
    [],
    [labels.forecastTitle],
    [labels.forecastTitle, `${stats.nextMonthForecast.toLocaleString('ru-RU')} ${labels.tracksShort}`],
    [labels.vsCurrentMonth, `${stats.nextMonthChangePct > 0 ? '+' : ''}${stats.nextMonthChangePct}%`],
    ['Taxminiy yuklama', stats.forecast.label],
    ['Taxminiy vaqt', formatDuration(stats.forecast.estimatedMinutes)],
    [],
    ['Forecast detal'],
    ['Ko‘rsatkich', 'Qiymat'],
    ['Joriy oy', `${stats.forecast.currentValue.toLocaleString('ru-RU')} ${labels.tracksShort}`],
    ['Oldingi oy', `${stats.forecast.previousValue.toLocaleString('ru-RU')} ${labels.tracksShort}`],
    ["So'nggi 4 oy o'rtachasi", `${stats.forecast.recentAverage.toLocaleString('ru-RU')} ${labels.tracksShort}`],
    ['Umumiy tarixiy o‘rtacha', `${stats.forecast.overallAverage.toLocaleString('ru-RU')} ${labels.tracksShort}`],
    ['Trend', `${stats.forecast.trend > 0 ? '+' : ''}${stats.forecast.trend} ${labels.tracksShort}`],
    [],
    ['Forecast izohlari'],
    ['Sarlavha', 'Qiymat', 'Tavsif'],
    ...stats.forecast.drivers.map((driver) => [driver.title, driver.value, driver.description]),
  ];

  return rows;
}

function buildLeaderRows(content, labels) {
  return [
    ['No', labels.leaderResponsibilitiesTitle, labels.descriptionColumn],
    ...(content.leaderResponsibilities || []).map((item, index) => [
      index + 1,
      safeText(item.title),
      safeText(item.description),
    ]),
  ];
}

function buildCoreRows(content, labels) {
  return [
    ['No', labels.coreTaskColumn, labels.descriptionColumn],
    ...(content.core || []).map((item, index) => [
      index + 1,
      safeText(item.title),
      safeText(item.description),
    ]),
  ];
}

function buildAssignmentRows(content, labels) {
  return [
    ['No', labels.departmentTask, labels.responsiblePerson, `${labels.assistant} 1`, `${labels.assistant} 2`, `${labels.assistant} 3`, `${labels.assistant} 4`],
    ...(content.actualAssignments || []).map((item, index) => [
      index + 1,
      safeText(item.task),
      safeText(item.responsible) || '-',
      safeText(item.assistants?.[0]) || '-',
      safeText(item.assistants?.[1]) || '-',
      safeText(item.assistants?.[2]) || '-',
      safeText(item.assistants?.[3]) || '-',
    ]),
  ];
}

function buildSimpleRows(items = [], title = 'Matn') {
  return [
    ['No', title],
    ...items.map((item, index) => [index + 1, safeText(item)]),
  ];
}

function formatDuration(totalMinutes) {
  if (!totalMinutes) return '0 soat';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} daqiqa`;
  if (!minutes) return `${hours} soat`;
  return `${hours} soat ${minutes} daqiqa`;
}

export async function exportDepartmentOrderWorkbook({
  content,
  stats,
  monthLabel,
  selectedMonth,
  selectedYear,
  labels,
}) {
  const XLSX = await import('xlsx');
  const generatedAt = format(new Date(), 'dd.MM.yyyy HH:mm');
  const periodLabel = `${monthLabel} ${selectedYear}`;
  const workbook = XLSX.utils.book_new();

  addSheet(
    XLSX,
    workbook,
    labels.pageTitle,
    buildSummarySheetRows({ content, stats, labels, periodLabel, generatedAt }),
    [28, 24, 60]
  );

  addSheet(
    XLSX,
    workbook,
    labels.leaderResponsibilitiesTitle,
    buildLeaderRows(content, labels),
    [8, 40, 90]
  );

  addSheet(
    XLSX,
    workbook,
    labels.coreTitle,
    buildCoreRows(content, labels),
    [8, 42, 90]
  );

  addSheet(
    XLSX,
    workbook,
    labels.assignmentsTitle,
    buildAssignmentRows(content, labels),
    [8, 70, 24, 22, 22, 22, 22]
  );

  addSheet(
    XLSX,
    workbook,
    labels.workflowTitle,
    buildSimpleRows(content.workflow || [], labels.workflowTitle),
    [8, 110]
  );

  addSheet(
    XLSX,
    workbook,
    labels.indicatorsTitle,
    buildSimpleRows(content.indicators || [], labels.indicatorsTitle),
    [8, 110]
  );

  XLSX.writeFile(
    workbook,
    `BOLIM_TARTIB_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}_${format(new Date(), 'HH-mm')}.xlsx`
  );
}
