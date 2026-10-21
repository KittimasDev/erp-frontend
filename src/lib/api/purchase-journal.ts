import type {
  ExpressExportBody,
  PurchaseJournalByDocument,
  PurchaseJournalFilter,
  PurchaseJournalItem,
  PurchaseJournalList,
  PurchaseJournalQuery,
  PurchaseJournalSummary,
} from "@/types/purchase-journal";

import { apiFetch } from "./client";

const BASE = "/api/reports/journals/purchases";

type Res<T> = { statusCode: number; message: string; data: T };

function buildQuery(params?: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getPurchaseJournal(token: string, params?: PurchaseJournalQuery) {
  return apiFetch<Res<PurchaseJournalList>>(`${BASE}${buildQuery(params)}`, { token });
}

/** ใบสำคัญบัญชีของเอกสาร AP 1 ใบ — ที่ยังไม่อนุมัติคืนเป็นตัวอย่าง (preview) · ต้องมีสิทธิ์ดูสมุดรายวันซื้อ */
export function getPurchaseJournalByDocument(token: string, id: string) {
  return apiFetch<Res<PurchaseJournalByDocument>>(`${BASE}/by-document/${id}`, { token });
}

/** ทั้งชุดตามตัวกรอง สำหรับ CSV/Excel/PDF (backend เพดาน 10,000 แถว เกินคืน 400) */
export function getPurchaseJournalExport(token: string, params?: PurchaseJournalFilter) {
  return apiFetch<Res<{ items: PurchaseJournalItem[]; summary: PurchaseJournalSummary }>>(
    `${BASE}/export${buildQuery(params)}`,
    { token },
  );
}

/**
 * ส่งออก CSV ไป Express — backend ทำเครื่องหมาย "ส่งแล้ว" ให้ในคำขอเดียวกัน
 * คืนจำนวนแถวและไฟล์ (count = 0 ไม่ต้องดาวน์โหลด)
 */
export async function exportPurchaseJournalToExpress(
  token: string,
  body: ExpressExportBody,
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
    filename: match?.[1] ?? "purchase-journal-express.csv",
  };
}
