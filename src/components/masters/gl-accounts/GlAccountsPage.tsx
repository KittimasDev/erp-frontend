"use client";

import { useState } from "react";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import {
  useAccountSettingsQuery,
  useDeleteGlAccountMutation,
  useGlAccountsQuery,
  useSaveAccountSettingsMutation,
  useSaveGlAccountMutation,
} from "@/hooks/gl-accounts/useGlAccounts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { GlAccount } from "@/types/gl-accounts";

const SCREEN_CODE = "MASTERS_GL_ACCOUNTS";

type FormValues = { code: string; name: string; isActive: boolean };

/**
 * ผังบัญชีย่อ + การผูกบัญชีหลักของสมุดรายวันซื้อ
 * รหัสบัญชีต้องตรงกับ Express — สมุดรายวันซื้อใช้บัญชีเหล่านี้สร้างบรรทัดเดบิต/เครดิตและไฟล์ส่งออก
 */
export default function GlAccountsPage() {
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<GlAccount | "new" | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [draft, setDraft] = useState<Record<string, string | null>>({});

  const accountsQuery = useGlAccountsQuery({ search: keyword || undefined });
  const activeAccounts = useGlAccountsQuery({ isActive: true });
  const settingsQuery = useAccountSettingsQuery();
  const saveAccount = useSaveGlAccountMutation();
  const deleteAccount = useDeleteGlAccountMutation();
  const saveSettings = useSaveAccountSettingsMutation();

  const accountOptions = (activeAccounts.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.code} — ${a.nameTh}`,
  }));

  const settings = settingsQuery.data ?? [];
  const valueOf = (key: string, saved: string | null) => (key in draft ? draft[key] : saved);
  const dirty = Object.keys(draft).length > 0;

  const handleSaveSettings = () => {
    const payload = settings.map((s) => ({
      settingKey: s.settingKey,
      glAccountId: valueOf(s.settingKey, s.glAccountId),
    }));
    saveSettings.mutate(payload, { onSuccess: () => setDraft({}) });
  };

  const openForm = (target: GlAccount | "new") => {
    form.setFieldsValue(
      target === "new"
        ? { code: "", name: "", isActive: true }
        : { code: target.code, name: target.nameTh, isActive: target.isActive },
    );
    setEditing(target);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const id = editing && editing !== "new" ? editing.id : undefined;
    saveAccount.mutate(
      { id, body: { code: values.code.trim(), name: values.name.trim(), isActive: values.isActive } },
      { onSuccess: () => setEditing(null) },
    );
  };

  const columns: ColumnsType<GlAccount> = [
    { title: "รหัสบัญชี", dataIndex: "code", width: 160, render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
    { title: "ชื่อบัญชี", dataIndex: "nameTh" },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">ใช้งาน</Tag> : <Tag>ปิดใช้งาน</Tag>),
    },
    {
      title: "จัดการ",
      key: "action",
      width: 140,
      align: "center",
      render: (_, row) => (
        <Space>
          {perms.canEdit ? <Button size="small" icon={<EditOutlined />} onClick={() => openForm(row)} /> : null}
          {perms.canDelete ? (
            <Popconfirm
              title="ลบบัญชีนี้?"
              description="ลบไม่ได้ถ้าถูกผูกอยู่กับการตั้งค่าหรือหมวดสินค้า"
              okText="ลบ"
              cancelText="ยกเลิก"
              onConfirm={() => deleteAccount.mutate(row.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title="การผูกบัญชีหลักของสมุดรายวันซื้อ"
        extra={
          perms.canEdit ? (
            <Button type="primary" disabled={!dirty} loading={saveSettings.isPending} onClick={handleSaveSettings}>
              บันทึกการผูกบัญชี
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph type="secondary">
          ใช้สร้างบรรทัดเดบิต/เครดิตและไฟล์ส่งออก Express — บัญชีซื้อของหมวดสินค้าแต่ละหมวดตั้งได้ที่หน้าหมวดหมู่สินค้า
          (ไม่ตั้ง = ใช้บัญชีซื้อสินค้าค่าเริ่มต้น) ถ้าบัญชีหลักยังไม่ผูก ระบบจะไม่ยอมส่งออกไป Express
        </Typography.Paragraph>
        <Form layout="vertical" style={{ maxWidth: 560 }}>
          {settings.map((s) => (
            <Form.Item key={s.settingKey} label={s.label}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="ยังไม่ผูกบัญชี"
                disabled={!perms.canEdit}
                value={valueOf(s.settingKey, s.glAccountId) ?? undefined}
                options={accountOptions}
                onChange={(value) => setDraft((prev) => ({ ...prev, [s.settingKey]: value ?? null }))}
              />
            </Form.Item>
          ))}
        </Form>
      </Card>

      <Card
        title="ผังบัญชี"
        extra={
          perms.canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm("new")}>
              เพิ่มบัญชี
            </Button>
          ) : null
        }
      >
        <Input.Search
          allowClear
          placeholder="ค้นรหัสหรือชื่อบัญชี"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={(value) => setKeyword(value.trim())}
          style={{ width: 300, marginBottom: 12 }}
        />
        <Table
          rowKey="id"
          size="middle"
          loading={accountsQuery.isFetching}
          columns={columns}
          dataSource={accountsQuery.data ?? []}
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing === "new" ? "เพิ่มบัญชี" : "แก้ไขบัญชี"}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={saveAccount.isPending}
        onOk={() => void handleOk().catch(() => message.warning("กรอกข้อมูลให้ครบ"))}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="รหัสบัญชี"
            name="code"
            rules={[
              { required: true, message: "กรุณากรอกรหัสบัญชี" },
              { max: 30, message: "รหัสต้องไม่เกิน 30 ตัวอักษร" },
            ]}
            extra="ต้องตรงกับรหัสในโปรแกรมบัญชี Express"
          >
            <Input placeholder="เช่น 51111.01" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="ชื่อบัญชี"
            name="name"
            rules={[
              { required: true, message: "กรุณากรอกชื่อบัญชี" },
              { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
            ]}
          >
            <Input placeholder="เช่น ซื้อสินค้า" autoComplete="off" />
          </Form.Item>
          <Form.Item label="ใช้งาน" name="isActive" valuePropName="checked">
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
