"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, DatePicker, Pagination, Segmented, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined, FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import PageHeader from "@/components/common/PageHeader";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { useRawTirePurchaseMonthlyReportQuery } from "@/hooks/raw-tire-purchase-reports/useRawTirePurchaseMonthlyReportQuery";
import { useRawTirePurchaseReportQuery } from "@/hooks/raw-tire-purchase-reports/useRawTirePurchaseReportQuery";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import {
  getRawTirePurchaseMonthlyReport,
  getRawTirePurchaseReport,
} from "@/lib/api/raw-tire-purchase-receipts";
import { fetchAllReportRows } from "@/lib/api/sales-reports";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import type {
  RawTirePurchaseReportDailySummary,
  RawTirePurchaseReportMonthRow,
  RawTirePurchaseReportQueryParams,
  RawTirePurchaseReportRow,
  RawTirePurchaseReportViewMode,
} from "@/types/raw-tire-purchase-reports";
import {
  PAYMENT_STATUS_LABEL,
  STOCK_POSTING_FILTER_OPTIONS,
  STOCK_POSTING_STATUS_LABEL,
} from "@/types/raw-tire-purchase-reports";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import {
  formatBeDate,
  formatBeMonth,
  toDailySheet,
  toMonthlySheet,
  type RawTirePurchaseExportContext,
} from "@/utils/rawTirePurchaseReportSheets";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import styles from "./RawTirePurchaseReportPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatNumber(value: string | number) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PaymentStatusPill({ status }: { status: string }) {
  const t = useT();
  const tone =
    status === "PAID"
      ? styles.paidTone
      : status === "PARTIAL"
        ? styles.partialTone
        : styles.unpaidTone;

  return (
    <span className={`${styles.statusPill} ${tone}`}>
      <span className={styles.statusDot} aria-hidden />
      {PAYMENT_STATUS_LABEL[status] ? t(PAYMENT_STATUS_LABEL[status]) : status}
    </span>
  );
}

/** แถวของตารางรายวัน: หัววัน (พร้อมยอดรวมวัน) สลับกับใบรับซื้อของวันนั้น */
type DailyTableRow =
  | { kind: "day"; key: string; date: string; summary: RawTirePurchaseReportDailySummary }
  | { kind: "receipt"; key: string; seq: number; row: RawTirePurchaseReportRow };

/**
 * แทรกหัววันก่อนใบแรกของแต่ละวันในหน้านั้น — ยอดรวมวันมาจาก backend (คิดทั้งชุดที่กรอง)
 * วันที่ใบรับซื้อคาบเกี่ยวสองหน้าจึงแสดงยอดวันเต็มทั้งสองหน้า ไม่ใช่เฉพาะใบที่อยู่ในหน้า
 */
function buildDailyRows(
  rows: RawTirePurchaseReportRow[],
  summaries: RawTirePurchaseReportDailySummary[],
  firstSeq: number,
): DailyTableRow[] {
  const byDate = new Map(summaries.map((item) => [item.date, item]));
  const result: DailyTableRow[] = [];
  let lastDate: string | null = null;
  rows.forEach((row, index) => {
    if (row.receiptDate !== lastDate) {
      lastDate = row.receiptDate;
      const dayRows = rows.filter((r) => r.receiptDate === row.receiptDate);
      // ปกติ backend ส่งมาครบทุกวันในหน้า — fallback คิดจากแถวในหน้ากันหน้าจอว่างถ้าขาด
      const summary =
        byDate.get(row.receiptDate) ??
        ({
          date: row.receiptDate,
          receiptCount: dayRows.length,
          netWeightKg: String(dayRows.reduce((s, r) => s + Number(r.netWeightKg), 0)),
          totalAmount: String(dayRows.reduce((s, r) => s + Number(r.totalAmount), 0)),
        } satisfies RawTirePurchaseReportDailySummary);
      result.push({ kind: "day", key: `day-${row.receiptDate}`, date: row.receiptDate, summary });
    }
    result.push({ kind: "receipt", key: row.id, seq: firstSeq + index, row });
  });
  return result;
}

const MODE_OPTIONS: Array<{ label: string; value: RawTirePurchaseReportViewMode }> = [
  { label: "รายวัน", value: "daily" },
  { label: "รายเดือน", value: "monthly" },
];

