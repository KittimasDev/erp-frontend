"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useT } from "@/lib/i18n/useT";

import type { StageModuleConfig } from "@/components/production-stages/stage-modules";
import { ApiError } from "@/lib/api/client";
import {
  cancelStageRun,
  completeStageRun,
  createStageRun,
  startStageRun,
} from "@/lib/api/production-stage-runs";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CancelStageRunBody,
  CompleteStageRunBody,
  CreateStageRunBody,
} from "@/types/production-stage-run";

/**
 * ทุก mutation ล้าง cache ของโมดูลตัวเอง **และของคลัง** เพราะ เริ่มงาน/เสร็จงาน
 * ตัดและรับสต๊อกจริง — ไม่ล้างแล้วหน้าสต๊อกจะค้างตัวเลขเก่า
 */
function useInvalidateStageRuns(config: StageModuleConfig) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: config.queryKeyRoot }),
      queryClient.invalidateQueries({ queryKey: ["stock-balances"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-lots"] }),
    ]);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateStageRunMutation(config: StageModuleConfig) {
  const invalidate = useInvalidateStageRuns(config);
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...config.queryKeyRoot, "create"],
    mutationFn: (body: CreateStageRunBody) =>
      createStageRun(getAccessToken(), config.apiBase, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("สร้างรอบการทำงานสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("สร้างรอบการทำงานไม่สำเร็จ")));
    },
  });
}

export function useStartStageRunMutation(config: StageModuleConfig) {
  const invalidate = useInvalidateStageRuns(config);
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...config.queryKeyRoot, "start"],
    mutationFn: (id: string) =>
      startStageRun(getAccessToken(), config.apiBase, id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("เริ่มงานและตัดสต๊อกแล้ว"));
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("เริ่มงานไม่สำเร็จ")));
    },
  });
}

export function useCompleteStageRunMutation(config: StageModuleConfig) {
  const invalidate = useInvalidateStageRuns(config);
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...config.queryKeyRoot, "complete"],
    mutationFn: ({ id, body }: { id: string; body?: CompleteStageRunBody }) =>
      completeStageRun(getAccessToken(), config.apiBase, id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยืนยันเสร็จงานและรับผลผลิตเข้าคลังแล้ว"));
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ยืนยันเสร็จงานไม่สำเร็จ")));
    },
  });
}

export function useCancelStageRunMutation(config: StageModuleConfig) {
  const invalidate = useInvalidateStageRuns(config);
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...config.queryKeyRoot, "cancel"],
    mutationFn: ({ id, body }: { id: string; body?: CancelStageRunBody }) =>
      cancelStageRun(getAccessToken(), config.apiBase, id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยกเลิกรอบการทำงานแล้ว"));
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ยกเลิกรอบการทำงานไม่สำเร็จ")));
    },
  });
}
