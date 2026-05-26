import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ImageUp, Pencil, Plus, RotateCcw, Save, Trash2, UserRound, Users2, X } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_DEPARTMENT_ORDER_CONTENT,
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
import { canAccessSettingsSection, canManageSettings, isAdminRole, isManagerRole } from '../services/access';
import { UsersManagementSection } from './UsersPage';
import SyncToSupabasePanel from '../components/SyncToSupabasePanel';

export default function SettingsPage() {
  const t = useT();
  const { user, updateUser } = useAuthStore();
  const canManage = canManageSettings(user);
  const isAdmin = isAdminRole(user?.role);
  const [settings, setSettings] = useState(() => getOtkSettings());
  const [systemUsers, setSystemUsers] = useState(() => getSystemUsers());
  const [profileForm, setProfileForm] = useState(() => {
    const account = getSystemUsers().find((item) => item.id === user?.id || item.username?.toLowerCase() === user?.username?.toLowerCase());
    return {
      username: account?.username || user?.username || '',
      password: account?.password || '',
      avatarUrl: account?.avatarUrl || user?.avatarUrl || '',
    };
  });
  const [problemDraft, setProblemDraft] = useState({ name: '', minutes: '' });
  const [warehouseProblemInput, setWarehouseProblemInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [sourceInput, setSourceInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [assignmentDraft, setAssignmentDraft] = useState(createEmptyAssignment());
  const [openSection, setOpenSection] = useState('profile');

  const employeeOptions = useMemo(() => {
    const values = systemUsers
      .filter((item) => item.active !== false && (isAdminRole(item.role) || isManagerRole(item.role)))
      .map((item) => item.full_name || item.username)
      .filter(Boolean);

    return Array.from(new Set(values));
  }, [systemUsers]);

  useEffect(() => {
    const sync = () => {
      const latestSettings = getOtkSettings();
      const latestUsers = getSystemUsers();
      const account = latestUsers.find((item) => item.id === user?.id || item.username?.toLowerCase() === user?.username?.toLowerCase());
      setSettings(latestSettings);
      setSystemUsers(latestUsers);
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

  const addProblemType = () => {
    const name = problemDraft.name.trim();
    const minutes = Math.max(0, Number(problemDraft.minutes) || 0);
    if (!name) return;
    if (settings.problemTypes.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t('duplicateName'));
      return;
    }

    updateSettings({
      ...settings,
      problemTypes: [...settings.problemTypes, { name, minutes }],
    });
    setProblemDraft({ name: '', minutes: '' });
    toast.success(t('added'));
  };

  const editProblemType = (oldName, nextValue) => {
    const name = nextValue.name.trim();
    const minutes = Math.max(0, Number(nextValue.minutes) || 0);
    if (!name) return false;
    if (settings.problemTypes.some((item) => item.name !== oldName && item.name.toLowerCase() === name.toLowerCase())) {
      toast.error(t('duplicateName'));
      return false;
    }

    updateSettings({
      ...settings,
      problemTypes: settings.problemTypes.map((item) => (
        item.name === oldName ? { name, minutes } : item
      )),
    });
    toast.success(t('saved'));
    return true;
  };

  const removeProblemType = (name) => {
    updateSettings({
      ...settings,
      problemTypes: settings.problemTypes.filter((item) => item.name !== name),
    });
    toast.success(t('deleted'));
  };

  // ---- Toshkent ombori muammo turlari (alohida ro'yxat) ----
  const addWarehouseProblemType = () => {
    const name = warehouseProblemInput.trim();
    if (!name) return;
    const existing = settings.warehouseProblemTypes || [];
    if (existing.some((item) => item.toLowerCase() === name.toLowerCase())) {
      toast.error(t('duplicateName') || 'Bunday nom allaqachon bor');
      return;
    }
    updateSettings({
      ...settings,
      warehouseProblemTypes: [...existing, name],
    });
    setWarehouseProblemInput('');
    toast.success(t('added') || "Qo'shildi");
  };

  const removeWarehouseProblemType = (name) => {
    const existing = settings.warehouseProblemTypes || [];
    updateSettings({
      ...settings,
      warehouseProblemTypes: existing.filter((item) => item !== name),
    });
    toast.success(t('deleted') || "O'chirildi");
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
      departmentOrderContent: DEFAULT_DEPARTMENT_ORDER_CONTENT,
    });
    toast.success(t('defaultsRestored'));
  };

  const updateAssignments = (nextAssignments) => {
    updateSettings({
      ...settings,
      departmentOrderContent: {
        ...(settings.departmentOrderContent || DEFAULT_DEPARTMENT_ORDER_CONTENT),
        actualAssignments: nextAssignments,
      },
    });
  };

  const addAssignment = () => {
    const next = sanitizeAssignment(assignmentDraft);
    if (!next.task) {
      toast.error(t('assignmentTaskRequired'));
      return;
    }

    updateAssignments([...(settings.departmentOrderContent?.actualAssignments || []), next]);
    setAssignmentDraft(createEmptyAssignment());
    toast.success(t('added'));
  };

  const editAssignment = (index, nextValue) => {
    const next = sanitizeAssignment(nextValue);
    if (!next.task) {
      toast.error(t('assignmentTaskRequired'));
      return false;
    }

    updateAssignments(
      (settings.departmentOrderContent?.actualAssignments || []).map((item, itemIndex) =>
        itemIndex === index ? next : item
      )
    );
    toast.success(t('saved'));
    return true;
  };

  const removeAssignment = (index) => {
    updateAssignments((settings.departmentOrderContent?.actualAssignments || []).filter((_, itemIndex) => itemIndex !== index));
    toast.success(t('deleted'));
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

      <div className="space-y-3">
        {canAccessSettingsSection('settings_profile', user) && (
        <SettingsAccordionItem
          title={t('profileSettings')}
          description={t('profileSettingsDescription')}
          isOpen={openSection === 'profile'}
          onToggle={() => setOpenSection((current) => (current === 'profile' ? null : 'profile'))}
        >
          <ProfileSettingsSection
            t={t}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            saveProfile={saveProfile}
            uploadProfileImage={uploadProfileImage}
            hideHeader
          />
        </SettingsAccordionItem>
        )}

        {canAccessSettingsSection('settings_users', user) && (
          <SettingsAccordionItem
            title={t('users')}
            description={t('usersSubtitle')}
            isOpen={openSection === 'users'}
            onToggle={() => setOpenSection((current) => (current === 'users' ? null : 'users'))}
          >
            <UsersManagementSection embedded hideHeader />
          </SettingsAccordionItem>
        )}

        {/* Supabase Sync — faqat admin uchun */}
        {isAdmin && (
          <SettingsAccordionItem
            title="Supabase Sync"
            description="localStorage'dagi yozuvlarni Supabase serverga ko'chirish"
            isOpen={openSection === 'supabaseSync'}
            onToggle={() =>
              setOpenSection((current) => (current === 'supabaseSync' ? null : 'supabaseSync'))
            }
          >
            <SyncToSupabasePanel />
          </SettingsAccordionItem>
        )}

        {canAccessSettingsSection('settings_problem_types', user) && (
          <SettingsAccordionItem
            title={t('problemTypes')}
            description={t('problemTypesDescription')}
            isOpen={openSection === 'problemTypes'}
            onToggle={() => setOpenSection((current) => (current === 'problemTypes' ? null : 'problemTypes'))}
          >
            <ProblemTypesSettings
              title={t('problemTypes')}
              description={t('problemTypesDescription')}
              items={settings.problemTypes}
              draft={problemDraft}
              onDraftChange={setProblemDraft}
              onAdd={addProblemType}
              onEdit={editProblemType}
              onRemove={removeProblemType}
              t={t}
              hideHeader
            />
          </SettingsAccordionItem>
        )}

        {/* Toshkent ombori muammo turlari — alohida ro'yxat */}
        {canAccessSettingsSection('settings_problem_types', user) && (
          <SettingsAccordionItem
            title="Toshkent ombori — muammo turlari"
            description="Omborga qaytgan yuklar uchun sabab turlari. Bu ro'yxat 'Toshkent ombori' sahifasida qo'llaniladi."
            isOpen={openSection === 'warehouseProblemTypes'}
            onToggle={() => setOpenSection((current) => (current === 'warehouseProblemTypes' ? null : 'warehouseProblemTypes'))}
          >
            <SettingsList
              title="Toshkent ombori — muammo turlari"
              description="Omborga qaytgan yuklar uchun sabab turlari."
              items={settings.warehouseProblemTypes || []}
              value={warehouseProblemInput}
              onChange={setWarehouseProblemInput}
              onAdd={addWarehouseProblemType}
              onEdit={(oldValue, newValue) => {
                const existing = settings.warehouseProblemTypes || [];
                const trimmed = String(newValue || '').trim();
                if (!trimmed) return;
                if (existing.some((item) => item.toLowerCase() === trimmed.toLowerCase() && item !== oldValue)) {
                  toast.error(t('duplicateName') || 'Bunday nom allaqachon bor');
                  return;
                }
                updateSettings({
                  ...settings,
                  warehouseProblemTypes: existing.map((item) => (item === oldValue ? trimmed : item)),
                });
                toast.success(t('saved') || 'Saqlandi');
              }}
              onRemove={removeWarehouseProblemType}
              placeholder="Masalan: Yetkazib bera olmadi"
              t={t}
              hideHeader
            />
          </SettingsAccordionItem>
        )}

        {canAccessSettingsSection('settings_departments', user) && (
          <SettingsAccordionItem
            title={t('departmentsTitle')}
            description={t('departmentsDescription')}
            isOpen={openSection === 'departments'}
            onToggle={() => setOpenSection((current) => (current === 'departments' ? null : 'departments'))}
          >
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
              hideHeader
            />
          </SettingsAccordionItem>
        )}

        {canAccessSettingsSection('settings_sources', user) && (
          <SettingsAccordionItem
            title={t('requestSources')}
            description={t('requestSourcesDescription')}
            isOpen={openSection === 'sources'}
            onToggle={() => setOpenSection((current) => (current === 'sources' ? null : 'sources'))}
          >
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
              hideHeader
            />
          </SettingsAccordionItem>
        )}

        {canAccessSettingsSection('settings_roles', user) && isAdmin && (
          <SettingsAccordionItem
            title={t('roles')}
            description={t('rolesDescription')}
            isOpen={openSection === 'roles'}
            onToggle={() => setOpenSection((current) => (current === 'roles' ? null : 'roles'))}
          >
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
              hideHeader
            />
          </SettingsAccordionItem>
        )}

        {canAccessSettingsSection('settings_assignments', user) && isAdmin && (
          <SettingsAccordionItem
            title={t('departmentAssignmentsTitle')}
            description={t('taskAssignmentsSettingsDescription')}
            isOpen={openSection === 'assignments'}
            onToggle={() => setOpenSection((current) => (current === 'assignments' ? null : 'assignments'))}
          >
            <AssignmentSettings
              title={t('departmentAssignmentsTitle')}
              description={t('taskAssignmentsSettingsDescription')}
              items={settings.departmentOrderContent?.actualAssignments || []}
              draft={assignmentDraft}
              onDraftChange={setAssignmentDraft}
              onAdd={addAssignment}
              onEdit={editAssignment}
              onRemove={removeAssignment}
              employees={employeeOptions}
              t={t}
              hideHeader
            />
          </SettingsAccordionItem>
        )}
      </div>
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

function ProfileSettingsSection({
  t,
  profileForm,
  setProfileForm,
  saveProfile,
  uploadProfileImage,
  isModalView = false,
  hideHeader = false,
}) {
  return (
    <form
      onSubmit={saveProfile}
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${isModalView ? 'shadow-none' : ''}`}
    >
      {!hideHeader && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <UserRound size={17} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">{t('profileSettings')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('profileSettingsDescription')}</p>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${isModalView ? 'lg:grid-cols-2' : 'md:grid-cols-[1fr_1fr_1.4fr_auto] md:items-end'}`}>
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
  );
}

function ProblemTypesSettings({
  title,
  description,
  items,
  draft,
  onDraftChange,
  onAdd,
  onEdit,
  onRemove,
  t,
  isModalView = false,
  hideHeader = false,
}) {
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState({ name: '', minutes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const closeConfirm = () => setDeleteConfirm(null);
    window.addEventListener('scroll', closeConfirm, true);
    window.addEventListener('resize', closeConfirm);
    return () => {
      window.removeEventListener('scroll', closeConfirm, true);
      window.removeEventListener('resize', closeConfirm);
    };
  }, []);

  const startEdit = (item) => {
    setEditing(item.name);
    setEditValue({ name: item.name, minutes: String(item.minutes || 0) });
  };

  const saveEdit = () => {
    if (onEdit(editing, editValue)) {
      setEditing(null);
      setEditValue({ name: '', minutes: '' });
    }
  };

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${isModalView ? 'shadow-none' : ''}`}>
      {!hideHeader && (
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      )}

      <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_auto]">
        <input
          value={draft.name}
          onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={t('newProblemType')}
          className={inputClass()}
        />
        <input
          type="number"
          min="0"
          value={draft.minutes}
          onChange={(event) => onDraftChange((current) => ({ ...current, minutes: event.target.value }))}
          placeholder={t('minutesPlaceholder')}
          className={inputClass()}
        />
        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <Plus size={16} />
          {t('add')}
        </button>
      </div>

      <div className={`${isModalView ? 'max-h-[calc(100vh-19rem)]' : 'max-h-[520px]'} space-y-2 overflow-y-auto pr-1`}>
        {items.map((item) => {
          const isEditing = editing === item.name;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_160px]">
                {isEditing ? (
                  <>
                    <input
                      value={editValue.name}
                      onChange={(event) => setEditValue((current) => ({ ...current, name: event.target.value }))}
                      className="min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      autoFocus
                    />
                    <input
                      type="number"
                      min="0"
                      value={editValue.minutes}
                      onChange={(event) => setEditValue((current) => ({ ...current, minutes: event.target.value }))}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    />
                  </>
                ) : (
                  <>
                    <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {item.minutes || 0} {t('minutesShort')}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <button onClick={saveEdit} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10" title={t('save')}>
                      <Check size={16} />
                    </button>
                    <button onClick={() => setEditing(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title={t('close')}>
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => startEdit(item)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10" title={t('edit')}>
                    <Pencil size={16} />
                  </button>
                )}
                <button
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setDeleteConfirm((current) =>
                      current?.key === item.name
                        ? null
                        : {
                            key: item.name,
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
            </div>
          );
        })}
      </div>

      {deleteConfirm && (
        <DeleteConfirmPopover
          x={deleteConfirm.x}
          y={deleteConfirm.y}
          title={t('confirmDeleteItemTitle')}
          description={t('confirmDeleteItem')}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => {
            onRemove(deleteConfirm.key);
            setDeleteConfirm(null);
          }}
          t={t}
        />
      )}
    </section>
  );
}

function SettingsList({
  title,
  description,
  items,
  value,
  onChange,
  onAdd,
  onEdit,
  onRemove,
  placeholder,
  t,
  isModalView = false,
  hideHeader = false,
}) {
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const closeConfirm = () => setDeleteConfirm(null);
    window.addEventListener('scroll', closeConfirm, true);
    window.addEventListener('resize', closeConfirm);
    return () => {
      window.removeEventListener('scroll', closeConfirm, true);
      window.removeEventListener('resize', closeConfirm);
    };
  }, []);

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
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${isModalView ? 'shadow-none' : ''}`}>
      {!hideHeader && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      )}

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

      <div className={`${isModalView ? 'max-h-[calc(100vh-19rem)]' : 'max-h-[520px]'} space-y-2 overflow-y-auto pr-1`}>
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
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDeleteConfirm((current) =>
                    current?.key === item
                      ? null
                      : {
                          key: item,
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
          </div>
          );
        })}
      </div>

      {deleteConfirm && (
        <DeleteConfirmPopover
          x={deleteConfirm.x}
          y={deleteConfirm.y}
          title={t('confirmDeleteItemTitle')}
          description={t('confirmDeleteItem')}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => {
            onRemove(deleteConfirm.key);
            setDeleteConfirm(null);
          }}
          t={t}
        />
      )}
    </section>
  );
}

