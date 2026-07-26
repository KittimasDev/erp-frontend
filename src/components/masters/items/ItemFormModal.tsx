"use client";

import { useEffect } from "react";
import {
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
} from "antd";

import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import type { CreateItemRequest, Item } from "@/types/items";
import styles from "@/components/masters/shared/master-page.module.css";

type ItemFormValues = {
  code: string;
  name: string;
  itemCategoryId: string;
  unitId: string;
  warehouseGroup?: string;
  minimumStockQty?: number | null;
  defaultShelfLifeDays?: number | null;
  isPurchaseItem: boolean;
  isStockItem: boolean;
  isIssueItem: boolean;
  isSalesItem: boolean;
  requiresLotControl: boolean;
  requiresQc: boolean;
  requiresExpiryDate: boolean;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isActive: boolean;
};

type ItemFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialItem?: Item | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateItemRequest) => void;
};

const WAREHOUSE_GROUP_OPTIONS = [
  { value: "RAW_MATERIAL", label: "RAW_MATERIAL" },
  { value: "CHEMICAL", label: "CHEMICAL" },
  { value: "FINISHED_GOODS", label: "FINISHED_GOODS" },
  { value: "OIL_TANK", label: "OIL_TANK" },
  { value: "SPARE_PART", label: "SPARE_PART" },
  { value: "HOLD", label: "HOLD" },
  { value: "REJECT", label: "REJECT" },
];

