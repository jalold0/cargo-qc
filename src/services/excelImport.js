import { mapOtkWorkplaceRow, OTK_WORKPLACE_PROFILE } from './importProfiles';
import { normalizeOtkEntry } from './entryNormalizer';

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

function buildMappedRow(row, rowNumber, headerMap) {
  const values = {};

  for (const column of OTK_WORKPLACE_PROFILE.columns) {
    const columnIndex = headerMap[column.key] ?? column.index;
    values[column.key] = stringify(row[columnIndex]);
  }

  return {
    rowNumber,
    ...values,
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

function buildHeaderMap(headerRow) {
  const map = {};
  const normalizedHeaderRow = headerRow.map((value) => normalizeHeader(value));

  for (const column of OTK_WORKPLACE_PROFILE.columns) {
    const aliases = [column.source, ...(column.aliases || [])].map(normalizeHeader);
    const matchIndex = normalizedHeaderRow.findIndex((item) => aliases.includes(item));
    if (matchIndex >= 0) {
      map[column.key] = matchIndex;
    }
  }

  return map;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}
