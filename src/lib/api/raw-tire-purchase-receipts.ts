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
