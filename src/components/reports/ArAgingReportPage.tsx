"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, DatePicker, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import { useArAgingReportQuery } from "@/hooks/sales-reports/useSalesReportsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  downloadArAgingReportCsv,
  fetchAllReportRows,
  getArAgingReport,
} from "@/lib/api/sales-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { AGING_BUCKET_LABEL } from "@/types/sales-reports";
import type { ArAgingRow } from "@/types/sales-reports";
import { SALES_INVOICE_PAYMENT_STATUS_LABEL } from "@/types/sales-invoices";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { toArAgingSheet } from "@/utils/salesReportSheets";
import masterStyles from "@/components/masters/shared/master-page.module.css";

const BUCKET_COLOR: Record<string, string> = {
  not_due: "default",
  "1_30": "gold",
  "31_60": "orange",
  "61_90": "volcano",
  over_90: "red",
};

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

export default function ArAgingReportPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const { message } = App.useApp();
  /** CSV เดิมไม่ผูกสิทธิ์ (backend เช็คแค่ VIEW) — Excel/PDF ที่เพิ่มใหม่ผูก EXPORT เหมือนรายงานตัวอื่น */
  const canExport =
    !isMatrixPermissionMode() || hasPermission("REPORTS_AR_AGING.EXPORT");

  const customersQuery = useCustomersQuery({ isActive: true });

  const queryParams = useMemo(
    () => ({
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      customerId,
      page,
      limit: 20,
    }),
    [range, customerId, page],
  );

  const reportQuery = useArAgingReportQuery(queryParams);
  const data = reportQuery.data?.data;
  const summary = data?.summary;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      if (format === "csv") {
        await downloadArAgingReportCsv(getAccessToken(), queryParams);
        return;
      }
      const all = await fetchAllReportRows((exportPage, limit) =>
        getArAgingReport(getAccessToken(), { ...queryParams, page: exportPage, limit }),
      );
      if (all.truncated) {
        message.warning(`มี ${all.total.toLocaleString("th-TH")} ใบ — ไฟล์มีเฉพาะ 5,000 ใบแรก`);
      }
      const customer = (customersQuery.data?.data ?? []).find((c) => c.id === customerId);
      await downloadTabularReport(
        format,
        toArAgingSheet(all.rows, all.first.summary, {
          dateFrom: queryParams.dateFrom,
          dateTo: queryParams.dateTo,
          filters: customer ? [`ลูกค้า: ${customer.customerCode} — ${customer.nameTh}`] : [],
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

  const columns: ColumnsType<ArAgingRow> = [
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
    {
      title: "ครบกำหนด",
      dataIndex: "dueDate",
      render: (v?: string) => formatDate(v),
    },
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
      render: (v: string) => <strong>{formatMoney(v)}</strong>,
    },
    {
      title: "สถานะชำระ",
      dataIndex: "paymentStatus",
      render: (v: string) => SALES_INVOICE_PAYMENT_STATUS_LABEL[v] ?? v,
    },
    {
      title: "อายุหนี้",
      dataIndex: "agingBucket",
      render: (v: string) => (
        <Tag color={BUCKET_COLOR[v] ?? "default"}>
          {AGING_BUCKET_LABEL[v] ?? v}
        </Tag>
      ),
    },
  ];

  return (
    <section className={masterStyles.page}>
      <div className={masterStyles.pageHeader}>
        <div className={masterStyles.headerAccent}>AR</div>
        <div className={masterStyles.headerContent}>
          <div className={masterStyles.eyebrow}>REPORTS · ACCOUNTS RECEIVABLE</div>
          <h2 className={masterStyles.pageTitle}>รายงานสถานะลูกหนี้</h2>
          <span className={masterStyles.pageSubtitle}>
            ใบแจ้งหนี้ที่ยังไม่ชำระครบ พร้อมช่วงอายุหนี้
          </span>
        </div>
        <ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
        />
      </div>

      <div className={masterStyles.summaryRow} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}>
          <span className={masterStyles.summaryLabel}>ยอดออกใบแจ้งหนี้รวม</span>
          <strong>{formatMoney(summary?.totalInvoiced)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}>
          <span className={masterStyles.summaryLabel}>ชำระแล้วรวม</span>
          <strong>{formatMoney(summary?.totalPaid)}</strong>
        </div>
        <div className={masterStyles.summaryCard}>
          <span className={masterStyles.summaryLabel}>คงค้างรวม</span>
          <strong>{formatMoney(summary?.totalOutstanding)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryInactive}`}>
          <span className={masterStyles.summaryLabel}>เกินกำหนดชำระ</span>
          <strong>{formatMoney(summary?.overdueAmount)}</strong>
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
          </div>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>ใบแจ้งหนี้ค้างชำระ</h3>
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
