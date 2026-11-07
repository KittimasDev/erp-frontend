"use client";
import { useT } from "@/lib/i18n/useT";

import { useEffect, useMemo } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import type {
  MaterialConversionRouteStep,
  RouteStepLineBody,
} from "@/types/material-conversion";
import { OUTPUT_TYPE_LABEL, OUTPUT_TYPES } from "@/types/material-conversion";
import styles from "@/components/material-conversions/MaterialConversionPage.module.css";

type LineValues = {
  lineRole?: string;
  outputType?: string;
  itemId?: string;
  expectedRatio?: number | null;
  isRequired?: boolean;
};

type FormValues = {
  stepCode: string;
  nameTh: string;
  stepOrder?: number;
  isActive?: boolean;
  remark?: string;
  lines: LineValues[];
};

export default function StepFormModal({
  open,
  step,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  /** ไม่ส่งมา = เพิ่มขั้นใหม่ */
  step?: MaterialConversionRouteStep;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    stepCode: string;
    nameTh: string;
    stepOrder?: number;
    isActive?: boolean;
    remark?: string;
    lines: RouteStepLineBody[];
  }) => void;
}) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const isEdit = Boolean(step);
  const itemsQuery = useItemsQuery();

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data?.data ?? [])
        .filter((item) => item.isActive)
        .map((item) => ({
          value: item.id,
          label: `${item.itemCode} — ${item.itemNameTh}`,
        })),
    [itemsQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    if (step) {
      form.setFieldsValue({
        stepCode: step.stepCode,
        nameTh: step.nameTh,
        stepOrder: step.stepOrder,
        isActive: step.isActive,
        remark: step.remark,
        lines: step.lines.map((line) => ({
          lineRole: line.lineRole,
          outputType: line.outputType ?? undefined,
          itemId: line.itemId ?? undefined,
          expectedRatio: line.expectedRatio
            ? Number(line.expectedRatio)
            : undefined,
          isRequired: line.isRequired,
        })),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, lines: [] });
    }
  }, [open, step, form]);

  return (
    <Modal
      open={open}
      title={isEdit ? `แก้ไขขั้นตอน "${step?.nameTh}"` : t("เพิ่มขั้นตอนในเส้นทาง")}
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={760}
    >
      {isEdit && (step?.runCount ?? 0) > 0 ? (
        <Alert
          style={{ marginBottom: 14 }}
          type="info"
          showIcon
          title={t("ขั้นตอนนี้มีรอบงานอ้างอิงอยู่ {n} ใบ", { n: step?.runCount ?? 0 })}
          description={t("ลบไม่ได้ — ปิดใช้งานแทนได้ · เอกสารเก่ายังแสดงชื่อขั้นตอนตามที่บันทึกไว้")}
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) =>
          onSubmit({
            stepCode: values.stepCode,
            nameTh: values.nameTh,
            stepOrder: values.stepOrder,
            isActive: values.isActive,
            remark: values.remark,
            lines: (values.lines ?? []).map((line, index) => ({
              lineRole: line.lineRole as string,
              outputType:
                line.lineRole === "OUTPUT"
                  ? ((line.outputType as string) ?? "MAIN")
                  : undefined,
              itemId: line.itemId,
              expectedRatio:
                line.expectedRatio === null || line.expectedRatio === undefined
                  ? undefined
                  : Number(line.expectedRatio),
              isRequired: line.isRequired ?? false,
              sortOrder: index,
            })),
          })
        }
      >
        <div className={styles.formGrid}>
          <Form.Item
            name="stepCode"
            label={t("รหัสขั้นตอน")}
            rules={[
              { required: true, message: t("กรอกรหัสขั้นตอน") },
              {
                pattern: /^[A-Z][A-Z0-9_]{2,49}$/,
                message:
                  t("ตัวอักษรภาษาอังกฤษตัวใหญ่ ตัวเลข หรือขีดล่าง ยาว 3-50 ตัว"),
              },
            ]}
            extra={
              isEdit
                ? t("รหัสแก้ไม่ได้ เพราะรอบงานเก็บค่านี้ไว้อ้างอิง")
                : t("ไม่ซ้ำทั้งระบบ และแก้ไม่ได้หลังสร้าง")
            }
          >
            <Input placeholder={t("เช่น PLASTIC_WASHING")} disabled={isEdit} />
          </Form.Item>
          <Form.Item
            name="nameTh"
            label={t("ชื่อขั้นตอน (ภาษาไทย)")}
            rules={[{ required: true, message: t("กรอกชื่อขั้นตอน") }]}
          >
            <Input placeholder={t("เช่น ล้างพลาสติก")} maxLength={100} />
          </Form.Item>
          <Form.Item
            name="stepOrder"
            label={t("ลำดับในเส้นทาง")}
            extra={isEdit ? undefined : t("ไม่กรอก ระบบต่อท้ายให้เอง")}
          >
            <InputNumber style={{ width: "100%" }} min={1} precision={0} />
          </Form.Item>
          {isEdit ? (
            <Form.Item name="isActive" label={t("เปิดใช้งาน")} valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
        </div>

        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea
            rows={2}
            maxLength={2000}
            placeholder={t("เช่น ใช้น้ำร้อน 60 องศา")}
          />
        </Form.Item>

        <div className={styles.formSectionHead}>
          <h4>{t("แม่แบบรายการเข้า/ออก")}</h4>
          <span className={styles.formSectionHint}>
            {t("ใช้เติมค่าตั้งต้นในฟอร์มสร้างเอกสารเท่านั้น ไม่บังคับ — หน้างานแก้ได้ทุกบรรทัด")}
          </span>
        </div>

        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <div className={styles.lineList}>
              {fields.map((field, index) => (
                <div key={field.key} className={styles.lineCard}>
                  <div className={styles.lineCardHeader}>
                    <span className={styles.lineCardTitle}>
                      {t("แม่แบบรายการที่ {n}", { n: index + 1 })}
                    </span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      {t("ลบ")}
                    </Button>
                  </div>
                  <div className={styles.lineGrid}>
                    <Form.Item
                      name={[field.name, "lineRole"]}
                      label={t("บทบาท")}
                      rules={[{ required: true, message: t("เลือกบทบาท") }]}
                    >
                      <Select
                        options={[
                          { value: "INPUT", label: t("วัตถุดิบเข้า") },
                          { value: "OUTPUT", label: t("ผลผลิตออก") },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "outputType"]}
                      label={t("ชนิดผลผลิต")}
                      extra={t("ใช้เมื่อบทบาทเป็นผลผลิตออก")}
                    >
                      <Select
                        allowClear
                        placeholder={t("เลือกชนิด")}
                        options={OUTPUT_TYPES.map((value) => ({
                          value,
                          label: t(OUTPUT_TYPE_LABEL[value]),
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      className={styles.lineGridWide}
                      name={[field.name, "itemId"]}
                      label={t("สินค้าที่คาดไว้")}
                      extra={t("ไม่เลือก = ให้หน้างานเลือกเอง · หน่วยใช้หน่วยหลักของสินค้าอัตโนมัติ")}
                    >
                      <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder={t("เลือกสินค้า")}
                        loading={itemsQuery.isFetching}
                        options={itemOptions}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "expectedRatio"]}
                      label={t("สัดส่วนคาดหมาย")}
                      extra={t("ต่อวัตถุดิบเข้า 1 หน่วย เช่น 0.65 = ได้ 650 กก. จากยาง 1,000 กก.")}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        max={1000}
                        step={0.01}
                        precision={6}
                        placeholder="0.650000"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "isRequired"]}
                      label={t("เตือนถ้าไม่มีบรรทัดนี้")}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                </div>
              ))}
              <Button
                type="dashed"
                className={styles.addLineButton}
                icon={<PlusOutlined />}
                onClick={() => add({ lineRole: "OUTPUT", outputType: "MAIN" })}
              >
                {t("เพิ่มแม่แบบรายการ")}
              </Button>
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
