"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/expense-types";
import { getAccessToken } from "@/lib/auth/token";
import type { ExpenseTypeQuery, SaveExpenseTypeRequest } from "@/types/expense-types";

export const expenseTypesQueryKey = ["master-data", "expense-types"] as const;

export function useExpenseTypesQuery(params?: ExpenseTypeQuery, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...expenseTypesQueryKey, params ?? {}],
    queryFn: async () => (await api.getExpenseTypes(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useSaveExpenseTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SaveExpenseTypeRequest | Partial<SaveExpenseTypeRequest> }) =>
      id
        ? api.updateExpenseType(getAccessToken(), id, body)
        : api.createExpenseType(getAccessToken(), body as SaveExpenseTypeRequest),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: expenseTypesQueryKey });
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, "บันทึกประเภทค่าใช้จ่ายไม่สำเร็จ")),
  });
}

export function useDeleteExpenseTypeMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => api.deleteExpenseType(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: expenseTypesQueryKey });
      message.success(response.message);
    },
    onError: (error) => message.error(errorText(error, "ลบประเภทค่าใช้จ่ายไม่สำเร็จ")),
  });
}
