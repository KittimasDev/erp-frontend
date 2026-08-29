"use client";

import { useEffect, useMemo, useRef } from "react";
import { InputNumber, Select, Tag, Typography } from "antd";

import { useUnitConversionIndex } from "@/hooks/unit-conversions/useUnitConversionIndex";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import {
  fromBaseQty,
  QUANTITY_PRECISION,
  resolveUnitOptions,
  toBaseQty,
  type ConversionIndex,
} from "@/lib/units/conversion";
import { formatQty, formatQtyUnit } from "@/lib/units/format";
import type { Unit } from "@/types/units";

import styles from "./QuantityUnitInput.module.css";

export type QuantityUnitValue = {
  quantity?: number | null;
  unitId?: string;
};

export type QuantityUnitInputProps = {
  /** Form.Item เป็นคนส่งมา */
  value?: QuantityUnitValue;
  onChange?: (value: QuantityUnitValue) => void;
  /** สินค้าของบรรทัดนี้ — ว่าง = ล็อกช่องไว้ก่อน */
  itemId?: string;
  /** หน่วยหลักของสินค้า */
  baseUnitId?: string;
  /** เพดานในหน่วยหลัก — component แปลงกลับเป็นหน่วยที่เลือกให้เอง */
  maxBaseQty?: number | null;
  minQty?: number;
  precision?: number;
  disabled?: boolean;
  allowUnitChange?: boolean;
  showBasePreview?: boolean;
  size?: "small" | "middle" | "large";
  placeholder?: string;
  /**
   * ส่งลงมาจากหน้าที่ render หลายบรรทัด
   * ถ้าไม่ส่ง component จะเรียก hook เอง ซึ่งจะได้ ConversionIndex คนละก้อนต่อ instance
   * ทำให้ graphCache ไม่ถูกแชร์และคำนวณ BFS ซ้ำทุกบรรทัด
   */
  index?: ConversionIndex;
  units?: Unit[];
  id?: string;
  "aria-label"?: string;
};

const EMPTY_UNITS: Unit[] = [];

function unitLabelOf(unit?: Unit): string {
  if (!unit) {
    return "";
  }
  return unit.nameTh || unit.code;
}

