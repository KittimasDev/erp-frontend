"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Checkbox, Input, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import pageStyles from "@/components/ar-receipts/ar-awaiting-orders-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useArAwaitingOrdersQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { arReceiptRoutes, arRoutes } from "@/lib/sales/ar-routes";
import {
  AWAITING_PAY_STATUS_COLOR,
  AWAITING_PAY_STATUS_LABEL,
  type AwaitingOrder,
} from "@/types/ar-receipts";

const SCREEN = "FINANCE_RECEIVABLE_CUSTOMERS";
const PAGE_SIZE = 20;

/** ปุ่มต่อแถว: ล่วงหน้า/มัดจำบางส่วน → หน้ารับชำระเงิน · เมื่อรับสินค้า/เครดิต → หน้าใบตั้งลูกหนี้ */
export function awaitingOrderHref(row: AwaitingOrder): string {
  if (row.targetPage === "RECEIPT") {
    const params = new URLSearchParams({ customerId: row.customerId, salesOrderId: row.salesOrderId });
    // ยังไม่ตั้ง AR (รอมัดจำ / ยังไม่ตั้ง AR) = รับเป็นเงินมัดจำล่วงหน้า · ตั้ง AR แล้ว = รับชำระตัดยอด AR
    if (row.payStatus === "AWAITING_DEPOSIT" || row.payStatus === "NOT_BILLED") params.set("deposit", "1");
    return `${arReceiptRoutes.create}?${params.toString()}`;
  }
  return row.arTarget === "PENDING" ? arRoutes.pending : `${arRoutes.list}?keyword=${encodeURIComponent(row.soNo)}`;
}

