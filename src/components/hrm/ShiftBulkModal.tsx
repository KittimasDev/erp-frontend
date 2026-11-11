"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  TimePicker,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { useBulkCreateShiftSchedulesMutation } from "@/hooks/shifts/useShiftMutations";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import type { BulkShiftScheduleResult, Shift } from "@/types/shifts";

import styles from "./ShiftCalendarPage.module.css";

type Props = {
  open: boolean;
  shifts: Shift[];
  /** เดือนที่กำลังดูอยู่ — ใช้เป็นค่าเริ่มต้นของช่วงวันที่ */
  month: Dayjs;
  onClose: () => void;
};

type FormValues = {
  shiftId?: string;
  range: [Dayjs, Dayjs];
  startTime: Dayjs;
  endTime: Dayjs;
  weekdays?: number[];
  skipHolidays: boolean;
  userIds?: string[];
  note?: string;
};

const WEEKDAY_OPTIONS = [
  { label: "จ", value: 1 },
  { label: "อ", value: 2 },
  { label: "พ", value: 3 },
  { label: "พฤ", value: 4 },
  { label: "ศ", value: 5 },
  { label: "ส", value: 6 },
  { label: "อา", value: 0 },
];

const EN_WEEKDAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  0: "Sun",
};

function toDayjsTime(value?: string) {
  return value ? dayjs(`2000-01-01 ${value}`) : dayjs().hour(8).minute(0);
}

/** ลงกะซ้ำเป็นช่วงวันที่ — ปฏิทินเดือนหนึ่งกดทีละวันไม่ไหว */
export default function ShiftBulkModal({
  open,
  shifts,
  month,
  onClose,
}: Props) {
  const t = useT();
  const lang = useLanguage();
  const [form] = Form.useForm<FormValues>();
  const [result, setResult] = useState<BulkShiftScheduleResult | null>(null);

  const bulkMutation = useBulkCreateShiftSchedulesMutation();
  const usersQuery = useUsersQuery({ limit: 200 });
  const userOptions = (usersQuery.data?.data.items ?? []).map((user) => ({
    value: user.id,
    label: `${user.displayName}${user.employeeCode ? ` (${user.employeeCode})` : ""}`,
  }));

  const shiftOptions = shifts.map((shift) => ({
    value: shift.id,
    label: `${shift.name} · ${shift.startTime}-${shift.endTime}${shift.isOvernight ? ` ${t("(ข้ามคืน)")}` : ""}`,
  }));

  useEffect(() => {
    if (!open) {
      return;
    }
    const first = shifts[0];
    form.setFieldsValue({
      shiftId: first?.id,
      range: [month.startOf("month"), month.endOf("month")],
      startTime: toDayjsTime(first?.startTime),
      endTime: toDayjsTime(first?.endTime ?? "17:00"),
      weekdays: [1, 2, 3, 4, 5],
      skipHolidays: true,
      userIds: [],
      note: undefined,
    });
  }, [open, month, shifts, form]);

  const handleShiftChange = (shiftId: string) => {
    const shift = shifts.find((row) => row.id === shiftId);
    if (!shift) {
      return;
    }
    form.setFieldsValue({
      startTime: toDayjsTime(shift.startTime),
      endTime: toDayjsTime(shift.endTime),
    });
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const response = await bulkMutation.mutateAsync({
        dateFrom: values.range[0].format("YYYY-MM-DD"),
        dateTo: values.range[1].format("YYYY-MM-DD"),
        shiftId: values.shiftId!,
        startTime: values.startTime.format("HH:mm"),
        endTime: values.endTime.format("HH:mm"),
        weekdays: values.weekdays?.length ? values.weekdays : undefined,
        skipHolidays: values.skipHolidays,
        userIds: values.userIds?.length ? values.userIds : undefined,
        note: values.note || undefined,
      });
      setResult(response.data);
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงค่าในฟอร์มไว้ให้แก้ต่อ
    }
  };

  return (
    <Modal
      open={open}
      title={t("ลงกะเป็นช่วงวันที่")}
      okText={t("ลงกะ")}
      cancelText={t("ปิด")}
      width={600}
      confirmLoading={bulkMutation.isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
      centered
    >
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
      >
        <Form.Item
          name="shiftId"
          label={t("กะ")}
          rules={[{ required: true, message: t("เลือกกะ") }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("เลือกกะ")}
            options={shiftOptions}
            onChange={handleShiftChange}
            notFoundContent={t("ยังไม่มีกะ — สร้างที่ปุ่ม จัดการกะ")}
          />
        </Form.Item>

        <Form.Item
          name="range"
          label={t("ช่วงวันที่")}
          rules={[{ required: true, message: t("เลือกช่วงวันที่") }]}
        >
          <DatePicker.RangePicker
            format="DD/MM/BBBB"
            allowClear={false}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <div className={styles.masterFormGrid}>
          <Form.Item
            name="startTime"
            label={t("เข้ากะ")}
            rules={[{ required: true, message: t("ระบุเวลาเข้ากะ") }]}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="endTime"
            label={t("เลิกกะ")}
            rules={[{ required: true, message: t("ระบุเวลาเลิกกะ") }]}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="weekdays"
          label={t("ลงเฉพาะวัน")}
          extra={t("ไม่เลือกเลย = ลงทุกวันในช่วง")}
        >
          <Checkbox.Group
            options={WEEKDAY_OPTIONS.map((o) => ({
              ...o,
              label: lang === "en" ? EN_WEEKDAY_LABELS[o.value] : o.label,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="skipHolidays"
          label={t("ข้ามวันที่กดหยุดไว้")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="userIds"
          label={t("พนักงานในกะนี้")}
          extra={t("คนที่ติดกะอื่นของวันนั้นอยู่แล้วจะถูกข้ามให้ ไม่ทับกะเดิม")}
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={t("ค้นหาชื่อหรือรหัสพนักงาน")}
            loading={usersQuery.isLoading}
            options={userOptions}
            maxTagCount="responsive"
          />
        </Form.Item>

        <Form.Item name="note" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} placeholder={t("เช่น รอบกะเดือนกันยายน")} />
        </Form.Item>
      </Form>

      {result ? (
        <Alert
          type="success"
          showIcon
          title={t("ลงกะใหม่ {created} วัน · เพิ่มคนในรอบเดิม {updated} วัน", {
            created: result.created,
            updated: result.updated,
          })}
          description={
            <div className={styles.bulkResult}>
              {result.skippedDates.length > 0 ? (
                <p>
                  {t("ข้าม {n} วัน (วันหยุด หรือไม่ตรงวันที่เลือก)", {
                    n: result.skippedDates.length,
                  })}
                </p>
              ) : null}
              {result.conflictDates.length > 0 ? (
                <p>
                  {t("มีคนติดกะอื่นอยู่แล้ว {n} วัน:", {
                    n: result.conflictDates.length,
                  })}{" "}
                  {result.conflictDates
                    .map((date) => dayjs(date).format("D/M"))
                    .join(", ")}
                </p>
              ) : null}
            </div>
          }
        />
      ) : null}
    </Modal>
  );
}
