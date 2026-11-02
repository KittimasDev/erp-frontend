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
      if (
        field.infoValueKind === "TEXT" ||
        field.infoValueKind === "QC" ||
        field.infoValueKind === "RPM"
      ) {
        return null;
      }
      return num(v.amount);
    default:
      return null;
  }
}

/** ปริมาณในหน่วย stock (คูณ unitToStockFactor ถ้ามี) */
export function computeRecordingFieldStockQty(
  field: RecordingFieldDef,
  values: RecordingFieldValue | undefined,
): number | null {
  const raw = computeRecordingFieldResult(field, values);
  if (raw === null) return null;
  const factor =
    field.unitToStockFactor != null && field.unitToStockFactor > 0
      ? field.unitToStockFactor
      : 1;
  return round3(raw * factor);
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

/** รวมยอดข้ามแถวที่อาจคนละ field.id — กุญแจ = resultRole + linkedItemId + code */
export function accumulateAcrossShiftConfigs(
  records: Array<{
    config?: ProductionRecordingConfig | null;
    values?: RecordingFieldValues;
  }>,
) {
  type Acc = {
    key: string;
    code: string;
    label: string;
    resultRole: string;
    linkedItemId: string | null;
    unitLabel?: string;
    total: number;
  };
  const map = new Map<string, Acc>();
  for (const rec of records) {
    for (const field of rec.config?.fields ?? []) {
      if (
        field.resultRole !== "INPUT" &&
        field.resultRole !== "OUTPUT" &&
        field.resultRole !== "TRACKING"
      ) {
        continue;
      }
      const part = computeRecordingFieldResult(field, rec.values?.[field.id]);
      if (part === null) continue;
      const factor =
        field.unitToStockFactor != null && field.unitToStockFactor > 0
          ? field.unitToStockFactor
          : 1;
      const key = `${field.resultRole}|${field.linkedItemId ?? ""}|${field.code}`;
      const prev = map.get(key);
      if (prev) {
        prev.total = round3(prev.total + part * factor);
      } else {
        map.set(key, {
          key,
          code: field.code,
          label: field.label,
          resultRole: field.resultRole,
          linkedItemId: field.linkedItemId ?? null,
          unitLabel: field.unitLabel,
          total: round3(part * factor),
        });
      }
    }
  }
  return [...map.values()];
}

/** หาผลของแถวตาม code (แถวละ config อาจคนละ field.id) */
export function resultForCodeOnRecord(
  code: string,
  config: ProductionRecordingConfig | undefined | null,
  values: RecordingFieldValues | undefined,
  computedResults?: Record<string, number | null>,
): number | null {
  const field = (config?.fields ?? []).find((f) => f.code === code);
  if (!field) return null;
  if (computedResults && field.id in computedResults) {
    return computedResults[field.id] ?? null;
  }
  return computeRecordingFieldResult(field, values?.[field.id]);
}
