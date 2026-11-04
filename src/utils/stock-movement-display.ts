/**
 * ชื่อรายการ / ทิศทาง / เอกสารอ้างอิง ของ Stock Movement สำหรับหน้า /inventory/stock-movements
 *
 * แยกจาก `resolveStockMovementTypeLabel` (types/inventory.ts) โดยตั้งใจ — ฟังก์ชันนั้นรายงานต้นทุนวัตถุดิบใช้อยู่
 * (ไม่แตะ) ส่วนไฟล์นี้ตัดสินจากค่าประเภทจริง (`movementType` + `referenceDocType`) เท่านั้น ไม่เทียบกับข้อความที่แสดง
 * จับคู่ไม่ได้ → ตกไปใช้ชื่อทั่วไปตาม `movementType` · ข้อมูลเก่าที่ไม่มี referenceDocType ก็ได้ชื่อทั่วไปเช่นกัน
 */

export type MovementDirection = "IN" | "OUT" | "NEUTRAL";

type MovementLike = {
  movementType?: string | null;
  referenceDocType?: string | null;
  quantityIn?: string | number | null;
  quantityOut?: string | number | null;
};

const upper = (v?: string | null) => (v ?? "").trim().toUpperCase();

/** ชื่อทั่วไปตาม movementType — ใช้เมื่อจับคู่ชื่อรายการเฉพาะไม่ได้ */
export const GENERIC_MOVEMENT_NAME: Record<string, string> = {
  RECEIVE: "รับเข้า",
  ISSUE: "เบิกออก",
  SALES_OUT: "ขายออก",
  SALES_RETURN_IN: "รับคืนจากลูกค้า",
  ADJUST_IN: "ปรับเพิ่ม",
  ADJUST_OUT: "ปรับลด",
  TRANSFER_IN: "โอนเข้า",
  TRANSFER_OUT: "โอนออก",
};

const IN_TYPES = new Set(["RECEIVE", "SALES_RETURN_IN", "ADJUST_IN", "TRANSFER_IN"]);
const OUT_TYPES = new Set(["ISSUE", "SALES_OUT", "ADJUST_OUT", "TRANSFER_OUT"]);

/** ประเภทเอกสารอ้างอิง (ค่าจริงใน referenceDocType) → ชื่อภาษาไทย */
export const REFERENCE_DOC_TYPE_LABEL: Record<string, string> = {
  GOODS_RECEIPT: "ใบรับสินค้า",
  WEIGHBRIDGE_TICKET: "ตั๋วชั่งน้ำหนัก",
  T2900: "ตั๋วชั่งรับซื้อ (T2900)",
  OCR: "ตั๋วชั่ง (จากรูปใบชั่ง)",
  RAW_TIRE_STOCK_POSTING_REQUEST: "คำขอรับยางเข้าคลัง",
  PRODUCTION_ORDER: "ใบสั่งผลิต",
  PRODUCTION_OUTPUT_STOCK_REQUEST: "คำขอรับผลผลิตเข้าคลัง",
  PRODUCTION_SHIFT_RECORD: "บันทึกการผลิตรายกะ",
  MATERIAL_CONVERSION_RUN: "รอบแปรสภาพวัตถุดิบ",
  TIRE_PREP_ISSUE: "ใบเบิกยางเตรียมวัตถุดิบ",
  TIRE_PREP_STAGE_RUN: "รอบงานเตรียมยาง",
  RCB_PROCESSING_RUN: "รอบงานแปรรูป RCB",
  STOCK_ISSUE: "ใบเบิกสินค้า",
  STOCK_TRANSFER: "ใบโอนสินค้า",
  STOCK_ADJUSTMENT: "ใบปรับปรุงสต๊อก",
  PHYSICAL_INVENTORY_COUNT: "ใบตรวจนับสต๊อก",
  PICKING: "ใบจัดสินค้า",
  DISPATCH_ORDER: "ใบจ่ายสินค้า",
  RETURN_NOTE: "ใบรับคืนสินค้า",
  WORK_ORDER: "ใบสั่งซ่อม",
  WORK_ORDER_RETURN: "ใบสั่งซ่อม (คืนอะไหล่)",
  OIL_RECEIVING: "ใบรับน้ำมันเข้าถัง",
  OIL_DISPATCH: "ใบจ่ายน้ำมัน",
  OIL_TRANSFER: "ใบโอนน้ำมันระหว่างถัง",
  OIL_TANK_READING: "การวัดระดับถัง",
};

