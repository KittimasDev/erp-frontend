"use client";

import { Form, Input, InputNumber, Modal, Select } from "antd";

import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { OIL_TANK_STATUS_LABEL, type CreateOilTankBody, type OilTank, type UpdateOilTankBody } from "@/types/oil-tank-farm";

type Props = {
  tank: OilTank | null;
  loading: boolean;
  onCancel: () => void;
  onCreate: (body: CreateOilTankBody) => void;
  onUpdate: (id: string, body: UpdateOilTankBody) => void;
};

type Values = {
  tankNo: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  capacityLiters: number;
  status?: string;
  remark?: string;
};

/** สร้าง/แก้ถัง — แก้ได้เฉพาะความจุ สถานะ หมายเหตุ (ถัง สินค้า คลัง ตำแหน่ง ผูกกับยอดสต๊อกแล้วเปลี่ยนไม่ได้) */
export default function TankFormModal({ tank, loading, onCancel, onCreate, onUpdate }: Props) {
  const [form] = Form.useForm<Values>();
  const editing = Boolean(tank);
  const warehouseId = Form.useWatch("warehouseId", form) ?? tank?.warehouseId;
  const itemsQuery = useItemsQuery({ isActive: true });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ warehouseId, isActive: true }, { enabled: Boolean(warehouseId) });

  return (
    <Modal
      open
      title={editing ? `แก้ไขถัง ${tank?.tankNo}` : "เพิ่มถังเก็บน้ำมัน"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() =>
        void form.validateFields().then((v) =>
          editing && tank
            ? onUpdate(tank.id, { capacityLiters: v.capacityLiters, status: v.status, remark: v.remark })
            : onCreate({
                tankNo: v.tankNo.trim(),
                itemId: v.itemId,
                warehouseId: v.warehouseId,
                locationId: v.locationId,
                capacityLiters: v.capacityLiters,
                remark: v.remark,
              }),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          tankNo: tank?.tankNo,
          itemId: tank?.itemId,
          warehouseId: tank?.warehouseId,
          locationId: tank?.locationId,
          capacityLiters: tank ? Number(tank.capacityLiters) : undefined,
          status: tank?.status ?? "ACTIVE",
          remark: tank?.remark,
        }}
      >
        <Form.Item name="tankNo" label="เลขที่ถัง" rules={[{ required: true, whitespace: true, message: "ใส่เลขที่ถัง" }]}>
          <Input disabled={editing} maxLength={50} placeholder="เช่น TANK-01" />
        </Form.Item>
        <Form.Item name="itemId" label="น้ำมันที่เก็บ (สินค้า)" rules={[{ required: true, message: "เลือกสินค้า" }]}>
          <Select
            showSearch
            disabled={editing}
            optionFilterProp="label"
            loading={itemsQuery.isLoading}
            options={(itemsQuery.data?.data ?? []).map((i) => ({ value: i.id, label: `${i.itemCode} — ${i.itemNameTh}` }))}
          />
        </Form.Item>
        <Form.Item name="warehouseId" label="คลัง" rules={[{ required: true, message: "เลือกคลัง" }]}>
          <Select
            showSearch
            disabled={editing}
            optionFilterProp="label"
            loading={warehousesQuery.isLoading}
            options={(warehousesQuery.data?.data ?? []).map((w) => ({ value: w.id, label: `${w.warehouseCode} — ${w.warehouseName}` }))}
            onChange={() => form.setFieldValue("locationId", undefined)}
          />
        </Form.Item>
        <Form.Item name="locationId" label="ตำแหน่งจัดเก็บที่แทนถังนี้" rules={[{ required: true, message: "เลือกตำแหน่ง" }]}>
          <Select
            showSearch
            disabled={editing || !warehouseId}
            optionFilterProp="label"
            loading={locationsQuery.isLoading}
            options={(locationsQuery.data?.data ?? []).map((l) => ({ value: l.id, label: `${l.locationCode} — ${l.locationName}` }))}
          />
        </Form.Item>
        <Form.Item name="capacityLiters" label="ความจุ (ลิตร)" rules={[{ required: true, message: "ใส่ความจุ" }]}>
          <InputNumber min={1} precision={3} style={{ width: "100%" }} />
        </Form.Item>
        {editing ? (
          <Form.Item name="status" label="สถานะ" extra="ถังที่ไม่ใช่ “ใช้งาน” รับ/โอน/จ่ายไม่ได้">
            <Select options={Object.entries(OIL_TANK_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
        ) : null}
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
