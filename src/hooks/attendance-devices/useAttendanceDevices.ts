"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";

import { ApiError } from "@/lib/api/client";
import {
  createAttendanceDevice,
  getAttendanceDeviceEvents,
  getAttendanceDevices,
  rotateAttendanceDeviceKey,
  updateAttendanceDevice,
} from "@/lib/api/attendance-devices";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateAttendanceDeviceRequest,
  UpdateAttendanceDeviceRequest,
} from "@/types/attendance-devices";

export const attendanceDevicesKey = ["attendance-devices"] as const;

export function useAttendanceDevicesQuery() {
  return useQuery({
    queryKey: attendanceDevicesKey,
    queryFn: () => getAttendanceDevices(getAccessToken()),
  });
}

export function useAttendanceDeviceEventsQuery(status?: string) {
  return useQuery({
    queryKey: [...attendanceDevicesKey, "events", status ?? ""],
    queryFn: () => getAttendanceDeviceEvents(getAccessToken(), status),
    refetchInterval: 30_000,
  });
}

function useDeviceMutation<TVars, TRes extends { message: string }>(
  fn: (vars: TVars) => Promise<TRes>,
  fallbackError: string,
) {
  const { message } = App.useApp();
  const t = useT();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceDevicesKey });
    },
    onError: (error: Error) => {
      message.error(error instanceof ApiError ? error.message : t(fallbackError));
    },
  });
}

export function useCreateAttendanceDeviceMutation() {
  return useDeviceMutation(
    (body: CreateAttendanceDeviceRequest) => createAttendanceDevice(getAccessToken(), body),
    "ลงทะเบียนเครื่องไม่สำเร็จ",
  );
}

export function useUpdateAttendanceDeviceMutation() {
  return useDeviceMutation(
    (v: { id: string; body: UpdateAttendanceDeviceRequest }) =>
      updateAttendanceDevice(getAccessToken(), v.id, v.body),
    "บันทึกเครื่องไม่สำเร็จ",
  );
}

export function useRotateAttendanceDeviceKeyMutation() {
  return useDeviceMutation(
    (id: string) => rotateAttendanceDeviceKey(getAccessToken(), id),
    "ออก key ใหม่ไม่สำเร็จ",
  );
}
