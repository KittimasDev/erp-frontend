"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert } from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ExperimentOutlined,
  ExportOutlined,
  FileDoneOutlined,
  HistoryOutlined,
  InboxOutlined,
  ProfileOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagsOutlined,
  ToolOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import WarehouseHubPage from "@/components/warehouse/WarehouseHubPage";
import type { WarehouseHubSection } from "@/components/warehouse/WarehouseHubPage";
import { useWarehouseDashboardSummaryQuery } from "@/hooks/warehouse-dashboard/useWarehouseDashboardSummaryQuery";
import { ApiError } from "@/lib/api/client";
import {
  canAccessScreen,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";
import styles from "./WarehouseDashboardPage.module.css";

/** ชุดสีเดียวกับ ProductionDashboardPage / ProcurementDashboardPage */
const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const AMBER = "#F9BB0C";
const MUTED = "#77777C";

function fmt(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("th-TH", { maximumFractionDigits: digits });
}

const SECTIONS: WarehouseHubSection[] = [
  {
    key: "daily",
    title: "งานประจำวัน",
    description: "เอกสารที่ทำบ่อยที่สุดในคลัง",
    cards: [
      {
        key: "material-issues",
        title: "เบิกของออกจากคลัง",
        description: "ใบเบิกวัสดุ/สินค้าทั่วไปออกจากคลัง",
        href: "/inventory/material-issues",
        icon: <ExportOutlined />,
        screenCodes: ["MATERIAL_ISSUES"],
        badgeMenuKeys: ["inventory-issues"],
      },
      {
        key: "chemical-issues",
        title: "เบิกจ่ายสารเคมี",
        description: "ใบเบิกสารเคมีพร้อมบันทึกวัตถุประสงค์การใช้",
        href: "/inventory/chemical-issues",
        icon: <ExperimentOutlined />,
        screenCodes: ["CHEMICAL_ISSUES"],
        badgeMenuKeys: ["chemical-issues"],
      },
      {
        key: "tire-prep-issues",
        title: "เบิกยางเข้ากระบวนการเตรียมยาง",
        description: "ใบเบิกยางจากคลังเข้าสายเตรียมยางก่อนผลิต",
        icon: <ToolOutlined />,
        screenCodes: ["TIRE_PREP_ISSUES"],
        disabled: true,
        disabledHint: "อยู่ระหว่างพัฒนา",
      },
      {
        key: "stock-transfers",
        title: "โอนย้ายวัตถุดิบ",
        description: "ย้ายของระหว่างคลังและตำแหน่งจัดเก็บ",
        href: "/inventory/stock-transfers",
        icon: <SwapOutlined />,
        screenCodes: ["STOCK_TRANSFERS"],
        badgeMenuKeys: ["rm-stock-transfers"],
      },
      {
        key: "goods-receipts",
        title: "รับสินค้าเข้าคลัง (PO)",
        description: "รับของตามใบสั่งซื้อเข้าสต๊อก",
        href: "/goods-receipts",
        icon: <InboxOutlined />,
        screenCodes: ["GOODS_RECEIPTS"],
      },
    ],
  },
  {
    key: "inquiry",
    title: "ตรวจสอบสต๊อก",
    description: "ยอดคงเหลือและที่มาที่ไปของสินค้าในคลัง",
    cards: [
      {
        key: "stock-balances",
        title: "ยอดคงเหลือวัตถุดิบ",
        description: "ยอดคงเหลือตามคลังและตำแหน่งจัดเก็บ",
        href: "/inventory/stock-balances",
        icon: <BarChartOutlined />,
        screenCodes: ["STOCK_BALANCES"],
      },
      {
        key: "lots",
        title: "Lot วัตถุดิบ",
        description: "ยอดคงเหลือแยกตาม Lot และเอกสารต้นทาง",
        href: "/inventory/lots",
        icon: <TagsOutlined />,
        screenCodes: ["INVENTORY_LOTS"],
      },
      {
        key: "stock-movements",
        title: "ความเคลื่อนไหววัตถุดิบ",
        description: "ประวัติรับเข้า เบิกออก โอนย้าย และปรับปรุง",
        href: "/inventory/stock-movements",
        icon: <HistoryOutlined />,
        screenCodes: ["STOCK_MOVEMENTS"],
      },
      {
        key: "stock-inquiry",
        title: "ตรวจสอบสต๊อก (รวม)",
        description: "รวมหน้าตรวจสอบสต๊อกไว้ที่เดียว",
        href: "/inventory/stock-inquiry",
        icon: <AppstoreOutlined />,
        screenCodes: ["STOCK_INQUIRY"],
      },
    ],
  },
  {
    key: "control",
    title: "นับและปรับปรุงสต๊อก",
    cards: [
      {
        key: "stock-counts",
        title: "นับสต๊อก",
        description: "สร้างและติดตามเอกสารนับสต๊อก",
        href: "/inventory/stock-counts",
        icon: <AuditOutlined />,
        screenCodes: ["STOCK_COUNTS"],
      },
      {
        key: "stock-adjustments",
        title: "ปรับปรุงสต๊อก",
        description: "ปรับยอดสต๊อกให้ตรงกับของจริง",
        href: "/inventory/stock-adjustments",
        icon: <EditOutlined />,
        screenCodes: ["STOCK_ADJUSTMENTS"],
        badgeMenuKeys: ["rm-stock-control"],
      },
    ],
  },
  {
    key: "approvals",
    title: "อนุมัติ",
    description: "คิวงานที่รอคนอนุมัติก่อนสต๊อกจะขยับ",
    cards: [
      {
        key: "warehouse-approvals",
        title: "อนุมัติงานคลัง",
        description: "รวมหน้ารออนุมัติของงานคลัง",
        href: "/warehouse/approvals",
        icon: <CheckCircleOutlined />,
        screenCodes: ["WAREHOUSE_APPROVALS"],
      },
      {
        key: "stock-posting-approvals",
        title: "อนุมัติรับยางเข้าคลัง",
        description: "อนุมัติคำขอรับเข้าคลังจากใบรับซื้อยาง",
        href: "/warehouse/stock-posting-approvals",
        icon: <InboxOutlined />,
        screenCodes: ["STOCK_POSTING_APPROVALS"],
        badgeMenuKeys: ["stock-posting-approvals"],
      },
      ...(PRODUCTION_OUTPUT_ENABLED
        ? [
            {
              key: "production-output-approvals",
              title: "อนุมัติรับผลผลิตเข้าคลัง",
              description: "อนุมัติคำขอรับผลผลิตจากกระบวนการผลิต",
              href: "/warehouse/production-output-approvals",
              icon: <CheckCircleOutlined />,
              screenCodes: ["PRODUCTION_OUTPUT_APPROVALS"],
              badgeMenuKeys: ["production-output-approvals"],
            },
          ]
        : []),
    ],
  },
  {
    key: "fg",
    title: "คลังสินค้าสำเร็จรูป",
    description: "ตั้งแต่ยอดคงเหลือ FG จนถึงส่งของให้ลูกค้า",
    cards: [
      {
        key: "fg-stock-balances",
        title: "ยอดคงเหลือ FG",
        description: "ยอดสินค้าสำเร็จรูปคงเหลือ",
        href: "/inventory/stock-balances?isFinishedGood=true",
        icon: <BarChartOutlined />,
        screenCodes: ["FG_STOCK_BALANCES"],
      },
      {
        key: "fg-lots",
        title: "Lot สินค้าสำเร็จรูป",
        description: "ยอด FG แยกตาม Lot",
        href: "/inventory/lots?isFinishedGood=true",
        icon: <TagsOutlined />,
        screenCodes: ["FG_INVENTORY_LOTS"],
      },
      {
        key: "fg-stock-movements",
        title: "ความเคลื่อนไหว FG",
        description: "ประวัติการเคลื่อนไหวของสินค้าสำเร็จรูป",
        href: "/inventory/stock-movements?isFinishedGood=true",
        icon: <HistoryOutlined />,
        screenCodes: ["FG_STOCK_MOVEMENTS"],
      },
      {
        key: "sd-stock-verification",
        title: "ตรวจสอบสต๊อกขาย",
        description: "ตรวจของก่อนเปิดใบจ่ายสินค้าให้ใบสั่งขาย",
        href: "/sales-orders/stock-verification",
        icon: <ProfileOutlined />,
        screenCodes: ["SALES_STOCK_VERIFICATION"],
        badgeMenuKeys: ["sd-stock-verification"],
      },
      {
        key: "pickings",
        title: "ใบจ่ายสินค้า / Picking",
        description: "จ่ายของออกจากคลังตามใบสั่งขาย",
        href: "/pickings",
        icon: <ShoppingOutlined />,
        screenCodes: ["PICKINGS"],
        badgeMenuKeys: ["pickings"],
      },
      {
        key: "packings",
        title: "ใบบรรจุสินค้า / Packing",
        description: "บรรจุสินค้าที่จ่ายแล้วก่อนส่ง",
        href: "/packings",
        icon: <FileDoneOutlined />,
        screenCodes: ["PACKINGS"],
        badgeMenuKeys: ["packings"],
      },
      {
        key: "delivery-orders",
        title: "ใบส่งสินค้า",
        description: "ออกใบส่งสินค้าและติดตามการจัดส่ง",
        href: "/delivery-orders",
        icon: <TruckOutlined />,
        screenCodes: ["DELIVERY_ORDERS"],
        badgeMenuKeys: ["delivery-orders"],
      },
    ],
  },
];

export default function WarehouseDashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
    API ตัวนี้เป็น @Roles(...) ไม่ใช่ @RequirePermission — matrix user ผ่านด้วย
    fallback ที่ฝั่ง guard แต่ legacy user นอก role list จะโดน 403
    กันไม่ให้ยิงทิ้งเมื่อรู้อยู่แล้วว่าไม่ผ่าน (โหมด legacy ปล่อยให้ backend ตัดสิน)
  */
  const canQuerySummary =
    mounted &&
    (isAdministrator() ||
      !isMatrixPermissionMode() ||
      canAccessScreen("WAREHOUSE_DASHBOARD"));

  const summaryQuery = useWarehouseDashboardSummaryQuery({
    enabled: canQuerySummary,
  });
  const summary = summaryQuery.data?.data;

  const trendData = useMemo(
    () =>
      (summary?.monthlyMovementTrend ?? []).map((point) => ({
        label: point.month,
        // recharts ไม่วาดอะไรเลยถ้าเป็น string ตัวเลข — ต้อง Number() ก่อนเสมอ
        quantityIn: Number(point.quantityIn),
        quantityOut: Number(point.quantityOut),
      })),
    [summary?.monthlyMovementTrend],
  );

  const isForbidden =
    summaryQuery.error instanceof ApiError &&
    summaryQuery.error.status === 403;

  /*
    การ์ดนำทางคือแก่นของหน้านี้ ต้องขึ้นเสมอแม้ API ล้ม
    เจอ 403 ให้ซ่อนบล็อกตัวเลขไปเลย — ห้ามโชว์เลข 0 เพราะอ่านเหมือนข้อมูลจริง
  */
  let overview: React.ReactNode = null;
  if (!mounted || summaryQuery.isLoading) {
    overview = (
      <div className={styles.skeletonGrid}>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className={styles.skeletonCard} />
        ))}
      </div>
    );
  } else if (isForbidden) {
    overview = (
      <Alert
        type="info"
        showIcon
        title="บัญชีของคุณไม่มีสิทธิ์ดูตัวเลขสรุปคลัง — เมนูด้านล่างยังใช้งานได้ตามปกติ"
      />
    );
  } else if (summaryQuery.isError) {
    overview = (
      <Alert
        type="warning"
        showIcon
        title="โหลดตัวเลขสรุปคลังไม่สำเร็จ"
        description="ลองรีเฟรชหน้าอีกครั้ง — เมนูด้านล่างยังใช้งานได้ตามปกติ"
      />
    );
  } else if (summary) {
    overview = (
      <div className={styles.overview}>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>มูลค่าสต๊อกรวม</span>
            <strong>{fmt(Number(summary.totalStockValue), 0)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>สินค้าต่ำกว่าจุดสั่งซื้อ</span>
            <strong className={summary.lowStockCount > 0 ? styles.warnValue : undefined}>
              {fmt(summary.lowStockCount)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ใบปรับปรุงรออนุมัติ</span>
            <strong>{fmt(summary.pendingStockAdjustmentCount)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ใบโอนย้ายรออนุมัติ</span>
            <strong>{fmt(summary.pendingStockTransferCount)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ใบนับสต๊อกค้างอยู่</span>
            <strong>{fmt(summary.pendingStockCountCount)}</strong>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>ความเคลื่อนไหวสต๊อกรายเดือน</h3>
            <p>ปริมาณรับเข้าเทียบกับเบิกออก ย้อนหลัง 6 เดือน</p>
          </div>
          <div className={styles.chartBody}>
            {trendData.length === 0 ? (
              <div className={styles.emptyState}>ยังไม่มีข้อมูลในช่วงนี้</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" />
                  <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} />
                  <YAxis tick={{ fill: MUTED, fontSize: 12 }} />
                  <Tooltip formatter={(value) => fmt(Number(value), 2)} />
                  <Legend />
                  <Bar
                    dataKey="quantityIn"
                    name="รับเข้า"
                    fill={GREEN}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="quantityOut"
                    name="เบิกออก"
                    fill={AMBER}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="quantityIn"
                    name="แนวโน้มรับเข้า"
                    stroke={GREEN_DARK}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <WarehouseHubPage
      eyebrow="WAREHOUSE · HOME"
      title="หน้าหลักคลัง"
      subtitle="ภาพรวมสต๊อกและทางลัดไปทุกงานในคลัง"
      icon={<AppstoreOutlined />}
      headerExtra={overview}
      sections={SECTIONS}
    />
  );
}
