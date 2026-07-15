"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./AppHeader.module.css";

type MenuItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
};

const IconMenu = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
    <path
      d="M4 7h16M9 12h11M4 17h16"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

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

const IconDepartment = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M4 20V7.5L12 4l8 3.5V20M8 20v-5h8v5M9.5 10h.01M14.5 10h.01M9.5 13.5h.01M14.5 13.5h.01"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
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

const mainMenus: MenuItem[] = [
  {
    key: "purchase-orders",
    label: "สั่งซื้อ",
    href: "/purchase-orders",
    icon: <IconPurchaseOrder />,
  },
  {
    key: "purchase_requests",
    label: "ขอซื้อ",
    href: "/purchase_requests",
    icon: <IconPurchaseRequest />,
  },
  {
    key: "receiving",
    label: "เข้าคลัง",
    href: "/receiving",
    icon: <IconReceiving />,
  },
];

const masterMenus: MenuItem[] = [
  {
    key: "vendors",
    label: "ผู้ขาย",
    href: "/masters/vendors",
    icon: <IconVendor />,
  },
  {
    key: "seller-types",
    label: "ประเภทผู้ขาย",
    href: "/masters/seller-types",
    icon: <IconSellerType />,
  },
  {
    key: "sellers",
    label: "ผู้ขายยาง",
    href: "/masters/sellers",
    icon: <IconVendor />,
  },
  {
    key: "seller-bank-accounts",
    label: "บัญชีธนาคารผู้ขาย",
    href: "/masters/seller-bank-accounts",
    icon: <IconPayment />,
  },
  {
    key: "trucks",
    label: "รถบรรทุก",
    href: "/masters/trucks",
    icon: <IconReceiving />,
  },
  {
    key: "tire-classifications",
    label: "ประเภท/กลุ่มยาง",
    href: "/masters/tire-classifications",
    icon: <IconCategory />,
  },
  {
    key: "raw-tire-price-rules",
    label: "กฎราคาซื้อยาง",
    href: "/masters/raw-tire-price-rules",
    icon: <IconTax />,
  },
  {
    key: "weighbridge-scales",
    label: "เครื่องชั่ง",
    href: "/masters/weighbridge-scales",
    icon: <IconReceiving />,
  },
  {
    key: "items",
    label: "สินค้า / วัตถุดิบ",
    href: "/masters/items",
    icon: <IconItem />,
  },
  {
    key: "item-categories",
    label: "หมวดหมู่สินค้า",
    href: "/masters/item-categories",
    icon: <IconCategory />,
  },
  {
    key: "units",
    label: "หน่วยนับ",
    href: "/masters/units",
    icon: <IconUnit />,
  },
  {
    key: "warehouses",
    label: "คลังสินค้า",
    href: "/masters/warehouses",
    icon: <IconWarehouse />,
  },
  {
    key: "warehouse-locations",
    label: "ตำแหน่งจัดเก็บ",
    href: "/masters/warehouse-locations",
    icon: <IconWarehouseLocation />,
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
    key: "purchase-request-types",
    label: "ประเภทใบขอซื้อ",
    href: "/masters/purchase-request-types",
    icon: <IconPrType />,
  },
  {
    key: "departments",
    label: "แผนก",
    href: "/masters/departments",
    icon: <IconDepartment />,
  },
];

function isActive(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMasterActive(pathname: string) {
  return pathname === "/masters" || pathname.startsWith("/masters/");
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
      className={`${styles.sidebar} ${
        collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
      }`}
    >
      <div className={styles.sidebarTop}>
        {!collapsed && <span className={styles.sidebarLabel}>เมนู</span>}

        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label="ย่อ/ขยายเมนู"
        >
          <IconMenu />
        </button>
      </div>

      <div className={styles.sidebarProfile}>
        <div className={styles.avatar}>M</div>

        {!collapsed && (
          <div className={styles.profileText}>
            <strong>Purchase</strong>
            <span>ERP Module</span>
          </div>
        )}
      </div>

      <div className={styles.groupBlock}>
        {!collapsed && <div className={styles.groupTitle}>PURCHASE</div>}

        <div className={styles.groupItems}>
          {mainMenus.map((item) => {
            const active = isActive(item.href, pathname);

            return (
              <button
                key={item.key}
                type="button"
                title={collapsed ? item.label : undefined}
                className={`${styles.menuItem} ${
                  active ? styles.menuItemActive : ""
                }`}
                onClick={() => handleGo(item.href)}
              >
                <span className={styles.menuItemIcon}>{item.icon}</span>

                {!collapsed && (
                  <span className={styles.menuItemText}>{item.label}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.groupBlock}>
        {!collapsed && <div className={styles.groupTitle}>SETTING</div>}

        <div className={styles.groupItems}>
          <button
            type="button"
            title={collapsed ? "Master" : undefined}
            className={`${styles.menuItem} ${styles.parentMenuItem} ${
              isMasterActive(pathname) ? styles.menuItemActive : ""
            }`}
            onClick={handleToggleMaster}
          >
            <span className={styles.menuItemIcon}>
              <IconMaster />
            </span>

            {!collapsed && (
              <>
                <span className={styles.menuItemText}>Master</span>
                <span className={styles.chevron}>
                  <IconChevron open={masterOpen} />
                </span>
              </>
            )}
          </button>

          {!collapsed && masterOpen && (
            <div className={styles.subMenu}>
              {masterMenus.map((item) => {
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
          )}
        </div>
      </div>
    </aside>
  );
}