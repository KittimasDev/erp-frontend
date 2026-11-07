"use client";
import { useT } from "@/lib/i18n/useT";

import { useEffect } from "react";
import { Alert, Form, Input, InputNumber, Modal, Switch } from "antd";

import type { MaterialConversionRoute } from "@/types/material-conversion";

type FormValues = {
  routeCode: string;
  nameTh: string;
  description?: string;
  runNoPrefix?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export default function RouteFormModal({
  open,
  route,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  /** ไม่ส่งมา = สร้างใหม่ */
  route?: MaterialConversionRoute;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: FormValues) => void;
}) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const isEdit = Boolean(route);

  useEffect(() => {
    if (!open) return;
    if (route) {
      form.setFieldsValue({
        routeCode: route.routeCode,
        nameTh: route.nameTh,
        description: route.description,
        runNoPrefix: route.runNoPrefix,
        isActive: route.isActive,
        sortOrder: route.sortOrder,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isActive: true, runNoPrefix: "MCV-", sortOrder: 0 });
    }
  }, [open, route, form]);

  return (
    <Modal
      open={open}
      title={isEdit ? t("แก้ไขเส้นทางแปรสภาพวัตถุดิบ") : t("สร้างเส้นทางแปรสภาพวัตถุดิบ")}
      okText={t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={620}
    >
      {route?.isSystem ? (
        <Alert
          style={{ marginBottom: 14 }}
          type="info"
          showIcon
          title={t("เส้นทางตั้งต้นของระบบ")}
          description={t("แก้ชื่อและคำอธิบายได้ แต่ลบไม่ได้ — ปิดใช้งานแทนได้ เพราะมีเอกสารเก่าอ้างอิงอยู่")}
        />
      ) : null}

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="routeCode"
          label={t("รหัสเส้นทาง")}
          rules={[
            { required: true, message: t("กรอกรหัสเส้นทาง") },
            {
              pattern: /^[A-Z][A-Z0-9_]{2,29}$/,
              message:
                t("ตัวอักษรภาษาอังกฤษตัวใหญ่ ตัวเลข หรือขีดล่าง ยาว 3-30 ตัว และเริ่มด้วยตัวอักษร"),
            },
          ]}
          extra={isEdit ? t("รหัสแก้ไม่ได้ เพราะเอกสารอ้างอิงค่านี้ไว้") : undefined}
        >
          <Input placeholder={t("เช่น PLASTIC_PREP")} disabled={isEdit} />
        </Form.Item>
        <Form.Item
          name="nameTh"
          label={t("ชื่อเส้นทาง (ภาษาไทย)")}
          rules={[{ required: true, message: t("กรอกชื่อเส้นทาง") }]}
        >
          <Input placeholder={t("เช่น ขั้นตอนเตรียมพลาสติก")} maxLength={150} />
        </Form.Item>
        <Form.Item name="description" label={t("คำอธิบาย")}>
          <Input.TextArea
            rows={2}
            maxLength={2000}
            showCount
            placeholder={t("เช่น พลาสติกรีไซเคิลต้องบดและล้างก่อนเข้าเตา")}
          />
        </Form.Item>
        <Form.Item
          name="runNoPrefix"
          label={t("คำนำหน้าเลขที่เอกสาร")}
          rules={[
            {
              pattern: /^[A-Z][A-Z0-9-]{1,9}$/,
              message: t("ตัวอักษรตัวใหญ่หรือตัวเลข ยาวไม่เกิน 10 ตัว"),
            },
          ]}
          extra={t("ระบบต่อท้ายด้วย YYYYMMDD-NNN ให้เอง · เปลี่ยนได้ ไม่กระทบเอกสารที่ออกไปแล้ว")}
        >
          <Input placeholder={t("เช่น PLP-")} maxLength={10} />
        </Form.Item>
        <Form.Item name="sortOrder" label={t("ลำดับการแสดง")}>
          <InputNumber style={{ width: "100%" }} min={0} precision={0} />
        </Form.Item>
        <Form.Item name="isActive" label={t("เปิดใช้งาน")} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
