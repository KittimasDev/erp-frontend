"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  App,
  Button,
  DatePicker,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
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
import styles from "@/components/reports/PaymentJournalPage.module.css";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { arJournalQueryKey, useArJournalQuery } from "@/hooks/ar-journal/useArJournal";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import {
  exportArJournalToExpress,
  getArJournalEntryExportHistory,
  getArJournalExport,
  getArJournalExportHistory,
  previewArJournalExpress,
} from "@/lib/api/ar-journal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { arJournalDetailHref, arRefHref, arSourceHref } from "@/lib/sales/ar-journal-links";
import {
  AR_SOURCE_COLOR,
  AR_SOURCE_LABEL,
  RECEIPT_JOURNAL_SOURCES,
  SALES_JOURNAL_SOURCES,
  type ArJournalEntry,
  type ArJournalExpressStatus,
  type ArJournalKind,
  type ArJournalSourceType,
  type ArJournalStatusFilter,
} from "@/types/ar-journal";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

const PAGE_SIZE = 10;

const CONFIG: Record<
  ArJournalKind,
  {
    screen: string;
    basePath: string;
    title: string;
    subtitle: string;
    listTitle: string;
    fileStem: string;
    sources: ArJournalSourceType[];
  }
> = {
  SALES: {
    screen: "REPORTS_JOURNAL_SALES",
    basePath: "/reports/journals/sales",
    title: "สมุดรายวันขาย",
    subtitle:
      "รายการบัญชีจากใบตั้งลูกหนี้ที่ยืนยันแล้ว ใบลดหนี้ และใบเพิ่มหนี้ — เดบิตลูกหนี้การค้า / เครดิตรายได้จากการขาย + ภาษีขาย · ยกเลิกเอกสารมีรายการกลับรายการ",
    listTitle: "รายการขาย",
    fileStem: "sales-journal",
    sources: SALES_JOURNAL_SOURCES,
  },
  RECEIPT: {
    screen: "REPORTS_JOURNAL_RECEIPTS",
    basePath: "/reports/journals/receipts",
    title: "สมุดรายวันรับ",
    subtitle:
      "รายการบัญชีจากใบรับชำระ (รับบางส่วน/หลายงวด) เงินมัดจำ การใช้เครดิต ใบลดหนี้เข้าเครดิต และการคืนเงิน — เดบิตเงินฝากธนาคาร/เงินสด / เครดิตลูกหนี้การค้า",
    listTitle: "รายการรับเงิน",
    fileStem: "receipts-journal",
    sources: RECEIPT_JOURNAL_SOURCES,
  },
};

const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value?: string) => (value ? dayjs(value).format("DD/MM/BBBB") : "—");
const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "");

/** ช่วงวันที่เริ่มต้น = เดือนปัจจุบัน */
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

type ArJournalPageProps = {
  kind: ArJournalKind;
  /** หน้า Finance รายงานภาษีขายใช้ screen/basePath แยกจากเมนู Reports */
  screen?: string;
  basePath?: string;
};

