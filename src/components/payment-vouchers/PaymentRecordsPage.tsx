"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, DatePicker, Input, Select, Table, Tag, Typography } from "antd";
import { FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import ReportExportButtons, { type ReportExportFormat } from "@/components/reports/ReportExportButtons";
import { formatThaiDate } from "@/components/ap-documents/apDocumentConfig";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  usePayableVouchersQuery,
  usePaymentRecordsQuery,
} from "@/hooks/payment-vouchers/usePaymentVouchers";
import { getPaymentRecordsExport } from "@/lib/api/payment-vouchers";
import { getAccessToken } from "@/lib/auth/token";
import {
  PAYMENT_RECORD_STATUS_COLOR,
  PAYMENT_RECORD_STATUS_LABEL,
  PV_KIND_LABEL,
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
  type PaymentRecord,
  type PaymentRecordQuery,
} from "@/types/payment-vouchers";
import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { PAYMENT_METHOD_OPTIONS, paymentMethodLabel } from "./PaymentMethodFields";
import { PAYMENT_RECORDS_PATH, fmtMoney, kindLabel } from "./paymentVoucherUtils";

const PAYABLE_PAGE_SIZE = 5;
const PAID_PAGE_SIZE = 10;

const KIND_OPTIONS = Object.entries(PV_KIND_LABEL).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(PAYMENT_RECORD_STATUS_LABEL).map(([value, label]) => ({ value, label }));

type DateRange = [Dayjs | null, Dayjs | null] | null;

/**
 * บันทึกจ่ายเงิน — ส่วนบน: PV ที่อนุมัติแล้วรอบันทึกจ่าย (ขึ้นอัตโนมัติ ไม่ต้องอนุมัติซ้ำ ไม่รอ Export Express)
 * ส่วนล่าง: รายการที่บันทึกจ่ายแล้ว + Export · ค้นหา/กรอง/แบ่งหน้าแยกกัน
 */
