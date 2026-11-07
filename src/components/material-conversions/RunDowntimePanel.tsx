"use client";

import { useState } from "react";
import { App, Button, DatePicker, Form, Input, Modal, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import { materialConversionsKey, useConversionLookupsQuery, useRunDowntimesQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import { ApiError } from "@/lib/api/client";
import { endRunDowntime, startRunDowntime } from "@/lib/api/material-conversions";
import { getAccessToken } from "@/lib/auth/token";
import {
  DOWNTIME_ROOT_CAUSE_LABEL,
  type MaterialConversionRun,
  type RunDowntime,
} from "@/types/material-conversion";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useT } from "@/lib/i18n/useT";
import styles from "./MaterialConversionPage.module.css";

const fmtMinutes = (m: number, t: (s: string) => string) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h} ${t("ชม.")} ${min} ${t("นาที")}` : `${min} ${t("นาที")}`;
};

type Props = { run: MaterialConversionRun; canEdit: boolean };

/**
 * เครื่องหยุดระหว่างทำงาน (M4.5) — บันทึกว่าเครื่องหยุดเมื่อไหร่ เพราะอะไร กลับมาเดินเมื่อไหร่
 * เก็บในตาราง Downtime กลางของงานซ่อมบำรุง จึงไปรวมในรายงาน Downtime/OEE ของเครื่องนั้นด้วย
 * บันทึกได้เฉพาะใบที่กำลังทำงาน (เริ่มงานแล้ว ยังไม่ปิด)
 */
export default function RunDowntimePanel({ run, canEdit }: Props) {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const query = useRunDowntimesQuery(run.id, run.status !== "DRAFT");
  const lookups = useConversionLookupsQuery();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{
    equipmentId?: string;
    startAt: Dayjs;
    reason: string;
    rootCauseCategory?: string;
  }>();

  const refresh = () => void queryClient.invalidateQueries({ queryKey: [...materialConversionsKey, "downtimes", run.id] });
  const fail = (e: unknown, fallback: string) => message.error(e instanceof ApiError ? e.message : fallback);

  const start = useMutation({
    mutationFn: (body: Parameters<typeof startRunDowntime>[2]) => startRunDowntime(getAccessToken(), run.id, body),
    onSuccess: () => {
      refresh();
      setOpen(false);
      form.resetFields();
      message.success(t("บันทึกเครื่องหยุดแล้ว"));
    },
    onError: (e) => fail(e, t("บันทึกเครื่องหยุดไม่สำเร็จ")),
  });
  const end = useMutation({
    mutationFn: (downtimeId: string) => endRunDowntime(getAccessToken(), run.id, downtimeId, {}),
    onSuccess: () => {
      refresh();
      message.success(t("บันทึกว่าเครื่องกลับมาเดินแล้ว"));
    },
    onError: (e) => fail(e, t("ปิดรายการเครื่องหยุดไม่สำเร็จ")),
  });

  const data = query.data?.data;
  const canRecord = canEdit && run.status === "IN_PROGRESS";
  if (run.status === "DRAFT" || (!canRecord && (data?.items.length ?? 0) === 0)) return null;

  const columns: ColumnsType<RunDowntime> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เครื่อง"),
      key: "eq",
      render: (_v, r) => (
        <div className={styles.cellStack}>
          <span>{r.equipmentName}</span>
          <span className={styles.cellMuted}>{r.equipmentCode}</span>
        </div>
      ),
    },
    { title: t("เริ่มหยุด"), dataIndex: "startAt", width: 150, render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    {
      title: t("กลับมาเดิน"),
      dataIndex: "endAt",
      width: 150,
      render: (v: string | undefined, r) => (r.isOpen ? <Tag color="orange">{t("ยังหยุดอยู่")}</Tag> : dayjs(v).format("DD/MM/YYYY HH:mm")),
    },
    { title: t("ระยะเวลา"), dataIndex: "durationMinutes", width: 110, align: "right", render: (m: number) => fmtMinutes(m, t) },
    {
      title: t("สาเหตุ"),
      key: "reason",
      render: (_v, r) => (
        <div className={styles.cellStack}>
          <span>{r.reason}</span>
          {r.rootCauseCategory ? <span className={styles.cellMuted}>{t(DOWNTIME_ROOT_CAUSE_LABEL[r.rootCauseCategory] ?? r.rootCauseCategory)}</span> : null}
        </div>
      ),
    },
  ];
  if (canRecord) {
    columns.push({
      title: "",
      key: "act",
      width: 130,
      render: (_v, r) =>
        r.isOpen ? (
          <Button size="small" type="primary" loading={end.isPending && end.variables === r.id} onClick={() => end.mutate(r.id)}>
            {t("กลับมาเดินแล้ว")}
          </Button>
        ) : null,
    });
  }

  return (
    <div className={styles.detailSection}>
      <h3>
        {t("เครื่องหยุดระหว่างทำงาน")}
        {data && data.items.length > 0 ? ` — ${t("รวม")} ${fmtMinutes(data.totalMinutes, t)}` : ""}
      </h3>
      <Table
        className={masterStyles.dataTable}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data?.items ?? []}
        pagination={false}
        locale={{ emptyText: t("ยังไม่มีการหยุดเครื่องในใบนี้") }}
      />
      {canRecord ? (
        <Button
          style={{ marginTop: 8 }}
          onClick={() => {
            form.setFieldsValue({ startAt: dayjs(), equipmentId: run.equipment?.id });
            setOpen(true);
          }}
        >
          {t("บันทึกเครื่องหยุด")}
        </Button>
      ) : null}

      <Modal
        open={open}
        title={t("บันทึกเครื่องหยุด")}
        okText={t("บันทึก")}
        cancelText={t("ยกเลิก")}
        confirmLoading={start.isPending}
        onCancel={() => setOpen(false)}
        onOk={() =>
          void form.validateFields().then((v) =>
            start.mutate({
              equipmentId: v.equipmentId,
              startAt: v.startAt.toISOString(),
              reason: v.reason.trim(),
              rootCauseCategory: v.rootCauseCategory,
            }),
          )
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="equipmentId"
            label={t("เครื่องที่หยุด")}
            rules={[{ required: !run.equipment, message: t("เลือกเครื่อง") }]}
            extra={run.equipment ? t("ไม่เลือก = ใช้เครื่องของใบ ({name})", { name: run.equipment.name }) : t("ใบนี้ไม่ได้ระบุเครื่อง — เลือกเครื่องที่หยุด")}
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={lookups.isLoading}
              options={(lookups.data?.data.equipment ?? []).map((e) => ({ value: e.id, label: `${e.equipmentCode} — ${e.name}` }))}
            />
          </Form.Item>
          <Form.Item name="startAt" label={t("เวลาที่เริ่มหยุด")} rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="reason" label={t("สาเหตุที่หยุด")} rules={[{ required: true, message: t("ใส่สาเหตุ") }]}>
            <Input.TextArea rows={2} maxLength={2000} placeholder={t("เช่น ใบมีดทื่อ หยุดเปลี่ยนใบมีด")} />
          </Form.Item>
          <Form.Item name="rootCauseCategory" label={t("กลุ่มสาเหตุ (ไม่บังคับ)")}>
            <Select
              allowClear
              options={Object.entries(DOWNTIME_ROOT_CAUSE_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
