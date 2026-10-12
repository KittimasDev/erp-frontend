"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, DatePicker, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import { useSalesInvoiceSummaryReportQuery } from "@/hooks/sales-reports/useSalesReportsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  downloadSalesInvoiceSummaryReportCsv,
  fetchAllReportRows,
  getSalesInvoiceSummaryReport,
} from "@/lib/api/sales-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesInvoiceSummaryRow } from "@/types/sales-reports";
import {
  SALES_INVOICE_PAYMENT_STATUS_LABEL,
  SALES_INVOICE_STATUS_LABEL,
} from "@/types/sales-invoices";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { toSalesInvoiceSheet } from "@/utils/salesReportSheets";
import masterStyles from "@/components/masters/shared/master-page.module.css";

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  return value ? dayjs(value).format("DD/MM/YYYY") : "—";
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  POSTED: "success",
  CANCELLED: "error",
};

export default function SalesInvoiceSummaryReportPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const { message } = App.useApp();
  /** CSV เดิมไม่ผูกสิทธิ์ (backend เช็คแค่ VIEW) — Excel/PDF ที่เพิ่มใหม่ผูก EXPORT เหมือนรายงานตัวอื่น */
  const canExport =
    !isMatrixPermissionMode() || hasPermission("REPORTS_SALES_INVOICES.EXPORT");

  const customersQuery = useCustomersQuery({ isActive: true });

  const queryParams = useMemo(
    () => ({
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      customerId,
      status,
      paymentStatus,
      page,
      limit: 20,
    }),
    [range, customerId, status, paymentStatus, page],
  );

  const reportQuery = useSalesInvoiceSummaryReportQuery(queryParams);
  const data = reportQuery.data?.data;
  const summary = data?.summary;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      if (format === "csv") {
        await downloadSalesInvoiceSummaryReportCsv(getAccessToken(), queryParams);
        return;
      }
      const all = await fetchAllReportRows((exportPage, limit) =>
        getSalesInvoiceSummaryReport(getAccessToken(), { ...queryParams, page: exportPage, limit }),
      );
      if (all.truncated) {
        message.warning(`มี ${all.total.toLocaleString("th-TH")} ใบ — ไฟล์มีเฉพาะ 5,000 ใบแรก`);
      }
      const customer = (customersQuery.data?.data ?? []).find((c) => c.id === customerId);
      await downloadTabularReport(
        format,
        toSalesInvoiceSheet(all.rows, {
          dateFrom: queryParams.dateFrom,
          dateTo: queryParams.dateTo,
          filters: [
            customer ? `ลูกค้า: ${customer.customerCode} — ${customer.nameTh}` : "",
            status ? `สถานะเอกสาร: ${SALES_INVOICE_STATUS_LABEL[status] ?? status}` : "",
            paymentStatus
              ? `สถานะชำระเงิน: ${SALES_INVOICE_PAYMENT_STATUS_LABEL[paymentStatus] ?? paymentStatus}`
              : "",
          ].filter(Boolean),
          total: all.total,
          truncated: all.truncated,
        }),
      );
    } catch {
      message.error("ดาวน์โหลดรายงานไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const columns: ColumnsType<SalesInvoiceSummaryRow> = [
    {
      title: "เลขที่ใบแจ้งหนี้",
      dataIndex: "invoiceNo",
      render: (value: string, row) => (
        <Link href={`/sales-invoices/${row.invoiceId}`}>{value}</Link>
      ),
    },
    {
      title: "ลูกค้า",
      key: "customer",
      render: (_, row) =>
        row.customerId ? (
          <Link href={`/customers/${row.customerId}`}>
            {row.customerName ?? row.customerCode ?? "—"}
          </Link>
        ) : (
          "—"
        ),
    },
    {
      title: "วันที่ออก",
      dataIndex: "invoiceDate",
      render: (v: string) => formatDate(v),
    },
    { title: "ใบสั่งขาย", dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
    { title: "ใบส่งสินค้า", dataIndex: "deliveryOrderNo", render: (v?: string) => v ?? "—" },
    {
      title: "ยอดรวม",
      dataIndex: "totalAmount",
      align: "right",
      render: (v: string) => formatMoney(v),
    },
    {
      title: "ชำระแล้ว",
      dataIndex: "paidAmount",
      align: "right",
      render: (v: string) => formatMoney(v),
    },
    {
      title: "คงค้าง",
      dataIndex: "outstandingAmount",
      align: "right",
      render: (v: string) => formatMoney(v),
    },
    {
      title: "สถานะเอกสาร",
      dataIndex: "status",
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v] ?? "default"}>
          {SALES_INVOICE_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: "สถานะชำระ",
      dataIndex: "paymentStatus",
      render: (v?: string) => (v ? SALES_INVOICE_PAYMENT_STATUS_LABEL[v] ?? v : "—"),
    },
  ];

  return (
    <section className={masterStyles.page}>
      <div className={masterStyles.pageHeader}>
        <div className={masterStyles.headerAccent}>SI</div>
        <div className={masterStyles.headerContent}>
          <div className={masterStyles.eyebrow}>REPORTS · SALES</div>
          <h2 className={masterStyles.pageTitle}>รายงานใบแจ้งหนี้ขาย</h2>
          <span className={masterStyles.pageSubtitle}>
            ใบแจ้งหนี้ทุกสถานะ กรองตามลูกค้า/วันที่/สถานะได้
          </span>
        </div>
        <ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
        />
      </div>

      <div className={masterStyles.summaryRow}>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}>
          <span className={masterStyles.summaryLabel}>จำนวนใบแจ้งหนี้</span>
          <strong>{summary?.invoiceCount ?? 0}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}>
          <span className={masterStyles.summaryLabel}>ยอดรวม</span>
          <strong>{formatMoney(summary?.totalAmount)}</strong>
        </div>
        <div className={masterStyles.summaryCard}>
          <span className={masterStyles.summaryLabel}>คงค้างรวม</span>
          <strong>{formatMoney(summary?.totalOutstanding)}</strong>
        </div>
      </div>

      <div className={masterStyles.filterCard}>
        <div className={masterStyles.filterForm}>
          <div className={masterStyles.formGrid}>
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              value={range}
              onChange={(values) => {
                setRange(values && values[0] && values[1] ? [values[0], values[1]] : null);
                setPage(1);
              }}
            />
            <Select
              allowClear
              showSearch
              placeholder="ลูกค้าทั้งหมด"
              optionFilterProp="label"
              value={customerId}
              onChange={(value) => {
                setCustomerId(value);
                setPage(1);
              }}
              options={(customersQuery.data?.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
            <Select
              allowClear
              placeholder="สถานะเอกสารทั้งหมด"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={[
                { value: "DRAFT", label: "แบบร่างเอกสาร" },
                { value: "POSTED", label: "โพสต์แล้ว" },
                { value: "CANCELLED", label: "ยกเลิก" },
              ]}
            />
            <Select
              allowClear
              placeholder="สถานะชำระทั้งหมด"
              value={paymentStatus}
              onChange={(value) => {
                setPaymentStatus(value);
                setPage(1);
              }}
              options={[
                { value: "UNPAID", label: "ยังไม่ชำระ" },
                { value: "PARTIALLY_PAID", label: "ชำระบางส่วน" },
                { value: "PAID", label: "ชำระแล้ว" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>ใบแจ้งหนี้ขาย</h3>
          </div>
          <span className={masterStyles.tableCount}>{data?.total ?? 0} ใบ</span>
        </div>
        <Table
          className={masterStyles.dataTable}
          rowKey="invoiceId"
          columns={columns}
          dataSource={data?.items ?? []}
          loading={reportQuery.isFetching}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: setPage,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
        />
      </div>
    </section>
  );
}
