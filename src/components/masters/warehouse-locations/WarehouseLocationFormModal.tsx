"use client";
import { useT } from "@/lib/i18n/useT";
import { tLoc } from "@/types/warehouse-locations";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Form, Input, Modal, Select, Switch, type FormInstance } from "antd";

import type {
  CreateWarehouseLocationRequest,
  WarehouseLocation,
} from "@/types/warehouse-locations";
import styles from "@/components/masters/shared/master-page.module.css";

type WarehouseOption = {
  value: string;
  label: string;
};

type WarehouseLocationFormValues = {
  warehouseId?: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
};

type WarehouseLocationFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialLocation?: WarehouseLocation | null;
  warehouseOptions: WarehouseOption[];
  warehousesLoading?: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateWarehouseLocationRequest) => void;
};

function getInitialValues(
  mode: "create" | "edit",
  initialLocation?: WarehouseLocation | null,
): WarehouseLocationFormValues {
  if (mode === "edit" && initialLocation) {
    return {
      warehouseId: initialLocation.warehouseId,
      code: initialLocation.locationCode,
      name: initialLocation.locationName,
      description: initialLocation.description,
      isActive: initialLocation.isActive,
    };
  }

  return {
    warehouseId: undefined,
    code: "",
    name: "",
    description: "",
    isActive: true,
  };
}

function WarehouseLocationFormBody({
  mode,
  initialLocation,
  warehouseOptions,
  warehousesLoading,
  formRef,
}: {
  mode: "create" | "edit";
  initialLocation?: WarehouseLocation | null;
  warehouseOptions: WarehouseOption[];
  warehousesLoading: boolean;
  formRef: MutableRefObject<FormInstance<WarehouseLocationFormValues> | null>;
}) {
  const t = useT();
  const [form] = Form.useForm<WarehouseLocationFormValues>();
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
            {isCreateMode
              ? "CREATE WAREHOUSE LOCATION"
              : "EDIT WAREHOUSE LOCATION"}
          </div>

          <h2>
            {isCreateMode ? t("เพิ่มตำแหน่งจัดเก็บ") : t("แก้ไขตำแหน่งจัดเก็บ")}
          </h2>

          <p>
            {isCreateMode
              ? t("กรอกตำแหน่งจัดเก็บใหม่ภายใต้คลังสินค้า")
              : t("แก้ไขรายละเอียดตำแหน่งจัดเก็บและสถานะการใช้งาน")}
          </p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        className={styles.form}
        initialValues={getInitialValues(mode, initialLocation)}
        preserve={false}
      >
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>{t("ข้อมูลตำแหน่งจัดเก็บ")}</strong>
            <span>{t("ระบุคลัง รหัส ชื่อ และรายละเอียด")}</span>
          </div>
        </div>

        <Form.Item
          label={t("คลังสินค้า")}
          name="warehouseId"
          rules={[{ required: true, message: t("กรุณาเลือกคลังสินค้า") }]}
        >
          <Select
            size="large"
            showSearch
            optionFilterProp="label"
            placeholder={t("เลือกคลังสินค้า")}
            loading={warehousesLoading}
            options={warehouseOptions}
          />
        </Form.Item>

        <Form.Item
          label={tLoc("รหัสตำแหน่ง")}
          name="code"
          rules={[
            { required: true, message: tLoc("กรุณากรอกรหัสตำแหน่ง") },
            { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น RAW-A01")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={tLoc("ชื่อตำแหน่ง")}
          name="name"
          rules={[
            { required: true, message: tLoc("กรุณากรอกชื่อตำแหน่ง") },
            { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
          ]}
        >
          <Input
            size="large"
            placeholder={t("เช่น โซน A ช่อง 01")}
            autoComplete="off"
          />
        </Form.Item>

        <Form.Item
          label={t("รายละเอียด")}
          name="description"
          rules={[
            { max: 500, message: t("รายละเอียดต้องไม่เกิน 500 ตัวอักษร") },
          ]}
        >
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น พื้นที่จัดเก็บยางดิบโซน A")}
            autoComplete="off"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>{t("สถานะใช้งาน")}</strong>
              <span>{t("เปิดใช้งานเพื่อเลือกตำแหน่งนี้ในเอกสารได้")}</span>
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

export default function WarehouseLocationFormModal({
  open,
  mode,
  initialLocation,
  warehouseOptions,
  warehousesLoading = false,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: WarehouseLocationFormModalProps) {
  const t = useT();
  const formRef = useRef<FormInstance<WarehouseLocationFormValues> | null>(
    null,
  );
  const isCreateMode = mode === "create";

  const handleOk = async () => {
    const values = await formRef.current?.validateFields();
    if (!values?.warehouseId) {
      return;
    }

    onSubmit({
      warehouseId: values.warehouseId,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
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
      <WarehouseLocationFormBody
        mode={mode}
        initialLocation={initialLocation}
        warehouseOptions={warehouseOptions}
        warehousesLoading={warehousesLoading}
        formRef={formRef}
      />
    </Modal>
  );
}
