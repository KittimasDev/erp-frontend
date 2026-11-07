"use client";

import { useEffect } from "react";
import {
  Alert,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  TimePicker,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { useT } from "@/lib/i18n/useT";
import {
  useCreateShiftScheduleMutation,
  useUpdateShiftScheduleMutation,
} from "@/hooks/shifts/useShiftMutations";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import type { Shift, ShiftSchedule } from "@/types/shifts";

type Props = {
  open: boolean;
  /** วันที่ของรอบกะ (`YYYY-MM-DD`) */
  date: string;
  shifts: Shift[];
  /** null = สร้างรอบใหม่ */
  schedule: ShiftSchedule | null;
  onClose: () => void;
  /** ย้ายรอบกะไปวันอื่นสำเร็จ — ให้ปฏิทินตามไปเปิดวันปลายทางให้ */
  onMoved?: (date: string) => void;
};

type FormValues = {
  shiftId?: string;
  shiftDate: Dayjs;
  startTime: Dayjs;
  endTime: Dayjs;
  note?: string;
  userIds?: string[];
};

function toDayjsTime(value?: string) {
  return value ? dayjs(`2000-01-01 ${value}`) : dayjs().hour(8).minute(0);
}

export default function ShiftScheduleModal({
  open,
  date,
  shifts,
  schedule,
  onClose,
  onMoved,
}: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const isEdit = Boolean(schedule);

  const createMutation = useCreateShiftScheduleMutation();
  const updateMutation = useUpdateShiftScheduleMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // รายชื่อพนักงานใช้เฉพาะตอนสร้างรอบใหม่ — ตอนแก้ไขจัดคนที่การ์ดของรอบนั้น
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
    if (schedule) {
      form.setFieldsValue({
        shiftId: schedule.shiftId,
        shiftDate: dayjs(schedule.shiftDate),
        startTime: toDayjsTime(schedule.startTime),
        endTime: toDayjsTime(schedule.endTime),
        note: schedule.note,
      });
      return;
    }
    const first = shifts[0];
    form.setFieldsValue({
      shiftId: first?.id,
      shiftDate: dayjs(date),
      startTime: toDayjsTime(first?.startTime),
      endTime: toDayjsTime(first?.endTime ?? "17:00"),
      note: undefined,
      userIds: [],
    });
  }, [open, date, schedule, shifts, form]);

  /** เลือกกะแล้วเติมเวลาของกะนั้นให้ — HR แก้เฉพาะวันที่ต่างจากปกติได้ */
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
    const startTime = values.startTime.format("HH:mm");
    const endTime = values.endTime.format("HH:mm");
    const shiftDate = values.shiftDate.format("YYYY-MM-DD");

    try {
      if (schedule) {
        await updateMutation.mutateAsync({
          id: schedule.id,
          body: {
            shiftDate,
            shiftId: values.shiftId,
            startTime,
            endTime,
            note: values.note ?? "",
          },
        });
        if (shiftDate !== schedule.shiftDate) {
          onMoved?.(shiftDate);
        }
      } else {
        await createMutation.mutateAsync({
          shiftDate,
          shiftId: values.shiftId!,
          startTime,
          endTime,
          note: values.note || undefined,
          userIds: values.userIds?.length ? values.userIds : undefined,
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
      title={
        isEdit
          ? `${t("แก้ไขรอบ {name}", { name: schedule?.shiftName ?? "" })} — ${dayjs(date).format("DD/MM/YYYY")}`
          : `${t("เพิ่มรอบกะ")} — ${dayjs(date).format("DD/MM/YYYY")}`
      }
      okText={isEdit ? t("บันทึกการแก้ไข") : t("จัดรอบกะ")}
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
          title={t("แก้ได้ทั้งเวลา วันที่ และกะ")}
          description={t("เปลี่ยนวันที่ = ย้ายรอบกะทั้งรอบ รายชื่อคนในกะย้ายไปด้วย · เวลาที่แก้มีผลเฉพาะรอบนี้ กะมาตรฐานไม่เปลี่ยน")}
        />
      ) : null}

      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => void handleSubmit(values)}
      >
        <Form.Item
          name="shiftId"
          label={t("กะ")}
          extra={isEdit ? t("เปลี่ยนกะ = สลับทั้งรอบ คนในกะอยู่ครบเหมือนเดิม") : undefined}
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
          name="shiftDate"
          label={t("วันที่")}
          extra={isEdit ? t("เปลี่ยนวันที่ = ย้ายรอบกะไปวันนั้น") : undefined}
          rules={[{ required: true, message: t("เลือกวันที่") }]}
        >
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="startTime"
          label={t("เวลาเข้ากะ")}
          rules={[{ required: true, message: t("ระบุเวลาเข้ากะ") }]}
        >
          <TimePicker format="HH:mm" minuteStep={5} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="endTime"
          label={t("เวลาเลิกกะ")}
          extra={t("เลิกกะไม่หลังเข้ากะ = กะข้ามเที่ยงคืน")}
          rules={[{ required: true, message: t("ระบุเวลาเลิกกะ") }]}
        >
          <TimePicker format="HH:mm" minuteStep={5} style={{ width: "100%" }} />
        </Form.Item>

        {!isEdit ? (
          <Form.Item
            name="userIds"
            label={t("พนักงานในกะนี้")}
            extra={t("เพิ่มภายหลังได้ที่การ์ดของรอบกะ")}
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
        ) : null}

        <Form.Item name="note" label={t("หมายเหตุ")}>
          <Input.TextArea rows={2} placeholder={t("เช่น เข้าสายเพราะรอวัตถุดิบ")} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
