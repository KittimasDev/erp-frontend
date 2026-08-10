/**
 * Active portal module — after clicking a home tile, sidebar shows only that module's menus.
 * Stored in sessionStorage so a tab keeps context until home / logout.
 */

export const PORTAL_MODULE_STORAGE_KEY = "erp_active_portal_module";

export const PORTAL_MODULE_UPDATED_EVENT = "erp-portal-module-updated";

export type PortalModuleKey =
  | "dashboard"
  | "raw-tire"
  | "purchase"
  | "rm-warehouse"
  | "production"
  | "fg-warehouse"
  | "sales"
  | "laboratory"
  | "oil-tank-farm"
  | "maintenance"
  | "hrm"
  | "finance"
  | "reports"
  | "master";

/** Sidebar group ids in AppHeader */
export type PortalMenuGroupId =
  | "dashboard"
  | "raw-tire"
  | "rm-warehouse"
  | "production"
  | "fg-warehouse"
  | "sales"
  | "purchase"
  | "laboratory"
  | "oil-tank-farm"
  | "maintenance"
  | "hrm"
  | "finance"
  | "reports"
  | "settings"
  | "master";

export const PORTAL_MODULE_LABEL: Record<PortalModuleKey, string> = {
  dashboard: "แดชบอร์ด",
  "raw-tire": "รับซื้อยาง",
  purchase: "จัดซื้อ",
  "rm-warehouse": "คลังวัตถุดิบ",
  production: "การผลิต",
  "fg-warehouse": "คลังสินค้าสำเร็จรูป",
  sales: "ขายและจัดส่ง",
  laboratory: "ห้องปฏิบัติการ",
  "oil-tank-farm": "ถังน้ำมัน",
  maintenance: "ซ่อมบำรุง",
  hrm: "บุคคล",
  finance: "การเงิน",
  reports: "รายงาน",
  master: "Master / ตั้งค่า",
};

export const PORTAL_MODULE_MENU_GROUPS: Record<
  PortalModuleKey,
  readonly PortalMenuGroupId[]
> = {
  dashboard: ["dashboard"],
  "raw-tire": ["raw-tire"],
  purchase: ["purchase"],
  "rm-warehouse": ["rm-warehouse"],
  production: ["production"],
  "fg-warehouse": ["fg-warehouse"],
  sales: ["sales"],
  laboratory: ["laboratory"],
  "oil-tank-farm": ["oil-tank-farm"],
  maintenance: ["maintenance"],
  hrm: ["hrm"],
  finance: ["finance"],
  reports: ["reports"],
  master: ["settings", "master"],
};

const PORTAL_MODULE_KEYS = new Set<string>(
  Object.keys(PORTAL_MODULE_MENU_GROUPS),
);

function isPortalModuleKey(value: string): value is PortalModuleKey {
  return PORTAL_MODULE_KEYS.has(value);
}

export function getActivePortalModule(): PortalModuleKey | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(PORTAL_MODULE_STORAGE_KEY)?.trim();
    if (!raw || !isPortalModuleKey(raw)) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function setActivePortalModule(key: PortalModuleKey | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!key) {
      sessionStorage.removeItem(PORTAL_MODULE_STORAGE_KEY);
    } else {
      sessionStorage.setItem(PORTAL_MODULE_STORAGE_KEY, key);
    }
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(
    new CustomEvent(PORTAL_MODULE_UPDATED_EVENT, { detail: { key } }),
  );
}

export function clearActivePortalModule() {
  setActivePortalModule(null);
}

/**
 * Infer module from current path when session has no active module
 * (e.g. deep link / refresh on an inner page).
 */
export function inferPortalModuleFromPathname(
  pathname: string,
): PortalModuleKey | null {
  if (!pathname || pathname === "/") {
    return null;
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname === "/inventory/dashboard" ||
    pathname === "/receiving/dashboard"
  ) {
    return "dashboard";
  }
  if (
    pathname.startsWith("/receiving") ||
    pathname.startsWith("/warehouse/stock-posting-approvals") ||
    pathname.startsWith("/weighbridge/floor-scale") ||
    pathname.startsWith("/raw-tire-purchase")
  ) {
    return "raw-tire";
  }
  if (
    pathname.startsWith("/purchase-requests") ||
    pathname.startsWith("/purchase_requests") ||
    pathname.startsWith("/purchase-orders") ||
    pathname.startsWith("/procurement")
  ) {
    return "purchase";
  }
  if (pathname.startsWith("/goods-receipts")) {
    return "rm-warehouse";
  }
  if (
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/warehouse/approvals")
  ) {
    // /inventory/dashboard already handled above
    if (pathname === "/inventory/dashboard") {
      return "dashboard";
    }
    return "rm-warehouse";
  }
  if (
    pathname.startsWith("/production") ||
    pathname.startsWith("/production-output") ||
    pathname.startsWith("/receiving/production-output") ||
    pathname.startsWith("/receiving/pending-production-output") ||
    pathname.startsWith("/warehouse/production-output")
  ) {
    return "production";
  }
  if (
    pathname.startsWith("/pickings") ||
    pathname.startsWith("/packings") ||
    pathname.startsWith("/dispatch-orders")
  ) {
    // FG warehouse ops often share these — treat packing/picking as fg for menu scope
    if (pathname.startsWith("/dispatch-orders")) {
      return "fg-warehouse";
    }
    return "fg-warehouse";
  }
  if (
    pathname.startsWith("/quotations") ||
    pathname.startsWith("/sales-orders") ||
    pathname.startsWith("/delivery-orders") ||
    pathname.startsWith("/sales-invoices") ||
    pathname.startsWith("/sales-tracking")
  ) {
    return "sales";
  }
  if (pathname.startsWith("/laboratory")) {
    return "laboratory";
  }
  if (pathname.startsWith("/oil-tank-farm")) {
    return "oil-tank-farm";
  }
  if (pathname.startsWith("/maintenance")) {
    return "maintenance";
  }
  if (pathname.startsWith("/hrm") || pathname === "/users") {
    // /users is also master — prefer hrm when path is users without settings
    if (
      pathname.startsWith("/users") &&
      (pathname.includes("tab=permissions") || pathname.includes("tab=roles"))
    ) {
      return "master";
    }
    if (pathname.startsWith("/hrm")) {
      return "hrm";
    }
    return "hrm";
  }
  if (pathname.startsWith("/purchase-payments")) {
    return "finance";
  }
  if (pathname.startsWith("/reports")) {
    return "reports";
  }
  if (
    pathname.startsWith("/masters") ||
    pathname.startsWith("/warehouses") ||
    pathname.startsWith("/warehouse-locations") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/case")
  ) {
    return "master";
  }

  return null;
}

export function resolveActivePortalModule(
  pathname: string,
): PortalModuleKey | null {
  if (pathname === "/") {
    return null;
  }
  return getActivePortalModule() ?? inferPortalModuleFromPathname(pathname);
}

export function portalModuleAllowsMenuGroup(
  moduleKey: PortalModuleKey | null,
  groupId: PortalMenuGroupId,
): boolean {
  if (!moduleKey) {
    return false;
  }
  return PORTAL_MODULE_MENU_GROUPS[moduleKey].includes(groupId);
}
