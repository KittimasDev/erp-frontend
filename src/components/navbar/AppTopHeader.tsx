"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import styles from "./AppTopHeader.module.css";

const PAGE_TITLES: Array<{ href: string; title: string }> = [
  { href: "/", title: "Dashboard" },
  { href: "/production/production-orders", title: "ใบสั่งผลิต (Pyrolysis)" },
  { href: "/reports/ar-aging", title: "รายงานลูกหนี้คงค้าง" },
  { href: "/reports/sales-invoices", title: "รายงานใบแจ้งหนี้" },
  { href: "/reports/sales-payments", title: "รายงานรับชำระเงิน" },
  { href: "/procurement/tracking", title: "ติดตามจัดซื้อ" },
  { href: "/purchase-orders", title: "ใบสั่งซื้อ PO" },
  { href: "/purchase-requests/approvals", title: "อนุมัติใบขอซื้อ" },
  { href: "/purchase-requests/create", title: "สร้างใบขอซื้อ" },
  { href: "/purchase-requests", title: "ใบขอซื้อ PR" },
  { href: "/quotations/create", title: "สร้างใบเสนอราคา" },
  { href: "/quotations", title: "ใบเสนอราคา" },
  { href: "/sales-orders", title: "ใบสั่งขาย" },
  { href: "/sales-orders/stock-verification", title: "ตรวจสอบสต๊อกขาย" },
  { href: "/pickings", title: "ใบจ่ายสินค้า / Picking" },
  { href: "/packings", title: "ใบบรรจุสินค้า / Packing" },
  { href: "/delivery-orders", title: "ใบส่งสินค้า" },
  { href: "/sales-invoices/pending", title: "รอออกใบแจ้งหนี้" },
  { href: "/sales-invoices", title: "ใบแจ้งหนี้ขาย" },
  { href: "/sales-tracking", title: "ติดตามการขายและจัดส่ง" },
  { href: "/laboratory/samples", title: "ตัวอย่างตรวจสอบ (LIMS)" },
  { href: "/goods-receipts", title: "รับสินค้าเข้าคลัง (PO)" },
  { href: "/purchase-payments/pending", title: "รอจ่ายเงิน Supplier" },
  { href: "/purchase-payments", title: "ประวัติการจ่ายเงิน" },
  { href: "/receiving", title: "ตั๋วชั่งรับซื้อยาง" },
  { href: "/inventory/stock-inquiry", title: "ตรวจสอบสต๊อก" },
  { href: "/inventory/issues", title: "เบิกจ่ายสินค้า" },
  { href: "/inventory/stock-control", title: "นับและปรับปรุงสต๊อก" },
  { href: "/inventory/stock-balances", title: "ยอดคงเหลือ" },
  { href: "/inventory/stock-movements", title: "ความเคลื่อนไหวสต๊อก" },
  { href: "/inventory/lots", title: "Lot สินค้า" },
  { href: "/inventory/material-issues", title: "เบิกวัตถุดิบจากคลัง" },
  { href: "/inventory/chemical-issues", title: "เบิกจ่ายสารเคมี" },
  { href: "/inventory/stock-transfers", title: "โอนย้ายสินค้า" },
  { href: "/inventory/stock-counts", title: "นับสต๊อก" },
  { href: "/inventory/stock-adjustments", title: "ใบปรับปรุงสต๊อก" },
  { href: "/warehouse/approvals", title: "อนุมัติงานคลัง" },
  { href: "/warehouse/stock-posting-approvals", title: "อนุมัติรับยางเข้าคลัง" },
  { href: "/warehouse/production-output-approvals", title: "อนุมัติรับผลผลิตเข้าคลัง" },
  { href: "/receiving/pending-production-output", title: "รับผลผลิตเข้าคลัง" },
  { href: "/receiving/production-output/stock-requests", title: "ขอรับผลผลิตเข้าคลัง" },
  { href: "/users", title: "ผู้ใช้งาน" },
  { href: "/settings/roles", title: "Roles" },
  { href: "/settings/permissions", title: "Permission Matrix" },
  { href: "/settings/audit-logs", title: "Audit Log" },
  { href: "/reports/procurement", title: "รายงานจัดซื้อ" },
  { href: "/reports/inventory", title: "รายงานคลัง" },
  { href: "/reports/receiving", title: "รายงานรับซื้อยาง" },
  { href: "/reports/chemical-consumption", title: "รายงานการใช้สารเคมี" },
  { href: "/reports/payments", title: "รายงานจ่ายเงิน" },
  { href: "/masters/vendors", title: "เจ้าหนี้ / Supplier" },
  { href: "/masters/seller-types", title: "ประเภทผู้ขาย" },
  { href: "/masters/sellers", title: "ผู้ขายยาง" },
  { href: "/masters/seller-bank-accounts", title: "บัญชีธนาคารผู้ขาย" },
  { href: "/masters/trucks", title: "รถบรรทุก" },
  { href: "/masters/tire-classifications", title: "ประเภทสินค้า" },
  { href: "/masters/raw-tire-price-rules", title: "ราคายาง" },
  { href: "/masters/weighbridge-scales", title: "เครื่องชั่ง" },
  { href: "/masters/items", title: "สินค้า" },
  { href: "/masters/item-categories", title: "หมวดสินค้า" },
  { href: "/masters/units", title: "หน่วยนับ" },
  { href: "/warehouses", title: "คลังสินค้า" },
  { href: "/warehouse-locations", title: "ตำแหน่งจัดเก็บ" },
  { href: "/masters/payment-terms", title: "เงื่อนไขชำระเงิน" },
  { href: "/masters/tax-rates", title: "อัตราภาษี" },
  { href: "/masters/purchase-request-types", title: "ประเภทใบขอซื้อ" },
  { href: "/masters", title: "Master Data" },
];

