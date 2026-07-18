"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCancelProductionOutputStockRequestMutation } from "@/hooks/production-output/useProductionOutputMutations";
import { useProductionOutputStockRequestsQuery } from "@/hooks/production-output/useProductionOutputQueries";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { ProductionOutputStockRequest } from "@/types/production-output-stock-request";
import {
  PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL,
  ProductionOutputRequestStatus,
} from "@/types/production-output-stock-request";
import styles from "@/components/masters/shared/master-page.module.css";

export default function ProductionOutputStockRequestsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const canRequest =
    userHasRole(RoleCode.WAREHOUSE_OFFICER) || isAdministrator();
  const listQuery = useProductionOutputStockRequestsQuery({
    status,
    q: q.trim() || undefined,
  });
  const cancelMutation = useCancelProductionOutputStockRequestMutation();

  const rows = listQuery.data?.data ?? [];

  const columns: ColumnsType<ProductionOutputStockRequest> = useMemo(
    () => [
      {
        title: "เลขที่คำขอ",
        dataIndex: "requestNo",
        key: "requestNo",
        render: (value: string) => (
          <span className={styles.codeBadge}>{value}</span>
        ),
      },
      {
        title: "สินค้า",
        key: "item",
        render: (_, row) =>
          row.itemCode
            ? `${row.itemCode} — ${row.itemNameTh ?? ""}`
            : row.itemId,
      },
      {
        title: "จำนวน",
        key: "qty",
        align: "right",
        render: (_, row) =>
          `${row.quantity} ${row.unitCode ?? row.unitNameTh ?? ""}`,
      },
      {
        title: "คลัง / ตำแหน่ง",
        key: "warehouse",
        render: (_, row) =>
          `${row.warehouseCode ?? "-"} / ${row.locationCode ?? "-"}`,
      },
      {
        title: "วันที่รับเข้า",
        dataIndex: "postingDate",
        key: "postingDate",
        width: 120,
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag>{PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[value] ?? value}</Tag>
        ),
      },
      {
        title: "จัดการ",
        key: "actions",
        width: 200,
        align: "center",
        render: (_, row) => (
          <Space>
            <Button
              size="small"
              className={styles.editButton}
              onClick={() =>
                router.push(
                  `/receiving/production-output/stock-requests/${row.id}`,
                )
              }
            >
              ดู
            </Button>
            {canRequest &&
            row.status === ProductionOutputRequestStatus.PENDING_APPROVAL ? (
              <Popconfirm
                title="ยกเลิกคำขอ?"
                okText="ยกเลิกคำขอ"
                cancelText="ปิด"
                onConfirm={() => cancelMutation.mutate(row.id)}
              >
                <Button size="small" danger loading={cancelMutation.isPending}>
                  ยกเลิก
                </Button>
              </Popconfirm>
            ) : null}
          </Space>
        ),
      },
    ],
    [canRequest, cancelMutation, router],
  );

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <Button
            icon={<ArrowLeftOutlined />}
            className={styles.editButton}
            onClick={() => router.push("/receiving")}
          >
            กลับรับซื้อยาง
          </Button>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>RECEIVING · PRODUCTION OUTPUT</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              คำขอรับผลผลิตเข้าคลัง
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              รายการคำขอจากฝั่งรับซื้อยาง — รอหัวหน้าคลังอนุมัติที่เมนูคลัง
            </Typography.Text>
          </div>
          <div>
            {canRequest ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={styles.createButton}
                onClick={() =>
                  router.push(
                    "/receiving/production-output/stock-requests/create",
                  )
                }
              >
                สร้างคำขอ
              </Button>
            ) : null}
          </div>
        </div>

        <div className={styles.filterCard} style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="ค้นหาเลขคำขอ / สินค้า / Lot"
              style={{ width: 280 }}
              onSearch={setQ}
            />
            <Select
              allowClear
              placeholder="สถานะ"
              style={{ width: 200 }}
              value={status}
              onChange={setStatus}
              options={[
                {
                  value: ProductionOutputRequestStatus.PENDING_APPROVAL,
                  label: "รออนุมัติ",
                },
                {
                  value: ProductionOutputRequestStatus.APPROVED,
                  label: "อนุมัติแล้ว",
                },
                {
                  value: ProductionOutputRequestStatus.REJECTED,
                  label: "ไม่อนุมัติ",
                },
                {
                  value: ProductionOutputRequestStatus.CANCELLED,
                  label: "ยกเลิก",
                },
              ]}
            />
          </Space>
        </div>

        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            pagination={{
              pageSize: 10,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            }}
            locale={{ emptyText: "ยังไม่มีคำขอรับผลผลิต" }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