/** ชื่อไทยของประเภทเอกสาร — ไม่รู้จักคืนค่าเดิม (ข้อมูลเก่า/ประเภทใหม่ยังเห็นรหัสจริง) */
export function referenceDocTypeLabel(type?: string | null): string | undefined {
  const key = upper(type);
  if (!key) return undefined;
  return REFERENCE_DOC_TYPE_LABEL[key] ?? (type as string);
}

/** "ชื่อประเภทเอกสาร" + "เลขเอกสาร" — ไม่มีทั้งคู่คืน undefined */
export function describeReferenceDoc(row: MovementLike & {
  referenceDocNo?: string | null;
}): { typeLabel?: string; docNo?: string } | undefined {
  const typeLabel = referenceDocTypeLabel(row.referenceDocType);
  const docNo = row.referenceDocNo?.trim() || undefined;
  if (!typeLabel && !docNo) return undefined;
  return { typeLabel, docNo };
}

/** ใช้กลุ่มเอกสารผลิต: ISSUE = เบิกไปผลิต · RECEIVE = รับกลับ/รับผลผลิต */
const PRODUCTION_DOCS = new Set([
  "PRODUCTION_ORDER",
  "PRODUCTION_SHIFT_RECORD",
  "TIRE_PREP_ISSUE",
  "TIRE_PREP_STAGE_RUN",
  "RCB_PROCESSING_RUN",
  "MATERIAL_CONVERSION_RUN",
]);

/** ตารางชื่อรายการเฉพาะ — key = `${movementType}|${referenceDocType}` */
const SPECIFIC_NAME: Record<string, string> = {
  "RECEIVE|GOODS_RECEIPT": "รับเข้าจากใบรับสินค้า (ซื้อ)",
  "RECEIVE|WEIGHBRIDGE_TICKET": "รับซื้อเข้าคลัง (ตั๋วชั่ง)",
  "RECEIVE|T2900": "รับซื้อเข้าคลัง (ตั๋วชั่ง)",
  "RECEIVE|OCR": "รับซื้อเข้าคลัง (ตั๋วชั่ง)",
  "RECEIVE|RAW_TIRE_STOCK_POSTING_REQUEST": "รับยางเข้าคลัง",
  "RECEIVE|PRODUCTION_OUTPUT_STOCK_REQUEST": "รับผลผลิตเข้าคลัง",
  "RECEIVE|PRODUCTION_ORDER": "รับผลผลิตเข้าคลัง",
  "RECEIVE|PRODUCTION_SHIFT_RECORD": "คืนวัตถุดิบ (ยกเลิกยืนยันกะ)",
  "RECEIVE|MATERIAL_CONVERSION_RUN": "รับผลผลิตจากการแปรสภาพ",
  "RECEIVE|TIRE_PREP_STAGE_RUN": "รับผลผลิตจากเตรียมยาง",
  "RECEIVE|RCB_PROCESSING_RUN": "รับผลผลิตจากแปรรูป RCB",
  "RECEIVE|WORK_ORDER_RETURN": "คืนอะไหล่เข้าคลัง (งานซ่อม)",
  "RECEIVE|OIL_RECEIVING": "รับน้ำมันเข้าถัง",
  "ISSUE|STOCK_ISSUE": "เบิกสินค้า",
  "ISSUE|WORK_ORDER": "เบิกอะไหล่ซ่อมบำรุง",
  "ISSUE|OIL_DISPATCH": "จ่ายน้ำมัน",
  "ISSUE|PICKING": "ขายออก (ตามใบจัดสินค้า)",
  "ISSUE|DISPATCH_ORDER": "ขายออก (ตามใบจ่ายสินค้า)",
  "SALES_OUT|PICKING": "ขายออก (ตามใบจัดสินค้า)",
  "SALES_OUT|DISPATCH_ORDER": "ขายออก (ตามใบจ่ายสินค้า)",
  "ADJUST_IN|PICKING": "คืนสต๊อก (ยกเลิกการจัดสินค้า)",
  "ADJUST_IN|STOCK_ADJUSTMENT": "ปรับเพิ่มยอด",
  "ADJUST_OUT|STOCK_ADJUSTMENT": "ปรับลดยอด",
  "ADJUST_IN|PHYSICAL_INVENTORY_COUNT": "ปรับเพิ่มจากการตรวจนับ",
  "ADJUST_OUT|PHYSICAL_INVENTORY_COUNT": "ปรับลดจากการตรวจนับ",
  "ADJUST_IN|OIL_TANK_READING": "ปรับระดับถังเพิ่ม (ตามการวัด)",
  "ADJUST_OUT|OIL_TANK_READING": "ปรับระดับถังลด (ตามการวัด)",
  "SALES_RETURN_IN|RETURN_NOTE": "รับคืนจากลูกค้า (เข้าคลังตรวจสอบ)",
  "TRANSFER_OUT|STOCK_TRANSFER": "โอนออกไปคลังอื่น",
  "TRANSFER_IN|STOCK_TRANSFER": "โอนเข้าจากคลังอื่น",
  "TRANSFER_OUT|RETURN_NOTE": "โอนสินค้าคืนออก (ตรวจสอบสินค้าคืน)",
  "TRANSFER_IN|RETURN_NOTE": "โอนสินค้าคืนเข้า (ตรวจสอบสินค้าคืน)",
  "TRANSFER_OUT|OIL_TRANSFER": "โอนน้ำมันออกจากถัง",
  "TRANSFER_IN|OIL_TRANSFER": "โอนน้ำมันเข้าถัง",
};