export default function ArJournalPage({ kind, screen, basePath }: ArJournalPageProps) {
  const defaults = CONFIG[kind];
  const cfg = {
    ...defaults,
    screen: screen ?? defaults.screen,
    basePath: basePath ?? defaults.basePath,
  };
  const t = useT();
  const lang = useLanguage();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const perms = useScreenActionPermissions(cfg.screen);
  const customers = useCustomersQuery();

  // ตัวกรองที่กำลังกรอก (draft) — ใช้จริงเมื่อกด "ค้นหา"
  const [dRange, setDRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [dCustomer, setDCustomer] = useState<string | undefined>();
  const [dSource, setDSource] = useState<ArJournalSourceType | undefined>();
  const [dStatus, setDStatus] = useState<ArJournalStatusFilter | undefined>();
  const [dExpress, setDExpress] = useState<ArJournalExpressStatus | undefined>();
  const [dSearch, setDSearch] = useState("");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [sourceType, setSourceType] = useState<ArJournalSourceType | undefined>();
  const [status, setStatus] = useState<ArJournalStatusFilter | undefined>();
  const [expressStatus, setExpressStatus] = useState<ArJournalExpressStatus | undefined>();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const [sendingExpress, setSendingExpress] = useState(false);
  const [exportMode, setExportMode] = useState<"range" | "selected" | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("csv");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const expressFormatItems = [
    { key: "csv", icon: <FileTextOutlined />, label: t("ไฟล์ CSV") },
    { key: "xlsx", icon: <FileExcelOutlined />, label: t("ไฟล์ Excel (.xlsx)") },
  ];
  const openExport = (mode: "range" | "selected", format: "csv" | "xlsx") => {
    setExportFormat(format);
    setExportMode(mode);
  };

  const applySearch = () => {
    setRange(dRange);
    setCustomerId(dCustomer);
    setSourceType(dSource);
    setStatus(dStatus);
    setExpressStatus(dExpress);
    setKeyword(dSearch.trim());
    setPage(1);
    setSelectedId(null);
    setSelectedKeys([]);
  };
  const clearFilters = () => {
    const fresh = defaultRange();
    setDRange(fresh);
    setDCustomer(undefined);
    setDSource(undefined);
    setDStatus(undefined);
    setDExpress(undefined);
    setDSearch("");
    setRange(fresh);
    setCustomerId(undefined);
    setSourceType(undefined);
    setStatus(undefined);
    setExpressStatus(undefined);
    setKeyword("");
    setPage(1);
    setSelectedId(null);
  };

  const canExport = !isMatrixPermissionMode() || hasPermission(`${cfg.screen}.EXPORT`);

  const filters = useMemo(
    () => ({
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      customerId,
      sourceType,
      status,
      expressStatus,
      search: keyword || undefined,
    }),
    [range, customerId, sourceType, status, expressStatus, keyword],
  );
  const listQuery = useArJournalQuery(kind, { ...filters, page, limit: PAGE_SIZE });
  const data = listQuery.data;
  const items = data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const sourceText = (entry: ArJournalEntry) => {
    const label = AR_SOURCE_LABEL[entry.sourceType];
    return label ? t(label) : entry.sourceLabel;
  };

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const { items: all, summary } = (await getArJournalExport(getAccessToken(), kind, filters)).data;
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/BBBB HH:mm")}`,
        filters.dateFrom || filters.dateTo
          ? `วันที่ลงบัญชี: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
          : null,
        filters.sourceType ? `ประเภท: ${AR_SOURCE_LABEL[filters.sourceType]}` : null,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        kind === "SALES"
          ? `ทั้งหมด ${all.length} รายการ · ก่อน VAT ${money.format(summary.subtotalAmount)} · VAT ${money.format(summary.vatAmount)} · รวม ${money.format(summary.totalAmount)} บาท`
          : `ทั้งหมด ${all.length} รายการ · เงินรับสุทธิ ${money.format(summary.receivedAmount)} บาท`,
        `เดบิต ${money.format(summary.totalDebit)} / เครดิต ${money.format(summary.totalCredit)}`,
      ].filter((v): v is string => Boolean(v));

      const rows: string[][] = [];
      const groupRows: number[] = [];
      const subGroupRows: number[] = [];
      all.forEach((doc, index) => {
        groupRows.push(rows.length);
        const refs = doc.refs.map((r) => r.no).join(" ");
        rows.push([
          String(index + 1),
          formatDate(doc.postingDate),
          doc.entryNo,
          `${doc.customerCode} ${doc.customerName}`,
          "",
          "",
          doc.event === "REVERSAL" ? `กลับรายการ ${doc.sourceLabel}` : doc.sourceLabel,
          `${doc.docNo}${refs ? ` · อ้างอิง ${refs}` : ""}${doc.bankLabel ? ` · ${doc.bankLabel}` : ""}`,
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
        title: cfg.title,
        filename: `${cfg.fileStem}-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          "ลำดับ",
          "วันที่ลงบัญชี",
          "เลขที่รายการ / รหัสบัญชี",
          "ลูกค้า / ชื่อบัญชี",
          "เดบิต",
          "เครดิต",
          "ประเภท",
          "เอกสาร / คำอธิบาย",
        ],
        rows,
        groupRows,
        subGroupRows,
        pdfColumns: [
          { header: "ลำดับ", cells: [0], width: 34, align: "center" },
          { header: "วันที่", cells: [1], width: 58 },
          { header: "เลขที่รายการ / รหัสบัญชี", cells: [2], width: 100 },
          { header: "ลูกค้า / ชื่อบัญชี", cells: [3], width: 132 },
          { header: "เดบิต", cells: [4], width: 66, numeric: true },
          { header: "เครดิต", cells: [5], width: 66, numeric: true },
          { header: "ประเภท", cells: [6], width: 64 },
          { header: "เอกสาร / คำอธิบาย", cells: [7], width: 226 },
        ],
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("ส่งออกสมุดรายวันไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  const exportScope = (mode: "range" | "selected") =>
    mode === "selected"
      ? { documentIds: selectedKeys }
      : {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          customerId: filters.customerId,
          sourceType: filters.sourceType,
          search: filters.search,
        };

  const handleExpress = async (mode: "range" | "selected", reexport: boolean) => {
    setSendingExpress(true);
    try {
      const { count, blob, filename } = await exportArJournalToExpress(
        getAccessToken(),
        kind,
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
        reexport
          ? t("สร้างไฟล์ Express {count} รายการแล้ว (รวมส่งซ้ำ)", { count: count.toLocaleString("th-TH") })
          : t("สร้างไฟล์ Express {count} รายการแล้ว", { count: count.toLocaleString("th-TH") }),
      );
      if (mode === "selected") setSelectedKeys([]);
      await queryClient.invalidateQueries({ queryKey: arJournalQueryKey });
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
    ? t("ไม่มีสิทธิ์ส่งออก (ต้องมีสิทธิ์ EXPORT ของสมุดรายวันนี้)")
    : !range
      ? t("เลือกช่วงวันที่ลงบัญชีก่อน")
      : null;

  const statusTags = (row: ArJournalEntry) => (
    <>
      {row.event === "REVERSAL" ? <Tag color="red">{t("กลับรายการ")}</Tag> : null}
      {row.event === "POST" && row.reversed ? <Tag color="default">{t("ถูกกลับรายการแล้ว")}</Tag> : null}
      {!row.balanced ? <Tag color="red">{t("เดบิต ≠ เครดิต")}</Tag> : null}
      {row.unmapped.length > 0 ? <Tag color="orange">{t("ยังไม่ผูกบัญชี")}</Tag> : null}
    </>
  );

  const refLinks = (row: ArJournalEntry) =>
    row.refs.length > 0 ? (
      <Space size={[6, 0]} wrap>
        {row.refs.map((ref) => (
          <Link key={`${ref.type}-${ref.id}`} href={arRefHref(ref)}>
            {ref.no}
          </Link>
        ))}
      </Space>
    ) : (
      "—"
    );

  const columns: ColumnsType<ArJournalEntry> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: kind === "RECEIPT" ? t("วันที่ลงบัญชี / วันที่รับเงิน") : t("วันที่ลงบัญชี"),
      key: "date",
      width: 130,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <span>{formatDate(row.postingDate)}</span>
          {kind === "RECEIPT" && row.transactionDate && row.transactionDate !== row.postingDate ? (
            <span style={{ fontSize: 12, opacity: 0.65 }}>{formatDate(row.transactionDate)}</span>
          ) : null}
        </Space>
      ),
    },
    {
      title: t("เลขที่รายการบัญชี"),
      key: "entry",
      width: 230,
      render: (_, row) => (
        <Space orientation="vertical" size={0} onClick={(event) => event.stopPropagation()}>
          <Link href={arJournalDetailHref(cfg.basePath, row.id)}>{row.entryNo}</Link>
          <Space size={4} wrap>
            <Tag color={AR_SOURCE_COLOR[row.sourceType]} style={{ marginInlineEnd: 0 }}>
              {sourceText(row)}
            </Tag>
            {statusTags(row)}
          </Space>
        </Space>
      ),
    },
    {
      title: kind === "RECEIPT" ? t("เลขที่ใบเสร็จรับเงิน") : t("เลขที่ใบแจ้งหนี้/เอกสาร"),
      key: "doc",
      width: 170,
      render: (_, row) => {
        const href = arSourceHref(row);
        return (
          <span onClick={(event) => event.stopPropagation()}>
            {href ? <Link href={href}>{row.docNo}</Link> : row.docNo}
          </span>
        );
      },
    },
    {
      title: kind === "RECEIPT" ? t("ใบแจ้งหนี้ที่อ้างอิง") : t("เอกสารอ้างอิง"),
      key: "refs",
      width: 190,
      render: (_, row) => <span onClick={(event) => event.stopPropagation()}>{refLinks(row)}</span>,
    },
    {
      title: t("ลูกค้า"),
      key: "customer",
      width: 220,
      render: (_, row) => (
        <span>
          {row.customerCode} {row.customerName}
        </span>
      ),
    },
    ...(kind === "RECEIPT"
      ? ([
          {
            title: t("วิธีรับชำระ / บัญชีธนาคาร"),
            key: "method",
            width: 220,
            render: (_: unknown, row: ArJournalEntry) => (
              <Space orientation="vertical" size={0}>
                <span>{row.paymentMethod ?? "—"}</span>
                {row.bankLabel ? <span style={{ fontSize: 12, opacity: 0.65 }}>{row.bankLabel}</span> : null}
                {row.transactionRef ? (
                  <span style={{ fontSize: 12, opacity: 0.65 }}>{t("อ้างอิง {ref}", { ref: row.transactionRef })}</span>
                ) : null}
              </Space>
            ),
          },
          {
            title: t("จำนวนเงิน"),
            key: "amount",
            width: 150,
            align: "right" as const,
            render: (_: unknown, row: ArJournalEntry) => (
              <Space orientation="vertical" size={0} style={{ textAlign: "right" }}>
                <strong>{money.format(row.receivedAmount ?? 0)}</strong>
                {(row.whtAmount ?? 0) > 0 ? (
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    {t("หัก ณ ที่จ่าย {amount}", { amount: money.format(row.whtAmount ?? 0) })}
                  </span>
                ) : null}
              </Space>
            ),
          },
        ] as ColumnsType<ArJournalEntry>)
      : ([
          {
            title: t("ก่อน VAT / VAT / รวม"),
            key: "amounts",
            width: 190,
            align: "right" as const,
            render: (_: unknown, row: ArJournalEntry) => (
              <Space orientation="vertical" size={0} style={{ textAlign: "right" }}>
                <span style={{ fontSize: 12, opacity: 0.65 }}>
                  {t("ก่อน VAT {amount}", { amount: money.format(row.subtotalAmount ?? 0) })}
                </span>
                <span style={{ fontSize: 12, opacity: 0.65 }}>VAT {money.format(row.vatAmount ?? 0)}</span>
                <strong>{money.format(row.totalAmount ?? 0)}</strong>
              </Space>
            ),
          },
        ] as ColumnsType<ArJournalEntry>)),
    {
      title: t("เดบิต / เครดิต"),
      key: "dc",
      width: 140,
      align: "right",
      render: (_, row) => (
        <Space orientation="vertical" size={0} style={{ textAlign: "right" }}>
          <span style={{ fontSize: 12 }}>{money.format(row.totalDebit)}</span>
          <span style={{ fontSize: 12 }}>{money.format(row.totalCredit)}</span>
        </Space>
      ),
    },
    {
      title: "Express",
      key: "express",
      width: 96,
      render: (_, row) => (
        <ExportCountTag
          exported={row.exportCount > 0}
          exportCount={row.exportCount}
          lastExportedAt={row.lastExportedAt}
          docId={row.id}
          loadDocHistory={(id) =>
            getArJournalEntryExportHistory(getAccessToken(), kind, id).then((res) => res.data)
          }
        />
      ),
    },
  ];

  if (!perms.canView) return <AccessDenied screenCodes={[cfg.screen]} />;

  const selectedHref = selected ? arSourceHref(selected) : null;

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="REPORTS · JOURNALS"
        icon={<FileTextOutlined />}
        title={t(cfg.title)}
        subtitle={t(cfg.subtitle)}
        actions={
          <ReportExportButtons
            canExport={canExport}
            downloading={downloading}
            onExport={(format) => void handleExport(format)}
            csvRequiresExport
          />
        }
      />

      <div className={styles.statRow}>
        {kind === "SALES" ? (
          <>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>{t("ยอดก่อน VAT (สุทธิ)")}</span>
              <span className={styles.statValue}>{money.format(data?.summary.subtotalAmount ?? 0)}</span>
              <span className={styles.statHint}>{t("บาท")}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>{t("ภาษีขาย")}</span>
              <span className={styles.statValue}>{money.format(data?.summary.vatAmount ?? 0)}</span>
              <span className={styles.statHint}>{t("บาท")}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.statLabel}>{t("ยอดรวม (ลูกหนี้)")}</span>
              <span className={styles.statValue}>{money.format(data?.summary.totalAmount ?? 0)}</span>
              <span className={styles.statHint}>{t("บาท")}</span>
            </div>
          </>
        ) : (
          <div className={styles.statChip}>
            <span className={styles.statLabel}>{t("เงินรับสุทธิ")}</span>
            <span className={styles.statValue}>{money.format(data?.summary.receivedAmount ?? 0)}</span>
            <span className={styles.statHint}>{t("บาท")}</span>
          </div>
        )}
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("เดบิต / เครดิต")}</span>
          <span className={styles.statValue} style={{ fontSize: 16 }}>
            {money.format(data?.summary.totalDebit ?? 0)} / {money.format(data?.summary.totalCredit ?? 0)}
          </span>
          <span className={styles.statHint}>
            {(data?.unbalancedCount ?? 0) > 0
              ? t("ไม่สมดุล {n} รายการ", { n: data?.unbalancedCount ?? 0 })
              : t("สมดุล")}
          </span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยังไม่ส่ง Express")}</span>
          <span className={styles.statValue}>{pending.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>
            {(data?.unmappedCount ?? 0) > 0
              ? t("ยังไม่ผูกบัญชี {n} รายการ", { n: data?.unmappedCount ?? 0 })
              : t("รายการ")}
          </span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label>{t("ช่วงวันที่ลงบัญชี")}</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/BBBB"
              value={dRange}
              onChange={(values) =>
                setDRange(values && values[0] && values[1] ? [values[0], values[1]] : null)
              }
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ลูกค้า")}</label>
            <Select
              allowClear
              showSearch
              placeholder={t("ทั้งหมด")}
              value={dCustomer}
              onChange={setDCustomer}
              loading={customers.isLoading}
              optionFilterProp="label"
              options={(customers.data?.data ?? []).map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ประเภทรายการ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dSource}
              onChange={setDSource}
              options={cfg.sources.map((value) => ({ value, label: t(AR_SOURCE_LABEL[value]) }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะรายการบัญชี")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={dStatus}
              onChange={setDStatus}
              options={[
                { value: "NORMAL", label: t("ปกติ") },
                { value: "REVERSAL", label: t("รายการกลับรายการ") },
                { value: "REVERSED", label: t("ถูกกลับรายการแล้ว") },
              ]}
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
              placeholder={t("เลขที่รายการ / เอกสาร / เอกสารอ้างอิง / ลูกค้า")}
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

      <div className={`${mdStyles.masterDetail}${selected ? ` ${mdStyles.masterDetailOpen}` : ""}`}>
        <div className={`${masterStyles.tableCard} ${mdStyles.tablePane}`}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t(cfg.listTitle)}</h3>
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
                      {t("รายการที่ยังไม่ได้ส่งออก Express ({pending})", { pending })}
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <>
                  <Dropdown
                    menu={{
                      items: expressFormatItems,
                      onClick: ({ key }) => openExport("range", key as "csv" | "xlsx"),
                    }}
                  >
                    <Button icon={<SendOutlined />} loading={sendingExpress}>
                      {t("รายการที่ยังไม่ได้ส่งออก Express ({pending})", { pending })} <DownOutlined />
                    </Button>
                  </Dropdown>
                  {selectedKeys.length > 0 ? (
                    <Dropdown
                      menu={{
                        items: expressFormatItems,
                        onClick: ({ key }) => openExport("selected", key as "csv" | "xlsx"),
                      }}
                    >
                      <Button icon={<SendOutlined />}>
                        {t("รายการที่จะส่งออก Express ({n})", { n: selectedKeys.length })} <DownOutlined />
                      </Button>
                    </Dropdown>
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
            scroll={{ x: selected ? 1100 : 1700 }}
            rowClassName={(row) =>
              [mdStyles.clickableRow, row.id === selectedId ? mdStyles.selectedRow : ""]
                .filter(Boolean)
                .join(" ")
            }
            onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
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
            locale={{ emptyText: t("ไม่มีรายการบัญชีตามเงื่อนไขที่เลือก") }}
          />
        </div>

        {selected ? (
          <JournalAccountDetailPanel
            docNo={selected.entryNo}
            typeTag={
              <>
                <Tag color={AR_SOURCE_COLOR[selected.sourceType]}>{sourceText(selected)}</Tag>
                {statusTags(selected)}
              </>
            }
            meta={[
              { label: t("วันที่ลงบัญชี"), value: formatDate(selected.postingDate) },
              {
                label: t("เอกสารต้นทาง"),
                value: selectedHref ? <Link href={selectedHref}>{selected.docNo}</Link> : selected.docNo,
              },
              { label: t("ลูกค้า"), value: `${selected.customerCode} ${selected.customerName}` },
              ...(kind === "RECEIPT"
                ? [
                    {
                      label: t("วิธีรับชำระ / บัญชีธนาคาร"),
                      value: [selected.paymentMethod, selected.bankLabel].filter(Boolean).join(" · ") || "—",
                    },
                    { label: t("จำนวนเงิน"), value: <strong>{money.format(selected.receivedAmount ?? 0)}</strong> },
                  ]
                : [
                    {
                      label: t("ก่อน VAT / VAT / รวม"),
                      value: `${money.format(selected.subtotalAmount ?? 0)} / ${money.format(selected.vatAmount ?? 0)} / ${money.format(selected.totalAmount ?? 0)}`,
                    },
                    // เฉพาะใบที่มีการหักมัดจำ (หักมัดจำแสดงยอดรวม VAT)
                    ...(selected.advanceDeductedAmount
                      ? [
                          { label: t("ยอดเต็ม"), value: money.format(selected.fullAmount ?? 0) },
                          { label: t("หักมัดจำ"), value: money.format(selected.advanceDeductedAmount) },
                          {
                            label: t("ลูกหนี้สุทธิ"),
                            value: <strong>{money.format(selected.netReceivableAmount ?? 0)}</strong>,
                          },
                        ]
                      : []),
                  ]),
            ]}
            references={
              <div style={{ fontSize: 13 }}>
                <Typography.Text type="secondary">{t("เอกสารอ้างอิง")}: </Typography.Text>
                {refLinks(selected)}
                {selected.frozen ? (
                  <div style={{ marginTop: 4, opacity: 0.7 }}>
                    {t("บรรทัดบัญชีถูกตรึงตอนส่งออก Express (ไม่เปลี่ยนตามผังบัญชีภายหลัง)")}
                  </div>
                ) : null}
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
        title={t("ส่งออก{title}ไป Express", { title: t(cfg.title) })}
        unit="รายการ"
        scopeLabel={
          exportMode === "selected"
            ? t("รายการที่เลือก {n} รายการ", { n: selectedKeys.length.toLocaleString("th-TH") })
            : t("ช่วงวันที่ลงบัญชี {from} - {to} (หนึ่งแถวต่อบรรทัดบัญชี)", {
                from: formatDate(filters.dateFrom),
                to: formatDate(filters.dateTo),
              })
        }
        extraNote={t("บรรทัดบัญชีถูกตรึงตอนส่งออกครั้งแรก — ส่งซ้ำได้ไฟล์เดิมเป๊ะแม้ผังบัญชีเปลี่ยนภายหลัง")}
        previewKey={JSON.stringify({ ...exportScope(exportMode ?? "range"), format: exportFormat })}
        loadPreview={() =>
          previewArJournalExpress(getAccessToken(), kind, exportScope(exportMode ?? "range")).then(
            (res) => res.data,
          )
        }
        onConfirm={(reexport) => handleExpress(exportMode ?? "range", reexport)}
        onClose={() => setExportMode(null)}
      />
      <ExportHistoryDrawer
        open={historyOpen}
        title={t("ประวัติการส่งออก{title}ไป Express", { title: t(cfg.title) })}
        onClose={() => setHistoryOpen(false)}
        loadHistory={(p) =>
          getArJournalExportHistory(getAccessToken(), kind, { page: p, limit: 20 }).then((res) => res.data)
        }
      />
    </section>
  );
}
