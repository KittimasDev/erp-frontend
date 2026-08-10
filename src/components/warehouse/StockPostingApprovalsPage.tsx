"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Table, Tag, Typography } from "antd";
import {
  InboxOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useQueries } from "@tanstack/react-query";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useStockPostingApprovalsQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { getStockPostingApprovals } from "@/lib/api/stock-posting-requests";
import { getAccessToken } from "@/lib/auth/token";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { userHasRole } from "@/lib/auth/session";
import type { StockPostingRequest } from "@/types/stock-posting-request";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import styles from "@/components/weighbridge/WeighbridgeDashboardPage.module.css";

const STATUS_FILTERS: {
  key: string;
  label: string;
  description: string;
}[] = [
  {
    key: StockPostingRequestStatus.PENDING_APPROVAL,
    label: "รออนุมัติ",
    description: "รอหัวหน้าคลังตรวจสอบ",
  },
  {
    key: StockPostingRequestStatus.APPROVED,
    label: "อนุมัติแล้ว",
    description: "รับเข้าสต๊อกแล้ว",
  },
  {
    key: StockPostingRequestStatus.REJECTED,
    label: "ไม่อนุมัติ",
    description: "ส่งกลับให้แก้ไข/ส่งใหม่",
  },
  {
    key: StockPostingRequestStatus.CANCELLED,
    label: "ยกเลิก",
    description: "คำขอถูกยกเลิก",
  },
];

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH");
}

function statusTagColor(status: string) {
  switch (status) {
    case StockPostingRequestStatus.PENDING_APPROVAL:
      return "processing";
    case StockPostingRequestStatus.APPROVED:
      return "success";
    case StockPostingRequestStatus.REJECTED:
      return "warning";
    case StockPostingRequestStatus.CANCELLED:
      return "default";
    default:
      return "default";
  }
}

