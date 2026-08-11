"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, DatePicker, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  CarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useDeliveryOrdersQuery,
  useReadyPackingsForDeliveryQuery,
} from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { DeliveryOrder } from "@/types/delivery-orders";
import {
  DELIVERY_ORDER_STATUS_LABEL,
  type DeliveryOrderStatus,
} from "@/types/delivery-orders";
import styles from "./DeliveryOrdersListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function DeliveryOrdersListPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [applied, setApplied] = useState<{
    keyword?: string;
    status?: string;
    customerId?: string;
  }>({});

  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const canAdd = deliveryActions.canAdd;
  const canEdit = deliveryActions.canEdit;

  const customersQuery = useCustomersQuery();
  const query = useDeliveryOrdersQuery(applied);
  const readyPackingsQuery = useReadyPackingsForDeliveryQuery();
  const rows = query.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const readyCount = readyPackingsQuery.data?.data?.length ?? 0;

  const columns: ColumnsType<DeliveryOrder> = useMemo(
    () => [
      {
        title: "เลขที่",
        dataIndex: "deliveryOrderNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      { title: "SO", dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
      { title: "ลูกค้า", dataIndex: "customerName", render: (v?: string) => v ?? "—" },
      {
        title: "วันที่ส่ง",
        dataIndex: "deliveryDate",
        width: 110,
        render: formatDate,
      },
      { title: "ขนส่ง", dataIndex: "carrierName", render: (v?: string) => v ?? "—" },
      { title: "ทะเบียน", dataIndex: "vehiclePlate", render: (v?: string) => v ?? "—" },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 120,
        render: (v: string) => (
          <Tag color={v === "DELIVERED" ? "success" : v === "CANCELLED" ? "default" : "processing"}>
            {DELIVERY_ORDER_STATUS_LABEL[v as DeliveryOrderStatus] ?? v}
          </Tag>
        ),
      },
      {
        title: "",
        key: "actions",
        width: 100,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => router.push(`/delivery-orders/${row.id}`)} />
            {canEdit && (row.status === "DRAFT" || row.status === "CONFIRMED") ? (
              <Button size="small" icon={<EditOutlined />} onClick={() => router.push(`/delivery-orders/${row.id}/edit`)} />
            ) : null}
          </Space>
        ),
      },
    ],
    [canEdit, router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <CarOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Delivery</p>
          <h1 className={styles.pageTitle}>ใบส่งสินค้า</h1>
          <p className={styles.pageSubtitle}>จัดส่งหลังบรรจุแล้ว — ไม่ตัดสต๊อกซ้ำ</p>
        </div>
        <div className={styles.headerActions}>
          {canAdd ? (
            <Link href="/delivery-orders/create-from-packing">
              <Badge count={readyCount} overflowCount={99} offset={[-4, 4]}>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<PlusOutlined />}
                >
                  สร้างจาก Packing
                </Button>
              </Badge>
            </Link>
          ) : null}
        </div>
      </header>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ค้นหา</label>
            <Input allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.entries(DELIVERY_ORDER_STATUS_LABEL).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>ลูกค้า</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              value={customerId}
              onChange={setCustomerId}
              options={customers.map((c) => ({
                value: c.id,
                label: `${c.customerCode} — ${c.nameTh}`,
              }))}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setKeyword("");
              setStatus(undefined);
              setCustomerId(undefined);
              setApplied({});
            }}
          >
            เคลียร์
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() =>
              setApplied({
                keyword: keyword.trim() || undefined,
                status,
                customerId,
              })
            }
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(row) => ({ onClick: () => router.push(`/delivery-orders/${row.id}`) })}
          locale={{ emptyText: "ยังไม่มีใบส่งสินค้า" }}
        />
      </section>
    </div>
  );
}