export default function RawTirePurchaseReportPage() {
  const t = useT();
  const lang = useLanguage();
  /** วันที่แสดงบนจอ: ไทย = วว/ดด/พ.ศ. · อังกฤษ = วว/ดด/ค.ศ. */
  const showBeDate = (iso: string) => (lang === "en" ? formatDate(iso) : formatBeDate(iso));
  const showMonth = (month: string) => {
    if (lang !== "en") return formatBeMonth(month);
    const d = dayjs(`${month}-01`);
    return d.isValid() ? d.format("MMMM YYYY") : month;
  };
  const { message } = App.useApp();
  const [mode, setMode] = useState<RawTirePurchaseReportViewMode>("daily");
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [sellerId, setSellerId] = useState<string | undefined>();
  const [tireClassificationId, setTireClassificationId] = useState<
    string | undefined
  >();
  const [paymentStatus, setPaymentStatus] = useState<string | undefined>();
  const [stockPostingStatus, setStockPostingStatus] = useState<string | undefined>();
  const [applied, setApplied] = useState<RawTirePurchaseReportQueryParams>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);

  const sellersQuery = useSellersQuery({ isActive: true });
  const classificationsQuery = useTireClassificationsQuery();
  const dailyQuery = useRawTirePurchaseReportQuery(
    { ...applied, page, limit },
    mode === "daily",
  );
  const monthlyQuery = useRawTirePurchaseMonthlyReportQuery(applied, mode === "monthly");

  const sellers = sellersQuery.data?.data ?? [];
  const classifications = classificationsQuery.data?.data ?? [];
  const dailyData = dailyQuery.data?.data;
  const dailyTotal = dailyData?.total ?? 0;
  const monthRows = monthlyQuery.data?.data.items ?? [];
  const summary =
    mode === "daily" ? dailyQuery.data?.data.summary : monthlyQuery.data?.data.summary;
  const loading = mode === "daily" ? dailyQuery.isLoading : monthlyQuery.isLoading;

  const canExport = !isMatrixPermissionMode() || hasPermission("REPORTS_RECEIVING.EXPORT");

  const applySearch = () => {
    setPage(1);
    setApplied({
      dateFrom: dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : undefined,
      dateTo: dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
      sellerId,
      tireClassificationId,
      paymentStatus,
      stockPostingStatus,
    });
  };

  const clearFilters = () => {
    setDateRange(null);
    setSellerId(undefined);
    setTireClassificationId(undefined);
    setPaymentStatus(undefined);
    setStockPostingStatus(undefined);
    setApplied({});
    setPage(1);
  };

  /** ตัวกรองที่ใช้อยู่จริง (ที่กดค้นหาแล้ว) เป็นข้อความ — พิมพ์ลงหัวไฟล์ส่งออก */
  const appliedFilterLabels = () => {
    const labels: string[] = [];
    const seller = sellers.find((s) => s.id === applied.sellerId);
    if (seller) labels.push(`ผู้ขาย: ${seller.sellerCode} — ${seller.sellerName}`);
    const classification = classifications.find((c) => c.id === applied.tireClassificationId);
    if (classification) {
      labels.push(`ประเภทยาง: ${classification.classificationCode} — ${classification.classificationName}`);
    }
    if (applied.paymentStatus) {
      labels.push(`สถานะชำระเงิน: ${PAYMENT_STATUS_LABEL[applied.paymentStatus] ?? applied.paymentStatus}`);
    }
    if (applied.stockPostingStatus) {
      labels.push(
        `สถานะคลัง: ${STOCK_POSTING_STATUS_LABEL[applied.stockPostingStatus] ?? applied.stockPostingStatus}`,
      );
    }
    return labels;
  };

  /**
   * ส่งออกตามตัวกรองที่ใช้อยู่และรูปแบบที่เลือก — ดึงทั้งชุด ไม่ใช่เฉพาะหน้าปัจจุบัน
   * รายวันดึงทุกหน้า (สูงสุด 5,000 ใบ เท่าเพดาน CSV เดิม) รายเดือนได้ครบจาก backend ในคำขอเดียว
   */
  const handleExport = async (format: ReportExportFormat) => {
    setExporting(format);
    try {
      const token = getAccessToken();
      const base = { dateFrom: applied.dateFrom, dateTo: applied.dateTo, filters: appliedFilterLabels() };

      if (mode === "monthly") {
        const res = await getRawTirePurchaseMonthlyReport(token, applied);
        const context: RawTirePurchaseExportContext = {
          ...base,
          summary: res.data.summary,
          truncated: false,
          total: res.data.summary.totalReceipts,
        };
        await downloadTabularReport(format, toMonthlySheet(res.data.items, context));
        return;
      }

      const all = await fetchAllReportRows((exportPage, exportLimit) =>
        getRawTirePurchaseReport(token, { ...applied, page: exportPage, limit: exportLimit }),
      );
      if (all.truncated) {
        message.warning(
          t("มี {total} ใบ — ไฟล์มีเฉพาะ 5,000 ใบแรก (ยอดรวมเป็นของทั้งชุด)", {
            total: all.total.toLocaleString("th-TH"),
          }),
        );
      }
      const context: RawTirePurchaseExportContext = {
        ...base,
        summary: all.first.summary,
        truncated: all.truncated,
        total: all.total,
      };
      // CSV แบนไม่ปนแถวสรุป — Excel/PDF แทรกหัววันและยอดรวมวัน
      await downloadTabularReport(format, toDailySheet(all.rows, context, format !== "csv"));
    } catch {
      message.error(t("ดาวน์โหลดรายงานไม่สำเร็จ"));
    } finally {
      setExporting(null);
    }
  };

  const dailyTableRows = useMemo(
    () => buildDailyRows(dailyData?.items ?? [], dailyData?.dailySummaries ?? [], (page - 1) * limit + 1),
    [dailyData, page, limit],
  );

  /** แถวหัววันกินทุกคอลัมน์ — คอลัมน์แรกวาดเนื้อหา ที่เหลือซ่อน */
  const dayCell = (columnIndex: number, columnCount: number) => (record: DailyTableRow) =>
    record.kind === "day" ? { colSpan: columnIndex === 0 ? columnCount : 0 } : {};

  const dailyColumns: ColumnsType<DailyTableRow> = useMemo(() => {
    const receiptColumns: Array<{
      title: string;
      key: string;
      width?: number;
      align?: "center" | "right";
      render: (row: RawTirePurchaseReportRow, seq: number) => React.ReactNode;
    }> = [
      { title: t("ลำดับ"), key: "no", width: 52, align: "center", render: (_r, seq) => seq },
      {
        title: t("เลขที่ใบรับซื้อ"),
        key: "receiptNo",
        render: (row) => <span className={styles.receiptNo}>{row.receiptNo}</span>,
      },
      { title: t("วันที่รับซื้อ"), key: "receiptDate", width: 110, render: (row) => formatDate(row.receiptDate) },
      {
        title: t("ผู้ขาย"),
        key: "seller",
        render: (row) => (row.sellerName ? `${row.sellerCode ?? ""} — ${row.sellerName}` : "—"),
      },
      { title: t("ทะเบียนรถ"), key: "truck", render: (row) => row.truckLicensePlate ?? "—" },
      {
        title: t("น้ำหนักคิดเงิน (กก.)"),
        key: "payableWeightKg",
        align: "right",
        render: (row) => formatNumber(row.payableWeightKg),
      },
      {
        title: t("ยอดสุทธิ (บาท)"),
        key: "totalAmount",
        align: "right",
        render: (row) => formatNumber(row.totalAmount),
      },
      {
        title: t("การชำระเงิน"),
        key: "paymentStatus",
        width: 130,
        render: (row) => <PaymentStatusPill status={row.paymentStatus} />,
      },
      {
        title: t("สถานะเข้าคลัง"),
        key: "stockPostingStatus",
        width: 130,
        render: (row) =>
          STOCK_POSTING_STATUS_LABEL[row.stockPostingStatus]
            ? t(STOCK_POSTING_STATUS_LABEL[row.stockPostingStatus])
            : row.stockPostingStatus,
      },
      {
        title: "",
        key: "actions",
        width: 60,
        render: (row) => (
          <Link href={`/receiving/receipts/${row.id}`} className={styles.actionBtn} title={t("ดูรายละเอียด")}>
            <EyeOutlined />
          </Link>
        ),
      },
    ];

    return receiptColumns.map((column, index) => ({
      title: column.title,
      key: column.key,
      width: column.width,
      align: column.align,
      onCell: dayCell(index, receiptColumns.length),
      render: (_value: unknown, record: DailyTableRow) => {
        if (record.kind === "day") {
          return index === 0 ? (
            <div className={styles.dayHeader}>
              <strong>{t("วันที่ {date}", { date: showBeDate(record.date) })}</strong>
              <span className={styles.dayChip}>{lang === "en"
                  ? `${record.summary.receiptCount.toLocaleString("en-GB")} receipts`
                  : `${record.summary.receiptCount.toLocaleString("th-TH")} ใบ`}</span>
              <span className={styles.dayChip}>{t("น้ำหนักสุทธิ {n} กก.", { n: formatNumber(record.summary.netWeightKg) })}</span>
              <span className={styles.dayChip}>{t("ยอดสุทธิ {n} บาท", { n: formatNumber(record.summary.totalAmount) })}</span>
            </div>
          ) : null;
        }
        return column.render(record.row, record.seq);
      },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, lang]);

  const monthColumns: ColumnsType<RawTirePurchaseReportMonthRow> = [
    {
      title: t("เดือน"),
      key: "month",
      render: (_v, row) => <span className={styles.receiptNo}>{showMonth(row.month)}</span>,
    },
    {
      title: t("จำนวนใบ"),
      dataIndex: "receiptCount",
      key: "receiptCount",
      align: "right",
      render: (value: number) => value.toLocaleString("th-TH"),
    },
    ...(
      [
        ["น้ำหนักสุทธิ (กก.)", "netWeightKg"],
        ["น้ำหนักหัก (กก.)", "deductionWeightKg"],
        ["น้ำหนักคิดเงิน (กก.)", "payableWeightKg"],
        ["ยอดก่อนหัก (บาท)", "subtotalAmount"],
        ["ยอดหัก (บาท)", "deductionAmount"],
        ["ยอดสุทธิ (บาท)", "totalAmount"],
      ] as const
    ).map(([title, field]) => ({
      title: t(title),
      dataIndex: field,
      key: field,
      align: "right" as const,
      render: (value: string) => formatNumber(value),
    })),
  ];

  const filterEmptyText = (
    <div className={styles.emptyState}>
      <strong>{t("ไม่พบใบรับซื้อยางตามเงื่อนไขที่ค้นหา")}</strong>
      {t("ลองปรับช่วงวันที่หรือตัวกรองอื่น")}
    </div>
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Reports · Raw Tire Purchase"
        icon={<FileTextOutlined />}
        title={t("รายงานรับซื้อรายวัน / รายเดือน")}
        subtitle={t("สรุปใบรับซื้อยางที่อนุมัติแล้ว (CONFIRMED) กรองตามช่วงวันที่ ผู้ขาย ประเภทยาง สถานะชำระเงิน และสถานะคลัง")}
        actions={
          <ReportExportButtons
            canExport={canExport}
            downloading={exporting}
            onExport={(format) => void handleExport(format)}
          />
        }
      />

      <div className={styles.modeBar}>
        <Segmented<RawTirePurchaseReportViewMode>
          options={MODE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          value={mode}
          onChange={(value) => {
            setMode(value);
            setPage(1);
          }}
        />
        <span className={styles.modeHint}>
          {mode === "daily"
            ? t("รายการใบรับซื้อ แยกตามวันที่ พร้อมยอดรวมรายวัน")
            : t("สรุปจำนวนใบ น้ำหนัก (กก.) และมูลค่า (บาท) แยกตามเดือน")}
        </span>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("จำนวนใบรับซื้อ")}</span>
          <span className={styles.statValue}>{summary?.totalReceipts ?? 0}</span>
          <span className={styles.statHint}>{t("ตามเงื่อนไขที่กรอง")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("น้ำหนักสุทธิรวม")}</span>
          <span className={styles.statValue}>
            {summary ? formatNumber(summary.totalNetWeightKg) : "0.00"}
          </span>
          <span className={styles.statHint}>{t("กิโลกรัม")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยอดเงินรวม")}</span>
          <span className={styles.statValue}>
            {summary ? formatNumber(summary.totalAmount) : "0.00"}
          </span>
          <span className={styles.statHint}>{t("บาท")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ช่วงวันที่รับซื้อ")}</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              onChange={(values) =>
                setDateRange(values as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
              }
              format="DD/MM/YYYY"
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ผู้ขาย")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={sellerId}
              onChange={setSellerId}
              loading={sellersQuery.isLoading}
              options={sellers.map((seller) => ({
                value: seller.id,
                label: `${seller.sellerCode} — ${seller.sellerName}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ประเภทยาง")}</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder={t("ทั้งหมด")}
              value={tireClassificationId}
              onChange={setTireClassificationId}
              loading={classificationsQuery.isLoading}
              options={classifications.map((item) => ({
                value: item.id,
                label: `${item.classificationCode} — ${item.classificationName}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะชำระเงิน")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={paymentStatus}
              onChange={setPaymentStatus}
              options={Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => ({
                value,
                label: t(label),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะคลัง")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={stockPostingStatus}
              onChange={setStockPostingStatus}
              options={STOCK_POSTING_FILTER_OPTIONS.map((value) => ({
                value,
                label: t(STOCK_POSTING_STATUS_LABEL[value]),
              }))}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
          <Button
            type="primary"
            className={styles.searchBtn}
            icon={<SearchOutlined />}
            onClick={applySearch}
          >
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {mode === "daily" ? (
              <>
                {t("พบทั้งหมด")} <strong>{dailyTotal}</strong> {t("รายการ")}
              </>
            ) : (
              <>
                {t("พบทั้งหมด")} <strong>{monthRows.length}</strong> {t("เดือน")}
              </>
            )}
          </div>
          {mode === "daily" ? (
            <div className={styles.entriesBox}>
              <span>{t("แสดง")}</span>
              <Select
                size="small"
                value={limit}
                style={{ width: 72 }}
                options={[
                  { label: "20", value: 20 },
                  { label: "50", value: 50 },
                  { label: "100", value: 100 },
                ]}
                onChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
              />
              <span>{t("รายการ/หน้า")}</span>
            </div>
          ) : null}
        </div>

        {mode === "daily" ? (
          <Table<DailyTableRow>
            rowKey="key"
            columns={dailyColumns}
            dataSource={dailyTableRows}
            loading={loading}
            pagination={false}
            className={styles.table}
            scroll={{ x: 1000 }}
            rowClassName={(record) => (record.kind === "day" ? styles.dayRow : "")}
            locale={{ emptyText: filterEmptyText }}
          />
        ) : (
          <Table<RawTirePurchaseReportMonthRow>
            rowKey="month"
            columns={monthColumns}
            dataSource={monthRows}
            loading={loading}
            pagination={false}
            className={styles.table}
            scroll={{ x: 900 }}
            locale={{ emptyText: filterEmptyText }}
            summary={() =>
              monthRows.length > 0 && summary ? (
                <Table.Summary.Row className={styles.totalRow}>
                  <Table.Summary.Cell index={0}>{t("รวมทั้งหมด")}</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    {summary.totalReceipts.toLocaleString("th-TH")}
                  </Table.Summary.Cell>
                  {(
                    [
                      "netWeightKg",
                      "deductionWeightKg",
                      "payableWeightKg",
                      "subtotalAmount",
                      "deductionAmount",
                      "totalAmount",
                    ] as const
                  ).map((field, i) => (
                    <Table.Summary.Cell key={field} index={i + 2} align="right">
                      {formatNumber(monthRows.reduce((s, r) => s + Number(r[field]), 0))}
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              ) : null
            }
          />
        )}

        {mode === "daily" ? (
          <div className={styles.tableFooter}>
            <div className={styles.footerText}>
              {t("แสดง {from}–{to} จาก {total}", {
                from: dailyTotal === 0 ? 0 : (page - 1) * limit + 1,
                to: Math.min(page * limit, dailyTotal),
                total: dailyTotal,
              })}
            </div>
            <Pagination
              size="small"
              current={page}
              total={dailyTotal}
              pageSize={limit}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
