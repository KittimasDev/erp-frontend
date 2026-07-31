"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import {
  AlertOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  TeamOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useExecutiveSummaryQuery } from "@/hooks/executive-dashboard/useExecutiveSummaryQuery";
import { useProcurementSummaryQuery } from "@/hooks/procurement-dashboard/useProcurementSummaryQuery";
import { useWarehouseDashboardSummaryQuery } from "@/hooks/warehouse-dashboard/useWarehouseDashboardSummaryQuery";
import { useWeighbridgeDashboardQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeDashboardQuery";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  getStoredUser,
  isAdministrator,
  userHasRole,
  type StoredUser,
} from "@/lib/auth/session";
import { hasAccessToken } from "@/lib/auth/token";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";

import styles from "./HomeDashboardPage.module.css";

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("th-TH", {
    maximumFractionDigits: 0,
  });
}

function formatQty(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function canAccessWarehouse() {
  return (
    isAdministrator() ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

function canAccessProcurement() {
  return (
    isAdministrator() ||
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

function canAccessReceiving() {
  return (
    isAdministrator() ||
    userHasRole(RoleCode.WEIGHBRIDGE_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

function canAccessProduction() {
  return (
    isAdministrator() ||
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

type KpiCard = {
  key: string;
  label: string;
  value: string;
  hint: string;
  href: string;
  tone?: "default" | "warn" | "accent";
};

export default function HomeDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const ready = mounted && hasAccessToken();
  const showProduction = ready && canAccessProduction();
  const showQuickReceiving = ready && canAccessReceiving();
  const showQuickWarehouse = ready && canAccessWarehouse();
  const showQuickProcurement = ready && canAccessProcurement();

  const execQuery = useExecutiveSummaryQuery({ enabled: ready });
  const warehouseQuery = useWarehouseDashboardSummaryQuery({
    enabled: ready,
  });
  const procurementQuery = useProcurementSummaryQuery(
    {},
    { enabled: ready },
  );
  const weighbridgeQuery = useWeighbridgeDashboardQuery(undefined, {
    enabled: ready,
  });

  const exec = execQuery.isSuccess ? execQuery.data?.data : undefined;
  const warehouse = warehouseQuery.isSuccess
    ? warehouseQuery.data?.data
    : undefined;
  const procurement = procurementQuery.isSuccess
    ? procurementQuery.data?.data
    : undefined;
  const receiving = weighbridgeQuery.isSuccess
    ? weighbridgeQuery.data?.data.summary
    : undefined;

  const loading =
    !mounted ||
    (ready &&
      (execQuery.isLoading ||
        warehouseQuery.isLoading ||
        procurementQuery.isLoading ||
        weighbridgeQuery.isLoading));

  const trendData = useMemo(
    () =>
      (warehouse?.monthlyMovementTrend ?? []).map((row) => ({
        month: row.month.slice(5),
        เข้า: Number(row.quantityIn) || 0,
        ออก: Number(row.quantityOut) || 0,
      })),
    [warehouse?.monthlyMovementTrend],
  );

  const kpiCards = useMemo(() => {
    const cards: KpiCard[] = [];

    if (exec) {
      cards.push({
        key: "pending",
        label: "รอดำเนินการรวม",
        value: String(exec.pendingApprovalsCount),
        hint: "ข้ามโมดูลขาย / จัดซื้อ / คลัง",
        href: "/purchase-orders",
        tone: exec.pendingApprovalsCount > 0 ? "warn" : "default",
      });
      cards.push({
        key: "inventory-value",
        label: "มูลค่าสต๊อกรวม",
        value: formatMoney(exec.totalInventoryValue),
        hint: "บาท",
        href: "/inventory/stock-balances",
        tone: "accent",
      });
      cards.push({
        key: "sales",
        label: "ยอดขายรวม",
        value: formatMoney(exec.totalSalesAmount),
        hint: "บาท",
        href: "/sales-orders",
      });
      cards.push({
        key: "procurement-amount",
        label: "ยอดจัดซื้อรวม",
        value: formatMoney(exec.totalProcurementAmount),
        hint: "บาท",
        href: "/procurement/tracking",
      });
    } else if (warehouse) {
      cards.push({
        key: "stock-value",
        label: "มูลค่าสต๊อก",
        value: formatMoney(warehouse.totalStockValue),
        hint: "บาท",
        href: "/inventory/stock-balances",
        tone: "accent",
      });
      cards.push({
        key: "low-stock",
        label: "สต๊อกต่ำกว่าขั้นต่ำ",
        value: String(warehouse.lowStockCount),
        hint: "รายการสินค้า",
        href: "/inventory/stock-balances",
        tone: warehouse.lowStockCount > 0 ? "warn" : "default",
      });
    }

    if (procurement) {
      cards.push({
        key: "awaiting-gr",
        label: "PO รอรับของ",
        value: String(procurement.awaitingGrCount),
        hint: `PO ทั้งหมด ${procurement.totalPOs}`,
        href: "/procurement/tracking",
        tone: procurement.awaitingGrCount > 0 ? "warn" : "default",
      });
      cards.push({
        key: "awaiting-pay",
        label: "รอจ่าย Supplier",
        value: String(procurement.awaitingPaymentCount),
        hint: "รายการ",
        href: "/purchase-payments/pending",
        tone: procurement.awaitingPaymentCount > 0 ? "warn" : "default",
      });
    }

    if (receiving) {
      cards.push({
        key: "trucks",
        label: "รถเข้าวันนี้",
        value: String(receiving.trucksInToday),
        hint: `รอคัดแยก ${receiving.waitingSort} · รอจ่าย ${receiving.waitingPayment}`,
        href: "/receiving",
      });
    }

    if (warehouse && exec) {
      cards.push({
        key: "low-stock-admin",
        label: "สต๊อกต่ำ",
        value: String(warehouse.lowStockCount),
        hint: "ต้องเติมสต๊อก",
        href: "/inventory/stock-balances",
        tone: warehouse.lowStockCount > 0 ? "warn" : "default",
      });
    }

    return cards.slice(0, 6);
  }, [exec, warehouse, procurement, receiving]);

  const quickLinks = useMemo(() => {
    const links: Array<{ href: string; label: string; desc: string }> = [];
    if (showQuickReceiving) {
      links.push({
        href: "/receiving",
        label: "ตั๋วชั่งรับซื้อยาง",
        desc: "คิวรถและสถานะวันนี้",
      });
    }
    if (showQuickWarehouse) {
      links.push({
        href: "/inventory/stock-balances",
        label: "ยอดคงเหลือ",
        desc: "ดูสต๊อกและรายการต่ำกว่าขั้นต่ำ",
      });
      links.push({
        href: "/inventory/material-issues",
        label: "เบิกวัตถุดิบ",
        desc: "สร้าง/อนุมัติใบเบิกของ",
      });
    }
    if (showProduction && PRODUCTION_OUTPUT_ENABLED) {
      links.push({
        href: "/receiving/production-output/stock-requests/create",
        label: "รับผลผลิตเข้าคลัง",
        desc: "ขอรับเข้าจากใบสั่งผลิต",
      });
      links.push({
        href: "/production/production-orders",
        label: "ใบสั่งผลิต",
        desc: "ติดตามรอบผลิต Pyrolysis",
      });
    }
    if (showQuickProcurement) {
      links.push({
        href: "/procurement/tracking",
        label: "ติดตามจัดซื้อ",
        desc: "PO / GR / การจ่ายเงิน",
      });
      links.push({
        href: "/purchase-requests",
        label: "ใบขอซื้อ",
        desc: "สร้างและติดตาม PR",
      });
    }
    return links.slice(0, 6);
  }, [
    showQuickReceiving,
    showQuickWarehouse,
    showProduction,
    showQuickProcurement,
  ]);

  const displayName = user?.displayName || user?.username || "ผู้ใช้งาน";

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SMT ENERGY · ERP HOME</p>
          <h1 className={styles.heroTitle}>สวัสดี, {displayName}</h1>
          <p className={styles.heroLead}>
            ภาพรวมระบบวันนี้ — คลัง จัดซื้อ รับยาง และรายการที่รอคุณดำเนินการ
          </p>
          <p className={styles.heroDate}>{formatThaiDate(new Date())}</p>
        </div>
        {loading ? (
          <div className={styles.heroLoading}>
            <Spin size="small" />
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        ) : null}
      </header>

      {kpiCards.length > 0 ? (
        <div className={styles.kpiGrid}>
          {kpiCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`${styles.kpiCard} ${
                card.tone === "warn"
                  ? styles.kpiWarn
                  : card.tone === "accent"
                    ? styles.kpiAccent
                    : ""
              }`}
              onClick={() => router.push(card.href)}
            >
              <span className={styles.kpiLabel}>{card.label}</span>
              <strong className={styles.kpiValue}>{card.value}</strong>
              <span className={styles.kpiHint}>{card.hint}</span>
            </button>
          ))}
        </div>
      ) : loading ? (
        <div className={styles.panelLoading}>
          <Spin />
        </div>
      ) : (
        <div className={styles.emptyPanel}>
          ยังไม่มีข้อมูลสรุปตามสิทธิ์ของคุณ — ใช้เมนูด้านซ้ายเพื่อเริ่มงาน
        </div>
      )}

      <div className={styles.panels}>
        {warehouse ? (
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.panelEyebrow}>WAREHOUSE</p>
                <h2 className={styles.panelTitle}>คลังสินค้า</h2>
              </div>
              <Link href="/inventory/stock-inquiry" className={styles.panelLink}>
                ดูคลัง
              </Link>
            </div>
            <div className={styles.metricRow}>
              <div className={styles.metric}>
                <InboxOutlined />
                <div>
                  <span>มูลค่าสต๊อก</span>
                  <strong>{formatMoney(warehouse.totalStockValue)}</strong>
                </div>
              </div>
              <div className={styles.metric}>
                <AlertOutlined />
                <div>
                  <span>สต๊อกต่ำ</span>
                  <strong>{warehouse.lowStockCount}</strong>
                </div>
              </div>
              <div className={styles.metric}>
                <SwapOutlined />
                <div>
                  <span>รอปรับ / โอน / นับ</span>
                  <strong>
                    {warehouse.pendingStockAdjustmentCount +
                      warehouse.pendingStockTransferCount +
                      warehouse.pendingStockCountCount}
                  </strong>
                </div>
              </div>
            </div>
            {trendData.length > 0 ? (
              <div className={styles.chartWrap}>
                <p className={styles.chartLabel}>เคลื่อนไหวรายเดือน (เข้า / ออก)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip
                      formatter={(value) => formatQty(Number(value))}
                      contentStyle={{ borderRadius: 12, borderColor: "#e8eaed" }}
                    />
                    <Bar dataKey="เข้า" fill="#8ab933" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="ออก" fill="#5c6570" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className={styles.panelMuted}>ยังไม่มีแนวโน้มการเคลื่อนไหว</p>
            )}
          </article>
        ) : null}

        {receiving ? (
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.panelEyebrow}>RECEIVING</p>
                <h2 className={styles.panelTitle}>รับซื้อยางวันนี้</h2>
              </div>
              <Link href="/receiving" className={styles.panelLink}>
                เปิดคิวรถ
              </Link>
            </div>
            <div className={styles.receiveGrid}>
              <div className={styles.receiveItem}>
                <TruckOutlined />
                <span>รถเข้า</span>
                <strong>{receiving.trucksInToday}</strong>
              </div>
              <div className={styles.receiveItem}>
                <span>รอชั่งเข้า</span>
                <strong>{receiving.waitingWeighIn}</strong>
              </div>
              <div className={styles.receiveItem}>
                <span>รอคัดแยก</span>
                <strong>{receiving.waitingSort}</strong>
              </div>
              <div className={styles.receiveItem}>
                <span>รอชั่งออก</span>
                <strong>{receiving.waitingWeighOut}</strong>
              </div>
              <div className={styles.receiveItem}>
                <span>รออนุมัติ</span>
                <strong>{receiving.waitingApproval}</strong>
              </div>
              <div className={styles.receiveItem}>
                <span>รอจ่าย</span>
                <strong>{receiving.waitingPayment}</strong>
              </div>
            </div>
            <div className={styles.receiveFooter}>
              <span>
                น้ำหนักสุทธิวันนี้{" "}
                <strong>{formatQty(receiving.totalNetWeightKgToday)} กก.</strong>
              </span>
              <span>
                มูลค่าวันนี้{" "}
                <strong>{formatMoney(receiving.totalAmountToday)} บาท</strong>
              </span>
            </div>
          </article>
        ) : null}
      </div>

      {procurement ? (
        <article className={styles.panelWide}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelEyebrow}>PROCUREMENT</p>
              <h2 className={styles.panelTitle}>จัดซื้อ</h2>
            </div>
            <Link href="/procurement/tracking" className={styles.panelLink}>
              ดูทั้งหมด
            </Link>
          </div>
          <div className={styles.procGrid}>
            <div className={styles.procCard}>
              <ShoppingCartOutlined />
              <span>PO ทั้งหมด</span>
              <strong>{procurement.totalPOs}</strong>
              <small>{formatMoney(procurement.totalAmount)} บาท</small>
            </div>
            <div className={styles.procCard}>
              <span>รอรับของ (GR)</span>
              <strong>{procurement.awaitingGrCount}</strong>
              <small>ไปหน้าติดตามจัดซื้อ</small>
            </div>
            <div className={styles.procCard}>
              <span>รอจ่ายเงิน</span>
              <strong>{procurement.awaitingPaymentCount}</strong>
              <small>Supplier payments</small>
            </div>
          </div>
        </article>
      ) : null}

      {quickLinks.length > 0 ? (
        <section className={styles.quickSection}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelEyebrow}>SHORTCUTS</p>
              <h2 className={styles.panelTitle}>ทางลัด</h2>
            </div>
          </div>
          <div className={styles.quickGrid}>
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.quickCard}>
                <strong>{link.label}</strong>
                <span>{link.desc}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {exec?.pendingApprovalsBreakdown ? (
        <article className={styles.panelWide}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.panelEyebrow}>PENDING</p>
              <h2 className={styles.panelTitle}>รายการรออนุมัติ / รอดำเนินการ</h2>
            </div>
            <TeamOutlined className={styles.panelIcon} />
          </div>
          <div className={styles.breakdownGrid}>
            <div>
              <span>ใบสั่งขายร่าง</span>
              <strong>
                {exec.pendingApprovalsBreakdown.salesOrdersDraft ?? 0}
              </strong>
            </div>
            <div>
              <span>PO รอรับของ</span>
              <strong>
                {exec.pendingApprovalsBreakdown.purchaseOrdersAwaitingGr ?? 0}
              </strong>
            </div>
            <div>
              <span>ปรับสต๊อกร่าง</span>
              <strong>
                {exec.pendingApprovalsBreakdown.stockAdjustmentsDraft ?? 0}
              </strong>
            </div>
            <div>
              <span>โอนย้ายร่าง</span>
              <strong>
                {exec.pendingApprovalsBreakdown.stockTransfersDraft ?? 0}
              </strong>
            </div>
            <div>
              <span>ลาร่าง</span>
              <strong>
                {exec.pendingApprovalsBreakdown.leaveRequestsDraft ?? 0}
              </strong>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}
