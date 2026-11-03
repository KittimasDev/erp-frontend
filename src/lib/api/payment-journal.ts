import type {
  PaymentExpressExportBody,
  PaymentJournalByDocument,
  PaymentJournalFilter,
  PaymentJournalItem,
  PaymentJournalList,
  PaymentJournalQuery,
  PaymentJournalSummary,
} from "@/types/payment-journal";

import type {
  DocumentExportHistory,
  ExportHistoryList,
  ExpressExportPreview,
} from "@/types/journal-export";

import { apiFetch } from "./client";

const BASE = "/api/reports/journals/payments";

type Res<T> = { statusCode: number; message: string; data: T };

function buildQuery(params?: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getPaymentJournal(token: string, params?: PaymentJournalQuery) {
  return apiFetch<Res<PaymentJournalList>>(`${BASE}${buildQuery(params)}`, { token });
}

/** รายการสมุดรายวันจ่ายของบันทึกจ่ายเงิน 1 ใบ · ต้องมีสิทธิ์ดูสมุดรายวันจ่าย */
export function getPaymentJournalByDocument(token: string, id: string) {
  return apiFetch<Res<PaymentJournalByDocument>>(`${BASE}/by-document/${id}`, { token });
}

/** ทั้งชุดตามตัวกรอง สำหรับ CSV/Excel/PDF (backend เพดาน 10,000 รายการ เกินคืน 400) */
export function getPaymentJournalExport(token: string, params?: PaymentJournalFilter) {
  return apiFetch<Res<{ items: PaymentJournalItem[]; summary: PaymentJournalSummary }>>(
    `${BASE}/export${buildQuery(params)}`,
    { token },
  );
}

/**
 * ส่งออก CSV ไป Express — backend ทำเครื่องหมาย "ส่งแล้ว" ให้ในคำขอเดียวกัน
 * (ส่งแล้วยกเลิกบันทึกจ่ายเงินไม่ได้) คืนจำนวนใบและไฟล์ (count = 0 ไม่ต้องดาวน์โหลด)
 */
export async function exportPaymentJournalToExpress(
  token: string,
  body: PaymentExpressExportBody,
): Promise<{ count: number; blob: Blob; filename: string }> {
  const response = await fetch(`${BASE}/export/express-csv`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = "ส่งออกไป Express ไม่สำเร็จ";
    try {
      const err = (await response.json()) as { message?: string | string[] };
      const m = Array.isArray(err.message) ? err.message.join(", ") : err.message;
      if (m) message = m;
    } catch {
      /* ใช้ข้อความมาตรฐาน */
    }
    throw new Error(message);
  }
  const count = Number(response.headers.get("X-Export-Count") ?? 0);
  const match = response.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/);
  return {
    count,
    blob: await response.blob(),
    filename: match?.[1] ?? "payment-journal-express.csv",
  };
}

/** ตรวจก่อนส่งออก Express (ไม่เขียนข้อมูล) — นับใหม่/เคยส่งแล้ว เพื่อเตือนก่อนส่งซ้ำ */
export function previewPaymentJournalExpress(token: string, body: PaymentExpressExportBody) {
  return apiFetch<Res<ExpressExportPreview>>(`${BASE}/export/express-csv/preview`, {
    token,
    method: "POST",
    body,
  });
}

/** ประวัติการส่งออกทุกรอบ (ใหม่สุดก่อน) */
export function getPaymentJournalExportHistory(token: string, params?: { page?: number; limit?: number }) {
  return apiFetch<Res<ExportHistoryList>>(`${BASE}/export-history${buildQuery(params)}`, { token });
}

/** ประวัติการส่งออกของเอกสาร/รายการ 1 ใบ */
export function getPaymentJournalDocumentExportHistory(token: string, id: string) {
  return apiFetch<Res<DocumentExportHistory>>(`${BASE}/by-document/${id}/export-history`, { token });
}
