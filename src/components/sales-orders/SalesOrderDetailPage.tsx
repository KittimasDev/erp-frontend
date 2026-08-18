"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Spin, Tag } from "antd";
import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  ProfileOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
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
} from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  useSalesOrderQuery,
  useSalesOrderReservationStatusQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useProductionRequestsQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  resolveSalesOrderProgress,
} from "@/lib/sales/sales-order-progress";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderReservationLine,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import { PRODUCTION_REQUEST_STATUS_LABEL } from "@/types/production-request";
import type { SalesTrackingTimelineStep } from "@/types/sales-tracking";
import styles from "./SalesOrderDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
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

export default function SalesOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useSalesOrderQuery(id);
  const data = query.data?.data;
  const isDraft = data?.status === "DRAFT";

  const stockVerificationQuery = useSalesOrderStockVerificationQuery(
    data && !isDraft ? id : undefined,
  );
  const reservationQuery = useSalesOrderReservationStatusQuery(
    isDraft ? id : undefined,
  );
  const productionRequestsQuery = useProductionRequestsQuery(
    isDraft ? { salesOrderId: id, limit: 20 } : undefined,
    { enabled: isDraft },
  );
  const trackingQuery = useSalesTrackingDetailQuery(id);
  const confirmMutation = useConfirmSalesOrderMutation();
  const confirmStockMutation = useConfirmStockVerificationMutation();
  const cancelMutation = useCancelSalesOrderMutation();
  const reserveLineMutation = useReserveSalesOrderLineMutation();
  const releaseLineMutation = useReleaseSalesOrderLineMutation();
  const reserveAllMutation = useReserveAllEligibleSalesOrderLinesMutation();
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

  const canView = salesOrderActions.canView;
  const canWrite = salesOrderActions.canEdit;
  const canConfirm = salesOrderActions.canApprove;
  const canApproveStock = stockVerificationActions.canApprove;
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

  if (!canView) {
    return <AccessDenied screenCodes={["SALES_ORDERS"]} />;
  }

  const busy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    confirmStockMutation.isPending ||
    reserveLineMutation.isPending ||
    releaseLineMutation.isPending ||
    reserveAllMutation.isPending;
  const progress = resolveSalesOrderProgress(data.status);
  const pickingStep = findStep(timeline, "Picking");
  const packingStep = findStep(timeline, "Packing");
  const allLinesReserved = reservationStatus?.isAllFullyReserved === true;
  const hasStockShortage = reservationStatus?.hasShortage === true;
  const unreservedLines =
    reservationStatus?.lines?.filter((line) => !line.isFullyReserved) ?? [];
  const stockReady = stockVerification?.isAllAvailable === true;
  const stockShortLines =
    stockVerification?.lines?.filter((line) => !line.isAvailable) ?? [];
  const canCreateProductionRequest = productionRequestActions.canAdd;

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

  const cancelButton =
    canWrite &&
    (data.status === "DRAFT" || data.status === "CONFIRMED") ? (
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

  let nextStepButton: ReactNode = null;
  if (canFulfill) {
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
            <Button
              icon={<SearchOutlined />}
              onClick={() =>
                router.push(`/sales-orders/${data.id}/stock-verification`)
              }
            >
              ดูรายละเอียด
            </Button>
          </>
        );
      } else {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<SearchOutlined />}
            onClick={() =>
              router.push(`/sales-orders/${data.id}/stock-verification`)
            }
          >
            {stockReady ? "ดูผลตรวจสต๊อก" : "ตรวจสอบสต๊อก"}
          </Button>
        );
      }
    } else if (data.status === "STOCK_CHECKED") {
      const picking = findStep(timeline, "Picking");
      const canCreatePicking = pickingActions.canAdd;
      const canEditPicking = pickingActions.canEdit;
      if (picking?.href) {
        const pickingDraft = picking.status === "DRAFT";
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() =>
              router.push(
                pickingDraft && canEditPicking
                  ? `${picking.href}/edit`
                  : (picking.href as string),
              )
            }
          >
            {pickingDraft && canEditPicking
              ? "ยืนยันใบจ่ายสินค้า (ตัดสต๊อก)"
              : "เปิดใบจ่ายสินค้า"}
          </Button>
        );
      } else if (canCreatePicking) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() =>
              router.push(`/pickings/create-from-sales-order/${data.id}`)
            }
          >
            สร้างใบจ่ายสินค้า
          </Button>
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
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<InboxOutlined />}
            onClick={() =>
              router.push(
                packingDraft
                  ? `${packing.href}/edit`
                  : (packing.href as string),
              )
            }
          >
            {packingDraft ? "แก้ไข/ยืนยันใบบรรจุ" : "เปิดใบบรรจุสินค้า"}
          </Button>
        );
      } else if (
        picking?.documentId &&
        picking.status === "CONFIRMED"
      ) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<InboxOutlined />}
            onClick={() =>
              router.push(
                `/packings/create-from-picking/${picking.documentId}`,
              )
            }
          >
            สร้างใบบรรจุสินค้า
          </Button>
        );
      } else if (picking?.href) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() =>
              router.push(
                picking.status === "DRAFT"
                  ? `${picking.href}/edit`
                  : (picking.href as string),
              )
            }
          >
            ยืนยันใบจ่ายสินค้าก่อนบรรจุ
          </Button>
        );
      } else {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => router.push("/packings/create-from-picking")}
          >
            สร้างใบบรรจุสินค้า
          </Button>
        );
      }
    } else if (data.status === "PACKED") {
      const packing = findStep(timeline, "Packing");
      const delivery = findStep(timeline, "Delivery");
      if (delivery?.href) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<CarOutlined />}
            onClick={() => router.push(delivery.href as string)}
          >
            ดูใบส่งสินค้า
          </Button>
        );
      } else if (
        packing?.documentId &&
        packing.status === "CONFIRMED"
      ) {
        nextStepButton = (
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
        );
      } else if (packing?.href && packing.status === "DRAFT") {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<InboxOutlined />}
            onClick={() => router.push(`${packing.href}/edit`)}
          >
            ยืนยันใบบรรจุก่อนส่งสินค้า
          </Button>
        );
      } else {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<CarOutlined />}
            onClick={() => router.push("/delivery-orders/create-from-packing")}
          >
            สร้างใบส่งสินค้า
          </Button>
        );
      }
    }
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
          {nextStepButton}
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
      />

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

          {data.salesQuotationId ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>อ้างอิงใบเสนอราคา</h2>
              </div>
              <Link
                href={`/quotations/${data.salesQuotationId}`}
                className={styles.metaValue}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <FileTextOutlined />{" "}
                {data.salesQuotationNo ?? data.salesQuotationId}
              </Link>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                {isDraft ? "การจองสต๊อก" : "ผลตรวจสอบสต๊อก"}
              </h2>
              <span className={styles.sectionHint}>
                {isDraft
                  ? "จองสต๊อกต่อรายการแบบ FIFO รวมทุกคลัง — ยืนยันใบสั่งขายได้เมื่อจองครบทุกรายการ"
                  : "เทียบยอด quantity_available รวมทุกคลังกับจำนวนที่สั่งขาย"}
              </span>
            </div>
            {isDraft ? (
              reservationQuery.isLoading ? (
                <Spin size="small" />
              ) : reservationStatus ? (
                <>
                  {canWrite ? (
                    <div style={{ marginBottom: 12 }}>
                      <Button
                        type="default"
                        loading={reserveAllMutation.isPending}
                        disabled={busy}
                        onClick={() =>
                          reserveAllMutation.mutate({ salesOrderId: data.id })
                        }
                      >
                        จองทั้งหมดที่พอ
                      </Button>
                    </div>
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
                            คงเหลือ{" "}
                            {Number(line.availableQty).toLocaleString("th-TH")}
                            {Number(line.shortageQty) > 0
                              ? ` · ขาด ${Number(line.shortageQty).toLocaleString("th-TH")}`
                              : ""}
                          </p>
                        </div>
                        <div className={styles.itemQty}>
                          <Tag color={line.isAvailable ? "success" : "error"}>
                            {line.isAvailable ? "พอ" : "ไม่พอ"}
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

          {isDraft && linkedProductionRequests.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>ใบขอผลิตที่อ้างอิง</h2>
              </div>
              <div className={styles.itemList}>
                {linkedProductionRequests.map((pr) => (
                  <div key={pr.id} className={styles.itemCard}>
                    <div className={styles.itemBody}>
                      <Link href={`/production/production-requests/${pr.id}`}>
                        {pr.requestNo}
                      </Link>
                      <p className={styles.itemCode}>
                        {PRODUCTION_REQUEST_STATUS_LABEL[pr.status] ?? pr.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
            </div>
            {isDraft && canWrite ? (
              <p className={styles.sectionHint} style={{ marginBottom: 12 }}>
                จองสต๊อกต่อรายการ — รายการที่สต๊อกไม่พอสามารถออกใบขอผลิตได้
              </p>
            ) : null}
            <div className={styles.itemList}>
              {data.items.map((item, index) => {
                const reservationLine = reservationByItemId.get(item.id);
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
                      {isDraft && reservationLine ? (
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
                      {!isDraft ? (
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
                      {isDraft && reservationLine ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 8,
                          }}
                        >
                          {reservationLineTag(reservationLine)}
                          {canWrite ? (
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
            {data.status === "DRAFT" ? (
              <>
                {canCreateProductionRequest && hasStockShortage ? (
                  <Button
                    className={styles.primaryBtn}
                    type="default"
                    icon={<ProfileOutlined />}
                    onClick={() =>
                      router.push(
                        `/production/production-requests/create?salesOrderId=${data.id}`,
                      )
                    }
                  >
                    ออกใบขอผลิต
                  </Button>
                ) : null}
                {canConfirm ? (
                  <>
                    {!allLinesReserved ? (
                      <p className={styles.sectionHint}>
                        ต้องจองครบทุกรายการก่อนยืนยัน
                        {unreservedLines.length
                          ? ` (${unreservedLines
                              .map(
                                (line) =>
                                  `${line.itemCode ?? "สินค้า"} จอง ${Number(line.reservedQty).toLocaleString("th-TH")}/${Number(line.orderedQty).toLocaleString("th-TH")}`,
                              )
                              .join(", ")})`
                          : ""}
                      </p>
                    ) : null}
                    <Button
                      className={styles.primaryBtn}
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={busy}
                      disabled={
                        !allLinesReserved || reservationQuery.isLoading
                      }
                      onClick={() => confirmMutation.mutate(data.id)}
                    >
                      ยืนยันใบสั่งขาย
                    </Button>
                  </>
                ) : null}
                {cancelButton}
              </>
            ) : null}

            {data.status !== "DRAFT" ? (
              <>
                {nextStepButton}
                {cancelButton}
              </>
            ) : null}

            {!canFulfill &&
            !(data.status === "DRAFT" && canConfirm) &&
            !cancelButton ? (
              <p className={styles.sectionHint}>
                บัญชีนี้มีสิทธิ์ดูอย่างเดียว — ติดต่อผู้ดูแลระบบหากต้องดำเนินการ
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
