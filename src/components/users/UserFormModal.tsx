"use client";

import { useEffect } from "react";
import { Form, Input, Modal, Select, Switch } from "antd";

import type { AppUser, CreateUserRequest, Role } from "@/types/users";
import styles from "@/components/masters/shared/master-page.module.css";

type UserFormValues = {
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  password?: string;
  roleIds: string[];
  isActive: boolean;
};

type UserFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialUser?: AppUser | null;
  roles: Role[];
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (
    values: CreateUserRequest | (Omit<CreateUserRequest, "password" | "username"> & { roleIds: string[] }),
  ) => void;
};

export default function UserFormModal({
  open,
  mode,
  initialUser,
  roles,
  confirmLoading = false,
  onCancel,
  onSubmit,
}: UserFormModalProps) {
  const [form] = Form.useForm<UserFormValues>();

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialUser) {
      form.setFieldsValue({
        username: initialUser.username,
        displayName: initialUser.displayName,
        email: initialUser.email,
        phone: initialUser.phone,
        roleIds: initialUser.roles.map((role) => role.id),
        isActive: initialUser.isActive,
        password: undefined,
      });
      return;
    }

    form.setFieldsValue({
      username: "",
      displayName: "",
      email: undefined,
      phone: undefined,
      password: "",
      roleIds: [],
      isActive: true,
    });
  }, [open, mode, initialUser, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (mode === "create") {
      onSubmit({
        username: values.username.trim(),
        displayName: values.displayName.trim(),
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        password: values.password!.trim(),
        roleIds: values.roleIds,
        isActive: values.isActive,
      });
      return;
    }

    onSubmit({
      displayName: values.displayName.trim(),
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      roleIds: values.roleIds,
      isActive: values.isActive,
    });
  };

  const isCreateMode = mode === "create";

  return (
    <Modal
      className={styles.masterModal}
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={confirmLoading}
      okText={isCreateMode ? "บันทึก" : "อัปเดต"}
      cancelText="ยกเลิก"
      destroyOnHidden
      width={620}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE USER" : "EDIT USER"}
          </div>
          <h2>{isCreateMode ? "เพิ่มผู้ใช้งาน" : "แก้ไขผู้ใช้งาน"}</h2>
          <p>
            {isCreateMode
              ? "สร้างบัญชีใหม่และกำหนดบทบาทการใช้งาน"
              : "แก้ไขข้อมูลและบทบาทของผู้ใช้งาน"}
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="Username"
          name="username"
          rules={[
            { required: true, message: "กรุณากรอก username" },
            { max: 100 },
          ]}
        >
          <Input disabled={!isCreateMode} placeholder="เช่น weigh.officer" />
        </Form.Item>

        <Form.Item
          label="ชื่อที่แสดง"
          name="displayName"
          rules={[
            { required: true, message: "กรุณากรอกชื่อที่แสดง" },
            { max: 255 },
          ]}
        >
          <Input placeholder="ชื่อ-นามสกุล หรือชื่อเรียก" />
        </Form.Item>

        {isCreateMode ? (
          <Form.Item
            label="รหัสผ่าน"
            name="password"
            rules={[
              { required: true, message: "กรุณากรอกรหัสผ่าน" },
              { min: 8, message: "อย่างน้อย 8 ตัวอักษร" },
            ]}
          >
            <Input.Password placeholder="อย่างน้อย 8 ตัวอักษร" />
          </Form.Item>
        ) : null}

        <Form.Item label="อีเมล" name="email" rules={[{ type: "email" }]}>
          <Input placeholder="email@example.com" />
        </Form.Item>

        <Form.Item label="เบอร์โทร" name="phone">
          <Input placeholder="08xxxxxxxx" />
        </Form.Item>

        <Form.Item
          label="บทบาท"
          name="roleIds"
          rules={[{ required: true, message: "เลือกอย่างน้อย 1 บทบาท" }]}
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="เลือก Role"
            options={roles.map((role) => ({
              value: role.id,
              label: `${role.roleCode} — ${role.roleName}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="เปิดใช้งาน"
          name="isActive"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
