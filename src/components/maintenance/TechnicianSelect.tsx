"use client";

import { useMemo, useState } from "react";
import { Select } from "antd";

import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";

type Props = {
  value?: string | string[];
  onChange?: (value: never) => void;
  mode?: "multiple";
  placeholder?: string;
  /** แผนกที่กรองไว้ตั้งต้น (เช่น ซ่อมบำรุง) */
  style?: React.CSSProperties;
};

/**
 * เลือกช่างจากพนักงานในระบบ — กรองตามแผนกได้ (ช่างซ่อมบำรุง = พนักงานที่ใช้งานอยู่ในแผนก/ตำแหน่งซ่อมบำรุง)
 * ไม่มี master ช่างแยก (ตกลงกับผู้ใช้)
 */
export default function TechnicianSelect({ value, onChange, mode, placeholder = "เลือกช่าง", style }: Props) {
  const [departmentId, setDepartmentId] = useState<string>();
  const departmentsQuery = useDepartmentsQuery({ isActive: true });
  const usersQuery = useUsersQuery({ limit: 200, isActive: true, departmentId });

  const options = useMemo(
    () =>
      (usersQuery.data?.data.items ?? []).map((u) => ({
        value: u.id,
        label: `${u.displayName}${u.employeeCode ? ` (${u.employeeCode})` : ""}${u.position ? ` · ${u.position}` : ""}`,
      })),
    [usersQuery.data],
  );

  return (
    <div style={{ display: "flex", gap: 8, ...style }}>
      <Select
        allowClear
        placeholder="ทุกแผนก"
        style={{ width: 150 }}
        value={departmentId}
        onChange={setDepartmentId}
        options={(departmentsQuery.data?.data ?? []).map((d) => ({ value: d.id, label: d.nameTh }))}
      />
      <Select
        showSearch
        allowClear
        optionFilterProp="label"
        mode={mode}
        style={{ flex: 1, minWidth: 200 }}
        placeholder={placeholder}
        loading={usersQuery.isLoading}
        value={value}
        onChange={onChange as never}
        options={options}
      />
    </div>
  );
}