export default function StockPostingApprovalsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>(
    StockPostingRequestStatus.PENDING_APPROVAL,
  );
  const canApprove =
    hasPermission("STOCK_POSTING_APPROVALS.APPROVE") ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
        userHasRole(RoleCode.ADMINISTRATOR)));
  const approvalsQuery = useStockPostingApprovalsQuery(status);
  const rows = approvalsQuery.data?.data ?? [];

  const countQueries = useQueries({
    queries: STATUS_FILTERS.map((filter) => ({
      queryKey: [
        "warehouse",
        "stock-posting-requests",
        "approvals",
        "count",
        filter.key,
      ],
      queryFn: () => getStockPostingApprovals(getAccessToken(), filter.key),
      staleTime: 30_000,
    })),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_FILTERS.forEach((filter, index) => {
      counts[filter.key] = countQueries[index]?.data?.data?.length ?? 0;
    });
    return counts;
  }, [countQueries]);

  const pendingCount =
    statusCounts[StockPostingRequestStatus.PENDING_APPROVAL] ?? 0;

  const columns: ColumnsType<StockPostingRequest> = useMemo(
    () => [
      {
        title: "เลขที่คำขอ",
        dataIndex: "requestNo",
        key: "requestNo",
        width: 160,
        render: (value: string) => <strong>{value}</strong>,
      },
      {
        title: "ใบรับซื้อ",
        key: "receipt",
        width: 150,
        render: (_, row) => row.receipt?.receiptNo ?? row.receiptId,
      },
      {
        title: "คลัง / ตำแหน่ง",
        key: "warehouse",
        render: (_, row) => {
          const warehouse = [row.warehouseCode, row.warehouseName]
            .filter(Boolean)
            .join(" · ");
          const location = [row.locationCode, row.locationName]
            .filter(Boolean)
            .join(" · ");
          return (
            <div>
              <div>{warehouse || "-"}</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {location || "-"}
              </Typography.Text>
            </div>
          );
        },
      },
      {
        title: "วันที่รับเข้า",
        dataIndex: "postingDate",
        key: "postingDate",
        width: 120,
        render: (value: string) => formatDate(value),
      },
      {
        title: "ผู้ขอ",
        key: "requestedBy",
        width: 140,
        render: (_, row) =>
          row.requestedBy?.displayName ??
          row.requestedBy?.username ??
          row.requestedById,
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (value: string) => (
          <Tag color={statusTagColor(value)} className={styles.flowTag}>
            {STOCK_POSTING_REQUEST_STATUS_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "ดำเนินการ",
        key: "actions",
        width: 130,
        fixed: "right",
        render: (_, row) => (
          <Button
            size="small"
            type={
              row.status === StockPostingRequestStatus.PENDING_APPROVAL
                ? "primary"
                : "default"
            }
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/warehouse/stock-posting-approvals/${row.id}`);
            }}
          >
            {row.status === StockPostingRequestStatus.PENDING_APPROVAL
              ? "ตรวจสอบ"
              : "ดูรายละเอียด"}
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <MasterPageGate isLoading={approvalsQuery.isLoading}>
      <section className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <InboxOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>Warehouse</p>
            <h1 className={styles.pageTitle}>อนุมัติรับเข้าคลัง</h1>
            <p className={styles.pageSubtitle}>
              หัวหน้าคลังตรวจสอบคำขอรับยางดิบ — อนุมัติแล้วระบบจึง POST สต๊อกจริง
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button
              className={styles.dashboardButton}
              icon={<ReloadOutlined />}
              loading={approvalsQuery.isFetching}
              onClick={() => void approvalsQuery.refetch()}
            >
              รีเฟรช
            </Button>
          </div>
        </header>

        <div className={styles.statsStrip}>
          <div
            className={[styles.statHighlight, styles.statHighlightAccent].join(
              " ",
            )}
          >
            <span>รออนุมัติ</span>
            <strong>{pendingCount.toLocaleString("th-TH")}</strong>
          </div>
          <div className={styles.statHighlight}>
            <span>รายการที่แสดง</span>
            <strong>{rows.length.toLocaleString("th-TH")}</strong>
          </div>
        </div>

        <div
          className={styles.summaryGrid}
          style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          <button
            type="button"
            className={[
              styles.summaryCard,
              styles.summaryCardButton,
              status === StockPostingRequestStatus.APPROVED
                ? styles.summaryCardActive
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setStatus(StockPostingRequestStatus.APPROVED)}
          >
            <span>อนุมัติแล้ว</span>
            <strong>
              {(
                statusCounts[StockPostingRequestStatus.APPROVED] ?? 0
              ).toLocaleString("th-TH")}
            </strong>
          </button>
          <button
            type="button"
            className={[
              styles.summaryCard,
              styles.summaryCardButton,
              status === StockPostingRequestStatus.REJECTED
                ? styles.summaryCardActive
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setStatus(StockPostingRequestStatus.REJECTED)}
          >
            <span>ไม่อนุมัติ</span>
            <strong>
              {(
                statusCounts[StockPostingRequestStatus.REJECTED] ?? 0
              ).toLocaleString("th-TH")}
            </strong>
          </button>
          <div className={styles.summaryCard} style={{ cursor: "default" }}>
            <span>สิทธิ์</span>
            <strong style={{ fontSize: 16 }}>
              {canApprove ? "อนุมัติได้" : "ดูอย่างเดียว"}
            </strong>
          </div>
        </div>

        {!canApprove ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="secondary">
                ดูรายการได้ — การอนุมัติ/ไม่อนุมัติต้องเปิดสิทธิ์{" "}
                STOCK_POSTING_APPROVALS · APPROVE ที่หน้าผู้ใช้งาน → การอนุญาต
              </Typography.Text>
            </div>
          </div>
        ) : null}

        <div className={styles.filterBar}>
          <div className={styles.stageStrip}>
            <span className={styles.stageStripLabel}>สถานะ</span>
            <div className={styles.stageChips}>
              {STATUS_FILTERS.map((option) => {
                const active = status === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={[
                      styles.stageChip,
                      active ? styles.stageChipActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={option.description}
                    onClick={() => setStatus(option.key)}
                  >
                    <span>{option.label}</span>
                    <em>{statusCounts[option.key] ?? 0}</em>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>
                {STATUS_FILTERS.find((item) => item.key === status)?.label ??
                  "รายการคำขอ"}
              </h3>
              <p>
                กดแถวหรือปุ่มเพื่อเปิดรายละเอียด
                {canApprove &&
                status === StockPostingRequestStatus.PENDING_APPROVAL
                  ? " · อนุมัติได้จากหน้ารายละเอียด"
                  : ""}
              </p>
            </div>
          </div>
          <Table
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={approvalsQuery.isFetching}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
            }}
            scroll={{ x: 980 }}
            locale={{ emptyText: "ไม่พบคำขอตามเงื่อนไขที่เลือก" }}
            onRow={(record) => ({
              onClick: () =>
                router.push(`/warehouse/stock-posting-approvals/${record.id}`),
              className: styles.clickableRow,
            })}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
