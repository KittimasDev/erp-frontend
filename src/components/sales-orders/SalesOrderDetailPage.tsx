"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  DatePicker,
  Input,
  Modal,
  Progress,
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
  DownloadOutlined,
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
import DocumentAuditTrail from "@/components/common/DocumentAuditTrail";
import SalesOrderTimeline from "@/components/sales/SalesOrderTimeline";
import {
  useCancelSalesOrderMutation,
  useConfirmSalesOrderMutation,
  useConfirmStockVerificationMutation,
  useReleaseSalesOrderLineMutation,
  useReserveAllEligibleSalesOrderLinesMutation,
  useReserveSalesOrderLineMutation,
  useUpdateSalesOrderCustomerPoMutation,
  useUploadSalesOrderAttachmentMutation,
} from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  useSalesOrderAttachmentsQuery,
  useSalesOrderQuery,
  useSalesOrderReservationStatusQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useProductionRequestsQuery, useEligibleSalesOrderQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { useCreateProductionRequestMutation } from "@/hooks/production-requests/useProductionRequestMutations";
import { ERP_TIMEZONE } from "@/lib/datetime/erp-timezone";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { downloadDocumentAttachment } from "@/lib/api/document-attachments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import {
  canAccessSalesOrderDetail,
  canApproveStockVerification,
  canCreateDeliveryFromPacking,
  canNavigateSalesFulfillmentHref,
  canOpenStockVerification,
} from "@/lib/sales/sales-fulfillment-nav";
import {
  resolveSalesOrderProgress,
} from "@/lib/sales/sales-order-progress";
import type { DocumentAttachment } from "@/types/document-attachments";
import {
  SALES_ORDER_STATUS_LABEL,
  isPreConfirmSalesOrderStatus,
  type SalesOrderReservationLine,
  type SalesOrderStatus,
} from "@/types/sales-orders";
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
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  if (Number(line.shortageQty) > 0) {
    return <Tag color="error">สต๊อกไม่พอ</Tag>;
  }
  return <Tag color="warning">รอจอง</Tag>;
}

