"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, DatePicker, Input, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileExcelOutlined, FileTextOutlined, HistoryOutlined, SearchOutlined, SendOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import JournalAccountDetailPanel, {
  journalMasterDetailStyles as mdStyles,
} from "@/components/reports/JournalAccountDetailPanel";
import {
  expressSentLabel,
  ExportCountTag,
  ExportHistoryDrawer,
  ExpressExportDialog,
} from "@/components/reports/JournalExpressExport";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import styles from "@/components/reports/PaymentJournalPage.module.css";
import { paymentJournalQueryKey, usePaymentJournalQuery } from "@/hooks/payment-journal/usePaymentJournal";
import {
  exportPaymentJournalToExpress,
  getPaymentJournalDocumentExportHistory,
  getPaymentJournalExport,
  getPaymentJournalExportHistory,
  previewPaymentJournalExpress,
} from "@/lib/api/payment-journal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import {
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  type PaymentJournalExpressStatus,
  type PaymentJournalItem,
  type PaymentJournalKind,
  type PaymentJournalMethod,
} from "@/types/payment-journal";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import PageHeader from "@/components/common/PageHeader";
import { useLanguage } from "@/lib/i18n/language";
import { useT, type TFunction } from "@/lib/i18n/useT";

const SCREEN_CODE = "REPORTS_JOURNAL_PAYMENTS";
const PAGE_SIZE = 10;

/** ช่วงวันที่เริ่มต้น = เดือนปัจจุบัน */
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

const KIND_COLOR: Record<PaymentJournalKind, string> = {
  AP_PAYMENT: "blue",
  ADVANCE_FULL: "gold",
  DEPOSIT: "orange",
};

const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");
const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "");

/** วิธีจ่ายพร้อมรายละเอียด เช่น "โอนเงิน · กสิกรไทย 123-4-56789-0" */
function methodText(item: PaymentJournalItem, t?: TFunction): string {
  const rawLabel = PAYMENT_METHOD_LABEL[item.paymentMethod];
  const label = rawLabel ? (t ? t(rawLabel) : rawLabel) : item.paymentMethod;
  const bank = [item.bankName, item.bankAccountNumber].filter(Boolean).join(" ");
  return bank ? `${label} · ${bank}` : label;
}

/** ประเภทการจ่าย — แปลตามภาษา ถ้าไม่รู้จักใช้ข้อความจาก backend */
function kindText(item: PaymentJournalItem, t: TFunction): string {
  const raw = PAYMENT_KIND_LABEL[item.kind];
  return raw ? t(raw) : item.kindLabel;
}

