"use client";

import { useState } from "react";
import { App, DatePicker, Form, Modal, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import {
  usePreviewScheduleRoundMutation,
  useUpdateScheduleRoundMutation,
} from "@/hooks/production-schedule/useProductionSchedule";
import type { ScheduleRound } from "@/types/production-schedule";

import { fmtDate, roundWindow } from "./schedule-dates";

type Props = {
  round: ScheduleRound;
  onClose: () => void;
};

type FormValues = { startDate: Dayjs };

export default function EditProductionRoundModal({ round, onClose }: Props) {
  const { modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const preview = usePreviewScheduleRoundMutation();
  const update = useUpdateScheduleRoundMutation();
  const [extraDates, setExtraDates] = useState<string[]>(round.extraOffDates);
  const [picker, setPicker] = useState<Dayjs | null>(null);
  const noteByDate = new Map(round.holidays.map((holiday) => [holiday.date, holiday.note]));
  const start = Form.useWatch("startDate", form);
  const window = start ? roundWindow(start.format("YYYY-MM-DD")) : null;
  const outside = window ? extraDates.filter((date) => date > window.endDate) : [];

  const addDate = (value: Dayjs | null) => {
    if (!value) return;
    const iso = value.format("YYYY-MM-DD");
    setExtraDates((prev) => (prev.includes(iso) ? prev : [...prev, iso].sort()));
    setPicker(null);
  };

  return (
    <Modal
      open
      title={`แก้ไขรอบ ${round.roundNo}`}
      okText="ตรวจผลกระทบ"
      cancelText="ยกเลิก"
      destroyOnHidden
      confirmLoading={preview.isPending || update.isPending}
      okButtonProps={{ disabled: outside.length > 0 }}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((values) => {
          const body = {
            startDate: values.startDate.format("YYYY-MM-DD"),
            extraOffDates: extraDates,
          };
          void preview.mutateAsync({ id: round.id, body }).then((result) => {
            const data = result.data;
            modal.confirm({
              title: "ยืนยันบันทึกการแก้ไข?",
              okText: "บันทึก",
              cancelText: "ยกเลิก",
              content: (
                <div>
                  <p>
                    {round.roundNo}: ผลิต {fmtDate(round.startDate)} – {fmtDate(round.endDate)} เป็น{" "}
                    {fmtDate(data.round.startDate)} – {fmtDate(data.round.endDate)}
                    <br />
                    Shutdown {fmtDate(data.round.shutdownStartDate)} – {fmtDate(data.round.shutdownEndDate)}
                  </p>
                  {data.droppedExtraOffDates.length > 0 ? (
                    <p>วันหยุดเพิ่มที่หลุดออก: {data.droppedExtraOffDates.map(fmtDate).join(", ")}</p>
                  ) : null}
                  {data.impacts.length === 0 ? (
                    <p>ไม่มีผลกระทบต่อรอบถัดไป</p>
                  ) : (
                    <ul style={{ paddingLeft: 18 }}>
                      {data.impacts.map((impact) => (
                        <li key={impact.id}>
                          {impact.roundNo}: {fmtDate(impact.beforeStartDate)} – {fmtDate(impact.beforeEndDate)}{" "}
                          เป็น {fmtDate(impact.afterStartDate)} – {fmtDate(impact.afterEndDate)}
                          {impact.droppedExtraOffDates.length > 0
                            ? ` (วันหยุดที่หลุด: ${impact.droppedExtraOffDates.map(fmtDate).join(", ")})`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
              onOk: () => update.mutateAsync({ id: round.id, body }).then(onClose),
            });
          });
        })
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ startDate: dayjs(round.startDate) }}
      >
        <Form.Item name="startDate" label="วันแรกของช่วงผลิต" rules={[{ required: true, message: "เลือกวันเริ่ม" }]}>
          <DatePicker aria-label="วันแรกของช่วงผลิต" format="DD/MM/YYYY" style={{ width: "100%" }} allowClear={false} />
        </Form.Item>
      </Form>
      {window ? (
        <p>
          ผลิตถึง {fmtDate(window.endDate)} · Shutdown {fmtDate(window.shutdownStartDate)} –{" "}
          {fmtDate(window.shutdownEndDate)}
        </p>
      ) : null}
      <label style={{ display: "grid", gap: 6 }}>
        <span>วันหยุดผลิตเพิ่มเติมของรอบนี้</span>
        <DatePicker
          aria-label="วันหยุดผลิตเพิ่มเติมของรอบนี้"
          value={picker}
          format="DD/MM/YYYY"
          onChange={addDate}
          style={{ width: "100%" }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {extraDates.map((date) => (
          <Tag
            key={date}
            closable
            color={outside.includes(date) ? "red" : "blue"}
            onClose={() => setExtraDates((prev) => prev.filter((item) => item !== date))}
          >
            {fmtDate(date)}
            {noteByDate.get(date) ? ` · ${noteByDate.get(date)}` : ""}
          </Tag>
        ))}
      </div>
      {outside.length > 0 ? <p style={{ color: "#b91c1c" }}>วันหยุดเพิ่มต้องอยู่ในช่วงผลิตของรอบนี้</p> : null}
    </Modal>
  );
}
