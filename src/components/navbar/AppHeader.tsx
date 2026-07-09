"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Drawer, Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";
import styles from "./AppHeader.module.css";

const { Header } = Layout;

type MasterRoute = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const IconMaster = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4 6.5h16M4 12h16M4 17.5h16"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

const IconVendor = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M15.5 10.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM4.5 20a7.5 7.5 0 0 1 15 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const IconItem = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
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
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
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
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M3.5 21V9.5L12 4l8.5 5.5V21M7.5 21v-7h9v7"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPayment = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M4.5 7h15A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9A1.5 1.5 0 0 1 4.5 7ZM3 11h18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconLogout = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
    <path
      d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const masterRoutes: MasterRoute[] = [
  {
    key: "vendors",
    label: "ผู้ขาย",
    description: "ข้อมูลคนขาย / บริษัทผู้ขาย",
    href: "/masters/vendors",
    icon: <IconVendor />,
  },
  {
    key: "items",
    label: "สินค้า / วัตถุดิบ",
    description: "รายการสินค้า ยาง วัตถุดิบ อะไหล่",
    href: "/masters/items",
    icon: <IconItem />,
  },
  {
    key: "units",
    label: "หน่วยนับ",
    description: "กิโลกรัม ตัน ลิตร ชิ้น",
    href: "/masters/units",
    icon: <IconUnit />,
  },
  {
    key: "warehouses",
    label: "คลังสินค้า",
    description: "คลังรับเข้าและคลังจัดเก็บ",
    href: "/masters/warehouses",
    icon: <IconWarehouse />,
  },
  {
    key: "payment-terms",
    label: "เงื่อนไขชำระเงิน",
    description: "เงินสด เครดิต 15 / 30 วัน",
    href: "/masters/payment-terms",
    icon: <IconPayment />,
  },
];

function getSelectedKey(pathname: string) {
  const active = masterRoutes.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`)
  );

  return active?.key;
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [openMaster, setOpenMaster] = useState(false);

  const selectedKey = getSelectedKey(pathname);

  const masterMenuItems: MenuProps["items"] = masterRoutes.map((route) => ({
    key: route.key,
    icon: <span className={styles.menuItemIcon}>{route.icon}</span>,
    label: (
      <div className={styles.menuItemLabel}>
        <strong>{route.label}</strong>
        <span>{route.description}</span>
      </div>
    ),
    onClick: () => {
      router.push(route.href);
      setOpenMaster(false);
    },
  }));

  return (
    <>
      <Header className={styles.headerBar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} />
          <span className={styles.brandText}>
            <strong>SMT</strong>
            <span>ENERGY CO., LTD.</span>
          </span>
        </Link>

        <div className={styles.navArea}>
          <Button
            type="text"
            className={styles.masterNavBtn}
            onClick={() => setOpenMaster(true)}
          >
            <span className={styles.masterIcon}>
              <IconMaster />
            </span>
            <span className={styles.masterText}>
              <strong>Master Data</strong>
              <small>ข้อมูลพื้นฐานระบบ</small>
            </span>
          </Button>
        </div>

        <div className={styles.actions}>
          <Button
            type="text"
            className={styles.logoutBtn}
            onClick={() => router.push("/login")}
          >
            <IconLogout />
            <span>ออกจากระบบ</span>
          </Button>
        </div>
      </Header>

      <Drawer
        title={
          <div className={styles.drawerTitle}>
            <div>
              <strong>Master Data</strong>
              <span>จัดการข้อมูลพื้นฐานของระบบจัดซื้อ</span>
            </div>
          </div>
        }
        placement="left"
        open={openMaster}
        onClose={() => setOpenMaster(false)}
        size="default"
        className={styles.masterDrawer}
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={masterMenuItems}
          className={styles.masterMenu}
        />

        <div className={styles.drawerNote}>
          <b>ใช้งานร่วมกับ</b>
          <span>PR, PO, รับซื้อยาง, Receiving และ Bills & Payments</span>
        </div>
      </Drawer>
    </>
  );
}