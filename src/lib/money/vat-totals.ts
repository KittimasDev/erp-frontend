export const VatMode = {
  NONE: "NONE",
  EXCLUSIVE: "EXCLUSIVE",
  INCLUSIVE: "INCLUSIVE",
} as const;

export type VatMode = (typeof VatMode)[keyof typeof VatMode];

export const VAT_MODES = Object.values(VatMode);

export const VAT_MODE_LABEL: Record<VatMode, string> = {
  NONE: "ไม่คิด VAT",
  EXCLUSIVE: "ไม่รวม VAT",
  INCLUSIVE: "รวม VAT",
};

export const VAT_MODE_OPTIONS = VAT_MODES.map((value) => ({
  value,
  label: VAT_MODE_LABEL[value],
}));

export function vatAmountLabel(rate?: number | null): string {
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
    return `ภาษีมูลค่าเพิ่ม ${rate}%`;
  }
  return "ภาษีมูลค่าเพิ่ม";
}

/** ป้ายแถวท้ายบิล PDF — ไม่คิด VAT ไม่ใส่ %, ไม่รวม/รวม ใส่ 7% */
export function vatPdfLineLabel(
  vatMode?: string | null,
  rate?: number | null,
): string {
  if (resolveVatMode(vatMode) === VatMode.NONE) {
    return "ภาษีมูลค่าเพิ่ม";
  }
  const pct =
    typeof rate === "number" && Number.isFinite(rate) && rate > 0
      ? rate
      : STANDARD_VAT_PERCENT;
  return `ภาษีมูลค่าเพิ่ม ${pct}%`;
}

/** เช่น "รวม VAT (7%)" — ไม่คิด VAT ไม่ต่อเปอร์เซ็นต์ */
export function withVatPercentLabel(
  label: string,
  rate?: number | null,
): string {
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
    return `${label} (${rate}%)`;
  }
  return label;
}

export const WithholdingTaxType = {
  NONE: "NONE",
  PCT_1: "PCT_1",
  PCT_3: "PCT_3",
  CUSTOM: "CUSTOM",
} as const;

export type WithholdingTaxType =
  (typeof WithholdingTaxType)[keyof typeof WithholdingTaxType];

export const WITHHOLDING_TAX_TYPES = Object.values(WithholdingTaxType);

export const WITHHOLDING_TAX_TYPE_LABEL: Record<WithholdingTaxType, string> = {
  NONE: "ไม่ระบุ",
  PCT_1: "1%",
  PCT_3: "3%",
  CUSTOM: "กำหนดเอง",
};

export const WITHHOLDING_TAX_TYPE_OPTIONS = WITHHOLDING_TAX_TYPES.map(
  (value) => ({
    value,
    label: WITHHOLDING_TAX_TYPE_LABEL[value],
  }),
);

export function withholdingTaxTypeLabel(
  type?: string | null,
  percent?: string | number | null,
): string {
  const resolved = resolveWithholdingTaxType(type);
  if (resolved === WithholdingTaxType.NONE) {
    return WITHHOLDING_TAX_TYPE_LABEL.NONE;
  }
  const pct = resolveWithholdingPercent(resolved, Number(percent ?? 0));
  if (resolved === WithholdingTaxType.CUSTOM) {
    return `${pct}%`;
  }
  return WITHHOLDING_TAX_TYPE_LABEL[resolved];
}

export type DocumentTotals = {
  subtotal: number;
  discount: number;
  afterDiscount: number;
  taxableBase: number;
  vat: number;
  total: number;
};

