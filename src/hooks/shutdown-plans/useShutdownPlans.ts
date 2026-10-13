"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelShutdownPlan,
  createShutdownPlan,
  getShutdownPlan,
  getShutdownPlans,
  setShutdownPlanMembers,
  suggestShutdownPlanMembers,
  updateShutdownPlan,
} from "@/lib/api/shutdown-plans";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateShutdownPlanRequest,
  ShutdownMemberInput,
  UpdateShutdownPlanRequest,
} from "@/types/shutdown-plans";

export const shutdownPlansQueryKey = ["shutdown-plans"] as const;

export function useShutdownPlansQuery(status?: string) {
  return useQuery({
    queryKey: [...shutdownPlansQueryKey, "list", status ?? "ALL"],
    queryFn: () => getShutdownPlans(getAccessToken(), status),
  });
}

export function useShutdownPlanQuery(id?: string) {
  return useQuery({
    queryKey: [...shutdownPlansQueryKey, "detail", id],
    queryFn: () => getShutdownPlan(getAccessToken(), id!),
    enabled: Boolean(id),
  });
}

/**
 * แผน Shutdown ลง/ถอนวัน MAINTENANCE ในปฏิทิน → ปฏิทินกะและรายการเข้ากะต้องโหลดใหม่ด้วย
 */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: shutdownPlansQueryKey });
    void queryClient.invalidateQueries({ queryKey: ["shifts"] });
  };
}

function errorText(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateShutdownPlanMutation() {
  const { message } = App.useApp();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: CreateShutdownPlanRequest) =>
      createShutdownPlan(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างแผน Shutdown แล้ว");
      refresh();
    },
    onError: (error: Error) => message.error(errorText(error, "สร้างแผนไม่สำเร็จ")),
  });
}

export function useUpdateShutdownPlanMutation() {
  const { message } = App.useApp();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateShutdownPlanRequest }) =>
      updateShutdownPlan(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "แก้ไขแผนแล้ว");
      refresh();
    },
    onError: (error: Error) => message.error(errorText(error, "แก้ไขแผนไม่สำเร็จ")),
  });
}

export function useSetShutdownMembersMutation() {
  const { message } = App.useApp();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, members }: { id: string; members: ShutdownMemberInput[] }) =>
      setShutdownPlanMembers(getAccessToken(), id, members),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกรายชื่อแล้ว");
      refresh();
    },
    onError: (error: Error) => message.error(errorText(error, "บันทึกรายชื่อไม่สำเร็จ")),
  });
}

export function useSuggestShutdownMembersMutation() {
  const { message } = App.useApp();
  return useMutation({
    mutationFn: (id: string) => suggestShutdownPlanMembers(getAccessToken(), id),
    onError: (error: Error) => message.error(errorText(error, "แนะนำรายชื่อไม่สำเร็จ")),
  });
}

export function useCancelShutdownPlanMutation() {
  const { message } = App.useApp();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelShutdownPlan(getAccessToken(), id, reason),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกแผนแล้ว");
      refresh();
    },
    onError: (error: Error) => message.error(errorText(error, "ยกเลิกแผนไม่สำเร็จ")),
  });
}
