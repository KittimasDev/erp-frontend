"use client";

import { useState } from "react";
import { App, Button, DatePicker, Input, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import ReportExportButtons, { type ReportExportFormat } from "@/components/reports/ReportExportButtons";
import { useCreatedApsQuery, usePendingChargesQuery, usePendingGrnsQuery } from "@/hooks/ap-documents/useApDocuments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { getCreatedApsExport } from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { tStatus } from "@/types/purchase-orders";
import {
  AP_DOCUMENT_STATUS_COLOR,
  AP_DOCUMENT_STATUS_LABEL,
  AP_PAYMENT_STATUS_COLOR,
  AP_PAYMENT_STATUS_LABEL,
  AP_TERM_TYPE_LABEL,
  type CreatedAp,
  type CreatedApQuery,
  type PendingChargePo,
  type PendingGrn,
} from "@/types/ap-documents";
import { downloadTabularReport } from "@/utils/downloadTabularReport";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money, termText } from "./apDocumentConfig";
import PageHeader from "@/components/common/PageHeader";

const PENDING_PAGE_SIZE = 5;
const CHARGE_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 10;

type DateRange = [Dayjs | null, Dayjs | null] | null;

const TERM_OPTIONS = Object.entries(AP_TERM_TYPE_LABEL).map(([value, label]) => ({ value, label }));
const DOC_STATUS_OPTIONS = Object.entries(AP_DOCUMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));
const PAY_STATUS_OPTIONS = Object.entries(AP_PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

const ymd = (d?: Dayjs | null) => d?.format("YYYY-MM-DD");

/**
 * ใบตั้งหนี้เจ้าหนี้ — ส่วนบน: รอสร้างใบตั้งหนี้ (GRN ที่ยืนยันแล้วขึ้นอัตโนมัติ)
 * ส่วนล่าง: ใบตั้งหนี้ที่สร้างแล้ว + Export · ค้นหา/กรอง/แบ่งหน้าแยกกัน
 */
export default function ApInvoicesPage() {
  const config = AP_DOCUMENT_CONFIG.invoice;
  const router = useRouter();
  const t = useT();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(config.screenCode);
  const termOptions = TERM_OPTIONS.map((o) => ({ ...o, label: t(o.label) }));
  const docStatusOptions = DOC_STATUS_OPTIONS.map((o) => ({ ...o, label: tStatus(o.label) }));
  const payStatusOptions = PAY_STATUS_OPTIONS.map((o) => ({ ...o, label: tStatus(o.label) }));

  // ── ส่วนที่ 1: รอสร้างใบตั้งหนี้ ──
  const [pPage, setPPage] = useState(1);
  const [pSearch, setPSearch] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [pRange, setPRange] = useState<DateRange>(null);
  const [pTerm, setPTerm] = useState<string | undefined>();
  const pending = usePendingGrnsQuery({
    page: pPage,
    limit: PENDING_PAGE_SIZE,
    search: pKeyword,
    receivedFrom: ymd(pRange?.[0]),
    receivedTo: ymd(pRange?.[1]),
    termType: pTerm,
  });

  // ── ส่วนที่ 1.1: PO ที่ยังมีค่าใช้จ่ายเพิ่มเติมคงเหลือรอตั้งหนี้ (ไม่ต้องมี GRN) ──
  const [chPage, setChPage] = useState(1);
  const [chSearch, setChSearch] = useState("");
  const [chKeyword, setChKeyword] = useState("");
  const pendingCharges = usePendingChargesQuery({ page: chPage, limit: CHARGE_PAGE_SIZE, search: chKeyword });

  // ── ส่วนที่ 2: ที่สร้างแล้ว ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState("");
  const [cKeyword, setCKeyword] = useState("");
  const [cDocRange, setCDocRange] = useState<DateRange>(null);
  const [cDueRange, setCDueRange] = useState<DateRange>(null);
  const [cStatus, setCStatus] = useState<string | undefined>();
  const [cPayStatus, setCPayStatus] = useState<string | undefined>();
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const filters: Omit<CreatedApQuery, "page" | "limit"> = {
    search: cKeyword,
    docDateFrom: ymd(cDocRange?.[0]),
    docDateTo: ymd(cDocRange?.[1]),
    status: cStatus,
    paymentStatus: cPayStatus,
    dueFrom: ymd(cDueRange?.[0]),
    dueTo: ymd(cDueRange?.[1]),
  };
  const created = useCreatedApsQuery({ ...filters, page: cPage, limit: CREATED_PAGE_SIZE });

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const rows = (await getCreatedApsExport(getAccessToken(), filters)).data;
      const range = (a?: string, b?: string) => (a || b ? `${formatThaiDate(a)} - ${formatThaiDate(b)}` : null);
      const meta = [
        `ออกรายงาน ${dayjs().format("DD/MM/BBBB HH:mm")}`,
        filters.search ? `ค้นหา: ${filters.search}` : null,
        range(filters.docDateFrom, filters.docDateTo) ? `วันที่ตั้งหนี้: ${range(filters.docDateFrom, filters.docDateTo)}` : null,
        filters.status ? `สถานะเอกสาร: ${AP_DOCUMENT_STATUS_LABEL[filters.status] ?? filters.status}` : null,
        filters.paymentStatus ? `สถานะชำระ: ${AP_PAYMENT_STATUS_LABEL[filters.paymentStatus] ?? filters.paymentStatus}` : null,
        range(filters.dueFrom, filters.dueTo) ? `วันครบกำหนด: ${range(filters.dueFrom, filters.dueTo)}` : null,
        `ทั้งหมด ${rows.length} รายการ · ยอดตั้งหนี้รวม ${money.format(rows.reduce((s, r) => s + r.totalAmount, 0))} บาท`,
      ].filter((v): v is string => Boolean(v));
      await downloadTabularReport(format, {
        title: "รายการใบตั้งหนี้เจ้าหนี้",
        filename: `ap-invoices-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta,
        headers: [
          "เลขที่ AP",
          "วันที่ตั้งหนี้",
          "ผู้ขาย",
          "เลขที่ PO",
          "เลขที่รายการจ่ายเงิน",
          "ยอดตั้งหนี้รวม VAT",
          "ยอดหักมัดจำ",
          "ยอดคงเหลือ",
          "วันครบกำหนด",
          "สถานะเอกสาร",
          "สถานะชำระเงิน",
        ],
        rows: rows.map((r) => [
          r.docNo,
          formatThaiDate(r.docDate),
          `${r.creditorCode} ${r.creditorName}`,
          r.poNo ?? "",
          r.paymentListNo ?? "",
          money.format(r.totalAmount),
          money.format(r.depositDeductAmount),
          money.format(r.remainingAmount),
          formatThaiDate(r.dueDate),
          AP_DOCUMENT_STATUS_LABEL[r.status] ?? r.status,
          AP_PAYMENT_STATUS_LABEL[r.paymentStatus] ?? r.paymentStatus,
        ]),
        pdfColumns: [
          { header: "เลขที่ AP", cells: [0], width: 90 },
          { header: "วันที่", cells: [1], width: 62 },
          { header: "ผู้ขาย", cells: [2], width: 120 },
          { header: "PO / รายการจ่าย", cells: [3], width: 78 },
          { header: "ยอดตั้งหนี้", cells: [5], width: 70, align: "right", numeric: true },
          { header: "หักมัดจำ", cells: [6], width: 62, align: "right", numeric: true },
          { header: "คงเหลือ", cells: [7], width: 66, align: "right", numeric: true },
          { header: "ครบกำหนด", cells: [8], width: 62 },
          { header: "สถานะ", cells: [9], width: 62 },
          { header: "ชำระ", cells: [10], width: 74 },
        ],
      });
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : t("ส่งออกรายการใบตั้งหนี้ไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  const pendingColumns: ColumnsType<PendingGrn> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (pPage - 1) * PENDING_PAGE_SIZE + index + 1,
    },
    {
      title: t("วันที่รับสินค้า"),
      key: "date",
      width: 150,
      render: (_v, r) => (
        <span>
          {formatThaiDate(r.grnDate)}
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("ยืนยัน {time}", { time: r.confirmedAt ? dayjs(r.confirmedAt).format("DD/MM/BBBB HH:mm") : "—" })}
          </Typography.Text>
        </span>
      ),
    },
    { title: t("เลขที่ GRN"), dataIndex: "grnNo", render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    {
      title: t("เลขที่ PO"),
      dataIndex: "poNo",
      render: (v: string, r) => <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link>,
    },
    { title: t("เลขที่รายการจ่ายเงิน"), dataIndex: "poNo", key: "paymentList", render: (v: string) => v },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    {
      title: t("มูลค่ารอสร้าง AP (รวมค่าใช้จ่าย)"),
      dataIndex: "pendingAmount",
      align: "right",
      width: 180,
      render: (v: number) => money.format(v),
    },
    { title: t("เงื่อนไขการชำระ"), key: "term", width: 160, render: (_v, r) => termText(r.paymentTerm) },
    {
      title: t("สถานะ"),
      key: "status",
      width: 170,
      render: () => <Tag color="gold">{t("รอสร้างใบตั้งหนี้")}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => {
        if (r.action === "CONTINUE_DRAFT" && r.draftApId) {
          return perms.canEdit ? (
            <Button size="small" onClick={() => router.push(`${config.basePath}/${r.draftApId}/edit`)}>
              {t("ดำเนินการต่อ")}
            </Button>
          ) : null;
        }
        return perms.canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${config.basePath}/create?grnId=${r.grnId}`)}>
            {t("สร้างใบตั้งหนี้")}
          </Button>
        ) : null;
      },
    },
  ];

  const pendingChargeColumns: ColumnsType<PendingChargePo> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: t("เลขที่ PO"), dataIndex: "poNo", width: 150, render: (v: string, r) => <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link> },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: t("ค่าใช้จ่ายตาม PO (ก่อน VAT)"), dataIndex: "chargeAmountBeforeVat", align: "right", width: 190, render: (v: number) => money.format(v) },
    { title: t("ตั้งหนี้แล้ว"), dataIndex: "allocatedAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: t("ยังไม่ได้ตั้ง AP"),
      dataIndex: "remainingAmount",
      align: "right",
      width: 150,
      render: (v: number) => <Typography.Text strong>{money.format(v)}</Typography.Text>,
    },
    { title: t("รายการที่เหลือ"), dataIndex: "remainingCount", align: "center", width: 120 },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_v, r) =>
        perms.canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${config.basePath}/create?poId=${r.purchaseOrderId}`)}>
            {t("สร้าง AP ค่าใช้จ่าย")}
          </Button>
        ) : null,
    },
  ];

  const createdColumns: ColumnsType<CreatedAp> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (cPage - 1) * CREATED_PAGE_SIZE + index + 1,
    },
    { title: t("เลขที่ AP"), dataIndex: "docNo", width: 170, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: t("วันที่ตั้งหนี้"), dataIndex: "docDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ผู้ขาย"),
      key: "creditor",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.creditorCode}</Typography.Text> {r.creditorName}
        </span>
      ),
    },
    { title: t("เลขที่ PO"), dataIndex: "poNo", width: 130, render: (v?: string) => v ?? "—" },
    { title: t("เลขที่รายการจ่ายเงิน"), dataIndex: "paymentListNo", width: 150, render: (v?: string) => v ?? "—" },
    { title: t("ยอดตั้งหนี้รวม VAT"), dataIndex: "totalAmount", align: "right", width: 150, render: (v: number) => money.format(v) },
    { title: t("ยอดหักมัดจำ"), dataIndex: "depositDeductAmount", align: "right", width: 120, render: (v: number) => money.format(v) },
    { title: t("ยอดคงเหลือ"), dataIndex: "remainingAmount", align: "right", width: 130, render: (v: number) => money.format(v) },
    {
      title: t("วันครบกำหนด"),
      dataIndex: "dueDate",
      width: 150,
      render: (v: string | undefined, r: CreatedAp) => (
        <>
          {formatThaiDate(v)}
          {r.dueDateMismatch ? (
            <Tooltip
              title={t(
                "ฐานวันที่อาจผิด: ควรเป็น {date} (วันที่ใบแจ้งหนี้ Supplier + เครดิตวัน) — ตรวจและแก้เองถ้าจำเป็น ระบบไม่ปรับให้อัตโนมัติ",
                { date: formatThaiDate(r.expectedDueDate) },
              )}
            >
              <Tag color="orange" style={{ marginLeft: 6 }}>{t("ตรวจฐานวัน")}</Tag>
            </Tooltip>
          ) : null}
        </>
      ),
    },
    {
      title: t("สถานะเอกสาร"),
      dataIndex: "status",
      width: 120,
      render: (v: string) => <Tag color={AP_DOCUMENT_STATUS_COLOR[v] ?? "default"}>{tStatus(AP_DOCUMENT_STATUS_LABEL[v] ?? v)}</Tag>,
    },
    {
      title: t("สถานะชำระเงิน"),
      dataIndex: "paymentStatus",
      width: 130,
      render: (v: string) => <Tag color={AP_PAYMENT_STATUS_COLOR[v] ?? "default"}>{tStatus(AP_PAYMENT_STATUS_LABEL[v] ?? v)}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 170,
      render: (_v, r) => (
        <Space>
          <Link href={`${config.basePath}/${r.id}`}>
            <Button size="small">{t("ดูรายละเอียด")}</Button>
          </Link>
          {r.status === "DRAFT" && perms.canEdit ? (
            <Link href={`${config.basePath}/${r.id}/edit`}>
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
    setPRange(null);
    setPTerm(undefined);
    setPPage(1);
  };
  const applyCharges = () => {
    setChKeyword(chSearch.trim());
    setChPage(1);
  };
  const clearCharges = () => {
    setChSearch("");
    setChKeyword("");
    setChPage(1);
  };
  const applyCreated = () => {
    setCKeyword(cSearch.trim());
    setCPage(1);
  };
  const clearCreated = () => {
    setCSearch("");
    setCKeyword("");
    setCDocRange(null);
    setCDueRange(null);
    setCStatus(undefined);
    setCPayStatus(undefined);
    setCPage(1);
  };

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · PAYABLES"
        icon={<FileTextOutlined />}
        title={t("ใบตั้งหนี้เจ้าหนี้")}
        subtitle={t("GRN ที่ยืนยันแล้วรอตั้งหนี้ · ค่าใช้จ่ายเพิ่มเติมใน PO · และใบตั้งหนี้ที่สร้างแล้ว")}
        actions={
          <>
<ReportExportButtons canExport downloading={downloading} onExport={(f) => void handleExport(f)} />
          </>
        }
      />

      <div className={`${styles.statRow} ${styles.statRow3}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("รอตั้งหนี้ GRN")}</span>
          <span className={styles.statValue}>{(pending.data?.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("รอตั้งค่าใช้จ่าย")}</span>
          <span className={styles.statValue}>{(pendingCharges.data?.total ?? 0).toLocaleString("th-TH")}</span>
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
            <h3>{t("รอสร้างใบตั้งหนี้")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{t("{n} รายการ", { n: (pending.data?.total ?? 0).toLocaleString("th-TH") })}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ GRN / PO / รายการจ่ายเงิน / ผู้ขาย")}
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                onPressEnter={applyPending}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่รับสินค้า")}</label>
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                format="DD/MM/BBBB"
                value={pRange}
                onChange={(v) => setPRange(v)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("เงื่อนไขการชำระ")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={pTerm} onChange={setPTerm} options={termOptions} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearPending}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyPending}>
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="grnId"
          loading={pending.isLoading}
          columns={pendingColumns}
          dataSource={pending.data?.items ?? []}
          pagination={{
            current: pPage,
            pageSize: PENDING_PAGE_SIZE,
            total: pending.data?.total ?? 0,
            onChange: setPPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1300 }}
          locale={{ emptyText: t("ไม่มีรายการรอสร้างใบตั้งหนี้") }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("PO ค้างค่าใช้จ่ายเพิ่มเติม")}</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {t("{n} รายการ", { n: (pendingCharges.data?.total ?? 0).toLocaleString("th-TH") })}
          </span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ PO / ผู้ขาย")}
                value={chSearch}
                onChange={(e) => setChSearch(e.target.value)}
                onPressEnter={applyCharges}
              />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearCharges}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyCharges}>
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="purchaseOrderId"
          loading={pendingCharges.isLoading}
          columns={pendingChargeColumns}
          dataSource={pendingCharges.data?.items ?? []}
          pagination={{
            current: chPage,
            pageSize: CHARGE_PAGE_SIZE,
            total: pendingCharges.data?.total ?? 0,
            onChange: setChPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: t("ไม่มี PO ที่ค้างค่าใช้จ่ายเพิ่มเติม") }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("ใบตั้งหนี้ที่สร้างแล้ว")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{t("{n} รายการ", { n: (created.data?.total ?? 0).toLocaleString("th-TH") })}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ AP / PO / รายการจ่ายเงิน / ผู้ขาย")}
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onPressEnter={applyCreated}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่ตั้งหนี้")}</label>
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                format="DD/MM/BBBB"
                value={cDocRange}
                onChange={(v) => setCDocRange(v)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันครบกำหนด")}</label>
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                format="DD/MM/BBBB"
                value={cDueRange}
                onChange={(v) => setCDueRange(v)}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะเอกสาร")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={cStatus} onChange={setCStatus} options={docStatusOptions} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะชำระเงิน")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={cPayStatus}
                onChange={setCPayStatus}
                options={payStatusOptions}
              />
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
          scroll={{ x: 1700 }}
          locale={{ emptyText: t("ยังไม่มีใบตั้งหนี้") }}
        />
      </div>
    </section>
  );
}
