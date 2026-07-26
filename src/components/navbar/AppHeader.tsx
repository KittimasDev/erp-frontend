"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

import styles from "./AppHeader.module.css";

// เพิ่ม/ลบเมนู (route) ในไฟล์นี้ทุกครั้ง ต้องอัปเดต Permission Matrix seed ด้วย:
// backend/src/security/permissions/permission-seed-data.ts (SCREEN_SEED_DEFINITIONS)

type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  roles?: string[];
  adminOnly?: boolean;
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
const IconPermission = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M12 3.5 5 6v5.5c0 4.4 3 8.4 7 9.5 4-1.1 7-5.1 7-9.5V6l-7-2.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="m9.3 12.1 1.9 1.9 3.6-3.7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
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

const rawTireMenus: MenuItem[] = [
  {
    key: "receiving",
    label: "ตั๋วชั่งรับซื้อยาง",
    href: "/receiving",
    icon: <IconReceiving />,
    roles: [...RAW_TIRE_ROLES],
  },
  // {
  //   key: "receiving-classify",
  //   label: "ใบรับซื้อ / คัดแยก",
  //   href: "/receiving?stage=classify",
  //   icon: <IconReceiving />,
  //   roles: [...RAW_TIRE_ROLES],
  // },
  // {
  //   key: "receiving-payment",
  //   label: "จ่ายเงินผู้ขายยาง",
  //   href: "/receiving?stage=payment",
  //   icon: <IconPayment />,
  //   roles: [
  //     ROLE.WEIGHBRIDGE_OFFICER,
  //     ROLE.ACCOUNTING_OFFICER,
  //     ROLE.EXECUTIVE,
  //   ],
  // },
  {
    key: "stock-posting-approvals",
    label: "อนุมัติรับยางเข้าคลัง",
    href: "/warehouse/stock-posting-approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  // {
  //   key: "reports-receiving-raw",
  //   label: "รายงานรับซื้อยาง",
  //   href: "/reports/receiving",
  //   icon: <IconReport />,
  //   roles: [
  //     ROLE.WEIGHBRIDGE_OFFICER,
  //     ROLE.PROCUREMENT_MANAGER,
  //     ROLE.WAREHOUSE_OFFICER,
  //     ROLE.WAREHOUSE_MANAGER,
  //     ROLE.ACCOUNTING_OFFICER,
  //     ROLE.EXECUTIVE,
  //   ],
  // },
];

const rawMaterialWarehouseMenus: MenuItem[] = [
  {
    key: "rm-stock-balances",
    label: "ยอดคงเหลือวัตถุดิบ",
    href: "/inventory/stock-balances?itemCategoryCode=RAW_MATERIAL",
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
    label: "Lot วัตถุดิบ",
    href: "/inventory/lots?itemCategoryCode=RAW_MATERIAL",
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
    label: "เบิกวัตถุดิบจากคลัง",
    href: "/inventory/material-issues",
    icon: <IconMaterialIssue />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "rm-stock-transfers",
    label: "โอนย้ายวัตถุดิบ",
    href: "/inventory/stock-transfers",
    icon: <IconStockTransfer />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "rm-stock-control",
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
    label: "ความเคลื่อนไหววัตถุดิบ",
    href: "/inventory/stock-movements?itemCategoryCode=RAW_MATERIAL",
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
];

const finishedGoodsWarehouseMenus: MenuItem[] = [
  {
    key: "production-output-approvals",
    label: "อนุมัติรับผลผลิตเข้าคลัง",
    href: "/warehouse/production-output-approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "fg-stock-balances",
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
    label: "อนุมัติใบขอซื้อ",
    href: "/purchase-requests/approvals",
    icon: <IconPrType />,
    roles: [ROLE.PROCUREMENT_MANAGER],
  },
  {
    key: "purchase-orders",
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
    key: "procurement-tracking",
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
    label: "ใบเสนอราคา",
    href: "/quotations",
    icon: <IconPurchaseOrder />,
    roles: [ROLE.SALES_OFFICER, ROLE.SALES_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "sales-orders",
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
    key: "sales-invoices",
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

const financeMenus: MenuItem[] = [
  {
    key: "purchase-payments-pending",
    label: "รอจ่ายเงิน Supplier",
    href: "/purchase-payments/pending",
    icon: <IconPayment />,
    roles: [ROLE.ACCOUNTING_OFFICER],
  },
  {
    key: "purchase-payments",
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
    label: "รายงานการใช้สารเคมี",
    href: "/reports/chemical-consumption",
    icon: <IconReport />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER, ROLE.EXECUTIVE],
  },
  {
    key: "reports-ar-aging",
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
];


const settingMenus: MenuItem[] = [
  {
    key: "users",
    label: "จัดการผู้ใช้งานและแผนก",
    href: "/users",
    icon: <IconUsers />,
    adminOnly: true,
  },
  {
    key: "permissions",
    label: "Permission Matrix",
    href: "/settings/permissions",
    icon: <IconPermission />,
    adminOnly: true,
  },
  {
    key: "audit-logs",
    label: "Audit Log",
    href: "/settings/audit-logs",
    icon: <IconAuditLog />,
    adminOnly: true,
  },
];

const masterMenus: MenuItem[] = [
  {
    key: "customers",
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
    label: "คลังสินค้า",
    href: "/warehouses",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "warehouse-locations",
    label: "ตำแหน่งจัดเก็บ",
    href: "/warehouse-locations",
    icon: <IconWarehouseLocation />,
    roles: [ROLE.WAREHOUSE_OFFICER, ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "payment-terms",
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
    label: "ประเภทใบขอซื้อ",
    href: "/masters/purchase-request-types",
    icon: <IconPrType />,
    roles: [ROLE.PROCUREMENT_MANAGER],
  },
  {
    key: "seller-types",
    label: "ประเภทผู้ขายยาง",
    href: "/masters/seller-types",
    icon: <IconSellerType />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "sellers",
    label: "ผู้ขายยาง",
    href: "/masters/sellers",
    icon: <IconVendor />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "seller-bank-accounts",
    label: "บัญชีธนาคารผู้ขายยาง",
    href: "/masters/seller-bank-accounts",
    icon: <IconPayment />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER, ROLE.ACCOUNTING_OFFICER],
  },
  {
    key: "trucks",
    label: "รถบรรทุก",
    href: "/masters/trucks",
    icon: <IconReceiving />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "tire-classifications",
    label: "ประเภท/กลุ่มยาง",
    href: "/masters/tire-classifications",
    icon: <IconCategory />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "raw-tire-price-rules",
    label: "กฎราคาซื้อยาง",
    href: "/masters/raw-tire-price-rules",
    icon: <IconTax />,
    roles: [ROLE.WEIGHBRIDGE_OFFICER],
  },
  {
    key: "weighbridge-scales",
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

  if (item.adminOnly) return false;

  if (!item.roles || item.roles.length === 0) {
    return true;
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
) {
  const active = isActive(item, pathname, searchParams);

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

  const visibleRawTireMenus = filterMenus(rawTireMenus);
  const visibleRawMaterialWarehouseMenus = filterMenus(
    rawMaterialWarehouseMenus,
  );
  const visibleProductionMenus = filterMenus(productionMenus);
  const visibleFinishedGoodsWarehouseMenus = filterMenus(
    finishedGoodsWarehouseMenus,
  );
  const visiblePurchaseMenus = filterMenus(purchaseMenus);
  const visibleSalesMenus = filterMenus(salesMenus);
  const visibleLaboratoryMenus = filterMenus(laboratoryMenus);
  const visibleFinanceMenus = filterMenus(financeMenus);
  const visibleReportMenus = filterMenus(reportMenus);
  const visibleSettingMenus = filterMenus(settingMenus);
  const visibleMasterMenus = filterMenus(masterMenus);

  const handleGo = (href: string) => {
    router.push(href);
  };

  const handleToggleMaster = () => {
    if (collapsed) {
      onCollapsedChange(false);
      setMasterOpen(true);
      return;
    }

    setMasterOpen((prev) => !prev);
  };

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
        }`}
    >
      <button
        type="button"
        className={styles.edgeToggle}
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
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
          <div className={styles.logoBlock}>
            {collapsed ? "SMT" : "SMT ERP"}
          </div>
        </div>

        <div className={styles.navScroll}>
          {visibleRawTireMenus.length > 0 ? (
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
                  ),
                )}
              </div>
            </div>
          ) : null}

          {visibleRawMaterialWarehouseMenus.length > 0 ? (
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

          {visibleProductionMenus.length > 0 ? (
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
                  ),
                )}
              </div>
            </div>
          ) : null}

          {visibleFinishedGoodsWarehouseMenus.length > 0 ? (
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

          {visibleSalesMenus.length > 0 ? (
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

          {visiblePurchaseMenus.length > 0 ? (
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
                  ),
                )}
              </div>
            </div>
          ) : null}

          {visibleLaboratoryMenus.length > 0 ? (
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

          {visibleFinanceMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>บัญชี/การเงิน</div>

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

          {visibleReportMenus.length > 0 ? (
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

          {visibleSettingMenus.length > 0 || visibleMasterMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ตั้งค่าระบบ</div>

              <div className={styles.groupItems}>
                {visibleSettingMenus.map((item) =>
                  renderMenuButton(
                    item,
                    pathname,
                    collapsed,
                    handleGo,
                    searchParams,
                  ),
                )}

                {visibleMasterMenus.length > 0 ? (
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
            <div className={styles.avatar}>PR</div>

            <div className={styles.profileText}>
              <strong>Purchase</strong>
              <span>ERP Module</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}