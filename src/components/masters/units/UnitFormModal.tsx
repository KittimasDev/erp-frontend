"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import {
  UNIT_DIMENSION_LABELS,
  UNIT_DIMENSIONS,
  type UnitDimension,
} from "@/lib/units/constants";

import type { CreateUnitRequest, Unit } from "@/types/units";
import styles from "@/components/masters/shared/master-page.module.css";
import { useT } from "@/lib/i18n/useT";

type UnitFormValues = {
  code: string;
  name: string;
  symbol?: string;
  dimension?: UnitDimension;
  isActive: boolean;
};

type UnitFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialUnit?: Unit | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateUnitRequest) => void;
};

export default function UnitFormModal({
  open,
  mode,
  initialUnit,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: UnitFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<UnitFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialUnit) {
      form.setFieldsValue({
        code: initialUnit.code,
        name: initialUnit.nameTh,
        symbol: initialUnit.nameEn,
        dimension: (initialUnit.dimension as UnitDimension) ?? undefined,
        isActive: initialUnit.isActive,
      });

      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      symbol: "",
      dimension: undefined,
      isActive: true,
    });
  }, [open, mode, initialUnit, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      symbol: values.symbol?.trim() || undefined,
      dimension: values.dimension,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? t("บันทึก") : t("อัปเดต")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      width={580}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE UNIT" : "EDIT UNIT"}
          </div>

          <h2>
            {isCreateMode ? t("เพิ่มหน่วยนับ") : t("แก้ไขหน่วยนับ")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกข้อมูลหน่วยนับใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดหน่วยนับและสถานะการใช้งาน")}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.form}
      >
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />

          <div>
            <strong>{t("ข้อมูลหน่วยนับ")}</strong>
            <span>{t("ระบุรหัส ชื่อ และสัญลักษณ์ที่ใช้ในระบบ")}</span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Form.Item
            label={t("รหัสหน่วยนับ")}
            name="code"
            rules={[
              {
                required: true,
                message: t("กรุณากรอกรหัสหน่วยนับ"),
              },
              {
                max: 50,
                message: t("รหัสต้องไม่เกิน 50 ตัวอักษร"),
              },
            ]}
          >
            <Input
              size="large"
              placeholder={t("เช่น KG, TON, PCS")}
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label={t("สัญลักษณ์ / ชื่อย่อ")}
            name="symbol"
            rules={[
              {
                max: 50,
                message: t("สัญลักษณ์ต้องไม่เกิน 50 ตัวอักษร"),
              },
            ]}
          >
            <Input
              size="large"
              placeholder={t("เช่น kg")}
              autoComplete="off"
            />
          </Form.Item>
        </div>

        <Form.Item
          label={t("มิติของหน่วย")}
          name="dimension"
          extra={t("ใช้เตือนตอนตั้งกฎแปลงหน่วยกลางข้ามมิติเท่านั้น ไม่ระบุก็ได้")}
        >
          <Select
            size="large"
            allowClear
            placeholder={t("เช่น น้ำหนัก")}
            options={UNIT_DIMENSIONS.map((dimension) => ({
              value: dimension,
              label: `${t(UNIT_DIMENSION_LABELS[dimension])} (${dimension})`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อหน่วยนับ")}
          name="name"
          rules={[
            {
              required: true,
              message: t("กรุณากรอกชื่อหน่วยนับ"),
            },
            {
              max: 255,
              message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร"),
            },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น กิโลกรัม")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>{t("สถานะใช้งาน")}</strong>

              <span>
                {t("เปิดใช้งานเพื่อให้สามารถเลือกหน่วยนับนี้ในรายการสินค้า และเอกสารต่าง ๆ ได้")}
              </span>
            </div>
          </div>

          <Form.Item
            name="isActive"
            valuePropName="checked"
            noStyle
          >
            <Switch
              checkedChildren={t("เปิด")}
              unCheckedChildren={t("ปิด")}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}