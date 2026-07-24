"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
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
import styles from "@/components/weighbridge/WeighbridgeDashboardPage.module.css";

type Props = {
  requestId: string;
};

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH");
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("th-TH");
}

function statusTagColor(status: string) {
  switch (status) {
    case StockPostingRequestStatus.PENDING_APPROVAL:
      return "processing";
    case StockPostingRequestStatus.APPROVED:
      return "success";
    case StockPostingRequestStatus.REJECTED:
      return "warning";
    default:
      return "default";
  }
}

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
  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  const totals = useMemo(() => {
    const items = request?.items ?? [];
    const weight = items.reduce((sum, row) => sum + Number(row.weightKg || 0), 0);
    const amount = items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    // ผูกแล้ว = มี itemId หรือจับคู่ได้ผ่าน itemCode (= classification_code)
    const unlinked = items.filter((row) => !row.itemId && !row.itemCode);
    return { weight, amount, count: items.length, unlinked };
  }, [request?.items]);

  const hasUnlinkedItems = totals.unlinked.length > 0;
  const canApproveNow = isPending && canApprove && !hasUnlinkedItems;

  const itemColumns: ColumnsType<StockPostingReceiptItem> = [
    {
      title: "#",
      key: "index",
      width: 56,
      align: "center",
      render: (_value, _row, index) => index + 1,
    },
    {
      title: "ประเภทสินค้า",
      key: "classification",
      render: (_, row) => (
        <div>
          <strong>{row.classificationName || "-"}</strong>
          {row.classificationCode ? (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                รหัสประเภท: {row.classificationCode}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "สินค้าคลัง (Master Items)",
      key: "item",
      render: (_, row) =>
        row.itemCode ? (
          <div>
            <div>{row.itemCode}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.itemName || "-"}
            </Typography.Text>
          </div>
        ) : (
          <Typography.Text type="danger">
            ยังไม่ผูกสินค้า
            {row.classificationCode
              ? ` — ต้องมี item_code = ${row.classificationCode}`
              : ""}
          </Typography.Text>
        ),
    },
    {
      title: "น้ำหนัก (กก.)",
      dataIndex: "weightKg",
      key: "weightKg",
      align: "right",
      width: 130,
      render: (value: string) => formatWeight(value),
    },
    {
      title: "ราคา/กก.",
      dataIndex: "pricePerKg",
      key: "pricePerKg",
      align: "right",
      width: 120,
      render: (value: string) => formatMoney(value),
    },
    {
      title: "ยอดเงิน",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 130,
      render: (value: string) => (
        <strong>{formatMoney(value)}</strong>
      ),
    },
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
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/warehouse/stock-posting-approvals")}
          >
            กลับรายการอนุมัติ
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={detailQuery.isFetching}
              onClick={() => void detailQuery.refetch()}
            >
              รีเฟรช
            </Button>
            {isPending && canApprove ? (
              <>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  disabled={isBusy}
                  onClick={() => setRejectOpen(true)}
                >
                  ไม่อนุมัติ
                </Button>
                <Popconfirm
                  title="อนุมัติรับเข้าคลัง"
                  description="ระบบจะ POST สต๊อกจริงทันทีหลังอนุมัติ"
                  okText="อนุมัติ"
                  cancelText="ยกเลิก"
                  disabled={!canApproveNow}
                  onConfirm={handleApprove}
                >
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    className={styles.submitButton}
                    loading={approveMutation.isPending}
                    disabled={isBusy || hasUnlinkedItems}
                    title={
                      hasUnlinkedItems
                        ? "ผูก Master Items ให้ครบก่อนอนุมัติ"
                        : undefined
                    }
                  >
                    อนุมัติและรับเข้าคลัง
                  </Button>
                </Popconfirm>
              </>
            ) : null}
          </div>
        </div>

        {detailQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                โหลดรายละเอียดคำขอไม่สำเร็จ
              </Typography.Text>
            </div>
          </div>
        ) : request ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>รายละเอียดคำขอรับเข้าคลัง</h3>
                    <p>
                      {request.requestNo} · ใบรับซื้อ{" "}
                      {request.receipt?.receiptNo ?? request.receiptId}
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag
                      color={statusTagColor(request.status)}
                      className={styles.flowTag}
                    >
                      {STOCK_POSTING_REQUEST_STATUS_LABEL[request.status] ??
                        request.status}
                    </Tag>
                  </div>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.detailGrid}>
                  <DetailItem
                    label="คลังสินค้า"
                    value={
                      request.warehouseName
                        ? `${request.warehouseCode ?? ""} · ${request.warehouseName}`
                        : "-"
                    }
                  />
                  <DetailItem
                    label="ตำแหน่งจัดเก็บ"
                    value={
                      request.locationName
                        ? `${request.locationCode ?? ""} · ${request.locationName}`
                        : "-"
                    }
                  />
                  <DetailItem
                    label="วันที่รับเข้า"
                    value={formatDate(request.postingDate)}
                  />
                  <DetailItem
                    label="ผู้ขอ"
                    value={
                      request.requestedBy?.displayName ||
                      request.requestedBy?.username ||
                      request.requestedById
                    }
                  />
                  <DetailItem
                    label="วันเวลาที่ขอ"
                    value={formatDateTime(request.requestedAt)}
                  />
                  <DetailItem
                    label="น้ำหนักรวม"
                    value={`${formatWeight(totals.weight)} กก.`}
                  />
                  <DetailItem
                    label="หมายเหตุ"
                    value={request.remark || "-"}
                    fullWidth
                  />
                  {request.rejectReason ? (
                    <DetailItem
                      label="เหตุผลไม่อนุมัติ"
                      value={request.rejectReason}
                      fullWidth
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>รายการรับเข้า</h3>
                  <p>
                    {totals.count} รายการ · น้ำหนักรวม{" "}
                    {formatWeight(totals.weight)} กก. · มูลค่า{" "}
                    {formatMoney(totals.amount)} บาท
                  </p>
                </div>
              </div>
              {totals.unlinked.length > 0 ? (
                <div className={styles.cardBody} style={{ paddingBottom: 0 }}>
                  <Typography.Paragraph type="danger" style={{ marginBottom: 12 }}>
                    มี {totals.unlinked.length} รายการยังไม่ผูก Master Items —
                    ระบบจับคู่ด้วย{" "}
                    <strong>item_code = classification_code</strong>{" "}
                    (การเลือกประเภทยางตอนคัดแยกคนละตารางกับสินค้าคลัง)
                    {totals.unlinked[0]?.classificationCode
                      ? ` เช่น สร้างสินค้าที่รหัส ${totals.unlinked
                          .map((row) => row.classificationCode)
                          .filter(Boolean)
                          .join(", ")}`
                      : ""}
                  </Typography.Paragraph>
                </div>
              ) : null}
              <Table
                rowKey="id"
                size="middle"
                pagination={false}
                columns={itemColumns}
                dataSource={request.items ?? []}
                scroll={{ x: 860 }}
                locale={{ emptyText: "ไม่มีรายการรับเข้า" }}
                summary={() =>
                  totals.count > 0 ? (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <strong>รวม</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <strong>{formatWeight(totals.weight)}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} />
                        <Table.Summary.Cell index={5} align="right">
                          <strong>{formatMoney(totals.amount)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  ) : null
                }
              />
            </div>

            {isPending && !canApprove ? (
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <Typography.Text type="warning">
                    ต้องมีสิทธิ์หัวหน้าคลัง (WAREHOUSE_MANAGER)
                    เพื่ออนุมัติหรือไม่อนุมัติ
                  </Typography.Text>
                </div>
              </div>
            ) : null}

            {/* {isPending && canApprove ? (
              <div className={styles.card}>
                <div
                  className={styles.classificationActions}
                  style={{ justifyContent: "flex-end", marginTop: 0 }}
                >
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    disabled={isBusy}
                    onClick={() => setRejectOpen(true)}
                  >
                    ไม่อนุมัติ
                  </Button>
                  <Popconfirm
                    title="อนุมัติรับเข้าคลัง"
                    description="ระบบจะ POST สต๊อกจริงทันทีหลังอนุมัติ"
                    okText="อนุมัติ"
                    cancelText="ยกเลิก"
                    disabled={!canApproveNow}
                    onConfirm={handleApprove}
                  >
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      className={styles.submitButton}
                      loading={approveMutation.isPending}
                      disabled={isBusy || hasUnlinkedItems}
                    >
                      อนุมัติและรับเข้าคลัง
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            ) : null} */}
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
          destroyOnHidden
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

function DetailItem({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={
        fullWidth
          ? `${styles.detailItem} ${styles.detailItemFull}`
          : styles.detailItem
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