export default function ItemFormModal({
  open,
  mode,
  initialItem,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: ItemFormModalProps) {
  const [form] = Form.useForm<ItemFormValues>();
  const categoriesQuery = useItemCategoriesQuery({ isActive: true });
  const unitsQuery = useUnitsQuery();

  const categories = categoriesQuery.data?.data ?? [];
  const units = (unitsQuery.data?.data ?? []).filter((unit) => unit.isActive);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialItem) {
      form.setFieldsValue({
        code: initialItem.itemCode,
        name: initialItem.itemNameTh,
        itemCategoryId: initialItem.itemCategoryId,
        unitId: initialItem.unitId,
        warehouseGroup: initialItem.warehouseGroup,
        minimumStockQty: Number(initialItem.minimumStockQty || 0),
        defaultShelfLifeDays: initialItem.defaultShelfLifeDays,
        isPurchaseItem: initialItem.isPurchaseItem,
        isStockItem: initialItem.isStockItem,
        isIssueItem: initialItem.isIssueItem,
        isSalesItem: initialItem.isSalesItem,
        requiresLotControl: initialItem.requiresLotControl,
        requiresQc: initialItem.requiresQc,
        requiresExpiryDate: initialItem.requiresExpiryDate,
        allowNegativeStock: initialItem.allowNegativeStock,
        isQcRequired: initialItem.isQcRequired,
        isActive: initialItem.isActive,
      });
      return;
    }

    form.setFieldsValue({
      code: "",
      name: "",
      itemCategoryId: undefined,
      unitId: undefined,
      warehouseGroup: undefined,
      minimumStockQty: 0,
      defaultShelfLifeDays: undefined,
      isPurchaseItem: true,
      isStockItem: true,
      isIssueItem: true,
      isSalesItem: false,
      requiresLotControl: false,
      requiresQc: false,
      requiresExpiryDate: false,
      allowNegativeStock: false,
      isQcRequired: false,
      isActive: true,
    });
  }, [open, mode, initialItem, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      code: values.code.trim(),
      name: values.name.trim(),
      itemCategoryId: values.itemCategoryId,
      unitId: values.unitId,
      warehouseGroup: values.warehouseGroup || undefined,
      minimumStockQty: values.minimumStockQty ?? 0,
      defaultShelfLifeDays:
        values.defaultShelfLifeDays === null ||
        values.defaultShelfLifeDays === undefined
          ? undefined
          : values.defaultShelfLifeDays,
      isPurchaseItem: values.isPurchaseItem,
      isStockItem: values.isStockItem,
      isIssueItem: values.isIssueItem,
      isSalesItem: values.isSalesItem,
      requiresLotControl: values.requiresLotControl,
      requiresQc: values.requiresQc,
      requiresExpiryDate: values.requiresExpiryDate,
      allowNegativeStock: values.allowNegativeStock,
      isQcRequired: values.isQcRequired,
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
      width={760}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>
          {isCreateMode ? "+" : "✎"}
        </div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE ITEM" : "EDIT ITEM"}
          </div>

          <h2>{isCreateMode ? "เพิ่มสินค้า" : "แก้ไขสินค้า"}</h2>

          <p>
            {isCreateMode
              ? "กรอกข้อมูลสินค้า/วัตถุดิบใหม่ที่ต้องการเพิ่มเข้าสู่ระบบ"
              : "แก้ไขรายละเอียดสินค้าและสถานะการใช้งาน"}
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
            <strong>ข้อมูลหลัก</strong>
            <span>ระบุรหัส ชื่อ หมวดหมู่ และหน่วยนับ</span>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="รหัสสินค้า"
              name="code"
              rules={[
                { required: true, message: "กรุณากรอกรหัสสินค้า" },
                { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
              ]}
            >
              <Input size="large" placeholder="เช่น RM-001" autoComplete="off" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="ชื่อสินค้า"
          name="name"
          rules={[
            { required: true, message: "กรุณากรอกชื่อสินค้า" },
            { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
          ]}
        >
          <Input
            size="large"
            placeholder="เช่น ยางรถยนต์ใช้แล้ว"
            autoComplete="off"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="หมวดหมู่สินค้า"
              name="itemCategoryId"
              rules={[{ required: true, message: "กรุณาเลือกหมวดหมู่" }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกหมวดหมู่"
                loading={categoriesQuery.isLoading}
                options={categories.map((category) => ({
                  value: category.id,
                  label: `${category.code} — ${category.nameTh}`,
                }))}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="หน่วยนับ"
              name="unitId"
              rules={[{ required: true, message: "กรุณาเลือกหน่วยนับ" }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกหน่วยนับ"
                loading={unitsQuery.isLoading}
                options={units.map((unit) => ({
                  value: unit.id,
                  label: `${unit.code} — ${unit.nameTh}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label="กลุ่มคลัง" name="warehouseGroup">
              <Select
                allowClear
                size="large"
                placeholder="เลือกกลุ่มคลัง"
                options={WAREHOUSE_GROUP_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={6}>
            <Form.Item label="สต๊อกขั้นต่ำ" name="minimumStockQty">
              <InputNumber
                size="large"
                min={0}
                style={{ width: "100%" }}
                placeholder="0"
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={6}>
            <Form.Item label="อายุเก็บ (วัน)" name="defaultShelfLifeDays">
              <InputNumber
                size="large"
                min={0}
                precision={0}
                style={{ width: "100%" }}
                placeholder="เช่น 365"
              />
            </Form.Item>
          </Col>
        </Row>

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>การใช้งาน</strong>
            <span>กำหนดบทบาทของสินค้าในระบบ</span>
          </div>
        </div>

        <Row gutter={[16, 12]}>
          {(
            [
              ["isPurchaseItem", "ใช้จัดซื้อ"],
              ["isStockItem", "คุมสต๊อก"],
              ["isIssueItem", "เบิกได้"],
              ["isSalesItem", "ขายได้"],
              ["requiresLotControl", "คุม Lot"],
              ["requiresQc", "ต้อง QC"],
              ["requiresExpiryDate", "มีวันหมดอายุ"],
              ["allowNegativeStock", "ติดลบได้"],
              ["isQcRequired", "เข้าคลังต้อง QC"],
            ] as const
          ).map(([name, label]) => (
            <Col xs={12} sm={8} key={name}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span>{label}</span>
                <Form.Item name={name} valuePropName="checked" noStyle>
                  <Switch size="small" />
                </Form.Item>
              </div>
            </Col>
          ))}
        </Row>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>
            <div>
              <strong>สถานะใช้งาน</strong>
              <span>เปิดใช้งานเพื่อเลือกสินค้านี้ในเอกสารต่าง ๆ ได้</span>
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
