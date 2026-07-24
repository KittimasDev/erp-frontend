"use client";

import { useEffect, useMemo } from "react";
import { Form, Input, Modal, Select, Switch, Typography } from "antd";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import type {
  CreateTireClassificationRequest,
  TireClassification,
} from "@/types/tire-classifications";
import styles from "@/components/masters/shared/master-page.module.css";

type TireClassificationFormValues = {
  itemId?: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type TireClassificationFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialClassification?: TireClassification | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateTireClassificationRequest) => void;
};

export default function TireClassificationFormModal({
  open,
  mode,
  initialClassification,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: TireClassificationFormModalProps) {
  const [form] = Form.useForm<TireClassificationFormValues>();
  const itemsQuery = useItemsQuery({ isActive: true });
  const itemId = Form.useWatch("itemId", form);

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data?.data ?? []).map((item) => ({
        value: item.id,
        label: `${item.itemCode} — ${item.itemNameTh}`,
        itemCode: item.itemCode,
        itemNameTh: item.itemNameTh,
      })),
    [itemsQuery.data?.data],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialClassification) {
      const matchedItem = (itemsQuery.data?.data ?? []).find(
        (item) =>
          item.itemCode.toLowerCase() ===
          initialClassification.classificationCode.toLowerCase(),
      );

      form.setFieldsValue({
        itemId: matchedItem?.id,
        code: initialClassification.classificationCode,
        name: initialClassification.classificationName,
        description: initialClassification.description,
        isActive: initialClassification.isActive,
      });
      return;
    }

    form.setFieldsValue({
      itemId: undefined,
      code: "",
      name: "",
      description: "",
      isActive: true,
    });
  }, [open, mode, initialClassification, form, itemsQuery.data?.data]);

  useEffect(() => {
    if (!itemId) {
      return;
    }
    const selected = itemOptions.find((option) => option.value === itemId);
    if (!selected) {
      return;
    }
    form.setFieldsValue({
      code: selected.itemCode,
      name: form.getFieldValue("name")?.trim()
        ? form.getFieldValue("name")
        : selected.itemNameTh,
    });
  }, [itemId, itemOptions, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
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
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={560}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode
              ? "CREATE TIRE CLASSIFICATION"
              : "EDIT TIRE CLASSIFICATION"}
          </div>

          <h2>
            {isCreateMode
              ? "เพิ่มประเภท/กลุ่มยาง"
              : "แก้ไขประเภท/กลุ่มยาง"}
          </h2>

          <p>
            เลือกสินค้าจาก Master Items ก่อน — ระบบจะใช้ item_code เป็นรหัสประเภทยาง
            เพื่อให้รับเข้าคลังจับคู่ได้
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
            <strong>ผูกสินค้าคลัง</strong>
            <span>ต้องมีสินค้าใน Master Items ก่อนสร้างประเภทยาง</span>
          </div>
        </div>

        <Form.Item
          label="สินค้า (Master Items)"
          name="itemId"
          rules={[{ required: true, message: "กรุณาเลือกสินค้า" }]}
          extra="ถ้ายังไม่มีสินค้า ให้ไปสร้างที่ Masters → สินค้า ก่อน"
        >
          <Select
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder="เลือกสินค้าที่ใช้งาน"
            options={itemOptions}
            loading={itemsQuery.isLoading}
            allowClear
          />
        </Form.Item>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ข้อมูลประเภท/กลุ่มยาง</strong>
            <span>รหัสดึงจากสินค้าอัตโนมัติ · ชื่อแก้ได้</span>
          </div>
        </div>

        <Form.Item
          label="รหัส (จาก item_code)"
          name="code"
          rules={[
            { required: true, message: "กรุณาเลือกสินค้าเพื่อดึงรหัส" },
            { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เลือกสินค้าแล้วระบบจะใส่รหัสให้"
            autoComplete="off"
            disabled
          />
        </Form.Item>

        <Form.Item
          label="ชื่อ"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อ" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น ยางนั่ง"
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label="รายละเอียด"
          name="description"
          rules={[
            { max: 500, message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร" },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder="เช่น ยางรถยนต์นั่งส่วนบุคคล"
            autoComplete="off"
          />
        </Form.Item>

        <Typography.Paragraph type="secondary" style={{ marginTop: -4 }}>
          รับเข้าคลังจะจับคู่ด้วย classification_code = item_code
        </Typography.Paragraph>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกประเภทนี้ในเอกสารได้</span>
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
