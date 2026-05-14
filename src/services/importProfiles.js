import { normalizeOtkEntry } from './entryNormalizer';

export const OTK_WORKPLACE_PROFILE = {
  key: 'otk_workplace',
  label: 'OTK import template',
  sheetName: 'Data Entry',
  columns: [
    { index: 0, key: 'date', source: 'Data', required: true, aliases: ['data', 'date', 'sana'] },
    { index: 1, key: 'trackCode', source: 'Track', required: true, aliases: ['track', 'trackcode', 'trek', 'trek kodi'] },
    { index: 2, key: 'problemType', source: 'Problem', required: true, aliases: ['problem', 'problem type', 'muammo'] },
    { index: 3, key: 'department', source: "Ma'sul bo'lim", required: false, fallback: 'Belgilanmagan', aliases: ["ma'sul bo'lim", 'department', "bo'lim"] },
    { index: 4, key: 'handledBy', source: 'Name', required: false, fallback: 'OTK workplace', aliases: ['name', 'handled by', 'kim oldi', 'hodim'] },
    { index: 5, key: 'status', source: 'Status', required: true, aliases: ['status'] },
    { index: 6, key: 'comment', source: 'Comment', required: false, aliases: ['comment', 'izoh'] },
    { index: 7, key: 'requestSource', source: 'Manba', required: false, fallback: 'Belgilanmagan', aliases: ['manba', 'source', 'request source'] },
  ],
  defaults: {
    requestSource: 'Belgilanmagan',
    sourceSystem: 'excel:otk',
  },
};

export function mapOtkWorkplaceRow(row, meta = {}) {
  return normalizeOtkEntry({
    id: meta.id,
    sourceRowKey: meta.sourceRowKey || '',
    importBatchId: meta.importBatchId || '',
    importedAt: meta.importedAt || new Date().toISOString(),
    sourceSystem: OTK_WORKPLACE_PROFILE.defaults.sourceSystem,
    date: row.date,
    trackCode: row.trackCode,
    problemType: row.problemType,
    department: row.department || OTK_WORKPLACE_PROFILE.defaults.department,
    handledBy: row.handledBy,
    status: row.status,
    comment: row.comment,
    requestSource: row.requestSource || OTK_WORKPLACE_PROFILE.defaults.requestSource,
  });
}
