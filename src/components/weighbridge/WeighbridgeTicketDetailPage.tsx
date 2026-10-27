"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import { useRawTirePaymentQuery } from "@/hooks/raw-tire-payment/useRawTirePaymentQuery";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useSellerQuery } from "@/hooks/sellers/useSellerQuery";
import { useStockPostingRequestByReceiptQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { useWeighbridgeTicketQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeTicketQuery";
import { useCanApproveStockPostingApprovals } from "@/lib/auth/stock-posting-access";
import { STOCK_POSTING_STATUS_LABELS } from "@/types/raw-tire-purchase-receipt";
import { StockPostingRequestStatus } from "@/types/stock-posting-request";
import { buildRawTireWarehouseReceiptSlipData } from "@/utils/buildRawTireWarehouseReceiptSlipData";

import ReceivingTicketClassifyWeighPanel from "./ReceivingTicketClassifyWeighPanel";
import T2900CameraPhotosGallery from "./T2900CameraPhotosGallery";
import styles from "./WeighbridgeDashboardPage.module.css";

const DISPLAY_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอกรอกน้ำหนัก",
  WAITING_WEIGH_OUT: "รอกรอกน้ำหนัก",
  WEIGHED_OUT: "ชั่งครบแล้ว",
  CANCELLED: "ยกเลิก",
  CLOSED: "ปิดแล้ว",
};

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายเงินแล้ว",
};

const FLOW_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอกรอกน้ำหนัก",
  WAITING_SORT: "รอคัดแยก",
  WAITING_WEIGH_OUT: "รอกรอกน้ำหนัก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอจ่ายเงิน",
  PAYMENT_PAID: "จ่ายเงินแล้ว",
  WAITING_STOCK_IN: "รอเข้าคลัง",
  STOCK_REQUEST_PENDING: "รอคลังเลือกคลังและอนุมัติ",
  STOCK_POSTED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
  OTHER: "อื่นๆ",
};

type PaymentView = {
  receiptId?: string;
  receiptNo?: string;
  receiptStatus?: string;
  paymentStatus?: string;
  flowState?: string;
  displayStatus?: string;
  grossWeightKg?: string;
};

function formatWeight(value?: string) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return value;
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("th-TH");
}

/** วันที่อย่างเดียว — ใช้ต่อท้ายเลขที่เอกสารในแถวเอกสารของแต่ละขั้น */
function formatDateOnly(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH");
}

function isPaymentPaid(view: PaymentView) {
  return (
    view.paymentStatus === "PAID" || view.flowState === "PAYMENT_PAID"
  );
}

function isPaymentReady(view: PaymentView) {
  if (isPaymentPaid(view)) {
    return false;
  }
  return (
    view.flowState === "WAITING_PAYMENT" ||
    view.flowState === "STOCK_REQUEST_PENDING" ||
    view.flowState === "STOCK_POSTED" ||
    view.flowState === "WAITING_STOCK_IN" ||
    ((view.receiptStatus === "CONFIRMED" ||
      view.receiptStatus === "APPROVED") &&
      view.paymentStatus !== "PAID")
  );
}

function hasActiveReceipt(view: PaymentView) {
  return Boolean(view.receiptId) && view.receiptStatus !== "CANCELLED";
}

function resolveStepFromCurrentStep(currentStep?: string) {
  switch (currentStep) {
    case "RECEIPT":
    case "WEIGH_IN":
    case "WEIGH_OUT":
      return 0;
    case "PAYMENT":
      return 1;
    case "STOCK_IN":
    case "COMPLETED":
      return 2;
    case "CANCELLED":
      return 0;
    default:
      return undefined;
  }
}

function resolveStep(view: PaymentView) {
  if (isPaymentReady(view)) {
    return 1;
  }
  if (
    view.flowState === "STOCK_POSTED" ||
    view.flowState === "WAITING_STOCK_IN" ||
    view.flowState === "STOCK_REQUEST_PENDING" ||
    isPaymentPaid(view)
  ) {
    return 2;
  }
  if (view.receiptId || view.displayStatus === "WEIGHED_OUT") {
    return 1;
  }
  return 0;
}

