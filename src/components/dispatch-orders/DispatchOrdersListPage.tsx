"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CarOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useDispatchOrdersQuery } from "@/hooks/dispatch-orders/useDispatchOrdersQuery";
import type { DispatchOrder } from "@/types/dispatch-orders";
import {
  DISPATCH_ORDER_STATUS_LABEL,
  type DispatchOrderStatus,
} from "@/types/dispatch-orders";
import styles from "./DispatchOrdersListPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { statusT } from "@/lib/i18n/fulfillmentStatus";

function statusColor(status: string) {
  switch (status) {
    case "DISPATCHED":
      return "success";
    case "PACKED":
    case "PICKED":
      return "processing";
    case "CANCELLED":
      return "default";
    default:
      return "warning";
  }
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function DispatchOrdersListPage() {
  const t = useT();
  const router = useRouter();
  const [dispatchNo, setDispatchNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [applied, setApplied] = useState<{
    dispatchNo?: string;
    status?: string;
  }>({});

  const query = useDispatchOrdersQuery(applied);
  const rows = query.data?.data ?? [];

  const applyFilters = () => {
    setApplied({
      dispatchNo: dispatchNo.trim() || undefined,
      status,
    });
  };

  const clearFilters = () => {
    setDispatchNo("");
    setStatus(undefined);
    setApplied({});
  };

  const columns: ColumnsType<DispatchOrder> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        width: 56,
        align: "center",
        render: (_v, _r, index) => index + 1,
      },
      {
        title: t("เลขที่"),
        dataIndex: "dispatchNo",
        render: (value: string) => <span className={styles.prNo}>{value}</span>,
      },
      {
        title: t("วันที่"),
        dataIndex: "dispatchDate",
        width: 110,
        render: (value: string) => formatDate(value),
      },
      {
        title: t("ใบสั่งขาย"),
        key: "salesOrder",
        render: (_v, row) => row.salesOrderNo ?? "—",
      },
      {
        title: t("คลัง"),
        key: "warehouse",
        render: (_v, row) => row.warehouseCode ?? "—",
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        width: 150,
        render: (value: string) => (
          <Tag color={statusColor(value)}>
            {statusT(t, DISPATCH_ORDER_STATUS_LABEL[value as DispatchOrderStatus] ?? value)}
          </Tag>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 60,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/dispatch-orders/${row.id}`)}
            />
          </Space>
        ),
      },
    ],
    [router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Dispatch Order"
        icon={<CarOutlined />}
        title={t("ใบจ่ายสินค้า")}
        subtitle={t("ติดตามขั้นตอน Picking → Packing → Dispatch ของสินค้าสำเร็จรูป")}
      />

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("เลขที่")}</label>
            <Input
              allowClear
              placeholder="DO-..."
              value={dispatchNo}
              onChange={(e) => setDispatchNo(e.target.value)}
              onPressEnter={applyFilters}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={status}
              onChange={setStatus}
              style={{ width: "100%" }}
              options={Object.entries(DISPATCH_ORDER_STATUS_LABEL).map(
                ([value, label]) => ({ value, label: statusT(t, label) }),
              )}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>{t("เคลียร์")}</Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={applyFilters}
          >
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            {t("พบทั้งหมด")} <strong>{rows.length}</strong> {t("รายการ")}
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
            onClick: () => router.push(`/dispatch-orders/${row.id}`),
          })}
          locale={{ emptyText: t("ยังไม่มีใบจ่ายสินค้า") }}
        />
      </section>
    </div>
  );
}
