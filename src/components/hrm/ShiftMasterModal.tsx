"use client";

import { useState } from "react";
import {
  Button,
  ColorPicker,
  Empty,
  Form,
  InputNumber,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useT } from "@/lib/i18n/useT";
import {
  useCreateShiftMutation,
  useUpdateShiftMutation,
} from "@/hooks/shifts/useShiftMutations";
import { useShiftsQuery } from "@/hooks/shifts/useShiftQueries";
import type { Shift } from "@/types/shifts";

import styles from "./ShiftCalendarPage.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormValues = {
  name: string;
  startTime: Dayjs;
  endTime: Dayjs;
  color?: string | { toHexString: () => string };
  lateGraceMinutes?: number;
};

function toDayjsTime(value: string) {
  return dayjs(`2000-01-01 ${value}`);
}

function readColor(value: FormValues["color"]) {
  if (!value) {
    return undefined;
  }
  return typeof value === "string" ? value : value.toHexString();
}

/** จัดการกะมาตรฐาน (ชื่อ/เวลา/สี/ผ่อนผัน) — ใช้เป็นตัวเลือกตอนจัดรอบกะรายวัน */
export default function ShiftMasterModal({ open, onClose }: Props) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  // หน้านี้ต้องเห็นกะที่ปิดใช้งานด้วย เพื่อเปิดกลับได้
  const shiftsQuery = useShiftsQuery(true, open);
  const shifts = shiftsQuery.data?.data ?? [];

  const createMutation = useCreateShiftMutation();
  const updateMutation = useUpdateShiftMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
    form.setFieldsValue({
      name: "",
      startTime: dayjs().hour(8).minute(0),
      endTime: dayjs().hour(17).minute(0),
      color: undefined,
      lateGraceMinutes: undefined,
    });
  };

  const openEdit = (shift: Shift) => {
    setEditing(shift);
    setFormOpen(true);
    form.setFieldsValue({
      name: shift.name,
      startTime: toDayjsTime(shift.startTime),
      endTime: toDayjsTime(shift.endTime),
      color: shift.color,
      lateGraceMinutes: shift.lateGraceMinutes,
    });
  };

  const handleSubmit = async (values: FormValues) => {
    const body = {
      name: values.name.trim(),
      startTime: values.startTime.format("HH:mm"),
      endTime: values.endTime.format("HH:mm"),
      color: readColor(values.color),
      lateGraceMinutes: values.lateGraceMinutes ?? undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงค่าในฟอร์มไว้ให้แก้ต่อ
      return;
    }
    setFormOpen(false);
    setEditing(null);
  };

  const columns: ColumnsType<Shift> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("กะ"),
      key: "name",
      render: (_v, row) => (
        <Space size={8}>
          <span
            className={styles.roundColor}
            style={{ background: row.color || "#8ab933" }}
            aria-hidden
          />
          <strong>{row.name}</strong>
          {row.isOvernight ? <Tag color="purple">{t("ข้ามคืน")}</Tag> : null}
          {!row.isActive ? <Tag>{t("ปิดใช้งาน")}</Tag> : null}
        </Space>
      ),
    },
    {
      title: t("เวลา"),
      key: "time",
      width: 130,
      render: (_v, row) => `${row.startTime} - ${row.endTime}`,
    },
    {
      title: t("ผ่อนผัน"),
      dataIndex: "lateGraceMinutes",
      key: "lateGraceMinutes",
      width: 100,
      align: "center",
      render: (value?: number) =>
        value === undefined || value === null ? t("ค่ากลาง") : t("{n} นาที", { n: value }),
    },
    {
      title: t("จัดการ"),
      key: "action",
      width: 150,
      align: "center",
      render: (_v, row) => (
        <Space size={4}>
          <Button size="small" onClick={() => openEdit(row)}>
            {t("แก้ไข")}
          </Button>
          <Switch
            size="small"
            checked={row.isActive}
            loading={updateMutation.isPending}
            onChange={(checked) =>
              updateMutation.mutate({
                id: row.id,
                body: { isActive: checked },
              })
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={t("จัดการกะการทำงาน")}
      width={720}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      centered
    >
      <div className={styles.masterToolbar}>
        <p>
          {t("กะที่สร้างไว้จะเป็นตัวเลือกตอนจัดรอบกะลงปฏิทิน — ปิดสวิตช์ = เลิกใช้กะนั้น")}
        </p>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("สร้างกะใหม่")}
        </Button>
      </div>

      {formOpen ? (
        <Form<FormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          className={styles.masterForm}
          onFinish={(values) => void handleSubmit(values)}
        >
          <div className={styles.masterFormGrid}>
            <Form.Item
              name="name"
              label={t("ชื่อกะ")}
              rules={[{ required: true, message: t("ระบุชื่อกะ") }]}
            >
              <Input placeholder={t("เช่น กะเช้า")} maxLength={100} />
            </Form.Item>

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

            <Form.Item name="color" label={t("สีในปฏิทิน")}>
              <ColorPicker format="hex" />
            </Form.Item>

            <Form.Item
              name="lateGraceMinutes"
              label={t("ผ่อนผัน (นาที)")}
              extra={t("เว้นว่าง = ใช้ค่ากลางของระบบ")}
            >
              <InputNumber min={0} max={240} style={{ width: "100%" }} />
            </Form.Item>
          </div>

          <Space size={8}>
            <Button type="primary" htmlType="submit" loading={isPending}>
              {editing ? t("บันทึกการแก้ไข") : t("สร้างกะ")}
            </Button>
            <Button
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              {t("ยกเลิก")}
            </Button>
          </Space>
        </Form>
      ) : null}

      <Table<Shift>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={shifts}
        loading={shiftsQuery.isFetching}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("ยังไม่มีกะในระบบ")}
            />
          ),
        }}
      />
    </Modal>
  );
}
