"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import { useGlAccountsQuery } from "@/hooks/gl-accounts/useGlAccounts";
import type {
  CreateItemCategoryRequest,
  ItemCategory,
} from "@/types/item-categories";
import styles from "@/components/masters/shared/master-page.module.css";
import { useT } from "@/lib/i18n/useT";

type ItemCategoryFormValues = {
  code: string;
  name: string;
  description?: string;
  purchaseAccountId?: string;
  isActive: boolean;
};

type ItemCategoryFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialItemCategory?: ItemCategory | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateItemCategoryRequest) => void;
};

export default function ItemCategoryFormModal({
  open,
  mode,
  initialItemCategory,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: ItemCategoryFormModalProps) {
  const t = useT();
  const [form] = Form.useForm<ItemCategoryFormValues>();
  const glAccountsQuery = useGlAccountsQuery({ isActive: true });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialItemCategory) {
      form.setFieldsValue({
        code: initialItemCategory.code,
        name: initialItemCategory.nameTh,
        description: initialItemCategory.description,
        purchaseAccountId: initialItemCategory.purchaseAccountId ?? undefined,
        isActive: initialItemCategory.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      purchaseAccountId: undefined,
      isActive: true,
    });
  }, [open, mode, initialItemCategory, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      // null = ล้างการผูก (ใช้บัญชีซื้อสินค้าค่าเริ่มต้น)
      purchaseAccountId: values.purchaseAccountId ?? null,
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
            {isCreateMode ? "CREATE CATEGORY" : "EDIT CATEGORY"}
          </div>

          <h2>
            {isCreateMode ? t("เพิ่มหมวดหมู่สินค้า") : t("แก้ไขหมวดหมู่สินค้า")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกข้อมูลหมวดหมู่สินค้าใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดหมวดหมู่และสถานะการใช้งาน")}
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
            <strong>{t("ข้อมูลหมวดหมู่")}</strong>
            <span>{t("ระบุรหัส ชื่อ และคำอธิบายที่ใช้จัดกลุ่มสินค้า")}</span>
          </div>
        </div>

        <Form.Item
          label={t("รหัสหมวดหมู่")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสหมวดหมู่") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น RAW_MATERIAL, CHEMICAL")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อหมวดหมู่")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อหมวดหมู่") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น วัตถุดิบ")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item label={t("คำอธิบาย")} name="description">
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น หมวดหมู่สำหรับวัตถุดิบที่ใช้ในการผลิต")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("บัญชีซื้อ (สมุดรายวันซื้อ)")}
          name="purchaseAccountId"
          extra={t("ไม่เลือก = ใช้บัญชีซื้อสินค้าค่าเริ่มต้นที่หน้า ผังบัญชีและการผูกบัญชี")}
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("ใช้ค่าเริ่มต้น")}
            loading={glAccountsQuery.isLoading}
            options={(glAccountsQuery.data ?? []).map((account) => ({
              value: account.id,
              label: `${account.code} — ${account.nameTh}`,
            }))}
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>
                {t("เปิดใช้งานเพื่อให้สามารถเลือกหมวดหมู่นี้กับสินค้ารายการต่าง ๆ ได้")}
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
