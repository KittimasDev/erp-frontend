"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Progress, Select, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useLinkedSalesOrdersQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import {
  PRODUCTION_REQUEST_STATUS_LABEL,
  ProductionRequestStatus,
  type LinkedSalesOrder,
} from "@/types/production-request";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import masterStyles from "@/components/masters/shared/master-page.module.css";

const PR_STATUS_COLOR: Record<string, string> = {
  PENDING: "default",
  IN_PRODUCTION: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

export default function SalesOrdersInProductionPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      status,
      page,
      limit: 20,
    }),
    [q, status, page],
  );
  const listQuery = useLinkedSalesOrdersQuery(queryParams);
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;

  const columns: ColumnsType<LinkedSalesOrder> = [
    {
      title: "ลูกค้า",
      dataIndex: "customerName",
      key: "customerName",
      render: (value?: string) => value || "-",
    },
    {
      title: "เลขที่ใบสั่งขาย",
      dataIndex: "soNo",
      key: "soNo",
      render: (value: string, row) => (
        <button
          type="button"
          className={masterStyles.codeBadge}
          style={{ border: 0, cursor: "pointer" }}
          onClick={() => router.push(`/sales-orders/${row.salesOrderId}`)}
        >
          {value}
        </button>
      ),
    },
    {
      title: "สถานะ SO",
      dataIndex: "soStatus",
      key: "soStatus",
      render: (value: string) =>
        SALES_ORDER_STATUS_LABEL[value as SalesOrderStatus] ?? value,
    },
    {
      title: "ต้องการภายใน",
      dataIndex: "requestedDeliveryDate",
      key: "requestedDeliveryDate",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "ใบขอผลิต",
      key: "productionRequests",
      render: (_, row) => (
        <div style={{ display: "grid", gap: 6 }}>
          {row.productionRequests.map((request) => (
            <span
              key={request.id}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <button
                type="button"
                className={masterStyles.codeBadge}
                style={{ border: 0, cursor: "pointer" }}
                onClick={() =>
                  router.push(`/production/production-requests/${request.id}`)
                }
              >
                {request.requestNo}
              </button>
              <Tag color={PR_STATUS_COLOR[request.status] ?? "default"}>
                {PRODUCTION_REQUEST_STATUS_LABEL[request.status] ??
                  request.status}
              </Tag>
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "ผลิตได้แล้ว",
      key: "producedPercent",
      width: 200,
      render: (_, row) => (
        <div style={{ display: "grid", gap: 8 }}>
          {row.productionRequests.map((request) => (
            <Progress
              key={request.id}
              percent={request.producedPercent}
              size="small"
              status={request.producedPercent >= 100 ? "success" : "active"}
              format={(value) => `${value ?? 0}%`}
            />
          ))}
        </div>
      ),
    },
    {
      title: "",
      key: "allocate",
      width: 140,
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          onClick={() => router.push(`/sales-orders/${row.salesOrderId}`)}
        >
          จัดของลง SO
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>SO</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>SALES · รอจัดของลงใบสั่งขาย</div>
            <h2 className={masterStyles.pageTitle}>ใบสั่งขายที่ส่งผลิต</h2>
            <span className={masterStyles.pageSubtitle}>
              เฉพาะใบสั่งขายสถานะร่าง ที่ยังไม่ได้จองสินค้า — ให้หัวหน้าเลือกของในคลัง
              ลง SO ที่ต้องการก่อนยืนยัน
            </span>
          </div>
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ค้นหา</div>
              <h3>รายการใบสั่งขายร่าง</h3>
              <p>ทั้งหมด {total} ใบ</p>
            </div>
          </div>
          <div className={masterStyles.filterForm}>
            <div className={masterStyles.formGrid}>
              <Input
                allowClear
                aria-label="ค้นหาเลขที่ใบสั่งขาย ลูกค้า หรือใบขอผลิต"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ SO / ลูกค้า / ใบขอผลิต"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                aria-label="กรองตามสถานะใบขอผลิต"
                placeholder="สถานะใบขอผลิตทั้งหมด"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={[
                  ProductionRequestStatus.PENDING,
                  ProductionRequestStatus.COMPLETED,
                ].map((value) => ({
                  value,
                  label: PRODUCTION_REQUEST_STATUS_LABEL[value] ?? value,
                }))}
              />
            </div>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>รายการ</div>
              <h3>ใบสั่งขายร่างที่รอจัดของ</h3>
            </div>
            <span className={masterStyles.tableCount}>{total} ใบ</span>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="salesOrderId"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: setPage,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