export default function PaymentRecordsPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_RECORDS");

  // ── ส่วนที่ 1: รอบันทึกจ่ายเงิน ──
  const [pPage, setPPage] = useState(1);
  const [pSearch, setPSearch] = useState("");
  const [pKeyword, setPKeyword] = useState("");
  const [pKind, setPKind] = useState<string | undefined>();
  const payable = usePayableVouchersQuery({
    page: pPage,
    limit: PAYABLE_PAGE_SIZE,
    search: pKeyword,
    paymentKind: pKind,
  });

  // ── ส่วนที่ 2: บันทึกจ่ายแล้ว ──
  const [rPage, setRPage] = useState(1);
  const [rSearch, setRSearch] = useState("");
  const [rKeyword, setRKeyword] = useState("");
  const [rRange, setRRange] = useState<DateRange>(null);
  const [rMethod, setRMethod] = useState<string | undefined>();
  const [rStatus, setRStatus] = useState<string | undefined>();
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const filters: Omit<PaymentRecordQuery, "page" | "limit"> = {
    search: rKeyword,
    paymentDateFrom: rRange?.[0]?.format("YYYY-MM-DD"),
    paymentDateTo: rRange?.[1]?.format("YYYY-MM-DD"),
    paymentMethod: rMethod,
    status: rStatus,
  };
  const records = usePaymentRecordsQuery({ ...filters, page: rPage, limit: PAID_PAGE_SIZE });

  const handleExport = async (format: ReportExportFormat) => {
    setDownloading(format);
    try {
      const rows = (await getPaymentRecordsExport(getAccessToken(), filters)).data;
      const filterText = [
        filters.search ? `ค้นหา: ${filters.search}` : null,
        filters.paymentDateFrom || filters.paymentDateTo
          ? `วันที่จ่าย: ${formatThaiDate(filters.paymentDateFrom)} - ${formatThaiDate(filters.paymentDateTo)}`
          : null,
        filters.paymentMethod ? `วิธีชำระ: ${paymentMethodLabel(filters.paymentMethod)}` : null,
        filters.status ? `สถานะ: ${PAYMENT_RECORD_STATUS_LABEL[filters.status] ?? filters.status}` : null,
      ].filter((v): v is string => Boolean(v));
      const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
      await downloadTabularReport(format, {
        title: "รายการที่บันทึกจ่ายแล้ว",
        filename: `payment-records-${dayjs().format("YYYYMMDD-HHmm")}`,
        meta: [`ออกรายงาน ${dayjs().format("DD/MM/YYYY HH:mm")}`, ...filterText, `ทั้งหมด ${rows.length} รายการ · รวม ${fmtMoney(total)} บาท`],
        headers: [
          "เลขที่รายการจ่าย",
          "วันที่จ่ายจริง",
          "เลขที่ PV",
          "ผู้ขาย",
          "วิธีชำระเงิน",
          "จำนวนเงินที่จ่ายจริง",
          "เลขอ้างอิงธุรกรรม",
          "สถานะ",
        ],
        rows: rows.map((r) => [
          r.paymentNo ?? "",
          formatThaiDate(r.paymentDate),
          r.voucherNo,
          r.creditor ? `${r.creditor.creditorCode} ${r.creditor.nameTh}` : "",
          paymentMethodLabel(r.paymentMethod),
          fmtMoney(r.amount),
          r.transactionRef ?? "",
          PAYMENT_RECORD_STATUS_LABEL[r.status] ?? r.status,
        ]),
        pdfColumns: [
          { header: "เลขที่รายการจ่าย", cells: [0], width: 95 },
          { header: "วันที่จ่าย", cells: [1], width: 70 },
          { header: "เลขที่ PV", cells: [2], width: 100 },
          { header: "ผู้ขาย", cells: [3], width: 160 },
          { header: "วิธีชำระ", cells: [4], width: 60 },
          { header: "จ่ายจริง", cells: [5], width: 85, align: "right", numeric: true },
          { header: "เลขอ้างอิง", cells: [6], width: 100 },
          { header: "สถานะ", cells: [7], width: 76 },
        ],
      });
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : "ส่งออกรายการที่บันทึกจ่ายแล้วไม่สำเร็จ");
    } finally {
      setDownloading(null);
    }
  };

  const payableColumns: ColumnsType<SupplierPaymentVoucher> = [
    {
      title: "เลขที่ PV",
      dataIndex: "voucherNo",
      render: (v: string, r) => <Link href={`/finance/payables/payment-vouchers/${r.id}`}>{v}</Link>,
    },
    { title: "วันที่ PV", dataIndex: "voucherDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (r.creditor ? `${r.creditor.creditorCode} ${r.creditor.nameTh}` : "—"),
    },
    { title: "ประเภทการจ่าย", dataIndex: "paymentKind", width: 120, render: (v?: string) => kindLabel(v) },
    { title: "วันที่ต้องการจ่าย", dataIndex: "desiredPayDate", width: 130, render: (v?: string) => formatThaiDate(v) },
    { title: "วิธีชำระ", dataIndex: "paymentMethod", width: 110, render: (v: string) => paymentMethodLabel(v) },
    { title: "ยอดสุทธิที่ต้องจ่าย", dataIndex: "netAmount", align: "right", width: 150, render: (v: string) => fmtMoney(v) },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 150,
      render: (v: string) => <Tag color={VOUCHER_STATUS_COLOR[v]}>{VOUCHER_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) =>
        perms.canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${PAYMENT_RECORDS_PATH}/create?voucherId=${r.id}`)}>
            บันทึกจ่ายเงิน
          </Button>
        ) : null,
    },
  ];

  const recordColumns: ColumnsType<PaymentRecord> = [
    { title: "เลขที่รายการจ่าย", dataIndex: "paymentNo", width: 150, render: (v?: string) => <Typography.Text strong>{v ?? "—"}</Typography.Text> },
    { title: "วันที่จ่ายจริง", dataIndex: "paymentDate", width: 120, render: (v: string) => formatThaiDate(v) },
    { title: "เลขที่ PV", dataIndex: "voucherNo", width: 160 },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) => (r.creditor ? `${r.creditor.creditorCode} ${r.creditor.nameTh}` : "—"),
    },
    { title: "วิธีชำระ", dataIndex: "paymentMethod", width: 110, render: (v: string) => paymentMethodLabel(v) },
    { title: "จำนวนเงินที่จ่ายจริง", dataIndex: "amount", align: "right", width: 160, render: (v: string) => fmtMoney(v) },
    { title: "เลขอ้างอิงธุรกรรม", dataIndex: "transactionRef", render: (v?: string) => v ?? "—" },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 110,
      render: (v: string) => <Tag color={PAYMENT_RECORD_STATUS_COLOR[v]}>{PAYMENT_RECORD_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "detail",
      width: 130,
      render: (_v, r) => (
        // PV จากคิว → หน้ารายละเอียดรายการจ่ายใหม่ (id = รายการจ่าย) · PV เดิมจากใบสั่งซื้อ → หน้า PV เดิม
        <Link href={r.viaQueue ? `${PAYMENT_RECORDS_PATH}/${r.id}` : `/purchase-payments/${r.voucherId}`}>
          <Button size="small">ดูรายละเอียด</Button>
        </Link>
      ),
    },
  ];

  const applyPayable = () => {
    setPKeyword(pSearch.trim());
    setPPage(1);
  };
  const clearPayable = () => {
    setPSearch("");
    setPKeyword("");
    setPKind(undefined);
    setPPage(1);
  };
  const applyRecords = () => {
    setRKeyword(rSearch.trim());
    setRPage(1);
  };
  const clearRecords = () => {
    setRSearch("");
    setRKeyword("");
    setRRange(null);
    setRMethod(undefined);
    setRStatus(undefined);
    setRPage(1);
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
          <h2 className={masterStyles.pageTitle}>บันทึกจ่ายเงิน</h2>
          <span className={masterStyles.pageSubtitle}>
            ใบสำคัญจ่ายที่อนุมัติแล้วรอบันทึกจ่ายจริง และรายการที่บันทึกจ่ายแล้ว
          </span>
        </div>
        <ReportExportButtons canExport downloading={downloading} onExport={(f) => void handleExport(f)} />
      </div>

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>รอบันทึกจ่าย</span>
          <span className={styles.statValue}>{(payable.data?.data.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>จ่ายแล้ว</span>
          <span className={styles.statValue}>{(records.data?.data.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รอบันทึกจ่ายเงิน</h3>
          </div>
          <span className={masterStyles.tableCount}>{(payable.data?.data.total ?? 0).toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่ PV / ชื่อผู้ขาย"
                value={pSearch}
                onChange={(e) => setPSearch(e.target.value)}
                onPressEnter={applyPayable}
              />
            </div>
            <div className={styles.filterItem}>
              <label>ประเภทการจ่าย</label>
              <Select allowClear placeholder="ทั้งหมด" value={pKind} onChange={setPKind} options={KIND_OPTIONS} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearPayable}>เคลียร์</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyPayable}>
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
          loading={payable.isLoading}
          columns={payableColumns}
          dataSource={payable.data?.data.items ?? []}
          pagination={{
            current: pPage,
            pageSize: PAYABLE_PAGE_SIZE,
            total: payable.data?.data.total ?? 0,
            onChange: setPPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ไม่มีใบสำคัญจ่ายที่รอบันทึกจ่ายเงิน" }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>บันทึกจ่ายแล้ว</h3>
          </div>
          <span className={masterStyles.tableCount}>{(records.data?.data.total ?? 0).toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่รายการจ่าย / เลขที่ PV / ชื่อผู้ขาย"
                value={rSearch}
                onChange={(e) => setRSearch(e.target.value)}
                onPressEnter={applyRecords}
              />
            </div>
            <div className={styles.filterItem}>
              <label>วันที่จ่าย</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" value={rRange} onChange={setRRange} />
            </div>
            <div className={styles.filterItem}>
              <label>วิธีชำระ</label>
              <Select allowClear placeholder="ทั้งหมด" value={rMethod} onChange={setRMethod} options={PAYMENT_METHOD_OPTIONS} />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะ</label>
              <Select allowClear placeholder="ทั้งหมด" value={rStatus} onChange={setRStatus} options={STATUS_OPTIONS} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearRecords}>เคลียร์</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyRecords}>
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
          loading={records.isLoading}
          columns={recordColumns}
          dataSource={records.data?.data.items ?? []}
          pagination={{
            current: rPage,
            pageSize: PAID_PAGE_SIZE,
            total: records.data?.data.total ?? 0,
            onChange: setRPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1200 }}
          locale={{ emptyText: "ยังไม่มีรายการที่บันทึกจ่าย" }}
        />
      </div>
    </section>
  );
}
