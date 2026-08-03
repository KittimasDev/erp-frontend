"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Steps,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
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
import {
  useWeighInMutation,
  useWeighOutMutation,
} from "@/hooks/weighbridge-tickets/useWeighTicketMutations";
import { STOCK_POSTING_STATUS_LABELS } from "@/types/raw-tire-purchase-receipt";
import { StockPostingRequestStatus } from "@/types/stock-posting-request";
import { buildRawTireWarehouseReceiptSlipData } from "@/utils/buildRawTireWarehouseReceiptSlipData";

import styles from "./WeighbridgeDashboardPage.module.css";

const DISPLAY_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอชั่งเข้า",
  WAITING_WEIGH_OUT: "รอชั่งออก",
  WEIGHED_OUT: "ชั่งออกแล้ว",
  CANCELLED: "ยกเลิก",
  CLOSED: "ปิดแล้ว",
};

const RECEIPT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "ยังไม่จ่าย",
  PARTIAL: "จ่ายบางส่วน",
  PAID: "จ่ายเงินแล้ว",
};

const FLOW_LABELS: Record<string, string> = {
  WAITING_WEIGH_IN: "รอชั่งเข้า",
  WAITING_SORT: "รอทำตั๋วชั่ง",
  WAITING_WEIGH_OUT: "รอชั่งออก",
  WAITING_APPROVAL: "รออนุมัติ",
  WAITING_PAYMENT: "รอออกใบจ่ายเงิน",
  PAYMENT_PAID: "จ่ายเงินแล้ว",
  WAITING_STOCK_IN: "รอเข้าคลัง",
  STOCK_REQUEST_PENDING: "รออนุมัติเข้าคลัง",
  STOCK_POSTED: "เข้าคลังแล้ว",
  CANCELLED: "ยกเลิก",
  OTHER: "อื่นๆ",
};

