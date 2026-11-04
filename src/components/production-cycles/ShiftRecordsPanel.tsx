"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
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
  TimePicker,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CalendarOutlined,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  useCreateShiftRecordMutation,
  useDeleteShiftRecordMutation,
  useMachineSummaryQuery,
  useProductionOrderLookupsQuery,
  useShiftRecordsQuery,
  useUnconfirmShiftRecordMutation,
  useUpdateShiftRecordMutation,
} from "@/hooks/production-cycles/useProductionCycles";
import {
  MACHINE_FORECAST_STATUS_LABEL,
  type MachineForecast,
  type ShiftRecord,
} from "@/types/production-cycle";
import type {
  ProductionOrderInputItem,
  ProductionOrderMachine,
} from "@/types/production-order";
import ConfirmShiftStockModal from "./ConfirmShiftStockModal";
import type {
  ProductionRecordingConfig,
  RecordingFieldDef,
} from "@/types/production-formula";
import { RECORDING_RESULT_ROLE_LABEL } from "@/types/production-formula";
import {
  accumulateAcrossShiftConfigs,
  computeRecordingFieldResult,
  resultForCodeOnRecord,
  type RecordingFieldValue,
  type RecordingFieldValues,
} from "@/utils/recordingCalc";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import modalStyles from "./ShiftRecordModal.module.css";

dayjs.extend(customParseFormat);

const n = (v?: number | null, d = 1) =>
  v === undefined || v === null
    ? "—"
    : v.toLocaleString("th-TH", { maximumFractionDigits: d });

function parseShiftClock(raw?: string) {
  if (!raw) return undefined;
  const parsed = dayjs(raw, ["HH:mm:ss", "HH:mm"], true);
  return parsed.isValid() ? parsed : undefined;
}

function unitAddon(unitLabel?: string) {
  if (!unitLabel) return undefined;
  const lower = unitLabel.toLowerCase();
  if (lower.includes("กก") || lower === "kg") return "กิโลกรัม";
  if (lower.includes("ลิตร") || lower === "l" || lower === "liter") return "ลิตร";
  return unitLabel;
}

type LegacyValues = {
  recordDate: dayjs.Dayjs;
  shiftId: string;
  shiftStartTime?: dayjs.Dayjs;
  shiftEndTime?: dayjs.Dayjs;
  inputTireKg: number;
  operatingHours: number;
  feedRateKgH?: number | null;
  operatorIds?: string[];
  remark?: string;
};

type DynamicFormValues = {
  recordDate: dayjs.Dayjs;
  shiftId: string;
  shiftStartTime?: dayjs.Dayjs;
  shiftEndTime?: dayjs.Dayjs;
  operatorIds?: string[];
  remark?: string;
  values: RecordingFieldValues;
  /** equipmentId → ชั่วโมงเดินเครื่องจริงของเครื่องนั้น (ไม่บังคับ) */
  machineHours?: Record<string, number | null | undefined>;
};

