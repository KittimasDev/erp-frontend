import dayjs from "dayjs";
import {
  EXPRESS_STATUS_LABEL,
  PV_SOURCE_LABEL,
  type PaymentVoucherDetail,
  type PaymentVoucherJournal,
  type VoucherBankAccount,
} from "@/types/payment-vouchers";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  type SupplierPaymentBankAccount,
} from "@/types/purchase-payments";

import { numberToThaiBahtText } from "./numberToThaiBahtText";
import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
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

function moneyText(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
 *
 * ตารางรายการเป็นตารางบัญชี (เลขที่บัญชี | แผนก | รายละเอียด | เดบิต | เครดิต) ตามแบบที่ลูกค้าใช้
 * บรรทัดมาจาก GET /api/payment-vouchers/:id/journal = บรรทัดเดียวกับสมุดรายวันจ่าย
 * (ใบที่ยังไม่จ่ายเป็นรายการคำนวณล่วงหน้า) · ยอดสำคัญของใบย้ายไปอยู่ในการ์ดข้อมูล
 */
export function buildPaymentVoucherPdfData(
  d: PaymentVoucherDetail,
  journal: PaymentVoucherJournal,
): SalesCommercialPdfData {
  const v = d.voucher;
  const payable = recordedMoney(v.totalAmount);
  const net = recordedMoney(v.netAmount);
  const vat = positiveMoney(d.vatAmount);
  const wht = positiveMoney(v.whtAmount);
  const deposit = positiveMoney(d.depositDeductAmount);
  const activePayments = (v.payments ?? []).filter((payment) => payment.status !== "CANCELLED");

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

  // ตารางบัญชี: เลขที่บัญชี | แผนก (ระบบยังไม่มีข้อมูลแผนก เว้นว่าง) | รายละเอียด | เดบิต | เครดิต
  const items = journal.lines.map((line, index) => {
    const mapped = Boolean(line.accountCode);
    const detail = line.detail ? ` — ${line.detail}` : "";
    return {
      no: index + 1,
      itemCode: "",
      itemName: mapped
        ? `${line.accountName ?? line.description}${detail}`
        : `${line.description}${detail}`,
      unit: "",
      qty: 0,
      accountCode: mapped ? (line.accountCode ?? "") : "ยังไม่ผูกบัญชี",
      department: "",
      debit: line.debit,
      credit: line.credit,
    };
  });

  const apRefs = d.apDocuments.map((ap) => ap.docNo).filter(Boolean);
  const amountRows = (
    [
      ["ยอดเจ้าหนี้", payable],
      ["ภาษีมูลค่าเพิ่ม (รวมในยอดแล้ว)", vat],
      ["ภาษีหัก ณ ที่จ่าย", wht],
      ["ยอดหักมัดจำ", deposit],
      ["ยอดจ่ายสุทธิ", net],
    ] as const
  )
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => ({
      label,
      value: moneyText(value as number),
      emphasis: label === "ยอดจ่ายสุทธิ",
    }));

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
          ...(apRefs.length > 0 ? [{ label: "อ้างอิงใบตั้งหนี้", value: apRefs.join(", ") }] : []),
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
          ...amountRows,
        ],
      },
    ],
    items: [],
    itemGroups: [
      {
        heading:
          journal.mode === "POSTED"
            ? "รายการบัญชีตามสมุดรายวันจ่าย"
            : "รายการบัญชี (ล่วงหน้า — ยังไม่ชำระเงิน)",
        items,
      },
    ],
    withPrices: false,
    journalColumns: true,
    journalTotals: {
      debit: journal.totalDebit,
      credit: journal.totalCredit,
      amountText: `(${numberToThaiBahtText(journal.totalDebit)})`,
    },
    totalAmount: journal.totalDebit,
    remark: v.remark ?? "",
    signatures: [
      { title: "ผู้จัดทำ", name: d.createdByAction?.name },
      { title: "ผู้อนุมัติ", name: d.approvedByAction?.name },
      "ผู้รับเงิน",
    ],
  };
}

export async function generatePaymentVoucherPdf(
  d: PaymentVoucherDetail,
  journal: PaymentVoucherJournal,
) {
  await generateSalesCommercialPdf(buildPaymentVoucherPdfData(d, journal));
}
