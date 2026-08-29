import { apiFetch } from "./client";
import type {
  ConvertibleUnitsApiResponse,
  CreateUnitConversionRequest,
  UnitConversionApiResponse,
  UnitConversionListApiResponse,
  UnitConversionQueryParams,
  UpdateUnitConversionRequest,
} from "@/types/unit-conversions";

const BASE_PATH = "/api/master-data/unit-conversions";

function buildUnitConversionsQuery(params?: UnitConversionQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();
  if (params.itemId) {
    search.set("itemId", params.itemId);
  }
  if (params.fromUnitId) {
    search.set("fromUnitId", params.fromUnitId);
  }
  if (params.toUnitId) {
    search.set("toUnitId", params.toUnitId);
  }
  if (params.scope) {
    search.set("scope", params.scope);
  }
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getUnitConversions(
  token: string,
  params?: UnitConversionQueryParams,
) {
  return apiFetch<UnitConversionListApiResponse>(
    `${BASE_PATH}${buildUnitConversionsQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

/** หน่วยที่กรอกได้ของสินค้า — หน่วยหลักบวกหน่วยที่มีกฎแปลงถึงจริง */
export function getConvertibleUnits(token: string, itemId: string) {
  return apiFetch<ConvertibleUnitsApiResponse>(
    `${BASE_PATH}/convertible-units?itemId=${encodeURIComponent(itemId)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createUnitConversion(
  token: string,
  body: CreateUnitConversionRequest,
) {
  return apiFetch<UnitConversionApiResponse>(BASE_PATH, {
    method: "POST",
    token,
    body,
  });
}

export function updateUnitConversion(
  token: string,
  id: string,
  body: UpdateUnitConversionRequest,
) {
  return apiFetch<UnitConversionApiResponse>(`${BASE_PATH}/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteUnitConversion(token: string, id: string) {
  return apiFetch<UnitConversionApiResponse>(`${BASE_PATH}/${id}`, {
    method: "DELETE",
    token,
  });
}
