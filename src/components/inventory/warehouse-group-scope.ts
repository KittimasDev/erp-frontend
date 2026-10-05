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

export function withWarehouseGroup(path: string, warehouseGroup?: string) {
  if (!warehouseGroup) {
    return path;
  }
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("warehouseGroup", warehouseGroup);
  return `${pathname}?${params.toString()}`;
}
