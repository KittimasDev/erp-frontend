"use client";

import { useState } from "react";
import { Input, Modal } from "antd";

import { useT } from "@/lib/i18n/useT";

export type ApprovalReasonKind = "reject" | "return";

type Props = {
  open: boolean;
  kind: ApprovalReasonKind;
  /** เลขที่เอกสาร — แสดงใต้หัวข้อ */
  docNo?: string;
  titles: { reject: string; return: string };
  loading?: boolean;
  /** คืน Promise — modal ปิดเมื่อสำเร็จ · error ให้ผู้เรียกจัดการ (modal ค้างไว้ให้ลองใหม่) */
  onConfirm: (reason: string) => Promise<unknown> | void;
  onCancel: () => void;
};

/**
 * เหตุผลของ ไม่อนุมัติ / ส่งกลับแก้ไข — **บังคับ** (ต่างจาก PR/PO ที่ optional)
 * ปุ่มยืนยันกดไม่ได้จนกว่าจะมีเหตุผล · backend ตรวจซ้ำ (400 ถ้าว่าง)
 */
export default function ApprovalReasonModal({
  open,
  kind,
  docNo,
  titles,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const [reason, setReason] = useState("");

  const trimmed = reason.trim();
  const reject = kind === "reject";

  return (
    <Modal
      // เปิดใหม่ (หรือสลับ ไม่อนุมัติ/ส่งกลับ) ต้องเริ่มจากช่องว่าง — ล้างตอนปิดหลังแอนิเมชันจบ
      afterOpenChange={(visible) => {
        if (!visible) setReason("");
      }}
      open={open}
      title={reject ? titles.reject : titles.return}
      okText={reject ? t("ไม่อนุมัติ") : t("ส่งกลับแก้ไข")}
      cancelText={t("ยกเลิก")}
      okButtonProps={{ danger: reject, disabled: trimmed.length === 0 }}
      confirmLoading={loading}
      maskClosable={false}
      destroyOnHidden
      onCancel={onCancel}
      onOk={async () => {
        if (!trimmed) return;
        try {
          await onConfirm(trimmed);
        } catch {
          // ผู้เรียกแจ้ง error แล้ว — ค้าง modal ไว้ให้แก้เหตุผล/ลองใหม่
        }
      }}
    >
      {docNo ? (
        <p style={{ marginTop: 0, color: "#8a9199" }}>
          {t("เอกสารเลขที่ {no}", { no: docNo })}
        </p>
      ) : null}
      <Input.TextArea
        rows={4}
        maxLength={2000}
        showCount
        autoFocus
        status={trimmed.length === 0 && reason.length > 0 ? "error" : undefined}
        placeholder={
          reject
            ? t("เหตุผลที่ไม่อนุมัติ (บังคับ)")
            : t("สิ่งที่ต้องแก้ไข (บังคับ)")
        }
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
}
