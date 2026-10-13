"use client";

import { useState } from "react";
import { Alert, Input, Modal, Typography } from "antd";

import { ApiError } from "@/lib/api/client";
import { useReviewLabSampleMutation } from "@/hooks/laboratory/useLaboratoryQuery";
import type { LabSample } from "@/types/laboratory";

type Props = {
  sample: LabSample;
  action: "approve" | "reject";
  onClose: () => void;
};

/**
 * อนุมัติ/ตีกลับผลตรวจ พร้อมลายเซ็นอิเล็กทรอนิกส์ (M8.5) — ยืนยันด้วยรหัสผ่านของผู้ใช้ที่ล็อกอินอยู่
 * มีพารามิเตอร์ FAIL แล้วอนุมัติ → ต้องใส่เหตุผล (M8.3) · รหัสผ่านไม่ถูกเก็บ ไม่ส่งไปที่อื่น
 */
export default function LabSignModal({ sample, action, onClose }: Props) {
  const review = useReviewLabSampleMutation(sample.id);
  const [password, setPassword] = useState("");
  const [remark, setRemark] = useState("");
  const [failReason, setFailReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approve = action === "approve";
  const fails = (sample.results ?? []).filter((r) => r.judgement === "FAIL");
  const needFailReason = approve && fails.length > 0;
  const ready =
    password.length > 0 && (!needFailReason || failReason.trim().length > 0);

  const submit = () =>
    review.mutate(
      {
        action,
        body: {
          password,
          remark: remark.trim() || undefined,
          failReason: needFailReason ? failReason.trim() : undefined,
        },
      },
      {
        onSuccess: onClose,
        onError: (e) =>
          setError(e instanceof ApiError ? e.message : "ดำเนินการไม่สำเร็จ"),
      },
    );

  return (
    <Modal
      open
      title={
        approve
          ? "อนุมัติผลตรวจ (ลงลายเซ็นอิเล็กทรอนิกส์)"
          : "ตีกลับผลตรวจ (ลงลายเซ็นอิเล็กทรอนิกส์)"
      }
      okText={approve ? "อนุมัติและออก COA" : "ตีกลับผลตรวจ"}
      okButtonProps={{ danger: !approve, disabled: !ready }}
      cancelText="ยกเลิก"
      confirmLoading={review.isPending}
      onCancel={onClose}
      onOk={submit}
    >
      <Typography.Paragraph type="secondary">
        ตัวอย่าง {sample.sampleNo} · ผลตรวจ {sample.results?.length ?? 0} รายการ
        {approve
          ? " — อนุมัติแล้วระบบออกเลขที่ COA และปล่อย Lot ที่รอ QC ให้อัตโนมัติ"
          : " — ตีกลับแล้ว Lot ที่รอ QC จะถูกปฏิเสธ (ยอดถูก Block)"}
      </Typography.Paragraph>

      {needFailReason ? (
        <>
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 8 }}
            title={`มี ${fails.length} พารามิเตอร์ไม่ผ่านเกณฑ์: ${fails.map((r) => r.parameterName).join(", ")}`}
          />
          <Typography.Text strong>
            เหตุผลที่อนุมัติทั้งที่ไม่ผ่านเกณฑ์ (บังคับ)
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

      <Typography.Text strong>หมายเหตุ</Typography.Text>
      <Input.TextArea
        rows={2}
        maxLength={2000}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      <Typography.Text strong>ยืนยันด้วยรหัสผ่านของคุณ</Typography.Text>
      <Input.Password
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(null);
        }}
        onPressEnter={() => ready && !review.isPending && submit()}
      />
      {error ? (
        <Alert type="error" showIcon style={{ marginTop: 8 }} title={error} />
      ) : null}
    </Modal>
  );
}
