import dayjs from "dayjs";

/** แสดงวันผลิตเป็นวันเดียวหรือช่วง DD/MM/YYYY – DD/MM/YYYY */
export function formatProductionDateRange(
  productionDate: string,
  productionDateEnd?: string | null,
): string {
  const start = dayjs(productionDate).format("DD/MM/YYYY");
  if (!productionDateEnd) return start;
  const end = dayjs(productionDateEnd).format("DD/MM/YYYY");
  if (end === start) return start;
  return `${start} – ${end}`;
}
