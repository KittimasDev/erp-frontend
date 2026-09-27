/**
 * บรรทัดใบขอซื้อที่ติ๊กไว้ในหน้ารายการใบสั่งซื้อ ส่งต่อไปยังหน้าสร้างใบสั่งซื้อ
 *
 * ฝากไว้ใน sessionStorage แทนการใส่ใน URL เพราะ id เป็น uuid 36 ตัว เลือก 40-50
 * บรรทัดแล้ว query string บวมจนชนเพดาน request line ตอนกด refresh
 * (ทรงเดียวกับ `production-output-pending-tickets.ts`)
 */
export const PO_PR_LINE_SELECTION_KEY = "po-create-pr-line-selection";

/** เผื่อผู้ใช้เปิดหน้าค้างไว้แล้วกลับมากดทีหลัง — เกินนี้ถือว่าไม่ใช่ของรอบนี้ */
const SELECTION_TTL_MS = 30 * 60 * 1000;

type StoredSelection = {
  purchaseRequestIds: string[];
  purchaseRequestItemIds: string[];
  savedAt: number;
};

export function savePurchaseOrderPrLineSelection(value: {
  purchaseRequestIds: string[];
  purchaseRequestItemIds: string[];
}): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const payload: StoredSelection = { ...value, savedAt: Date.now() };
    sessionStorage.setItem(PO_PR_LINE_SELECTION_KEY, JSON.stringify(payload));
    return true;
  } catch {
    /* โหมดส่วนตัว/quota เต็ม — ปล่อยให้หน้าสร้างติ๊กทุกบรรทัดตามพฤติกรรมเดิม */
    return false;
  }
}

/**
 * คืน `null` เมื่อไม่มีค่า / หมดอายุ / เป็นของใบขอซื้อคนละชุด
 * (เช่น มีคนแปะลิงก์ `?ids=` ให้ต่อ) — ผู้เรียกให้ถือว่าติ๊กทุกบรรทัด
 */
export function peekPurchaseOrderPrLineSelection(
  expectedPurchaseRequestIds: string[],
): string[] | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(PO_PR_LINE_SELECTION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredSelection;
    if (
      !Array.isArray(parsed?.purchaseRequestIds) ||
      !Array.isArray(parsed?.purchaseRequestItemIds) ||
      !parsed.purchaseRequestItemIds.length
    ) {
      return null;
    }

    if (Date.now() - (parsed.savedAt ?? 0) > SELECTION_TTL_MS) {
      return null;
    }

    /* ต้องเป็นใบขอซื้อชุดเดียวกับที่กดมา ไม่สนลำดับ */
    const stored = new Set(parsed.purchaseRequestIds);
    if (
      stored.size !== expectedPurchaseRequestIds.length ||
      expectedPurchaseRequestIds.some((id) => !stored.has(id))
    ) {
      return null;
    }

    return parsed.purchaseRequestItemIds;
  } catch {
    return null;
  }
}

export function clearPurchaseOrderPrLineSelection() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(PO_PR_LINE_SELECTION_KEY);
  } catch {
    /* ลบไม่ได้ก็ไม่เป็นไร ค่าจะหมดอายุเองตาม TTL */
  }
}