export default function ArAwaitingOrdersPage() {
  const t = useT();
  const perms = useScreenActionPermissions(SCREEN);
  const receiptPerms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const arPerms = useScreenActionPermissions("FINANCE_AR_INVOICES");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [termGroup, setTermGroup] = useState<"PREPAY" | "ON_DELIVERY_OR_CREDIT" | undefined>();
  const [payStatus, setPayStatus] = useState<string | undefined>();
  const [deliveryStatus, setDeliveryStatus] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);

  const query = useArAwaitingOrdersQuery({
    page,
    limit: PAGE_SIZE,
    keyword: keyword || undefined,
    termGroup,
    payStatus,
    deliveryStatus,
    overdueOnly: overdueOnly || undefined,
  });

  if (!perms.canView) return <AccessDenied screenCodes={[SCREEN]} />;

  const summary = query.data?.summary;

  const columns: ColumnsType<AwaitingOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      dataIndex: "salesOrderId",
      width: 84,
      align: "center",
      fixed: "left",
      render: (_v, _r, index) => (
        <span className={pageStyles.index}>{(page - 1) * PAGE_SIZE + index + 1}</span>
      ),
    },
    {
      title: t("เลขที่ SO"),
      dataIndex: "soNo",
      width: 150,
      render: (v: string, r) => (
        <Link href={`/sales-orders/${r.salesOrderId}`}>
          <strong>{v}</strong>
        </Link>
      ),
    },
    { title: t("วันที่ SO"), dataIndex: "soDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ลูกค้า"),
      key: "customer",
      render: (_v, r) => (
        <span>
          <Typography.Text type="secondary">{r.customerCode}</Typography.Text> {r.customerName}
        </span>
      ),
    },
    {
      title: t("เงื่อนไขชำระ"),
      key: "term",
      width: 150,
      render: (_v, r) => r.termName ?? t("ไม่ระบุ (ถือเป็นเครดิต)"),
    },
    {
      title: t("สถานะส่งของ"),
      dataIndex: "deliveryStatus",
      width: 120,
      render: (v?: string) => (v ? t(DELIVERY_LABEL[v] ?? v) : "—"),
    },
    { title: t("ยอดรวม"), dataIndex: "totalAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("รับแล้ว"), dataIndex: "receivedAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    {
      title: t("คงค้าง"),
      dataIndex: "outstandingAmount",
      align: "right",
      render: (v: string) => <strong>{money.format(Number(v))}</strong>,
    },
    {
      title: t("ครบกำหนด"),
      dataIndex: "paymentDueDate",
      width: 130,
      render: (v: string | undefined, r) =>
        v ? (
          <span>
            {formatThaiDate(v)} {r.isOverdue ? <Tag color="red">{t("เกินกำหนด")}</Tag> : null}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "payStatus",
      width: 130,
      render: (v: string) => <Tag color={AWAITING_PAY_STATUS_COLOR[v] ?? "default"}>{t(AWAITING_PAY_STATUS_LABEL[v] ?? v)}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => {
        const allowed = r.targetPage === "RECEIPT" ? receiptPerms.canAdd : arPerms.canView;
        if (!allowed) return null;
        return (
          <Link href={awaitingOrderHref(r)}>
            <Button size="small" type={r.targetPage === "RECEIPT" ? "primary" : "default"}>
              {r.targetPage === "RECEIPT" ? t("รับชำระเงิน") : t("ไปใบตั้งลูกหนี้")}
            </Button>
          </Link>
        );
      },
    },
  ];

  const apply = () => {
    setKeyword(search.trim());
    setPage(1);
  };

  return (
    <section className={styles.page} style={{ gap: 24 }}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={t("รายการรับเงิน")}
        subtitle={t("ใบสั่งขาย (SO) ที่ยังใช้งานและยอดยังไม่ครบ — รอรับเงินจากลูกค้า")}
      />
      <div className={`${styles.statRow} ${styles.statRow2}`}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("SO ที่รอรับเงิน")}</span>
          <span className={styles.statValue}>{(summary?.count ?? 0).toLocaleString("th-TH")}</span>
          <span className={styles.statHint}>{t("รายการ")}</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>{t("ยอดคงค้างรวม")}</span>
          <span className={styles.statValue}>{money.format(Number(summary?.outstandingTotal ?? 0))}</span>
          <span className={styles.statHint}>{t("บาท")}</span>
        </div>
      </div>
      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("ใบสั่งขายที่รอรับเงิน")}</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {(query.data?.total ?? 0).toLocaleString("th-TH")} {t("รายการ")}
          </span>
        </div>
        <div className={pageStyles.panelBody}>
        <section className={styles.filterCard} style={{ boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ SO / ลูกค้า")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={apply}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("เงื่อนไขชำระ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={termGroup}
                onChange={(v) => {
                  setTermGroup(v);
                  setPage(1);
                }}
                options={[
                  { value: "PREPAY", label: t("ชำระล่วงหน้า / มัดจำบางส่วน") },
                  { value: "ON_DELIVERY_OR_CREDIT", label: t("ชำระเมื่อรับสินค้า / เครดิต") },
                ]}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={payStatus}
                onChange={(v) => {
                  setPayStatus(v);
                  setPage(1);
                }}
                options={Object.entries(AWAITING_PAY_STATUS_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะส่งของ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={deliveryStatus}
                onChange={(v) => {
                  setDeliveryStatus(v);
                  setPage(1);
                }}
                options={Object.entries(DELIVERY_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
              />
            </div>
            <div className={styles.filterItem}>
              <label>&nbsp;</label>
              <Checkbox
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked);
                  setPage(1);
                }}
              >
                {t("เฉพาะเกินกำหนด")}
              </Checkbox>
            </div>
            <div className={styles.filterActions}>
              <Button
                onClick={() => {
                  setSearch("");
                  setKeyword("");
                  setTermGroup(undefined);
                  setPayStatus(undefined);
                  setDeliveryStatus(undefined);
                  setOverdueOnly(false);
                  setPage(1);
                }}
              >
                {t("เคลียร์")}
              </Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={apply}>
                {t("ค้นหา")}
              </Button>
            </div>
          </div>
        </section>
        <Table
          className={`${masterStyles.dataTable} ${pageStyles.table}`}
          size="middle"
          bordered={false}
          rowKey="salesOrderId"
          loading={query.isLoading}
          columns={columns}
          dataSource={query.data?.items ?? []}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: query.data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: t("ไม่มีใบสั่งขายที่รอรับเงิน") }}
        />
        </div>
      </div>
    </section>
  );
}

const DELIVERY_LABEL: Record<string, string> = {
  NOT_STARTED: "ยังไม่ได้ส่งของ",
  PARTIALLY_DELIVERED: "ส่งบางส่วน",
  DELIVERED: "ส่งครบ",
};
