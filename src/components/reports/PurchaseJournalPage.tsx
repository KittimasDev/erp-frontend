"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, DatePicker, Input, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, HistoryOutlined, SearchOutlined, SendOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import JournalAccountDetailPanel, {
  journalMasterDetailStyles as mdStyles,
} from "@/components/reports/JournalAccountDetailPanel";
import {
  ExportCountTag,
  ExportHistoryDrawer,
  ExpressExportDialog,
} from "@/components/reports/JournalExpressExport";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import styles from "@/components/reports/PurchaseJournalPage.module.css";
import { usePurchaseJournalQuery, purchaseJournalQueryKey } from "@/hooks/purchase-journal/usePurchaseJournal";
import {
  exportPurchaseJournalToExpress,
  getPurchaseJournalDocumentExportHistory,
  getPurchaseJournalExport,
  getPurchaseJournalExportHistory,
  previewPurchaseJournalExpress,
} from "@/lib/api/purchase-journal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import {
  JOURNAL_DOC_TYPE_LABEL,
  type JournalDocRef,
  type JournalDocType,
  type JournalExpressStatus,
  type JournalLine,
  type PurchaseJournalItem,
} from "@/types/purchase-journal";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

const SCREEN_CODE = "REPORTS_JOURNAL_PURCHASES";
const PAGE_SIZE = 10;

const AP_BASE_PATH: Record<JournalDocType, string> = {
  AP_INVOICE: "/finance/payables/ap-invoices",
  DEBIT_NOTE: "/finance/payables/debit-notes",
  CREDIT_NOTE: "/finance/payables/credit-notes",
};
const DOC_TYPE_COLOR: Record<JournalDocType, string> = {
  AP_INVOICE: "blue",
  DEBIT_NOTE: "orange",
  CREDIT_NOTE: "purple",
};

const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value?: string) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");
const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "");

function taxGroupLabel(line: JournalLine): string {
  if (line.taxGroup === "VAT") return line.vatRate ? `มี VAT ${line.vatRate}%` : "มี VAT";
  if (line.taxGroup === "NON_VAT") return "ไม่มี VAT";
  return line.taxGroup === "TAX" ? "ภาษีซื้อ" : "เจ้าหนี้";
}

function RefLinks({ label, list, basePath }: { label: string; list: JournalDocRef[]; basePath: string }) {
  if (list.length === 0) return null;
  return (
    <div>
      <Typography.Text type="secondary">{label}: </Typography.Text>
      <Space size={[6, 0]} wrap>
        {list.map((ref) => (
          <Link key={ref.id} href={`${basePath}/${ref.id}`}>
            {ref.no}
          </Link>
        ))}
      </Space>
    </div>
  );
}

