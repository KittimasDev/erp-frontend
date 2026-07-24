"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Checkbox, Empty, Select, Spin, Typography } from "antd";
import { SafetyCertificateOutlined, SaveOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useRolesQuery } from "@/hooks/users/useRolesQuery";
import { usePermissionScreensQuery } from "@/hooks/permissions/usePermissionScreensQuery";
import { useRolePermissionsQuery } from "@/hooks/permissions/useRolePermissionsQuery";
import { useUpdateRolePermissionsMutation } from "@/hooks/permissions/useUpdateRolePermissionsMutation";
import { isAdministrator } from "@/lib/auth/session";
import type { ScreenCatalog } from "@/types/permissions";

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

/** ลำดับและชื่อแสดงกลุ่มโมดูลใน Permission Matrix */
const MODULE_SECTIONS: Array<{ code: string; label: string }> = [
  { code: "DASHBOARD", label: "แดชบอร์ด" },
  { code: "SALES", label: "ขาย" },
  { code: "PROCUREMENT", label: "จัดซื้อ" },
  { code: "RAW_TIRE", label: "รับซื้อยาง" },
  { code: "WAREHOUSE", label: "คลัง · อนุมัติงานคลัง" },
  { code: "INVENTORY", label: "คลัง · สต๊อก" },
  { code: "PRODUCTION", label: "ผลิต" },
  { code: "OIL_TANK_FARM", label: "ถังน้ำมัน" },
  { code: "LABORATORY", label: "ห้องแล็บ" },
  { code: "MAINTENANCE", label: "ซ่อมบำรุง" },
  { code: "HRM", label: "บุคคล" },
  { code: "REPORTS", label: "รายงาน" },
  { code: "MASTERS", label: "Master Data" },
  { code: "SECURITY", label: "ระบบ · ความปลอดภัย" },
];

const MODULE_LABEL_BY_CODE = Object.fromEntries(
  MODULE_SECTIONS.map((item) => [item.code, item.label]),
) as Record<string, string>;

function moduleLabel(code: string) {
  return MODULE_LABEL_BY_CODE[code] ?? code;
}

function groupScreensByModule(screens: ScreenCatalog[]) {
  const byModule = new Map<string, ScreenCatalog[]>();
  for (const screen of screens) {
    const code = screen.moduleCode?.trim() || "OTHER";
    const list = byModule.get(code) ?? [];
    list.push(screen);
    byModule.set(code, list);
  }

  const orderedCodes = [
    ...MODULE_SECTIONS.map((item) => item.code).filter((code) =>
      byModule.has(code),
    ),
    ...[...byModule.keys()]
      .filter((code) => !MODULE_LABEL_BY_CODE[code])
      .sort((a, b) => a.localeCompare(b)),
  ];

  return orderedCodes.map((code) => ({
    code,
    label: moduleLabel(code),
    screens: byModule.get(code) ?? [],
  }));
}

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
  const screens = useMemo(
    () => screensQuery.data?.data ?? [],
    [screensQuery.data],
  );

  const [roleId, setRoleId] = useState<string | undefined>();
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();
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

  const moduleGroups = useMemo(() => {
    const groups = groupScreensByModule(screens);
    if (!moduleFilter) return groups;
    return groups.filter((group) => group.code === moduleFilter);
  }, [screens, moduleFilter]);

  const visibleScreenCount = useMemo(
    () => moduleGroups.reduce((sum, group) => sum + group.screens.length, 0),
    [moduleGroups],
  );

  const moduleFilterOptions = useMemo(() => {
    const present = new Set(
      screens.map((screen) => screen.moduleCode?.trim() || "OTHER"),
    );
    return [
      ...MODULE_SECTIONS.filter((item) => present.has(item.code)).map(
        (item) => ({
          value: item.code,
          label: item.label,
        }),
      ),
      ...[...present]
        .filter((code) => !MODULE_LABEL_BY_CODE[code])
        .sort((a, b) => a.localeCompare(b))
        .map((code) => ({ value: code, label: code })),
    ];
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
              กำหนดสิทธิ์การใช้งานรายหน้าจอให้แต่ละบทบาท — จัดกลุ่มตามโมดูล
              เช่น ขาย จัดซื้อ คลัง Master
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
              <div className={masterStyles.filterEyebrow}>FILTER</div>
              <h3>เลือกบทบาทและโมดูล</h3>
              <p>กรองตามส่วนงานเพื่อดูสิทธิ์เฉพาะกลุ่ม</p>
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
            <Select
              className={styles.moduleSelect}
              allowClear
              value={moduleFilter}
              onChange={(value) => setModuleFilter(value)}
              showSearch
              optionFilterProp="label"
              placeholder="ทุกโมดูล"
              options={moduleFilterOptions}
            />
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>MATRIX</div>
              <h3>สิทธิ์ตามหน้าจอ</h3>
              <p>ติ๊กเพื่ออนุญาต แล้วกดบันทึกสิทธิ์ — จัดกลุ่มตามโมดูล</p>
            </div>
            <div className={masterStyles.tableCount}>
              {visibleScreenCount}
              {moduleFilter ? ` / ${screens.length}` : ""} หน้าจอ
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
          ) : visibleScreenCount === 0 ? (
            <Empty
              className={styles.emptyBox}
              description="ไม่พบหน้าจอในโมดูลที่เลือก"
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
                  {moduleGroups.map((group) => (
                    <Fragment key={group.code}>
                      <tr className={styles.sectionRow}>
                        <td
                          className={styles.sectionCell}
                          colSpan={functionCodes.length + 1}
                        >
                          <span className={styles.sectionLabel}>
                            {group.label}
                          </span>
                          <span className={styles.sectionMeta}>
                            {group.code} · {group.screens.length} หน้าจอ
                          </span>
                        </td>
                      </tr>
                      {group.screens.map((screen) => {
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
                                {screen.screenCode}
                              </span>
                            </td>
                            {functionCodes.map((code) => {
                              const fn = fnByCode.get(code);
                              return (
                                <td key={code} className={styles.checkboxCell}>
                                  {fn ? (
                                    <Checkbox
                                      checked={Boolean(
                                        allowed[fn.permissionId],
                                      )}
                                      onChange={() => toggle(fn.permissionId)}
                                    />
                                  ) : (
                                    <span className={styles.notApplicable}>
                                      —
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </MasterPageGate>
  );
}
