/**
 * Frontend path → Permission Matrix screenCode(s).
 * Longest prefix wins. Keep in sync with AppHeader menus + permission-seed routePath.
 */

type ScreenRouteRule = {
  /** Pathname prefix (no query). Match path === prefix or path.startsWith(prefix + "/") */
  prefix: string;
  screenCodes: string[];
  /** Optional query that must match (all keys) for this rule to apply */
  query?: Record<string, string>;
};

/**
 * More specific prefixes first. FG variants with query come before bare inventory paths.
 */
const SCREEN_ROUTE_RULES: ScreenRouteRule[] = [
  // Dashboards
  { prefix: "/dashboard/executive", screenCodes: ["EXECUTIVE_DASHBOARD"] },
  { prefix: "/inventory/dashboard", screenCodes: ["WAREHOUSE_DASHBOARD"] },
  { prefix: "/receiving/dashboard", screenCodes: ["RAW_TIRE_DASHBOARD"] },

  // Raw tire
  {
    prefix: "/warehouse/stock-posting-approvals",
    screenCodes: ["STOCK_POSTING_APPROVALS"],
  },
  {
    prefix: "/weighbridge/floor-scale-tickets",
    screenCodes: ["FLOOR_SCALE_TICKETS"],
  },
  {
    prefix: "/receiving/production-output/stock-requests",
    screenCodes: ["PRODUCTION_OUTPUT_STOCK_REQUESTS"],
  },
  {
    prefix: "/production-output/stock-requests",
    screenCodes: ["PRODUCTION_OUTPUT_STOCK_REQUESTS"],
  },
  {
    prefix: "/receiving/pending-production-output",
    screenCodes: ["PENDING_PRODUCTION_OUTPUT"],
  },
  {
    prefix: "/production-output/pending-tickets",
    screenCodes: ["PENDING_PRODUCTION_OUTPUT"],
  },
  { prefix: "/receiving", screenCodes: ["RECEIVING"] },
  {
    prefix: "/raw-tire-purchase/receipts",
    screenCodes: ["RECEIVING"],
  },

  // RM / FG inventory (query-sensitive first)
  {
    prefix: "/inventory/stock-balances",
    query: { itemCategoryCode: "FINISHED_GOODS" },
    screenCodes: ["FG_STOCK_BALANCES"],
  },
  {
    prefix: "/inventory/lots",
    query: { itemCategoryCode: "FINISHED_GOODS" },
    screenCodes: ["FG_INVENTORY_LOTS"],
  },
  {
    prefix: "/inventory/stock-movements",
    query: { itemCategoryCode: "FINISHED_GOODS" },
    screenCodes: ["FG_STOCK_MOVEMENTS"],
  },
  { prefix: "/inventory/stock-balances", screenCodes: ["STOCK_BALANCES"] },
  { prefix: "/inventory/lots", screenCodes: ["INVENTORY_LOTS"] },
  {
    prefix: "/inventory/material-issues",
    screenCodes: ["MATERIAL_ISSUES"],
  },
  { prefix: "/inventory/chemical-issues", screenCodes: ["CHEMICAL_ISSUES"] },
  {
    prefix: "/inventory/tire-prep-issues",
    screenCodes: ["TIRE_PREP_ISSUES"],
  },
  { prefix: "/inventory/issues", screenCodes: ["INVENTORY_ISSUES"] },
  { prefix: "/inventory/stock-inquiry", screenCodes: ["STOCK_INQUIRY"] },
  {
    prefix: "/inventory/stock-transfers",
    screenCodes: ["STOCK_TRANSFERS"],
  },
  { prefix: "/inventory/stock-control", screenCodes: ["STOCK_CONTROL"] },
  { prefix: "/inventory/stock-counts", screenCodes: ["STOCK_COUNTS"] },
  {
    prefix: "/inventory/stock-adjustments",
    screenCodes: ["STOCK_ADJUSTMENTS"],
  },
  {
    prefix: "/inventory/stock-movements",
    screenCodes: ["STOCK_MOVEMENTS"],
  },
  {
    prefix: "/goods-receipts",
    screenCodes: ["GOODS_RECEIPTS"],
  },
  { prefix: "/warehouse/approvals", screenCodes: ["WAREHOUSE_APPROVALS"] },

  // Production
  {
    prefix: "/warehouse/production-output-approvals",
    screenCodes: ["PRODUCTION_OUTPUT_APPROVALS"],
  },
  {
    prefix: "/production/output-stock-requests",
    screenCodes: ["PRODUCTION_OUTPUT_STOCK_REQUESTS"],
  },
  {
    prefix: "/production/production-requests",
    screenCodes: ["PRODUCTION_REQUESTS"],
  },
  {
    prefix: "/production/production-orders",
    screenCodes: ["PRODUCTION_ORDERS"],
  },
  {
    prefix: "/production/tire-prep-stages",
    screenCodes: ["TIRE_PREP_STAGES"],
  },
  { prefix: "/production/rcb-processing", screenCodes: ["RCB_PROCESSING"] },

  // FG ops — create-from-* อนุญาตเข้าด้วย screen ที่เกี่ยวข้องใน flow ขาย
  // (ยาวกว่า / มาก่อน rule ทั่วไปด้านล่าง)
  {
    prefix: "/pickings/create-from-sales-order",
    screenCodes: ["PICKINGS", "SALES_ORDERS", "SALES_STOCK_VERIFICATION"],
  },
  {
    prefix: "/packings/create-from-picking",
    screenCodes: ["PACKINGS", "PICKINGS", "SALES_ORDERS"],
  },
  {
    prefix: "/delivery-orders/create-from-packing",
    screenCodes: ["DELIVERY_ORDERS", "PACKINGS", "SALES_ORDERS"],
  },
  {
    prefix: "/sales-invoices/create-from-delivery",
    screenCodes: [
      "SALES_INVOICES",
      "SALES_INVOICES_PENDING",
      "DELIVERY_ORDERS",
      "SALES_ORDERS",
    ],
  },
  { prefix: "/pickings", screenCodes: ["PICKINGS"] },
  { prefix: "/packings", screenCodes: ["PACKINGS"] },
  { prefix: "/dispatch-orders", screenCodes: ["DISPATCH_ORDERS"] },

  // Purchase
  {
    prefix: "/purchase-requests/approvals",
    screenCodes: ["PURCHASE_REQUEST_APPROVALS"],
  },
  {
    prefix: "/purchase_requests",
    screenCodes: ["PURCHASE_REQUESTS"],
  },
  { prefix: "/purchase-requests", screenCodes: ["PURCHASE_REQUESTS"] },
  {
    prefix: "/purchase-orders/approvals",
    screenCodes: ["PURCHASE_ORDER_APPROVALS"],
  },
  { prefix: "/purchase-orders", screenCodes: ["PURCHASE_ORDERS"] },
  { prefix: "/procurement/tracking", screenCodes: ["PROCUREMENT_TRACKING"] },
  { prefix: "/procurement", screenCodes: ["PROCUREMENT_TRACKING"] },

  // Sales
  { prefix: "/customers", screenCodes: ["MASTERS_CUSTOMERS"] },
  { prefix: "/quotations", screenCodes: ["QUOTATIONS"] },
  {
    prefix: "/sales-orders/stock-verification",
    screenCodes: ["SALES_STOCK_VERIFICATION", "PICKINGS"],
  },
  { prefix: "/sales-orders", screenCodes: ["SALES_ORDERS"] },
  { prefix: "/delivery-orders", screenCodes: ["DELIVERY_ORDERS"] },
  {
    prefix: "/sales-invoices/pending",
    screenCodes: ["SALES_INVOICES_PENDING"],
  },
  { prefix: "/sales-invoices", screenCodes: ["SALES_INVOICES"] },
  { prefix: "/sales-tracking", screenCodes: ["SALES_TRACKING"] },

  // Lab / oil / maintenance
  { prefix: "/laboratory/samples", screenCodes: ["LAB_SAMPLES"] },
  { prefix: "/laboratory", screenCodes: ["LAB_SAMPLES"] },
  { prefix: "/oil-tank-farm/tanks", screenCodes: ["OIL_TANKS"] },
  { prefix: "/oil-tank-farm/receivings", screenCodes: ["OIL_RECEIVINGS"] },
  { prefix: "/oil-tank-farm/transfers", screenCodes: ["OIL_TRANSFERS"] },
  { prefix: "/oil-tank-farm/dispatches", screenCodes: ["OIL_DISPATCHES"] },
  { prefix: "/maintenance/equipment", screenCodes: ["EQUIPMENT"] },
  { prefix: "/maintenance/work-orders", screenCodes: ["WORK_ORDERS"] },
  { prefix: "/maintenance/pm-schedules", screenCodes: ["PM_SCHEDULES"] },

  // HRM / finance
  { prefix: "/hrm/attendance", screenCodes: ["HRM_ATTENDANCE"] },
  { prefix: "/hrm/overtime-requests", screenCodes: ["HRM_OVERTIME"] },
  { prefix: "/hrm/leave-requests", screenCodes: ["HRM_LEAVE"] },
  {
    prefix: "/purchase-payments/pending",
    screenCodes: ["PURCHASE_PAYMENTS_PENDING"],
  },
  { prefix: "/purchase-payments", screenCodes: ["PURCHASE_PAYMENTS"] },

  // Reports
  { prefix: "/reports/procurement", screenCodes: ["REPORTS_PROCUREMENT"] },
  { prefix: "/reports/receiving", screenCodes: ["REPORTS_RECEIVING"] },
  {
    prefix: "/reports/chemical-consumption",
    screenCodes: ["REPORTS_CHEMICAL_CONSUMPTION"],
  },
  { prefix: "/reports/ar-aging", screenCodes: ["REPORTS_AR_AGING"] },
  {
    prefix: "/reports/sales-invoices",
    screenCodes: ["REPORTS_SALES_INVOICES"],
  },
  {
    prefix: "/reports/sales-payments",
    screenCodes: ["REPORTS_SALES_PAYMENTS"],
  },
  { prefix: "/reports/inventory", screenCodes: ["REPORTS_INVENTORY"] },
  { prefix: "/reports/payments", screenCodes: ["REPORTS_PAYMENTS"] },

  // Settings / master
  { prefix: "/settings/permissions", screenCodes: ["PERMISSIONS"] },
  { prefix: "/settings/roles", screenCodes: ["ROLES"] },
  { prefix: "/settings/audit-logs", screenCodes: ["AUDIT_LOGS"] },
  { prefix: "/case", screenCodes: ["TEMP_CASES"] },
  // ลิงก์เก่าของแท็บลายเซ็น — ต้องไม่ผูก screenCode ไม่งั้น non-admin จะโดน
  // AccessDenied ก่อนที่ UserManagementPage จะได้ redirect ไป /profile
  { prefix: "/users", query: { tab: "signature" }, screenCodes: [] },
  { prefix: "/users", screenCodes: ["USERS", "ROLES", "PERMISSIONS"] },
  { prefix: "/masters/vendors", screenCodes: ["MASTERS_VENDORS"] },
  { prefix: "/masters/items", screenCodes: ["MASTERS_ITEMS"] },
  {
    prefix: "/masters/item-categories",
    screenCodes: ["MASTERS_ITEM_CATEGORIES"],
  },
  {
    prefix: "/masters/unit-conversions",
    screenCodes: ["MASTERS_UNIT_CONVERSIONS"],
  },
  { prefix: "/masters/units", screenCodes: ["MASTERS_UNITS"] },
  { prefix: "/warehouses", screenCodes: ["WAREHOUSES"] },
  { prefix: "/warehouse-locations", screenCodes: ["WAREHOUSE_LOCATIONS"] },
  {
    prefix: "/masters/payment-terms",
    screenCodes: ["MASTERS_PAYMENT_TERMS"],
  },
  { prefix: "/masters/tax-rates", screenCodes: ["MASTERS_TAX_RATES"] },
  {
    prefix: "/masters/purchase-request-types",
    screenCodes: ["MASTERS_PURCHASE_REQUEST_TYPES"],
  },
  { prefix: "/masters/seller-types", screenCodes: ["MASTERS_SELLER_TYPES"] },
  { prefix: "/masters/sellers", screenCodes: ["MASTERS_SELLERS"] },
  {
    prefix: "/masters/seller-bank-accounts",
    screenCodes: ["MASTERS_SELLER_BANK_ACCOUNTS"],
  },
  { prefix: "/masters/trucks", screenCodes: ["MASTERS_TRUCKS"] },
  {
    prefix: "/masters/tire-classifications",
    screenCodes: ["MASTERS_TIRE_CLASSIFICATIONS"],
  },
  {
    prefix: "/masters/raw-tire-price-rules",
    screenCodes: ["MASTERS_RAW_TIRE_PRICE_RULES"],
  },
  {
    prefix: "/masters/weighbridge-scales",
    screenCodes: ["MASTERS_WEIGHBRIDGE_SCALES"],
  },
];

