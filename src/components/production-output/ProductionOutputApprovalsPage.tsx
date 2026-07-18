"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useProductionOutputApprovalsQuery } from "@/hooks/production-output/useProductionOutputQueries";
import { userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { ProductionOutputStockRequest } from "@/types/production-output-stock-request";
import { PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL } from "@/types/production-output-stock-request";
import styles from "@/components/masters/shared/master-page.module.css";

export default function ProductionOutputApprovalsPage() {
  const router = useRouter();
  const canApprove = userHasRole(RoleCode.WAREHOUSE_MANAGER);
  const approvalsQuery = useProductionOutputApprovalsQuery();
  const rows = approvalsQuery.data?.data ?? [];

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
        render: (_, row) => `${row.quantity} ${row.unitCode ?? ""}`,
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
        title: "ผู้ขอ",
        dataIndex: "requestedByName",
        key: "requestedByName",
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value: string) => (
          <Tag>{PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[value] ?? value}</Tag>
        ),
      },
      {
        title: "จัดการ",
        key: "actions",
        width: 130,
        align: "center",
        render: (_, row) => (
          <Button
            className={styles.editButton}
            onClick={() =>
              router.push(`/warehouse/production-output-approvals/${row.id}`)
            }
          >
            ตรวจสอบ
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <MasterPageGate isLoading={approvalsQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div />
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>WAREHOUSE · PRODUCTION OUTPUT</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              อนุมัติรับผลผลิตเข้าคลัง
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              หัวหน้าคลังอนุมัติแล้วระบบจะ POST สต๊อก (RECEIVE) จริง
            </Typography.Text>
          </div>
          <div />
        </div>

        {!canApprove ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 12 }}
          >
            ดูรายการได้ — การอนุมัติต้องมีสิทธิ์ WAREHOUSE_MANAGER
          </Typography.Text>
        ) : null}

        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={approvalsQuery.isFetching}
            pagination={{
              pageSize: 10,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            }}
            locale={{ emptyText: "ไม่มีคำขอรออนุมัติ" }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
