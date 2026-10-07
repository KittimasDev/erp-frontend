"use client";

import { useEffect } from "react";
import { Alert, Form, Input, InputNumber, Modal, Select, Switch } from "antd";

import type {
  CreateWarehouseTypeRequest,
  WarehouseMenuScope,
  WarehouseTypeMaster,
} from "@/types/warehouse-types";
import styles from "@/components/masters/shared/master-page.module.css";

type FormValues = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number | null;
  isActive: boolean;
  isSellable: boolean;
  receiveAsOnHold: boolean;
  isReturnInspection: boolean;
  isReturnGoodTarget: boolean;
  isReturnRejectTarget: boolean;
  menuScope?: WarehouseMenuScope | null;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: WarehouseTypeMaster | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateWarehouseTypeRequest) => void;
};

export const MENU_SCOPE_OPTIONS: { value: WarehouseMenuScope; label: string }[] =
  [
    { value: "RAW_MATERIAL", label: "เมนูคลังวัตถุดิบ" },
    { value: "FINISHED_GOODS", label: "เมนูคลังสินค้าสำเร็จรูป (FG)" },
  ];

const FLAG_FIELDS: {
  name: keyof Pick<
    FormValues,
    | "isSellable"
    | "receiveAsOnHold"
    | "isReturnInspection"
    | "isReturnGoodTarget"
    | "isReturnRejectTarget"
  >;
  title: string;
  hint: string;
}[] = [
  {
    name: "isSellable",
    title: "จอง / ขาย / เบิกได้",
    hint: "ปิด = ใบสั่งขายจองไม่ได้ และเบิกออกจากคลังประเภทนี้ไม่ได้",
  },
  {
    name: "receiveAsOnHold",
    title: "ของที่เข้ามานับเป็นของพัก",
    hint: "โอน/ปรับ/นับเข้าคลังนี้จะลงยอดพัก (on hold) ไม่ใช่ยอดพร้อมใช้",
  },
  {
    name: "isReturnInspection",
    title: "ใช้เป็นคลังรอตรวจของคืน",
    hint: "ใบรับคืนจากลูกค้าเลือกคลังประเภทนี้เป็นที่พักรอตรวจได้",
  },
  {
    name: "isReturnGoodTarget",
    title: "ปลายทางของดีตอนคัดแยกของคืน",
    hint: "ของคืนที่ตรวจแล้วว่าดี ส่งเข้าคลังประเภทนี้ได้",
  },
  {
    name: "isReturnRejectTarget",
    title: "ปลายทางของเสียตอนคัดแยกของคืน",
    hint: "ของคืนที่ตรวจแล้วว่าเสีย ส่งเข้าคลังประเภทนี้ได้",
  },
];

