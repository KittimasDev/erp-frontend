"use client";

import { useState } from "react";
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
  PrinterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCancelReceiptDetailMutation,
  useConfirmReceiptMutation,
  useRecalculateReceiptTotalsMutation,
} from "@/hooks/raw-tire-purchase/useReceiptDetailMutations";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import type {
  ReceiptDeduction,
  ReceiptItem,
} from "@/types/raw-tire-purchase-receipt";
import {
  DEDUCTION_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  RAW_TIRE_FLOW_STEP_LABELS,
  RECEIPT_STATUS_LABELS,
  STOCK_POSTING_STATUS_LABELS,
} from "@/types/raw-tire-purchase-receipt";
import styles from "./WeighbridgeDashboardPage.module.css";

function formatWeight(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

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

function formatPrice(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH");
}

function statusColor(status: string) {
  if (status === "CONFIRMED") {
    return "success";
  }
  if (status === "CANCELLED") {
    return "error";
  }
  return "processing";
}

type Props = {
  receiptId: string;
};

export default function RawTirePurchaseReceiptDetailPage({
  receiptId,
}: Props) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);

  const receiptQuery = useRawTirePurchaseReceiptQuery(receiptId);
  const receipt = receiptQuery.data?.data;

  const confirmMutation = useConfirmReceiptMutation(
    receiptId,
    receipt?.weighbridgeTicketId,
  );
  const cancelMutation = useCancelReceiptDetailMutation(
    receiptId,
    receipt?.weighbridgeTicketId,
  );
  const recalculateMutation = useRecalculateReceiptTotalsMutation(receiptId);

  const isBusy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    recalculateMutation.isPending ||
    isPrinting;

  const handlePrint = async () => {
    if (!receipt) {
      return;
    }
    setIsPrinting(true);
    try {
      const { generateRawTirePurchaseReceiptPdf, mapReceiptDetailToPdfData } =
        await import("@/utils/generateRawTirePurchaseReceiptPdf");
      await generateRawTirePurchaseReceiptPdf(
        mapReceiptDetailToPdfData(receipt),
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const itemColumns: ColumnsType<ReceiptItem> = [
    {
      title: "ลำดับ",
      key: "sortOrder",
      width: 70,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: "รหัสประเภทสินค้า",
      dataIndex: "classificationCode",
      key: "classificationCode",
      width: 140,
      render: (value?: string) => value || "-",
    },
    {
      title: "ประเภทสินค้า",
      dataIndex: "classificationName",
      key: "classificationName",
      render: (value?: string) => value || "-",
    },
    {
      title: "น้ำหนัก (กก.)",
      dataIndex: "weightKg",
      key: "weightKg",
      width: 130,
      align: "right",
      render: (value: string) => formatWeight(value),
    },
    {
      title: "ราคา/กก.",
      dataIndex: "pricePerKg",
      key: "pricePerKg",
      width: 120,
      align: "right",
      render: (value: string) => formatPrice(value),
    },
    {
      title: "ยอดเงิน",
      dataIndex: "amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: "หมายเหตุ",
      dataIndex: "description",
      key: "description",
      render: (value?: string) => value || "-",
    },
  ];

  const deductionColumns: ColumnsType<ReceiptDeduction> = [
    {
      title: "ลำดับ",
      key: "index",
      width: 70,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: "ประเภทการหัก",
      dataIndex: "deductionType",
      key: "deductionType",
      width: 140,
      render: (value: string) => DEDUCTION_TYPE_LABELS[value] ?? value,
    },
    {
      title: "น้ำหนักหัก (กก.)",
      dataIndex: "deductionWeightKg",
      key: "deductionWeightKg",
      width: 140,
      align: "right",
      render: (value: string) => formatWeight(value),
    },
    {
      title: "จำนวนเงินหัก",
      dataIndex: "deductionAmount",
      key: "deductionAmount",
      width: 130,
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: "รายละเอียด / เหตุผล",
      dataIndex: "description",
      key: "description",
      render: (value?: string) => value || "-",
    },
  ];

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      return;
    }
    await cancelMutation.mutateAsync({ reason: cancelReason.trim() });
    setCancelOpen(false);
    setCancelReason("");
  };

  return (
    <MasterPageGate isLoading={receiptQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              if (receipt?.weighbridgeTicketId) {
                router.push(
                  `/receiving/${receipt.weighbridgeTicketId}/classification`,
                );
              } else {
                router.push("/receiving");
              }
            }}
          >
            กลับ
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={receiptQuery.isFetching}
              onClick={() => receiptQuery.refetch()}
            >
              รีเฟรช
            </Button>
            <Button
              icon={<PrinterOutlined />}
              disabled={!receipt?.canPrint || isBusy}
              loading={isPrinting}
              onClick={() => void handlePrint()}
            >
              พิมพ์ใบรับซื้อ
            </Button>
          </div>
        </div>

        {receiptQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {receiptQuery.error instanceof Error
                  ? receiptQuery.error.message
                  : "โหลดใบรับซื้อไม่สำเร็จ"}
              </Typography.Text>
            </div>
          </div>
        ) : receipt ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>ใบรับซื้อยาง</h3>
                    <p>
                      เลขที่ {receipt.receiptNo} · วันที่{" "}
                      {formatDate(receipt.receiptDate)} ·{" "}
                      {receipt.seller.sellerName}
                      {receipt.truck?.licensePlate ||
                      receipt.ticket?.truckLicensePlate
                        ? ` · ทะเบียน ${receipt.truck?.licensePlate || receipt.ticket?.truckLicensePlate}`
                        : ""}
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag
                      color={statusColor(receipt.status)}
                      className={styles.flowTag}
                    >
                      {RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status}
                    </Tag>
                    <Tag className={styles.flowTag}>
                      {PAYMENT_STATUS_LABELS[receipt.paymentStatus] ??
                        receipt.paymentStatus}
                    </Tag>
                    <Tag
                      className={styles.flowTag}
                      color={
                        receipt.stockPostingStatus === "POSTED"
                          ? "success"
                          : "default"
                      }
                    >
                      {STOCK_POSTING_STATUS_LABELS[
                        receipt.stockPostingStatus
                      ] ?? receipt.stockPostingStatus}
                    </Tag>
                    {receipt.currentStep ? (
                      <Tag color="blue" className={styles.flowTag}>
                        {RAW_TIRE_FLOW_STEP_LABELS[receipt.currentStep] ??
                          receipt.currentStep}
                      </Tag>
                    ) : null}
                  </div>
                </div>
              </div>
              {receipt.nextAction ? (
                <div className={styles.cardBody}>
                  <div className={styles.receiptRemarkBox}>
                    <span>ขั้นตอนถัดไป</span>
                    <strong>
                      {receipt.currentStep === "COMPLETED" ||
                      receipt.stockPostingStatus === "POSTED"
                        ? "เข้าคลังแล้ว"
                        : receipt.nextAction}
                    </strong>
                  </div>
                  {receipt.nextActionHref &&
                  receipt.currentStep !== "COMPLETED" &&
                  receipt.stockPostingStatus !== "POSTED" ? (
                    <div
                      className={styles.weighActions}
                      style={{ marginTop: 12 }}
                    >
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(receipt.nextActionHref as string)
                        }
                      >
                        {receipt.nextAction}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {receipt.remark ? (
                <div className={styles.cardBody}>
                  <div className={styles.receiptRemarkBox}>
                    <span>หมายเหตุ</span>
                    <strong>{receipt.remark}</strong>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>รายการประเภทสินค้า</h3>
                  <p>รายการคัดแยกจากใบรับซื้อ</p>
                </div>
              </div>
              <Table
                rowKey="id"
                columns={itemColumns}
                dataSource={receipt.items}
                pagination={false}
                size="middle"
                scroll={{ x: 900 }}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>รายการหักสิ่งปนเปื้อน</h3>
                  <p>เหตุผลการหักจาก description ของรายการหัก</p>
                </div>
              </div>
              <Table
                rowKey="id"
                columns={deductionColumns}
                dataSource={receipt.deductions}
                pagination={false}
                size="middle"
                locale={{ emptyText: "ไม่มีรายการหัก" }}
                scroll={{ x: 760 }}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>สรุปยอดรวม</h3>
                <p>น้ำหนักและจำนวนเงินที่คำนวณจากรายการ</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.receiptSummaryLayout}>
                  <div className={styles.receiptSummaryWeights}>
                    <SummaryItem
                      label="น้ำหนักสุทธิจากตั๋ว (กก.)"
                      value={formatWeight(receipt.summary.netWeightKg)}
                    />
                    <SummaryItem
                      label="น้ำหนักหัก (กก.)"
                      value={formatWeight(receipt.summary.deductionWeightKg)}
                    />
                    <SummaryItem
                      label="น้ำหนักที่จ่ายเงินจริง (กก.)"
                      value={formatWeight(receipt.summary.payableWeightKg)}
                    />
                  </div>
                  <div className={styles.receiptSummaryMoney}>
                    <SummaryItem
                      label="ยอดก่อนหัก (บาท)"
                      value={formatMoney(receipt.summary.subtotalAmount)}
                    />
                    <SummaryItem
                      label="ยอดหัก (บาท)"
                      value={formatMoney(receipt.summary.deductionAmount)}
                    />
                    <SummaryItem
                      label="ยอดสุทธิ (บาท)"
                      value={formatMoney(receipt.summary.totalAmount)}
                      highlight
                    />
                  </div>
                </div>

                <div className={styles.classificationActions}>
                  {receipt.status === "DRAFT" ? (
                    <>
                      <Button
                        disabled={!receipt.canEditClassification || isBusy}
                        onClick={() => {
                          if (receipt.weighbridgeTicketId) {
                            router.push(
                              `/receiving/${receipt.weighbridgeTicketId}/classification`,
                            );
                          }
                        }}
                      >
                        กลับไปแก้ไขคัดแยก
                      </Button>
                      <Button
                        disabled={isBusy}
                        loading={recalculateMutation.isPending}
                        onClick={() => void recalculateMutation.mutateAsync()}
                      >
                        คำนวณยอดใหม่
                      </Button>
                      <Popconfirm
                        title="ยืนยันยอดใบรับซื้อ"
                        description="ระบบจะคำนวณยอดจากรายการในฐานข้อมูล แล้วล็อกยอดใบรับซื้อ (ยังไม่ใช่การจ่ายเงิน)"
                        okText="ยืนยันยอด"
                        cancelText="ยกเลิก"
                        disabled={!receipt.canConfirm || isBusy}
                        onConfirm={async () => {
                          await confirmMutation.mutateAsync();
                          router.push("/receiving");
                        }}
                      >
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          disabled={!receipt.canConfirm || isBusy}
                          loading={confirmMutation.isPending}
                        >
                          ยืนยันยอดใบรับซื้อ
                        </Button>
                      </Popconfirm>
                      <Button
                        danger
                        disabled={!receipt.canCancel || isBusy}
                        onClick={() => setCancelOpen(true)}
                      >
                        ยกเลิกใบรับซื้อ
                      </Button>
                    </>
                  ) : null}

                  {receipt.status === "CONFIRMED" ? (
                    <>
                      <Button
                        icon={<PrinterOutlined />}
                        disabled={!receipt.canPrint || isBusy}
                        loading={isPrinting}
                        onClick={() => void handlePrint()}
                      >
                        พิมพ์ใบรับซื้อ
                      </Button>
                      {receipt.paymentStatus !== "PAID" ? (
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          onClick={() =>
                            router.push(
                              `/receiving/receipts/${receiptId}/payment`,
                            )
                          }
                        >
                          ไปหน้าจ่ายเงิน
                        </Button>
                      ) : null}
                      {receipt.paymentStatus === "PAID" &&
                      receipt.stockPostingStatus === "POSTED" ? (
                        <Tag color="success">เข้าคลังแล้ว</Tag>
                      ) : null}
                      {receipt.paymentStatus === "PAID" &&
                      receipt.stockPostingStatus !== "POSTED" ? (
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          disabled={isBusy}
                          onClick={() =>
                            router.push(
                              receipt.nextActionHref ||
                                `/raw-tire-purchase/receipts/${receiptId}/stock-posting-request`,
                            )
                          }
                        >
                          {receipt.nextAction || "ส่งคำขอรับเข้าคลัง"}
                        </Button>
                      ) : null}
                      {receipt.paymentStatus !== "PAID" &&
                      receipt.stockPostingStatus !== "POSTED" ? (
                        <Button
                          type="default"
                          disabled={isBusy}
                          onClick={() =>
                            router.push(
                              `/raw-tire-purchase/receipts/${receiptId}/stock-posting-request`,
                            )
                          }
                        >
                          ส่งคำขอรับเข้าคลัง
                        </Button>
                      ) : null}
                    </>
                  ) : null}

                  {receipt.status === "CANCELLED" ? (
                    <Typography.Text type="secondary">
                      ใบรับซื้อถูกยกเลิกแล้ว ดูได้อย่างเดียว
                    </Typography.Text>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <Modal
        title="ยกเลิกใบรับซื้อ"
        open={cancelOpen}
        okText="ยืนยันยกเลิก"
        cancelText="ปิด"
        okButtonProps={{
          danger: true,
          disabled: !cancelReason.trim(),
          loading: cancelMutation.isPending,
        }}
        onCancel={() => {
          setCancelOpen(false);
          setCancelReason("");
        }}
        onOk={() => void handleCancel()}
      >
        <Typography.Paragraph>
          กรุณาระบุเหตุผลการยกเลิก (จะบันทึกลงหมายเหตุใบรับซื้อ)
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={cancelReason}
          placeholder="เช่น น้ำหนักผิดพลาด ต้องชั่งใหม่"
          onChange={(event) => setCancelReason(event.target.value)}
        />
      </Modal>
    </MasterPageGate>
  );
}

function SummaryItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? `${styles.summaryAmountItem} ${styles.summaryAmountHighlight}`
          : styles.summaryAmountItem
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
