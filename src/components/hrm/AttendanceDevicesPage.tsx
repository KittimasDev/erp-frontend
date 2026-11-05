"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CopyOutlined, PlusOutlined, ScanOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useAttendanceDeviceEventsQuery,
  useAttendanceDevicesQuery,
  useCreateAttendanceDeviceMutation,
  useRotateAttendanceDeviceKeyMutation,
  useUpdateAttendanceDeviceMutation,
} from "@/hooks/attendance-devices/useAttendanceDevices";
import {
  DEVICE_SCAN_STATUS_LABEL,
  type AttendanceDevice,
  type AttendanceDeviceEvent,
  type AttendanceDeviceWithKey,
  type DeviceScanStatus,
} from "@/types/attendance-devices";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

const fmt = (iso?: string | null) => (iso ? dayjs(iso).format("DD/MM/YYYY HH:mm:ss") : "—");

const STATUS_COLOR: Record<DeviceScanStatus, string> = {
  PROCESSED: "green",
  UNMATCHED: "red",
  REJECTED: "orange",
  IGNORED: "default",
};

const SAMPLE = `POST /api/hrm/device-scans
X-Device-Key: <API key ของเครื่อง>
Content-Type: application/json

{ "scans": [
  { "employeeCode": "EMP-0012", "scannedAt": "2026-10-13T08:02:11+07:00",
    "direction": "AUTO", "eventId": "88231" }
] }`;

type CreateValues = { code: string; name: string; location?: string };