function AssignmentSettings({
  title,
  description,
  items,
  draft,
  onDraftChange,
  onAdd,
  onEdit,
  onRemove,
  employees,
  t,
  isModalView = false,
  hideHeader = false,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState(createEmptyAssignment());
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const closeConfirm = () => setDeleteConfirm(null);
    window.addEventListener('scroll', closeConfirm, true);
    window.addEventListener('resize', closeConfirm);
    return () => {
      window.removeEventListener('scroll', closeConfirm, true);
      window.removeEventListener('resize', closeConfirm);
    };
  }, []);

  const startEdit = (item, index) => {
    setEditingIndex(index);
    setEditingValue({
      task: item.task || '',
      responsible: item.responsible || '',
      assistants: [...(item.assistants || ['', '', '', '']), '', '', '', ''].slice(0, 4),
    });
  };

  const stopEdit = () => {
    setEditingIndex(null);
    setEditingValue(createEmptyAssignment());
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    if (onEdit(editingIndex, editingValue)) {
      stopEdit();
    }
  };

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${isModalView ? 'shadow-none' : ''}`}>
      {!hideHeader && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Users2 size={17} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))_auto] lg:items-end">
          <Field label={t('departmentTask')}>
            <textarea
              rows={2}
              value={draft.task}
              onChange={(event) => onDraftChange((current) => ({ ...current, task: event.target.value }))}
              placeholder={t('newAssignmentTask')}
              className={`${inputClass()} resize-y`}
            />
          </Field>
          <Field label={t('responsiblePerson')}>
            <select
              value={draft.responsible}
              onChange={(event) => onDraftChange((current) => ({ ...current, responsible: event.target.value }))}
              className={inputClass()}
            >
              <option value="">{t('selectEmployee')}</option>
              {employees.map((employee) => (
                <option key={`draft-resp-${employee}`} value={employee}>
                  {employee}
                </option>
              ))}
            </select>
          </Field>
          {Array.from({ length: 4 }, (_, index) => (
            <Field key={`draft-assistant-${index}`} label={`${t('assistant')} ${index + 1}`}>
              <select
                value={draft.assistants[index]}
                onChange={(event) =>
                  onDraftChange((current) => ({
                    ...current,
                    assistants: current.assistants.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item
                    ),
                  }))
                }
                className={inputClass()}
              >
                <option value="">{t('selectEmployee')}</option>
                {employees.map((employee) => (
                  <option key={`draft-assist-${index}-${employee}`} value={employee}>
                    {employee}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={16} />
            {t('add')}
          </button>
        </div>
      </div>

      <div className={`mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 ${isModalView ? 'max-h-[calc(100vh-21rem)]' : 'max-h-[720px]'}`}>
        <table className="min-w-[1050px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50/90 dark:bg-slate-800/80">
            <tr>
              <th className="w-14 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('number')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('departmentTask')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('responsiblePerson')}</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 1</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 2</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 3</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('assistant')} 4</th>
              <th className="w-28 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((item, index) => {
              const isEditing = editingIndex === index;
              const current = isEditing ? editingValue : item;
              return (
                <tr key={`${item.task}-${index}`} className="align-top">
                  <td className="px-3 py-3 font-semibold text-slate-500 dark:text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={current.task}
                        onChange={(event) => setEditingValue((prev) => ({ ...prev, task: event.target.value }))}
                        className={`${inputClass()} min-w-[280px] resize-y`}
                      />
                    ) : (
                      <span className="block leading-6 text-slate-700 dark:text-slate-200">{item.task}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={current.responsible}
                        onChange={(event) => setEditingValue((prev) => ({ ...prev, responsible: event.target.value }))}
                        className={inputClass()}
                      >
                        <option value="">{t('selectEmployee')}</option>
                        {employees.map((employee) => (
                          <option key={`edit-resp-${index}-${employee}`} value={employee}>
                            {employee}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200">{item.responsible || '-'}</span>
                    )}
                  </td>
                  {Array.from({ length: 4 }, (_, assistantIndex) => (
                    <td key={`edit-assist-${index}-${assistantIndex}`} className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={current.assistants[assistantIndex]}
                          onChange={(event) =>
                            setEditingValue((prev) => ({
                              ...prev,
                              assistants: prev.assistants.map((assistant, currentIndex) =>
                                currentIndex === assistantIndex ? event.target.value : assistant
                              ),
                            }))
                          }
                          className={inputClass()}
                        >
                          <option value="">{t('selectEmployee')}</option>
                          {employees.map((employee) => (
                            <option key={`edit-assist-option-${index}-${assistantIndex}-${employee}`} value={employee}>
                              {employee}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300">{item.assistants?.[assistantIndex] || '-'}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                            title={t('save')}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={stopEdit}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            title={t('close')}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(item, index)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10"
                          title={t('edit')}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setDeleteConfirm((current) =>
                            current?.index === index
                              ? null
                              : {
                                  index,
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
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteConfirm && (
        <DeleteConfirmPopover
          x={deleteConfirm.x}
          y={deleteConfirm.y}
          title={t('confirmDeleteItemTitle')}
          description={t('confirmDeleteItem')}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => {
            onRemove(deleteConfirm.index);
            setDeleteConfirm(null);
          }}
          t={t}
        />
      )}
    </section>
  );
}

function createEmptyAssignment() {
  return {
    task: '',
    responsible: '',
    assistants: ['', '', '', ''],
  };
}

function sanitizeAssignment(value) {
  const source = value || createEmptyAssignment();
  return {
    task: String(source.task || '').trim(),
    responsible: String(source.responsible || '').trim(),
    assistants: Array.from({ length: 4 }, (_, index) => String(source.assistants?.[index] || '').trim()),
  };
}

function DeleteConfirmPopover({ x, y, title, description, onCancel, onConfirm, t }) {
  return (
    <div
      className="fixed z-[520] w-72 rounded-2xl border border-rose-100 bg-white p-3 text-left shadow-[0_20px_40px_rgba(15,23,42,0.14)] dark:border-rose-500/20 dark:bg-slate-900 dark:shadow-black/40"
      style={{ left: x, top: y }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t('no')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
        >
          {t('yes')}
        </button>
      </div>
    </div>
  );
}

function SettingsAccordionItem({ title, description, isOpen, onToggle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span
          className={clsx(
            'shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
            isOpen && 'rotate-180'
          )}
        >
          <ChevronDown size={18} />
        </span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          {children}
        </div>
      ) : null}
    </section>
  );
}
