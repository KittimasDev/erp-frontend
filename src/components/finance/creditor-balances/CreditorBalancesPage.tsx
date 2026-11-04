"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, DatePicker, Input, Select, Switch, Table, Tag, Typography } from "antd";
import { FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { Dayjs } from "dayjs";

import { formatThaiDate, money } from "@/components/finance/payable-purchase-orders/payableFormat";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ReportExportButtons, {
  type ReportExportFormat,
} from "@/components/reports/ReportExportButtons";
import {
  useCreditorBalancePosQuery,
  useCreditorBalanceSummaryQuery,
  useCreditorBalancesQuery,
} from "@/hooks/creditor-balances/useCreditorBalances";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { getCreditorBalances } from "@/lib/api/creditor-balances";
import { fetchAllReportRows } from "@/lib/api/sales-reports";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getAccessToken } from "@/lib/auth/token";
import {
  CREDITOR_BALANCE_PAYMENT_STATUS_COLOR,
  CREDITOR_BALANCE_PAYMENT_STATUS_LABEL,
  CREDITOR_BALANCE_PO_LINE_STATUS_COLOR,
  CREDITOR_BALANCE_PO_LINE_STATUS_LABEL,
  CREDITOR_BALANCES_PATH,
  CREDITOR_BALANCES_SCREEN,
  type CreditorBalancePaymentStatus,
  type CreditorBalancePoLine,
  type CreditorBalanceQuery,
  type CreditorBalanceRow,
} from "@/types/creditor-balances";
import { PAYMENT_TERM_TYPE_LABEL, type PaymentTermType } from "@/types/payment-terms";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import PageHeader from "@/components/common/PageHeader";

const PAGE_SIZE = 20;
const PO_DETAIL_PATH = "/finance/payables/creditors";

