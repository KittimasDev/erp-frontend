"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode, type RoleCodeValue } from "@/lib/auth/role-codes";

import styles from "./AppHeader.module.css";

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  /** If set, user must have at least one of these roles (ADMIN always passes via userHasRole) */
  roles?: RoleCodeValue[];
};

type NavGroup = {
  key: string;
  title: string;
  items: NavItem[];
};

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

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h7v7H4v-7Zm9 6h7v4h-7v-4Zm0-6h7v4h-7v-4Z"
      stroke="currentColor"
      strokeWidth="1.7"
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

const IconReport = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M5 19V9M10 19V5M15 19v-7M20 19V8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconTrack = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4 12h4l2-6 4 12 2-6h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconScale = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M12 3v3M7 21h10M8 6h8l1 3H7l1-3ZM6 9l-2 8h4M18 9l2 8h-4M10 21v-4h4v4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PROCUREMENT_ROLES: RoleCodeValue[] = [
  RoleCode.PROCUREMENT_OFFICER,
  RoleCode.PROCUREMENT_MANAGER,
  RoleCode.ADMINISTRATOR,
  RoleCode.WAREHOUSE_OFFICER,
  RoleCode.WAREHOUSE_MANAGER,
  RoleCode.ACCOUNTING_OFFICER,
  RoleCode.EXECUTIVE,
];

const WAREHOUSE_ROLES: RoleCodeValue[] = [
  RoleCode.WAREHOUSE_OFFICER,
  RoleCode.WAREHOUSE_MANAGER,
  RoleCode.PROCUREMENT_MANAGER,
  RoleCode.ACCOUNTING_OFFICER,
  RoleCode.EXECUTIVE,
  RoleCode.ADMINISTRATOR,
];

const ACCOUNTING_ROLES: RoleCodeValue[] = [
  RoleCode.ACCOUNTING_OFFICER,
  RoleCode.ADMINISTRATOR,
  RoleCode.PROCUREMENT_MANAGER,
  RoleCode.PROCUREMENT_OFFICER,
  RoleCode.EXECUTIVE,
];

const RECEIVING_ROLES: RoleCodeValue[] = [
  RoleCode.WEIGHBRIDGE_OFFICER,
  RoleCode.WAREHOUSE_OFFICER,
  RoleCode.WAREHOUSE_MANAGER,
  RoleCode.PROCUREMENT_MANAGER,
  RoleCode.ACCOUNTING_OFFICER,
  RoleCode.EXECUTIVE,
  RoleCode.ADMINISTRATOR,
];

