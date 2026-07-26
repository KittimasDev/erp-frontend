export type InventoryPageScope = {
  eyebrow: string;
  title: string;
};

/** Resolve warehouse-scope eyebrow/title from URL itemCategoryCode query. */
export function getInventoryPageScope(
  itemCategoryCode?: string | null,
): InventoryPageScope | null {
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
    return {
      eyebrow: "คลังวัตถุดิบ",
      title: "คลังวัตถุดิบ",
    };
  }

  if (values[0] === "FINISHED_GOODS") {
    return {
      eyebrow: "คลังสินค้าสำเร็จรูป",
      title: "คลังสินค้าสำเร็จรูป",
    };
  }

  return {
    eyebrow: "คลังสินค้า",
    title: "คลังสินค้า",
  };
}
