"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Popconfirm, Table, Tag, Typography } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useApproveProductionOutputStockRequestMutation } from "@/hooks/production-output/useProductionOutputMutations";
import { useProductionOutputApprovalsQuery } from "@/hooks/production-output/useProductionOutputQueries";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { userHasRole } from "@/lib/auth/session";
import type { ProductionOutputStockRequest } from "@/types/production-output-stock-request";
import { PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL } from "@/types/production-output-stock-request";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

const PAGE_SIZE = 10;

export default function ProductionOutputApprovalsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const canApprove =
    hasPermission("PRODUCTION_OUTPUT_APPROVALS.APPROVE") ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
        userHasRole(RoleCode.ADMINISTRATOR)));
  const approvalsQuery = useProductionOutputApprovalsQuery();
  const approveMutation = useApproveProductionOutputStockRequestMutation();
  const rows = useMemo(() => {
    const list = approvalsQuery.data?.data ?? [];
    return [...list].sort((a, b) => {
      const aTime = new Date(a.requestedAt ?? a.createdAt).getTime();
      const bTime = new Date(b.requestedAt ?? b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [approvalsQuery.data?.data]);

  const columns: ColumnsType<ProductionOutputStockRequest> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "index",
        width: 72,
        align: "center",
        render: (_value, _row, index) => (page - 1) * PAGE_SIZE + index + 1,
      },
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
        width: 210,
        align: "center",
        render: (_, row) => (
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Button
              className={styles.editButton}
              onClick={() =>
                router.push(`/warehouse/production-output-approvals/${row.id}`)
              }
            >
              ตรวจสอบ
            </Button>
            {/* อนุมัติได้จากแถวเลย — หัวหน้าคลังไม่ต้องเปิดเข้าไปทีละใบ */}
            {canApprove && row.status === "PENDING_APPROVAL" ? (
              <Popconfirm
                title={`อนุมัติ ${row.requestNo}`}
                description="ยืนยัน POST สต๊อกสำหรับคำขอนี้"
                okText="อนุมัติ"
                cancelText="ยกเลิก"
                onConfirm={() =>
                  approveMutation.mutate(row.id, {
                    onSuccess: () => void approvalsQuery.refetch(),
                  })
                }
              >
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={
                    approveMutation.isPending &&
                    approveMutation.variables === row.id
                  }
                >
                  อนุมัติ
                </Button>
              </Popconfirm>
            ) : null}
          </div>
        ),
      },
    ],
    [page, router, canApprove, approveMutation, approvalsQuery],
  );

  return (
    <MasterPageGate isLoading={approvalsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="WAREHOUSE · PRODUCTION OUTPUT"
          title="อนุมัติรับผลผลิตเข้าคลัง"
          subtitle="หัวหน้าคลังอนุมัติแล้วระบบจะ POST สต๊อก (RECEIVE) จริง"
        />

        {!canApprove ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 12 }}
          >
            ดูรายการได้ — การอนุมัติต้องเปิดสิทธิ์ PRODUCTION_OUTPUT_APPROVALS ·
            APPROVE ที่หน้าผู้ใช้งาน → การอนุญาต
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
              current: page,
              pageSize: PAGE_SIZE,
              showSizeChanger: false,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
              onChange: setPage,
            }}
            locale={{ emptyText: "ไม่มีคำขอรออนุมัติ" }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
