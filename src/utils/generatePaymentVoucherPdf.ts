import dayjs from "dayjs";
import {
  EXPRESS_STATUS_LABEL,
  PV_SOURCE_LABEL,
  type PaymentVoucherDetail,
  type VoucherBankAccount,
} from "@/types/payment-vouchers";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  type SupplierPaymentBankAccount,
} from "@/types/purchase-payments";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesCommercialPdfTotalsLine,
} from "./pdf-common";

function thaiDate(value?: string | null) {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return dayjs(new Date(y, m - 1, d)).format("DD/MM/BBBB");
}

/** ค่าที่มากกว่า 0 เท่านั้น — 0 หรือค่าว่างคือไม่มีข้อมูลให้พิมพ์ */
function positiveMoney(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** ยอดที่มีค่าจริง รวม 0 เมื่อเอกสารถือยอดนั้นไว้ */
function recordedMoney(value?: string | number | null): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function bankText(bank: SupplierPaymentBankAccount | VoucherBankAccount) {
  return `${bank.bankName} ${bank.accountNumber}`.trim();
}

/** วัตถุประสงค์ — ข้อความเดียวกับหน้ารายละเอียดใบสำคัญจ่าย */
function purposeText(kind?: string | null) {
  if (kind === "ADVANCE") return "จ่ายชำระล่วงหน้า";
  if (kind === "DEPOSIT") return "ชำระมัดจำ";
  if (kind === "AP_PAYMENT") return "ชำระค่าสินค้า";
  return kind?.trim() || "—";
}

/**
 * ใบสำคัญจ่าย (Payment Voucher) — ใช้ template เอกสารกลุ่มเดียวกับใบตั้งหนี้/ใบสั่งซื้อ
 * ใบที่ยังไม่อนุมัติหรือยกเลิกจะพิมพ์ป้ายเตือนไว้หัวกระดาษ กันเอาใบร่างไปใช้เป็นใบจริง
 * ใบที่จ่ายแล้วใช้แสตมป์แดง "จ่ายแล้ว" แทนแถบหัว
 * กรอบข้อมูลแบ่งสองการ์ดเหมือนหน้ารายละเอียด: ข้อมูลเจ้าหนี้ / ข้อมูลการชำระเงิน
 * ตัวเลขมาจาก GET /api/payment-vouchers/:id เท่านั้น ไม่เติมแถวหรือยอดที่ต้นทางไม่มี
 */
export function buildPaymentVoucherPdfData(d: PaymentVoucherDetail): SalesCommercialPdfData {
  const v = d.voucher;
  const payable = recordedMoney(v.totalAmount);
  const net = recordedMoney(v.netAmount);
  const vat = positiveMoney(d.vatAmount);
  const wht = positiveMoney(v.whtAmount);
  const deposit = positiveMoney(d.depositDeductAmount);
  const activePayments = (v.payments ?? []).filter((payment) => payment.status !== "CANCELLED");
  const multiRate = (d.whtLines?.length ?? 0) > 1;

  const paidBanks = activePayments
    .map((payment) => payment.bankAccount)
    .filter((bank): bank is SupplierPaymentBankAccount => Boolean(bank));
  const banks = paidBanks.length > 0 ? paidBanks : d.bankAccount ? [d.bankAccount] : [];
  const bankValue = banks
    .map(bankText)
    .filter((text, index, all) => text && all.indexOf(text) === index)
    .join(" · ");

  const purchaseOrders =
    d.purchaseOrders && d.purchaseOrders.length > 0
      ? d.purchaseOrders.map((po) => po.poNo).filter(Boolean)
      : v.purchaseOrder?.poNo
        ? [v.purchaseOrder.poNo]
        : [];
  const poValue =
    purchaseOrders.length > 0
      ? purchaseOrders.join(", ")
      : [
          PV_SOURCE_LABEL[v.sourceType ?? "PURCHASE_ORDER"] ?? v.sourceType,
          v.sourceNo,
        ]
          .filter(Boolean)
          .join(" ") || "—";

  const payDates = activePayments
    .map((payment) => thaiDate(payment.paymentDate))
    .filter((value, index, all) => value && all.indexOf(value) === index);
  const payDate =
    payDates.length > 0
      ? payDates.join(", ")
      : thaiDate(v.paidAt) || thaiDate(d.desiredPayDate ?? v.desiredPayDate) || "—";

  const refs = activePayments
    .map((payment) => payment.transactionRef?.trim() ?? "")
    .filter((value, index, all) => value && all.indexOf(value) === index);

  const methodLabel =
    (SUPPLIER_PAYMENT_METHOD_LABEL as Record<string, string>)[v.paymentMethod] ??
    v.paymentMethod ??
    "—";

  // อนุมัติแล้วรอจ่าย = แถบเตือน · จ่ายแล้ว = แสตมป์แดง · อื่น ๆ = แถบสถานะ
  const isPaid = v.status === "PAID";
  const draftBanner = isPaid
    ? undefined
    : v.status === "APPROVED"
      ? "ยังไม่ชำระเงิน"
      : v.status === "CANCELLED"
        ? "ยกเลิกแล้ว"
        : v.status === "PENDING_APPROVAL"
          ? "รออนุมัติ — ยังไม่อนุมัติ"
          : v.status === "REJECTED"
            ? "ไม่อนุมัติ"
            : "ร่าง — ยังไม่อนุมัติ";

  const items = d.apDocuments
    .flatMap((ap) => {
      const amount = recordedMoney(ap.allocatedAmount);
      if (amount === undefined) return [];
      const itemName = [
        `ชำระใบตั้งหนี้ ${ap.docNo}`,
        ap.invoiceNo ? `ใบแจ้งหนี้ ${ap.invoiceNo}` : null,
        ap.poNo ? `PO ${ap.poNo}` : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ");
      return [
        {
          no: 0,
          itemCode: ap.docNo,
          itemName,
          unit: "รายการ",
          qty: 1,
          unitPrice: amount,
          amount,
        },
      ];
    })
    .map((item, index) => ({ ...item, no: index + 1 }));

  const detailedWht: SalesCommercialPdfTotalsLine[] =
    wht != null && multiRate
      ? (d.whtLines ?? []).flatMap((line) => {
          const value = positiveMoney(line.whtAmount);
          if (value == null) return [];
          const rate = Number(line.rate);
          const base = recordedMoney(line.baseAmount);
          const rateText = Number.isFinite(rate) && rate > 0 ? ` ${rate}%` : "";
          const baseText =
            base != null
              ? ` (ฐาน ${base.toLocaleString("th-TH", { minimumFractionDigits: 2 })})`
              : "";
          return [
            {
              label: `ภาษีหัก ณ ที่จ่าย${line.incomeType ? ` ${line.incomeType}` : ""}${rateText}${baseText}`,
              value,
            },
          ];
        })
      : [];
  const whtLines: SalesCommercialPdfTotalsLine[] =
    detailedWht.length > 0
      ? detailedWht
      : wht != null
        ? [
            {
              label:
                Number(d.whtRate) > 0
                  ? `ภาษีหัก ณ ที่จ่าย ${Number(d.whtRate)}%`
                  : "ภาษีหัก ณ ที่จ่าย",
              value: wht,
            },
          ]
        : [];

  const totalsLines: SalesCommercialPdfTotalsLine[] = [
    ...(payable != null ? [{ label: "ยอดเจ้าหนี้", value: payable }] : []),
    ...(vat != null ? [{ label: "ภาษีมูลค่าเพิ่ม (รวมในยอดแล้ว)", value: vat }] : []),
    ...whtLines,
    ...(deposit != null ? [{ label: "ยอดหักมัดจำ", value: deposit }] : []),
    ...(net != null ? [{ label: "ยอดจ่ายสุทธิ", value: net, grand: true }] : []),
  ];

  return {
    pageId: "payment-voucher-pdf",
    titleTh: "ใบสำคัญจ่าย",
    titleEn: "PAYMENT VOUCHER",
    docNo: v.voucherNo,
    docDate: thaiDate(v.voucherDate) || "—",
    draftBanner,
    statusStamp: isPaid ? "จ่ายแล้ว" : undefined,
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลเจ้าหนี้",
        rows: [
          {
            label: "เจ้าหนี้",
            value: `${d.supplier.creditorCode ?? ""} ${d.supplier.nameTh}`.trim(),
            emphasis: true,
          },
          { label: "เลขประจำตัวผู้เสียภาษี", value: d.supplier.taxId || "—" },
          { label: "วัตถุประสงค์", value: purposeText(v.paymentKind) },
          { label: "อ้างอิง PO", value: poValue },
        ],
      },
      {
        title: "ข้อมูลการชำระเงิน",
        rows: [
          { label: "วิธีการ", value: methodLabel },
          { label: "วันที่จ่าย", value: payDate },
          { label: "ธนาคาร / เลขบัญชีจ่าย", value: bankValue || "—" },
          { label: "เลขอ้างอิงธุรกรรม", value: refs.join(", ") || "—" },
          // Express ยังมีประโยชน์ตอนยังไม่จ่าย — โชว์ใต้การ์ดชำระเมื่อมีค่าที่ไม่ใช่ NOT_SENT
          ...(d.expressStatus && d.expressStatus !== "NOT_SENT"
            ? [
                {
                  label: "สถานะ Express",
                  value: EXPRESS_STATUS_LABEL[d.expressStatus] ?? d.expressStatus,
                },
              ]
            : []),
        ],
      },
    ],
    items,
    columnLabels: {
      code: "เลขที่ AP",
      name: "รายการ",
      unit: "หน่วย",
      qty: "จำนวน",
      price: "ยอดจ่าย",
      amount: "จำนวนเงิน",
    },
    withPrices: true,
    totalAmount: net ?? payable ?? 0,
    totalsLines,
    remark: v.remark ?? "",
    signatures: [
      { title: "ผู้จัดทำ", name: d.createdByAction?.name },
      { title: "ผู้อนุมัติ", name: d.approvedByAction?.name },
      "ผู้รับเงิน",
    ],
  };
}

export async function generatePaymentVoucherPdf(d: PaymentVoucherDetail) {
  await generateSalesCommercialPdf(buildPaymentVoucherPdfData(d));
}
