"use client";

import { Popover } from "antd";
import { ExclamationCircleFilled, InfoCircleFilled } from "@ant-design/icons";

import { useT } from "@/lib/i18n/useT";
import type { LabTestResult } from "@/types/laboratory";
import { LAB_SPEC_FIELD_LABEL, showCriterion } from "./labSpecCheck";

type Props = { result: LabTestResult };

/**
 * ไอคอนบอกว่าเกณฑ์ของ Spec เปลี่ยนจากตอนบันทึกผล
 *  - ส้ม  = เกณฑ์เปลี่ยน (หรือหน่วยเปลี่ยน) → ค่าเดิม → ค่าใหม่
 *  - เทา  = ไม่มีข้อมูล Snapshot เดิมให้เทียบ (ไม่สรุปว่าเปลี่ยน)
 * เปิดได้ทั้ง hover และกด/แตะ (มือถือ/แท็บเล็ต) · แสดงเฉพาะตัวอย่างที่ยังไม่ตัดสิน (backend ส่ง specCheck เฉพาะกรณีนั้น)
 */
export default function LabSpecChangeIcon({ result }: Props) {
  const t = useT();
  const check = result.specCheck;
  if (!check) return null;

  if (check.status === "UNKNOWN") {
    // ผลตรวจเก่าที่ไม่ผูก Spec แสดงอยู่ในส่วน "ผลตรวจเดิม" แล้ว — ไอคอนเทาเฉพาะกรณีไม่มี Snapshot
    if (!result.specParameterId) return null;
    return (
      <Popover
        trigger={["hover", "click"]}
        title={t("ไม่มีข้อมูลเกณฑ์เดิม")}
        content={
          <div style={{ maxWidth: 280 }}>
            {t(
              "ผลตรวจนี้ไม่มีข้อมูลเกณฑ์ ณ เวลาที่บันทึก (Snapshot) จึงเทียบกับ Spec ปัจจุบันไม่ได้ — ไม่สรุปว่าเกณฑ์เปลี่ยน",
            )}
          </div>
        }
      >
        <button
          type="button"
          aria-label={t("ไม่มีข้อมูลเกณฑ์เดิม")}
          style={iconButton}
        >
          <InfoCircleFilled style={{ color: "#8c8c8c" }} />
        </button>
      </Popover>
    );
  }

  if (check.status !== "CHANGED" && check.status !== "UNIT_CONFLICT") {
    return null;
  }

  return (
    <Popover
      trigger={["hover", "click"]}
      title={t("เกณฑ์ใน Spec เปลี่ยนจากตอนบันทึกผล")}
      content={
        <div style={{ maxWidth: 320 }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {check.changes.map((c) => (
                <tr key={c.field}>
                  <td style={{ paddingRight: 8, color: "#8a94a6" }}>
                    {t(LAB_SPEC_FIELD_LABEL[c.field])}
                  </td>
                  <td>
                    {showCriterion(c.before)} → <strong>{showCriterion(c.after)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {check.status === "UNIT_CONFLICT" && check.reason ? (
            <div style={{ marginTop: 8, color: "#d46b08" }}>{t(check.reason)}</div>
          ) : (
            <div style={{ marginTop: 8, color: "#8a94a6" }}>
              {t("ผลตรวจและผลประเมินเดิมยังไม่เปลี่ยน จนกว่าจะกด “ใช้เกณฑ์ปัจจุบัน”")}
            </div>
          )}
        </div>
      }
    >
      <button
        type="button"
        aria-label={t("เกณฑ์ใน Spec เปลี่ยนจากตอนบันทึกผล")}
        style={iconButton}
      >
        <ExclamationCircleFilled style={{ color: "#fa8c16" }} />
      </button>
    </Popover>
  );
}

const iconButton: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  marginLeft: 6,
  cursor: "pointer",
  lineHeight: 1,
};
