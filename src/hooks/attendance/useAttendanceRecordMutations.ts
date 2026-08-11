"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  createAttendanceRecord,
  updateAttendanceRecord,
} from "@/lib/api/attendance";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateAttendanceRecordRequest,
  UpdateAttendanceRecordRequest,
} from "@/types/attendance";

function useInvalidateAttendance() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["attendance"] });
  };
}

function errorMessage(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCreateAttendanceRecordMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateAttendance();

  return useMutation({
    mutationFn: (body: CreateAttendanceRecordRequest) =>
      createAttendanceRecord(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกเวลาให้พนักงานแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "บันทึกเวลาไม่สำเร็จ"));
    },
  });
}

export function useUpdateAttendanceRecordMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateAttendance();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateAttendanceRecordRequest;
    }) => updateAttendanceRecord(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "แก้ไขบันทึกเวลาแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "แก้ไขบันทึกเวลาไม่สำเร็จ"));
    },
  });
}