const navGroups: NavGroup[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    items: [
      {
        key: "home",
        label: "ภาพรวม",
        href: "/",
        icon: <IconDashboard />,
      },
    ],
  },
  {
    key: "procurement",
    title: "จัดซื้อทั่วไป",
    items: [
      {
        key: "pr",
        label: "ใบขอซื้อ PR",
        href: "/purchase-requests",
        icon: <IconPurchaseRequest />,
        roles: PROCUREMENT_ROLES,
      },
      {
        key: "pr-approvals",
        label: "อนุมัติใบขอซื้อ",
        href: "/purchase-requests/approvals",
        icon: <IconPurchaseRequest />,
        roles: [RoleCode.PROCUREMENT_MANAGER, RoleCode.ADMINISTRATOR],
      },
      {
        key: "po",
        label: "ใบสั่งซื้อ PO",
        href: "/purchase-orders",
        icon: <IconPurchaseOrder />,
        roles: PROCUREMENT_ROLES,
      },
      {
        key: "tracking",
        label: "ติดตามจัดซื้อ",
        href: "/procurement/tracking",
        icon: <IconTrack />,
        roles: PROCUREMENT_ROLES,
      },
    ],
  },
  {
    key: "warehouse",
    title: "คลังสินค้า",
    items: [
      {
        key: "gr",
        label: "ใบรับของ GR",
        href: "/goods-receipts",
        icon: <IconReceiving />,
        roles: WAREHOUSE_ROLES,
      },
      {
        key: "stock-balances",
        label: "Stock Balance",
        href: "/inventory/stock-balances",
        icon: <IconWarehouse />,
        roles: WAREHOUSE_ROLES,
      },
      {
        key: "stock-movements",
        label: "Stock Movement",
        href: "/inventory/stock-movements",
        icon: <IconWarehouseLocation />,
        roles: WAREHOUSE_ROLES,
      },
      {
        key: "lots",
        label: "Lot Balance",
        href: "/inventory/lots",
        icon: <IconItem />,
        roles: WAREHOUSE_ROLES,
      },
      {
        key: "production-approvals",
        label: "อนุมัติรับผลผลิต",
        href: "/warehouse/production-output-approvals",
        icon: <IconWarehouse />,
        roles: [
          RoleCode.WAREHOUSE_MANAGER,
          RoleCode.WAREHOUSE_OFFICER,
          RoleCode.ADMINISTRATOR,
        ],
      },
    ],
  },
  {
    key: "finance",
    title: "บัญชี/การเงิน",
    items: [
      {
        key: "pay-pending",
        label: "รอจ่ายเงิน Supplier",
        href: "/purchase-payments/pending",
        icon: <IconPayment />,
        roles: ACCOUNTING_ROLES,
      },
      {
        key: "pay-history",
        label: "ประวัติการจ่ายเงิน",
        href: "/purchase-payments",
        icon: <IconPayment />,
        roles: ACCOUNTING_ROLES,
      },
    ],
  },
  {
    key: "raw-tire",
    title: "รับซื้อยาง",
    items: [
      {
        key: "scales",
        label: "เครื่องชั่ง",
        href: "/masters/weighbridge-scales",
        icon: <IconScale />,
        roles: RECEIVING_ROLES,
      },
      {
        key: "tickets",
        label: "ตั๋วชั่ง",
        href: "/receiving",
        icon: <IconReceiving />,
        roles: RECEIVING_ROLES,
      },
      {
        key: "raw-receipts",
        label: "ใบรับซื้อยาง",
        href: "/receiving",
        icon: <IconPurchaseOrder />,
        roles: RECEIVING_ROLES,
      },
      {
        key: "stock-request",
        label: "ขอรับยางเข้าคลัง",
        href: "/receiving",
        icon: <IconWarehouse />,
        roles: [
          RoleCode.WAREHOUSE_OFFICER,
          RoleCode.WAREHOUSE_MANAGER,
          RoleCode.WEIGHBRIDGE_OFFICER,
          RoleCode.ADMINISTRATOR,
        ],
      },
      {
        key: "stock-approve",
        label: "อนุมัติรับยางเข้าคลัง",
        href: "/warehouse/stock-posting-approvals",
        icon: <IconWarehouse />,
        roles: [
          RoleCode.WAREHOUSE_MANAGER,
          RoleCode.WAREHOUSE_OFFICER,
          RoleCode.ADMINISTRATOR,
        ],
      },
    ],
  },
  {
    key: "masters",
    title: "Master Data",
    items: [
      {
        key: "units",
        label: "หน่วยนับ",
        href: "/masters/units",
        icon: <IconUnit />,
      },
      {
        key: "item-categories",
        label: "หมวดสินค้า",
        href: "/masters/item-categories",
        icon: <IconCategory />,
      },
      {
        key: "items",
        label: "สินค้า",
        href: "/masters/items",
        icon: <IconItem />,
      },
      {
        key: "warehouses",
        label: "คลังสินค้า",
        href: "/warehouses",
        icon: <IconWarehouse />,
      },
      {
        key: "locations",
        label: "ตำแหน่งจัดเก็บ",
        href: "/warehouse-locations",
        icon: <IconWarehouseLocation />,
      },
      {
        key: "vendors",
        label: "เจ้าหนี้ / Supplier",
        href: "/masters/vendors",
        icon: <IconVendor />,
      },
      {
        key: "sellers",
        label: "ผู้ขายยาง",
        href: "/masters/sellers",
        icon: <IconVendor />,
      },
      {
        key: "seller-types",
        label: "ประเภทผู้ขาย",
        href: "/masters/seller-types",
        icon: <IconSellerType />,
      },
      {
        key: "seller-banks",
        label: "บัญชีธนาคารผู้ขาย",
        href: "/masters/seller-bank-accounts",
        icon: <IconPayment />,
      },
      {
        key: "trucks",
        label: "รถบรรทุก",
        href: "/masters/trucks",
        icon: <IconWarehouseLocation />,
      },
      {
        key: "tire-class",
        label: "ประเภทยาง",
        href: "/masters/tire-classifications",
        icon: <IconCategory />,
      },
      {
        key: "tire-price",
        label: "ราคายาง",
        href: "/masters/raw-tire-price-rules",
        icon: <IconTax />,
      },
      {
        key: "payment-terms",
        label: "เงื่อนไขชำระเงิน",
        href: "/masters/payment-terms",
        icon: <IconPayment />,
      },
      {
        key: "tax-rates",
        label: "อัตราภาษี",
        href: "/masters/tax-rates",
        icon: <IconTax />,
      },
      {
        key: "pr-types",
        label: "ประเภทใบขอซื้อ",
        href: "/masters/purchase-request-types",
        icon: <IconPrType />,
      },
    ],
  },
  {
    key: "reports",
    title: "รายงาน",
    items: [
      {
        key: "rpt-procurement",
        label: "รายงานจัดซื้อ",
        href: "/reports/procurement",
        icon: <IconReport />,
      },
      {
        key: "rpt-inventory",
        label: "รายงานคลัง",
        href: "/reports/inventory",
        icon: <IconReport />,
      },
      {
        key: "rpt-receiving",
        label: "รายงานรับซื้อยาง",
        href: "/reports/receiving",
        icon: <IconReport />,
      },
      {
        key: "rpt-payments",
        label: "รายงานจ่ายเงิน",
        href: "/reports/payments",
        icon: <IconReport />,
      },
    ],
  },
  {
    key: "settings",
    title: "ตั้งค่าระบบ",
    items: [
      {
        key: "users",
        label: "ผู้ใช้งาน",
        href: "/users",
        icon: <IconUsers />,
        roles: [RoleCode.ADMINISTRATOR],
      },
      {
        key: "roles",
        label: "Roles",
        href: "/settings/roles",
        icon: <IconUsers />,
        roles: [RoleCode.ADMINISTRATOR],
      },
      {
        key: "permissions",
        label: "Permissions",
        href: "/settings/permissions",
        icon: <IconMaster />,
        roles: [RoleCode.ADMINISTRATOR],
      },
    ],
  },
];