/** หน้า /hrm/attendance-devices — ลงทะเบียนเครื่องสแกนนิ้ว/RFID (ได้ API key) และดู log สแกนดิบ */
export default function AttendanceDevicesPage() {
  const { message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [issued, setIssued] = useState<AttendanceDeviceWithKey | null>(null);
  const [eventStatus, setEventStatus] = useState<string>();
  const [form] = Form.useForm<CreateValues>();

  const devicesQuery = useAttendanceDevicesQuery();
  const eventsQuery = useAttendanceDeviceEventsQuery(eventStatus);
  const create = useCreateAttendanceDeviceMutation();
  const update = useUpdateAttendanceDeviceMutation();
  const rotate = useRotateAttendanceDeviceKeyMutation();

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      message.success("คัดลอก API key แล้ว");
    } catch {
      message.error("คัดลอกไม่สำเร็จ — เลือกข้อความแล้วคัดลอกเอง");
    }
  };

  const submit = () =>
    void form.validateFields().then((v) =>
      create.mutate(
        { code: v.code.trim(), name: v.name.trim(), location: v.location?.trim() || undefined },
        {
          onSuccess: (res) => {
            setCreateOpen(false);
            form.resetFields();
            setIssued(res.data);
          },
        },
      ),
    );

  const deviceColumns: ColumnsType<AttendanceDevice> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "เครื่อง",
      key: "name",
      render: (_v, d) => (
        <div>
          <strong>{d.name}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[d.code, d.location].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    { title: "API key", key: "prefix", width: 150, render: (_v, d) => <code>{d.keyPrefix}…</code> },
    { title: "ส่งข้อมูลล่าสุด", key: "seen", width: 180, render: (_v, d) => fmt(d.lastSeenAt) },
    {
      title: "ใช้งาน",
      key: "active",
      width: 100,
      render: (_v, d) => (
        <Switch
          checked={d.isActive}
          loading={update.isPending && update.variables?.id === d.id}
          onChange={(checked) =>
            update.mutate(
              { id: d.id, body: { isActive: checked } },
              { onSuccess: (r) => message.success(r.message) },
            )
          }
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_v, d) => (
        <Popconfirm
          title="ออก API key ใหม่?"
          description="key เดิมของเครื่องนี้จะใช้ไม่ได้ทันที — ต้องตั้ง key ใหม่ในเครื่อง/ตัวกลาง"
          okText="ออก key ใหม่"
          cancelText="ยกเลิก"
          onConfirm={() =>
            rotate.mutate(d.id, { onSuccess: (res) => setIssued(res.data) })
          }
        >
          <Button size="small" loading={rotate.isPending && rotate.variables === d.id}>
            หมุน key
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const eventColumns: ColumnsType<AttendanceDeviceEvent> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: "เวลาสแกน", key: "scanned", width: 170, render: (_v, e) => fmt(e.scannedAt) },
    { title: "เครื่อง", key: "device", width: 160, render: (_v, e) => e.deviceName ?? "—" },
    {
      title: "พนักงาน",
      key: "emp",
      render: (_v, e) => (
        <div>
          <strong>{e.displayName ?? "—"}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{e.employeeCode}</div>
        </div>
      ),
    },
    { title: "ทิศทาง", dataIndex: "direction", key: "direction", width: 90 },
    {
      title: "ผล",
      key: "status",
      width: 130,
      render: (_v, e) => <Tag color={STATUS_COLOR[e.status]}>{DEVICE_SCAN_STATUS_LABEL[e.status]}</Tag>,
    },
    { title: "หมายเหตุ", key: "msg", render: (_v, e) => e.message ?? "" },
  ];

  return (
    <MasterPageGate isLoading={devicesQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="HRM · FINGER SCAN / RFID"
          icon={<ScanOutlined />}
          title="เครื่องสแกนนิ้ว / RFID"
          subtitle="ลงทะเบียนเครื่องแล้วให้เครื่อง/ตัวกลางยิงสแกนเข้าระบบ — ลงเวลาเข้า-ออกงานให้อัตโนมัติ"
          actions={
            <>
<Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            ลงทะเบียนเครื่อง
          </Button>
            </>
          }
        />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="วิธีเชื่อมต่อ"
          description={
            <div>
              <p style={{ margin: "0 0 6px" }}>
                เครื่องต้องลงทะเบียนนิ้ว/บัตรด้วย <strong>รหัสพนักงาน</strong> ให้ตรงกับรหัสพนักงานในระบบ
                (ไม่ตรง = ขึ้น &quot;ไม่พบพนักงาน&quot; ใน log) · ส่งซ้ำได้ปลอดภัย (ระบบกันซ้ำจาก eventId หรือ รหัส+เวลา) ·
                สแกนซ้ำของคนเดิมภายใน 60 วินาทีไม่ลงเวลาอีก · เครื่องไม่แยกเข้า/ออกให้ใช้ AUTO
              </p>
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap" }}>{SAMPLE}</pre>
            </div>
          }
        />

        <div className={styles.tableCard}>
          <Tabs
            items={[
              {
                key: "devices",
                label: "เครื่อง",
                children: (
                  <Table
                    rowKey="id"
                    className={styles.dataTable}
                    columns={deviceColumns}
                    dataSource={devicesQuery.data?.data ?? []}
                    loading={devicesQuery.isFetching}
                    pagination={false}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: "ยังไม่มีเครื่อง — กด ลงทะเบียนเครื่อง" }}
                  />
                ),
              },
              {
                key: "events",
                label: "log การสแกน",
                children: (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <Select
                        allowClear
                        placeholder="ทุกผลลัพธ์"
                        style={{ width: 200 }}
                        value={eventStatus}
                        onChange={setEventStatus}
                        options={(Object.keys(DEVICE_SCAN_STATUS_LABEL) as DeviceScanStatus[]).map((k) => ({
                          value: k,
                          label: DEVICE_SCAN_STATUS_LABEL[k],
                        }))}
                      />
                    </div>
                    <Table
                      rowKey="id"
                      className={styles.dataTable}
                      columns={eventColumns}
                      dataSource={eventsQuery.data?.data ?? []}
                      loading={eventsQuery.isFetching}
                      pagination={{ pageSize: 20 }}
                      scroll={{ x: 800 }}
                      locale={{ emptyText: "ยังไม่มีการสแกนเข้าระบบ" }}
                    />
                  </>
                ),
              },
            ]}
          />
        </div>

        <Modal
          open={createOpen}
          title="ลงทะเบียนเครื่อง"
          okText="ลงทะเบียน"
          cancelText="ยกเลิก"
          confirmLoading={create.isPending}
          onCancel={() => setCreateOpen(false)}
          onOk={submit}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" preserve={false}>
            <Form.Item
              name="code"
              label="รหัสเครื่อง"
              rules={[
                { required: true, message: "ใส่รหัสเครื่อง" },
                { pattern: /^[A-Za-z0-9_-]{1,50}$/, message: "ใช้ได้เฉพาะ A-Z a-z 0-9 _ -" },
              ]}
            >
              <Input placeholder="เช่น GATE-1" maxLength={50} />
            </Form.Item>
            <Form.Item name="name" label="ชื่อเครื่อง" rules={[{ required: true, whitespace: true, message: "ใส่ชื่อเครื่อง" }]}>
              <Input maxLength={200} placeholder="เช่น เครื่องสแกนนิ้ว ประตูโรงงาน" />
            </Form.Item>
            <Form.Item name="location" label="ที่ตั้ง">
              <Input maxLength={200} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={Boolean(issued)}
          title={`API key ของเครื่อง ${issued?.code ?? ""}`}
          onCancel={() => setIssued(null)}
          footer={<Button type="primary" onClick={() => setIssued(null)}>เก็บ key แล้ว ปิด</Button>}
          mask={{ closable: false }}
        >
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title="แสดงครั้งเดียวเท่านั้น — ปิดหน้าต่างนี้แล้วดูซ้ำไม่ได้ (ทำได้แค่ออก key ใหม่)"
          />
          <Input.TextArea readOnly autoSize value={issued?.apiKey} onFocus={(e) => e.target.select()} />
          <Button
            style={{ marginTop: 8 }}
            icon={<CopyOutlined />}
            onClick={() => issued && void copyKey(issued.apiKey)}
          >
            คัดลอก
          </Button>
        </Modal>
      </section>
    </MasterPageGate>
  );
}
