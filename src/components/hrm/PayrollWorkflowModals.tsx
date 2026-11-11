"use client";

import { useState } from "react";
import { Alert, Checkbox, Input, Modal, Space, Spin, Typography } from "antd";

import { usePayrollChecksQuery, useSubmitPayrollMutation } from "@/hooks/payroll/usePayroll";
import { checkFailureFromError } from "@/lib/api/payroll";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import { useT } from "@/lib/i18n/useT";
import type { PayrollCheckItem } from "@/types/payroll";

import { userSetupHref } from "./PayrollPayBaseIssuesModal";

type ReasonModalProps = {
  open: boolean;
  title: string;
  okText: string;
  /** ปุ่มยืนยันเป็นสีแดง (ยกเลิก) */
  danger?: boolean;
  /** ข้อความอธิบายผลกระทบเหนือช่องเหตุผล */
  notice?: React.ReactNode;
  placeholder: string;
  loading?: boolean;
  onOk: (reason: string) => Promise<unknown>;
  onClose: () => void;
};

/** Modal กรอกเหตุผล (บังคับ) — ใช้กับ ส่งกลับแก้ไข / ถอนกลับเป็นร่าง / ยกเลิกงวด */
export function ReasonModal({ open, title, okText, danger, notice, placeholder, loading, onOk, onClose }: ReasonModalProps) {
  const t = useT();
  const [reason, setReason] = useState("");
  const close = () => {
    setReason("");
    onClose();
  };
  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      okButtonProps={{ danger, disabled: !reason.trim() }}
      cancelText={t("ปิดหน้าต่าง")}
      confirmLoading={loading}
      onCancel={close}
      onOk={() => {
        void onOk(reason.trim()).then(close, () => undefined);
      }}
      destroyOnHidden
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        {notice}
        <Input.TextArea
          rows={3}
          maxLength={2000}
          showCount
          placeholder={placeholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label={placeholder}
        />
      </Space>
    </Modal>
  );
}

function CheckList({ items, type }: { items: PayrollCheckItem[]; type: "error" | "warning" }) {
  const t = useT();
  // ผู้ใช้ที่เห็นหน้า payroll อาจไม่มีสิทธิ์หน้า /users — ปิดลิงก์ไปตั้งค่าพนักงาน
  const canSetup = isAdministrator() || canAccessScreen("USERS");
  return (
    <Alert
      type={type}
      showIcon
      style={{ marginBottom: 12 }}
      title={
        type === "error"
          ? t("ส่งอนุมัติไม่ได้ — ต้องแก้ {n} ข้อ", { n: items.length })
          : t("มี {n} คำเตือน — ตรวจแล้วต้องรับทราบพร้อมเหตุผล", { n: items.length })
      }
      description={
        <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 240, overflowY: "auto" }}>
          {items.map((item, index) => (
            <li key={`${item.code}-${item.userId ?? index}`}>
              {item.message}
              {item.code === "PAY_BASE_MISSING" && item.userId && canSetup ? (
                <>
                  {" "}
                  <a href={userSetupHref(item.userId)} target="_blank" rel="noreferrer">
                    {t("ตั้งค่าข้อมูลพนักงาน")}
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      }
    />
  );
}

type ChecksModalProps = { open: boolean; runId?: string; onClose: () => void };

/**
 * ตรวจงวดก่อนส่งอนุมัติ: ฐานค่าจ้าง/ข้อมูลพนักงานเปลี่ยนหลังคำนวณ/ยอดติดลบหรือ 0/งวดซ้ำ = แก้ก่อน (ส่งไม่ได้)
 * คำเตือน (ยอดผิดปกติ/OT คิดเงินไม่ได้/งวดไม่เต็มเดือน) = ต้องติ๊กรับทราบและใส่เหตุผลจึงส่งได้
 */
export function PayrollChecksModal({ open, runId, onClose }: ChecksModalProps) {
  const t = useT();
  const checks = usePayrollChecksQuery(runId, open);
  const submit = useSubmitPayrollMutation();
  const [ack, setAck] = useState(false);
  const [note, setNote] = useState("");
  const data = checks.data?.data;
  const needsAck = Boolean(data?.requiresAcknowledgement);
  const canSubmit = Boolean(data?.ok) && (!needsAck || (ack && note.trim().length > 0));

  const close = () => {
    setAck(false);
    setNote("");
    onClose();
  };

  const send = async () => {
    if (!runId) return;
    try {
      await submit.mutateAsync({ id: runId, acknowledgeWarnings: needsAck ? ack : undefined, note: note.trim() || undefined });
      close();
    } catch (error) {
      // backend ตรวจซ้ำแล้วพบสิ่งที่เปลี่ยนไป → แสดงผลตรวจล่าสุด
      if (checkFailureFromError(error)) void checks.refetch();
    }
  };

  return (
    <Modal
      open={open}
      title={t("ตรวจงวดก่อนส่งอนุมัติ")}
      okText={t("ส่งอนุมัติ")}
      cancelText={t("ปิดหน้าต่าง")}
      okButtonProps={{ disabled: !canSubmit }}
      confirmLoading={submit.isPending}
      onCancel={close}
      onOk={() => void send()}
      width={640}
      destroyOnHidden
    >
      {checks.isLoading ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : null}
      {checks.error ? (
        <Alert
          type="error"
          showIcon
          title={checks.error instanceof Error ? checks.error.message : t("ตรวจงวดไม่สำเร็จ")}
        />
      ) : null}
      {data ? (
        <>
          {data.errors.length > 0 ? <CheckList items={data.errors} type="error" /> : null}
          {data.warnings.length > 0 ? <CheckList items={data.warnings} type="warning" /> : null}
          {data.ok && data.warnings.length === 0 ? (
            <Alert type="success" showIcon title={t("ตรวจผ่านทุกข้อ — พร้อมส่งอนุมัติ")} style={{ marginBottom: 12 }} />
          ) : null}
          {data.ok && needsAck ? (
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              <Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)}>
                {t("ตรวจแล้วและรับทราบคำเตือนทั้งหมด")}
              </Checkbox>
              <Input.TextArea
                rows={2}
                maxLength={2000}
                placeholder={t("เหตุผลที่รับทราบ (บังคับ) เช่น ตรวจยอด OT แล้วถูกต้อง")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Space>
          ) : null}
          {data.ok && !needsAck ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("ส่งอนุมัติแล้วจะแก้รายการปรับ/คำนวณใหม่ไม่ได้ จนกว่าผู้อนุมัติจะส่งกลับ")}
            </Typography.Text>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
