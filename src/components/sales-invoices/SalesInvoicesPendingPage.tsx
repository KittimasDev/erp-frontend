"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Pagination, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FileAddOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePendingSalesInvoicesQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { PendingSalesInvoiceDelivery } from "@/types/sales-invoices";
import { useT } from "@/lib/i18n/useT";
import styles from "./SalesInvoicesPendingPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SalesInvoicesPendingPage() {
  const t = useT();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const invoiceActions = useScreenActionPermissions("SALES_INVOICES");
  const pendingActions = useScreenActionPermissions("SALES_INVOICES_PENDING");
  const canWrite = invoiceActions.canAdd || pendingActions.canEdit;

  const query = usePendingSalesInvoicesQuery({ page, limit });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const filteredRows = useMemo(() => {
    const q = appliedKeyword.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.deliveryOrderNo.toLowerCase().includes(q) ||
        row.salesOrderNo?.toLowerCase().includes(q) ||
        row.customerName?.toLowerCase().includes(q),
    );
  }, [appliedKeyword, rows]);

  const columns: ColumnsType<PendingSalesInvoiceDelivery> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        width: 56,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: t("เลขที่ DO"),
        dataIndex: "deliveryOrderNo",
        render: (value: string) => (
          <span className={styles.poNo}>{value}</span>
        ),
      },
      {
        title: t("วันที่ส่ง"),
        dataIndex: "deliveryDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ใบสั่งขาย"),
        dataIndex: "salesOrderNo",
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("ลูกค้า"),
        dataIndex: "customerName",
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("รายการ"),
        dataIndex: "itemCount",
        width: 80,
        align: "center",
      },
      {
        title: t("ยอด SO"),
        dataIndex: "salesOrderTotalAmount",
        align: "right",
        render: (value?: string) => formatMoney(value),
      },
      {
        title: "",
        key: "actions",
        width: 140,
        render: (_v, row) =>
          canWrite ? (
            <Button
              type="primary"
              size="small"
              icon={<FileAddOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/sales-invoices/create-from-delivery/${row.id}`,
                );
              }}
            >
              {t("ออกบิล")}
            </Button>
          ) : (
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/delivery-orders/${row.id}`);
              }}
            >
              {t("ดู DO")}
            </Button>
          ),
      },
    ],
    [canWrite, limit, page, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Pending Invoices"
        icon={<FileTextOutlined />}
        title={t("รอออกใบแจ้งหนี้")}
        subtitle={t("Delivery Order สถานะส่งมอบแล้ว ที่ยังไม่มีใบแจ้งหนี้ใช้งาน")}
        actions={
          <>
<Link href="/sales-invoices">
            <Button icon={<HistoryOutlined />}>{t("ประวัติใบแจ้งหนี้")}</Button>
          </Link>
          </>
        }
      />

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ค้นหา")}</label>
            <Input
              allowClear
              placeholder={t("DO / SO / ลูกค้า")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => setAppliedKeyword(keyword.trim())}
            />
          </div>
          <div className={styles.filterActions}>
            <Button
              onClick={() => {
                setKeyword("");
                setAppliedKeyword("");
              }}
            >
              {t("เคลียร์")}
            </Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => setAppliedKeyword(keyword.trim())}
            >
              {t("ค้นหา")}
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={filteredRows}
          pagination={false}
          onRow={(row) => ({
            onClick: () => router.push(`/delivery-orders/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>{t("ไม่มี DO รอออกบิล")}</strong>
                {t("เมื่อส่งมอบสินค้าแล้ว รายการจะแสดงที่นี่")}
              </div>
            ),
          }}
        />
        <div className={styles.tableFooter}>
          <div className={styles.footerText}>
            {t("พบ {total} รายการ · แสดงในหน้านี้ {shown}", { total, shown: filteredRows.length })}
          </div>
          <div className={styles.entriesBox}>
            <Select
              size="small"
              value={limit}
              style={{ width: 72 }}
              options={[
                { label: "10", value: 10 },
                { label: "25", value: 25 },
                { label: "50", value: 50 },
              ]}
              onChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
            <Pagination
              size="small"
              current={page}
              total={total}
              pageSize={limit}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