function sortedFields(config?: ProductionRecordingConfig | null) {
  return [...(config?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
}

function Control({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={modalStyles.controlItem}>
      <span className={modalStyles.controlLabel}>
        {label}
        {required ? (
          <span className={modalStyles.controlRequired} aria-hidden>
            *
          </span>
        ) : null}
      </span>
      {children}
    </div>
  );
}

/** ป้ายบทบาทใต้ชื่อฟิลด์ — TRACKING โชว์แบบ Input ตาม mock ฟอร์มบันทึกกะ */
function fieldRoleSubtitle(field: RecordingFieldDef) {
  if (field.resultRole === "TRACKING" || field.resultRole === "INPUT") {
    return RECORDING_RESULT_ROLE_LABEL.INPUT;
  }
  return RECORDING_RESULT_ROLE_LABEL[field.resultRole] ?? field.resultRole;
}

function BomFieldControls({
  field,
  value,
  onChange,
  liveResult,
}: {
  field: RecordingFieldDef;
  value: RecordingFieldValue | undefined;
  onChange: (next: RecordingFieldValue) => void;
  liveResult?: number | null;
}) {
  const v = value ?? {};
  const patch = (partial: RecordingFieldValue) => onChange({ ...v, ...partial });
  const addon = unitAddon(field.unitLabel);

  const req = Boolean(field.required);

  if (field.calcType === "METER_DELTA") {
    return (
      <div className={modalStyles.bomControlsWide}>
        <Control label="ต้นกะ (มิเตอร์)" required={req}>
          <InputNumber
            min={0}
            precision={3}
            style={{ width: "100%" }}
            value={v.meterStart ?? undefined}
            onChange={(meterStart) => patch({ meterStart })}
          />
        </Control>
        <Control label="ปลายกะ (มิเตอร์)" required={req}>
          <InputNumber
            min={0}
            precision={3}
            style={{ width: "100%" }}
            value={v.meterEnd ?? undefined}
            onChange={(meterEnd) => patch({ meterEnd })}
          />
        </Control>
      </div>
    );
  }

  if (field.calcType === "HOURS_TIMES_RATE") {
    return (
      <div className={modalStyles.bomControls}>
        <Control label="ปริมาณ" required={req}>
          <InputNumber
            readOnly
            precision={3}
            style={{ width: "100%" }}
            value={liveResult ?? undefined}
            addonAfter={addon}
            placeholder="คำนวณอัตโนมัติ"
          />
        </Control>
        <Control label="ชั่วโมง" required={req}>
          <InputNumber
            min={0}
            max={24}
            precision={2}
            style={{ width: "100%" }}
            value={v.hours ?? undefined}
            onChange={(hours) => patch({ hours })}
          />
        </Control>
        <Control label="อัตรา" required={req}>
          <InputNumber
            min={0}
            precision={3}
            style={{ width: "100%" }}
            value={v.rate ?? undefined}
            onChange={(rate) => patch({ rate })}
          />
        </Control>
      </div>
    );
  }

  if (field.calcType === "QTY_TIMES_UNIT_WEIGHT") {
    return (
      <div className={modalStyles.bomControls}>
        <Control label="ปริมาณ" required={req}>
          <InputNumber
            min={0}
            precision={3}
            style={{ width: "100%" }}
            value={v.qty ?? undefined}
            onChange={(qty) => patch({ qty })}
            addonAfter={addon}
          />
        </Control>
        <Control label="ชั่วโมง" required={req}>
          <InputNumber
            min={0}
            max={24}
            precision={2}
            style={{ width: "100%" }}
            value={v.hours ?? undefined}
            onChange={(hours) => patch({ hours })}
          />
        </Control>
        <Control label="อัตรา" required={req}>
          <InputNumber
            min={0}
            precision={3}
            style={{ width: "100%" }}
            value={v.unitWeight ?? undefined}
            onChange={(unitWeight) => patch({ unitWeight })}
          />
        </Control>
      </div>
    );
  }

  return (
    <div className={modalStyles.bomControls}>
      <Control label="ปริมาณ" required={req}>
        <InputNumber
          min={0}
          precision={3}
          style={{ width: "100%" }}
          value={v.amount ?? undefined}
          onChange={(amount) => patch({ amount })}
          addonAfter={addon}
        />
      </Control>
      <Control label="ชั่วโมง" required={req}>
        <InputNumber
          min={0}
          max={24}
          precision={2}
          style={{ width: "100%" }}
          value={v.hours ?? undefined}
          onChange={(hours) => patch({ hours })}
        />
      </Control>
      <Control label="อัตรา" required={req}>
        <InputNumber
          min={0}
          precision={3}
          style={{ width: "100%" }}
          value={v.rate ?? undefined}
          onChange={(rate) => patch({ rate })}
        />
      </Control>
    </div>
  );
}

function InfoFieldControls({
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
  const placeholder = `ระบุค่า ${field.label || field.code}`;

  // RPM / ข้อความ / QC ใน mock เป็นช่องพิมพ์ข้อความเต็มความกว้าง
  if (
    field.infoValueKind === "TEXT" ||
    field.infoValueKind === "QC" ||
    field.infoValueKind === "RPM"
  ) {
    return (
      <Input
        value={v.text ?? undefined}
        onChange={(e) => patch({ text: e.target.value })}
        placeholder={placeholder}
      />
    );
  }

  return (
    <InputNumber
      precision={3}
      style={{ width: "100%" }}
      value={v.amount ?? undefined}
      onChange={(amount) => patch({ amount })}
      placeholder={placeholder}
      addonAfter={
        field.infoValueKind === "TEMPERATURE" ? "°C" : unitAddon(field.unitLabel)
      }
    />
  );
}

function FieldValueBridge({
  field,
  value,
  onChange,
  liveResult,
  mode,
}: {
  field: RecordingFieldDef;
  value?: RecordingFieldValue;
  onChange?: (v: RecordingFieldValue) => void;
  liveResult?: number | null;
  mode: "bom" | "info";
}) {
  if (mode === "info") {
    return (
      <InfoFieldControls
        field={field}
        value={value}
        onChange={(next) => onChange?.(next)}
      />
    );
  }
  return (
    <BomFieldControls
      field={field}
      value={value}
      onChange={(next) => onChange?.(next)}
      liveResult={liveResult}
    />
  );
}

function ModalSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={modalStyles.section}>
      <div className={modalStyles.sectionHead}>
        <span className={modalStyles.sectionIcon}>{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function BomFieldRow({
  field,
  liveResult,
}: {
  field: RecordingFieldDef;
  liveResult?: number | null;
}) {
  return (
    <div className={modalStyles.bomRow}>
      <div className={modalStyles.bomLabel}>
        <span
          className={`${modalStyles.bomTitle} ${
            field.required ? modalStyles.bomTitleRequired : ""
          }`}
        >
          {field.label || field.code}
        </span>
        <span className={modalStyles.bomSub}>{fieldRoleSubtitle(field)}</span>
      </div>
      <Form.Item name={["values", field.id]} noStyle>
        <FieldValueBridge field={field} mode="bom" liveResult={liveResult} />
      </Form.Item>
    </div>
  );
}

function InfoFieldRow({ field }: { field: RecordingFieldDef }) {
  return (
    <div className={modalStyles.infoField}>
      <div className={modalStyles.infoFieldHead}>
        <span
          className={`${modalStyles.bomTitle} ${
            field.required ? modalStyles.bomTitleRequired : ""
          }`}
        >
          {field.label || field.code}
        </span>
        <span className={modalStyles.bomSub}>{fieldRoleSubtitle(field)}</span>
      </div>
      <Form.Item name={["values", field.id]} noStyle>
        <FieldValueBridge field={field} mode="info" />
      </Form.Item>
    </div>
  );
}

const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null
    ? "—"
    : v.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** สรุปผลคาดการณ์เทียบผลจริงของเครื่องหนึ่ง (ใช้ทั้งในโมดัลแก้ไขและตารางสรุป) */
function ForecastLine({ forecast }: { forecast?: MachineForecast }) {
  if (!forecast) return null;
  if (forecast.status !== "OK") {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        เปรียบเทียบกำลังผลิตไม่ได้: {MACHINE_FORECAST_STATUS_LABEL[forecast.status]}
        {forecast.forecast != null ? ` (คาดการณ์ ${fmtNum(forecast.forecast)} ${forecast.capacityUnitLabel ?? ""})` : ""}
      </Typography.Text>
    );
  }
  return (
    <Space size={[8, 4]} wrap>
      <Tag>คาดการณ์ {fmtNum(forecast.forecast)} {forecast.capacityUnitLabel}</Tag>
      <Tag color="blue">ผลจริง {fmtNum(forecast.actual)}</Tag>
      <Tag color={(forecast.diff ?? 0) >= 0 ? "green" : "orange"}>
        ส่วนต่าง {(forecast.diff ?? 0) > 0 ? "+" : ""}
        {fmtNum(forecast.diff)}
      </Tag>
      <Tag color="geekblue">{fmtNum(forecast.pctOfCapacity)}% ของกำลังผลิต</Tag>
    </Space>
  );
}

function DynamicRecordModal({
  orderId,
  record,
  fields,
  machines,
  readOnly = false,
  onClose,
}: {
  orderId: string;
  record: ShiftRecord | null;
  fields: RecordingFieldDef[];
  /** เครื่องจักรของ MO (snapshot) — ว่าง = ใบที่ไม่ผูกเครื่อง แสดงฟอร์มเหมือนเดิม */
  machines: ProductionOrderMachine[];
  /** โหมดดูอย่างเดียว — ฟอร์มเดียวกันแต่ปิดทุกช่อง ไม่มีปุ่มบันทึก */
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<DynamicFormValues>();
  const lookups = useProductionOrderLookupsQuery();
  const create = useCreateShiftRecordMutation();
  const update = useUpdateShiftRecordMutation();
  const watchedValues = Form.useWatch("values", form) as
    | RecordingFieldValues
    | undefined;
  const shifts = lookups.data?.data.shifts ?? [];

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

  // ฟิลด์ที่ผูกเครื่อง (ตาม snapshot ของ MO) แยกไปแสดงเป็นกลุ่มตามเครื่อง · ที่เหลือแสดงตามเดิม
  const machineIds = new Set(machines.map((m) => m.equipmentId));
  const isMachineField = (f: RecordingFieldDef) =>
    Boolean(f.equipmentId && machineIds.has(f.equipmentId));
  const generalFields = fields.filter((f) => !isMachineField(f));
  const inputFields = generalFields.filter(
    (f) => f.resultRole === "INPUT" || f.resultRole === "TRACKING",
  );
  const outputFields = generalFields.filter((f) => f.resultRole === "OUTPUT");
  const infoFields = generalFields.filter((f) => f.resultRole === "INFORMATION");
  const watchedHours = Form.useWatch("machineHours", form) as
    | Record<string, number | null | undefined>
    | undefined;

  const applyShiftTimes = (shiftId?: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    form.setFieldsValue({
      shiftStartTime: parseShiftClock(shift?.startTime),
      shiftEndTime: parseShiftClock(shift?.endTime),
    });
  };

  useEffect(() => {
    const shiftId = form.getFieldValue("shiftId") as string | undefined;
    if (!shiftId || shifts.length === 0) return;
    if (form.getFieldValue("shiftStartTime")) return;
    const shift = shifts.find((s) => s.id === shiftId);
    form.setFieldsValue({
      shiftStartTime: parseShiftClock(shift?.startTime),
      shiftEndTime: parseShiftClock(shift?.endTime),
    });
  }, [shifts, form]);

  const save = () =>
    void form.validateFields().then((v) => {
      const values = v.values ?? {};
      const missing = fields.filter((f) => {
        if (!f.required) return false;
        if (
          f.calcType === "INFORMATION" &&
          (f.infoValueKind === "TEXT" ||
            f.infoValueKind === "QC" ||
            f.infoValueKind === "RPM")
        ) {
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
      // ชั่วโมงเดินเครื่องรายเครื่อง (ไม่บังคับ) — ส่งเฉพาะเครื่องที่กรอก · แก้แถวเดิมส่งทั้งชุดเพื่อให้ล้างได้
      const machineRuns = machines.flatMap((m) => {
        const hours = v.machineHours?.[m.equipmentId];
        return hours == null ? [] : [{ equipmentId: m.equipmentId, hours: Number(hours) }];
      });
      const common = {
        values,
        operatorIds: v.operatorIds ?? [],
        remark: v.remark?.trim() || undefined,
      };
      if (record) {
        update.mutate(
          { id: record.id, body: machines.length > 0 ? { ...common, machineRuns } : common },
          { onSuccess: onClose },
        );
      } else {
        create.mutate(
          {
            productionOrderId: orderId,
            recordDate: v.recordDate.format("YYYY-MM-DD"),
            shiftId: v.shiftId,
            ...common,
            ...(machineRuns.length > 0 ? { machineRuns } : {}),
          },
          { onSuccess: onClose },
        );
      }
    });

  return (
    <Modal
      open
      width={760}
      className={`${masterStyles.masterModal} ${modalStyles.shiftModal}`}
      title={
        record
          ? `${readOnly ? "ดู" : "แก้"}บันทึกรายกะ — ${record.shiftName} ${dayjs(record.recordDate).format("DD/MM/YYYY")}`
          : "บันทึกการผลิตรายกะ"
      }
      okText="บันทึก"
      cancelText={readOnly ? "ปิด" : "ยกเลิก"}
      okButtonProps={{ className: modalStyles.saveButton }}
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      destroyOnHidden
      onOk={save}
      footer={
        readOnly ? (
          <Button onClick={onClose}>ปิด</Button>
        ) : undefined
      }
    >
      <Form
        form={form}
        disabled={readOnly}
        layout="vertical"
        className={modalStyles.formItemTight}
        initialValues={{
          recordDate: record ? dayjs(record.recordDate) : dayjs(),
          shiftId: record?.shiftId,
          shiftStartTime: parseShiftClock(
            shifts.find((s) => s.id === record?.shiftId)?.startTime,
          ),
          shiftEndTime: parseShiftClock(
            shifts.find((s) => s.id === record?.shiftId)?.endTime,
          ),
          operatorIds: record?.operators.map((o) => o.id) ?? [],
          remark: record?.remark,
          values: record?.values ?? {},
          machineHours: Object.fromEntries(
            (record?.machineRuns ?? []).map((r) => [r.equipmentId, r.hours]),
          ),
        }}
      >
        <div className={modalStyles.modalBody}>
          <ModalSection icon={<CalendarOutlined />} title="ข้อมูลกะการผลิต">
            <div className={modalStyles.fieldGrid2}>
              <Form.Item
                name="recordDate"
                label="วันที่ของกะ"
                rules={[{ required: true, message: "เลือกวันที่" }]}
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
              >
                <Select
                  placeholder="เลือกกะ"
                  disabled={Boolean(record)}
                  loading={lookups.isLoading}
                  options={shifts.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.startTime}–${s.endTime})`,
                  }))}
                  onChange={(shiftId) => applyShiftTimes(shiftId)}
                />
              </Form.Item>
              <Form.Item
                name="shiftStartTime"
                label="ต้นกะ"
                rules={[{ required: true, message: "ระบุต้นกะ" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="HH:mm"
                  placeholder="เลือกเวลา"
                  needConfirm={false}
                />
              </Form.Item>
              <Form.Item
                name="shiftEndTime"
                label="ปลายกะ"
                rules={[{ required: true, message: "ระบุปลายกะ" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="HH:mm"
                  placeholder="เลือกเวลา"
                  needConfirm={false}
                />
              </Form.Item>
            </div>
          </ModalSection>

          {machines.map((machine) => {
            const machineFields = fields.filter((f) => f.equipmentId === machine.equipmentId);
            const hours = watchedHours?.[machine.equipmentId];
            const livePreview =
              hours != null && machine.capacity != null
                ? Math.round(machine.capacity * Number(hours) * 1000) / 1000
                : null;
            const saved = record?.machineForecasts?.find(
              (f) => f.equipmentId === machine.equipmentId,
            );
            return (
              <ModalSection
                key={machine.equipmentId}
                icon={<SettingOutlined />}
                title={`${machine.code} — ${machine.name}`}
              >
                <Space size={[8, 4]} wrap style={{ marginBottom: 8 }}>
                  {machine.equipmentTypeName ? <Tag>{machine.equipmentTypeName}</Tag> : null}
                  <Tag color="geekblue">
                    กำลังผลิต{" "}
                    {machine.capacity != null
                      ? `${fmtNum(machine.capacity)} ${machine.capacityUnitLabel ?? ""}/ชม.`
                      : "ยังไม่ตั้ง"}
                  </Tag>
                  {machine.formulaEquipmentId !== machine.equipmentId ? (
                    <Tag color="orange">สลับจากเครื่องในสูตร</Tag>
                  ) : null}
                </Space>
                <Form.Item
                  name={["machineHours", machine.equipmentId]}
                  label="ชั่วโมงเดินเครื่องจริงของเครื่องนี้"
                  extra={
                    livePreview != null
                      ? `ผลคาดการณ์ = ${fmtNum(machine.capacity)} × ${fmtNum(Number(hours))} ชม. = ${fmtNum(livePreview, 3)} ${machine.capacityUnitLabel ?? ""} (เทียบผลจริงหลังบันทึก)`
                      : "ไม่บังคับ — ไม่กรอก = ไม่คำนวณผลคาดการณ์ของเครื่องนี้"
                  }
                >
                  <InputNumber min={0} max={24} precision={2} style={{ width: 200 }} addonAfter="ชม." />
                </Form.Item>
                <div className={modalStyles.fieldBlock}>
                  {machineFields.map((field) =>
                    field.resultRole === "INFORMATION" ? (
                      <InfoFieldRow key={field.id} field={field} />
                    ) : (
                      <BomFieldRow key={field.id} field={field} liveResult={liveResults[field.id]} />
                    ),
                  )}
                </div>
                <ForecastLine forecast={saved} />
              </ModalSection>
            );
          })}

          {inputFields.length > 0 ? (
            <ModalSection icon={<InboxOutlined />} title="วัตถุดิบเข้า">
              <div className={modalStyles.fieldBlock}>
                {inputFields.map((field) => (
                  <BomFieldRow
                    key={field.id}
                    field={field}
                    liveResult={liveResults[field.id]}
                  />
                ))}
              </div>
            </ModalSection>
          ) : null}

          {outputFields.length > 0 || infoFields.length > 0 ? (
            <ModalSection
              icon={<SettingOutlined />}
              title="ผลผลิต / ข้อมูลเครื่อง"
            >
              <div className={modalStyles.fieldBlock}>
                {outputFields.map((field) => (
                  <BomFieldRow
                    key={field.id}
                    field={field}
                    liveResult={liveResults[field.id]}
                  />
                ))}
                {infoFields.map((field) => (
                  <InfoFieldRow key={field.id} field={field} />
                ))}
              </div>
            </ModalSection>
          ) : null}

          <ModalSection
            icon={<FileTextOutlined />}
            title="ผู้ปฏิบัติงานและหมายเหตุ"
          >
            <Form.Item name="operatorIds" label="ผู้ปฏิบัติงานของกะ">
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="เลือกได้หลายคน"
                loading={lookups.isLoading}
                options={(lookups.data?.data.operators ?? []).map((o) => ({
                  value: o.id,
                  label: `${o.employeeCode ? o.employeeCode + " " : ""}${o.displayName}${o.position ? " · " + o.position : ""}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="remark" label="หมายเหตุ" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={3}
                maxLength={2000}
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
              />
            </Form.Item>
          </ModalSection>
        </div>
      </Form>
    </Modal>
  );
}

function LegacyRecordModal({
  orderId,
  record,
  readOnly = false,
  onClose,
}: {
  orderId: string;
  record: ShiftRecord | null;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<LegacyValues>();
  const lookups = useProductionOrderLookupsQuery();
  const create = useCreateShiftRecordMutation();
  const update = useUpdateShiftRecordMutation();
  const input = Form.useWatch("inputTireKg", form) ?? record?.inputTireKg ?? 0;
  const hours = Form.useWatch("operatingHours", form) ?? record?.operatingHours ?? 0;
  const calc = hours > 0 && input > 0 ? input / hours : null;
  const shifts = lookups.data?.data.shifts ?? [];

  useEffect(() => {
    const shiftId = form.getFieldValue("shiftId") as string | undefined;
    if (!shiftId || shifts.length === 0) return;
    if (form.getFieldValue("shiftStartTime")) return;
    const shift = shifts.find((s) => s.id === shiftId);
    form.setFieldsValue({
      shiftStartTime: parseShiftClock(shift?.startTime),
      shiftEndTime: parseShiftClock(shift?.endTime),
    });
  }, [shifts, form]);

  return (
    <Modal
      open
      width={760}
      className={`${masterStyles.masterModal} ${modalStyles.shiftModal}`}
      title={
        record
          ? `${readOnly ? "ดู" : "แก้"}บันทึกรายกะ — ${record.shiftName} ${dayjs(record.recordDate).format("DD/MM/YYYY")}`
          : "บันทึกการผลิตรายกะ"
      }
      okText="บันทึก"
      cancelText={readOnly ? "ปิด" : "ยกเลิก"}
      okButtonProps={{ className: modalStyles.saveButton }}
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      destroyOnHidden
      footer={readOnly ? <Button onClick={onClose}>ปิด</Button> : undefined}
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
        disabled={readOnly}
        layout="vertical"
        className={modalStyles.formItemTight}
        initialValues={{
          recordDate: record ? dayjs(record.recordDate) : dayjs(),
          shiftId: record?.shiftId,
          shiftStartTime: parseShiftClock(
            shifts.find((s) => s.id === record?.shiftId)?.startTime,
          ),
          shiftEndTime: parseShiftClock(
            shifts.find((s) => s.id === record?.shiftId)?.endTime,
          ),
          inputTireKg: record?.inputTireKg,
          operatingHours: record?.operatingHours,
          feedRateKgH:
            record && !record.feedRateCalculated ? record.feedRateKgH : undefined,
          operatorIds: record?.operators.map((o) => o.id) ?? [],
          remark: record?.remark,
        }}
      >
        <div className={modalStyles.modalBody}>
          <ModalSection icon={<CalendarOutlined />} title="ข้อมูลกะการผลิต">
            <div className={modalStyles.fieldGrid2}>
              <Form.Item
                name="recordDate"
                label="วันที่ของกะ"
                rules={[{ required: true, message: "เลือกวันที่" }]}
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
              >
                <Select
                  placeholder="เลือกกะ"
                  disabled={Boolean(record)}
                  loading={lookups.isLoading}
                  options={shifts.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.startTime}–${s.endTime})`,
                  }))}
                  onChange={(shiftId) => {
                    const shift = shifts.find((s) => s.id === shiftId);
                    form.setFieldsValue({
                      shiftStartTime: parseShiftClock(shift?.startTime),
                      shiftEndTime: parseShiftClock(shift?.endTime),
                    });
                  }}
                />
              </Form.Item>
              <Form.Item
                name="shiftStartTime"
                label="ต้นกะ"
                rules={[{ required: true, message: "ระบุต้นกะ" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="HH:mm"
                  placeholder="เลือกเวลา"
                  needConfirm={false}
                />
              </Form.Item>
              <Form.Item
                name="shiftEndTime"
                label="ปลายกะ"
                rules={[{ required: true, message: "ระบุปลายกะ" }]}
              >
                <TimePicker
                  style={{ width: "100%" }}
                  format="HH:mm"
                  placeholder="เลือกเวลา"
                  needConfirm={false}
                />
              </Form.Item>
            </div>
          </ModalSection>

          <ModalSection icon={<InboxOutlined />} title="วัตถุดิบเข้า">
            <div className={modalStyles.bomRow}>
              <div className={modalStyles.bomLabel}>
                <span className={`${modalStyles.bomTitle} ${modalStyles.bomTitleRequired}`}>
                  ยางที่ป้อนเข้าเตา
                </span>
                <span className={modalStyles.bomSub}>Input — วัตถุดิบใน BOM</span>
              </div>
              <div className={modalStyles.bomControls}>
                <Control label="ปริมาณ" required>
                  <Form.Item
                    name="inputTireKg"
                    rules={[{ required: true, message: "ใส่จำนวน" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      precision={3}
                      style={{ width: "100%" }}
                      addonAfter="กิโลกรัม"
                    />
                  </Form.Item>
                </Control>
                <Control label="ชั่วโมง" required>
                  <Form.Item
                    name="operatingHours"
                    rules={[{ required: true, message: "ใส่ชั่วโมง" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} max={24} precision={2} style={{ width: "100%" }} />
                  </Form.Item>
                </Control>
                <Control label="อัตรา">
                  <Form.Item
                    name="feedRateKgH"
                    style={{ marginBottom: 0 }}
                    extra={
                      calc !== null
                        ? `เว้นว่าง = ${n(calc)}`
                        : "เว้นว่างให้ระบบคำนวณ"
                    }
                  >
                    <InputNumber min={0} precision={3} style={{ width: "100%" }} />
                  </Form.Item>
                </Control>
              </div>
            </div>
          </ModalSection>

          <ModalSection
            icon={<FileTextOutlined />}
            title="ผู้ปฏิบัติงานและหมายเหตุ"
          >
            <Form.Item name="operatorIds" label="ผู้ปฏิบัติงานของกะ">
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="เลือกได้หลายคน"
                loading={lookups.isLoading}
                options={(lookups.data?.data.operators ?? []).map((o) => ({
                  value: o.id,
                  label: `${o.employeeCode ? o.employeeCode + " " : ""}${o.displayName}${o.position ? " · " + o.position : ""}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="remark" label="หมายเหตุ" style={{ marginBottom: 0 }}>
              <Input.TextArea
                rows={3}
                maxLength={2000}
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
              />
            </Form.Item>
          </ModalSection>
        </div>
      </Form>
    </Modal>
  );
}

function configForRow(
  row: ShiftRecord,
  orderFallback?: ProductionRecordingConfig | null,
): ProductionRecordingConfig | null {
  const snap = row.recordingConfigSnapshot;
  if (snap?.fields?.length) return snap;
  if (orderFallback?.fields?.length) return orderFallback;
  return null;
}

/** บันทึกการผลิตรายกะ — แถวใหม่ตาม snapshot ของ MO (ไม่ดึงสูตรล่าสุด) · แถวเก่ายึด snapshot ของแถว */
export default function ShiftRecordsPanel({
  orderId,
  canEdit,
  started,
  recordingConfigSnapshot,
  liveRecordingConfig,
  machines = [],
  inputStockMode,
  inputItems = [],
}: {
  orderId: string;
  canEdit: boolean;
  started: boolean;
  recordingConfigSnapshot?: ProductionRecordingConfig | null;
  liveRecordingConfig?: ProductionRecordingConfig | null;
  /** เครื่องจักรของ MO (snapshot) */
  machines?: ProductionOrderMachine[];
  inputStockMode?: string;
  inputItems?: ProductionOrderInputItem[];
}) {
  const query = useShiftRecordsQuery({ productionOrderId: orderId });
  const remove = useDeleteShiftRecordMutation();
  const unconfirm = useUnconfirmShiftRecordMutation();
  const [editing, setEditing] = useState<ShiftRecord | "new" | null>(null);
  const [confirming, setConfirming] = useState<ShiftRecord | null>(null);
  const [viewing, setViewing] = useState<ShiftRecord | null>(null);
  const rows = query.data?.data ?? [];
  const cutOnConfirm = inputStockMode === "ON_SHIFT_CONFIRM";

  // snapshot ของ MO ก่อน — แก้สูตรภายหลังไม่กระทบใบนี้ · สูตรสดเป็น fallback เฉพาะใบเก่าที่ snapshot ว่าง
  const newFormConfig =
    recordingConfigSnapshot?.fields?.length
      ? recordingConfigSnapshot
      : liveRecordingConfig?.fields?.length
        ? liveRecordingConfig
        : null;
  const machineSummary = useMachineSummaryQuery(orderId, machines.length > 0);
  const newFormFields = sortedFields(newFormConfig);

  const hasAnyDynamic =
    Boolean(newFormConfig?.fields?.length) ||
    rows.some((r) => (configForRow(r, recordingConfigSnapshot)?.fields.length ?? 0) > 0);

  const columnFields = useMemo(() => {
    const byCode = new Map<string, RecordingFieldDef>();
    for (const f of newFormFields) {
      if (f.resultRole === "INFORMATION") continue;
      byCode.set(f.code, f);
    }
    for (const row of rows) {
      for (const f of sortedFields(configForRow(row, recordingConfigSnapshot))) {
        if (f.resultRole === "INFORMATION") continue;
        if (!byCode.has(f.code)) byCode.set(f.code, f);
      }
    }
    return [...byCode.values()];
  }, [newFormFields, rows, recordingConfigSnapshot]);

  const legacyTotals = useMemo(() => {
    if (hasAnyDynamic) return null;
    return {
      totalInput: rows.reduce((a, r) => a + r.inputTireKg, 0),
      totalHours: rows.reduce((a, r) => a + r.operatingHours, 0),
    };
  }, [hasAnyDynamic, rows]);

  const accumulated = useMemo(() => {
    if (!hasAnyDynamic) return [];
    // ใบตัดสต๊อกตอนยืนยัน: นับเฉพาะกะที่ยืนยันแล้ว — ยกเลิกยืนยันแล้วค่ากลับเป็นร่าง ต้องไม่ถูกรวม
    const counted = cutOnConfirm
      ? rows.filter((r) => r.status === "CONFIRMED")
      : rows;
    return accumulateAcrossShiftConfigs(
      counted.map((r) => ({
        config: configForRow(r, recordingConfigSnapshot),
        values: r.values,
      })),
    );
  }, [cutOnConfirm, hasAnyDynamic, recordingConfigSnapshot, rows]);

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
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 110,
        render: (v: string) =>
          v === "CONFIRMED" ? (
            <Tag color="success">ยืนยันแล้ว</Tag>
          ) : (
            <Tag>ร่าง</Tag>
          ),
      },
    ];

    if (hasAnyDynamic) {
      for (const field of columnFields) {
        base.push({
          title: `${field.label || field.code}${field.unitLabel ? ` (${field.unitLabel})` : ""}`,
          key: `code:${field.code}`,
          align: "right",
          render: (_v, r) =>
            n(
              resultForCodeOnRecord(
                field.code,
                configForRow(r, recordingConfigSnapshot),
                r.values,
                r.computedResults,
              ),
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

    {
      base.push({
        title: "การจัดการ",
        key: "act",
        width: canEdit ? (cutOnConfirm ? 300 : 180) : 80,
        render: (_v, r) => {
          const confirmed = r.status === "CONFIRMED";
          return (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(r)}>
                ดู
              </Button>
              {!canEdit ? null : !confirmed ? (
                <Button size="small" onClick={() => setEditing(r)}>
                  แก้ไข
                </Button>
              ) : null}
              {canEdit && cutOnConfirm && !confirmed ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => setConfirming(r)}
                >
                  ยืนยัน/ตัดสต๊อก
                </Button>
              ) : null}
              {canEdit && cutOnConfirm && confirmed ? (
                <Popconfirm
                  title="ยกเลิกยืนยันและคืนสต๊อก?"
                  okText="ยกเลิกยืนยัน"
                  cancelText="ปิด"
                  onConfirm={() => unconfirm.mutate(r.id)}
                >
                  <Button size="small">ยกเลิกยืนยัน</Button>
                </Popconfirm>
              ) : null}
              {canEdit && !confirmed ? (
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
              ) : null}
            </div>
          );
        },
      });
    }

    return base;
  }, [
    canEdit,
    columnFields,
    cutOnConfirm,
    hasAnyDynamic,
    recordingConfigSnapshot,
    remove,
    unconfirm,
  ]);

  const roleColor = (role: string) => {
    if (role === "INPUT") return "blue";
    if (role === "OUTPUT") return "green";
    return "default";
  };

  const editFields =
    editing && editing !== "new"
      ? sortedFields(
          configForRow(editing, recordingConfigSnapshot) ?? newFormConfig,
        )
      : newFormFields;
  const useDynamicModal =
    editing === "new"
      ? newFormFields.length > 0
      : editing
        ? editFields.length > 0
        : false;

  const emptyNode = (
    <div
      style={{
        padding: "48px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        color: "#8c8c8c",
      }}
    >
      <FileTextOutlined style={{ fontSize: 40, opacity: 0.45 }} />
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        {started
          ? "ยังไม่มีบันทึกการผลิตรายกะ กดปุ่ม '+ เพิ่มบันทึก' เพื่อบันทึกข้อมูล"
          : "เริ่มผลิตแล้วจึงบันทึกรายกะได้"}
      </div>
    </div>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <div>
          <Typography.Title level={5} style={{ margin: 0 }}>
            บันทึกการผลิตรายกะ
          </Typography.Title>
          <Typography.Paragraph
            type="secondary"
            style={{ margin: "4px 0 0", maxWidth: 560 }}
          >
            บันทึกข้อมูลการผลิตของแต่ละกะ ตามฟอร์มที่ตั้งค่าในสูตรการผลิต
          </Typography.Paragraph>
        </div>
        {canEdit && started ? (
          <Button
            type="primary"
            className={masterStyles.createButton}
            icon={<PlusOutlined />}
            onClick={() => setEditing("new")}
          >
            เพิ่มบันทึก
          </Button>
        ) : null}
      </div>

      {canEdit && started && !newFormFields.length ? (
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          title="ยังไม่มีฟอร์มบันทึกตามสูตร"
          description="ไปตั้งแท็บ «การตั้งค่าบันทึกผลการผลิต» ใน Master สูตรที่ใบนี้ใช้อยู่ แล้วรีเฟรชหน้านี้ — รายการใหม่จะใช้ฟอร์มล่าสุด"
        />
      ) : null}

      <Table
        className={masterStyles.dataTable}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={query.isFetching}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        scroll={
          hasAnyDynamic
            ? { x: Math.max(800, 300 + columnFields.length * 120) }
            : undefined
        }
        locale={{
          emptyText: query.isPending || query.isFetching ? <div style={{ padding: "48px 16px" }} /> : emptyNode,
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

      {machines.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>ผลคาดการณ์เทียบผลจริงรายเครื่อง</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8, fontSize: 12 }}>
            คาดการณ์ = กำลังผลิต × ชั่วโมงเดินเครื่องจริง รวมเฉพาะกะที่กรอกชั่วโมงและผลจริงครบ ·
            เทียบเฉพาะหน่วยที่ตรงกัน · ไม่รวมกำลังผลิตข้ามเครื่อง (เครื่องที่ทำงานต่อเนื่องกันจะนับซ้ำ)
          </Typography.Paragraph>
          <Table<MachineForecast>
            size="small"
            rowKey="equipmentId"
            pagination={false}
            loading={machineSummary.isFetching}
            dataSource={machineSummary.data?.data ?? []}
            locale={{ emptyText: "ยังไม่มีบันทึกกะ" }}
            scroll={{ x: "max-content" }}
            columns={[
              {
                title: "เครื่องจักร",
                key: "machine",
                render: (_: unknown, f: MachineForecast) => `${f.equipmentCode} — ${f.equipmentName}`,
              },
              {
                title: "กำลังผลิต/ชม.",
                key: "capacity",
                align: "right",
                render: (_: unknown, f: MachineForecast) =>
                  f.capacity != null ? `${fmtNum(f.capacity)} ${f.capacityUnitLabel ?? ""}` : "—",
              },
              { title: "ชั่วโมงเดินเครื่อง", dataIndex: "hours", align: "right", render: (v?: number | null) => fmtNum(v) },
              {
                title: "ผลคาดการณ์",
                dataIndex: "forecast",
                align: "right",
                render: (v?: number | null) => fmtNum(v, 3),
              },
              {
                title: "ผลจริง",
                dataIndex: "actual",
                align: "right",
                render: (v?: number | null, f?: MachineForecast) =>
                  f?.status === "OK" ? fmtNum(v, 3) : "—",
              },
              {
                title: "ส่วนต่าง",
                dataIndex: "diff",
                align: "right",
                render: (v?: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtNum(v, 3)}`),
              },
              {
                title: "% ของกำลังผลิต",
                dataIndex: "pctOfCapacity",
                align: "right",
                render: (v?: number | null) => (v == null ? "—" : `${fmtNum(v)}%`),
              },
              {
                title: "สถานะ",
                dataIndex: "status",
                render: (s: MachineForecast["status"]) =>
                  s === "OK" ? <Tag color="green">คำนวณได้</Tag> : <Tag>{MACHINE_FORECAST_STATUS_LABEL[s]}</Tag>,
              },
            ]}
          />
        </div>
      ) : null}

      {accumulated.length > 0 ? (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Typography.Text type="secondary">
            ยอดสะสมจากกะ{cutOnConfirm ? " (เฉพาะกะที่ยืนยันแล้ว)" : ""}:
          </Typography.Text>
          {accumulated.map((row) => (
            <Tag key={row.key} color={roleColor(row.resultRole)}>
              {row.label || row.code}: {n(row.total, 3)}
              {row.unitLabel ? ` ${row.unitLabel}` : ""}
            </Tag>
          ))}
        </div>
      ) : null}

      {editing ? (
        useDynamicModal ? (
          <DynamicRecordModal
            key={editing === "new" ? "new" : editing.id}
            orderId={orderId}
            record={editing === "new" ? null : editing}
            fields={editing === "new" ? newFormFields : editFields}
            machines={machines}
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

      {viewing ? (
        (() => {
          const viewFields = sortedFields(
            configForRow(viewing, recordingConfigSnapshot) ?? newFormConfig,
          );
          return viewFields.length > 0 ? (
            <DynamicRecordModal
              key={`view-${viewing.id}`}
              orderId={orderId}
              record={viewing}
              fields={viewFields}
              machines={machines}
              readOnly
              onClose={() => setViewing(null)}
            />
          ) : (
            <LegacyRecordModal
              key={`view-${viewing.id}`}
              orderId={orderId}
              record={viewing}
              readOnly
              onClose={() => setViewing(null)}
            />
          );
        })()
      ) : null}

      {confirming ? (
        <ConfirmShiftStockModal
          record={confirming}
          inputItems={inputItems}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}