function toNum(value: string | number | null | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function roundMoney(value: number): number {
  return Number(toNum(value).toFixed(2));
}

export function resolveVatMode(value?: string | null): VatMode {
  if (value === VatMode.NONE || value === VatMode.INCLUSIVE) {
    return value;
  }
  return VatMode.EXCLUSIVE;
}

export function resolveWithholdingTaxType(
  value?: string | null,
): WithholdingTaxType {
  if (
    value === WithholdingTaxType.PCT_1 ||
    value === WithholdingTaxType.PCT_3 ||
    value === WithholdingTaxType.CUSTOM
  ) {
    return value;
  }
  return WithholdingTaxType.NONE;
}

export function resolveWithholdingPercent(
  type?: string | null,
  customPercent?: number | null,
): number {
  if (type === WithholdingTaxType.PCT_1) {
    return 1;
  }
  if (type === WithholdingTaxType.PCT_3) {
    return 3;
  }
  if (type === WithholdingTaxType.CUSTOM) {
    return Math.max(0, toNum(customPercent));
  }
  return 0;
}

export function calcWithholdingAmount(
  taxableBase: number,
  percent: number,
): number {
  return roundMoney((toNum(taxableBase) * toNum(percent)) / 100);
}

export function calcLineAmount(
  quantity: number,
  unitPrice: number,
  discountAmount: number,
): number {
  const raw = toNum(quantity) * toNum(unitPrice) - toNum(discountAmount);
  return Math.max(0, roundMoney(raw));
}

/** อัตรา VAT มาตรฐานของใบสั่งซื้อและใบเสนอราคา เมื่อรูปแบบไม่ใช่ไม่คิด VAT */
export const STANDARD_VAT_PERCENT = 7;

export function calcDocumentTotals(
  lineAmounts: number[],
  headerDiscount: number,
  vatMode: VatMode = VatMode.EXCLUSIVE,
  taxRatePercent = 0,
): DocumentTotals {
  const subtotal = roundMoney(
    lineAmounts.reduce((sum, amount) => sum + toNum(amount), 0),
  );
  const discount = Math.min(toNum(headerDiscount), subtotal);
  const afterDiscount = Math.max(0, roundMoney(subtotal - discount));
  const rate = Math.max(0, toNum(taxRatePercent));
  const mode = resolveVatMode(vatMode);

  if (mode === VatMode.NONE || rate <= 0) {
    return {
      subtotal,
      discount,
      afterDiscount,
      taxableBase: afterDiscount,
      vat: 0,
      total: afterDiscount,
    };
  }

  if (mode === VatMode.INCLUSIVE) {
    const vat = roundMoney((afterDiscount * rate) / (100 + rate));
    const taxableBase = roundMoney(afterDiscount - vat);
    return {
      subtotal,
      discount,
      afterDiscount,
      taxableBase,
      vat,
      total: afterDiscount,
    };
  }

  const vat = roundMoney((afterDiscount * rate) / 100);
  return {
    subtotal,
    discount,
    afterDiscount,
    taxableBase: afterDiscount,
    vat,
    total: roundMoney(afterDiscount + vat),
  };
}

/**
 * อัตรา VAT ของใบสั่งซื้อและใบเสนอราคา = 7% เมื่อรูปแบบเป็นไม่รวม VAT / รวม VAT
 *
 * กติกาเดิม (2026-09-07) ที่ผูก VAT กับอัตราหัก ณ ที่จ่ายถูกแทนแล้ว (2026-09-11)
 * หัก ณ ที่จ่ายยังเป็นคนละช่อง คนละภาษี — ไม่ได้กำหนด % VAT
 *
 * ใช้เฉพาะสองเอกสารนี้ — ใบสั่งขาย / ใบแจ้งหนี้ ยังคิดจาก master tax_rates ตามเดิม
 *
 * เทสต์อยู่ฝั่ง backend ที่ common/money/vat-totals.spec.ts — ไฟล์นี้เป็นสำเนา
 * ตามแบบเดิมของโปรเจกต แก้ที่ไหนต้องแก้อีกที่ให้ตรงกันเสมอ
 *
 * vatMode === NONE ชนะเสมอ — เลือกไม่คิด VAT แล้วต้องไม่มี VAT
 */
export function resolveDocumentVatPercent(input: {
  vatMode?: string | null;
  withholdingTaxType?: string | null;
  withholdingTaxPercent?: number | string | null;
}): number {
  if (resolveVatMode(input.vatMode) === VatMode.NONE) {
    return 0;
  }
  return STANDARD_VAT_PERCENT;
}

export type ChargeTotals = {
  amountBeforeVat: number;
  vat: number;
  total: number;
};

/**
 * ค่าใช้จ่ายเพิ่มเติม 1 รายการ — ตาม vatMode ของรายการ
 * NONE / EXCLUSIVE: amount = ก่อน VAT · INCLUSIVE: amount = รวม VAT แล้ว
 */
export function calcChargeTotals(
  amount: number,
  taxRatePercent: number,
  vatMode?: VatMode | string | null,
): ChargeTotals {
  const amountIn = roundMoney(Math.max(0, toNum(amount)));
  const rate = Math.max(0, toNum(taxRatePercent));
  const mode = resolveVatMode(vatMode);

  if (mode === VatMode.NONE || rate <= 0) {
    return { amountBeforeVat: amountIn, vat: 0, total: amountIn };
  }

  if (mode === VatMode.INCLUSIVE) {
    const vat = roundMoney((amountIn * rate) / (100 + rate));
    return {
      amountBeforeVat: roundMoney(amountIn - vat),
      vat,
      total: amountIn,
    };
  }

  const vat = roundMoney((amountIn * rate) / 100);
  return {
    amountBeforeVat: amountIn,
    vat,
    total: roundMoney(amountIn + vat),
  };
}

/** รวมค่าใช้จ่ายหลายรายการ — ปัด VAT ต่อรายการก่อนรวม (ผลรวมตรงกับที่แสดงทีละรายการ) */
export function sumChargeTotals(
  charges: Array<{
    amountBeforeVat: number;
    taxRatePercent: number;
    vatMode?: string | null;
  }>,
): ChargeTotals & { lines: ChargeTotals[] } {
  const lines = charges.map((c) =>
    calcChargeTotals(c.amountBeforeVat, c.taxRatePercent, c.vatMode),
  );
  const amountBeforeVat = roundMoney(
    lines.reduce((sum, l) => sum + l.amountBeforeVat, 0),
  );
  const vat = roundMoney(lines.reduce((sum, l) => sum + l.vat, 0));
  return { lines, amountBeforeVat, vat, total: roundMoney(amountBeforeVat + vat) };
}

/**
 * VAT ของยอดค่าใช้จ่ายที่นำไปตั้ง AP ครั้งหนึ่ง (ควบคุมการปัดเศษเมื่อแบ่งหลาย AP)
 * - ยอดสะสมยังไม่ถึงวงเงินของรายการ: round(ฐาน × อัตรา) แต่ไม่เกิน VAT ที่เหลือ
 * - ยอดสะสมครบวงเงินพอดี: ใช้ VAT ที่เหลือของรายการ → ผลรวม VAT ทุก AP = VAT ใน PO เสมอ
 */
export function allocateChargeVat(input: {
  chargeAmountBeforeVat: number;
  chargeVat: number;
  taxRatePercent: number;
  allocBase: number;
  priorAllocBase: number;
  priorAllocVat: number;
}): number {
  const vatLeft = Math.max(
    0,
    roundMoney(toNum(input.chargeVat) - toNum(input.priorAllocVat)),
  );
  const cumulative = roundMoney(
    toNum(input.priorAllocBase) + toNum(input.allocBase),
  );
  if (cumulative >= roundMoney(toNum(input.chargeAmountBeforeVat)) - 0.004) {
    return vatLeft;
  }
  const rate = Math.max(0, toNum(input.taxRatePercent));
  return Math.min(vatLeft, roundMoney((toNum(input.allocBase) * rate) / 100));
}

