"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  createLabSpec,
  deleteLabSpec,
  getLabSpecs,
  resolveLabSpec,
  updateLabSpec,
} from "@/lib/api/lab-specs";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type { CreateLabSpecBody, UpdateLabSpecBody } from "@/types/laboratory";

export const labSpecsKey = ["laboratory-specs"] as const;

export const useLabSpecsQuery = (params?: { sampleType?: string; isActive?: boolean }) =>
  useQuery({
    queryKey: [...labSpecsKey, "list", params ?? {}],
    queryFn: () => getLabSpecs(getAccessToken(), params),
  });

export const useResolveLabSpecQuery = (
  params: { sampleType?: string; itemId?: string },
  enabled = true,
) =>
  useQuery({
    queryKey: [...labSpecsKey, "resolve", params],
    queryFn: () =>
      resolveLabSpec(getAccessToken(), {
        sampleType: params.sampleType as string,
        itemId: params.itemId,
      }),
    enabled: enabled && Boolean(params.sampleType),
  });

function useSpecMutations() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const done = (text: string) => {
    void queryClient.invalidateQueries({ queryKey: labSpecsKey });
    message.success(text);
  };
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);
  return { done, fail };
}

export function useCreateLabSpecMutation() {
  const t = useT();
  const { done, fail } = useSpecMutations();
  return useMutation({
    mutationFn: (body: CreateLabSpecBody) => createLabSpec(getAccessToken(), body),
    onSuccess: () => done(t("สร้าง Spec การตรวจแล้ว")),
    onError: (e) => fail(e, t("สร้าง Spec ไม่สำเร็จ")),
  });
}

export function useUpdateLabSpecMutation() {
  const t = useT();
  const { done, fail } = useSpecMutations();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateLabSpecBody }) =>
      updateLabSpec(getAccessToken(), vars.id, vars.body),
    onSuccess: () => done(t("บันทึก Spec การตรวจแล้ว")),
    onError: (e) => fail(e, t("บันทึก Spec ไม่สำเร็จ")),
  });
}

export function useDeleteLabSpecMutation() {
  const t = useT();
  const { done, fail } = useSpecMutations();
  return useMutation({
    mutationFn: (id: string) => deleteLabSpec(getAccessToken(), id),
    onSuccess: () => done(t("ลบ Spec การตรวจแล้ว")),
    onError: (e) => fail(e, t("ลบ Spec ไม่สำเร็จ")),
  });
}