const SORTED_RULES = [...SCREEN_ROUTE_RULES].sort(
  (a, b) => b.prefix.length - a.prefix.length,
);

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function queryMatches(
  searchParams: URLSearchParams | null,
  required?: Record<string, string>,
): boolean {
  if (!required) {
    return true;
  }
  if (!searchParams) {
    return false;
  }
  return Object.entries(required).every(
    ([key, value]) => searchParams.get(key) === value,
  );
}

/**
 * Resolve Permission Matrix screen codes for a frontend route.
 * Returns null when the path is not gated (e.g. `/`, `/user`, `/login`).
 */
export function resolveScreenCodesForPath(
  pathname: string,
  search?: string | URLSearchParams | null,
): string[] | null {
  if (pathname === "/sales-orders/stock-verification") {
    return ["SALES_STOCK_VERIFICATION", "PICKINGS"];
  }
  if (/^\/sales-orders\/[^/]+\/stock-verification$/.test(pathname)) {
    return ["SALES_STOCK_VERIFICATION", "PICKINGS"];
  }
  if (/^\/sales-orders\/[^/]+$/.test(pathname)) {
    return [
      "SALES_ORDERS",
      "SALES_STOCK_VERIFICATION",
      "PICKINGS",
      "PACKINGS",
      "DELIVERY_ORDERS",
    ];
  }
  if (/^\/goods-receipts\/create-from-po\/[^/]+$/.test(pathname)) {
    return ["GOODS_RECEIPTS"];
  }

  if (
    !pathname ||
    pathname === "/" ||
    pathname === "/user" ||
    pathname === "/profile"
  ) {
    return null;
  }

  const searchParams =
    typeof search === "string"
      ? new URLSearchParams(
          search.startsWith("?") ? search.slice(1) : search,
        )
      : search ?? null;

  // Prefer query-specific rules, then bare prefix (already length-sorted)
  for (const rule of SORTED_RULES) {
    if (!pathMatchesPrefix(pathname, rule.prefix)) {
      continue;
    }
    if (rule.query && !queryMatches(searchParams, rule.query)) {
      continue;
    }
    // Bare rule must not steal FG when FG query is present — skipped above when query mismatch
    if (!rule.query && searchParams) {
      const fgSibling = SORTED_RULES.find(
        (r) =>
          r.prefix === rule.prefix &&
          r.query?.itemCategoryCode === "FINISHED_GOODS",
      );
      if (
        fgSibling &&
        queryMatches(searchParams, fgSibling.query) &&
        rule.screenCodes[0] !== fgSibling.screenCodes[0]
      ) {
        continue;
      }
    }
    return rule.screenCodes;
  }

  return null;
}

