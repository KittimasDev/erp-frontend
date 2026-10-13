"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import { getMinStaffing, setMinStaffing } from "@/lib/api/leave";
import { getAccessToken } from "@/lib/auth/token";
import type { MinStaffingItem } from "@/types/leave";

export const minStaffingQueryKey = ["leave", "min-staffing"] as const;

export function useMinStaffingQuery(enabled = true) {
  return useQuery({
    queryKey: minStaffingQueryKey,
    queryFn: () => getMinStaffing(getAccessToken()),
    enabled,
  });
}

export function useSetMinStaffingMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: MinStaffingItem[]) => setMinStaffing(getAccessToken(), items),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกกำลังคนขั้นต่ำแล้ว");
      void queryClient.invalidateQueries({ queryKey: minStaffingQueryKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : "บันทึกกำลังคนขั้นต่ำไม่สำเร็จ");
    },
  });
}
