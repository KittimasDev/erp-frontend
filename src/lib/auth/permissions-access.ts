import type { MyPermissionsData } from "@/types/permissions";
import { getStoredUser } from "@/lib/auth/session";

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

export type ScreenActionPermissions = {
  canView: boolean;
  canViewAll: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
};

const SALES_OWN_SCOPE_SCREENS = new Set([
  "QUOTATIONS",
  "SALES_ORDERS",
  "SALES_TRACKING",
]);

/**
 * ใช้เฉพาะตอนสิทธิ์ยังโหลดไม่เสร็จ (localStorage ว่าง) — Manager / Executive /
 * Admin เห็น QT/SO ทุกใบ ตรงกับ DEFAULT_GRANTS ที่ backend seed ให้
 */
function fallbackCanViewAllSalesDocuments(): boolean {
  const user = getStoredUser();
  const roleCodes = user?.roles?.map((role) => role.roleCode) ?? [];
  return roleCodes.some(
    (code) =>
      code === "ADMINISTRATOR" ||
      code === "SALES_MANAGER" ||
      code === "EXECUTIVE",
  );
}

/**
 * Matrix CRUD/action flags for a screen.
 * - Admin (`*`) → all true
 * - สิทธิ์ยังโหลดไม่เสร็จ (localStorage ว่าง) → all true เพื่อไม่ให้ UI กระพริบ
 *   ตัวบังคับจริงคือ backend (PermissionsGuard) ไม่ใช่ flag ชุดนี้
 * - นอกนั้นอ่านจาก Permission Matrix ตรง ๆ — ไม่มีสิทธิ์ = false
 */
export function getScreenActionPermissions(
  screenCode: string,
): ScreenActionPermissions {
  if (!isMatrixPermissionMode()) {
    const canViewAll = SALES_OWN_SCOPE_SCREENS.has(screenCode)
      ? fallbackCanViewAllSalesDocuments()
      : true;
    return {
      canView: true,
      canViewAll,
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
    };
  }

  const access = getStoredPermissions();
  if (access?.permissionCodes.includes("*")) {
    return {
      canView: true,
      canViewAll: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canApprove: true,
    };
  }

  const canView =
    canAccessScreen(screenCode) ||
    hasPermission(
      `${screenCode}.VIEW`,
      `${screenCode}.VIEW_ALL`,
      `${screenCode}.ADD`,
      `${screenCode}.EDIT`,
      `${screenCode}.DELETE`,
      `${screenCode}.APPROVE`,
    );

  return {
    canView,
    canViewAll: hasPermission(`${screenCode}.VIEW_ALL`),
    canAdd: hasPermission(`${screenCode}.ADD`),
    canEdit: hasPermission(`${screenCode}.EDIT`),
    canDelete: hasPermission(`${screenCode}.DELETE`),
    canApprove: hasPermission(`${screenCode}.APPROVE`),
  };
}
