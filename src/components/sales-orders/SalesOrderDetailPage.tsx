"use client";

import type { ReactNode } from "react";
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
  SearchOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import DocumentAuditTrail from "@/components/common/DocumentAuditTrail";
import SalesOrderTimeline from "@/components/sales/SalesOrderTimeline";
import {
  useCancelSalesOrderMutation,
  useConfirmSalesOrderMutation,
  useConfirmStockVerificationMutation,
} from "@/hooks/sales-orders/useSalesOrderMutations";
import {
  useSalesOrderQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  resolveSalesOrderProgress,
} from "@/lib/sales/sales-order-progress";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";
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

export default function SalesOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useSalesOrderQuery(id);
  const stockVerificationQuery = useSalesOrderStockVerificationQuery(id);
  const trackingQuery = useSalesTrackingDetailQuery(id);
  const confirmMutation = useConfirmSalesOrderMutation();
  const confirmStockMutation = useConfirmStockVerificationMutation();
  const cancelMutation = useCancelSalesOrderMutation();
  const stockVerificationActions = useScreenActionPermissions(
    "SALES_STOCK_VERIFICATION",
  );
  const matrixMode = isMatrixPermissionMode();

  const data = query.data?.data;
  const stockVerification = stockVerificationQuery.data?.data;
  const tracking = trackingQuery.data?.data;
  const timeline = tracking?.timeline ?? [];

  const canWrite =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();
  const canConfirm = userHasRole(RoleCode.SALES_MANAGER) || isAdministrator();
  const legacyCanApproveStock =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();
  const canApproveStock = matrixMode
    ? stockVerificationActions.canApprove
    : legacyCanApproveStock;
  const canFulfill =
    canWrite ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER);

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

  const busy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    confirmStockMutation.isPending;
  const progress = resolveSalesOrderProgress(data.status);
  const pickingStep = findStep(timeline, "Picking");
  const packingStep = findStep(timeline, "Packing");

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
      const stockReady = stockVerification?.isAllAvailable === true;
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
      if (picking?.href) {
        const pickingDraft = picking.status === "DRAFT";
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() =>
              router.push(
                pickingDraft ? `${picking.href}/edit` : (picking.href as string),
              )
            }
          >
            {pickingDraft
              ? "ยืนยันใบจ่ายสินค้า (ตัดสต๊อก)"
              : "เปิดใบจ่ายสินค้า"}
          </Button>
        );
      } else {
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
    } else if (data.status === "DELIVERED" || data.status === "COMPLETED") {
      const invoice = findStep(timeline, "Invoice");
      const delivery = findStep(timeline, "Delivery");
      if (invoice?.href) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => router.push(invoice.href as string)}
          >
            ดูใบแจ้งหนี้
          </Button>
        );
      } else if (data.status === "DELIVERED" && delivery?.documentId) {
        nextStepButton = (
          <Button
            className={styles.primaryBtn}
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() =>
              router.push(
                `/sales-invoices/create-from-delivery/${delivery.documentId}`,
              )
            }
          >
            สร้างใบแจ้งหนี้
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
              <h2 className={styles.sectionTitle}>ผลตรวจสอบสต๊อก</h2>
              <span className={styles.sectionHint}>
                เทียบยอด quantity_available รวมทุกคลังกับจำนวนที่สั่งขาย
              </span>
            </div>
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
                        ต้องการ {Number(line.orderedQty).toLocaleString("th-TH")}
                        {" · "}
                        คงเหลือ {Number(line.availableQty).toLocaleString("th-TH")}
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
              <p className={styles.textBlock}>ไม่สามารถตรวจสอบยอดคงเหลือได้</p>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
            </div>
            <div className={styles.itemList}>
              {data.items.map((item, index) => (
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
                    <div className={styles.itemMeta}>
                      <span>
                        จอง {Number(item.reservedQuantity).toLocaleString("th-TH")}
                      </span>
                      <span>
                        จ่ายแล้ว{" "}
                        {Number(item.issuedQuantity).toLocaleString("th-TH")}
                      </span>
                      <span>
                        ส่งแล้ว{" "}
                        {Number(item.deliveredQuantity).toLocaleString("th-TH")}
                      </span>
                    </div>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>{formatMoney(item.amount)}</strong>
                  </div>
                </div>
              ))}
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
          {tracking?.currentStep ? (
            <p className={styles.sectionHint} style={{ margin: "4px 0 0" }}>
              {tracking.currentStep}
              {tracking.nextAction && tracking.nextAction !== "—"
                ? ` · ถัดไป: ${tracking.nextAction}`
                : ""}
            </p>
          ) : null}
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
                {canConfirm ? (
                  <Button
                    className={styles.primaryBtn}
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={busy}
                    onClick={() => confirmMutation.mutate(data.id)}
                  >
                    ยืนยันใบสั่งขาย
                  </Button>
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
          </div>
        </aside>
      </div>
    </div>
  );
}
