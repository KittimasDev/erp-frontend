import { apiFetch } from "@/lib/api/client";
import type {
  CreateProductionFormulaBody,
  ProductionFormulaApiResponse,
  ProductionFormulaListApiResponse,
  ProductionFormulaScaleApiResponse,
  QueryProductionFormulasParams,
  UpdateProductionFormulaBody,
} from "@/types/production-formula";

const BASE = "/api/master-data/production-formulas";

function buildQuery(params?: QueryProductionFormulasParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined)
    search.set("isActive", String(params.isActive));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getProductionFormulas(
  token: string,
  params?: QueryProductionFormulasParams,
) {
  return apiFetch<ProductionFormulaListApiResponse>(
    `${BASE}${buildQuery(params)}`,
    { token },
  );
}

export function getProductionFormula(token: string, id: string) {
  return apiFetch<ProductionFormulaApiResponse>(`${BASE}/${id}`, { token });
}

/**
 * คิดประมาณการจากสูตร — **แหล่งความจริงเดียวของการคำนวณ**
 *
 * ตั้งจากบรรทัดผลผลิตคือ "อยากได้เท่านี้ ต้องใช้อะไร" · ตั้งจากบรรทัดวัตถุดิบคือ
 * "มีเท่านี้ จะได้อะไร" · คิดไม่ได้จะคืน `factor: null` พร้อม `reason` ไม่ throw
 */
export function scaleProductionFormula(
  token: string,
  id: string,
  params: { driverLineId: string; targetQty: number },
) {
  const search = new URLSearchParams({
    driverLineId: params.driverLineId,
    targetQty: String(params.targetQty),
  });
  return apiFetch<ProductionFormulaScaleApiResponse>(
    `${BASE}/${id}/scale?${search.toString()}`,
    { token },
  );
}

export function createProductionFormula(
  token: string,
  body: CreateProductionFormulaBody,
) {
  return apiFetch<ProductionFormulaApiResponse>(BASE, {
    method: "POST",
    token,
    body,
  });
}

export function updateProductionFormula(
  token: string,
  id: string,
  body: UpdateProductionFormulaBody,
) {
  return apiFetch<ProductionFormulaApiResponse>(`${BASE}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteProductionFormula(token: string, id: string) {
  return apiFetch<{ statusCode: number; message: string; data: null }>(
    `${BASE}/${id}`,
    { method: "DELETE", token },
  );
}
