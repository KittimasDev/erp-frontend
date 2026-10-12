import { apiFetch } from "./client";
import type {
  ArAgingReportApiResponse,
  QueryArAgingReportParams,
} from "@/types/sales-reports";

function buildQuery(params?: Record<string, unknown>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function downloadCsv(
  path: string,
  token: string,
  params: Record<string, unknown> | undefined,
  fallbackFilename: string,
) {
  const response = await fetch(`${path}${buildQuery(params)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("ดาวน์โหลดรายงานไม่สำเร็จ");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackFilename;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** ดึงได้หน้าละไม่เกิน 100 (backend `@Max(100)`) */
const REPORT_PAGE_SIZE = 100;
/** เท่ากับ REPORT_EXPORT_ROW_CAP ของ backend — Excel/PDF ได้แถวเท่ากับ CSV */
export const REPORT_EXPORT_ROW_CAP = 5000;

/**
 * ดึงรายงานทุกหน้ามารวมกัน สำหรับส่งออก Excel/PDF ฝั่ง client
 *
 * CSV สร้างที่ backend จึงได้ทุกแถวในทีเดียว แต่ endpoint ปกติจำกัดหน้าละ 100
 * จึงวนดึงจนครบ หยุดที่เพดานเดียวกับ CSV และบอกคนเรียกว่าถูกตัดหรือไม่ — ไม่ตัดเงียบ ๆ
 */
export async function fetchAllReportRows<Data extends { items: unknown[]; total: number }>(
  fetchPage: (page: number, limit: number) => Promise<{ data: Data }>,
): Promise<{ first: Data; rows: Data["items"]; total: number; truncated: boolean }> {
  const firstResponse = await fetchPage(1, REPORT_PAGE_SIZE);
  const first = firstResponse.data;
  const rows: Data["items"] = [...first.items];
  const wanted = Math.min(first.total, REPORT_EXPORT_ROW_CAP);
  let page = 1;
  while (rows.length < wanted) {
    page += 1;
    const next = await fetchPage(page, REPORT_PAGE_SIZE);
    if (next.data.items.length === 0) break;
    rows.push(...next.data.items);
  }
  return {
    first,
    rows: rows.slice(0, REPORT_EXPORT_ROW_CAP),
    total: first.total,
    truncated: first.total > REPORT_EXPORT_ROW_CAP,
  };
}

export function getArAgingReport(
  token: string,
  params?: QueryArAgingReportParams,
) {
  return apiFetch<ArAgingReportApiResponse>(
    `/api/reports/ar-aging${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function downloadArAgingReportCsv(
  token: string,
  params?: QueryArAgingReportParams,
) {
  return downloadCsv(
    "/api/reports/ar-aging/export",
    token,
    params,
    "ar-aging-report.csv",
  );
}
