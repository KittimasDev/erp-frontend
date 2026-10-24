"use client";

import { useState } from "react";
import { App, Button, DatePicker, Input, Select, Space, Table, Tag, Typography } from "antd";
import { FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ReportExportButtons, { type ReportExportFormat } from "@/components/reports/ReportExportButtons";
import { useBillingNotesQuery, usePendingBillingApsQuery } from "@/hooks/billing-notes/useBillingNotes";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { getBillingNotesExport } from "@/lib/api/billing-notes";
import { getAccessToken } from "@/lib/auth/token";
import {
  BILLING_NOTE_STATUS_COLOR,
  BILLING_NOTE_STATUS_LABEL,
  BILLING_PV_STATUS_COLOR,
  BILLING_PV_STATUS_LABEL,
  type BillingNoteListItem,
  type BillingNoteQuery,
  type PendingBillingAp,
} from "@/types/billing-notes";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

const PENDING_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 20;
const SCREEN_CODE = "FINANCE_BILLING_NOTES";
const BASE_PATH = "/finance/payables/billing-notes";

type DateRange = [Dayjs | null, Dayjs | null] | null;

const STATUS_OPTIONS = Object.entries(BILLING_NOTE_STATUS_LABEL).map(([value, label]) => ({ value, label }));
const PV_STATUS_OPTIONS = Object.entries(BILLING_PV_STATUS_LABEL).map(([value, label]) => ({ value, label }));

const ymd = (d?: Dayjs | null) => d?.format("YYYY-MM-DD");

/**
 * ใบวางบิล — ส่วนบน: AP ที่อนุมัติแล้วรอวางบิล (เลือกหลายใบของผู้ขายเดียวกันรวมเป็นใบเดียวได้)
 * ส่วนล่าง: ใบวางบิลที่สร้างแล้ว + Export · ค้นหา/กรอง/แบ่งหน้าแยกกัน
 */
export default function BillingNotesPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);

  // ── ส่วนที่ 1: รอวางบิล ──
  const [pPage, setPPage] = useState(1);
  const [pSearch, setPSearch] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [pApRange, setPApRange] = useState<DateRange>(null);
  const [pDueRange, setPDueRange] = useState<DateRange>(null);
  const [selected, setSelected] = useState<PendingBillingAp[]>([]);
  const pending = usePendingBillingApsQuery({
    page: pPage,
    limit: PENDING_PAGE_SIZE,
    search: pKeyword,
    apDateFrom: ymd(pApRange?.[0]),
    apDateTo: ymd(pApRange?.[1]),
    dueFrom: ymd(pDueRange?.[0]),
    dueTo: ymd(pDueRange?.[1]),
  });
  const selectedCreditorId = selected[0]?.creditorId;

  const goCreate = (apIds: string[]) => router.push(`${BASE_PATH}/create?apIds=${apIds.join(",")}`);

  // ── ส่วนที่ 2: ที่สร้างแล้ว ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState("");
  const [cKeyword, setCKeyword] = useState("");
  const [cRange, setCRange] = useState<DateRange>(null);
  const [cStatus, setCStatus] = useState<string | undefined>();
  const [cPvStatus, setCPvStatus] = useState<string | undefined>();
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const filters: Omit<BillingNoteQuery, "page" | "limit"> = {
    search: cKeyword,
    dateFrom: ymd(cRange?.[0]),
    dateTo: ymd(cRange?.[1]),
    status: cStatus,
    pvStatus: cPvStatus,
  };
  const created = useBillingNotesQuery({ ...filters, page: cPage, limit: CREATED_PAGE_SIZE });

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const rows = (await getBillingNotesExport(getAccessToken(), filters)).data;
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/YYYY HH:mm")}`,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        filters.dateFrom || filters.dateTo
          ? `วันที่ใบวางบิล: ${formatThaiDate(filters.dateFrom)} - ${formatThaiDate(filters.dateTo)}`
          : null,
        filters.status ? `สถานะเอกสาร: ${BILLING_NOTE_STATUS_LABEL[filters.status] ?? filters.status}` : null,
        filters.pvStatus ? `สถานะออก PV: ${BILLING_PV_STATUS_LABEL[filters.pvStatus] ?? filters.pvStatus}` : null,
        `ทั้งหมด ${rows.length} รายการ · ยอดวางบิลรวม ${money.format(rows.reduce((s, r) => s + r.totalAmount, 0))} บาท`,
      ].filter((v): v is string => Boolean(v));
      await downloadTabularReport(format, {
        title: "รายการใบวางบิล",
        filename: `billing-notes-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          "เลขที่ใบวางบิล",
          "วันที่",
          "ผู้ขาย",
          "จำนวน AP",
          "ยอดวางบิล",
          "ยอดออก PV แล้ว",
          "ยอดคงเหลือ",
          "สถานะเอกสาร",
          "สถานะออก PV",
        ],
        rows: rows.map((r) => [
          r.billingNo,
          formatThaiDate(r.billingDate),
          `${r.creditorCode} ${r.creditorName}`,
          String(r.apCount),
          money.format(r.totalAmount),
          money.format(r.issuedPvAmount),
          money.format(r.remainingAmount),
          BILLING_NOTE_STATUS_LABEL[r.status] ?? r.status,
          BILLING_PV_STATUS_LABEL[r.pvStatus] ?? r.pvStatus,
        ]),
        pdfColumns: [
          { header: "เลขที่ใบวางบิล", cells: [0], width: 90 },
          { header: "วันที่", cells: [1], width: 62 },
          { header: "ผู้ขาย", cells: [2], width: 130 },
          { header: "AP", cells: [3], width: 32, align: "right", numeric: true },
          { header: "ยอดวางบิล", cells: [4], width: 72, align: "right", numeric: true },
          { header: "ออก PV แล้ว", cells: [5], width: 72, align: "right", numeric: true },
          { header: "คงเหลือ", cells: [6], width: 68, align: "right", numeric: true },
          { header: "สถานะ", cells: [7], width: 58 },
          { header: "สถานะออก PV", cells: [8], width: 80 },
        ],
      });
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : "ส่งออกรายการใบวางบิลไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const pendingColumns: ColumnsType<PendingBillingAp> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (pPage - 1) * PENDING_PAGE_SIZE + index + 1,
    },
    { title: "วันที่ AP", dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: "เลขที่ AP",
      dataIndex: "docNo",
      width: 170,
      render: (v: string, r) => <Link href={`/finance/payables/ap-invoices/${r.apId}`}>{v}</Link>,
    },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      width: 130,
      render: (v: string | undefined, r) =>
        v && r.purchaseOrderId ? <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link> : "—",
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
    { title: "ยอดตั้งหนี้", dataIndex: "totalAmount", align: "right", width: 120, render: (v: number) => money.format(v) },
    { title: "ยอดปรับหนี้", dataIndex: "adjustmentNet", align: "right", width: 120, render: (v: number) => money.format(v) },
    {
      title: "ยอดหักมัดจำ",
      dataIndex: "depositDeductAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: "ยอดพร้อมวางบิล",
      dataIndex: "billableAmount",
      align: "right",
      width: 140,
      render: (v: number) => <Typography.Text strong>{money.format(v)}</Typography.Text>,
    },
    { title: "วันครบกำหนด", dataIndex: "dueDate", width: 120, render: (v?: string) => formatThaiDate(v) },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_v, r) =>
        perms.canAdd ? (
          <Button type="primary" size="small" onClick={() => goCreate([r.apId])}>
            วางบิล
          </Button>
        ) : null,
    },
  ];

  const createdColumns: ColumnsType<BillingNoteListItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (cPage - 1) * CREATED_PAGE_SIZE + index + 1,
    },
    {
      title: "เลขที่ใบวางบิล",
      dataIndex: "billingNo",
      width: 160,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: "วันที่", dataIndex: "billingDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: "จำนวน AP", dataIndex: "apCount", align: "right", width: 100 },
    { title: "ยอดวางบิล", dataIndex: "totalAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: "ยอดออก PV แล้ว",
      dataIndex: "issuedPvAmount",
      align: "right",
      width: 140,
      render: (v: number) => money.format(v),
    },
    { title: "ยอดคงเหลือ", dataIndex: "remainingAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: "สถานะเอกสาร",
      dataIndex: "status",
      width: 120,
      render: (v: string) => <Tag color={BILLING_NOTE_STATUS_COLOR[v] ?? "default"}>{BILLING_NOTE_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "สถานะออก PV",
      dataIndex: "pvStatus",
      width: 140,
      render: (v: string, r) =>
        r.status === "CANCELLED" ? (
          "—"
        ) : (
          <Tag color={BILLING_PV_STATUS_COLOR[v] ?? "default"}>{BILLING_PV_STATUS_LABEL[v] ?? v}</Tag>
        ),
    },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_v, r) => (
        <Space>
          <Link href={`${BASE_PATH}/${r.id}`}>
            <Button size="small">ดูรายละเอียด</Button>
          </Link>
          {r.status === "DRAFT" && perms.canEdit ? (
            <Link href={`${BASE_PATH}/${r.id}/edit`}>
              <Button size="small">แก้ไข</Button>
            </Link>
          ) : null}
        </Space>
      ),
    },
  ];

  const applyPending = () => {
    setPKeyword(pSearch.trim());
    setPPage(1);
  };
  const clearPending = () => {
    setPSearch("");
    setPKeyword("");
    setPApRange(null);
    setPDueRange(null);
    setPPage(1);
  };
  const applyCreated = () => {
    setCKeyword(cSearch.trim());
    setCPage(1);
  };
  const clearCreated = () => {
    setCSearch("");
    setCKeyword("");
    setCRange(null);
    setCStatus(undefined);
    setCPvStatus(undefined);
    setCPage(1);
  };

  return (
    <section className={styles.page}>
      <div className={masterStyles.pageHeader} style={{ gridTemplateColumns: "1fr auto" }}>
        <div className={masterStyles.headerContent}>
          <div className={styles.badge}>
            <span className={styles.badgeIcon} aria-hidden>
              <FileTextOutlined />
            </span>
            FINANCE · PAYABLES
          </div>
          <h2 className={masterStyles.pageTitle}>ใบวางบิล</h2>
          <span className={masterStyles.pageSubtitle}>
            AP ที่อนุมัติแล้วรอวางบิล และใบวางบิลที่สร้างแล้ว — เลือกหลายใบของผู้ขายเดียวกันรวมเป็นใบเดียวได้
          </span>
        </div>
        <Space>
          {perms.canAdd ? (
            <Button type="primary" disabled={selected.length === 0} onClick={() => goCreate(selected.map((s) => s.apId))}>
              วางบิลที่เลือก ({selected.length})
            </Button>
          ) : null}
          <ReportExportButtons canExport downloading={downloading} onExport={(f) => void handleExport(f)} />
        </Space>
      </div>

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>รอวางบิล</span>
          <span className={styles.statValue}>{(pending.data?.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>สร้างแล้ว</span>
          <span className={styles.statValue}>{(created.data?.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รอวางบิล</h3>
          </div>
          <span className={masterStyles.tableCount}>{(pending.data?.total ?? 0).toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่ AP / PO / ผู้ขาย"
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                onPressEnter={applyPending}
              />
            </div>
            <div className={styles.filterItem}>
              <label>วันที่ AP</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" value={pApRange} onChange={setPApRange} />
            </div>
            <div className={styles.filterItem}>
              <label>วันครบกำหนด</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" value={pDueRange} onChange={setPDueRange} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearPending}>เคลียร์</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyPending}>
                ค้นหา
              </Button>
            </div>
          </div>
        </section>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          เลือกได้หลายใบเฉพาะ AP ของผู้ขายเดียวกัน เพื่อรวมเป็นใบวางบิลเดียว
        </Typography.Paragraph>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="apId"
          loading={pending.isLoading}
          columns={pendingColumns}
          dataSource={pending.data?.items ?? []}
          rowSelection={
            perms.canAdd
              ? {
                  selectedRowKeys: selected.map((s) => s.apId),
                  preserveSelectedRowKeys: true,
                  onChange: (_keys, rows) => setSelected(rows),
                  getCheckboxProps: (r) => ({
                    disabled: selectedCreditorId !== undefined && r.creditorId !== selectedCreditorId,
                  }),
                }
              : undefined
          }
          pagination={{
            current: pPage,
            pageSize: PENDING_PAGE_SIZE,
            total: pending.data?.total ?? 0,
            onChange: setPPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: "ไม่มีรายการรอวางบิล" }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>ใบวางบิลที่สร้างแล้ว</h3>
          </div>
          <span className={masterStyles.tableCount}>{(created.data?.total ?? 0).toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่ใบวางบิล / AP / PO / ผู้ขาย"
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onPressEnter={applyCreated}
              />
            </div>
            <div className={styles.filterItem}>
              <label>วันที่ใบวางบิล</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" value={cRange} onChange={setCRange} />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะเอกสาร</label>
              <Select allowClear placeholder="ทั้งหมด" value={cStatus} onChange={setCStatus} options={STATUS_OPTIONS} />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะออก PV</label>
              <Select allowClear placeholder="ทั้งหมด" value={cPvStatus} onChange={setCPvStatus} options={PV_STATUS_OPTIONS} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearCreated}>เคลียร์</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyCreated}>
                ค้นหา
              </Button>
            </div>
          </div>
        </section>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="id"
          loading={created.isLoading}
          columns={createdColumns}
          dataSource={created.data?.items ?? []}
          pagination={{
            current: cPage,
            pageSize: CREATED_PAGE_SIZE,
            total: created.data?.total ?? 0,
            onChange: setCPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: "ยังไม่มีใบวางบิล" }}
        />
      </div>
    </section>
  );
}
