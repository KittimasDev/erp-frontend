"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DollarOutlined,
  EditOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelGoodsReceiptMutation,
  useConfirmGoodsReceiptMutation,
} from "@/hooks/goods-receipts/useGoodsReceiptMutations";
import {
  useGoodsReceiptQuery,
  useGoodsReceiptsByPoQuery,
} from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { usePurchasePaymentByPoQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import styles from "./GoodsReceiptDetailPage.module.css";

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
    case "CONFIRMED":
      return styles.statusApproved;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function GoodsReceiptDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useGoodsReceiptQuery(id);
  const confirmMutation = useConfirmGoodsReceiptMutation();
  const cancelMutation = useCancelGoodsReceiptMutation();

  const data = query.data?.data;
  const goodsReceiptActions = useScreenActionPermissions("GOODS_RECEIPTS");
  const canWrite =
    goodsReceiptActions.canAdd ||
    goodsReceiptActions.canEdit ||
    goodsReceiptActions.canApprove;
  const canReceive = canWrite;
  /** ตั้งใบสำคัญจ่ายเป็นงานของหน้า "รอจ่ายเงิน Supplier" — พาไปกดที่หน้านั้น */
  const canPay = useScreenActionPermissions("PURCHASE_PAYMENTS_PENDING").canEdit;

  const poId = data?.purchaseOrderId ?? data?.purchaseOrder?.id;
  const poQuery = usePurchaseOrderQuery(poId);
  const po = poQuery.data?.data;
  const grByPoQuery = useGoodsReceiptsByPoQuery(poId);
  const linkedGrs = grByPoQuery.data?.data ?? [];
  const paymentByPoQuery = usePurchasePaymentByPoQuery(
    po &&
      (po.status === "COMPLETED" ||
        po.status === "PARTIALLY_RECEIVED" ||
        po.paymentStatus === "PAID")
      ? poId
      : undefined,
  );
  const linkedPayment = paymentByPoQuery.data?.data ?? null;
  const isPaid =
    po?.paymentStatus === "PAID" || linkedPayment?.status === "PAID";

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
        ไม่พบใบรับของ
        <div style={{ marginTop: 12 }}>
          <Link href="/goods-receipts">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy = confirmMutation.isPending || cancelMutation.isPending;

  const formatPdfMoney = (value?: string) => {
    const n = Number(value ?? 0);
    if (Number.isNaN(n)) return "0.00";
    return n.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPdfQty = (value?: string) => {
    const n = Number(value ?? 0);
    if (Number.isNaN(n)) return "0";
    return n.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    });
  };

  const printPdf = async () => {
    const subtotal = Number(data.subtotalAmount) || 0;
    const discount = Number(data.discountAmount) || 0;
    const afterDiscount = Math.max(0, subtotal - discount);
    const { generateGoodsReceiptPdf } = await import(
      "@/utils/generateGoodsReceiptPdf"
    );
    await generateGoodsReceiptPdf({
      grNo: data.grNo,
      grDate: formatDate(data.grDate),
      poNo: data.purchaseOrder?.poNo ?? "—",
      deliveryDate: formatDate(data.grDate),
      vendorCode: data.creditor?.creditorCode ?? "—",
      vendorName: data.creditor?.nameTh ?? "—",
      vendorAddress: data.creditor?.address,
      vendorTaxId: data.creditor?.taxId,
      vendorPhone: data.creditor?.contactPhone,
      remark: data.remark?.trim() || "",
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemNameTh ?? item.description ?? "—",
        warehouse: item.warehouse
          ? `${item.warehouse.warehouseName}${
              item.location ? ` / ${item.location.locationName}` : ""
            }`
          : "—",
        lotNo: item.lotNo,
        unit: item.unitNameTh ?? item.unitCode ?? "—",
        quantity: formatPdfQty(item.quantity),
        unitPrice: formatPdfMoney(item.unitPrice),
        amount: formatPdfMoney(item.amount),
      })),
      subtotalAmount: formatPdfMoney(data.subtotalAmount),
      discountAmount: formatPdfMoney(data.discountAmount),
      afterDiscountAmount: formatPdfMoney(String(afterDiscount)),
      vatAmount: formatPdfMoney(data.vatAmount),
      netAmount: formatPdfMoney(data.totalAmount),
      netAmountRaw: Number(data.totalAmount) || 0,
      preparedBy: data.receivedBy?.displayName,
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <InboxOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Goods Receipt</p>
          <h1 className={styles.pageTitle}>{data.grNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.creditor?.nameTh ?? "—"} · {formatDate(data.grDate)} ·{" "}
            {data.items?.length ?? 0} รายการ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/goods-receipts")}
          >
            กลับ
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={() => void printPdf()}>
            พิมพ์ PDF
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.grNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่รับ</span>
                <div className={styles.metaValue}>{formatDate(data.grDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ขาย</span>
                <div className={styles.metaValue}>
                  {data.creditor
                    ? `${data.creditor.creditorCode} — ${data.creditor.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อ้างอิง PO</span>
                <div className={styles.metaValue}>
                  {data.purchaseOrder ? (
                    <Link href={`/purchase-orders/${data.purchaseOrder.id}`}>
                      {data.purchaseOrder.poNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้รับ</span>
                <div className={styles.metaValue}>
                  {data.receivedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>โพสต์สต๊อก</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/YYYY HH:mm")
                    : "ยังไม่โพสต์"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการรับของ</h2>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>
                      {item.itemNameTh ?? item.description ?? "—"}
                    </p>
                    <p className={styles.itemCode}>
                      {item.itemCode ?? "—"} ·{" "}
                      {item.warehouse
                        ? `${item.warehouse.warehouseCode}/${item.location?.locationCode ?? "—"}`
                        : "—"}
                      {item.lotNo ? ` · Lot ${item.lotNo}` : ""}
                    </p>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>
                      {Number(item.quantity).toLocaleString("th-TH")}{" "}
                      {item.unitNameTh ?? item.unitCode ?? ""}
                    </strong>
                    <span>{formatMoney(item.amount)}</span>
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
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.grNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {GOODS_RECEIPT_STATUS_LABEL[data.status] ?? data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>รวม</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>รายการ</span>
              <strong>{data.items?.length ?? 0}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {canWrite && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "Confirm ใบรับของและโพสต์สต๊อก?",
                      content:
                        "ยืนยันแล้วจะเพิ่ม quantity_on_hand / available และแก้เอกสารไม่ได้",
                      onOk: () => confirmMutation.mutateAsync(data.id),
                    })
                  }
                >
                  Confirm รับของ
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/goods-receipts/${data.id}/edit`)
                  }
                >
                  แก้ไข
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "ยืนยันยกเลิกใบรับของ?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
                </Button>
              </>
            ) : null}

            {data.status === "CONFIRMED" &&
            canReceive &&
            po?.status === "PARTIALLY_RECEIVED" &&
            poId ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<InboxOutlined />}
                onClick={() =>
                  router.push(`/goods-receipts/create-from-po/${poId}`)
                }
              >
                รับของต่อ
              </Button>
            ) : null}

            {data.status === "CONFIRMED" &&
            po?.status === "COMPLETED" &&
            isPaid &&
            linkedPayment ? (
              <Button
                className={styles.secondaryBtn}
                icon={<HistoryOutlined />}
                onClick={() =>
                  router.push(`/purchase-payments/${linkedPayment.id}`)
                }
              >
                ดูประวัติการจ่ายเงิน
              </Button>
            ) : null}

            {data.status === "CONFIRMED" &&
            canPay &&
            po?.status === "COMPLETED" &&
            !isPaid &&
            !linkedPayment &&
            poId ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(`/purchase-payments/create-from-po/${poId}`)
                }
              >
                จ่ายเงิน
              </Button>
            ) : null}

            {data.status === "CONFIRMED" &&
            canPay &&
            po?.status === "COMPLETED" &&
            !isPaid &&
            linkedPayment?.status === "DRAFT" ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(`/purchase-payments/${linkedPayment.id}`)
                }
              >
                ดูใบสำคัญจ่าย (DRAFT)
              </Button>
            ) : null}

            {data.status === "CONFIRMED" &&
            po?.status === "COMPLETED" &&
            !isPaid &&
            !canPay &&
            poId ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(
                    linkedPayment
                      ? `/purchase-payments/${linkedPayment.id}`
                      : `/purchase-orders/${poId}`,
                  )
                }
              >
                {linkedPayment
                  ? "ดูใบสำคัญจ่าย"
                  : "ไปใบสั่งซื้อ · ขั้นจ่ายเงิน"}
              </Button>
            ) : null}
          </div>

          <ProcurementFlowTimeline
            input={{
              pr: po?.purchaseRequest
                ? {
                    id: po.purchaseRequest.id,
                    prNo: po.purchaseRequest.prNo,
                    status: po.purchaseRequest.status,
                  }
                : null,
              po: po
                ? {
                    id: po.id,
                    poNo: po.poNo,
                    status: po.status,
                    paymentStatus: po.paymentStatus,
                  }
                : data.purchaseOrder
                  ? {
                      id: data.purchaseOrder.id,
                      poNo: data.purchaseOrder.poNo,
                      status: data.purchaseOrder.status,
                    }
                  : null,
              goodsReceipts: (linkedGrs.length
                ? linkedGrs
                : [
                    {
                      id: data.id,
                      grNo: data.grNo,
                      status: data.status,
                    },
                  ]
              ).map((gr) => ({
                id: gr.id,
                grNo: gr.grNo,
                status: gr.status,
              })),
              payment: linkedPayment
                ? {
                    id: linkedPayment.id,
                    voucherNo: linkedPayment.voucherNo,
                    status: linkedPayment.status,
                  }
                : null,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
