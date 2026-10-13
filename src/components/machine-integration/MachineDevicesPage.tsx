"use client";

import { useState } from "react";
import { Alert, Button, Form, Input, Modal, Popconfirm, Select, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ApiOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateMachineDeviceMutation,
  useCreateMachineTagMutation,
  useMachineDevicesQuery,
  useMachineTagReadingsQuery,
  useRotateMachineKeyMutation,
  useUpdateMachineDeviceMutation,
  useUpdateMachineTagMutation,
} from "@/hooks/production-cycles/useProductionCycles";
import { useConversionLookupsQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import { ApiError } from "@/lib/api/client";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import {
  MACHINE_PROTOCOLS,
  MACHINE_PROTOCOL_LABEL,
  MACHINE_TAG_PURPOSES,
  MACHINE_TAG_PURPOSE_LABEL,
  type MachineDevice,
  type MachineDeviceWithKey,
  type MachineTag,
} from "@/types/production-cycle";
import styles from "@/components/masters/shared/master-page.module.css";

const fmtTime = (v?: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm:ss") : "—");

/** key แสดงครั้งเดียว — ปิดแล้วดูย้อนหลังไม่ได้ (ระบบเก็บเฉพาะ hash) */
function ApiKeyModal({ device, onClose }: { device: MachineDeviceWithKey; onClose: () => void }) {
  return (
    <Modal open title={`API key ของ ${device.deviceCode}`} onCancel={onClose} onOk={onClose} okText="คัดลอกแล้ว ปิด" cancelButtonProps={{ style: { display: "none" } }} closable={false} maskClosable={false}>
      <Alert type="warning" showIcon style={{ marginBottom: 12 }} title="เก็บ key นี้ไว้ตอนนี้ — แสดงครั้งเดียว" description="ระบบเก็บเฉพาะค่า hash ปิดหน้านี้แล้วดูย้อนหลังไม่ได้ ถ้าหายต้องสร้าง key ใหม่ (key เดิมจะใช้ไม่ได้ทันที)" />
      <Typography.Paragraph copyable code style={{ wordBreak: "break-all" }}>{device.apiKey}</Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
        อุปกรณ์/Gateway ส่งค่าด้วย <code>POST /api/machine-integration/ingest</code> พร้อม header <code>X-Device-Key</code> และ body{" "}
        <code>{`{"readings":[{"tagCode":"...","value":123.4,"recordedAt":"ISO-8601"}]}`}</code>
      </Typography.Paragraph>
    </Modal>
  );
}

function DeviceFormModal({ device, onClose, onCreated }: { device: MachineDevice | null; onClose: () => void; onCreated: (d: MachineDeviceWithKey) => void }) {
  const [form] = Form.useForm<{ deviceCode: string; name: string; protocol: string; equipmentId?: string; configJson?: string; remark?: string }>();
  const create = useCreateMachineDeviceMutation();
  const update = useUpdateMachineDeviceMutation();
  const lookups = useConversionLookupsQuery();
  const protocol = Form.useWatch("protocol", form) ?? device?.protocol ?? "HTTP_PUSH";
  const [error, setError] = useState<string | null>(null);

  const parseConfig = (text?: string): Record<string, unknown> | null => {
    if (!text?.trim()) return {};
    try {
      const v = JSON.parse(text);
      return v && typeof v === "object" && !Array.isArray(v) ? v : null;
    } catch {
      return null;
    }
  };

  return (
    <Modal
      open
      width={600}
      title={device ? `แก้ไขอุปกรณ์ ${device.deviceCode}` : "ลงทะเบียนอุปกรณ์"}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) => {
          const cfg = parseConfig(v.configJson);
          if (cfg === null) {
            setError("ค่าเชื่อมต่อต้องเป็น JSON object เช่น {\"endpointUrl\":\"opc.tcp://10.0.0.5:4840\"}");
            return;
          }
          setError(null);
          const onError = (e: unknown) => setError(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ");
          if (device) {
            update.mutate({ id: device.id, body: { name: v.name.trim(), protocol: v.protocol, connectionConfig: cfg, equipmentId: v.equipmentId ?? "", remark: v.remark?.trim() } }, { onSuccess: onClose, onError });
          } else {
            create.mutate(
              { deviceCode: v.deviceCode.trim(), name: v.name.trim(), protocol: v.protocol, connectionConfig: cfg, equipmentId: v.equipmentId, remark: v.remark?.trim() || undefined },
              { onSuccess: (res) => onCreated(res.data), onError },
            );
          }
        })
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          deviceCode: device?.deviceCode,
          name: device?.name,
          protocol: device?.protocol ?? "HTTP_PUSH",
          equipmentId: device?.equipmentId,
          configJson: device && Object.keys(device.connectionConfig).length ? JSON.stringify(device.connectionConfig, null, 2) : "",
          remark: device?.remark,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="deviceCode" label="รหัสอุปกรณ์" rules={[{ required: true, message: "ใส่รหัส" }]} style={{ flex: 1 }}>
            <Input maxLength={50} disabled={Boolean(device)} placeholder="เช่น REACTOR-01" />
          </Form.Item>
          <Form.Item name="name" label="ชื่ออุปกรณ์" rules={[{ required: true, message: "ใส่ชื่อ" }]} style={{ flex: 2 }}>
            <Input maxLength={255} />
          </Form.Item>
        </div>
        <Form.Item name="protocol" label="โปรโตคอล">
          <Select options={MACHINE_PROTOCOLS.map((value) => ({ value, label: MACHINE_PROTOCOL_LABEL[value] }))} />
        </Form.Item>
        {protocol !== "HTTP_PUSH" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="โปรโตคอลนี้ยังไม่มี driver ในระบบ"
            description="ลงทะเบียนและตรวจรูปแบบการเชื่อมต่อได้ แต่ระบบยังดึงค่าจากเครื่องเองไม่ได้ — ให้ Gateway/PLC ส่งค่าเข้า API แบบ HTTP Push (ใช้ API key ของอุปกรณ์นี้)"
          />
        ) : null}
        <Form.Item name="configJson" label="ค่าเชื่อมต่อ (JSON)" extra="ห้ามใส่รหัสผ่าน/โทเคน · OPC-UA: endpointUrl · Modbus: host, port, unitId · MQTT: brokerUrl, topic">
          <Input.TextArea rows={3} placeholder='{"endpointUrl":"opc.tcp://10.0.0.5:4840"}' style={{ fontFamily: "monospace" }} />
        </Form.Item>
        <Form.Item name="equipmentId" label="เครื่องจักรที่อ่านค่า (ไม่บังคับ)">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            loading={lookups.isLoading}
            options={(lookups.data?.data.equipment ?? []).map((e) => ({ value: e.id, label: `${e.equipmentCode} — ${e.name}` }))}
          />
        </Form.Item>
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        {error ? <Alert type="error" showIcon title={error} /> : null}
      </Form>
    </Modal>
  );
}

