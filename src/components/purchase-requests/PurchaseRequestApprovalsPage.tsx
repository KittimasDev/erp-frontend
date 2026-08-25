"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  Button,
  Input,
  Modal,
  Pagination,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseCircleOutlined,
  EyeOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useApprovePurchaseRequestMutation,
  useRejectPurchaseRequestMutation,
  useReturnPurchaseRequestToDraftMutation,
} from "@/hooks/purchase-requests/usePurchaseRequestMutations";
import { usePendingPurchaseRequestApprovalsQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { userHasRole } from "@/lib/auth/session";
import type { PurchaseRequest } from "@/types/purchase-requests";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import styles from "./purchase-request.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function PurchaseRequestApprovalsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;
  // modal เหตุผลตัวเดียวใช้ทั้งไม่อนุมัติและส่งกลับแก้ไข
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"reject" | "return">(
    "reject",
  );
  const [reviewReason, setReviewReason] = useState("");

  const canAccessApprovals =
    hasPermission(
      "PURCHASE_REQUEST_APPROVALS.VIEW",
      "PURCHASE_REQUEST_APPROVALS.APPROVE",
    ) ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
        userHasRole(RoleCode.ADMINISTRATOR)));

  const canApprove =
    hasPermission("PURCHASE_REQUEST_APPROVALS.APPROVE") ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
        userHasRole(RoleCode.ADMINISTRATOR)));

  const query = usePendingPurchaseRequestApprovalsQuery({ page, limit });
  const approveMutation = useApprovePurchaseRequestMutation();
  const rejectMutation = useRejectPurchaseRequestMutation();
  const returnMutation = useReturnPurchaseRequestToDraftMutation();

  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  const columns: ColumnsType<PurchaseRequest> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "no",
        width: 70,
        align: "center",
        render: (_v, _r, index) => (page - 1) * limit + index + 1,
      },
      {
        title: "เลขที่ใบขอซื้อ",
        dataIndex: "prNo",
        key: "prNo",
        align: "center",
      },
      {
        title: "วันที่ขอซื้อ",
        dataIndex: "prDate",
        key: "prDate",
        align: "center",
        render: (value: string) => formatDate(value),
      },
      {
        title: "ผู้ขอ",
        key: "requestedBy",
        align: "center",
        render: (_v, row) => row.requestedBy?.displayName ?? "—",
      },
      {
        title: "ประเภท",
        key: "type",
        align: "center",
        render: (_v, row) => row.purchaseRequestType?.nameTh ?? "—",
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        align: "center",
        render: () => <Tag color="gold">รออนุมัติ</Tag>,
      },
      {
        title: "จัดการ",
        key: "action",
        width: 170,
        align: "center",
        render: (_v, row) => (
          <RowActionsMenu
            ariaLabel={`เมนูจัดการ ${row.prNo}`}
            primary={
              canApprove ? (
                <Button
                  size="small"
                  type="primary"
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(row.id)}
                >
                  อนุมัติ
                </Button>
              ) : null
            }
            actions={[
              {
                key: "view",
                icon: <EyeOutlined />,
                label: "ดูรายละเอียด",
                onClick: () => router.push(`/purchase-requests/${row.id}`),
              },
              canApprove && "divider",
              canApprove && {
                key: "return",
                icon: <RollbackOutlined />,
                label: "ส่งกลับแก้ไข",
                onClick: () => {
                  setReviewId(row.id);
                  setReviewAction("return");
                  setReviewReason("");
                },
              },
              canApprove && {
                key: "reject",
                icon: <CloseCircleOutlined />,
                label: "ไม่อนุมัติ",
                danger: true,
                onClick: () => {
                  setReviewId(row.id);
                  setReviewAction("reject");
                  setReviewReason("");
                },
              },
            ]}
          />
        ),
      },
    ],
    [approveMutation, canApprove, limit, page, router],
  );

  if (!canAccessApprovals) {
    return (
      <div className={styles.pageWrap}>
        คุณไม่มีสิทธิ์เข้าถึงหน้ารออนุมัติใบขอซื้อ — ต้องเปิด{" "}
        PURCHASE_REQUEST_APPROVALS · VIEW หรือ APPROVE ที่หน้าผู้ใช้งาน →
        การอนุญาต
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-requests">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <Link href="/purchase-requests">ใบขอซื้อ</Link> },
          {
            title: (
              <span className={styles.breadcrumbActive}>รายการรออนุมัติ</span>
            ),
          },
        ]}
      />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>รายการใบขอซื้อรออนุมัติ</h1>
        <div className={styles.titleLine} />
      </div>

      {!canApprove ? (
        <p style={{ marginBottom: 12, color: "#8a9199" }}>
          ดูรายการได้ — การอนุมัติ/ปฏิเสธต้องเปิดสิทธิ์
          PURCHASE_REQUEST_APPROVALS · APPROVE
        </p>
      ) : null}

      <div className={styles.tableWrap}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.customTable}
          locale={{ emptyText: "ไม่มีรายการรออนุมัติ" }}
        />
      </div>

      <div className={styles.tableFooter}>
        <div className={styles.footerText}>
          Showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
          {Math.min(page * limit, total)} of {total} entries
        </div>
        <Pagination
          size="small"
          current={page}
          total={total}
          pageSize={limit}
          showSizeChanger={false}
          className={styles.pagination}
          onChange={(next) => setPage(next)}
        />
      </div>

      <Modal
        title={
          reviewAction === "reject"
            ? "ไม่อนุมัติใบขอซื้อ"
            : "ส่งกลับให้ผู้ขอแก้ไข"
        }
        open={Boolean(reviewId)}
        onCancel={() => setReviewId(null)}
        confirmLoading={rejectMutation.isPending || returnMutation.isPending}
        okText={reviewAction === "reject" ? "ไม่อนุมัติ" : "ส่งกลับแก้ไข"}
        cancelText="ยกเลิก"
        okButtonProps={{ danger: reviewAction === "reject" }}
        onOk={async () => {
          if (!reviewId) return;
          const body = { reason: reviewReason.trim() || undefined };
          if (reviewAction === "reject") {
            await rejectMutation.mutateAsync({ id: reviewId, body });
          } else {
            await returnMutation.mutateAsync({ id: reviewId, body });
          }
          setReviewId(null);
        }}
      >
        <Input.TextArea
          rows={3}
          placeholder={
            reviewAction === "reject"
              ? "เหตุผลที่ไม่อนุมัติ (ถ้ามี)"
              : "สิ่งที่ต้องแก้ไข (ถ้ามี)"
          }
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