type WeighFormValues = {
  weightKg: number;
  isManual: boolean;
  reason?: string;
  remark?: string;
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

function isPaymentPaid(view: PaymentView) {
  return (
    view.paymentStatus === "PAID" ||
    view.flowState === "PAYMENT_PAID" ||
    view.flowState === "WAITING_STOCK_IN" ||
    view.flowState === "STOCK_REQUEST_PENDING" ||
    view.flowState === "STOCK_POSTED"
  );
}

function isPaymentReady(view: PaymentView) {
  if (isPaymentPaid(view)) {
    return false;
  }
  return (
    view.flowState === "WAITING_PAYMENT" ||
    (view.receiptStatus === "CONFIRMED" && view.paymentStatus !== "PAID")
  );
}

function hasActiveReceipt(view: PaymentView) {
  return Boolean(view.receiptId) && view.receiptStatus !== "CANCELLED";
}

function resolveStepFromCurrentStep(currentStep?: string) {
  switch (currentStep) {
    case "WEIGH_IN":
      return 0;
    case "WEIGH_OUT":
      return 1;
    case "RECEIPT":
      return 2;
    case "PAYMENT":
      return 3;
    case "STOCK_IN":
    case "COMPLETED":
      return 4;
    case "CANCELLED":
      return 0;
    default:
      return undefined;
  }
}

function resolveStep(view: PaymentView) {
  if (view.flowState === "STOCK_POSTED") {
    return 4;
  }
  if (
    isPaymentPaid(view) ||
    view.flowState === "WAITING_STOCK_IN" ||
    view.flowState === "STOCK_REQUEST_PENDING"
  ) {
    return 4;
  }
  if (isPaymentReady(view)) {
    return 3;
  }
  if (view.receiptId || view.displayStatus === "WEIGHED_OUT") {
    return 2;
  }
  if (
    view.displayStatus === "WAITING_WEIGH_OUT" ||
    Number(view.grossWeightKg) > 0
  ) {
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
  const [weighInForm] = Form.useForm<WeighFormValues>();
  const [weighOutForm] = Form.useForm<WeighFormValues>();
  const weighInManual = Form.useWatch("isManual", weighInForm);
  const weighOutManual = Form.useWatch("isManual", weighOutForm);
  const [weighInEditMode, setWeighInEditMode] = useState(false);
  const [weighOutEditMode, setWeighOutEditMode] = useState(false);
  const [weighInFlash, setWeighInFlash] = useState(false);
  const [weighOutFlash, setWeighOutFlash] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingWarehouseSlip, setIsPrintingWarehouseSlip] = useState(false);
  const prevGrossWeightRef = useRef<string | null>(null);
  const prevWeighOutKeyRef = useRef<string | null>(null);
  const weighInFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const weighOutFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const ticketQuery = useWeighbridgeTicketQuery(ticketId);
  const weighInMutation = useWeighInMutation(ticketId);
  const weighOutMutation = useWeighOutMutation(ticketId);
  const ticket = ticketQuery.data?.data;
  const receiptQuery = useRawTirePurchaseReceiptQuery(ticket?.receiptId ?? "");
  const receipt = receiptQuery.data?.data ?? null;
  const stockQuery = useStockPostingRequestByReceiptQuery(ticket?.receiptId);
  const stockRequest = stockQuery.data?.data ?? null;
  const sellerQuery = useSellerQuery(receipt?.seller?.id);
  const seller = sellerQuery.data?.data;

  useEffect(() => {
    if (!ticket) {
      return;
    }

    const triggerFlash = (
      setFlash: (value: boolean) => void,
      timerRef: { current: ReturnType<typeof setTimeout> | null },
    ) => {
      // รีสตาร์ท animation ทุกครั้งที่ค่าเปลี่ยน (รวมกรณีแก้ไขซ้ำ)
      setFlash(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      requestAnimationFrame(() => {
        setFlash(true);
        timerRef.current = setTimeout(() => {
          setFlash(false);
        }, 1600);
      });
    };

    // รวม weighInAt — แก้/บันทึกใหม่จะอัปเดตเวลาเสมอ แม้ตัวเลขน้ำหนักเท่าเดิม
    const grossKey = `${ticket.grossWeightKg ?? ""}:${ticket.weighInAt ?? ""}:${ticket.weighInRemark ?? ""}`;
    const weighOutKey = `${ticket.tareWeightKg ?? ""}:${ticket.weighOutAt ?? ""}:${ticket.weighOutRemark ?? ""}`;

    if (prevGrossWeightRef.current === null) {
      prevGrossWeightRef.current = grossKey;
    } else if (prevGrossWeightRef.current !== grossKey) {
      prevGrossWeightRef.current = grossKey;
      triggerFlash(setWeighInFlash, weighInFlashTimerRef);
    }

    if (prevWeighOutKeyRef.current === null) {
      prevWeighOutKeyRef.current = weighOutKey;
    } else if (prevWeighOutKeyRef.current !== weighOutKey) {
      prevWeighOutKeyRef.current = weighOutKey;
      triggerFlash(setWeighOutFlash, weighOutFlashTimerRef);
    }
  }, [ticket]);

  useEffect(() => {
    return () => {
      if (weighInFlashTimerRef.current) {
        clearTimeout(weighInFlashTimerRef.current);
      }
      if (weighOutFlashTimerRef.current) {
        clearTimeout(weighOutFlashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    prevGrossWeightRef.current = null;
    prevWeighOutKeyRef.current = null;
    setWeighInFlash(false);
    setWeighOutFlash(false);
  }, [ticketId]);

  const paymentQuery = useRawTirePaymentQuery(ticket?.receiptId ?? "");
  const paymentReceipt = paymentQuery.data?.data?.receipt;
  const paymentVoucher = paymentQuery.data?.data?.voucher;

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
    paymentView?.flowState === "STOCK_REQUEST_PENDING";
  const readyForStockIn = paid && Boolean(ticket?.receiptId) && !stockPosted;
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

  const maxStepIndex = 4;
  const nextActionHref = ticket?.nextActionHref;
  const nextActionLabel = ticket?.nextAction;

  const canCreateWeighIn = Boolean(ticket?.canWeighIn);
  const canCreateWeighOut = Boolean(ticket?.canWeighOut);
  const canUpdateWeighIn = Boolean(ticket?.canEditWeighIn);
  const canUpdateWeighOut = Boolean(ticket?.canEditWeighOut);
  const showWeighInForm = canCreateWeighIn || (canUpdateWeighIn && weighInEditMode);
  const showWeighOutForm =
    canCreateWeighOut || (canUpdateWeighOut && weighOutEditMode);

  const handlePrintTicket = async () => {
    if (!ticket) return;
    if (!ticket.weighOutAt) {
      message.warning("พิมพ์ตั๋วชั่งได้หลังชั่งออกครบแล้ว");
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
  const isUpdatingWeighIn = canUpdateWeighIn && weighInEditMode;
  const isUpdatingWeighOut = canUpdateWeighOut && weighOutEditMode;
  const weightEditWillResetReceipt = Boolean(ticket?.receiptId);

  useEffect(() => {
    if (!canUpdateWeighIn) {
      setWeighInEditMode(false);
    }
  }, [canUpdateWeighIn]);

  useEffect(() => {
    if (!canUpdateWeighOut) {
      setWeighOutEditMode(false);
    }
  }, [canUpdateWeighOut]);

  useEffect(() => {
    if (!ticket || !showWeighInForm) {
      return;
    }
    weighInForm.setFieldsValue({
      weightKg:
        Number(ticket.grossWeightKg) > 0
          ? Number(ticket.grossWeightKg)
          : undefined,
      isManual: true,
      reason: isUpdatingWeighIn ? "แก้ไขน้ำหนักเข้า" : undefined,
      remark: ticket.weighInRemark || undefined,
    });
  }, [ticket, showWeighInForm, isUpdatingWeighIn, weighInForm]);

  useEffect(() => {
    if (!ticket || !showWeighOutForm) {
      return;
    }
    weighOutForm.setFieldsValue({
      weightKg:
        ticket.weighOutAt && Number(ticket.tareWeightKg) > 0
          ? Number(ticket.tareWeightKg)
          : undefined,
      isManual: true,
      reason: isUpdatingWeighOut ? "แก้ไขน้ำหนักออก" : undefined,
      remark: ticket.weighOutRemark || undefined,
    });
  }, [ticket, showWeighOutForm, isUpdatingWeighOut, weighOutForm]);

  const handleWeighIn = async (values: WeighFormValues) => {
    await weighInMutation.mutateAsync({
      weightKg: values.weightKg,
      isManual: Boolean(values.isManual),
      reason: values.isManual
        ? values.reason?.trim() ||
          (isUpdatingWeighIn ? "แก้ไขน้ำหนักเข้า" : undefined)
        : undefined,
      remark: values.remark?.trim() || undefined,
    });
    setWeighInEditMode(false);
  };

  const handleWeighOut = async (values: WeighFormValues) => {
    await weighOutMutation.mutateAsync({
      weightKg: values.weightKg,
      isManual: Boolean(values.isManual),
      reason: values.isManual
        ? values.reason?.trim() ||
          (isUpdatingWeighOut ? "แก้ไขน้ำหนักออก" : undefined)
        : undefined,
      remark: values.remark?.trim() || undefined,
    });
    setWeighOutEditMode(false);
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
                    { title: "ชั่งเข้า" },
                    { title: "ชั่งออก" },
                    { title: "ตั๋วชั่ง" },
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

            <div className={styles.weighStepsStack}>
              <div className={styles.weighGrid}>
                <div
                  className={[
                    styles.stepCard,
                    currentStep === 0 ? styles.stepCardActive : "",
                    Number(ticket.grossWeightKg) > 0 ? styles.stepCardDone : "",
                    weighInFlash ? styles.stepCardFlash : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {weighInFlash ? (
                    <div className={styles.stepCardUpdateBanner} aria-live="polite">
                      <span>มีการอัปเดต</span>
                    </div>
                  ) : null}
                  <div className={styles.stepCardHeader}>
                    <div className={styles.stepCardHeaderMain}>
                      <div
                        className={[
                          styles.stepBadge,
                          currentStep === 0 ? styles.stepBadgeActive : "",
                          Number(ticket.grossWeightKg) > 0
                            ? styles.stepBadgeDone
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        1
                      </div>
                      <div className={styles.stepCardTitle}>
                        <h3>Step 1 · น้ำหนักเข้า</h3>
                        <p>บันทึกน้ำหนักเมื่อรถเข้าชั่ง (Gross)</p>
                      </div>
                    </div>
                    <div className={styles.stepHeaderActions}>
                      {canUpdateWeighIn && !weighInEditMode ? (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setWeighInEditMode(true)}
                        >
                          แก้ไข
                        </Button>
                      ) : null}
                      <Tag
                        className={styles.stepStatusTag}
                        color={
                          Number(ticket.grossWeightKg) > 0
                            ? "success"
                            : currentStep === 0
                              ? "processing"
                              : "default"
                        }
                      >
                        {Number(ticket.grossWeightKg) > 0
                          ? "เสร็จแล้ว"
                          : currentStep === 0
                            ? "กำลังทำ"
                            : "รอทำ"}
                      </Tag>
                    </div>
                  </div>
                  <div className={styles.stepCardBody}>
                    {showWeighInForm ? (
                      <Form
                        form={weighInForm}
                        layout="vertical"
                        className={styles.weighFormInline}
                        initialValues={{ isManual: true }}
                        onFinish={handleWeighIn}
                        requiredMark="optional"
                      >
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักเข้า (กก.)</span>
                            <Form.Item
                              name="weightKg"
                              rules={[
                                {
                                  required: true,
                                  message: "กรุณากรอกน้ำหนักเข้า",
                                },
                              ]}
                            >
                              <InputNumber
                                min={0.001}
                                step={0.001}
                                precision={3}
                                size="large"
                                className={styles.stepMetaInput}
                                placeholder="เช่น 18500.500"
                              />
                            </Form.Item>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งเข้า</span>
                            <strong>{formatDateTime(ticket.weighInAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>
                              {isUpdatingWeighIn
                                ? ticket.weighInReadSource || "กรอกเอง"
                                : "กรอกเอง"}
                            </strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <Form.Item name="remark">
                              <Input.TextArea
                                className={styles.stepMetaTextArea}
                                rows={2}
                                placeholder="หมายเหตุเพิ่มเติม"
                              />
                            </Form.Item>
                          </div>
                        </div>

                        <div className={styles.stepMetaControls}>
                          <div className={styles.stepMetaControlItem}>
                            <span>กรอกน้ำหนักเอง</span>
                            <Form.Item name="isManual" valuePropName="checked">
                              <Switch
                                checkedChildren="ใช่"
                                unCheckedChildren="ไม่"
                              />
                            </Form.Item>
                          </div>
                          {weighInManual ? (
                            <div
                              className={`${styles.stepMetaControlItem} ${styles.stepMetaControlFull}`}
                            >
                              <span>เหตุผลการกรอกเอง</span>
                              <Form.Item
                                name="reason"
                                rules={
                                  isUpdatingWeighIn
                                    ? undefined
                                    : [
                                        {
                                          required: true,
                                          message:
                                            "กรุณาระบุเหตุผลการกรอกเอง",
                                        },
                                      ]
                                }
                              >
                                <Input.TextArea
                                  rows={2}
                                  placeholder="เช่น เครื่องชั่งยังไม่เชื่อมต่อ"
                                />
                              </Form.Item>
                            </div>
                          ) : null}
                        </div>

                        {isUpdatingWeighIn && weightEditWillResetReceipt ? (
                          <div className={styles.stepEmptyHint}>
                            แก้ไขน้ำหนักแล้ว ระบบจะยกเลิกใบรับซื้อปัจจุบัน
                            และต้องทำตั๋วชั่งใหม่ที่ Step 3
                          </div>
                        ) : null}

                        <div className={styles.weighActions}>
                          <Button disabled>อ่านน้ำหนักจากเครื่องชั่ง</Button>
                          {isUpdatingWeighIn ? (
                            <Button onClick={() => setWeighInEditMode(false)}>
                              ยกเลิก
                            </Button>
                          ) : null}
                          {isUpdatingWeighIn && weightEditWillResetReceipt ? (
                            <Popconfirm
                              title="ยืนยันแก้ไขน้ำหนักเข้า"
                              description="ใบรับซื้อที่มีอยู่จะถูกยกเลิก และต้องทำตั๋วชั่งใหม่ที่ Step 3"
                              okText="ยืนยัน"
                              cancelText="ยกเลิก"
                              onConfirm={() => void weighInForm.submit()}
                            >
                              <Button
                                type="primary"
                                className={styles.submitButton}
                                loading={weighInMutation.isPending}
                              >
                                บันทึกการแก้ไขชั่งเข้า
                              </Button>
                            </Popconfirm>
                          ) : (
                            <Button
                              type="primary"
                              htmlType="submit"
                              className={styles.submitButton}
                              loading={weighInMutation.isPending}
                            >
                              {isUpdatingWeighIn
                                ? "บันทึกการแก้ไขชั่งเข้า"
                                : "บันทึกชั่งเข้า"}
                            </Button>
                          )}
                        </div>
                      </Form>
                    ) : (
                      <>
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักเข้า</span>
                            <strong>
                              {formatWeight(ticket.grossWeightKg)} กก.
                            </strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งเข้า</span>
                            <strong>{formatDateTime(ticket.weighInAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>{ticket.weighInReadSource || "-"}</strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <strong>{ticket.weighInRemark || "-"}</strong>
                          </div>
                        </div>
                        {paid ? (
                          <div className={styles.stepEmptyHint}>
                            จ่ายเงินแล้ว ไม่สามารถแก้ไขน้ำหนักเข้าได้
                          </div>
                        ) : Number(ticket.grossWeightKg) <= 0 ? (
                          <div className={styles.stepEmptyHint}>
                            ไม่สามารถบันทึกชั่งเข้าได้ในสถานะนี้
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                <div
                  className={[
                    styles.stepCard,
                    currentStep === 1 ? styles.stepCardActive : "",
                    ticket.weighOutAt ? styles.stepCardDone : "",
                    !ticket.canWeighOut && !ticket.weighOutAt
                      ? styles.stepCardLocked
                      : "",
                    weighOutFlash ? styles.stepCardFlash : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {weighOutFlash ? (
                    <div className={styles.stepCardUpdateBanner} aria-live="polite">
                      <span>มีการอัปเดต</span>
                    </div>
                  ) : null}
                  <div className={styles.stepCardHeader}>
                    <div className={styles.stepCardHeaderMain}>
                      <div
                        className={[
                          styles.stepBadge,
                          currentStep === 1 ? styles.stepBadgeActive : "",
                          ticket.weighOutAt ? styles.stepBadgeDone : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        2
                      </div>
                      <div className={styles.stepCardTitle}>
                        <h3>Step 2 · น้ำหนักออก</h3>
                        <p>บันทึกน้ำหนักหลังถ่ายยาง (Tare) แล้วคำนวณสุทธิ</p>
                      </div>
                    </div>
                    <div className={styles.stepHeaderActions}>
                      {canUpdateWeighOut && !weighOutEditMode ? (
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => setWeighOutEditMode(true)}
                        >
                          แก้ไข
                        </Button>
                      ) : null}
                      <Tag
                        className={styles.stepStatusTag}
                        color={
                          ticket.weighOutAt
                            ? "success"
                            : currentStep === 1
                              ? "processing"
                              : "default"
                        }
                      >
                        {ticket.weighOutAt
                          ? "เสร็จแล้ว"
                          : currentStep === 1
                            ? "กำลังทำ"
                            : "รอทำ"}
                      </Tag>
                    </div>
                  </div>
                  <div className={styles.stepCardBody}>
                    {showWeighOutForm ? (
                      <Form
                        form={weighOutForm}
                        layout="vertical"
                        className={styles.weighFormInline}
                        initialValues={{ isManual: true }}
                        onFinish={handleWeighOut}
                        requiredMark="optional"
                      >
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักออก (กก.)</span>
                            <Form.Item
                              name="weightKg"
                              rules={[
                                {
                                  required: true,
                                  message: "กรุณากรอกน้ำหนักออก",
                                },
                              ]}
                            >
                              <InputNumber
                                min={0.001}
                                step={0.001}
                                precision={3}
                                size="large"
                                className={styles.stepMetaInput}
                                placeholder="เช่น 8500.250"
                              />
                            </Form.Item>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักสุทธิ</span>
                            <strong>
                              {isUpdatingWeighOut
                                ? `จะคำนวณใหม่หลังบันทึก (เข้า ${formatWeight(ticket.grossWeightKg)} กก.)`
                                : `จะคำนวณหลังบันทึก (เข้า ${formatWeight(ticket.grossWeightKg)} กก.)`}
                            </strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งออก</span>
                            <strong>{formatDateTime(ticket.weighOutAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>
                              {isUpdatingWeighOut
                                ? ticket.weighOutReadSource || "กรอกเอง"
                                : "กรอกเอง"}
                            </strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <Form.Item name="remark">
                              <Input.TextArea
                                className={styles.stepMetaTextArea}
                                rows={2}
                                placeholder="หมายเหตุเพิ่มเติม"
                              />
                            </Form.Item>
                          </div>
                        </div>

                        <div className={styles.stepMetaControls}>
                          <div className={styles.stepMetaControlItem}>
                            <span>กรอกน้ำหนักเอง</span>
                            <Form.Item name="isManual" valuePropName="checked">
                              <Switch
                                checkedChildren="ใช่"
                                unCheckedChildren="ไม่"
                              />
                            </Form.Item>
                          </div>
                          {weighOutManual ? (
                            <div
                              className={`${styles.stepMetaControlItem} ${styles.stepMetaControlFull}`}
                            >
                              <span>เหตุผลการกรอกเอง</span>
                              <Form.Item
                                name="reason"
                                rules={
                                  isUpdatingWeighOut
                                    ? undefined
                                    : [
                                        {
                                          required: true,
                                          message:
                                            "กรุณาระบุเหตุผลการกรอกเอง",
                                        },
                                      ]
                                }
                              >
                                <Input.TextArea
                                  rows={2}
                                  placeholder="เช่น อ่านค่าจากหน้าจอเครื่องชั่ง"
                                />
                              </Form.Item>
                            </div>
                          ) : null}
                        </div>

                        {isUpdatingWeighOut && weightEditWillResetReceipt ? (
                          <div className={styles.stepEmptyHint}>
                            แก้ไขน้ำหนักแล้ว ระบบจะยกเลิกใบรับซื้อปัจจุบัน
                            และต้องทำตั๋วชั่งใหม่ที่ Step 3
                          </div>
                        ) : null}

                        <div className={styles.weighActions}>
                          <Button disabled>อ่านน้ำหนักจากเครื่องชั่ง</Button>
                          {isUpdatingWeighOut ? (
                            <Button onClick={() => setWeighOutEditMode(false)}>
                              ยกเลิก
                            </Button>
                          ) : null}
                          {isUpdatingWeighOut && weightEditWillResetReceipt ? (
                            <Popconfirm
                              title="ยืนยันแก้ไขน้ำหนักออก"
                              description="ใบรับซื้อที่มีอยู่จะถูกยกเลิก และต้องทำตั๋วชั่งใหม่ที่ Step 3"
                              okText="ยืนยัน"
                              cancelText="ยกเลิก"
                              onConfirm={() => void weighOutForm.submit()}
                            >
                              <Button
                                type="primary"
                                className={styles.submitButton}
                                loading={weighOutMutation.isPending}
                              >
                                บันทึกการแก้ไขชั่งออก
                              </Button>
                            </Popconfirm>
                          ) : (
                            <Button
                              type="primary"
                              htmlType="submit"
                              className={styles.submitButton}
                              loading={weighOutMutation.isPending}
                            >
                              {isUpdatingWeighOut
                                ? "บันทึกการแก้ไขชั่งออก"
                                : "บันทึกชั่งออก"}
                            </Button>
                          )}
                        </div>
                      </Form>
                    ) : (
                      <>
                        <div className={styles.stepMetaGrid}>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักออก</span>
                            <strong>
                              {ticket.weighOutAt
                                ? `${formatWeight(ticket.tareWeightKg)} กก.`
                                : "-"}
                            </strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                          >
                            <span>น้ำหนักสุทธิ</span>
                            <strong>
                              {ticket.weighOutAt
                                ? `${formatWeight(ticket.netWeightKg)} กก.`
                                : "-"}
                            </strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>เวลาชั่งออก</span>
                            <strong>{formatDateTime(ticket.weighOutAt)}</strong>
                          </div>
                          <div className={styles.stepMetaItem}>
                            <span>แหล่งน้ำหนัก</span>
                            <strong>{ticket.weighOutReadSource || "-"}</strong>
                          </div>
                          <div
                            className={`${styles.stepMetaItem} ${styles.stepMetaFull}`}
                          >
                            <span>หมายเหตุ</span>
                            <strong>{ticket.weighOutRemark || "-"}</strong>
                          </div>
                        </div>
                        {paid ? (
                          <div className={styles.stepEmptyHint}>
                            จ่ายเงินแล้ว ไม่สามารถแก้ไขน้ำหนักออกได้
                          </div>
                        ) : !ticket.weighOutAt ? (
                          <div className={styles.stepEmptyHint}>
                            ต้องบันทึกชั่งเข้าก่อน จึงจะชั่งออกได้
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={[
                  styles.stepCard,
                  currentStep === 2 ? styles.stepCardActive : "",
                  ticket.receiptId ? styles.stepCardDone : "",
                  !(
                    ticket.displayStatus === "WEIGHED_OUT" || ticket.receiptId
                  )
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
                        currentStep === 2 ? styles.stepBadgeActive : "",
                        ticket.receiptId ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      3
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 3 · ตั๋วชั่ง</h3>
                      <p>
                        คัดแยกรายการยาง บันทึกน้ำหนัก/การหัก
                        แล้วยืนยันยอดก่อนออกใบจ่ายเงิน
                      </p>
                    </div>
                  </div>
                  <Tag
                    className={styles.stepStatusTag}
                    color={
                      ticket.receiptId
                        ? "success"
                        : currentStep === 2
                          ? "processing"
                          : "default"
                    }
                  >
                    {ticket.receiptId
                      ? "มีตั๋วชั่งแล้ว"
                      : currentStep === 2
                        ? "พร้อมทำตั๋วชั่ง"
                        : "รอชั่งออก"}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>น้ำหนักสุทธิ</span>
                      <strong>
                        {ticket.weighOutAt
                          ? `${formatWeight(ticket.netWeightKg)} กก.`
                          : "-"}
                      </strong>
                    </div>
                    <div className={styles.stepMetaItem}>
                      <span>ตั๋วชั่ง / ใบรับซื้อ</span>
                      <strong>
                        {ticket.receiptNo
                          ? `${ticket.receiptNo} (${RECEIPT_STATUS_LABELS[ticket.receiptStatus ?? ""] ?? ticket.receiptStatus ?? "-"})`
                          : "ยังไม่มี — ต้องทำตั๋วชั่งก่อน"}
                      </strong>
                    </div>
                  </div>

                  {ticket.displayStatus === "WEIGHED_OUT" ||
                  ticket.receiptId ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      {!ticket.receiptId ? (
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          onClick={() =>
                            router.push(
                              `/receiving/${ticketId}/classification`,
                            )
                          }
                        >
                          ทำตั๋วชั่ง
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="primary"
                            className={styles.submitButton}
                            onClick={() =>
                              router.push(
                                `/receiving/receipts/${ticket.receiptId}`,
                              )
                            }
                          >
                            เปิดตั๋วชั่ง {ticket.receiptNo}
                          </Button>
                          <Button
                            onClick={() =>
                              router.push(
                                `/receiving/${ticketId}/classification`,
                              )
                            }
                          >
                            แก้ไขตั๋วชั่ง
                          </Button>
                          <Button
                            icon={<PrinterOutlined />}
                            loading={isPrinting}
                            onClick={() => void handlePrintTicket()}
                          >
                            พิมพ์ตั๋วชั่ง
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      บันทึกชั่งเข้าและชั่งออกให้ครบก่อน แล้วค่อยทำตั๋วชั่ง
                    </div>
                  )}
                </div>
              </div>

              <div
                className={[
                  styles.stepCard,
                  currentStep === 3 || (hasReceipt && !paid)
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
                        currentStep === 3 || readyToPay
                          ? styles.stepBadgeActive
                          : "",
                        paid ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      4
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 4 · ออกใบจ่ายเงิน</h3>
                      <p>
                        บันทึกโอน/จ่ายเงินจริงให้ผู้ขาย ตามยอดจากตั๋วชั่งที่ยืนยันแล้ว
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

                  {paid ? (
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
                        ดูใบสำคัญจ่าย
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}`,
                          )
                        }
                      >
                        เปิดใบรับซื้อ
                      </Button>
                    </div>
                  ) : readyToPay ? (
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
                    <>
                      <div className={styles.stepEmptyHint}>
                        ตั๋วชั่งยังเป็นร่าง — กด “ยืนยันยอด” ในหน้ารายละเอียดก่อน
                        (ล็อกยอดน้ำหนัก/เงิน) แล้วค่อยกลับมาออกใบจ่ายเงินที่ Step นี้
                      </div>
                      <div className={styles.weighActions} style={{ marginTop: 16 }}>
                        <Button
                          type="primary"
                          className={styles.submitButton}
                          onClick={() =>
                            router.push(
                              `/receiving/receipts/${ticket.receiptId}`,
                            )
                          }
                        >
                          เปิดตั๋วชั่งเพื่อยืนยันยอด
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      ทำตั๋วชั่งจาก Step 3 ก่อน แล้วค่อยยืนยันยอดและออกใบจ่ายเงิน
                    </div>
                  )}
                </div>
              </div>

              <div
                className={[
                  styles.stepCard,
                  currentStep === 4 || readyForStockIn
                    ? styles.stepCardActive
                    : "",
                  stockPosted ? styles.stepCardDone : "",
                  !paid ? styles.stepCardLocked : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepCardHeader}>
                  <div className={styles.stepCardHeaderMain}>
                    <div
                      className={[
                        styles.stepBadge,
                        currentStep === 4 || readyForStockIn
                          ? styles.stepBadgeActive
                          : "",
                        stockPosted ? styles.stepBadgeDone : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      5
                    </div>
                    <div className={styles.stepCardTitle}>
                      <h3>Step 5 · เข้าคลัง</h3>
                      <p>
                        ส่งคำขอรับยางดิบเข้าคลังหลังจ่ายเงินแล้ว — รออนุมัติจากคลัง
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
                        ? "รออนุมัติเข้าคลัง"
                        : readyForStockIn
                          ? "รอส่งคำขอเข้าคลัง"
                          : paid
                            ? "พร้อมเข้าคลัง"
                            : "รอออกใบจ่ายเงินก่อน"}
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
                            ? "มีคำขอรออนุมัติ"
                            : readyForStockIn
                              ? "ยังไม่ส่งคำขอ"
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
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}`,
                          )
                        }
                      >
                        เปิดใบรับซื้อ
                      </Button>
                    </div>
                  ) : readyForStockIn && ticket.receiptId ? (
                    <div className={styles.weighActions} style={{ marginTop: 16 }}>
                      <Button
                        type="primary"
                        className={styles.submitButton}
                        onClick={() =>
                          router.push(
                            `/raw-tire-purchase/receipts/${ticket.receiptId}/stock-posting-request`,
                          )
                        }
                      >
                        {stockRequestPending
                          ? "ดู / ติดตามคำขอเข้าคลัง"
                          : "ส่งคำขอรับเข้าคลัง"}
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}`,
                          )
                        }
                      >
                        เปิดใบรับซื้อ
                      </Button>
                    </div>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      ออกใบจ่ายเงินใน Step 4 ให้เสร็จก่อน แล้วค่อยส่งคำขอรับยางดิบเข้าคลัง
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
