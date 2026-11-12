"use client";

import { Input, Modal, Typography } from "antd";
import { useState, type ReactNode } from "react";

import { useT } from "@/lib/i18n/useT";
import { MIN_CANCEL_REASON_LENGTH } from "@/types/cancel-info";

type Props = {
  open: boolean;
  /** เช่น "ยืนยันยกเลิกใบขอซื้อ PR-001" */
  title: ReactNode;
  /** เนื้อหาเหนือช่องเหตุผล เช่น รายการเอกสารที่ผูกอยู่/คำเตือน */
  children?: ReactNode;
  okText?: string;
  confirmLoading?: boolean;
  /** true = ปิดปุ่มยืนยัน (เช่น มีเอกสารที่ทำให้ยกเลิกไม่ได้) และซ่อนช่องเหตุผล */
  blocked?: boolean;
  onClose: () => void;
  /** เรียกเมื่อกดยืนยัน — เหตุผลถูก trim แล้ว และยาวอย่างน้อย MIN_CANCEL_REASON_LENGTH */
  onConfirm: (reason: string) => Promise<unknown> | void;
};

/**
 * Modal กลางสำหรับยกเลิกเอกสารฝั่งจัดซื้อ (PR / PO / GRN / คิวรอสร้าง PV)
 * แทน Confirm Dialog เดิม — บังคับกรอกเหตุผลอย่างน้อย 5 ตัวอักษร ทุกสถานะ
 * ตรวจที่ backend ซ้ำเสมอ (ห้ามพึ่งฝั่งนี้เพียงอย่างเดียว)
 */
export default function CancelReasonModal({
  open,
  title,
  children,
  okText,
  confirmLoading,
  blocked = false,
  onClose,
  onConfirm,
}: Props) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_CANCEL_REASON_LENGTH;
  const okDisabled = blocked || tooShort;

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      afterClose={() => {
        setReason("");
        setTouched(false);
      }}
      okText={okText ?? t("ยืนยันยกเลิก")}
      cancelText={t("ปิด")}
      okButtonProps={{ danger: true, disabled: okDisabled }}
      confirmLoading={confirmLoading}
      onOk={async () => {
        setTouched(true);
        if (okDisabled) return;
        await onConfirm(trimmed);
      }}
      destroyOnHidden
    >
      {children}
      {blocked ? null : (
        <>
          <Typography.Text strong>
            {t("เหตุผลการยกเลิก")} <span style={{ color: "#cf1322" }}>*</span>
          </Typography.Text>
          <Input.TextArea
            rows={3}
            maxLength={2000}
            showCount
            style={{ marginTop: 4 }}
            status={touched && tooShort ? "error" : undefined}
            placeholder={t("ระบุเหตุผลการยกเลิก (อย่างน้อย 5 ตัวอักษร)")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          {touched && tooShort ? (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              {t("กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร")}
            </Typography.Text>
          ) : null}
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            {t("ระบบบันทึกเหตุผล ผู้ยกเลิก และวันเวลาไว้ในประวัติการใช้งาน")}
          </Typography.Paragraph>
        </>
      )}
    </Modal>
  );
}
