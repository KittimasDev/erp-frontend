import { apiFetch, apiUpload } from "./client";
import type { SupplierPaymentListData } from "@/types/purchase-payments";
import type { DocumentAttachment } from "@/types/document-attachments";
import type {
  CreatedVoucherQuery,
  CreateVoucherFormBody,
  PayableVoucherQuery,
  PaymentRecord,
  PaymentRecordList,
  PaymentRecordQuery,
  PaymentVoucherDetail,
  PaymentVoucherQueueList,
  PaymentVoucherQueueQuery,
  QueueContext,
  IssueWhtBody,
  PaymentRecordDetail,
  RecordPaymentForm,
  UpdateVoucherFormBody,
  WhtCertificate,
} from "@/types/payment-vouchers";

type Res<T> = { message: string; data: T };
const BASE = "/api/payment-vouchers";

function qs(params?: Record<string, unknown>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && String(v).trim() !== "") s.set(k, String(v).trim());
  }
  const t = s.toString();
  return t ? `?${t}` : "";
}

export const getPaymentVoucherQueue = (token: string, params?: PaymentVoucherQueueQuery) =>
  apiFetch<Res<PaymentVoucherQueueList>>(`${BASE}/queue${qs(params)}`, { token });
export const getCreatedPaymentVouchers = (token: string, params?: CreatedVoucherQuery) =>
  apiFetch<Res<SupplierPaymentListData>>(`${BASE}/created${qs(params)}`, { token });
export const getQueueContext = (token: string, queueItemId: string) =>
  apiFetch<Res<QueueContext>>(`${BASE}/queue/${queueItemId}`, { token });
export const createVoucherFromQueue = (token: string, queueItemId: string, body: CreateVoucherFormBody) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/queue/${queueItemId}/vouchers`, { method: "POST", token, body });
export const getPaymentVoucherDetail = (token: string, id: string) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}`, { token });
export const updatePaymentVoucher = (token: string, id: string, body: UpdateVoucherFormBody) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}`, { method: "PATCH", token, body });
export const submitPaymentVoucher = (token: string, id: string) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}/submit`, { method: "POST", token });
export const reviewPaymentVoucher = (token: string, id: string, note?: string) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}/review`, { method: "POST", token, body: { note } });
export const approvePaymentVoucher = (token: string, id: string) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}/approve`, { method: "POST", token });
export const rejectPaymentVoucher = (token: string, id: string, reason: string) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}/reject`, { method: "POST", token, body: { reason } });
export const cancelPaymentVoucher = (token: string, id: string, reason: string) =>
  apiFetch<Res<PaymentVoucherDetail>>(`${BASE}/${id}/cancel`, { method: "POST", token, body: { reason } });
export const getPayableVouchers = (token: string, params?: PayableVoucherQuery) =>
  apiFetch<Res<SupplierPaymentListData>>(`${BASE}/payable${qs(params)}`, { token });
export const getPaymentRecords = (token: string, params?: PaymentRecordQuery) =>
  apiFetch<Res<PaymentRecordList>>(`${BASE}/payments${qs(params)}`, { token });
/** ข้อมูลส่งออกตามตัวกรองปัจจุบัน (ไม่แบ่งหน้า) */
export const getPaymentRecordsExport = (token: string, params?: Omit<PaymentRecordQuery, "page" | "limit">) =>
  apiFetch<Res<PaymentRecord[]>>(`${BASE}/payments/export${qs(params)}`, { token });
export const getPaymentRecordDetail = (token: string, paymentId: string) =>
  apiFetch<Res<PaymentRecordDetail>>(`${BASE}/payments/${paymentId}`, { token });
/** ยืนยันการจ่ายเงิน — multipart: ฟิลด์ฟอร์ม + ไฟล์หลักฐาน (field `files`) */
export const recordVoucherPayment = (token: string, voucherId: string, form: RecordPaymentForm, files: File[]) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(form)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") data.append(k, String(v));
  }
  for (const f of files) data.append("files", f);
  return apiUpload<Res<PaymentRecordDetail>>(`${BASE}/${voucherId}/payment`, data, { token });
};
export const cancelPaymentRecord = (token: string, paymentId: string, reason: string) =>
  apiFetch<Res<PaymentRecordDetail>>(`${BASE}/payments/${paymentId}/cancel`, { method: "POST", token, body: { reason } });
export const issueWhtCertificate = (token: string, paymentId: string, body: IssueWhtBody) =>
  apiFetch<Res<WhtCertificate>>(`${BASE}/payments/${paymentId}/wht-certificate`, { method: "POST", token, body });
export const getWhtCertificate = (token: string, paymentId: string) =>
  apiFetch<Res<WhtCertificate>>(`${BASE}/payments/${paymentId}/wht-certificate`, { token });

export const uploadVoucherAttachment = (token: string, id: string, file: File, description?: string) => {
  const form = new FormData();
  form.append("file", file);
  if (description) form.append("description", description);
  return apiUpload<Res<DocumentAttachment>>(`${BASE}/${id}/attachments`, form, { token });
};
export const deleteVoucherAttachment = (token: string, id: string, attachmentId: string) =>
  apiFetch<Res<DocumentAttachment>>(`${BASE}/${id}/attachments/${attachmentId}`, { method: "DELETE", token });
