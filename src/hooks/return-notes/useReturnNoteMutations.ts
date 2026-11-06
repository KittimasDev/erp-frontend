"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveReturnNote,
  confirmReturnInspection,
  createReturnNote,
  rejectReturnNote,
  saveReturnInspectionLine,
} from "@/lib/api/return-notes";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ApproveReturnNoteBody,
  CreateReturnNoteBody,
  RejectReturnNoteBody,
  SaveReturnInspectionLineBody,
} from "@/types/return-notes";
import { returnNotesQueryKey } from "./useReturnNotesQuery";
import { useT } from "@/lib/i18n/useT";

export function useCreateReturnNoteMutation() {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (body: CreateReturnNoteBody) =>
      createReturnNote(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกใบคืนสินค้าสำเร็จ"));
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("บันทึกใบคืนสินค้าไม่สำเร็จ"));
    },
  });
}

export function useApproveReturnNoteMutation() {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ApproveReturnNoteBody }) =>
      approveReturnNote(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("อนุมัติใบคืนสินค้าแล้ว"));
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("อนุมัติไม่สำเร็จ"));
    },
  });
}

export function useRejectReturnNoteMutation() {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RejectReturnNoteBody }) =>
      rejectReturnNote(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || t("ไม่อนุมัติใบคืนสินค้าแล้ว"));
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("ไม่อนุมัติไม่สำเร็จ"));
    },
  });
}

export function useSaveInspectionLineMutation(noteId: string) {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      itemId,
      body,
    }: {
      itemId: string;
      body: SaveReturnInspectionLineBody;
    }) => saveReturnInspectionLine(getAccessToken(), noteId, itemId, body),
    onSuccess: (res) => {
      message.success(res.message || t("บันทึกผลการคัดแยกแล้ว"));
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("บันทึกผลการคัดแยกไม่สำเร็จ"));
    },
  });
}

export function useConfirmInspectionMutation(noteId: string) {
  const t = useT();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: () => confirmReturnInspection(getAccessToken(), noteId),
    onSuccess: (res) => {
      message.success(res.message || t("ยืนยันผลการตรวจแล้ว"));
      void queryClient.invalidateQueries({ queryKey: returnNotesQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || t("ยืนยันผลการตรวจไม่สำเร็จ"));
    },
  });
}