export type StockMovementDescription = {
  /** ชื่อรายการภาษาไทย */
  name: string;
  /** true = จับคู่ชื่อเฉพาะได้ · false = ใช้ชื่อทั่วไปตาม movementType */
  matched: boolean;
  direction: MovementDirection;
  directionLabel: string;
  /** สี Tag ของ antd ตามค่าประเภทจริง */
  tagColor: "success" | "error" | "blue" | "default";
};

/** ขายออก = SALES_OUT หรือ ISSUE จากใบจัด/ใบจ่ายสินค้า (ตรวจจากค่าจริง) */
export function isSalesOutMovement(row: MovementLike): boolean {
  const type = upper(row.movementType);
  const ref = upper(row.referenceDocType);
  return (
    type === "SALES_OUT" ||
    (type === "ISSUE" && (ref === "PICKING" || ref === "DISPATCH_ORDER"))
  );
}

/** ทิศทางจาก movementType ก่อน · ไม่รู้จักประเภท → ดูจำนวนเข้า/ออก · ไม่มีเลย = NEUTRAL */
export function resolveMovementDirection(row: MovementLike): MovementDirection {
  const type = upper(row.movementType);
  if (IN_TYPES.has(type)) return "IN";
  if (OUT_TYPES.has(type)) return "OUT";
  const qIn = Number(row.quantityIn) || 0;
  const qOut = Number(row.quantityOut) || 0;
  if (qIn > 0 && qOut <= 0) return "IN";
  if (qOut > 0 && qIn <= 0) return "OUT";
  return "NEUTRAL";
}

const DIRECTION_LABEL: Record<MovementDirection, string> = {
  IN: "เข้า",
  OUT: "ออก",
  NEUTRAL: "ไม่เปลี่ยนยอด",
};

export function describeStockMovement(row: MovementLike): StockMovementDescription {
  const type = upper(row.movementType);
  const ref = upper(row.referenceDocType);
  const direction = resolveMovementDirection(row);

  let name = SPECIFIC_NAME[`${type}|${ref}`];
  // ISSUE ที่มาจากเอกสารกลุ่มผลิตทุกตัว (รวมที่ยังไม่มีในตาราง) = เบิกไปผลิต
  if (!name && type === "ISSUE" && PRODUCTION_DOCS.has(ref)) {
    name = "เบิกไปผลิต";
  }
  const matched = Boolean(name);
  if (!name) {
    name = GENERIC_MOVEMENT_NAME[type] ?? (row.movementType?.trim() || "ไม่ระบุประเภท");
  }

  const tagColor: StockMovementDescription["tagColor"] = isSalesOutMovement(row)
    ? "blue"
    : direction === "IN"
      ? "success"
      : direction === "OUT"
        ? "error"
        : "default";

  return {
    name,
    matched,
    direction,
    directionLabel: DIRECTION_LABEL[direction],
    tagColor,
  };
}
