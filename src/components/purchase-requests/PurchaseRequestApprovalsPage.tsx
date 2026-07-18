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
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useApprovePurchaseRequestMutation,
  useRejectPurchaseRequestMutation,
} from "@/hooks/purchase-requests/usePurchaseRequestMutations";
import { usePendingPurchaseRequestApprovalsQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { PurchaseRequest } from "@/types/purchase-requests";
import styles from "./purchase-request.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function PurchaseRequestApprovalsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canApprove =
    userHasRole(RoleCode.PROCUREMENT_MANAGER) || isAdministrator();

  const query = usePendingPurchaseRequestApprovalsQuery({ page, limit });
  const approveMutation = useApprovePurchaseRequestMutation();
  const rejectMutation = useRejectPurchaseRequestMutation();

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
        width: 220,
        align: "center",
        render: (_v, row) => (
          <Space size={8}>
            <button
              className={`${styles.iconBtn} ${styles.iconBtnView}`}
              type="button"
              onClick={() => router.push(`/purchase-requests/${row.id}`)}
            >
              <EyeOutlined />
            </button>
            {canApprove ? (
              <>
                <Button
                  size="small"
                  type="primary"
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(row.id)}
                >
                  อนุมัติ
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    setRejectId(row.id);
                    setRejectReason("");
                  }}
                >
                  ปฏิเสธ
                </Button>
              </>
            ) : null}
          </Space>
        ),
      },
    ],
    [approveMutation, canApprove, limit, page, router],
  );

  if (!canApprove) {
    return (
      <div className={styles.pageWrap}>
        คุณไม่มีสิทธิ์เข้าถึงหน้ารออนุมัติใบขอซื้อ
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
        title="ปฏิเสธใบขอซื้อ"
        open={Boolean(rejectId)}
        onCancel={() => setRejectId(null)}
        confirmLoading={rejectMutation.isPending}
        okText="ปฏิเสธ"
        okButtonProps={{ danger: true }}
        onOk={async () => {
          if (!rejectId) return;
          await rejectMutation.mutateAsync({
            id: rejectId,
            body: { reason: rejectReason.trim() || undefined },
          });
          setRejectId(null);
        }}
      >
        <Input.TextArea
          rows={3}
          placeholder="เหตุผล (ถ้ามี)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
