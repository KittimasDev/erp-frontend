import { RoleCode } from "@/lib/auth/role-codes";
import {
  canAccessAnyScreen,
  canAccessScreen,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { SCREEN_CODE_HUB_HREF } from "@/lib/auth/screen-routes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

export type PortalModuleTone =
  | "green"
  | "teal"
  | "olive"
  | "amber"
  | "slate"
  | "indigo"
  | "rose"
  | "cyan"
  | "stone";

export type PortalModuleDef = {
  key: string;
  code: string;
  label: string;
  description: string;
  href: string;
  tone: PortalModuleTone;
  /** Match AppHeader group visibility (legacy mode) */
  roles?: string[];
  adminOnly?: boolean;
  /** Permission Matrix screenCodes — tile shows if any is allowed */
  screenCodes: string[];
  requiresProductionOutput?: boolean;
};

/**
 * Domain tiles for home portal — mirrors AppHeader menu groups.
 * Keep screenCodes in sync with permission-seed-data + AppHeader.
 */
export const PORTAL_MODULES: PortalModuleDef[] = [
  {
    key: "dashboard",
    code: "DB",
    label: "แดชบอร์ด",
    description: "ภาพรวมผู้บริหาร · คลัง · รับยาง",
    href: "/dashboard/executive",
    tone: "stone",
    screenCodes: [
      "EXECUTIVE_DASHBOARD",
      "WAREHOUSE_DASHBOARD",
      "RAW_TIRE_DASHBOARD",
    ],
    roles: [
      RoleCode.EXECUTIVE,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.WEIGHBRIDGE_OFFICER,
      RoleCode.PROCUREMENT_MANAGER,
    ],
  },
  {
    key: "raw-tire",
    code: "RT",
    label: "รับซื้อยาง",
    description: "ตั๋วชั่ง · อนุมัติเข้าคลัง",
    href: "/receiving",
    tone: "olive",
    screenCodes: ["RECEIVING", "STOCK_POSTING_APPROVALS", "FLOOR_SCALE_TICKETS"],
    roles: [
      RoleCode.WEIGHBRIDGE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
      RoleCode.PROCUREMENT_MANAGER,
    ],
  },
  {
    key: "purchase",
    code: "PO",
    label: "จัดซื้อ",
    description: "PR · อนุมัติ PR · PO · อนุมัติ PO · ติดตาม",
    href: "/purchase-requests",
    tone: "amber",
    screenCodes: [
      "PURCHASE_REQUESTS",
      "PURCHASE_REQUEST_APPROVALS",
      "PURCHASE_ORDERS",
      "PURCHASE_ORDER_APPROVALS",
      "PROCUREMENT_TRACKING",
    ],
    roles: [
      "REQUESTER",
      RoleCode.PROCUREMENT_OFFICER,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "rm-warehouse",
    code: "RM",
    label: "คลังวัตถุดิบ",
    description: "ยอดคงเหลือ · เบิก · โอน · นับ",
    href: "/inventory/stock-balances",
    tone: "green",
    /* STOCK_INQUIRY มาก่อน — resolvePortalHref ไล่ตามลำดับนี้ กล่องหน้าแรก
       จะได้เปิดเข้าหน้ารวม ไม่ใช่หน้าใบเดียว */
    screenCodes: [
      "STOCK_INQUIRY",
      "STOCK_BALANCES",
      "INVENTORY_LOTS",
      "MATERIAL_ISSUES",
      "CHEMICAL_ISSUES",
      "TIRE_PREP_ISSUES",
      "INVENTORY_ISSUES",
      "STOCK_TRANSFERS",
      "STOCK_CONTROL",
      "STOCK_MOVEMENTS",
      "GOODS_RECEIPTS",
    ],
    roles: [
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "production",
    code: "PRD",
    label: "การผลิต",
    description: "ใบขอผลิต · ใบสั่งผลิต · รับผลผลิต",
    href: "/production/production-requests",
    tone: "teal",
    screenCodes: [
      "PRODUCTION_DASHBOARD",
      "PRODUCTION_REQUESTS",
      "PRODUCTION_ORDERS",
      "PRODUCTION_OUTPUT_STOCK_REQUESTS",
      "PENDING_PRODUCTION_OUTPUT",
      "TIRE_PREP_STAGES",
      "RCB_PROCESSING",
      "MATERIAL_CONVERSIONS",
    ],
    roles: [
      RoleCode.SALES_OFFICER,
      RoleCode.SALES_MANAGER,
      RoleCode.PRODUCTION_OFFICER,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "fg-warehouse",
    code: "FG",
    label: "คลังสำเร็จรูป",
    description: "ยอด FG · ตรวจสต๊อก · จ่าย · บรรจุ · ส่ง",
    href: "/inventory/stock-balances?isFinishedGood=true",
    tone: "cyan",
    screenCodes: [
      "WAREHOUSE_APPROVALS",
      "FG_STOCK_BALANCES",
      "FG_INVENTORY_LOTS",
      "SALES_STOCK_VERIFICATION",
      "PICKINGS",
      "PACKINGS",
      "DELIVERY_ORDERS",
      "RETURN_NOTES",
      "PRODUCTION_OUTPUT_APPROVALS",
      "FG_STOCK_MOVEMENTS",
    ],
    roles: [
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.SALES_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "sales",
    code: "SD",
    label: "ขาย",
    description: "เสนอราคา · SO · ส่ง · แจ้งหนี้",
    href: "/sales-orders",
    tone: "indigo",
    screenCodes: [
      "MASTERS_CUSTOMERS",
      "QUOTATIONS",
      "SALES_ORDERS",
      // เมนูนี้อยู่ในกลุ่มขายของ sidebar แต่เดิมตกจากลิสต์นี้ — ทำให้คนที่มีสิทธิ์
      // ขายเฉพาะหน้านี้มองไม่เห็นกล่องขายเลย และ badge ก็ไม่ถูกรวมเข้ากล่อง
      "SALES_ORDERS_IN_PRODUCTION",
      "SALES_INVOICES_PENDING",
      "SALES_INVOICES",
      "SALES_TRACKING",
    ],
    roles: [
      RoleCode.SALES_OFFICER,
      RoleCode.SALES_MANAGER,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "laboratory",
    code: "LAB",
    label: "ห้องปฏิบัติการ",
    description: "ตัวอย่างตรวจสอบ (LIMS)",
    href: "/laboratory/samples",
    tone: "rose",
    screenCodes: ["LAB_SAMPLES"],
    roles: [
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "oil-tank-farm",
    code: "OIL",
    label: "ถังน้ำมัน",
    description: "ถัง · รับ · โอน · จ่าย",
    href: "/oil-tank-farm/tanks",
    tone: "amber",
    screenCodes: [
      "OIL_TANKS",
      "OIL_RECEIVINGS",
      "OIL_TRANSFERS",
      "OIL_DISPATCHES",
    ],
    roles: [
      RoleCode.PRODUCTION_OFFICER,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "maintenance",
    code: "MNT",
    label: "ซ่อมบำรุง",
    description: "อุปกรณ์ · ใบงาน · PM",
    href: "/maintenance/equipment",
    tone: "slate",
    screenCodes: ["EQUIPMENT", "WORK_ORDERS", "PM_SCHEDULES"],
    roles: [
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.PRODUCTION_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "hrm",
    code: "HRM",
    label: "บุคคล",
    description: "พนักงาน · เวลางาน · OT · ลา",
    href: "/users",
    tone: "indigo",
    screenCodes: [
      "USERS",
      "ROLES",
      "HRM_ATTENDANCE",
      "HRM_OVERTIME",
      "HRM_LEAVE",
    ],
    roles: [RoleCode.EXECUTIVE],
  },
  {
    key: "finance",
    code: "FIN",
    label: "การเงิน",
    description: "จ่าย Supplier · ประวัติจ่าย",
    href: "/purchase-payments",
    tone: "slate",
    screenCodes: ["PURCHASE_PAYMENTS_PENDING", "PURCHASE_PAYMENTS"],
    roles: [
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "reports",
    code: "RPT",
    label: "รายงาน",
    description: "จัดซื้อ · รับยาง · ขาย · ลูกหนี้",
    href: "/reports/procurement",
    tone: "stone",
    screenCodes: [
      "REPORTS_PROCUREMENT",
      "REPORTS_RECEIVING",
      "REPORTS_CHEMICAL_CONSUMPTION",
      "REPORTS_AR_AGING",
      "REPORTS_SALES_INVOICES",
      "REPORTS_SALES_PAYMENTS",
      "REPORTS_INVENTORY",
      "REPORTS_PAYMENTS",
    ],
    roles: [
      RoleCode.PROCUREMENT_OFFICER,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.WEIGHBRIDGE_OFFICER,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.SALES_OFFICER,
      RoleCode.SALES_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
    ],
  },
  {
    key: "master",
    code: "MST",
    label: "Master / ตั้งค่า",
    description: "ข้อมูลหลัก · ผู้ใช้ · สิทธิ์",
    href: "/masters/items",
    tone: "slate",
    screenCodes: [
      "MASTERS_ITEMS",
      "MASTERS_VENDORS",
      "MASTERS_CUSTOMERS",
      "USERS",
      "PERMISSIONS",
      "AUDIT_LOGS",
      "SETTINGS_AI_OCR",
      "ROLES",
      "TEMP_CASES",
      "WAREHOUSES",
      "WAREHOUSE_LOCATIONS",
      "MASTERS_UNITS",
      "MASTERS_UNIT_CONVERSIONS",
      "MATERIAL_CONVERSION_ROUTES",
      "PRODUCTION_FORMULAS",
      "MASTERS_SELLERS",
      "MASTERS_SELLER_TYPES",
      "MASTERS_WEIGHBRIDGE_SCALES",
    ],
    roles: [
      RoleCode.SALES_OFFICER,
      RoleCode.SALES_MANAGER,
      RoleCode.PROCUREMENT_OFFICER,
      RoleCode.PROCUREMENT_MANAGER,
      RoleCode.WAREHOUSE_OFFICER,
      RoleCode.WAREHOUSE_MANAGER,
      RoleCode.ACCOUNTING_OFFICER,
      RoleCode.EXECUTIVE,
      RoleCode.WEIGHBRIDGE_OFFICER,
    ],
  },
];

export function canSeePortalModule(mod: PortalModuleDef): boolean {
  if (mod.requiresProductionOutput && !PRODUCTION_OUTPUT_ENABLED) {
    return false;
  }
  if (isAdministrator()) {
    return true;
  }

  // Matrix: screenCodes only (adminOnly applies in legacy mode)
  if (isMatrixPermissionMode()) {
    return canAccessAnyScreen(mod.screenCodes);
  }

  if (mod.adminOnly) {
    return false;
  }

  if (!mod.roles || mod.roles.length === 0) {
    return false;
  }
  return mod.roles.some((role) => userHasRole(role));
}

/** Pick a hub URL the current user can open (avoid landing on a forbidden page). */
export function resolvePortalHref(mod: PortalModuleDef): string {
  if (isMatrixPermissionMode()) {
    for (const code of mod.screenCodes) {
      if (!canAccessScreen(code)) {
        continue;
      }
      const href = SCREEN_CODE_HUB_HREF[code];
      if (href) {
        return href;
      }
    }
    // Tile visible but no mapped hub — stay on portal
    return "/";
  }

  if (mod.key === "finance") {
    if (userHasRole(RoleCode.ACCOUNTING_OFFICER)) {
      return "/purchase-payments/pending";
    }
    return "/purchase-payments";
  }

  if (mod.key === "master") {
    if (isAdministrator()) {
      return "/users";
    }
    return "/masters/items";
  }

  if (mod.key === "reports") {
    if (
      userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
      userHasRole(RoleCode.PROCUREMENT_MANAGER)
    ) {
      return "/reports/procurement";
    }
    if (userHasRole(RoleCode.WEIGHBRIDGE_OFFICER)) {
      return "/reports/receiving";
    }
    if (
      userHasRole(RoleCode.SALES_OFFICER) ||
      userHasRole(RoleCode.SALES_MANAGER)
    ) {
      return "/sales-tracking";
    }
    if (
      userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
      userHasRole(RoleCode.WAREHOUSE_MANAGER)
    ) {
      return "/reports/chemical-consumption";
    }
    return "/reports/receiving";
  }

  if (mod.key === "purchase") {
    if (
      userHasRole("REQUESTER") &&
      !userHasRole(RoleCode.PROCUREMENT_OFFICER) &&
      !userHasRole(RoleCode.PROCUREMENT_MANAGER)
    ) {
      return "/purchase-requests";
    }
    if (
      userHasRole(RoleCode.WAREHOUSE_OFFICER) &&
      !userHasRole(RoleCode.PROCUREMENT_OFFICER) &&
      !userHasRole(RoleCode.PROCUREMENT_MANAGER)
    ) {
      return "/goods-receipts";
    }
  }

  return mod.href;
}

export function getVisiblePortalModules(): PortalModuleDef[] {
  return PORTAL_MODULES.filter(canSeePortalModule);
}
