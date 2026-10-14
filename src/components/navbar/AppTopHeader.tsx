"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { App, Button, Empty, Popover, Typography } from "antd";
import dayjs from "dayjs";

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useNotificationsUnreadCountQuery,
} from "@/hooks/notifications/useNotificationsQueries";
import { useStoredUser } from "@/hooks/auth/useStoredUser";
import { initialsFromUser } from "@/lib/auth/session";
import { hasAccessToken } from "@/lib/auth/token";
import {
  isFgInventoryScope,
  isRmInventoryScope,
} from "@/components/inventory/inventory-page-copy";
import type { AppNotification } from "@/types/notifications";

import styles from "./AppTopHeader.module.css";

const PAGE_TITLES: Array<{ href: string; title: string }> = [
  { href: "/", title: "Portal" },
  { href: "/case", title: "Case / Issue" },
  { href: "/dashboard/executive", title: "ภาพรวมผู้บริหาร" },
  { href: "/inventory/dashboard", title: "หน้าหลักคลัง" },
  { href: "/receiving/dashboard", title: "ภาพรวมรับซื้อยาง" },
  { href: "/weighbridge/floor-scale-tickets", title: "ชั่งน้ำหนัก Floor Scale" },
  // เรียงจากเจาะจงไปกว้าง — รายการนี้จับแบบ prefix ถ้าเอาตัวกว้างขึ้นก่อน
  // หน้า create/detail จะได้ชื่อของหน้ารายการแทน
  // หน้ารายละเอียด/สร้างของเมนูเดิมยังเป็นหน้าจริง — ชื่อจึงต้องคงไว้
  // (หน้ารายการของทั้งสองกลายเป็น redirect ไป "ใบแปรสภาพวัตถุดิบ" แล้ว)
  { href: "/production/tire-prep-stages/create", title: "สร้างรอบเตรียมยาง" },
  { href: "/production/tire-prep-stages", title: "ขั้นตอนเตรียมยาง (ย้ายแล้ว)" },
  { href: "/production/rcb-processing/create", title: "สร้างรอบผลิต rCB" },
  { href: "/production/rcb-processing", title: "กระบวนการผลิต rCB (ย้ายแล้ว)" },
  {
    href: "/production/material-conversions/jobs/create",
    title: "เปิดใบงานแปรสภาพตามเส้นทาง",
  },
  {
    href: "/production/material-conversions/jobs",
    title: "ใบงานแปรสภาพตามเส้นทาง",
  },
  {
    href: "/production/material-conversions/create",
    title: "สร้างใบแปรสภาพวัตถุดิบ",
  },
  { href: "/production/material-conversions", title: "ใบแปรสภาพวัตถุดิบ" },
  {
    href: "/masters/production-formulas",
    title: "สูตรการผลิต",
  },
  {
    href: "/masters/material-conversion-routes",
    title: "เส้นทางแปรสภาพวัตถุดิบ",
  },
  { href: "/inventory/tire-prep-issues", title: "เบิกยางเข้ากระบวนการเตรียมยาง" },
  { href: "/hrm/employees", title: "ข้อมูลพนักงาน" },
  { href: "/hrm/shifts", title: "ตารางกะการทำงาน" },
  { href: "/hrm/shift-assignments", title: "รายการเข้ากะ" },
  { href: "/hrm/shutdown-plans", title: "แผนกำลังคนช่วง Shutdown" },
  { href: "/hrm/payroll", title: "เงินเดือน" },
  { href: "/hrm/attendance", title: "บันทึกเวลาเข้า-ออกงาน" },
  { href: "/hrm/attendance-devices", title: "เครื่องสแกนนิ้ว/RFID" },
  { href: "/hrm/overtime-requests", title: "คำขอทำงานล่วงเวลา (OT)" },
  { href: "/hrm/leave-requests", title: "คำขอลางาน" },
  { href: "/maintenance/equipment", title: "อุปกรณ์/เครื่องจักร" },
  { href: "/maintenance/work-orders", title: "ใบสั่งงานซ่อมบำรุง" },
  { href: "/maintenance/pm-schedules", title: "แผนบำรุงรักษา (PM)" },
  { href: "/maintenance/shutdown-plans", title: "แผนซ่อมบำรุงช่วง Shutdown" },
  { href: "/oil-tank-farm/tanks", title: "จัดการถังเก็บน้ำมัน" },
  { href: "/oil-tank-farm/receivings", title: "รับน้ำมันเข้าถัง" },
  { href: "/oil-tank-farm/transfers", title: "โอนย้ายน้ำมันระหว่างถัง" },
  { href: "/oil-tank-farm/dispatches", title: "จ่ายน้ำมันออกจากถัง" },
  { href: "/production/production-requests", title: "ใบขอผลิต (จากใบสั่งขาย)" },
  { href: "/production/dashboard", title: "แดชบอร์ดการผลิต" },
  { href: "/production/schedule", title: "ตารางการผลิต" },
  { href: "/production/production-orders", title: "ใบสั่งผลิต (Pyrolysis)" },
  { href: "/production/cycles", title: "รอบผลิต (Cycle 45+3 วัน)" },
  { href: "/production/machine-integration", title: "อุปกรณ์เครื่องจักร (Machine Integration)" },
  { href: "/production/tire-prep-stages", title: "ขั้นตอนเตรียมยาง" },
  { href: "/production/rcb-processing", title: "กระบวนการผลิต rCB" },
  { href: "/production/material-conversions", title: "ใบแปรสภาพวัตถุดิบ" },
  { href: "/reports/ar-aging", title: "รายงานสถานะลูกหนี้" },
  { href: "/reports/journals/purchases", title: "สมุดรายวันซื้อ" },
  { href: "/reports/journals/sales", title: "สมุดรายวันขาย" },
  { href: "/reports/journals/receipts", title: "สมุดรายวันรับ" },
  { href: "/reports/journals/payments", title: "สมุดรายวันจ่าย" },
  { href: "/procurement/tracking", title: "ติดตามการจัดซื้อ" },
  { href: "/purchase-orders/approvals", title: "อนุมัติใบสั่งซื้อ" },
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
  {
    href: "/delivery-orders/create-from-packing",
    title: "สร้างใบส่งจากใบบรรจุ",
  },
  { href: "/delivery-orders", title: "ใบส่งสินค้า" },
  { href: "/return-notes/create", title: "สร้างใบคืนสินค้า" },
  { href: "/return-notes/inspections", title: "รอตรวจสอบสินค้าคืน" },
  { href: "/return-notes", title: "คืนสินค้า / ใบคืนสินค้า" },
  { href: "/sales-invoices/pending", title: "รอออกใบแจ้งหนี้" },
  { href: "/sales-invoices", title: "ใบแจ้งหนี้ขาย" },
  { href: "/sales-credit-notes", title: "ใบลดหนี้" },
  { href: "/sales-tracking", title: "ติดตามการขายและจัดส่ง" },
  { href: "/customers/sales-orders-in-production", title: "ใบสั่งขายที่ส่งผลิต" },
  { href: "/customers", title: "ข้อมูลลูกค้า" },
  { href: "/laboratory/samples", title: "ตัวอย่างตรวจสอบ (LIMS)" },
  { href: "/laboratory/specs", title: "Spec การตรวจ (LIMS)" },
  { href: "/goods-receipts", title: "รับสินค้าเข้าคลัง (PO)" },
  { href: "/purchase-payments/pending", title: "รอจ่ายเงิน Supplier" },
  { href: "/purchase-payments", title: "ประวัติการจ่ายเงิน" },
  { href: "/finance/payables/adjustment-documents", title: "เอกสารปรับหนี้" },
  { href: "/finance/payables/billing-and-vouchers", title: "วางบิลและใบสำคัญจ่าย" },
  { href: "/finance/payables/ap-invoices", title: "ใบตั้งหนี้เจ้าหนี้" },
  { href: "/finance/payables/debit-notes", title: "ใบเพิ่มหนี้" },
  { href: "/finance/payables/credit-notes", title: "ใบลดหนี้" },
  { href: "/finance/payables/billing-notes", title: "ใบวางบิล" },
  { href: "/finance/payables/payment-vouchers", title: "ใบสำคัญจ่าย" },
  { href: "/finance/payables/payment-records", title: "บันทึกจ่ายเงิน" },
  { href: "/finance/payables/payment-history", title: "ประวัติการจ่ายเงิน" },
  { href: "/finance/payables/creditors", title: "รายการจ่ายเงิน" },
  { href: "/finance/receivables/sales-tax-documents", title: "เอกสารขายและภาษี" },
  { href: "/finance/receivables/adjustment-documents", title: "เอกสารปรับหนี้" },
  { href: "/finance/receivables/collections-and-receipts", title: "รับชำระและใบเสร็จ" },
  { href: "/finance/receivables/ar-invoices", title: "ใบตั้งลูกหนี้" },
  { href: "/finance/receivables/tax-invoices", title: "ใบกำกับภาษี" },
  { href: "/finance/receivables/debit-notes", title: "ใบเพิ่มหนี้" },
  { href: "/finance/receivables/credit-notes", title: "ใบลดหนี้" },
  { href: "/finance/receivables/payment-receipts", title: "รับชำระเงิน" },
  { href: "/finance/receivables/payment-history", title: "ประวัติการรับชำระ" },
  { href: "/finance/receivables/customers", title: "รายการรับเงิน" },
  { href: "/finance/receivables/receipts", title: "ใบเสร็จรับเงิน" },
  { href: "/finance/receivables/refunds", title: "คืนเงิน" },
  { href: "/finance/reports/debit-credit-notes", title: "รายงานใบเพิ่มหนี้ / ใบลดหนี้" },
  { href: "/finance/reports/payables", title: "รายงานเจ้าหนี้" },
  { href: "/finance/reports/receivables", title: "รายงานลูกหนี้" },
  { href: "/finance/reports/payments", title: "รายงานการจ่ายเงิน" },
  { href: "/finance/reports/collections", title: "รายงานการรับเงิน" },
  { href: "/finance/reports/sales-tax", title: "รายงานภาษีขาย" },
  { href: "/finance/dashboard", title: "ภาพรวมการเงิน" },
  { href: "/finance/payables", title: "การจ่ายเงิน" },
  { href: "/finance/receivables", title: "การรับเงิน" },
  { href: "/finance/reports", title: "รายงานการเงิน" },
  { href: "/finance", title: "การเงิน" },
  { href: "/receiving", title: "ตั๋วชั่งรับซื้อยาง" },
  { href: "/inventory/stock-inquiry", title: "ตรวจสอบสต๊อก" },
  { href: "/inventory/stock-control", title: "นับและปรับปรุงสต๊อก" },
  { href: "/inventory/stock-balances", title: "ยอดคงเหลือ" },
  { href: "/inventory/stock-movements", title: "ความเคลื่อนไหวสต๊อก" },
  { href: "/inventory/lots", title: "Lot สินค้า" },
  { href: "/inventory/material-issues", title: "เบิกวัตถุดิบจากคลัง" },
  { href: "/inventory/chemical-issues", title: "เบิกสารเคมี" },
  { href: "/inventory/chemical-lots", title: "Lot สารเคมี / ตรวจ COA" },
  { href: "/inventory/stock-transfers", title: "โอนย้ายสินค้า" },
  { href: "/inventory/stock-counts", title: "นับสต๊อก" },
  { href: "/inventory/stock-adjustments", title: "ใบปรับปรุงสต๊อก" },
  { href: "/warehouse/approvals", title: "อนุมัติงานคลัง" },
  { href: "/warehouse/stock-posting-approvals", title: "อนุมัติรับยางเข้าคลัง" },
  { href: "/warehouse/production-output-approvals", title: "อนุมัติรับผลผลิตเข้าคลัง" },
  {
    href: "/receiving/pending-production-output",
    title: "ใบสั่งผลิตรอรับเข้าคลัง",
  },
  { href: "/production/output-stock-requests", title: "ขอรับผลผลิตเข้าคลัง" },
  { href: "/users", title: "ผู้ใช้งาน" },
  { href: "/settings/roles", title: "Roles" },
  { href: "/settings/audit-logs", title: "Audit Log" },
  { href: "/settings/ai-ocr", title: "ตั้งค่า AI อ่านเอกสาร" },
  { href: "/reports/stock-movements", title: "รายงานแสดงสรุปยอดเคลื่อนไหวสินค้า" },
  { href: "/reports/stock-balance", title: "รายงานแสดงสินค้าคงเหลือ" },
  { href: "/reports/sales-by-item", title: "รายงานสรุปยอดขาย" },
  { href: "/reports/raw-material-cost", title: "รายงานต้นทุนวัตถุดิบ" },
  { href: "/reports/receiving", title: "รายงานรับซื้อรายวัน / รายเดือน" },
  { href: "/masters/vendors", title: "เจ้าหนี้ / Supplier" },
  { href: "/masters/seller-types", title: "ประเภทผู้ขาย" },
  { href: "/masters/sellers", title: "ผู้ขายยาง" },
  { href: "/masters/seller-bank-accounts", title: "บัญชีธนาคารผู้ขาย" },
  { href: "/masters/trucks", title: "รถบรรทุก" },
  { href: "/masters/tire-classifications", title: "ประเภทสินค้า" },
  { href: "/masters/raw-tire-price-rules", title: "ราคายาง" },
  { href: "/masters/weighbridge-scales", title: "เครื่องชั่ง" },
  { href: "/masters/items", title: "สินค้า" },
  { href: "/masters/chemicals", title: "สารเคมี" },
  { href: "/masters/item-categories", title: "หมวดสินค้า" },
  { href: "/masters/unit-conversions", title: "กฎแปลงหน่วยนับ" },
  { href: "/masters/units", title: "หน่วยนับ" },
  { href: "/warehouses", title: "คลังสินค้า" },
  { href: "/masters/warehouse-types", title: "ประเภทคลัง" },
  { href: "/warehouse-locations", title: "ตำแหน่งจัดเก็บ" },
  {
    href: "/masters/stock-adjustment-types",
    title: "ประเภทใบปรับปรุงสต๊อก",
  },
  { href: "/masters/payment-terms", title: "เงื่อนไขชำระเงิน" },
  { href: "/masters/tax-rates", title: "อัตราภาษี" },
  { href: "/masters/purchase-request-types", title: "ประเภทใบขอซื้อ" },
  { href: "/masters/company-profile", title: "ข้อมูลบริษัท" },
  { href: "/masters", title: "Master Data" },
];