export default function PaymentJournalPage() {
  const t = useT();
  const lang = useLanguage();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  // ตัวกรองที่กำลังกรอก (draft) — ใช้จริงเมื่อกด "ค้นหา" เท่านั้น
  const [dRange, setDRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [dKind, setDKind] = useState<PaymentJournalKind | undefined>();
  const [dMethod, setDMethod] = useState<PaymentJournalMethod | undefined>();
  const [dExpress, setDExpress] = useState<PaymentJournalExpressStatus | undefined>();
  const [dSearch, setDSearch] = useState("");
  // ตัวกรองที่ใช้อยู่จริง (applied)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [kind, setKind] = useState<PaymentJournalKind | undefined>();
  const [method, setMethod] = useState<PaymentJournalMethod | undefined>();
  const [expressStatus, setExpressStatus] = useState<PaymentJournalExpressStatus | undefined>();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const [sendingExpress, setSendingExpress] = useState(false);
  // ส่งออกไป Express: 'range' = ตามช่วงวันที่, 'selected' = เฉพาะแถวที่ติ๊กเลือก
  const [exportMode, setExportMode] = useState<"range" | "selected" | null>(null);
  // รูปแบบไฟล์ Express: csv (เดิม) หรือ xlsx — ใช้ pipeline/เงื่อนไข/ประวัติเดียวกัน
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const openExport = (mode: "range" | "selected", format: "csv" | "xlsx") => {
    setExportFormat(format);
    setExportMode(mode);
  };
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const applySearch = () => {
    setRange(dRange);
    setKind(dKind);
    setMethod(dMethod);
    setExpressStatus(dExpress);
    setKeyword(dSearch.trim());
    setPage(1);
    setSelectedId(null);
    setSelectedKeys([]);
  };
  const clearFilters = () => {
    const fresh = defaultRange();
    setDRange(fresh);
    setDKind(undefined);
    setDMethod(undefined);
    setDExpress(undefined);
    setDSearch("");
    setRange(fresh);
    setKind(undefined);
    setMethod(undefined);
    setExpressStatus(undefined);
    setKeyword("");
    setPage(1);
    setSelectedId(null);
  };

  const canExport = !isMatrixPermissionMode() || hasPermission(`${SCREEN_CODE}.EXPORT`);

  const filters = useMemo(
    () => ({
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      kind,
      method,
      expressStatus,
      search: keyword || undefined,
    }),
    [range, kind, method, expressStatus, keyword],
  );
  const listQuery = usePaymentJournalQuery({ ...filters, page, limit: PAGE_SIZE });
  const data = listQuery.data;
  const items = data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const { items: all, summary } = (await getPaymentJournalExport(getAccessToken(), filters)).data;
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/YYYY HH:mm")}`,
        filters.dateFrom || filters.dateTo
          ? `วันที่จ่ายเงิน: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
          : null,
        filters.kind ? `ประเภท: ${PAYMENT_KIND_LABEL[filters.kind]}` : null,
        filters.method ? `วิธีจ่าย: ${PAYMENT_METHOD_LABEL[filters.method]}` : null,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        `ทั้งหมด ${all.length} รายการ · ยอดรวมก่อนหัก ${money.format(summary.grossAmount)} · WHT ${money.format(summary.whtAmount)} · จ่ายจริง ${money.format(summary.netAmount)} บาท`,
      ].filter((v): v is string => Boolean(v));

      const rows: string[][] = [];
      const groupRows: number[] = [];
      const subGroupRows: number[] = [];
      all.forEach((doc, index) => {
        groupRows.push(rows.length);
        const related = [
          doc.advanceRequest ? `ใบขอจ่ายล่วงหน้า ${doc.advanceRequest.no}` : null,
          doc.aps.length ? `AP ${doc.aps.map((a) => a.no).join(" ")}` : null,
          doc.po ? `PO ${doc.po.no}` : null,
          doc.transactionRef ? `อ้างอิง ${doc.transactionRef}` : null,
          doc.chequeNo ? `เช็คเลขที่ ${doc.chequeNo}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        rows.push([
          String(index + 1),
          formatDate(doc.paymentDate),
          doc.paymentNo ?? doc.voucher.no,
          `${doc.creditorCode} ${doc.creditorName}`,
          "",
          "",
          doc.kindLabel,
          `${doc.voucher.no} · ${methodText(doc)}${related ? ` · ${related}` : ""}`,
        ]);
        for (const line of doc.lines) {
          rows.push([
            String(line.no),
            "",
            line.accountCode ?? "ยังไม่ผูกบัญชี",
            line.accountName ?? "",
            moneyOrBlank(line.debit),
            moneyOrBlank(line.credit),
            "",
            line.detail ? `${line.description} · ${line.detail}` : line.description,
          ]);
        }
        subGroupRows.push(rows.length);
        rows.push(["", "", "ยอดรวมสุทธิ", "", money.format(doc.totalDebit), money.format(doc.totalCredit), "", ""]);
      });

      await downloadTabularReport(format, {
        title: "สมุดรายวันจ่าย",
        filename: `payment-journal-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          "ลำดับ",
          "วันที่จ่าย",
          "เลขที่รายการจ่าย / รหัสบัญชี",
          "ผู้ขาย / ชื่อบัญชี",
          "เดบิต",
          "เครดิต",
          "ประเภท",
          "คำอธิบาย / เอกสารที่เกี่ยวข้อง",
        ],
        rows,
        groupRows,
        subGroupRows,
        pdfColumns: [
          { header: "ลำดับ", cells: [0], width: 34, align: "center" },
          { header: "วันที่", cells: [1], width: 58 },
          { header: "เลขที่ / รหัสบัญชี", cells: [2], width: 100 },
          { header: "ผู้ขาย / ชื่อบัญชี", cells: [3], width: 132 },
          { header: "เดบิต", cells: [4], width: 66, numeric: true },
          { header: "เครดิต", cells: [5], width: 66, numeric: true },
          { header: "ประเภท", cells: [6], width: 64 },
          { header: "คำอธิบาย / เอกสารที่เกี่ยวข้อง", cells: [7], width: 226 },
        ],
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("ส่งออกสมุดรายวันจ่ายไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  /** ขอบเขตการส่งออก: เลือกแถว (documentIds) หรือช่วงวันที่ — ใช้ทั้งตอนตรวจก่อนส่งและตอนส่งจริง */
  const exportScope = (mode: "range" | "selected") =>
    mode === "selected"
      ? { documentIds: selectedKeys }
      : {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          kind: filters.kind,
          method: filters.method,
          search: filters.search,
        };

  const handleExpress = async (mode: "range" | "selected", reexport: boolean) => {
    setSendingExpress(true);
    try {
      const { count, blob, filename } = await exportPaymentJournalToExpress(
        getAccessToken(),
        { ...exportScope(mode), reexport },
        exportFormat,
      );
      if (count === 0) {
        message.info(t("ไม่มีรายการที่ต้องส่งออก"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      message.success(
        (reexport
          ? t("สร้างไฟล์ Express {count} รายการแล้ว (รวมส่งซ้ำ)", { count: count.toLocaleString("th-TH") })
          : t("สร้างไฟล์ Express {count} รายการแล้ว", { count: count.toLocaleString("th-TH") })),
      );
      if (mode === "selected") setSelectedKeys([]);
      await queryClient.invalidateQueries({ queryKey: paymentJournalQueryKey });
    } catch (error) {
      modal.error({
        title: t("ส่งออกไป Express ไม่สำเร็จ"),
        content: (
          <div>
            <div>{error instanceof Error ? error.message : t("ส่งออกไป Express ไม่สำเร็จ")}</div>
            <div>{t("ไม่มีการบันทึกว่าส่งออกสำเร็จ — แก้ไขแล้วลองใหม่ได้")}</div>
            <Space orientation="vertical" size={0}>
              <Link href="/masters/gl-accounts">{t("ไปหน้าผังบัญชีและการผูกบัญชี")}</Link>
              <Link href="/masters/company-profile">{t("ไปหน้าข้อมูลบริษัท (บัญชีธนาคาร)")}</Link>
            </Space>
          </div>
        ),
      });
      throw error;
    } finally {
      setSendingExpress(false);
    }
  };

  const pending = data?.pendingExpressCount ?? 0;
  const expressDisabledReason = !canExport
    ? t("ไม่มีสิทธิ์ส่งออก (ต้องมีสิทธิ์ EXPORT ของสมุดรายวันจ่าย)")
    : !range
      ? t("เลือกช่วงวันที่จ่ายเงินก่อน")
      : null;

  const columns: ColumnsType<PaymentJournalItem> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    { title: t("วันที่จ่ายเงิน"), dataIndex: "paymentDate", width: 110, render: formatDate },
    {
      title: t("เลขที่รายการจ่าย"),
      key: "payment",
      width: 200,
      render: (_, row) => (
        <Space orientation="vertical" size={0} onClick={(event) => event.stopPropagation()}>
          <Link href={`/reports/journals/payments/${row.id}`}>{row.paymentNo ?? "—"}</Link>
          <Space size={4}>
            <Tag color={KIND_COLOR[row.kind]} style={{ marginInlineEnd: 0 }}>
              {kindText(row, t)}
            </Tag>
            {!row.balanced ? <Tag color="red">{t("เดบิต ≠ เครดิต")}</Tag> : null}
          </Space>
        </Space>
      ),
    },
    {
      title: t("ใบสำคัญจ่าย"),
      key: "voucher",
      width: 170,
      render: (_, row) => (
        <Space
          orientation="vertical"
          size={0}
          onClick={(event) => event.stopPropagation()}
        >
          <Link href={`/finance/payables/payment-vouchers/${row.voucher.id}`}>{row.voucher.no}</Link>
          <span style={{ fontSize: 12, opacity: 0.65 }}>{t("วันที่ {date}", { date: formatDate(row.voucherDate) })}</span>
        </Space>
      ),
    },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      width: 220,
      render: (_, row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <Link href={`/finance/payables/creditors/${row.creditorId}`}>
            {row.creditorCode} {row.creditorName}
          </Link>
        </span>
      ),
    },
    {
      title: t("วิธีจ่าย"),
      key: "method",
      width: 230,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <span>{methodText(row, t)}</span>
          {row.transactionRef ? (
            <span style={{ fontSize: 12, opacity: 0.65 }}>{t("อ้างอิง {ref}", { ref: row.transactionRef })}</span>
          ) : null}
          {row.chequeNo ? <span style={{ fontSize: 12, opacity: 0.65 }}>{t("เช็คเลขที่ {no}", { no: row.chequeNo })}</span> : null}
        </Space>
      ),
    },
    {
      title: t("เอกสารที่เกี่ยวข้อง"),
      key: "related",
      render: (_, row) => (
        <div style={{ fontSize: 13 }} onClick={(event) => event.stopPropagation()}>
          {row.advanceRequest ? (
            <div>
              <Typography.Text type="secondary">{t("ใบขอจ่ายล่วงหน้า")}: </Typography.Text>
              <Link href={`/finance/payables/advance-requests/${row.advanceRequest.id}`}>{row.advanceRequest.no}</Link>
            </div>
          ) : null}
          {row.aps.length > 0 ? (
            <div>
              <Typography.Text type="secondary">AP: </Typography.Text>
              <Space size={[6, 0]} wrap>
                {row.aps.map((ap) => (
                  <Link key={ap.id} href={`/finance/payables/ap-invoices/${ap.id}`}>
                    {ap.no}
                  </Link>
                ))}
              </Space>
            </div>
          ) : null}
          {row.po ? (
            <div>
              <Typography.Text type="secondary">PO: </Typography.Text>
              <Link href={`/purchase-orders/${row.po.id}`}>{row.po.no}</Link>
            </div>
          ) : null}
          {!row.advanceRequest && row.aps.length === 0 && !row.po ? "—" : null}
        </div>
      ),
    },
    {
      title: t("ยอดรวม / WHT / จ่ายจริง"),
      key: "amounts",
      width: 190,
      align: "right",
      render: (_, row) => (
        <Space orientation="vertical" size={0} style={{ textAlign: "right" }}>
          <span style={{ fontSize: 12, opacity: 0.65 }}>{t("ยอดรวม {amount}", { amount: money.format(row.grossAmount) })}</span>
          {row.whtAmount > 0 ? (
            <span style={{ fontSize: 12, opacity: 0.65 }}>{t("หัก ณ ที่จ่าย {amount}", { amount: money.format(row.whtAmount) })}</span>
          ) : null}
          <strong>{money.format(row.netAmount)}</strong>
        </Space>
      ),
    },
    {
      title: "Express",
      key: "express",
      width: 96,
      render: (_, row) => (
        <ExportCountTag
          exported={row.isExportedToExpress}
          exportCount={row.exportCount}
          lastExportedAt={row.expressExportedAt}
          docId={row.id}
          loadDocHistory={(id) =>
            getPaymentJournalDocumentExportHistory(getAccessToken(), id).then((res) => res.data)
          }
        />
      ),
    },
  ];

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="REPORTS · JOURNALS"
        icon={<FileTextOutlined />}
        title={t("สมุดรายวันจ่าย")}
        subtitle={t("อ้างอิงใบสำคัญจ่ายและการบันทึกจ่ายเงินจริง แตกเป็นบรรทัดบัญชีเดบิต/เครดิต — ชำระหนี้ AP, จ่ายล่วงหน้า, จ่ายมัดจำ")}
        actions={
          <>
<ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
          csvRequiresExport
        />
          </>
        }
      />

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยอดรวมก่อนหัก ณ ที่จ่าย")}</span>
          <span className={styles.statValue}>{money.format(data?.summary.grossAmount ?? 0)}</span>
          <span className={styles.statHint}>{t("บาท")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ภาษีหัก ณ ที่จ่าย")}</span>
          <span className={styles.statValue}>{money.format(data?.summary.whtAmount ?? 0)}</span>
          <span className={styles.statHint}>{t("บาท")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("จ่ายจริง (โอน/เช็ค/เงินสด)")}</span>
          <span className={styles.statValue}>{money.format(data?.summary.netAmount ?? 0)}</span>
          <span className={styles.statHint}>{t("บาท")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยังไม่ส่ง Express")}</span>
          <span className={styles.statValue}>{pending.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label>{t("ช่วงวันที่จ่าย")}</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={dRange}
              onChange={(values) =>
                setDRange(values && values[0] && values[1] ? [values[0], values[1]] : null)
              }
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ประเภทการจ่าย")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dKind}
              onChange={setDKind}
              options={(Object.keys(PAYMENT_KIND_LABEL) as PaymentJournalKind[]).map((value) => ({
                value,
                label: t(PAYMENT_KIND_LABEL[value]),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วิธีจ่าย")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dMethod}
              onChange={setDMethod}
              options={(["TRANSFER", "CHEQUE", "CASH"] as PaymentJournalMethod[]).map((value) => ({
                value,
                label: t(PAYMENT_METHOD_LABEL[value]),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ Express")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dExpress}
              onChange={setDExpress}
              options={[
                { value: "PENDING", label: expressSentLabel(false, lang) },
                { value: "EXPORTED", label: expressSentLabel(true, lang) },
              ]}
            />
          </div>
          <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              placeholder={t("เลขที่รายการจ่าย / ใบสำคัญจ่าย / AP / เลขอ้างอิง / ผู้ขาย")}
              value={dSearch}
              onChange={(event) => setDSearch(event.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterActions}>
            <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
            <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applySearch}>
              {t("ค้นหา")}
            </Button>
          </div>
        </div>
      </section>

      <div
        className={`${mdStyles.masterDetail}${selected ? ` ${mdStyles.masterDetailOpen}` : ""}`}
      >
        <div className={`${masterStyles.tableCard} ${mdStyles.tablePane}`}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t("รายการจ่ายเงิน")}</h3>
            </div>
            <Space>
              <span className={masterStyles.tableCount}>{t("{n} รายการ", { n: data?.total ?? 0 })}</span>
              <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
                {t("ประวัติการส่งออก")}
              </Button>
              {expressDisabledReason ? (
                <Tooltip title={expressDisabledReason}>
                  <span>
                    <Button icon={<SendOutlined />} disabled>
                      {t("ส่งออกไป Express ({pending})", { pending })}
                    </Button>
                    <Button icon={<FileExcelOutlined />} disabled style={{ marginLeft: 8 }}>
                      {t("ส่งออก Express (Excel)")}
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <>
                  {selectedKeys.length > 0 ? (
                    <Button icon={<SendOutlined />} onClick={() => openExport("selected", "csv")}>
                      {t("ส่งออกที่เลือก ({n})", { n: selectedKeys.length })}
                    </Button>
                  ) : null}
                  <Button icon={<SendOutlined />} loading={sendingExpress} onClick={() => openExport("range", "csv")}>
                    {t("ส่งออกไป Express ({pending})", { pending })}
                  </Button>
                  <Button icon={<FileExcelOutlined />} loading={sendingExpress} onClick={() => openExport("range", "xlsx")}>
                    {t("ส่งออก Express (Excel)")}
                  </Button>
                  {selectedKeys.length > 0 ? (
                    <Button icon={<FileExcelOutlined />} onClick={() => openExport("selected", "xlsx")}>
                      {t("ส่งออกที่เลือก Excel ({n})", { n: selectedKeys.length })}
                    </Button>
                  ) : null}
                </>
              )}
            </Space>
          </div>
          <Table
            className={masterStyles.dataTable}
            size="middle"
            bordered={false}
            rowKey="id"
            columns={columns}
            rowSelection={
              canExport
                ? {
                    selectedRowKeys: selectedKeys,
                    preserveSelectedRowKeys: true,
                    onChange: (keys) => setSelectedKeys(keys as string[]),
                    columnWidth: 40,
                  }
                : undefined
            }
            dataSource={items}
            loading={listQuery.isFetching}
            scroll={{ x: selected ? 1100 : 1500 }}
            rowClassName={(row) =>
              [
                mdStyles.clickableRow,
                row.id === selectedId ? mdStyles.selectedRow : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
            onRow={(row) => ({
              onClick: () => setSelectedId(row.id),
            })}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              onChange: (nextPage) => {
                setPage(nextPage);
                setSelectedId(null);
              },
              showSizeChanger: false,
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total.toLocaleString("th-TH") }),
            }}
            locale={{ emptyText: t("ไม่มีรายการจ่ายเงินตามเงื่อนไขที่เลือก") }}
          />
        </div>

        {selected ? (
          <JournalAccountDetailPanel
            docNo={selected.paymentNo ?? "—"}
            typeTag={
              <>
                <Tag color={KIND_COLOR[selected.kind]}>{kindText(selected, t)}</Tag>
                {!selected.balanced ? <Tag color="red">{t("เดบิต ≠ เครดิต")}</Tag> : null}
              </>
            }
            meta={[
              { label: t("วันที่จ่าย"), value: formatDate(selected.paymentDate) },
              {
                label: t("ผู้ขาย"),
                value: (
                  <Link href={`/finance/payables/creditors/${selected.creditorId}`}>
                    {selected.creditorCode} {selected.creditorName}
                  </Link>
                ),
              },
              { label: t("วิธีจ่าย"), value: methodText(selected, t) },
              {
                label: t("ใบสำคัญจ่าย"),
                value: (
                  <Link href={`/finance/payables/payment-vouchers/${selected.voucher.id}`}>
                    {selected.voucher.no}
                  </Link>
                ),
              },
              {
                label: t("ยอดรวม / จ่ายจริง"),
                value: (
                  <Space orientation="vertical" size={0}>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>
                      {t("ยอดรวม {amount}", { amount: money.format(selected.grossAmount) })}
                      {selected.whtAmount > 0
                        ? ` · ${t("หัก ณ ที่จ่าย {amount}", { amount: money.format(selected.whtAmount) })}`
                        : ""}
                    </span>
                    <strong>{money.format(selected.netAmount)}</strong>
                  </Space>
                ),
              },
            ]}
            references={
              <div style={{ fontSize: 13 }}>
                {selected.advanceRequest ? (
                  <div>
                    <Typography.Text type="secondary">{t("ใบขอจ่ายล่วงหน้า")}: </Typography.Text>
                    <Link
                      href={`/finance/payables/advance-requests/${selected.advanceRequest.id}`}
                    >
                      {selected.advanceRequest.no}
                    </Link>
                  </div>
                ) : null}
                {selected.aps.length > 0 ? (
                  <div>
                    <Typography.Text type="secondary">AP: </Typography.Text>
                    <Space size={[6, 0]} wrap>
                      {selected.aps.map((ap) => (
                        <Link key={ap.id} href={`/finance/payables/ap-invoices/${ap.id}`}>
                          {ap.no}
                        </Link>
                      ))}
                    </Space>
                  </div>
                ) : null}
                {selected.po ? (
                  <div>
                    <Typography.Text type="secondary">PO: </Typography.Text>
                    <Link href={`/purchase-orders/${selected.po.id}`}>{selected.po.no}</Link>
                  </div>
                ) : null}
                {!selected.advanceRequest && selected.aps.length === 0 && !selected.po
                  ? "—"
                  : null}
              </div>
            }
            lines={selected.lines}
            totalDebit={selected.totalDebit}
            totalCredit={selected.totalCredit}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
      <ExpressExportDialog
        open={exportMode !== null}
        format={exportFormat}
        title={t("ส่งออกสมุดรายวันจ่ายไป Express")}
        unit="รายการ"
        scopeLabel={
          exportMode === "selected"
            ? t("รายการจ่ายที่เลือก {n} รายการ", { n: selectedKeys.length.toLocaleString("th-TH") })
            : t("ช่วงวันที่จ่าย {from} - {to} (หนึ่งแถวต่อบรรทัดบัญชี)", { from: formatDate(filters.dateFrom), to: formatDate(filters.dateTo) })
        }
        extraNote={t("สมุดรายวันจ่ายคำนวณบรรทัดบัญชีสดจากผังบัญชีและบัญชีธนาคารปัจจุบัน — ถ้าตั้งค่าเปลี่ยนไปจากตอนส่งครั้งก่อน ไฟล์ซ้ำอาจต่างจากไฟล์เดิม")}
        previewKey={JSON.stringify({ ...exportScope(exportMode ?? "range"), format: exportFormat })}
        loadPreview={() =>
          previewPaymentJournalExpress(getAccessToken(), exportScope(exportMode ?? "range")).then(
            (res) => res.data,
          )
        }
        onConfirm={(reexport) => handleExpress(exportMode ?? "range", reexport)}
        onClose={() => setExportMode(null)}
      />
      <ExportHistoryDrawer
        open={historyOpen}
        title={t("ประวัติการส่งออกสมุดรายวันจ่ายไป Express")}
        onClose={() => setHistoryOpen(false)}
        loadHistory={(p) =>
          getPaymentJournalExportHistory(getAccessToken(), { page: p, limit: 20 }).then((res) => res.data)
        }
      />
    </section>
  );
}
