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
      form.setFieldsValue({
        itemId: initialClassification.itemId ?? undefined,
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
  }, [open, mode, initialClassification, form]);

  useEffect(() => {
    if (!open || !itemId || mode === "edit") {
      return;
    }
    const selected = itemOptions.find((option) => option.value === itemId);
    if (!selected) {
      return;
    }
    const currentCode = form.getFieldValue("code")?.trim();
    const currentName = form.getFieldValue("name")?.trim();
    form.setFieldsValue({
      code: currentCode || selected.itemCode,
      name: currentName || selected.itemNameTh,
    });
  }, [open, itemId, itemOptions, form, mode]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      itemId: values.itemId as string,
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
            เลือกสินค้าคลังที่รับเข้าเมื่ออนุมัติ — หลายประเภทยางชี้สินค้าชิ้นเดียวได้
            (รหัสประเภทยางแยกจากรหัสสินค้าได้)
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
            <span>ใช้ตอนรับเข้าคลัง · สร้างสินค้าที่ Masters → สินค้าก่อน</span>
          </div>
        </div>

        <Form.Item
          label="สินค้า (Master Items)"
          name="itemId"
          rules={[{ required: true, message: "กรุณาเลือกสินค้า" }]}
          extra="หลายประเภท/เกรด เลือกสินค้าชิ้นเดียวกันได้"
        >
          <Select
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder="เลือกสินค้าที่รับเข้าคลัง"
            options={itemOptions}
            loading={itemsQuery.isLoading}
            allowClear
          />
        </Form.Item>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ข้อมูลประเภท/กลุ่มยาง</strong>
            <span>รหัสไม่ซ้ำในประเภทยาง · ตั้งคนละรหัสกับสินค้าได้</span>
          </div>
        </div>

        <Form.Item
          label="รหัสประเภท/กลุ่มยาง"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัส" },
            { max: 100, message: "รหัสต้องไม่เกิน 100 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น PASSENGER-A"
            autoComplete="off"
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
            placeholder="เช่น ยางนั่งเกรด A"
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
          รับเข้าคลังใช้สินค้าที่ผูกไว้ (itemId) ไม่บังคับให้รหัสตรงกับ item_code
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
