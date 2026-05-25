import { mapOtkWorkplaceRow, OTK_WORKPLACE_PROFILE } from './importProfiles';
import { normalizeOtkEntry } from './entryNormalizer';

export const COMPENSATED_LOADS_PROFILE = {
  sheetName: '104 — Barcha treklar',
  columns: [
    { index: 0, key: 'trackCode', source: 'Track', aliases: ['trek', 'track code', 'trackcode', 'trek raqami'], required: true },
    { index: 1, key: 'compensatedDate', source: "Qoplab berilgan sana", aliases: ['date', 'sana', 'kompensatsiya sanasi', "to'langan sana", 'tolangan sana', 'tasdiqlangan sana', '104 ga kirgan'] },
    { index: 2, key: 'phone', source: 'Telefon', aliases: ['phone', 'telefon raqam', 'telefon'] },
    { index: 3, key: 'customer', source: 'Mijoz', aliases: ['customer', 'client', 'mijoz ismi', 'mijoz'] },
    { index: 4, key: 'paymentAmount', source: "To'lov summasi", aliases: ['summa', 'payment amount', 'amount', 'jami summa'] },
    { index: 5, key: 'comment', source: 'Izoh', aliases: ['comment', 'izohlar', 'murojaat sababi (102 izoh)', 'murojaat sababi', '102 izoh'] },
  ],
};

export async function parseOtkWorkbook(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const worksheet =
    workbook.Sheets[OTK_WORKPLACE_PROFILE.sheetName] ||
    workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
  });

  const headerMap = buildHeaderMap(rows[0] || []);
  const dataRows = rows
    .slice(1)
    .map((row, index) => buildMappedRow(row, index + 2, headerMap))
    .filter((row) => row.trackCode);

  const importedAt = new Date().toISOString();
  const entries = dataRows.map((row, index) =>
    mapOtkWorkplaceRow(row, {
      id: `excel-${Date.now()}-${index}`,
      sourceRowKey: `row-${row.rowNumber}`,
      importedAt,
    })
  );

  return {
    fileName: file.name,
    sheetName: worksheet['!ref'] ? (workbook.SheetNames.find((name) => workbook.Sheets[name] === worksheet) || OTK_WORKPLACE_PROFILE.sheetName) : OTK_WORKPLACE_PROFILE.sheetName,
    totalRows: dataRows.length,
    preview: entries.slice(0, 12).map((entry) => ({
      ...entry,
      previewDate: formatPreviewDate(entry.date),
    })),
    entries,
  };
}

export async function downloadOtkTemplate() {
  const XLSX = await import('xlsx');
  const rows = [
    OTK_WORKPLACE_PROFILE.columns.map((column) => column.source),
    ['13.02.2026 12:05:49', 'YT8857819950676', 'Integratsiya', "IT bo'limi", 'Jaloldin', 'Yopildi', 'Mijoz tovarlari mijozdan uzilib qolgan', 'Telegram'],
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, OTK_WORKPLACE_PROFILE.sheetName);
  XLSX.writeFile(workbook, 'OTK_IMPORT_TEMPLATE.xlsx');
}

export async function parseCompensatedLoadsWorkbook(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const worksheet =
    workbook.Sheets[COMPENSATED_LOADS_PROFILE.sheetName] ||
    workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    throw new Error('Worksheet not found');
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
  });

  const headerRow = rows[0] || [];
  const headerMap = buildHeaderMap(headerRow, COMPENSATED_LOADS_PROFILE);
  const dataRows = rows
    .slice(1)
    .map((row, index) => buildCompensatedMappedRow(row, index + 2, headerMap, headerRow))
    .filter((row) => row.trackCode);

  const importedAt = new Date().toISOString();
  const entries = dataRows.map((row, index) => ({
    id: `compensated-excel-${Date.now()}-${index}`,
    trackCode: row.trackCode,
    compensatedDate: row.compensatedDate,
    phone: row.phone,
    customer: row.customer,
    paymentAmount: row.paymentAmount,
    paymentStatus: row.paymentStatus,
    // CRM-104 maxsus maydonlari (alohida saqlanadi, comment'ga aralashtirilmaydi)
    javobgar: row.javobgar || '',
    barakaStatus: row.barakaStatus || '',
    enteredDate104: row.enteredDate104 || '',
    comment: row.comment,
    importedAt,
  }));

  return {
    fileName: file.name,
    sheetName: workbook.SheetNames.find((name) => workbook.Sheets[name] === worksheet) || COMPENSATED_LOADS_PROFILE.sheetName,
    totalRows: dataRows.length,
    preview: entries.slice(0, 12),
    entries,
  };
}

