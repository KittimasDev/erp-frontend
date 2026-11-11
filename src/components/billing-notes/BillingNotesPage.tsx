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
  billingNoteStatusLabel,
  BILLING_PV_STATUS_COLOR,
  BILLING_PV_STATUS_LABEL,
  type BillingNoteListItem,
  type BillingNoteQuery,
  type PendingBillingAp,
} from "@/types/billing-notes";
import { tFin } from "@/components/payment-vouchers/paymentVoucherUtils";
import { useT } from "@/lib/i18n/useT";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import PageHeader from "@/components/common/PageHeader";

const PENDING_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 20;
const SCREEN_CODE = "FINANCE_BILLING_NOTES";
const BASE_PATH = "/finance/payables/billing-notes";

type DateRange = [Dayjs | null, Dayjs | null] | null;

const STATUS_OPTIONS_BASE = Object.keys(BILLING_NOTE_STATUS_LABEL).map((value) => ({ value, label: value }));
const PV_STATUS_OPTIONS_BASE = Object.entries(BILLING_PV_STATUS_LABEL).map(([value, label]) => ({ value, label }));

const ymd = (d?: Dayjs | null) => d?.format("YYYY-MM-DD");

/**
 * ใบวางบิล — ส่วนบน: AP ที่อนุมัติแล้วรอวางบิล (เลือกหลายใบของผู้ขายเดียวกันรวมเป็นใบเดียวได้)
 * ส่วนล่าง: ใบวางบิลที่สร้างแล้ว + Export · ค้นหา/กรอง/แบ่งหน้าแยกกัน
 */
