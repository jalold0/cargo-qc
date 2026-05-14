export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export const ACCESS_KEYS = ['dashboard', 'complaints', 'tracking', 'users', 'branches', 'settings'];
export const SETTINGS_MANAGE_KEY = 'settings_manage';
export const ALL_PERMISSIONS = [...ACCESS_KEYS, SETTINGS_MANAGE_KEY];

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
  if (isManagerRole(role)) return ['dashboard', 'complaints', 'tracking', 'settings', SETTINGS_MANAGE_KEY];
  return ['dashboard', 'tracking', 'branches', 'settings'];
}

export function sanitizePermissions(permissions = []) {
  const values = Array.from(new Set((permissions || []).filter(Boolean)));

  if (values.includes(SETTINGS_MANAGE_KEY) && !values.includes('settings')) {
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
