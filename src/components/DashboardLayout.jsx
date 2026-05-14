import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, useLanguageStore, useThemeStore } from '../store/authStore';
import { getAllOtkRecords, getOtkEntries, getWaitingDays, subscribeToOtkData } from '../services/localData';
import { canAccess, isAdminRole } from '../services/access';
import { useT } from '../i18n';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  Bell,
  Sun,
  Moon,
  MapPin,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, accessKey: 'dashboard' },
  { path: '/complaints', labelKey: 'complaints', icon: FileText, accessKey: 'complaints' },
  { path: '/tracking', labelKey: 'tracking', icon: MapPin, accessKey: 'tracking' },
  { path: '/users', labelKey: 'users', icon: Users, accessKey: 'users' },
  { path: '/branches', labelKey: 'departmentsSources', icon: Building2, accessKey: 'branches' },
  { path: '/settings', labelKey: 'settings', icon: Settings, accessKey: 'settings' },
];

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
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useMemo(() => buildNotifications({ entries, allRecords, user, t }), [entries, allRecords, user, t]);
  const notificationGroups = useMemo(() => groupNotifications(notifications, t), [notifications, t]);
  const isWideContentRoute = ['/complaints', '/tracking', '/branches'].some((path) => location.pathname.startsWith(path));

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
    setActiveToolbarMenu((current) => (current === menu ? null : menu));
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
        {visibleItems.map(({ path, labelKey, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileSidebarOpen(false)}
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

      <div className="border-t border-slate-200/50 p-3 dark:border-slate-800/70">
        <div className={clsx('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <ProfileAvatar user={user} rounded="rounded-full" />

          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{user?.full_name}</p>
              <span
                className={clsx(
                  'mt-1 inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ring-1',
                  ROLE_COLORS[user?.role] || DEFAULT_ROLE_COLOR
                )}
              >
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          )}

          {sidebarOpen && (
            <button
              onClick={handleLogout}
              title={t('logout')}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
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
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} t={t} />

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
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/30 ring-2 ring-white dark:ring-slate-900">
                  {notifications.length > 9 ? '9+' : notifications.length}
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
                  {notifications.length === 0 ? (
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
                              key={item.id}
                              to={item.path || `/complaints/${item.id}`}
                              onClick={() => setActiveToolbarMenu(null)}
                              className="block px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</p>
                                </div>
                                <span
                                  className={clsx(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                    item.badgeTone
                                  )}
                                >
                                  {item.badge}
                                </span>
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

function ThemeToggle({ theme, toggleTheme, t }) {
  const dark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300"
      title={dark ? t('lightMode') : t('darkMode')}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
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
        count: 0,
        activeCount: 0,
        archivedCount: 0,
      });
    }

    const bucket = groups.get(trackKey);
    bucket.count += 1;
    if (entry.archiveStatus === 'archived' || entry.status === 'Yopildi') {
      bucket.archivedCount += 1;
    } else {
      bucket.activeCount += 1;
    }
  });

  const duplicates = Array.from(groups.values())
    .filter((group) => group.count > 1)
    .sort((a, b) => b.count - a.count || a.trackCode.localeCompare(b.trackCode));

  if (!duplicates.length) return [];

  const topTracks = duplicates.slice(0, 3).map((item) => item.trackCode).join(', ');

  return [
    {
      id: 'duplicate-summary',
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
