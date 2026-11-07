"use client";

import { useState } from "react";
import { Input, Modal } from "antd";

import { useConfirmScheduleRoundMutation } from "@/hooks/production-schedule/useProductionSchedule";
import type { ScheduleRound } from "@/types/production-schedule";

import { useT } from "@/lib/i18n/useT";

import { fmtDate } from "./schedule-dates";

type Props = {
  round: ScheduleRound;
  onClose: () => void;
};

export default function ConfirmProductionRoundModal({ round, onClose }: Props) {
  const t = useT();
  const confirm = useConfirmScheduleRoundMutation();
  const [reason, setReason] = useState("");
  const overdue = round.displayStatus === "OVERDUE";
  const reasonOk = !overdue || reason.trim().length >= 5;

  return (
    <Modal
      open
      title={overdue ? t("ยืนยันรอบเกินกำหนด") : t("ยืนยันรอบการผลิต")}
      okText={t("ยืนยัน")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      confirmLoading={confirm.isPending}
      okButtonProps={{ disabled: !reasonOk }}
      onCancel={onClose}
      onOk={() =>
        confirm.mutate(
          { id: round.id, reason: overdue ? reason.trim() : undefined },
          { onSuccess: onClose },
        )
      }
    >
      <p>
        {t("ยืนยันรอบ {no} ผลิต {from} – {to}", { no: round.roundNo, from: fmtDate(round.startDate), to: fmtDate(round.endDate) })}
      </p>
      <p>{t("หลังยืนยันจะล็อกข้อมูล สร้างรอบผลิต และให้ฝ่ายบุคคลเลือกช่วงวันนี้ไปจัดตารางกะ")}</p>
      {overdue ? (
        <label style={{ display: "grid", gap: 6 }}>
          <span>{t("เหตุผล (กรณีเกินกำหนดยืนยัน)")}</span>
          <Input.TextArea
            aria-label={t("เหตุผลกรณียืนยันเกินกำหนด")}
            value={reason}
            rows={3}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      ) : null}
    </Modal>
  );
}
