"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, DatePicker, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import { useSalesPaymentReportQuery } from "@/hooks/sales-reports/useSalesReportsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  downloadSalesPaymentReportCsv,
  fetchAllReportRows,
  getSalesPaymentReport,
} from "@/lib/api/sales-reports";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesPaymentReportRow } from "@/types/sales-reports";
import { SALES_INVOICE_PAYMENT_METHOD_LABEL } from "@/types/sales-invoices";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { toSalesPaymentSheet } from "@/utils/salesReportSheets";
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

export default function SalesPaymentReportPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const { message } = App.useApp();
  /** CSV เดิมไม่ผูกสิทธิ์ (backend เช็คแค่ VIEW) — Excel/PDF ที่เพิ่มใหม่ผูก EXPORT เหมือนรายงานตัวอื่น */
  const canExport =
    !isMatrixPermissionMode() || hasPermission("REPORTS_SALES_PAYMENTS.EXPORT");

  const customersQuery = useCustomersQuery({ isActive: true });

  const queryParams = useMemo(
    () => ({
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      customerId,
      paymentMethod,
      page,
      limit: 20,
    }),
    [range, customerId, paymentMethod, page],
  );

  const reportQuery = useSalesPaymentReportQuery(queryParams);
  const data = reportQuery.data?.data;
  const summary = data?.summary;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      if (format === "csv") {
        await downloadSalesPaymentReportCsv(getAccessToken(), queryParams);
        return;
      }
      const all = await fetchAllReportRows((exportPage, limit) =>
        getSalesPaymentReport(getAccessToken(), { ...queryParams, page: exportPage, limit }),
      );
      if (all.truncated) {
        message.warning(`มี ${all.total.toLocaleString("th-TH")} รายการ — ไฟล์มีเฉพาะ 5,000 รายการแรก`);
      }
      const customer = (customersQuery.data?.data ?? []).find((c) => c.id === customerId);
      await downloadTabularReport(
        format,
        toSalesPaymentSheet(all.rows, {
          dateFrom: queryParams.dateFrom,
          dateTo: queryParams.dateTo,
          filters: [
            customer ? `ลูกค้า: ${customer.customerCode} — ${customer.nameTh}` : "",
            paymentMethod
              ? `วิธีรับชำระ: ${SALES_INVOICE_PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod}`
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

  const columns: ColumnsType<SalesPaymentReportRow> = [
    {
      title: "วันที่รับชำระ",
      dataIndex: "paymentDate",
      render: (v: string) => formatDate(v),
    },
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
      title: "จำนวนเงิน",
      dataIndex: "amount",
      align: "right",
      render: (v: string) => formatMoney(v),
    },
    {
      title: "วิธีรับชำระ",
      dataIndex: "paymentMethod",
      render: (v: string) => SALES_INVOICE_PAYMENT_METHOD_LABEL[v] ?? v,
    },
    {
      title: "เลขอ้างอิง",
      dataIndex: "transactionRef",
      render: (v?: string) => v ?? "—",
    },
    {
      title: "ผู้บันทึก",
      dataIndex: "createdByName",
      render: (v?: string) => v ?? "—",
    },
  ];

  return (
    <section className={masterStyles.page}>
      <div className={masterStyles.pageHeader}>
        <div className={masterStyles.headerAccent}>฿</div>
        <div className={masterStyles.headerContent}>
          <div className={masterStyles.eyebrow}>REPORTS · ACCOUNTS RECEIVABLE</div>
          <h2 className={masterStyles.pageTitle}>รายงานรับชำระเงิน</h2>
          <span className={masterStyles.pageSubtitle}>
            ประวัติการรับชำระทุกรายการ รวม partial payment
          </span>
        </div>
        <ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
        />
      </div>

      <div className={masterStyles.summaryRow} style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}>
          <span className={masterStyles.summaryLabel}>จำนวนรายการรับชำระ</span>
          <strong>{summary?.paymentCount ?? 0}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}>
          <span className={masterStyles.summaryLabel}>ยอดรับชำระรวม</span>
          <strong>{formatMoney(summary?.totalAmount)}</strong>
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
              placeholder="วิธีรับชำระทั้งหมด"
              value={paymentMethod}
              onChange={(value) => {
                setPaymentMethod(value);
                setPage(1);
              }}
              options={[
                { value: "CASH", label: "เงินสด" },
                { value: "TRANSFER", label: "โอนเงิน" },
                { value: "CHEQUE", label: "เช็ค" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>การรับชำระเงิน</h3>
          </div>
          <span className={masterStyles.tableCount}>{data?.total ?? 0} รายการ</span>
        </div>
        <Table
          className={masterStyles.dataTable}
          rowKey="paymentId"
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
