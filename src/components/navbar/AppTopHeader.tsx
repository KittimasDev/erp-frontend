"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import styles from "./AppTopHeader.module.css";

const PAGE_TITLES: Array<{ href: string; title: string }> = [
  { href: "/purchase-orders", title: "สั่งซื้อ" },
  { href: "/purchase_requests", title: "ขอซื้อ" },
  { href: "/receiving", title: "ภาพรวมรับซื้อยาง" },
  { href: "/masters/vendors", title: "ผู้ขาย" },
  { href: "/masters/seller-types", title: "ประเภทผู้ขาย" },
  { href: "/masters/sellers", title: "ผู้ขายยาง" },
  { href: "/masters/seller-bank-accounts", title: "บัญชีธนาคารผู้ขาย" },
  { href: "/masters/trucks", title: "รถบรรทุก" },
  { href: "/masters/tire-classifications", title: "ประเภท/กลุ่มยาง" },
  { href: "/masters/raw-tire-price-rules", title: "กฎราคาซื้อยาง" },
  { href: "/masters/weighbridge-scales", title: "เครื่องชั่ง" },
  { href: "/masters/items", title: "สินค้า / วัตถุดิบ" },
  { href: "/masters/item-categories", title: "หมวดหมู่สินค้า" },
  { href: "/masters/units", title: "หน่วยนับ" },
  { href: "/masters/warehouses", title: "คลังสินค้า" },
  { href: "/masters/warehouse-locations", title: "ตำแหน่งจัดเก็บ" },
  { href: "/masters/payment-terms", title: "เงื่อนไขชำระเงิน" },
  { href: "/masters/tax-rates", title: "อัตราภาษี" },
  { href: "/masters/purchase-request-types", title: "ประเภทใบขอซื้อ" },
  { href: "/masters/departments", title: "แผนก" },
  { href: "/masters", title: "Master Data" },
];

function resolvePageTitle(pathname: string) {
  if (pathname === "/receiving/dashboard") {
    return "Dashboard รับซื้อยาง";
  }

  if (/^\/receiving\/receipts\/[^/]+\/payment$/.test(pathname)) {
    return "ใบสำคัญจ่าย / จ่ายเงินผู้ขาย";
  }

  if (/^\/receiving\/receipts\/[^/]+$/.test(pathname)) {
    return "ใบรับซื้อยาง";
  }

  if (/^\/receiving\/[^/]+\/classification$/.test(pathname)) {
    return "คัดแยกประเภทยาง";
  }

  if (/^\/receiving\/[^/]+$/.test(pathname)) {
    return "ชั่งน้ำหนักรับซื้อยาง";
  }

  const exact = PAGE_TITLES.find((item) => item.href === pathname);
  if (exact) {
    return exact.title;
  }

  const prefix = PAGE_TITLES.find(
    (item) =>
      item.href !== "/masters" && pathname.startsWith(`${item.href}/`),
  );
  if (prefix) {
    return prefix.title;
  }

  if (pathname.startsWith("/masters")) {
    return "Master Data";
  }

  return "ภาพรวมระบบ";
}

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <rect
      x="3.5"
      y="5"
      width="17"
      height="15"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

const IconBell = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path
      d="M12 3.5a5.5 5.5 0 0 1 5.5 5.5v2.2c0 .7.2 1.4.6 2l1.1 1.5c.6.8 0 2-1 2H5.8c-1 0-1.6-1.2-1-2l1.1-1.5c.4-.6.6-1.3.6-2V9A5.5 5.5 0 0 1 12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 18.5a2.5 2.5 0 0 0 5 0"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export default function AppTopHeader() {
  const pathname = usePathname();

  const title = useMemo(() => resolvePageTitle(pathname), [pathname]);
  const todayLabel = useMemo(() => formatThaiDate(new Date()), []);

  return (
    <header className={styles.topHeader}>
      <div className={styles.topHeaderInner}>
        <h1 className={styles.pageTitle}>{title}</h1>

        <div className={styles.topActions}>
          <div className={styles.dateChip}>
            <span className={styles.dateIcon}>
              <IconCalendar />
            </span>
            <span>{todayLabel}</span>
          </div>

          <button
            type="button"
            className={styles.bellButton}
            aria-label="การแจ้งเตือน"
          >
            <IconBell />
            <span className={styles.bellBadge}>3</span>
          </button>
        </div>
      </div>
    </header>
  );
}
