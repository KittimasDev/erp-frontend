"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Typography,
} from "antd";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useCreateUnitMutation } from "@/hooks/units/useCreateUnitMutation";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import UnitFormModal from "@/components/masters/units/UnitFormModal";
import type {
  CreateUnitConversionRequest,
  UnitConversion,
} from "@/types/unit-conversions";
import styles from "@/components/masters/shared/master-page.module.css";

type UnitConversionFormValues = {
  isGlobal: boolean;
  itemId?: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
  remark?: string;
  isActive: boolean;
};

type UnitConversionFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialConversion?: UnitConversion | null;
  existingConversions: UnitConversion[];
  defaultItemId?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateUnitConversionRequest) => void;
};

function formatRatio(value: number, precision = 6): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return Number(value.toFixed(precision)).toString();
}

export default function UnitConversionFormModal({
  open,
  mode,
  initialConversion,
  existingConversions,
  defaultItemId,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: UnitConversionFormModalProps) {
  const [form] = Form.useForm<UnitConversionFormValues>();

  /*
    เพิ่มหน่วยนับใหม่ได้จากหน้านี้เลย ไม่ต้องเด้งไปหน้า "หน่วยนับ" แล้วกลับมาเริ่มกรอกใหม่

    สิทธิ์คนละตัวกับหน้านี้ — หน้ากฎแปลงหน่วยคุมด้วย MASTERS_UNIT_CONVERSIONS
    (ระดับหัวหน้าฝ่าย เพราะตั้งกฎผิดทำให้สต๊อกทั้งระบบเพี้ยน) ส่วนการสร้างหน่วย
    ต้องมี MASTERS_UNITS.ADD ซึ่งกว้างกว่า จึงต้องเช็คแยก
    ซ่อนไม่ใช่ disable — ปุ่มที่กดไม่ได้ตลอดกาลเป็นแค่ขยะสายตา
  */
  const unitActions = useScreenActionPermissions("MASTERS_UNITS");
  const createUnitMutation = useCreateUnitMutation();
  const [quickUnitOpen, setQuickUnitOpen] = useState(false);
  // เพิ่มหน่วยจากช่องไหน จะได้เติมค่าที่สร้างเสร็จกลับเข้าช่องนั้น
  const [quickUnitTarget, setQuickUnitTarget] = useState<
    "fromUnitId" | "toUnitId"
  >("fromUnitId");

  const renderUnitDropdown = (
    target: "fromUnitId" | "toUnitId",
    menu: ReactElement,
  ): ReactElement => (
    <>
      {menu}
      {unitActions.canAdd ? (
        <>
          <Divider style={{ margin: "8px 0" }} />
          <Button
            type="text"
            icon={<PlusOutlined />}
            block
            /* กัน Select ปิด popup ก่อน onClick จะทำงาน */
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuickUnitTarget(target);
              setQuickUnitOpen(true);
            }}
          >
            เพิ่มหน่วยนับใหม่
          </Button>
        </>
      ) : null}
    </>
  );

  const unitsQuery = useUnitsQuery({ isActive: true });
  const itemsQuery = useItemsQuery({ isActive: true });

  const units = useMemo(() => unitsQuery.data?.data ?? [], [unitsQuery.data]);
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);

  const isGlobal = Form.useWatch("isGlobal", form);
  const fromUnitId = Form.useWatch("fromUnitId", form);
  const toUnitId = Form.useWatch("toUnitId", form);
  const factor = Form.useWatch("factor", form);
  const itemId = Form.useWatch("itemId", form);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialConversion) {
      form.setFieldsValue({
        isGlobal: !initialConversion.itemId,
        itemId: initialConversion.itemId ?? undefined,
        fromUnitId: initialConversion.fromUnitId,
        toUnitId: initialConversion.toUnitId,
        factor: Number(initialConversion.factor),
        remark: initialConversion.remark,
        isActive: initialConversion.isActive,
      });
      return;
    }

    form.setFieldsValue({
      isGlobal: !defaultItemId,
      itemId: defaultItemId,
      fromUnitId: undefined,
      toUnitId: undefined,
      factor: undefined,
      remark: undefined,
      isActive: true,
    });
  }, [open, mode, initialConversion, defaultItemId, form]);

  const unitOptions = useMemo(
    () =>
      units.map((unit) => ({
        value: unit.id,
        label: `${unit.code} — ${unit.nameTh}`,
      })),
    [units],
  );

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.itemCode} — ${item.itemNameTh}`,
      })),
    [items],
  );

  const unitLabelById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit.nameTh || unit.code])),
    [units],
  );

  const preview = useMemo(() => {
    if (!fromUnitId || !toUnitId || !factor || factor <= 0) {
      return null;
    }
    const from = unitLabelById.get(fromUnitId) ?? "";
    const to = unitLabelById.get(toUnitId) ?? "";
    return {
      forward: `1 ${from} = ${formatRatio(factor)} ${to}`,
      backward: `1 ${to} = ${formatRatio(1 / factor)} ${from}`,
    };
  }, [fromUnitId, toUnitId, factor, unitLabelById]);

  /** กันซ้ำตั้งแต่ฝั่ง client — backend ก็กันอีกชั้น แต่บอกผู้ใช้ก่อนกดบันทึกดีกว่า */
  const duplicateRule = useMemo(() => {
    if (!fromUnitId || !toUnitId) {
      return null;
    }
    const scopeItemId = isGlobal ? null : (itemId ?? null);

    return (
      existingConversions.find((rule) => {
        if (rule.id === initialConversion?.id) {
          return false;
        }
        if ((rule.itemId ?? null) !== scopeItemId) {
          return false;
        }
        return (
          (rule.fromUnitId === fromUnitId && rule.toUnitId === toUnitId) ||
          (rule.fromUnitId === toUnitId && rule.toUnitId === fromUnitId)
        );
      }) ?? null
    );
  }, [
    existingConversions,
    fromUnitId,
    toUnitId,
    isGlobal,
    itemId,
    initialConversion,
  ]);

  const handleOk = async () => {
    const values = await form.validateFields();

    onSubmit({
      itemId: values.isGlobal ? null : values.itemId,
      fromUnitId: values.fromUnitId,
      toUnitId: values.toUnitId,
      factor: values.factor,
      remark: values.remark?.trim() || undefined,
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
      okButtonProps={{ disabled: Boolean(duplicateRule) }}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={620}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>

        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE RULE" : "EDIT RULE"}
          </div>

          <h2>{isCreateMode ? "เพิ่มกฎแปลงหน่วย" : "แก้ไขกฎแปลงหน่วย"}</h2>

          <p>
            กำหนดว่า 1 หน่วยต้นทาง เท่ากับกี่หน่วยปลายทาง
            ทิศย้อนกลับระบบคำนวณให้เองไม่ต้องตั้งซ้ำ
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
            <strong>ขอบเขตของกฎ</strong>
            <span>
              กฎกลางใช้ได้ทุกสินค้า ส่วนกฎรายสินค้าจะทับกฎกลางคู่หน่วยเดียวกัน
            </span>
          </div>
        </div>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>ใช้กับทุกสินค้า (กฎกลาง)</strong>

              <span>
                เปิดไว้สำหรับกฎฟิสิกส์ เช่น 1 กิโลกรัม = 1000 กรัม ·
                ปิดเมื่อกฎขึ้นกับสินค้า เช่น ยางแผ่น 1 มัด = 25 กิโลกรัม
              </span>
            </div>
          </div>

          <Form.Item name="isGlobal" valuePropName="checked" noStyle>
            <Switch
              checkedChildren="กลาง"
              unCheckedChildren="รายสินค้า"
              disabled={mode === "edit"}
            />
          </Form.Item>
        </div>

        {!isGlobal ? (
          <Form.Item
            label="สินค้า"
            name="itemId"
            rules={[{ required: true, message: "กรุณาเลือกสินค้า" }]}
            extra={
              mode === "edit"
                ? "ย้ายกฎข้ามสินค้าไม่ได้ — ถ้าต้องเปลี่ยนให้ลบแล้วสร้างใหม่"
                : undefined
            }
          >
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              placeholder="เลือกสินค้าที่กฎนี้ใช้"
              loading={itemsQuery.isLoading}
              options={itemOptions}
              disabled={mode === "edit"}
            />
          </Form.Item>
        ) : null}

        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />

          <div>
            <strong>ตัวคูณ</strong>
            <span>1 หน่วยต้นทาง เท่ากับกี่หน่วยปลายทาง</span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Form.Item
            label="หน่วยต้นทาง"
            name="fromUnitId"
            rules={[{ required: true, message: "กรุณาเลือกหน่วยต้นทาง" }]}
          >
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              placeholder="เช่น กิโลกรัม"
              loading={unitsQuery.isLoading}
              options={unitOptions}
              popupRender={(menu) => renderUnitDropdown("fromUnitId", menu)}
            />
          </Form.Item>

          <Form.Item
            label="หน่วยปลายทาง"
            name="toUnitId"
            dependencies={["fromUnitId"]}
            rules={[
              { required: true, message: "กรุณาเลือกหน่วยปลายทาง" },
              {
                validator: async (_, value: string) => {
                  if (value && value === form.getFieldValue("fromUnitId")) {
                    throw new Error("หน่วยต้นทางกับปลายทางต้องไม่ใช่หน่วยเดียวกัน");
                  }
                },
              },
            ]}
          >
            <Select
              size="large"
              showSearch
              optionFilterProp="label"
              placeholder="เช่น กรัม"
              loading={unitsQuery.isLoading}
              options={unitOptions}
              popupRender={(menu) => renderUnitDropdown("toUnitId", menu)}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="ตัวคูณ"
          name="factor"
          rules={[
            { required: true, message: "กรุณากรอกตัวคูณ" },
            {
              validator: async (_, value: number | null) => {
                if (value !== null && value !== undefined && value <= 0) {
                  throw new Error("ตัวคูณต้องมากกว่า 0");
                }
              },
            },
          ]}
        >
          <InputNumber
            size="large"
            style={{ width: "100%" }}
            min={0}
            step={1}
            precision={6}
            placeholder="เช่น 1000"
          />
        </Form.Item>

        {preview ? (
          <div className={styles.statusBox}>
            <div className={styles.statusContent}>
              <div className={styles.statusIcon}>=</div>

              <div>
                <strong>{preview.forward}</strong>
                <span>{preview.backward}</span>
              </div>
            </div>
          </div>
        ) : null}

        {duplicateRule ? (
          <Typography.Text type="danger">
            มีกฎแปลงระหว่างหน่วยคู่นี้อยู่แล้วในขอบเขตเดียวกัน
            กรุณาแก้กฎเดิมแทนการสร้างใหม่
          </Typography.Text>
        ) : null}

        <Form.Item label="หมายเหตุ" name="remark">
          <Input.TextArea
            rows={2}
            maxLength={500}
            placeholder="เช่น อ้างอิงข้อตกลงกับผู้ขาย"
          />
        </Form.Item>

        <div className={styles.statusBox}>
          <div className={styles.statusContent}>
            <div className={styles.statusIcon}>●</div>

            <div>
              <strong>สถานะใช้งาน</strong>

              <span>ปิดไว้เพื่อหยุดใช้กฎนี้ชั่วคราวโดยไม่ต้องลบ</span>
            </div>
          </div>

          <Form.Item name="isActive" valuePropName="checked" noStyle>
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </div>
      </Form>

      {/*
        Modal ซ้อน Modal — antd จัดการ z-index ให้เอง ปิดตัวในแล้วตัวนอกยังอยู่
        ฟอร์มตัวนอกไม่ถูก destroy จึงเติมค่าที่สร้างเสร็จกลับเข้าช่องได้

        ใช้ UnitFormModal ตัวเดียวกับหน้า "หน่วยนับ" ไม่เขียนฟอร์มหน่วยตัวที่สอง
        ไม่งั้น validation กับค่า default จะค่อย ๆ เพี้ยนออกจากกัน
      */}
      <UnitFormModal
        open={quickUnitOpen}
        mode="create"
        confirmLoading={createUnitMutation.isPending}
        onCancel={() => setQuickUnitOpen(false)}
        onSubmit={(values) => {
          createUnitMutation.mutate(values, {
            onSuccess: (response) => {
              setQuickUnitOpen(false);
              // เติมหน่วยที่เพิ่งสร้างเข้าช่องที่กดมา — ไม่ต้องไปหาใน dropdown เอง
              if (response.data?.id) {
                form.setFieldValue(quickUnitTarget, response.data.id);
                void form.validateFields([quickUnitTarget]);
              }
            },
          });
        }}
      />
    </Modal>
  );
}
