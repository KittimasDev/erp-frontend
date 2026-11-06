"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  Collapse,
  Descriptions,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
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
import { useT2900TicketDetailQuery } from "@/hooks/weighbridge-tickets/useT2900TicketDetailQuery";
import { useWeighbridgeTicketQuery } from "@/hooks/weighbridge-tickets/useWeighbridgeTicketQuery";
import { useCanApproveStockPostingApprovals } from "@/lib/auth/stock-posting-access";
import { STOCK_POSTING_STATUS_LABELS } from "@/types/raw-tire-purchase-receipt";
import { appLocale, tLabel } from "./receiving-i18n";
import { StockPostingRequestStatus } from "@/types/stock-posting-request";
import { buildRawTireWarehouseReceiptSlipData } from "@/utils/buildRawTireWarehouseReceiptSlipData";

import ReceivingDocumentsCard, {
  type ReceivingDocumentRow,
} from "./ReceivingDocumentsCard";
import ReceivingTicketClassifyWeighPanel from "./ReceivingTicketClassifyWeighPanel";
import { TICKET_ORIGIN_COLOR, TICKET_ORIGIN_LABEL } from "./ticket-origin";
import T2900CameraPhotosGallery from "./T2900CameraPhotosGallery";
import styles from "./WeighbridgeDashboardPage.module.css";
import { useT } from "@/lib/i18n/useT";

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
  return n.toLocaleString(appLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString(appLocale());
}

