import dayjs from "dayjs";

/** แสดงวันผลิตเป็นวันเดียวหรือช่วง DD/MM/BBBB – DD/MM/BBBB */
export function formatProductionDateRange(
  productionDate: string,
  productionDateEnd?: string | null,
): string {
  const start = dayjs(productionDate).format("DD/MM/BBBB");
  if (!productionDateEnd) return start;
  const end = dayjs(productionDateEnd).format("DD/MM/BBBB");
  if (end === start) return start;
  return `${start} – ${end}`;
}
