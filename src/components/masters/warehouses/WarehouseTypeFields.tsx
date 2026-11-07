"use client";
import { useT } from "@/lib/i18n/useT";

import Link from "next/link";
import { Form, Select, Switch } from "antd";

import { useWarehouseTypesQuery } from "@/hooks/warehouse-types/useWarehouseTypesQuery";
import styles from "@/components/masters/shared/master-page.module.css";

/**
 * ช่อง "ประเภทคลัง" + สวิตช์คลังรอตรวจของคืนตั้งต้น — ใช้ใน Form ของคลัง
 * field ชื่อ `warehouseGroup` / `isDefaultReturnInspection` ตาม API
 */
export default function WarehouseTypeFields({
  currentTypeCode,
}: {
  /** ประเภทเดิมของคลังที่แก้ — ให้ยังเห็นในตัวเลือกแม้ถูกปิดใช้งานไปแล้ว */
  currentTypeCode?: string;
}) {
  const t = useT();
  const form = Form.useFormInstance();
  const selectedCode = Form.useWatch<string | undefined>("warehouseGroup", form);
  const typesQuery = useWarehouseTypesQuery();
  const types = typesQuery.data?.data ?? [];

  const options = types
    .filter((type) => type.isActive || type.code === currentTypeCode)
    .map((type) => ({
      value: type.code,
      label: type.isActive
        ? `${type.name} (${type.code})`
        : `${type.name} (${type.code}) — ${t("ปิดใช้งาน")}`,
    }));
  if (currentTypeCode && !options.some((o) => o.value === currentTypeCode)) {
    options.push({
      value: currentTypeCode,
      label: `${currentTypeCode} — ${t("ไม่มีในข้อมูลหลัก")}`,
    });
  }

  const selectedType = types.find((type) => type.code === selectedCode);
  const canBeDefaultInspection = !!selectedType?.isReturnInspection;

  return (
    <>
      <Form.Item
        label={t("ประเภทคลัง")}
        name="warehouseGroup"
        rules={[{ required: true, message: t("กรุณาเลือกประเภทคลัง") }]}
        extra={
          <span>
            {t("เพิ่ม/แก้ชื่อประเภทได้ที่")}{" "}
            <Link href="/masters/warehouse-types">{t("ข้อมูลหลัก > ประเภทคลัง")}</Link>
          </span>
        }
      >
        <Select
          size="large"
          showSearch
          optionFilterProp="label"
          placeholder={t("เลือกประเภทคลัง")}
          loading={typesQuery.isLoading}
          options={options}
          notFoundContent={
            typesQuery.isError ? t("โหลดประเภทคลังไม่สำเร็จ") : t("ไม่มีประเภทคลัง")
          }
          onChange={(code: string) => {
            const next = types.find((type) => type.code === code);
            if (!next?.isReturnInspection) {
              form.setFieldValue("isDefaultReturnInspection", false);
            }
          }}
        />
      </Form.Item>

      {canBeDefaultInspection ? (
        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("คลังรอตรวจของคืนตั้งต้น")}</strong>
              <span>
                {t("ใบรับคืนที่ไม่ได้เลือกคลังจะเข้าที่นี่ — มีได้คลังเดียว ตั้งแล้วคลังอื่นจะถูกปลด")}
              </span>
            </div>
          </div>
          <Form.Item
            name="isDefaultReturnInspection"
            valuePropName="checked"
            noStyle
          >
            <Switch checkedChildren={t("ใช่")} unCheckedChildren={t("ไม่")} />
          </Form.Item>
        </div>
      ) : null}
    </>
  );
}
