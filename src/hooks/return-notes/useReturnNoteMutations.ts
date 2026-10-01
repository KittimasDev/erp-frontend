"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveReturnNote,
  createReturnNote,
  rejectReturnNote,
} from "@/lib/api/return-notes";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ApproveReturnNoteBody,
  CreateReturnNoteBody,
  RejectReturnNoteBody,
} from "@/types/return-notes";
import { returnNotesQueryKey } from "./useReturnNotesQuery";

export function useCreateReturnNoteMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (body: CreateReturnNoteBody) =>
      createReturnNote(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกใบคืนสินค้าสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "บันทึกใบคืนสินค้าไม่สำเร็จ");
    },
  });
}

export function useApproveReturnNoteMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ApproveReturnNoteBody }) =>
      approveReturnNote(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "อนุมัติใบคืนสินค้าแล้ว");
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "อนุมัติไม่สำเร็จ");
    },
  });
}

export function useRejectReturnNoteMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectReturnNoteBody }) =>
      rejectReturnNote(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "ไม่อนุมัติใบคืนสินค้าแล้ว");
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ไม่อนุมัติไม่สำเร็จ");
    },
  });
}
