import { Fragment, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, Check, ImageUp, Pause, Pencil, Play, Plus, RotateCcw, Save, Shield, Trash2, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_USERS, getOtkSettings, getSystemUsers, publicUser, saveSystemUsers, subscribeToOtkData } from '../services/localData';
import { hashPassword, isHashed } from '../services/authHash';
import { ACCESS_KEYS, canManageSettings, getResolvedPermissions, hasCustomPermissions, isAdminRole, isManagerRole, sanitizePermissions, SETTINGS_MANAGE_KEY, SETTINGS_SECTION_KEYS } from '../services/access';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';

export function UsersManagementSection({ embedded = false, hideHeader = false }) {
  const t = useT();
  const { user: currentUser, updateUser } = useAuthStore();
  const [settings] = useState(() => getOtkSettings());
  const [users, setUsers] = useState(() => getSystemUsers());
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const roleOptions = useMemo(() => {
    const values = [...(settings.roles || []), ...users.map((user) => user.role)].filter(Boolean);
    return Array.from(new Set(values));
  }, [settings.roles, users]);
  const defaultRole = roleOptions.includes('operator') ? 'operator' : roleOptions[0] || 'operator';
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    password: '',
    role: defaultRole,
    avatarUrl: '',
    workStart: '',
    workEnd: '',
  });
  const showWorkTimeField = isAdminRole(form.role) || isManagerRole(form.role);

  const updateUsers = (next) => {
    setUsers(next);
    saveSystemUsers(next);
    const refreshedCurrentUser = next.find((item) => item.id === currentUser?.id);
    if (refreshedCurrentUser) {
      updateUser(publicUser(refreshedCurrentUser));
    }
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm({ full_name: '', username: '', password: '', role: defaultRole, avatarUrl: '', workStart: '', workEnd: '' });
    setEditingUserId(null);
  };

  const uploadProfileImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      updateForm('avatarUrl', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addUser = async (event) => {
    event.preventDefault();
    const fullName = form.full_name.trim();
    const username = form.username.trim().toLowerCase();
    const password = form.password.trim();
    const workStart = showWorkTimeField ? form.workStart || '' : '';
    const workEnd = showWorkTimeField ? form.workEnd || '' : '';

    // Yangi user qo'shilganda parol majburiy
    // Edit paytida bo'sh bo'lsa — eski parol qoldi (o'zgartirmaymiz)
    const isEditMode = Boolean(editingUserId);
    if (!fullName || !username || (!isEditMode && !password)) {
      toast.error(`${t('employeeName')}, ${t('username')} va ${t('password')} majburiy.`);
      return;
    }

    if (showWorkTimeField && (!workStart || !workEnd)) {
      toast.error(`${t('workStart')} / ${t('workEnd')} majburiy.`);
      return;
    }

    if (users.some((user) => user.username.toLowerCase() === username && user.id !== editingUserId)) {
      toast.error(t('duplicateName'));
      return;
    }

    // Parolni SHA-256 hash qilish (plain-text saqlamaslik uchun)
    // Edit paytida parol bo'sh bo'lsa, eski parolni qoldiramiz
    let nextPassword = '';
    if (password) {
      nextPassword = isHashed(password) ? password : await hashPassword(password);
    }

    if (editingUserId) {
      updateUsers(
        users.map((user) =>
          user.id === editingUserId
            ? {
                ...user,
                full_name: fullName,
                username,
                password: nextPassword || user.password, // bo'sh bo'lsa eski parolni saqlash
                role: form.role,
                avatarUrl: form.avatarUrl.trim(),
                workStart,
                workEnd,
              }
            : user
        )
      );
      toast.success(t('profileSaved'));
      resetForm();
      return;
    }

    updateUsers([
      ...users,
      {
        id: Date.now(),
        full_name: fullName,
        username,
        password: nextPassword,
        role: form.role,
        active: true,
        avatarUrl: form.avatarUrl.trim(),
        workStart,
        workEnd,
      },
    ]);
    resetForm();
    toast.success(t('added'));
  };

  const removeUser = (id) => {
    updateUsers(users.filter((user) => user.id !== id));
    setDeleteConfirm(null);
    toast.success(t('deleted'));
  };

  // Active/Inactive toggle — yangi yuk faqat aktiv hodimlarga biriktiriladi
  const toggleUserActive = (id) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const willBeActive = target.active === false ? true : false;
    updateUsers(
      users.map((u) =>
        u.id === id
          ? { ...u, active: willBeActive, updatedAt: new Date().toISOString() }
          : u,
      ),
    );
    toast.success(willBeActive ? 'Hodim aktiv qilindi' : 'Hodim faolsizlantirildi');
  };

  const resetUsers = () => {
    updateUsers(DEFAULT_USERS);
    resetForm();
    toast.success(t('defaultsRestored'));
  };

  const startEditUser = (targetUser) => {
    setEditingUserId(targetUser.id);
    setDeleteConfirm(null);
    setForm({
      full_name: targetUser.full_name || '',
      username: targetUser.username || '',
      // Parolni edit'da BO'SH ko'rsatish — hash'ni foydalanuvchiga ko'rsatmaslik.
      // Foydalanuvchi parolni o'zgartirmasa, eski parol qoladi.
      password: '',
      role: targetUser.role || defaultRole,
      avatarUrl: targetUser.avatarUrl || '',
      workStart: targetUser.workStart || '',
      workEnd: targetUser.workEnd || '',
    });
    setExpandedUserId(null);
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
      setUsers(getSystemUsers());
    };

    return subscribeToOtkData(sync, { debounceMs: 70 });
  }, []);

  const togglePermission = (targetUser, permissionKey) => {
    if (isAdminRole(targetUser.role)) return;

    const currentPermissions = getResolvedPermissions(targetUser);
    let nextPermissions = currentPermissions.includes(permissionKey)
      ? currentPermissions.filter((item) => item !== permissionKey)
      : [...currentPermissions, permissionKey];

    if (permissionKey === 'settings' && !nextPermissions.includes('settings')) {
      nextPermissions = nextPermissions.filter(
        (item) => item !== SETTINGS_MANAGE_KEY && !SETTINGS_SECTION_KEYS.includes(item)
      );
    }

    const sanitizedPermissions = sanitizePermissions(nextPermissions).filter(
      (item) => item !== SETTINGS_MANAGE_KEY || nextPermissions.includes(SETTINGS_MANAGE_KEY)
    );

    updateUsers(
      users.map((item) =>
        item.id === targetUser.id
          ? {
              ...item,
              permissions: sanitizedPermissions,
            }
          : item
      )
    );
    toast.success(t('accessUpdated'));
  };

  const resetAccess = (targetUser) => {
    updateUsers(
      users.map((item) =>
        item.id === targetUser.id
          ? {
              ...item,
              permissions: undefined,
            }
          : item
      )
    );
    toast.success(t('defaultsRestored'));
  };

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-5 animate-fade-in'}>
      {!embedded && !hideHeader && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('users')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('usersSubtitle')}
            </p>
          </div>
          <button
            onClick={resetUsers}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={16} />
            {t('resetDefaults')}
          </button>
        </div>
      )}

      {embedded && !hideHeader && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('users')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('usersSubtitle')}</p>
          </div>
          <button
            onClick={resetUsers}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={16} />
            {t('resetDefaults')}
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <form onSubmit={addUser} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:max-w-[320px]">
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <UserRound size={17} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                {editingUserId ? t('edit') : t('newAccount')}
              </h2>
              {editingUserId && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('profileSettingsDescription')}</p>
              )}
            </div>
            {editingUserId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title={t('close')}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <Field label={t('employeeName')}>
              <input value={form.full_name} onChange={(event) => updateForm('full_name', event.target.value)} className={inputClass()} />
            </Field>
            <Field label={t('login')}>
              <input value={form.username} onChange={(event) => updateForm('username', event.target.value)} className={inputClass()} />
            </Field>
            <Field label={t('password')}>
              <input value={form.password} onChange={(event) => updateForm('password', event.target.value)} className={inputClass()} />
            </Field>
            <Field label={t('profileImageUrl')}>
              <div className="relative">
                <input
                  value={form.avatarUrl}
                  onChange={(event) => updateForm('avatarUrl', event.target.value)}
                  placeholder="https://..."
                  className={`${inputClass()} pr-12`}
                />
                <label
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                  title="Kompyuterdan yuklash"
                >
                  <ImageUp size={17} />
                  <input type="file" accept="image/*" onChange={uploadProfileImage} className="hidden" />
                </label>
              </div>
            </Field>
            <Field label={t('role')}>
              <select
                value={form.role}
                onChange={(event) => {
                  const nextRole = event.target.value;
                  setForm((current) => ({
                    ...current,
                    role: nextRole,
                    workStart: isAdminRole(nextRole) || isManagerRole(nextRole) ? current.workStart : '',
                    workEnd: isAdminRole(nextRole) || isManagerRole(nextRole) ? current.workEnd : '',
                  }));
                }}
                className={inputClass()}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>{formatRole(role)}</option>
                ))}
              </select>
            </Field>
            {showWorkTimeField && (
              <Field label={t('workHours')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="time"
                    value={form.workStart}
                    onChange={(event) => updateForm('workStart', event.target.value)}
                    className={inputClass()}
                  />
                  <input
                    type="time"
                    value={form.workEnd}
                    onChange={(event) => updateForm('workEnd', event.target.value)}
                    className={inputClass()}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t('workStart')}</span>
                  <span>{t('workEnd')}</span>
                </div>
              </Field>
            )}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {editingUserId ? <Save size={16} /> : <Plus size={16} />}
              {editingUserId ? t('save') : t('add')}
            </button>
            {editingUserId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X size={16} />
                {t('close')}
              </button>
            )}
          </div>
        </form>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-800 dark:bg-slate-950/80">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('employee')}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('profile')}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Login</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('role')}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('workHours')}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('password')}</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('permissions')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => {
                  const expanded = expandedUserId === user.id;
                  const permissions = getResolvedPermissions(user);
                  const customPermissions = hasCustomPermissions(user);
                  const permissionSummary = buildPermissionSummary(permissions, t);
                  const settingsAllowed = canManageSettings(user);
                  const settingsEnabled = permissions.includes('settings');

                  return (
                    <Fragment key={user.id}>
                      <tr
                        className={clsx(
                          'transition',
                          user.active === false
                            ? 'bg-slate-50/60 opacity-70 hover:bg-slate-100/60 dark:bg-slate-900/40 dark:hover:bg-slate-800/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{user.full_name}</span>
                            {user.active === false && (
                              <span className="inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                Pauza
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.full_name} className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                              {user.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{user.username}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatRole(user.role)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {isAdminRole(user.role) || isManagerRole(user.role)
                            ? formatWorkTimeRange(user)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">{user.password}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {isAdminRole(user.role) ? (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                                {t('fullAccess')}
                              </span>
                            ) : (
                              <>
                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                                  {customPermissions ? t('customAccess') : t('roleDefaultAccess')}
                                </span>
                                <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                                  {permissions.length} {t('sectionsVisible')}
                                </span>
                                {permissionSummary.primary.map((label) => (
                                  <span
                                    key={`${user.id}-${label}`}
                                    className="inline-flex rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                                  >
                                    {label}
                                  </span>
                                ))}
                                {permissionSummary.rest > 0 && (
                                  <span className="inline-flex rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700">
                                    +{permissionSummary.rest}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative flex items-center justify-end gap-1">
                            {/* Active/Inactive toggle — admin'larda yo'q (admin har doim aktiv) */}
                            {!isAdminRole(user.role) && (
                              <button
                                onClick={() => toggleUserActive(user.id)}
                                className={clsx(
                                  'rounded-lg p-1.5 transition',
                                  user.active === false
                                    ? 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10'
                                    : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10',
                                )}
                                title={user.active === false ? 'Aktiv qilish' : 'Pauza qilish'}
                              >
                                {user.active === false ? <Play size={16} /> : <Pause size={16} />}
                              </button>
                            )}
                            <button
                              onClick={() => startEditUser(user)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                              title={t('edit')}
                            >
                              <Pencil size={16} />
                            </button>
                            {!isAdminRole(user.role) && (
                              <button
                                onClick={() => setExpandedUserId(expanded ? null : user.id)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                                title={t('accessControl')}
                              >
                                <Shield size={16} />
                              </button>
                            )}
                            <button
                              onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                setDeleteConfirm((current) =>
                                  current?.id === user.id
                                    ? null
                                    : {
                                        id: user.id,
                                        x: Math.min(rect.right - 288, window.innerWidth - 304),
                                        y: rect.bottom + 8,
                                      }
                                );
                              }}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                              title={t('delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && !isAdminRole(user.role) && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50/70 px-4 py-4 dark:bg-slate-950/40">
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t('accessControl')}</h3>
                                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('accessControlDescription')}</p>
                                </div>
                                <button
                                  onClick={() => resetAccess(user)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  <RotateCcw size={14} />
                                  {t('resetDefaults')}
                                </button>
                              </div>

                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('accessControl')}</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                                    {customPermissions ? t('customAccess') : t('roleDefaultAccess')}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('permissions')}</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                                    {permissions.length} {t('sectionsVisible')}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('settingsManage')}</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                                    {settingsAllowed ? t('yes') : t('no')}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {PERMISSION_OPTIONS.map((permission) => {
                                  const checked = permission.key === SETTINGS_MANAGE_KEY
                                    ? canManageSettings(user)
                                    : permissions.includes(permission.key);

                                  return (
                                    <button
                                      key={permission.key}
                                      type="button"
                                      onClick={() => togglePermission(user, permission.key)}
                                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                        checked
                                          ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100'
                                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                                      }`}
                                    >
                                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                        checked
                                          ? 'border-blue-500 bg-blue-500 text-white'
                                          : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-950'
                                      }`}>
                                        <Check size={12} />
                                      </span>
                                      <span>
                                        <span className="block text-sm font-semibold">{t(permission.labelKey)}</span>
                                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{t(permission.descriptionKey)}</span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {settingsEnabled && (
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                                  <div>
                                    <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{t('settings')}</h4>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settingsInnerAccessDescription')}</p>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {SETTINGS_PERMISSION_OPTIONS.map((permission) => {
                                      const checked = permission.key === SETTINGS_MANAGE_KEY
                                        ? settingsAllowed
                                        : permissions.includes(permission.key);

                                      return (
                                        <button
                                          key={permission.key}
                                          type="button"
                                          onClick={() => togglePermission(user, permission.key)}
                                          className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                                            checked
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                            checked
                                              ? 'border-emerald-500 bg-emerald-500 text-white'
                                              : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-950'
                                          }`}>
                                            <Check size={12} />
                                          </span>
                                          <span>
                                            <span className="block text-sm font-semibold">{t(permission.labelKey)}</span>
                                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{t(permission.descriptionKey)}</span>
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

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
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{t('confirmDeleteUserTitle')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t('confirmDeleteUser')}</p>
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
              onClick={() => removeUser(deleteConfirm.id)}
              className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            >
              {t('yes')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// NOTE: Default UsersPage olib tashlandi — App.jsx'da `/users` route Navigate to "/settings".
// Faqat `UsersManagementSection` named export'i ishlatiladi (SettingsPage'da embed qilingan).

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800';
}

function formatWorkTimeRange(user) {
  const workStart = String(user?.workStart || '').trim();
  const workEnd = String(user?.workEnd || '').trim();
  if (!workStart && !workEnd) return '-';
  if (!workStart) return `${workEnd} gacha`;
  if (!workEnd) return `${workStart} dan`;
  return `${workStart} dan ${workEnd} gacha`;
}

function formatRole(role) {
  const labels = {
    admin: 'Admin',
    operator: 'Operator',
    supervisor: 'Supervisor',
    manager: 'Manager',
    menejer: 'Menejer',
  };
  return labels[role] || role;
}

function buildPermissionSummary(permissions, t) {
  const permissionLabels = PERMISSION_OPTIONS
    .filter((item) => permissions.includes(item.key))
    .map((item) => t(item.labelKey));

  return {
    primary: permissionLabels.slice(0, 3),
    rest: Math.max(0, permissionLabels.length - 3),
  };
}

const PERMISSION_OPTIONS = [
  { key: 'dashboard', labelKey: 'dashboard', descriptionKey: 'permissionDashboard' },
  { key: 'complaints', labelKey: 'complaints', descriptionKey: 'permissionComplaints' },
  { key: 'tracking', labelKey: 'tracking', descriptionKey: 'permissionTracking' },
  { key: 'assistantAi', labelKey: 'assistantAi', descriptionKey: 'permissionAssistantAi' },
  { key: 'module102', labelKey: 'module102', descriptionKey: 'permissionModule102' },
  { key: 'users', labelKey: 'users', descriptionKey: 'permissionUsers' },
  { key: 'compensated', labelKey: 'compensatedLoads', descriptionKey: 'permissionCompensated' },
  { key: 'settings', labelKey: 'settings', descriptionKey: 'permissionSettings' },
].filter((item) => item.key === SETTINGS_MANAGE_KEY || ACCESS_KEYS.includes(item.key));

const SETTINGS_PERMISSION_OPTIONS = [
  { key: 'settings_profile', labelKey: 'profileSettings', descriptionKey: 'permissionSettingsProfile' },
  { key: 'settings_users', labelKey: 'users', descriptionKey: 'permissionSettingsUsers' },
  { key: 'settings_problem_types', labelKey: 'problemTypes', descriptionKey: 'permissionSettingsProblemTypes' },
  { key: 'settings_departments', labelKey: 'departmentsTitle', descriptionKey: 'permissionSettingsDepartments' },
  { key: 'settings_sources', labelKey: 'requestSources', descriptionKey: 'permissionSettingsSources' },
  { key: 'settings_roles', labelKey: 'roles', descriptionKey: 'permissionSettingsRoles' },
  { key: 'settings_assignments', labelKey: 'departmentAssignmentsTitle', descriptionKey: 'permissionSettingsAssignments' },
  { key: SETTINGS_MANAGE_KEY, labelKey: 'settingsManage', descriptionKey: 'permissionSettingsManage' },
];
