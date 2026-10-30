import type {
  ProductionRecordingConfig,
  RecordingFieldDef,
} from "@/types/production-formula";

export type RecordingFieldValue = {
  amount?: number | null;
  text?: string | null;
  meterStart?: number | null;
  meterEnd?: number | null;
  hoursStart?: number | null;
  hoursEnd?: number | null;
  hours?: number | null;
  rate?: number | null;
  qty?: number | null;
  unitWeight?: number | null;
};

export type RecordingFieldValues = Record<string, RecordingFieldValue>;

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

export function computeRecordingFieldResult(
  field: RecordingFieldDef,
  values: RecordingFieldValue | undefined,
): number | null {
  const v = values ?? {};
  switch (field.calcType) {
    case "DIRECT":
      return num(v.amount);
    case "METER_DELTA": {
      const start = num(v.meterStart);
      const end = num(v.meterEnd);
      if (start === null || end === null) return null;
      return round3(end - start);
    }
    case "HOURS_TIMES_RATE": {
      const rate = num(v.rate);
      if (rate === null) return null;
      const hoursDirect = num(v.hours);
      if (hoursDirect !== null) return round3(hoursDirect * rate);
      const hs = num(v.hoursStart);
      const he = num(v.hoursEnd);
      if (hs === null || he === null) return null;
      return round3((he - hs) * rate);
    }
    case "QTY_TIMES_UNIT_WEIGHT": {
      const qty = num(v.qty);
      const unitWeight = num(v.unitWeight);
      if (qty === null || unitWeight === null) return null;
      return round3(qty * unitWeight);
    }
    case "INFORMATION":
      if (field.infoValueKind === "TEXT" || field.infoValueKind === "QC") {
        return null;
      }
      return num(v.amount);
    default:
      return null;
  }
}

export function accumulateRecordingResults(
  config: ProductionRecordingConfig | undefined,
  recordsValues: RecordingFieldValues[],
) {
  const fields = config?.fields ?? [];
  return fields
    .filter(
      (f) =>
        f.resultRole === "INPUT" ||
        f.resultRole === "OUTPUT" ||
        f.resultRole === "TRACKING",
    )
    .map((field) => {
      let total = 0;
      let any = false;
      for (const values of recordsValues) {
        const part = computeRecordingFieldResult(field, values[field.id]);
        const factor =
          field.unitToStockFactor != null && field.unitToStockFactor > 0
            ? field.unitToStockFactor
            : 1;
        if (part !== null) {
          total = round3(total + part * factor);
          any = true;
        }
      }
      return {
        fieldId: field.id,
        code: field.code,
        label: field.label,
        resultRole: field.resultRole,
        linkedItemId: field.linkedItemId ?? null,
        unitLabel: field.unitLabel,
        total: any ? total : 0,
      };
    });
}
