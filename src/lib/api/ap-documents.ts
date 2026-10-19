import { apiFetch } from "./client";
import type {
  ApDocumentKind,
  CreatedAp,
  CreatedApList,
  ApAdjustmentCandidate,
  ApInvoiceDetail,
  CreatedApQuery,
  DepositInfo,
  GrnCreateInfo,
  PendingGrnList,
  PendingGrnQuery,
  ApDocumentListResponse,
  ApDocumentQueryParams,
  ApDocumentResponse,
  ApInvoiceOptionsResponse,
  ApPurchaseOrderOptionsResponse,
  ApSupplierCreditCandidate,
  RefundApCreditNoteBody,
  SaveApCreditNoteBody,
  SaveApDebitNoteBody,
  SaveApInvoiceBody,
} from "@/types/ap-documents";

/** ใบตั้งหนี้ ใบเพิ่มหนี้ ใบลดหนี้ใช้ endpoint แยก (สิทธิ์คนละหน้าจอ) แต่หน้าตาข้อมูลเหมือนกัน */
const BASE: Record<ApDocumentKind, string> = {
  invoice: "/api/ap-invoices",
  debitNote: "/api/ap-debit-notes",
  creditNote: "/api/ap-credit-notes",
};

type SaveBody = SaveApInvoiceBody | SaveApDebitNoteBody | SaveApCreditNoteBody;

function buildQuery(params?: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      search.set(key, String(value).trim());
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getApDocuments(
  token: string,
  kind: ApDocumentKind,
  params?: ApDocumentQueryParams,
) {
  return apiFetch<ApDocumentListResponse>(`${BASE[kind]}${buildQuery(params)}`, { token });
}

export function getApDocument(token: string, kind: ApDocumentKind, id: string) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}`, { token });
}

export function createApDocument(token: string, kind: ApDocumentKind, body: SaveBody) {
  return apiFetch<ApDocumentResponse>(BASE[kind], {
    method: "POST",
    token,
    body,
  });
}

export function updateApDocument(
  token: string,
  kind: ApDocumentKind,
  id: string,
  body: SaveBody,
) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function submitApDocument(token: string, kind: ApDocumentKind, id: string) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}/submit`, { method: "POST", token });
}

export function approveApDocument(token: string, kind: ApDocumentKind, id: string) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}/approve`, {
    method: "POST",
    token,
  });
}

export function rejectApDocument(token: string, kind: ApDocumentKind, id: string, reason: string) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}/reject`, {
    method: "POST",
    token,
    body: { reason },
  });
}

/** ใบลดหนี้: บันทึกรับเงินคืนจากผู้ขาย */
export function addApCreditNoteRefund(token: string, id: string, body: RefundApCreditNoteBody) {
  return apiFetch<ApDocumentResponse>(`${BASE.creditNote}/${id}/refunds`, { method: "POST", token, body });
}

export function cancelApCreditNoteRefund(token: string, id: string, refundId: string, reason: string) {
  return apiFetch<ApDocumentResponse>(`${BASE.creditNote}/${id}/refunds/${refundId}/cancel`, {
    method: "POST",
    token,
    body: { reason },
  });
}

/** ใบลดหนี้: นำเครดิตผู้ขายไปหักกับใบตั้งหนี้ */
export function applyApSupplierCredit(token: string, id: string, body: { apDocumentId: string; amount: number }) {
  return apiFetch<ApDocumentResponse>(`${BASE.creditNote}/${id}/supplier-credit/use`, {
    method: "POST",
    token,
    body,
  });
}

/** เครดิตผู้ขายคงเหลือที่ใช้กับใบตั้งหนี้ใบนี้ได้ */
export function getSupplierCreditCandidates(token: string, apId: string) {
  return apiFetch<{ message: string; data: ApSupplierCreditCandidate[] }>(
    `${BASE.invoice}/${apId}/supplier-credit-candidates`,
    { token },
  );
}

