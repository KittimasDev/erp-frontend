"use client";

import { useState } from "react";
import { Alert, Input, Modal, Typography } from "antd";

import { ApiError } from "@/lib/api/client";
import { useReviewLabSampleMutation } from "@/hooks/laboratory/useLaboratoryQuery";
import { useT } from "@/lib/i18n/useT";
import type { LabSample } from "@/types/laboratory";

type Props = {
  sample: LabSample;
  action: "approve" | "reject";
  onClose: () => void;
};

/**
 * อนุมัติ/ตีกลับผลตรวจ พร้อมลายเซ็นอิเล็กทรอนิกส์ (M8.5) — หน้าต่างยืนยันตัวตนกลางเด้งเองจาก apiFetch เมื่อ backend ขอ (E-Signature)
 * มีพารามิเตอร์ FAIL แล้วอนุมัติ → ต้องใส่เหตุผล (M8.3)
 */
export default function LabSignModal({ sample, action, onClose }: Props) {
  const t = useT();
  const review = useReviewLabSampleMutation(sample.id);
  const [remark, setRemark] = useState("");
  const [failReason, setFailReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approve = action === "approve";
  const fails = (sample.results ?? []).filter((r) => r.judgement === "FAIL");
  const needFailReason = approve && fails.length > 0;
  const ready = !needFailReason || failReason.trim().length > 0;

  const submit = () =>
    review.mutate(
      {
        action,
        body: {
          remark: remark.trim() || undefined,
          failReason: needFailReason ? failReason.trim() : undefined,
        },
      },
      {
        onSuccess: onClose,
        onError: (e) =>
          setError(e instanceof ApiError ? e.message : t("ดำเนินการไม่สำเร็จ")),
      },
    );

  return (
    <Modal
      open
      title={
        approve
          ? t("อนุมัติผลตรวจ (ลงลายเซ็นอิเล็กทรอนิกส์)")
          : t("ตีกลับผลตรวจ (ลงลายเซ็นอิเล็กทรอนิกส์)")
      }
      okText={approve ? t("อนุมัติและออก COA") : t("ตีกลับผลตรวจ")}
      okButtonProps={{ danger: !approve, disabled: !ready }}
      cancelText={t("ยกเลิก")}
      confirmLoading={review.isPending}
      onCancel={onClose}
      onOk={submit}
    >
      <Typography.Paragraph type="secondary">
        {t("ตัวอย่าง {no} · ผลตรวจ {n} รายการ", {
          no: sample.sampleNo,
          n: sample.results?.length ?? 0,
        })}
        {approve
          ? t(" — อนุมัติแล้วระบบออกเลขที่ COA และปล่อย Lot ที่รอ QC ให้อัตโนมัติ")
          : t(" — ตีกลับแล้ว Lot ที่รอ QC จะถูกปฏิเสธ (ยอดถูก Block)")}
      </Typography.Paragraph>

      {needFailReason ? (
        <>
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 8 }}
            title={t("มี {n} พารามิเตอร์ไม่ผ่านเกณฑ์: {names}", {
              n: fails.length,
              names: fails.map((r) => r.parameterName).join(", "),
            })}
          />
          <Typography.Text strong>
            {t("เหตุผลที่อนุมัติทั้งที่ไม่ผ่านเกณฑ์ (บังคับ)")}
          </Typography.Text>
          <Input.TextArea
            rows={2}
            maxLength={2000}
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            style={{ marginBottom: 12 }}
          />
        </>
      ) : null}

      <Typography.Text strong>{t("หมายเหตุ")}</Typography.Text>
      <Input.TextArea
        rows={2}
        maxLength={2000}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {error ? (
        <Alert type="error" showIcon style={{ marginTop: 8 }} title={error} />
      ) : null}
    </Modal>
  );
}
