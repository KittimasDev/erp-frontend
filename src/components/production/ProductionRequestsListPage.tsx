"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Progress, Select, Table, Tag, Tooltip } from "antd";
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useProductionRequestsQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { ProductionRequest } from "@/types/production-request";
import { PRODUCTION_REQUEST_STATUS_LABEL } from "@/types/production-request";
import masterStyles from "@/components/masters/shared/master-page.module.css";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "default",
  IN_PRODUCTION: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

export default function ProductionRequestsListPage() {
  const router = useRouter();
  const canCreate =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.PRODUCTION_OFFICER) ||
    isAdministrator();

  const [requestNo, setRequestNo] = useState("");
  const [soNo, setSoNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      requestNo: requestNo.trim() || undefined,
      soNo: soNo.trim() || undefined,
      status,
      page,
      limit: 20,
    }),
    [requestNo, soNo, status, page],
  );

  const listQuery = useProductionRequestsQuery(queryParams);
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;

  const columns: ColumnsType<ProductionRequest> = [
    {
      title: "เลขที่ใบขอผลิต",
      dataIndex: "requestNo",
      key: "requestNo",
      render: (value: string, row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className={masterStyles.codeBadge}
            style={{ border: 0, cursor: "pointer" }}
            onClick={() =>
              router.push(`/production/production-requests/${row.id}`)
            }
          >
            {value}
          </button>
          {row.sourceSoCancelled ? (
            <Tooltip title="ใบสั่งขายที่อ้างอิงถูกยกเลิก — กรุณาตรวจสอบ">
              <ExclamationCircleOutlined style={{ color: "#faad14" }} />
            </Tooltip>
          ) : null}
        </span>
      ),
    },
    {
      title: "ใบสั่งขายอ้างอิง",
      dataIndex: "soNo",
      key: "soNo",
      render: (value?: string) => value || "-",
    },
    {
      title: "ลูกค้า",
      dataIndex: "customerName",
      key: "customerName",
      render: (value?: string) => value || "-",
    },
    {
      title: "วันที่ขอ",
      dataIndex: "requestDate",
      key: "requestDate",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "ต้องการภายใน",
      dataIndex: "requiredDate",
      key: "requiredDate",
      render: (value?: string) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "รายการ",
      key: "itemCount",
      align: "right",
      render: (_, row) => `${row.items.length} รายการ`,
    },
    {
      title: "ผลิตได้แล้ว",
      key: "progress",
      width: 160,
      render: (_, row) => (
        <Progress
          percent={row.producedPercent}
          size="small"
          status={
            row.status === "CANCELLED"
              ? "exception"
              : row.producedPercent >= 100
                ? "success"
                : "active"
          }
          format={(percent) => `${percent ?? 0}%`}
        />
      ),
    },
    {
      title: "ใบสั่งผลิต",
      key: "productionOrders",
      render: (_, row) =>
        row.productionOrders.length
          ? row.productionOrders.map((order) => order.orderNo).join(", ")
          : "-",
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={STATUS_COLOR[value] ?? "default"}>
          {PRODUCTION_REQUEST_STATUS_LABEL[value] ?? value}
        </Tag>
      ),
    },
  ];

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>PR</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>PRODUCTION · จากใบสั่งขาย</div>
            <h2 className={masterStyles.pageTitle}>ใบขอผลิต</h2>
            <span className={masterStyles.pageSubtitle}>
              อ้างอิงใบสั่งขายที่ยังไม่อนุมัติ 1 ใบขอผลิตต่อ 1 SO —
              ผลผลิตที่เสร็จรับเข้าสต๊อกกลาง ไม่ผูกกับ SO เดิม
            </span>
          </div>
          {canCreate ? (
            <Button
              type="primary"
              className={masterStyles.createButton}
              icon={<PlusOutlined className={masterStyles.plusIcon} />}
              onClick={() =>
                router.push("/production/production-requests/create")
              }
            >
              สร้างใบขอผลิต
            </Button>
          ) : null}
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ค้นหา</div>
              <h3>รายการใบขอผลิต</h3>
              <p>ทั้งหมด {total} ใบ</p>
            </div>
          </div>
          <div className={masterStyles.filterForm}>
            <div className={masterStyles.formGrid}>
              <Input
                allowClear
                aria-label="ค้นหาเลขที่ใบขอผลิต"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ใบขอผลิต"
                value={requestNo}
                onChange={(e) => {
                  setRequestNo(e.target.value);
                  setPage(1);
                }}
              />
              <Input
                allowClear
                aria-label="ค้นหาเลขที่ใบสั่งขาย"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ใบสั่งขาย"
                value={soNo}
                onChange={(e) => {
                  setSoNo(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                aria-label="กรองตามสถานะ"
                placeholder="สถานะทั้งหมด"
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={Object.entries(PRODUCTION_REQUEST_STATUS_LABEL).map(
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
              <h3>ใบขอผลิต</h3>
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
