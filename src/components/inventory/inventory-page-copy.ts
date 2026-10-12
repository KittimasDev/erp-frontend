export type InventoryPageScope = {
  eyebrow: string;
  title: string;
};

const FG_SCOPE: InventoryPageScope = {
  eyebrow: "คลังสินค้าสำเร็จรูป",
  title: "คลังสินค้าสำเร็จรูป",
};

const RM_SCOPE: InventoryPageScope = {
  eyebrow: "คลังวัตถุดิบ",
  title: "คลังวัตถุดิบ",
};

/**
 * หน้าคลัง FG ใช้ `isFinishedGood=true`
 * ยังอ่าน URL เก่า `itemCategoryCode=FINISHED_GOODS` เพื่อบุ๊กมาร์กไม่หลุด
 */
export function isFgInventoryScope(
  searchParams?: { get(name: string): string | null } | null,
): boolean {
  if (!searchParams) {
    return false;
  }
  if (searchParams.get("isFinishedGood") === "true") {
    return true;
  }
  return searchParams.get("itemCategoryCode")?.trim() === "FINISHED_GOODS";
}

/**
 * หน้าคลังวัตถุดิบใช้ `isFinishedGood=false` — ทุกสินค้าที่ไม่ใช่สินค้าสำเร็จรูป
 * ยังอ่าน URL เก่า `itemCategoryCode=RAW_MATERIAL` เพื่อบุ๊กมาร์กไม่หลุด
 */
export function isRmInventoryScope(
  searchParams?: { get(name: string): string | null } | null,
): boolean {
  if (!searchParams || isFgInventoryScope(searchParams)) {
    return false;
  }
  if (searchParams.get("isFinishedGood") === "false") {
    return true;
  }
  return searchParams.get("itemCategoryCode")?.trim() === "RAW_MATERIAL";
}

/** Resolve warehouse-scope eyebrow/title from URL. */
export function getInventoryPageScope(
  searchParams?: { get(name: string): string | null } | null,
  itemCategoryCode?: string | null,
): InventoryPageScope | null {
  if (isFgInventoryScope(searchParams)) {
    return FG_SCOPE;
  }
  if (isRmInventoryScope(searchParams)) {
    return RM_SCOPE;
  }

  const value = itemCategoryCode?.trim();
  if (!value) {
    return null;
  }

  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (values.length !== 1) {
    return {
      eyebrow: "คลังสินค้า",
      title: "คลังสินค้า",
    };
  }

  if (values[0] === "RAW_MATERIAL") {
    return RM_SCOPE;
  }

  return {
    eyebrow: "คลังสินค้า",
    title: "คลังสินค้า",
  };
}

export function inventoryScopeApiFilter(
  searchParams?: { get(name: string): string | null } | null,
): { isFinishedGood?: boolean; itemCategoryCode?: string } {
  if (isFgInventoryScope(searchParams)) {
    return { isFinishedGood: true };
  }
  if (isRmInventoryScope(searchParams)) {
    return { isFinishedGood: false };
  }
  const itemCategoryCode = searchParams?.get("itemCategoryCode")?.trim();
  return itemCategoryCode ? { itemCategoryCode } : {};
}
