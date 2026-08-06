import type { MyPermissionsData } from "@/types/permissions";

const STORAGE_KEY = "erp_my_permissions";

/** Dispatched after localStorage permissions are refreshed (e.g. Matrix save) */
export const PERMISSIONS_UPDATED_EVENT = "erp-permissions-updated";

export function getStoredPermissions(): MyPermissionsData | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as MyPermissionsData;
  } catch {
    return null;
  }
}

export function setStoredPermissions(data: MyPermissionsData) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearStoredPermissions() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/** Notify sidebar / portal to re-read matrix from localStorage */
export function notifyPermissionsUpdated() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(PERMISSIONS_UPDATED_EVENT));
}

export function setStoredPermissionsAndNotify(data: MyPermissionsData) {
  setStoredPermissions(data);
  notifyPermissionsUpdated();
}

/** Menu / Portal: show when matrix mode includes this screenCode */
export function canAccessScreen(screenCode: string | undefined): boolean {
  if (!screenCode) {
    return false;
  }
  const access = getStoredPermissions();
  if (!access || access.mode !== "matrix") {
    return false;
  }
  if (access.permissionCodes.includes("*")) {
    return true;
  }
  if (access.screenCodes.includes(screenCode)) {
    return true;
  }
  // Fallback: any granted permission for this screen (SCREEN.*)
  const prefix = `${screenCode}.`;
  return access.permissionCodes.some((code) => code.startsWith(prefix));
}

export function isMatrixPermissionMode(): boolean {
  const access = getStoredPermissions();
  return access?.mode === "matrix";
}

export function canAccessAnyScreen(screenCodes: string[]): boolean {
  return screenCodes.some((code) => canAccessScreen(code));
}

/** Matrix (or admin *): allow when any of the permission codes is granted */
export function hasPermission(...permissionCodes: string[]): boolean {
  if (permissionCodes.length === 0) {
    return false;
  }
  const access = getStoredPermissions();
  if (!access || access.mode !== "matrix") {
    return false;
  }
  if (access.permissionCodes.includes("*")) {
    return true;
  }
  return permissionCodes.some((code) =>
    access.permissionCodes.includes(code),
  );
}
