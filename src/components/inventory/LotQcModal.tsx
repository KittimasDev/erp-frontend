"use client";

import { useState } from "react";
import { Alert, App, Button, Input, Modal, Tag, Typography } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import { useT } from "@/lib/i18n/useT";
import { ApiError } from "@/lib/api/client";
import { apiFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import { DOCUMENT_TYPE_LOT_COA } from "@/types/chemicals";

type Props = {
  lot: {
    lotId: string;
    lotNo: string;
    itemCode: string;
    itemNameTh: string;
    qcStatus?: string;
    coaReference?: string;
  };
  onClose: () => void;
};

const QC_LABEL: Record<string, string> = {
  PENDING: "รอตรวจ QC",
  HOLD: "พักไว้",
  APPROVED: "QC ผ่าน",
  REJECTED: "QC ไม่ผ่าน",
};

const BASE = "/api/inventory/lots";

/** ตัดสิน QC ของ Lot + เลขอ้างอิง/ไฟล์ COA — Lot ผลผลิต FG ต้องผ่านขั้นนี้ก่อนส่งมอบลูกค้า (M10.1/M10.4/M10.7) */
export default function LotQcModal({ lot, onClose }: Props) {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [reference, setReference] = useState(lot.coaReference ?? "");
  const [reason, setReason] = useState("");
  const decidable = lot.qcStatus === "PENDING" || lot.qcStatus === "HOLD";
  const holdable = lot.qcStatus === "APPROVED";

  const done = (text: string) => {
    message.success(text);
    void queryClient.invalidateQueries();
  };
  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);

  const saveRef = useMutation({
    mutationFn: () =>
      apiFetch(`${BASE}/${lot.lotId}/coa-reference`, {
        method: "PUT",
        token: getAccessToken(),
        body: { coaReference: reference.trim() },
      }),
    onSuccess: () => done(t("บันทึกเลขอ้างอิง COA แล้ว")),
    onError: (e) => fail(e, t("บันทึกเลขอ้างอิง COA ไม่สำเร็จ")),
  });
  const approve = useMutation({
    mutationFn: () =>
      apiFetch(`${BASE}/${lot.lotId}/qc-approve`, {
        method: "POST",
        token: getAccessToken(),
        body: { coaReference: reference.trim() || undefined },
      }),
    onSuccess: () => {
      done(t("อนุมัติ QC ของ Lot แล้ว"));
      onClose();
    },
    onError: (e) => fail(e, t("อนุมัติ QC ไม่สำเร็จ")),
  });
  const hold = useMutation({
    mutationFn: () =>
      apiFetch(`${BASE}/${lot.lotId}/qc-hold`, {
        method: "POST",
        token: getAccessToken(),
        body: { reason: reason.trim() },
      }),
    onSuccess: () => {
      done(t("พัก Lot ไว้แล้ว (ยอดถูกกันออกจากยอดพร้อมใช้)"));
      onClose();
    },
    onError: (e) => fail(e, t("พัก Lot ไม่สำเร็จ")),
  });
  const reject = useMutation({
    mutationFn: () =>
      apiFetch(`${BASE}/${lot.lotId}/qc-reject`, {
        method: "POST",
        token: getAccessToken(),
        body: { reason: reason.trim() },
      }),
    onSuccess: () => {
      done(t("ปฏิเสธ QC ของ Lot แล้ว"));
      onClose();
    },
    onError: (e) => fail(e, t("ปฏิเสธ QC ไม่สำเร็จ")),
  });

  return (
    <Modal
      open
      width={600}
      title={`QC / COA — Lot ${lot.lotNo}`}
      onCancel={onClose}
      footer={
        decidable ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button
              danger
              loading={reject.isPending}
              disabled={!reason.trim()}
              title={!reason.trim() ? t("ใส่เหตุผลก่อนปฏิเสธ") : undefined}
              onClick={() => reject.mutate()}
            >
              {t("QC ไม่ผ่าน")}
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={onClose}>{t("ปิด")}</Button>
              <Button type="primary" loading={approve.isPending} onClick={() => approve.mutate()}>
                {t("อนุมัติ QC")}
              </Button>
            </div>
          </div>
        ) : holdable ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button
              danger
              loading={hold.isPending}
              disabled={!reason.trim()}
              title={!reason.trim() ? t("ใส่เหตุผลก่อนพัก Lot") : undefined}
              onClick={() => hold.mutate()}
            >
              {t("พักไว้ (Hold)")}
            </Button>
            <Button onClick={onClose}>{t("ปิด")}</Button>
          </div>
        ) : (
          <Button onClick={onClose}>{t("ปิด")}</Button>
        )
      }
    >
      <p style={{ marginTop: 0 }}>
        {lot.itemCode} — {lot.itemNameTh} · <Tag>{QC_LABEL[lot.qcStatus ?? ""] ? t(QC_LABEL[lot.qcStatus ?? ""]) : lot.qcStatus ?? "—"}</Tag>
      </p>

      <Typography.Text strong>{t("เลขอ้างอิง COA")}</Typography.Text>
      <div style={{ display: "flex", gap: 8, margin: "4px 0 12px" }}>
        <Input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          maxLength={100}
          placeholder={t("เช่น COA-2026-0123")}
        />
        <Button
          loading={saveRef.isPending}
          disabled={!reference.trim() || reference.trim() === (lot.coaReference ?? "")}
          onClick={() => saveRef.mutate()}
        >
          {t("บันทึกเลข")}
        </Button>
      </div>

      <Typography.Text strong>{t("ไฟล์ COA")}</Typography.Text>
      <DocumentAttachmentsPanel
        documentType={DOCUMENT_TYPE_LOT_COA}
        documentId={lot.lotId}
        emptyText={t("ยังไม่ได้แนบไฟล์ COA")}
        uploadLabel={t("แนบไฟล์ COA")}
      />

      {holdable ? (
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong>{t("เหตุผลที่พัก Lot")}</Typography.Text>
          <Input.TextArea rows={2} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      ) : null}

      {decidable ? (
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong>{t("เหตุผล (กรณี QC ไม่ผ่าน)")}</Typography.Text>
          <Input.TextArea rows={2} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} />
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            title={t("Lot ที่ยังไม่ผ่าน QC ยืนยันหยิบ/จ่ายสินค้าให้ลูกค้าไม่ได้ · สินค้าที่ตั้ง “ต้องมี COA” ต้องมีเลขอ้างอิงหรือไฟล์ COA ด้วย")}
          />
        </div>
      ) : null}
    </Modal>
  );
}
