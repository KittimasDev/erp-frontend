"use client";

import { useMemo } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
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
  calcDocumentTotals,
  calcWithholdingAmount,
  resolveDocumentVatPercent,
  resolveVatMode,
  resolveWithholdingPercent,
  VatMode,
  withholdingTaxTypeLabel,
  withVatPercentLabel,
} from "@/lib/money/vat-totals";
import { QUOTATION_MATRIX_ACTION_LABELS } from "@/lib/auth/quotation-matrix-labels";
import { documentHtmlIsEmpty } from "@/lib/html/sanitize-document-html";
import {
  QUOTATION_FLOW_STEPS,
  resolveQuotationFlow,
  type QuotationFlowTone,
} from "@/utils/quotation-flow";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { quotationFlowText } from "@/types/quotations";
import { vatAmountLabelT } from "@/types/purchase-orders";
import styles from "./QuotationDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
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
  // แบบร่างเอกสาร = เทา (มาตรฐานสถานะ)
  return styles.statusNeutral;
}

export default function QuotationDetailPage({ id }: Props) {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { modal } = App.useApp();
  const query = useQuotationQuery(id);
  const sendMutation = useSendQuotationMutation();
  const acceptMutation = useAcceptQuotationMutation();
  const rejectMutation = useRejectQuotationMutation();
  const cancelMutation = useCancelQuotationMutation();
  const createSalesOrderMutation = useCreateSalesOrderFromQuotationMutation();

  const data = query.data?.data;
  const vatMode = resolveVatMode(data?.vatMode);
  const vatPercent = resolveDocumentVatPercent({ vatMode });
  const totals = useMemo(
    () =>
      calcDocumentTotals(
        (data?.items ?? []).map((item) => Number(item.amount) || 0),
        Number(data?.discountAmount) || 0,
        vatMode,
        vatPercent,
      ),
    [data?.items, data?.discountAmount, vatMode, vatPercent],
  );
  const withholdingPercent = resolveWithholdingPercent(
    data?.withholdingTaxType,
    Number(data?.withholdingTaxPercent),
  );
  const withholdingAmount = calcWithholdingAmount(
    totals.taxableBase,
    withholdingPercent,
  );
  const quotationActions = useScreenActionPermissions("QUOTATIONS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canView = quotationActions.canView;
  const canWrite = quotationActions.canEdit;
  const canConfirm = quotationActions.canApprove;
  const canCreateSalesOrder = salesOrderActions.canAdd;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบเสนอราคา")}
        <div style={{ marginTop: 12 }}>
          <Link href="/quotations">{t("กลับรายการ")}</Link>
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
      customerAddress: data.customerAddress ?? data.customer?.address,
      customerPhone: data.customer?.contactPhone,
      contactName: data.contactName,
      paymentTerm: data.paymentTerm?.name ?? "—",
      taxRateLabel: withVatPercentLabel(
        QUOTATION_VAT_MODE_LABEL[vatMode],
        vatPercent,
      ),
      vatMode,
      withholdingTaxType: data.withholdingTaxType,
      validUntil: formatDate(data.validUntil),
      remark: data.remark || "",
      preparedBy: {
        id: data.createdBy?.id,
        name: data.createdBy?.displayName,
      },
      preparedByPhone: data.preparedByPhone,
      subtotalAmount: totals.subtotal,
      discountAmount: totals.discount,
      afterDiscount: totals.afterDiscount,
      vatAmount: totals.vat,
      vatRate: vatPercent,
      withholdingAmount,
      withholdingPercent,
      totalAmount: totals.total,
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
      <PageHeader
        eyebrow={t("ใบเสนอราคา")}
        icon={<FileTextOutlined />}
        title={data.quotationNo}
        subtitle={<>{data.customer
              ? `${data.customer.customerCode} — ${data.customer.nameTh}`
              : "—"}{" "}
            · {formatDate(data.quotationDate)} · {formatMoney(totals.total)}{" "}
            {t("บาท")}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/quotations")}
          >
            {t("กลับ")}
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            {t("พิมพ์ PDF")}
          </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลใบเสนอราคา")}</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.quotationNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่เอกสาร")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.quotationDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ลูกค้า")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.nameTh)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("รหัสลูกค้า")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.customerCode)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่ผู้เสียภาษี")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.taxId)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เบอร์โทร")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customer?.contactPhone)}
                </div>
              </div>
              <div className={`${styles.metaItem} ${styles.metaItemWide}`}>
                <span className={styles.metaLabel}>{t("ที่อยู่")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.customerAddress ?? data.customer?.address)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้ติดต่อ")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.contactName)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันหมดอายุ")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.validUntil)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เงื่อนไขการชำระเงิน")}</span>
                <div className={styles.metaValue}>
                  {data.paymentTerm?.name ?? t("ไม่ระบุ")}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("อัตราภาษี")}</span>
                <div className={styles.metaValue}>
                  {vatPercent > 0 ? `${vatPercent}%` : t("ไม่คิด VAT")}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("รูปแบบภาษีมูลค่าเพิ่ม")}</span>
                <div className={styles.metaValue}>
                  {withVatPercentLabel(
                    t(QUOTATION_VAT_MODE_LABEL[resolveVatMode(data.vatMode)]),
                    vatPercent,
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ภาษีหัก ณ ที่จ่าย")}</span>
                <div className={styles.metaValue}>
                  {t(
                    withholdingTaxTypeLabel(
                      data.withholdingTaxType,
                      data.withholdingTaxPercent,
                    ),
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้เสนอราคา")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.createdBy?.displayName)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เบอร์โทรผู้เสนอราคา")}</span>
                <div className={styles.metaValue}>
                  {displayDash(data.preparedByPhone)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการสินค้า")}</h2>
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
                      {item.unitNameTh ?? item.unitCode ?? ""} · {t("ราคา")}{" "}
                      {formatMoney(item.unitPrice)}
                      {Number(item.discountAmount) > 0
                        ? ` · ${t("ส่วนลด")} ${formatMoney(item.discountAmount)}`
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
                <h2 className={styles.sectionTitle}>{t("หมายเหตุ")}</h2>
              </div>
              <DocumentHtmlView html={data.remark} />
            </div>
          )}
          <ESignatureHistoryCard documentId={data.id} style={{ marginTop: 16 }} />
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.quotationNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${flowStatusClass(flow.tone, data.status)}`}>
            {quotationFlowText(flow.label, lang)}
          </div>

          <div className={styles.flowMini} aria-label={t("ขั้นตอนใบเสนอราคา")}>
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
                  <span>{quotationFlowText(step.label, lang)}</span>
                </div>
              );
            })}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("ยอดรวมก่อนส่วนลด")}</span>
              <strong>{formatMoney(totals.subtotal)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ส่วนลดท้ายบิล")}</span>
              <strong>{formatMoney(totals.discount)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ยอดหลังหักส่วนลด")}</span>
              <strong>{formatMoney(totals.afterDiscount)}</strong>
            </div>
            <p className={styles.sideHint}>{t("ฐานก่อนคำนวณภาษีมูลค่าเพิ่ม")}</p>
            <div className={styles.sideRow}>
              <span>{vatAmountLabelT(vatPercent)}</span>
              <strong>{formatMoney(totals.vat)}</strong>
            </div>
            {withholdingPercent > 0 ? (
              <div className={styles.sideRow}>
                <span>{t("ภาษีหัก ณ ที่จ่าย")} {withholdingPercent}%</span>
                <strong>{formatMoney(withholdingAmount)}</strong>
              </div>
            ) : null}
            <div className={styles.sideRow}>
              <span>{t("ยอดสุทธิ")}</span>
              <strong>{formatMoney(totals.total)}</strong>
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
                  {t("แก้ไข")}
                </Button>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() => sendMutation.mutate(data.id)}
                >
                  {t("ส่งใบเสนอราคา")}
                </Button>
                <Button
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: t("ยืนยันยกเลิกใบเสนอราคา?"),
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ยกเลิกเอกสาร")}
                </Button>
              </>
            ) : null}

            {data.status === "SENT" ? (
              <>
                {canConfirm ? (
                  <>
                    <p className={styles.actionHint}>
                      {t("สถานะปัจจุบัน: ส่งแล้ว — รอลูกค้าตอบรับ (ต้องมีสิทธิ์ {action})", {
                        action: t(QUOTATION_MATRIX_ACTION_LABELS.APPROVE),
                      })}
                    </p>
                    <Button
                      className={styles.primaryBtn}
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={busy}
                      onClick={() => acceptMutation.mutate(data.id)}
                    >
                      {t("บันทึกว่าลูกค้าตอบรับแล้ว")}
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      loading={busy}
                      onClick={() =>
                        modal.confirm({
                          title: t("ยืนยันปฏิเสธใบเสนอราคา?"),
                          onOk: () => rejectMutation.mutateAsync(data.id),
                        })
                      }
                    >
                      {t("บันทึกว่าลูกค้าปฏิเสธ")}
                    </Button>
                  </>
                ) : null}
                {!canConfirm && data.status === "SENT" ? (
                  <p className={styles.actionHint}>
                    {t(
                      "ดูรายการได้ — การ{action}ต้องเปิดสิทธิ์ QUOTATIONS · {action} ที่ Permission Matrix",
                      { action: t(QUOTATION_MATRIX_ACTION_LABELS.APPROVE) },
                    )}
                  </p>
                ) : null}
                {canWrite ? (
                  <Button
                    danger
                    loading={busy}
                    onClick={() =>
                      modal.confirm({
                        title: t("ยืนยันยกเลิกใบเสนอราคา?"),
                        onOk: () => cancelMutation.mutateAsync(data.id),
                      })
                    }
                  >
                    {t("ยกเลิกเอกสาร")}
                  </Button>
                ) : null}
              </>
            ) : null}

            {data.status === "ACCEPTED" && !data.salesOrderId ? (
              <p className={styles.actionHint}>
                {t("สถานะปัจจุบัน: ลูกค้าตอบรับแล้ว — รอเปิด Sales Order")}
              </p>
            ) : null}

            {data.status === "ACCEPTED" && data.salesOrderId ? (
              <>
                <p className={styles.actionHint}>
                  {t("สร้าง Sales Order แล้ว")}
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
                  {t("เปิด Sales Order")}
                </Button>
                {canCreateSalesOrder ? (
                  <Button
                    disabled
                    icon={<ShoppingCartOutlined />}
                  >
                    {t("สร้าง Sales Order")}
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
                {t("สร้าง Sales Order")}
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
