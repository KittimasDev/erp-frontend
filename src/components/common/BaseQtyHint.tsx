"use client";

import { Typography } from "antd";

import { useUnitOptionContext } from "@/hooks/unit-conversions/useUnitOptionContext";
import { toBaseQty } from "@/lib/units/conversion";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { formatNumber } from "@/lib/i18n/format";

/**
 * บรรทัดเล็ก ๆ ใต้ช่องจำนวน บอกว่าที่กรอกไปเท่ากับกี่หน่วยหลัก — "= 250 กก."
 *
 * ทำไมไม่ใช้ QuantityUnitInput: ตัวนั้นยุบช่องจำนวนกับช่องหน่วยเป็น Form.Item เดียว
 * ซึ่งต้องรื้อ prefill/submit ของทุกฟอร์ม · ตัวนี้เป็นแค่ข้อความ วางเพิ่มได้โดย
 * ไม่แตะโครงฟอร์มเดิมเลย
 *
 * เงียบสนิทเมื่อ: ยังไม่เลือกสินค้า/หน่วย · กรอกด้วยหน่วยหลักอยู่แล้ว · ยังไม่กรอกจำนวน
 * — จะได้ไม่มีข้อความรกขึ้นมาในฟอร์มที่ไม่เคยใช้การแปลงหน่วย
 *
 * ถ้าแปลงไม่ได้ (ไม่มีกฎ) จะขึ้นเตือนสีส้ม เพราะกดบันทึกไปก็โดน backend ปฏิเสธ
 * — บอกตรงนี้ก่อนดีกว่าให้ไปเจอตอน submit
 */
export function BaseQtyHint({
  itemId,
  unitId,
  quantity,
  baseUnitId,
}: {
  itemId?: string;
  unitId?: string;
  quantity?: number | string | null;
  baseUnitId?: string;
}) {
  const ctx = useUnitOptionContext();
  const t = useT();
  const lang = useLanguage();

  if (!itemId || !unitId || !baseUnitId || unitId === baseUnitId) {
    return null;
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty === 0) {
    return null;
  }

  const base = toBaseQty(ctx.index, { qty, unitId, baseUnitId, itemId });
  const baseUnit = ctx.unitById.get(baseUnitId);
  const baseLabel = baseUnit?.nameTh ?? baseUnit?.code ?? "";

  if (base === null) {
    const entered = ctx.unitById.get(unitId);
    return (
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        {t("แปลง {from} เป็น {to} ไม่ได้ — ยังไม่มีกฎแปลงหน่วยคู่นี้", {
          from: entered?.nameTh ?? entered?.code ?? t("หน่วยนี้"),
          to: baseLabel,
        })}
      </Typography.Text>
    );
  }

  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      = {formatNumber(base, lang, 3)} {baseLabel}
    </Typography.Text>
  );
}