export default function BillingNotesPage() {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const STATUS_OPTIONS = STATUS_OPTIONS_BASE.map((o) => ({ ...o, label: billingNoteStatusLabel(o.value) }));
  const PV_STATUS_OPTIONS = PV_STATUS_OPTIONS_BASE.map((o) => ({ ...o, label: t(o.label) }));
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
        `${t("ออกรายงาน")} ${dayjs().format("DD/MM/BBBB HH:mm")}`,
        filters.search ? `${t("ค้นหา")}: ${filters.search}` : null,
        filters.dateFrom || filters.dateTo
          ? `${t("วันที่ใบวางบิล")}: ${formatThaiDate(filters.dateFrom)} - ${formatThaiDate(filters.dateTo)}`
          : null,
        filters.status ? `${t("สถานะเอกสาร")}: ${billingNoteStatusLabel(filters.status)}` : null,
        filters.pvStatus ? `${t("สถานะออก PV")}: ${BILLING_PV_STATUS_LABEL[filters.pvStatus] ? tFin(BILLING_PV_STATUS_LABEL[filters.pvStatus]) : filters.pvStatus}` : null,
        t("ทั้งหมด {n} รายการ · ยอดวางบิลรวม {amount} บาท", { n: rows.length, amount: money.format(rows.reduce((s, r) => s + r.totalAmount, 0)) }),
      ].filter((v): v is string => Boolean(v));
      await downloadTabularReport(format, {
        title: t("รายการใบวางบิล"),
        filename: `billing-notes-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          t("เลขที่ใบวางบิล"),
          t("วันที่"),
          t("ผู้ขาย"),
          t("จำนวน AP"),
          t("ยอดวางบิล"),
          t("ยอดออก PV แล้ว"),
          t("ยอดคงเหลือ"),
          t("สถานะเอกสาร"),
          t("สถานะออก PV"),
        ],
        rows: rows.map((r) => [
          r.billingNo,
          formatThaiDate(r.billingDate),
          `${r.creditorCode} ${r.creditorName}`,
          String(r.apCount),
          money.format(r.totalAmount),
          money.format(r.issuedPvAmount),
          money.format(r.remainingAmount),
          billingNoteStatusLabel(r.status),
          BILLING_PV_STATUS_LABEL[r.pvStatus] ? tFin(BILLING_PV_STATUS_LABEL[r.pvStatus]) : r.pvStatus,
        ]),
        pdfColumns: [
          { header: t("เลขที่ใบวางบิล"), cells: [0], width: 90 },
          { header: t("วันที่"), cells: [1], width: 62 },
          { header: t("ผู้ขาย"), cells: [2], width: 130 },
          { header: "AP", cells: [3], width: 32, align: "right", numeric: true },
          { header: t("ยอดวางบิล"), cells: [4], width: 72, align: "right", numeric: true },
          { header: t("ออก PV แล้ว"), cells: [5], width: 72, align: "right", numeric: true },
          { header: t("คงเหลือ"), cells: [6], width: 68, align: "right", numeric: true },
          { header: t("สถานะ"), cells: [7], width: 58 },
          { header: t("สถานะออก PV"), cells: [8], width: 80 },
        ],
      });
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : t("ส่งออกรายการใบวางบิลไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  const pendingColumns: ColumnsType<PendingBillingAp> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (pPage - 1) * PENDING_PAGE_SIZE + index + 1,
    },
    { title: t("วันที่ AP"), dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: t("เลขที่ AP"),
      dataIndex: "docNo",
      width: 170,
      render: (v: string, r) => <Link href={`/finance/payables/ap-invoices/${r.apId}`}>{v}</Link>,
    },
    {
      title: t("เลขที่ PO"),
      dataIndex: "poNo",
      width: 130,
      render: (v: string | undefined, r) =>
        v && r.purchaseOrderId ? <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link> : "—",
    },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: t("ยอดตั้งหนี้"), dataIndex: "totalAmount", align: "right", width: 120, render: (v: number) => money.format(v) },
    { title: t("ยอดปรับหนี้"), dataIndex: "adjustmentNet", align: "right", width: 120, render: (v: number) => money.format(v) },
    {
      title: t("ยอดหักมัดจำ"),
      dataIndex: "depositDeductAmount",
      align: "right",
      width: 120,
      render: (v: number) => money.format(v),
    },
    {
      title: t("ยอดพร้อมวางบิล"),
      dataIndex: "billableAmount",
      align: "right",
      width: 140,
      render: (v: number) => <Typography.Text strong>{money.format(v)}</Typography.Text>,
    },
    { title: t("วันครบกำหนด"), dataIndex: "dueDate", width: 120, render: (v?: string) => formatThaiDate(v) },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_v, r) =>
        perms.canAdd ? (
          <Button type="primary" size="small" onClick={() => goCreate([r.apId])}>
            {t("วางบิล")}
          </Button>
        ) : null,
    },
  ];

  const createdColumns: ColumnsType<BillingNoteListItem> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (cPage - 1) * CREATED_PAGE_SIZE + index + 1,
    },
    {
      title: t("เลขที่ใบวางบิล"),
      dataIndex: "billingNo",
      width: 160,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: t("วันที่"), dataIndex: "billingDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: t("จำนวน AP"), dataIndex: "apCount", align: "right", width: 100 },
    { title: t("ยอดวางบิล"), dataIndex: "totalAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: t("ยอดออก PV แล้ว"),
      dataIndex: "issuedPvAmount",
      align: "right",
      width: 140,
      render: (v: number) => money.format(v),
    },
    { title: t("ยอดคงเหลือ"), dataIndex: "remainingAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: t("สถานะเอกสาร"),
      dataIndex: "status",
      width: 120,
      render: (v: string) => <Tag color={BILLING_NOTE_STATUS_COLOR[v] ?? "default"}>{billingNoteStatusLabel(v)}</Tag>,
    },
    {
      title: t("สถานะออก PV"),
      dataIndex: "pvStatus",
      width: 140,
      render: (v: string, r) =>
        r.status === "CANCELLED" ? (
          "—"
        ) : (
          <Tag color={BILLING_PV_STATUS_COLOR[v] ?? "default"}>{BILLING_PV_STATUS_LABEL[v] ? tFin(BILLING_PV_STATUS_LABEL[v]) : v}</Tag>
        ),
    },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_v, r) => (
        <Space>
          <Link href={`${BASE_PATH}/${r.id}`}>
            <Button size="small">{t("ดูรายละเอียด")}</Button>
          </Link>
          {r.status === "DRAFT" && perms.canEdit ? (
            <Link href={`${BASE_PATH}/${r.id}/edit`}>
              <Button size="small">{t("แก้ไข")}</Button>
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
      <PageHeader
        eyebrow="FINANCE · PAYABLES"
        icon={<FileTextOutlined />}
        title={t("ใบวางบิล")}
        subtitle={t("AP ที่อนุมัติแล้วรอวางบิล และใบวางบิลที่สร้างแล้ว — เลือกหลายใบของผู้ขายเดียวกันรวมเป็นใบเดียวได้")}
        actions={
          <>
<Space>
          {perms.canAdd ? (
            <Button type="primary" disabled={selected.length === 0} onClick={() => goCreate(selected.map((s) => s.apId))}>
              {t("วางบิลที่เลือก ({n})", { n: selected.length })}
            </Button>
          ) : null}
          <ReportExportButtons canExport downloading={downloading} onExport={(f) => void handleExport(f)} />
        </Space>
          </>
        }
      />

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("รอวางบิล")}</span>
          <span className={styles.statValue}>{(pending.data?.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("สร้างแล้ว")}</span>
          <span className={styles.statValue}>{(created.data?.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รอวางบิล")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{(pending.data?.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ AP / PO / ผู้ขาย")}
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                onPressEnter={applyPending}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่ AP")}</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/BBBB" value={pApRange} onChange={setPApRange} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันครบกำหนด")}</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/BBBB" value={pDueRange} onChange={setPDueRange} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearPending}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyPending}>
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {t("เลือกได้หลายใบเฉพาะ AP ของผู้ขายเดียวกัน เพื่อรวมเป็นใบวางบิลเดียว")}
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
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: t("ไม่มีรายการรอวางบิล") }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("ใบวางบิลที่สร้างแล้ว")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{(created.data?.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ใบวางบิล / AP / PO / ผู้ขาย")}
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onPressEnter={applyCreated}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่ใบวางบิล")}</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/BBBB" value={cRange} onChange={setCRange} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะเอกสาร")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={cStatus} onChange={setCStatus} options={STATUS_OPTIONS} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะออก PV")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={cPvStatus} onChange={setCPvStatus} options={PV_STATUS_OPTIONS} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearCreated}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyCreated}>
                {t("ค้นหา")}
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
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: t("ยังไม่มีใบวางบิล") }}
        />
      </div>
    </section>
  );
}
