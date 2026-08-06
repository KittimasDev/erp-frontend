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
import { isAdministrator } from "@/lib/auth/session";
import type { AppNotification } from "@/types/notifications";

import styles from "./AppTopHeader.module.css";

const PAGE_TITLES: Array<{ href: string; title: string }> = [
  { href: "/", title: "Portal" },
  { href: "/case", title: "Case / Issue" },
  { href: "/dashboard/executive", title: "ภาพรวมผู้บริหาร" },
  { href: "/inventory/dashboard", title: "ภาพรวมคลังสินค้า" },
  { href: "/receiving/dashboard", title: "ภาพรวมรับซื้อยาง" },
  { href: "/weighbridge/floor-scale-tickets", title: "ชั่งน้ำหนัก Floor Scale" },
  { href: "/production/tire-prep-stages", title: "ขั้นตอนเตรียมยาง" },
  { href: "/production/rcb-processing", title: "กระบวนการผลิต rCB" },
  { href: "/inventory/tire-prep-issues", title: "เบิกยางเข้ากระบวนการเตรียมยาง" },
  { href: "/hrm/employees", title: "ข้อมูลพนักงาน" },
  { href: "/hrm/attendance", title: "บันทึกเวลาเข้า-ออกงาน" },
  { href: "/hrm/overtime-requests", title: "คำขอทำงานล่วงเวลา (OT)" },
  { href: "/hrm/leave-requests", title: "คำขอลางาน" },
  { href: "/maintenance/equipment", title: "อุปกรณ์/เครื่องจักร" },
  { href: "/maintenance/work-orders", title: "ใบสั่งงานซ่อมบำรุง" },
  { href: "/maintenance/pm-schedules", title: "แผนบำรุงรักษา (PM)" },
  { href: "/oil-tank-farm/tanks", title: "จัดการถังเก็บน้ำมัน" },
  { href: "/oil-tank-farm/receivings", title: "รับน้ำมันเข้าถัง" },
  { href: "/oil-tank-farm/transfers", title: "โอนย้ายน้ำมันระหว่างถัง" },
  { href: "/oil-tank-farm/dispatches", title: "จ่ายน้ำมันออกจากถัง" },
  { href: "/production/production-orders", title: "ใบสั่งผลิต (Pyrolysis)" },
  { href: "/reports/ar-aging", title: "รายงานลูกหนี้คงค้าง" },
  { href: "/reports/sales-invoices", title: "รายงานใบแจ้งหนี้" },
  { href: "/reports/sales-payments", title: "รายงานรับชำระเงิน" },
  { href: "/procurement/tracking", title: "ติดตามจัดซื้อ" },
  { href: "/purchase-orders", title: "ใบสั่งซื้อ PO" },
  { href: "/purchase-orders/receive", title: "รับของ (PO)" },
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
  { href: "/customers", title: "ข้อมูลลูกค้า" },
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

function resolvePageTitle(
  pathname: string,
  itemCategoryCode?: string | null,
  tab?: string | null,
) {
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
    if (tab === "departments") {
      return "แผนก";
    }
    if (tab === "roles") {
      return "บทบาท";
    }
    if (tab === "permissions") {
      return "สิทธิ์";
    }
    return "ผู้ใช้งาน";
  }

  if (/^\/purchase-orders\/[^/]+\/receive$/.test(pathname)) {
    return "รับของจากใบสั่งซื้อ";
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
  const itemCategoryCode = searchParams.get("itemCategoryCode");
  const usersTab = searchParams.get("tab");
  const isAdmin = isAdministrator();
  const [open, setOpen] = useState(false);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  const title = useMemo(
    () => resolvePageTitle(pathname, itemCategoryCode, usersTab),
    [pathname, itemCategoryCode, usersTab],
  );
  const todayLabel = useMemo(() => formatThaiDate(new Date()), []);

  const listQuery = useNotificationsQuery({ enabled: isAdmin });
  const unreadQuery = useNotificationsUnreadCountQuery({ enabled: isAdmin });
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllMutation = useMarkAllNotificationsReadMutation();

  const notifications = listQuery.data?.data ?? [];
  const unreadCount = unreadQuery.data?.data.count ?? 0;

  useEffect(() => {
    if (!isAdmin) {
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
      notification.warning({
        title: row.title,
        description: row.message,
        placement: "bottomRight",
        duration: 6,
        onClick: () => {
          void handleOpenNotification(row);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleOpenNotification uses latest mutations
  }, [isAdmin, notifications, notification]);

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
                  row.read ? "" : styles.notifItemUnread
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

          {isAdmin ? (
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
              title="การแจ้งเตือนสต๊อกต่ำสำหรับผู้ดูแลระบบ"
            >
              <IconBell />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
