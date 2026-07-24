export type ProductionOutputPendingTicket = {
  id: string;
  ticketNo: string;
  status: string;
  sellerName?: string;
  truckLicensePlate?: string;
  driverName?: string;
  netWeightKg: string;
  weighOutAt?: string;
  createdAt: string;
  productionOutputStatus: "NONE" | "REJECTED_ONLY";
  priorRequestCount?: number;
};

export type ProductionOutputPendingTicketQueryParams = {
  from?: string;
  to?: string;
  all?: boolean;
  q?: string;
};

export type ProductionOutputPendingTicketListApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOutputPendingTicket[];
};

/** รายการตั๋วที่รวบในคำขอเดียว (ไม่ใช่คิวทีละใบ) */
export const PRODUCTION_OUTPUT_TICKET_BATCH_KEY =
  "production-output-ticket-batch";

export type ProductionOutputTicketBatchItem = {
  id: string;
  ticketNo: string;
};

export function saveProductionOutputTicketBatch(
  items: ProductionOutputTicketBatchItem[],
) {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(
    PRODUCTION_OUTPUT_TICKET_BATCH_KEY,
    JSON.stringify(items),
  );
}

export function peekProductionOutputTicketBatch(): ProductionOutputTicketBatchItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(PRODUCTION_OUTPUT_TICKET_BATCH_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ProductionOutputTicketBatchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearProductionOutputTicketBatch() {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(PRODUCTION_OUTPUT_TICKET_BATCH_KEY);
}
