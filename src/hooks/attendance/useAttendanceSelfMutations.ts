"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

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
  const invalidate = useInvalidateMyAttendance();

  return useMutation({
    mutationFn: (remark?: string) => selfCheckIn(getAccessToken(), remark),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกเวลาเข้างานแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลงเวลาเข้างานไม่สำเร็จ",
      );
    },
  });
}

export function useSelfCheckOutMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateMyAttendance();

  return useMutation({
    mutationFn: () => selfCheckOut(getAccessToken()),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกเวลาออกงานแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ลงเวลาออกงานไม่สำเร็จ",
      );
    },
  });
}
