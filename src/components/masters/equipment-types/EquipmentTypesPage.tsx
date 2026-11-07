"use client";
import { useT } from "@/lib/i18n/useT";

import { useState } from "react";
import { App, Button, Card, Form, Input, Modal, Popconfirm, Space, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import {
  useDeleteEquipmentTypeMutation,
  useEquipmentTypesQuery,
  useSaveEquipmentTypeMutation,
} from "@/hooks/equipment-types/useEquipmentTypes";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { EquipmentType } from "@/types/equipment-types";
import PageHeader from "@/components/common/PageHeader";

const SCREEN_CODE = "MASTERS_EQUIPMENT_TYPES";

type FormValues = { code: string; name: string; isActive: boolean };

/**
 * Master ประเภทเครื่องจักร — Equipment เลือกประเภทจากหน้านี้ และ MO สลับเครื่องที่สูตรกำหนดได้เฉพาะเครื่องประเภทเดียวกัน
 * (ประเภทเดิมที่เป็นข้อความอิสระใน Equipment ถูกย้ายมาเป็นรายการในหน้านี้อัตโนมัติ)
 */
export default function EquipmentTypesPage() {
  const t = useT();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const [editing, setEditing] = useState<EquipmentType | "new" | null>(null);
  const [form] = Form.useForm<FormValues>();

  const typesQuery = useEquipmentTypesQuery();
  const save = useSaveEquipmentTypeMutation();
  const remove = useDeleteEquipmentTypeMutation();

  const openForm = (target: EquipmentType | "new") => {
    form.setFieldsValue(
      target === "new"
        ? { code: "", name: "", isActive: true }
        : { code: target.code, name: target.nameTh, isActive: target.isActive },
    );
    setEditing(target);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const current = editing && editing !== "new" ? editing : undefined;
    save.mutate(
      {
        id: current?.id,
        body: { code: values.code.trim(), name: values.name.trim(), isActive: values.isActive },
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  const columns: ColumnsType<EquipmentType> = [
    {
      title: t("รหัส"),
      dataIndex: "code",
      width: 180,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: t("ชื่อประเภท"), dataIndex: "nameTh" },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      width: 110,
      render: (v: boolean) => (v ? <Tag color="green">{t("ใช้งาน")}</Tag> : <Tag>{t("ปิดใช้งาน")}</Tag>),
    },
    {
      title: t("จัดการ"),
      key: "action",
      width: 120,
      align: "center",
      render: (_, row) => (
        <Space>
          {perms.canEdit ? <Button size="small" icon={<EditOutlined />} onClick={() => openForm(row)} /> : null}
          {perms.canDelete ? (
            <Popconfirm
              title={t("ลบประเภทนี้?")}
              description={t("ลบไม่ได้ถ้ามีเครื่องจักรใช้ประเภทนี้อยู่ (ให้ปิดใช้งานแทน)")}
              okText={t("ลบ")}
              cancelText={t("ยกเลิก")}
              onConfirm={() => remove.mutate(row.id)}
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
      <PageHeader
        title={t("ประเภทเครื่องจักร")}
        actions={
          perms.canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm("new")}>
              {t("เพิ่มประเภท")}
            </Button>
          ) : null
        }
      />

      <Card>
        <Typography.Paragraph type="secondary">
          {t("ใช้จัดกลุ่มเครื่องจักรที่หน้า Equipment — ในใบสั่งผลิต (MO) สลับเครื่องที่สูตรกำหนดเป็นเครื่องอื่นได้เฉพาะ เครื่องที่เป็นประเภทเดียวกัน · ประเภทที่ปิดใช้งานเลือกกับเครื่องจักรใหม่ไม่ได้")}
        </Typography.Paragraph>
        <Table
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          loading={typesQuery.isFetching}
          columns={columns}
          dataSource={typesQuery.data ?? []}
          pagination={false}
        />
      </Card>

      <Modal
        open={editing !== null}
        title={editing === "new" ? t("เพิ่มประเภทเครื่องจักร") : t("แก้ไขประเภทเครื่องจักร")}
        okText={t("บันทึก")}
        cancelText={t("ยกเลิก")}
        confirmLoading={save.isPending}
        onOk={() => void handleOk().catch(() => message.warning(t("กรอกข้อมูลให้ครบ")))}
        onCancel={() => setEditing(null)}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label={t("รหัสประเภท")}
            name="code"
            rules={[
              { required: true, message: t("กรุณากรอกรหัสประเภท") },
              { max: 50, message: t("รหัสต้องไม่เกิน 50 ตัวอักษร") },
              { pattern: /^[A-Za-z0-9_-]+$/, message: t("ใช้ได้เฉพาะ A-Z 0-9 _ -") },
            ]}
            extra={t("ตัวพิมพ์เล็กจะถูกแปลงเป็นพิมพ์ใหญ่ · เปลี่ยนรหัสไม่ได้เมื่อมีเครื่องจักรใช้แล้ว")}
          >
            <Input placeholder={t("เช่น EXTRUDER")} autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={t("ชื่อประเภท")}
            name="name"
            rules={[
              { required: true, message: t("กรุณากรอกชื่อประเภท") },
              { max: 255, message: t("ชื่อต้องไม่เกิน 255 ตัวอักษร") },
            ]}
          >
            <Input placeholder={t("เช่น เครื่องอัดรีด")} autoComplete="off" />
          </Form.Item>
          <Form.Item label={t("ใช้งาน")} name="isActive" valuePropName="checked">
            <Switch checkedChildren={t("เปิด")} unCheckedChildren={t("ปิด")} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
