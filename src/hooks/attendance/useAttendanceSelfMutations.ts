"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import { selfCheckIn, selfCheckOut } from "@/lib/api/attendance";
import { getAccessToken } from "@/lib/auth/token";

function useInvalidateMyAttendance() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["attendance", "me"] });
  };
}

export function useSelfCheckInMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateMyAttendance();

  return useMutation({
    mutationFn: (remark?: string) => selfCheckIn(getAccessToken(), remark),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกเวลาเข้างานแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลงเวลาเข้างานไม่สำเร็จ"),
      );
    },
  });
}

export function useSelfCheckOutMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateMyAttendance();

  return useMutation({
    mutationFn: () => selfCheckOut(getAccessToken()),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกเวลาออกงานแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ลงเวลาออกงานไม่สำเร็จ"),
      );
    },
  });
}
