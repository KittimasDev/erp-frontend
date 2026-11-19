"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, DatePicker, Input, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useArReceiptsQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { ArReceiptRelatedDocsInline } from "./ArReceiptRelatedDocs";
import { arReceiptRoutes } from "@/lib/sales/ar-routes";
import {
  AR_PAYMENT_METHOD_LABEL,
  AR_RECEIPT_STATUS_COLOR,
  AR_RECEIPT_STATUS_LABEL,
  type ArReceipt,
} from "@/types/ar-receipts";

const PAGE_SIZE = 20;

type Props = {
  /** payment = หน้ารับชำระ (มีปุ่มบันทึกรับชำระ) · receipt = หน้าใบเสร็จรับเงิน (อ่านอย่างเดียว) */
  variant: "payment" | "receipt";
};

/** รายการใบรับชำระเงิน / ใบเสร็จรับเงิน ฝั่งขาย */
export default function ArReceiptsListPage({ variant }: Props) {
  const t = useT();
  const screen = variant === "payment" ? "FINANCE_PAYMENT_RECEIPTS" : "FINANCE_RECEIPTS";
  const perms = useScreenActionPermissions(screen);
  const addPerms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const query = useArReceiptsQuery({
    page,
    limit: PAGE_SIZE,
    keyword,
    status,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
  });

  if (!perms.canView) return <AccessDenied screenCodes={[screen]} />;

  const columns: ColumnsType<ArReceipt> = [
    {
      title: t("เลขที่"),
      dataIndex: "receiptNo",
      width: 150,
      render: (v: string, r) => <Link href={arReceiptRoutes.detail(r.id)}><strong>{v}</strong></Link>,
    },
    { title: t("วันที่"), dataIndex: "receiptDate", width: 110, render: (v: string) => formatThaiDate(v) },
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
      title: t("อ้างอิง SO / เอกสารที่เกี่ยวข้อง"),
      key: "related",
      width: 220,
      render: (_v, r) => <ArReceiptRelatedDocsInline receipt={r} />,
    },
    {
      title: t("วิธีรับชำระ"),
      dataIndex: "paymentMethod",
      width: 110,
      render: (v: string) => t(AR_PAYMENT_METHOD_LABEL[v] ?? v),
    },
    { title: t("เลขอ้างอิง"), dataIndex: "transactionRef", render: (v?: string | null) => v ?? "—" },
    { title: t("เงินที่รับ"), dataIndex: "receivedAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("ภาษีที่ลูกค้าหัก"), dataIndex: "whtAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("รับเกิน (เครดิต)"), dataIndex: "overpayAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 110,
      render: (v: string) => <Tag color={AR_RECEIPT_STATUS_COLOR[v] ?? "default"}>{t(AR_RECEIPT_STATUS_LABEL[v] ?? v)}</Tag>,
    },
    {
      title: "",
      key: "action",
      width: 120,
      render: (_v, r) => (
        <Link href={arReceiptRoutes.detail(r.id)}>
          <Button size="small">{t("ดูรายละเอียด")}</Button>
        </Link>
      ),
    },
  ];

  const apply = () => {
    setKeyword(search.trim());
    setPage(1);
  };

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={variant === "payment" ? t("รับชำระเงิน") : t("ใบเสร็จรับเงิน")}
        subtitle={
          variant === "payment"
            ? t("บันทึกรับเงินจากลูกค้า ตัดได้หลายใบตั้งลูกหนี้ในครั้งเดียว")
            : t("ใบเสร็จรับเงินที่ออกจากการรับชำระ (ดู/พิมพ์)")
        }
        actions={
          variant === "payment" && addPerms.canAdd ? (
            <Link href={arReceiptRoutes.create}>
              <Button type="primary">{t("บันทึกรับชำระ")}</Button>
            </Link>
          ) : null
        }
      />
      <div className={masterStyles.tableCard}>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input
                allowClear
                placeholder={t("เลขที่ / ลูกค้า / เลขอ้างอิง")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={apply}
              />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่")}</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/BBBB" value={range} onChange={(v) => { setRange(v); setPage(1); }} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("สถานะ")}</label>
              <Select
                allowClear
                placeholder={t("ทั้งหมด")}
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={Object.entries(AR_RECEIPT_STATUS_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
              />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={() => { setSearch(""); setKeyword(""); setStatus(undefined); setRange(null); setPage(1); }}>
                {t("เคลียร์")}
              </Button>
              <Button type="primary" className={styles.searchBtn} icon={<SearchOutlined />} onClick={apply}>
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
          scroll={{ x: 1100 }}
          locale={{ emptyText: t("ยังไม่มีใบรับชำระ") }}
        />
      </div>
    </section>
  );
}
