"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/gl-accounts";
import { getAccessToken } from "@/lib/auth/token";
import type { GlAccountQuery, SaveGlAccountRequest } from "@/types/gl-accounts";

export const glAccountsQueryKey = ["master-data", "gl-accounts"] as const;

export function useGlAccountsQuery(params?: GlAccountQuery) {
  return useQuery({
    queryKey: [...glAccountsQueryKey, "list", params ?? {}],
    queryFn: async () => (await api.getGlAccounts(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useAccountSettingsQuery() {
  return useQuery({
    queryKey: [...glAccountsQueryKey, "settings"],
    queryFn: async () => (await api.getAccountSettings(getAccessToken())).data.settings,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: glAccountsQueryKey });
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useSaveGlAccountMutation() {
  const invalidate = useInvalidate();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveGlAccountRequest }) =>
      id ? api.updateGlAccount(getAccessToken(), id, body) : api.createGlAccount(getAccessToken(), body),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, t("บันทึกบัญชีไม่สำเร็จ"))),
  });
}

export function useDeleteGlAccountMutation() {
  const invalidate = useInvalidate();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (id: string) => api.deleteGlAccount(getAccessToken(), id),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, t("ลบบัญชีไม่สำเร็จ"))),
  });
}

export function useSaveAccountSettingsMutation() {
  const invalidate = useInvalidate();
  const { message } = App.useApp();
  const t = useT();
  return useMutation({
    mutationFn: (settings: Array<{ settingKey: string; glAccountId: string | null }>) =>
      api.saveAccountSettings(getAccessToken(), settings),
    onSuccess: async (response) => {
      await invalidate();
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, t("บันทึกการผูกบัญชีไม่สำเร็จ"))),
  });
}
