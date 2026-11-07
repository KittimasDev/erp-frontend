"use client";

import { useState } from "react";
import { App, DatePicker, Form, Modal, Tag } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import {
  usePreviewScheduleRoundMutation,
  useUpdateScheduleRoundMutation,
} from "@/hooks/production-schedule/useProductionSchedule";
import type { ScheduleRound } from "@/types/production-schedule";

import { useT } from "@/lib/i18n/useT";

import { fmtDate, roundWindow } from "./schedule-dates";

type Props = {
  round: ScheduleRound;
  onClose: () => void;
};

type FormValues = { startDate: Dayjs };

export default function EditProductionRoundModal({ round, onClose }: Props) {
  const t = useT();
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
      title={t("แก้ไขรอบ {no}", { no: round.roundNo })}
      okText={t("ตรวจผลกระทบ")}
      cancelText={t("ยกเลิก")}
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
              title: t("ยืนยันบันทึกการแก้ไข?"),
              okText: t("บันทึก"),
              cancelText: t("ยกเลิก"),
              content: (
                <div>
                  <p>
                    {round.roundNo}: {t("ผลิต")} {fmtDate(round.startDate)} – {fmtDate(round.endDate)} {t("เป็น")}{" "}
                    {fmtDate(data.round.startDate)} – {fmtDate(data.round.endDate)}
                    <br />
                    Shutdown {fmtDate(data.round.shutdownStartDate)} – {fmtDate(data.round.shutdownEndDate)}
                  </p>
                  {data.droppedExtraOffDates.length > 0 ? (
                    <p>{t("วันหยุดเพิ่มที่หลุดออก:")} {data.droppedExtraOffDates.map(fmtDate).join(", ")}</p>
                  ) : null}
                  {data.impacts.length === 0 ? (
                    <p>{t("ไม่มีผลกระทบต่อรอบถัดไป")}</p>
                  ) : (
                    <ul style={{ paddingLeft: 18 }}>
                      {data.impacts.map((impact) => (
                        <li key={impact.id}>
                          {impact.roundNo}: {fmtDate(impact.beforeStartDate)} – {fmtDate(impact.beforeEndDate)}{" "}
                          {t("เป็น")} {fmtDate(impact.afterStartDate)} – {fmtDate(impact.afterEndDate)}
                          {impact.droppedExtraOffDates.length > 0
                            ? ` (${t("วันหยุดที่หลุด:")} ${impact.droppedExtraOffDates.map(fmtDate).join(", ")})`
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
        <Form.Item name="startDate" label={t("วันแรกของช่วงผลิต")} rules={[{ required: true, message: t("เลือกวันเริ่ม") }]}>
          <DatePicker aria-label={t("วันแรกของช่วงผลิต")} format="DD/MM/YYYY" style={{ width: "100%" }} allowClear={false} />
        </Form.Item>
      </Form>
      {window ? (
        <p>
          {t("ผลิตถึง")} {fmtDate(window.endDate)} · Shutdown {fmtDate(window.shutdownStartDate)} –{" "}
          {fmtDate(window.shutdownEndDate)}
        </p>
      ) : null}
      <label style={{ display: "grid", gap: 6 }}>
        <span>{t("วันหยุดผลิตเพิ่มเติมของรอบนี้")}</span>
        <DatePicker
          aria-label={t("วันหยุดผลิตเพิ่มเติมของรอบนี้")}
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
      {outside.length > 0 ? <p style={{ color: "#b91c1c" }}>{t("วันหยุดเพิ่มต้องอยู่ในช่วงผลิตของรอบนี้")}</p> : null}
    </Modal>
  );
}
