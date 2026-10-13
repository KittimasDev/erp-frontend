"use client";

import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from "antd";
import dayjs from "dayjs";

import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { EQUIPMENT_STATUS_LABEL, type Equipment, type EquipmentBody } from "@/types/maintenance";

type FormValues = {
  equipmentCode: string;
  name: string;
  category?: string;
  locationId?: string;
  status?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  installedDate?: dayjs.Dayjs | null;
  warrantyExpiryDate?: dayjs.Dayjs | null;
  warrantyNote?: string;
  runningHours?: number | null;
  remark?: string;
};

type Props = {
  /** null = สร้างใหม่ */
  equipment: Equipment | null;
  categories: string[];
  loading: boolean;
  onCancel: () => void;
  onSubmit: (body: EquipmentBody) => void;
};

const fmt = (d?: dayjs.Dayjs | null) => (d ? d.format("YYYY-MM-DD") : "");

/** ฟอร์มข้อมูลเครื่องจักร: รหัส/ชื่อ/หมวด/ตำแหน่ง/Serial/ประกัน/ชั่วโมงเดินเครื่อง */
export default function EquipmentFormModal({ equipment, categories, loading, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  const editing = Boolean(equipment);

  return (
    <Modal
      open
      width={720}
      title={editing ? `แก้ไขเครื่องจักร ${equipment?.equipmentCode}` : "เพิ่มเครื่องจักร"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() =>
        void form.validateFields().then((v) =>
          onSubmit({
            ...(editing ? {} : { equipmentCode: v.equipmentCode.trim() }),
            name: v.name.trim(),
            category: v.category ?? "",
            locationId: v.locationId,
            status: editing ? v.status : undefined,
            serialNumber: v.serialNumber ?? "",
            manufacturer: v.manufacturer ?? "",
            model: v.model ?? "",
            installedDate: fmt(v.installedDate),
            warrantyExpiryDate: fmt(v.warrantyExpiryDate),
            warrantyNote: v.warrantyNote ?? "",
            runningHours: v.runningHours ?? undefined,
            remark: v.remark ?? "",
          }),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          equipmentCode: equipment?.equipmentCode,
          name: equipment?.name,
          category: equipment?.category,
          locationId: equipment?.locationId,
          status: equipment?.status ?? "ACTIVE",
          serialNumber: equipment?.serialNumber,
          manufacturer: equipment?.manufacturer,
          model: equipment?.model,
          installedDate: equipment?.installedDate ? dayjs(equipment.installedDate) : null,
          warrantyExpiryDate: equipment?.warrantyExpiryDate ? dayjs(equipment.warrantyExpiryDate) : null,
          warrantyNote: equipment?.warrantyNote,
          runningHours: equipment?.runningHours,
          remark: equipment?.remark,
        }}
      >
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name="equipmentCode" label="รหัสเครื่อง (Machine Code)" rules={[{ required: true, whitespace: true, message: "ใส่รหัสเครื่อง" }]}>
              <Input disabled={editing} maxLength={50} placeholder="เช่น EQ-001" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="name" label="ชื่อเครื่องจักร" rules={[{ required: true, whitespace: true, message: "ใส่ชื่อ" }]}>
              <Input maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="category" label="หมวด (Category)">
              <Select
                allowClear
                showSearch
                placeholder="พิมพ์หรือเลือกหมวด"
                options={categories.map((c) => ({ value: c, label: c }))}
                // พิมพ์หมวดใหม่ได้ — ค่าที่พิมพ์ถูกใช้เป็นค่าของฟิลด์
                onSearch={(text) => text && form.setFieldValue("category", text)}
                notFoundContent="พิมพ์ชื่อหมวดใหม่ได้เลย"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="locationId" label="ตำแหน่งที่ตั้ง / ตำแหน่งจัดเก็บอะไหล่" extra="ใช้เป็นที่ตัดสต๊อกอะไหล่ตอนปิดงานซ่อม">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={locationsQuery.isLoading}
                options={(locationsQuery.data?.data ?? []).map((l) => ({
                  value: l.id,
                  label: `${l.locationCode} — ${l.locationName}`,
                }))}
              />
            </Form.Item>
          </Col>
          {editing ? (
            <Col xs={24} md={8}>
              <Form.Item name="status" label="สถานะ">
                <Select options={Object.entries(EQUIPMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={24} md={8}>
            <Form.Item name="serialNumber" label="Serial Number">
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="manufacturer" label="ผู้ผลิต">
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="model" label="รุ่น (Model)">
              <Input maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="installedDate" label="วันที่ติดตั้ง">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="warrantyExpiryDate" label="ประกันหมดอายุ">
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="runningHours" label="ชั่วโมงเดินเครื่องสะสม" extra="กรอกภายหลังได้เมื่อเครื่องจักรถึง/อ่านค่าได้">
              <InputNumber min={0} precision={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="warrantyNote" label="เงื่อนไข/ผู้ให้การรับประกัน">
              <Input maxLength={2000} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="remark" label="หมายเหตุ">
              <Input.TextArea rows={2} maxLength={2000} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
