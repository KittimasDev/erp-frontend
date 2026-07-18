"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useStockPostingApprovalsQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { StockPostingRequest } from "@/types/stock-posting-request";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import styles from "@/components/masters/shared/master-page.module.css";

export default function StockPostingApprovalsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>(
    StockPostingRequestStatus.PENDING_APPROVAL,
  );
  const canApprove = userHasRole(RoleCode.WAREHOUSE_MANAGER);
  const approvalsQuery = useStockPostingApprovalsQuery(status);

  const rows = approvalsQuery.data?.data ?? [];

  const columns: ColumnsType<StockPostingRequest> = useMemo(
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
        title: "ใบรับซื้อ",
        key: "receipt",
        render: (_, row) => row.receipt?.receiptNo ?? row.receiptId,
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
        width: 130,
      },
      {
        title: "ผู้ขอ",
        key: "requestedBy",
        render: (_, row) =>
          row.requestedBy?.displayName ?? row.requestedById,
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (value: string) => (
          <Tag>
            {STOCK_POSTING_REQUEST_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "จัดการ",
        key: "actions",
        width: 120,
        align: "center",
        render: (_, row) => (
          <Button
            className={styles.editButton}
            onClick={() =>
              router.push(`/warehouse/stock-posting-approvals/${row.id}`)
            }
          >
            ดูรายละเอียด
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
            <div className={styles.eyebrow}>WAREHOUSE · APPROVALS</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              อนุมัติรับเข้าคลัง
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              หัวหน้าคลังตรวจสอบและอนุมัติคำขอ — POST สต๊อกจริงเมื่ออนุมัติเท่านั้น
            </Typography.Text>
          </div>
          <div />
        </div>

        {!canApprove ? (
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            ดูรายการได้ — การอนุมัติต้องมีสิทธิ์ WAREHOUSE_MANAGER
          </Typography.Text>
        ) : null}

        <div className={styles.filterCard} style={{ marginBottom: 16 }}>
          <Space>
            <span>สถานะ</span>
            <Select
              style={{ width: 220 }}
              value={status}
              onChange={setStatus}
              options={[
                {
                  value: StockPostingRequestStatus.PENDING_APPROVAL,
                  label: "รออนุมัติ",
                },
                {
                  value: StockPostingRequestStatus.APPROVED,
                  label: "อนุมัติแล้ว",
                },
                {
                  value: StockPostingRequestStatus.REJECTED,
                  label: "ไม่อนุมัติ",
                },
                {
                  value: StockPostingRequestStatus.CANCELLED,
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
            loading={approvalsQuery.isFetching}
            pagination={{ pageSize: 10, showTotal: (t) => `ทั้งหมด ${t} รายการ` }}
            locale={{ emptyText: "ไม่พบคำขอตามเงื่อนไข" }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