export function cancelApDocument(
  token: string,
  kind: ApDocumentKind,
  id: string,
  reason?: string,
) {
  return apiFetch<ApDocumentResponse>(`${BASE[kind]}/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason: reason?.trim() || undefined },
  });
}

export function getApPurchaseOrderOptions(token: string, creditorId: string) {
  return apiFetch<ApPurchaseOrderOptionsResponse>(
    `${BASE.invoice}/purchase-order-options${buildQuery({ creditorId })}`,
    { token },
  );
}

export function getApInvoiceOptions(
  token: string,
  creditorId: string,
  kind: "debitNote" | "creditNote" = "debitNote",
) {
  return apiFetch<ApInvoiceOptionsResponse>(
    `${BASE[kind]}/invoice-options${buildQuery({ creditorId })}`,
    { token },
  );
}

type Res<T> = { message: string; data: T };

/** ตารางรอสร้างใบตั้งหนี้ — GRN ที่ยืนยันแล้ว */
export function getPendingGrns(token: string, params?: PendingGrnQuery) {
  return apiFetch<Res<PendingGrnList>>(`${BASE.invoice}/pending-grns${buildQuery(params)}`, { token });
}

/** ข้อมูล GRN → PO → รายการจ่ายเงิน ที่หน้าสร้างใบตั้งหนี้เติมให้อัตโนมัติ */
export function getGrnCreateInfo(token: string, grnId: string, excludeApId?: string) {
  return apiFetch<Res<GrnCreateInfo>>(`${BASE.invoice}/grn-options/${grnId}${buildQuery({ excludeApId })}`, { token });
}

/** รายละเอียดใบตั้งหนี้ครบทุก section */
export function getApInvoiceDetail(token: string, id: string) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}`, { token });
}

/** มัดจำที่บันทึกจ่ายจริงแล้วของรายการจ่ายเงิน (PO) */
export function getDepositInfo(token: string, purchaseOrderId: string, excludeApId?: string) {
  return apiFetch<Res<DepositInfo>>(`${BASE.invoice}/deposit-info${buildQuery({ purchaseOrderId, excludeApId })}`, { token });
}

export function submitApInvoice(token: string, id: string) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/submit`, { method: "POST", token });
}

export function approveApInvoice(token: string, id: string) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/approve`, { method: "POST", token });
}

export function rejectApInvoice(token: string, id: string, reason: string) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/reject`, { method: "POST", token, body: { reason } });
}

export function cancelApInvoice(token: string, id: string, reason?: string) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/cancel`, {
    method: "POST",
    token,
    body: { reason: reason?.trim() || undefined },
  });
}

export function getAdjustmentCandidates(token: string, id: string) {
  return apiFetch<Res<ApAdjustmentCandidate[]>>(`${BASE.invoice}/${id}/adjustment-candidates`, { token });
}

export function applyAdjustments(token: string, id: string, documentIds: string[]) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/adjustments`, {
    method: "POST",
    token,
    body: { documentIds },
  });
}

/** ออกใบสำคัญจ่ายจาก AP — ส่งยอดเข้าคิวรอสร้าง PV (บางส่วนได้) */
export function issueApInvoicePv(token: string, id: string, body: { amount: number; desiredPayDate?: string }) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/issue-pv`, { method: "POST", token, body });
}

/** ยกเลิกรายการรอสร้าง PV ที่ออกจาก AP นี้ */
export function cancelApPvQueueItem(token: string, id: string, queueItemId: string) {
  return apiFetch<Res<ApInvoiceDetail>>(`${BASE.invoice}/${id}/pv-queue/${queueItemId}/cancel`, {
    method: "POST",
    token,
  });
}

/** ตารางใบตั้งหนี้ที่สร้างแล้ว */
export function getCreatedAps(token: string, params?: CreatedApQuery) {
  return apiFetch<Res<CreatedApList>>(`${BASE.invoice}/created${buildQuery(params)}`, { token });
}

/** ข้อมูลส่งออกตามตัวกรองปัจจุบัน (ไม่แบ่งหน้า) */
export function getCreatedApsExport(token: string, params?: Omit<CreatedApQuery, "page" | "limit">) {
  return apiFetch<Res<CreatedAp[]>>(`${BASE.invoice}/created/export${buildQuery(params)}`, { token });
}
