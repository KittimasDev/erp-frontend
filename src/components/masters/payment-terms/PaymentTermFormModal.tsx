"use client";

import { useT } from "@/lib/i18n/useT";
import { useEffect } from "react";
import { Form, Input, InputNumber, Modal, Select, Switch } from "antd";

import {
  PAYMENT_TERM_TYPE_LABEL,
  type CreatePaymentTermRequest,
  type PaymentTerm,
  type PaymentTermType,
} from "@/types/payment-terms";
import styles from "@/components/masters/shared/master-page.module.css";

type PaymentTermFormValues = {
  code: string;
  name: string;
  termType: PaymentTermType;
  creditDays: number;
  advancePercent: number;
  isActive: boolean;
};

type PaymentTermFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialPaymentTerm?: PaymentTerm | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreatePaymentTermRequest) => void;
};

const TERM_TYPE_OPTIONS = (
  Object.entries(PAYMENT_TERM_TYPE_LABEL) as [PaymentTermType, string][]
).map(([value, label]) => ({ value, label }));

export default function PaymentTermFormModal({
  open,
  mode,
  initialPaymentTerm,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: PaymentTermFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<PaymentTermFormValues>();
  const termType = Form.useWatch("termType", form);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialPaymentTerm) {
      const creditDays = initialPaymentTerm.creditDays ?? 0;
      form.setFieldsValue({
        code: initialPaymentTerm.code,
        name: initialPaymentTerm.name,
        termType:
          initialPaymentTerm.termType ??
          (creditDays > 0 ? "CREDIT" : "ON_RECEIPT"),
        creditDays,
        advancePercent: initialPaymentTerm.advancePercent ?? 100,
        isActive: initialPaymentTerm.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      termType: "CREDIT",
      creditDays: 30,
      advancePercent: 100,
      isActive: true,
    });
  }, [open, mode, initialPaymentTerm, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      termType: values.termType,
      creditDays: values.termType === "CREDIT" ? (values.creditDays ?? 0) : 0,
      advancePercent:
        values.termType === "ADVANCE" ? (values.advancePercent ?? 100) : 100,
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
      width={560}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE PAYMENT TERM" : "EDIT PAYMENT TERM"}
          </div>

          <h2>
            {isCreateMode
              ? t("เพิ่มเงื่อนไขชำระเงิน")
              : t("แก้ไขเงื่อนไขชำระเงิน")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกเงื่อนไขการชำระเงินใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดเงื่อนไขและสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลเงื่อนไข")}</strong>
            <span>{t("ระบุรหัส ชื่อ ประเภท และจำนวนวันเครดิต / % ชำระล่วงหน้า")}</span>
          </div>
        </div>

        <Form.Item
          label={t("รหัสเงื่อนไข")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสเงื่อนไข") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น CREDIT_30, CASH")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อเงื่อนไข")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อเงื่อนไข") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น เครดิต 30 วัน")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ประเภทเงื่อนไข")}
          name="termType"
          rules={[{ required: true, message: t("กรุณาเลือกประเภทเงื่อนไข") }]}
          extra={t("ใช้คำนวณยอดที่ต้องชำระและวันครบกำหนดในหน้ารายการจ่ายเงิน")}
        >
          <Select size="large" options={TERM_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
        </Form.Item>

        {termType === "CREDIT" ? (
          <Form.Item
            label={t("วันเครดิต")}
            name="creditDays"
            rules={[
              { required: true, message: t("กรุณากรอกจำนวนวันเครดิต") },
              {
                type: "number",
                min: 1,
                message: t("วันเครดิตต้องอย่างน้อย 1 วัน"),
              },
            ]}
          >
            <InputNumber
              size="large"
              min={1}
              precision={0}
              style={{ width: "100%" }}
              placeholder={t("เช่น 30")}
            />
          </Form.Item>
        ) : null}

        {termType === "ADVANCE" ? (
          <Form.Item
            label={t("% ที่ต้องชำระล่วงหน้า")}
            name="advancePercent"
            rules={[
              { required: true, message: t("กรุณากรอก % ที่ต้องชำระล่วงหน้า") },
              {
                type: "number",
                min: 0.01,
                max: 100,
                message: t("ต้องอยู่ระหว่าง 0.01 - 100"),
              },
            ]}
            extra={t("ชำระเต็มจำนวนก่อนรับสินค้าให้ใส่ 100 · มัดจำ 30% ให้ใส่ 30")}
          >
            <InputNumber
              size="large"
              min={0.01}
              max={100}
              precision={2}
              suffix="%"
              style={{ width: "100%" }}
              placeholder={t("เช่น 30")}
            />
          </Form.Item>
        ) : null}

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>
                {t("เปิดใช้งานเพื่อเลือกเงื่อนไขนี้ในเอกสารจัดซื้อและขายได้")}
              </span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
