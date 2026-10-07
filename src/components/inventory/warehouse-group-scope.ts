export type ScopedWarehouseGroup = "RAW_MATERIAL" | "FINISHED_GOODS";

export function readWarehouseGroup(
  searchParams?: { get(name: string): string | null } | null,
): ScopedWarehouseGroup | undefined {
  const value = searchParams?.get("warehouseGroup");
  if (value === "RAW_MATERIAL" || value === "FINISHED_GOODS") {
    return value;
  }
  return undefined;
}

/** เมนูคลังวัตถุดิบ = ทุกสินค้าที่ไม่ใช่สินค้าสำเร็จรูป · เมนู FG = เฉพาะสินค้าสำเร็จรูป */
export function itemInWarehouseGroup(
  item: { isFinishedGood?: boolean | null },
  warehouseGroup?: ScopedWarehouseGroup,
) {
  if (warehouseGroup === "RAW_MATERIAL") return !item.isFinishedGood;
  if (warehouseGroup === "FINISHED_GOODS") return !!item.isFinishedGood;
  return true;
}

export function withWarehouseGroup(path: string, warehouseGroup?: string) {
  if (!warehouseGroup) {
    return path;
  }
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("warehouseGroup", warehouseGroup);
  return `${pathname}?${params.toString()}`;
}
