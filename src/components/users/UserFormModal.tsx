"use client";

import { useEffect } from "react";
import { DatePicker, Form, Input, Modal, Select, Switch } from "antd";
import dayjs from "dayjs";

import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import type { AppUser, CreateUserRequest, Role } from "@/types/users";
import styles from "@/components/masters/shared/master-page.module.css";

type UserFormValues = {
  username: string;
  displayName: string;
  employeeCode?: string;
  departmentId?: string;
  position?: string;
  hireDate?: dayjs.Dayjs;
  employmentRemark?: string;
  canLogin: boolean;
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
    values:
      | CreateUserRequest
      | (Omit<CreateUserRequest, "password" | "username"> & {
          roleIds?: string[];
        }),
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
  const canLogin = Form.useWatch("canLogin", form) ?? true;
  const departmentsQuery = useDepartmentsQuery({ isActive: true });
  const departments = departmentsQuery.data?.data ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialUser) {
      form.setFieldsValue({
        username: initialUser.username,
        displayName: initialUser.displayName,
        employeeCode: initialUser.employeeCode,
        departmentId: initialUser.departmentId,
        position: initialUser.position,
        hireDate: initialUser.hireDate
          ? dayjs(initialUser.hireDate)
          : undefined,
        employmentRemark: initialUser.employmentRemark,
        canLogin: initialUser.canLogin,
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
      employeeCode: undefined,
      departmentId: undefined,
      position: undefined,
      hireDate: undefined,
      employmentRemark: undefined,
      canLogin: true,
      email: undefined,
      phone: undefined,
      password: "",
      roleIds: [],
      isActive: true,
    });
  }, [open, mode, initialUser, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const hireDate = values.hireDate
      ? values.hireDate.format("YYYY-MM-DD")
      : undefined;

    if (mode === "create") {
      onSubmit({
        username: values.canLogin ? values.username.trim() : undefined,
        displayName: values.displayName.trim(),
        employeeCode: values.employeeCode?.trim() || undefined,
        departmentId: values.departmentId,
        position: values.position?.trim() || undefined,
        hireDate,
        employmentRemark: values.employmentRemark?.trim() || undefined,
        canLogin: values.canLogin,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        password: values.canLogin ? values.password?.trim() : undefined,
        roleIds: values.canLogin ? values.roleIds : [],
        isActive: values.isActive,
      });
      return;
    }

    onSubmit({
      displayName: values.displayName.trim(),
      employeeCode: values.employeeCode?.trim() || undefined,
      departmentId: values.departmentId,
      position: values.position?.trim() || undefined,
      hireDate,
      employmentRemark: values.employmentRemark?.trim() || undefined,
      canLogin: values.canLogin,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      roleIds: values.canLogin ? values.roleIds : [],
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
      width={680}
      centered
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalIcon}>{isCreateMode ? "+" : "✎"}</div>
        <div className={styles.modalHeaderContent}>
          <div className={styles.eyebrow}>
            {isCreateMode ? "CREATE PERSON" : "EDIT PERSON"}
          </div>
          <h2>{isCreateMode ? "เพิ่มบุคคล / ผู้ใช้งาน" : "แก้ไขบุคคล / ผู้ใช้งาน"}</h2>
          <p>
            ข้อมูล HR และบัญชี login อยู่ที่เดียวกัน — ปิด &quot;เปิด login ERP&quot;
            สำหรับพนักงานที่ไม่ใช้ระบบ
          </p>
        </div>
      </div>

      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="รหัสพนักงาน"
          name="employeeCode"
          rules={[{ max: 50 }]}
        >
          <Input placeholder="เช่น EMP-001" />
        </Form.Item>

        <Form.Item
          label="ชื่อ-นามสกุล"
          name="displayName"
          rules={[
            { required: true, message: "กรุณากรอกชื่อ-นามสกุล" },
            { max: 255 },
          ]}
        >
          <Input placeholder="ชื่อที่แสดงในระบบ" />
        </Form.Item>

        <Form.Item label="แผนก" name="departmentId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="เลือกแผนก"
            loading={departmentsQuery.isLoading}
            options={departments.map((dept) => ({
              value: dept.id,
              label: `${dept.code} — ${dept.nameTh}`,
            }))}
          />
        </Form.Item>

        <Form.Item label="ตำแหน่ง" name="position" rules={[{ max: 255 }]}>
          <Input placeholder="เช่น ช่างเทคนิค" />
        </Form.Item>

        <Form.Item label="วันที่เริ่มงาน" name="hireDate">
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item label="หมายเหตุ HR" name="employmentRemark">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>

        <Form.Item
          label="เปิด login ERP"
          name="canLogin"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {canLogin ? (
          <>
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
                listHeight={360}
                options={roles.map((role) => ({
                  value: role.id,
                  label: `${role.roleCode} — ${role.roleName}`,
                }))}
              />
            </Form.Item>
          </>
        ) : null}

        <Form.Item label="อีเมล" name="email" rules={[{ type: "email" }]}>
          <Input placeholder="email@example.com" />
        </Form.Item>

        <Form.Item label="เบอร์โทร" name="phone">
          <Input placeholder="08xxxxxxxx" />
        </Form.Item>

        <Form.Item
          label="สถานะการจ้าง/ใช้งาน"
          name="isActive"
          valuePropName="checked"
        >
          <Switch checkedChildren="ใช้งาน" unCheckedChildren="ปิด" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
