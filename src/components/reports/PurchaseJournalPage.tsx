"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SendOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import { JournalLinesTable } from "@/components/ap-documents/ApJournalVoucher";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import { usePurchaseJournalQuery, purchaseJournalQueryKey } from "@/hooks/purchase-journal/usePurchaseJournal";
import { exportPurchaseJournalToExpress, getPurchaseJournalExport } from "@/lib/api/purchase-journal";
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

export default function PurchaseJournalPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(() => [
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [docType, setDocType] = useState<JournalDocType | undefined>();
  const [expressStatus, setExpressStatus] = useState<JournalExpressStatus | undefined>();
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const [sendingExpress, setSendingExpress] = useState(false);
  const [reexport, setReexport] = useState(false);

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
  const expandedKeys = items.map((item) => item.id).filter((id) => !collapsed.has(id));

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

  const handleExpress = async () => {
    if (!filters.dateFrom || !filters.dateTo) return;
    setSendingExpress(true);
    try {
      const { count, blob, filename } = await exportPurchaseJournalToExpress(getAccessToken(), {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        docType: filters.docType,
        search: filters.search,
        reexport,
      });
      if (count === 0) {
        message.info("ไม่มีรายการที่ยังไม่ได้ส่งในช่วงนี้");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      message.success(`ส่งออก ${count.toLocaleString("th-TH")} เอกสารไป Express แล้ว`);
      await queryClient.invalidateQueries({ queryKey: purchaseJournalQueryKey });
    } catch (error) {
      modal.error({
        title: "ส่งออกไป Express ไม่สำเร็จ",
        content: (
          <div>
            <div>{error instanceof Error ? error.message : "ส่งออกไป Express ไม่สำเร็จ"}</div>
            <Link href="/masters/gl-accounts">ไปหน้าผังบัญชีและการผูกบัญชี</Link>
          </div>
        ),
      });
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
        <Space orientation="vertical" size={0}>
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
        <Link href={`/finance/payables/creditors/${row.creditorId}`}>
          {row.creditorCode} {row.creditorName}
        </Link>
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
        <div style={{ fontSize: 13 }}>
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
      render: (_, row) => (row.isExportedToExpress ? <Tag color="green">ส่งแล้ว</Tag> : <Tag>ยังไม่ส่ง</Tag>),
    },
  ];

  return (
    <section className={masterStyles.page}>
      <div className={masterStyles.pageHeader}>
        <div className={masterStyles.headerAccent}>PJ</div>
        <div className={masterStyles.headerContent}>
          <div className={masterStyles.eyebrow}>REPORTS · JOURNALS</div>
          <h2 className={masterStyles.pageTitle}>สมุดรายวันซื้อ</h2>
          <span className={masterStyles.pageSubtitle}>
            ใบตั้งหนี้ ใบเพิ่มหนี้ ใบลดหนี้ที่อนุมัติแล้ว แตกเป็นบรรทัดบัญชีเดบิต/เครดิต แยกรายการมี VAT และไม่มี VAT
          </span>
        </div>
        <ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(format) => void handleExport(format)}
          csvRequiresExport
        />
      </div>

      <div className={masterStyles.summaryRow} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}>
          <span className={masterStyles.summaryLabel}>มูลค่าก่อนภาษี (สุทธิ)</span>
          <strong>{money.format(data?.summary.subtotalAmount ?? 0)}</strong>
        </div>
        <div className={masterStyles.summaryCard}>
          <span className={masterStyles.summaryLabel}>ภาษีซื้อ (สุทธิ)</span>
          <strong>{money.format(data?.summary.vatAmount ?? 0)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}>
          <span className={masterStyles.summaryLabel}>ยอดรวมเจ้าหนี้ (หักใบลดหนี้แล้ว)</span>
          <strong>{money.format(data?.summary.totalAmount ?? 0)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryInactive}`}>
          <span className={masterStyles.summaryLabel}>ยังไม่ส่ง Express</span>
          <strong>{pending.toLocaleString("th-TH")} เอกสาร</strong>
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
              placeholder="ประเภทเอกสารทั้งหมด"
              value={docType}
              onChange={(value) => {
                setDocType(value);
                setPage(1);
              }}
              options={(Object.keys(JOURNAL_DOC_TYPE_LABEL) as JournalDocType[]).map((value) => ({
                value,
                label: JOURNAL_DOC_TYPE_LABEL[value],
              }))}
            />
            <Select
              allowClear
              placeholder="สถานะ Express ทั้งหมด"
              value={expressStatus}
              onChange={(value) => {
                setExpressStatus(value);
                setPage(1);
              }}
              options={[
                { value: "PENDING", label: "ยังไม่ส่ง" },
                { value: "EXPORTED", label: "ส่งแล้ว" },
              ]}
            />
            <Input.Search
              allowClear
              placeholder="เลขที่เอกสาร / ใบกำกับภาษี / PO / GRN / ผู้ขาย"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onSearch={(value) => {
                setKeyword(value.trim());
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รายการซื้อ</h3>
          </div>
          <Space>
            <span className={masterStyles.tableCount}>{data?.total ?? 0} เอกสาร</span>
            {expressDisabledReason ? (
              <Tooltip title={expressDisabledReason}>
                <span>
                  <Button icon={<SendOutlined />} disabled>
                    ส่งออกไป Express ({pending})
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Popconfirm
                title="ส่งออกไป Express"
                description={
                  <div style={{ maxWidth: 320 }}>
                    ส่งออกเอกสารที่ยังไม่เคยส่งในช่วง {formatDate(filters.dateFrom)} - {formatDate(filters.dateTo)}{" "}
                    (หนึ่งแถวต่อบรรทัดบัญชี) แล้วทำเครื่องหมายว่าส่งแล้ว
                    <div style={{ marginTop: 8 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={reexport}
                          onChange={(event) => setReexport(event.target.checked)}
                        />{" "}
                        ส่งซ้ำรวมเอกสารที่เคยส่งแล้ว
                      </label>
                    </div>
                  </div>
                }
                okText="ส่งออก"
                cancelText="ยกเลิก"
                onConfirm={() => void handleExpress()}
              >
                <Button icon={<SendOutlined />} loading={sendingExpress}>
                  ส่งออกไป Express ({pending})
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
        <Table
          className={masterStyles.dataTable}
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={listQuery.isFetching}
          scroll={{ x: 1300 }}
          expandable={{
            expandedRowRender: (doc) => <JournalLinesTable doc={doc} showNo />,
            expandedRowKeys: expandedKeys,
            onExpand: (expanded, doc) =>
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (expanded) next.delete(doc.id);
                else next.add(doc.id);
                return next;
              }),
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => `ทั้งหมด ${total.toLocaleString("th-TH")} เอกสาร`,
          }}
          locale={{ emptyText: "ไม่มีรายการซื้อที่อนุมัติแล้วตามเงื่อนไขที่เลือก" }}
        />
      </div>
    </section>
  );
}
