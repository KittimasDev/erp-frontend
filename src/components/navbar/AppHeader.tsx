"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import styles from "./AppHeader.module.css";

type NavRoute = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z"
      fill="currentColor"
    />
  </svg>
);

const IconRequest = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 5h6M9 12h6M9 16h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconOrder = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4 6h16M4 6l1.5 12.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5L20 6M9 10l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconWarehouse = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M3 21V9l9-5 9 5v12M7 21v-7h10v7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const navRoutes: NavRoute[] = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: <IconDashboard /> },
  {
    key: "purchase-request",
    label: "ใบขอซื้อ",
    href: "/purchase-requests",
    icon: <IconRequest />,
  },
  {
    key: "purchase-order",
    label: "ใบสั่งซื้อ",
    href: "/purchase-orders",
    icon: <IconOrder />,
  },
  {
    key: "warehouse",
    label: "คลังสินค้า",
    href: "/warehouse",
    icon: <IconWarehouse />,
  },
];

function isActive(href: string, pathname: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems: MenuProps["items"] = navRoutes.map((route) => ({
    key: route.key,
    label: route.label,
    icon: route.icon,
    onClick: () => router.push(route.href),
  }));

  const activeRoute =
    navRoutes.find((route) => isActive(route.href, pathname)) ?? navRoutes[0];

  return (
    <header className={styles.headerBar}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark} />
        <span className={styles.brandTitle}>
          <strong>SMT</strong>
          <span>ENERGY CO., LTD.</span>
        </span>
      </Link>

      <nav className={styles.navLinks}>
        {navRoutes.map((route) => (
          <Link
            key={route.key}
            href={route.href}
            className={`${styles.navLink} ${
              isActive(route.href, pathname) ? styles.navLinkActive : ""
            }`}
          >
            <span className={styles.navLinkIcon}>{route.icon}</span>
            <span>{route.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.actions}>
        <Dropdown
          menu={{ items: menuItems, selectedKeys: [activeRoute.key] }}
          trigger={["click"]}
          placement="bottomRight"
        >
          <button type="button" className={styles.menuChip} aria-label="เมนู">
            <span className={styles.menuIcon}>☰</span>
            <span className={styles.menuChipLabel}>{activeRoute.label}</span>
          </button>
        </Dropdown>

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={() => router.push("/login")}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
            <path
              d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </header>
  );
}
