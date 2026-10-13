"use client";

import { Button, Checkbox, Form, Input, Modal, Select } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import {
  LAB_SAMPLE_TYPE_LABEL,
  LAB_SAMPLE_TYPES,
  type CreateLabSpecBody,
  type LabSpec,
  type UpdateLabSpecBody,
} from "@/types/laboratory";

type Props = {
  spec: LabSpec | null;
  loading: boolean;
  onCancel: () => void;
  onCreate: (body: CreateLabSpecBody) => void;
  onUpdate: (id: string, body: UpdateLabSpecBody) => void;
};

type Values = {
  sampleType: string;
  itemId?: string;
  nameTh: string;
  isActive: boolean;
  parameters: Array<{
    parameterName: string;
    unit?: string;
    specMin?: string;
    specMax?: string;
    isRequired?: boolean;
  }>;
};

/** สร้าง/แก้ Spec การตรวจ — ประเภทและสินค้าแก้ไม่ได้หลังสร้าง (เป็นคีย์ของ Spec) */
export default function LabSpecFormModal({
  spec,
  loading,
  onCancel,
  onCreate,
  onUpdate,
}: Props) {
  const [form] = Form.useForm<Values>();
  const editing = Boolean(spec);
  const itemsQuery = useItemsQuery({ isActive: true });

  return (
    <Modal
      open
      width={760}
      title={editing ? `แก้ไข Spec — ${spec?.nameTh}` : "เพิ่ม Spec การตรวจ"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() =>
        void form.validateFields().then((v) => {
          const parameters = v.parameters.map((p, index) => ({
            parameterName: p.parameterName.trim(),
            unit: p.unit?.trim() || undefined,
            specMin: p.specMin?.trim() || undefined,
            specMax: p.specMax?.trim() || undefined,
            isRequired: Boolean(p.isRequired),
            sortOrder: index,
          }));
          if (spec) {
            onUpdate(spec.id, {
              nameTh: v.nameTh.trim(),
              isActive: v.isActive,
              parameters,
            });
          } else {
            onCreate({
              sampleType: v.sampleType,
              itemId: v.itemId,
              nameTh: v.nameTh.trim(),
              parameters,
            });
          }
        })
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          sampleType: spec?.sampleType,
          itemId: spec?.itemId,
          nameTh: spec?.nameTh,
          isActive: spec?.isActive ?? true,
          parameters: spec?.parameters.length
            ? spec.parameters.map((p) => ({
                parameterName: p.parameterName,
                unit: p.unit,
                specMin: p.specMin,
                specMax: p.specMax,
                isRequired: p.isRequired,
              }))
            : [{}],
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="sampleType"
            label="ประเภทตัวอย่าง"
            rules={[{ required: true, message: "เลือกประเภท" }]}
            style={{ flex: 1 }}
          >
            <Select
              disabled={editing}
              options={LAB_SAMPLE_TYPES.map((value) => ({
                value,
                label: LAB_SAMPLE_TYPE_LABEL[value],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="itemId"
            label="สินค้าเฉพาะ (ไม่ใส่ = ใช้กับทั้งประเภท)"
            style={{ flex: 1 }}
            extra="สินค้าที่มี Spec เฉพาะจะใช้อันนั้น ไม่ใช้ของทั้งประเภท"
          >
            <Select
              allowClear
              showSearch
              disabled={editing}
              optionFilterProp="label"
              loading={itemsQuery.isLoading}
              options={(itemsQuery.data?.data ?? []).map((i) => ({
                value: i.id,
                label: `${i.itemCode} — ${i.itemNameTh}`,
              }))}
            />
          </Form.Item>
        </div>
        <Form.Item
          name="nameTh"
          label="ชื่อ Spec"
          rules={[{ required: true, message: "ใส่ชื่อ Spec" }]}
        >
          <Input maxLength={255} placeholder="เช่น น้ำมันไพโรไลซิส" />
        </Form.Item>
        {editing ? (
          <Form.Item name="isActive" valuePropName="checked">
            <Checkbox>เปิดใช้งาน</Checkbox>
          </Form.Item>
        ) : null}

        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          พารามิเตอร์และเกณฑ์
        </div>
        <div style={{ color: "#8a94a6", fontSize: 12, marginBottom: 8 }}>
          เกณฑ์เว้นว่างได้ (ไม่จำกัด) —
          ผลที่ไม่มีเกณฑ์จะไม่ถูกตัดสินผ่าน/ไม่ผ่าน · ติ๊ก &quot;จำเป็น&quot; =
          เตือนตอนคีย์ผลถ้ายังไม่มีพารามิเตอร์นี้
        </div>
        <Form.List name="parameters">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  <Form.Item
                    name={[field.name, "parameterName"]}
                    rules={[{ required: true, message: "ชื่อ" }]}
                    style={{ flex: 3 }}
                  >
                    <Input
                      placeholder="พารามิเตอร์ เช่น Viscosity"
                      maxLength={255}
                    />
                  </Form.Item>
                  <Form.Item name={[field.name, "unit"]} style={{ flex: 1 }}>
                    <Input placeholder="หน่วย" maxLength={50} />
                  </Form.Item>
                  <Form.Item name={[field.name, "specMin"]} style={{ flex: 1 }}>
                    <Input placeholder="Min" maxLength={100} />
                  </Form.Item>
                  <Form.Item name={[field.name, "specMax"]} style={{ flex: 1 }}>
                    <Input placeholder="Max" maxLength={100} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "isRequired"]}
                    valuePropName="checked"
                    style={{ flex: 1 }}
                  >
                    <Checkbox>จำเป็น</Checkbox>
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="ลบพารามิเตอร์"
                    disabled={fields.length <= 1}
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => add({})}>
                เพิ่มพารามิเตอร์
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
