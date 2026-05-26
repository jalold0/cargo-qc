import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, Warehouse, X, Upload, Download, Eye, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import * as XLSX from 'xlsx';
import {
  getWarehouseReturns,
  subscribeToWarehouseReturns,
  createWarehouseReturn,
  bulkCreateWarehouseReturns,
  deleteWarehouseReturn,
  previewVozvratCandidates,
  isVozvratMigrationDone,
  migrateVozvratToWarehouse,
} from '../services/warehouseData';
import { getOtkSettings, getSystemUsers } from '../services/localData';
import { useAuthStore } from '../store/authStore';
import { isAdminRole } from '../services/access';

const PAGE_SIZE = 25;

const INITIAL_FORM = {
  trackCode: '',
  problemType: '',
  responsible: '',
  customerPhone: '',
  customerName: '',
  note: '',
};

export default function WarehousePage() {
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  const [items, setItems] = useState(() => getWarehouseReturns());
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [users, setUsers] = useState(() => getSystemUsers());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [bulkTracks, setBulkTracks] = useState('');
  const [bulkCommon, setBulkCommon] = useState({ problemType: '', responsible: '', note: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [migrationCount, setMigrationCount] = useState(0);
  const [migrationDismissed, setMigrationDismissed] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      setItems(getWarehouseReturns());
      setSettings(getOtkSettings());
      setUsers(getSystemUsers());
    };
    return subscribeToWarehouseReturns(sync);
  }, []);

  // Vozvrat migratsiya tekshiruvi.
  // Eslatma: ilgari "migration done" bayrog'i bo'lishidan qat'i nazar,
  // hozir candidates'ni tekshiramiz — chunki yangi tanib olish qoidasi
  // (Ulug'bek hodimi) qo'shilgan; eski flag yangi nomzodlarni
  // o'tkazib yuborgan bo'lishi mumkin.
  useEffect(() => {
    const { count } = previewVozvratCandidates();
    setMigrationCount(count);
  }, [items]);

  const runMigration = async (removeFromOtk) => {
    setMigrationLoading(true);
    // Sun'iy delay shunchaki UX yaxshiroq bo'lsin
    await new Promise((r) => setTimeout(r, 100));
    const result = migrateVozvratToWarehouse({ removeFromOtk });
    setMigrationLoading(false);

    if (result.ok) {
      toast.success(
        `${result.migrated} ta vozvrat omborga ko'chirildi${result.skipped ? ` · ${result.skipped} dublikat o'tkazib yuborildi` : ''}`,
      );
      setMigrationCount(0);
      setMigrationModalOpen(false);
      setItems(getWarehouseReturns());
    } else {
      toast.error("Ko'chirishda xato");
    }
  };

  const dismissMigration = () => {
    setMigrationDismissed(true);
  };

  const problemTypes = useMemo(
    () => settings.warehouseProblemTypes || [],
    [settings.warehouseProblemTypes],
  );

  const responsibleNames = useMemo(
    () =>
      (users || [])
        .filter((u) => u.active !== false)
        .map((u) => u.full_name || u.username)
        .filter(Boolean),
    [users],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      return [item.trackCode, item.customerPhone, item.customerName, item.problemType, item.responsible, item.note]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query));
    });
  }, [items, search]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visibleItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // ----------------------------------------------------------------
  // Yangi vozvrat yaratish
  // ----------------------------------------------------------------
  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitCreate = (event) => {
    event.preventDefault();
    if (!form.trackCode.trim()) {
      toast.error('Trek raqami kerak');
      return;
    }
    const result = createWarehouseReturn(form);
    if (!result.ok) {
      if (result.reason === 'duplicate') {
        toast.error(`Bu trek (${form.trackCode}) yaqinda omborga kiritilgan`);
      } else {
        toast.error("Yozuvni saqlashda xato");
      }
      return;
    }
    toast.success("Omborga qaytdi — 104 — Moliyaga ham qo'shildi");
    setForm({ ...INITIAL_FORM });
    setCreateOpen(false);
  };

  // ----------------------------------------------------------------
  // Bulk: textarea orqali ko'p trek
  // ----------------------------------------------------------------
  const submitBulkText = () => {
    const lines = bulkTracks
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Hech bo'lmaganda 1 ta trek kiriting");
      return;
    }
    const rows = lines.map((trackCode) => ({ trackCode }));
    const result = bulkCreateWarehouseReturns(rows, bulkCommon);
    toast.success(
      `${result.created} ta trek qo'shildi${result.skipped ? ` · ${result.skipped} ta o'tkazib yuborildi` : ''}`,
    );
    setBulkTracks('');
    setBulkCommon({ problemType: '', responsible: '', note: '' });
    setBulkOpen(false);
  };

  // ----------------------------------------------------------------
  // Excel import
  // ----------------------------------------------------------------
  const triggerFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const mapped = rows
        .map((row) => {
          const keys = Object.keys(row);
          const trackKey = keys.find((k) => /trek|track/i.test(k)) || keys[0];
          const phoneKey = keys.find((k) => /telefon|phone/i.test(k));
          const nameKey = keys.find((k) => /mijoz|customer|ism/i.test(k));
          const problemKey = keys.find((k) => /muammo|problem/i.test(k));
          const respKey = keys.find((k) => /mas|responsible|hodim/i.test(k));
          const noteKey = keys.find((k) => /izoh|note/i.test(k));
          return {
            trackCode: String(row[trackKey] || '').trim(),
            customerPhone: phoneKey ? String(row[phoneKey] || '').trim() : '',
            customerName: nameKey ? String(row[nameKey] || '').trim() : '',
            problemType: problemKey ? String(row[problemKey] || '').trim() : '',
            responsible: respKey ? String(row[respKey] || '').trim() : '',
            note: noteKey ? String(row[noteKey] || '').trim() : '',
          };
        })
        .filter((r) => r.trackCode);

      if (!mapped.length) {
        toast.error("Excel'da trek raqami topilmadi");
        event.target.value = '';
        return;
      }

      const result = bulkCreateWarehouseReturns(mapped);
      toast.success(
        `${result.created} ta trek qo'shildi${result.skipped ? ` · ${result.skipped} ta o'tkazib yuborildi` : ''}`,
      );
    } catch (error) {
      toast.error(`Excel xato: ${error?.message || 'noma\'lum'}`);
    }
    event.target.value = '';
  };

  // ----------------------------------------------------------------
  // Excel namuna yuklab olish
  // ----------------------------------------------------------------
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        'Trek raqami': '12345678901',
        'Mijoz telefoni': '+998901234567',
        'Mijoz ismi': 'Komiljonov Aziz',
        'Muammo turi': 'Yetkazib bera olmadi',
        "Mas'ul hodim": 'Saidali',
        'Izoh': 'Manzilda yo\'q edi',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Toshkent ombori');
    XLSX.writeFile(wb, 'toshkent-ombori-namuna.xlsx');
  };

  // ----------------------------------------------------------------
  // O'chirish
  // ----------------------------------------------------------------
  const confirmDelete = () => {
    if (!deleteId) return;
    const result = deleteWarehouseReturn(deleteId);
    if (result.ok) {
      toast.success("O'chirildi");
    } else {
      toast.error("O'chirishda xato");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Warehouse size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950 dark:text-white">Toshkent ombori</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Omborga qaytgan yuklar ro'yxati. Jami: <b>{items.length}</b>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download size={14} />
              Namuna
            </button>
            <button
              type="button"
              onClick={triggerFilePick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            >
              <Upload size={14} />
              Excel import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300"
            >
              <Plus size={14} />
              Bir nechta trek
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <Plus size={14} />
              Yangi qaytaruv
            </button>
          </div>
        </div>
      </section>

      {/* Vozvrat migratsiya bannerи */}
      {!migrationDismissed && migrationCount > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <ArrowRightLeft size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {migrationCount} ta vozvrat trek murojaatlarda topildi
                </p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">
                  Bu treklarni Toshkent omboriga ko'chirib o'tkazish mumkin. Asl Murojaatlardan o'chirishni keyin tanlaysiz.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismissMigration}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-300"
              >
                Keyin
              </button>
              <button
                type="button"
                onClick={() => setMigrationModalOpen(true)}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Ko'chirish
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Trek, telefon, mijoz, muammo turi yoki izoh bo'yicha qidirish"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {visibleItems.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            {search
              ? "Qidiruv bo'yicha hech narsa topilmadi"
              : 'Hozircha hech qanday qaytaruv yo\'q. "Yangi qaytaruv" tugmasini bosing.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Trek</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3">Muammo turi</th>
                  <th className="px-4 py-3">Mijoz</th>
                  <th className="px-4 py-3">Mas'ul</th>
                  <th className="px-4 py-3">Izoh</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {visibleItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.trackCode}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(item.returnDate).toLocaleDateString('uz-UZ')}
                    </td>
                    <td className="px-4 py-3">
                      {item.problemType ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {item.problemType}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {item.customerName || item.customerPhone || (
                        <span className="text-slate-400">—</span>
                      )}
                      {item.customerPhone && item.customerName && (
                        <div className="text-[11px] text-slate-500">{item.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {item.responsible || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400" title={item.note}>
                      {item.note || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          title="Ko'rish"
                        >
                          <Eye size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="rounded-md p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
                            title="O'chirish"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <p>
              {filteredItems.length} ta yozuv · sahifa {page} / {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50 dark:border-slate-700"
              >
                Oldingi
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-50 dark:border-slate-700"
              >
                Keyingi
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Yangi qaytaruv modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Yangi qaytaruv</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitCreate} className="space-y-3">
              <Field label="Trek raqami *">
                <input
                  required
                  value={form.trackCode}
                  onChange={(e) => updateForm('trackCode', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Muammo turi">
                  <select
                    value={form.problemType}
                    onChange={(e) => updateForm('problemType', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">— Tanlang —</option>
                    {problemTypes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mas'ul hodim">
                  <select
                    value={form.responsible}
                    onChange={(e) => updateForm('responsible', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">— Tanlang —</option>
                    {responsibleNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mijoz telefoni">
                  <input
                    value={form.customerPhone}
                    onChange={(e) => updateForm('customerPhone', e.target.value)}
                    placeholder="+998901234567"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </Field>
                <Field label="Mijoz ismi">
                  <input
                    value={form.customerName}
                    onChange={(e) => updateForm('customerName', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </Field>
              </div>
              <Field label="Izoh">
                <textarea
                  value={form.note}
                  onChange={(e) => updateForm('note', e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Ko'p trekni qo'shish</h2>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Treklar (har qatorga bittadan)">
                <textarea
                  value={bulkTracks}
                  onChange={(e) => setBulkTracks(e.target.value)}
                  rows={6}
                  placeholder={'12345678901\n23456789012\n34567890123'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Umumiy muammo turi">
                  <select
                    value={bulkCommon.problemType}
                    onChange={(e) => setBulkCommon((c) => ({ ...c, problemType: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">— Tanlang —</option>
                    {problemTypes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Mas'ul hodim">
                  <select
                    value={bulkCommon.responsible}
                    onChange={(e) => setBulkCommon((c) => ({ ...c, responsible: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">— Tanlang —</option>
                    {responsibleNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Umumiy izoh">
                <input
                  value={bulkCommon.note}
                  onChange={(e) => setBulkCommon((c) => ({ ...c, note: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={submitBulkText}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                >
                  Hammasini saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview (ko'z) modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Yozuv tafsilotlari</h2>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <PreviewField label="Trek raqami">
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {previewItem.trackCode || '—'}
                </span>
              </PreviewField>
              <PreviewField label="Qaytgan sana">
                {new Date(previewItem.returnDate || previewItem.createdAt).toLocaleString('uz-UZ')}
              </PreviewField>
              <PreviewField label="Muammo turi">
                {previewItem.problemType ? (
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    {previewItem.problemType}
                  </span>
                ) : '—'}
              </PreviewField>
              <PreviewField label="Mas'ul hodim">
                {previewItem.responsible || '—'}
              </PreviewField>
              <PreviewField label="Mijoz ismi">
                {previewItem.customerName || '—'}
              </PreviewField>
              <PreviewField label="Mijoz telefoni">
                {previewItem.customerPhone || '—'}
              </PreviewField>
              <PreviewField label="Status">
                <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                  {previewItem.status || 'qabul_qilindi'}
                </span>
              </PreviewField>
              <PreviewField label="Yaratilgan">
                {new Date(previewItem.createdAt).toLocaleString('uz-UZ')}
              </PreviewField>
              <div className="sm:col-span-2">
                <PreviewField label="Izoh">
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {previewItem.note || '—'}
                  </p>
                </PreviewField>
              </div>
              <div className="sm:col-span-2">
                <PreviewField label="ID">
                  <span className="font-mono text-[10px] text-slate-500">{previewItem.id}</span>
                </PreviewField>
              </div>
            </dl>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vozvrat migratsiya tasdiqi */}
      {migrationModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {migrationCount} ta vozvratni ko'chirish
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bu treklar Toshkent omboriga qo'shiladi. Murojaatlar bo'limidan
              o'chirilmaydi — umumiy statistikada (JAMI TREKLAR) hisoblanishda davom etadi.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={migrationLoading}
                onClick={() => runMigration(false)}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {migrationLoading ? "Ko'chirilmoqda…" : "Ko'chir"}
              </button>
              <button
                type="button"
                disabled={migrationLoading}
                onClick={() => setMigrationModalOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* O'chirish tasdiqi */}
      {deleteId && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Yozuvni o'chirish</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Bu yozuv 104 — Moliyadagi mos topilgan yukni ham o'chirmaydi. Davom etasizmi?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function PreviewField({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}
