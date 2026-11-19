import type {
  ArExpressExportBody,
  ArJournalEntry,
  ArJournalFilter,
  ArJournalKind,
  ArJournalList,
  ArJournalQuery,
  ArJournalSummary,
} from "@/types/ar-journal";
import type {
  DocumentExportHistory,
  ExportHistoryList,
  ExpressExportPreview,
} from "@/types/journal-export";

import { apiFetch } from "./client";

const BASE: Record<ArJournalKind, string> = {
  SALES: "/api/reports/journals/sales",
  RECEIPT: "/api/reports/journals/receipts",
};

type Res<T> = { statusCode: number; message: string; data: T };

function buildQuery(params?: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getArJournal(token: string, kind: ArJournalKind, params?: ArJournalQuery) {
  return apiFetch<Res<ArJournalList>>(`${BASE[kind]}${buildQuery(params)}`, { token });
}

export function getArJournalEntry(token: string, kind: ArJournalKind, key: string) {
  return apiFetch<Res<{ entry: ArJournalEntry }>>(
    `${BASE[kind]}/by-document/${encodeURIComponent(key)}`,
    { token },
  );
}

/** ทั้งชุดตามตัวกรอง สำหรับ CSV/Excel/PDF (backend เพดาน 10,000 รายการ เกินคืน 400) */
export function getArJournalExport(token: string, kind: ArJournalKind, params?: ArJournalFilter) {
  return apiFetch<Res<{ items: ArJournalEntry[]; summary: ArJournalSummary }>>(
    `${BASE[kind]}/export${buildQuery(params)}`,
    { token },
  );
}

/** ส่งออก CSV/XLSX ไป Express — backend ตรึง snapshot และบันทึกประวัติในคำขอเดียว (count = 0 ไม่ต้องดาวน์โหลด) */
export async function exportArJournalToExpress(
  token: string,
  kind: ArJournalKind,
  body: ArExpressExportBody,
  format: "csv" | "xlsx" = "csv",
): Promise<{ count: number; blob: Blob; filename: string }> {
  const response = await fetch(`${BASE[kind]}/export/express-${format}`, {
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
    filename: match?.[1] ?? `journal-express.${format}`,
  };
}

export function previewArJournalExpress(token: string, kind: ArJournalKind, body: ArExpressExportBody) {
  return apiFetch<Res<ExpressExportPreview>>(`${BASE[kind]}/export/express-csv/preview`, {
    token,
    method: "POST",
    body,
  });
}

export function getArJournalExportHistory(
  token: string,
  kind: ArJournalKind,
  params?: { page?: number; limit?: number },
) {
  return apiFetch<Res<ExportHistoryList>>(`${BASE[kind]}/export-history${buildQuery(params)}`, { token });
}

export function getArJournalEntryExportHistory(token: string, kind: ArJournalKind, key: string) {
  return apiFetch<Res<DocumentExportHistory>>(
    `${BASE[kind]}/by-document/${encodeURIComponent(key)}/export-history`,
    { token },
  );
}