/** ช่วงวันที่เริ่มต้น = เดือนปัจจุบัน */
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PurchaseJournalPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  // ตัวกรองที่กำลังกรอก (draft) — ใช้จริงเมื่อกด "ค้นหา" เท่านั้น
  const [dRange, setDRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [dDocType, setDDocType] = useState<JournalDocType | undefined>();
  const [dExpress, setDExpress] = useState<JournalExpressStatus | undefined>();
  const [dSearch, setDSearch] = useState("");
  // ตัวกรองที่ใช้อยู่จริง (applied)
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [docType, setDocType] = useState<JournalDocType | undefined>();
  const [expressStatus, setExpressStatus] = useState<JournalExpressStatus | undefined>();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const [sendingExpress, setSendingExpress] = useState(false);
  // ส่งออกไป Express: 'range' = ตามช่วงวันที่, 'selected' = เฉพาะแถวที่ติ๊กเลือก
  const [exportMode, setExportMode] = useState<"range" | "selected" | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const applySearch = () => {
    setRange(dRange);
    setDocType(dDocType);
    setExpressStatus(dExpress);
    setKeyword(dSearch.trim());
    setPage(1);
    setSelectedId(null);
    setSelectedKeys([]);
  };
  const clearFilters = () => {
    const fresh = defaultRange();
    setDRange(fresh);
    setDDocType(undefined);
    setDExpress(undefined);
    setDSearch("");
    setRange(fresh);
    setDocType(undefined);
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
      docType,
      expressStatus,
      search: keyword || undefined,
    }),
    [range, docType, expressStatus, keyword],
  );
  const listQuery = usePurchaseJournalQuery({ ...filters, page, limit: PAGE_SIZE });
  const data = listQuery.data;
  const items = data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const { items: all, summary } = (await getPurchaseJournalExport(getAccessToken(), filters)).data;
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/YYYY HH:mm")}`,
        filters.dateFrom || filters.dateTo
          ? `วันที่เอกสาร: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
          : null,
        filters.docType ? `ประเภท: ${JOURNAL_DOC_TYPE_LABEL[filters.docType]}` : null,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        `ทั้งหมด ${all.length} เอกสาร · ก่อนภาษี ${money.format(summary.subtotalAmount)} · VAT ${money.format(summary.vatAmount)} · รวม ${money.format(summary.totalAmount)} บาท`,
      ].filter((v): v is string => Boolean(v));

      const rows: string[][] = [];
      const groupRows: number[] = [];
      const subGroupRows: number[] = [];
      all.forEach((doc, index) => {
        groupRows.push(rows.length);
        const related = [
          doc.itemNames.length ? `สินค้า ${doc.itemNames.join(", ")}` : null,
          doc.po ? `PO ${doc.po.no}` : null,
          doc.grns.length ? `GRN ${doc.grns.map((g) => g.no).join(" ")}` : null,
          doc.billingNotes.length ? `ใบวางบิล ${doc.billingNotes.map((b) => b.no).join(" ")}` : null,
          doc.paymentVouchers.length ? `PV ${doc.paymentVouchers.map((p) => p.no).join(" ")}` : null,
          doc.reference ? `อ้างอิง ${doc.reference.no}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        rows.push([
          String(index + 1),
          formatDate(doc.docDate),
          doc.docNo,
          `${doc.creditorCode} ${doc.creditorName}`,
          "",
          "",
          JOURNAL_DOC_TYPE_LABEL[doc.docType],
          related,
        ]);
        for (const line of doc.lines) {
          rows.push([
            String(line.no),
            "",
            line.accountCode ?? "ยังไม่ผูกบัญชี",
            line.accountName ?? "",
            moneyOrBlank(line.debit),
            moneyOrBlank(line.credit),
            taxGroupLabel(line),
            line.detail ? `${line.description} · ${line.detail}` : line.description,
          ]);
        }
        subGroupRows.push(rows.length);
        rows.push(["", "", "ยอดรวมสุทธิ", "", money.format(doc.totalDebit), money.format(doc.totalCredit), "", ""]);
      });

      await downloadTabularReport(format, {
        title: "สมุดรายวันซื้อ",
        filename: `purchase-journal-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          "ลำดับ",
          "วันที่",
          "เลขที่เอกสาร / รหัสบัญชี",
          "ผู้ขาย / ชื่อบัญชี",
          "เดบิต",
          "เครดิต",
          "กลุ่มภาษี",
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
          { header: "กลุ่มภาษี", cells: [6], width: 54 },
          { header: "คำอธิบาย / เอกสารที่เกี่ยวข้อง", cells: [7], width: 236 },
        ],
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "ส่งออกสมุดรายวันซื้อไม่สำเร็จ");
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
          docType: filters.docType,
          search: filters.search,
        };

  const handleExpress = async (mode: "range" | "selected", reexport: boolean) => {
    setSendingExpress(true);
    try {
      const { count, blob, filename } = await exportPurchaseJournalToExpress(getAccessToken(), {
        ...exportScope(mode),
        reexport,
      });
      if (count === 0) {
        message.info("ไม่มีรายการที่ต้องส่งออก");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      message.success(
        `สร้างไฟล์ Express ${count.toLocaleString("th-TH")} เอกสารแล้ว${reexport ? " (รวมส่งซ้ำ)" : ""}`,
      );
      if (mode === "selected") setSelectedKeys([]);
      await queryClient.invalidateQueries({ queryKey: purchaseJournalQueryKey });
    } catch (error) {
      modal.error({
        title: "ส่งออกไป Express ไม่สำเร็จ",
        content: (
          <div>
            <div>{error instanceof Error ? error.message : "ส่งออกไป Express ไม่สำเร็จ"}</div>
            <div>ไม่มีการบันทึกว่าส่งออกสำเร็จ — แก้ไขแล้วลองใหม่ได้</div>
            <Link href="/masters/gl-accounts">ไปหน้าผังบัญชีและการผูกบัญชี</Link>
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
    ? "ไม่มีสิทธิ์ส่งออก (ต้องมีสิทธิ์ EXPORT ของสมุดรายวันซื้อ)"
    : !range
      ? "เลือกช่วงวันที่เอกสารก่อน"
      : null;

  const columns: ColumnsType<PurchaseJournalItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    { title: "วันที่เอกสาร", dataIndex: "docDate", width: 110, render: formatDate },
    {
      title: "เลขที่เอกสาร",
      key: "doc",
      width: 190,
      render: (_, row) => (
        <Space orientation="vertical" size={0} onClick={(event) => event.stopPropagation()}>
          <Link href={`/reports/journals/purchases/${row.id}`}>{row.docNo}</Link>
          <Space size={4}>
            <Tag color={DOC_TYPE_COLOR[row.docType]} style={{ marginInlineEnd: 0 }}>
              {JOURNAL_DOC_TYPE_LABEL[row.docType]}
            </Tag>
            {!row.balanced ? <Tag color="red">เดบิต ≠ เครดิต</Tag> : null}
          </Space>
        </Space>
      ),
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      width: 230,
      render: (_, row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <Link href={`/finance/payables/creditors/${row.creditorId}`}>
            {row.creditorCode} {row.creditorName}
          </Link>
        </span>
      ),
    },
    {
      title: "รายการสินค้า",
      key: "items",
      width: 220,
      render: (_, row) =>
        row.itemNames.length > 0 ? (
          <Typography.Paragraph ellipsis={{ rows: 2, tooltip: row.itemNames.join(", ") }} style={{ margin: 0 }}>
            {row.itemNames.join(", ")}
          </Typography.Paragraph>
        ) : (
          "—"
        ),
    },
    {
      title: "ใบกำกับภาษี",
      key: "tax",
      width: 150,
      render: (_, row) =>
        row.taxInvoiceNo ? (
          <Space orientation="vertical" size={0}>
            <span>{row.taxInvoiceNo}</span>
            <span style={{ fontSize: 12, opacity: 0.65 }}>{formatDate(row.taxInvoiceDate)}</span>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: "เอกสารที่เกี่ยวข้อง",
      key: "related",
      render: (_, row) => (
        <div style={{ fontSize: 13 }} onClick={(event) => event.stopPropagation()}>
          {row.po ? (
            <div>
              <Typography.Text type="secondary">PO: </Typography.Text>
              <Link href={`/purchase-orders/${row.po.id}`}>{row.po.no}</Link>
            </div>
          ) : null}
          <RefLinks label="GRN" list={row.grns} basePath="/goods-receipts" />
          <RefLinks label="ใบวางบิล" list={row.billingNotes} basePath="/finance/payables/billing-notes" />
          <RefLinks label="ใบสำคัญจ่าย" list={row.paymentVouchers} basePath="/finance/payables/payment-vouchers" />
          {row.reference ? (
            <div>
              <Typography.Text type="secondary">อ้างอิง: </Typography.Text>
              <Link href={`${AP_BASE_PATH[row.reference.docType as JournalDocType]}/${row.reference.id}`}>
                {row.reference.no}
              </Link>
            </div>
          ) : null}
          {!row.po && row.grns.length === 0 && row.billingNotes.length === 0 && row.paymentVouchers.length === 0 && !row.reference
            ? "—"
            : null}
        </div>
      ),
    },
    {
      title: "ยอดรวม (สุทธิ)",
      dataIndex: "totalAmount",
      width: 140,
      align: "right",
      render: (v: number) => <strong style={v < 0 ? { color: "#cf1322" } : undefined}>{money.format(v)}</strong>,
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
            getPurchaseJournalDocumentExportHistory(getAccessToken(), id).then((res) => res.data)
          }
        />
      ),
    },
  ];

  return (
    <section className={styles.page}>
      <div className={masterStyles.pageHeader} style={{ gridTemplateColumns: "1fr auto" }}>
        <div className={masterStyles.headerContent}>
          <div className={styles.badge}>
            <span className={styles.badgeIcon} aria-hidden>
              <FileTextOutlined />
            </span>
            REPORTS · JOURNALS
          </div>
          <h2 className={masterStyles.pageTitle}>สมุดรายวันซื้อ</h2>
          <span className={masterStyles.pageSubtitle}>
            ใบตั้งหนี้ ใบเพิ่มหนี้ ใบลดหนี้ที่อนุมัติแล้ว แตกเป็นบรรทัดบัญชีเดบิต/เครดิต
          </span>
        </div>
        <ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
          csvRequiresExport
        />
      </div>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>มูลค่าก่อนภาษี</span>
          <span className={styles.statValue}>{money.format(data?.summary.subtotalAmount ?? 0)}</span>
          <span className={styles.statHint}>สุทธิหลังหักใบลดหนี้ (บาท)</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ภาษีซื้อ</span>
          <span className={styles.statValue}>{money.format(data?.summary.vatAmount ?? 0)}</span>
          <span className={styles.statHint}>สุทธิหลังหักใบลดหนี้ (บาท)</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดรวมเจ้าหนี้</span>
          <span className={styles.statValue}>{money.format(data?.summary.totalAmount ?? 0)}</span>
          <span className={styles.statHint}>หักใบลดหนี้แล้ว (บาท)</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยังไม่ส่ง Express</span>
          <span className={styles.statValue}>{pending.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>เอกสาร</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่เอกสาร</label>
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
            <label>ประเภทเอกสาร</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={dDocType}
              onChange={setDDocType}
              options={(Object.keys(JOURNAL_DOC_TYPE_LABEL) as JournalDocType[]).map((value) => ({
                value,
                label: JOURNAL_DOC_TYPE_LABEL[value],
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ Express</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={dExpress}
              onChange={setDExpress}
              options={[
                { value: "PENDING", label: "ยังไม่ส่ง" },
                { value: "EXPORTED", label: "ส่งแล้ว" },
              ]}
            />
          </div>
          <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
            <label>ค้นหา</label>
            <Input
              allowClear
              placeholder="เลขที่เอกสาร / ใบกำกับภาษี / PO / GRN / ผู้ขาย"
              value={dSearch}
              onChange={(event) => setDSearch(event.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterActions}>
            <Button onClick={clearFilters}>เคลียร์</Button>
            <Button
              type="primary"
              className={styles.searchBtn}
              icon={<SearchOutlined />}
              onClick={applySearch}
            >
              ค้นหา
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
              <div className={masterStyles.tableEyebrow}>รายการ</div>
              <h3>รายการซื้อรายวัน</h3>
            </div>
            <Space>
              <span className={masterStyles.tableCount}>{data?.total ?? 0} เอกสาร</span>
              <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
                ประวัติการส่งออก
              </Button>
              {expressDisabledReason ? (
                <Tooltip title={expressDisabledReason}>
                  <span>
                    <Button icon={<SendOutlined />} disabled>
                      ส่งออกไป Express ({pending})
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <>
                  {selectedKeys.length > 0 ? (
                    <Button icon={<SendOutlined />} onClick={() => setExportMode("selected")}>
                      ส่งออกที่เลือก ({selectedKeys.length})
                    </Button>
                  ) : null}
                  <Button icon={<SendOutlined />} loading={sendingExpress} onClick={() => setExportMode("range")}>
                    ส่งออกไป Express ({pending})
                  </Button>
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
            scroll={{ x: selected ? 1100 : 1520 }}
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
              showTotal: (total) => `ทั้งหมด ${total.toLocaleString("th-TH")} เอกสาร`,
            }}
            locale={{ emptyText: "ไม่มีรายการซื้อที่อนุมัติแล้วตามเงื่อนไขที่เลือก" }}
          />
        </div>

        {selected ? (
          <JournalAccountDetailPanel
            docNo={selected.docNo}
            typeTag={
              <>
                <Tag color={DOC_TYPE_COLOR[selected.docType]}>
                  {JOURNAL_DOC_TYPE_LABEL[selected.docType]}
                </Tag>
                {!selected.balanced ? <Tag color="red">เดบิต ≠ เครดิต</Tag> : null}
              </>
            }
            meta={[
              { label: "วันที่เอกสาร", value: formatDate(selected.docDate) },
              {
                label: "ผู้ขาย",
                value: (
                  <Link href={`/finance/payables/creditors/${selected.creditorId}`}>
                    {selected.creditorCode} {selected.creditorName}
                  </Link>
                ),
              },
              {
                label: "รายการสินค้า",
                value:
                  selected.itemNames.length > 0 ? selected.itemNames.join(", ") : "—",
              },
              {
                label: "ยอดรวมสุทธิ",
                value: (
                  <strong
                    style={
                      selected.totalAmount < 0 ? { color: "#cf1322" } : undefined
                    }
                  >
                    {money.format(selected.totalAmount)}
                  </strong>
                ),
              },
              {
                label: "ใบกำกับภาษี",
                value: selected.taxInvoiceNo
                  ? `${selected.taxInvoiceNo} · ${formatDate(selected.taxInvoiceDate)}`
                  : "—",
              },
            ]}
            references={
              <div style={{ fontSize: 13 }}>
                {selected.po ? (
                  <div>
                    <Typography.Text type="secondary">PO: </Typography.Text>
                    <Link href={`/purchase-orders/${selected.po.id}`}>{selected.po.no}</Link>
                  </div>
                ) : null}
                <RefLinks label="GRN" list={selected.grns} basePath="/goods-receipts" />
                <RefLinks
                  label="ใบวางบิล"
                  list={selected.billingNotes}
                  basePath="/finance/payables/billing-notes"
                />
                <RefLinks
                  label="ใบสำคัญจ่าย"
                  list={selected.paymentVouchers}
                  basePath="/finance/payables/payment-vouchers"
                />
                {selected.reference ? (
                  <div>
                    <Typography.Text type="secondary">อ้างอิง: </Typography.Text>
                    <Link
                      href={`${AP_BASE_PATH[selected.reference.docType as JournalDocType]}/${selected.reference.id}`}
                    >
                      {selected.reference.no}
                    </Link>
                  </div>
                ) : null}
                {!selected.po &&
                selected.grns.length === 0 &&
                selected.billingNotes.length === 0 &&
                selected.paymentVouchers.length === 0 &&
                !selected.reference
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
        title="ส่งออกสมุดรายวันซื้อไป Express"
        unit="เอกสาร"
        scopeLabel={
          exportMode === "selected"
            ? `เอกสารที่เลือก ${selectedKeys.length.toLocaleString("th-TH")} รายการ`
            : `ช่วงวันที่เอกสาร ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)} (หนึ่งแถวต่อบรรทัดบัญชี)`
        }
        previewKey={JSON.stringify(exportScope(exportMode ?? "range"))}
        loadPreview={() =>
          previewPurchaseJournalExpress(getAccessToken(), exportScope(exportMode ?? "range")).then(
            (res) => res.data,
          )
        }
        onConfirm={(reexport) => handleExpress(exportMode ?? "range", reexport)}
        onClose={() => setExportMode(null)}
      />
      <ExportHistoryDrawer
        open={historyOpen}
        title="ประวัติการส่งออกสมุดรายวันซื้อไป Express"
        onClose={() => setHistoryOpen(false)}
        loadHistory={(p) =>
          getPurchaseJournalExportHistory(getAccessToken(), { page: p, limit: 20 }).then((res) => res.data)
        }
      />
    </section>
  );
}
