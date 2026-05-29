import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useLanguageStore, useThemeStore } from '../store/authStore';
import { getAllOtkRecords, getOtkEntries, getWaitingDays, subscribeToOtkData } from '../services/localData';
import { canAccess, isAdminRole } from '../services/access';
import { APP_BUILD_DATE, APP_VERSION } from '../services/appVersion';
import { useT } from '../i18n';
import {
  LayoutDashboard,
  MessageSquareWarning,
  Truck,
  Headphones,
  Wallet,
  Warehouse,
  Bot,
  ListChecks,
  Network,
  Settings,
  LogOut,
  Menu,
  Bell,
  Sun,
  Moon,
  Circle,
  Sparkles,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const NOTIFICATION_SEEN_STORAGE_KEY = 'cargo-qc-notification-seen';

// Ideal tartib:
// 1. Dashboard — bosh sahifa (analitika)
// 2. Murojaatlar — asosiy ish oqimi
// 3. Trek kuzatuv — trek bo'yicha izlash
// 4. 102 — modul (mijoz murojaatlari)
// 5. 104 — Moliya (moliyaviy yozuvlar)
// 6. AI yordamchi (yordamchi vositalar)
// 7. Bo'limlar tartibi (admin)
// 8. Sozlamalar (yakuniy)
// PERFORMANCE: har bir route uchun prefetch funksiyasi.
// Sichqoncha link ustiga tushganda chunk avvaldan yuklab qo'yiladi —
// foydalanuvchi bosganda Suspense fallback ko'rinmaydi.
// Vite import() promise'ini cache qiladi, takroriy chaqirilsa no-op.
const NAV_ITEMS = [
  { path: '/dashboard',         labelKey: 'dashboard',        icon: LayoutDashboard,       accessKey: 'dashboard',     prefetch: () => import('../pages/DashboardPage') },
  { path: '/complaints',        labelKey: 'complaints',       icon: MessageSquareWarning,  accessKey: 'complaints',    prefetch: () => import('../pages/ComplaintsPage') },
  { path: '/tracking',          labelKey: 'tracking',         icon: Truck,                 accessKey: 'tracking',      prefetch: () => import('../pages/TrackingPage') },
  { path: '/module-102',        labelKey: 'module102',        icon: Headphones,            accessKey: 'module102',     prefetch: () => import('../pages/Module102Page') },
  { path: '/compensated',       labelKey: 'compensatedLoads', icon: Wallet,                accessKey: 'compensated',   prefetch: () => import('../pages/CompensatedLoadsPage') },
  { path: '/warehouse',         labelKey: 'warehouse',        icon: Warehouse,             accessKey: 'complaints',    prefetch: () => import('../pages/WarehousePage') },
  { path: '/my-in-progress',    labelKey: 'myInProgress',     icon: ListChecks,            accessKey: 'compensated',   prefetch: () => import('../pages/MyInProgressPage') },
  { path: '/assistant-ai',      labelKey: 'assistantAi',      icon: Bot,                   accessKey: 'assistantAi',   prefetch: () => import('../pages/AssistantAiPage') },
  { path: '/department-order',  labelKey: 'departmentOrder',  icon: Network,               accessKey: 'settings',      prefetch: () => import('../pages/DepartmentOrderPage') },
  { path: '/settings',          labelKey: 'settings',         icon: Settings,              accessKey: 'settings',      prefetch: () => import('../pages/SettingsPage') },
];

// Prefetch'ni faqat 1 marta chaqirish uchun cache
const _prefetchedRoutes = new Set();
function prefetchRoute(path, prefetchFn) {
  if (_prefetchedRoutes.has(path) || !prefetchFn) return;
  _prefetchedRoutes.add(path);
  // Promise'ni await qilmaymiz — fon rejimida ishlasin
  prefetchFn().catch(() => _prefetchedRoutes.delete(path));
}

const ROLE_LABELS = {
  admin: 'Admin',
  operator: 'Operator',
  supervisor: 'Supervisor',
  manager: 'Manager',
  menejer: 'Menejer',
};

const ROLE_COLORS = {
  admin: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
  operator: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
  supervisor: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
  manager: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  menejer: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
};

const DEFAULT_ROLE_COLOR = 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeToolbarMenu, setActiveToolbarMenu] = useState(null);
  const [entries, setEntries] = useState(() => getOtkEntries());
  const [allRecords, setAllRecords] = useState(() => getAllOtkRecords());
  const [seenNotificationKeys, setSeenNotificationKeys] = useState({});
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useMemo(() => buildNotifications({ entries, allRecords, user, t }), [entries, allRecords, user, t]);
  const notificationStorageAccountKey = useMemo(
    () => normalizeName(user?.username || user?.full_name || user?.id || 'default'),
    [user]
  );
  const notificationsWithState = useMemo(
    () => notifications.map((item) => ({ ...item, seen: Boolean(seenNotificationKeys[item.readKey]) })),
    [notifications, seenNotificationKeys]
  );
  const unseenNotifications = useMemo(
    () => notificationsWithState.filter((item) => !item.seen),
    [notificationsWithState]
  );
  const notificationGroups = useMemo(() => groupNotifications(notificationsWithState, t), [notificationsWithState, t]);
  const isWideContentRoute = ['/complaints', '/tracking', '/compensated', '/module-102', '/assistant-ai'].some((path) => location.pathname.startsWith(path));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATION_SEEN_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      setSeenNotificationKeys(parsed?.[notificationStorageAccountKey] && typeof parsed[notificationStorageAccountKey] === 'object'
        ? parsed[notificationStorageAccountKey]
        : {});
    } catch (error) {
      console.warn('Failed to restore notification seen state', error);
      setSeenNotificationKeys({});
    }
  }, [notificationStorageAccountKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATION_SEEN_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[notificationStorageAccountKey] = seenNotificationKeys;
      localStorage.setItem(NOTIFICATION_SEEN_STORAGE_KEY, JSON.stringify(parsed));
    } catch (error) {
      console.warn('Failed to persist notification seen state', error);
    }
  }, [notificationStorageAccountKey, seenNotificationKeys]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => canAccess(item.accessKey, user));

  useEffect(() => {
    const closeMenus = (event) => {
      if (event.detail?.source !== 'toolbar') {
        setActiveToolbarMenu(null);
      }
    };
    window.addEventListener('qc-close-popovers', closeMenus);
    return () => window.removeEventListener('qc-close-popovers', closeMenus);
  }, []);

  // Supabase Realtime — bo'limlararo sinxron ishlash.
  // Faqat 1 marta ulanadi (DashboardLayout butun ilova umri davomida mavjud).
  // Har remote o'zgarishni custom event'ga proksi qiladi — subscribeToOtkData
  // singleton hub'i automatically pickup qiladi.
  //
  // PERFORMANCE: avval env tekshiriladi — agar Supabase sozlanmagan bo'lsa,
  // 208 kB heavy chunk umuman yuklanmaydi (localStorage rejimida default holat).
  useEffect(() => {
    const hasSupabaseEnv = Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    if (!hasSupabaseEnv) return;

    let unsubscribes = [];
    // Realtime burst debouncer:
    // Excel import 11K yozuvni 100-100 chunk'larda yuboradi, har biri
    // postgres_changes event'ini chiqaradi. Hech ajratmasdan o'tkazsak
    // 120+ marta sahifa re-render bo'ladi. Har jadval uchun alohida
    // 400ms debouncer — eng so'nggi 400ms'da bitta event dispatch bo'ladi.
    const debounceTimers = new Map();
    const proxy = (table) => () => {
      const prev = debounceTimers.get(table);
      if (prev) window.clearTimeout(prev);
      const next = window.setTimeout(() => {
        debounceTimers.delete(table);
        window.dispatchEvent(new CustomEvent('cargo-qc-data-changed', {
          detail: { key: `remote:${table}` },
        }));
      }, 400);
      debounceTimers.set(table, next);
    };

    (async () => {
      try {
        const realtime = await import('../services/supabaseRealtime');
        if (!realtime.isRealtimeEnabled) return;
        unsubscribes.push(realtime.subscribeToComplaints(proxy('complaints')));
        unsubscribes.push(realtime.subscribeToCompensated(proxy('compensated')));
        unsubscribes.push(realtime.subscribeToAssistantAi(proxy('assistant_ai')));
        unsubscribes.push(realtime.subscribeToSettings(proxy('settings')));
        unsubscribes.push(realtime.subscribeToUsers(proxy('users')));
        unsubscribes.push(realtime.subscribeToModule102Realtime(proxy('module_102')));
        unsubscribes.push(realtime.subscribeToWarehouseRealtime(proxy('warehouse')));
      } catch (error) {
        // Realtime ulanmagan bo'lsa — silent fallback (localStorage bilan ishlash davom etadi)
      }
    })();
    return () => {
      unsubscribes.forEach((fn) => { try { fn(); } catch {} });
      unsubscribes = [];
      // Pending realtime debouncer timer'larni tozalash
      debounceTimers.forEach((t) => window.clearTimeout(t));
      debounceTimers.clear();
    };
  }, []);

  // ============================================================
  // AUTO-SYNC — admin login bo'lgach, fonda local↔cloud tekshiruvi.
  // ------------------------------------------------------------
  // Foydalanuvchi sezmaydi (toast bilan info beradi). Faqat:
  //   1) Admin rolida
  //   2) Supabase ulangan
  //   3) Oxirgi avto-sync 30 daqiqadan ko'p oldin bo'lgan
  // ============================================================
  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return;
    const hasSupabaseEnv = Boolean(
      import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    if (!hasSupabaseEnv) return;

    // 10 soniya kutamiz — boshlang'ich yuklanish tugashi uchun
    const timer = window.setTimeout(async () => {
      try {
        const { autoSyncIfNeeded } = await import('../services/supabaseSyncManager');
        const result = await autoSyncIfNeeded();
        if (result.skipped) {
          // Hammasi mos — toast yo'q, sokin
          return;
        }
        if (result.ok && result.totalSynced > 0) {
          toast.success(`☁️ ${result.totalSynced} ta yozuv Supabase'ga sync qilindi`, {
            duration: 4000,
          });
        }
      } catch {
        // Silent fail — manual sync har doim mavjud
      }
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [user?.id, user?.role]);

  useEffect(() => {
    setActiveToolbarMenu(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const sync = () => {
      setEntries(getOtkEntries());
      setAllRecords(getAllOtkRecords());
    };

    return subscribeToOtkData(sync, { debounceMs: 70 });
  }, []);

  const openToolbarMenu = (menu) => {
    window.dispatchEvent(new CustomEvent('qc-close-popovers', { detail: { source: 'toolbar' } }));
    setActiveToolbarMenu((current) => {
      const next = current === menu ? null : menu;
      if (menu === 'notifications' && next === 'notifications' && unseenNotifications.length > 0) {
        setSeenNotificationKeys((previous) => {
          const updated = { ...previous };
          unseenNotifications.forEach((item) => {
            updated[item.readKey] = true;
          });
          return updated;
        });
      }
      return next;
    });
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200/50 px-4 py-5 dark:border-slate-800/70">
        <ProfileAvatar user={user} rounded="rounded-lg" />
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{t('appName')}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.full_name || user?.username || 'Account'}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {visibleItems.map(({ path, labelKey, icon: Icon, prefetch }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileSidebarOpen(false)}
            onMouseEnter={() => prefetchRoute(path, prefetch)}
            onFocus={() => prefetchRoute(path, prefetch)}
            onTouchStart={() => prefetchRoute(path, prefetch)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                  : 'text-slate-600 hover:bg-white/82 hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            {sidebarOpen && <span>{t(labelKey)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar pastida faqat versiya badge —
          user profile endi topbar'ning o'ng tarafidagi avatar menyusida */}
      <div className="border-t border-slate-200/50 p-3 dark:border-slate-800/70">
        {sidebarOpen ? (
          <div
            className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400"
            title={`Build: ${APP_BUILD_DATE}`}
          >
            <span>Version</span>
            <span className="font-mono tabular-nums">v{APP_VERSION}</span>
          </div>
        ) : (
          <p
            className="text-center font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
            title={`v${APP_VERSION} · ${APP_BUILD_DATE}`}
          >
            v{APP_VERSION}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="qc-app-shell flex h-screen overflow-hidden text-slate-900 dark:text-slate-100">
      <aside
        className={clsx(
          'hidden shrink-0 flex-col border-r border-white/70 bg-white/82 shadow-[12px_0_32px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-950/78 md:flex',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative h-full w-64 bg-white shadow-xl dark:bg-slate-900">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-[300] flex shrink-0 items-center gap-3 border-b border-white/70 bg-white/70 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="qc-button hidden rounded-lg p-2 text-slate-500 transition-colors md:flex"
          >
            <Menu size={18} />
          </button>

          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="qc-button rounded-lg p-2 text-slate-500 md:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white/72 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/62">
            <ThemeSelect
              theme={theme}
              setTheme={setTheme}
              t={t}
              open={activeToolbarMenu === 'theme'}
              onToggle={() => openToolbarMenu('theme')}
              onClose={() => setActiveToolbarMenu(null)}
            />

            <LanguageSelect
              language={language}
              setLanguage={setLanguage}
              t={t}
              open={activeToolbarMenu === 'language'}
              onToggle={() => openToolbarMenu('language')}
              onClose={() => setActiveToolbarMenu(null)}
            />

            <div className="relative">
            <button
              onClick={() => openToolbarMenu('notifications')}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300"
              title={t('notifications')}
            >
              <Bell size={18} />
              {unseenNotifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/30 ring-2 ring-white dark:ring-slate-900">
                  {unseenNotifications.length > 9 ? '9+' : unseenNotifications.length}
                </span>
              )}
            </button>

            {activeToolbarMenu === 'notifications' && (
              <div className="qc-panel absolute right-0 top-12 z-[360] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-2xl shadow-slate-950/12 dark:shadow-black/40">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{t('notifications')}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('notificationCenterSubtitle') || t('notificationSubtitle')}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {notificationGroups
                      .filter((group) => group.items.length > 0)
                      .map((group) => (
                        <span
                          key={group.key}
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                            group.tone
                          )}
                        >
                          {group.title}: {group.items.length}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="max-h-[420px] overflow-y-auto">
                  {notificationsWithState.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-slate-400">{t('noNotifications')}</p>
                  ) : (
                    notificationGroups
                      .filter((group) => group.items.length > 0)
                      .map((group) => (
                        <div key={group.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                          <div className="sticky top-0 z-10 bg-white/95 px-4 py-2 backdrop-blur dark:bg-slate-900/95">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              {group.title}
                            </p>
                          </div>
                          {group.items.map((item) => (
                            <Link
                              key={item.readKey}
                              to={item.path || `/complaints/${item.id}`}
                              onClick={() => setActiveToolbarMenu(null)}
                              className={clsx(
                                'block px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60',
                                item.seen && 'opacity-70'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                  <span
                                    className={clsx(
                                      'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                      item.badgeTone
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                  <span
                                    className={clsx(
                                      'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                                      item.seen
                                        ? 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                                        : 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'
                                    )}
                                  >
                                    {item.seen ? t('notificationSeen') : t('notificationNew')}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
            </div>

            {/* User profile menyu — topbar o'ng tarafda */}
            <div className="relative">
              <button
                type="button"
                onClick={() => openToolbarMenu('userMenu')}
                aria-haspopup="menu"
                aria-expanded={activeToolbarMenu === 'userMenu'}
                className="inline-flex h-10 items-center gap-2 rounded-xl pl-1.5 pr-2.5 text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ProfileAvatar user={user} rounded="rounded-lg" />
                <span className="hidden flex-col text-left leading-tight md:flex">
                  <span className="max-w-[140px] truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {user?.full_name || user?.username}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {ROLE_LABELS[user?.role] || user?.role}
                  </span>
                </span>
                <ChevronDown size={14} className="hidden text-slate-400 md:block" />
              </button>

              {activeToolbarMenu === 'userMenu' && (
                <div className="qc-panel absolute right-0 top-12 z-[360] w-[280px] overflow-hidden rounded-2xl shadow-2xl shadow-slate-950/12 dark:shadow-black/40">
                  {/* Header — avatar + ism + rol */}
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar user={user} rounded="rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {user?.full_name || user?.username}
                        </p>
                        <span
                          className={clsx(
                            'mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1',
                            ROLE_COLORS[user?.role] || DEFAULT_ROLE_COLOR
                          )}
                        >
                          {ROLE_LABELS[user?.role] || user?.role}
                        </span>
                      </div>
                    </div>
                    {user?.username && user?.full_name && (
                      <p className="mt-2 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        @{user.username}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolbarMenu(null);
                        navigate('/settings');
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <UserIcon size={16} className="text-slate-400" />
                      <span>{t('profileSettings') || 'Profil va sozlamalar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveToolbarMenu(null);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut size={16} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>

                  {/* Footer — versiya */}
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Cargo QC</span>
                      <span className="tabular-nums">v{APP_VERSION}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className={clsx('mx-auto w-full p-4 md:p-6', isWideContentRoute ? 'max-w-[1760px]' : 'max-w-7xl')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function ThemeSelect({ theme, setTheme, t, open, onToggle, onClose }) {
  const options = [
    { value: 'light', label: t('themeLightShort'), title: t('lightMode'), icon: Sun },
    { value: 'dark', label: t('themeDarkShort'), title: t('darkMode'), icon: Moon },
    { value: 'graphite', label: t('themeGraphiteShort'), title: t('graphiteMode'), icon: Circle },
    { value: 'aurora', label: t('themeAuroraShort'), title: t('auroraMode'), icon: Sparkles },
  ];
  const current = options.find((option) => option.value === theme) || options[0];
  const CurrentIcon = current.icon;

  return (
    <div className="relative" title={t('chooseTheme')}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 min-w-[96px] items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200/70 transition hover:bg-white hover:text-blue-700 hover:ring-blue-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800 dark:hover:text-blue-300"
      >
        <CurrentIcon size={15} />
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[360] w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/35">
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value);
                  onClose();
                }}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition',
                  theme === option.value
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                )}
              >
                <OptionIcon size={15} />
                <div className="min-w-0">{option.title}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LanguageSelect({ language, setLanguage, t, open, onToggle, onClose }) {
  const options = [
    { value: 'uz', label: 'UZ' },
    { value: 'ru', label: 'RU' },
    { value: 'en', label: 'ENG' },
  ];

  const current = options.find((option) => option.value === language) || options[0];

  return (
    <div className="relative" title={t('chooseLanguage')}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 min-w-[70px] items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200/70 transition hover:bg-white hover:text-blue-700 hover:ring-blue-200 dark:bg-slate-950/60 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800 dark:hover:text-blue-300"
      >
        {current.label}
        <span className="text-[10px] leading-none text-slate-400">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[360] w-24 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/35">
          {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            setLanguage(option.value);
            onClose();
          }}
          className={clsx(
            'block w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition',
            language === option.value
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          )}
        >
          {option.label}
        </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ user, rounded }) {
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.full_name || user.username || 'Profile'}
        className={clsx('h-9 w-9 shrink-0 object-cover ring-1 ring-slate-200 dark:ring-slate-700', rounded)}
      />
    );
  }

  return (
    <div className={clsx('flex h-9 w-9 shrink-0 items-center justify-center bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700', rounded)}>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
        {(user?.full_name || user?.username || 'A').charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function buildNotifications({ entries, allRecords, user, t }) {
  const accountNames = [user?.full_name, user?.username, ROLE_LABELS[user?.role]]
    .filter(Boolean)
    .map(normalizeName);

  const reminderNotifications = entries
    .filter((entry) => entry.status !== 'Yopildi')
    .map((entry) => {
      const waitingDays = getWaitingDays(entry.date);
      const handledBy = entry.handledBy || 'OTK workplace';
      const isOwner = accountNames.includes(normalizeName(handledBy));

      return {
        id: entry.id,
        readKey: `entry:${entry.id}:${entry.status}:${waitingDays}:${normalizeName(entry.handledBy)}:${normalizeName(entry.trackCode)}`,
        isOwner,
        kind: isOwner ? 'mine' : 'team',
        severity: waitingDays >= 5 ? 'critical' : waitingDays >= 2 ? 'warning' : 'healthy',
        waitingDays,
        title: isOwner ? t('reminderToYou') : `${handledBy} ${t('reminderToEmployee')}`,
        message: isOwner
          ? `${entry.trackCode}: ${waitingDays} ${t('days')}. ${t('status')}: ${entry.status}.`
          : `${entry.trackCode}: ${handledBy}. ${waitingDays} ${t('days')}.`,
        path: `/complaints/${entry.id}`,
        badge: waitingDays >= 5 ? t('critical') : waitingDays >= 2 ? t('warning') : t('healthy'),
        badgeTone: waitingDays >= 5
          ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20'
          : waitingDays >= 2
            ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20'
            : 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
      };
    })
    .sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      return b.waitingDays - a.waitingDays;
    });

  const duplicateNotifications = isAdminRole(user?.role)
    ? buildDuplicateNotifications(allRecords, t)
    : [];

  return [...duplicateNotifications, ...reminderNotifications].slice(0, 20);
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function buildDuplicateNotifications(records, t) {
  const groups = new Map();

  (records || []).forEach((entry) => {
    const trackKey = normalizeName(entry.trackCode);
    if (!trackKey) return;

    if (!groups.has(trackKey)) {
      groups.set(trackKey, {
        trackCode: entry.trackCode,
        entries: [],
      });
    }

    const bucket = groups.get(trackKey);
    bucket.entries.push(entry);
  });

  const duplicates = Array.from(groups.values())
    .map((group) => ({
      trackCode: group.trackCode,
      count: group.entries.length,
      activeCount: group.entries.filter((entry) => entry.archiveStatus !== 'archived' && entry.status !== 'Yopildi').length,
      archivedCount: group.entries.filter((entry) => entry.archiveStatus === 'archived' || entry.status === 'Yopildi').length,
      entries: group.entries,
    }))
    .filter((group) => group.count > 1)
    .filter((group) => !findCompensatedRecoveryPair(group.entries))
    .sort((a, b) => b.count - a.count || a.trackCode.localeCompare(b.trackCode));

  if (!duplicates.length) return [];

  const topTracks = duplicates.slice(0, 3).map((item) => item.trackCode).join(', ');

  return [
    {
      id: 'duplicate-summary',
      readKey: `duplicate-summary:${duplicates.length}:${topTracks}`,
      isOwner: true,
      kind: 'critical',
      severity: 'critical',
      waitingDays: 999,
      title: t('duplicateNotificationTitle'),
      message: `${duplicates.length} ${t('duplicateNotificationGroups')}. ${topTracks}${duplicates.length > 3 ? '...' : ''}`,
      path: '/dashboard',
      badge: t('duplicateNotificationBadge'),
      badgeTone: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    },
  ];
}

function groupNotifications(items, t) {
  const groups = [
    {
      key: 'critical',
      title: t('criticalAlerts'),
      tone: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
      items: items.filter((item) => item.kind === 'critical'),
    },
    {
      key: 'mine',
      title: t('personalReminders'),
      tone: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
      items: items.filter((item) => item.kind === 'mine'),
    },
    {
      key: 'team',
      title: t('teamReminders'),
      tone: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
      items: items.filter((item) => item.kind === 'team'),
    },
  ];

  return groups.filter((group) => group.items.length > 0 || items.length === 0);
}

function findCompensatedRecoveryPair(entries = []) {
  const sorted = entries
    .slice()
    .sort((left, right) => resolveEntrySortTime(left) - resolveEntrySortTime(right) || String(left.id).localeCompare(String(right.id)));
  let latestPair = null;
  let latestCompensation = null;

  sorted.forEach((entry) => {
    if (normalizeName(entry.problemType).includes('qoplab berilgan')) {
      latestCompensation = entry;
      return;
    }

    if (latestCompensation && latestCompensation.id !== entry.id) {
      latestPair = { compensationEntry: latestCompensation, foundEntry: entry };
    }
  });

  return latestPair;
}

function resolveEntrySortTime(entry) {
  return [entry?.date, entry?.importedAt, entry?.updatedAt]
    .map((value) => new Date(value))
    .map((value) => value.getTime())
    .find((value) => Number.isFinite(value))
    ?? Number.MAX_SAFE_INTEGER;
}
