const DEFAULT_STATUS = 'Jarayonda';
const DEFAULT_PRIORITY = 'Past';
const DEFAULT_REQUEST_SOURCE = 'Belgilanmagan';
const DEFAULT_DEPARTMENT = 'Belgilanmagan';
const DEFAULT_HANDLER = 'OTK workplace';

export function normalizeOtkEntry(entry = {}) {
  const source = { ...entry };
  const dateValue = normalizeDate(source.date || source.Data);
  const trackCode = String(source.trackCode || source.track_code || source.B || source.Track || '')
    .trim();
  const problemType = String(source.problemType || source.problem_type || source.C || source.Problem || '')
    .trim();
  const department = String(
    source.department || source.department_name || source.D || source["Ma'sul bo'lim"] || ''
  ).trim();
  const requestSource = String(
    source.requestSource || source.request_source || source.source || ''
  ).trim();
  const status = String(source.status || source.F || source.Status || DEFAULT_STATUS).trim() || DEFAULT_STATUS;
  const comment = String(source.comment || source.G || source.Comment || '').trim();
  const handledBy = String(
    source.handledBy || source.handled_by || source.E || source.Name || source.createdBy || ''
  ).trim();

  return {
    ...source,
    id: source.id || source.sourceRowKey || buildFallbackId(trackCode, dateValue),
    date: dateValue,
    trackCode,
    problemType,
    department: department || DEFAULT_DEPARTMENT,
    requestSource: requestSource || DEFAULT_REQUEST_SOURCE,
    status,
    priority: source.priority || source.priority_label || DEFAULT_PRIORITY,
    comment,
    handledBy: handledBy || DEFAULT_HANDLER,
    handledById: source.handledById ?? source.handled_by_id ?? null,
    handledByRole: source.handledByRole || source.handled_by_role || '',
    createdBy: source.createdBy || source.created_by || handledBy || DEFAULT_HANDLER,
    createdById: source.createdById ?? source.created_by_id ?? null,
    createdByRole: source.createdByRole || source.created_by_role || '',
    lastUpdatedBy: source.lastUpdatedBy || source.last_updated_by || '',
    lastUpdatedById: source.lastUpdatedById ?? source.last_updated_by_id ?? null,
    lastUpdatedByRole: source.lastUpdatedByRole || source.last_updated_by_role || '',
    sourceSystem: source.sourceSystem || source.source_system || 'cargo-qc-ui',
    sourceRowKey: source.sourceRowKey || source.source_row_key || '',
    importBatchId: source.importBatchId || source.import_batch_id || '',
    importedAt: normalizeOptionalDate(source.importedAt || source.imported_at || ''),
    updatedAt: normalizeOptionalDate(source.updatedAt || source.updated_at || '') || dateValue,
  };
}

export function normalizeEntries(entries = []) {
  return (entries || []).map((entry) => normalizeOtkEntry(entry));
}

function normalizeDate(value) {
  return parseAppDate(value)?.toISOString() || new Date().toISOString();
}

function normalizeOptionalDate(value) {
  return parseAppDate(value)?.toISOString() || '';
}

function fromExcelSerial(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const millis = Math.round(Number(serial) * 86400000);
  return new Date(excelEpoch.getTime() + millis);
}

function buildFallbackId(trackCode, date) {
  return `${trackCode || 'track'}-${parseAppDate(date)?.getTime() || Date.now()}`;
}

export function parseAppDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const dateFromSerial = fromExcelSerial(value);
    return Number.isNaN(dateFromSerial.getTime()) ? null : dateFromSerial;
  }

  const text = String(value).trim();
  if (!text) return null;

  const numeric = Number(text);
  if (!Number.isNaN(numeric) && /^\d+(\.\d+)?$/.test(text)) {
    const dateFromSerial = fromExcelSerial(numeric);
    return Number.isNaN(dateFromSerial.getTime()) ? null : dateFromSerial;
  }

  const dottedMatch = text.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dottedMatch) {
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = dottedMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
