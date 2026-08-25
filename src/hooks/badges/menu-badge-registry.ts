"use client";

import type { UseQueryOptions } from "@tanstack/react-query";

import { PORTAL_MODULES } from "@/components/home/portal-modules";
import { readyPackingsForDeliveryCountOptions } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { readyPickingsForPackingCountOptions } from "@/hooks/packings/usePackingsQuery";
import { readySalesOrdersForPickingCountOptions } from "@/hooks/pickings/usePickingsQuery";
import {
  pendingProductionOutputApprovalsCountOptions,
  pendingProductionOutputStockRequestsCountOptions,
  pendingProductionOutputTicketsCountOptions,
} from "@/hooks/production-output/useProductionOutputQueries";
import { linkedSalesOrdersCountOptions } from "@/hooks/production-requests/useProductionRequestQueries";
import { pendingPurchaseOrderApprovalsCountOptions } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { pendingPurchasePaymentsCountOptions } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import {
  pendingPurchaseRequestApprovalsCountOptions,
  purchaseOrdersPendingFromPrCountOptions,
} from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { pendingSalesInvoicesCountOptions } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { pendingStockVerificationCountOptions } from "@/hooks/sales-orders/useSalesOrdersQuery";
import { pendingStockPostingApprovalsCountOptions } from "@/hooks/stock-posting/useStockPostingQueries";

/**
 * ทะเบียนกลางของ badge จำนวนคิวงานค้าง — แหล่งเดียวที่ทั้ง sidebar (AppHeader)
 * และกล่องโมดูลหน้าแรก (HomePortalPage) อ่าน
 *
 * เดิม badge ถูกต่อสายด้วยมือ 3 ที่ที่ไม่รู้จักกัน (hook / AppHeader ternary /
 * HomePortalPage ternary) เพิ่มตัวใหม่แล้วลืมที่ใดที่หนึ่งก็นับขาด — ซึ่งเกิดขึ้นจริง
 * กับ "อนุมัติใบสั่งซื้อ" ที่ขึ้นใน sidebar แต่หน้าแรกไม่นับ
 *
 * **เพิ่ม badge ใหม่ = เพิ่ม entry ที่นี่ที่เดียว** กล่องหน้าแรกรวมยอดเองจาก
 * `screenCode` ที่ตรงกับ `screenCodes` ของโมดูล
 *
 * เก็บเป็น query-options factory ไม่ใช่ hook เพราะ `useMenuBadgeCounts` ต้อง
 * เอาไปยัด `useQueries` — เรียก hook ใน .map() ผิด Rules of Hooks
 */
export type MenuBadgeKind = "approval" | "action";

export type MenuBadgeEntry = {
  /** ตรงกับ MenuItem.key ใน AppHeader */
  menuKey: string;
  /** ใช้รวมยอดเข้ากล่องหน้าแรก — ต้องอยู่ใน screenCodes ของโมดูลใดโมดูลหนึ่ง */
  screenCode: string;
  kind: MenuBadgeKind;
  /** ข้อความไทยสำหรับ tooltip แยกรายเมนู */
  label: string;
  /** เมนูถูกซ่อนอยู่ (HIDDEN_MENU_KEYS) — ไม่ยิง query และไม่นับเข้ากล่อง */
  hidden?: boolean;
  options: (ctx: {
    enabled: boolean;
  }) => UseQueryOptions<unknown, Error, number>;
};

/**
 * ลำดับเป็นส่วนหนึ่งของ contract — ต่อท้ายได้ **ห้าม filter ห้าม sort**
 * เพราะ `useQueries` จับคู่ผลลัพธ์กับ entry ตาม index
 * (feature flag / สิทธิ์ ให้พับเข้าไปใน enabled ของ entry ไม่ใช่ตัดออกจาก array)
 */