function inventoryScopeTitle(
  pathname: string,
  searchParams: { get(name: string): string | null } | null,
): string | null {
  const fgTitleMap: Record<string, string> = {
    "/inventory/stock-balances": "ยอดคงเหลือสินค้าสำเร็จรูป",
    "/inventory/lots": "Lot สินค้าสำเร็จรูป",
    "/inventory/stock-movements": "ความเคลื่อนไหวสินค้าสำเร็จรูป",
    "/inventory/stock-inquiry": "ตรวจสอบสต๊อกสินค้าสำเร็จรูป",
  };
  if (isFgInventoryScope(searchParams)) {
    return fgTitleMap[pathname] ?? null;
  }

  const rmTitleMap: Record<string, string> = {
    "/inventory/stock-balances": "ยอดคงเหลือวัตถุดิบ",
    "/inventory/lots": "Lot วัตถุดิบ",
    "/inventory/stock-movements": "ความเคลื่อนไหววัตถุดิบ",
  };
  if (isRmInventoryScope(searchParams)) {
    return rmTitleMap[pathname] ?? null;
  }

  return null;
}

function resolvePageTitle(
  pathname: string,
  searchParams: { get(name: string): string | null } | null,
  tab?: string | null,
) {
  const categoryTitle = inventoryScopeTitle(pathname, searchParams);
  if (categoryTitle) {
    return categoryTitle;
  }

  if (pathname === "/inventory/dashboard") {
    const scope = searchParams?.get("scope");
    if (scope === "rm") {
      return "หน้าหลักคลังวัตถุดิบ";
    }
    if (scope === "fg") {
      return "หน้าหลักคลังสินค้าสำเร็จรูป";
    }
  }

  // ใบตั้งหนี้ / ใบเพิ่มหนี้เจ้าหนี้ — หน้าย่อยของ /finance/payables/{ap-invoices,debit-notes}
  for (const [base, label] of [
    ["/finance/payables/ap-invoices", "ใบตั้งหนี้"],
    ["/finance/payables/debit-notes", "ใบเพิ่มหนี้"],
  ] as const) {
    if (!pathname.startsWith(`${base}/`)) continue;
    if (pathname === `${base}/create`) return `สร้าง${label}`;
    if (pathname.endsWith("/edit")) return `แก้ไข${label}`;
    return `รายละเอียด${label}`;
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

  if (/^\/sales-orders\/[^/]+\/stock-verification$/.test(pathname)) {
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

  if (pathname.includes("/production/output-stock-requests/create")) {
    return "ขอรับผลผลิตเข้าคลัง";
  }

  if (
    pathname.startsWith("/production/output-stock-requests/") &&
    pathname !== "/production/output-stock-requests"
  ) {
    return "รายละเอียดคำขอรับผลผลิต";
  }

  if (pathname === "/receiving/dashboard") {
    return "วิเคราะห์ภาพรวมรับซื้อยาง";
  }

  if (pathname === "/receiving/pending-production-output") {
    return "ใบสั่งผลิตรอรับเข้าคลัง";
  }

  if (pathname === "/profile") {
    return "โปรไฟล์ของฉัน";
  }

  if (pathname === "/users" || pathname === "/user") {
    if (tab === "departments") {
      return "แผนก";
    }
    if (tab === "roles") {
      return "บทบาท";
    }
    if (tab === "permissions") {
      return "สิทธิ์";
    }
    if (tab === "notifications") {
      return "การแจ้งเตือน";
    }
    return "ผู้ใช้งาน";
  }


  if (/^\/receiving\/receipts\/[^/]+\/warehouse-receipt$/.test(pathname)) {
    return "ใบรับสินค้าเข้าคลัง";
  }

  if (/^\/receiving\/receipts\/[^/]+\/payment$/.test(pathname)) {
    return "ออกใบจ่ายเงิน";
  }

  if (/^\/receiving\/receipts\/[^/]+$/.test(pathname)) {
    return "ตั๋วชั่ง / ใบรับซื้อ";
  }

  if (/^\/receiving\/[^/]+\/classification$/.test(pathname)) {
    return "ตั๋วชั่ง / คัดแยก";
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
    return "Portal";
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
  const router = useRouter();
  const { notification } = App.useApp();
  const usersTab = searchParams.get("tab");
  const isLoggedIn = hasAccessToken();
  const storedUser = useStoredUser();
  const [open, setOpen] = useState(false);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  const title = useMemo(
    () => resolvePageTitle(pathname, searchParams, usersTab),
    [pathname, searchParams, usersTab],
  );
  const todayLabel = useMemo(() => formatThaiDate(new Date()), []);

  const listQuery = useNotificationsQuery({ enabled: isLoggedIn });
  const unreadQuery = useNotificationsUnreadCountQuery({
    enabled: isLoggedIn,
  });
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const notifications = listQuery.data?.data ?? [];
  const unreadCount = unreadQuery.data?.data.count ?? 0;

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    const unread = notifications.filter((row) => !row.read);
    if (!primedRef.current) {
      unread.forEach((row) => toastedIdsRef.current.add(row.id));
      primedRef.current = true;
      return;
    }
    for (const row of unread) {
      if (toastedIdsRef.current.has(row.id)) {
        continue;
      }
      toastedIdsRef.current.add(row.id);
      const toastArgs = {
        title: row.title,
        description: row.message,
        placement: "bottomRight" as const,
        duration: 6,
        onClick: () => {
          void handleOpenNotification(row);
        },
      };
      if (row.type === "LOW_STOCK") {
        notification.warning(toastArgs);
      } else {
        notification.info(toastArgs);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOpenNotification uses latest mutations
  }, [isLoggedIn, notifications, notification]);

  async function handleOpenNotification(row: AppNotification) {
    setOpen(false);
    if (!row.read) {
      try {
        await markReadMutation.mutateAsync(row.id);
      } catch {
        // navigation still useful even if mark-read fails
      }
    }
    router.push(row.href || "/inventory/stock-balances");
  }

  const panel = (
    <div className={styles.notifPanel}>
      <div className={styles.notifHeader}>
        <Typography.Text strong>การแจ้งเตือน</Typography.Text>
        {unreadCount > 0 ? (
          <Button
            type="link"
            size="small"
            loading={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            อ่านทั้งหมด
          </Button>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="ยังไม่มีการแจ้งเตือน"
        />
      ) : (
        <ul className={styles.notifList}>
          {notifications.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className={`${styles.notifItem} ${
                  row.read
                    ? ""
                    : row.type === "LOW_STOCK"
                      ? styles.notifItemUnreadLowStock
                      : styles.notifItemUnread
                }`}
                onClick={() => void handleOpenNotification(row)}
              >
                <span className={styles.notifItemTitle}>{row.title}</span>
                <span className={styles.notifItemMessage}>{row.message}</span>
                <span className={styles.notifItemMeta}>
                  {dayjs(row.createdAt).format("DD/MM/YYYY HH:mm")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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

          {isLoggedIn ? (
            <Popover
              trigger="click"
              placement="bottomRight"
              open={open}
              onOpenChange={setOpen}
              content={panel}
              arrow={false}
            >
              <button
                type="button"
                className={styles.bellButton}
                aria-label="การแจ้งเตือน"
              >
                <IconBell />
                {unreadCount > 0 ? (
                  <span className={styles.bellBadge}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>
            </Popover>
          ) : (
            <button
              type="button"
              className={styles.bellButton}
              aria-label="การแจ้งเตือน"
              disabled
              title="เข้าสู่ระบบเพื่อดูการแจ้งเตือน"
            >
              <IconBell />
            </button>
          )}

          {isLoggedIn ? (
            <button
              type="button"
              className={styles.profileButton}
              onClick={() => router.push("/profile")}
              title={`โปรไฟล์ของฉัน${
                storedUser?.displayName ? ` — ${storedUser.displayName}` : ""
              }`}
              aria-label="โปรไฟล์ของฉัน"
            >
              {initialsFromUser(storedUser)}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
