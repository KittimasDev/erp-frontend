"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useSalesOrdersQuery } from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  resolveSalesOrderProgress,
  SALES_ORDER_FLOW_STEPS,
} from "@/lib/sales/sales-order-progress";
import { salesOrderRevisionStamp } from "@/lib/datetime/thai-buddhist-date";
import type { SalesOrder } from "@/types/sales-orders";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import styles from "./SalesOrdersListPage.module.css";

function statusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CONFIRMED":
    case "STOCK_CHECKED":
    case "PICKING":
    case "PACKED":
    case "DELIVERED":
    case "PARTIALLY_ISSUED":
      return "processing";
    case "CANCELLED":
      return "default";
    default:
      return "warning";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SalesOrderProgressCell({
  status,
  deliveryStatus,
}: {
  status: string;
  deliveryStatus?: string;
}) {
  const progress = resolveSalesOrderProgress(status, deliveryStatus);
  return (
    <div
      className={`${styles.progressCell} ${styles[`progress_${progress.tone}`]}`}
    >
      <div className={styles.progressMeta}>
        <span className={styles.progressCount}>
          {progress.tone === "stopped" && progress.current === 0
            ? "—"
            : `${progress.inProgress}/${progress.total}`}
        </span>
        <span className={styles.progressLabel}>
          {progress.currentStepLabel}
          {progress.tone !== "done" && progress.tone !== "stopped"
            ? ` · ${progress.label}`
            : ""}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        style={{
          gridTemplateColumns: `repeat(${progress.total}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        {SALES_ORDER_FLOW_STEPS.map((step, index) => {
          const stepNo = index + 1;
          const filled = stepNo <= progress.current;
          const current =
            stepNo === progress.inProgress && progress.tone !== "stopped";
          return (
            <span
              key={step.key}
              className={[
                styles.progressSeg,
                filled ? styles.progressSegOn : "",
                current ? styles.progressSegCurrent : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={step.label}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function SalesOrdersListPage() {
  const router = useRouter();
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canViewAll = salesOrderActions.canViewAll;
  const [soNo, setSoNo] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    soNo?: string;
    customerId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const customersQuery = useCustomersQuery();
  const customers = customersQuery.data?.data ?? [];
  const query = useSalesOrdersQuery(applied);
  const rows = query.data?.data ?? [];

  const applyFilters = () => {
    setApplied({
      soNo: soNo.trim() || undefined,
      customerId,
      status,
      dateFrom: date ? date.format("YYYY-MM-DD") : undefined,
      dateTo: date ? date.format("YYYY-MM-DD") : undefined,
    });
  };

  const clearFilters = () => {
    setSoNo("");
    setCustomerId(undefined);
    setStatus(undefined);
    setDate(null);
    setApplied({});
  };

  const columns: ColumnsType<SalesOrder> = useMemo(
    () => [
      {
        title: "ลำดับ",
        width: 56,
        align: "center",
        render: (_v, _r, index) => index + 1,
      },
      {
        title: "เลขที่",
        dataIndex: "soNo",
        render: (_value: string, row) => (
          <div className={styles.soNoCell}>
            <span className={styles.prNo}>{row.soNo}</span>
            <span className={styles.revisionStamp}>
              {salesOrderRevisionStamp(row.revisionNo, row.revisedAt)}
            </span>
          </div>
        ),
      },
      {
        title: "วันที่",
        dataIndex: "soDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ลูกค้า",
        key: "customer",
        render: (_v, row) =>
          row.customer
            ? `${row.customer.customerCode} — ${row.customer.nameTh}`
            : "—",
      },
      {
        title: "ผู้สร้าง",
        key: "createdBy",
        width: 140,
        ellipsis: true,
        render: (_v, row) =>
          row.createdBy?.displayName?.trim() ||
          row.createdBy?.username ||
          "—",
      },
      {
        title: "ยอดสุทธิ",
        dataIndex: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: "ขั้นตอน",
        key: "progress",
        width: 220,
        render: (_v, row) => (
          <SalesOrderProgressCell
            status={row.status}
            deliveryStatus={row.deliveryStatus}
          />
        ),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 140,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {SALES_ORDER_STATUS_LABEL[value as SalesOrderStatus] ?? value}
          </Tag>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 60,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/sales-orders/${row.id}`)}
            />
          </Space>
        ),
      },
    ],
    [router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ShoppingCartOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>ขาย · ใบสั่งขาย</p>
          <h1 className={styles.pageTitle}>ใบสั่งขาย</h1>
          {/* สร้างจาก SALES_ORDER_FLOW_STEPS ไม่ hardcode — เดิมเขียน 6 ขั้น
              ค้างไว้ ไม่ตรงกับแถบความคืบหน้าที่เหลือ 5 ขั้นหลังถอดขั้นตรวจสต๊อก */}
          <p className={styles.pageSubtitle}>
            ติดตาม {SALES_ORDER_FLOW_STEPS.length} ขั้นตอน:{" "}
            {SALES_ORDER_FLOW_STEPS.map((step) => step.label).join(" → ")}
            {!canViewAll ? " · แสดงเฉพาะเอกสารที่คุณสร้าง" : ""}
          </p>
        </div>
      </header>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่</label>
            <Input
              allowClear
              placeholder="SO-..."
              value={soNo}
              onChange={(e) => setSoNo(e.target.value)}
              onPressEnter={applyFilters}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ลูกค้า</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={customerId}
              onChange={setCustomerId}
              style={{ width: "100%" }}
              loading={customersQuery.isLoading}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={Object.entries(SALES_ORDER_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่</label>
            <DatePicker
              value={date}
              onChange={setDate}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
              placeholder="เลือกวันที่"
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={applyFilters}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{rows.length}</strong> รายการ
          </div>
        </div>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          className={styles.table}
          onRow={(row) => ({
            onClick: () => router.push(`/sales-orders/${row.id}`),
          })}
          locale={{ emptyText: "ยังไม่มีใบสั่งขาย" }}
        />
      </section>
    </div>
  );
}
