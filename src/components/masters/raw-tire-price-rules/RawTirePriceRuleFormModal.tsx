"use client";

import { useEffect } from "react";
import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

import type {
  CreateRawTirePriceRuleRequest,
  RawTirePriceRule,
} from "@/types/raw-tire-price-rules";
import styles from "./RawTirePriceRuleFormModal.module.css";

type ClassificationOption = {
  value: string;
  label: string;
};

type RawTirePriceRuleFormValues = {
  code: string;
  tireClassificationId: string;
  pricePerKg: number;
  effectiveFrom: Dayjs;
  effectiveTo?: Dayjs | null;
  isActive: boolean;
};

type RawTirePriceRuleFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialRule?: RawTirePriceRule | null;
  classificationOptions: ClassificationOption[];
  classificationsLoading?: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateRawTirePriceRuleRequest) => void;
};

export default function RawTirePriceRuleFormModal({
  open,
  mode,
  initialRule,
  classificationOptions,
  classificationsLoading = false,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: RawTirePriceRuleFormModalProps) {
  const [form] = Form.useForm<RawTirePriceRuleFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialRule) {
      form.setFieldsValue({
        code: initialRule.ruleCode,
        tireClassificationId: initialRule.tireClassificationId,
        pricePerKg: Number(initialRule.pricePerKg),
        effectiveFrom: dayjs(initialRule.effectiveFrom),
        effectiveTo: initialRule.effectiveTo
          ? dayjs(initialRule.effectiveTo)
          : null,
        isActive: initialRule.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      tireClassificationId: undefined,
      pricePerKg: 0,
      effectiveFrom: dayjs(),
      effectiveTo: null,
      isActive: true,
    });
  }, [open, mode, initialRule, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      tireClassificationId: values.tireClassificationId,
      pricePerKg: values.pricePerKg,
      effectiveFrom: values.effectiveFrom.format("YYYY-MM-DD"),
      effectiveTo: values.effectiveTo
        ? values.effectiveTo.format("YYYY-MM-DD")
        : undefined,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.unitModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={640}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE PRICE RULE" : "EDIT PRICE RULE"}
          </div>

          <h2>
            {isCreateMode ? "เพิ่มกฎราคาซื้อยาง" : "แก้ไขกฎราคาซื้อยาง"}
          </h2>

          <p>
            {isCreateMode
              ? "กำหนดราคารับซื้อตามประเภทยางและช่วงวันที่มีผล"
              : "แก้ไขราคา ช่วงวันที่มีผล และสถานะ"}
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
            <strong>ข้อมูลกฎราคา</strong>
            <span>ระบุรหัส ประเภทยาง ราคา และช่วงวัน</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="รหัสกฎ"
              name="code"
              rules={[
                { required: true, message: "กรุณากรอกรหัสกฎ" },
                { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น PRULE-PASS-2026"
                autoComplete="off"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ประเภท/กลุ่มยาง"
              name="tireClassificationId"
              rules={[{ required: true, message: "กรุณาเลือกประเภท/กลุ่มยาง" }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกประเภท"
                loading={classificationsLoading}
                options={classificationOptions}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="ราคาต่อกก."
              name="pricePerKg"
              rules={[
                { required: true, message: "กรุณากรอกราคาต่อกก." },
                {
                  type: "number",
                  min: 0,
                  message: "ราคาต้องไม่ติดลบ",
                },
              ]}
            >
              <InputNumber
                size="large"
                min={0}
                step={0.0001}
                style={{ width: "100%" }}
                placeholder="เช่น 12.5"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="เริ่มมีผล"
              name="effectiveFrom"
              rules={[{ required: true, message: "กรุณาเลือกวันที่เริ่มมีผล" }]}
            >
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item label="สิ้นสุดผล" name="effectiveTo">
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                allowClear
                placeholder="ไม่ระบุ = ใช้ต่อ"
              />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อใช้กฎราคานี้ในเอกสารได้</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
