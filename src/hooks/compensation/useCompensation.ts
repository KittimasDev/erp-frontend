"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { getCompensation, updateCompensation } from "@/lib/api/compensation";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateCompensationRequest } from "@/types/compensation";

export const compensationQueryKey = ["compensation"] as const;

export function useCompensationQuery(q?: string) {
  return useQuery({
    queryKey: [...compensationQueryKey, q ?? ""],
    queryFn: () => getCompensation(getAccessToken(), q),
  });
}

export function useUpdateCompensationMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateCompensationRequest }) =>
      updateCompensation(getAccessToken(), userId, body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกฐานค่าจ้างแล้ว");
      void queryClient.invalidateQueries({ queryKey: compensationQueryKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : "บันทึกฐานค่าจ้างไม่สำเร็จ");
    },
  });
}