export const MENU_BADGE_REGISTRY: readonly MenuBadgeEntry[] = [
  // ─── รับซื้อยาง ───────────────────────────────────────────────────────────
  {
    menuKey: "stock-posting-approvals",
    screenCode: "STOCK_POSTING_APPROVALS",
    kind: "approval",
    label: "อนุมัติรับยางเข้าคลัง",
    options: (ctx) =>
      pendingStockPostingApprovalsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },

  // ─── จัดซื้อทั่วไป ────────────────────────────────────────────────────────
  {
    menuKey: "purchase-request-approvals",
    screenCode: "PURCHASE_REQUEST_APPROVALS",
    kind: "approval",
    label: "อนุมัติใบขอซื้อ",
    options: (ctx) =>
      pendingPurchaseRequestApprovalsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    // badge บนเมนูใบสั่งซื้อ = ใบขอซื้อที่อนุมัติแล้วรอเปิด PO (ไม่ใช่จำนวน PO)
    menuKey: "purchase-orders",
    screenCode: "PURCHASE_ORDERS",
    kind: "action",
    label: "ใบขอซื้อรอสร้าง PO",
    options: (ctx) =>
      purchaseOrdersPendingFromPrCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    menuKey: "purchase-order-approvals",
    screenCode: "PURCHASE_ORDER_APPROVALS",
    kind: "approval",
    label: "อนุมัติใบสั่งซื้อ",
    options: (ctx) =>
      pendingPurchaseOrderApprovalsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },

  // ─── การผลิต ─────────────────────────────────────────────────────────────
  {
    menuKey: "production-output-stock-requests",
    screenCode: "PRODUCTION_OUTPUT_STOCK_REQUESTS",
    kind: "approval",
    label: "ขอรับผลผลิตเข้าคลังรออนุมัติ",
    options: (ctx) =>
      pendingProductionOutputStockRequestsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    menuKey: "pending-production-output",
    screenCode: "PENDING_PRODUCTION_OUTPUT",
    kind: "action",
    label: "ตั๋วผลิตรอรับเข้าคลัง",
    options: (ctx) =>
      pendingProductionOutputTicketsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },

  // ─── คลังสินค้าสำเร็จรูป ──────────────────────────────────────────────────
  {
    menuKey: "production-output-approvals",
    screenCode: "PRODUCTION_OUTPUT_APPROVALS",
    kind: "approval",
    label: "อนุมัติรับผลผลิตเข้าคลัง",
    options: (ctx) =>
      pendingProductionOutputApprovalsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    menuKey: "sd-stock-verification",
    screenCode: "SALES_STOCK_VERIFICATION",
    kind: "action",
    label: "รอตรวจสอบสต๊อกขาย",
    options: (ctx) =>
      pendingStockVerificationCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    menuKey: "pickings",
    screenCode: "PICKINGS",
    kind: "action",
    label: "รอจ่ายสินค้า",
    options: (ctx) =>
      readySalesOrdersForPickingCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    menuKey: "packings",
    screenCode: "PACKINGS",
    kind: "action",
    label: "รอบรรจุสินค้า",
    options: (ctx) =>
      readyPickingsForPackingCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    menuKey: "delivery-orders",
    screenCode: "DELIVERY_ORDERS",
    kind: "action",
    label: "รอออกใบส่งสินค้า",
    options: (ctx) =>
      readyPackingsForDeliveryCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },

  // ─── ขายและจัดส่ง ────────────────────────────────────────────────────────
  {
    menuKey: "sales-orders-in-production",
    screenCode: "SALES_ORDERS_IN_PRODUCTION",
    kind: "action",
    label: "ใบสั่งขายรอยืนยันหลังส่งผลิต",
    options: (ctx) =>
      linkedSalesOrdersCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
  {
    // เมนูนี้อยู่ใน HIDDEN_MENU_KEYS ของ AppHeader — ลงทะเบียนไว้แต่ยังไม่ทำงาน
    // วันที่เลิกซ่อนเมนูกลุ่มใบแจ้งหนี้ ให้ลบ hidden ออกแล้ว badge ทำงานทันที
    menuKey: "sales-invoices-pending",
    screenCode: "SALES_INVOICES_PENDING",
    kind: "action",
    label: "รอออกใบแจ้งหนี้",
    hidden: true,
    options: (ctx) =>
      pendingSalesInvoicesCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },

  // ─── การเงิน ─────────────────────────────────────────────────────────────
  {
    menuKey: "purchase-payments-pending",
    screenCode: "PURCHASE_PAYMENTS_PENDING",
    kind: "action",
    label: "รอจ่ายเงิน Supplier",
    options: (ctx) =>
      pendingPurchasePaymentsCountOptions(ctx) as UseQueryOptions<
        unknown,
        Error,
        number
      >,
  },
];

if (process.env.NODE_ENV !== "production") {
  const seenMenuKeys = new Set<string>();
  for (const entry of MENU_BADGE_REGISTRY) {
    if (seenMenuKeys.has(entry.menuKey)) {
      console.error(
        `[menu-badge-registry] menuKey ซ้ำ: ${entry.menuKey} — badge จะทับกัน`,
      );
    }
    seenMenuKeys.add(entry.menuKey);

    const owners = PORTAL_MODULES.filter((mod) =>
      mod.screenCodes.includes(entry.screenCode),
    );
    if (owners.length === 0) {
      console.error(
        `[menu-badge-registry] ${entry.screenCode} ไม่อยู่ใน screenCodes ของกล่องไหนเลย — ` +
          `badge จะขึ้นที่ sidebar แต่หน้าแรกจะไม่นับ`,
      );
    } else if (owners.length > 1) {
      console.error(
        `[menu-badge-registry] ${entry.screenCode} อยู่ในหลายกล่อง (${owners
          .map((mod) => mod.key)
          .join(", ")}) — จะถูกนับซ้ำ`,
      );
    }
  }
}
