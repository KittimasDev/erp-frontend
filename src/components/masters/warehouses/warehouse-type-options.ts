export const WAREHOUSE_TYPE_OPTIONS = [
  { value: "RAW_MATERIAL", label: "RAW_MATERIAL — วัตถุดิบ" },
  { value: "FINISHED_GOODS", label: "FINISHED_GOODS — สินค้าสำเร็จรูป" },
  { value: "HOLD", label: "HOLD — รอตรวจ" },
  { value: "REJECT", label: "REJECT — ของเสีย" },
  { value: "OIL_TANK", label: "OIL_TANK — ถังน้ำมัน" },
  { value: "CHEMICAL", label: "CHEMICAL — สารเคมี" },
  { value: "SPARE_PART", label: "SPARE_PART — อะไหล่" },
  { value: "GENERAL", label: "GENERAL — ทั่วไป" },
] as const;