function ExpandedPos({ creditorId }: { creditorId: string }) {
  const query = useCreditorBalancePosQuery(creditorId, true);
  const columns: ColumnsType<CreditorBalancePoLine> = [
    {
      title: "#",
      key: "seq",
      width: 48,
      align: "center",
      render: (_v, _r, i) => i + 1,
    },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      render: (v: string, r) => <Link href={`${PO_DETAIL_PATH}/${r.purchaseOrderId}`}>{v}</Link>,
    },
    { title: "วันที่ PO", dataIndex: "poDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: "เงื่อนไขการชำระเงิน",
      dataIndex: "termLabel",
      render: (v: string | null, r) =>
        v ??
        (r.termType
          ? (PAYMENT_TERM_TYPE_LABEL[r.termType as PaymentTermType] ?? r.termType)
          : "—"),
    },
    {
      title: "ยอดตาม PO",
      dataIndex: "poTotalAmount",
      align: "right",
      render: (v: number) => money.format(v),
    },
    {
      title: "ยอดหลังปรับหนี้",
      dataIndex: "amountAfterAdjustment",
      align: "right",
      render: (v: number, r) => (r.lineStatus === "NOT_INVOICED" ? "—" : money.format(v)),
    },
    {
      title: "ยอดชำระแล้ว",
      dataIndex: "paidAmount",
      align: "right",
      render: (v: number, r) => (r.lineStatus === "NOT_INVOICED" ? "—" : money.format(v)),
    },
    {
      title: "ยอดคงเหลือ",
      dataIndex: "remainingAmount",
      align: "right",
      render: (v: number, r) => (r.lineStatus === "NOT_INVOICED" ? "—" : money.format(v)),
    },
    {
      title: "วันครบกำหนด",
      dataIndex: "dueDate",
      width: 120,
      render: (v: string | null) => formatThaiDate(v),
    },
    {
      title: "สถานะ",
      dataIndex: "lineStatus",
      width: 130,
      render: (v: string) => (
        <Tag color={CREDITOR_BALANCE_PO_LINE_STATUS_COLOR[v] ?? "default"}>
          {CREDITOR_BALANCE_PO_LINE_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
  ];
  return (
    <Table
      size="small"
      rowKey="purchaseOrderId"
      loading={query.isLoading}
      columns={columns}
      dataSource={query.data ?? []}
      pagination={false}
      locale={{ emptyText: "ไม่มีใบสั่งซื้อ" }}
      scroll={{ x: 1100 }}
    />
  );
}

/** รายการเจ้าหนี้ตามผู้ขาย — อ่านอย่างเดียว */
export default function CreditorBalancesPage() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [dSearch, setDSearch] = useState("");
  const [dCreditorId, setDCreditorId] = useState<string | undefined>();
  const [dTermType, setDTermType] = useState<CreditorBalanceQuery["termType"]>();
  const [dPaymentStatus, setDPaymentStatus] = useState<CreditorBalancePaymentStatus | undefined>();
  const [dDateRange, setDDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [keyword, setKeyword] = useState("");
  const [creditorId, setCreditorId] = useState<string | undefined>();
  const [termType, setTermType] = useState<CreditorBalanceQuery["termType"]>();
  const [paymentStatus, setPaymentStatus] = useState<CreditorBalancePaymentStatus | undefined>();
  const [hasBalanceOrCredit, setHasBalanceOrCredit] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const canExport =
    !isMatrixPermissionMode() || hasPermission(`${CREDITOR_BALANCES_SCREEN}.EXPORT`);

  const vendorsQuery = useVendorsQuery({ isActive: true });

  const applySearch = () => {
    setKeyword(dSearch.trim());
    setCreditorId(dCreditorId);
    setTermType(dTermType);
    setPaymentStatus(dPaymentStatus);
    setDateRange(dDateRange);
    setPage(1);
  };
  const clearFilters = () => {
    setDSearch("");
    setDCreditorId(undefined);
    setDTermType(undefined);
    setDPaymentStatus(undefined);
    setDDateRange(null);
    setKeyword("");
    setCreditorId(undefined);
    setTermType(undefined);
    setPaymentStatus(undefined);
    setDateRange(null);
    setHasBalanceOrCredit(false);
    setPage(1);
  };

  const filterParams = useMemo<CreditorBalanceQuery>(
    () => ({
      search: keyword || undefined,
      creditorId,
      termType,
      paymentStatus,
      hasBalanceOrCredit: hasBalanceOrCredit || undefined,
      dateFrom: dateRange?.[0]?.format("YYYY-MM-DD"),
      dateTo: dateRange?.[1]?.format("YYYY-MM-DD"),
    }),
    [keyword, creditorId, termType, paymentStatus, hasBalanceOrCredit, dateRange],
  );

  const summaryQuery = useCreditorBalanceSummaryQuery(filterParams);
  const listQuery = useCreditorBalancesQuery({ ...filterParams, page, limit: PAGE_SIZE });
  const summary = summaryQuery.data;

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const all = await fetchAllReportRows((exportPage, limit) =>
        getCreditorBalances(getAccessToken(), { ...filterParams, page: exportPage, limit }),
      );
      if (all.truncated) {
        message.warning(
          `มี ${all.total.toLocaleString("th-TH")} รายการ — ไฟล์มีเฉพาะ ${all.rows.length.toLocaleString("th-TH")} รายการแรก`,
        );
      }
      const now = new Date();
      const filters = [
        keyword ? `ค้นหา: ${keyword}` : null,
        termType
          ? `เงื่อนไข: ${PAYMENT_TERM_TYPE_LABEL[termType as PaymentTermType] ?? termType}`
          : null,
        paymentStatus
          ? `สถานะ: ${CREDITOR_BALANCE_PAYMENT_STATUS_LABEL[paymentStatus]}`
          : null,
        hasBalanceOrCredit ? "เฉพาะมียอดค้าง/เครดิต" : null,
      ].filter((v): v is string => Boolean(v));
      await downloadTabularReport(format, {
        title: "รายการเจ้าหนี้",
        filename: `creditor-balances-${now.toISOString().slice(0, 10)}`,
        meta: [
          `วันที่ออกรายงาน: ${formatThaiDate(now.toISOString().slice(0, 10))}`,
          ...filters,
          all.truncated
            ? `ทั้งหมด ${all.total.toLocaleString("th-TH")} รายการ — ไฟล์มีเฉพาะ ${all.rows.length.toLocaleString("th-TH")} รายการแรก`
            : `ทั้งหมด ${all.total.toLocaleString("th-TH")} รายการ`,
        ],
        headers: [
          "ลำดับ",
          "รหัสผู้ขาย",
          "ชื่อผู้ขาย",
          "จำนวน PO",
          "เงื่อนไขเครดิต",
          "ยอดเจ้าหนี้คงค้าง",
          "เครดิตที่ได้รับ",
          "เครดิตที่ใช้แล้ว",
          "เครดิตคงเหลือ",
          "มัดจำคงเหลือ",
          "สถานะ",
        ],
        rows: all.rows.map((r, index) => [
          String(index + 1),
          r.creditorCode,
          r.creditorName,
          String(r.poCount),
          r.creditTermsLabel,
          money.format(r.apRemaining),
          money.format(r.creditReceived),
          money.format(r.creditUsed),
          money.format(r.creditRemaining),
          money.format(r.depositAvailable),
          CREDITOR_BALANCE_PAYMENT_STATUS_LABEL[r.paymentStatus] ?? r.paymentStatus,
        ]),
      });
    } catch {
      message.error("ส่งออกรายการเจ้าหนี้ไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const columns: ColumnsType<CreditorBalanceRow> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: "จำนวน PO", dataIndex: "poCount", width: 100, align: "right" },
    { title: "เงื่อนไขเครดิต", dataIndex: "creditTermsLabel", width: 160 },
    {
      title: "ยอดเจ้าหนี้คงค้าง",
      dataIndex: "apRemaining",
      align: "right",
      width: 140,
      render: (v: number) => money.format(v),
    },
    {
      title: "เครดิตที่ได้รับ",
      dataIndex: "creditReceived",
      align: "right",
      width: 130,
      render: (v: number) => money.format(v),
    },
    {
      title: "เครดิตที่ใช้แล้ว",
      dataIndex: "creditUsed",
      align: "right",
      width: 130,
      render: (v: number) => money.format(v),
    },
    {
      title: "เครดิตคงเหลือ",
      dataIndex: "creditRemaining",
      align: "right",
      width: 130,
      render: (v: number) => money.format(v),
    },
    {
      title: "สถานะ",
      dataIndex: "paymentStatus",
      width: 120,
      render: (v: string) => (
        <Tag color={CREDITOR_BALANCE_PAYMENT_STATUS_COLOR[v] ?? "default"}>
          {CREDITOR_BALANCE_PAYMENT_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
  ];

  const expandable: TableProps<CreditorBalanceRow>["expandable"] = {
    expandedRowKeys: expandedKeys,
    onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
    expandedRowRender: (r) => <ExpandedPos creditorId={r.creditorId} />,
    rowExpandable: (r) => r.poCount > 0,
  };

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · PAYABLES"
        icon={<FileTextOutlined />}
        title="รายการเจ้าหนี้"
        subtitle="สรุปยอดค้างจ่ายและเครดิตผู้ขาย ตาม Supplier (ดูอย่างเดียว)"
        actions={
          <>
<ReportExportButtons
          canExport={canExport}
          downloading={downloading}
          onExport={(f) => void handleExport(f)}
          csvRequiresExport
        />
          </>
        }
      />

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดเจ้าหนี้คงค้างรวม</span>
          <span className={styles.statValue}>
            {summaryQuery.isLoading ? "…" : money.format(summary?.totalApRemaining ?? 0)}
          </span>
          <span className={styles.statHint}>บาท</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>ยอดเจ้าหนี้เกินกำหนด</span>
          <span
            className={styles.statValue}
            style={(summary?.totalOverdue ?? 0) > 0 ? { color: "#cf1322" } : undefined}
          >
            {summaryQuery.isLoading ? "…" : money.format(summary?.totalOverdue ?? 0)}
          </span>
          <span className={styles.statHint}>บาท</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>เครดิต Supplier คงเหลือ</span>
          <span className={styles.statValue}>
            {summaryQuery.isLoading ? "…" : money.format(summary?.totalSupplierCreditRemaining ?? 0)}
          </span>
          <span className={styles.statHint}>บาท</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>มัดจำคงเหลือยังไม่หัก AP</span>
          <span className={styles.statValue}>
            {summaryQuery.isLoading ? "…" : money.format(summary?.totalDepositAvailable ?? 0)}
          </span>
          <span className={styles.statHint}>บาท</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
            <label>ค้นหา</label>
            <Input
              allowClear
              placeholder="ชื่อ/รหัสผู้ขาย หรือเลขที่ PO"
              value={dSearch}
              onChange={(e) => setDSearch(e.target.value)}
              onPressEnter={applySearch}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ผู้ขาย</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={dCreditorId}
              onChange={setDCreditorId}
              options={(vendorsQuery.data?.data ?? []).map((v) => ({
                value: v.id,
                label: `${v.creditorCode} ${v.nameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={dDateRange}
              onChange={setDDateRange}
            />
          </div>
          <div className={styles.filterItem}>
            <label>เงื่อนไขชำระ</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={dTermType}
              onChange={setDTermType}
              options={[
                { value: "ADVANCE", label: "ล่วงหน้า / มัดจำ" },
                { value: "ON_RECEIPT", label: "จ่ายเมื่อรับสินค้า" },
                { value: "CREDIT", label: "เครดิต" },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะชำระ</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={dPaymentStatus}
              onChange={setDPaymentStatus}
              options={Object.entries(CREDITOR_BALANCE_PAYMENT_STATUS_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>เฉพาะมียอดค้าง/เครดิต</label>
            <div style={{ display: "flex", alignItems: "center", minHeight: 32 }}>
              <Switch
                checked={hasBalanceOrCredit}
                onChange={(v) => {
                  setHasBalanceOrCredit(v);
                  setPage(1);
                }}
              />
            </div>
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
            <h3>รายการเจ้าหนี้</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {(listQuery.data?.total ?? 0).toLocaleString("th-TH")} ผู้ขาย
          </span>
        </div>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="creditorId"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          expandable={expandable}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: listQuery.data?.total ?? 0,
            onChange: setPage,
            showTotal: (t) => `ทั้งหมด ${t} ผู้ขาย`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ไม่พบรายการเจ้าหนี้" }}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          ยอดเจ้าหนี้คงค้างคิดจากใบตั้งหนี้ที่อนุมัติแล้ว ไม่รวม PO ที่ยังไม่ตั้งหนี้ และไม่หักเครดิตผู้ขายที่ยังไม่ใช้ · ขยายแถวเพื่อดูรายการ PO ·{" "}
          <Link href={CREDITOR_BALANCES_PATH}>รีเฟรช</Link>
        </Typography.Paragraph>
      </div>
    </section>
  );
}
