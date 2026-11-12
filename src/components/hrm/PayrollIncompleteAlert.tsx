"use client";

import { Alert } from "antd";

import { canAccessScreen } from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import { useT } from "@/lib/i18n/useT";
import type { PayrollIncompleteEmployee } from "@/types/payroll";

import { userSetupHref } from "./PayrollPayBaseIssuesModal";

const MAX_NAMES = 8;

/**
 * เตือนที่แท็บสลิปเงินเดือน: พนักงานที่มียอดต้องจ่ายแต่ข้อมูลไม่ครบ (ตอนนี้ = ธนาคาร/เลขบัญชี)
 * ให้กรอกในข้อมูลพนักงานก่อนส่งอนุมัติ — backend ส่งรายชื่อมากับรายละเอียดงวด (`incompleteEmployees`)
 */
export default function PayrollIncompleteAlert({ employees }: { employees: PayrollIncompleteEmployee[] }) {
  const t = useT();
  const canSetup = isAdministrator() || canAccessScreen("USERS");
  if (employees.length === 0) return null;

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 12 }}
      title={t("ยังมีพนักงาน {n} คนที่ข้อมูลไม่ครบ เช่น ข้อมูลบัญชีธนาคาร กรุณากรอกข้อมูลให้ครบก่อนส่งอนุมัติ", { n: employees.length })}
      description={
        <div>
          {employees.slice(0, MAX_NAMES).map((e, i) => (
            <span key={e.userId}>
              {i > 0 ? ", " : ""}
              {canSetup ? (
                <a href={userSetupHref(e.userId)} target="_blank" rel="noreferrer">
                  {e.displayName}
                </a>
              ) : (
                e.displayName
              )}
            </span>
          ))}
          {employees.length > MAX_NAMES ? ` ${t("และอีก {n} คน", { n: employees.length - MAX_NAMES })}` : ""}
        </div>
      }
    />
  );
}
