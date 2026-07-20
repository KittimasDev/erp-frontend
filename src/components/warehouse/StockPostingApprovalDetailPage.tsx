"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useApproveStockPostingRequestMutation,
  useRejectStockPostingRequestMutation,
} from "@/hooks/stock-posting/useStockPostingMutations";
import { useStockPostingApprovalQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { StockPostingReceiptItem } from "@/types/stock-posting-request";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import styles from "@/components/masters/shared/master-page.module.css";

type Props = {
  requestId: string;
};

export default function StockPostingApprovalDetailPage({ requestId }: Props) {
  const router = useRouter();
  const canApprove = userHasRole(RoleCode.WAREHOUSE_MANAGER);
  const detailQuery = useStockPostingApprovalQuery(requestId);
  const approveMutation = useApproveStockPostingRequestMutation();
  const rejectMutation = useRejectStockPostingRequestMutation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const request = detailQuery.data?.data;
  const isPending =
    request?.status === StockPostingRequestStatus.PENDING_APPROVAL;

  const itemColumns: ColumnsType<StockPostingReceiptItem> = [
    { title: "ประเภทสินค้า", dataIndex: "classificationName", key: "classificationName" },
    {
      title: "สินค้า",
      key: "item",
      render: (_, row) =>
        row.itemCode
          ? `${row.itemCode} — ${row.itemName ?? ""}`
          : "ยังไม่ผูก item",
    },
    { title: "น้ำหนัก (กก.)", dataIndex: "weightKg", key: "weightKg", align: "right" },
    { title: "ราคา/กก.", dataIndex: "pricePerKg", key: "pricePerKg", align: "right" },
    { title: "ยอดเงิน", dataIndex: "amount", key: "amount", align: "right" },
  ];

  const handleApprove = () => {
    approveMutation.mutate(requestId, {
      onSuccess: () => {
        void detailQuery.refetch();
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      return;
    }
    rejectMutation.mutate(
      { id: requestId, body: { rejectReason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason("");
          void detailQuery.refetch();
        },
      },
    );
  };

  return (
    <MasterPageGate isLoading={detailQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <Button
            icon={<ArrowLeftOutlined />}
            className={styles.editButton}
            onClick={() => router.push("/warehouse/stock-posting-approvals")}
          >
            กลับ
          </Button>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>WAREHOUSE · APPROVAL DETAIL</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              รายละเอียดคำขอรับเข้าคลัง
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              {request?.requestNo ?? "—"}
            </Typography.Text>
          </div>
          <div />
        </div>

        {request ? (
          <>
            <div className={styles.tableCard} style={{ marginBottom: 16 }}>
              <Descriptions
                bordered
                size="small"
                column={2}
                items={[
                  {
                    key: "status",
                    label: "สถานะ",
                    children: (
                      <Tag>
                        {STOCK_POSTING_REQUEST_STATUS_LABEL[request.status] ??
                          request.status}
                      </Tag>
                    ),
                  },
                  {
                    key: "receipt",
                    label: "ใบรับซื้อ",
                    children: request.receipt?.receiptNo ?? request.receiptId,
                  },
                  {
                    key: "warehouse",
                    label: "คลัง",
                    children: `${request.warehouseCode ?? ""} — ${
                      request.warehouseName ?? ""
                    }`,
                  },
                  {
                    key: "location",
                    label: "ตำแหน่ง",
                    children: `${request.locationCode ?? ""} — ${
                      request.locationName ?? ""
                    }`,
                  },
                  {
                    key: "postingDate",
                    label: "วันที่รับเข้า",
                    children: request.postingDate,
                  },
                  {
                    key: "requestedBy",
                    label: "ผู้ขอ",
                    children:
                      request.requestedBy?.displayName ??
                      request.requestedById,
                  },
                  {
                    key: "remark",
                    label: "หมายเหตุ",
                    span: 2,
                    children: request.remark || "-",
                  },
                  ...(request.rejectReason
                    ? [
                        {
                          key: "rejectReason",
                          label: "เหตุผลไม่อนุมัติ",
                          span: 2 as const,
                          children: request.rejectReason,
                        },
                      ]
                    : []),
                ]}
              />
            </div>

            <div className={styles.tableCard} style={{ marginBottom: 16 }}>
              <h3>รายการรับเข้า</h3>
              <Table
                rowKey="id"
                size="small"
                pagination={false}
                columns={itemColumns}
                dataSource={request.items ?? []}
              />
            </div>

            {isPending && canApprove ? (
              <Space>
                <Popconfirm
                  title="อนุมัติรับเข้าคลัง"
                  description="ระบบจะ POST สต๊อกจริงทันทีหลังอนุมัติ"
                  okText="อนุมัติ"
                  cancelText="ยกเลิก"
                  onConfirm={handleApprove}
                >
                  <Button
                    type="primary"
                    className={styles.createButton}
                    loading={approveMutation.isPending}
                  >
                    อนุมัติและรับเข้าคลัง
                  </Button>
                </Popconfirm>
                <Button
                  danger
                  onClick={() => setRejectOpen(true)}
                  disabled={rejectMutation.isPending}
                >
                  ไม่อนุมัติ
                </Button>
              </Space>
            ) : null}

            {isPending && !canApprove ? (
              <Alert
                type="warning"
                showIcon
                message="ต้องมีสิทธิ์ WAREHOUSE_MANAGER เพื่ออนุมัติหรือไม่อนุมัติ"
              />
            ) : null}
          </>
        ) : null}

        <Modal
          title="ไม่อนุมัติคำขอรับเข้าคลัง"
          open={rejectOpen}
          okText="ยืนยันไม่อนุมัติ"
          cancelText="ปิด"
          okButtonProps={{
            danger: true,
            disabled: !rejectReason.trim(),
            loading: rejectMutation.isPending,
          }}
          onCancel={() => {
            setRejectOpen(false);
            setRejectReason("");
          }}
          onOk={handleReject}
        >
          <Typography.Paragraph>
            กรุณาระบุเหตุผลที่ไม่อนุมัติ
          </Typography.Paragraph>
          <Input.TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เช่น ตำแหน่งจัดเก็บไม่ถูกต้อง"
          />
        </Modal>
      </section>
    </MasterPageGate>
  );
}
