"use client";
import { useT } from "@/lib/i18n/useT";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Form, Input, Modal, Switch, type FormInstance } from "antd";

import WarehouseTypeFields from "@/components/masters/warehouses/WarehouseTypeFields";
import type { CreateWarehouseRequest, Warehouse } from "@/types/warehouses";
import styles from "@/components/masters/shared/master-page.module.css";

type WarehouseFormValues = {
  code: string;
  name: string;
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isDefaultReturnInspection?: boolean;
  isActive: boolean;
};

type WarehouseFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialWarehouse?: Warehouse | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateWarehouseRequest) => void;
};

function getInitialValues(
  mode: "create" | "edit",
  initialWarehouse?: Warehouse | null,
): WarehouseFormValues {
  if (mode === "edit" && initialWarehouse) {
    return {
      code: initialWarehouse.warehouseCode,
      name: initialWarehouse.warehouseName,
      warehouseGroup:
        initialWarehouse.warehouseType ?? initialWarehouse.warehouseGroup,
      description: initialWarehouse.description,
      allowNegativeStock: initialWarehouse.allowNegativeStock,
      isQcRequired: initialWarehouse.isQcRequired,
      isDefaultReturnInspection:
        initialWarehouse.isDefaultReturnInspection ?? false,
      isActive: initialWarehouse.isActive,
    };
  }

  return {
    code: "",
    name: "",
    warehouseGroup: undefined,
    description: "",
    allowNegativeStock: false,
    isQcRequired: false,
    isDefaultReturnInspection: false,
    isActive: true,
  };
}

function WarehouseFormBody({
  mode,
  initialWarehouse,
  formRef,
}: {
  mode: "create" | "edit";
  initialWarehouse?: Warehouse | null;
  formRef: MutableRefObject<FormInstance<WarehouseFormValues> | null>;
}) {
  const t = useT();
  const [form] = Form.useForm<WarehouseFormValues>();
  const isCreateMode = mode === "create";

  useEffect(() => {
    formRef.current = form;
    return () => {
      formRef.current = null;
    };
  }, [form, formRef]);

  return (
    <>
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE WAREHOUSE" : "EDIT WAREHOUSE"}
          </div>

          <h2>{isCreateMode ? t("เพิ่มคลังสินค้า") : t("แก้ไขคลังสินค้า")}</h2>

          <p>
            {isCreateMode
              ? t("กรอกคลังสินค้าใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ")
              : t("แก้ไขรายละเอียดคลังสินค้าและสถานะการใช้งาน")}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.form}
        initialValues={getInitialValues(mode, initialWarehouse)}
        preserve={false}
      >
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>{t("ข้อมูลคลังสินค้า")}</strong>
            <span>{t("ระบุรหัส ชื่อ กลุ่ม และรายละเอียด")}</span>
          </div>
        </div>

        <Form.Item
          label={t("รหัสคลัง")}
          name="code"
          rules={[
            { required: true, message: t("กรุณากรอกรหัสคลัง") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น RAW_WH")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("ชื่อคลัง")}
          name="name"
          rules={[
            { required: true, message: t("กรุณากรอกชื่อคลัง") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น คลังวัตถุดิบ")}
            autoComplete="off"
          />
        </Form.Item>

        <WarehouseTypeFields
          currentTypeCode={
            mode === "edit"
              ? (initialWarehouse?.warehouseType ??
                initialWarehouse?.warehouseGroup)
              : undefined
          }
        />

        <Form.Item
          label={t("รายละเอียด")}
          name="description"
          rules={[
            { max: 500, message: t("รายละเอียดต้องไม่เกิน 500 ตัวอักษร") },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น พื้นที่รับยางดิบด้านหน้าโรงงาน")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("อนุญาตยอดติดลบ")}</strong>
              <span>{t("เปิดเมื่อคลังนี้อนุญาตให้สต็อกติดลบได้")}</span>
            </div>
          </div>

          <Form.Item
            name="allowNegativeStock"
            valuePropName="checked"
            noStyle
          >
            <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("ต้องผ่าน QC")}</strong>
              <span>{t("เปิดเมื่อสินค้าเข้าคลังนี้ต้องผ่านการตรวจคุณภาพ")}</span>
            </div>
          </div>

          <Form.Item name="isQcRequired" valuePropName="checked" noStyle>
            <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
          </Form.Item>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("เปิดใช้งานเพื่อเลือกคลังนี้ในเอกสารได้")}</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
          </Form.Item>
        </div>
      </Form>
    </>
  );
}

export default function WarehouseFormModal({
  open,
  mode,
  initialWarehouse,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: WarehouseFormModalProps) {
  const t = useT();
  const formRef = useRef<FormInstance<WarehouseFormValues> | null>(null);
  const isCreateMode = mode === "create";

  const handleOk = async () => {
    const values = await formRef.current?.validateFields();
    if (!values) {
      return;
    }

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      warehouseGroup: values.warehouseGroup?.trim() || undefined,
      description: values.description?.trim() || undefined,
      allowNegativeStock: values.allowNegativeStock,
      isQcRequired: values.isQcRequired,
      isDefaultReturnInspection: formRef.current?.getFieldValue(
        "isDefaultReturnInspection",
      ),
      isActive: values.isActive,
    });
  };

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
      <WarehouseFormBody
        mode={mode}
        initialWarehouse={initialWarehouse}
        formRef={formRef}
      />
    </Modal>
  );
}
