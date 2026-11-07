"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import {
  approveOvertimeRequest,
  cancelMyOvertimeRequest,
  createMyOvertimeRequest,
  rejectOvertimeRequest,
} from "@/lib/api/overtime";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateMyOvertimeRequest } from "@/types/overtime";

function useInvalidateOvertime() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["overtime"] });
    void queryClient.invalidateQueries({ queryKey: ["shifts", "assignments"] });
  };
}

function errorMessage(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateMyOvertimeRequestMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateOvertime();

  return useMutation({
    mutationFn: (body: CreateMyOvertimeRequest) =>
      createMyOvertimeRequest(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("ส่งคำขอ OT แล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ส่งคำขอ OT ไม่สำเร็จ")));
    },
  });
}

export function useCancelMyOvertimeRequestMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateOvertime();

  return useMutation({
    mutationFn: (id: string) => cancelMyOvertimeRequest(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกคำขอแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ยกเลิกคำขอไม่สำเร็จ")));
    },
  });
}

export function useReviewOvertimeRequestMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateOvertime();

  return useMutation({
    mutationFn: ({
      id,
      action,
      remark,
      dayType,
    }: {
      id: string;
      action: "approve" | "reject";
      remark?: string;
      /** เฉพาะตอนอนุมัติ — ไม่ส่ง = ตัดสินจากปฏิทิน */
      dayType?: string;
    }) =>
      action === "approve"
        ? approveOvertimeRequest(getAccessToken(), id, remark, dayType)
        : rejectOvertimeRequest(getAccessToken(), id, remark),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกผลการพิจารณาแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("พิจารณาคำขอไม่สำเร็จ")));
    },
  });
}
