"use client";

import { Form, Select } from "antd";

import { useConversionLookupsQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import { useT } from "@/lib/i18n/useT";
import styles from "./MaterialConversionPage.module.css";

/**
 * เครื่องจักรและผู้ปฏิบัติงานจริงของขั้นตอน (M4.2) — ไม่บังคับกรอก
 * ใช้เป็น Form.Item ชื่อ `equipmentId` และ `operatorIds` ในฟอร์มแม่
 */
export default function RunTeamFields() {
  const t = useT();
  const lookups = useConversionLookupsQuery();
  const data = lookups.data?.data;

  return (
    <div className={styles.formSection}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Form.Item name="equipmentId" label={t("เครื่องจักรที่ใช้")} style={{ flex: 1, minWidth: 240 }}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("เลือกเครื่องจักร (ไม่บังคับ)")}
            loading={lookups.isLoading}
            options={(data?.equipment ?? []).map((e) => ({
              value: e.id,
              label: `${e.equipmentCode} — ${e.name}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="operatorIds"
          label={t("ผู้ปฏิบัติงาน")}
          style={{ flex: 2, minWidth: 280 }}
          extra={t("เลือกได้หลายคน — คนที่ทำงานหน้าเครื่องจริง (ผู้สร้างเอกสารบันทึกแยกอยู่แล้ว)")}
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("เลือกพนักงาน (ไม่บังคับ)")}
            loading={lookups.isLoading}
            options={(data?.operators ?? []).map((o) => ({
              value: o.id,
              label: `${o.employeeCode ? o.employeeCode + " " : ""}${o.displayName}${o.position ? " · " + o.position : ""}`,
            }))}
          />
        </Form.Item>
      </div>
    </div>
  );
}
