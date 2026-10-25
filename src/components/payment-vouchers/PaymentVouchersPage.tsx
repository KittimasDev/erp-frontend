"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Table, Tag, Typography } from "antd";
import { FileTextOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useCreatedPaymentVouchersQuery,
  usePaymentVoucherQueueQuery,
} from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  PV_KIND_LABEL,
  PV_QUEUE_STATUS_LABEL,
  PV_SOURCE_LABEL,
  VOUCHER_STATUS_COLOR,
  VOUCHER_STATUS_LABEL,
  type PaymentVoucherQueueItem,
} from "@/types/payment-vouchers";
import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import { PV_BASE_PATH, sourceHref } from "./paymentVoucherUtils";

export const PAYMENT_VOUCHER_SCREEN = "FINANCE_PAYMENT_VOUCHERS";
const QUEUE_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 20;

const SOURCE_OPTIONS = [
  { value: "ADVANCE_REQUEST", label: PV_SOURCE_LABEL.ADVANCE_REQUEST },
  { value: "BILLING_NOTE", label: PV_SOURCE_LABEL.BILLING_NOTE },
  { value: "AP_INVOICE", label: PV_SOURCE_LABEL.AP_INVOICE },
];

function SourceDocLink({
  sourceType,
  sourceId,
  sourceNo,
  purchaseOrderId,
}: {
  sourceType: string;
  sourceId?: string;
  sourceNo?: string;
  purchaseOrderId?: string;
}) {
  const href = sourceId || purchaseOrderId ? sourceHref(sourceType, sourceId ?? "", purchaseOrderId) : undefined;
  if (!sourceNo) return <>—</>;
  return href ? <Link href={href}>{sourceNo}</Link> : <>{sourceNo}</>;
}

