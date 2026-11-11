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
import { useT } from "@/lib/i18n/useT";
import { tFin, PV_BASE_PATH, sourceHref } from "./paymentVoucherUtils";
import PageHeader from "@/components/common/PageHeader";

export const PAYMENT_VOUCHER_SCREEN = "FINANCE_PAYMENT_VOUCHERS";
const QUEUE_PAGE_SIZE = 5;
const CREATED_PAGE_SIZE = 20;

const SOURCE_OPTIONS_BASE = [
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
  const t = useT();
  const router = useRouter();
  const { canAdd } = useScreenActionPermissions(PAYMENT_VOUCHER_SCREEN);
  const SOURCE_OPTIONS = SOURCE_OPTIONS_BASE.map((o) => ({ ...o, label: t(o.label) }));

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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (qPage - 1) * QUEUE_PAGE_SIZE + index + 1,
    },
    {
      title: t("วันที่รายการ"),
      dataIndex: "queuedAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD/MM/BBBB HH:mm"),
    },
    {
      title: t("ประเภทเอกสาร"),
      dataIndex: "sourceType",
      width: 170,
      render: (v: string) => (PV_SOURCE_LABEL[v] ? tFin(PV_SOURCE_LABEL[v]) : v),
    },
    {
      title: t("เลขที่เอกสารอ้างอิง"),
      key: "sourceNo",
      render: (_v, r) => (
        <span>
          <SourceDocLink sourceType={r.sourceType} sourceId={r.sourceId} sourceNo={r.sourceNo} purchaseOrderId={r.purchaseOrderId} />
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("คิว")} {r.queueNo}
          </Typography.Text>
        </span>
      ),
    },
    {
      title: t("ผู้ขาย"),
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
      title: t("ประเภทการจ่าย"),
      dataIndex: "paymentKind",
      width: 130,
      render: (v: string) => (PV_KIND_LABEL[v] ? tFin(PV_KIND_LABEL[v]) : v),
    },
    {
      title: t("ยอดที่ต้องการจ่าย"),
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
      title: t("ยอดสุทธิโอน"),
      dataIndex: "netAmount",
      align: "right",
      width: 130,
      render: (v: string) => (
        <Typography.Text strong>{money.format(Number(v))}</Typography.Text>
      ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 170,
      render: (v: string) => <Tag color="gold">{PV_QUEUE_STATUS_LABEL[v] ? tFin(PV_QUEUE_STATUS_LABEL[v]) : v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) =>
        canAdd ? (
          <Button type="primary" size="small" onClick={() => router.push(`${PV_BASE_PATH}/create?queueItemId=${r.id}`)}>
            {t("สร้างใบสำคัญจ่าย")}
          </Button>
        ) : null,
    },
  ];

  const createdColumns: ColumnsType<SupplierPaymentVoucher> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (cPage - 1) * CREATED_PAGE_SIZE + index + 1,
    },
    {
      title: t("เลขที่ PV"),
      dataIndex: "voucherNo",
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: t("วันที่ PV"), dataIndex: "voucherDate", width: 120, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ประเภทเอกสารต้นทาง"),
      key: "sourceType",
      width: 170,
      render: (_v, r) => {
        const label = PV_SOURCE_LABEL[r.sourceType ?? "PURCHASE_ORDER"];
        return label ? t(label) : r.sourceType;
      },
    },
    {
      title: t("เลขที่เอกสารอ้างอิง"),
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
      title: t("ผู้ขาย"),
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
      title: t("ยอดสุทธิ"),
      dataIndex: "netAmount",
      align: "right",
      width: 140,
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: t("สถานะ PV"),
      dataIndex: "status",
      width: 130,
      render: (v: string) => <Tag color={VOUCHER_STATUS_COLOR[v]}>{VOUCHER_STATUS_LABEL[v] ? tFin(VOUCHER_STATUS_LABEL[v]) : v}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => (
        // PV จากคิวใช้ฟอร์มกลาง · PV แบบเดิมจากใบสั่งซื้อใช้หน้ารายละเอียดเดิม
        <Link href={r.queueItemId ? `${PV_BASE_PATH}/${r.id}` : `/purchase-payments/${r.id}`}>
          <Button size="small">{r.status === "DRAFT" || r.status === "REJECTED" ? t("ดู / แก้ไข") : t("ดูรายละเอียด")}</Button>
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
      <PageHeader
        eyebrow="FINANCE · PAYABLES"
        icon={<FileTextOutlined />}
        title={t("ใบสำคัญจ่าย")}
        subtitle={t("รายการที่ยืนยันแล้วพร้อมออกใบสำคัญจ่าย และใบสำคัญจ่ายที่สร้างแล้ว")}
      />

      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("คิวรอ")}</span>
          <span className={styles.statValue}>{(queue.data?.data.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("สร้างแล้ว")}</span>
          <span className={styles.statValue}>{(created.data?.data.total ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รอสร้างใบสำคัญจ่าย")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{(queue.data?.data.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่เอกสารอ้างอิง / ชื่อผู้ขาย")}
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                onPressEnter={applyQueue}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("ประเภทเอกสาร")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={qSource} onChange={setQSource} options={SOURCE_OPTIONS} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={clearQueue}>{t("เคลียร์")}</Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={applyQueue}>
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
          loading={queue.isLoading}
          columns={queueColumns}
          dataSource={queue.data?.data.items ?? []}
          pagination={{
            current: qPage,
            pageSize: QUEUE_PAGE_SIZE,
            total: queue.data?.data.total ?? 0,
            onChange: setQPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: t("ไม่มีรายการรอสร้างใบสำคัญจ่าย") }}
        />
      </div>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("ใบสำคัญจ่ายที่สร้างแล้ว")}</h3>
          </div>
          <span className={masterStyles.tableCount}>{(created.data?.data.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}</span>
        </div>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ PV / เลขที่เอกสารอ้างอิง / ชื่อผู้ขาย")}
                value={cSearch}
                onChange={(e) => setCSearch(e.target.value)}
                onPressEnter={applyCreated}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("ประเภทเอกสารต้นทาง")}</label>
              <Select allowClear placeholder={t("ทั้งหมด")} value={cSource} onChange={setCSource} options={SOURCE_OPTIONS} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ PV")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={cStatus}
                onChange={setCStatus}
                options={Object.entries(VOUCHER_STATUS_LABEL).map(([value, label]) => ({ value, label: tFin(label) }))}
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
          dataSource={created.data?.data.items ?? []}
          pagination={{
            current: cPage,
            pageSize: CREATED_PAGE_SIZE,
            total: created.data?.data.total ?? 0,
            onChange: setCPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: t("ยังไม่มีใบสำคัญจ่าย") }}
        />
      </div>
    </section>
  );
}