export default function QuantityUnitInput({
  value,
  onChange,
  itemId,
  baseUnitId,
  maxBaseQty,
  minQty = 0.001,
  precision = QUANTITY_PRECISION,
  disabled = false,
  allowUnitChange = true,
  showBasePreview = true,
  size = "large",
  placeholder,
  index: indexProp,
  units: unitsProp,
  id,
  "aria-label": ariaLabel,
}: QuantityUnitInputProps) {
  // hook ยิงเสมอแม้ parent จะส่ง props มาแล้ว จึงต้องใช้ params ชุดเดียวกับที่หน้าอื่นใช้
  // ({ isActive: true }) เพื่อให้ TanStack Query dedupe เป็น request เดียว ไม่ใช่ยิงต่อ instance
  const fallbackIndex = useUnitConversionIndex();
  const fallbackUnits = useUnitsQuery({ isActive: true });

  const index = indexProp ?? fallbackIndex.index;
  const units = unitsProp ?? fallbackUnits.data?.data ?? EMPTY_UNITS;

  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  const convertibleUnits = useMemo(
    () => resolveUnitOptions(index, itemId, baseUnitId, units),
    [index, itemId, baseUnitId, units],
  );

  const selectedUnitId = value?.unitId;

  /**
   * หน่วยที่บันทึกไว้ในเอกสารเก่าอาจไม่มีกฎแปลงแล้ว
   * ต้องคงไว้ใน dropdown ไม่งั้น antd จะโชว์ uuid ดิบหรือค่าหายเงียบ
   * (validator เป็นคนกันไม่ให้บันทึกทับ)
   */
  const isOrphanUnit = Boolean(
    selectedUnitId &&
      !convertibleUnits.some((unit) => unit.id === selectedUnitId),
  );

  const options = useMemo(() => {
    const base = convertibleUnits.map((unit) => ({
      value: unit.id,
      title: `${unit.code} ${unit.nameTh}`,
      label: (
        <span className={styles.optionLabel}>
          <span>{unitLabelOf(unit)}</span>
          {unit.id === baseUnitId ? (
            <Tag className={styles.optionTag} color="blue">
              หลัก
            </Tag>
          ) : null}
        </span>
      ),
    }));

    if (!isOrphanUnit || !selectedUnitId) {
      return base;
    }

    const orphan = unitById.get(selectedUnitId);
    return [
      ...base,
      {
        value: selectedUnitId,
        title: orphan ? `${orphan.code} ${orphan.nameTh}` : selectedUnitId,
        label: (
          <span className={styles.optionLabel}>
            <span>{orphan ? unitLabelOf(orphan) : "หน่วยเดิม"}</span>
            <Tag className={styles.optionTag} color="warning">
              ไม่มีกฎแปลง
            </Tag>
          </span>
        ),
      },
    ];
  }, [convertibleUnits, baseUnitId, isOrphanUnit, selectedUnitId, unitById]);

  // onChange ของ Form.Item เป็น closure ใหม่ทุก render — เก็บใน ref ไม่งั้น effect เติมหน่วยยิงรัว
  // sync ใน effect ตัวแรกเพราะ effect ทำงานตามลำดับที่ประกาศ
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // จำว่าเคยเติมหน่วยหลักให้ baseUnitId ตัวไหนไปแล้ว — กันลูปกรณี parent ไม่รับค่าที่ส่งกลับ
  // เก็บใน ref และแตะเฉพาะใน effect เท่านั้น (อ่าน/เขียน ref ตอน render ทำให้ค่าไม่ sync กับการ render)
  const autoFilledForRef = useRef<string | undefined>(undefined);

  // เปลี่ยนสินค้า = ต้องยอมให้เติมหน่วยหลักของสินค้าใหม่อีกครั้ง
  useEffect(() => {
    autoFilledForRef.current = undefined;
  }, [itemId]);

  useEffect(() => {
    if (!baseUnitId || disabled) {
      return;
    }
    const current = value?.unitId;
    const isValid =
      current &&
      (convertibleUnits.some((unit) => unit.id === current) ||
        unitById.has(current));
    if (isValid) {
      return;
    }
    if (autoFilledForRef.current === baseUnitId) {
      return;
    }
    autoFilledForRef.current = baseUnitId;
    onChangeRef.current?.({
      quantity: value?.quantity ?? null,
      unitId: baseUnitId,
    });
  }, [baseUnitId, disabled, convertibleUnits, unitById, value]);

  const baseUnitLabel = unitLabelOf(unitById.get(baseUnitId ?? ""));
  const selectedUnitLabel = unitLabelOf(unitById.get(selectedUnitId ?? ""));

  const lockedByItem = !itemId || !baseUnitId;
  const onlyOneUnit = options.length <= 1;
  const unitSelectDisabled =
    disabled || lockedByItem || !allowUnitChange || onlyOneUnit;

  const baseQty = toBaseQty(index, {
    qty: value?.quantity,
    unitId: selectedUnitId,
    baseUnitId,
    itemId,
  });

  const maxInSelectedUnit =
    maxBaseQty === null || maxBaseQty === undefined
      ? undefined
      : (fromBaseQty(index, {
          baseQty: maxBaseQty,
          unitId: selectedUnitId,
          baseUnitId,
          itemId,
        }) ?? undefined);

  const hint = (() => {
    if (lockedByItem) {
      return null;
    }
    if (value?.quantity !== null && value?.quantity !== undefined) {
      if (baseQty === null) {
        return (
          <Typography.Text className={`${styles.hint} ${styles.hintDanger}`}>
            แปลงหน่วยนี้เป็น{baseUnitLabel ? ` ${baseUnitLabel}` : "หน่วยหลัก"}
            ไม่ได้ — เลือกหน่วยใหม่ก่อนบันทึก
          </Typography.Text>
        );
      }
      if (showBasePreview && selectedUnitId !== baseUnitId) {
        return (
          <Typography.Text className={styles.hint}>
            = {formatQtyUnit(baseQty, baseUnitLabel, precision)}
          </Typography.Text>
        );
      }
    }

    if (maxBaseQty !== null && maxBaseQty !== undefined) {
      const inUnit =
        maxInSelectedUnit === undefined
          ? null
          : formatQtyUnit(maxInSelectedUnit, selectedUnitLabel, precision);
      const inBase = formatQtyUnit(maxBaseQty, baseUnitLabel, precision);
      return (
        <Typography.Text className={styles.hint}>
          สูงสุด {inUnit ?? inBase}
          {inUnit && selectedUnitId !== baseUnitId ? ` (${inBase})` : ""}
        </Typography.Text>
      );
    }

    return null;
  })();

  return (
    <div className={styles.wrapper}>
      <div className={styles.row}>
        <InputNumber
          id={id}
          aria-label={ariaLabel}
          className={styles.quantity}
          size={size}
          min={minQty}
          // แปลงเพดานกลับไม่ได้ = ไม่ตั้ง max แล้วให้ validator ตีตกแทน
          // ตั้ง max=0 จะล็อกผู้ใช้เงียบๆ โดยไม่บอกสาเหตุ
          max={maxInSelectedUnit}
          precision={precision}
          disabled={disabled || lockedByItem}
          placeholder={lockedByItem ? "เลือกสินค้าก่อน" : placeholder}
          style={{ borderStartEndRadius: 0, borderEndEndRadius: 0 }}
          value={value?.quantity ?? undefined}
          onChange={(next) =>
            onChange?.({ quantity: next as number | null, unitId: selectedUnitId })
          }
        />

        <Select
          className={styles.unit}
          size={size}
          showSearch
          optionFilterProp="title"
          disabled={unitSelectDisabled}
          suffixIcon={onlyOneUnit ? null : undefined}
          style={{ marginInlineStart: -1 }}
          value={selectedUnitId}
          options={options}
          onChange={(next: string) =>
            onChange?.({ quantity: value?.quantity ?? null, unitId: next })
          }
        />
      </div>

      {hint}
    </div>
  );
}

