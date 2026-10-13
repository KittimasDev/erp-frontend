"use client";

import { useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCreateShiftRecordMutation,
  useDeleteShiftRecordMutation,
  useProductionOrderLookupsQuery,
  useShiftRecordsQuery,
  useUpdateShiftRecordMutation,
} from "@/hooks/production-cycles/useProductionCycles";
import type { ShiftRecord } from "@/types/production-cycle";
import masterStyles from "@/components/masters/shared/master-page.module.css";

const n = (v?: number, d = 1) => (v === undefined ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: d }));

type Values = {
  recordDate: dayjs.Dayjs;
  shiftId: string;
  inputTireKg: number;
  operatingHours: number;
  feedRateKgH?: number | null;
  operatorIds?: string[];
  remark?: string;
};

function RecordModal({ orderId, record, onClose }: { orderId: string; record: ShiftRecord | null; onClose: () => void }) {
  const [form] = Form.useForm<Values>();
  const lookups = useProductionOrderLookupsQuery();
  const create = useCreateShiftRecordMutation();
  const update = useUpdateShiftRecordMutation();
  const input = Form.useWatch("inputTireKg", form) ?? record?.inputTireKg ?? 0;
  const hours = Form.useWatch("operatingHours", form) ?? record?.operatingHours ?? 0;
  const calc = hours > 0 && input > 0 ? input / hours : null;

  return (
    <Modal
      open
      width={640}
      title={record ? `แก้บันทึกรายกะ — ${record.shiftName} ${dayjs(record.recordDate).format("DD/MM/YYYY")}` : "บันทึกการผลิตรายกะ"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) => {
          const common = {
            inputTireKg: v.inputTireKg,
            operatingHours: v.operatingHours,
            feedRateKgH: v.feedRateKgH ?? undefined,
            operatorIds: v.operatorIds ?? [],
            remark: v.remark?.trim() || undefined,
          };
          if (record) update.mutate({ id: record.id, body: common }, { onSuccess: onClose });
          else
            create.mutate(
              { productionOrderId: orderId, recordDate: v.recordDate.format("YYYY-MM-DD"), shiftId: v.shiftId, ...common },
              { onSuccess: onClose },
            );
        })
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          recordDate: record ? dayjs(record.recordDate) : dayjs(),
          shiftId: record?.shiftId,
          inputTireKg: record?.inputTireKg,
          operatingHours: record?.operatingHours,
          feedRateKgH: record && !record.feedRateCalculated ? record.feedRateKgH : undefined,
          operatorIds: record?.operators.map((o) => o.id) ?? [],
          remark: record?.remark,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="recordDate" label="วันที่ของกะ" rules={[{ required: true }]} style={{ flex: 1 }}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" disabled={Boolean(record)} disabledDate={(d) => d.isAfter(dayjs(), "day")} />
          </Form.Item>
          <Form.Item name="shiftId" label="กะ" rules={[{ required: true, message: "เลือกกะ" }]} style={{ flex: 1 }}>
            <Select
              disabled={Boolean(record)}
              loading={lookups.isLoading}
              options={(lookups.data?.data.shifts ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.startTime}–${s.endTime})` }))}
            />
          </Form.Item>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="inputTireKg" label="ยางที่ป้อนเข้าเตา (กก.)" rules={[{ required: true, message: "ใส่จำนวน" }]} style={{ flex: 1 }}>
            <InputNumber min={0} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="operatingHours" label="ชั่วโมงเดินเครื่อง (0–24)" rules={[{ required: true, message: "ใส่ชั่วโมง" }]} style={{ flex: 1 }}>
            <InputNumber min={0} max={24} precision={2} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="feedRateKgH"
            label="Feed Rate (กก./ชม.)"
            style={{ flex: 1 }}
            extra={calc !== null ? `เว้นว่าง = คำนวณให้ ${n(calc)}` : "เว้นว่างให้ระบบคำนวณ"}
          >
            <InputNumber min={0} precision={3} style={{ width: "100%" }} />
          </Form.Item>
        </div>
        <Form.Item name="operatorIds" label="ผู้ปฏิบัติงานของกะ" extra="เลือกได้หลายคน">
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            loading={lookups.isLoading}
            options={(lookups.data?.data.operators ?? []).map((o) => ({
              value: o.id,
              label: `${o.employeeCode ? o.employeeCode + " " : ""}${o.displayName}${o.position ? " · " + o.position : ""}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/** บันทึกการผลิตรายกะของใบสั่งผลิต (M5.2/M5.4) — สะสมยางป้อน ชั่วโมงเดินเครื่อง Feed Rate ตลอดรอบ */
export default function ShiftRecordsPanel({ orderId, canEdit, started }: { orderId: string; canEdit: boolean; started: boolean }) {
  const query = useShiftRecordsQuery({ productionOrderId: orderId });
  const remove = useDeleteShiftRecordMutation();
  const [editing, setEditing] = useState<ShiftRecord | "new" | null>(null);
  const rows = query.data?.data ?? [];
  const totalInput = rows.reduce((a, r) => a + r.inputTireKg, 0);
  const totalHours = rows.reduce((a, r) => a + r.operatingHours, 0);

  const columns: ColumnsType<ShiftRecord> = [
    { title: "วันที่", dataIndex: "recordDate", width: 110, render: (v: string) => dayjs(v).format("DD/MM/YYYY") },
    { title: "กะ", dataIndex: "shiftName", width: 110 },
    { title: "ยางป้อน (กก.)", dataIndex: "inputTireKg", align: "right", render: (v: number) => n(v) },
    { title: "ชม.เดินเครื่อง", dataIndex: "operatingHours", align: "right", render: (v: number) => n(v, 2) },
    {
      title: "Feed Rate (กก./ชม.)",
      key: "fr",
      align: "right",
      render: (_v, r) => (
        <span>
          {n(r.feedRateKgH)}
          {r.feedRateCalculated ? <Tag style={{ marginLeft: 4 }}>คำนวณ</Tag> : null}
        </span>
      ),
    },
    { title: "ผู้ปฏิบัติงาน", key: "ops", render: (_v, r) => (r.operators.length ? r.operators.map((o) => o.displayName).join(", ") : "—") },
  ];
  if (canEdit) {
    columns.push({
      title: "",
      key: "act",
      width: 130,
      render: (_v, r) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="small" onClick={() => setEditing(r)}>แก้ไข</Button>
          <Popconfirm title="ลบบันทึกนี้?" okText="ลบ" cancelText="ยกเลิก" onConfirm={() => remove.mutate(r.id)}>
            <Button size="small" danger>ลบ</Button>
          </Popconfirm>
        </div>
      ),
    });
  }

  return (
    <div>
      <Table
        className={masterStyles.dataTable}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={query.isFetching}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        locale={{ emptyText: started ? "ยังไม่มีบันทึกรายกะ" : "เริ่มผลิตแล้วจึงบันทึกรายกะได้" }}
        summary={() =>
          rows.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}><strong>รวม {rows.length} กะ</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><strong>{n(totalInput)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><strong>{n(totalHours, 2)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><strong>{totalHours > 0 ? n(totalInput / totalHours) : "—"}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={5} colSpan={canEdit ? 2 : 1} />
            </Table.Summary.Row>
          ) : null
        }
      />
      {canEdit && started ? (
        <Button style={{ marginTop: 8 }} type="primary" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
          บันทึกการผลิตรายกะ
        </Button>
      ) : null}
      {editing ? <RecordModal key={editing === "new" ? "new" : editing.id} orderId={orderId} record={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
