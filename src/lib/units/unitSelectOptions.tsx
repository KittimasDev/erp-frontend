import type { ReactNode } from "react";
import { Tag } from "antd";

import type { Unit } from "@/types/units";
import { resolveUnitOptions, type ConversionIndex } from "./conversion";

import styles from "./unitSelectOptions.module.css";

export type UnitSelectOption = {
  value: string;
  /** ข้อความล้วนสำหรับ showSearch — Select ต้องตั้ง optionFilterProp="title" */
  title: string;
  label: ReactNode;
};

/** ก้อนข้อมูลร่วมที่หน้าเดียวสร้างครั้งเดียวแล้วส่งต่อทุกบรรทัด */
export type UnitOptionContext = {
  index: ConversionIndex;
  units: Unit[];
  unitById: Map<string, Unit>;
};

/** props ชุดพร้อม spread ใส่ <Select> ของช่องหน่วย */
export type UnitFieldState = {
  options: UnitSelectOption[];
  disabled: boolean;
  placeholder: string;
};

export type BuildUnitSelectOptionsArgs = {
  itemId?: string;
  /** หน่วยหลักของสินค้าตาม master */
  baseUnitId?: string;
  /** หน่วยที่บันทึกอยู่ในเอกสารตอนนี้ — ใช้กันหน่วยเก่าหายจาก dropdown */
  currentUnitId?: string;
  /**
   * โดเมนนี้ backend แปลงหน่วยจริงหรือยัง
   *
   * ต้องตรงกับความสามารถของ backend เสมอ ไม่ใช่ตรงกับกฎแปลงที่ตั้งไว้
   * ปิดอยู่ = เสนอหน่วยหลักตัวเดียว ตรงกับ guard ฝั่ง backend เป๊ะ
   * เปิด = เสนอหน่วยที่เดินกราฟกฎแปลงถึงจริงด้วย
   *
   * ถ้าเปิดทั้งที่ backend ยังไม่แปลง ผู้ใช้จะเลือกหน่วยได้แล้วโดน 400 ตอนกดบันทึก
   */
  allowConvertible?: boolean;
};

function unitLabelOf(unit: Unit): string {
  return unit.nameTh || unit.code;
}

function toOption(unit: Unit, isBase: boolean): UnitSelectOption {
  return {
    value: unit.id,
    title: `${unit.code} ${unit.nameTh}`,
    label: (
      <span className={styles.optionLabel}>
        <span>{unitLabelOf(unit)}</span>
        {isBase ? (
          <Tag className={styles.optionTag} color="blue">
            หลัก
          </Tag>
        ) : null}
      </span>
    ),
  };
}

/**
 * สร้าง props ของ Select หน่วยนับให้บรรทัดหนึ่ง
 *
 * เป็น pure function ไม่ใช่ hook โดยตั้งใจ — ถูกเรียกต่อบรรทัดใน Form.List
 * ถ้าเป็น hook จำนวน hook จะเปลี่ยนตอนเพิ่ม/ลบแถวแล้ว React จะพัง
 */
export function buildUnitSelectOptions(
  ctx: UnitOptionContext,
  {
    itemId,
    baseUnitId,
    currentUnitId,
    allowConvertible = false,
  }: BuildUnitSelectOptionsArgs,
): UnitFieldState {
  if (!itemId || !baseUnitId) {
    return {
      options: [],
      disabled: true,
      placeholder: "เลือกสินค้าก่อน",
    };
  }

  const baseUnit = ctx.unitById.get(baseUnitId);
  const allowedUnits: Unit[] = allowConvertible
    ? resolveUnitOptions(ctx.index, itemId, baseUnitId, ctx.units)
    : baseUnit
      ? [baseUnit]
      : [];

  const options = allowedUnits.map((unit) =>
    toOption(unit, unit.id === baseUnitId),
  );

  // หน่วยที่บันทึกไว้เดิมอาจไม่อยู่ในชุดที่อนุญาต (เอกสารเก่า หรือหน่วยถูกปิดใช้งาน)
  // ต้องคงไว้ใน dropdown ไม่งั้น antd จะโชว์ uuid ดิบหรือค่าหายเงียบ
  if (currentUnitId && !options.some((option) => option.value === currentUnitId)) {
    const orphan = ctx.unitById.get(currentUnitId);
    options.push({
      value: currentUnitId,
      title: orphan ? `${orphan.code} ${orphan.nameTh}` : currentUnitId,
      label: (
        <span className={styles.optionLabel}>
          <span>{orphan ? unitLabelOf(orphan) : "หน่วยเดิม"}</span>
          <Tag className={styles.optionTag} color="warning">
            ไม่ตรงหน่วยหลัก
          </Tag>
        </span>
      ),
    });
  }

  return {
    options,
    disabled: options.length <= 1,
    placeholder: "หน่วย",
  };
}
