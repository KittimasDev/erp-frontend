"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  applyShiftAutoPlan,
  bulkCreateShiftSchedules,
  createShift,
  createShiftSchedule,
  deleteShiftSchedule,
  markWorkCalendarHoliday,
  previewShiftAutoPlan,
  removeShiftScheduleMember,
  removeWorkCalendarHoliday,
  setShiftScheduleMembers,
  updateShift,
  updateShiftPlanCycle,
  updateShiftSchedule,
} from "@/lib/api/shifts";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import type {
  BulkCreateShiftSchedulesRequest,
  CreateShiftRequest,
  CreateShiftScheduleRequest,
  CreateWorkCalendarDayRequest,
  ShiftAutoPlanApplyRequest,
  ShiftAutoPlanRequest,
  UpdateShiftPlanCycleRequest,
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

/** ตั้งวันเริ่มรอบ/จำนวนวันต่อรอบ — ไม่กระทบรอบกะที่จัดไว้แล้ว */
export function useUpdateShiftPlanCycleMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: UpdateShiftPlanCycleRequest) =>
      updateShiftPlanCycle(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกรอบวางกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("บันทึกรอบวางกะไม่สำเร็จ")));
    },
  });
}

/* ---------- กะมาตรฐาน ---------- */

export function useCreateShiftMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: CreateShiftRequest) =>
      createShift(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("สร้างกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("สร้างกะไม่สำเร็จ")));
    },
  });
}

export function useUpdateShiftMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateShiftRequest }) =>
      updateShift(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("แก้ไขกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("แก้ไขกะไม่สำเร็จ")));
    },
  });
}

/* ---------- รอบกะรายวัน ---------- */

export function useCreateShiftScheduleMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: CreateShiftScheduleRequest) =>
      createShiftSchedule(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("จัดรอบกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("จัดรอบกะไม่สำเร็จ")));
    },
  });
}

export function useUpdateShiftScheduleMutation() {
  const { message } = App.useApp();
  const t = useT();
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
      message.success(res.message || t("แก้ไขรอบกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("แก้ไขรอบกะไม่สำเร็จ")));
    },
  });
}

export function useDeleteShiftScheduleMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (id: string) => deleteShiftSchedule(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ลบรอบกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ลบรอบกะไม่สำเร็จ")));
    },
  });
}

export function useSetShiftScheduleMembersMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
      setShiftScheduleMembers(getAccessToken(), id, userIds),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกรายชื่อในกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("บันทึกรายชื่อไม่สำเร็จ")));
    },
  });
}

export function useRemoveShiftScheduleMemberMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      removeShiftScheduleMember(getAccessToken(), id, userId),
    onSuccess: (res) => {
      message.success(res.message || t("เอาพนักงานออกจากกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("เอาพนักงานออกจากกะไม่สำเร็จ")));
    },
  });
}

export function useBulkCreateShiftSchedulesMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: BulkCreateShiftSchedulesRequest) =>
      bulkCreateShiftSchedules(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("ลงกะเป็นช่วงแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ลงกะเป็นช่วงไม่สำเร็จ")));
    },
  });
}

/* ---------- จัดตารางกะรายเดือนอัตโนมัติ ---------- */

/**
 * ดูตัวอย่างตารางที่จัดให้ — เป็น mutation ไม่ใช่ query เพราะ body ใหญ่และผู้ใช้กดเอง
 * ไม่ล้าง cache เพราะยังไม่ได้เขียนอะไรลงระบบ
 */
export function useShiftAutoPlanPreviewMutation() {
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (body: ShiftAutoPlanRequest) =>
      previewShiftAutoPlan(getAccessToken(), body),
    onError: (error: Error) => {
      message.error(errorMessage(error, t("คำนวณตารางกะไม่สำเร็จ")));
    },
  });
}

export function useApplyShiftAutoPlanMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: ShiftAutoPlanApplyRequest) =>
      applyShiftAutoPlan(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกตารางกะแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("บันทึกตารางกะไม่สำเร็จ")));
    },
  });
}

/* ---------- วันหยุด / วันซ่อมเครื่อง ---------- */

export function useMarkHolidayMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (body: CreateWorkCalendarDayRequest) =>
      markWorkCalendarHoliday(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกวันหยุดแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("บันทึกวันหยุดไม่สำเร็จ")));
    },
  });
}

export function useRemoveHolidayMutation() {
  const { message } = App.useApp();
  const t = useT();
  const invalidate = useInvalidateShifts();

  return useMutation({
    mutationFn: (id: string) => removeWorkCalendarHoliday(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || t("ยกเลิกวันหยุดแล้ว"));
      invalidate();
    },
    onError: (error: Error) => {
      message.error(errorMessage(error, t("ยกเลิกวันหยุดไม่สำเร็จ")));
    },
  });
}