export type QtyUnitValidatorArgs = {
  index: ConversionIndex;
  itemId?: string;
  baseUnitId?: string;
  baseUnitLabel?: string;
  maxBaseQty?: number | null;
  minQty?: number;
};

/**
 * validator ของ Form.Item — antd 6 ต้อง throw Error ไม่ใช่ Promise.reject(string)
 * ด่านนี้คือจุดที่กันเอกสารเก่าซึ่งหน่วยไม่มีกฎแปลงไม่ให้ถูกบันทึกทับ
 */
export function makeQtyUnitValidator({
  index,
  itemId,
  baseUnitId,
  baseUnitLabel,
  maxBaseQty,
  minQty = 0.001,
}: QtyUnitValidatorArgs) {
  return async (_rule: unknown, value?: QuantityUnitValue) => {
    if (!value?.unitId) {
      throw new Error("กรุณาเลือกหน่วย");
    }

    const qty = Number(value.quantity);
    if (!(qty > 0)) {
      throw new Error("กรุณากรอกจำนวนที่มากกว่า 0");
    }
    if (qty < minQty) {
      throw new Error(`จำนวนต้องไม่น้อยกว่า ${minQty}`);
    }

    const base = toBaseQty(index, {
      qty,
      unitId: value.unitId,
      baseUnitId,
      itemId,
    });

    if (base === null) {
      throw new Error(
        `หน่วยนี้ยังไม่มีกฎแปลงเป็น${baseUnitLabel ? ` ${baseUnitLabel}` : "หน่วยหลัก"} — เลือกหน่วยใหม่ก่อนบันทึก`,
      );
    }

    if (
      maxBaseQty !== null &&
      maxBaseQty !== undefined &&
      base > maxBaseQty + 1e-9
    ) {
      throw new Error(
        `เกินจำนวนที่เหลือ (สูงสุด ${formatQty(maxBaseQty)}${baseUnitLabel ? ` ${baseUnitLabel}` : ""})`,
      );
    }
  };
}
