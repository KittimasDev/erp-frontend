/**
 * Active portal module — after clicking a home tile, sidebar shows only that module's menus.
 * Stored in sessionStorage so a tab keeps context until home / logout.
 */

import { isFgInventoryScope } from "@/components/inventory/inventory-page-copy";

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

/** หน้าคลังที่ RM กับ FG ใช้ร่วมกัน — แยกด้วย isFinishedGood บน query */
const SHARED_INVENTORY_PATHS = [
  "/inventory/stock-balances",
  "/inventory/lots",
  "/inventory/stock-movements",
  "/inventory/stock-inquiry",
];

export function inferPortalModuleFromPathname(
  pathname: string,
  searchParams?: { get(name: string): string | null } | null,
): PortalModuleKey | null {
  if (!pathname || pathname === "/") {
    return null;
  }

  if (
    isFgInventoryScope(searchParams) &&
    SHARED_INVENTORY_PATHS.some((path) => pathname.startsWith(path))
  ) {
    return "fg-warehouse";
  }

  /*
    หน้าหลักคลังนั่งอยู่ใต้ /inventory แต่ถูก map เป็นกลุ่มแดชบอร์ด — เข้าจากกลุ่มคลัง
    แล้วกลุ่มคลังหายทั้งกลุ่ม · ถ้ามาจากกลุ่มคลังอยู่แล้วให้คงกลุ่มนั้นไว้
  */
  if (pathname === "/inventory/dashboard") {
    const scope = searchParams?.get("scope");
    if (scope === "rm") {
      return "rm-warehouse";
    }
    if (scope === "fg") {
      return "fg-warehouse";
    }
    return "dashboard";
  }

  const stockDocPaths = [
    "/inventory/stock-transfers",
    "/inventory/stock-counts",
    "/inventory/stock-adjustments",
    "/inventory/stock-control",
  ];
  if (
    stockDocPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return searchParams?.get("warehouseGroup") === "FINISHED_GOODS"
      ? "fg-warehouse"
      : "rm-warehouse";
  }

  if (pathname.startsWith("/dashboard") || pathname === "/receiving/dashboard") {
    return "dashboard";
  }
  // ต้องเช็คก่อน `/receiving` ด้านล่าง ไม่งั้นถูกกลืนเป็นรับซื้อยางทั้งหมด
  if (
    pathname.startsWith("/receiving/production-output") ||  // legacy redirect
    pathname.startsWith("/receiving/pending-production-output")
  ) {
    return "production";
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
  // เมนู "อนุมัติงานคลัง" และ "อนุมัติรับผลผลิตเข้าคลัง" อยู่กลุ่ม «คลัง FG»
  // ต้องคืน fg-warehouse ให้ตรงกับที่เมนูอยู่จริง ไม่งั้นเปิดหน้าแล้ว sidebar
  // สลับไปกลุ่มอื่นจนมองไม่เห็นเมนูที่ตัวเองยืนอยู่
  if (
    pathname.startsWith("/warehouse/approvals") ||
    pathname.startsWith("/warehouse/production-output") ||
    pathname === "/sales-orders/stock-verification" ||
    /^\/sales-orders\/[^/]+\/stock-verification/.test(pathname) ||
    pathname.startsWith("/delivery-orders")
  ) {
    return "fg-warehouse";
  }
  if (pathname.startsWith("/inventory")) {
    // /inventory/dashboard จัดการไปแล้วด้านบน
    return "rm-warehouse";
  }
  if (
    pathname.startsWith("/production") ||
    pathname.startsWith("/production-output")
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
    pathname.startsWith("/sales-invoices") ||
    pathname.startsWith("/sales-tracking")
  ) {
    return "sales";
  }
  if (pathname === "/sales-orders" || pathname.startsWith("/sales-orders/")) {
    // รายละเอียด SO ไม่บังคับโมดูลขาย — คลังเปิดจาก FG แล้ว sidebar ยังเป็นคลัง
    if (/^\/sales-orders\/[^/]+$/.test(pathname)) {
      return null;
    }
    if (pathname.startsWith("/sales-orders/stock-verification")) {
      return "fg-warehouse";
    }
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
  if (
    pathname.startsWith("/purchase-payments") ||
    pathname.startsWith("/sales-credit-notes") ||
    pathname.startsWith("/finance")
  ) {
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
  searchParams?: { get(name: string): string | null } | null,
): PortalModuleKey | null {
  if (pathname === "/") {
    return null;
  }
  return (
    inferPortalModuleFromPathname(pathname, searchParams) ??
    getActivePortalModule()
  );
}

/** Keep sessionStorage aligned when the user navigates across portal modules. */
export function syncActivePortalModuleFromPathname(
  pathname: string,
  searchParams?: { get(name: string): string | null } | null,
) {
  if (pathname === "/") {
    clearActivePortalModule();
    return;
  }
  const inferred = inferPortalModuleFromPathname(pathname, searchParams);
  if (!inferred || inferred === getActivePortalModule()) {
    return;
  }
  setActivePortalModule(inferred);
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
