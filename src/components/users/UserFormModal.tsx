"use client";

import { useEffect } from "react";
import { DatePicker, Form, Input, InputNumber, Modal, Select, Switch } from "antd";
import dayjs from "dayjs";

import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import { usePayrollSettingsQuery } from "@/hooks/payroll/usePayroll";
import { useOtSettingsQuery } from "@/hooks/overtime/useOtSettings";
import { usePositionsQuery } from "@/hooks/positions/usePositionsQuery";
import { useSectionsQuery } from "@/hooks/sections/useSectionsQuery";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  type AppUser,
  type CreateUserRequest,
  type EmploymentType,
  type Role,
  type UpdateUserRequest,
} from "@/types/users";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MIN_MESSAGE,
  PASSWORD_PLACEHOLDER,
} from "@/lib/user/password-policy";
import styles from "@/components/masters/shared/master-page.module.css";

const DEFAULT_DAYS_PER_MONTH = 30;
const DEFAULT_HOURS_PER_DAY = 8;

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type UserFormValues = {
  username: string;
  firstName: string;
  lastName?: string;
  employeeCode?: string;
  departmentId?: string;
  sectionId?: string;
  supervisorId?: string;
  positionId?: string;
  employmentType?: EmploymentType;
  hireDate?: dayjs.Dayjs;
  employmentRemark?: string;
  basePay?: number | null;
  socialSecurityEnabled: boolean;
  providentFundRatePercent: number;
  taxEnabled: boolean;
  taxExtraAllowance: number;
  nationalId?: string;
  address?: string;
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
  onSubmit: (values: CreateUserRequest | UpdateUserRequest) => void;
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
  const positionsQuery = usePositionsQuery();
  const positions = positionsQuery.data?.data ?? [];
  const departmentId = Form.useWatch("departmentId", form);
  const sectionsQuery = useSectionsQuery();
  const sections = sectionsQuery.data?.data ?? [];
  // หัวหน้างาน: เลือกจากพนักงานที่ใช้งานอยู่ (ไม่รวมตัวเอง) — backend ตรวจสายวนเป็นวงกลมอีกชั้น
  const supervisorsQuery = useUsersQuery({ isActive: true });
  const supervisorUsers = supervisorsQuery.data?.data?.items ?? [];
  const otSettingsQuery = useOtSettingsQuery(open);
  // ตัวเลือก % กองทุนมาจากตั้งค่าเงินเดือน — ผู้ใช้ที่ไม่มีสิทธิ์เห็นหน้าเงินเดือนจะได้ชุดเริ่มต้น
  const payrollSettingsQuery = usePayrollSettingsQuery(open);
  const fundOptions = (
    payrollSettingsQuery.data?.data?.providentFundOptions ?? [0, 3, 5, 7, 10, 15]
  ).map((n) => ({ value: n, label: n === 0 ? "ไม่เข้ากองทุน" : `${n}%` }));
  const employmentType = Form.useWatch("employmentType", form);
  const basePay = Form.useWatch("basePay", form);
  const isDaily = employmentType === "DAILY";
  const daysPerMonth = otSettingsQuery.data?.data?.daysPerMonth ?? DEFAULT_DAYS_PER_MONTH;
  const hoursPerDay = otSettingsQuery.data?.data?.hoursPerDay ?? DEFAULT_HOURS_PER_DAY;
  const hourlyRate =
    typeof basePay === "number" && basePay > 0
      ? (isDaily ? basePay : basePay / daysPerMonth) / hoursPerDay
      : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === "edit" && initialUser) {
      form.setFieldsValue({
        username: initialUser.username,
        // บัญชีเก่าที่ยังไม่มี first_name → ใช้ชื่อที่แสดงเดิมเป็นชื่อ (ไม่แยกเดาให้)
        firstName: initialUser.firstName || initialUser.displayName,
        lastName: initialUser.lastName,
        employeeCode: initialUser.employeeCode,
        departmentId: initialUser.departmentId,
        sectionId: initialUser.sectionId,
        supervisorId: initialUser.supervisorId,
        positionId: initialUser.positionId,
        employmentType: initialUser.employmentType,
        hireDate: initialUser.hireDate
          ? dayjs(initialUser.hireDate)
          : undefined,
        employmentRemark: initialUser.employmentRemark,
        basePay: initialUser.basePay ?? null,
        socialSecurityEnabled: initialUser.socialSecurityEnabled !== false,
        providentFundRatePercent: initialUser.providentFundRatePercent ?? 0,
        taxEnabled: initialUser.taxEnabled !== false,
        taxExtraAllowance: initialUser.taxExtraAllowance ?? 0,
        nationalId: initialUser.nationalId ?? undefined,
        address: initialUser.address ?? undefined,
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
      firstName: "",
      lastName: undefined,
      employeeCode: undefined,
      departmentId: undefined,
      sectionId: undefined,
      supervisorId: undefined,
      positionId: undefined,
      employmentType: undefined,
      hireDate: undefined,
      employmentRemark: undefined,
      basePay: null,
      socialSecurityEnabled: true,
      providentFundRatePercent: 0,
      taxEnabled: true,
      taxExtraAllowance: 0,
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
        firstName: values.firstName.trim(),
        lastName: values.lastName?.trim() || undefined,
        employeeCode: values.employeeCode?.trim() || undefined,
        departmentId: values.departmentId,
        sectionId: values.sectionId,
        supervisorId: values.supervisorId,
        positionId: values.positionId,
        employmentType: values.employmentType,
        hireDate,
        employmentRemark: values.employmentRemark?.trim() || undefined,
        basePay: values.basePay ?? undefined,
        socialSecurityEnabled: values.socialSecurityEnabled,
        providentFundRatePercent: values.providentFundRatePercent ?? 0,
        taxEnabled: values.taxEnabled,
        taxExtraAllowance: values.taxExtraAllowance ?? 0,
        nationalId: values.nationalId?.trim() ?? "",
        address: values.address?.trim() ?? "",
        canLogin: values.canLogin,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        password: values.canLogin ? values.password : undefined,
        roleIds: values.canLogin ? values.roleIds : [],
        isActive: values.isActive,
      });
      return;
    }

    onSubmit({
      username: values.canLogin ? values.username.trim() : undefined,
      firstName: values.firstName.trim(),
      // ส่งสตริงว่างเมื่อเคลียร์ช่อง — undefined จะถูกมองว่า "ไม่แก้"
      lastName: values.lastName?.trim() ?? "",
      employeeCode: values.employeeCode?.trim() || undefined,
      departmentId: values.departmentId,
      // เคลียร์ช่อง = null · ถ้าไม่เคยตั้งมาก่อนแล้วปล่อยว่างให้ไม่ส่ง (undefined = ไม่แก้)
      sectionId: values.sectionId ?? (initialUser?.sectionId ? null : undefined),
      supervisorId:
        values.supervisorId ?? (initialUser?.supervisorId ? null : undefined),
      // เคลียร์ช่อง = null · แต่ถ้าคนนี้ไม่เคยผูก master (ยังมีแค่ตำแหน่งแบบข้อความเดิม) ห้ามส่ง null — จะลบตำแหน่งเดิมทิ้ง
      positionId: values.positionId ?? (initialUser?.positionId ? null : undefined),
      employmentType: values.employmentType,
      hireDate,
      employmentRemark: values.employmentRemark?.trim() || undefined,
      // เคลียร์ช่อง = null · ถ้าไม่เคยตั้งมาก่อนแล้วปล่อยว่างให้ไม่ส่ง
      basePay: values.basePay ?? (initialUser?.basePay != null ? null : undefined),
      socialSecurityEnabled: values.socialSecurityEnabled,
        providentFundRatePercent: values.providentFundRatePercent ?? 0,
        taxEnabled: values.taxEnabled,
        taxExtraAllowance: values.taxExtraAllowance ?? 0,
        nationalId: values.nationalId?.trim() ?? "",
        address: values.address?.trim() ?? "",
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

      <Form form={form} layout="vertical" requiredMark={false} className={styles.form}>
        <Form.Item
          label="รหัสพนักงาน"
          name="employeeCode"
          rules={[{ max: 50 }]}
        >
          <Input placeholder="เช่น EMP-001" />
        </Form.Item>

        <Form.Item
          label="ชื่อ"
          name="firstName"
          rules={[
            { required: true, message: "กรุณากรอกชื่อ" },
            { max: 100 },
          ]}
        >
          <Input placeholder="เช่น สมชาย" />
        </Form.Item>

        <Form.Item label="นามสกุล" name="lastName" rules={[{ max: 100 }]}>
          <Input placeholder="เช่น ใจดี" />
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
            onChange={() => form.setFieldValue("sectionId", undefined)}
          />
        </Form.Item>

        <Form.Item label="แผนกย่อย" name="sectionId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={departmentId ? "เลือกแผนกย่อย" : "เลือกแผนกก่อน"}
            disabled={!departmentId}
            loading={sectionsQuery.isLoading}
            options={sections
              .filter(
                (item) =>
                  item.departmentId === departmentId &&
                  (item.isActive || item.id === initialUser?.sectionId),
              )
              .map((item) => ({
                value: item.id,
                label: item.isActive ? item.nameTh : `${item.nameTh} (ปิดใช้งาน)`,
              }))}
          />
        </Form.Item>

        <Form.Item label="หัวหน้างาน" name="supervisorId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="เลือกหัวหน้างานโดยตรง"
            loading={supervisorsQuery.isLoading}
            options={supervisorUsers
              .filter((item) => item.id !== initialUser?.id)
              .map((item) => ({
                value: item.id,
                label: item.employeeCode
                  ? `${item.employeeCode} — ${item.displayName}`
                  : item.displayName,
              }))}
          />
        </Form.Item>

        <Form.Item label="ตำแหน่ง" name="positionId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="เลือกตำแหน่ง (จัดการได้ที่แท็บ ตำแหน่ง)"
            loading={positionsQuery.isLoading}
            options={positions
              .filter((item) => item.isActive || item.id === initialUser?.positionId)
              .map((item) => ({
                value: item.id,
                label: item.isActive ? item.nameTh : `${item.nameTh} (ปิดใช้งาน)`,
              }))}
          />
        </Form.Item>

        <Form.Item label="ประเภทการจ้าง" name="employmentType">
          <Select
            allowClear
            placeholder="เลือกประเภทการจ้าง"
            options={EMPLOYMENT_TYPE_OPTIONS}
          />
        </Form.Item>

        <Form.Item label="วันที่เริ่มงาน" name="hireDate">
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          label={isDaily ? "ค่าแรงรายวัน (บาท)" : "เงินเดือน (บาท)"}
          name="basePay"
          extra="ใช้คำนวณเงิน OT และเงินเดือน · คำขอ OT ที่อนุมัติไปแล้วไม่ถูกคำนวณใหม่"
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            max={99999999}
            precision={2}
            placeholder={isDaily ? "กรอกค่าแรงรายวัน" : "กรอกเงินเดือน"}
          />
        </Form.Item>

        <Form.Item
          label="ค่าแรง/ชม. (บาท)"
          extra={
            isDaily
              ? `ค่าแรงรายวัน ÷ ${hoursPerDay} ชม.`
              : `เงินเดือน ÷ ${daysPerMonth} วัน ÷ ${hoursPerDay} ชม.`
          }
        >
          <Input value={hourlyRate === null ? "—" : money(hourlyRate)} disabled />
        </Form.Item>

        <Form.Item
          label="ประกันสังคม"
          name="socialSecurityEnabled"
          valuePropName="checked"
        >
          <Switch checkedChildren="มี" unCheckedChildren="ไม่มี" />
        </Form.Item>

        <Form.Item
          label="กองทุน (หัก % ของเงินเดือน)"
          name="providentFundRatePercent"
          extra="กองทุนสำรองเลี้ยงชีพ — หักจากเงินเดือนพนักงาน นายจ้างสมทบตามตั้งค่าในหน้าเงินเดือน และนำไปลดหย่อนภาษีได้"
        >
          <Select options={fundOptions} />
        </Form.Item>

        <Form.Item
          label="หักภาษี ณ ที่จ่าย"
          name="taxEnabled"
          valuePropName="checked"
        >
          <Switch checkedChildren="หัก" unCheckedChildren="ไม่หัก" />
        </Form.Item>

        <Form.Item
          label="เลขประจำตัวประชาชน (13 หลัก)"
          name="nationalId"
          rules={[{ pattern: /^\d{13}$/, message: "ต้องเป็นตัวเลข 13 หลัก" }]}
          extra="ใช้ออกหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)"
        >
          <Input maxLength={13} inputMode="numeric" placeholder="เช่น 1234567890123" />
        </Form.Item>

        <Form.Item label="ที่อยู่ (สำหรับ 50 ทวิ)" name="address">
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>

        <Form.Item
          label="ลดหย่อนภาษีเพิ่มเติม/ปี (บาท)"
          name="taxExtraAllowance"
          extra="เช่น คู่สมรส บุตร เบี้ยประกันชีวิต — รวมกันเป็นยอดต่อปี (ลดหย่อนส่วนตัว 60,000 ระบบใส่ให้แล้ว)"
        >
          <InputNumber style={{ width: "100%" }} min={0} max={99999999} precision={2} />
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
              <Input placeholder="เช่น weigh.officer" />
            </Form.Item>

            {isCreateMode ? (
              <Form.Item
                label="รหัสผ่าน"
                name="password"
                rules={[
                  { required: true, message: "กรุณากรอกรหัสผ่าน" },
                  { min: PASSWORD_MIN_LENGTH, message: PASSWORD_MIN_MESSAGE },
                ]}
              >
                <Input.Password placeholder={PASSWORD_PLACEHOLDER} />
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
