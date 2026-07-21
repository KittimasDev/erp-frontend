"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Checkbox, Empty, Select, Spin, Typography } from "antd";
import { SafetyCertificateOutlined, SaveOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useRolesQuery } from "@/hooks/users/useRolesQuery";
import { usePermissionScreensQuery } from "@/hooks/permissions/usePermissionScreensQuery";
import { useRolePermissionsQuery } from "@/hooks/permissions/useRolePermissionsQuery";
import { useUpdateRolePermissionsMutation } from "@/hooks/permissions/useUpdateRolePermissionsMutation";
import { isAdministrator } from "@/lib/auth/session";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./PermissionMatrixPage.module.css";

const FUNCTION_ORDER = [
  "VIEW",
  "ADD",
  "EDIT",
  "DELETE",
  "APPROVE",
  "EXPORT",
  "PRINT",
];

export default function PermissionMatrixPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAdministrator()) {
      router.replace("/");
    }
  }, [router, pathname]);

  const rolesQuery = useRolesQuery();
  const screensQuery = usePermissionScreensQuery();
  const roles = rolesQuery.data?.data ?? [];
  const screens = useMemo(() => screensQuery.data?.data ?? [], [screensQuery.data]);

  const [roleId, setRoleId] = useState<string | undefined>();
  const selectedRoleId = roleId ?? roles[0]?.id;
  const rolePermissionsQuery = useRolePermissionsQuery(selectedRoleId);
  const updateMutation = useUpdateRolePermissionsMutation(
    selectedRoleId ?? "",
  );

  const [allowed, setAllowed] = useState<Record<string, boolean>>({});
  const serverAssignments = rolePermissionsQuery.data?.data.assignments;
  const [syncedAssignments, setSyncedAssignments] = useState(
    serverAssignments,
  );

  if (serverAssignments !== syncedAssignments) {
    setSyncedAssignments(serverAssignments);
    const next: Record<string, boolean> = {};
    for (const item of serverAssignments ?? []) {
      next[item.permissionId] = item.isAllowed;
    }
    setAllowed(next);
  }

  const functionCodes = useMemo(() => {
    const set = new Set<string>();
    for (const screen of screens) {
      for (const fn of screen.functions) {
        set.add(fn.functionCode);
      }
    }
    return FUNCTION_ORDER.filter((code) => set.has(code));
  }, [screens]);

  const toggle = (permissionId: string) => {
    setAllowed((prev) => ({ ...prev, [permissionId]: !prev[permissionId] }));
  };

  const handleSave = () => {
    if (!selectedRoleId) {
      return;
    }
    const assignments = screens.flatMap((screen) =>
      screen.functions.map((fn) => ({
        permissionId: fn.permissionId,
        isAllowed: Boolean(allowed[fn.permissionId]),
      })),
    );
    updateMutation.mutate(assignments);
  };

  const isLoading = rolesQuery.isLoading || screensQuery.isLoading;

  return (
    <MasterPageGate isLoading={isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>
            <SafetyCertificateOutlined />
          </div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>SECURITY</div>
            <Typography.Title level={2} className={masterStyles.pageTitle}>
              Permission Matrix
            </Typography.Title>
            <Typography.Text className={masterStyles.pageSubtitle}>
              กำหนดสิทธิ์การใช้งานรายหน้าจอให้แต่ละบทบาท — การตรวจสิทธิ์จริงของระบบ
              ยังใช้ Role เดิมเหมือนเดิม
            </Typography.Text>
          </div>
          <Button
            type="primary"
            size="large"
            className={masterStyles.createButton}
            icon={<SaveOutlined />}
            loading={updateMutation.isPending}
            disabled={!selectedRoleId || screens.length === 0}
            onClick={handleSave}
          >
            บันทึกสิทธิ์
          </Button>
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ROLE</div>
              <h3>เลือกบทบาท</h3>
              <p>เลือกบทบาทที่ต้องการกำหนดสิทธิ์</p>
            </div>
          </div>
          <div className={styles.roleSelectRow}>
            <Select
              className={styles.roleSelect}
              value={selectedRoleId}
              onChange={setRoleId}
              showSearch
              optionFilterProp="label"
              placeholder="เลือกบทบาท"
              options={roles.map((role) => ({
                value: role.id,
                label: `${role.roleCode} — ${role.roleName}`,
              }))}
            />
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>MATRIX</div>
              <h3>สิทธิ์ตามหน้าจอ</h3>
              <p>ติ๊กเพื่ออนุญาต แล้วกดบันทึกสิทธิ์</p>
            </div>
            <div className={masterStyles.tableCount}>
              {screens.length} หน้าจอ
            </div>
          </div>

          {rolePermissionsQuery.isLoading ? (
            <div className={styles.loadingBox}>
              <Spin />
            </div>
          ) : screens.length === 0 ? (
            <Empty
              className={styles.emptyBox}
              description="ยังไม่มีข้อมูล Screen"
            />
          ) : (
            <div className={styles.matrixScroll}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th className={styles.screenHeaderCell}>หน้าจอ</th>
                    {functionCodes.map((code) => (
                      <th key={code} className={styles.functionHeaderCell}>
                        {code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {screens.map((screen) => {
                    const fnByCode = new Map(
                      screen.functions.map((fn) => [fn.functionCode, fn]),
                    );
                    return (
                      <tr key={screen.id}>
                        <td className={styles.screenCell}>
                          <span className={styles.screenName}>
                            {screen.screenName}
                          </span>
                          <span className={styles.screenModule}>
                            {screen.moduleCode}
                          </span>
                        </td>
                        {functionCodes.map((code) => {
                          const fn = fnByCode.get(code);
                          return (
                            <td key={code} className={styles.checkboxCell}>
                              {fn ? (
                                <Checkbox
                                  checked={Boolean(allowed[fn.permissionId])}
                                  onChange={() => toggle(fn.permissionId)}
                                />
                              ) : (
                                <span className={styles.notApplicable}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </MasterPageGate>
  );
}
