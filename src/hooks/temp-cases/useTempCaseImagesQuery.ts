"use client";

import { useQuery } from "@tanstack/react-query";

import { getTempCaseImages } from "@/lib/api/temp-cases";
import { getAccessToken } from "@/lib/auth/token";

export const tempCaseImagesQueryKey = (caseId: string) =>
  ["temp-cases", caseId, "images"] as const;

export function useTempCaseImagesQuery(caseId: string | null, enabled = true) {
  return useQuery({
    queryKey: tempCaseImagesQueryKey(caseId ?? ""),
    queryFn: () => getTempCaseImages(getAccessToken(), caseId!),
    enabled: Boolean(caseId) && enabled,
    refetchOnMount: "always",
  });
}
