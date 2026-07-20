"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";

import styles from "./AppHeader.module.css";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  roles?: string[];
  adminOnly?: boolean;
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
const rawTireMenus: MenuItem[] = [
  {
    key: "receiving",
    label: "รับซื้อยาง",
    href: "/receiving",
    icon: <IconReceiving />,
    roles: [
      ROLE.WEIGHBRIDGE_OFFICER,
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
];

const warehouseMenus: MenuItem[] = [
  {
    key: "goods-receipts",
    label: "ใบรับของ GR",
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
  {
    key: "stock-balances",
    label: "ยอดคงเหลือ",
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
    key: "stock-movements",
    label: "ประวัติสต๊อก",
    href: "/inventory/stock-movements",
    icon: <IconWarehouseLocation />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "inventory-lots",
    label: "ยอดคงเหลือแยก Lot",
    href: "/inventory/lots",
    icon: <IconItem />,
    roles: [
      ROLE.WAREHOUSE_OFFICER,
      ROLE.WAREHOUSE_MANAGER,
      ROLE.PROCUREMENT_MANAGER,
      ROLE.ACCOUNTING_OFFICER,
      ROLE.EXECUTIVE,
    ],
  },
  {
    key: "stock-posting-approvals",
    label: "อนุมัติรับเข้าคลัง (ยาง)",
    href: "/warehouse/stock-posting-approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER],
  },
  {
    key: "production-output-approvals",
    label: "อนุมัติรับผลผลิต",
    href: "/warehouse/production-output-approvals",
    icon: <IconWarehouse />,
    roles: [ROLE.WAREHOUSE_MANAGER],
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


const settingMenus: MenuItem[] = [
  {
    key: "users",
    label: "จัดการผู้ใช้งานและแผนก",
    href: "/users",
    icon: <IconUsers />,
    adminOnly: true,
  },
];

const masterMenus: MenuItem[] = [
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

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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

  return item.roles.some((role) => userHasRole(role as RoleCode));
}

function filterMenus(items: MenuItem[]) {
  return items.filter(canSeeMenu);
}

function renderMenuButton(
  item: MenuItem,
  pathname: string,
  collapsed: boolean,
  handleGo: (href: string) => void,
) {
  const active = isActive(item.href, pathname);

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

  const [masterOpen, setMasterOpen] = useState(isMasterActive(pathname));

  const visibleRawTireMenus = filterMenus(rawTireMenus);
  const visiblePurchaseMenus = filterMenus(purchaseMenus);
  const visibleWarehouseMenus = filterMenus(warehouseMenus);
  const visibleFinanceMenus = filterMenus(financeMenus);
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

        {visibleRawTireMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>รับซื้อยาง</div>

              <div className={styles.groupItems}>
                {visibleRawTireMenus.map((item) =>
                  renderMenuButton(item, pathname, collapsed, handleGo),
                )}
              </div>
            </div>
          ) : null}

        <div className={styles.navScroll}>
          {visiblePurchaseMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>จัดซื้อทั่วไป</div>

              <div className={styles.groupItems}>
                {visiblePurchaseMenus.map((item) =>
                  renderMenuButton(item, pathname, collapsed, handleGo),
                )}
              </div>
            </div>
          ) : null}

          {visibleWarehouseMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>คลังสินค้า</div>

              <div className={styles.groupItems}>
                {visibleWarehouseMenus.map((item) =>
                  renderMenuButton(item, pathname, collapsed, handleGo),
                )}
              </div>
            </div>
          ) : null}

          {visibleFinanceMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>บัญชี/การเงิน</div>

              <div className={styles.groupItems}>
                {visibleFinanceMenus.map((item) =>
                  renderMenuButton(item, pathname, collapsed, handleGo),
                )}
              </div>
            </div>
          ) : null}


          {visibleSettingMenus.length > 0 || visibleMasterMenus.length > 0 ? (
            <div className={styles.groupBlock}>
              <div className={styles.groupTitle}>ตั้งค่าระบบ</div>

              <div className={styles.groupItems}>
                {visibleSettingMenus.map((item) =>
                  renderMenuButton(item, pathname, collapsed, handleGo),
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
                          const active = isActive(item.href, pathname);

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