/** ใบสำคัญจ่าย — ตารางบน: รายการรอสร้างใบสำคัญจ่าย · ตารางล่าง: ใบสำคัญจ่ายที่สร้างแล้ว (ค้นหา/กรอง/แบ่งหน้าแยกกัน) */
export default function PaymentVouchersPage() {
  const router = useRouter();
  const { canAdd } = useScreenActionPermissions(PAYMENT_VOUCHER_SCREEN);

  // ── ตาราง 1: รอสร้างใบสำคัญจ่าย ──
  const [qPage, setQPage] = useState(1);
  const [qSearch, setQSearch] = useState("");
  const [qKeyword, setQKeyword] = useState("");
  const [qSource, setQSource] = useState<string | undefined>();
  const queue = usePaymentVoucherQueueQuery({
    page: qPage,
    limit: QUEUE_PAGE_SIZE,
    search: qKeyword,
    sourceType: qSource,
  });

  // ── ตาราง 2: ที่สร้างแล้ว ──
  const [cPage, setCPage] = useState(1);
  const [cSearch, setCSearch] = useState("");
  const [cKeyword, setCKeyword] = useState("");
  const [cSource, setCSource] = useState<string | undefined>();
  const [cStatus, setCStatus] = useState<string | undefined>();
  const created = useCreatedPaymentVouchersQuery({
    page: cPage,
    limit: CREATED_PAGE_SIZE,
    search: cKeyword,
    sourceType: cSource,
    status: cStatus,
  });

  const queueColumns: ColumnsType<PaymentVoucherQueueItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (qPage - 1) * QUEUE_PAGE_SIZE + index + 1,
    },
    {
      title: "วันที่รายการ",
      dataIndex: "queuedAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "ประเภทเอกสาร",
      dataIndex: "sourceType",
      width: 170,
      render: (v: string) => PV_SOURCE_LABEL[v] ?? v,
    },
    {
      title: "เลขที่เอกสารอ้างอิง",
      key: "sourceNo",
      render: (_v, r) => (
        <span>
          <SourceDocLink sourceType={r.sourceType} sourceId={r.sourceId} sourceNo={r.sourceNo} purchaseOrderId={r.purchaseOrderId} />
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            คิว {r.queueNo}
          </Typography.Text>
        </span>
      ),
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) =>
        r.creditor ? (
          <span>
            <Typography.Text type="secondary">{r.creditor.creditorCode}</Typography.Text> {r.creditor.nameTh}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "ประเภทการจ่าย",
      dataIndex: "paymentKind",
      width: 130,
      render: (v: string) => PV_KIND_LABEL[v] ?? v,
    },
    {
      title: "ยอดที่ต้องการจ่าย",
      dataIndex: "amount",
      align: "right",
      width: 130,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: "WHT",
      dataIndex: "whtAmount",
      align: "right",
      width: 110,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: "ยอดสุทธิโอน",
      dataIndex: "netAmount",
      align: "right",
      width: 130,
      render: (v: string) => (
        <Typography.Text strong>{money.format(Number(v))}</Typography.Text>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      width: 170,
      render: (v: string) => <Tag color="gold">{PV_QUEUE_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) =>
        canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${PV_BASE_PATH}/create?queueItemId=${r.id}`)}>
            สร้างใบสำคัญจ่าย
          </Button>
        ) : null,
    },
  ];

  const createdColumns: ColumnsType<SupplierPaymentVoucher> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (cPage - 1) * CREATED_PAGE_SIZE + index + 1,
    },
    {
      title: "เลขที่ PV",
      dataIndex: "voucherNo",
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: "วันที่ PV", dataIndex: "voucherDate", width: 120, render: (v: string) => formatThaiDate(v) },
    {
      title: "ประเภทเอกสารต้นทาง",
      key: "sourceType",
      width: 170,
      render: (_v, r) => PV_SOURCE_LABEL[r.sourceType ?? "PURCHASE_ORDER"] ?? r.sourceType,
    },
    {
      title: "เลขที่เอกสารอ้างอิง",
      key: "sourceNo",
      render: (_v, r) => (
        <SourceDocLink
          sourceType={r.sourceType ?? "PURCHASE_ORDER"}
          sourceId={r.sourceId}
          sourceNo={r.sourceNo}
          purchaseOrderId={r.purchaseOrderId}
        />
      ),
    },
    {
      title: "ผู้ขาย",
      key: "creditor",
      render: (_v, r) =>
        r.creditor ? (
          <span>
            <Typography.Text type="secondary">{r.creditor.creditorCode}</Typography.Text> {r.creditor.nameTh}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "ยอดสุทธิ",
      dataIndex: "netAmount",
      align: "right",
      width: 140,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: "สถานะ PV",
      dataIndex: "status",
      width: 130,
      render: (v: string) => <Tag color={VOUCHER_STATUS_COLOR[v]}>{VOUCHER_STATUS_LABEL[v] ?? v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => (
        // PV จากคิวใช้ฟอร์มกลาง · PV แบบเดิมจากใบสั่งซื้อใช้หน้ารายละเอียดเดิม
        <Link href={r.queueItemId ? `${PV_BASE_PATH}/${r.id}` : `/purchase-payments/${r.id}`}>
          <Button size="small">{r.status === "DRAFT" || r.status === "REJECTED" ? "ดู / แก้ไข" : "ดูรายละเอียด"}</Button>
        </Link>
      ),
    },
  ];

  const applyQueue = () => {
    setQKeyword(qSearch.trim());
    setQPage(1);
  };
  const clearQueue = () => {
    setQSearch("");
    setQKeyword("");
    setQSource(undefined);
    setQPage(1);
  };
  const applyCreated = () => {
    setCKeyword(cSearch.trim());
    setCPage(1);
  };
  const clearCreated = () => {
    setCSearch("");
    setCKeyword("");
    setCSource(undefined);
    setCStatus(undefined);
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
          <h2 className={masterStyles.pageTitle}>ใบสำคัญจ่าย</h2>
          <span className={masterStyles.pageSubtitle}>
            รายการที่ยืนยันแล้วพร้อมออกใบสำคัญจ่าย และใบสำคัญจ่ายที่สร้างแล้ว
          </span>
        </div>
      </div>

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>คิวรอ</span>
          <span className={styles.statValue}>{(queue.data?.data.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>สร้างแล้ว</span>
          <span className={styles.statValue}>{(created.data?.data.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>รายการ</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>รอสร้างใบสำคัญจ่าย</h3>
          </div>
          <span className={masterStyles.tableCount}>{(queue.data?.data.total ?? 0).toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่เอกสารอ้างอิง / ชื่อผู้ขาย"
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                onPressEnter={applyQueue}
              />
            </div>
            <div className={styles.filterItem}>
              <label>ประเภทเอกสาร</label>
              <Select allowClear placeholder="ทั้งหมด" value={qSource} onChange={setQSource} options={SOURCE_OPTIONS} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearQueue}>เคลียร์</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyQueue}>
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
          loading={queue.isLoading}
          columns={queueColumns}
          dataSource={queue.data?.data.items ?? []}
          pagination={{
            current: qPage,
            pageSize: QUEUE_PAGE_SIZE,
            total: queue.data?.data.total ?? 0,
            onChange: setQPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ไม่มีรายการรอสร้างใบสำคัญจ่าย" }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>รายการ</div>
            <h3>ใบสำคัญจ่ายที่สร้างแล้ว</h3>
          </div>
          <span className={masterStyles.tableCount}>{(created.data?.data.total ?? 0).toLocaleString("th-TH")} รายการ</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>ค้นหา</label>
              <Input
                allowClear
                placeholder="เลขที่ PV / เลขที่เอกสารอ้างอิง / ชื่อผู้ขาย"
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onPressEnter={applyCreated}
              />
            </div>
            <div className={styles.filterItem}>
              <label>ประเภทเอกสารต้นทาง</label>
              <Select allowClear placeholder="ทั้งหมด" value={cSource} onChange={setCSource} options={SOURCE_OPTIONS} />
            </div>
            <div className={styles.filterItem}>
              <label>สถานะ PV</label>
              <Select
                allowClear
                placeholder="ทั้งหมด"
                value={cStatus}
                onChange={setCStatus}
                options={Object.entries(VOUCHER_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              />
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
          dataSource={created.data?.data.items ?? []}
          pagination={{
            current: cPage,
            pageSize: CREATED_PAGE_SIZE,
            total: created.data?.data.total ?? 0,
            onChange: setCPage,
            showSizeChanger: false,
            showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: "ยังไม่มีใบสำคัญจ่าย" }}
        />
      </div>
    </section>
  );
}
