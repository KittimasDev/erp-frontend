"use client";

import { Button, Form, Input, InputNumber, Select } from "antd";
import type { FormInstance } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";

type Props = {
  /** ชื่อฟิลด์ Form.List (ค่าเริ่มต้น plannedParts) */
  name?: string;
  form: FormInstance;
  label?: string;
};

/** รายการอะไหล่ที่ต้องเตรียม (เลือกสินค้าในคลังได้ หรือพิมพ์ชื่อเอง) */
export default function PlannedPartsEditor({ name = "plannedParts", form, label = "อะไหล่ที่ต้องเตรียม" }: Props) {
  const itemsQuery = useItemsQuery({ isActive: true });
  const items = itemsQuery.data?.data ?? [];

  return (
    <Form.Item label={label}>
      <Form.List name={name}>
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <div key={field.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <Form.Item name={[field.name, "itemId"]} style={{ width: 220 }}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="สินค้าในคลัง (ถ้ามี)"
                    options={items.map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.itemNameTh}` }))}
                    onChange={(value) => {
                      const item = items.find((i) => i.id === value);
                      if (item && !form.getFieldValue([name, field.name, "partName"])) {
                        form.setFieldValue([name, field.name, "partName"], item.itemNameTh);
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item
                  name={[field.name, "partName"]}
                  rules={[{ required: true, whitespace: true, message: "ใส่ชื่ออะไหล่" }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="ชื่ออะไหล่" maxLength={255} />
                </Form.Item>
                <Form.Item name={[field.name, "quantity"]} rules={[{ required: true, message: "ใส่จำนวน" }]} style={{ width: 110 }}>
                  <InputNumber min={0.001} max={999999} placeholder="จำนวน" style={{ width: "100%" }} />
                </Form.Item>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label="ลบ" />
              </div>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantity: 1 })} block>
              เพิ่มอะไหล่
            </Button>
          </>
        )}
      </Form.List>
    </Form.Item>
  );
}
