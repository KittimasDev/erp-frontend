"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import {
  createHazardClass,
  getChemicalLots,
  getChemicals,
  getHazardClasses,
  getIncompatibilities,
  rejectLotCoa,
  setIncompatibilities,
  updateHazardClass,
  upsertChemicalProfile,
  verifyLotCoa,
} from "@/lib/api/chemicals";
import { getAccessToken } from "@/lib/auth/token";
import type { IncompatiblePair, UpsertChemicalProfileRequest } from "@/types/chemicals";

export const chemicalsKey = ["chemicals"] as const;
export const chemicalLotsKey = ["chemical-lots"] as const;

export function useChemicalsQuery(q?: string) {
  return useQuery({
    queryKey: [...chemicalsKey, "list", q ?? ""],
    queryFn: () => getChemicals(getAccessToken(), q),
  });
}

export function useHazardClassesQuery() {
  return useQuery({
    queryKey: [...chemicalsKey, "hazard-classes"],
    queryFn: () => getHazardClasses(getAccessToken()),
  });
}

export function useIncompatibilitiesQuery() {
  return useQuery({
    queryKey: [...chemicalsKey, "incompatibilities"],
    queryFn: () => getIncompatibilities(getAccessToken()),
  });
}

export function useChemicalLotsQuery(params: {
  coaStatus?: string;
  q?: string;
  expiringWithinDays?: number;
}) {
  return useQuery({
    queryKey: [...chemicalLotsKey, params],
    queryFn: () => getChemicalLots(getAccessToken(), params),
  });
}

function useMasterMutation<TVars, TRes extends { message: string }>(
  fn: (vars: TVars) => Promise<TRes>,
  keys: ReadonlyArray<readonly unknown[]>,
  fallbackError: string,
) {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      message.success(res.message);
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t(fallbackError));
    },
  });
}

export function useUpsertChemicalProfileMutation() {
  return useMasterMutation(
    (v: { itemId: string; body: UpsertChemicalProfileRequest }) =>
      upsertChemicalProfile(getAccessToken(), v.itemId, v.body),
    [chemicalsKey],
    "บันทึกข้อมูลสารเคมีไม่สำเร็จ",
  );
}

export function useCreateHazardClassMutation() {
  return useMasterMutation(
    (body: { code: string; nameTh: string }) => createHazardClass(getAccessToken(), body),
    [chemicalsKey],
    "เพิ่ม Hazard Class ไม่สำเร็จ",
  );
}

export function useUpdateHazardClassMutation() {
  return useMasterMutation(
    (v: { id: string; body: { nameTh?: string; isActive?: boolean; sortOrder?: number } }) =>
      updateHazardClass(getAccessToken(), v.id, v.body),
    [chemicalsKey],
    "บันทึก Hazard Class ไม่สำเร็จ",
  );
}

export function useSetIncompatibilitiesMutation() {
  return useMasterMutation(
    (pairs: IncompatiblePair[]) => setIncompatibilities(getAccessToken(), pairs),
    [chemicalsKey],
    "บันทึกตารางห้ามเก็บรวมไม่สำเร็จ",
  );
}

export function useVerifyLotCoaMutation() {
  return useMasterMutation(
    (v: { id: string; remark?: string }) => verifyLotCoa(getAccessToken(), v.id, v.remark),
    [chemicalLotsKey],
    "ยืนยัน COA ไม่สำเร็จ",
  );
}

export function useRejectLotCoaMutation() {
  return useMasterMutation(
    (v: { id: string; reason: string }) => rejectLotCoa(getAccessToken(), v.id, v.reason),
    [chemicalLotsKey],
    "ปฏิเสธ COA ไม่สำเร็จ",
  );
}
