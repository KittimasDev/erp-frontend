"use client";

import { useState } from "react";
import { Alert, Button, DatePicker, Form, Input, Modal, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined, PlusOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreatePayrollRunMutation, usePayrollRunsQuery } from "@/hooks/payroll/usePayroll";
import { PAYROLL_STATUS_LABEL, type PayrollRun } from "@/types/payroll";
import styles from "@/components/masters/shared/master-page.module.css";

import PayrollDetailDrawer from "./PayrollDetailDrawer";
import PayrollSettingsModal from "./PayrollSettingsModal";
import { formatBeRange } from "./shutdownPlanFormat";
import PageHeader from "@/components/common/PageHeader";

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLOR = { DRAFT: "gold", FINALIZED: "green", CANCELLED: "default" } as const;

type CreateValues = { name: string; range: [Dayjs, Dayjs]; note?: string };

/** หน้า /hrm/payroll — งวดเงินเดือน: สร้างงวด (กำหนดวันเริ่ม–สิ้นสุดเอง) → ตรวจ/ปรับ → ปิดงวด → ส่งออก */
export default function PayrollPage() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [form] = Form.useForm<CreateValues>();

  const runsQuery = usePayrollRunsQuery();
  const createMutation = useCreatePayrollRunMutation();
  const runs = runsQuery.data?.data ?? [];

  const submit = () =>
    void form.validateFields().then((v) =>
      createMutation.mutate(
        {
          name: v.name.trim(),
          periodStart: v.range[0].format("YYYY-MM-DD"),
          periodEnd: v.range[1].format("YYYY-MM-DD"),
          note: v.note?.trim() || undefined,
        },
        {
          onSuccess: (res) => {
            setCreateOpen(false);
            form.resetFields();
            setDetailId(res.data.id);
          },
        },
      ),
    );

  const columns: ColumnsType<PayrollRun> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: "งวด",
      key: "name",
      render: (_v, r) => (
        <button
          type="button"
          onClick={() => setDetailId(r.id)}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
        >
          {r.name}
        </button>
      ),
    },
    { title: "ช่วงวันที่", key: "range", width: 220, render: (_v, r) => formatBeRange(r.periodStart, r.periodEnd) },
    { title: "จำนวนคน", key: "count", width: 100, align: "right", render: (_v, r) => r.totals.slipCount },
    { title: "ค่า OT", key: "ot", width: 120, align: "right", render: (_v, r) => money(r.totals.otAmount) },
    { title: "ยอดสุทธิรวม", key: "net", width: 140, align: "right", render: (_v, r) => money(r.totals.netPay) },
    {
      title: "คำเตือน",
      key: "warn",
      width: 90,
      align: "center",
      render: (_v, r) => (r.totals.warningCount ? <Tag color="orange">{r.totals.warningCount}</Tag> : "—"),
    },
    {
      title: "สถานะ",
      key: "status",
      width: 120,
      render: (_v, r) => <Tag color={STATUS_COLOR[r.status]}>{PAYROLL_STATUS_LABEL[r.status]}</Tag>,
    },
  ];

  return (
    <MasterPageGate isLoading={runsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="HRM · PAYROLL"
          icon={<DollarOutlined />}
          title="เงินเดือน"
          subtitle="คำนวณเงินเดือน/ค่าแรง + OT หักขาด/ลาไม่รับเงิน/ประกันสังคม เป็นงวด แล้วส่งออก Excel/CSV"
          actions={
            <>
<div style={{ display: "flex", gap: 8 }}>
            <Button size="large" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
              ตั้งค่า
            </Button>
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              สร้างงวดเงินเดือน
            </Button>
          </div>
            </>
          }
        />

        <Alert
          type="info"
          showIcon
          title="ข้อมูลอ่อนไหว — เห็นได้เฉพาะผู้ที่ได้รับสิทธิ์หน้านี้"
          description="ระบบคำนวณให้อัตโนมัติ: เงินเดือน/ค่าแรงรายวัน, OT ที่อนุมัติแล้ว, หักขาดงาน/ลาไม่รับเงิน, ประกันสังคม (ไม่คิดภาษี) · เบี้ยขยัน ค่ากะ ค่ากะกลางคืน โบนัส ใส่เป็น “รายการปรับ” รายคนในแต่ละงวด"
          style={{ marginBottom: 12 }}
        />

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3>งวดเงินเดือน</h3>
              <p>กดชื่องวดเพื่อดูสลิป ปรับรายการ ปิดงวด และส่งออก</p>
            </div>
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={runs}
            loading={runsQuery.isFetching}
            pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} งวด` }}
            scroll={{ x: 900 }}
            locale={{ emptyText: "ยังไม่มีงวดเงินเดือน — กด สร้างงวดเงินเดือน" }}
          />
        </div>

        <Modal
          open={createOpen}
          title="สร้างงวดเงินเดือน"
          okText="สร้างและคำนวณ"
          cancelText="ยกเลิก"
          confirmLoading={createMutation.isPending}
          onCancel={() => setCreateOpen(false)}
          onOk={submit}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" preserve={false}>
            <Form.Item name="name" label="ชื่องวด" rules={[{ required: true, whitespace: true, message: "ใส่ชื่องวด" }]}>
              <Input maxLength={200} placeholder="เช่น เงินเดือน ต.ค. 2569" />
            </Form.Item>
            <Form.Item
              name="range"
              label="ช่วงวันที่ของงวด (เริ่ม–สิ้นสุด กำหนดเองได้ ไม่เกิน 62 วัน)"
              rules={[{ required: true, message: "เลือกช่วงวันที่" }]}
            >
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                disabledDate={(d) => d.isAfter(dayjs().add(1, "year"))}
              />
            </Form.Item>
            <Form.Item name="note" label="หมายเหตุ">
              <Input.TextArea rows={2} maxLength={2000} />
            </Form.Item>
          </Form>
        </Modal>
        <PayrollSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <PayrollDetailDrawer runId={detailId} onClose={() => setDetailId(undefined)} />
      </section>
    </MasterPageGate>
  );
}