export async function downloadCompensatedLoadsTemplateLegacy() {
  const XLSX = await import('xlsx');
  const rows = [
    COMPENSATED_LOADS_PROFILE.columns.map((column) => column.source),
    ['YT8857819950676', '13.02.2026', '+998901234567', 'Aliyev Aziz', '250000', 'Yo‘qolgan yuk uchun mijozga to‘lov qilingan'],
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, COMPENSATED_LOADS_PROFILE.sheetName);
  XLSX.writeFile(workbook, 'QOPLAB_BERILGAN_YUKLAR_TEMPLATE.xlsx');
}

export async function downloadCompensatedLoadsTemplate104() {
  const XLSX = await import('xlsx');
  const dataRows = [
    ['Trek raqami', 'Telefon', 'Mijoz ismi', "To'lov holati", 'Jami summa', 'Javobgar shaxs', 'Tasdiqlangan sana', "To'langan sana", '104 ga kirgan', 'Murojaat sababi (102 izoh)', 'Baraka holat', 'Baraka vazn (kg)'],
    ['YT8857819950676', '+998901234567', 'Aliyev Aziz', '⏳ Kutmoqda', '250000', 'IPOST', '', '', '2026-05-19 09:30', "Yo'qolgan yuk uchun mijozga to'lov navbatga qo'yilgan", 'Delivered', '1.2'],
    ['JT5473019786613', '+998998887766', 'Karimova Dilnoza', "✅ To'langan", '180000', 'BTS', '2026-05-18 11:20', '2026-05-19 15:10', '2026-05-18 10:45', "Shikastlangan yuk bo'yicha kompensatsiya to'langan", 'Approaching', '0.8'],
  ];
  const reportRows = [
    ['104 modulning BARCHA murojaatlari — hisobot'],
    [],
    ['Jami yozuvlar:', 2],
    [],
    ["✅ To'langan:", 1],
    ["⏳ To'lanmagan:", 1],
  ];
  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet(dataRows);
  const reportSheet = XLSX.utils.aoa_to_sheet(reportRows);
  XLSX.utils.book_append_sheet(workbook, dataSheet, '104 — Barcha treklar');
  XLSX.utils.book_append_sheet(workbook, reportSheet, 'Хисобот');
  XLSX.writeFile(workbook, 'CRM_104_IMPORT_TEMPLATE.xlsx');
}

function buildMappedRow(row, rowNumber, headerMap, profile = OTK_WORKPLACE_PROFILE) {
  const values = {};

  for (const column of profile.columns) {
    const columnIndex = headerMap[column.key] ?? column.index;
    values[column.key] = stringify(row[columnIndex]);
  }

  return {
    rowNumber,
    ...values,
  };
}

function buildCompensatedMappedRow(row, rowNumber, headerMap, headerRow = []) {
  const values = buildMappedRow(row, rowNumber, headerMap, COMPENSATED_LOADS_PROFILE);
  const paymentDate = pickRowValue(row, headerRow, ["To'langan sana", 'Tolangan sana']);
  const approvedDate = pickRowValue(row, headerRow, ['Tasdiqlangan sana']);
  const enteredDate = pickRowValue(row, headerRow, ['104 ga kirgan']);
  const paymentStatus = pickRowValue(row, headerRow, ["To'lov holati", 'Tolov holati']);
  const responsible = pickRowValue(row, headerRow, ['Javobgar shaxs']);
  const barakaStatus = pickRowValue(row, headerRow, ['Baraka holat', 'Baraka holati']);
  const reason = pickRowValue(row, headerRow, ['Murojaat sababi (102 izoh)', 'Murojaat sababi', '102 izoh']);

  return {
    ...values,
    compensatedDate: paymentDate || approvedDate || enteredDate || values.compensatedDate,
    paymentStatus,
    javobgar: responsible,
    barakaStatus,
    enteredDate104: enteredDate,
    comment: reason || values.comment || '',
  };
}

function stringify(value) {
  return String(value ?? '').trim();
}

function formatPreviewDate(value) {
  const normalized = normalizeOtkEntry({ date: value }).date;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value || '');

  const pad = (part) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function buildHeaderMap(headerRow, profile = OTK_WORKPLACE_PROFILE) {
  const map = {};
  const normalizedHeaderRow = headerRow.map((value) => normalizeHeader(value));

  for (const column of profile.columns) {
    const aliases = [column.source, ...(column.aliases || [])].map(normalizeHeader);
    const matchIndex = normalizedHeaderRow.findIndex((item) => aliases.includes(item));
    if (matchIndex >= 0) {
      map[column.key] = matchIndex;
    }
  }

  return map;
}

function pickRowValue(row, headerRow, headers) {
  const normalizedHeaders = headerRow.map((value) => normalizeHeader(value));
  const candidates = headers.map((value) => normalizeHeader(value));
  const columnIndex = normalizedHeaders.findIndex((value) => candidates.includes(value));
  return columnIndex >= 0 ? stringify(row[columnIndex]) : '';
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}