function inventoryItemCategoryTitle(
  pathname: string,
  itemCategoryCode: string | null,
): string | null {
  const value = itemCategoryCode?.trim();
  if (!value || value.includes(",")) {
    return null;
  }

  const titleMap: Record<string, Record<string, string>> = {
    "/inventory/stock-balances": {
      RAW_MATERIAL: "ยอดคงเหลือวัตถุดิบ",
      FINISHED_GOODS: "ยอดคงเหลือสินค้าสำเร็จรูป",
    },
    "/inventory/lots": {
      RAW_MATERIAL: "Lot วัตถุดิบ",
      FINISHED_GOODS: "Lot สินค้าสำเร็จรูป",
    },
    "/inventory/stock-movements": {
      RAW_MATERIAL: "ความเคลื่อนไหววัตถุดิบ",
      FINISHED_GOODS: "ความเคลื่อนไหวสินค้าสำเร็จรูป",
    },
  };

  return titleMap[pathname]?.[value] ?? null;
}

function resolvePageTitle(pathname: string, itemCategoryCode?: string | null) {
  const categoryTitle = inventoryItemCategoryTitle(
    pathname,
    itemCategoryCode ?? null,
  );
  if (categoryTitle) {
    return categoryTitle;
  }

  if (pathname.startsWith("/purchase-requests/") && pathname.endsWith("/edit")) {
    return "แก้ไขใบขอซื้อ";
  }

  if (
    pathname.startsWith("/purchase-requests/") &&
    pathname !== "/purchase-requests/create" &&
    pathname !== "/purchase-requests/approvals"
  ) {
    return "รายละเอียดใบขอซื้อ";
  }

  if (pathname.startsWith("/quotations/") && pathname.endsWith("/edit")) {
    return "แก้ไขใบเสนอราคา";
  }

  if (
    pathname.startsWith("/quotations/") &&
    pathname !== "/quotations/create"
  ) {
    return "รายละเอียดใบเสนอราคา";
  }

  if (pathname === "/sales-orders/stock-verification") {
    return "ตรวจสอบสต๊อกขาย";
  }

  if (
    pathname.startsWith("/sales-orders/") &&
    pathname !== "/sales-orders"
  ) {
    return "รายละเอียดใบสั่งขาย";
  }

  if (pathname.includes("/stock-posting-request")) {
    return "ส่งคำขอรับเข้าคลัง";
  }

  if (pathname.includes("/receiving/production-output/stock-requests/create")) {
    return "ขอรับผลผลิตเข้าคลัง";
  }

  if (
    pathname.startsWith("/receiving/production-output/stock-requests/") &&
    pathname !== "/receiving/production-output/stock-requests"
  ) {
    return "รายละเอียดคำขอรับผลผลิต";
  }

  if (pathname === "/receiving/dashboard") {
    return "วิเคราะห์ภาพรวมรับซื้อยาง";
  }

  if (pathname === "/receiving/pending-production-output") {
    return "รับผลผลิตเข้าคลัง";
  }

  if (pathname === "/users" || pathname === "/user") {
    return "ผู้ใช้งาน";
  }

  if (/^\/receiving\/receipts\/[^/]+\/payment$/.test(pathname)) {
    return "จ่ายเงินผู้ขายยาง";
  }

  if (/^\/receiving\/receipts\/[^/]+$/.test(pathname)) {
    return "ใบรับซื้อ / คัดแยก";
  }

  if (/^\/receiving\/[^/]+\/classification$/.test(pathname)) {
    return "ใบรับซื้อ / คัดแยก";
  }

  if (/^\/receiving\/[^/]+$/.test(pathname)) {
    return "ตั๋วชั่งรับซื้อยาง";
  }

  const exact = PAGE_TITLES.find((item) => item.href === pathname);
  if (exact) {
    return exact.title;
  }

  const prefix = PAGE_TITLES.find(
    (item) =>
      item.href !== "/" &&
      item.href !== "/masters" &&
      pathname.startsWith(`${item.href}/`),
  );
  if (prefix) {
    return prefix.title;
  }

  if (pathname.startsWith("/masters")) {
    return "Master Data";
  }

  if (pathname === "/") {
    return "Dashboard";
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
  const searchParams = useSearchParams();
  const itemCategoryCode = searchParams.get("itemCategoryCode");

  const title = useMemo(
    () => resolvePageTitle(pathname, itemCategoryCode),
    [pathname, itemCategoryCode],
  );
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
