"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Tag,
  Upload,
} from "antd";
import type { Dayjs } from "dayjs";
import type { UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  PaperClipOutlined,
  ProfileOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useDeliverySchedulesQuery } from "@/hooks/delivery-schedules/useDeliverySchedulesQuery";
import DeliverySchedulesSection from "./DeliverySchedulesSection";
import DocumentAuditTrail from "@/components/common/DocumentAuditTrail";
import SalesOrderTimeline from "@/components/sales/SalesOrderTimeline";
import {
  useCancelSalesOrderMutation,
  useConfirmSalesOrderMutation,
  useDeleteSalesOrderAttachmentMutation,
  useUpdateSalesOrderCustomerPoMutation,
  useUpdateSalesOrderHeaderMutation,
  useUpdateSalesOrderItemsMutation,
  useUploadSalesOrderAttachmentMutation,
} from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  useSalesOrderAttachmentsQuery,
  useSalesOrderPdfSnapshotsQuery,
  useSalesOrderQuery,
  useSalesOrderReservationStatusQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useProductionRequestsQuery, useEligibleSalesOrderQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { useCreateProductionRequestMutation } from "@/hooks/production-requests/useProductionRequestMutations";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import {
  calcDocumentTotals,
  resolveVatMode,
  VatMode,
  VAT_MODE_LABEL,
  VAT_MODE_OPTIONS,
  vatAmountLabel,
} from "@/lib/money/vat-totals";
import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";
import { salesOrderRevisionStamp, formatThaiBuddhistDate } from "@/lib/datetime/thai-buddhist-date";
import type { DeliverySchedule } from "@/types/delivery-schedules";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import {
  canAccessSalesOrderDetail,
  canCreateDeliveryFromPacking,
  canNavigateSalesFulfillmentHref,
  canOpenStockVerification,
} from "@/lib/sales/sales-fulfillment-nav";
import { stockVerificationLineTag } from "@/lib/sales/stock-verification-line-tag";
import {
  canCancelSalesOrder,
  resolveSalesOrderProgress,
  salesOrderDeliveryStatusLabel,
} from "@/lib/sales/sales-order-progress";
import {
  ATTACHMENT_GROUP_CUSTOMER_PO,
  type DocumentAttachment,
} from "@/types/document-attachments";
import {
  SALES_ORDER_PAYMENT_METHOD_LABEL,
  SALES_ORDER_STATUS_LABEL,
  isPreConfirmSalesOrderStatus,
  type SalesOrder,
  type SalesOrderPaymentMethod,
  type SalesOrderPdfSnapshotPayload,
  type SalesOrderReservationLine,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import type { SalesOrderPdfData } from "@/utils/generateSalesOrderPdf";
import {
  PRODUCTION_REQUEST_STATUS_LABEL,
  type EligibleSalesOrderItem,
} from "@/types/production-request";
import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";
import styles from "./SalesOrderDetailPage.module.css";

type Props = { id: string };

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function attachmentDisplayName(file: DocumentAttachment) {
  return file.originalFileName || "ไฟล์แนบ";
}

function isImageMime(mimeType?: string) {
  return Boolean(mimeType?.startsWith("image/"));
}

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

function todayInErp() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ERP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type PendingProductionRequest =
  | { kind: "all" }
  | { kind: "line"; salesOrderItemId: string; itemCode?: string };

function formatQty(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function formatMoney(value?: string) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function vatLabel(order: SalesOrder, rateOverride?: number | string): string {
  const rate = Number(rateOverride ?? order.taxRate?.rate);
  return vatAmountLabel(Number.isFinite(rate) ? rate : undefined);
}

const PAYMENT_METHOD_OPTIONS = (
  Object.keys(SALES_ORDER_PAYMENT_METHOD_LABEL) as SalesOrderPaymentMethod[]
).map((value) => ({
  value,
  label: SALES_ORDER_PAYMENT_METHOD_LABEL[value],
}));

type SalesOrderHeaderDraft = {
  contactName: string;
  paymentMethod?: SalesOrderPaymentMethod;
  paymentDueDate: string;
  customerPoDate: string;
  remark: string;
  vatMode: string;
  taxRateId?: string;
};

type SalesOrderItemDraft = {
  quantity: number;
  unitPrice: number;
  discountAmount: number;
};

function lineAmount(qty: number, price: number, discount: number) {
  return Math.max(0, Number((qty * price - discount).toFixed(2)));
}

function headerTotalsFromAmounts(
  lineAmounts: number[],
  headerDiscount: number,
  taxRatePercent: number,
  vatMode?: string,
) {
  const totals = calcDocumentTotals(
    lineAmounts,
    headerDiscount,
    resolveVatMode(vatMode),
    taxRatePercent,
  );
  return {
    subtotal: totals.subtotal,
    discount: totals.discount,
    vat: totals.vat,
    total: totals.total,
  };
}

function buildSalesOrderPdfDataFromOrder(
  order: SalesOrder,
  options?: {
    schedules?: DeliverySchedule[];
    headerDraft?: SalesOrderHeaderDraft;
    itemDrafts?: Record<string, SalesOrderItemDraft> | null;
    taxRates?: Array<{ id: string; rate: number | string }>;
  },
): SalesOrderPdfData {
  const header = options?.headerDraft;
  const drafts = options?.itemDrafts ?? null;
  const vatMode = resolveVatMode(header?.vatMode ?? order.vatMode);
  const taxRateId = header?.taxRateId ?? order.taxRateId;
  const selectedRate = options?.taxRates?.find((row) => row.id === taxRateId);
  const taxRate =
    vatMode === VatMode.NONE
      ? 0
      : Number(selectedRate?.rate ?? order.taxRate?.rate ?? 0) || 0;

  const items = (order.items ?? []).map((item, index) => {
    const draft = drafts?.[item.id];
    const qty = draft?.quantity ?? (Number(item.quantity) || 0);
    const price = draft?.unitPrice ?? (Number(item.unitPrice) || 0);
    const discount = draft?.discountAmount ?? (Number(item.discountAmount) || 0);
    return {
      no: index + 1,
      itemCode: item.itemCode ?? "—",
      itemName: item.itemNameTh ?? item.description ?? "—",
      unit: item.unitCode ?? "—",
      qty,
      unitPrice: price,
      discountAmount: discount,
      amount: lineAmount(qty, price, discount),
    };
  });

  const money = drafts
    ? headerTotalsFromAmounts(
        items.map((item) => item.amount),
        Number(order.discountAmount) || 0,
        taxRate,
        vatMode,
      )
    : {
        subtotal: Number(order.subtotalAmount) || 0,
        discount: Number(order.discountAmount) || 0,
        vat: Number(order.vatAmount) || 0,
        total: Number(order.totalAmount) || 0,
      };

  const activeRounds = (options?.schedules ?? [])
    .filter((schedule) => schedule.status !== "CANCELLED")
    .slice()
    .sort((a, b) => a.roundNo - b.roundNo);

  const rounds = activeRounds.map((schedule) => ({
    roundNo: schedule.roundNo,
    deliveryDate: schedule.deliveryDate,
    items: (schedule.items ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((line, index) => {
        const draft = drafts?.[line.salesOrderItemId];
        const sameItemLines = activeRounds.reduce(
          (count, round) =>
            count +
            (round.items ?? []).filter(
              (row) => row.salesOrderItemId === line.salesOrderItemId,
            ).length,
          0,
        );
        const qty =
          draft && sameItemLines === 1
            ? draft.quantity
            : Number(line.quantity) || 0;
        const price = draft?.unitPrice ?? (Number(line.unitPrice) || 0);
        const discount =
          draft && sameItemLines === 1
            ? draft.discountAmount
            : Number(line.discountAmount) || 0;
        return {
          no: index + 1,
          itemCode: line.itemCode ?? "—",
          itemName: line.itemNameTh ?? line.description ?? "—",
          unit: line.unitCode ?? "—",
          qty,
          unitPrice: price,
          discountAmount: discount,
          amount: lineAmount(qty, price, discount),
        };
      }),
  }));

  return {
    soNo: order.soNo,
    soDate: formatDate(order.soDate),
    customerName: order.customer?.nameTh ?? "—",
    customerCode: order.customer?.customerCode ?? "—",
    customerTaxId: order.customer?.taxId,
    customerAddress: order.customer?.address,
    customerPhone: order.customer?.contactPhone,
    contactName:
      header?.contactName ??
      order.contactName ??
      order.customer?.contactName ??
      "—",
    customerPoNo: order.customerPoNo?.trim() || "—",
    customerPoDate: formatDate(header?.customerPoDate || order.customerPoDate),
    quotationNo: order.salesQuotationNo ?? "—",
    paymentMethod: header?.paymentMethod ?? order.paymentMethod,
    paymentDueDate: formatDate(
      header?.paymentDueDate || order.paymentDueDate,
    ),
    requestedDeliveryDate: formatDate(order.requestedDeliveryDate),
    remark: (header?.remark ?? order.remark)?.trim() || "",
    taxRatePercent: taxRate,
    revisedAt: order.revisedAt,
    isDraftPreview: Boolean(drafts),
    preparedBy: {
      id: order.createdBy?.id,
      name: order.createdBy?.displayName,
    },
    approvedBy: order.confirmedBy
      ? {
          id: order.confirmedBy.id,
          name: order.confirmedBy.displayName,
        }
      : undefined,
    subtotalAmount: money.subtotal,
    discountAmount: money.discount,
    vatAmount: money.vat,
    totalAmount: money.total,
    items,
    rounds,
  };
}

function mapSnapshotPayloadToPdfData(
  payload: SalesOrderPdfSnapshotPayload,
): SalesOrderPdfData {
  return {
    soNo: payload.soNo,
    soDate: formatDate(payload.soDate),
    customerName: payload.customerName,
    customerCode: payload.customerCode,
    customerTaxId: payload.customerTaxId,
    customerAddress: payload.customerAddress,
    customerPhone: payload.customerPhone,
    contactName: payload.contactName,
    customerPoNo: payload.customerPoNo,
    customerPoDate: formatDate(payload.customerPoDate),
    quotationNo: payload.quotationNo,
    paymentMethod: payload.paymentMethod,
    paymentDueDate: formatDate(payload.paymentDueDate),
    requestedDeliveryDate: formatDate(payload.requestedDeliveryDate),
    remark: payload.remark,
    taxRatePercent: payload.taxRatePercent,
    revisedAt: payload.revisedAt,
    subtotalAmount: payload.subtotalAmount,
    discountAmount: payload.discountAmount,
    vatAmount: payload.vatAmount,
    totalAmount: payload.totalAmount,
    items: payload.items,
    rounds: payload.rounds,
    preparedBy: payload.preparedBy
      ? { id: payload.preparedBy.id, name: payload.preparedBy.name }
      : undefined,
    preparedBySignatureDataUrl:
      payload.preparedBy?.preparedBySignatureDataUrl ?? null,
  };
}

function statusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return styles.statusApproved;
    case "AWAITING_CONFIRM":
    case "CONFIRMED":
    case "STOCK_CHECKED":
    case "PICKING":
    case "PACKED":
    case "DELIVERED":
    case "PARTIALLY_ISSUED":
      return styles.statusPending;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

function findStep(
  timeline: SalesTrackingTimelineStep[],
  step: string,
): SalesTrackingTimelineStep | undefined {
  return timeline.find((s) => s.step === step);
}

function reservationLineTag(line: SalesOrderReservationLine) {
  if (line.isFullyReserved) {
    return <Tag color="success">จองครบ</Tag>;
  }
  // ขาดของแต่มีใบขอผลิตคุมไว้แล้ว = รอของ ไม่ใช่ต้องไปหาของเพิ่ม
  if (
    Number(line.shortageQty) > 0 &&
    Number(line.unplannedShortageQty ?? line.shortageQty) <= 0.0005
  ) {
    return <Tag color="processing">รอผลผลิต</Tag>;
  }
  if (Number(line.shortageQty) > 0) {
    return <Tag color="error">สต๊อกไม่พอ</Tag>;
  }
  // ยังไม่จองเป็นเรื่องปกติเมื่อของไม่พอ — ของถูกจองตอนสร้างใบถ้ามีของ อย่าโชว์ «รอจอง»
  return null;
}

function buildProductionRequestLine(
  salesOrderItemId: string,
  reservationLines: SalesOrderReservationLine[],
  eligibleItems: EligibleSalesOrderItem[],
): { salesOrderItemId: string; requestedQty: number } | null {
  const reservationLine = reservationLines.find(
    (line) => line.salesOrderItemId === salesOrderItemId,
  );
  // ใช้ยอดขาดที่หักใบขอผลิตเดิมออกแล้ว — กันเสนอเปิดใบขอผลิตซ้ำของก้อนเดียวกัน
  const shortage = Number(
    reservationLine?.unplannedShortageQty ?? reservationLine?.shortageQty ?? 0,
  );
  const eligibleItem = eligibleItems.find(
    (item) => item.salesOrderItemId === salesOrderItemId,
  );
  if (!eligibleItem) {
    return null;
  }
  const remaining = Number(eligibleItem.remainingQty);
  if (remaining <= 0.0005 || shortage <= 0.0005) {
    return null;
  }
  const requestedQty = Math.min(remaining, shortage);
  if (requestedQty <= 0.0005) {
    return null;
  }
  return { salesOrderItemId, requestedQty };
}

export default function SalesOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal, message } = App.useApp();
  const query = useSalesOrderQuery(id);
  const data = query.data?.data;
  const isPreConfirm = isPreConfirmSalesOrderStatus(data?.status);

  const stockVerificationQuery = useSalesOrderStockVerificationQuery(
    data && !isPreConfirm ? id : undefined,
  );
  const reservationQuery = useSalesOrderReservationStatusQuery(
    isPreConfirm ? id : undefined,
  );
  const productionRequestsQuery = useProductionRequestsQuery(
    isPreConfirm ? { salesOrderId: id, limit: 20 } : undefined,
    { enabled: isPreConfirm },
  );
  const eligibleSoQuery = useEligibleSalesOrderQuery(
    isPreConfirm ? id : undefined,
  );
  const trackingQuery = useSalesTrackingDetailQuery(id);
  const pdfSnapshotsQuery = useSalesOrderPdfSnapshotsQuery(id);
  const confirmMutation = useConfirmSalesOrderMutation();
  const cancelMutation = useCancelSalesOrderMutation();
  const createProductionRequestMutation = useCreateProductionRequestMutation();
  const attachmentsQuery = useSalesOrderAttachmentsQuery(id);
  const uploadAttachmentMutation = useUploadSalesOrderAttachmentMutation();
  const deleteAttachmentMutation = useDeleteSalesOrderAttachmentMutation();
  const updateCustomerPoMutation = useUpdateSalesOrderCustomerPoMutation();
  const updateHeaderMutation = useUpdateSalesOrderHeaderMutation();
  const updateItemsMutation = useUpdateSalesOrderItemsMutation();
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });
  const taxRates = taxRatesQuery.data?.data ?? [];
  // แก้จำนวน/ส่วนลด — ราคาต่อหน่วยล็อกตาม QT; null = ยังไม่เข้าโหมดแก้ไข
  const [itemDrafts, setItemDrafts] = useState<Record<
    string,
    { quantity: number; unitPrice: number; discountAmount: number }
  > | null>(null);
  const [pendingProductionRequest, setPendingProductionRequest] =
    useState<PendingProductionRequest | null>(null);
  const [productionRequiredDate, setProductionRequiredDate] =
    useState<Dayjs | null>(null);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poDraft, setPoDraft] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPdfVersion, setSelectedPdfVersion] = useState<
    "current" | string
  >("current");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);
  const [headerDraft, setHeaderDraft] = useState<SalesOrderHeaderDraft>({
    contactName: "",
    paymentDueDate: "",
    customerPoDate: "",
    remark: "",
    vatMode: VatMode.EXCLUSIVE,
  });
  const quotationActions = useScreenActionPermissions("QUOTATIONS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const productionRequestActions = useScreenActionPermissions(
    "PRODUCTION_REQUESTS",
  );
  const stockVerificationActions = useScreenActionPermissions(
    "SALES_STOCK_VERIFICATION",
  );
  const pickingActions = useScreenActionPermissions("PICKINGS");
  const packingActions = useScreenActionPermissions("PACKINGS");
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");

  useEffect(() => {
    if (!data) {
      return;
    }
    const method = data.paymentMethod as SalesOrderPaymentMethod | undefined;
    setHeaderDraft({
      contactName: data.contactName ?? data.customer?.contactName ?? "",
      paymentMethod:
        method && method in SALES_ORDER_PAYMENT_METHOD_LABEL
          ? method
          : undefined,
      paymentDueDate: data.paymentDueDate ?? "",
      customerPoDate: data.customerPoDate ?? "",
      remark: data.remark ?? "",
      vatMode: resolveVatMode(data.vatMode),
      taxRateId: data.taxRateId,
    });
  }, [
    data,
    data?.id,
    data?.updatedAt,
    data?.contactName,
    data?.paymentMethod,
    data?.paymentDueDate,
    data?.customerPoDate,
    data?.remark,
    data?.vatMode,
    data?.taxRateId,
    data?.customer?.contactName,
  ]);

  const stockVerification = stockVerificationQuery.data?.data;
  const reservationStatus = reservationQuery.data?.data;
  const linkedProductionRequests =
    productionRequestsQuery.data?.data?.items ?? [];
  const tracking = trackingQuery.data?.data;
  const timeline = tracking?.timeline ?? [];

  const canWrite = salesOrderActions.canEdit;
  const canConfirm = salesOrderActions.canApprove;
  const canOpenDetail = canAccessSalesOrderDetail({
    salesOrder: salesOrderActions,
    stockVerification: stockVerificationActions,
    picking: pickingActions,
    packing: packingActions,
    delivery: deliveryActions,
  });
  const canOpenStockCheck = canOpenStockVerification({
    stockVerification: stockVerificationActions,
    picking: pickingActions,
  });
  const attachments = attachmentsQuery.data?.data ?? [];
  const canUploadEvidence =
    canWrite && data?.status !== "CANCELLED";
  const canFulfill =
    salesOrderActions.canEdit ||
    salesOrderActions.canApprove ||
    stockVerificationActions.canView ||
    stockVerificationActions.canEdit ||
    stockVerificationActions.canApprove ||
    pickingActions.canAdd ||
    pickingActions.canEdit ||
    packingActions.canAdd ||
    packingActions.canEdit ||
    deliveryActions.canAdd ||
    deliveryActions.canEdit;

  const reservationByItemId = useMemo(
    () =>
      new Map(
        (reservationStatus?.lines ?? []).map((line) => [
          line.salesOrderItemId,
          line,
        ]),
      ),
    [reservationStatus?.lines],
  );

  const productionRequestLineByItemId = useMemo(() => {
    const map = new Map<
      string,
      { salesOrderItemId: string; requestedQty: number }
    >();
    const eligibleItems = eligibleSoQuery.data?.data?.items ?? [];
    const reservationLines = reservationStatus?.lines ?? [];
    for (const item of eligibleItems) {
      const line = buildProductionRequestLine(
        item.salesOrderItemId,
        reservationLines,
        eligibleItems,
      );
      if (line) {
        map.set(item.salesOrderItemId, line);
      }
    }
    return map;
  }, [eligibleSoQuery.data?.data?.items, reservationStatus?.lines]);

  const productionRequestItems = useMemo(
    () =>
      Array.from(productionRequestLineByItemId.values()).map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    [productionRequestLineByItemId],
  );

  /**
   * **เงื่อนไขยืนยันเปลี่ยนแล้ว (2026-08-26)** — เดิมต้องของพอและจองครบก่อน
   * (hasShortage เป็น false และ allLinesReserved เป็น true)
   *
   * ตอนนี้ยืนยันได้แม้สต๊อกเป็น 0 ขอแค่ **จัดรอบจัดส่งครบทุกบรรทัด**
   * (backend เช็คด้วย assertFullyScheduled) เพราะด่านเช็คของย้ายไปตอน
   * คลังเปิดใบจ่ายของแต่ละรอบแล้ว
   *
   * **ต้องอยู่เหนือ early return ทุกตัว** — วางไว้ล่างกว่านั้นจะกลายเป็น hook
   * ที่เรียกแบบมีเงื่อนไข แล้ว React พังทั้งหน้า ("Rendered more hooks than
   * during the previous render") · ใช้ query เดียวกับแผงจัดรอบ จึงโดน cache
   * ไม่ได้ยิงซ้ำ
   */
  const schedulesForGate = useDeliverySchedulesQuery(data?.id);
  const isFullyScheduled = useMemo(() => {
    const items = data?.items ?? [];
    if (!items.length) return false;
    const schedules = schedulesForGate.data;
    if (!schedules) return false;
    const scheduledByItem = new Map<string, number>();
    for (const schedule of schedules) {
      if (schedule.status === "CANCELLED") continue;
      for (const line of schedule.items ?? []) {
        scheduledByItem.set(
          line.salesOrderItemId,
          (scheduledByItem.get(line.salesOrderItemId) ?? 0) +
            Number(line.quantity ?? 0),
        );
      }
    }
    return items.every(
      (item) =>
        (scheduledByItem.get(item.id) ?? 0) - Number(item.quantity ?? 0) >
        -0.0005,
    );
  }, [data?.items, schedulesForGate.data]);

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบสั่งขาย
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-orders">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  if (!canOpenDetail) {
    return (
      <AccessDenied
        screenCodes={[
          "SALES_ORDERS",
          "SALES_STOCK_VERIFICATION",
          "PICKINGS",
          "PACKINGS",
          "DELIVERY_ORDERS",
        ]}
      />
    );
  }

  const busy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    createProductionRequestMutation.isPending ||
    uploadAttachmentMutation.isPending ||
    deleteAttachmentMutation.isPending ||
    updateCustomerPoMutation.isPending ||
    updateHeaderMutation.isPending ||
    updateItemsMutation.isPending;
  // ส่ง deliveryStatus ไปด้วย — หลังยืนยัน so.status ค้างที่ CONFIRMED ตลอด
  // ความคืบหน้าจริงอยู่ที่ delivery_status ที่สรุปจากทุกรอบ
  const progress = resolveSalesOrderProgress(
    data.status,
    data.deliveryStatus,
    // รอบที่คืบหน้าน้อยสุดที่ยังไม่จบ — ทำให้แถบตรงกับหัวเรื่อง
    (tracking?.rounds ?? []).find(
      (round) =>
        round.roundStatus !== "DELIVERED" && round.roundStatus !== "CANCELLED",
    )?.roundStatus,
  );

  const canEditItems = isPreConfirm && canWrite;
  const isEditingItems = itemDrafts !== null;

  const startEditItems = () => {
    setItemDrafts(
      Object.fromEntries(
        data.items.map((item) => [
          item.id,
          {
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            discountAmount: Number(item.discountAmount) || 0,
          },
        ]),
      ),
    );
  };

  const patchItemDraft = (
    itemId: string,
    patch: Partial<{
      quantity: number;
      unitPrice: number;
      discountAmount: number;
    }>,
  ) => {
    setItemDrafts((prev) =>
      prev ? { ...prev, [itemId]: { ...prev[itemId], ...patch } } : prev,
    );
  };

  const saveItemDrafts = async () => {
    if (!itemDrafts) return;

    // ส่งเฉพาะบรรทัดที่ค่าเปลี่ยนจริง
    const changed = data.items
      .filter((item) => {
        const draft = itemDrafts[item.id];
        if (!draft) return false;
        return (
          Math.abs(draft.quantity - Number(item.quantity)) > 0.0005 ||
          Math.abs(draft.discountAmount - Number(item.discountAmount)) > 0.005
        );
      })
      .map((item) => ({
        id: item.id,
        quantity: itemDrafts[item.id].quantity,
        discountAmount: itemDrafts[item.id].discountAmount,
      }));

    if (!changed.length) {
      setItemDrafts(null);
      message.info("ไม่มีรายการที่เปลี่ยนแปลง");
      return;
    }

    const invalid = changed.find((line) => {
      const unitPrice = Number(
        data.items.find((item) => item.id === line.id)?.unitPrice ?? 0,
      );
      return (
        line.quantity <= 0 ||
        line.discountAmount < 0 ||
        line.discountAmount > line.quantity * unitPrice + 0.005
      );
    });
    if (invalid) {
      message.error(
        "ตรวจค่าอีกครั้ง — จำนวนต้องมากกว่า 0 และส่วนลดต้องไม่เกินยอดของรายการ",
      );
      return;
    }

    await updateItemsMutation.mutateAsync({ id: data.id, body: { items: changed } });
    setItemDrafts(null);
    setSelectedPdfVersion("current");
  };

  const openCustomerPoModal = (initial?: string) => {
    setPoDraft((initial ?? data.customerPoNo ?? "").trim());
    setPoModalOpen(true);
  };

  const closeAttachmentPreview = () => {
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewTitle("");
    setPreviewIsImage(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const downloadAttachment = async (file: DocumentAttachment) => {
    try {
      const { blob, filename } = await downloadDocumentAttachment(
        getAccessToken(),
        file.id,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || attachmentDisplayName(file);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "ดาวน์โหลดไฟล์ไม่สำเร็จ",
      );
    }
  };

  const openAttachmentPreview = async (file: DocumentAttachment) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewTitle(attachmentDisplayName(file));
    setPreviewIsImage(isImageMime(file.mimeType));
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      const { blob } = await downloadDocumentAttachment(
        getAccessToken(),
        file.id,
      );
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "เปิดไฟล์ไม่สำเร็จ",
      );
      closeAttachmentPreview();
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveCustomerPo = () => {
    const value = poDraft.trim();
    if (!value) {
      message.warning("กรุณากรอกเลข PO จากไฟล์หลักฐาน");
      return;
    }
    updateCustomerPoMutation.mutate(
      { id: data.id, body: { customerPoNo: value } },
      {
        onSuccess: () => {
          setPoModalOpen(false);
        },
      },
    );
  };

  const uploadProps: UploadProps = {
    showUploadList: false,
    multiple: true,
    accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*",
    beforeUpload: (file) => {
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        message.error("รองรับเฉพาะ PDF และรูป JPG/PNG/WEBP");
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        message.error("ขนาดไฟล์ต้องไม่เกิน 20MB");
        return Upload.LIST_IGNORE;
      }
      void uploadAttachmentMutation
        .mutateAsync({ documentId: data.id, file })
        .then(() => {
          openCustomerPoModal(data.customerPoNo);
        });
      return false;
    },
  };

  const pickingStep = findStep(timeline, "Picking");
  const packingStep = findStep(timeline, "Packing");
  const allLinesReserved = reservationStatus?.isAllFullyReserved === true;
  const hasShortage = reservationStatus?.hasShortage === true;
  const hasUnplannedShortage =
    reservationStatus?.hasUnplannedShortage === true;
  const hasStockShortage = productionRequestItems.length > 0;
  const reservationReady =
    Boolean(reservationStatus) && !reservationQuery.isLoading;
  const stockReadyForReserve =
    isPreConfirm && reservationReady && !hasShortage && !allLinesReserved;
  const showReserveCta = stockReadyForReserve && canWrite;

  const showConfirmCta =
    isPreConfirm && canConfirm && isFullyScheduled && !isEditingItems;
  const hasCustomerPo = Boolean(data.customerPoNo?.trim());
  const hasEvidenceFile = attachments.some(
    (file) => file.attachmentGroup === ATTACHMENT_GROUP_CUSTOMER_PO,
  );
  const evidenceReady = hasCustomerPo || hasEvidenceFile;
  const confirmBlocked =
    reservationQuery.isLoading ||
    attachmentsQuery.isLoading ||
    uploadAttachmentMutation.isPending ||
    !evidenceReady;

  const tryConfirmSalesOrder = () => {
    if (uploadAttachmentMutation.isPending) {
      message.warning("รออัปโหลดไฟล์ให้สำเร็จก่อนยืนยันใบสั่งขาย");
      return;
    }
    if (!evidenceReady) {
      message.warning(
        "กรณีไม่มีเลข PO ลูกค้า ต้องแนบไฟล์ยืนยันอย่างน้อย 1 ไฟล์",
      );
      return;
    }
    if (isEditingItems) {
      message.warning("บันทึกรายการสินค้าก่อน แล้วยืนยันใบสั่งขายแยกต่างหาก");
      return;
    }
    confirmMutation.mutate(data.id);
  };

  const canEditHeader = isPreConfirm && canWrite;
  const saveHeader = () => {
    updateHeaderMutation.mutate(
      {
        id: data.id,
        body: {
          contactName: headerDraft.contactName,
          paymentMethod: headerDraft.paymentMethod,
          paymentDueDate: headerDraft.paymentDueDate || undefined,
          customerPoDate: headerDraft.customerPoDate || undefined,
          remark: headerDraft.remark,
          vatMode: resolveVatMode(headerDraft.vatMode),
          taxRateId:
            resolveVatMode(headerDraft.vatMode) === VatMode.NONE
              ? undefined
              : headerDraft.taxRateId,
        },
      },
      { onSuccess: () => setSelectedPdfVersion("current") },
    );
  };
  /**
   * ขอผลิตจากหน้าใบสั่งขายได้ด้วยสิทธิ์แก้ไข SO — ไม่ต้องมีสิทธิ์หน้าจอใบขอผลิต
   * (backend เปิด SALES_ORDERS.EDIT ให้ POST /production-requests ด้วย)
   */
  const canCreateProductionRequest =
    productionRequestActions.canAdd || canWrite;
  /** เปิดหน้า/เอกสารใบขอผลิตได้เฉพาะคนที่มีสิทธิ์หน้าจอนั้น (AuthGuard กันตาม route) */
  const canOpenProductionRequestScreen = productionRequestActions.canView;
  const hasActiveProductionRequest = linkedProductionRequests.some(
    (pr) => pr.status !== "CANCELLED",
  );
  const canIssueProductionRequest =
    canCreateProductionRequest && !hasActiveProductionRequest;

  let flowHint: string | null = null;
  if (data.status === "STOCK_CHECKED" && pickingStep?.status === "DRAFT") {
    flowHint =
      "มีใบจ่ายสินค้าร่างแล้ว — ต้องยืนยันตัดสต๊อกก่อนสร้างใบบรรจุ";
  } else if (
    (data.status === "PICKING" || data.status === "PARTIALLY_ISSUED") &&
    !packingStep?.documentId
  ) {
    flowHint =
      pickingStep?.status !== "CONFIRMED"
        ? "ต้องยืนยันใบจ่ายสินค้าก่อนจึงจะสร้างใบบรรจุได้"
        : "ใบจ่ายสินค้ายืนยันแล้ว — กดสร้างใบบรรจุสินค้าเพื่อไปขั้นถัดไป";
  } else if (data.status === "PACKED" && packingStep?.status === "DRAFT") {
    flowHint =
      "มีใบบรรจุร่างแล้ว — ต้องยืนยันใบบรรจุก่อนสร้างใบส่งสินค้า";
  }

  const printLivePdf = async () => {
    const { generateSalesOrderPdf } = await import(
      "@/utils/generateSalesOrderPdf"
    );
    const pdfData = buildSalesOrderPdfDataFromOrder(data, {
      schedules: schedulesForGate.data ?? [],
      headerDraft,
      itemDrafts,
      taxRates,
    });
    await generateSalesOrderPdf(pdfData);
  };

  const printSnapshotPdf = async () => {
    const { generateSalesOrderPdf } = await import(
      "@/utils/generateSalesOrderPdf"
    );
    const pdfSnapshots = pdfSnapshotsQuery.data?.data?.items ?? [];
    const snapshot = pdfSnapshots.find(
      (entry) => entry.id === selectedPdfVersion,
    );
    if (!snapshot) {
      message.warning("ไม่พบฉบับเก่าที่เลือก");
      return;
    }
    await generateSalesOrderPdf(mapSnapshotPayloadToPdfData(snapshot.payload));
  };

  const pdfSnapshots = pdfSnapshotsQuery.data?.data?.items ?? [];

  const openProductionRequestModal = (
    pending: PendingProductionRequest,
  ) => {
    if (hasActiveProductionRequest) {
      message.warning("ใบสั่งขายนี้มีใบขอผลิตแล้ว — ออกใบขอผลิตซ้ำไม่ได้");
      return;
    }
    if (pending.kind === "all" && !productionRequestItems.length) {
      message.warning("ไม่มีรายการที่สต๊อกไม่พอให้ขอผลิต");
      return;
    }
    if (pending.kind === "line") {
      const line = productionRequestLineByItemId.get(pending.salesOrderItemId);
      if (!line) {
        message.warning("ไม่สามารถขอผลิตรายการนี้ได้");
        return;
      }
    }
    const today = dayjs(todayInErp());
    const preferred = data.requestedDeliveryDate
      ? dayjs(data.requestedDeliveryDate)
      : today;
    setProductionRequiredDate(
      preferred.isBefore(today, "day") ? today : preferred,
    );
    setPendingProductionRequest(pending);
  };

  const submitProductionRequest = () => {
    if (!pendingProductionRequest) {
      return;
    }
    if (!productionRequiredDate) {
      message.warning("กรุณาเลือกวันที่ต้องการผลผลิต");
      return;
    }
    if (productionRequiredDate.isBefore(dayjs(todayInErp()), "day")) {
      message.warning("วันที่ต้องการผลผลิตต้องไม่ย้อนหลังจากวันปัจจุบัน");
      return;
    }
    const requiredDate = productionRequiredDate.format("YYYY-MM-DD");
    const onSuccess = (response: {
      data?: { id?: string; requestNo?: string };
    }) => {
      setPendingProductionRequest(null);
      void eligibleSoQuery.refetch();
      void productionRequestsQuery.refetch();
      void reservationQuery.refetch();
      // ไม่มีสิทธิ์หน้าจอใบขอผลิต = เปิดหน้านั้นไม่ได้ (AuthGuard เด้ง) — อยู่หน้านี้ต่อ
      if (response.data?.id && canOpenProductionRequestScreen) {
        router.push(`/production/production-requests/${response.data.id}`);
        return;
      }
      message.success(
        response.data?.requestNo
          ? `ออกใบขอผลิต ${response.data.requestNo} แล้ว — รอฝ่ายผลิตเปิดใบสั่งผลิต`
          : "ออกใบขอผลิตแล้ว — รอฝ่ายผลิตเปิดใบสั่งผลิต",
      );
    };

    if (pendingProductionRequest.kind === "all") {
      if (!productionRequestItems.length) {
        message.warning("ไม่มีรายการที่สต๊อกไม่พอให้ขอผลิต");
        return;
      }
      createProductionRequestMutation.mutate(
        {
          salesOrderId: data.id,
          requestDate: todayInErp(),
          requiredDate,
          remark: `ขอผลิตอัตโนมัติจาก ${data.soNo} สำหรับรายการที่สต๊อกไม่พอ`,
          items: productionRequestItems,
        },
        { onSuccess },
      );
      return;
    }

    const line = productionRequestLineByItemId.get(
      pendingProductionRequest.salesOrderItemId,
    );
    if (!line) {
      message.warning("ไม่สามารถขอผลิตรายการนี้ได้");
      return;
    }
    createProductionRequestMutation.mutate(
      {
        salesOrderId: data.id,
        requestDate: todayInErp(),
        requiredDate,
        remark: `ขอผลิตจาก ${data.soNo} — ${pendingProductionRequest.itemCode ?? "สินค้า"} ขาด ${line.requestedQty.toLocaleString("th-TH")}`,
        items: [{ ...line, sortOrder: 0 }],
      },
      { onSuccess },
    );
  };

  const cancelButton =
    canWrite &&
    canCancelSalesOrder({
      status: data.status,
      deliveryStatus: data.deliveryStatus,
      items: data.items,
      rounds: tracking?.rounds,
    }) ? (
      <Button
        danger
        icon={<CloseOutlined />}
        loading={busy}
        onClick={() =>
          modal.confirm({
            title: "ยืนยันยกเลิกใบสั่งขาย?",
            content: isPreConfirm
              ? "ของที่จองไว้จะถูกคืนเข้าคลัง"
              : "ยกเลิกใบสั่งขาย และคืนสต๊อกที่จองไว้ (ถ้ายังไม่ได้จ่ายออกคลัง)",
            okText: "ยกเลิกใบสั่งขาย",
            okButtonProps: { danger: true },
            onOk: () => cancelMutation.mutateAsync(data.id),
          })
        }
      >
        ยกเลิกเอกสาร
      </Button>
    ) : null;

  const waitProcessHint = (
    <span className={styles.waitProcessHint}>รอกระบวนการ</span>
  );
  const navOrWait = (allowed: boolean, button: ReactNode): ReactNode =>
    allowed ? button : waitProcessHint;

  let nextStepButton: ReactNode = null;
  if (data.status === "CONFIRMED") {
    /*
     * ยืนยันแล้ว → ปุ่มต้องชี้ไปที่ **งานถัดไปของรอบที่คืบหน้าน้อยสุด**
     *
     * เดิมชี้ "ยืนยันผลตรวจสอบสต๊อก" ซึ่งไม่มีผลอะไรแล้ว · แก้รอบแรกให้ชี้
     * "ไปเลือกรอบจัดส่ง" ซึ่งก็ยังผิดเมื่อรอบนั้นเลยขั้นจ่ายไปแล้ว — หน้าเลือกรอบ
     * จะไม่มีรอบนั้นให้เลือก (ถูกต้อง เพราะมีใบจ่ายแล้ว) คนจึงเจอหน้าที่ทำอะไร
     * ไม่ได้ · ต้องดูสถานะรอบแล้วพาไปเอกสารที่ค้างอยู่จริง
     */
    const roundInFlight = (tracking?.rounds ?? []).find(
      (round) =>
        round.roundStatus !== "DELIVERED" && round.roundStatus !== "CANCELLED",
    );
    const roundDoc = (step: string) =>
      roundInFlight?.timeline?.find((s) => s.step === step);
    const packingDoc = roundDoc("Packing");
    const pickingDoc = roundDoc("Picking");

    let roundAction: ReactNode;
    if (
      data.deliveryStatus === "DELIVERED" ||
      !roundInFlight
    ) {
      // ส่งครบทุกรอบแล้ว (หรือไม่มีรอบค้าง) — อย่าโชว์ปุ่มไปสร้างใบจ่าย
      roundAction = null;
    } else if (roundInFlight.roundStatus === "PACKED") {
      const canCreateDo = deliveryActions.canAdd;
      roundAction =
        canCreateDo && packingDoc?.documentId ? (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() =>
              router.push(
                `/delivery-orders/create-from-packing/${packingDoc.documentId}`,
              )
            }
          >
            สร้างใบส่งสินค้า (รอบ {roundInFlight.roundNo})
          </Button>
        ) : canCreateDo ? (
          waitProcessHint
        ) : null;
    } else if (roundInFlight.roundStatus === "ISSUED") {
      // จ่ายของแล้ว → สร้าง/เปิดใบบรรจุ
      roundAction = pickingDoc?.documentId ? (
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<ShoppingOutlined />}
          onClick={() =>
            router.push(`/packings/create-from-picking/${pickingDoc.documentId}`)
          }
        >
          สร้างใบบรรจุสินค้า (รอบ {roundInFlight.roundNo})
        </Button>
      ) : (
        waitProcessHint
      );
    } else if (pickingActions.canAdd) {
      // ยังไม่จ่าย — ถ้ามีใบจ่ายร่างอยู่แล้วให้เปิดใบนั้น ไม่ใช่ไปสร้างใหม่
      roundAction = pickingDoc?.documentId ? (
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<ShoppingOutlined />}
          onClick={() => router.push(`/pickings/${pickingDoc.documentId}/edit`)}
        >
          เปิดใบจ่ายสินค้า (ร่าง)
        </Button>
      ) : (
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<ShoppingOutlined />}
          onClick={() => router.push("/pickings/create-from-sales-order")}
        >
          ไปเลือกรอบจัดส่งเพื่อสร้างใบจ่าย
        </Button>
      );
    } else {
      roundAction = waitProcessHint;
    }

    nextStepButton = (
      <>
        {roundAction}
        {canOpenStockCheck ? (
          <Button
            icon={<SearchOutlined />}
            onClick={() =>
              router.push(`/sales-orders/${data.id}/stock-verification`)
            }
          >
            ดูผลตรวจสต๊อก
          </Button>
        ) : null}
      </>
    );
  } else if (data.status === "STOCK_CHECKED") {
    const picking = findStep(timeline, "Picking");
    const canCreatePicking = pickingActions.canAdd;
    const canEditPicking = pickingActions.canEdit;
    if (picking?.href) {
      const pickingDraft = picking.status === "DRAFT";
      if (pickingDraft && canEditPicking) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() => router.push(`${picking.href}/edit`)}
          >
            ยืนยันใบจ่ายสินค้า (ตัดสต๊อก)
          </Button>
        );
      } else {
        nextStepButton = navOrWait(
          pickingActions.canView,
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() => router.push(picking.href as string)}
          >
            เปิดใบจ่ายสินค้า
          </Button>,
        );
      }
    } else {
      nextStepButton = navOrWait(
        canCreatePicking,
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<ShoppingOutlined />}
          onClick={() =>
            router.push(`/pickings/create-from-sales-order/${data.id}`)
          }
        >
          สร้างใบจ่ายสินค้า
        </Button>,
      );
    }
  } else if (
    data.status === "PICKING" ||
    data.status === "PARTIALLY_ISSUED"
  ) {
    const picking = findStep(timeline, "Picking");
    const packing = findStep(timeline, "Packing");

    if (packing?.href) {
      const packingDraft = packing.status === "DRAFT";
      if (packingDraft && packingActions.canEdit) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => router.push(`${packing.href}/edit`)}
          >
            แก้ไข/ยืนยันใบบรรจุ
          </Button>
        );
      } else {
        nextStepButton = navOrWait(
          packingActions.canView,
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => router.push(packing.href as string)}
          >
            เปิดใบบรรจุสินค้า
          </Button>,
        );
      }
    } else if (picking?.documentId && picking.status === "CONFIRMED") {
      nextStepButton = navOrWait(
        packingActions.canAdd,
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<InboxOutlined />}
          onClick={() =>
            router.push(`/packings/create-from-picking/${picking.documentId}`)
          }
        >
          สร้างใบบรรจุสินค้า
        </Button>,
      );
    } else if (picking?.href) {
      if (picking.status === "DRAFT" && pickingActions.canEdit) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() => router.push(`${picking.href}/edit`)}
          >
            ยืนยันใบจ่ายสินค้าก่อนบรรจุ
          </Button>
        );
      } else {
        nextStepButton = navOrWait(
          pickingActions.canView,
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() => router.push(picking.href as string)}
          >
            ยืนยันใบจ่ายสินค้าก่อนบรรจุ
          </Button>,
        );
      }
    } else {
      nextStepButton = navOrWait(
        packingActions.canAdd,
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<InboxOutlined />}
          onClick={() => router.push("/packings/create-from-picking")}
        >
          สร้างใบบรรจุสินค้า
        </Button>,
      );
    }
  } else if (data.status === "PACKED") {
    const packing = findStep(timeline, "Packing");
    const delivery = findStep(timeline, "Delivery");
    if (delivery?.href) {
      nextStepButton = navOrWait(
        deliveryActions.canView,
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<CarOutlined />}
          onClick={() => router.push(delivery.href as string)}
        >
          ดูใบส่งสินค้า
        </Button>,
      );
    } else if (packing?.documentId && packing.status === "CONFIRMED") {
      const canCreateDo = canCreateDeliveryFromPacking({
        delivery: deliveryActions,
        salesOrder: salesOrderActions,
      });
      nextStepButton = canCreateDo ? (
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<CarOutlined />}
          onClick={() =>
            router.push(
              `/delivery-orders/create-from-packing/${packing.documentId}`,
            )
          }
        >
          สร้างใบส่งสินค้า
        </Button>
      ) : null;
    } else if (packing?.href && packing.status === "DRAFT") {
      nextStepButton = navOrWait(
        packingActions.canEdit,
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<InboxOutlined />}
          onClick={() => router.push(`${packing.href}/edit`)}
        >
          ยืนยันใบบรรจุก่อนส่งสินค้า
        </Button>,
      );
    } else {
      const canCreateDo = canCreateDeliveryFromPacking({
        delivery: deliveryActions,
        salesOrder: salesOrderActions,
      });
      nextStepButton = canCreateDo ? (
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<CarOutlined />}
          onClick={() => router.push("/delivery-orders/create-from-packing")}
        >
          สร้างใบส่งสินค้า
        </Button>
      ) : null;
    }
  }

  const showingWaitProcess = nextStepButton === waitProcessHint;

  const pendingProductionRequestLabel =
    pendingProductionRequest?.kind === "line"
      ? pendingProductionRequest.itemCode
        ? `รายการ ${pendingProductionRequest.itemCode}`
        : "รายการที่เลือก"
      : "ทุกรายการที่สต๊อกไม่พอ";

  let preConfirmHeaderButton: ReactNode = null;
  if (showConfirmCta) {
    preConfirmHeaderButton = (
      <Button
        className={styles.primaryBtn}
        type="primary"
        htmlType="button"
        icon={<CheckOutlined />}
        loading={confirmMutation.isPending}
        disabled={confirmBlocked}
        onClick={tryConfirmSalesOrder}
      >
        ยืนยันใบสั่งขาย
      </Button>
    );
  }

  const pdfPreviewBlock = (
    <Button
      className={styles.secondaryBtn}
      htmlType="button"
      icon={<FilePdfOutlined />}
      onClick={() => void printLivePdf()}
    >
      ตัวอย่างเอกสาร
    </Button>
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ShoppingCartOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>ขาย · ใบสั่งขาย</p>
          <h1 className={styles.pageTitle}>{data.soNo}</h1>
          {salesOrderRevisionStamp(data.revisedAt) ? (
            <p className={styles.revisionStamp}>
              {salesOrderRevisionStamp(data.revisedAt)}
            </p>
          ) : null}
          <p className={styles.pageSubtitle}>
            {data.customer
              ? `${data.customer.customerCode} — ${data.customer.nameTh}`
              : "—"}{" "}
            · {formatDate(data.soDate)} · {formatMoney(data.totalAmount)} บาท
            {data.deliveryStatus
              ? ` · ${salesOrderDeliveryStatusLabel(data.status, data.deliveryStatus)}`
              : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/sales-orders")}
          >
            กลับ
          </Button>
          {pdfSnapshots.length > 0 ? (
            <Space wrap>
              <Select
                aria-label="ประวัติฉบับเก่า"
                allowClear
                placeholder="ประวัติฉบับเก่า"
                value={
                  selectedPdfVersion === "current"
                    ? undefined
                    : selectedPdfVersion
                }
                onChange={(value) =>
                  setSelectedPdfVersion(value ?? "current")
                }
                style={{ minWidth: 220 }}
                options={pdfSnapshots.map((snapshot) => ({
                  value: snapshot.id,
                  label: `ฉบับที่ ${snapshot.versionNo} — ${dayjs(snapshot.createdAt).format("DD/MM/YYYY HH:mm")}`,
                }))}
              />
              {selectedPdfVersion !== "current" ? (
                <Button
                  htmlType="button"
                  onClick={() => void printSnapshotPdf()}
                >
                  พิมพ์ฉบับเก่า
                </Button>
              ) : null}
            </Space>
          ) : null}
          {isPreConfirm ? (
            <>
              {preConfirmHeaderButton}
              {cancelButton}
            </>
          ) : (
            nextStepButton
          )}
        </div>
      </header>

      <SalesOrderTimeline
        salesOrderId={id}
        salesOrderStatus={data.status}
        salesOrderDeliveryStatus={data.deliveryStatus}
        loading={trackingQuery.isLoading}
        refreshing={
          trackingQuery.isFetching &&
          !trackingQuery.isLoading &&
          Boolean(trackingQuery.data)
        }
        currentStep={tracking?.currentStep}
        nextAction={tracking?.nextAction}
        timeline={timeline}
        progress={progress}
        roundCount={tracking?.roundCount ?? 0}
        rounds={tracking?.rounds ?? []}
        canNavigateHref={(href) =>
          canNavigateSalesFulfillmentHref(href, {
            stockVerification: stockVerificationActions,
            picking: pickingActions,
            packing: packingActions,
            delivery: deliveryActions,
            salesOrder: salesOrderActions,
            quotation: quotationActions,
          })
        }
      />

      {isPreConfirm && allLinesReserved ? (
        <div
          className={`${styles.reserveActionBanner} ${styles.reserveActionBannerReady}`}
        >
          จองสต๊อกแล้ว — ยกเลิกใบได้ก่อนยืนยันเพื่อคืนของ
        </div>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลลูกค้า</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>
                  {data.customer?.nameTh ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>รหัสลูกค้า</span>
                <div className={styles.metaValue}>
                  {data.customer?.customerCode ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่ผู้เสียภาษี</span>
                <div className={styles.metaValue}>
                  {data.customer?.taxId ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ที่อยู่</span>
                <div className={styles.metaValue}>
                  {data.customer?.address ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เบอร์โทร</span>
                <div className={styles.metaValue}>
                  {data.customer?.contactPhone ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ติดต่อ</span>
                <div className={styles.metaValue}>
                  {canEditHeader ? (
                    <Input
                      aria-label="ผู้ติดต่อ"
                      value={headerDraft.contactName}
                      maxLength={255}
                      placeholder="ดึงจาก master ลูกค้า แก้ได้บนใบนี้"
                      onChange={(e) =>
                        setHeaderDraft((prev) => ({
                          ...prev,
                          contactName: e.target.value,
                        }))
                      }
                    />
                  ) : (
                    (data.contactName ?? data.customer?.contactName ?? "—")
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
              {canEditHeader ? (
                <Button
                  size="small"
                  type="primary"
                  loading={updateHeaderMutation.isPending}
                  disabled={busy}
                  onClick={saveHeader}
                >
                  บันทึก
                </Button>
              ) : null}
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่ PO</span>
                <div className={styles.metaValue}>
                  {canUploadEvidence ? (
                    <div className={styles.poField}>
                      <strong>
                        {data.customerPoNo?.trim() || "ยังไม่มีเลข PO"}
                      </strong>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => openCustomerPoModal(data.customerPoNo)}
                      >
                        {data.customerPoNo?.trim() ? "แก้ไข" : "ระบุเลข"}
                      </Button>
                    </div>
                  ) : (
                    (data.customerPoNo?.trim() || "—")
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่เอกสาร PO</span>
                <div className={styles.metaValue}>
                  {canEditHeader ? (
                    <DatePicker
                      aria-label="วันที่เอกสาร PO"
                      format="DD/MM/YYYY"
                      style={{ width: "100%" }}
                      value={
                        headerDraft.customerPoDate
                          ? dayjs(headerDraft.customerPoDate)
                          : null
                      }
                      onChange={(value) =>
                        setHeaderDraft((prev) => ({
                          ...prev,
                          customerPoDate: value
                            ? value.format("YYYY-MM-DD")
                            : "",
                        }))
                      }
                    />
                  ) : (
                    formatDate(data.customerPoDate)
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อ้างอิง QT</span>
                <div className={styles.metaValue}>
                  {data.salesQuotationId ? (
                    <Link href={`/quotations/${data.salesQuotationId}`}>
                      {data.salesQuotationNo ?? data.salesQuotationId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วิธีการชำระเงิน</span>
                <div className={styles.metaValue}>
                  {canEditHeader ? (
                    <Select
                      aria-label="วิธีการชำระเงิน"
                      allowClear
                      placeholder="เลือกวิธีชำระ"
                      style={{ width: "100%" }}
                      options={PAYMENT_METHOD_OPTIONS}
                      value={headerDraft.paymentMethod}
                      onChange={(value) =>
                        setHeaderDraft((prev) => ({
                          ...prev,
                          paymentMethod: value,
                        }))
                      }
                    />
                  ) : (
                    (headerDraft.paymentMethod
                      ? SALES_ORDER_PAYMENT_METHOD_LABEL[
                          headerDraft.paymentMethod
                        ]
                      : null) ??
                    (data.paymentMethod
                      ? (SALES_ORDER_PAYMENT_METHOD_LABEL[
                          data.paymentMethod as SalesOrderPaymentMethod
                        ] ?? data.paymentMethod)
                      : "—")
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ครบกำหนดชำระ</span>
                <div className={styles.metaValue}>
                  {canEditHeader ? (
                    <DatePicker
                      aria-label="ครบกำหนดชำระ"
                      format="DD/MM/YYYY"
                      style={{ width: "100%" }}
                      value={
                        headerDraft.paymentDueDate
                          ? dayjs(headerDraft.paymentDueDate)
                          : null
                      }
                      onChange={(value) =>
                        setHeaderDraft((prev) => ({
                          ...prev,
                          paymentDueDate: value
                            ? value.format("YYYY-MM-DD")
                            : "",
                        }))
                      }
                    />
                  ) : (
                    formatDate(data.paymentDueDate)
                  )}
                </div>
              </div>
              {data.paymentTerm?.name ? (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>เงื่อนไขชำระ</span>
                  <div className={styles.metaValue}>{data.paymentTerm.name}</div>
                </div>
              ) : null}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>รูปแบบ VAT</span>
                <div className={styles.metaValue}>
                  {canEditHeader ? (
                    <Select
                      aria-label="รูปแบบ VAT"
                      style={{ width: "100%" }}
                      options={VAT_MODE_OPTIONS}
                      value={resolveVatMode(headerDraft.vatMode)}
                      onChange={(value) =>
                        setHeaderDraft((prev) => ({
                          ...prev,
                          vatMode: value,
                          taxRateId:
                            value === VatMode.NONE
                              ? undefined
                              : prev.taxRateId,
                        }))
                      }
                    />
                  ) : (
                    (VAT_MODE_LABEL[resolveVatMode(data.vatMode)] ??
                      "ไม่รวม VAT")
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อัตรา VAT</span>
                <div className={styles.metaValue}>
                  {canEditHeader ? (
                    <Select
                      aria-label="อัตรา VAT"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="เลือกอัตรา"
                      style={{ width: "100%" }}
                      disabled={
                        resolveVatMode(headerDraft.vatMode) === VatMode.NONE
                      }
                      value={headerDraft.taxRateId}
                      options={taxRates.map((row) => ({
                        value: row.id,
                        label: `${row.code} — ${row.name} (${row.rate}%)`,
                      }))}
                      onChange={(value) =>
                        setHeaderDraft((prev) => ({
                          ...prev,
                          taxRateId: value,
                        }))
                      }
                    />
                  ) : data.taxRate ? (
                    `${data.taxRate.name} (${data.taxRate.rate}%)`
                  ) : (
                    "ไม่คิด VAT"
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <PaperClipOutlined /> หลักฐานยืนยันคำสั่งซื้อ
                </h2>
                <p className={styles.sectionHint}>
                  มีเลข PO หรือแนบไฟล์ยืนยันอย่างน้อย 1 ไฟล์ก่อนยืนยันใบสั่งขาย
                  — กรณีไม่มีเลข PO ต้องแนบไฟล์ยืนยันอื่น
                </p>
              </div>
              {canUploadEvidence ? (
                <Upload {...uploadProps}>
                  <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    loading={uploadAttachmentMutation.isPending}
                    disabled={busy}
                  >
                    อัปโหลดหลักฐาน
                  </Button>
                </Upload>
              ) : null}
            </div>

            <div className={styles.evidenceGrid}>
              <div className={styles.evidenceCard}>
                <span className={styles.evidenceCardLabel}>ใบเสนอราคา</span>
                {data.salesQuotationId ? (
                  <Link
                    href={`/quotations/${data.salesQuotationId}`}
                    className={styles.evidenceLinkCard}
                  >
                    <span className={styles.evidenceLinkIcon}>
                      <FileTextOutlined />
                    </span>
                    <span className={styles.evidenceLinkBody}>
                      <strong>
                        {data.salesQuotationNo ?? data.salesQuotationId}
                      </strong>
                      <span>เปิดดูใบเสนอราคาต้นทาง</span>
                    </span>
                  </Link>
                ) : (
                  <div className={styles.evidenceEmpty}>
                    ไม่มีใบเสนอราคาอ้างอิง
                  </div>
                )}
              </div>

              <div className={styles.evidenceCard}>
                <div className={styles.evidenceCardTop}>
                  <span className={styles.evidenceCardLabel}>เลข PO ลูกค้า</span>
                  {canUploadEvidence ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => openCustomerPoModal(data.customerPoNo)}
                    >
                      {data.customerPoNo?.trim() ? "แก้ไข" : "ระบุเลข"}
                    </Button>
                  ) : null}
                </div>
                {data.customerPoNo?.trim() ? (
                  <div className={styles.poBadge}>
                    <span className={styles.poBadgeEyebrow}>เลขที่ PO</span>
                    <strong>{data.customerPoNo.trim()}</strong>
                  </div>
                ) : (
                  <div className={styles.evidenceEmptyWarn}>
                    ยังไม่มีเลข PO — ต้องแนบไฟล์ยืนยันอื่นก่อนยืนยันใบสั่งขาย
                  </div>
                )}
              </div>
            </div>

            <div className={styles.evidenceFilesBlock}>
              <div className={styles.evidenceFilesTitle}>
                <span>ไฟล์ที่แนบแล้ว</span>
                <span className={styles.evidenceFilesCount}>
                  {attachmentsQuery.isLoading
                    ? "…"
                    : `${attachments.length} ไฟล์`}
                </span>
              </div>

              {attachmentsQuery.isLoading ? (
                <div className={styles.evidenceLoading}>
                  <Spin size="small" /> กำลังโหลดไฟล์แนบ...
                </div>
              ) : attachments.length === 0 ? (
                <div className={styles.evidenceDropHint}>
                  <UploadOutlined />
                  <div>
                    <strong>ยังไม่มีไฟล์หลักฐาน</strong>
                    <span>
                      รองรับ PDF และรูป JPG/PNG/WEBP ขนาดไม่เกิน 20MB
                      อัปโหลดได้หลายไฟล์
                    </span>
                  </div>
                </div>
              ) : (
                <ul className={styles.attachmentList}>
                  {attachments.map((file) => (
                    <li key={file.id} className={styles.attachmentItem}>
                      <div className={styles.attachmentIcon}>
                        {isImageMime(file.mimeType) ? (
                          <EyeOutlined />
                        ) : (
                          <FilePdfOutlined />
                        )}
                      </div>
                      <div className={styles.attachmentMeta}>
                        <span className={styles.attachmentName}>
                          {attachmentDisplayName(file)}
                        </span>
                        {file.description ? (
                          <span className={styles.attachmentDesc}>
                            {file.description}
                          </span>
                        ) : (
                          <span className={styles.attachmentDesc}>
                            หลักฐานยืนยันคำสั่งซื้อ
                          </span>
                        )}
                      </div>
                      <div className={styles.attachmentActions}>
                        {(isImageMime(file.mimeType) ||
                          file.mimeType === "application/pdf") && (
                          <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => void openAttachmentPreview(file)}
                          >
                            ดู
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => void downloadAttachment(file)}
                        >
                          ดาวน์โหลด
                        </Button>
                        {canUploadEvidence ? (
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            loading={
                              deleteAttachmentMutation.isPending &&
                              deleteAttachmentMutation.variables
                                ?.attachmentId === file.id
                            }
                            disabled={busy}
                            onClick={() =>
                              modal.confirm({
                                title: "ยืนยันลบไฟล์แนบ?",
                                content: attachmentDisplayName(file),
                                okText: "ลบ",
                                okButtonProps: { danger: true },
                                onOk: () =>
                                  deleteAttachmentMutation.mutateAsync({
                                    attachmentId: file.id,
                                    documentId: data.id,
                                  }),
                              })
                            }
                          >
                            ลบ
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {isPreConfirm ? "การจองสต๊อก" : "ผลตรวจสอบสต๊อก"}
              </h2>
              <span className={styles.sectionHint}>
                {isPreConfirm
                  ? hasUnplannedShortage
                    ? hasActiveProductionRequest
                      ? "สต๊อกไม่พอ — มีใบขอผลิตแล้ว ติดตามของเข้าคลังได้จากเอกสารนั้น · ยืนยันใบสั่งขายได้เลยไม่ต้องรอของ"
                      : "สต๊อกไม่พอ — เปิดใบขอผลิตไว้ได้ · ยืนยันใบสั่งขายได้เลยไม่ต้องรอของ ขอแค่จัดรอบจัดส่งให้ครบ"
                    : allLinesReserved
                      ? "จองสต๊อกแล้ว — ยกเลิกใบได้ก่อนยืนยันเพื่อคืนของ"
                      : "ของพอจะถูกจองตอนสร้างใบ ถ้าไม่พอจองเท่าที่มี"
                  : "เทียบยอด quantity_available รวมทุกคลังกับจำนวนที่สั่งขาย"}
              </span>
            </div>
            {isPreConfirm ? (
              reservationQuery.isLoading ? (
                <Spin size="small" />
              ) : reservationStatus ? (
                <>

                  {hasUnplannedShortage ? (
                    <p className={styles.stockReadyNote}>
                      สต๊อกไม่พอ ณ ตอนนี้ —{" "}
                      {hasActiveProductionRequest
                        ? "มีใบขอผลิตอยู่แล้ว เปิดเพิ่มได้ถ้าต้องแบ่งผลิตหลายงวด"
                        : "เปิดใบขอผลิตไว้ได้"}{" "}
                      · <strong>ยืนยันใบสั่งขายได้เลยไม่ต้องรอของ</strong>{" "}
                      ด่านเช็คของอยู่ตอนคลังเปิดใบจ่ายของแต่ละรอบ
                    </p>
                  ) : null}
                </>
              ) : (
                <p className={styles.textBlock}>ไม่สามารถโหลดสถานะการจองได้</p>
              )
            ) : (
              <>
                {data.status === "CONFIRMED" &&
                stockVerification?.isAllAvailable ? (
                  <p className={styles.stockReadyNote}>
                    สต๊อกพอทุกรายการ ณ ตอนนี้ — หน้านี้เป็นรายงานอ่านอย่างเดียว ·
                    ขั้นถัดไปคือคลังเปิดใบจ่ายสินค้าของรอบที่ถึงกำหนด
                    (ใช้ของที่จองไว้ตอนสร้างใบ ไม่จองซ้ำ)
                  </p>
                ) : null}
                {stockVerificationQuery.isLoading ? (
                  <Spin size="small" />
                ) : stockVerification ? (
                  <div className={styles.itemList}>
                    {stockVerification.lines.map((line) => {
                      const tag = stockVerificationLineTag(line);
                      const issued = Number(line.issuedQty ?? 0);
                      const pending = Number(line.pendingProductionQty ?? 0);
                      const unplanned = Number(
                        line.unplannedShortageQty ?? line.shortageQty,
                      );
                      return (
                      <div key={line.salesOrderItemId} className={styles.itemCard}>
                        <div className={styles.itemIndex}>
                          {line.isAvailable || unplanned <= 0.0005 ? "✓" : "!"}
                        </div>
                        <div className={styles.itemBody}>
                          <p className={styles.itemName}>
                            {line.itemCode
                              ? `${line.itemCode} — ${line.itemName ?? ""}`
                              : (line.itemName ?? "—")}
                          </p>
                          <p className={styles.itemCode}>
                            ต้องการ{" "}
                            {Number(line.orderedQty).toLocaleString("th-TH")}
                            {issued > 0.0005
                              ? ` · จ่ายแล้ว ${issued.toLocaleString("th-TH")}`
                              : ""}
                            {" · "}
                            จองแล้ว{" "}
                            {Number(line.reservedQty ?? 0).toLocaleString(
                              "th-TH",
                            )}
                            {" · "}
                            พร้อมใช้ว่าง{" "}
                            {Number(line.availableQty).toLocaleString("th-TH")}
                            {pending > 0.0005
                              ? ` · รอผลิต ${pending.toLocaleString("th-TH")}`
                              : ""}
                            {unplanned > 0.0005
                              ? ` · ขาดอีก ${unplanned.toLocaleString("th-TH")}`
                              : ""}
                          </p>
                        </div>
                        <div className={styles.itemQty}>
                          <Tag color={tag.color}>{tag.label}</Tag>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.textBlock}>
                    ไม่สามารถตรวจสอบยอดคงเหลือได้
                  </p>
                )}
              </>
            )}
          </div>

          {isPreConfirm && canIssueProductionRequest && hasStockShortage ? (
            <div className={`${styles.section} ${styles.productionSpotlight}`}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>รายการที่ต้องขอผลิตเพิ่ม</h2>
                  <p className={styles.sectionHint}>
                    สต๊อกไม่พอ — ออกใบขอผลิตได้ทีละรายการหรือรวมทั้งใบ ·
                    ไม่บล็อกการยืนยันใบสั่งขาย
                  </p>
                </div>
                <Tag color="error">
                  ขาด {productionRequestItems.length} รายการ
                </Tag>
              </div>
              <div className={styles.productionSpotlightList}>
                {data.items.map((item) => {
                  const reservationLine = reservationByItemId.get(item.id);
                  const productionRequestLine = productionRequestLineByItemId.get(
                    item.id,
                  );
                  if (!reservationLine || !productionRequestLine) {
                    return null;
                  }
                  return (
                    <div key={item.id} className={styles.productionSpotlightCard}>
                      <div className={styles.productionSpotlightBody}>
                        <p className={styles.itemName}>
                          {item.itemCode
                            ? `${item.itemCode} — ${item.itemNameTh ?? ""}`
                            : (item.itemNameTh ?? "—")}
                        </p>
                        <p className={styles.itemCode}>
                          ขาด{" "}
                          {Number(
                            reservationLine.unplannedShortageQty ??
                              reservationLine.shortageQty,
                          ).toLocaleString("th-TH")}{" "}
                          {item.unitCode ?? ""} · ขอผลิต {productionRequestLine.requestedQty.toLocaleString("th-TH")}{" "}
                          {item.unitCode ?? ""}
                        </p>
                      </div>
                      <Button
                        type="primary"
                        icon={<ProfileOutlined />}
                        loading={createProductionRequestMutation.isPending}
                        disabled={busy || eligibleSoQuery.isLoading}
                        onClick={() =>
                          openProductionRequestModal({
                            kind: "line",
                            salesOrderItemId: item.id,
                            itemCode: item.itemCode,
                          })
                        }
                      >
                        ออกใบขอผลิต
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {isPreConfirm && linkedProductionRequests.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2 className={styles.sectionTitle}>ใบขอผลิตที่อ้างอิง</h2>
                  <p className={styles.sectionHint}>
                    เทียบของในคลังกับจำนวนที่สั่งตอนนี้ ไม่ใช้แค่สถานะใบขอผลิต
                  </p>
                </div>
                <div className={styles.productionRequestHeadActions}>
                  {reservationQuery.isLoading ? (
                    <Spin size="small" />
                  ) : reservationStatus ? (
                    hasUnplannedShortage ? (
                      <Tag color="error">ยังไม่พอจริง</Tag>
                    ) : (
                      <Tag color="success">พอจริงแล้ว</Tag>
                    )
                  ) : null}
                  <Tag>{linkedProductionRequests.length} ใบ</Tag>
                </div>
              </div>

              {reservationQuery.isLoading ? (
                <Spin size="small" />
              ) : reservationStatus ? (
                <div className={styles.stockTruthList}>
                  {reservationStatus.lines.map((line) => {
                    const pendingProduction = Number(
                      line.pendingProductionQty ?? 0,
                    );
                    // ขาดจริง = หักทั้งที่จองแล้วและที่มีใบขอผลิตคุมไว้แล้ว
                    const stillShort =
                      Number(line.unplannedShortageQty ?? line.shortageQty) >
                      0.0005;
                    return (
                      <div key={line.salesOrderItemId} className={styles.stockTruthRow}>
                        <div className={styles.itemBody}>
                          <p className={styles.itemName}>
                            {line.itemCode
                              ? `${line.itemCode} — ${line.itemName ?? ""}`
                              : (line.itemName ?? "—")}
                          </p>
                          <p className={styles.itemCode}>
                            สั่ง {formatQty(line.orderedQty)} · ในคลังพร้อมใช้{" "}
                            {formatQty(line.availableQty)} · จองแล้ว{" "}
                            {formatQty(line.reservedQty)}
                            {pendingProduction > 0.0005
                              ? ` · รอผลิต ${formatQty(line.pendingProductionQty)}`
                              : ""}
                            {stillShort
                              ? ` · ขาดอีก ${formatQty(line.unplannedShortageQty ?? line.shortageQty)}`
                              : ""}
                          </p>
                        </div>
                        <Tag
                          color={
                            stillShort
                              ? "error"
                              : pendingProduction > 0.0005
                                ? "processing"
                                : "success"
                          }
                        >
                          {stillShort
                            ? "ยังไม่พอจริง"
                            : pendingProduction > 0.0005
                              ? "รอผลผลิต"
                              : "พอจริง"}
                        </Tag>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {showReserveCta ? (
                <div className={styles.productionContinueRow}>
                  <span className={styles.sectionHint}>
                    ของในคลังพอแล้ว — จัดรอบจัดส่งให้ครบแล้วยืนยันใบสั่งขาย
                  </span>
                </div>
              ) : null}
              {showConfirmCta ? (
                <div className={styles.productionContinueRow}>
                  <Button
                    type="primary"
                    htmlType="button"
                    icon={<CheckOutlined />}
                    loading={confirmMutation.isPending}
                    disabled={confirmBlocked}
                    onClick={tryConfirmSalesOrder}
                  >
                    ยืนยันใบสั่งขาย
                  </Button>
                  <span className={styles.sectionHint}>
                    จัดรอบครบแล้ว — กดยืนยันได้
                    {allLinesReserved
                      ? " ของถูกจองไว้แล้ว ยืนยันใบไม่จองซ้ำ"
                      : ""}
                    {!evidenceReady
                      ? " · กรณีไม่มีเลข PO ต้องแนบไฟล์ยืนยันก่อน"
                      : ""}
                  </span>
                </div>
              ) : null}

              {hasUnplannedShortage && canIssueProductionRequest ? (
                <div className={styles.productionContinueRow}>
                  <Button
                    type="primary"
                    icon={<ProfileOutlined />}
                    onClick={() => {
                      // ออกใบในหน้านี้เลย ไม่ส่งไปหน้าฟอร์มใบขอผลิต
                      // (คนที่ไม่มีสิทธิ์หน้าจอใบขอผลิตจะถูก AuthGuard เด้งกลับ)
                      if (hasStockShortage) {
                        openProductionRequestModal({ kind: "all" });
                        return;
                      }
                      const openPr = linkedProductionRequests.find(
                        (pr) =>
                          pr.status !== "CANCELLED" && pr.producedPercent < 100,
                      );
                      if (openPr && canOpenProductionRequestScreen) {
                        router.push(
                          `/production/production-requests/${openPr.id}`,
                        );
                        return;
                      }
                      message.info(
                        openPr
                          ? `ใบขอผลิต ${openPr.requestNo} กำลังดำเนินการ — รอของเข้าคลัง`
                          : "ยังไม่มีรายการที่ต้องขอผลิตเพิ่ม",
                      );
                    }}
                  >
                    ใบขอผลิต (จากใบสั่งขาย)
                  </Button>
                  <span className={styles.sectionHint}>
                    {hasStockShortage
                      ? "สต๊อกยังไม่พอ — กดเพื่อออกใบขอผลิตต่อ"
                      : "ของยังไม่เข้าคลังครบ — เปิดใบขอผลิตเพื่อรัน flow ต่อ"}
                  </span>
                </div>
              ) : null}

              <div className={styles.productionRequestGrid}>
                {linkedProductionRequests.map((pr) => {
                  const producedEnough =
                    pr.status !== "CANCELLED" && pr.producedPercent >= 100;
                  return (
                    <div key={pr.id} className={styles.productionRequestCard}>
                      <div className={styles.productionRequestCardTop}>
                        <span className={styles.productionRequestIcon}>
                          <ProfileOutlined />
                        </span>
                        <Tag color="blue">
                          {PRODUCTION_REQUEST_STATUS_LABEL[pr.status] ??
                            pr.status}
                        </Tag>
                      </div>
                      <div className={styles.itemBody}>
                        {canOpenProductionRequestScreen ? (
                          <Link
                            href={`/production/production-requests/${pr.id}`}
                            className={styles.productionRequestLink}
                          >
                            {pr.requestNo}
                          </Link>
                        ) : (
                          <span className={styles.productionRequestLink}>
                            {pr.requestNo}
                          </span>
                        )}
                        <p className={styles.itemCode}>
                          ต้องการภายใน {formatDate(pr.requiredDate)}
                        </p>
                        <Progress
                          percent={pr.producedPercent}
                          size="small"
                          status={producedEnough ? "success" : "active"}
                          format={(value) => `${value ?? 0}%`}
                        />
                        <p className={styles.itemCode}>
                          รับเข้าคลังแล้ว {formatQty(pr.totalProducedQty)} /{" "}
                          {formatQty(pr.totalRequestedQty)}
                        </p>
                        {(pr.items ?? []).map((item) => (
                          <p key={item.id} className={styles.itemCode}>
                            {item.itemCode ?? "สินค้า"} · ขอ{" "}
                            {formatQty(item.requestedQty)} · ได้แล้ว{" "}
                            {formatQty(item.producedQty)}
                            {Number(item.outstandingQty) > 0.0005
                              ? ` · ค้าง ${formatQty(item.outstandingQty)}`
                              : ""}
                          </p>
                        ))}
                      </div>
                      {canOpenProductionRequestScreen ? (
                        <div className={styles.productionRequestCardFooter}>
                          <Link
                            href={`/production/production-requests/${pr.id}`}
                          >
                            เปิดเอกสาร
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
              {canEditItems ? (
                isEditingItems ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      size="small"
                      type="primary"
                      htmlType="button"
                      loading={updateItemsMutation.isPending}
                      onClick={() => void saveItemDrafts()}
                    >
                      บันทึกรายการ
                    </Button>
                    <Button
                      size="small"
                      icon={<CloseOutlined />}
                      disabled={updateItemsMutation.isPending}
                      onClick={() => setItemDrafts(null)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    disabled={busy}
                    onClick={startEditItems}
                  >
                    แก้ไขรายการ
                  </Button>
                )
              ) : null}
            </div>
            {isEditingItems ? (
              <p className={styles.sectionHint} style={{ marginBottom: 12 }}>
                แก้จำนวนและส่วนลดได้ก่อนยืนยัน — ราคา/หน่วยล็อกตามใบเสนอราคา
              </p>
            ) : null}
            {isPreConfirm && canWrite && allLinesReserved ? (
              <p className={styles.sectionHint} style={{ marginBottom: 12 }}>
                ของถูกจองตอนสร้างใบสั่งขาย — ยกเลิกใบก่อนยืนยันเพื่อคืนสต๊อก
              </p>
            ) : null}
            {isPreConfirm && hasUnplannedShortage ? (
              <p className={styles.sectionHint} style={{ marginBottom: 12 }}>
                {hasActiveProductionRequest
                  ? "รายการที่สต๊อกไม่พอมีใบขอผลิตแล้ว — เปิดเพิ่มได้ถ้าต้องแบ่งผลิตหลายงวด"
                  : "รายการที่สต๊อกไม่พอ เปิดใบขอผลิตไว้ได้ · ยืนยันใบสั่งขายได้เลยไม่ต้องรอของ"}
              </p>
            ) : null}
            <div className={styles.itemList}>
              {data.items.map((item, index) => {
                const reservationLine = reservationByItemId.get(item.id);
                const productionRequestLine = productionRequestLineByItemId.get(
                  item.id,
                );
                return (
                  <div key={item.id} className={styles.itemCard}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>
                        {item.itemCode
                          ? `${item.itemCode} — ${item.itemNameTh ?? ""}`
                          : (item.itemNameTh ?? "—")}
                      </p>
                      {isEditingItems && itemDrafts?.[item.id] ? (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 12,
                            margin: "6px 0",
                          }}
                        >
                          <label style={{ fontSize: 12 }}>
                            <span style={{ display: "block", color: "#8a9199" }}>
                              จำนวน ({item.unitCode ?? "หน่วย"})
                            </span>
                            <InputNumber
                              size="small"
                              min={0.001}
                              step={1}
                              precision={3}
                              style={{ width: 130 }}
                              value={itemDrafts[item.id].quantity}
                              onChange={(value) =>
                                patchItemDraft(item.id, {
                                  quantity: Number(value ?? 0),
                                })
                              }
                              onPressEnter={(event) => {
                                event.preventDefault();
                                void saveItemDrafts();
                              }}
                            />
                          </label>
                          <label style={{ fontSize: 12 }}>
                            <span style={{ display: "block", color: "#8a9199" }}>
                              ราคา/หน่วย
                            </span>
                            <div className={styles.itemCode} style={{ marginTop: 4 }}>
                              {formatMoney(String(itemDrafts[item.id].unitPrice))}
                            </div>
                          </label>
                          <label style={{ fontSize: 12 }}>
                            <span style={{ display: "block", color: "#8a9199" }}>
                              ส่วนลด
                            </span>
                            <InputNumber
                              size="small"
                              min={0}
                              step={1}
                              precision={2}
                              style={{ width: 130 }}
                              value={itemDrafts[item.id].discountAmount}
                              onChange={(value) =>
                                patchItemDraft(item.id, {
                                  discountAmount: Number(value ?? 0),
                                })
                              }
                              onPressEnter={(event) => {
                                event.preventDefault();
                                void saveItemDrafts();
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        <p className={styles.itemCode}>
                          {Number(item.quantity).toLocaleString("th-TH")}{" "}
                          {item.unitCode ?? ""} · ราคา{" "}
                          {formatMoney(item.unitPrice)}
                          {Number(item.discountAmount) > 0
                            ? ` · ส่วนลด ${formatMoney(item.discountAmount)}`
                            : ""}
                        </p>
                      )}
                      {isPreConfirm && reservationLine ? (
                        <p className={styles.itemCode}>
                          ต้องการ{" "}
                          {Number(reservationLine.orderedQty).toLocaleString(
                            "th-TH",
                          )}{" "}
                          {Number(reservationLine.reservedQty) > 0.0005
                            ? ` · จองแล้ว ${Number(reservationLine.reservedQty).toLocaleString("th-TH")}`
                            : ""}{" "}
                          · พร้อมใช้{" "}
                          {Number(reservationLine.availableQty).toLocaleString(
                            "th-TH",
                          )}
                          {Number(reservationLine.shortageQty) > 0
                            ? ` · ขาด ${Number(reservationLine.shortageQty).toLocaleString("th-TH")}`
                            : ""}
                        </p>
                      ) : null}
                      {!isPreConfirm &&
                      (Number(item.reservedQuantity) > 0.0005 ||
                        Number(item.issuedQuantity) > 0.0005 ||
                        Number(item.deliveredQuantity) > 0.0005) ? (
                        <div className={styles.itemMeta}>
                          <span>
                            จอง{" "}
                            {Number(item.reservedQuantity).toLocaleString("th-TH")}
                          </span>
                          <span>
                            จ่ายแล้ว{" "}
                            {Number(item.issuedQuantity).toLocaleString("th-TH")}
                          </span>
                          <span>
                            ส่งแล้ว{" "}
                            {Number(item.deliveredQuantity).toLocaleString(
                              "th-TH",
                            )}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className={styles.itemQty}>
                      {(() => {
                        const qty = isEditingItems && itemDrafts?.[item.id]
                          ? itemDrafts[item.id].quantity
                          : Number(item.quantity) || 0;
                        const price = Number(item.unitPrice) || 0;
                        const discount =
                          isEditingItems && itemDrafts?.[item.id]
                            ? itemDrafts[item.id].discountAmount
                            : Number(item.discountAmount) || 0;
                        const gross = qty * price;
                        const net = Math.max(0, gross - discount);
                        return (
                          <div className={styles.itemTotals}>
                            {isPreConfirm && reservationLine
                              ? reservationLineTag(reservationLine)
                              : null}
                            {hasUnplannedShortage &&
                            canIssueProductionRequest &&
                            productionRequestLine ? (
                              <Button
                                size="small"
                                type="primary"
                                icon={<ProfileOutlined />}
                                loading={
                                  createProductionRequestMutation.isPending
                                }
                                disabled={busy || eligibleSoQuery.isLoading}
                                onClick={() =>
                                  openProductionRequestModal({
                                    kind: "line",
                                    salesOrderItemId: item.id,
                                    itemCode: item.itemCode,
                                  })
                                }
                              >
                                ออกใบขอผลิต
                              </Button>
                            ) : null}
                            <div className={styles.itemTotalRow}>
                              <span>ราคารวม</span>
                              <strong>{formatMoney(String(gross))}</strong>
                            </div>
                            <div className={styles.itemTotalRow}>
                              <span>ส่วนลด</span>
                              <strong>{formatMoney(String(discount))}</strong>
                            </div>
                            <div className={styles.itemTotalRow}>
                              <span>ราคาหลังหักส่วนลด</span>
                              <strong>{formatMoney(String(net))}</strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const commercialRounds = (schedulesForGate.data ?? [])
                .filter((schedule) => schedule.status !== "CANCELLED")
                .slice()
                .sort((a, b) => a.roundNo - b.roundNo);
              if (commercialRounds.length === 0) {
                return (
                  <p className={styles.sectionHint} style={{ marginTop: 16 }}>
                    ยังไม่มีรอบจัดส่ง — ตารางแยกรอบจะขึ้นเมื่อจัดรอบแล้ว
                  </p>
                );
              }
              return (
                <div className={styles.roundTables}>
                  <h3 className={styles.roundTablesTitle}>รายการแยกตามรอบ</h3>
                  {commercialRounds.map((schedule) => (
                    <div key={schedule.id} className={styles.roundTableBlock}>
                      <h4 className={styles.roundTableHeading}>
                        รอบที่ {schedule.roundNo} —{" "}
                        {formatThaiBuddhistDate(
                          schedule.deliveryDate,
                          formatDate(schedule.deliveryDate),
                        )}
                      </h4>
                      <div className={styles.roundTableWrap}>
                        <table className={styles.roundTable}>
                          <thead>
                            <tr>
                              <th>ลำดับ</th>
                              <th>รหัสสินค้า</th>
                              <th>รายการสินค้า</th>
                              <th>หน่วย</th>
                              <th>จำนวน</th>
                              <th>ราคาต่อหน่วย</th>
                              <th>ส่วนลด</th>
                              <th>จำนวนเงิน</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(schedule.items ?? [])
                              .slice()
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((line, index) => (
                                <tr key={line.id}>
                                  <td>{index + 1}</td>
                                  <td>{line.itemCode ?? "—"}</td>
                                  <td>
                                    {line.itemNameTh ?? line.description ?? "—"}
                                  </td>
                                  <td>{line.unitCode ?? "—"}</td>
                                  <td className={styles.roundNum}>
                                    {formatQty(line.quantity)}
                                  </td>
                                  <td className={styles.roundNum}>
                                    {formatMoney(line.unitPrice)}
                                  </td>
                                  <td className={styles.roundNum}>
                                    {formatMoney(line.discountAmount)}
                                  </td>
                                  <td className={styles.roundNum}>
                                    {formatMoney(line.amount)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
            </div>
            {canEditHeader ? (
              <Input.TextArea
                aria-label="หมายเหตุ"
                rows={3}
                value={headerDraft.remark}
                placeholder="หมายเหตุบนใบสั่งขาย"
                onChange={(e) =>
                  setHeaderDraft((prev) => ({
                    ...prev,
                    remark: e.target.value,
                  }))
                }
              />
            ) : (
              <p className={styles.textBlock}>{data.remark?.trim() || "—"}</p>
            )}
          </div>

          <div className={styles.section}>
            {/*
              canWrite ไม่ใช่ canEditItems — canEditItems จำกัดที่ก่อนยืนยัน
              ซึ่งจะทำให้ปุ่มเลื่อน/ยกเลิกรอบหายไปตอนใบยืนยันแล้ว คือตอนที่
              ต้องใช้พอดี · การคุมสถานะอยู่ในแผงเองแล้วทีละปุ่มตามสถานะรอบ
              และ backend คุมซ้ำอีกชั้น (SCHEDULABLE_SO_STATUSES มี CONFIRMED)
            */}
            <DeliverySchedulesSection
              salesOrderId={data.id}
              salesOrderItems={data.items ?? []}
              canEdit={canWrite}
              salesOrderStatus={data.status}
              deliveryStatus={data.deliveryStatus}
            />
          </div>

          <div className={styles.section}>
            <DocumentAuditTrail documentId={data.id} />
          </div>
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.soNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {SALES_ORDER_STATUS_LABEL[data.status as SalesOrderStatus] ??
              data.status}
          </div>
          <div className={styles.progressSide}>
            <div className={styles.progressSideTop}>
              <span className={styles.progressSideCount}>
                ขั้น {progress.inProgress}/{progress.total}
              </span>
              <strong>{progress.currentStepLabel}</strong>
            </div>
            <p className={styles.progressSideNext}>
              {tracking?.nextAction && tracking.nextAction !== "—"
                ? `ถัดไป: ${tracking.nextAction}`
                : progress.label}
            </p>
          </div>
          {flowHint ? (
            <p className={styles.flowHint}>{flowHint}</p>
          ) : null}

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>ผู้สร้าง</span>
              <strong>{data.createdBy?.displayName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>สร้างเมื่อ</span>
              <strong>{formatDateTime(data.createdAt)}</strong>
            </div>
            {data.confirmedBy || data.confirmedAt ? (
              <>
                <div className={styles.sideRow}>
                  <span>ผู้ยืนยัน</span>
                  <strong>{data.confirmedBy?.displayName ?? "—"}</strong>
                </div>
                <div className={styles.sideRow}>
                  <span>ยืนยันเมื่อ</span>
                  <strong>{formatDateTime(data.confirmedAt)}</strong>
                </div>
              </>
            ) : null}
            <div className={styles.sideRow}>
              <span>ยอดรวมก่อนส่วนลด</span>
              <strong>{formatMoney(data.subtotalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ส่วนลดท้ายบิล</span>
              <strong>{formatMoney(data.discountAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ยอดหลังหักส่วนลด</span>
              <strong>
                {formatMoney(
                  String(
                    Number(data.subtotalAmount) - Number(data.discountAmount),
                  ),
                )}
              </strong>
            </div>
            <div className={styles.sideRow}>
              <span>
                {vatLabel(
                  data,
                  taxRates.find((row) => row.id === headerDraft.taxRateId)
                    ?.rate ?? data.taxRate?.rate,
                )}
              </span>
              <strong>{formatMoney(data.vatAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ยอดสุทธิ</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {isPreConfirm ? (
              <>
                {canIssueProductionRequest && hasStockShortage ? (
                  <Button
                    className={styles.primaryBtn}
                    type="primary"
                    icon={<ProfileOutlined />}
                    loading={createProductionRequestMutation.isPending}
                    disabled={busy || eligibleSoQuery.isLoading}
                    onClick={() =>
                      openProductionRequestModal({ kind: "all" })
                    }
                  >
                    ออกใบขอผลิตทุกรายการที่ขาด
                  </Button>
                ) : null}
                {hasUnplannedShortage && !hasStockShortage ? (
                  <p className={styles.sectionHint}>
                    สต๊อกยังไม่พอ — จองหรือยืนยันใบสั่งขายยังทำไม่ได้
                    {hasActiveProductionRequest ||
                    linkedProductionRequests.length
                      ? " เปิดใบขอผลิตที่มีอยู่เพื่อติดตามของเข้าคลัง"
                      : " ต้องออกใบขอผลิตเท่านั้น"}
                  </p>
                ) : null}
                {showConfirmCta ? (
                  <Button
                    className={styles.primaryBtn}
                    type="primary"
                    htmlType="button"
                    icon={<CheckOutlined />}
                    loading={confirmMutation.isPending}
                    disabled={confirmBlocked}
                    onClick={tryConfirmSalesOrder}
                  >
                    ยืนยันใบสั่งขาย
                  </Button>
                ) : null}
                {pdfPreviewBlock}
                {cancelButton}
              </>
            ) : null}

            {!isPreConfirm ? (
              <>
                {nextStepButton}
                {pdfPreviewBlock}
                {cancelButton}
              </>
            ) : null}

            {!canFulfill &&
            !showingWaitProcess &&
            !(isPreConfirm && (canConfirm || canWrite)) &&
            !cancelButton ? (
              <p className={styles.sectionHint}>
                บัญชีนี้มีสิทธิ์ดูอย่างเดียว — ติดต่อผู้ดูแลระบบหากต้องดำเนินการ
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <Modal
        title="เลือกวันที่ต้องการผลผลิต"
        open={Boolean(pendingProductionRequest)}
        onCancel={() => setPendingProductionRequest(null)}
        onOk={submitProductionRequest}
        okText="ออกใบขอผลิต"
        confirmLoading={createProductionRequestMutation.isPending}
        okButtonProps={{ disabled: !productionRequiredDate }}
        destroyOnHidden
      >
        <p className={styles.sectionHint}>
          ใบสั่งขาย {data.soNo} · {pendingProductionRequestLabel}
          {data.requestedDeliveryDate
            ? ` · วันส่งตาม SO ${formatDate(data.requestedDeliveryDate)}`
            : ""}
        </p>
        <label className={styles.sectionHint} htmlFor="production-required-date">
          วันที่ต้องการผลผลิต
        </label>
        <DatePicker
          id="production-required-date"
          aria-label="วันที่ต้องการผลผลิต"
          format="DD/MM/YYYY"
          style={{ width: "100%", marginTop: 8 }}
          value={productionRequiredDate}
          onChange={(value) => setProductionRequiredDate(value)}
          disabledDate={(current) =>
            Boolean(current && current.isBefore(dayjs(todayInErp()), "day"))
          }
        />
      </Modal>

      <Modal
        title="ระบุเลข PO ลูกค้า"
        open={poModalOpen}
        onCancel={() => setPoModalOpen(false)}
        onOk={saveCustomerPo}
        okText="บันทึกเลข PO"
        confirmLoading={updateCustomerPoMutation.isPending}
        destroyOnHidden
      >
        <p className={styles.sectionHint}>
          คัดลอกเลข PO จากไฟล์หลักฐานที่ยืนยัน แล้วบันทึกไว้บนใบสั่งขายนี้
        </p>
        <Input
          placeholder="เช่น PO-CUST-2026-001"
          value={poDraft}
          maxLength={100}
          onChange={(e) => setPoDraft(e.target.value)}
          onPressEnter={saveCustomerPo}
          style={{ marginTop: 8 }}
        />
      </Modal>

      <Modal
        title={previewTitle || "ดูไฟล์แนบ"}
        open={previewOpen}
        onCancel={closeAttachmentPreview}
        footer={null}
        width={previewIsImage ? 720 : 900}
        destroyOnHidden
      >
        {previewLoading ? (
          <div className={styles.stateCard}>
            <Spin /> กำลังเปิดไฟล์...
          </div>
        ) : previewUrl ? (
          previewIsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={previewTitle}
              style={{ width: "100%", height: "auto" }}
            />
          ) : (
            <iframe
              title={previewTitle}
              src={previewUrl}
              style={{ width: "100%", height: "70vh", border: 0 }}
            />
          )
        ) : null}
      </Modal>
    </div>
  );
}
