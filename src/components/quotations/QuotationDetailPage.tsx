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
import AccessDenied from "@/components/auth/AccessDenied";
import DocumentHtmlView from "@/components/common/DocumentHtmlView";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  resolveDocumentVatPercent,
  resolveVatMode,
  vatAmountLabel,
  VatMode,
  withholdingTaxTypeLabel,
} from "@/lib/money/vat-totals";
import { QUOTATION_MATRIX_ACTION_LABELS } from "@/lib/auth/quotation-matrix-labels";
import { documentHtmlIsEmpty } from "@/lib/html/sanitize-document-html";
import {
  QUOTATION_FLOW_STEPS,
  resolveQuotationFlow,
  type QuotationFlowTone,
} from "@/utils/quotation-flow";
import styles from "./QuotationDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const QUOTATION_VAT_MODE_LABEL: Record<VatMode, string> = {
  [VatMode.NONE]: "ไม่คิดภาษีมูลค่าเพิ่ม",
  [VatMode.EXCLUSIVE]: "ไม่รวมในราคา",
  [VatMode.INCLUSIVE]: "รวมในราคา",
};

function displayDash(value?: string | null) {
  const text = value?.trim();
  return text ? text : "—";
}

function flowStatusClass(tone: QuotationFlowTone, status: string) {
  if (tone === "stopped") {
    return status === "CANCELLED"
      ? styles.statusCancelled
      : styles.statusRejected;
  }
  if (tone === "done") {
    return styles.statusApproved;
  }
  if (tone === "waiting") {
    return styles.statusPending;
  }
  return styles.statusDraft;
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
  /*
    อัตรา VAT ของใบนี้ = อัตราหัก ณ ที่จ่าย (ดู resolveDocumentVatPercent)
    ไม่ได้อ่านจาก data.taxRate อีกแล้ว
  */
  const vatPercent = resolveDocumentVatPercent(data ?? {});
  const quotationActions = useScreenActionPermissions("QUOTATIONS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canView = quotationActions.canView;
  const canWrite = quotationActions.canEdit;
  const canConfirm = quotationActions.canApprove;
  const canCreateSalesOrder = salesOrderActions.canAdd;

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

  if (!canView) {
    return <AccessDenied screenCodes={["QUOTATIONS"]} />;
  }

  const busy =
    sendMutation.isPending ||
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;
  const creatingSalesOrder = createSalesOrderMutation.isPending;
  const flow = resolveQuotationFlow(data);

  const printPdf = async () => {
    const { generateSalesQuotationPdf } = await import(
      "@/utils/generateSalesQuotationPdf"
    );
    await generateSalesQuotationPdf({
      quotationNo: data.quotationNo,
      quotationDate: formatDate(data.quotationDate),
      customerName: data.customer?.nameTh ?? "—",
      customerCode: data.customer?.customerCode ?? "—",
      customerTaxId: data.customer?.taxId,
      customerAddress: data.customer?.address,
      customerPhone: data.customer?.contactPhone,
      contactName: data.contactName,
      paymentTerm: data.paymentTerm?.name ?? "—",
      taxRateLabel: vatAmountLabel(vatPercent),
      withholdingTaxType: data.withholdingTaxType,
      validUntil: formatDate(data.validUntil),
      remark: data.remark || "",
      preparedBy: {
        id: data.createdBy?.id,
        name: data.createdBy?.displayName,
      },
      preparedByPhone: data.preparedByPhone,
      subtotalAmount: Number(data.subtotalAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      afterDiscount: Math.max(
        0,
        Number(data.subtotalAmount) - Number(data.discountAmount),
      ),
      vatAmount: Number(data.vatAmount) || 0,
      vatRate: vatPercent,
      withholdingAmount: Number(data.withholdingTaxAmount) || 0,
      withholdingPercent: Number(data.withholdingTaxPercent) || 0,
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
          <p className={styles.eyebrow}>ใบเสนอราคา</p>
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
                <span className={styles.metaLabel}>วันที่เอกสาร</span>
                <div className={styles.metaValue}>
                  {formatDate(data.quotationDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.nameTh)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>รหัสลูกค้า</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.customerCode)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่ผู้เสียภาษี</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.taxId)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เบอร์โทร</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.contactPhone)}
                </div>
              </div>
              <div className={`${styles.metaItem} ${styles.metaItemWide}`}>
                <span className={styles.metaLabel}>ที่อยู่</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.address)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ติดต่อ</span>
                <div className={styles.metaValue}>
                  {displayDash(data.contactName)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันหมดอายุ</span>
                <div className={styles.metaValue}>
                  {formatDate(data.validUntil)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เงื่อนไขการชำระเงิน</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? "ไม่ระบุ"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อัตราภาษี</span>
                <div className={styles.metaValue}>
                  {vatPercent > 0 ? `${vatPercent}%` : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>รูปแบบภาษีมูลค่าเพิ่ม</span>
                <div className={styles.metaValue}>
                  {QUOTATION_VAT_MODE_LABEL[resolveVatMode(data.vatMode)]}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ภาษีหัก ณ ที่จ่าย</span>
                <div className={styles.metaValue}>
                  {withholdingTaxTypeLabel(
                    data.withholdingTaxType,
                    data.withholdingTaxPercent,
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้เสนอราคา</span>
                <div className={styles.metaValue}>
                  {displayDash(data.createdBy?.displayName)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เบอร์โทรผู้เสนอราคา</span>
                <div className={styles.metaValue}>
                  {displayDash(data.preparedByPhone)}
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

          {documentHtmlIsEmpty(data.remark) ? null : (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <DocumentHtmlView html={data.remark} />
            </div>
          )}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.quotationNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${flowStatusClass(flow.tone, data.status)}`}>
            {flow.label}
          </div>

          <div className={styles.flowMini} aria-label="ขั้นตอนใบเสนอราคา">
            {QUOTATION_FLOW_STEPS.map((step, index) => {
              const stepNo = index + 1;
              const filled = flow.step > 0 && stepNo <= flow.step;
              const current =
                stepNo === flow.step && flow.tone !== "stopped";
              return (
                <div
                  key={step.key}
                  className={[
                    styles.flowMiniStep,
                    filled ? styles.flowMiniStepOn : "",
                    current ? styles.flowMiniStepCurrent : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={styles.flowMiniDot} aria-hidden />
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.sideRows}>
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
                  Math.max(
                    0,
                    Number(data.subtotalAmount) - Number(data.discountAmount),
                  ),
                )}
              </strong>
            </div>
            <p className={styles.sideHint}>ฐานก่อนคำนวณภาษีมูลค่าเพิ่ม</p>
            <div className={styles.sideRow}>
              <span>
                {vatAmountLabel(vatPercent)}
              </span>
              <strong>{formatMoney(data.vatAmount)}</strong>
            </div>
            {Number(data.withholdingTaxPercent) > 0 ? (
              <div className={styles.sideRow}>
                <span>
                  ภาษีหัก ณ ที่จ่าย {data.withholdingTaxPercent}%
                </span>
                <strong>{formatMoney(data.withholdingTaxAmount)}</strong>
              </div>
            ) : null}
            <div className={styles.sideRow}>
              <span>ยอดสุทธิ</span>
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
                      สถานะปัจจุบัน: ส่งแล้ว — รอลูกค้าตอบรับ (ต้องมีสิทธิ์{" "}
                      {QUOTATION_MATRIX_ACTION_LABELS.APPROVE})
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
                {!canConfirm && data.status === "SENT" ? (
                  <p className={styles.actionHint}>
                    ดูรายการได้ — การ{QUOTATION_MATRIX_ACTION_LABELS.APPROVE}ต้องเปิดสิทธิ์
                    QUOTATIONS · {QUOTATION_MATRIX_ACTION_LABELS.APPROVE} ที่ Permission
                    Matrix
                  </p>
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

            {data.status === "ACCEPTED" && !data.salesOrderId ? (
              <p className={styles.actionHint}>
                สถานะปัจจุบัน: ลูกค้าตอบรับแล้ว — รอเปิด Sales Order
              </p>
            ) : null}

            {data.status === "ACCEPTED" && data.salesOrderId ? (
              <>
                <p className={styles.actionHint}>
                  สร้าง Sales Order แล้ว
                  {data.salesOrderNo ? ` (${data.salesOrderNo})` : ""}
                </p>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  onClick={() =>
                    router.push(`/sales-orders/${data.salesOrderId}`)
                  }
                >
                  เปิด Sales Order
                </Button>
                {canCreateSalesOrder ? (
                  <Button
                    disabled
                    icon={<ShoppingCartOutlined />}
                  >
                    สร้าง Sales Order
                  </Button>
                ) : null}
              </>
            ) : null}

            {data.status === "ACCEPTED" &&
            !data.salesOrderId &&
            canCreateSalesOrder ? (
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
