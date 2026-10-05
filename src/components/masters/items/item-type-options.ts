export const ITEM_TYPE_OPTIONS = [
  { value: "RAW_MATERIAL", label: "RAW_MATERIAL — วัตถุดิบ" },
  { value: "FINISHED_GOODS", label: "FINISHED_GOODS — สินค้าสำเร็จรูป" },
  { value: "CHEMICAL", label: "CHEMICAL — สารเคมี" },
  { value: "CONSUMABLE", label: "CONSUMABLE — วัสดุสิ้นเปลือง" },
  { value: "SPARE_PART", label: "SPARE_PART — อะไหล่" },
] as const;

export function initialItemType(item: {
  itemType?: string;
  isFinishedGood?: boolean;
}) {
  if (ITEM_TYPE_OPTIONS.some((option) => option.value === item.itemType)) {
    return item.itemType;
  }
  if (item.isFinishedGood) {
    return "FINISHED_GOODS";
  }
  return undefined;
}
