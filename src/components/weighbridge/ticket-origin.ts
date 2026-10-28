import type { WeighbridgeTicketOrigin } from "@/types/weighbridge-tickets";

export const TICKET_ORIGIN_LABEL: Record<WeighbridgeTicketOrigin, string> = {
  MANUAL: "เปิดเอง",
  T2900: "จากเครื่องชั่ง",
  OCR: "จากรูปใบชั่ง",
};

export const TICKET_ORIGIN_COLOR: Record<WeighbridgeTicketOrigin, string> = {
  MANUAL: "default",
  T2900: "geekblue",
  OCR: "purple",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** id ใน /receiving/[id]: UUID = ตั๋วใน ERP · อย่างอื่น = เลขบัตรจากเครื่องชั่ง (ยังไม่เปิดตั๋ว) */
export function isErpTicketId(value: string): boolean {
  return UUID_RE.test(value);
}
