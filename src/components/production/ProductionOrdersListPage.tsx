"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Table, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useProductionOrdersQuery } from "@/hooks/production-orders/useProductionOrderQueries";
import type { ProductionOrder } from "@/types/production-order";
import { PRODUCTION_ORDER_STATUS_LABEL } from "@/types/production-order";
import masterStyles from "@/components/masters/shared/master-page.module.css";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  IN_PROGRESS: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

export default function ProductionOrdersListPage() {
  const router = useRouter();

  const [orderNo, setOrderNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      orderNo: orderNo.trim() || undefined,
      status,
      page,
      limit: 20,
    }),
    [orderNo, status, page],
  );

  const listQuery = useProductionOrdersQuery(queryParams);
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;

  const columns: ColumnsType<ProductionOrder> = [
    {
      title: "เลขที่ใบสั่งผลิต",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (value: string, row) => (
        <button
          type="button"
          className={masterStyles.codeBadge}
          style={{ border: 0, cursor: "pointer" }}
          onClick={() => router.push(`/production/production-orders/${row.id}`)}
        >
          {value}
        </button>
      ),
    },
    {
      title: "Batch",
      dataIndex: "batchNo",
      key: "batchNo",
      render: (value?: string) => value || "-",
    },
    {
      title: "วันที่ผลิต",
      dataIndex: "productionDate",
      key: "productionDate",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Cycle เป้าหมาย (ชม.)",
      dataIndex: "cycleTargetHours",
      key: "cycleTargetHours",
      align: "right",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={STATUS_COLOR[value] ?? "default"}>
          {PRODUCTION_ORDER_STATUS_LABEL[value] ?? value}
        </Tag>
      ),
    },
    {
      title: "เริ่มผลิต",
      dataIndex: "startedAt",
      key: "startedAt",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
    },
    {
      title: "เสร็จสิ้น",
      dataIndex: "completedAt",
      key: "completedAt",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
    },
  ];

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>PO</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>PRODUCTION · PYROLYSIS</div>
            <h2 className={masterStyles.pageTitle}>ใบสั่งผลิต (Pyrolysis)</h2>
            <span className={masterStyles.pageSubtitle}>
              สร้าง / เริ่มผลิต / บันทึกผล / ขอรับผลผลิตเข้าคลัง
            </span>
          </div>
          <Button
            type="primary"
            className={masterStyles.createButton}
            icon={<PlusOutlined className={masterStyles.plusIcon} />}
            onClick={() => router.push("/production/production-orders/create")}
          >
            สร้างใบสั่งผลิต
          </Button>
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ค้นหา</div>
              <h3>รายการใบสั่งผลิต</h3>
              <p>ทั้งหมด {total} ใบ</p>
            </div>
          </div>
          <div className={masterStyles.filterForm}>
            <div className={masterStyles.formGrid}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ใบสั่งผลิต"
                value={orderNo}
                onChange={(e) => {
                  setOrderNo(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                placeholder="สถานะทั้งหมด"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={Object.entries(PRODUCTION_ORDER_STATUS_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </div>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>รายการ</div>
              <h3>ใบสั่งผลิต</h3>
            </div>
            <span className={masterStyles.tableCount}>{total} ใบ</span>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
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
