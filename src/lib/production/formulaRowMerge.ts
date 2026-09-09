import type { ProductionFormulaScaleLine } from "@/types/production-formula";

/**
 * รวมค่าที่คิดจากสูตรเข้ากับแถวที่มีอยู่ในหน้าสร้างใบสั่งผลิต
 *
 * ## กฎสำคัญ: จับคู่ด้วยสินค้า แล้ว **เก็บ Lot ที่ผู้ใช้เลือกไว้**
 *
 * เจ้าของระบบตกลงว่า Lot ยังเลือกเอง (สูตรไม่รู้ว่าของอยู่ Lot ไหน) · ถ้าเติมสูตร
 * แล้วล้างแถวทิ้งทั้งชุด ผู้ใช้ที่เลือก Lot ไว้ 4 แถวแล้วเปลี่ยนใจปรับจำนวนเป้าหมาย
 * จะต้องไปเลือก Lot ใหม่ทั้งหมด · จับคู่ด้วย `itemId` แล้วทับแค่จำนวนกับหน่วย
 * ทำให้ปรับเป้าหมายกี่รอบก็ไม่เสียงานที่ทำไว้
 *
 * ## เก็บ `key` เดิมของแถวที่จับคู่ได้
 *
 * `MaterialRow` แต่ละตัวถือ query ของ Lot อยู่ · เปลี่ยน key = React remount =
 * ตัวเลือก Lot ว่างไปหนึ่งจังหวะและต้องโหลดใหม่
 *
 * ## แถวที่สินค้าไม่อยู่ในสูตร — เก็บไว้
 *
 * ผู้ใช้อาจใส่มาเอง (สารเคมีเสริม, วัสดุที่สูตรไม่ครอบ) · ลบเฉพาะแถวว่างล้วน
 * เพราะหน้าจอ seed มาด้วยแถวเปล่าหนึ่งแถวเสมอ
 */

export type MergeableRow = {
  key: number;
  itemId?: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  unitId?: string;
  plannedQty?: number | null;
  [extra: string]: unknown;
};

export type MergeablePlanRow = {
  key: number;
  itemId?: string;
  unitId?: string;
  plannedQty?: number | null;
  [extra: string]: unknown;
};

export type MergeSummary = {
  /** จำนวนแถวที่ถูกทับจำนวนใหม่ (ยังเก็บ Lot เดิมไว้) */
  updated: number;
  /** จำนวนแถวที่เพิ่มเข้ามาใหม่ — ยังต้องเลือก Lot เอง */
  added: number;
  /** จำนวนแถวที่สินค้าไม่อยู่ในสูตรแต่เก็บไว้ */
  kept: number;
};

function isBlankRow(row: { itemId?: string }): boolean {
  return !row.itemId;
}

/**
 * รวมบรรทัดวัตถุดิบ — คืนแถวใหม่พร้อมสรุปว่าเกิดอะไรขึ้น
 *
 * `nextKey` ต้องเป็นตัวออกเลขเดียวกับที่หน้าจอใช้ (`nextRowKey`) ห้ามออกเองในนี้
 */
export function mergeFormulaInputRows(
  current: MergeableRow[],
  formulaLines: ProductionFormulaScaleLine[],
  nextKey: () => number,
): { rows: MergeableRow[]; summary: MergeSummary } {
  const summary: MergeSummary = { updated: 0, added: 0, kept: 0 };

  const remaining = current.filter((row) => !isBlankRow(row));
  const used = new Set<number>();
  const merged: MergeableRow[] = [];

  for (const line of formulaLines) {
    const match = remaining.find(
      (row) => row.itemId === line.itemId && !used.has(row.key),
    );
    if (match) {
      used.add(match.key);
      summary.updated += 1;
      merged.push({
        ...match,
        // เก็บ key / คลัง / ตำแหน่ง / Lot ของเดิมไว้ทั้งหมด
        unitId: line.unitId,
        plannedQty: line.plannedQty,
      });
      continue;
    }
    summary.added += 1;
    merged.push({
      key: nextKey(),
      itemId: line.itemId,
      unitId: line.unitId,
      plannedQty: line.plannedQty,
      // คลัง / ตำแหน่ง / Lot ปล่อยว่างให้ผู้ใช้เลือกเอง
    });
  }

  const untouched = remaining.filter((row) => !used.has(row.key));
  summary.kept = untouched.length;

  return { rows: [...merged, ...untouched], summary };
}

/** รวมบรรทัดแผน (ผลผลิต / ของเสีย) — กฎเดียวกันแต่ไม่มี Lot ให้รักษา */
export function mergeFormulaPlanRows(
  current: MergeablePlanRow[],
  formulaLines: ProductionFormulaScaleLine[],
  nextKey: () => number,
): { rows: MergeablePlanRow[]; summary: MergeSummary } {
  const summary: MergeSummary = { updated: 0, added: 0, kept: 0 };

  const remaining = current.filter((row) => !isBlankRow(row));
  const used = new Set<number>();
  const merged: MergeablePlanRow[] = [];

  for (const line of formulaLines) {
    const match = remaining.find(
      (row) => row.itemId === line.itemId && !used.has(row.key),
    );
    if (match) {
      used.add(match.key);
      summary.updated += 1;
      merged.push({
        ...match,
        unitId: line.unitId,
        plannedQty: line.plannedQty,
      });
      continue;
    }
    summary.added += 1;
    merged.push({
      key: nextKey(),
      itemId: line.itemId,
      unitId: line.unitId,
      plannedQty: line.plannedQty,
    });
  }

  const untouched = remaining.filter((row) => !used.has(row.key));
  summary.kept = untouched.length;

  return { rows: [...merged, ...untouched], summary };
}

/** ข้อความสรุปให้ผู้ใช้อ่านก่อนยืนยันทับค่า */
export function describeMerge(summaries: MergeSummary[]): string {
  const total = summaries.reduce(
    (acc, item) => ({
      updated: acc.updated + item.updated,
      added: acc.added + item.added,
      kept: acc.kept + item.kept,
    }),
    { updated: 0, added: 0, kept: 0 },
  );

  const parts: string[] = [];
  if (total.updated > 0) {
    parts.push(`ทับจำนวน ${total.updated} รายการ (Lot ที่เลือกไว้ยังอยู่)`);
  }
  if (total.added > 0) {
    parts.push(`เพิ่มใหม่ ${total.added} รายการ (ต้องเลือก Lot เอง)`);
  }
  if (total.kept > 0) {
    parts.push(`เก็บรายการที่ไม่อยู่ในสูตรไว้ ${total.kept} รายการ`);
  }
  return parts.join(" · ") || "ไม่มีอะไรเปลี่ยน";
}