function TagFormModal({ device, tag, onClose }: { device: MachineDevice; tag: MachineTag | null; onClose: () => void }) {
  const [form] = Form.useForm<{ tagCode: string; displayName: string; unit?: string; purpose: string; sourceAddress?: string }>();
  const create = useCreateMachineTagMutation();
  const update = useUpdateMachineTagMutation();
  return (
    <Modal
      open
      title={tag ? `แก้แท็ก ${tag.tagCode}` : `เพิ่มแท็กให้ ${device.deviceCode}`}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={create.isPending || update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) => {
          const body = { displayName: v.displayName.trim(), unit: v.unit?.trim() ?? "", purpose: v.purpose, sourceAddress: v.sourceAddress?.trim() ?? "" };
          if (tag) update.mutate({ tagId: tag.id, body }, { onSuccess: onClose });
          else create.mutate({ deviceId: device.id, body: { tagCode: v.tagCode.trim(), ...body, unit: body.unit || undefined, sourceAddress: body.sourceAddress || undefined } }, { onSuccess: onClose });
        })
      }
    >
      <Form form={form} layout="vertical" initialValues={{ tagCode: tag?.tagCode, displayName: tag?.displayName, unit: tag?.unit, purpose: tag?.purpose ?? "OTHER", sourceAddress: tag?.sourceAddress }}>
        <Form.Item name="tagCode" label="รหัสแท็ก (ตรงกับที่อุปกรณ์ส่งมา)" rules={[{ required: true, message: "ใส่รหัสแท็ก" }]}>
          <Input maxLength={100} disabled={Boolean(tag)} placeholder="เช่น TEMP_REACTOR_TOP" />
        </Form.Item>
        <Form.Item name="displayName" label="ชื่อที่แสดง" rules={[{ required: true, message: "ใส่ชื่อ" }]}><Input maxLength={255} /></Form.Item>
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item name="unit" label="หน่วย" style={{ flex: 1 }}><Input maxLength={30} placeholder="°C, bar, kg/h" /></Form.Item>
          <Form.Item name="purpose" label="ใช้เพื่อ" style={{ flex: 2 }}>
            <Select options={MACHINE_TAG_PURPOSES.map((value) => ({ value, label: MACHINE_TAG_PURPOSE_LABEL[value] }))} />
          </Form.Item>
        </div>
        <Form.Item name="sourceAddress" label="ที่อยู่ในอุปกรณ์ (สำหรับ driver ในอนาคต)"><Input maxLength={255} placeholder="เช่น ns=2;s=Reactor.TempTop" /></Form.Item>
      </Form>
    </Modal>
  );
}