/** First href the user can open for a list of screen codes (matrix). */
export const SCREEN_CODE_HUB_HREF: Record<string, string> = {
  EXECUTIVE_DASHBOARD: "/dashboard/executive",
  WAREHOUSE_DASHBOARD: "/inventory/dashboard",
  RAW_TIRE_DASHBOARD: "/receiving/dashboard",
  RECEIVING: "/receiving",
  FLOOR_SCALE_TICKETS: "/weighbridge/floor-scale-tickets",
  STOCK_POSTING_APPROVALS: "/warehouse/stock-posting-approvals",
  STOCK_BALANCES: "/inventory/stock-balances",
  FG_STOCK_BALANCES: "/inventory/stock-balances?itemCategoryCode=FINISHED_GOODS",
  INVENTORY_LOTS: "/inventory/lots",
  FG_INVENTORY_LOTS: "/inventory/lots?itemCategoryCode=FINISHED_GOODS",
  MATERIAL_ISSUES: "/inventory/material-issues",
  CHEMICAL_ISSUES: "/inventory/chemical-issues",
  TIRE_PREP_ISSUES: "/inventory/tire-prep-issues",
  INVENTORY_ISSUES: "/inventory/issues",
  STOCK_INQUIRY: "/inventory/stock-inquiry",
  STOCK_TRANSFERS: "/inventory/stock-transfers",
  STOCK_CONTROL: "/inventory/stock-control",
  STOCK_COUNTS: "/inventory/stock-counts",
  STOCK_ADJUSTMENTS: "/inventory/stock-adjustments",
  STOCK_MOVEMENTS: "/inventory/stock-movements",
  FG_STOCK_MOVEMENTS:
    "/inventory/stock-movements?itemCategoryCode=FINISHED_GOODS",
  GOODS_RECEIPTS: "/goods-receipts",
  WAREHOUSE_APPROVALS: "/warehouse/approvals",
  PRODUCTION_REQUESTS: "/production/production-requests",
  PRODUCTION_ORDERS: "/production/production-orders",
  PRODUCTION_OUTPUT_STOCK_REQUESTS:
    "/receiving/production-output/stock-requests",
  PENDING_PRODUCTION_OUTPUT: "/receiving/pending-production-output",
  PRODUCTION_OUTPUT_APPROVALS: "/warehouse/production-output-approvals",
  TIRE_PREP_STAGES: "/production/tire-prep-stages",
  RCB_PROCESSING: "/production/rcb-processing",
  PICKINGS: "/pickings",
  PACKINGS: "/packings",
  DISPATCH_ORDERS: "/dispatch-orders",
  PURCHASE_REQUESTS: "/purchase-requests",
  PURCHASE_REQUEST_APPROVALS: "/purchase-requests/approvals",
  PURCHASE_ORDERS: "/purchase-orders",
  PURCHASE_ORDER_APPROVALS: "/purchase-orders/approvals",
  PROCUREMENT_TRACKING: "/procurement/tracking",
  MASTERS_CUSTOMERS: "/customers",
  QUOTATIONS: "/quotations",
  SALES_ORDERS: "/sales-orders",
  SALES_STOCK_VERIFICATION: "/sales-orders/stock-verification",
  DELIVERY_ORDERS: "/delivery-orders",
  SALES_INVOICES: "/sales-invoices",
  SALES_INVOICES_PENDING: "/sales-invoices/pending",
  SALES_TRACKING: "/sales-tracking",
  LAB_SAMPLES: "/laboratory/samples",
  OIL_TANKS: "/oil-tank-farm/tanks",
  OIL_RECEIVINGS: "/oil-tank-farm/receivings",
  OIL_TRANSFERS: "/oil-tank-farm/transfers",
  OIL_DISPATCHES: "/oil-tank-farm/dispatches",
  EQUIPMENT: "/maintenance/equipment",
  WORK_ORDERS: "/maintenance/work-orders",
  PM_SCHEDULES: "/maintenance/pm-schedules",
  USERS: "/users",
  HRM_ATTENDANCE: "/hrm/attendance",
  HRM_OVERTIME: "/hrm/overtime-requests",
  HRM_LEAVE: "/hrm/leave-requests",
  PURCHASE_PAYMENTS_PENDING: "/purchase-payments/pending",
  PURCHASE_PAYMENTS: "/purchase-payments",
  REPORTS_PROCUREMENT: "/reports/procurement",
  REPORTS_RECEIVING: "/reports/receiving",
  REPORTS_CHEMICAL_CONSUMPTION: "/reports/chemical-consumption",
  REPORTS_AR_AGING: "/reports/ar-aging",
  REPORTS_SALES_INVOICES: "/reports/sales-invoices",
  REPORTS_SALES_PAYMENTS: "/reports/sales-payments",
  REPORTS_INVENTORY: "/reports/inventory",
  REPORTS_PAYMENTS: "/reports/payments",
  TEMP_CASES: "/case",
  ROLES: "/settings/roles",
  PERMISSIONS: "/settings/permissions",
  AUDIT_LOGS: "/settings/audit-logs",
  MASTERS_VENDORS: "/masters/vendors",
  MASTERS_ITEMS: "/masters/items",
  MASTERS_ITEM_CATEGORIES: "/masters/item-categories",
  MASTERS_UNITS: "/masters/units",
  MASTERS_UNIT_CONVERSIONS: "/masters/unit-conversions",
  WAREHOUSES: "/warehouses",
  WAREHOUSE_LOCATIONS: "/warehouse-locations",
  MASTERS_PAYMENT_TERMS: "/masters/payment-terms",
  MASTERS_TAX_RATES: "/masters/tax-rates",
  MASTERS_PURCHASE_REQUEST_TYPES: "/masters/purchase-request-types",
  MASTERS_SELLER_TYPES: "/masters/seller-types",
  MASTERS_SELLERS: "/masters/sellers",
  MASTERS_SELLER_BANK_ACCOUNTS: "/masters/seller-bank-accounts",
  MASTERS_TRUCKS: "/masters/trucks",
  MASTERS_TIRE_CLASSIFICATIONS: "/masters/tire-classifications",
  MASTERS_RAW_TIRE_PRICE_RULES: "/masters/raw-tire-price-rules",
  MASTERS_WEIGHBRIDGE_SCALES: "/masters/weighbridge-scales",
};
