"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useQuotationsQuery } from "@/hooks/quotations/useQuotationsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  getScreenActionPermissions,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { Quotation } from "@/types/quotations";
import {
  QUOTATION_STATUS_LABEL,
  type QuotationStatus,
} from "@/types/quotations";
import styles from "./QuotationsListPage.module.css";

const QUOTATION_FLOW_STEPS = [
  { key: "DRAFT", label: "ร่าง" },
  { key: "SENT", label: "ส่งแล้ว" },
  { key: "ACCEPTED", label: "ลูกค้ายืนยัน" },
  { key: "SALES_ORDER", label: "เปิด SO" },
] as const;

type QuotationProgress = {
  current: number;
  total: number;
  label: string;
  tone: "active" | "done" | "stopped";
};

function resolveQuotationProgress(row: Quotation): QuotationProgress {
  const total = QUOTATION_FLOW_STEPS.length;
  if (row.status === "CANCELLED") {
    return { current: 0, total, label: "ยกเลิก", tone: "stopped" };
  }
  if (row.status === "REJECTED") {
    return { current: 2, total, label: "ลูกค้าปฏิเสธ", tone: "stopped" };
  }
  if (row.salesOrderId) {
    return { current: 4, total, label: "เปิด SO แล้ว", tone: "done" };
  }
  if (row.status === "ACCEPTED") {
    return { current: 3, total, label: "ลูกค้ายืนยัน", tone: "active" };
  }
  if (row.status === "SENT") {
    return { current: 2, total, label: "ส่งแล้ว", tone: "active" };
  }
  return { current: 1, total, label: "ร่าง", tone: "active" };
}

function statusColor(status: string) {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "SENT":
      return "processing";
    case "REJECTED":
      return "error";
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

function QuotationProgressCell({ row }: { row: Quotation }) {
  const progress = resolveQuotationProgress(row);
  return (
    <div
      className={`${styles.progressCell} ${styles[`progress_${progress.tone}`]}`}
    >
      <div className={styles.progressMeta}>
        <span className={styles.progressCount}>
          {progress.tone === "stopped" && progress.current === 0
            ? "—"
            : `${progress.current}/${progress.total}`}
        </span>
        <span className={styles.progressLabel}>{progress.label}</span>
      </div>
      <div className={styles.progressTrack} aria-hidden>
        {QUOTATION_FLOW_STEPS.map((step, index) => {
          const stepNo = index + 1;
          const filled = stepNo <= progress.current;
          return (
            <span
              key={step.key}
              className={`${styles.progressSeg} ${filled ? styles.progressSegOn : ""}`}
              title={step.label}
            />
          );
        })}
      </div>
      {row.salesOrderNo ? (
        <span className={styles.progressSo}>{row.salesOrderNo}</span>
      ) : null}
    </div>
  );
}

export default function QuotationsListPage() {
  const router = useRouter();
  const [quotationNo, setQuotationNo] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    quotationNo?: string;
    customerId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const quotationActions = getScreenActionPermissions("QUOTATIONS");
  const legacyWrite =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();
  const matrixMode = isMatrixPermissionMode();
  const canCreate = matrixMode ? quotationActions.canAdd : legacyWrite;
  const canEdit = matrixMode ? quotationActions.canEdit : legacyWrite;

  const customersQuery = useCustomersQuery();
  const customers = customersQuery.data?.data ?? [];
  const query = useQuotationsQuery(applied);
  const rows = query.data?.data ?? [];

  const applyFilters = () => {
    setApplied({
      quotationNo: quotationNo.trim() || undefined,
      customerId,
      status,
      dateFrom: date ? date.format("YYYY-MM-DD") : undefined,
      dateTo: date ? date.format("YYYY-MM-DD") : undefined,
    });
  };

  const clearFilters = () => {
    setQuotationNo("");
    setCustomerId(undefined);
    setStatus(undefined);
    setDate(null);
    setApplied({});
  };

  const columns: ColumnsType<Quotation> = useMemo(
    () => [
      {
        title: "#",
        width: 56,
        align: "center",
        render: (_v, _r, index) => index + 1,
      },
      {
        title: "เลขที่",
        dataIndex: "quotationNo",
        render: (value: string) => (
          <span className={styles.prNo}>{value}</span>
        ),
      },
      {
        title: "วันที่",
        dataIndex: "quotationDate",
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
        title: "ยอดสุทธิ",
        dataIndex: "totalAmount",
        align: "right",
        width: 120,
        render: (value: string) => formatMoney(value),
      },
      {
        title: "ขั้นตอน",
        key: "progress",
        width: 180,
        render: (_v, row) => <QuotationProgressCell row={row} />,
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 120,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {QUOTATION_STATUS_LABEL[value as QuotationStatus] ?? value}
          </Tag>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 100,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/quotations/${row.id}`)}
            />
            {canEdit && row.status === "DRAFT" ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => router.push(`/quotations/${row.id}/edit`)}
              />
            ) : null}
          </Space>
        ),
      },
    ],
    [canEdit, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Quotation</p>
          <h1 className={styles.pageTitle}>ใบเสนอราคา</h1>
          <p className={styles.pageSubtitle}>
            ติดตาม 4 ขั้นตอน: ร่าง → ส่งแล้ว → ลูกค้ายืนยัน → เปิด SO —
            ยังไม่ตัดสต๊อก
          </p>
        </div>
        <div className={styles.headerActions}>
          {canCreate ? (
            <Link href="/quotations/create">
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<PlusOutlined />}
              >
                สร้างใบเสนอราคา
              </Button>
            </Link>
          ) : null}
        </div>
      </header>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่</label>
            <Input
              allowClear
              placeholder="QT-..."
              value={quotationNo}
              onChange={(e) => setQuotationNo(e.target.value)}
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
              options={Object.entries(QUOTATION_STATUS_LABEL).map(
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
          scroll={{ x: 980 }}
          onRow={(row) => ({
            onClick: () => router.push(`/quotations/${row.id}`),
          })}
          locale={{ emptyText: "ยังไม่มีใบเสนอราคา" }}
        />
      </section>
    </div>
  );
}
