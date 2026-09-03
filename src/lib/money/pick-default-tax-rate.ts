export type TaxRatePickRow = {
  id: string;
  code: string;
  rate: number | string;
  taxType?: string | null;
  isActive: boolean;
};

export function pickDefaultTaxRateId(
  rates: TaxRatePickRow[],
  defaultVatRate?: number | null,
  existingId?: string | null,
): string | undefined {
  const active = rates.filter((row) => row.isActive);
  if (existingId && active.some((row) => row.id === existingId)) {
    return existingId;
  }

  const target = Number(defaultVatRate ?? 0);
  if (target > 0) {
    const matched = active
      .filter((row) => Math.abs(Number(row.rate) - target) < 0.001)
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code));
    if (matched[0]) {
      return matched[0].id;
    }
  }

  const vatRows = active
    .filter((row) => (row.taxType ?? "").toUpperCase() === "VAT")
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code));
  return vatRows[0]?.id;
}

export function pickDefaultTaxRatePercent(
  rates: TaxRatePickRow[],
  defaultVatRate?: number | null,
  existingId?: string | null,
): number {
  const id = pickDefaultTaxRateId(rates, defaultVatRate, existingId);
  if (!id) {
    return Number(defaultVatRate ?? 0) || 0;
  }
  const row = rates.find((item) => item.id === id);
  return Number(row?.rate ?? 0) || 0;
}
