"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, DatePicker, Input, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, SearchOutlined, SendOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import { JournalLinesTable } from "@/components/ap-documents/ApJournalVoucher";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import styles from "@/components/reports/PaymentJournalPage.module.css";
import { paymentJournalQueryKey, usePaymentJournalQuery } from "@/hooks/payment-journal/usePaymentJournal";
import { exportPaymentJournalToExpress, getPaymentJournalExport } from "@/lib/api/payment-journal";
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
function methodText(item: PaymentJournalItem): string {
  const label = PAYMENT_METHOD_LABEL[item.paymentMethod] ?? item.paymentMethod;
  const bank = [item.bankName, item.bankAccountNumber].filter(Boolean).join(" ");
  return bank ? `${label} · ${bank}` : label;
}

export default function PaymentJournalPage() {
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const [sendingExpress, setSendingExpress] = useState(false);
  const [reexport, setReexport] = useState(false);

  const applySearch = () => {
    setRange(dRange);
    setKind(dKind);
    setMethod(dMethod);
    setExpressStatus(dExpress);
    setKeyword(dSearch.trim());
    setPage(1);
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
  const expandedKeys = items.map((item) => item.id).filter((id) => !collapsed.has(id));

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
      message.error(error instanceof Error ? error.message : "ส่งออกสมุดรายวันจ่ายไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const handleExpress = async () => {
    if (!filters.dateFrom || !filters.dateTo) return;
    setSendingExpress(true);
    try {
      const { count, blob, filename } = await exportPaymentJournalToExpress(getAccessToken(), {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        kind: filters.kind,
        method: filters.method,
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
      message.success(`ส่งออก ${count.toLocaleString("th-TH")} รายการไป Express แล้ว`);
      await queryClient.invalidateQueries({ queryKey: paymentJournalQueryKey });
    } catch (error) {
      modal.error({
        title: "ส่งออกไป Express ไม่สำเร็จ",
        content: (
          <div>
            <div>{error instanceof Error ? error.message : "ส่งออกไป Express ไม่สำเร็จ"}</div>
            <Space orientation="vertical" size={0}>
              <Link href="/masters/gl-accounts">ไปหน้าผังบัญชีและการผูกบัญชี</Link>
              <Link href="/masters/company-profile">ไปหน้าข้อมูลบริษัท (บัญชีธนาคาร)</Link>
            </Space>
          </div>
        ),
      });
    } finally {
      setSendingExpress(false);
    }
  };

  const pending = data?.pendingExpressCount ?? 0;
  const expressDisabledReason = !canExport
    ? "ไม่มีสิทธิ์ส่งออก (ต้องมีสิทธิ์ EXPORT ของสมุดรายวันจ่าย)"
    : !range
      ? "เลือกช่วงวันที่จ่ายเงินก่อน"
      : null;

  const columns: ColumnsType<PaymentJournalItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    { title: "วันที่จ่ายเงิน", dataIndex: "paymentDate", width: 110, render: formatDate },
    {
      title: "เลขที่รายการจ่าย",
      key: "payment",
      width: 200,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Link href={`/finance/payables/payment-records/${row.id}`}>{row.paymentNo ?? "—"}</Link>
          <Space size={4}>
            <Tag color={KIND_COLOR[row.kind]} style={{ marginInlineEnd: 0 }}>
              {row.kindLabel}
            </Tag>
            {!row.balanced ? <Tag color="red">เดบิต ≠ เครดิต</Tag> : null}
          </Space>
        </Space>
      ),
    },
    {
      title: "ใบสำคัญจ่าย",
      key: "voucher",
      width: 170,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <Link href={`/finance/payables/payment-vouchers/${row.voucher.id}`}>{row.voucher.no}</Link>
          <span style={{ fontSize: 12, opacity: 0.65 }}>วันที่ {formatDate(row.voucherDate)}</span>
        </Space>
      ),
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      width: 220,
      render: (_, row) => (
        <Link href={`/finance/payables/creditors/${row.creditorId}`}>
          {row.creditorCode} {row.creditorName}
        </Link>
      ),
    },
    {
      title: "วิธีจ่าย",
      key: "method",
      width: 230,
      render: (_, row) => (
        <Space orientation="vertical" size={0}>
          <span>{methodText(row)}</span>
          {row.transactionRef ? (
            <span style={{ fontSize: 12, opacity: 0.65 }}>อ้างอิง {row.transactionRef}</span>
          ) : null}
          {row.chequeNo ? <span style={{ fontSize: 12, opacity: 0.65 }}>เช็คเลขที่ {row.chequeNo}</span> : null}
        </Space>
      ),
    },
    {
      title: "เอกสารที่เกี่ยวข้อง",
      key: "related",
      render: (_, row) => (
        <div style={{ fontSize: 13 }}>
          {row.advanceRequest ? (
            <div>
              <Typography.Text type="secondary">ใบขอจ่ายล่วงหน้า: </Typography.Text>
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
      title: "ยอดรวม / WHT / จ่ายจริง",
      key: "amounts",
      width: 190,
      align: "right",
      render: (_, row) => (
        <Space orientation="vertical" size={0} style={{ textAlign: "right" }}>
          <span style={{ fontSize: 12, opacity: 0.65 }}>ยอดรวม {money.format(row.grossAmount)}</span>
          {row.whtAmount > 0 ? (
            <span style={{ fontSize: 12, opacity: 0.65 }}>หัก ณ ที่จ่าย {money.format(row.whtAmount)}</span>
          ) : null}
          <strong>{money.format(row.netAmount)}</strong>
        </Space>
      ),
    },
    {
      title: "Express",
      key: "express",
      width: 96,
      render: (_, row) => (row.isExportedToExpress ? <Tag color="green">ส่งแล้ว</Tag> : <Tag>ยังไม่ส่ง</Tag>),
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
          <h2 className={masterStyles.pageTitle}>สมุดรายวันจ่าย</h2>
          <span className={masterStyles.pageSubtitle}>
            อ้างอิงใบสำคัญจ่ายและการบันทึกจ่ายเงินจริง แตกเป็นบรรทัดบัญชีเดบิต/เครดิต — ชำระหนี้ AP, จ่ายล่วงหน้า, จ่ายมัดจำ
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
          <span className={styles.statLabel}>ยอดรวมก่อนหัก ณ ที่จ่าย</span>
          <span className={styles.statValue}>{money.format(data?.summary.grossAmount ?? 0)}</span>
          <span className={styles.statHint}>บาท</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ภาษีหัก ณ ที่จ่าย</span>
          <span className={styles.statValue}>{money.format(data?.summary.whtAmount ?? 0)}</span>
          <span className={styles.statHint}>บาท</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>จ่ายจริง (โอน/เช็ค/เงินสด)</span>
          <span className={styles.statValue}>{money.format(data?.summary.netAmount ?? 0)}</span>
          <span className={styles.statHint}>บาท</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยังไม่ส่ง Express</span>
          <span className={styles.statValue}>{pending.toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่จ่าย</label>
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
            <label>ประเภทการจ่าย</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={dKind}
              onChange={setDKind}
              options={(Object.keys(PAYMENT_KIND_LABEL) as PaymentJournalKind[]).map((value) => ({
                value,
                label: PAYMENT_KIND_LABEL[value],
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วิธีจ่าย</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={dMethod}
              onChange={setDMethod}
              options={(["TRANSFER", "CHEQUE", "CASH"] as PaymentJournalMethod[]).map((value) => ({
                value,
                label: PAYMENT_METHOD_LABEL[value],
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
              placeholder="เลขที่รายการจ่าย / ใบสำคัญจ่าย / AP / เลขอ้างอิง / ผู้ขาย"
              value={dSearch}
              onChange={(event) => setDSearch(event.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterActions}>
            <Button onClick={clearFilters}>เคลียร์</Button>
            <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applySearch}>
              ค้นหา
            </Button>
          </div>
        </div>
      </section>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รายการจ่ายเงิน</h3>
          </div>
          <Space>
            <span className={masterStyles.tableCount}>{data?.total ?? 0} รายการ</span>
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
                  <div style={{ maxWidth: 340 }}>
                    ส่งออกรายการที่ยังไม่เคยส่งในช่วง {formatDate(filters.dateFrom)} - {formatDate(filters.dateTo)}{" "}
                    (หนึ่งแถวต่อบรรทัดบัญชี) แล้วทำเครื่องหมายว่าส่งแล้ว
                    <div style={{ marginTop: 6, color: "#cf1322" }}>
                      ส่งแล้วจะยกเลิกบันทึกจ่ายเงินของรายการนั้นไม่ได้
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={reexport}
                          onChange={(event) => setReexport(event.target.checked)}
                        />{" "}
                        ส่งซ้ำรวมรายการที่เคยส่งแล้ว
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
          scroll={{ x: 1500 }}
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
            showTotal: (total) => `ทั้งหมด ${total.toLocaleString("th-TH")} รายการ`,
          }}
          locale={{ emptyText: "ไม่มีรายการจ่ายเงินตามเงื่อนไขที่เลือก" }}
        />
      </div>
    </section>
  );
}