/** All unique nav hrefs — used so a parent path does not stay active under a sibling route. */
const ALL_NAV_HREFS = [
  ...new Set(navGroups.flatMap((group) => group.items.map((item) => item.href))),
];

function isActive(href: string, pathname: string, allHrefs: string[] = ALL_NAV_HREFS) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  // e.g. /purchase-requests must not stay active on /purchase-requests/approvals
  const stolenByMoreSpecific = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !stolenByMoreSpecific;
}

function canSeeItem(item: NavItem) {
  if (!item.roles?.length) return true;
  return item.roles.some((role) => userHasRole(role));
}

function groupHasActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => isActive(item.href, pathname));
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
  const [roleTick, setRoleTick] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRoleTick((n) => n + 1);
  }, [pathname]);

  const visibleGroups = useMemo(() => {
    void roleTick;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(canSeeItem),
      }))
      .filter((group) => group.items.length > 0);
  }, [roleTick]);

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of visibleGroups) {
        if (groupHasActive(group, pathname)) {
          next[group.key] = true;
        }
      }
      return next;
    });
  }, [pathname, visibleGroups]);

  const handleGo = (href: string) => {
    router.push(href);
  };

  const handleToggleGroup = (groupKey: string) => {
    if (collapsed) {
      onCollapsedChange(false);
      setOpenGroups((prev) => ({ ...prev, [groupKey]: true }));
      return;
    }
    setOpenGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  return (
    <aside
      className={`${styles.sidebar} ${
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
      }`}
    >
      <button
        type="button"
        className={styles.edgeToggle}
        onClick={() => onCollapsedChange(!collapsed)}
        aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
      >
        <span
          className={`${styles.edgeToggleIcon} ${
            collapsed ? styles.edgeToggleIconCollapsed : ""
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
          {visibleGroups.map((group) => {
            const open = Boolean(openGroups[group.key]);
            const groupActive = groupHasActive(group, pathname);

            return (
              <div key={group.key} className={styles.groupBlock}>
                <button
                  type="button"
                  title={collapsed ? group.title : undefined}
                  className={`${styles.menuItem} ${styles.parentMenuItem} ${
                    groupActive ? styles.menuItemActive : ""
                  }`}
                  onClick={() => handleToggleGroup(group.key)}
                >
                  <span className={styles.menuItemIcon}>
                    {group.items[0]?.icon ?? <IconMaster />}
                  </span>
                  <span className={styles.menuItemText}>{group.title}</span>
                  <span className={styles.chevron}>
                    <IconChevron open={open} />
                  </span>
                </button>

                {!collapsed && open ? (
                  <div className={styles.subMenu}>
                    {group.items.map((item) => {
                      const active = isActive(item.href, pathname);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className={`${styles.subMenuItem} ${
                            active ? styles.subMenuItemActive : ""
                          }`}
                          onClick={() => handleGo(item.href)}
                        >
                          <span className={styles.subMenuIcon}>{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarProfile}>
            <div className={styles.avatar}>
              {isAdministrator() ? "AD" : "ER"}
            </div>
            <div className={styles.profileText}>
              <strong>SMT ERP</strong>
              <span>Navigation</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
