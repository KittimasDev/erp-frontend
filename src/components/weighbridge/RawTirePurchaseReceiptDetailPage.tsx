"use client";

import { formatErpDate } from "@/lib/datetime/erp-timezone";
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
  formatDeductionDisplayName,
  PAYMENT_STATUS_LABELS,
  RAW_TIRE_FLOW_STEP_LABELS,
  RECEIPT_STATUS_COLORS,
  RECEIPT_STATUS_LABELS,
  STOCK_POSTING_STATUS_LABELS,
} from "@/types/raw-tire-purchase-receipt";
import styles from "./WeighbridgeDashboardPage.module.css";
import { useT } from "@/lib/i18n/useT";

import { appLocale, tLabel } from "./receiving-i18n";

function formatWeight(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString(appLocale(), {
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
  return n.toLocaleString(appLocale(), {
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
  return n.toLocaleString(appLocale(), {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return formatErpDate(value, "-");
}

type Props = {
  receiptId: string;
};

export default function RawTirePurchaseReceiptDetailPage({
  receiptId,
}: Props) {
  const t = useT();
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
      title: t("ลำดับ"),
      key: "sortOrder",
      width: 70,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t("รหัสประเภทสินค้า"),
      dataIndex: "classificationCode",
      key: "classificationCode",
      width: 140,
      render: (value?: string) => value || "-",
    },
    {
      title: t("ประเภทสินค้า"),
      dataIndex: "classificationName",
      key: "classificationName",
      render: (value?: string) => value || "-",
    },
    {
      title: t("น้ำหนัก (กก.)"),
      dataIndex: "weightKg",
      key: "weightKg",
      width: 130,
      align: "right",
      render: (value: string) => formatWeight(value),
    },
    {
      title: t("ราคา/กก."),
      dataIndex: "pricePerKg",
      key: "pricePerKg",
      width: 120,
      align: "right",
      render: (value: string) => formatPrice(value),
    },
    {
      title: t("ยอดเงิน"),
      dataIndex: "amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("หมายเหตุ"),
      dataIndex: "description",
      key: "description",
      render: (value?: string) => value || "-",
    },
  ];

  const deductionColumns: ColumnsType<ReceiptDeduction> = [
    {
      title: t("ลำดับ"),
      key: "index",
      width: 70,
      render: (_value, _record, index) => index + 1,
    },
    {
      title: t("รายการหัก"),
      key: "name",
      render: (_, row) => tLabel(formatDeductionDisplayName(row)),
    },
    {
      title: t("น้ำหนักหัก (กก.)"),
      dataIndex: "deductionWeightKg",
      key: "deductionWeightKg",
      width: 140,
      align: "right",
      render: (value: string) => formatWeight(value),
    },
    {
      title: t("ราคา/กก."),
      dataIndex: "deductionPricePerKg",
      key: "deductionPricePerKg",
      width: 120,
      align: "right",
      render: (value?: string) => (value ? formatPrice(value) : "-"),
    },
    {
      title: t("จำนวนเงินหัก"),
      dataIndex: "deductionAmount",
      key: "deductionAmount",
      width: 130,
      align: "right",
      render: (value: string) => formatMoney(value),
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
                  `/receiving/${receipt.weighbridgeTicketId}`,
                );
              } else {
                router.push("/receiving");
              }
            }}
          >
            {t("กลับ")}
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={receiptQuery.isFetching}
              onClick={() => receiptQuery.refetch()}
            >
              {t("รีเฟรช")}
            </Button>
            <Button
              icon={<PrinterOutlined />}
              disabled={!receipt?.canPrint || isBusy}
              loading={isPrinting}
              onClick={() => void handlePrint()}
            >
              {t("พิมพ์ใบรับซื้อ")}
            </Button>
          </div>
        </div>

        {receiptQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {receiptQuery.error instanceof Error
                  ? receiptQuery.error.message
                  : t("โหลดใบรับซื้อไม่สำเร็จ")}
              </Typography.Text>
            </div>
          </div>
        ) : receipt ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>{t("ใบรับซื้อยาง")}</h3>
                    <p>
                      {t("เลขที่ {no} · วันที่ {date}", { no: receipt.receiptNo, date: formatDate(receipt.receiptDate) })} ·{" "}
                      {receipt.seller.sellerName}
                      {receipt.truck?.licensePlate ||
                      receipt.ticket?.truckLicensePlate
                        ? ` · ${t("ทะเบียนรถ")} ${receipt.truck?.licensePlate || receipt.ticket?.truckLicensePlate}`
                        : ""}
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag
                      color={RECEIPT_STATUS_COLORS[receipt.status] ?? "default"}
                      className={styles.flowTag}
                    >
                      {tLabel(RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status)}
                    </Tag>
                    <Tag className={styles.flowTag}>
                      {tLabel(PAYMENT_STATUS_LABELS[receipt.paymentStatus] ??
                        receipt.paymentStatus)}
                    </Tag>
                    <Tag
                      className={styles.flowTag}
                      color={
                        receipt.stockPostingStatus === "POSTED"
                          ? "success"
                          : "default"
                      }
                    >
                      {tLabel(STOCK_POSTING_STATUS_LABELS[
                        receipt.stockPostingStatus
                      ] ?? receipt.stockPostingStatus)}
                    </Tag>
                    {receipt.currentStep ? (
                      <Tag color="blue" className={styles.flowTag}>
                        {tLabel(RAW_TIRE_FLOW_STEP_LABELS[receipt.currentStep] ??
                          receipt.currentStep)}
                      </Tag>
                    ) : null}
                  </div>
                </div>
              </div>
              {receipt.nextAction ? (
                <div className={styles.cardBody}>
                  <div className={styles.receiptRemarkBox}>
                    <span>{t("สถานะขั้นตอน")}</span>
                    <strong>
                      {receipt.currentStep === "COMPLETED" ||
                      receipt.stockPostingStatus === "POSTED"
                        ? t("เข้าคลังแล้ว")
                        : receipt.nextAction}
                    </strong>
                  </div>
                  {receipt.nextActionHref &&
                  receipt.status !== "DRAFT" &&
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
                        {t("ไปดำเนินการต่อ")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {receipt.remark ? (
                <div className={styles.cardBody}>
                  <div className={styles.receiptRemarkBox}>
                    <span>{t("หมายเหตุ")}</span>
                    <strong>{receipt.remark}</strong>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>{t("รายการประเภทสินค้า")}</h3>
                  <p>
                    {t("ต้องมีประเภทสินค้า + กฎราคาครบ แล้วคัดแยกจากตั๋ว จึงจะมีรายการที่นี่")}
                  </p>
                </div>
                <div className={styles.listHeaderActions}>
                  <div className={styles.masterLinksGroup}>
                    <span className={styles.masterLinksLabel}>Master</span>
                    <div className={styles.masterLinksButtons}>
                      <Button
                        size="small"
                        onClick={() =>
                          router.push("/masters/tire-classifications")
                        }
                      >
                        {t("ประเภทสินค้า")}
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          router.push("/masters/raw-tire-price-rules")
                        }
                      >
                        {t("กฎราคา")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {receipt.items.length === 0 && receipt.canEditClassification ? (
                <div className={styles.cardBody}>
                  <Typography.Text type="secondary">
                    {t("ยังไม่มีรายการคัดแยก — สร้างประเภท/กฎราคาที่ master แล้วกลับไปแก้ไขคัดแยกจากตั๋ว")}
                  </Typography.Text>
                  {receipt.weighbridgeTicketId ? (
                    <div className={styles.classificationActions}>
                      <Button
                        type="primary"
                        disabled={isBusy}
                        onClick={() =>
                          router.push(
                            `/receiving/${receipt.weighbridgeTicketId}`,
                          )
                        }
                      >
                        {t("ไปคัดแยกประเภทสินค้า")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Table
                rowKey="id"
                columns={itemColumns}
                dataSource={receipt.items}
                pagination={false}
                size="middle"
                scroll={{ x: 900 }}
                locale={{ emptyText: t("ไม่มีรายการประเภทสินค้า") }}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>{t("รายการหักสิ่งปนเปื้อน")}</h3>
                  <p>{t("เหตุผลการหักจาก description ของรายการหัก")}</p>
                </div>
              </div>
              <Table
                rowKey="id"
                columns={deductionColumns}
                dataSource={receipt.deductions}
                pagination={false}
                size="middle"
                locale={{ emptyText: t("ไม่มีรายการหัก") }}
                scroll={{ x: 760 }}
              />
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{t("สรุปยอดรวม")}</h3>
                <p>{t("น้ำหนักและจำนวนเงินที่คำนวณจากรายการ")}</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.receiptSummaryLayout}>
                  <div className={styles.receiptSummaryWeights}>
                    <SummaryItem
                      label={t("น้ำหนักสุทธิจากตั๋ว (กก.)")}
                      value={formatWeight(receipt.summary.netWeightKg)}
                    />
                    <SummaryItem
                      label={t("น้ำหนักหัก (กก.)")}
                      value={formatWeight(receipt.summary.deductionWeightKg)}
                    />
                    <SummaryItem
                      label={t("น้ำหนักที่จ่ายเงินจริง (กก.)")}
                      value={formatWeight(receipt.summary.payableWeightKg)}
                    />
                  </div>
                  <div className={styles.receiptSummaryMoney}>
                    <SummaryItem
                      label={t("ยอดก่อนหัก (บาท)")}
                      value={formatMoney(receipt.summary.subtotalAmount)}
                    />
                    <SummaryItem
                      label={t("ยอดหัก (บาท)")}
                      value={formatMoney(receipt.summary.deductionAmount)}
                    />
                    <SummaryItem
                      label={t("ยอดสุทธิ (บาท)")}
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
                              `/receiving/${receipt.weighbridgeTicketId}`,
                            );
                          }
                        }}
                      >
                        {t("กลับไปแก้ไขคัดแยก")}
                      </Button>
                      <Button
                        disabled={isBusy}
                        loading={recalculateMutation.isPending}
                        onClick={() => void recalculateMutation.mutateAsync()}
                      >
                        {t("คำนวณยอดใหม่")}
                      </Button>
                      <Popconfirm
                        title={t("ยืนยันยอดใบรับซื้อ")}
                        description={t("ระบบจะคำนวณยอดจากรายการในฐานข้อมูล แล้วล็อกยอดใบรับซื้อ (ยังไม่ใช่การจ่ายเงิน)")}
                        okText={t("ยืนยันยอด")}
                        cancelText={t("ยกเลิก")}
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
                          {t("ยืนยันยอดใบรับซื้อ")}
                        </Button>
                      </Popconfirm>
                      <Button
                        danger
                        disabled={!receipt.canCancel || isBusy}
                        onClick={() => setCancelOpen(true)}
                      >
                        {t("ยกเลิกใบรับซื้อ")}
                      </Button>
                    </>
                  ) : null}

                  {receipt.status === "CONFIRMED" ? (
                    <>
                      {receipt.canEditClassification &&
                      receipt.weighbridgeTicketId ? (
                        <Button
                          disabled={isBusy}
                          onClick={() =>
                            router.push(
                              `/receiving/${receipt.weighbridgeTicketId}`,
                            )
                          }
                        >
                          {t("แก้ไขคัดแยก")}
                        </Button>
                      ) : null}
                      <Button
                        icon={<PrinterOutlined />}
                        disabled={!receipt.canPrint || isBusy}
                        loading={isPrinting}
                        onClick={() => void handlePrint()}
                      >
                        {t("พิมพ์ใบรับซื้อ")}
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
                          {t("ไปหน้าจ่ายเงิน")}
                        </Button>
                      ) : null}
                      {receipt.paymentStatus === "PAID" &&
                      receipt.stockPostingStatus === "POSTED" ? (
                        <>
                          <Tag color="success">{t("เข้าคลังแล้ว")}</Tag>
                          <Button
                            type="primary"
                            className={styles.submitButton}
                            onClick={() =>
                              router.push(
                                `/receiving/receipts/${receiptId}/warehouse-receipt`,
                              )
                            }
                          >
                            {t("ดูใบรับเข้าคลัง")}
                          </Button>
                        </>
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
                          {receipt.nextAction || t("ส่งคำขอรับเข้าคลัง")}
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
                          {t("ส่งคำขอรับเข้าคลัง")}
                        </Button>
                      ) : null}
                    </>
                  ) : null}

                  {receipt.status === "CANCELLED" ? (
                    <Typography.Text type="secondary">
                      {t("ใบรับซื้อถูกยกเลิกแล้ว ดูได้อย่างเดียว")}
                    </Typography.Text>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <Modal
        title={t("ยกเลิกใบรับซื้อ")}
        open={cancelOpen}
        okText={t("ยืนยันยกเลิก")}
        cancelText={t("ปิด")}
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
          {t("กรุณาระบุเหตุผลการยกเลิก (จะบันทึกลงหมายเหตุใบรับซื้อ)")}
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          value={cancelReason}
          placeholder={t("เช่น น้ำหนักผิดพลาด ต้องชั่งใหม่")}
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
