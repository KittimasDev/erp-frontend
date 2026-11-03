"use client";

import { useState } from "react";
import { App, Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import { useGlAccountsQuery } from "@/hooks/gl-accounts/useGlAccounts";
import {
  useDeleteExpenseTypeMutation,
  useExpenseTypesQuery,
  useSaveExpenseTypeMutation,
} from "@/hooks/expense-types/useExpenseTypes";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { ExpenseType } from "@/types/expense-types";

const SCREEN_CODE = "MASTERS_EXPENSE_TYPES";

type FormValues = {
  code: string;
  name: string;
  glAccountId?: string | null;
  isActive: boolean;
};

/**
 * Master ประเภทค่าใช้จ่ายเพิ่มเติมของ PO — บัญชี GL ของประเภทกำหนดบรรทัดบัญชีในสมุดรายวันซื้อ
 * (PO ที่เลือกประเภทแล้วใช้ GL จากหน้านี้เท่านั้น · PO เดิมที่ไม่เลือกยังใช้การผูก CHARGE_* ที่ผังบัญชี)
 */
export default function ExpenseTypesPage() {
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const [editing, setEditing] = useState<ExpenseType | "new" | null>(null);
  const [form] = Form.useForm<FormValues>();

  const typesQuery = useExpenseTypesQuery();
  const activeAccounts = useGlAccountsQuery({ isActive: true });
  const save = useSaveExpenseTypeMutation();
  const remove = useDeleteExpenseTypeMutation();

  const accountOptions = (activeAccounts.data ?? []).map((a) => ({
    value: a.id,
    label: `${a.code} — ${a.nameTh}`,
  }));

  const types = typesQuery.data ?? [];
  const needsAttention = types.filter((t) => t.isActive && (!t.glAccountId || !t.glAccountActive));

  const openForm = (target: ExpenseType | "new") => {
    form.setFieldsValue(
      target === "new"
        ? { code: "", name: "", glAccountId: undefined, isActive: true }
        : {
            code: target.code,
            name: target.nameTh,
            glAccountId: target.glAccountId ?? undefined,
            isActive: target.isActive,
          },
    );
    setEditing(target);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const current = editing && editing !== "new" ? editing : undefined;
    save.mutate(
      {
        id: current?.id,
        body: {
          // รหัสระบบเปลี่ยนไม่ได้ — ไม่ส่งไปให้ backend ตีกลับ
          ...(current?.isSystem ? {} : { code: values.code.trim() }),
          name: values.name.trim(),
          glAccountId: values.glAccountId ?? null,
          isActive: values.isActive,
        },
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  const columns: ColumnsType<ExpenseType> = [
    {
      title: "รหัส",
      dataIndex: "code",
      width: 150,
      render: (v: string, row) => (
        <Space size={4}>
          <Typography.Text strong>{v}</Typography.Text>
          {row.isSystem ? <Tag>ระบบ</Tag> : null}
        </Space>
      ),
    },
    { title: "ชื่อประเภท", dataIndex: "nameTh" },
    {
      title: "บัญชี GL",
      key: "gl",
      render: (_, row) => {
        if (!row.glAccountId) return <Tag color="orange">ยังไม่ผูกบัญชี</Tag>;
        return (
          <Space size={6} wrap>
            <span>
              {row.glAccountCode} — {row.glAccountName}
            </span>
            {row.glAccountActive ? null : <Tag color="red">บัญชีถูกปิดใช้งาน</Tag>}
          </Space>
        );
      },
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">ใช้งาน</Tag> : <Tag>ปิดใช้งาน</Tag>),
    },
    {
      title: "จัดการ",
      key: "action",
      width: 120,
      align: "center",
      render: (_, row) => (
        <Space>
          {perms.canEdit ? <Button size="small" icon={<EditOutlined />} onClick={() => openForm(row)} /> : null}
          {perms.canDelete && !row.isSystem ? (
            <Popconfirm
              title="ลบประเภทนี้?"
              description="ลบไม่ได้ถ้ามี PO อ้างอิงอยู่ (ให้ปิดใช้งานแทน)"
              okText="ลบ"
              cancelText="ยกเลิก"
              onConfirm={() => remove.mutate(row.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const current = editing && editing !== "new" ? editing : null;

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title="ประเภทค่าใช้จ่ายเพิ่มเติม"
        extra={
          perms.canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm("new")}>
              เพิ่มประเภท
            </Button>
          ) : null
        }
      >
        <Typography.Paragraph type="secondary">
          ใช้เลือกที่ค่าใช้จ่ายเพิ่มเติมของใบสั่งซื้อ — สมุดรายวันซื้อลงบัญชีค่าใช้จ่ายตาม GL ของประเภทที่เลือกเท่านั้น
          (ไม่ใช้บัญชีซื้อสินค้า) · ถ้า GL ยังไม่ผูกหรือถูกปิดใช้งาน ระบบจะไม่ยอมส่งออกสมุดรายวันไป Express
          · เอกสารที่ส่งออกแล้วไม่เปลี่ยนตามเมื่อแก้ GL ภายหลัง
        </Typography.Paragraph>
        {needsAttention.length > 0 ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title={`มี ${needsAttention.length} ประเภทที่ใช้งานอยู่แต่ GL ยังไม่พร้อม: ${needsAttention
              .map((t) => t.nameTh)
              .join(", ")}`}
          />
        ) : null}
        <Table
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          loading={typesQuery.isFetching}
          columns={columns}
          dataSource={types}
          pagination={false}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing === "new" ? "เพิ่มประเภทค่าใช้จ่าย" : "แก้ไขประเภทค่าใช้จ่าย"}
        okText="บันทึก"
        cancelText="ยกเลิก"
        confirmLoading={save.isPending}
        onOk={() => void handleOk().catch(() => message.warning("กรอกข้อมูลให้ครบ"))}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="รหัสประเภท"
            name="code"
            rules={[
              { required: true, message: "กรุณากรอกรหัสประเภท" },
              { max: 50, message: "รหัสต้องไม่เกิน 50 ตัวอักษร" },
              { pattern: /^[A-Za-z0-9_-]+$/, message: "ใช้ได้เฉพาะ A-Z 0-9 _ -" },
            ]}
            extra={current?.isSystem ? "รหัสระบบ เปลี่ยนไม่ได้" : "ตัวพิมพ์เล็กจะถูกแปลงเป็นพิมพ์ใหญ่"}
          >
            <Input placeholder="เช่น INSURANCE" autoComplete="off" disabled={Boolean(current?.isSystem)} />
          </Form.Item>
          <Form.Item
            label="ชื่อประเภท"
            name="name"
            rules={[
              { required: true, message: "กรุณากรอกชื่อประเภท" },
              { max: 255, message: "ชื่อต้องไม่เกิน 255 ตัวอักษร" },
            ]}
          >
            <Input placeholder="เช่น ค่าประกันภัยสินค้า" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="บัญชี GL"
            name="glAccountId"
            extra="เลือกจากบัญชีที่เปิดใช้งาน — ค้นด้วยรหัสหรือชื่อได้ · ไม่ผูก = ส่งออกสมุดรายวันไม่ได้"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ยังไม่ผูกบัญชี"
              options={accountOptions}
            />
          </Form.Item>
          <Form.Item label="ใช้งาน" name="isActive" valuePropName="checked">
            <Switch checkedChildren="เปิด" unCheckedChildren="ปิด" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
