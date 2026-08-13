"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  bulkCreateShiftSchedules,
  createShift,
  createShiftSchedule,
  deleteShiftSchedule,
  markWorkCalendarHoliday,
  removeShiftScheduleMember,
  removeWorkCalendarHoliday,
  setShiftScheduleMembers,
  updateShift,
  updateShiftSchedule,
} from "@/lib/api/shifts";
import { getAccessToken } from "@/lib/auth/token";
import type {
  BulkCreateShiftSchedulesRequest,
  CreateShiftRequest,
  CreateShiftScheduleRequest,
  CreateWorkCalendarDayRequest,
  UpdateShiftRequest,
  UpdateShiftScheduleRequest,
} from "@/types/shifts";

/** ปฏิทิน/รายละเอียดรอบกะ/กะของพนักงาน ใช้ prefix `shifts` ร่วมกัน — ล้างทีเดียว */
function useInvalidateShifts() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["shifts"] });
    // สถานะลงเวลาของพนักงานโชว์กะวันนี้อยู่ด้วย
    void queryClient.invalidateQueries({ queryKey: ["attendance"] });
  };
}

function errorMessage(error: Error, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

/* ---------- กะมาตรฐาน ---------- */

export function useCreateShiftMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: CreateShiftRequest) =>
      createShift(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "สร้างกะไม่สำเร็จ"));
    },
  });
}

export function useUpdateShiftMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateShiftRequest }) =>
      updateShift(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "แก้ไขกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "แก้ไขกะไม่สำเร็จ"));
    },
  });
}

/* ---------- รอบกะรายวัน ---------- */

export function useCreateShiftScheduleMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: CreateShiftScheduleRequest) =>
      createShiftSchedule(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "จัดรอบกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "จัดรอบกะไม่สำเร็จ"));
    },
  });
}

export function useUpdateShiftScheduleMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateShiftScheduleRequest;
    }) => updateShiftSchedule(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "แก้ไขรอบกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "แก้ไขรอบกะไม่สำเร็จ"));
    },
  });
}

export function useDeleteShiftScheduleMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (id: string) => deleteShiftSchedule(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ลบรอบกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ลบรอบกะไม่สำเร็จ"));
    },
  });
}

export function useSetShiftScheduleMembersMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
      setShiftScheduleMembers(getAccessToken(), id, userIds),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกรายชื่อในกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "บันทึกรายชื่อไม่สำเร็จ"));
    },
  });
}

export function useRemoveShiftScheduleMemberMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      removeShiftScheduleMember(getAccessToken(), id, userId),
    onSuccess: (res) => {
      message.success(res.message || "เอาพนักงานออกจากกะแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "เอาพนักงานออกจากกะไม่สำเร็จ"));
    },
  });
}

export function useBulkCreateShiftSchedulesMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: BulkCreateShiftSchedulesRequest) =>
      bulkCreateShiftSchedules(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "ลงกะเป็นช่วงแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ลงกะเป็นช่วงไม่สำเร็จ"));
    },
  });
}

/* ---------- วันหยุด / วันซ่อมเครื่อง ---------- */

export function useMarkHolidayMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: CreateWorkCalendarDayRequest) =>
      markWorkCalendarHoliday(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกวันหยุดแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "บันทึกวันหยุดไม่สำเร็จ"));
    },
  });
}

export function useRemoveHolidayMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (id: string) => removeWorkCalendarHoliday(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกวันหยุดแล้ว");
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, "ยกเลิกวันหยุดไม่สำเร็จ"));
    },
  });
}