function resolvePaymentStatusLabel(view: PaymentView) {
  if (isPaymentPaid(view)) {
    return PAYMENT_STATUS_LABELS.PAID;
  }
  if (view.paymentStatus) {
    return PAYMENT_STATUS_LABELS[view.paymentStatus] ?? view.paymentStatus;
  }
  if (hasActiveReceipt(view)) {
    return PAYMENT_STATUS_LABELS.UNPAID;
  }
  return "ยังไม่มีใบรับซื้อ";
}

type Props = {
  ticketId: string;
};

export default function WeighbridgeTicketDetailPage({ ticketId }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingWarehouseSlip, setIsPrintingWarehouseSlip] = useState(false);
  const canApproveStockIn = useCanApproveStockPostingApprovals();

  const ticketQuery = useWeighbridgeTicketQuery(ticketId);
  const ticket = ticketQuery.data?.data;
  const receiptQuery = useRawTirePurchaseReceiptQuery(ticket?.receiptId ?? "");
  const receipt = receiptQuery.data?.data ?? null;
  const stockQuery = useStockPostingRequestByReceiptQuery(ticket?.receiptId);
  const stockRequest = stockQuery.data?.data ?? null;
  const sellerQuery = useSellerQuery(receipt?.seller?.id);
  const seller = sellerQuery.data?.data;

  const paymentQuery = useRawTirePaymentQuery(ticket?.receiptId ?? "");
  const paymentContext = paymentQuery.data?.data ?? null;
  const paymentReceipt = paymentQuery.data?.data?.receipt;
  const paymentVoucher = paymentQuery.data?.data?.voucher;
  const [printingVoucher, setPrintingVoucher] = useState(false);

  /*
    ย้ายมาจาก Step 1 พร้อมการ์ดใบสำคัญจ่าย — เอกสารใบนี้เป็นผลลัพธ์ของ Step 2
    lib pdf ต้อง dynamic import เท่านั้น (กฎใน .cursor/rules/erp.mdc)
  */
  const handlePrintVoucher = async () => {
    if (!paymentContext?.voucher) {
      message.warning("ยังไม่มีใบสำคัญจ่าย ให้กดออกใบจ่ายเงินก่อน");
      return;
    }
    setPrintingVoucher(true);
    try {
      const { generateRawTirePaymentVoucherPdf, mapPaymentContextToPdfData } =
        await import("@/utils/generateRawTirePaymentVoucherPdf");
      await generateRawTirePaymentVoucherPdf(
        // ส่ง receipt เข้าไปด้วย ใบสำคัญจ่ายจะได้พิมพ์ตารางรายการรับซื้อ
        mapPaymentContextToPdfData(paymentContext, receipt),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "พิมพ์ใบสำคัญจ่ายไม่สำเร็จ",
      );
    } finally {
      setPrintingVoucher(false);
    }
  };

  const paymentView = useMemo<PaymentView | null>(() => {
    if (!ticket) {
      return null;
    }
    const paymentStatus =
      paymentReceipt?.paymentStatus ?? ticket.receiptPaymentStatus;
    return {
      receiptId: ticket.receiptId,
      receiptNo: paymentReceipt?.receiptNo ?? ticket.receiptNo,
      receiptStatus: paymentReceipt?.status ?? ticket.receiptStatus,
      paymentStatus,
      flowState:
        paymentStatus === "PAID"
          ? ticket.flowState === "STOCK_POSTED" ||
            ticket.flowState === "WAITING_STOCK_IN" ||
            ticket.flowState === "STOCK_REQUEST_PENDING"
            ? ticket.flowState
            : "WAITING_STOCK_IN"
          : ticket.flowState,
      displayStatus: ticket.displayStatus,
      grossWeightKg: ticket.grossWeightKg,
    };
  }, [ticket, paymentReceipt]);

  const currentStep = useMemo(() => {
    // เข้าคลังก่อนจ่ายแล้วยังต้องโฟกัส Step จ่ายเงิน
    if (paymentView && isPaymentReady(paymentView)) {
      return 2;
    }
    const fromApi = resolveStepFromCurrentStep(ticket?.currentStep);
    if (fromApi !== undefined) {
      return fromApi;
    }
    return paymentView ? resolveStep(paymentView) : 0;
  }, [ticket?.currentStep, paymentView]);

  const paid = paymentView ? isPaymentPaid(paymentView) : false;
  const readyToPay = paymentView ? isPaymentReady(paymentView) : false;
  const hasReceipt = paymentView ? hasActiveReceipt(paymentView) : false;
  const stockPosted =
    paymentView?.flowState === "STOCK_POSTED" ||
    ticket?.currentStep === "COMPLETED";
  const stockRequestPending =
    paymentView?.flowState === "STOCK_REQUEST_PENDING" ||
    stockRequest?.status === StockPostingRequestStatus.PENDING_APPROVAL;
  const receiptConfirmed =
    paymentView?.receiptStatus === "CONFIRMED" ||
    paymentView?.receiptStatus === "APPROVED" ||
    ticket?.receiptStatus === "CONFIRMED" ||
    ticket?.receiptStatus === "APPROVED";
  const readyForStockIn =
    paid &&
    receiptConfirmed &&
    Boolean(ticket?.receiptId) &&
    !stockPosted &&
    !stockRequestPending;
  const canViewWarehouseSlip =
    stockPosted &&
    Boolean(receipt) &&
    Boolean(stockRequest) &&
    (receipt?.stockPostingStatus === "POSTED" ||
      stockRequest?.status === StockPostingRequestStatus.APPROVED);

  const lotsQuery = useInventoryLotsQuery(
    { q: receipt?.receiptNo },
    { enabled: Boolean(canViewWarehouseSlip && receipt?.receiptNo) },
  );
  const lots = lotsQuery.data?.data ?? [];

  const warehouseSlipData = useMemo(() => {
    if (!canViewWarehouseSlip || !receipt || !stockRequest) {
      return null;
    }
    return buildRawTireWarehouseReceiptSlipData({
      receipt,
      request: stockRequest,
      lots,
      sellerAddress: seller?.address,
      sellerTaxId: seller?.taxId,
    });
  }, [
    canViewWarehouseSlip,
    lots,
    receipt,
    seller?.address,
    seller?.taxId,
    stockRequest,
  ]);

  const warehouseSlipLoading =
    Boolean(stockPosted && ticket?.receiptId) &&
    (receiptQuery.isLoading ||
      stockQuery.isLoading ||
      (Boolean(canViewWarehouseSlip && receipt?.receiptNo) &&
        lotsQuery.isLoading) ||
      (Boolean(receipt?.seller?.id) && sellerQuery.isLoading));

  const maxStepIndex = 2;
  const nextActionHref = ticket?.nextActionHref;
  const nextActionLabel = ticket?.nextAction;

  const handlePrintTicket = async () => {
    if (!ticket) return;
    if (!ticket.weighOutAt) {
      message.warning("พิมพ์ตั๋วชั่งได้หลังบันทึกน้ำหนักครบแล้ว");
      return;
    }
    setIsPrinting(true);
    try {
      const { generateWeighbridgeTicketPdf, mapWeighbridgeTicketToPdfData } =
        await import("@/utils/generateWeighbridgeTicketPdf");
      await generateWeighbridgeTicketPdf(
        mapWeighbridgeTicketToPdfData({
          ticket,
          receipt,
          isPaid: paid,
        }),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "พิมพ์ตั๋วชั่งไม่สำเร็จ",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <MasterPageGate isLoading={ticketQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/receiving")}
          >
            กลับภาพรวม
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={<PrinterOutlined />}
              loading={isPrinting || receiptQuery.isFetching}
              disabled={!ticket?.weighOutAt}
              onClick={() => void handlePrintTicket()}
            >
              พิมพ์ตั๋วชั่ง
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={ticketQuery.isFetching || paymentQuery.isFetching}
              onClick={() => {
                void ticketQuery.refetch();
                void paymentQuery.refetch();
                if (ticket?.receiptId) {
                  void receiptQuery.refetch();
                }
              }}
            >
              รีเฟรช
            </Button>
          </div>
        </div>

        {ticketQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {ticketQuery.error instanceof Error
                  ? ticketQuery.error.message
                  : "โหลดรายละเอียดไม่สำเร็จ"}
              </Typography.Text>
            </div>
          </div>
        ) : ticket ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>ชั่งน้ำหนักรับซื้อยาง</h3>
                    <p>
                      เลขที่ตั๋ว {ticket.ticketNo} · สถานะตั๋ว {ticket.status}
                    </p>
                  </div>
                  <Tag className={styles.flowTag}>
                    {FLOW_LABELS[ticket.flowState ?? ""] ??
                      (paid ? FLOW_LABELS.PAYMENT_PAID : undefined) ??
                      DISPLAY_LABELS[ticket.displayStatus] ??
                      ticket.displayStatus}
                  </Tag>
                </div>
              </div>
              <div className={styles.cardBody}>
                <Steps
                  current={Math.min(currentStep, maxStepIndex)}
                  status={
                    stockPosted
                      ? "finish"
                      : ticket?.currentStep === "CANCELLED"
                        ? "error"
                        : "process"
                  }
                  items={[
                    { title: "คัดแยกและชั่ง" },
                    { title: "ออกใบจ่ายเงิน" },
                    { title: "เข้าคลัง" },
                  ]}
                />
                {nextActionLabel ? (
                  <div className={styles.weighActions} style={{ marginTop: 16 }}>
                    <Tag
                      color={
                        ticket?.currentStep === "COMPLETED" || stockPosted
                          ? "success"
                          : "processing"
                      }
                    >
                      {nextActionLabel}
                    </Tag>
                    {nextActionHref && ticket?.currentStep !== "COMPLETED" ? (
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() => router.push(nextActionHref)}
                      >
                        ไปดำเนินการต่อ
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>ข้อมูลตั๋วชั่ง</h3>
                <p>ผู้ขาย รถ คนขับ และเครื่องชั่ง</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.ticketInfoLayout}>
                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>ตั๋ว / ผู้ขาย</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>เลขที่ตั๋วชั่ง</span>
                        <strong>{ticket.ticketNo}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>วันที่เปิดตั๋ว</span>
                        <strong>{formatDateTime(ticket.createdAt)}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>ผู้ขาย</span>
                        <strong>{ticket.sellerName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>รหัสผู้ขาย</span>
                        <strong>{ticket.sellerCode || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>สถานะงาน</span>
                        <strong>
                          {DISPLAY_LABELS[ticket.displayStatus] ??
                            ticket.displayStatus}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>รถ / เครื่องชั่ง</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>ทะเบียนรถ</span>
                        <strong>{ticket.truckLicensePlate || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>จังหวัด</span>
                        <strong>{ticket.truckProvince || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>คนขับ</span>
                        <strong>{ticket.driverName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>เบอร์โทรคนขับ</span>
                        <strong>{ticket.driverPhone || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>เครื่องชั่ง</span>
                        <strong>
                          {ticket.scaleName
                            ? `${ticket.scaleCode ? `${ticket.scaleCode} · ` : ""}${ticket.scaleName}`
                            : "-"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {(Number(ticket.grossWeightKg) > 0 ||
                  Number(ticket.tareWeightKg) > 0 ||
                  Number(ticket.netWeightKg) > 0) && (
                  <div className={styles.ticketWeightCards}>
                    <div className={styles.ticketWeightCard}>
                      <span>น้ำหนักเข้า</span>
                      <strong>
                        {formatWeight(ticket.grossWeightKg)}
                        <em>กก.</em>
                      </strong>
                    </div>
                    <div className={styles.ticketWeightCard}>
                      <span>น้ำหนักออก</span>
                      <strong>
                        {formatWeight(ticket.tareWeightKg)}
                        <em>กก.</em>
                      </strong>
                    </div>
                    <div
                      className={`${styles.ticketWeightCard} ${styles.ticketWeightNet}`}
                    >
                      <span>น้ำหนักสุทธิ</span>
                      <strong>
                        {formatWeight(ticket.netWeightKg)}
                        <em>กก.</em>
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>รูปจากกล้องเครื่องชั่ง</h3>
                <p>ไฟล์ที่ส่งมากับบัตร T2900 (เข้า/ออก · กล้อง 1–2) — คลิกดูขยาย</p>
              </div>
              <div className={styles.cardBody}>
                <T2900CameraPhotosGallery ticketId={ticket.id} />
              </div>
            </div>

            <div className={styles.weighStepsStack}>
              <ReceivingTicketClassifyWeighPanel
                ticket={ticket}
                currentStep={currentStep}
              />

              <div
                className={[
                  styles.stepCard,
                  currentStep === 1 || (hasReceipt && !paid)
                    ? styles.stepCardActive
                    : "",
                  paid ? styles.stepCardDone : "",
                  !hasReceipt ? styles.stepCardLocked : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepCardHeader}>
                  <div className={styles.stepCardHeaderMain}>
                    <div
                      className={[
                        styles.stepBadge,
                        currentStep === 1 || readyToPay
                          ? styles.stepBadgeActive
                          : "",
                        paid ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      2
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 2 · ออกใบจ่ายเงิน</h3>
                      <p>
                        บันทึกโอน/จ่ายเงินจริงให้ผู้ขาย — เมื่อจ่ายสำเร็จระบบจะแจ้งคลังให้อนุมัติเข้าคลัง
                      </p>
                    </div>
                  </div>
                  <Tag
                    className={styles.stepStatusTag}
                    color={
                      paid
                        ? "success"
                        : readyToPay
                          ? "processing"
                          : hasReceipt
                            ? "warning"
                            : "default"
                    }
                  >
                    {paid
                      ? "จ่ายเงินแล้ว"
                      : readyToPay
                        ? "รอออกใบจ่ายเงิน"
                        : hasReceipt
                          ? "ตั๋วชั่งยังเป็นร่าง"
                          : "รอมีตั๋วชั่ง"}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>ใบรับซื้อ</span>
                      <strong>
                        {paymentView?.receiptNo
                          ? `${paymentView.receiptNo} (${RECEIPT_STATUS_LABELS[paymentView.receiptStatus ?? ""] ?? paymentView.receiptStatus ?? "-"})`
                          : "ยังไม่มี"}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>สถานะจ่ายเงิน</span>
                      <strong>
                        {paymentView
                          ? resolvePaymentStatusLabel(paymentView)
                          : "-"}
                        {paid && paymentVoucher?.voucherNo
                          ? ` · ${paymentVoucher.voucherNo}`
                          : ""}
                      </strong>
                    </div>
                  </div>

                  {/*
                    เอกสารของขั้นนี้ — ย้ายมาจาก Step 1 ซึ่งเดิมถือการ์ดใบสำคัญจ่ายไว้
                    ทั้งที่เอกสารใบนี้เกิดจาก Step 2 · ตอนยังไม่ออกใบก็ยังโชว์แถวไว้แบบจาง
                    ให้รู้ว่าขั้นนี้ต้องได้อะไรออกมา
                  */}
                  <div className={styles.stepDocList}>
                    <div
                      className={[
                        styles.stepDocRow,
                        paymentVoucher ? "" : styles.stepDocRowMuted,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className={styles.stepDocMain}>
                        <span className={styles.stepDocLabel}>ใบสำคัญจ่าย</span>
                        <span className={styles.stepDocValue}>
                          {paymentVoucher?.voucherNo ?? "ยังไม่ออก — กดปุ่มด้านล่างเพื่อออกใบจ่ายเงิน"}
                          {paymentVoucher?.voucherDate ? (
                            <span className={styles.stepDocMeta}>
                              ลว. {formatDateOnly(paymentVoucher.voucherDate)}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {paymentVoucher ? (
                        <div className={styles.stepDocActions}>
                          <Button
                            size="small"
                            type="primary"
                            icon={<PrinterOutlined />}
                            loading={printingVoucher}
                            onClick={() => void handlePrintVoucher()}
                          >
                            พิมพ์
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              router.push(
                                `/receiving/receipts/${ticket.receiptId}/payment`,
                              )
                            }
                          >
                            เปิด
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {paid ? null : readyToPay ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/payment`,
                          )
                        }
                      >
                        ออกใบจ่ายเงิน
                      </Button>
                    </div>
                  ) : hasReceipt ? (
                    <div className={styles.stepEmptyHint}>
                      ใบรับซื้อยังไม่พร้อมจ่าย — ตรวจยอดและยืนยันจาก Step 1
                    </div>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      บันทึกคัดแยกและน้ำหนักใน Step 1 ให้เสร็จก่อน แล้วจะได้ใบรับซื้อเพื่อออกใบจ่ายเงิน
                    </div>
                  )}
                </div>
              </div>

              <div
                className={[
                  styles.stepCard,
                  currentStep === 2 ||
                  readyForStockIn ||
                  stockRequestPending
                    ? styles.stepCardActive
                    : "",
                  stockPosted ? styles.stepCardDone : "",
                  !paid && !stockPosted
                    ? styles.stepCardLocked
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepCardHeader}>
                  <div className={styles.stepCardHeaderMain}>
                    <div
                      className={[
                        styles.stepBadge,
                        currentStep === 2 ||
                        readyForStockIn ||
                        stockRequestPending
                          ? styles.stepBadgeActive
                          : "",
                        stockPosted ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      3
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 3 · เข้าคลัง</h3>
                      <p>
                        คนคลังเลือกคลัง/ตำแหน่งแล้วกดอนุมัติ — ทำได้หลังจ่ายเงิน Step 2 เสร็จ
                      </p>
                    </div>
                  </div>
                  <Tag
                    className={styles.stepStatusTag}
                    color={
                      stockPosted
                        ? "success"
                        : stockRequestPending
                          ? "processing"
                          : readyForStockIn
                            ? "processing"
                            : "default"
                    }
                  >
                    {stockPosted
                      ? STOCK_POSTING_STATUS_LABELS.POSTED
                        : stockRequestPending
                        ? "รอคลังเลือกคลังและอนุมัติ"
                        : readyForStockIn
                          ? "รอคลังรับเข้า"
                          : paid
                            ? "พร้อมเข้าคลัง"
                            : receiptConfirmed
                              ? "รอจ่ายเงินก่อน"
                              : "รอยืนยันยอดก่อน"}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>ใบรับซื้อ</span>
                      <strong>
                        {ticket.receiptNo
                          ? `${ticket.receiptNo} (${RECEIPT_STATUS_LABELS[ticket.receiptStatus ?? ""] ?? ticket.receiptStatus ?? "-"})`
                          : "ยังไม่มี"}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>สถานะเข้าคลัง</span>
                      <strong>
                        {stockPosted
                          ? STOCK_POSTING_STATUS_LABELS.POSTED
                          : stockRequestPending
                            ? "รอคลังเลือกคลังและอนุมัติ"
                            : readyForStockIn
                              ? "รอคลังรับเข้า"
                              : "-"}
                      </strong>
                    </div>
                  </div>

                  {stockPosted ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        icon={<PrinterOutlined />}
                        disabled={!warehouseSlipData || isPrintingWarehouseSlip}
                        loading={
                          isPrintingWarehouseSlip || warehouseSlipLoading
                        }
                        onClick={() => {
                          if (!warehouseSlipData) return;
                          setIsPrintingWarehouseSlip(true);
                          void import(
                            "@/utils/generateRawTireWarehouseReceiptPdf"
                          )
                            .then(({ generateRawTireWarehouseReceiptPdf }) =>
                              generateRawTireWarehouseReceiptPdf(
                                warehouseSlipData,
                              ),
                            )
                            .finally(() => setIsPrintingWarehouseSlip(false));
                        }}
                      >
                        พิมพ์ใบรับสินค้า
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/warehouse-receipt`,
                          )
                        }
                      >
                        ดูเต็มจอ
                      </Button>
                    </div>
                  ) : stockRequestPending &&
                    ticket.receiptId &&
                    canApproveStockIn ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(
                            stockRequest?.id
                              ? `/warehouse/stock-posting-approvals/${stockRequest.id}`
                              : "/warehouse/stock-posting-approvals",
                          )
                        }
                      >
                        คลังเลือกคลังและอนุมัติ
                      </Button>
                    </div>
                  ) : paid &&
                    receiptConfirmed &&
                    ticket.receiptId &&
                    !stockPosted &&
                    canApproveStockIn ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push("/warehouse/stock-posting-approvals")
                        }
                      >
                        เปิดรายการรอคลังอนุมัติ
                      </Button>
                    </div>
                  ) : receiptConfirmed && !paid ? (
                    <div className={styles.stepEmptyHint}>
                      จ่ายเงินใน Step 2 ให้เสร็จก่อน ระบบจะแจ้งคลังให้อนุมัติเข้าคลัง
                    </div>
                  ) : stockRequestPending || readyForStockIn ? null : (
                    <div className={styles.stepEmptyHint}>
                      บันทึกคัดแยกและน้ำหนักใน Step 1 ให้เสร็จ แล้วจ่ายเงิน Step 2 ก่อนเข้าคลัง
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
