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
import { salesInvoicePaymentStatusLabel } from "@/types/sales-invoices";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { formatMoney as formatMoneyByLang } from "@/lib/i18n/format";
import type { Language } from "@/lib/i18n/translate";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { toArAgingSheet } from "@/utils/salesReportSheets";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import PageHeader from "@/components/common/PageHeader";

const BUCKET_COLOR: Record<string, string> = {
  not_due: "default",
  "1_30": "gold",
  "31_60": "orange",
  "61_90": "volcano",
  over_90: "red",
};

function formatMoney(value: string | undefined, lang: Language) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "—";
  return formatMoneyByLang(n, lang);
}

function formatDate(value?: string) {
  return value ? dayjs(value).format("DD/MM/BBBB") : "—";
}

export default function ArAgingReportPage() {
  const t = useT();
  const lang = useLanguage();
  const [draftRange, setDraftRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [draftCustomerId, setDraftCustomerId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const applyFilters = () => {
    setRange(draftRange);
    setCustomerId(draftCustomerId);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftRange(null);
    setDraftCustomerId(undefined);
    setRange(null);
    setCustomerId(undefined);
    setPage(1);
  };
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
        message.warning(t("มี {total} ใบ — ไฟล์มีเฉพาะ 5,000 ใบแรก", { total: all.total.toLocaleString(lang === "en" ? "en-GB" : "th-TH") }));
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
      message.error(t("ดาวน์โหลดรายงานไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  const columns: ColumnsType<ArAgingRow> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("เลขที่ใบแจ้งหนี้"),
      dataIndex: "invoiceNo",
      render: (value: string, row) => (
        <Link href={`/sales-invoices/${row.invoiceId}`}>{value}</Link>
      ),
    },
    {
      title: t("ลูกค้า"),
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
      title: t("วันที่ออก"),
      dataIndex: "invoiceDate",
      render: (v: string) => formatDate(v),
    },
    {
      title: t("ครบกำหนด"),
      dataIndex: "dueDate",
      render: (v?: string) => formatDate(v),
    },
    {
      title: t("ยอดรวม"),
      dataIndex: "totalAmount",
      align: "right",
      render: (v: string) => formatMoney(v, lang),
    },
    {
      title: t("ชำระแล้ว"),
      dataIndex: "paidAmount",
      align: "right",
      render: (v: string) => formatMoney(v, lang),
    },
    {
      title: t("คงค้าง"),
      dataIndex: "outstandingAmount",
      align: "right",
      render: (v: string) => <strong>{formatMoney(v, lang)}</strong>,
    },
    {
      title: t("สถานะชำระ"),
      dataIndex: "paymentStatus",
      render: (v: string) => salesInvoicePaymentStatusLabel(v, lang),
    },
    {
      title: t("อายุหนี้"),
      dataIndex: "agingBucket",
      render: (v: string) => (
        <Tag color={BUCKET_COLOR[v] ?? "default"}>
          {AGING_BUCKET_LABEL[v] ? t(AGING_BUCKET_LABEL[v]) : v}
        </Tag>
      ),
    },
  ];

  return (
    <section className={masterStyles.page}>
      <PageHeader
        eyebrow="REPORTS · ACCOUNTS RECEIVABLE"
        title={t("รายงานสถานะลูกหนี้")}
        subtitle={t("ใบแจ้งหนี้ที่ยังไม่ชำระครบ พร้อมช่วงอายุหนี้")}
        actions={
          <>
<ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
        />
          </>
        }
      />

      <div className={masterStyles.summaryRow} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}>
          <span className={masterStyles.summaryLabel}>{t("ยอดออกใบแจ้งหนี้รวม")}</span>
          <strong>{formatMoney(summary?.totalInvoiced, lang)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}>
          <span className={masterStyles.summaryLabel}>{t("ชำระแล้วรวม")}</span>
          <strong>{formatMoney(summary?.totalPaid, lang)}</strong>
        </div>
        <div className={masterStyles.summaryCard}>
          <span className={masterStyles.summaryLabel}>{t("คงค้างรวม")}</span>
          <strong>{formatMoney(summary?.totalOutstanding, lang)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryInactive}`}>
          <span className={masterStyles.summaryLabel}>{t("เกินกำหนดชำระ")}</span>
          <strong>{formatMoney(summary?.overdueAmount, lang)}</strong>
        </div>
      </div>

      <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={reportQuery.isFetching}>
        <FilterField label={t("วันที่ออก")} wide>
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            format="DD/MM/BBBB"
            value={draftRange}
            onChange={(values) =>
              setDraftRange(values && values[0] && values[1] ? [values[0], values[1]] : null)
            }
          />
        </FilterField>
        <FilterField label={t("ลูกค้า")}>
          <Select
            allowClear
            showSearch
            style={{ width: "100%" }}
            placeholder={t("ลูกค้าทั้งหมด")}
            optionFilterProp="label"
            value={draftCustomerId}
            onChange={setDraftCustomerId}
            options={(customersQuery.data?.data ?? []).map((c) => ({
              value: c.id,
              label: `${c.customerCode} — ${c.nameTh}`,
            }))}
          />
        </FilterField>
      </FilterCard>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("ใบแจ้งหนี้ค้างชำระ")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{lang === "en" ? `${data?.total ?? 0} invoices` : `${data?.total ?? 0} ใบ`}</span>
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
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
        />
      </div>
    </section>
  );
}
