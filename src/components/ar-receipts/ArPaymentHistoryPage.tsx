"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, DatePicker, Input, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useArPaymentHistoryQuery } from "@/hooks/ar-receipts/useArReceipts";
import { useT } from "@/lib/i18n/useT";
import { arReceiptRoutes, arRoutes } from "@/lib/sales/ar-routes";
import {
  AR_PAYMENT_METHOD_LABEL,
  AR_RECEIPT_STATUS_COLOR,
  AR_RECEIPT_STATUS_LABEL,
  type PaymentHistoryRow,
} from "@/types/ar-receipts";

const SCREEN_CODE = "FINANCE_RECEIVABLE_PAYMENT_HISTORY";
const PAGE_SIZE = 20;

/** ประวัติการรับชำระ — หนึ่งแถวต่อการตัด AR หนึ่งใบ */
export default function ArPaymentHistoryPage() {
  const t = useT();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const query = useArPaymentHistoryQuery({
    page,
    limit: PAGE_SIZE,
    keyword,
    dateFrom: range?.[0]?.format("YYYY-MM-DD"),
    dateTo: range?.[1]?.format("YYYY-MM-DD"),
  });

  if (!perms.canView) return <AccessDenied screenCodes={[SCREEN_CODE]} />;

  const columns: ColumnsType<PaymentHistoryRow> = [
    { title: t("ลำดับ"), key: "seq", width: 72, align: "center" as const, render: (_v: unknown, _r: unknown, index: number) => (page - 1) * PAGE_SIZE + index + 1 },
    { title: t("วันที่"), dataIndex: "receiptDate", width: 110, render: (v: string) => formatThaiDate(v) },
    {
      title: t("ใบรับชำระ"),
      dataIndex: "receiptNo",
      width: 150,
      render: (v: string, r) => <Link href={arReceiptRoutes.detail(r.receiptId)}>{v}</Link>,
    },
    { title: t("ลูกค้า"), dataIndex: "customerName", render: (v?: string) => v ?? "—" },
    { title: t("เลขที่ AR"), dataIndex: "invoiceNo", render: (v: string, r) => <Link href={arRoutes.detail(r.salesInvoiceId)}>{v}</Link> },
    { title: t("วิธีรับชำระ"), dataIndex: "paymentMethod", width: 110, render: (v: string) => t(AR_PAYMENT_METHOD_LABEL[v] ?? v) },
    { title: t("เลขอ้างอิง"), dataIndex: "transactionRef", render: (v?: string | null) => v ?? "—" },
    { title: t("เงินสดที่ตัด"), dataIndex: "amount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("ภาษีที่ลูกค้าหัก"), dataIndex: "whtAmount", align: "right", render: (v: string) => money.format(Number(v)) },
    { title: t("สถานะ"), dataIndex: "status", width: 110, render: (v: string) => <Tag color={AR_RECEIPT_STATUS_COLOR[v] ?? "default"}>{t(AR_RECEIPT_STATUS_LABEL[v] ?? v)}</Tag> },
  ];

  const apply = () => {
    setKeyword(search.trim());
    setPage(1);
  };

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={t("ประวัติการรับชำระ")}
        subtitle={t("ทุกการตัดยอดใบตั้งลูกหนี้จากใบรับชำระ (รวมที่ยกเลิกแล้ว)")}
      />
      <div className={masterStyles.tableCard}>
        <section className={styles.filterCard} style={{ marginBottom: 12, boxShadow: "none" }}>
          <div className={styles.filterRow}>
            <div className={`${styles.filterItem} ${styles.filterItemWide}`}>
              <label>{t("ค้นหา")}</label>
              <Input allowClear placeholder={t("เลขที่ใบรับชำระ / AR / ลูกค้า")} value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={apply} />
            </div>
            <div className={styles.filterItem}>
              <label>{t("วันที่")}</label>
              <DatePicker.RangePicker style={{ width: "100%" }} format="DD/MM/BBBB" value={range} onChange={(v) => { setRange(v); setPage(1); }} />
            </div>
            <div className={styles.filterActions}>
              <Button onClick={() => { setSearch(""); setKeyword(""); setRange(null); setPage(1); }}>{t("เคลียร์")}</Button>
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
          locale={{ emptyText: t("ยังไม่มีประวัติรับชำระ") }}
        />
      </div>
    </section>
  );
}
