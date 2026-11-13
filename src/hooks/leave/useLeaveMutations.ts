"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isESignCancelled } from "@/lib/esign/esign-gate";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import {
  approveLeaveRequest,
  cancelMyLeaveRequest,
  createMyLeaveRequest,
  rejectLeaveRequest,
} from "@/lib/api/leave";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateMyLeaveRequest } from "@/types/leave";

function useInvalidateLeave() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["leave"] });
  };
}

function errorMessage(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateMyLeaveRequestMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: (body: CreateMyLeaveRequest) =>
      createMyLeaveRequest(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("ส่งคำขอลาแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ส่งคำขอลาไม่สำเร็จ")));
    },
  });
}

export function useCancelMyLeaveRequestMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: (id: string) => cancelMyLeaveRequest(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกคำขอแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ยกเลิกคำขอไม่สำเร็จ")));
    },
  });
}

export function useReviewLeaveRequestMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateLeave();

  return useMutation({
    mutationFn: ({
      id,
      action,
      remark,
      acknowledgeShortage,
    }: {
      id: string;
      action: "approve" | "reject";
      remark?: string;
      /** เฉพาะตอนอนุมัติ — รับทราบว่ากำลังคนในกะต่ำกว่าขั้นต่ำ */
      acknowledgeShortage?: boolean;
    }) =>
      action === "approve"
        ? approveLeaveRequest(getAccessToken(), id, remark, acknowledgeShortage)
        : rejectLeaveRequest(getAccessToken(), id, remark),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกผลการพิจารณาแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      if (isESignCancelled(error)) return; // ผู้ใช้ยกเลิกการยืนยันตัวตน — ไม่ต้องแจ้ง error
      message.error(errorMessage(error, t("พิจารณาคำขอไม่สำเร็จ")));
    },
  });
}
