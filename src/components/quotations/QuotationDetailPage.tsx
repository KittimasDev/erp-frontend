"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  SendOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useAcceptQuotationMutation,
  useCancelQuotationMutation,
  useRejectQuotationMutation,
  useSendQuotationMutation,
} from "@/hooks/quotations/useQuotationMutations";
import { useQuotationQuery } from "@/hooks/quotations/useQuotationsQuery";
import { useCreateSalesOrderFromQuotationMutation } from "@/hooks/sales-orders/useSalesOrderMutations";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import {
  QUOTATION_STATUS_LABEL,
  type QuotationStatus,
} from "@/types/quotations";
import styles from "./QuotationDetailPage.module.css";

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
    case "ACCEPTED":
      return styles.statusApproved;
    case "SENT":
      return styles.statusPending;
    case "REJECTED":
      return styles.statusRejected;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function QuotationDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useQuotationQuery(id);
  const sendMutation = useSendQuotationMutation();
  const acceptMutation = useAcceptQuotationMutation();
  const rejectMutation = useRejectQuotationMutation();
  const cancelMutation = useCancelQuotationMutation();
  const createSalesOrderMutation = useCreateSalesOrderFromQuotationMutation();

  const data = query.data?.data;
  const canWrite =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();
  const canConfirm =
    userHasRole(RoleCode.SALES_MANAGER) || isAdministrator();

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
        ไม่พบใบเสนอราคา
        <div style={{ marginTop: 12 }}>
          <Link href="/quotations">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy =
    sendMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;
  const creatingSalesOrder = createSalesOrderMutation.isPending;

  const printPdf = async () => {
    const { generateSalesQuotationPdf } = await import(
      "@/utils/generateSalesQuotationPdf"
    );
    await generateSalesQuotationPdf({
      quotationNo: data.quotationNo,
      quotationDate: formatDate(data.quotationDate),
      customerName: data.customer?.nameTh ?? "—",
      customerCode: data.customer?.customerCode ?? "—",
      paymentTerm: data.paymentTerm?.name ?? "—",
      validUntil: formatDate(data.validUntil),
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
          <p className={styles.eyebrow}>Sales · Quotation</p>
          <h1 className={styles.pageTitle}>{data.quotationNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.customer
              ? `${data.customer.customerCode} — ${data.customer.nameTh}`
              : "—"}{" "}
            · {formatDate(data.quotationDate)} · {formatMoney(data.totalAmount)}{" "}
            บาท
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/quotations")}
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
              <h2 className={styles.sectionTitle}>ข้อมูลใบเสนอราคา</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.quotationNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>
                  {formatDate(data.quotationDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันหมดอายุ</span>
                <div className={styles.metaValue}>
                  {formatDate(data.validUntil)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เงื่อนไขชำระ</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "ไม่ระบุ"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>VAT</span>
                <div className={styles.metaValue}>
                  {data.taxRate
                    ? `${data.taxRate.name} (${data.taxRate.rate}%)`
                    : "ไม่มี (0%)"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>สร้างโดย</span>
                <div className={styles.metaValue}>
                  {data.createdBy?.displayName ?? "—"}
                </div>
              </div>
            </div>
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
                      {item.unitNameTh ?? item.unitCode ?? ""} · ราคา{" "}
                      {formatMoney(item.unitPrice)}
                      {Number(item.discountAmount) > 0
                        ? ` · ส่วนลด ${formatMoney(item.discountAmount)}`
                        : ""}
                    </p>
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
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.quotationNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {QUOTATION_STATUS_LABEL[data.status as QuotationStatus] ??
              data.status}
          </div>

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
            {canWrite && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => router.push(`/quotations/${data.id}/edit`)}
                >
                  แก้ไข
                </Button>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() => sendMutation.mutate(data.id)}
                >
                  ส่งใบเสนอราคา
                </Button>
                <Button
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "ยืนยันยกเลิกใบเสนอราคา?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
                </Button>
              </>
            ) : null}

            {data.status === "SENT" ? (
              <>
                {canConfirm ? (
                  <>
                    <p className={styles.actionHint}>
                      สถานะปัจจุบัน: ส่งแล้ว — รอลูกค้าตอบรับ
                    </p>
                    <Button
                      className={styles.primaryBtn}
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={busy}
                      onClick={() => acceptMutation.mutate(data.id)}
                    >
                      บันทึกว่าลูกค้าตอบรับแล้ว
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      loading={busy}
                      onClick={() =>
                        modal.confirm({
                          title: "ยืนยันปฏิเสธใบเสนอราคา?",
                          onOk: () => rejectMutation.mutateAsync(data.id),
                        })
                      }
                    >
                      บันทึกว่าลูกค้าปฏิเสธ
                    </Button>
                  </>
                ) : null}
                {canWrite ? (
                  <Button
                    danger
                    loading={busy}
                    onClick={() =>
                      modal.confirm({
                        title: "ยืนยันยกเลิกใบเสนอราคา?",
                        onOk: () => cancelMutation.mutateAsync(data.id),
                      })
                    }
                  >
                    ยกเลิกเอกสาร
                  </Button>
                ) : null}
              </>
            ) : null}

            {data.status === "ACCEPTED" && canWrite ? (
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<ShoppingCartOutlined />}
                loading={creatingSalesOrder}
                onClick={() =>
                  createSalesOrderMutation.mutate(
                    { quotationId: data.id },
                    {
                      onSuccess: (res) => {
                        router.push(`/sales-orders/${res.data.id}`);
                      },
                    },
                  )
                }
              >
                สร้าง Sales Order
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
