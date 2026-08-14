"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "antd";
import { LogoutOutlined } from "@ant-design/icons";

import {
  getStoredUser,
  isAdministrator,
  userHasRole,
  type StoredUser,
} from "@/lib/auth/session";
import { clearAccessToken } from "@/lib/auth/token";
import {
  canAccessAnyScreen,
  canAccessScreen,
  isMatrixPermissionMode,
  PERMISSIONS_UPDATED_EVENT,
} from "@/lib/auth/permissions-access";
import {
  clearActivePortalModule,
  PORTAL_MODULE_LABEL,
  PORTAL_MODULE_UPDATED_EVENT,
  portalModuleAllowsMenuGroup,
  resolveActivePortalModule,
  type PortalMenuGroupId,
  type PortalModuleKey,
} from "@/lib/auth/portal-module";
import { RoleCode } from "@/lib/auth/role-codes";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";
import { usePendingProductionOutputStockRequestsCountQuery } from "@/hooks/production-output/useProductionOutputQueries";
import { usePendingPurchaseRequestApprovalsCountQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { usePendingStockPostingApprovalsCountQuery } from "@/hooks/stock-posting/useStockPostingQueries";

import styles from "./AppHeader.module.css";

function initialsFromUser(user: StoredUser | null) {
  const source = user?.displayName?.trim() || user?.username?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
// เพิ่ม/ลบเมนู (route) ในไฟล์นี้ทุกครั้ง ต้องอัปเดต Permission Matrix seed ด้วย:
// backend/src/security/permissions/permission-seed-data.ts (SCREEN_SEED_DEFINITIONS)

type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  roles?: string[];
  adminOnly?: boolean;
  /** ตรงกับ screenCode ใน Permission Matrix seed */
  screenCode?: string;
  /** ถ้าระบุ — แสดงเมนูเมื่อมีสิทธิ์ screen ใด screen หนึ่ง */
  screenCodes?: string[];
  /** path อื่นที่ควร highlight เมนูนี้เมื่ออยู่บนหน้านั้น (เช่น hub children) */
  matchHrefs?: string[];
};

const ROLE = {
  ADMINISTRATOR: "ADMINISTRATOR",
  EXECUTIVE: "EXECUTIVE",
  REQUESTER: "REQUESTER",
  PROCUREMENT_OFFICER: "PROCUREMENT_OFFICER",
  PROCUREMENT_MANAGER: "PROCUREMENT_MANAGER",
  WAREHOUSE_OFFICER: "WAREHOUSE_OFFICER",
  WAREHOUSE_MANAGER: "WAREHOUSE_MANAGER",
  WEIGHBRIDGE_OFFICER: "WEIGHBRIDGE_OFFICER",
  ACCOUNTING_OFFICER: "ACCOUNTING_OFFICER",
  SALES_OFFICER: "SALES_OFFICER",
  SALES_MANAGER: "SALES_MANAGER",
  PRODUCTION_OFFICER: "PRODUCTION_OFFICER",
} as const;

const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    aria-hidden
    className={open ? styles.chevronOpen : ""}
  >
    <path
      d="m8 10 4 4 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconEdgeChevron = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
    <path
      d="m14 6-6 6 6 6"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPurchaseOrder = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M7 3h10a2 2 0 0 1 2 2v16l-3-1.6-3 1.6-3-1.6-3 1.6V5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9 8h6M9 12h6M9 16h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconReport = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M8 13l2.5 2.5L14 11l2 2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 7.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M4 10.5h16M8.5 4v3.5M15.5 4v3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M8 14h3M8 17h8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconProcurementTracking = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4 20V10M11 20V4M18 20v-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M3 20h18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconPurchaseRequest = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9 8h6M9 12h6M9 16h3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconReceiving = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 9 12 13.2 19.5 9M12 20v-6.8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconMaster = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M5 5h6v6H5V5Zm8 0h6v6h-6V5ZM5 13h6v6H5v-6Zm8 0h6v6h-6v-6Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const IconVendor = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M15.5 10.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM4.5 20a7.5 7.5 0 0 1 15 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconSellerType = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M8 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM16 10.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM21 10.5a2.5 2.5 0 1 1-5 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M2.5 18.5a4.5 4.5 0 0 1 8 0M9.5 18.5a4.5 4.5 0 0 1 8 0M16 18.5a4.5 4.5 0 0 1 5.5 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconItem = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4.5 7.5 12 3.5l7.5 4v9L12 20.5l-7.5-4v-9Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M5 8 12 12l7-4M12 20.5V12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconUnit = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M5 5h14v14H5V5Zm4 4h6M9 13h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconWarehouse = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M3.5 21V9.5L12 4l8.5 5.5V21M7.5 21v-7h9v7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconWarehouseLocation = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M12 21s6-5.2 6-10.2A6 6 0 0 0 6 10.8C6 15.8 12 21 12 21Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="10.5"
      r="2.2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const IconPayment = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4.5 7h15A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7ZM3 11h18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconTax = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M6 4h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M14 4v4h4M8 13h5M8 17h3M15.5 12.5l-3 5M12.5 12.5h.01M15.5 17.5h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPrType = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M9 8h6M9 12h6M9 16h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconCategory = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4 7h7v7H4V7Zm9 0h7v7h-7V7ZM4 16h7v4H4v-4Zm9 0h7v4h-7v-4Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M16 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 16 11Zm-8 0a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 8 11Zm0 2.5c-2.7 0-5 1.4-5 3.2V19h10v-2.3c0-1.8-2.3-3.2-5-3.2Zm8 0c-.4 0-.8 0-1.2.1 1.3.8 2.2 2 2.2 3.1V19h6v-2.3c0-1.8-2.3-3.2-5-3.2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);
const IconMaterialIssue = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4 7.5 12 3.5l8 4v9l-8 4-8-4v-9Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M12 21v-9M4 7.5 12 12l8-4.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M15 15h5m0 0-2-2m2 2-2 2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconChemical = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M10 3h4M10 3v5.5L5.6 17a2 2 0 0 0 1.8 2.9h9.2a2 2 0 0 0 1.8-2.9L14 8.5V3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 15h8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconStockTransfer = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4 8h13M17 8l-3-3M17 8l-3 3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20 16H7M7 16l3-3M7 16l3 3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconStockCount = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <rect
      x="4.5"
      y="3.5"
      width="15"
      height="17"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M8 8.5h8M8 12h5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8 16l1.6 1.6L12.5 14.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconAuditLog = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M12 21a9 9 0 1 0-8-13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M4 3v5h5M12 8v5l3.5 2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const RAW_TIRE_ROLES = [
  ROLE.WEIGHBRIDGE_OFFICER,
  ROLE.WAREHOUSE_MANAGER,
  ROLE.ACCOUNTING_OFFICER,
  ROLE.EXECUTIVE,
  ROLE.PROCUREMENT_MANAGER,
] as const;

const dashboardMenus: MenuItem[] = [
  {
    key: "executive-dashboard",
    screenCode: "EXECUTIVE_DASHBOARD",
    label: "ภาพรวมผู้บริหาร",
    href: "/dashboard/executive",
    icon: <IconReport />,
    roles: [ROLE.EXECUTIVE, ROLE.ADMINISTRATOR, ROLE.ACCOUNTING_OFFICER],
  },
  {
    key: "warehouse-dashboard",
    screenCode: "WAREHOUSE_DASHBOARD",
    label: "ภาพรวมคลังสินค้า",
    href: "/inventory/dashboard",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "raw-tire-dashboard",
    screenCode: "RAW_TIRE_DASHBOARD",
    label: "ภาพรวมรับซื้อยาง",
    href: "/receiving/dashboard",
    icon: <IconReceiving />,
    roles: [...RAW_TIRE_ROLES],
  },
];

const rawTireMenus: MenuItem[] = [
  {
    key: "receiving",
    screenCode: "RECEIVING",
    label: "ตั๋วชั่งรับซื้อยาง",
    href: "/receiving",
    icon: <IconReceiving />,
    roles: [...RAW_TIRE_ROLES],
  },
  {
    key: "floor-scale-tickets",
    screenCode: "FLOOR_SCALE_TICKETS",
    label: "ชั่งน้ำหนัก Floor Scale",
    href: "/weighbridge/floor-scale-tickets",
    icon: <IconReceiving />,
    roles: [...RAW_TIRE_ROLES],
  },
  {
    key: "stock-posting-approvals",
    screenCode: "STOCK_POSTING_APPROVALS",
    label: "อนุมัติรับยางเข้าคลัง",
    href: "/warehouse/stock-posting-approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
];

const rawMaterialWarehouseMenus: MenuItem[] = [
  {
    key: "rm-stock-balances",
    screenCode: "STOCK_BALANCES",
    label: "ยอดคงเหลือวัตถุดิบ",
    href: "/inventory/stock-balances",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "rm-lots",
    screenCode: "INVENTORY_LOTS",
    label: "Lot วัตถุดิบ",
    href: "/inventory/lots",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "rm-material-issues",
    screenCode: "MATERIAL_ISSUES",
    label: "เบิกวัตถุดิบจากคลัง",
    href: "/inventory/material-issues",
    icon: <IconMaterialIssue />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "chemical-issues",
    screenCode: "CHEMICAL_ISSUES",
    label: "เบิกจ่ายสารเคมี",
    href: "/inventory/chemical-issues",
    icon: <IconChemical />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "tire-prep-issues",
    screenCode: "TIRE_PREP_ISSUES",
    label: "เบิกยางเข้ากระบวนการเตรียมยาง",
    href: "/inventory/tire-prep-issues",
    icon: <IconMaterialIssue />,
    roles: [
      ROLE.PRODUCTION_OFFICER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
    ],
  },
  {
    key: "inventory-issues",
    screenCode: "INVENTORY_ISSUES",
    label: "เบิกจ่ายสินค้า",
    href: "/inventory/issues",
    icon: <IconMaterialIssue />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "stock-inquiry",
    screenCode: "STOCK_INQUIRY",
    label: "ตรวจสอบสต๊อก",
    href: "/inventory/stock-inquiry",
    icon: <IconStockCount />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "rm-stock-transfers",
    screenCode: "STOCK_TRANSFERS",
    label: "โอนย้ายวัตถุดิบ",
    href: "/inventory/stock-transfers",
    icon: <IconStockTransfer />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "rm-stock-control",
    screenCode: "STOCK_CONTROL",
    label: "นับและปรับปรุงสต๊อกวัตถุดิบ",
    href: "/inventory/stock-control",
    icon: <IconStockCount />,
    matchHrefs: [
      "/inventory/stock-control",
      "/inventory/stock-counts",
      "/inventory/stock-adjustments",
    ],
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "rm-stock-movements",
    screenCode: "STOCK_MOVEMENTS",
    label: "ความเคลื่อนไหววัตถุดิบ",
    href: "/inventory/stock-movements",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "goods-receipts",
    screenCode: "GOODS_RECEIPTS",
    label: "รับสินค้าเข้าคลัง (PO)",
    href: "/goods-receipts",
    icon: <IconReceiving />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
];

const productionMenus: MenuItem[] = [
  {
    key: "production-orders",
    screenCode: "PRODUCTION_ORDERS",
    label: "ใบสั่งผลิต (Pyrolysis)",
    href: "/production/production-orders",
    icon: <IconWarehouse />,
    roles: [
      ROLE.PRODUCTION_OFFICER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "production-output-stock-requests",
    screenCode: "PRODUCTION_OUTPUT_STOCK_REQUESTS",
    label: "ขอรับผลผลิตเข้าคลัง",
    href: "/receiving/production-output/stock-requests",
    icon: <IconReceiving />,
    matchHrefs: [
      "/receiving/production-output/stock-requests",
      "/receiving/production-output/stock-requests/create",
    ],
    roles: [
      ROLE.PRODUCTION_OFFICER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "pending-production-output",
    screenCode: "PENDING_PRODUCTION_OUTPUT",
    label: "รับผลผลิตเข้าคลัง (อ้างอิง)",
    href: "/receiving/pending-production-output",
    icon: <IconReceiving />,
    roles: [
      ROLE.PRODUCTION_OFFICER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "tire-prep-stages",
    screenCode: "TIRE_PREP_STAGES",
    label: "ขั้นตอนเตรียมยาง",
    href: "/production/tire-prep-stages",
    icon: <IconWarehouse />,
    roles: [ROLE.PRODUCTION_OFFICER, ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "rcb-processing",
    screenCode: "RCB_PROCESSING",
    label: "กระบวนการผลิต rCB",
    href: "/production/rcb-processing",
    icon: <IconWarehouse />,
    roles: [ROLE.PRODUCTION_OFFICER, ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
];

const finishedGoodsWarehouseMenus: MenuItem[] = [
  {
    key: "warehouse-approvals",
    screenCode: "WAREHOUSE_APPROVALS",
    label: "อนุมัติงานคลัง",
    href: "/warehouse/approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "production-output-approvals",
    screenCode: "PRODUCTION_OUTPUT_APPROVALS",
    label: "อนุมัติรับผลผลิตเข้าคลัง",
    href: "/warehouse/production-output-approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "fg-stock-balances",
    screenCode: "FG_STOCK_BALANCES",
    label: "ยอดคงเหลือ FG",
    href: "/inventory/stock-balances?itemCategoryCode=FINISHED_GOODS",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "fg-lots",
    screenCode: "FG_INVENTORY_LOTS",
    label: "Lot สินค้าสำเร็จรูป",
    href: "/inventory/lots?itemCategoryCode=FINISHED_GOODS",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "pickings",
    screenCode: "PICKINGS",
    label: "ใบจ่ายสินค้า / Picking",
    href: "/pickings",
    icon: <IconMaterialIssue />,
    roles: [
      ROLE.SALES_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "packings",
    screenCode: "PACKINGS",
    label: "ใบบรรจุสินค้า / Packing",
    href: "/packings",
    icon: <IconWarehouse />,
    roles: [
      ROLE.SALES_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "fg-stock-movements",
    screenCode: "FG_STOCK_MOVEMENTS",
    label: "ความเคลื่อนไหว FG",
    href: "/inventory/stock-movements?itemCategoryCode=FINISHED_GOODS",
    icon: <IconWarehouse />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
];

const purchaseMenus: MenuItem[] = [
  {
    key: "purchase-requests",
    screenCode: "PURCHASE_REQUESTS",
    label: "ใบขอซื้อ PR",
    href: "/purchase-requests",
    icon: <IconPurchaseRequest />,
    roles: [
      ROLE.REQUESTER,
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "purchase-request-approvals",
    screenCode: "PURCHASE_REQUEST_APPROVALS",
    label: "อนุมัติใบขอซื้อ",
    href: "/purchase-requests/approvals",
    icon: <IconPrType />,
    roles: [ROLE.PROCUREMENT_MANAGER],
  },
  {
    key: "purchase-orders",
    screenCode: "PURCHASE_ORDERS",
    label: "ใบสั่งซื้อ PO",
    href: "/purchase-orders",
    icon: <IconPurchaseOrder />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "purchase-orders-receive",
    screenCode: "PURCHASE_ORDERS_RECEIVE",
    label: "รับของ (PO)",
    href: "/purchase-orders/receive",
    icon: <IconPurchaseOrder />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
    ],
  },
  {
    key: "procurement-tracking",
    screenCode: "PROCUREMENT_TRACKING",
    label: "ติดตามจัดซื้อ",
    href: "/procurement/tracking",
    icon: <IconProcurementTracking />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
];

// เรียงตาม Flow การขาย: ลูกค้า → ใบเสนอราคา → ใบสั่งขาย → ตรวจสอบสต๊อก → Delivery → แจ้งหนี้
// Picking/Packing ย้ายไปหมวดคลัง FG
const salesMenus: MenuItem[] = [
  {
    key: "sd-customers",
    screenCode: "MASTERS_CUSTOMERS",
    label: "ข้อมูลลูกค้า",
    href: "/customers",
    icon: <IconVendor />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.EXECUTIVE,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "quotations",
    screenCode: "QUOTATIONS",
    label: "ใบเสนอราคา",
    href: "/quotations",
    icon: <IconPurchaseOrder />,
    roles: [ROLE.SALES_OFFICER, ROLE.SALES_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "sales-orders",
    screenCode: "SALES_ORDERS",
    label: "ใบสั่งขาย",
    href: "/sales-orders",
    icon: <IconPurchaseOrder />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.EXECUTIVE,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "sd-stock-verification",
    screenCode: "SALES_STOCK_VERIFICATION",
    label: "ตรวจสอบสต๊อกขาย",
    href: "/sales-orders/stock-verification",
    icon: <IconStockCount />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "delivery-orders",
    screenCode: "DELIVERY_ORDERS",
    label: "ใบส่งสินค้า",
    href: "/delivery-orders",
    icon: <IconStockTransfer />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "sales-invoices-pending",
    screenCode: "SALES_INVOICES_PENDING",
    label: "รอออกใบแจ้งหนี้",
    href: "/sales-invoices/pending",
    icon: <IconPayment />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "sales-invoices",
    screenCode: "SALES_INVOICES",
    label: "ใบแจ้งหนี้ขาย",
    href: "/sales-invoices",
    icon: <IconPayment />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "sales-tracking",
    screenCode: "SALES_TRACKING",
    label: "ติดตามการขายและจัดส่ง",
    href: "/sales-tracking",
    icon: <IconProcurementTracking />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.EXECUTIVE,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
];

const laboratoryMenus: MenuItem[] = [
  {
    key: "lab-samples",
    screenCode: "LAB_SAMPLES",
    label: "ตัวอย่างตรวจสอบ (LIMS)",
    href: "/laboratory/samples",
    icon: <IconChemical />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
];

const OIL_TANK_ROLES = [
  ROLE.PRODUCTION_OFFICER,
  ROLE.WAREHOUSE_OFFICER,
  ROLE.WAREHOUSE_MANAGER,
  ROLE.EXECUTIVE,
] as const;

const oilTankFarmMenus: MenuItem[] = [
  {
    key: "oil-tanks",
    screenCode: "OIL_TANKS",
    label: "จัดการถังเก็บน้ำมัน",
    href: "/oil-tank-farm/tanks",
    icon: <IconChemical />,
    roles: [...OIL_TANK_ROLES],
  },
  {
    key: "oil-receivings",
    screenCode: "OIL_RECEIVINGS",
    label: "รับน้ำมันเข้าถัง",
    href: "/oil-tank-farm/receivings",
    icon: <IconReceiving />,
    roles: [...OIL_TANK_ROLES],
  },
  {
    key: "oil-transfers",
    screenCode: "OIL_TRANSFERS",
    label: "โอนย้ายน้ำมันระหว่างถัง",
    href: "/oil-tank-farm/transfers",
    icon: <IconStockTransfer />,
    roles: [...OIL_TANK_ROLES],
  },
  {
    key: "oil-dispatches",
    screenCode: "OIL_DISPATCHES",
    label: "จ่ายน้ำมันออกจากถัง",
    href: "/oil-tank-farm/dispatches",
    icon: <IconMaterialIssue />,
    roles: [...OIL_TANK_ROLES],
  },
];

const MAINTENANCE_ROLES = [
  ROLE.WAREHOUSE_OFFICER,
  ROLE.WAREHOUSE_MANAGER,
  ROLE.PRODUCTION_OFFICER,
  ROLE.EXECUTIVE,
] as const;

const maintenanceMenus: MenuItem[] = [
  {
    key: "maintenance-equipment",
    screenCode: "EQUIPMENT",
    label: "อุปกรณ์/เครื่องจักร",
    href: "/maintenance/equipment",
    icon: <IconWarehouse />,
    roles: [...MAINTENANCE_ROLES],
  },
  {
    key: "maintenance-work-orders",
    screenCode: "WORK_ORDERS",
    label: "ใบสั่งงานซ่อมบำรุง",
    href: "/maintenance/work-orders",
    icon: <IconPurchaseOrder />,
    roles: [...MAINTENANCE_ROLES],
  },
  {
    key: "maintenance-pm-schedules",
    screenCode: "PM_SCHEDULES",
    label: "แผนบำรุงรักษา (PM)",
    href: "/maintenance/pm-schedules",
    icon: <IconReport />,
    roles: [...MAINTENANCE_ROLES],
  },
];

const HRM_ROLES = [ROLE.ADMINISTRATOR, ROLE.EXECUTIVE] as const;

const hrmMenus: MenuItem[] = [
  {
    key: "hrm-personnel",
    screenCode: "USERS",
    label: "บุคคล / ผู้ใช้งาน",
    href: "/users",
    icon: <IconUsers />,
    roles: [...HRM_ROLES],
  },
  {
    key: "hrm-shifts",
    screenCode: "HRM_SHIFT",
    label: "ตารางกะการทำงาน",
    href: "/hrm/shifts",
    icon: <IconCalendar />,
    roles: [...HRM_ROLES],
  },
  {
    key: "hrm-shift-assignments",
    screenCode: "HRM_SHIFT_ASSIGNMENT",
    label: "รายการเข้ากะ",
    href: "/hrm/shift-assignments",
    icon: <IconUsers />,
    roles: [...HRM_ROLES],
  },
  {
    key: "hrm-attendance",
    screenCode: "HRM_ATTENDANCE",
    label: "บันทึกเวลาเข้า-ออกงาน",
    href: "/hrm/attendance",
    icon: <IconReport />,
    roles: [...HRM_ROLES],
  },
  {
    key: "hrm-overtime",
    screenCode: "HRM_OVERTIME",
    label: "คำขอทำงานล่วงเวลา (OT)",
    href: "/hrm/overtime-requests",
    icon: <IconPurchaseRequest />,
    roles: [...HRM_ROLES],
  },
  {
    key: "hrm-leave",
    screenCode: "HRM_LEAVE",
    label: "คำขอลางาน",
    href: "/hrm/leave-requests",
    icon: <IconPrType />,
    roles: [...HRM_ROLES],
  },
];

const financeMenus: MenuItem[] = [
  {
    key: "purchase-payments-pending",
    screenCode: "PURCHASE_PAYMENTS_PENDING",
    label: "รอจ่ายเงิน Supplier",
    href: "/purchase-payments/pending",
    icon: <IconPayment />,
    roles: [ROLE.ACCOUNTING_OFFICER],
  },
  {
    key: "purchase-payments",
    screenCode: "PURCHASE_PAYMENTS",
    label: "ประวัติการจ่ายเงิน",
    href: "/purchase-payments",
    icon: <IconPayment />,
    roles: [
      ROLE.ACCOUNTING_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
];

const reportMenus: MenuItem[] = [
  {
    key: "reports-procurement",
    screenCode: "REPORTS_PROCUREMENT",
    label: "รายงานจัดซื้อ",
    href: "/reports/procurement",
    icon: <IconReport />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "reports-receiving",
    screenCode: "REPORTS_RECEIVING",
    label: "รายงานรับซื้อยาง",
    href: "/reports/receiving",
    icon: <IconReport />,
    roles: [
      ROLE.WEIGHBRIDGE_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "reports-chemical-consumption",
    screenCode: "REPORTS_CHEMICAL_CONSUMPTION",
    label: "รายงานการใช้สารเคมี",
    href: "/reports/chemical-consumption",
    icon: <IconReport />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "reports-ar-aging",
    screenCode: "REPORTS_AR_AGING",
    label: "รายงานลูกหนี้คงค้าง",
    href: "/reports/ar-aging",
    icon: <IconReport />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "reports-sales-invoices",
    screenCode: "REPORTS_SALES_INVOICES",
    label: "รายงานใบแจ้งหนี้",
    href: "/reports/sales-invoices",
    icon: <IconReport />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "reports-sales-payments",
    screenCode: "REPORTS_SALES_PAYMENTS",
    label: "รายงานรับชำระเงิน",
    href: "/reports/sales-payments",
    icon: <IconReport />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "reports-inventory",
    screenCode: "REPORTS_INVENTORY",
    label: "รายงานคลัง",
    href: "/reports/inventory",
    icon: <IconReport />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "reports-payments",
    screenCode: "REPORTS_PAYMENTS",
    label: "รายงานจ่ายเงิน",
    href: "/reports/payments",
    icon: <IconReport />,
    roles: [
      ROLE.ACCOUNTING_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.EXECUTIVE,
    ],
  },
];


const settingMenus: MenuItem[] = [
  {
    key: "temp-cases",
    screenCode: "TEMP_CASES",
    label: "Case / Issue",
    href: "/case",
    icon: <IconReport />,
    roles: [ROLE.ADMINISTRATOR],
  },
  {
    key: "roles",
    screenCode: "ROLES",
    label: "Roles",
    href: "/settings/roles",
    icon: <IconUsers />,
    adminOnly: true,
  },
  {
    key: "audit-logs",
    screenCode: "AUDIT_LOGS",
    label: "Audit Log",
    href: "/settings/audit-logs",
    icon: <IconAuditLog />,
    adminOnly: true,
  },
];

const masterMenus: MenuItem[] = [
  {
    key: "customers",
    screenCode: "MASTERS_CUSTOMERS",
    label: "ลูกค้า",
    href: "/customers",
    icon: <IconVendor />,
    roles: [
      ROLE.SALES_OFFICER,
      ROLE.SALES_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "vendors",
    screenCode: "MASTERS_VENDORS",
    label: "เจ้าหนี้ / Supplier",
    href: "/masters/vendors",
    icon: <IconVendor />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "items",
    screenCode: "MASTERS_ITEMS",
    label: "สินค้า / วัตถุดิบ",
    href: "/masters/items",
    icon: <IconItem />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
    ],
  },
  {
    key: "item-categories",
    screenCode: "MASTERS_ITEM_CATEGORIES",
    label: "หมวดหมู่สินค้า",
    href: "/masters/item-categories",
    icon: <IconCategory />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
    ],
  },
  {
    key: "units",
    screenCode: "MASTERS_UNITS",
    label: "หน่วยนับ",
    href: "/masters/units",
    icon: <IconUnit />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
    ],
  },
  {
    key: "warehouses",
    screenCode: "WAREHOUSES",
    label: "คลังสินค้า",
    href: "/warehouses",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "warehouse-locations",
    screenCode: "WAREHOUSE_LOCATIONS",
    label: "ตำแหน่งจัดเก็บ",
    href: "/warehouse-locations",
    icon: <IconWarehouseLocation />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "payment-terms",
    screenCode: "MASTERS_PAYMENT_TERMS",
    label: "เงื่อนไขชำระเงิน",
    href: "/masters/payment-terms",
    icon: <IconPayment />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "tax-rates",
    screenCode: "MASTERS_TAX_RATES",
    label: "ภาษีซื้อ / VAT",
    href: "/masters/tax-rates",
    icon: <IconTax />,
    roles: [
      ROLE.PROCUREMENT_OFFICER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
    ],
  },
  {
    key: "purchase-request-types",
    screenCode: "MASTERS_PURCHASE_REQUEST_TYPES",
    label: "ประเภทใบขอซื้อ",
    href: "/masters/purchase-request-types",
    icon: <IconPrType />,
    roles: [ROLE.PROCUREMENT_MANAGER],
  },
  {
    key: "seller-types",
    screenCode: "MASTERS_SELLER_TYPES",
    label: "ประเภทผู้ขายยาง",
    href: "/masters/seller-types",
    icon: <IconSellerType />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "sellers",
    screenCode: "MASTERS_SELLERS",
    label: "ผู้ขายยาง",
    href: "/masters/sellers",
    icon: <IconVendor />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "seller-bank-accounts",
    screenCode: "MASTERS_SELLER_BANK_ACCOUNTS",
    label: "บัญชีธนาคารผู้ขายยาง",
    href: "/masters/seller-bank-accounts",
    icon: <IconPayment />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER, ROLE.ACCOUNTING_OFFICER],
  },
  {
    key: "trucks",
    screenCode: "MASTERS_TRUCKS",
    label: "รถบรรทุก",
    href: "/masters/trucks",
    icon: <IconReceiving />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "tire-classifications",
    screenCode: "MASTERS_TIRE_CLASSIFICATIONS",
    label: "ประเภท/กลุ่มยาง",
    href: "/masters/tire-classifications",
    icon: <IconCategory />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "raw-tire-price-rules",
    screenCode: "MASTERS_RAW_TIRE_PRICE_RULES",
    label: "กฎราคาซื้อยาง",
    href: "/masters/raw-tire-price-rules",
    icon: <IconTax />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "weighbridge-scales",
    screenCode: "MASTERS_WEIGHBRIDGE_SCALES",
    label: "เครื่องชั่ง",
    href: "/masters/weighbridge-scales",
    icon: <IconReceiving />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
];

const ALL_MENU_ITEMS = [
  ...rawTireMenus,
  ...rawMaterialWarehouseMenus,
  ...productionMenus,
  ...finishedGoodsWarehouseMenus,
  ...purchaseMenus,
  ...salesMenus,
  ...laboratoryMenus,
  ...financeMenus,
  ...reportMenus,
  ...settingMenus,
  ...masterMenus,
];

function hrefPathname(href: string) {
  return href.split("?")[0];
}

function matchesHref(pathname: string, href: string) {
  const path = hrefPathname(href);
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** เลือกเมนูที่ตรงที่สุด (match path ยาวที่สุด) รวม matchHrefs ของ hub */
function resolveActiveMenuHref(pathname: string): string | null {
  let best: { href: string; matchLen: number } | null = null;

  for (const item of ALL_MENU_ITEMS) {
    const candidates =
      item.matchHrefs && item.matchHrefs.length > 0
        ? item.matchHrefs
        : [hrefPathname(item.href)];

    for (const candidate of candidates) {
      if (!matchesHref(pathname, candidate)) continue;
      if (!best || candidate.length > best.matchLen) {
        best = { href: item.href, matchLen: candidate.length };
      }
    }
  }

  return best?.href ?? null;
}

function isReceivingStageMenu(item: MenuItem) {
  return item.href.startsWith("/receiving?");
}

function isItemCategoryCodeMenu(item: MenuItem) {
  return item.href.includes("itemCategoryCode=");
}

function isActive(
  item: MenuItem,
  pathname: string,
  searchParams?: URLSearchParams,
) {
  if (isReceivingStageMenu(item)) {
    if (pathname !== "/receiving") {
      return false;
    }
    const stage = new URLSearchParams(item.href.split("?")[1]).get("stage");
    return searchParams?.get("stage") === stage;
  }

  if (isItemCategoryCodeMenu(item)) {
    const path = hrefPathname(item.href);
    if (!matchesHref(pathname, path)) {
      return false;
    }
    const expected = new URLSearchParams(item.href.split("?")[1]).get(
      "itemCategoryCode",
    );
    return searchParams?.get("itemCategoryCode") === expected;
  }

  if (item.href === "/receiving") {
    if (pathname === "/receiving") {
      const stage = searchParams?.get("stage");
      return !stage || stage === "all";
    }
    // ticket / classification / receipt detail under receiving — but not production-output
    if (
      pathname.startsWith("/receiving/") &&
      !pathname.startsWith("/receiving/production-output") &&
      !pathname.startsWith("/receiving/pending-production-output")
    ) {
      return resolveActiveMenuHref(pathname) === item.href;
    }
    return false;
  }

  return resolveActiveMenuHref(pathname) === item.href;
}

function isMasterActive(pathname: string) {
  return (
    pathname === "/masters" ||
    pathname.startsWith("/masters/") ||
    pathname === "/warehouses" ||
    pathname.startsWith("/warehouses/") ||
    pathname === "/warehouse-locations" ||
    pathname.startsWith("/warehouse-locations/")
  );
}

function canSeeMenu(item: MenuItem) {
  if (isAdministrator()) return true;

  // Permission Matrix drives menu when role has any role_permissions rows
  if (isMatrixPermissionMode()) {
    if (item.screenCodes?.length) {
      return canAccessAnyScreen(item.screenCodes);
    }
    if (item.screenCode) {
      return canAccessScreen(item.screenCode);
    }
    return false;
  }

  // Legacy only: admin-only screens stay admin-gated
  if (item.adminOnly) return false;

  // Legacy: hardcode roles (roles ว่าง = ซ่อน — ไม่เปิด Case ให้ทุกคนอีก)
  if (!item.roles || item.roles.length === 0) {
    return false;
  }

  return item.roles.some((role) =>
    userHasRole(role as (typeof RoleCode)[keyof typeof RoleCode]),
  );
}

function filterMenus(items: MenuItem[]) {
  return items.filter((item) => {
    if (
      !PRODUCTION_OUTPUT_ENABLED &&
      (item.key === "production-output-stock-requests" ||
        item.key === "production-output-approvals")
    ) {
      return false;
    }
    return canSeeMenu(item);
  });
}

function renderMenuButton(
  item: MenuItem,
  pathname: string,
  collapsed: boolean,
  handleGo: (href: string) => void,
  searchParams?: URLSearchParams,
  badgeCount?: number,
) {
  const active = isActive(item, pathname, searchParams);
  const count =
    typeof badgeCount === "number" && badgeCount > 0 ? badgeCount : 0;

  return (
    <button
      key={item.key}
      type="button"
      title={collapsed ? item.label : undefined}
      className={`${styles.menuItem} ${active ? styles.menuItemActive : ""}`}
      onClick={() => handleGo(item.href)}
    >
      <span className={styles.menuItemIcon}>{item.icon}</span>
      <span className={styles.menuItemText}>{item.label}</span>
      {count > 0 ? (
        <Badge
          count={count}
          overflowCount={99}
          size="small"
          className={styles.menuBadge}
        />
      ) : null}
    </button>
  );
}

type AppHeaderProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export default function AppHeader({
  collapsed,
  onCollapsedChange,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [masterOpen, setMasterOpen] = useState(isMasterActive(pathname));
  const [user, setUser] = useState<StoredUser | null>(null);
  // Re-read matrix on navigation so menu matches latest /permissions/me
  const [permissionsTick, setPermissionsTick] = useState(0);
  const [portalTick, setPortalTick] = useState(0);
  /** กดลูกศรค้างเปิด — ถ้าแค่ hover จะย่อกลับเมื่อเมาส์ออก */
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  };

  useEffect(() => () => clearCollapseTimer(), []);

  useEffect(() => {
    if (collapsed) {
      setPinnedOpen(false);
    }
  }, [collapsed]);

  const expandSidebar = (pin: boolean) => {
    clearCollapseTimer();
    if (pin) {
      setPinnedOpen(true);
    }
    if (collapsed) {
      onCollapsedChange(false);
    }
  };

  const collapseSidebar = () => {
    clearCollapseTimer();
    setPinnedOpen(false);
    if (!collapsed) {
      onCollapsedChange(true);
    }
  };

  const scheduleHoverCollapse = () => {
    if (pinnedOpen) {
      return;
    }
    clearCollapseTimer();
    collapseTimerRef.current = setTimeout(() => {
      onCollapsedChange(true);
    }, 180);
  };

  useEffect(() => {
    setUser(getStoredUser());
    setPermissionsTick((n) => n + 1);
    if (pathname === "/") {
      clearActivePortalModule();
    }
  }, [pathname]);

  useEffect(() => {
    const onPermissionsUpdated = () => {
      setUser(getStoredUser());
      setPermissionsTick((n) => n + 1);
    };
    const onPortalModuleUpdated = () => {
      setPortalTick((n) => n + 1);
    };
    window.addEventListener(PERMISSIONS_UPDATED_EVENT, onPermissionsUpdated);
    window.addEventListener(PORTAL_MODULE_UPDATED_EVENT, onPortalModuleUpdated);
    return () => {
      window.removeEventListener(
        PERMISSIONS_UPDATED_EVENT,
        onPermissionsUpdated,
      );
      window.removeEventListener(
        PORTAL_MODULE_UPDATED_EVENT,
        onPortalModuleUpdated,
      );
    };
  }, []);

  const avatarLabel = useMemo(() => initialsFromUser(user), [user]);
  const roleLabel =
    user?.roles?.[0]?.roleName ?? user?.roles?.[0]?.roleCode ?? "ERP";

  const handleLogout = () => {
    clearActivePortalModule();
    clearAccessToken();
    window.location.replace("/login");
  };

  // permissionsTick / portalTick force re-filter after AuthGuard / portal tile
  void permissionsTick;
  void portalTick;
  const activePortalModule: PortalModuleKey | null =
    resolveActivePortalModule(pathname);
  const showMenuGroup = (groupId: PortalMenuGroupId) =>
    portalModuleAllowsMenuGroup(activePortalModule, groupId);

  const visibleDashboardMenus = filterMenus(dashboardMenus);
  const visibleRawTireMenus = filterMenus(rawTireMenus);
  const visibleRawMaterialWarehouseMenus = filterMenus(
    rawMaterialWarehouseMenus,
  );
  const visibleProductionMenus = filterMenus(productionMenus);
  const visibleFinishedGoodsWarehouseMenus = filterMenus(
    finishedGoodsWarehouseMenus,
  );
  const visiblePurchaseMenus = filterMenus(purchaseMenus);
  const pendingPrApprovalsCountQuery =
    usePendingPurchaseRequestApprovalsCountQuery();
  const pendingPrApprovalsCount = pendingPrApprovalsCountQuery.data ?? 0;
  const pendingStockPostingApprovalsCountQuery =
    usePendingStockPostingApprovalsCountQuery();
  const pendingStockPostingApprovalsCount =
    pendingStockPostingApprovalsCountQuery.data ?? 0;
  const pendingProductionOutputStockRequestsCountQuery =
    usePendingProductionOutputStockRequestsCountQuery({
      enabled: PRODUCTION_OUTPUT_ENABLED,
    });
  const pendingProductionOutputStockRequestsCount =
    pendingProductionOutputStockRequestsCountQuery.data ?? 0;
  const visibleSalesMenus = filterMenus(salesMenus);
  const visibleLaboratoryMenus = filterMenus(laboratoryMenus);
  const visibleOilTankFarmMenus = filterMenus(oilTankFarmMenus);
  const visibleMaintenanceMenus = filterMenus(maintenanceMenus);
  const visibleHrmMenus = filterMenus(hrmMenus);
  const visibleFinanceMenus = filterMenus(financeMenus);
  const visibleReportMenus = filterMenus(reportMenus);
  const visibleSettingMenus = filterMenus(settingMenus);
  const visibleMasterMenus = filterMenus(masterMenus);

  const handleGo = (href: string) => {
    router.push(href);
  };

  const handleBackToPortal = () => {
    clearActivePortalModule();
    router.push("/");
  };

  const handleToggleMaster = () => {
    if (collapsed) {
      expandSidebar(true);
      setMasterOpen(true);
      return;
    }

    setMasterOpen((prev) => !prev);
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
        }`}
      onMouseEnter={() => expandSidebar(false)}
      onMouseLeave={scheduleHoverCollapse}
    >
      <button
        type="button"
        className={styles.edgeToggle}
        onMouseEnter={() => expandSidebar(false)}
        onClick={() => {
          if (collapsed) {
            expandSidebar(true);
          } else if (pinnedOpen) {
            collapseSidebar();
          } else {
            setPinnedOpen(true);
          }
        }}
        aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        title={
          collapsed
            ? "ชี้เมนูเพื่อขยาย · กดลูกศรเพื่อปักหมุดเปิดค้าง"
            : pinnedOpen
              ? "กดลูกศรเพื่อย่อเมนู"
              : "กดลูกศรเพื่อปักหมุดเปิดค้าง · ย่อเมื่อเมาส์ออก"
        }
      >
        <span
          className={`${styles.edgeToggleIcon} ${collapsed ? styles.edgeToggleIconCollapsed : ""
            }`}
        >
          <IconEdgeChevron />
        </span>
      </button>

      <div className={styles.sidebarInner}>
        <div className={styles.sidebarTop}>
          <button
            type="button"
            className={styles.logoBlock}
            onClick={handleBackToPortal}
            title="กลับหน้าแรก / เลือกโมดูล"
            aria-label="กลับหน้าแรก"
          >
            <img
              src="/smt-energy-logo.png"
              alt="SMT Energy"
              className={styles.logoImage}
            />
          </button>
        </div>

        <div className={styles.navScroll}>
          {activePortalModule ? (
            <div className={styles.portalContext}>
              <span className={styles.portalContextLabel}>
                {PORTAL_MODULE_LABEL[activePortalModule]}
              </span>
              <button
                type="button"
                className={styles.portalBackButton}
                onClick={handleBackToPortal}
                title="กลับหน้าแรกเพื่อเลือกโมดูลอื่น"
              >
                เปลี่ยนโมดูล
              </button>
            </div>
          ) : pathname === "/" ? (
            <div className={styles.portalHint}>
              เลือกโมดูลจากหน้าแรกเพื่อเปิดเมนู
            </div>
          ) : (
            <div className={styles.portalHint}>
              <button
                type="button"
                className={styles.portalBackButton}
                onClick={handleBackToPortal}
              >
                กลับหน้าแรก
              </button>
            </div>
          )}

          {showMenuGroup("dashboard") && visibleDashboardMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>แดชบอร์ด</div>

              <div className={styles.groupItems}>
                {visibleDashboardMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("raw-tire") && visibleRawTireMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>รับซื้อยาง</div>

              <div className={styles.groupItems}>
                {visibleRawTireMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                    item.key === "stock-posting-approvals"
                      ? pendingStockPostingApprovalsCount
                      : undefined,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("rm-warehouse") &&
          visibleRawMaterialWarehouseMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>คลังวัตถุดิบ</div>

              <div className={styles.groupItems}>
                {visibleRawMaterialWarehouseMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("production") && visibleProductionMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>การผลิต</div>

              <div className={styles.groupItems}>
                {visibleProductionMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                    item.key === "production-output-stock-requests"
                      ? pendingProductionOutputStockRequestsCount
                      : undefined,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("fg-warehouse") &&
          visibleFinishedGoodsWarehouseMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>คลังสินค้าสำเร็จรูป</div>

              <div className={styles.groupItems}>
                {visibleFinishedGoodsWarehouseMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("sales") && visibleSalesMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ขายและจัดส่ง</div>

              <div className={styles.groupItems}>
                {visibleSalesMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("purchase") && visiblePurchaseMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>จัดซื้อทั่วไป</div>

              <div className={styles.groupItems}>
                {visiblePurchaseMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                    item.key === "purchase-request-approvals"
                      ? pendingPrApprovalsCount
                      : undefined,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("laboratory") && visibleLaboratoryMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ห้องปฏิบัติการ</div>

              <div className={styles.groupItems}>
                {visibleLaboratoryMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("oil-tank-farm") &&
          visibleOilTankFarmMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ถังน้ำมัน</div>

              <div className={styles.groupItems}>
                {visibleOilTankFarmMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("maintenance") &&
          visibleMaintenanceMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ซ่อมบำรุง</div>

              <div className={styles.groupItems}>
                {visibleMaintenanceMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("hrm") && visibleHrmMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>บุคคล</div>

              <div className={styles.groupItems}>
                {visibleHrmMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("finance") && visibleFinanceMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>การเงิน</div>

              <div className={styles.groupItems}>
                {visibleFinanceMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {showMenuGroup("reports") && visibleReportMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>รายงาน</div>

              <div className={styles.groupItems}>
                {visibleReportMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}
              </div>
            </div>
          ) : null}

          {(showMenuGroup("settings") || showMenuGroup("master")) &&
          (visibleSettingMenus.length > 0 || visibleMasterMenus.length > 0) ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ตั้งค่าระบบ</div>

              <div className={styles.groupItems}>
                {showMenuGroup("settings")
                  ? visibleSettingMenus.map((item) =>
                      renderMenuButton(
                        item,
                        pathname,
                        collapsed,
                        handleGo,
                        searchParams,
                      ),
                    )
                  : null}

                {showMenuGroup("master") && visibleMasterMenus.length > 0 ? (
                  <>
                    <button
                      type="button"
                      title={collapsed ? "Master Data" : undefined}
                      className={`${styles.menuItem} ${styles.parentMenuItem
                        } ${isMasterActive(pathname) ? styles.menuItemActive : ""}`}
                      onClick={handleToggleMaster}
                    >
                      <span className={styles.menuItemIcon}>
                        <IconMaster />
                      </span>

                      <span className={styles.menuItemText}>Master Data</span>

                      <span className={styles.chevron}>
                        <IconChevron open={masterOpen} />
                      </span>
                    </button>

                    {!collapsed && masterOpen && (
                      <div className={styles.subMenu}>
                        {visibleMasterMenus.map((item) => {
                          const active = isActive(
                            item,
                            pathname,
                            searchParams,
                          );

                          return (
                            <button
                              key={item.key}
                              type="button"
                              className={`${styles.subMenuItem} ${active ? styles.subMenuItemActive : ""
                                }`}
                              onClick={() => handleGo(item.href)}
                            >
                              <span className={styles.subMenuIcon}>
                                {item.icon}
                              </span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarProfile}>
            <div className={styles.avatar} title={user?.displayName || user?.username || ""}>
              {avatarLabel}
            </div>

            <div className={styles.profileText}>
              <strong>{user?.displayName || user?.username || "ผู้ใช้"}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <LogoutOutlined />
            <span className={styles.logoutLabel}>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </aside>
  );
}