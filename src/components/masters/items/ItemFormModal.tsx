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
  Space,
  Switch,
} from "antd";

import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import type { CreateItemRequest, Item } from "@/types/items";
import {
  ITEM_TYPE_OPTIONS,
  initialItemType,
} from "@/components/masters/items/item-type-options";
import styles from "@/components/masters/shared/master-page.module.css";

type ItemFormValues = {
  code: string;
  name: string;
  description?: string;
  itemCategoryId: string;
  unitId: string;
  itemType?: string;
  warehouseGroup?: string;
  minimumStockQty?: number | null;
  sellingPrice?: number | null;
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

/** ป้ายกำกับคงเดิมทุกตัว แค่จัดเป็นกลุ่มให้กวาดตาหาได้เร็วขึ้น */
type ToggleField = Extract<
  keyof ItemFormValues,
  | "isPurchaseItem"
  | "isStockItem"
  | "isIssueItem"
  | "isSalesItem"
  | "requiresLotControl"
  | "requiresQc"
  | "requiresExpiryDate"
  | "allowNegativeStock"
  | "isQcRequired"
>;

/** กลุ่มที่ช่องราคาขายไปเกาะอยู่ด้วย */
const SALES_GROUP_TITLE = "บทบาทของสินค้า";

const TOGGLE_GROUPS: Array<{
  title: string;
  items: Array<[ToggleField, string]>;
}> = [
  {
    title: "บทบาทของสินค้า",
    items: [
      ["isPurchaseItem", "ใช้จัดซื้อ"],
      ["isStockItem", "คุมสต๊อก"],
      ["isIssueItem", "เบิกได้"],
      ["isSalesItem", "ขายได้"],
    ],
  },
  {
    title: "การควบคุมคุณภาพและสต๊อก",
    items: [
      ["requiresLotControl", "คุม Lot"],
      ["requiresQc", "ต้อง QC"],
      ["requiresExpiryDate", "มีวันหมดอายุ"],
      ["allowNegativeStock", "ติดลบได้"],
      ["isQcRequired", "เข้าคลังต้อง QC"],
    ],
  },
];

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
  // ใช้ไฮไลต์การ์ดที่เปิดอยู่ ให้เห็นสถานะได้จากการกวาดตาครั้งเดียว
  const watched = Form.useWatch<ItemFormValues>([], form);
  const categoriesQuery = useItemCategoriesQuery({ isActive: true });
  const unitsQuery = useUnitsQuery();

  const categories = categoriesQuery.data?.data ?? [];
  const units = (unitsQuery.data?.data ?? []).filter((unit) => unit.isActive);

  // ใช้ต่อท้ายช่องราคาให้รู้ว่าราคานี้ต่อหน่วยอะไร
  const selectedUnitLabel = watched?.unitId
    ? `บาท / ${units.find((unit) => unit.id === watched.unitId)?.nameTh ?? "หน่วย"}`
    : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialItem) {
      form.setFieldsValue({
        code: initialItem.itemCode,
        name: initialItem.itemNameTh,
        description: initialItem.description,
        itemCategoryId: initialItem.itemCategoryId,
        unitId: initialItem.unitId,
        itemType: initialItemType(initialItem),
        warehouseGroup: initialItem.warehouseGroup,
        minimumStockQty: Number(initialItem.minimumStockQty || 0),
        sellingPrice:
          initialItem.sellingPrice != null
            ? Number(initialItem.sellingPrice)
            : undefined,
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
      description: "",
      itemCategoryId: undefined,
      unitId: undefined,
      itemType: undefined,
      warehouseGroup: undefined,
      minimumStockQty: 0,
      sellingPrice: undefined,
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
      description: values.description?.trim() || undefined,
      itemCategoryId: values.itemCategoryId,
      unitId: values.unitId,
      itemType: values.itemType,
      warehouseGroup: values.warehouseGroup as string,
      minimumStockQty: values.minimumStockQty ?? 0,
      // ส่งเฉพาะตอนขายได้ ปิดแล้วไม่ต้องยัดราคาไปให้ backend
      sellingPrice: values.isSalesItem
        ? (values.sellingPrice ?? undefined)
        : undefined,
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
  const lockCoreFields =
    !isCreateMode && Boolean(initialItem?.hasTransactions);
  const lockHint = "มีเอกสารแล้ว แก้ไม่ได้";
  const lockedToggles = new Set<ToggleField>([
    "requiresLotControl",
    "requiresExpiryDate",
  ]);

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
          <Col xs={24} sm={8}>
            <Form.Item
              label="รหัสสินค้า"
              name="code"
              extra={lockCoreFields ? lockHint : undefined}
              rules={[
                { required: true, message: "กรุณากรอกรหัสสินค้า" },
                { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
              ]}
            >
              <Input
                size="large"
                placeholder="เช่น RM-001"
                autoComplete="off"
                disabled={lockCoreFields}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={16}>
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
          </Col>
        </Row>

        <Form.Item label="คำอธิบาย" name="description">
          <Input.TextArea
            rows={3}
            placeholder="เช่น ยางรถยนต์ใช้แล้วสำหรับผลิตน้ำมัน pyrolysis"
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
              label="ประเภทสินค้า"
              name="itemType"
              extra="สินค้าสำเร็จรูปคือ FINISHED_GOODS แม้ของจะอยู่คลังรอตรวจหรือของเสีย"
              rules={[{ required: true, message: "กรุณาเลือกประเภทสินค้า" }]}
            >
              <Select
                size="large"
                placeholder="เลือกประเภทสินค้า"
                options={[...ITEM_TYPE_OPTIONS]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="หน่วยนับ"
              name="unitId"
              extra={lockCoreFields ? lockHint : undefined}
              rules={[{ required: true, message: "กรุณาเลือกหน่วยนับ" }]}
            >
              <Select
                size="large"
                showSearch
                optionFilterProp="label"
                placeholder="เลือกหน่วยนับ"
                loading={unitsQuery.isLoading}
                disabled={lockCoreFields}
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
            <Form.Item
              label="กลุ่มคลัง"
              name="warehouseGroup"
              rules={[{ required: true, message: "กรุณาเลือกกลุ่มคลัง" }]}
            >
              <Select
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

        {TOGGLE_GROUPS.map((group) => (
          <div className={styles.toggleGroup} key={group.title}>
            <div className={styles.toggleGroupLabel}>{group.title}</div>

            <div className={styles.toggleGrid}>
              {group.items.map(([name, label]) => {
                const checked = Boolean(watched?.[name]);
                const locked = lockCoreFields && lockedToggles.has(name);

                return (
                  <div
                    key={name}
                    className={`${styles.toggleTile} ${
                      checked ? styles.toggleTileOn : ""
                    }`}
                    title={locked ? lockHint : undefined}
                    // กดที่การ์ดทั้งใบได้ ไม่ต้องเล็งสวิตช์เล็ก ๆ
                    onClick={() => {
                      if (locked) {
                        return;
                      }
                      form.setFieldValue(name, !checked);
                    }}
                  >
                    <span>{label}</span>

                    {/* กันไม่ให้คลิกสวิตช์เด้งไปโดน onClick ของการ์ดซ้ำอีกรอบ */}
                    <div
                      onClick={(event) => event.stopPropagation()}
                      style={{ display: "flex" }}
                    >
                      <Form.Item name={name} valuePropName="checked" noStyle>
                        <Switch size="small" disabled={locked} />
                      </Form.Item>
                    </div>
                  </div>
                );
              })}
            </div>

            {/*
              ราคาขายผูกกับสวิตช์ "ขายได้" จึงวางไว้ติดกันในกลุ่มเดียวกัน
              ไม่ใช่ลอยอยู่คนละที่กับตัวที่คุมมัน
            */}
            {group.title === SALES_GROUP_TITLE && watched?.isSalesItem ? (
              <div className={styles.inlineField}>
                <Form.Item
                  label="ราคาขาย (ก่อน VAT)"
                  extra="ใช้เติมราคาให้อัตโนมัติเมื่อเลือกสินค้านี้ในใบเสนอราคา แก้ไขในเอกสารได้"
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <Form.Item
                      name="sellingPrice"
                      noStyle
                      rules={[{ required: true, message: "กรุณากรอกราคาขาย" }]}
                    >
                      <InputNumber
                        size="large"
                        min={0}
                        step={1}
                        style={{ width: "100%" }}
                        placeholder="เช่น 1250"
                      />
                    </Form.Item>
                    <Input
                      size="large"
                      disabled
                      value={selectedUnitLabel ?? "บาท / หน่วย"}
                      style={{ width: 132 }}
                    />
                  </Space.Compact>
                </Form.Item>
              </div>
            ) : null}
          </div>
        ))}

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
