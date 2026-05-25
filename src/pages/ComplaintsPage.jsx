import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Archive, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Download, Eye, FileSpreadsheet, Filter, MessageSquare, Package, Pencil, Plus, Search, Send, Trash2, Truck, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  deleteOtkEntry,
  getOtkArchive,
  getOtkEntries,
  importOtkEntries,
  subscribeToOtkData,
} from '../services/localData';
import { useAuthStore } from '../store/authStore';
import { isAdminRole } from '../services/access';
import { downloadOtkTemplate, parseOtkWorkbook } from '../services/excelImport';
import { useT, useValueLabel } from '../i18n';

const STATUS_STYLE = {
  Yopildi: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  Jarayonda: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  "Moliyaga yo'naltirildi": 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
};

const PRIORITY_STYLE = {
  Yuqori: 'text-rose-600 dark:text-rose-300',
  "O'rta": 'text-amber-600 dark:text-amber-300',
  Past: 'text-emerald-600 dark:text-emerald-300',
};

const ITEMS_PER_PAGE = 20;

export default function ComplaintsPage() {
  const t = useT();
  const valueLabel = useValueLabel();
  const { user } = useAuthStore();
  const [entries, setEntries] = useState(() => getOtkEntries());
  const [archive, setArchive] = useState(() => getOtkArchive());
  const [search, setSearch] = useState('');
  const [view, setView] = useState('active');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProblem, setFilterProblem] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [lastImportReport, setLastImportReport] = useState(null);
  const [page, setPage] = useState(1);
  const fileInputRef = useRef(null);
  const isAdmin = isAdminRole(user?.role);

  const visibleSource = view === 'archive' ? archive : entries;

  // Filter dropdownlari uchun aktiv treklardan unique qiymatlarni olish
  const filterOptions = useMemo(() => {
    const collect = (key) => {
      const set = new Set();
      [...entries, ...archive].forEach((entry) => {
        const value = entry?.[key];
        if (value) set.add(value);
      });
      return Array.from(set).sort();
    };
    return {
      statuses: collect('status'),
      problems: collect('problemType'),
      sources: collect('requestSource'),
      departments: collect('department'),
    };
  }, [entries, archive]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleSource.filter((entry) => {
      if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
      if (filterProblem !== 'all' && entry.problemType !== filterProblem) return false;
      if (filterSource !== 'all' && entry.requestSource !== filterSource) return false;
      if (filterDepartment !== 'all' && entry.department !== filterDepartment) return false;
      if (!query) return true;
      return [entry.trackCode, entry.problemType, entry.department, entry.requestSource, entry.status, entry.comment, entry.priority, entry.handledBy]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [visibleSource, search, filterStatus, filterProblem, filterSource, filterDepartment]);

  const activeFilterCount = useMemo(() => {
    return [filterStatus, filterProblem, filterSource, filterDepartment].filter((v) => v !== 'all').length;
  }, [filterStatus, filterProblem, filterSource, filterDepartment]);

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterProblem('all');
    setFilterSource('all');
    setFilterDepartment('all');
  };

  useEffect(() => {
    setPage(1);
  }, [search, view, filterStatus, filterProblem, filterSource, filterDepartment]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntries, page]);

  const importPreviewSummary = useMemo(() => {
    const rows = importPreview?.entries || [];
    return {
      total: rows.length,
      active: rows.filter((entry) => entry.status !== 'Yopildi').length,
      archived: rows.filter((entry) => entry.status === 'Yopildi').length,
    };
  }, [importPreview]);

  const removeEntry = (id) => {
    deleteOtkEntry(id, { actor: user });
    setEntries(getOtkEntries());
    setArchive(getOtkArchive());
    setDeleteConfirm(null);
    toast.success(t('deleted'));
  };

  useEffect(() => {
    const closeConfirm = () => setDeleteConfirm(null);
    window.addEventListener('scroll', closeConfirm, true);
    window.addEventListener('resize', closeConfirm);
    return () => {
      window.removeEventListener('scroll', closeConfirm, true);
      window.removeEventListener('resize', closeConfirm);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      setEntries(getOtkEntries());
      setArchive(getOtkArchive());
    };

    return subscribeToOtkData(sync, { debounceMs: 70 });
  }, []);

  const openImportPicker = () => {
    setImportModalOpen(true);
    window.setTimeout(() => fileInputRef.current?.click(), 60);
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const parsed = await parseOtkWorkbook(file);
      setImportPreview(parsed);
    } catch (error) {
      toast.error(t('importFailed'));
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const applyImport = () => {
    if (!importPreview?.entries?.length) {
      toast.error(t('chooseExcelFile'));
      return;
    }

    try {
      const result = importOtkEntries(importPreview.entries, { mode: importMode, actor: user });
      setEntries(getOtkEntries());
      setArchive(getOtkArchive());
      setView(result.active > 0 ? 'active' : 'archive');
      setLastImportReport({
        ...result,
        fileName: importPreview.fileName,
        mode: importMode,
        appliedAt: new Date().toISOString(),
      });
      setImportModalOpen(false);
      setImportPreview(null);
      setPage(1);
      toast.success(
        `${result.inserted} ${t('added')}${result.updated ? `, ${result.updated} ${t('updated')}` : ''}. ${result.active} ${t('active').toLowerCase()}, ${result.archived} ${t('archive').toLowerCase()}`
      );
    } catch (error) {
      console.error('Import apply failed', error);
      toast.error(t('importApplyFailed'));
    }
  };

  const exportExcel = () => {
    const headers = [t('date'), 'TREK', t('problem'), t('department'), t('source'), t('status'), t('comment'), t('priority')];
    const rows = filteredEntries.map((entry) => [
      format(new Date(entry.date), 'dd.MM.yyyy'),
      entry.trackCode,
      entry.problemType,
      entry.department,
      entry.requestSource,
      entry.status,
      entry.comment,
      entry.priority,
    ]);
    const tableRows = [headers, ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body><table border="1">${tableRows}</table></body>
      </html>
    `;
    const url = URL.createObjectURL(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `otk_data_${view}_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* KOMPAKT HEADER — title + amallar inline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">{t('complaintsTitle')}</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('total')}: <b>{entries.length}</b>
                {archive.length > 0 && <> · {t('archive')}: <b>{archive.length}</b></>}
                {' · '} {t('visible')}: <b>{filteredEntries.length}</b>
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {isAdmin && (
              <button
                onClick={openImportPicker}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Upload size={13} />
                Import
              </button>
            )}
            <button
              onClick={exportExcel}
              disabled={!filteredEntries.length}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download size={13} />
              Export
            </button>
            <Link
              to="/complaints/new"
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus size={13} />
              {t('newEntry')}
            </Link>
          </div>
        </div>
      </div>

      {lastImportReport && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-4 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-slate-900 dark:to-sky-500/10">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-2xl bg-emerald-500 p-2.5 text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('importResult')}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                    {lastImportReport.mode === 'replace' ? t('replaceModeShort') : t('mergeModeShort')}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{lastImportReport.fileName}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('completedAt')}: {format(new Date(lastImportReport.appliedAt), 'dd.MM.yyyy HH:mm')}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('lastImportResult')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLastImportReport(null)}
              className="self-start rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={t('close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ImportReportStat label={t('rowsProcessed')} value={lastImportReport.total} tone="slate" />
            <ImportReportStat label={t('newRows')} value={lastImportReport.inserted} tone="emerald" />
            <ImportReportStat label={t('updatedRows')} value={lastImportReport.updated} tone="blue" />
            <ImportReportStat label={t('activeRows')} value={lastImportReport.active} tone="amber" />
            <ImportReportStat label={t('archivedRows')} value={lastImportReport.archived} tone="rose" />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Toolbar: Search + Faol/Arxiv toggle + Filtr button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchComplaints') || "Qidirish: trek yoki izoh..."}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title={t('clear')}
              >
                <X size={16} />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
              {[
                ['active', t('active') || 'Faol'],
                ['archive', t('archive') || 'Arxivlangan'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={clsx(
                    'rounded-lg px-4 py-1.5 text-sm font-medium transition',
                    view === key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
                filtersOpen || activeFilterCount > 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              )}
            >
              <Filter size={16} />
              Filtr
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter dropdownlari paneli */}
        {filtersOpen && (
          <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect
                label="Status"
                value={filterStatus}
                onChange={setFilterStatus}
                options={filterOptions.statuses}
              />
              <FilterSelect
                label="Muammo turi"
                value={filterProblem}
                onChange={setFilterProblem}
                options={filterOptions.problems}
              />
              <FilterSelect
                label="Manba"
                value={filterSource}
                onChange={setFilterSource}
                options={filterOptions.sources}
              />
              <FilterSelect
                label="Mas'ul bo'lim"
                value={filterDepartment}
                onChange={setFilterDepartment}
                options={filterOptions.departments}
              />
            </div>
            {activeFilterCount > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {activeFilterCount} ta filtr qo'llanilgan · {filteredEntries.length} ta natija
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <X size={12} />
                  Tozalash
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CARD GRID — kompakt */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Package size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('noTracksYet')}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Filtrlarni o'zgartiring yoki yangi murojaat qo'shing</p>
        </div>
      ) : (
        <>
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {paginatedEntries.map((entry) => (
              <ComplaintCard
                key={entry.id}
                entry={entry}
                t={t}
                valueLabel={valueLabel}
                canEdit={view === 'active' || isAdmin}
                onDelete={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDeleteConfirm((current) =>
                    current?.id === entry.id
                      ? null
                      : {
                          id: entry.id,
                          x: Math.min(rect.right - 288, window.innerWidth - 304),
                          y: rect.bottom + 8,
                        }
                  );
                }}
              />
            ))}
          </section>

          {pageCount > 1 && (
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filteredEntries.length)}
                {' – '}
                {Math.min(page * ITEMS_PER_PAGE, filteredEntries.length)}
                {' / '}
                <span className="font-bold text-slate-700 dark:text-slate-200">{filteredEntries.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ChevronLeft size={14} />
                  {t('previous')}
                </button>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page === pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {t('next')}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteConfirm && (
        <div
          className="fixed z-[520] w-72 rounded-2xl border border-rose-100 bg-white p-3 text-left shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:border-rose-500/20 dark:bg-slate-900 dark:shadow-black/40"
          style={{ left: deleteConfirm.x, top: deleteConfirm.y }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertTriangle size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{t('confirmDeleteTrackTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('confirmDeleteTrack')}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('no')}
            </button>
            <button
              type="button"
              onClick={() => removeEntry(deleteConfirm.id)}
              className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              {t('yes')}
            </button>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-[550] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('importExcel')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('importExcelDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview(null);
                }}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
              />

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/70 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {importPreview?.fileName || 'OTK_IMPORT_TEMPLATE.xlsx'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {importPreview ? `${importPreview.totalRows} ${t('total')} rows` : t('importExcelDescription')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Upload size={16} />
                  {importing ? t('loading') : t('chooseFile')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={clsx(
                    'rounded-2xl border p-4 text-left transition',
                    importMode === 'merge'
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{t('importMerge')}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('importMergeDescription')}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={clsx(
                    'rounded-2xl border p-4 text-left transition',
                    importMode === 'replace'
                      ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  )}
                >
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{t('importReplace')}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('importReplaceDescription')}</p>
                </button>
              </div>

              {importPreview && (
                <div className="grid gap-3 md:grid-cols-3">
                  <ImportReportStat label={t('rowsProcessed')} value={importPreviewSummary.total} tone="slate" compact />
                  <ImportReportStat label={t('activeRows')} value={importPreviewSummary.active} tone="amber" compact />
                  <ImportReportStat label={t('archivedRows')} value={importPreviewSummary.archived} tone="emerald" compact />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{t('importTemplate')}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('importTemplateDescription')}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadOtkTemplate();
                    } catch {
                      toast.error(t('importFailed'));
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Download size={16} />
                  {t('downloadTemplate')}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('preview')}</h3>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  {!importPreview ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">{t('noData')}</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('date')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('track')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('problem')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('department')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('takenBy')}</th>
                          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importPreview.preview.map((row) => (
                          <tr key={row.rowNumber}>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.previewDate || String(row.date || '')}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-950 dark:text-white">{row.trackCode}</td>
                            <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{row.problemType}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.department || t('notSpecified')}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.handledBy || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setImportPreview(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('close')}
              </button>
              <button
                type="button"
                disabled={!importPreview?.entries?.length}
                onClick={applyImport}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ============================================================
// Complaint Card — kompakt murojaat kartasi (grid uchun)
// ============================================================
function ComplaintCard({ entry, t, valueLabel, canEdit, onDelete }) {
  const statusStyle = STATUS_STYLE[entry.status] || STATUS_STYLE.Jarayonda;
  const priorityStyle = PRIORITY_STYLE[entry.priority] || 'text-slate-500';

  return (
    <article className="group relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30">
      {/* Row 1: trek + status */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {canEdit ? (
            <Link
              to={`/complaints/${entry.id}`}
              title={t('edit')}
              className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/15 dark:hover:text-blue-300"
            >
              <Eye size={14} />
            </Link>
          ) : (
            <span className="shrink-0 rounded-md p-1 text-slate-400 opacity-40">
              <Eye size={14} />
            </span>
          )}
          {canEdit ? (
            <Link to={`/complaints/${entry.id}`} className="truncate font-mono text-xs font-bold text-slate-950 transition hover:text-blue-700 dark:text-white dark:hover:text-blue-300" title={entry.trackCode}>
              {entry.trackCode}
            </Link>
          ) : (
            <span className="truncate font-mono text-xs font-bold text-slate-950 dark:text-white" title={entry.trackCode}>
              {entry.trackCode}
            </span>
          )}
        </div>
        <span className={clsx('shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase ring-1', statusStyle)}>
          {valueLabel(entry.status)}
        </span>
      </div>

      {/* Row 2: Date + Department */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} />
          {format(new Date(entry.date), 'dd.MM.yyyy')}
        </span>
        <span className="inline-flex items-center gap-1 truncate" title={entry.department}>
          <Building2 size={10} />
          <span className="truncate">{entry.department || '—'}</span>
        </span>
      </div>

      {/* Row 3: Problem + Priority */}
      <div className="space-y-0.5 border-t border-slate-100 pt-2 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Problem</span>
          <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold', priorityStyle.includes('text-') ? `bg-slate-100 dark:bg-slate-800 ${priorityStyle}` : priorityStyle)}>
            {valueLabel(entry.priority)}
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1" title={entry.problemType}>
          {entry.problemType || '—'}
        </div>
      </div>

      {/* Row 4: Source + handledBy (kompakt) */}
      {(entry.requestSource || entry.handledBy) && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          {entry.requestSource && (
            <span className="inline-flex items-center gap-1 truncate" title={entry.requestSource}>
              <Send size={10} />
              <span className="truncate">{entry.requestSource}</span>
            </span>
          )}
          {entry.handledBy && (
            <span className="inline-flex items-center gap-1 truncate font-semibold text-blue-700 dark:text-blue-300" title={entry.handledBy}>
              👤 <span className="truncate">{entry.handledBy}</span>
            </span>
          )}
        </div>
      )}

      {/* Row 5: Comment (faqat bor bo'lsa) */}
      {entry.comment && (
        <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <MessageSquare size={9} />
            Izoh
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300" title={entry.comment}>
            {entry.comment}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        {canEdit && (
          <Link
            to={`/complaints/${entry.id}`}
            title={t('edit')}
            className="rounded-md p-1 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-500/15 dark:hover:text-sky-300"
          >
            <Pencil size={14} />
          </Link>
        )}
        <button
          type="button"
          onClick={onDelete}
          title={t('delete')}
          className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/15"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-emerald-500/10"
        >
          <option value="all">Hammasi</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function ImportReportStat({ label, value, tone = 'slate', compact = false }) {
  const toneClass = {
    slate: 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  };

  return (
    <div className={clsx('rounded-2xl px-3 py-3 ring-1', toneClass[tone])}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className={clsx('mt-1 font-semibold tracking-tight', compact ? 'text-2xl' : 'text-3xl')}>
        {value}
      </p>
    </div>
  );
}
