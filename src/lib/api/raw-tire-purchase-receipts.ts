import { apiFetch } from "./client";
import type {
  ClassificationContextApiResponse,
  CreateRawTirePurchaseReceiptRequest,
  RawTirePurchaseReceiptApiResponse,
  SaveClassificationRequest,
} from "@/types/raw-tire-classification";
import type {
  CancelReceiptRequest,
  ReceiptDetailApiResponse,
  ReceiptPrintPreviewApiResponse,
} from "@/types/raw-tire-purchase-receipt";
import type {
  PayReceiptRequest,
  PaymentContextApiResponse,
  PaymentPrintPreviewApiResponse,
} from "@/types/raw-tire-payment";
import type {
  RawTirePurchaseReportListApiResponse,
  RawTirePurchaseReportQueryParams,
} from "@/types/raw-tire-purchase-reports";

export function getTicketClassification(token: string, ticketId: string) {
  return apiFetch<ClassificationContextApiResponse>(
    `/api/weighbridge/tickets/${ticketId}/classification`,
    { method: "GET", token },
  );
}

export function createRawTirePurchaseReceipt(
  token: string,
  body: CreateRawTirePurchaseReceiptRequest,
) {
  return apiFetch<RawTirePurchaseReceiptApiResponse>(
    "/api/raw-tire-purchase/receipts",
    { method: "POST", token, body },
  );
}

export function updateRawTirePurchaseClassification(
  token: string,
  receiptId: string,
  body: SaveClassificationRequest,
) {
  return apiFetch<RawTirePurchaseReceiptApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/classification`,
    { method: "PUT", token, body },
  );
}

export function calculateRawTirePurchaseReceipt(
  token: string,
  receiptId: string,
) {
  return apiFetch<RawTirePurchaseReceiptApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/calculate`,
    { method: "POST", token },
  );
}

export function getRawTirePurchaseReceipt(token: string, receiptId: string) {
  return apiFetch<ReceiptDetailApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}`,
    { method: "GET", token },
  );
}

export function confirmRawTirePurchaseReceipt(
  token: string,
  receiptId: string,
) {
  return apiFetch<ReceiptDetailApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/confirm`,
    { method: "POST", token },
  );
}

export function recalculateRawTirePurchaseReceiptTotals(
  token: string,
  receiptId: string,
) {
  return apiFetch<ReceiptDetailApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/recalculate`,
    { method: "POST", token },
  );
}

export function getRawTirePurchaseReceiptPrintPreview(
  token: string,
  receiptId: string,
) {
  return apiFetch<ReceiptPrintPreviewApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/print-preview`,
    { method: "GET", token },
  );
}

/** @deprecated ใช้ confirmRawTirePurchaseReceipt แทน */
export function submitRawTirePurchaseReceipt(
  token: string,
  receiptId: string,
) {
  return apiFetch<RawTirePurchaseReceiptApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/submit-approval`,
    { method: "POST", token },
  );
}

export function cancelRawTirePurchaseReceipt(
  token: string,
  receiptId: string,
  body?: CancelReceiptRequest,
) {
  return apiFetch<ReceiptDetailApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/cancel`,
    { method: "POST", token, body: body ?? {} },
  );
}

export function getRawTirePurchasePayment(token: string, receiptId: string) {
  return apiFetch<PaymentContextApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/payment`,
    { method: "GET", token },
  );
}

export function payRawTirePurchaseReceipt(
  token: string,
  receiptId: string,
  body: PayReceiptRequest,
) {
  return apiFetch<PaymentContextApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/pay`,
    { method: "POST", token, body },
  );
}

export function getRawTirePurchasePaymentPrintPreview(
  token: string,
  receiptId: string,
) {
  return apiFetch<PaymentPrintPreviewApiResponse>(
    `/api/raw-tire-purchase/receipts/${receiptId}/payment-print-preview`,
    { method: "GET", token },
  );
}

function buildReportQuery(params?: RawTirePurchaseReportQueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.sellerId) search.set("sellerId", params.sellerId);
  if (params.tireClassificationId)
    search.set("tireClassificationId", params.tireClassificationId);
  if (params.paymentStatus) search.set("paymentStatus", params.paymentStatus);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getRawTirePurchaseReport(
  token: string,
  params?: RawTirePurchaseReportQueryParams,
) {
  return apiFetch<RawTirePurchaseReportListApiResponse>(
    `/api/raw-tire-purchase/receipts/report${buildReportQuery(params)}`,
    { method: "GET", token },
  );
}

/**
 * ดาวน์โหลด CSV ต้อง fetch ตรง (ไม่ผ่าน apiFetch) เพราะ response ไม่ใช่ JSON
 * และไฟล์ authenticated ดาวน์โหลดผ่านลิงก์ตรงไม่ได้ (แนบ token ใน URL ไม่ได้)
 */
export async function downloadRawTirePurchaseReportCsv(
  token: string,
  params?: RawTirePurchaseReportQueryParams,
) {
  const response = await fetch(
    `/api/raw-tire-purchase/receipts/report/export${buildReportQuery(params)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error("ดาวน์โหลดรายงานไม่สำเร็จ");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "raw-tire-purchase-report.csv";

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
