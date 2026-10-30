"use client";

import { useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
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
import type {
  ProductionRecordingConfig,
  RecordingFieldDef,
} from "@/types/production-formula";
import { RECORDING_RESULT_ROLE_LABEL } from "@/types/production-formula";
import {
  accumulateRecordingResults,
  computeRecordingFieldResult,
  type RecordingFieldValue,
  type RecordingFieldValues,
} from "@/utils/recordingCalc";
import masterStyles from "@/components/masters/shared/master-page.module.css";

const n = (v?: number | null, d = 1) =>
  v === undefined || v === null
    ? "—"
    : v.toLocaleString("th-TH", { maximumFractionDigits: d });

type LegacyValues = {
  recordDate: dayjs.Dayjs;
  shiftId: string;
  inputTireKg: number;
  operatingHours: number;
  feedRateKgH?: number | null;
  operatorIds?: string[];
  remark?: string;
};

type DynamicFormValues = {
  recordDate: dayjs.Dayjs;
  shiftId: string;
  operatorIds?: string[];
  remark?: string;
  values: RecordingFieldValues;
};

function sortedFields(config?: ProductionRecordingConfig | null) {
  return [...(config?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

function FieldInputs({
  field,
  value,
  onChange,
}: {
  field: RecordingFieldDef;
  value: RecordingFieldValue | undefined;
  onChange: (next: RecordingFieldValue) => void;
}) {
  const v = value ?? {};
  const patch = (partial: RecordingFieldValue) => onChange({ ...v, ...partial });
  const req = field.required;

  switch (field.calcType) {
    case "METER_DELTA":
      return (
        <Space wrap>
          <Form.Item
            label="ต้นกะ"
            required={req}
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              min={0}
              precision={3}
              style={{ width: 120 }}
              value={v.meterStart ?? undefined}
              onChange={(meterStart) => patch({ meterStart })}
            />
          </Form.Item>
          <Form.Item label="ปลายกะ" required={req} style={{ marginBottom: 0 }}>
            <InputNumber
              min={0}
              precision={3}
              style={{ width: 120 }}
              value={v.meterEnd ?? undefined}
              onChange={(meterEnd) => patch({ meterEnd })}
            />
          </Form.Item>
        </Space>
      );
    case "HOURS_TIMES_RATE":
      return (
        <Space wrap>
          <Form.Item label="ชั่วโมง" required={req} style={{ marginBottom: 0 }}>
            <InputNumber
              min={0}
              max={24}
              precision={2}
              style={{ width: 100 }}
              value={v.hours ?? undefined}
              onChange={(hours) => patch({ hours })}
            />
          </Form.Item>
          <Form.Item label="อัตรา" required={req} style={{ marginBottom: 0 }}>
            <InputNumber
              min={0}
              precision={3}
              style={{ width: 100 }}
              value={v.rate ?? undefined}
              onChange={(rate) => patch({ rate })}
            />
          </Form.Item>
        </Space>
      );
    case "QTY_TIMES_UNIT_WEIGHT":
      return (
        <Space wrap>
          <Form.Item label="จำนวน" required={req} style={{ marginBottom: 0 }}>
            <InputNumber
              min={0}
              precision={3}
              style={{ width: 100 }}
              value={v.qty ?? undefined}
              onChange={(qty) => patch({ qty })}
            />
          </Form.Item>
          <Form.Item
            label="น้ำหนัก/หน่วย"
            required={req}
            style={{ marginBottom: 0 }}
          >
            <InputNumber
              min={0}
              precision={3}
              style={{ width: 120 }}
              value={v.unitWeight ?? undefined}
              onChange={(unitWeight) => patch({ unitWeight })}
            />
          </Form.Item>
        </Space>
      );
    case "INFORMATION":
      if (field.infoValueKind === "TEXT" || field.infoValueKind === "QC") {
        return (
          <Input
            value={v.text ?? undefined}
            onChange={(e) => patch({ text: e.target.value })}
            placeholder="ข้อความ"
          />
        );
      }
      return (
        <InputNumber
          precision={3}
          style={{ width: 160 }}
          value={v.amount ?? undefined}
          onChange={(amount) => patch({ amount })}
        />
      );
    default:
      return (
        <InputNumber
          min={0}
          precision={3}
          style={{ width: 160 }}
          value={v.amount ?? undefined}
          onChange={(amount) => patch({ amount })}
        />
      );
  }
}

function DynamicRecordModal({
  orderId,
  record,
  fields,
  onClose,
}: {
  orderId: string;
  record: ShiftRecord | null;
  fields: RecordingFieldDef[];
  onClose: () => void;
}) {
  const [form] = Form.useForm<DynamicFormValues>();
  const lookups = useProductionOrderLookupsQuery();
  const create = useCreateShiftRecordMutation();
  const update = useUpdateShiftRecordMutation();
  const watchedValues = Form.useWatch("values", form) as
    | RecordingFieldValues
    | undefined;

  const liveResults = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const field of fields) {
      map[field.id] = computeRecordingFieldResult(
        field,
        watchedValues?.[field.id],
      );
    }
    return map;
  }, [fields, watchedValues]);

  return (
    <Modal
      open
      width={720}
      title={
        record
          ? `แก้บันทึกรายกะ — ${record.shiftName} ${dayjs(record.recordDate).format("DD/MM/YYYY")}`
          : "บันทึกการผลิตรายกะ"
      }
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      destroyOnHidden
      onOk={() =>
        void form.validateFields().then((v) => {
          const values = v.values ?? {};
          const missing = fields.filter((f) => {
            if (!f.required) return false;
            if (f.calcType === "INFORMATION" &&
              (f.infoValueKind === "TEXT" || f.infoValueKind === "QC")) {
              return !(values[f.id]?.text ?? "").trim();
            }
            return computeRecordingFieldResult(f, values[f.id]) === null;
          });
          if (missing.length) {
            form.setFields([
              {
                name: ["values", missing[0]!.id],
                errors: [`กรุณากรอก ${missing[0]!.label || missing[0]!.code}`],
              },
            ]);
            return Promise.reject();
          }
          const common = {
            values,
            operatorIds: v.operatorIds ?? [],
            remark: v.remark?.trim() || undefined,
          };
          if (record) {
            update.mutate({ id: record.id, body: common }, { onSuccess: onClose });
          } else {
            create.mutate(
              {
                productionOrderId: orderId,
                recordDate: v.recordDate.format("YYYY-MM-DD"),
                shiftId: v.shiftId,
                ...common,
              },
              { onSuccess: onClose },
            );
          }
        })
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          recordDate: record ? dayjs(record.recordDate) : dayjs(),
          shiftId: record?.shiftId,
          operatorIds: record?.operators.map((o) => o.id) ?? [],
          remark: record?.remark,
          values: record?.values ?? {},
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="recordDate"
            label="วันที่ของกะ"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabled={Boolean(record)}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
          </Form.Item>
          <Form.Item
            name="shiftId"
            label="กะ"
            rules={[{ required: true, message: "เลือกกะ" }]}
            style={{ flex: 1 }}
          >
            <Select
              disabled={Boolean(record)}
              loading={lookups.isLoading}
              options={(lookups.data?.data.shifts ?? []).map((s) => ({
                value: s.id,
                label: `${s.name} (${s.startTime}–${s.endTime})`,
              }))}
            />
          </Form.Item>
        </div>

        {fields.map((field) => {
          const result = liveResults[field.id];
          return (
            <div key={field.id} style={{ marginBottom: 12 }}>
              <Space size={8} wrap style={{ marginBottom: 4 }}>
                <Typography.Text strong>
                  {field.label || field.code}
                  {field.required ? " *" : ""}
                </Typography.Text>
                {field.unitLabel ? <Tag>{field.unitLabel}</Tag> : null}
                <Tag>{RECORDING_RESULT_ROLE_LABEL[field.resultRole]}</Tag>
                {result !== null && result !== undefined ? (
                  <Tag color="blue">ผล = {n(result, 3)}</Tag>
                ) : null}
              </Space>
              <Form.Item name={["values", field.id]} noStyle>
                <FieldValueBridge field={field} />
              </Form.Item>
            </div>
          );
        })}

        <Form.Item
          name="operatorIds"
          label="ผู้ปฏิบัติงานของกะ"
          extra="เลือกได้หลายคน"
        >
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

/** Form.Item value/onChange bridge สำหรับ object ต่อ field */
function FieldValueBridge({
  field,
  value,
  onChange,
}: {
  field: RecordingFieldDef;
  value?: RecordingFieldValue;
  onChange?: (v: RecordingFieldValue) => void;
}) {
  return (
    <FieldInputs
      field={field}
      value={value}
      onChange={(next) => onChange?.(next)}
    />
  );
}

function LegacyRecordModal({
  orderId,
  record,
  onClose,
}: {
  orderId: string;
  record: ShiftRecord | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<LegacyValues>();
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
      title={
        record
          ? `แก้บันทึกรายกะ — ${record.shiftName} ${dayjs(record.recordDate).format("DD/MM/YYYY")}`
          : "บันทึกการผลิตรายกะ"
      }
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      destroyOnHidden
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
              {
                productionOrderId: orderId,
                recordDate: v.recordDate.format("YYYY-MM-DD"),
                shiftId: v.shiftId,
                ...common,
              },
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
          feedRateKgH:
            record && !record.feedRateCalculated ? record.feedRateKgH : undefined,
          operatorIds: record?.operators.map((o) => o.id) ?? [],
          remark: record?.remark,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="recordDate"
            label="วันที่ของกะ"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabled={Boolean(record)}
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
          </Form.Item>
          <Form.Item
            name="shiftId"
            label="กะ"
            rules={[{ required: true, message: "เลือกกะ" }]}
            style={{ flex: 1 }}
          >
            <Select
              disabled={Boolean(record)}
              loading={lookups.isLoading}
              options={(lookups.data?.data.shifts ?? []).map((s) => ({
                value: s.id,
                label: `${s.name} (${s.startTime}–${s.endTime})`,
              }))}
            />
          </Form.Item>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="inputTireKg"
            label="ยางที่ป้อนเข้าเตา (กก.)"
            rules={[{ required: true, message: "ใส่จำนวน" }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} precision={3} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="operatingHours"
            label="ชั่วโมงเดินเครื่อง (0–24)"
            rules={[{ required: true, message: "ใส่ชั่วโมง" }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} max={24} precision={2} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="feedRateKgH"
            label="Feed Rate (กก./ชม.)"
            style={{ flex: 1 }}
            extra={
              calc !== null
                ? `เว้นว่าง = คำนวณให้ ${n(calc)}`
                : "เว้นว่างให้ระบบคำนวณ"
            }
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

/** บันทึกการผลิตรายกะของใบสั่งผลิต — ไดนามิกจาก snapshot หรือ UI เดิม (Pyrolysis) */
export default function ShiftRecordsPanel({
  orderId,
  canEdit,
  started,
  recordingConfigSnapshot,
}: {
  orderId: string;
  canEdit: boolean;
  started: boolean;
  recordingConfigSnapshot?: ProductionRecordingConfig | null;
}) {
  const query = useShiftRecordsQuery({ productionOrderId: orderId });
  const remove = useDeleteShiftRecordMutation();
  const [editing, setEditing] = useState<ShiftRecord | "new" | null>(null);
  const rows = query.data?.data ?? [];
  const fields = sortedFields(recordingConfigSnapshot);
  const isDynamic = fields.length > 0;

  const legacyTotals = useMemo(() => {
    if (isDynamic) return null;
    return {
      totalInput: rows.reduce((a, r) => a + r.inputTireKg, 0),
      totalHours: rows.reduce((a, r) => a + r.operatingHours, 0),
    };
  }, [isDynamic, rows]);

  const accumulated = useMemo(() => {
    if (!isDynamic) return [];
    return accumulateRecordingResults(
      recordingConfigSnapshot ?? undefined,
      rows.map((r) => r.values ?? {}),
    );
  }, [isDynamic, recordingConfigSnapshot, rows]);

  const columns: ColumnsType<ShiftRecord> = useMemo(() => {
    const base: ColumnsType<ShiftRecord> = [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
      {
        title: "วันที่",
        dataIndex: "recordDate",
        width: 110,
        render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
      },
      { title: "กะ", dataIndex: "shiftName", width: 110 },
    ];

    if (isDynamic) {
      for (const field of fields) {
        if (field.resultRole === "INFORMATION") continue;
        base.push({
          title: `${field.label || field.code}${field.unitLabel ? ` (${field.unitLabel})` : ""}`,
          key: field.id,
          align: "right",
          render: (_v, r) =>
            n(
              r.computedResults?.[field.id] ??
                computeRecordingFieldResult(field, r.values?.[field.id]),
              3,
            ),
        });
      }
    } else {
      base.push(
        {
          title: "ยางป้อน (กก.)",
          dataIndex: "inputTireKg",
          align: "right",
          render: (v: number) => n(v),
        },
        {
          title: "ชม.เดินเครื่อง",
          dataIndex: "operatingHours",
          align: "right",
          render: (v: number) => n(v, 2),
        },
        {
          title: "Feed Rate (กก./ชม.)",
          key: "fr",
          align: "right",
          render: (_v, r) => (
            <span>
              {n(r.feedRateKgH)}
              {r.feedRateCalculated ? (
                <Tag style={{ marginLeft: 4 }}>คำนวณ</Tag>
              ) : null}
            </span>
          ),
        },
      );
    }

    base.push({
      title: "ผู้ปฏิบัติงาน",
      key: "ops",
      render: (_v, r) =>
        r.operators.length
          ? r.operators.map((o) => o.displayName).join(", ")
          : "—",
    });

    if (canEdit) {
      base.push({
        title: "",
        key: "act",
        width: 130,
        render: (_v, r) => (
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="small" onClick={() => setEditing(r)}>
              แก้ไข
            </Button>
            <Popconfirm
              title="ลบบันทึกนี้?"
              okText="ลบ"
              cancelText="ยกเลิก"
              onConfirm={() => remove.mutate(r.id)}
            >
              <Button size="small" danger>
                ลบ
              </Button>
            </Popconfirm>
          </div>
        ),
      });
    }

    return base;
  }, [canEdit, fields, isDynamic, remove]);

  const roleColor = (role: string) => {
    if (role === "INPUT") return "blue";
    if (role === "OUTPUT") return "green";
    return "default";
  };

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
        scroll={isDynamic ? { x: Math.max(800, 300 + fields.length * 120) } : undefined}
        locale={{
          emptyText: started
            ? "ยังไม่มีบันทึกรายกะ"
            : "เริ่มผลิตแล้วจึงบันทึกรายกะได้",
        }}
        summary={() => {
          if (rows.length === 0) return null;
          if (legacyTotals) {
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <strong>รวม {rows.length} กะ</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong>{n(legacyTotals.totalInput)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{n(legacyTotals.totalHours, 2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>
                    {legacyTotals.totalHours > 0
                      ? n(legacyTotals.totalInput / legacyTotals.totalHours)
                      : "—"}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={canEdit ? 2 : 1} />
              </Table.Summary.Row>
            );
          }
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3}>
                <strong>รวม {rows.length} กะ</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} colSpan={99} />
            </Table.Summary.Row>
          );
        }}
      />

      {accumulated.length > 0 ? (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Typography.Text type="secondary">ยอดสะสมจากกะ:</Typography.Text>
          {accumulated.map((row) => (
            <Tag key={row.fieldId} color={roleColor(row.resultRole)}>
              {row.label || row.code}: {n(row.total, 3)}
              {row.unitLabel ? ` ${row.unitLabel}` : ""}
            </Tag>
          ))}
        </div>
      ) : null}

      {canEdit && started ? (
        <Button
          style={{ marginTop: 8 }}
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditing("new")}
        >
          บันทึกการผลิตรายกะ
        </Button>
      ) : null}

      {editing ? (
        isDynamic ? (
          <DynamicRecordModal
            key={editing === "new" ? "new" : editing.id}
            orderId={orderId}
            record={editing === "new" ? null : editing}
            fields={fields}
            onClose={() => setEditing(null)}
          />
        ) : (
          <LegacyRecordModal
            key={editing === "new" ? "new" : editing.id}
            orderId={orderId}
            record={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
          />
        )
      ) : null}
    </div>
  );
}