function formatMoney(value?: string) {
  const n = Number(value);
  if (value === undefined || value === null || value === "" || Number.isNaN(n)) {
    return "-";
  }
  return n.toLocaleString(appLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** วันที่อย่างเดียว — ใช้ต่อท้ายเลขที่เอกสารในแถวเอกสารของแต่ละขั้น */
function formatDateOnly(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString(appLocale());
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
  const t = useT();
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
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [exportingPhotoReceipt, setExportingPhotoReceipt] = useState(false);

  // ตั๋วที่มาจากเครื่องชั่ง T2900: เก็บข้อมูลบัตรไว้ใช้ Export เอกสารแนบรูปเข้า-ออก ได้ทุกขั้น (จ่ายเงิน/เข้าคลังแล้วก็ยังโหลดได้)
  const t2900TckNo =
    ticket?.origin === "T2900" ? (ticket.referenceDocNo ?? "") : "";
  const t2900Query = useT2900TicketDetailQuery(t2900TckNo);

  const handleExportPhotoReceipt = async () => {
    const detail = t2900Query.data?.data;
    if (!detail) {
      message.warning(t("ยังโหลดข้อมูลบัตรจากเครื่องชั่งไม่เสร็จ"));
      return;
    }
    setExportingPhotoReceipt(true);
    try {
      const { generateT2900PhotoReceiptPdf } =
        await import("@/utils/generateT2900PhotoReceiptPdf");
      await generateT2900PhotoReceiptPdf(detail);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t("Export เอกสารแนบรูปเข้า-ออกไม่สำเร็จ"),
      );
    } finally {
      setExportingPhotoReceipt(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!receipt) {
      message.warning(t("ยังไม่มีใบรับซื้อให้พิมพ์"));
      return;
    }
    setPrintingReceipt(true);
    try {
      const { generateRawTirePurchaseReceiptPdf, mapReceiptDetailToPdfData } =
        await import("@/utils/generateRawTirePurchaseReceiptPdf");
      await generateRawTirePurchaseReceiptPdf(
        mapReceiptDetailToPdfData(receipt),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t("พิมพ์ใบรับซื้อไม่สำเร็จ"),
      );
    } finally {
      setPrintingReceipt(false);
    }
  };

  /*
    ย้ายมาจาก Step 1 พร้อมการ์ดใบสำคัญจ่าย — เอกสารใบนี้เป็นผลลัพธ์ของ Step 2
    lib pdf ต้อง dynamic import เท่านั้น (กฎใน .cursor/rules/erp.mdc)
  */
  const handlePrintVoucher = async () => {
    if (!paymentContext?.voucher) {
      message.warning(t("ยังไม่มีใบสำคัญจ่าย ให้กดออกใบจ่ายเงินก่อน"));
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
        error instanceof Error ? error.message : t("พิมพ์ใบสำคัญจ่ายไม่สำเร็จ"),
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
    // เชื่อ currentStep จาก API ก่อน (เข้าคลังก่อนจ่ายยังได้ PAYMENT → โฟกัสขั้นจ่ายเงิน)
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

  /*
    ยืนยันใบรับซื้อแล้ว (หรือจ่าย/เข้าคลังแล้ว) = ไม่ต้องกรอกอะไรเพิ่มในหน้านี้ ใช้หน้าตาแบบหน้าบัตรจากเครื่องชั่ง
    (ข้อมูลเรียงเป็นตาราง · ราคา · เอกสารครบ) ส่วนขั้นตอน Step 1-3 เก็บไว้ในส่วนที่กางดูได้
  */
  const compactView =
    (receiptConfirmed || paid || stockPosted) &&
    ticket?.status !== "CANCELLED" &&
    ticket?.currentStep !== "CANCELLED";

  const documentRows: ReceivingDocumentRow[] = [
    {
      key: "receipt",
      label: t("ใบรับซื้อ"),
      docNo: ticket?.receiptId ? (ticket.receiptNo ?? receipt?.receiptNo) : undefined,
      dateText: receipt?.receiptDate ? formatDateOnly(receipt.receiptDate) : undefined,
      statusText: ticket?.receiptStatus
        ? tLabel(RECEIPT_STATUS_LABELS[ticket.receiptStatus] ?? ticket.receiptStatus)
        : undefined,
      pendingHint: t("ยังไม่ออก — บันทึกคัดแยกและน้ำหนักใน Step 1 แล้วยืนยันใบรับซื้อ"),
      onOpen: ticket?.receiptId
        ? () => router.push(`/receiving/receipts/${ticket.receiptId}`)
        : undefined,
      onPrint: () => void handlePrintReceipt(),
      printing: printingReceipt,
      printDisabled: !receipt,
    },
    {
      key: "voucher",
      label: t("ใบสำคัญจ่าย"),
      docNo: paymentVoucher?.voucherNo,
      dateText: paymentVoucher?.voucherDate
        ? formatDateOnly(paymentVoucher.voucherDate)
        : undefined,
      statusText: paid ? t("จ่ายเงินแล้ว") : undefined,
      pendingHint: hasReceipt
        ? t("ยังไม่ออก — กดออกใบจ่ายเงินใน Step 2")
        : t("ยังไม่ออก — ต้องมีใบรับซื้อก่อน"),
      onOpen: ticket?.receiptId
        ? () => router.push(`/receiving/receipts/${ticket.receiptId}/payment`)
        : undefined,
      onPrint: () => void handlePrintVoucher(),
      printing: printingVoucher,
    },
    {
      key: "warehouse",
      label: t("ใบรับสินค้า"),
      docNo: stockPosted ? (stockRequest?.requestNo ?? receipt?.receiptNo) : undefined,
      dateText: stockRequest?.approvedAt
        ? formatDateOnly(stockRequest.approvedAt)
        : undefined,
      statusText: stockPosted ? tLabel(STOCK_POSTING_STATUS_LABELS.POSTED) : undefined,
      pendingHint: t("ยังไม่ออก — ออกหลังคลังอนุมัติรับเข้า (Step 3)"),
      onOpen: ticket?.receiptId
        ? () =>
            router.push(`/receiving/receipts/${ticket.receiptId}/warehouse-receipt`)
        : undefined,
      onPrint: () => {
        if (!warehouseSlipData) return;
        setIsPrintingWarehouseSlip(true);
        void import("@/utils/generateRawTireWarehouseReceiptPdf")
          .then(({ generateRawTireWarehouseReceiptPdf }) =>
            generateRawTireWarehouseReceiptPdf(warehouseSlipData),
          )
          .finally(() => setIsPrintingWarehouseSlip(false));
      },
      printing: isPrintingWarehouseSlip || warehouseSlipLoading,
      printDisabled: !warehouseSlipData,
    },
  ];

  const maxStepIndex = 2;
  const nextActionHref = ticket?.nextActionHref;
  const nextActionLabel = ticket?.nextAction;

  const handlePrintTicket = async () => {
    if (!ticket) return;
    if (!ticket.weighOutAt) {
      message.warning(t("พิมพ์ตั๋วชั่งได้หลังบันทึกน้ำหนักครบแล้ว"));
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
        error instanceof Error ? error.message : t("พิมพ์ตั๋วชั่งไม่สำเร็จ"),
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
            {t("กลับภาพรวม")}
          </Button>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={<PrinterOutlined />}
              loading={isPrinting || receiptQuery.isFetching}
              disabled={!ticket?.weighOutAt}
              onClick={() => void handlePrintTicket()}
            >
              {t("พิมพ์ตั๋วชั่ง")}
            </Button>
            {t2900TckNo ? (
              <Button
                icon={<FilePdfOutlined />}
                loading={exportingPhotoReceipt || t2900Query.isLoading}
                disabled={!t2900Query.data?.data}
                onClick={() => void handleExportPhotoReceipt()}
              >
                {t("Export เอกสารแนบรูปเข้า-ออก")}
              </Button>
            ) : null}
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
              {t("รีเฟรช")}
            </Button>
          </div>
        </div>

        {ticketQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                {ticketQuery.error instanceof Error
                  ? ticketQuery.error.message
                  : t("โหลดรายละเอียดไม่สำเร็จ")}
              </Typography.Text>
            </div>
          </div>
        ) : ticket ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>{t("ชั่งน้ำหนักรับซื้อยาง")}</h3>
                    <p>
                      {t("เลขที่ตั๋ว {no} · สถานะตั๋ว {status}", { no: ticket.ticketNo, status: ticket.status })}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag color={TICKET_ORIGIN_COLOR[ticket.origin ?? "MANUAL"]}>
                      {tLabel(TICKET_ORIGIN_LABEL[ticket.origin ?? "MANUAL"])}
                      {ticket.origin === "T2900" && ticket.referenceDocNo
                        ? ` · ${t("บัตร {no}", { no: ticket.referenceDocNo })}`
                        : ""}
                    </Tag>
                  <Tag className={styles.flowTag}>
                    {tLabel(FLOW_LABELS[ticket.flowState ?? ""] ??
                      (paid ? FLOW_LABELS.PAYMENT_PAID : undefined) ??
                      DISPLAY_LABELS[ticket.displayStatus] ??
                      ticket.displayStatus)}
                  </Tag>
                  </div>
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
                    { title: t("คัดแยกและชั่ง") },
                    { title: t("ออกใบจ่ายเงิน") },
                    { title: t("เข้าคลัง") },
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
                        {t("ไปดำเนินการต่อ")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {compactView ? (
              <>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>{t("ข้อมูลตั๋วชั่ง")}</h3>
                    <p>{t("ผู้ขาย รถ สินค้า เวลา และน้ำหนัก")}</p>
                  </div>
                  <div className={styles.cardBody}>
                    <Descriptions
                      bordered
                      size="small"
                      column={{ xs: 1, md: 2 }}
                      items={[
                        { key: "no", label: t("เลขที่ตั๋วชั่ง"), children: ticket.ticketNo },
                        {
                          key: "origin",
                          label: t("ที่มา"),
                          children: `${tLabel(TICKET_ORIGIN_LABEL[ticket.origin ?? "MANUAL"])}${
                            ticket.referenceDocNo ? ` · ${t("บัตร {no}", { no: ticket.referenceDocNo })}` : ""
                          }`,
                        },
                        {
                          key: "seller",
                          label: t("ผู้ขาย"),
                          children:
                            `${ticket.sellerCode ?? ""} ${ticket.sellerName ?? ""}`.trim() || "-",
                        },
                        { key: "truck", label: t("ทะเบียนรถ"), children: ticket.truckLicensePlate || "-" },
                        { key: "driver", label: t("คนขับ"), children: ticket.driverName || "-" },
                        {
                          key: "scale",
                          label: t("เครื่องชั่ง"),
                          children: ticket.scaleName
                            ? `${ticket.scaleCode ? `${ticket.scaleCode} · ` : ""}${ticket.scaleName}`
                            : "-",
                        },
                        { key: "in", label: t("ชั่งเข้า"), children: formatDateTime(ticket.weighInAt as string | undefined) },
                        { key: "out", label: t("ชั่งออก"), children: formatDateTime(ticket.weighOutAt as string | undefined) },
                        { key: "gross", label: t("น้ำหนักรวม (เข้า)"), children: `${formatWeight(ticket.grossWeightKg)} ${t("กก.")}` },
                        { key: "tare", label: t("น้ำหนักรถ (ออก)"), children: `${formatWeight(ticket.tareWeightKg)} ${t("กก.")}` },
                        { key: "net", label: t("น้ำหนักสุทธิ"), children: `${formatWeight(ticket.netWeightKg)} ${t("กก.")}` },
                        { key: "created", label: t("เปิดตั๋วเมื่อ"), children: formatDateTime(ticket.createdAt) },
                      ]}
                    />
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>{t("รายการรับซื้อและยอดเงิน")}</h3>
                    <p>{t("จากใบรับซื้อ {no}", { no: receipt?.receiptNo ?? ticket.receiptNo ?? "" })}</p>
                  </div>
                  <div className={styles.cardBody}>
                    {receipt ? (
                      <Descriptions
                        bordered
                        size="small"
                        column={{ xs: 1, md: 2 }}
                        items={[
                          ...(receipt.items ?? []).map((item) => ({
                            key: `item-${item.id}`,
                            label:
                              `${item.classificationCode ?? ""} ${item.classificationName ?? ""}`.trim() ||
                              t("รายการ"),
                            children: `${formatWeight(item.weightKg)} ${t("กก.")} × ${formatMoney(item.pricePerKg)} = ${formatMoney(item.amount)} ${t("บาท")}`,
                          })),
                          ...(receipt.deductions ?? []).map((row) => ({
                            key: `ded-${row.id}`,
                            label: `${t("หัก:")} ${row.description || row.deductionType}`,
                            children: `${formatWeight(row.deductionWeightKg)} ${t("กก.")} = ${formatMoney(row.deductionAmount)} ${t("บาท")}`,
                          })),
                          { key: "payable", label: t("น้ำหนักที่จ่าย"), children: `${formatWeight(receipt.payableWeightKg)} ${t("กก.")}` },
                          { key: "subtotal", label: t("ยอดก่อนหัก"), children: `${formatMoney(receipt.subtotalAmount)} ${t("บาท")}` },
                          { key: "deduct", label: t("ยอดหัก"), children: `${formatMoney(receipt.deductionAmount)} ${t("บาท")}` },
                          {
                            key: "total",
                            label: t("ยอดสุทธิ"),
                            children: <strong>{`${formatMoney(receipt.totalAmount)} ${t("บาท")}`}</strong>,
                          },
                        ]}
                      />
                    ) : (
                      <Typography.Text type="secondary">{t("กำลังโหลดใบรับซื้อ...")}</Typography.Text>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{t("ข้อมูลตั๋วชั่ง")}</h3>
                <p>{t("ผู้ขาย รถ คนขับ และเครื่องชั่ง")}</p>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.ticketInfoLayout}>
                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>{t("ตั๋ว / ผู้ขาย")}</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("เลขที่ตั๋วชั่ง")}</span>
                        <strong>{ticket.ticketNo}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("วันที่เปิดตั๋ว")}</span>
                        <strong>{formatDateTime(ticket.createdAt)}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("ผู้ขาย")}</span>
                        <strong>{ticket.sellerName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("รหัสผู้ขาย")}</span>
                        <strong>{ticket.sellerCode || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("สถานะงาน")}</span>
                        <strong>
                          {tLabel(DISPLAY_LABELS[ticket.displayStatus] ??
                            ticket.displayStatus)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.ticketInfoPanel}>
                    <div className={styles.ticketInfoPanelTitle}>{t("รถ / เครื่องชั่ง")}</div>
                    <div className={styles.ticketInfoRows}>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("ทะเบียนรถ")}</span>
                        <strong>{ticket.truckLicensePlate || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("จังหวัด")}</span>
                        <strong>{ticket.truckProvince || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("คนขับ")}</span>
                        <strong>{ticket.driverName || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("เบอร์โทรคนขับ")}</span>
                        <strong>{ticket.driverPhone || "-"}</strong>
                      </div>
                      <div className={styles.ticketInfoRow}>
                        <span>{t("เครื่องชั่ง")}</span>
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
                      <span>{t("น้ำหนักเข้า")}</span>
                      <strong>
                        {formatWeight(ticket.grossWeightKg)}
                        <em>{t("กก.")}</em>
                      </strong>
                    </div>
                    <div className={styles.ticketWeightCard}>
                      <span>{t("น้ำหนักออก")}</span>
                      <strong>
                        {formatWeight(ticket.tareWeightKg)}
                        <em>{t("กก.")}</em>
                      </strong>
                    </div>
                    <div
                      className={`${styles.ticketWeightCard} ${styles.ticketWeightNet}`}
                    >
                      <span>{t("น้ำหนักสุทธิ")}</span>
                      <strong>
                        {formatWeight(ticket.netWeightKg)}
                        <em>{t("กก.")}</em>
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

              </>
            )}

            <ReceivingDocumentsCard rows={documentRows} />

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>{t("รูปจากกล้องเครื่องชั่ง")}</h3>
                <p>{t("ไฟล์ที่ส่งมากับบัตร T2900 (เข้า/ออก · กล้อง 1–2) — คลิกดูขยาย")}</p>
              </div>
              <div className={styles.cardBody}>
                <T2900CameraPhotosGallery
                  ticketId={ticket.id}
                  tckNo={
                    ticket.origin === "T2900" ? ticket.referenceDocNo : undefined
                  }
                />
              </div>
            </div>

            {compactView ? (
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <Collapse
                    ghost
                    items={[
                      {
                        key: "steps",
                        label: t("ขั้นตอนดำเนินการ (คัดแยก · จ่ายเงิน · เข้าคลัง)"),
                        children: (
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
                      <h3>{t("Step 2 · ออกใบจ่ายเงิน")}</h3>
                      <p>
                        {t("บันทึกโอน/จ่ายเงินจริงให้ผู้ขาย — เมื่อจ่ายสำเร็จระบบจะแจ้งคลังให้อนุมัติเข้าคลัง")}
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
                      ? t("จ่ายเงินแล้ว")
                      : readyToPay
                        ? t("รอออกใบจ่ายเงิน")
                        : hasReceipt
                          ? t("ตั๋วชั่งยังเป็นร่าง")
                          : t("รอมีตั๋วชั่ง")}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>{t("ใบรับซื้อ")}</span>
                      <strong>
                        {paymentView?.receiptNo
                          ? `${paymentView.receiptNo} (${tLabel(RECEIPT_STATUS_LABELS[paymentView.receiptStatus ?? ""] ?? paymentView.receiptStatus ?? "-")})`
                          : t("ยังไม่มี")}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>{t("สถานะจ่ายเงิน")}</span>
                      <strong>
                        {paymentView
                          ? tLabel(resolvePaymentStatusLabel(paymentView))
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
                        <span className={styles.stepDocLabel}>{t("ใบสำคัญจ่าย")}</span>
                        <span className={styles.stepDocValue}>
                          {paymentVoucher?.voucherNo ?? t("ยังไม่ออก — กดปุ่มด้านล่างเพื่อออกใบจ่ายเงิน")}
                          {paymentVoucher?.voucherDate ? (
                            <span className={styles.stepDocMeta}>
                              {t("ลว. {date}", { date: formatDateOnly(paymentVoucher.voucherDate) })}
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
                            {t("พิมพ์")}
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              router.push(
                                `/receiving/receipts/${ticket.receiptId}/payment`,
                              )
                            }
                          >
                            {t("เปิด")}
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
                        {t("ออกใบจ่ายเงิน")}
                      </Button>
                    </div>
                  ) : hasReceipt ? (
                    <div className={styles.stepEmptyHint}>
                      {t("ใบรับซื้อยังไม่พร้อมจ่าย — ตรวจยอดและยืนยันจาก Step 1")}
                    </div>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      {t("บันทึกคัดแยกและน้ำหนักใน Step 1 ให้เสร็จก่อน แล้วจะได้ใบรับซื้อเพื่อออกใบจ่ายเงิน")}
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
                      <h3>{t("Step 3 · เข้าคลัง")}</h3>
                      <p>
                        {t("คนคลังเลือกคลัง/ตำแหน่งแล้วกดอนุมัติ — ทำได้หลังจ่ายเงิน Step 2 เสร็จ")}
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
                      ? tLabel(STOCK_POSTING_STATUS_LABELS.POSTED)
                        : stockRequestPending
                        ? t("รอคลังเลือกคลังและอนุมัติ")
                        : readyForStockIn
                          ? t("รอคลังรับเข้า")
                          : paid
                            ? t("พร้อมเข้าคลัง")
                            : receiptConfirmed
                              ? t("รอจ่ายเงินก่อน")
                              : t("รอยืนยันยอดก่อน")}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>{t("ใบรับซื้อ")}</span>
                      <strong>
                        {ticket.receiptNo
                          ? `${ticket.receiptNo} (${tLabel(RECEIPT_STATUS_LABELS[ticket.receiptStatus ?? ""] ?? ticket.receiptStatus ?? "-")})`
                          : t("ยังไม่มี")}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>{t("สถานะเข้าคลัง")}</span>
                      <strong>
                        {stockPosted
                          ? tLabel(STOCK_POSTING_STATUS_LABELS.POSTED)
                          : stockRequestPending
                            ? t("รอคลังเลือกคลังและอนุมัติ")
                            : readyForStockIn
                              ? t("รอคลังรับเข้า")
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
                        {t("พิมพ์ใบรับสินค้า")}
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/warehouse-receipt`,
                          )
                        }
                      >
                        {t("ดูเต็มจอ")}
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
                        {t("คลังเลือกคลังและอนุมัติ")}
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
                        {t("เปิดรายการรอคลังอนุมัติ")}
                      </Button>
                    </div>
                  ) : receiptConfirmed && !paid ? (
                    <div className={styles.stepEmptyHint}>
                      {t("จ่ายเงินใน Step 2 ให้เสร็จก่อน ระบบจะแจ้งคลังให้อนุมัติเข้าคลัง")}
                    </div>
                  ) : stockRequestPending || readyForStockIn ? null : (
                    <div className={styles.stepEmptyHint}>
                      {t("บันทึกคัดแยกและน้ำหนักใน Step 1 ให้เสร็จ แล้วจ่ายเงิน Step 2 ก่อนเข้าคลัง")}
                    </div>
                  )}
                </div>
              </div>
            </div>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            ) : (
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
                      <h3>{t("Step 2 · ออกใบจ่ายเงิน")}</h3>
                      <p>
                        {t("บันทึกโอน/จ่ายเงินจริงให้ผู้ขาย — เมื่อจ่ายสำเร็จระบบจะแจ้งคลังให้อนุมัติเข้าคลัง")}
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
                      ? t("จ่ายเงินแล้ว")
                      : readyToPay
                        ? t("รอออกใบจ่ายเงิน")
                        : hasReceipt
                          ? t("ตั๋วชั่งยังเป็นร่าง")
                          : t("รอมีตั๋วชั่ง")}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>{t("ใบรับซื้อ")}</span>
                      <strong>
                        {paymentView?.receiptNo
                          ? `${paymentView.receiptNo} (${tLabel(RECEIPT_STATUS_LABELS[paymentView.receiptStatus ?? ""] ?? paymentView.receiptStatus ?? "-")})`
                          : t("ยังไม่มี")}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>{t("สถานะจ่ายเงิน")}</span>
                      <strong>
                        {paymentView
                          ? tLabel(resolvePaymentStatusLabel(paymentView))
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
                        <span className={styles.stepDocLabel}>{t("ใบสำคัญจ่าย")}</span>
                        <span className={styles.stepDocValue}>
                          {paymentVoucher?.voucherNo ?? t("ยังไม่ออก — กดปุ่มด้านล่างเพื่อออกใบจ่ายเงิน")}
                          {paymentVoucher?.voucherDate ? (
                            <span className={styles.stepDocMeta}>
                              {t("ลว. {date}", { date: formatDateOnly(paymentVoucher.voucherDate) })}
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
                            {t("พิมพ์")}
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              router.push(
                                `/receiving/receipts/${ticket.receiptId}/payment`,
                              )
                            }
                          >
                            {t("เปิด")}
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
                        {t("ออกใบจ่ายเงิน")}
                      </Button>
                    </div>
                  ) : hasReceipt ? (
                    <div className={styles.stepEmptyHint}>
                      {t("ใบรับซื้อยังไม่พร้อมจ่าย — ตรวจยอดและยืนยันจาก Step 1")}
                    </div>
                  ) : (
                    <div className={styles.stepEmptyHint}>
                      {t("บันทึกคัดแยกและน้ำหนักใน Step 1 ให้เสร็จก่อน แล้วจะได้ใบรับซื้อเพื่อออกใบจ่ายเงิน")}
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
                      <h3>{t("Step 3 · เข้าคลัง")}</h3>
                      <p>
                        {t("คนคลังเลือกคลัง/ตำแหน่งแล้วกดอนุมัติ — ทำได้หลังจ่ายเงิน Step 2 เสร็จ")}
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
                      ? tLabel(STOCK_POSTING_STATUS_LABELS.POSTED)
                        : stockRequestPending
                        ? t("รอคลังเลือกคลังและอนุมัติ")
                        : readyForStockIn
                          ? t("รอคลังรับเข้า")
                          : paid
                            ? t("พร้อมเข้าคลัง")
                            : receiptConfirmed
                              ? t("รอจ่ายเงินก่อน")
                              : t("รอยืนยันยอดก่อน")}
                  </Tag>
                </div>
                <div className={styles.stepCardBody}>
                  <div className={styles.stepMetaGrid}>
                    <div className={styles.stepMetaItem}>
                      <span>{t("ใบรับซื้อ")}</span>
                      <strong>
                        {ticket.receiptNo
                          ? `${ticket.receiptNo} (${tLabel(RECEIPT_STATUS_LABELS[ticket.receiptStatus ?? ""] ?? ticket.receiptStatus ?? "-")})`
                          : t("ยังไม่มี")}
                      </strong>
                    </div>
                    <div
                      className={`${styles.stepMetaItem} ${styles.stepMetaHighlight}`}
                    >
                      <span>{t("สถานะเข้าคลัง")}</span>
                      <strong>
                        {stockPosted
                          ? tLabel(STOCK_POSTING_STATUS_LABELS.POSTED)
                          : stockRequestPending
                            ? t("รอคลังเลือกคลังและอนุมัติ")
                            : readyForStockIn
                              ? t("รอคลังรับเข้า")
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
                        {t("พิมพ์ใบรับสินค้า")}
                      </Button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/receiving/receipts/${ticket.receiptId}/warehouse-receipt`,
                          )
                        }
                      >
                        {t("ดูเต็มจอ")}
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
                        {t("คลังเลือกคลังและอนุมัติ")}
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
                        {t("เปิดรายการรอคลังอนุมัติ")}
                      </Button>
                    </div>
                  ) : receiptConfirmed && !paid ? (
                    <div className={styles.stepEmptyHint}>
                      {t("จ่ายเงินใน Step 2 ให้เสร็จก่อน ระบบจะแจ้งคลังให้อนุมัติเข้าคลัง")}
                    </div>
                  ) : stockRequestPending || readyForStockIn ? null : (
                    <div className={styles.stepEmptyHint}>
                      {t("บันทึกคัดแยกและน้ำหนักใน Step 1 ให้เสร็จ แล้วจ่ายเงิน Step 2 ก่อนเข้าคลัง")}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
