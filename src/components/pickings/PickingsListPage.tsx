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
  ShoppingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  usePickingsQuery,
  useReadySalesOrdersForPickingCountQuery,
} from "@/hooks/pickings/usePickingsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { Picking } from "@/types/pickings";
import {
  PICKING_STATUS_LABEL,
  type PickingStatus,
} from "@/types/pickings";
import styles from "./PickingsListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function PickingsListPage() {
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [date, setDate] = useState<dayjs.Dayjs | null>(null);
  const [applied, setApplied] = useState<{
    keyword?: string;
    status?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const pickingActions = useScreenActionPermissions("PICKINGS");
  const canAdd = pickingActions.canAdd;
  const canEdit = pickingActions.canEdit;

  const customersQuery = useCustomersQuery();
  const query = usePickingsQuery(applied);
  const readyCountQuery = useReadySalesOrdersForPickingCountQuery();
  const rows = query.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const readyCount = readyCountQuery.data ?? 0;

  const columns: ColumnsType<Picking> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * 10 + index + 1,
      },
      {
        title: "เลขที่",
        dataIndex: "pickingNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      {
        title: "ใบสั่งขาย",
        dataIndex: "salesOrderNo",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "ลูกค้า",
        dataIndex: "customerName",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "วันที่",
        dataIndex: "pickingDate",
        width: 110,
        render: formatDate,
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 120,
        render: (v: string) => (
          <Tag
            color={
              v === "CONFIRMED" ? "success" : v === "CANCELLED" ? "default" : "processing"
            }
          >
            {PICKING_STATUS_LABEL[v as PickingStatus] ?? v}
          </Tag>
        ),
      },
      {
        title: "สร้างโดย",
        dataIndex: "createdByName",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "ยืนยันเมื่อ",
        dataIndex: "confirmedAt",
        width: 140,
        render: (v?: string) =>
          v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—",
      },
      {
        title: "",
        key: "actions",
        width: 100,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/pickings/${row.id}`)}
            />
            {canEdit && row.status === "DRAFT" ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => router.push(`/pickings/${row.id}/edit`)}
              />
            ) : null}
          </Space>
        ),
      },
    ],
    [canEdit, router],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales · Picking"
        icon={<ShoppingOutlined />}
        title="ใบจ่ายสินค้า"
        subtitle="หยิบสินค้าจากคลังตามใบสั่งขายที่ตรวจสต๊อกแล้ว — ตัดสต๊อกตอนยืนยันเท่านั้น"
        actions={
          <>
{canAdd ? (
            <Link href="/pickings/create-from-sales-order">
              <Badge count={readyCount} overflowCount={99} offset={[-4, 4]}>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<PlusOutlined />}
                >
                  สร้างจาก SO
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
            <label>ค้นหา</label>
            <Input
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="เลขที่ / ลูกค้า"
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.entries(PICKING_STATUS_LABEL).map(([value, label]) => ({
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
          <div className={styles.filterItem}>
            <label>วันที่</label>
            <DatePicker
              value={date}
              onChange={setDate}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setKeyword("");
              setStatus(undefined);
              setCustomerId(undefined);
              setDate(null);
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
                dateFrom: date ? date.format("YYYY-MM-DD") : undefined,
                dateTo: date ? date.format("YYYY-MM-DD") : undefined,
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
          pagination={{ current: page, pageSize: 10, onChange: setPage, showSizeChanger: false }}
          onRow={(row) => ({
            onClick: () => router.push(`/pickings/${row.id}`),
          })}
          locale={{ emptyText: "ยังไม่มีใบจ่ายสินค้า" }}
        />
      </section>
    </div>
  );
}