function ReadingsModal({ tag, onClose }: { tag: MachineTag; onClose: () => void }) {
  const query = useMachineTagReadingsQuery(tag.id);
  return (
    <Modal open title={`ค่าล่าสุดของ ${tag.displayName}`} onCancel={onClose} footer={null} width={560}>
      <Table
        rowKey="id"
        size="small"
        loading={query.isLoading}
        dataSource={query.data?.data ?? []}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        locale={{ emptyText: "ยังไม่เคยได้รับค่า" }}
        columns={[
          { title: "เวลาที่วัด", dataIndex: "recordedAt", render: fmtTime },
          { title: `ค่า${tag.unit ? ` (${tag.unit})` : ""}`, dataIndex: "value", align: "right" },
          { title: "คุณภาพ", dataIndex: "quality", width: 90, render: (v: string) => <Tag color={v === "GOOD" ? "green" : "orange"}>{v}</Tag> },
        ]}
      />
    </Modal>
  );
}

/** หน้า /production/machine-integration — ทะเบียนอุปกรณ์/แท็ก และโครงรับข้อมูลจากเครื่องจักร (M5.10) */
export default function MachineDevicesPage() {
  const query = useMachineDevicesQuery();
  const updateDevice = useUpdateMachineDeviceMutation();
  const updateTag = useUpdateMachineTagMutation();
  const rotate = useRotateMachineKeyMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("MACHINE_DEVICES");
  const [editing, setEditing] = useState<MachineDevice | "new" | null>(null);
  const [editingTag, setEditingTag] = useState<{ device: MachineDevice; tag: MachineTag | null } | null>(null);
  const [readingsOf, setReadingsOf] = useState<MachineTag | null>(null);
  const [shownKey, setShownKey] = useState<MachineDeviceWithKey | null>(null);

  const tagColumns = (device: MachineDevice): ColumnsType<MachineTag> => [
    { title: "แท็ก", key: "t", render: (_v, t) => (<div><strong>{t.displayName}</strong><div style={{ fontSize: 12, color: "#8a94a6" }}>{t.tagCode}</div></div>) },
    { title: "ใช้เพื่อ", dataIndex: "purpose", width: 170, render: (v: string) => MACHINE_TAG_PURPOSE_LABEL[v] ?? v },
    { title: "ค่าล่าสุด", key: "v", width: 190, render: (_v, t) => (t.latestValue === undefined ? "—" : <span>{t.latestValue}{t.unit ? ` ${t.unit}` : ""}<div style={{ fontSize: 12, color: "#8a94a6" }}>{fmtTime(t.latestAt)}</div></span>) },
    {
      title: "",
      key: "act",
      width: 250,
      render: (_v, t) => (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Button size="small" onClick={() => setReadingsOf(t)}>ประวัติค่า</Button>
          {canEdit ? (
            <>
              <Button size="small" onClick={() => setEditingTag({ device, tag: t })}>แก้ไข</Button>
              <Switch size="small" checked={t.isActive} onChange={(checked) => updateTag.mutate({ tagId: t.id, body: { isActive: checked } })} />
            </>
          ) : null}
        </div>
      ),
    },
  ];

  const columns: ColumnsType<MachineDevice> = [
    { title: "อุปกรณ์", key: "d", render: (_v, d) => (<div><strong>{d.deviceCode}</strong> · {d.name}<div style={{ fontSize: 12, color: "#8a94a6" }}>{d.equipmentCode ? `เครื่อง ${d.equipmentCode} · ` : ""}key {d.apiKeyPrefix}…</div></div>) },
    {
      title: "โปรโตคอล",
      key: "p",
      width: 220,
      render: (_v, d) => (
        <div>
          {MACHINE_PROTOCOL_LABEL[d.protocol] ?? d.protocol}
          {!d.driverAvailable ? <Tag style={{ marginLeft: 6 }} color="gold">ยังไม่มี driver</Tag> : null}
        </div>
      ),
    },
    { title: "แท็ก", key: "n", width: 70, align: "right", render: (_v, d) => d.tags.length },
    { title: "ส่งค่าล่าสุด", dataIndex: "lastSeenAt", width: 170, render: fmtTime },
    { title: "สถานะ", key: "s", width: 90, render: (_v, d) => <Tag color={d.isActive ? "green" : "default"}>{d.isActive ? "ใช้งาน" : "ปิด"}</Tag> },
    {
      title: "",
      key: "act",
      width: 330,
      render: (_v, d) =>
        canEdit ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button size="small" onClick={() => setEditingTag({ device: d, tag: null })}>เพิ่มแท็ก</Button>
            <Button size="small" onClick={() => setEditing(d)}>แก้ไข</Button>
            <Popconfirm
              title="สร้าง API key ใหม่?"
              description="key เดิมจะใช้ไม่ได้ทันที — ต้องนำ key ใหม่ไปตั้งที่อุปกรณ์/Gateway"
              okText="สร้างใหม่"
              cancelText="ยกเลิก"
              onConfirm={() => rotate.mutate(d.id, { onSuccess: (res) => setShownKey(res.data) })}
            >
              <Button size="small">สร้าง key ใหม่</Button>
            </Popconfirm>
            <Switch size="small" checked={d.isActive} onChange={(checked) => updateDevice.mutate({ id: d.id, body: { isActive: checked } })} />
          </div>
        ) : null,
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}><ApiOutlined /></div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>PRODUCTION · MACHINE INTEGRATION</div>
            <Typography.Title level={2} className={styles.pageTitle}>อุปกรณ์เครื่องจักร (Machine Integration)</Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              ทะเบียนอุปกรณ์และแท็ก + API รับค่าจากเครื่อง (HTTP Push) — โครงรองรับ OPC-UA / Modbus / MQTT โดยเสียบ driver ภายหลังได้
            </Typography.Text>
          </div>
          {canAdd ? <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setEditing("new")}>ลงทะเบียนอุปกรณ์</Button> : <div />}
        </div>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="สถานะโครงการ"
          description="ตอนนี้รับค่าได้จริงทาง HTTP Push เท่านั้น (Gateway/PLC ยิงเข้า API ด้วย API key ของอุปกรณ์) · OPC-UA, Modbus, MQTT ลงทะเบียนและตรวจ config ได้ แต่ยังไม่มี driver ดึงค่าเอง — รอสเปกเครื่องจริงจึงเสียบได้ · ยังไม่ได้ผูกค่ากับบันทึกการผลิตอัตโนมัติ"
        />
        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={query.data?.data ?? []}
            loading={query.isFetching}
            pagination={false}
            locale={{ emptyText: "ยังไม่มีอุปกรณ์ — กด ลงทะเบียนอุปกรณ์" }}
            scroll={{ x: 1000 }}
            expandable={{
              expandedRowRender: (d) => <Table rowKey="id" size="small" columns={tagColumns(d)} dataSource={d.tags} pagination={false} locale={{ emptyText: "ยังไม่มีแท็ก — กด เพิ่มแท็ก" }} />,
            }}
          />
        </div>
        {editing ? (
          <DeviceFormModal
            key={editing === "new" ? "new" : editing.id}
            device={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onCreated={(d) => {
              setEditing(null);
              setShownKey(d);
            }}
          />
        ) : null}
        {editingTag ? <TagFormModal key={editingTag.tag?.id ?? "new"} device={editingTag.device} tag={editingTag.tag} onClose={() => { setEditingTag(null); }} /> : null}
        {readingsOf ? <ReadingsModal tag={readingsOf} onClose={() => setReadingsOf(null)} /> : null}
        {shownKey ? <ApiKeyModal device={shownKey} onClose={() => setShownKey(null)} /> : null}
      </section>
    </MasterPageGate>
  );
}