function buildProductionRequestLine(
  salesOrderItemId: string,
  reservationLines: SalesOrderReservationLine[],
  eligibleItems: EligibleSalesOrderItem[],
): { salesOrderItemId: string; requestedQty: number } | null {
  const reservationLine = reservationLines.find(
    (line) => line.salesOrderItemId === salesOrderItemId,
  );
  const shortage = Number(reservationLine?.shortageQty ?? 0);
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
  const confirmMutation = useConfirmSalesOrderMutation();
  const confirmStockMutation = useConfirmStockVerificationMutation();
  const cancelMutation = useCancelSalesOrderMutation();
  const reserveLineMutation = useReserveSalesOrderLineMutation();
  const releaseLineMutation = useReleaseSalesOrderLineMutation();
  const reserveAllMutation = useReserveAllEligibleSalesOrderLinesMutation();
  const createProductionRequestMutation = useCreateProductionRequestMutation();
  const attachmentsQuery = useSalesOrderAttachmentsQuery(id);
  const uploadAttachmentMutation = useUploadSalesOrderAttachmentMutation();
  const updateCustomerPoMutation = useUpdateSalesOrderCustomerPoMutation();
  const [pendingProductionRequest, setPendingProductionRequest] =
    useState<PendingProductionRequest | null>(null);
  const [productionRequiredDate, setProductionRequiredDate] =
    useState<Dayjs | null>(null);
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poDraft, setPoDraft] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewIsImage, setPreviewIsImage] = useState(false);
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
  const canApproveStock = canApproveStockVerification({
    stockVerification: stockVerificationActions,
    picking: pickingActions,
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
    confirmStockMutation.isPending ||
    reserveLineMutation.isPending ||
    releaseLineMutation.isPending ||
    reserveAllMutation.isPending ||
    createProductionRequestMutation.isPending ||
    uploadAttachmentMutation.isPending ||
    updateCustomerPoMutation.isPending;
  const progress = resolveSalesOrderProgress(data.status);

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
  const hasStockShortage = productionRequestItems.length > 0;
  const reservationReady =
    Boolean(reservationStatus) && !reservationQuery.isLoading;
  const stockReadyForReserve =
    isPreConfirm && reservationReady && !hasShortage && !allLinesReserved;
  const showReserveCta = stockReadyForReserve && canWrite;
  const showConfirmCta =
    isPreConfirm &&
    canConfirm &&
    reservationReady &&
    !hasShortage &&
    allLinesReserved;
  const stockReady = stockVerification?.isAllAvailable === true;
  const stockShortLines =
    stockVerification?.lines?.filter((line) => !line.isAvailable) ?? [];
  const canCreateProductionRequest = productionRequestActions.canAdd;
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

  const printPdf = async () => {
    const { generateSalesOrderPdf } = await import(
      "@/utils/generateSalesOrderPdf"
    );
    await generateSalesOrderPdf({
      soNo: data.soNo,
      soDate: formatDate(data.soDate),
      customerName: data.customer?.nameTh ?? "—",
      customerCode: data.customer?.customerCode ?? "—",
      customerPoNo: data.customerPoNo?.trim() || "—",
      quotationNo: data.salesQuotationNo ?? "—",
      requestedDeliveryDate: formatDate(data.requestedDeliveryDate),
      remark: data.remark?.trim() || "",
      subtotalAmount: Number(data.subtotalAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      vatAmount: Number(data.vatAmount) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemNameTh ?? item.description ?? "—",
        unit: item.unitCode ?? "—",
        qty: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        amount: Number(item.amount) || 0,
      })),
    });
  };

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
    setProductionRequiredDate(
      data.requestedDeliveryDate
        ? dayjs(data.requestedDeliveryDate)
        : dayjs(todayInErp()),
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
    const requiredDate = productionRequiredDate.format("YYYY-MM-DD");
    const onSuccess = (response: { data?: { id?: string } }) => {
      setPendingProductionRequest(null);
      void eligibleSoQuery.refetch();
      void productionRequestsQuery.refetch();
      void reservationQuery.refetch();
      if (response.data?.id) {
        router.push(`/production/production-requests/${response.data.id}`);
      }
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
    (data.status === "DRAFT" ||
      data.status === "AWAITING_CONFIRM" ||
      data.status === "CONFIRMED") ? (
      <Button
        danger
        icon={<CloseOutlined />}
        loading={busy}
        onClick={() =>
          modal.confirm({
            title: "ยืนยันยกเลิกใบสั่งขาย?",
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
    if (stockReady && canApproveStock) {
      nextStepButton = (
        <>
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<CheckOutlined />}
            loading={confirmStockMutation.isPending}
            onClick={() => confirmStockMutation.mutate(data.id)}
          >
            ยืนยันผลตรวจสอบสต๊อก
          </Button>
          {canOpenStockCheck ? (
            <Button
              icon={<SearchOutlined />}
              onClick={() =>
                router.push(`/sales-orders/${data.id}/stock-verification`)
              }
            >
              ดูรายละเอียด
            </Button>
          ) : null}
        </>
      );
    } else {
      nextStepButton = navOrWait(
        canOpenStockCheck,
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<SearchOutlined />}
          onClick={() =>
            router.push(`/sales-orders/${data.id}/stock-verification`)
          }
        >
          {stockReady ? "ดูผลตรวจสต๊อก" : "ตรวจสอบสต๊อก"}
        </Button>,
      );
    }
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
      nextStepButton = navOrWait(
        canCreateDeliveryFromPacking({
          delivery: deliveryActions,
          salesOrder: salesOrderActions,
        }),
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
        </Button>,
      );
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
      nextStepButton = navOrWait(
        canCreateDeliveryFromPacking({
          delivery: deliveryActions,
          salesOrder: salesOrderActions,
        }),
        <Button
          className={styles.primaryBtn}
          type="primary"
          icon={<CarOutlined />}
          onClick={() => router.push("/delivery-orders/create-from-packing")}
        >
          สร้างใบส่งสินค้า
        </Button>,
      );
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
  if (showReserveCta) {
    preConfirmHeaderButton = (
      <Button
        className={styles.primaryBtn}
        type="primary"
        icon={<InboxOutlined />}
        loading={reserveAllMutation.isPending}
        disabled={busy || reservationQuery.isLoading}
        onClick={() => reserveAllMutation.mutate({ salesOrderId: data.id })}
      >
        จองสต๊อก
      </Button>
    );
  } else if (showConfirmCta) {
    preConfirmHeaderButton = (
      <Button
        className={styles.primaryBtn}
        type="primary"
        icon={<CheckOutlined />}
        loading={busy}
        disabled={reservationQuery.isLoading}
        onClick={() => confirmMutation.mutate(data.id)}
      >
        ยืนยันใบสั่งขาย
      </Button>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ShoppingCartOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Sales Order</p>
          <h1 className={styles.pageTitle}>{data.soNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.customer
              ? `${data.customer.customerCode} — ${data.customer.nameTh}`
              : "—"}{" "}
            · {formatDate(data.soDate)} · {formatMoney(data.totalAmount)} บาท
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/sales-orders")}
          >
            กลับ
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            พิมพ์ PDF
          </Button>
          {isPreConfirm ? preConfirmHeaderButton : nextStepButton}
        </div>
      </header>

      <SalesOrderTimeline
        salesOrderId={id}
        salesOrderStatus={data.status}
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
        canNavigateHref={(href) =>
          canNavigateSalesFulfillmentHref(href, {
            stockVerification: stockVerificationActions,
            picking: pickingActions,
            packing: packingActions,
            delivery: deliveryActions,
            salesOrder: salesOrderActions,
          })
        }
      />

      {stockReadyForReserve ? (
        <div className={styles.reserveActionBanner}>
          {canWrite ? (
            <>
              สต๊อกพอทุกรายการแล้ว — กด <strong>จองสต๊อก</strong>{" "}
              เพื่อจองของลงใบสั่งขาย จากนั้นยืนยันใบสั่งขายเพื่อไปขั้นจ่ายสินค้า
            </>
          ) : (
            <>
              สต๊อกพอแล้ว แต่บัญชีนี้ไม่มีสิทธิ์จองสต๊อก — ติดต่อผู้ดูแลระบบ
            </>
          )}
        </div>
      ) : null}
      {showConfirmCta ? (
        <div className={`${styles.reserveActionBanner} ${styles.reserveActionBannerReady}`}>
          จองครบแล้ว — กด <strong>ยืนยันใบสั่งขาย</strong> เพื่อดำเนินการต่อ
        </div>
      ) : null}

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลใบสั่งขาย</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.soNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>{formatDate(data.soDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>สถานะจัดส่ง</span>
                <div className={styles.metaValue}>
                  {data.deliveryStatus ?? "NOT_STARTED"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลลูกค้า</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>
                  {data.customer
                    ? `${data.customer.customerCode} — ${data.customer.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขผู้เสียภาษี</span>
                <div className={styles.metaValue}>
                  {data.customer?.taxId ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ติดต่อ</span>
                <div className={styles.metaValue}>
                  {data.customer?.contactName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เบอร์โทร</span>
                <div className={styles.metaValue}>
                  {data.customer?.contactPhone ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อีเมล</span>
                <div className={styles.metaValue}>
                  {data.customer?.email ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ที่อยู่</span>
                <div className={styles.metaValue}>
                  {data.customer?.address ?? "—"}
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
                  อัปโหลดไฟล์ PO / เอกสารยืนยันจากลูกค้า แล้วระบุเลข PO
                  เพื่ออ้างอิงบนใบสั่งขาย
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
                    <span className={styles.poBadgeEyebrow}>Customer PO</span>
                    <strong>{data.customerPoNo.trim()}</strong>
                  </div>
                ) : (
                  <div className={styles.evidenceEmptyWarn}>
                    ยังไม่มีเลข PO — อัปโหลดไฟล์แล้วระบบจะให้กรอก
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
                  ? hasShortage
                    ? hasActiveProductionRequest
                      ? "สต๊อกไม่พอ — มีใบขอผลิตแล้ว ติดตามของเข้าคลังจากเอกสารที่มี จองหรือยืนยันใบสั่งขายยังทำไม่ได้จนกว่าของจะพอ"
                      : "สต๊อกไม่พอ — ทำต่อได้เฉพาะออกใบขอผลิต จองหรือยืนยันใบสั่งขายยังทำไม่ได้จนกว่าของจะพอ"
                    : "กดจองสต๊อกเมื่อของพอ — ยืนยันใบสั่งขายได้เมื่อจองครบทุกรายการ"
                  : "เทียบยอด quantity_available รวมทุกคลังกับจำนวนที่สั่งขาย"}
              </span>
            </div>
            {isPreConfirm ? (
              reservationQuery.isLoading ? (
                <Spin size="small" />
              ) : reservationStatus ? (
                <>
                  {showReserveCta ? (
                    <div style={{ marginBottom: 12 }}>
                      <Button
                        type="primary"
                        icon={<InboxOutlined />}
                        loading={reserveAllMutation.isPending}
                        disabled={busy}
                        onClick={() =>
                          reserveAllMutation.mutate({ salesOrderId: data.id })
                        }
                      >
                        จองสต๊อก
                      </Button>
                    </div>
                  ) : null}
                  {hasShortage ? (
                    <p className={styles.stockReadyNote}>
                      สต๊อกไม่พอ — {hasActiveProductionRequest
                        ? "มีใบขอผลิตแล้ว ไม่สามารถออกใบขอผลิตซ้ำได้"
                        : "ต้องออกใบขอผลิตเท่านั้น"} ไม่สามารถจองหรือยืนยันใบสั่งขายได้
                    </p>
                  ) : null}
                  {allLinesReserved ? (
                    <p className={styles.stockReadyNote}>
                      จองครบทุกรายการแล้ว — กด <strong>ยืนยันใบสั่งขาย</strong>{" "}
                      เพื่อไปขั้นจ่ายสินค้า
                    </p>
                  ) : null}
                </>
              ) : (
                <p className={styles.textBlock}>ไม่สามารถโหลดสถานะการจองได้</p>
              )
            ) : (
              <>
                {data.status === "CONFIRMED" &&
                stockVerification?.isAllAvailable &&
                canApproveStock ? (
                  <p className={styles.stockReadyNote}>
                    สต๊อกพอทุกรายการแล้ว — กด{" "}
                    <strong>ยืนยันผลตรวจสอบสต๊อก</strong> เพื่อไปขั้นจ่ายสินค้า
                    (การเปิดหน้านี้เพื่อดูผลอย่างเดียวยังไม่เปลี่ยนสถานะ)
                  </p>
                ) : null}
                {stockVerificationQuery.isLoading ? (
                  <Spin size="small" />
                ) : stockVerification ? (
                  <div className={styles.itemList}>
                    {stockVerification.lines.map((line) => (
                      <div key={line.salesOrderItemId} className={styles.itemCard}>
                        <div className={styles.itemIndex}>
                          {line.isAvailable ? "✓" : "!"}
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
                            {" · "}
                            จองแล้ว{" "}
                            {Number(line.reservedQty ?? 0).toLocaleString(
                              "th-TH",
                            )}
                            {" · "}
                            พร้อมใช้ว่าง{" "}
                            {Number(line.availableQty).toLocaleString("th-TH")}
                            {Number(line.shortageQty) > 0
                              ? ` · ขาด ${Number(line.shortageQty).toLocaleString("th-TH")}`
                              : ""}
                          </p>
                        </div>
                        <div className={styles.itemQty}>
                          <Tag color={line.isAvailable ? "success" : "error"}>
                            {line.isAvailable
                              ? Number(line.reservedQty ?? 0) >=
                                Number(line.orderedQty) - 0.0005
                                ? "จองครบ"
                                : "พอ"
                              : "ไม่พอ"}
                          </Tag>
                        </div>
                      </div>
                    ))}
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
                    สต๊อกไม่พอ — ออกใบขอผลิตได้ทีละรายการหรือรวมทั้งใบ
                    จองสต๊อกและยืนยันใบสั่งขายยังใช้ไม่ได้
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
                          ขาด {Number(reservationLine.shortageQty).toLocaleString("th-TH")}{" "}
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
                    hasShortage ? (
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
                    const stillShort = Number(line.shortageQty) > 0.0005;
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
                            {stillShort
                              ? ` · ขาดอีก ${formatQty(line.shortageQty)}`
                              : ""}
                          </p>
                        </div>
                        <Tag color={stillShort ? "error" : "success"}>
                          {stillShort ? "ยังไม่พอจริง" : "พอจริง"}
                        </Tag>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {showReserveCta ? (
                <div className={styles.productionContinueRow}>
                  <Button
                    type="primary"
                    icon={<InboxOutlined />}
                    loading={reserveAllMutation.isPending}
                    disabled={busy}
                    onClick={() =>
                      reserveAllMutation.mutate({ salesOrderId: data.id })
                    }
                  >
                    จองสต๊อก
                  </Button>
                  <span className={styles.sectionHint}>
                    ของในคลังพอแล้ว — กดจองเพื่อล็อกของลงใบสั่งขาย
                    แล้วยืนยันใบสั่งขายเพื่อไปขั้นถัดไป
                  </span>
                </div>
              ) : null}
              {showConfirmCta ? (
                <div className={styles.productionContinueRow}>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={busy}
                    disabled={reservationQuery.isLoading}
                    onClick={() => confirmMutation.mutate(data.id)}
                  >
                    ยืนยันใบสั่งขาย
                  </Button>
                  <span className={styles.sectionHint}>
                    จองครบแล้ว — กดยืนยันเพื่อไปขั้นจ่ายสินค้า
                  </span>
                </div>
              ) : null}

              {hasShortage && canIssueProductionRequest ? (
                <div className={styles.productionContinueRow}>
                  <Button
                    type="primary"
                    icon={<ProfileOutlined />}
                    onClick={() => {
                      if (hasStockShortage) {
                        router.push(
                          `/production/production-requests/create?salesOrderId=${data.id}`,
                        );
                        return;
                      }
                      const openPr = linkedProductionRequests.find(
                        (pr) =>
                          pr.status !== "CANCELLED" && pr.producedPercent < 100,
                      );
                      router.push(
                        openPr
                          ? `/production/production-requests/${openPr.id}`
                          : `/production/production-requests/create?salesOrderId=${data.id}`,
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
                        <Link
                          href={`/production/production-requests/${pr.id}`}
                          className={styles.productionRequestLink}
                        >
                          {pr.requestNo}
                        </Link>
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
                      <div className={styles.productionRequestCardFooter}>
                        <Link href={`/production/production-requests/${pr.id}`}>
                          เปิดเอกสาร
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
            </div>
            {isPreConfirm && canWrite && !hasShortage ? (
              <p className={styles.sectionHint} style={{ marginBottom: 12 }}>
                จองสต๊อกต่อรายการได้เมื่อของพอครบตามจำนวนที่สั่ง
              </p>
            ) : null}
            {isPreConfirm && hasShortage ? (
              <p className={styles.sectionHint} style={{ marginBottom: 12 }}>
                {hasActiveProductionRequest
                  ? "รายการที่สต๊อกไม่พอมีใบขอผลิตแล้ว — ออกใบขอผลิตซ้ำไม่ได้"
                  : "รายการที่สต๊อกไม่พอทำต่อได้เฉพาะออกใบขอผลิต"}
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
                      <p className={styles.itemCode}>
                        {Number(item.quantity).toLocaleString("th-TH")}{" "}
                        {item.unitCode ?? ""} · ราคา {formatMoney(item.unitPrice)}
                        {Number(item.discountAmount) > 0
                          ? ` · ส่วนลด ${formatMoney(item.discountAmount)}`
                          : ""}
                      </p>
                      {isPreConfirm && reservationLine ? (
                        <p className={styles.itemCode}>
                          ต้องการ{" "}
                          {Number(reservationLine.orderedQty).toLocaleString(
                            "th-TH",
                          )}{" "}
                          · จองแล้ว{" "}
                          {Number(reservationLine.reservedQty).toLocaleString(
                            "th-TH",
                          )}{" "}
                          · พร้อมใช้{" "}
                          {Number(reservationLine.availableQty).toLocaleString(
                            "th-TH",
                          )}
                          {Number(reservationLine.shortageQty) > 0
                            ? ` · ขาด ${Number(reservationLine.shortageQty).toLocaleString("th-TH")}`
                            : ""}
                        </p>
                      ) : null}
                      {!isPreConfirm ? (
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
                      {isPreConfirm && reservationLine ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 8,
                          }}
                        >
                          {reservationLineTag(reservationLine)}
                          {canWrite && !hasShortage ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              {reservationLine.canReserve ? (
                                <Button
                                  size="small"
                                  type="primary"
                                  loading={reserveLineMutation.isPending}
                                  disabled={busy}
                                  onClick={() =>
                                    reserveLineMutation.mutate({
                                      salesOrderId: data.id,
                                      itemId: item.id,
                                    })
                                  }
                                >
                                  จอง
                                </Button>
                              ) : null}
                              {reservationLine.canRelease ? (
                                <Button
                                  size="small"
                                  loading={releaseLineMutation.isPending}
                                  disabled={busy}
                                  onClick={() =>
                                    releaseLineMutation.mutate({
                                      salesOrderId: data.id,
                                      itemId: item.id,
                                    })
                                  }
                                >
                                  ยกเลิกจอง
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                          {hasShortage &&
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
                          <strong>{formatMoney(item.amount)}</strong>
                        </div>
                      ) : (
                        <strong>{formatMoney(item.amount)}</strong>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}

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
              <span>Subtotal</span>
              <strong>{formatMoney(data.subtotalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>Discount</span>
              <strong>{formatMoney(data.discountAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>VAT</span>
              <strong>{formatMoney(data.vatAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>Total</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {isPreConfirm ? (
              <>
                {showReserveCta ? (
                  <Button
                    className={styles.primaryBtn}
                    type="primary"
                    icon={<InboxOutlined />}
                    loading={reserveAllMutation.isPending}
                    disabled={busy || reservationQuery.isLoading}
                    onClick={() =>
                      reserveAllMutation.mutate({ salesOrderId: data.id })
                    }
                  >
                    จองสต๊อก
                  </Button>
                ) : null}
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
                {hasShortage && !hasStockShortage ? (
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
                    icon={<CheckOutlined />}
                    loading={busy}
                    disabled={reservationQuery.isLoading}
                    onClick={() => confirmMutation.mutate(data.id)}
                  >
                    ยืนยันใบสั่งขาย
                  </Button>
                ) : null}
                {cancelButton}
              </>
            ) : null}

            {!isPreConfirm ? (
              <>
                {nextStepButton}
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
