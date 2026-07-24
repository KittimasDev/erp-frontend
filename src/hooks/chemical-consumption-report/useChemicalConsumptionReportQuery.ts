"use client";

import { useQuery } from "@tanstack/react-query";

import { getChemicalConsumptionReport } from "@/lib/api/chemical-issues";
import { getAccessToken } from "@/lib/auth/token";
import type { ChemicalConsumptionReportQueryParams } from "@/types/chemical-issues";

export const chemicalConsumptionReportQueryKey = [
  "chemical-consumption-report",
] as const;

export function useChemicalConsumptionReportQuery(
  params?: ChemicalConsumptionReportQueryParams,
) {
  return useQuery({
    queryKey: [...chemicalConsumptionReportQueryKey, params ?? {}],
    queryFn: () => getChemicalConsumptionReport(getAccessToken(), params),
  });
}
