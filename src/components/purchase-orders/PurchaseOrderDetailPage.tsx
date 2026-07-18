"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Modal, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DollarOutlined,
  EditOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelPurchaseOrderMutation,
  useConfirmPurchaseOrderMutation,
} from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { usePurchasePaymentByPoQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";
import { GOODS_RECEIPT_STATUS_LABEL } from "@/types/goods-receipts";
import { generatePurchaseOrderPdf } from "@/utils/generatePurchaseOrderPdf";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import styles from "./PurchaseOrderDetailPage.module.css";

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
    case "COMPLETED":
      return styles.statusApproved;
    case "PARTIALLY_RECEIVED":
      return styles.statusApproved;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function PurchaseOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const query = usePurchaseOrderQuery(id);
  const confirmMutation = useConfirmPurchaseOrderMutation();
  const cancelMutation = useCancelPurchaseOrderMutation();

  const data = query.data?.data;
  const canWrite =
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    isAdministrator();
  const canCancel =
    userHasRole(RoleCode.PROCUREMENT_MANAGER) || isAdministrator();
  const canReceive =
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    isAdministrator();
  const canPay =
    userHasRole(RoleCode.ACCOUNTING_OFFICER) || isAdministrator();

  const grByPoQuery = useGoodsReceiptsByPoQuery(
    data ? data.id : undefined,
  );
  const linkedGrs = grByPoQuery.data?.data ?? [];

  const paymentByPoQuery = usePurchasePaymentByPoQuery(
    data &&
      (data.status === "COMPLETED" ||
        data.status === "PARTIALLY_RECEIVED" ||
        data.paymentStatus === "PAID")
      ? data.id
      : undefined,
  );
  const linkedPayment = paymentByPoQuery.data?.data ?? null;
  const isPaid =
    data?.paymentStatus === "PAID" || linkedPayment?.status === "PAID";

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
        ไม่พบใบสั่งซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy = confirmMutation.isPending || cancelMutation.isPending;

  const printPdf = () => {
    generatePurchaseOrderPdf({
      poNo: data.poNo,
      poDate: formatDate(data.poDate),
      vendorName: data.creditor?.nameTh ?? "—",
      vendorCode: data.creditor?.creditorCode ?? "—",
      paymentTerm: data.paymentTerm?.name ?? "ไม่ระบุ",
      taxLabel: data.taxRate
        ? `${data.taxRate.name} (${data.taxRate.rate}%)`
        : "ไม่ระบุ",
      prNo: data.purchaseRequest?.prNo ?? "—",
      createdBy: data.createdBy?.displayName ?? "—",
      remark: data.remark?.trim() || "",
      subtotalAmount: Number(data.subtotalAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      vatAmount: Number(data.vatAmount) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemNameTh ?? item.description ?? "—",
        unit: item.unitNameTh ?? item.unitCode ?? "—",
        qty: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        amount: Number(item.amount) || 0,
      })),
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Order</p>
          <h1 className={styles.pageTitle}>{data.poNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.creditor?.nameTh ?? "—"} · {formatDate(data.poDate)} ·{" "}
            {data.items?.length ?? 0} รายการ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/purchase-orders")}
          >
            กลับ
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
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
                <div className={styles.metaValue}>{data.poNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>{formatDate(data.poDate)}</div>
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
                <span className={styles.metaLabel}>อ้างอิง PR</span>
                <div className={styles.metaValue}>
                  {data.purchaseRequest ? (
                    <Link href={`/purchase-requests/${data.purchaseRequest.id}`}>
                      {data.purchaseRequest.prNo}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เงื่อนไขชำระ</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "ไม่ระบุ"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ภาษี</span>
                <div className={styles.metaValue}>
                  {data.taxRate
                    ? `${data.taxRate.name} (${data.taxRate.rate}%)`
                    : "ไม่ระบุ"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
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
                      {item.itemCode ?? "—"} · ราคา{" "}
                      {formatMoney(item.unitPrice)}
                    </p>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>{formatMoney(item.amount)}</strong>
                    <span>
                      {Number(item.quantity).toLocaleString("th-TH")}{" "}
                      {item.unitNameTh ?? item.unitCode ?? ""}
                    </span>
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
            <h2 className={styles.sideTitle}>{data.poNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {PURCHASE_ORDER_STATUS_LABEL[data.status] ?? data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(data.subtotalAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ส่วนลด</span>
              <strong>{formatMoney(data.discountAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>VAT</span>
              <strong>{formatMoney(data.vatAmount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>รวมทั้งสิ้น</span>
              <strong>{formatMoney(data.totalAmount)}</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            <Button
              className={styles.secondaryBtn}
              icon={<FilePdfOutlined />}
              onClick={printPdf}
            >
              พิมพ์ PDF สั่งซื้อ
            </Button>

            {canWrite && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() => confirmMutation.mutate(data.id)}
                >
                  Confirm ใบสั่งซื้อ
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/purchase-orders/${data.id}/edit`)
                  }
                >
                  แก้ไข
                </Button>
              </>
            ) : null}

            {canReceive &&
            (data.status === "CONFIRMED" ||
              data.status === "PARTIALLY_RECEIVED") ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<InboxOutlined />}
                onClick={() =>
                  router.push(`/goods-receipts/create-from-po/${data.id}`)
                }
              >
                รับของ
              </Button>
            ) : null}

            {data.status === "COMPLETED" && isPaid && linkedPayment ? (
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

            {canPay &&
            data.status === "COMPLETED" &&
            !isPaid &&
            !linkedPayment ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<DollarOutlined />}
                onClick={() =>
                  router.push(
                    `/purchase-payments/create-from-po/${data.id}`,
                  )
                }
              >
                จ่ายเงิน
              </Button>
            ) : null}

            {canPay &&
            data.status === "COMPLETED" &&
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

            {canCancel &&
            (data.status === "DRAFT" || data.status === "CONFIRMED") ? (
              <Button
                className={styles.secondaryBtn}
                danger
                loading={busy}
                onClick={() =>
                  Modal.confirm({
                    title: "ยืนยันยกเลิกใบสั่งซื้อ?",
                    onOk: () => cancelMutation.mutateAsync(data.id),
                  })
                }
              >
                ยกเลิกเอกสาร
              </Button>
            ) : null}
          </div>

          {linkedGrs.length > 0 ? (
            <div className={styles.flowNote}>
              <strong>ใบรับของที่อ้างอิง PO นี้</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {linkedGrs.map((gr) => (
                  <li key={gr.id}>
                    <Link href={`/goods-receipts/${gr.id}`}>
                      {gr.grNo}
                    </Link>{" "}
                    · {GOODS_RECEIPT_STATUS_LABEL[gr.status] ?? gr.status} ·{" "}
                    {formatDate(gr.grDate)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ProcurementFlowTimeline
            input={{
              pr: data.purchaseRequest
                ? {
                    id: data.purchaseRequest.id,
                    prNo: data.purchaseRequest.prNo,
                    status: data.purchaseRequest.status,
                  }
                : null,
              po: {
                id: data.id,
                poNo: data.poNo,
                status: data.status,
                paymentStatus: data.paymentStatus,
              },
              goodsReceipts: linkedGrs.map((gr) => ({
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
