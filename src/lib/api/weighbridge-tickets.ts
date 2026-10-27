import { apiFetch } from "./client";
import type {
  CompleteWeighAndReceiptRequest,
  CreateWeighbridgeTicketRequest,
  ManualOverrideTicketRequest,
  SaveClassificationPlanRequest,
  WeighbridgeAnalyticsApiResponse,
  WeighbridgeAnalyticsQuery,
  WeighbridgeDashboardApiResponse,
  WeighbridgeTicketApiResponse,
  WeighbridgeTicketDetailApiResponse,
  WeighTicketRequest,
} from "@/types/weighbridge-tickets";
import type { CreateTicketFromOcrRequest } from "@/types/weighbridge-ocr";

export function getWeighbridgeDashboard(
  token: string,
  params?: { date?: string; from?: string; to?: string; all?: boolean },
) {
  const search = new URLSearchParams();
  if (params?.all) {
    search.set("all", "1");
  } else {
    if (params?.from?.trim()) {
      search.set("from", params.from.trim());
    }
    if (params?.to?.trim()) {
      search.set("to", params.to.trim());
    }
    if (params?.date?.trim() && !params?.from && !params?.to) {
      search.set("date", params.date.trim());
    }
  }
  const query = search.toString();
  return apiFetch<WeighbridgeDashboardApiResponse>(
    `/api/weighbridge/tickets/dashboard${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getWeighbridgeAnalytics(
  token: string,
  params: WeighbridgeAnalyticsQuery = {},
) {
  const search = new URLSearchParams();
  if (params.from?.trim()) {
    search.set("from", params.from.trim());
  }
  if (params.to?.trim()) {
    search.set("to", params.to.trim());
  }
  if (params.date?.trim()) {
    search.set("date", params.date.trim());
  }
  if (params.tireClassificationId?.trim()) {
    search.set("tireClassificationId", params.tireClassificationId.trim());
  }
  const query = search.toString();
  return apiFetch<WeighbridgeAnalyticsApiResponse>(
    `/api/weighbridge/tickets/analytics${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}

export function getWeighbridgeTicket(token: string, id: string) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}`,
    { method: "GET", token },
  );
}

/** backfill รูปจาก payload T2900 แล้วคืนรายการไฟล์แนบกลุ่ม T2900_CAMERA */
export function getWeighbridgeTicketT2900CameraPhotos(
  token: string,
  ticketId: string,
) {
  return apiFetch<{
    statusCode?: number;
    message: string;
    data: Array<{
      id: string;
      originalFileName?: string;
      mimeType?: string;
      description?: string;
      attachmentGroup?: string;
    }>;
  }>(`/api/weighbridge/tickets/${ticketId}/t2900-camera-photos`, {
    method: "GET",
    token,
  });
}

export function createWeighbridgeTicket(
  token: string,
  body: CreateWeighbridgeTicketRequest,
) {
  return apiFetch<WeighbridgeTicketApiResponse>("/api/weighbridge/tickets", {
    method: "POST",
    token,
    body,
  });
}

/** เปิดตั๋วรับซื้อจากรูปใบชั่งที่ผู้ใช้ยืนยันค่าแล้ว */
export function createWeighbridgeTicketFromOcr(
  token: string,
  body: CreateTicketFromOcrRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    "/api/weighbridge/tickets/from-ocr",
    { method: "POST", token, body },
  );
}

export function saveClassificationPlan(
  token: string,
  id: string,
  body: SaveClassificationPlanRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/classification-plan`,
    { method: "PUT", token, body },
  );
}

export function completeWeighAndReceipt(
  token: string,
  id: string,
  body: CompleteWeighAndReceiptRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/complete-weigh-and-receipt`,
    { method: "POST", token, body },
  );
}

export function weighInWeighbridgeTicket(
  token: string,
  id: string,
  body: WeighTicketRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/weigh-in`,
    { method: "POST", token, body },
  );
}

export function weighOutWeighbridgeTicket(
  token: string,
  id: string,
  body: WeighTicketRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/weigh-out`,
    { method: "POST", token, body },
  );
}

export function manualOverrideWeighbridgeTicket(
  token: string,
  id: string,
  body: ManualOverrideTicketRequest,
) {
  return apiFetch<WeighbridgeTicketDetailApiResponse>(
    `/api/weighbridge/tickets/${id}/manual-override`,
    { method: "POST", token, body },
  );
}

export function createPurchaseReceiptFromTicket(
  token: string,
  ticketId: string,
  body?: { tireClassificationId?: string; remark?: string },
) {
  return apiFetch<{
    statusCode?: number;
    message: string;
    data: { id: string; receiptNo: string };
  }>(`/api/weighbridge/tickets/${ticketId}/create-purchase-receipt`, {
    method: "POST",
    token,
    body: body ?? {},
  });
}
