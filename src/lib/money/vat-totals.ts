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

export const WithholdingTaxType = {
  NONE: "NONE",
  PCT_1: "PCT_1",
  PCT_3: "PCT_3",
  CUSTOM: "CUSTOM",
} as const;

export type WithholdingTaxType =
  (typeof WithholdingTaxType)[keyof typeof WithholdingTaxType];

export const WITHHOLDING_TAX_TYPES = Object.values(WithholdingTaxType);

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
