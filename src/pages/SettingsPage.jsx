import { useEffect, useState } from 'react';
import { Check, ImageUp, Pencil, Plus, RotateCcw, Save, Trash2, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_PROBLEM_TYPES,
  DEFAULT_REQUEST_SOURCES,
  DEFAULT_ROLES,
  getOtkSettings,
  getSystemUsers,
  publicUser,
  saveOtkSettings,
  saveSystemUsers,
  subscribeToOtkData,
} from '../services/localData';
import { useAuthStore } from '../store/authStore';
import { useT } from '../i18n';
import { canManageSettings, isAdminRole } from '../services/access';

export default function SettingsPage() {
  const t = useT();
  const { user, updateUser } = useAuthStore();
  const canManage = canManageSettings(user);
  const isAdmin = isAdminRole(user?.role);
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [profileForm, setProfileForm] = useState(() => {
    const account = getSystemUsers().find((item) => item.id === user?.id || item.username?.toLowerCase() === user?.username?.toLowerCase());
    return {
      username: account?.username || user?.username || '',
      password: account?.password || '',
      avatarUrl: account?.avatarUrl || user?.avatarUrl || '',
    };
  });
  const [problemInput, setProblemInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [roleInput, setRoleInput] = useState('');

  useEffect(() => {
    const sync = () => {
      const latestSettings = getOtkSettings();
      const account = getSystemUsers().find((item) => item.id === user?.id || item.username?.toLowerCase() === user?.username?.toLowerCase());
      setSettings(latestSettings);
      setProfileForm((current) => ({
        ...current,
        username: account?.username || user?.username || '',
        password: account?.password || '',
        avatarUrl: account?.avatarUrl || user?.avatarUrl || '',
      }));
    };

    return subscribeToOtkData(sync, { debounceMs: 80 });
  }, [user?.id, user?.username, user?.avatarUrl]);

  const updateSettings = (next) => {
    setSettings(next);
    saveOtkSettings(next);
  };

  const addItem = (key, value, reset) => {
    const name = value.trim();
    if (!name) return;
    if (settings[key].some((item) => item.toLowerCase() === name.toLowerCase())) {
      toast.error(t('duplicateName'));
      return;
    }
    updateSettings({ ...settings, [key]: [...settings[key], name] });
    reset('');
    toast.success(t('added'));
  };

  const removeItem = (key, value) => {
    updateSettings({ ...settings, [key]: settings[key].filter((item) => item !== value) });
    toast.success(t('deleted'));
  };

  const editItem = (key, oldValue, newValue) => {
    const name = newValue.trim();
    if (!name) return false;
    if (settings[key].some((item) => item !== oldValue && item.toLowerCase() === name.toLowerCase())) {
      toast.error(t('duplicateName'));
      return false;
    }
    updateSettings({ ...settings, [key]: settings[key].map((item) => (item === oldValue ? name : item)) });
    toast.success(t('profileSaved'));
    return true;
  };

  const resetDefaults = () => {
    updateSettings({
      problemTypes: DEFAULT_PROBLEM_TYPES,
      departments: DEFAULT_DEPARTMENTS,
      requestSources: DEFAULT_REQUEST_SOURCES,
      roles: DEFAULT_ROLES,
    });
    toast.success(t('defaultsRestored'));
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const username = profileForm.username.trim().toLowerCase();
    const password = profileForm.password.trim();
    const avatarUrl = profileForm.avatarUrl.trim();

    if (!username || !password) {
      toast.error(`${t('username')} va ${t('password')} majburiy.`);
      return;
    }

    const users = getSystemUsers();
    const currentId = user?.id;
    const currentUsername = user?.username?.toLowerCase();
    const duplicate = users.some(
      (item) => item.id !== currentId && item.username.toLowerCase() !== currentUsername && item.username.toLowerCase() === username
    );

    if (duplicate) {
      toast.error(t('loginTaken'));
      return;
    }

    const hasExistingUser = users.some((item) => item.id === currentId || item.username.toLowerCase() === currentUsername);
    const nextUsers = hasExistingUser
      ? users.map((item) =>
          item.id === currentId || item.username.toLowerCase() === currentUsername
            ? { ...item, username, password, avatarUrl }
            : item
        )
      : [
          ...users,
          {
            id: currentId || Date.now(),
            username,
            password,
            full_name: user?.full_name || username,
            role: user?.role || 'operator',
            active: true,
            avatarUrl,
          },
        ];

    saveSystemUsers(nextUsers);
    const savedUser = nextUsers.find((item) => item.id === currentId || item.username.toLowerCase() === username);
    updateUser(publicUser(savedUser));
    toast.success(t('profileSaved'));
  };

  const uploadProfileImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((current) => ({ ...current, avatarUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t('settings')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('settingsSubtitle')}
          </p>
        </div>
        {canManage && (
          <button
            onClick={resetDefaults}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw size={16} />
            {t('resetDefaults')}
          </button>
        )}
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <UserRound size={17} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('profileSettings')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('profileSettingsDescription')}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end">
          <Field label={t('username')}>
            <input
              value={profileForm.username}
              onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value }))}
              className={inputClass()}
            />
          </Field>
          <Field label={t('password')}>
            <input
              type="password"
              value={profileForm.password}
              onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))}
              className={inputClass()}
            />
          </Field>
          <Field label={t('profileImageUrl')}>
            <div className="relative">
              <input
                value={profileForm.avatarUrl}
                onChange={(event) => setProfileForm((current) => ({ ...current, avatarUrl: event.target.value }))}
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
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Save size={16} />
            {t('save')}
          </button>
        </div>
      </form>

      {canManage && (
        <div className="grid gap-5 lg:grid-cols-2">
          <SettingsList
            title={t('problemTypes')}
            description={t('problemTypesDescription')}
            items={settings.problemTypes}
            value={problemInput}
            onChange={setProblemInput}
            onAdd={() => addItem('problemTypes', problemInput, setProblemInput)}
            onEdit={(oldValue, newValue) => editItem('problemTypes', oldValue, newValue)}
            onRemove={(item) => removeItem('problemTypes', item)}
            placeholder={t('newProblemType')}
            t={t}
          />

          <SettingsList
            title={t('departmentsTitle')}
            description={t('departmentsDescription')}
            items={settings.departments}
            value={departmentInput}
            onChange={setDepartmentInput}
            onAdd={() => addItem('departments', departmentInput, setDepartmentInput)}
            onEdit={(oldValue, newValue) => editItem('departments', oldValue, newValue)}
            onRemove={(item) => removeItem('departments', item)}
            placeholder={t('newDepartment')}
            t={t}
          />

          <SettingsList
            title={t('requestSources')}
            description={t('requestSourcesDescription')}
            items={settings.requestSources}
            value={sourceInput}
            onChange={setSourceInput}
            onAdd={() => addItem('requestSources', sourceInput, setSourceInput)}
            onEdit={(oldValue, newValue) => editItem('requestSources', oldValue, newValue)}
            onRemove={(item) => removeItem('requestSources', item)}
            placeholder={t('newSource')}
            t={t}
          />

          {isAdmin && (
            <SettingsList
              title={t('roles')}
              description={t('rolesDescription')}
              items={settings.roles}
              value={roleInput}
              onChange={setRoleInput}
              onAdd={() => addItem('roles', roleInput, setRoleInput)}
              onEdit={(oldValue, newValue) => editItem('roles', oldValue, newValue)}
              onRemove={(item) => removeItem('roles', item)}
              placeholder={t('newRole')}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
}

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

function SettingsList({ title, description, items, value, onChange, onAdd, onEdit, onRemove, placeholder, t }) {
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (item) => {
    setEditing(item);
    setEditValue(item);
  };

  const saveEdit = () => {
    if (onEdit(editing, editValue)) {
      setEditing(null);
      setEditValue('');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-slate-800"
        />
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <Plus size={16} />
          {t('add')}
        </button>
      </div>

      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {items.map((item) => {
          const isEditing = editing === item;
          return (
          <div
            key={item}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/70"
          >
            {isEditing ? (
              <input
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveEdit();
                  if (event.key === 'Escape') setEditing(null);
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                autoFocus
              />
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item}</span>
            )}
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button
                    onClick={saveEdit}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                    title={t('save')}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    title={t('close')}
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEdit(item)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                  title={t('edit')}
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                onClick={() => onRemove(item)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                title={t('delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
