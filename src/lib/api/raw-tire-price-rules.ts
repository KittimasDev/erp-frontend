import { apiFetch } from "./client";
import type {
  CreateRawTirePriceRuleRequest,
  RawTirePriceRuleApiResponse,
  RawTirePriceRuleListApiResponse,
  RawTirePriceRuleQueryParams,
  UpdateRawTirePriceRuleRequest,
} from "@/types/raw-tire-price-rules";

function buildRawTirePriceRulesQuery(params?: RawTirePriceRuleQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();

  if (params.code?.trim()) {
    search.set("code", params.code.trim());
  }

  if (params.tireClassificationId?.trim()) {
    search.set("tireClassificationId", params.tireClassificationId.trim());
  }

  if (params.effectiveOn?.trim()) {
    search.set("effectiveOn", params.effectiveOn.trim());
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getRawTirePriceRules(
  token: string,
  params?: RawTirePriceRuleQueryParams,
) {
  return apiFetch<RawTirePriceRuleListApiResponse>(
    `/api/master-data/raw-tire-price-rules${buildRawTirePriceRulesQuery(params)}`,
    {
      method: "GET",
      token,
    },
  );
}

export function createRawTirePriceRule(
  token: string,
  body: CreateRawTirePriceRuleRequest,
) {
  return apiFetch<RawTirePriceRuleApiResponse>(
    "/api/master-data/raw-tire-price-rules",
    {
      method: "POST",
      token,
      body,
    },
  );
}

export function updateRawTirePriceRule(
  token: string,
  id: string,
  body: UpdateRawTirePriceRuleRequest,
) {
  return apiFetch<RawTirePriceRuleApiResponse>(
    `/api/master-data/raw-tire-price-rules/${id}`,
    {
      method: "PATCH",
      token,
      body,
    },
  );
}

export function deleteRawTirePriceRule(token: string, id: string) {
  return apiFetch<RawTirePriceRuleApiResponse>(
    `/api/master-data/raw-tire-price-rules/${id}`,
    {
      method: "DELETE",
      token,
    },
  );
}
