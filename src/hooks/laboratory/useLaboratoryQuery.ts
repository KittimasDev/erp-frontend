"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getLabSample,
  getLabSampleCoa,
  getLabSampleQrCode,
  getLabSamples,
} from "@/lib/api/laboratory";
import { getAccessToken } from "@/lib/auth/token";
import type { LabSampleQueryParams } from "@/types/laboratory";

export const laboratoryQueryKey = ["laboratory-samples"] as const;

export function useLabSamplesQuery(params?: LabSampleQueryParams) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "list", params ?? {}],
    queryFn: () => getLabSamples(getAccessToken(), params),
  });
}

export function useLabSampleQuery(id?: string) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "detail", id],
    queryFn: () => getLabSample(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useLabSampleCoaQuery(id?: string, enabled = false) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "coa", id],
    queryFn: () => getLabSampleCoa(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useLabSampleQrCodeQuery(id?: string, enabled = false) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "qrcode", id],
    queryFn: () => getLabSampleQrCode(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
  });
}
