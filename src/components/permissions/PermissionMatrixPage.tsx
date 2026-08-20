"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Checkbox,
  Empty,
  Popconfirm,
  Select,
  Spin,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useRolesQuery } from "@/hooks/users/useRolesQuery";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
} from "@/hooks/users/useRoleMutations";
import { usePermissionScreensQuery } from "@/hooks/permissions/usePermissionScreensQuery";
import { useRolePermissionsQuery } from "@/hooks/permissions/useRolePermissionsQuery";
import { useUpdateRolePermissionsMutation } from "@/hooks/permissions/useUpdateRolePermissionsMutation";
import { isAdministrator } from "@/lib/auth/session";
import type { ScreenCatalog } from "@/types/permissions";

import RoleFormModal from "./RoleFormModal";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./PermissionMatrixPage.module.css";

const FUNCTION_ORDER = [
  "VIEW",
  "VIEW_ALL",
  "ADD",
  "EDIT",
  "DELETE",
  "APPROVE",
  "EXPORT",
  "PRINT",
];

/** ลำดับและชื่อแสดงกลุ่มโมดูลใน Permission Matrix — ตรงกลุ่ม sidebar */
const MODULE_SECTIONS: Array<{ code: string; label: string }> = [
  { code: "DASHBOARD", label: "แดชบอร์ด" },
  { code: "RAW_TIRE", label: "รับซื้อยาง" },
  { code: "INVENTORY", label: "คลังวัตถุดิบ" },
  { code: "PRODUCTION", label: "ผลิต" },
  { code: "WAREHOUSE", label: "คลังสินค้าสำเร็จรูป" },
  { code: "PROCUREMENT", label: "จัดซื้อ · จ่ายเงิน" },
  { code: "SALES", label: "ขาย" },
  { code: "LABORATORY", label: "ห้องแล็บ" },
  { code: "OIL_TANK_FARM", label: "ถังน้ำมัน" },
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

type PermissionMatrixPageProps = {
  embedded?: boolean;
  fromRoles?: boolean;
};

export default function PermissionMatrixPage({
  embedded = false,
  fromRoles = false,
}: PermissionMatrixPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lockedRoleId = searchParams.get("roleId");
  const roleLocked = fromRoles || Boolean(lockedRoleId);

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

  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const selectedRoleId = lockedRoleId ?? roles[0]?.id;
  const rolePermissionsQuery = useRolePermissionsQuery(selectedRoleId);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const updateMutation = useUpdateRolePermissionsMutation(
    selectedRoleId ?? "",
    selectedRole
      ? { roleCode: selectedRole.roleCode, roleName: selectedRole.roleName }
      : undefined,
  );
  const createRoleMutation = useCreateRoleMutation();
  const deleteRoleMutation = useDeleteRoleMutation();

  const [allowed, setAllowed] = useState<Record<string, boolean>>({});
  const serverAssignments = rolePermissionsQuery.data?.data.assignments;

  /**
   * sync ค่าที่ติ๊กจาก server → state ตอน render
   *
   * ต้องเก็บ roleId คู่กับ assignments แล้วเริ่มจาก `{}` เสมอ — ห้าม init ด้วย
   * `serverAssignments` เพราะถ้า mount ใหม่ตอน TanStack Query ยัง cache อยู่
   * (staleTime 30s) render แรกจะได้ array ก้อนเดิมมาทันที ทำให้ค่าเริ่มต้น
   * เท่ากับค่าที่จะเทียบ → เงื่อนไขไม่เข้า → ตารางขึ้นครบแต่ไม่มีติ๊กเลย
   */
  const [syncedFrom, setSyncedFrom] = useState<{
    roleId?: string;
    assignments?: typeof serverAssignments;
  }>({});

  if (
    syncedFrom.roleId !== selectedRoleId ||
    syncedFrom.assignments !== serverAssignments
  ) {
    setSyncedFrom({ roleId: selectedRoleId, assignments: serverAssignments });
    const next: Record<string, boolean> = {};
    for (const item of serverAssignments ?? []) {
      next[item.permissionId] = item.isAllowed;
    }
    setAllowed(next);
  }

  const goBackToRoles = () => {
    router.replace("/users?tab=roles");
  };

  /** แสดงคอลัมน์ครบทุก action รวม APPROVE — หน้าจอที่ไม่มีสิทธิ์นี้จะเป็น — */
  const functionCodes = FUNCTION_ORDER;

  const moduleGroups = useMemo(() => {
    const groups = groupScreensByModule(screens);
    if (moduleFilter.length === 0) return groups;
    return groups.filter((group) => moduleFilter.includes(group.code));
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

  const setPermissionsAllowed = (
    permissionIds: string[],
    value: boolean,
  ) => {
    if (permissionIds.length === 0) {
      return;
    }
    setAllowed((prev) => {
      const next = { ...prev };
      for (const id of permissionIds) {
        next[id] = value;
      }
      return next;
    });
  };

  const permissionIdsForScreens = (groupScreens: ScreenCatalog[]) =>
    groupScreens.flatMap((screen) =>
      screen.functions
        .map((fn) => fn.permissionId)
        .filter((id): id is string => Boolean(id)),
    );

  const permissionIdsForFunction = (
    groupScreens: ScreenCatalog[],
    functionCode: string,
  ) =>
    groupScreens
      .map(
        (screen) =>
          screen.functions.find((fn) => fn.functionCode === functionCode)
            ?.permissionId,
      )
      .filter((id): id is string => Boolean(id));

  const visibleScreens = useMemo(
    () => moduleGroups.flatMap((group) => group.screens),
    [moduleGroups],
  );

  const setScreenAllowed = (screen: ScreenCatalog, value: boolean) => {
    setPermissionsAllowed(
      screen.functions
        .map((fn) => fn.permissionId)
        .filter((id): id is string => Boolean(id)),
      value,
    );
  };

  const screenAllState = (screen: ScreenCatalog) => {
    const ids = screen.functions
      .map((fn) => fn.permissionId)
      .filter((id): id is string => Boolean(id));
    if (ids.length === 0) {
      return { checked: false, indeterminate: false };
    }
    const allowedCount = ids.filter((id) => allowed[id]).length;
    return {
      checked: allowedCount === ids.length,
      indeterminate: allowedCount > 0 && allowedCount < ids.length,
    };
  };

  const columnAllState = (functionCode: string) => {
    const ids = permissionIdsForFunction(visibleScreens, functionCode);
    if (ids.length === 0) {
      return { checked: false, indeterminate: false, disabled: true };
    }
    const allowedCount = ids.filter((id) => allowed[id]).length;
    return {
      checked: allowedCount === ids.length,
      indeterminate: allowedCount > 0 && allowedCount < ids.length,
      disabled: false,
    };
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

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    deleteRoleMutation.mutate(selectedRole.id, {
      onSuccess: () => {
        goBackToRoles();
      },
    });
  };

  const isLoading = rolesQuery.isLoading || screensQuery.isLoading;

  const headerActions = (
    <div className={styles.headerActions}>
      {fromRoles ? (
        <Button size="large" icon={<ArrowLeftOutlined />} onClick={goBackToRoles}>
          กลับไปบทบาท
        </Button>
      ) : null}
      <Button
        size="large"
        icon={<PlusOutlined />}
        onClick={() => setRoleModalOpen(true)}
      >
        สร้างบทบาทใหม่
      </Button>
      <Button
        type="primary"
        size="large"
        className={masterStyles.createButton}
        icon={<SaveOutlined />}
        loading={updateMutation.isPending}
        /**
         * กันเคสร้ายแรง — บันทึกคือ "เขียนทับทั้งชุด" ถ้ากดตอนสิทธิ์เดิมยังโหลดไม่เสร็จ
         * หรือโหลดพลาด จะส่ง isAllowed=false ทั้งหมด = ล้างสิทธิ์ของบทบาทนั้นทิ้ง
         */
        disabled={
          !selectedRoleId ||
          screens.length === 0 ||
          !rolePermissionsQuery.isSuccess
        }
        onClick={handleSave}
      >
        บันทึกสิทธิ์
      </Button>
    </div>
  );

  return (
    <MasterPageGate isLoading={!embedded && isLoading}>
      <section className={masterStyles.page}>
        {!embedded ? (
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
                กำหนดสิทธิ์รายหน้าจอต่อบทบาท — คอลัมน์ APPROVE
                ใช้จำกัดเฉพาะ role ที่อนุมัติได้
              </Typography.Text>
            </div>
            {headerActions}
          </div>
        ) : null}

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>FILTER</div>
              <h3>เลือกบทบาทและโมดูล</h3>
              <p>
                {fromRoles
                  ? "กำลังตั้งสิทธิ์สำหรับบทบาทที่เลือก — เปลี่ยนบทบาทได้ที่แท็บ บทบาท"
                  : "เลือกบทบาทเพื่อแก้สิทธิ์ แล้วเลือกโมดูลได้หลายอันเพื่อกรองตาราง"}
                {moduleFilter.length > 0
                  ? " — กำลังกรองโมดูล: ติ๊กสิทธิ์ในโมดูลอื่นด้วยก่อนบันทึก ถ้าต้องการให้ขึ้นเมนูครบ"
                  : ""}
              </p>
            </div>
            {embedded ? headerActions : null}
          </div>
          <div className={styles.filterFields}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>บทบาท</span>
              <div className={styles.roleSelectRow}>
                <Select
                  className={styles.roleSelect}
                  value={selectedRoleId}
                  disabled={roleLocked}
                  showSearch
                  optionFilterProp="label"
                  placeholder="เลือกบทบาท"
                  options={roles.map((role) => ({
                    value: role.id,
                    label: `${role.roleCode} — ${role.roleName}`,
                  }))}
                />
                <Popconfirm
                  title="ลบบทบาท"
                  description={
                    selectedRole
                      ? `ต้องการลบ "${selectedRole.roleName}" หรือไม่?`
                      : undefined
                  }
                  okText="ลบ"
                  cancelText="ยกเลิก"
                  okButtonProps={{ danger: true }}
                  disabled={!selectedRole}
                  onConfirm={handleDeleteRole}
                >
                  <Button
                    className={masterStyles.deleteButton}
                    icon={<DeleteOutlined />}
                    loading={deleteRoleMutation.isPending}
                    disabled={!selectedRole}
                    title={
                      selectedRole
                        ? "ลบได้ถ้ายังไม่มีผู้ใช้ผูกบทบาทนี้"
                        : undefined
                    }
                  >
                    ลบ
                  </Button>
                </Popconfirm>
              </div>
            </label>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>โมดูล</span>
              <Select
                className={styles.moduleSelect}
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={moduleFilter}
                onChange={(value) => setModuleFilter(value)}
                showSearch
                optionFilterProp="label"
                placeholder="ทุกโมดูล (เลือกได้หลายอัน)"
                options={moduleFilterOptions}
              />
            </label>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>MATRIX</div>
              <h3>สิทธิ์ตามหน้าจอ</h3>
              <p>
                ติ๊กทั้งแถว / ทั้งกลุ่ม / ทั้งคอลัมน์ได้ — หรือใช้ปุ่มเปิด/ปิด
                ทั้งหมดที่กำลังแสดง แล้วกดบันทึกสิทธิ์
              </p>
            </div>
            <div className={styles.matrixToolbar}>
              <div className={masterStyles.tableCount}>
                {visibleScreenCount}
                {moduleFilter.length > 0 ? ` / ${screens.length}` : ""} หน้าจอ
              </div>
              <Button
                size="small"
                disabled={visibleScreenCount === 0}
                onClick={() =>
                  setPermissionsAllowed(
                    permissionIdsForScreens(visibleScreens),
                    true,
                  )
                }
              >
                เปิดทั้งหมดที่เห็น
              </Button>
              <Button
                size="small"
                disabled={visibleScreenCount === 0}
                onClick={() =>
                  setPermissionsAllowed(
                    permissionIdsForScreens(visibleScreens),
                    false,
                  )
                }
              >
                ปิดทั้งหมดที่เห็น
              </Button>
            </div>
          </div>

          {rolePermissionsQuery.isLoading ? (
            <div className={styles.loadingBox}>
              <Spin />
            </div>
          ) : rolePermissionsQuery.isError ? (
            <Empty
              className={styles.emptyBox}
              description="โหลดสิทธิ์ของบทบาทนี้ไม่สำเร็จ — ยังไม่ต้องกดบันทึก เพราะจะเขียนทับสิทธิ์เดิมทั้งชุด"
            >
              <Button
                onClick={() => {
                  void rolePermissionsQuery.refetch();
                }}
                loading={rolePermissionsQuery.isFetching}
              >
                ลองโหลดอีกครั้ง
              </Button>
            </Empty>
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
                    {functionCodes.map((code) => {
                      const colState = columnAllState(code);
                      return (
                        <th key={code} className={styles.functionHeaderCell}>
                          <div className={styles.columnHeader}>
                            <span>{code}</span>
                            <Checkbox
                              checked={colState.checked}
                              indeterminate={colState.indeterminate}
                              disabled={colState.disabled}
                              title={`ติ๊ก/ถอด ${code} ทั้งตารางที่เห็น`}
                              onChange={(event) =>
                                setPermissionsAllowed(
                                  permissionIdsForFunction(
                                    visibleScreens,
                                    code,
                                  ),
                                  event.target.checked,
                                )
                              }
                            />
                          </div>
                        </th>
                      );
                    })}
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
                          <span className={styles.sectionActions}>
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForFunction(
                                    group.screens,
                                    "VIEW",
                                  ),
                                  true,
                                )
                              }
                            >
                              VIEW ทั้งกลุ่ม
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForScreens(group.screens),
                                  true,
                                )
                              }
                            >
                              เปิดทั้งหมด
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForScreens(group.screens),
                                  false,
                                )
                              }
                            >
                              ปิดทั้งหมด
                            </Button>
                          </span>
                        </td>
                      </tr>
                      {group.screens.map((screen) => {
                        const fnByCode = new Map(
                          screen.functions.map((fn) => [fn.functionCode, fn]),
                        );
                        const rowState = screenAllState(screen);
                        return (
                          <tr key={screen.id}>
                            <td className={styles.screenCell}>
                              <div className={styles.screenRow}>
                                <Checkbox
                                  checked={rowState.checked}
                                  indeterminate={rowState.indeterminate}
                                  title="ติ๊ก/ถอดสิทธิ์ทั้งแถวนี้"
                                  onChange={(event) =>
                                    setScreenAllowed(
                                      screen,
                                      event.target.checked,
                                    )
                                  }
                                />
                                <div className={styles.screenMeta}>
                                  <span className={styles.screenName}>
                                    {screen.screenName}
                                  </span>
                                  <span className={styles.screenModule}>
                                    {screen.screenCode}
                                  </span>
                                </div>
                              </div>
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

      <RoleFormModal
        open={roleModalOpen}
        confirmLoading={createRoleMutation.isPending}
        onCancel={() => setRoleModalOpen(false)}
        onSubmit={(values) => {
          createRoleMutation.mutate(values, {
            onSuccess: (res) => {
              setRoleModalOpen(false);
              router.replace(
                `/users?tab=permissions&roleId=${encodeURIComponent(res.data.id)}`,
              );
            },
          });
        }}
      />
    </MasterPageGate>
  );
}
