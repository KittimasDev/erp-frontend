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
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { statusT } from "@/lib/i18n/fulfillmentStatus";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function DeliveryOrdersListPage() {
  const t = useT();
  const [page, setPage] = useState(1);
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
        title: t("ลำดับ"),
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * 10 + index + 1,
      },
      {
        title: t("เลขที่"),
        dataIndex: "deliveryOrderNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      { title: "SO", dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
      { title: t("ลูกค้า"), dataIndex: "customerName", render: (v?: string) => v ?? "—" },
      {
        title: t("วันที่ส่ง"),
        dataIndex: "deliveryDate",
        width: 110,
        render: formatDate,
      },
      { title: t("ขนส่ง"), dataIndex: "carrierName", render: (v?: string) => v ?? "—" },
      { title: t("ทะเบียน"), dataIndex: "vehiclePlate", render: (v?: string) => v ?? "—" },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        width: 120,
        render: (v: string) => (
          <Tag color={v === "DELIVERED" ? "success" : v === "CANCELLED" ? "default" : "processing"}>
            {statusT(t, DELIVERY_ORDER_STATUS_LABEL[v as DeliveryOrderStatus] ?? v)}
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
    [canEdit, router, t],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Delivery"
        icon={<CarOutlined />}
        title={t("ใบส่งสินค้า")}
        subtitle={t("จัดส่งหลังบรรจุแล้ว — ไม่ตัดสต๊อกซ้ำ")}
        actions={
          <>
{canAdd ? (
            <Link href="/delivery-orders/create-from-packing">
              <Badge count={readyCount} overflowCount={99} offset={[-4, 4]}>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<PlusOutlined />}
                >
                  {t("สร้างจาก Packing")}
                </Button>
              </Badge>
            </Link>
          ) : null}
          </>
        }
      />

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("ค้นหา")}</label>
            <Input allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className={styles.filterItem}>
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.entries(DELIVERY_ORDER_STATUS_LABEL).map(([value, label]) => ({
                value,
                label: statusT(t, label),
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("ลูกค้า")}</label>
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
            {t("เคลียร์")}
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
            {t("ค้นหา")}
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ current: page, pageSize: 10, onChange: setPage, showSizeChanger: false }}
          onRow={(row) => ({ onClick: () => router.push(`/delivery-orders/${row.id}`) })}
          locale={{ emptyText: t("ยังไม่มีใบส่งสินค้า") }}
        />
      </section>
    </div>
  );
}