export default function WarehouseTypeFormModal({
  open,
  mode,
  initialValue,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const isCreateMode = mode === "create";
  const inUse = !isCreateMode && (initialValue?.warehouseCount ?? 0) > 0;
  const codeLocked = !isCreateMode && (inUse || !!initialValue?.isSystem);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!isCreateMode && initialValue) {
      form.setFieldsValue({
        code: initialValue.code,
        name: initialValue.name,
        description: initialValue.description,
        sortOrder: initialValue.sortOrder,
        isActive: initialValue.isActive,
        isSellable: initialValue.isSellable,
        receiveAsOnHold: initialValue.receiveAsOnHold,
        isReturnInspection: initialValue.isReturnInspection,
        isReturnGoodTarget: initialValue.isReturnGoodTarget,
        isReturnRejectTarget: initialValue.isReturnRejectTarget,
        menuScope: (initialValue.menuScope as WarehouseMenuScope) ?? null,
      });
      return;
    }
    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      sortOrder: null,
      isActive: true,
      isSellable: true,
      receiveAsOnHold: false,
      isReturnInspection: false,
      isReturnGoodTarget: false,
      isReturnRejectTarget: false,
      menuScope: null,
    });
  }, [open, isCreateMode, initialValue, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      ...(codeLocked ? {} : { code: values.code.trim() }),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      sortOrder: values.sortOrder ?? undefined,
      isActive: values.isActive,
      isSellable: values.isSellable,
      receiveAsOnHold: values.receiveAsOnHold,
      isReturnInspection: values.isReturnInspection,
      isReturnGoodTarget: values.isReturnGoodTarget,
      isReturnRejectTarget: values.isReturnRejectTarget,
      menuScope: values.menuScope ?? null,
    } as CreateWarehouseTypeRequest);
  };

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
      width={640}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE WAREHOUSE TYPE" : "EDIT WAREHOUSE TYPE"}
          </div>
          <h2>{isCreateMode ? "เพิ่มประเภทคลัง" : "แก้ไขประเภทคลัง"}</h2>
          <p>ตั้งชื่อและพฤติกรรมสต๊อกของคลังประเภทนี้</p>
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
            <strong>ข้อมูลประเภท</strong>
            <span>ชื่อแก้ได้เสมอ · รหัสแก้ได้เฉพาะตอนยังไม่มีคลังใช้</span>
          </div>
        </div>

        {codeLocked ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title={
              initialValue?.isSystem
                ? "ประเภทของระบบ — แก้รหัสไม่ได้ แต่แก้ชื่อและธงได้"
                : `มีคลัง ${initialValue?.warehouseCount ?? 0} แห่งใช้ประเภทนี้ — แก้รหัสไม่ได้`
            }
          />
        ) : null}

        <Form.Item
          label="รหัสประเภท"
          name="code"
          rules={[
            { required: true, message: "กรุณากรอกรหัสประเภท" },
            { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
          ]}
          extra="ระบบเก็บเป็นตัวพิมพ์ใหญ่"
        >
          <Input
            size="large"
            placeholder="เช่น QUARANTINE"
            autoComplete="off"
            disabled={codeLocked}
          />
        </Form.Item>

        <Form.Item
          label="ชื่อประเภท"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อประเภท" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input size="large" placeholder="เช่น พื้นที่กักกัน" autoComplete="off" />
        </Form.Item>

        <Form.Item label="คำอธิบาย" name="description">
          <Input.TextArea rows={2} autoComplete="off" />
        </Form.Item>

        <Form.Item
          label="แสดงในเมนู"
          name="menuScope"
          extra="คลังประเภทนี้จะขึ้นให้เลือกในเมนูโอนย้าย/ปรับปรุง/ตรวจนับของกลุ่มนั้น — เว้นว่าง = อยู่ในเมนูคลังวัตถุดิบ เฉพาะประเภทที่ตั้งเป็น FG ถึงไปอยู่เมนูคลังสินค้าสำเร็จรูป"
        >
          <Select
            allowClear
            size="large"
            placeholder="เมนูคลังวัตถุดิบ (ค่าเริ่มต้น)"
            options={MENU_SCOPE_OPTIONS}
          />
        </Form.Item>

        <Form.Item label="ลำดับการแสดงผล" name="sortOrder">
          <InputNumber
            size="large"
            style={{ width: "100%" }}
            placeholder="ไม่ระบุ = ต่อท้าย"
            precision={0}
          />
        </Form.Item>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>พฤติกรรมสต๊อก</strong>
            <span>ระบบดูจากธงเหล่านี้ ไม่ได้ดูจากชื่อรหัส</span>
          </div>
        </div>

        {FLAG_FIELDS.map((flag) => (
          <div
            key={flag.name}
            className={styles.statusBox}
            style={{ marginBottom: 12 }}
          >
            <div className={styles.statusContent}>
              <div className={styles.statusIcon}>●</div>
              <div>
                <strong>{flag.title}</strong>
                <span>{flag.hint}</span>
              </div>
            </div>
            <Form.Item name={flag.name} valuePropName="checked" noStyle>
              <Switch checkedChildren="ใช่" unCheckedChildren="ไม่" />
            </Form.Item>
          </div>
        ))}

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>
                {inUse
                  ? "มีคลังใช้อยู่ ย้ายคลังไปประเภทอื่นก่อนจึงปิดได้"
                  : "ปิดแล้วจะเลือกประเภทนี้ตอนสร้างคลังไม่ได้"}
              </span>
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
