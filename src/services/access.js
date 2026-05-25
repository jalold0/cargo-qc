export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export const ACCESS_KEYS = ['dashboard', 'complaints', 'tracking', 'assistantAi', 'module102', 'users', 'compensated', 'settings'];
export const SETTINGS_MANAGE_KEY = 'settings_manage';
export const SETTINGS_SECTION_KEYS = [
  'settings_profile',
  'settings_users',
  'settings_problem_types',
  'settings_departments',
  'settings_sources',
  'settings_roles',
  'settings_assignments',
];
export const ALL_PERMISSIONS = [...ACCESS_KEYS, SETTINGS_MANAGE_KEY, ...SETTINGS_SECTION_KEYS];

export function isAdminRole(role) {
  return normalizeRole(role) === 'admin';
}

export function isManagerRole(role) {
  const value = normalizeRole(role);
  return value === 'menejer' || value === 'manager';
}

export function isLimitedRole(role) {
  return !isAdminRole(role) && !isManagerRole(role);
}

export function getDefaultPermissions(role) {
  if (isAdminRole(role)) return ALL_PERMISSIONS;
  if (isManagerRole(role)) return ['dashboard', 'complaints', 'tracking', 'assistantAi', 'module102', 'compensated', 'settings', SETTINGS_MANAGE_KEY, ...SETTINGS_SECTION_KEYS];
  return ['dashboard', 'tracking', 'assistantAi', 'module102', 'compensated', 'settings', 'settings_profile'];
}

export function sanitizePermissions(permissions = []) {
  const values = Array.from(new Set((permissions || []).filter(Boolean)));

  if ((values.includes(SETTINGS_MANAGE_KEY) || SETTINGS_SECTION_KEYS.some((key) => values.includes(key))) && !values.includes('settings')) {
    values.push('settings');
  }

  return values;
}

export function hasCustomPermissions(user) {
  return Array.isArray(user?.permissions);
}

export function getResolvedPermissions(userOrRole) {
  if (typeof userOrRole === 'string' || userOrRole == null) {
    return getDefaultPermissions(userOrRole);
  }

  if (isAdminRole(userOrRole.role)) {
    return ALL_PERMISSIONS;
  }

  if (hasCustomPermissions(userOrRole)) {
    return sanitizePermissions(userOrRole.permissions);
  }

  return getDefaultPermissions(userOrRole.role);
}

export function canAccess(accessKey, userOrRole) {
  if (!accessKey) return false;
  if (isAdminRole(typeof userOrRole === 'string' ? userOrRole : userOrRole?.role)) return true;
  return getResolvedPermissions(userOrRole).includes(accessKey);
}

export function canManageSettings(userOrRole) {
  if (isAdminRole(typeof userOrRole === 'string' ? userOrRole : userOrRole?.role)) return true;
  return getResolvedPermissions(userOrRole).includes(SETTINGS_MANAGE_KEY);
}

export function canAccessSettingsSection(sectionKey, userOrRole) {
  if (!sectionKey) return false;
  if (isAdminRole(typeof userOrRole === 'string' ? userOrRole : userOrRole?.role)) return true;
  const permissions = getResolvedPermissions(userOrRole);
  return permissions.includes(SETTINGS_MANAGE_KEY) || permissions.includes(sectionKey);
}
