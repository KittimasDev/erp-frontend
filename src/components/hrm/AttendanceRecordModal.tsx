"use client";

import { useEffect } from "react";
import {
  Alert,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  TimePicker,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

import {
  useCreateAttendanceRecordMutation,
  useUpdateAttendanceRecordMutation,
} from "@/hooks/attendance/useAttendanceRecordMutations";
import { useT } from "@/lib/i18n/useT";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import {
  ATTENDANCE_EDITABLE_STATUS_OPTIONS,
  type AttendanceRecord,
} from "@/types/attendance";

type Props = {
  open: boolean;
  /** null = สร้างใหม่ */
  record: AttendanceRecord | null;
  onClose: () => void;
};

type FormValues = {
  userId?: string;
  attendanceDate: Dayjs;
  checkInTime: Dayjs;
  checkOutTime?: Dayjs | null;
  stillWorking?: boolean;
  status?: string;
  remark?: string;
};

/** รวมวันที่ + เวลา เป็น ISO เดียว — เก็บ date กับ time แยกช่องเพื่อให้กรอกง่ายบนเดสก์ท็อป */
function toIso(date: Dayjs, time: Dayjs) {
  return date
    .hour(time.hour())
    .minute(time.minute())
    .second(0)
    .millisecond(0)
    .toISOString();
}

export default function AttendanceRecordModal({
  open,
  record,
  onClose,
}: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const isEdit = Boolean(record);

  const createMutation = useCreateAttendanceRecordMutation();
  const updateMutation = useUpdateAttendanceRecordMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // โหลดรายชื่อเฉพาะตอนสร้างใหม่ ตอนแก้ไขรู้อยู่แล้วว่าเป็นใคร
  const usersQuery = useUsersQuery({ limit: 200 });
  const userOptions = (usersQuery.data?.data.items ?? []).map((user) => ({
    value: user.id,
    label: `${user.displayName}${user.employeeCode ? ` (${user.employeeCode})` : ""}`,
  }));

  const stillWorking = Form.useWatch("stillWorking", form);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (record) {
      form.setFieldsValue({
        attendanceDate: dayjs(record.attendanceDate),
        checkInTime: record.checkInAt ? dayjs(record.checkInAt) : dayjs(),
        checkOutTime: record.checkOutAt ? dayjs(record.checkOutAt) : null,
        stillWorking: !record.checkOutAt,
        status: record.status,
        remark: record.remark,
      });
    } else {
      form.setFieldsValue({
        userId: undefined,
        attendanceDate: dayjs(),
        checkInTime: dayjs().hour(8).minute(0),
        checkOutTime: dayjs().hour(17).minute(0),
        stillWorking: false,
        status: undefined,
        remark: undefined,
      });
    }
  }, [open, record, form]);

  const handleSubmit = async (values: FormValues) => {
    const checkInAt = toIso(values.attendanceDate, values.checkInTime);
    const checkOutAt =
      !values.stillWorking && values.checkOutTime
        ? toIso(values.attendanceDate, values.checkOutTime)
        : undefined;

    try {
      if (record) {
        await updateMutation.mutateAsync({
          id: record.id,
          body: {
            checkInAt,
            checkOutAt,
            clearCheckOut: Boolean(values.stillWorking),
            status: values.status,
            remark: values.remark ?? "",
          },
        });
      } else {
        await createMutation.mutateAsync({
          userId: values.userId!,
          attendanceDate: values.attendanceDate.format("YYYY-MM-DD"),
          checkInAt,
          checkOutAt,
          status: values.status,
          remark: values.remark,
        });
      }
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงค่าในฟอร์มไว้ให้แก้ต่อ
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      title={isEdit ? t("แก้ไขบันทึกเวลา") : t("บันทึกเวลาย้อนหลัง")}
      okText={isEdit ? t("บันทึกการแก้ไข") : t("บันทึก")}
      cancelText={t("ยกเลิก")}
      confirmLoading={isPending}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnHidden
      centered
    >
      {isEdit ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${record?.displayName ?? "-"}${record?.employeeCode ? ` (${record.employeeCode})` : ""}`}
          description={t("วันที่ {date} — การแก้ไขจะถูกบันทึกว่าใครแก้และแก้เมื่อไหร่", { date: record ? dayjs(record.attendanceDate).format("DD/MM/YYYY") : "-" })}
        />
      ) : null}

      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
      >
        {!isEdit ? (
          <Form.Item
            name="userId"
            label={t("พนักงาน")}
            rules={[{ required: true, message: t("เลือกพนักงาน") }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={t("ค้นหาชื่อหรือรหัสพนักงาน")}
              loading={usersQuery.isLoading}
              options={userOptions}
            />
          </Form.Item>
        ) : null}

        <Form.Item
          name="attendanceDate"
          label={t("วันที่")}
          rules={[{ required: true, message: t("เลือกวันที่") }]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            style={{ width: "100%" }}
            disabled={isEdit}
          />
        </Form.Item>

        <Form.Item
          name="checkInTime"
          label={t("เวลาเข้างาน")}
          rules={[{ required: true, message: t("ระบุเวลาเข้างาน") }]}
        >
          <TimePicker format="HH:mm" minuteStep={5} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="stillWorking"
          label={t("ยังไม่ออกงาน (กะที่ยังไม่ปิด)")}
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {!stillWorking ? (
          <Form.Item
            name="checkOutTime"
            label={t("เวลาออกงาน")}
            rules={[{ required: true, message: t("ระบุเวลาออกงาน") }]}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              style={{ width: "100%" }}
            />
          </Form.Item>
        ) : null}

        <Form.Item
          name="status"
          label={t("สถานะ")}
          extra={t("ไม่เลือก = คำนวณจากเวลาเข้างานให้อัตโนมัติ")}
        >
          <Select
            allowClear
            placeholder={t("คำนวณอัตโนมัติ")}
            options={ATTENDANCE_EDITABLE_STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
          />
        </Form.Item>

        <Form.Item name="remark" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} placeholder={t("เช่น ลืมกดออกงาน")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
