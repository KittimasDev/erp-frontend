"use client";

import { Alert, Button, DatePicker, Drawer, Form, Input, InputNumber, Popconfirm, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import {
  useAdjustTankReadingMutation,
  useIgnoreTankReadingMutation,
  useRecordTankReadingMutation,
  useTankReadingsQuery,
} from "@/hooks/oil-tank-farm/useOilTankFarm";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useT } from "@/lib/i18n/useT";
import type { OilTank, OilTankReading } from "@/types/oil-tank-farm";

const n = (v: string | number) => Number(v).toLocaleString("th-TH", { maximumFractionDigits: 3 });
const STATUS: Record<string, { label: string; color: string }> = {
  RECORDED: { label: "รอตัดสินใจ", color: "gold" },
  ADJUSTED: { label: "ปรับยอดแล้ว", color: "green" },
  IGNORED: { label: "ไม่ปรับ", color: "default" },
};

/** วัดระดับน้ำมันจริง (Manual Entry) เทียบกับยอดในระบบ — ปรับยอดเมื่อผู้อนุมัติกดยืนยัน */
export default function TankReadingsDrawer({ tank, onClose }: { tank: OilTank | null; onClose: () => void }) {
  const t = useT();
  const [form] = Form.useForm<{ measuredAt: dayjs.Dayjs; measuredLiters: number; note?: string }>();
  const query = useTankReadingsQuery(tank?.id);
  const record = useRecordTankReadingMutation();
  const adjust = useAdjustTankReadingMutation();
  const ignore = useIgnoreTankReadingMutation();
  const { canApprove } = getScreenActionPermissions("OIL_TANKS");

  const columns: ColumnsType<OilTankReading> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เวลาที่วัด"), key: "t", width: 150, render: (_v, r) => dayjs(r.measuredAt).format("DD/MM/YYYY HH:mm") },
    { title: t("วัดจริง"), key: "m", width: 110, align: "right", render: (_v, r) => n(r.measuredLiters) },
    { title: t("ในระบบ"), key: "b", width: 110, align: "right", render: (_v, r) => n(r.bookLiters) },
    {
      title: t("ส่วนต่าง"),
      key: "v",
      width: 110,
      align: "right",
      render: (_v, r) => {
        const v = Number(r.varianceLiters);
        return <span style={{ color: v < 0 ? "#cf1322" : v > 0 ? "#389e0d" : undefined, fontWeight: 600 }}>{v > 0 ? "+" : ""}{n(v)}</span>;
      },
    },
    { title: t("ผู้วัด"), key: "u", width: 120, render: (_v, r) => r.measuredByName ?? "—" },
    { title: t("สถานะ"), key: "s", width: 120, render: (_v, r) => <Tag color={STATUS[r.status].color}>{t(STATUS[r.status].label)}</Tag> },
    {
      title: "",
      key: "a",
      width: 170,
      render: (_v, r) =>
        r.status === "RECORDED" && canApprove ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Popconfirm
              title={t("ปรับยอดในระบบให้ตรงค่าที่วัด?")}
              description={t("สร้างรายการปรับยอด (ตัด FIFO ราย Lot หรือเพิ่มเข้า Lot ล่าสุด) — ทำไม่ได้ถ้ามีรับ/จ่าย/โอนหลังเวลาที่วัด")}
              okText={t("ปรับยอด")}
              cancelText={t("ยกเลิก")}
              onConfirm={() => adjust.mutate({ readingId: r.id })}
            >
              <Button size="small" type="primary" loading={adjust.isPending && adjust.variables?.readingId === r.id}>
                {t("ปรับยอด")}
              </Button>
            </Popconfirm>
            <Popconfirm title={t("ปิดรายการนี้โดยไม่ปรับยอด?")} okText={t("ปิด")} cancelText={t("ยกเลิก")} onConfirm={() => ignore.mutate({ readingId: r.id })}>
              <Button size="small">{t("ไม่ปรับ")}</Button>
            </Popconfirm>
          </div>
        ) : (
          r.resolveNote ?? ""
        ),
    },
  ];

  return (
    <Drawer
      open={Boolean(tank)}
      onClose={onClose}
      size="large"
      styles={{ wrapper: { width: "min(900px, 96vw)" } }}
      title={tank ? `${t("วัดระดับน้ำมัน")} — ${tank.tankNo}` : ""}
    >
      {tank ? (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title={t("ยอดในระบบตอนนี้ {cur} ลิตร (ความจุ {cap}) — บันทึกค่าที่วัดจริงเพื่อดูส่วนต่าง ระบบไม่แก้ยอดเอง ต้องให้ผู้อนุมัติกด “ปรับยอด”", { cur: n(tank.currentVolumeLiters ?? 0), cap: n(tank.capacityLiters) })}
          />
          <Form
            form={form}
            layout="inline"
            style={{ marginBottom: 16, rowGap: 8 }}
            initialValues={{ measuredAt: dayjs() }}
            onFinish={(v) =>
              record.mutate(
                { tankId: tank.id, measuredAt: v.measuredAt.toISOString(), measuredLiters: v.measuredLiters, note: v.note },
                { onSuccess: () => form.resetFields(["measuredLiters", "note"]) },
              )
            }
          >
            <Form.Item name="measuredAt" rules={[{ required: true }]}>
              <DatePicker showTime format="DD/MM/YYYY HH:mm" disabledDate={(d) => d.isAfter(dayjs())} />
            </Form.Item>
            <Form.Item name="measuredLiters" rules={[{ required: true, message: t("ใส่ปริมาณที่วัด") }]}>
              <InputNumber min={0} precision={3} placeholder={t("วัดได้ (ลิตร)")} style={{ width: 170 }} />
            </Form.Item>
            <Form.Item name="note">
              <Input placeholder={t("หมายเหตุ")} style={{ width: 200 }} maxLength={2000} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={record.isPending}>
              {t("บันทึกค่าที่วัด")}
            </Button>
          </Form>
          <Table rowKey="id" size="small" columns={columns} dataSource={query.data?.data ?? []} loading={query.isFetching} pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: t("ยังไม่เคยวัดระดับ") }} />
        </>
      ) : null}
    </Drawer>
  );
}
