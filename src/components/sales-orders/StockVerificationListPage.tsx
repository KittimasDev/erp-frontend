"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { usePendingStockVerificationQuery } from "@/hooks/sales-orders/useSalesOrdersQuery";
import type { StockVerificationPendingOrder } from "@/types/sales-orders";
import styles from "./StockVerificationListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function StockVerificationListPage() {
  const router = useRouter();
  const query = usePendingStockVerificationQuery();
  const rows = query.data?.data ?? [];

  const columns: ColumnsType<StockVerificationPendingOrder> = useMemo(
    () => [
      {
        title: "ลำดับ",
        width: 56,
        align: "center",
        render: (_v, _r, index) => index + 1,
      },
      {
        title: "เลขที่ SO",
        dataIndex: "soNo",
        render: (value: string) => <span className={styles.prNo}>{value}</span>,
      },
      {
        title: "ลูกค้า",
        key: "customer",
        render: (_v, row) =>
          row.customerCode
            ? `${row.customerCode} — ${row.customerName ?? ""}`
            : (row.customerName ?? "—"),
      },
      {
        title: "วันที่ SO",
        dataIndex: "soDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: "วันที่ต้องการส่ง",
        dataIndex: "requestedDeliveryDate",
        width: 130,
        render: (value?: string) => formatDate(value),
      },
      {
        title: "รายการสินค้า",
        dataIndex: "itemCount",
        width: 110,
        align: "center",
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 120,
        render: (value: string) => <Tag color="processing">{value}</Tag>,
      },
      {
        title: "",
        key: "actions",
        width: 160,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                router.push(`/sales-orders/${row.id}/stock-verification`)
              }
            />
            <Button
              size="small"
              type="primary"
              className={styles.primaryBtn}
              icon={<CheckCircleOutlined />}
              onClick={() =>
                router.push(`/sales-orders/${row.id}/stock-verification`)
              }
            >
              ตรวจสอบสต๊อก
            </Button>
          </Space>
        ),
      },
    ],
    [router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SearchOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Stock Verification</p>
          <h1 className={styles.pageTitle}>ตรวจสอบสต๊อกขาย</h1>
          <p className={styles.pageSubtitle}>
            ใบสั่งขายที่ยืนยันแล้วและรอตรวจยอดพร้อมขาย — ยังไม่ตัดสต๊อก
          </p>
        </div>
      </header>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            รอตรวจสอบ <strong>{rows.length}</strong> รายการ
          </div>
        </div>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          className={styles.table}
          onRow={(row) => ({
            onClick: () =>
              router.push(`/sales-orders/${row.id}/stock-verification`),
          })}
          locale={{ emptyText: "ไม่มีใบสั่งขายที่รอตรวจสอบสต๊อก" }}
        />
      </section>
    </div>
  );
}
