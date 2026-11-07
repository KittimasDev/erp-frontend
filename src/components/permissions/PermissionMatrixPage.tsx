"use client";

import { Fragment, memo, useCallback, useEffect, useMemo, useState } from "react";
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
  UndoOutlined,
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
import { useT } from "@/lib/i18n/useT";
import type {
  RolePermissionAssignment,
  ScreenCatalog,
} from "@/types/permissions";

import RoleFormModal from "./RoleFormModal";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import styles from "./PermissionMatrixPage.module.css";
import PageHeader from "@/components/common/PageHeader";

/**
 * ลำดับคอลัมน์ที่ต้องการ — ไม่ใช่ "รายการคอลัมน์ทั้งหมด"
 * คอลัมน์จริงมาจาก catalog ที่ API ส่งมา (ดู functionCodes) เพราะถ้า hardcode ไว้
 * function code ที่ backend seed เพิ่มแต่ไม่มีในลิสต์นี้จะไม่มีช่องให้ติ๊ก
 * แล้วถูกส่ง isAllowed=false ทับทุกครั้งที่บันทึก = สิทธิ์หายเงียบ ๆ
 */
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

/** ติ๊ก action ใด ๆ ต้องได้ VIEW ด้วย — ตรงกับ implied-VIEW ใน PermissionsGuard */
const VIEW_FUNCTION_CODE = "VIEW";

const ADMINISTRATOR_ROLE_CODE = "ADMINISTRATOR";

const FUNCTION_LABELS: Record<string, string> = {
  VIEW: "ดู",
  VIEW_ALL: "ดูทั้งหมด",
  ADD: "เพิ่ม",
  EDIT: "แก้ไข",
  DELETE: "ลบ",
  APPROVE: "อนุมัติ",
  EXPORT: "ส่งออก",
  PRINT: "พิมพ์",
};

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
  { code: "FINANCE", label: "การเงิน" },
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

function buildAllowedMap(
  assignments: RolePermissionAssignment[] | undefined,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const item of assignments ?? []) {
    next[item.permissionId] = item.isAllowed;
  }
  return next;
}

type CheckState = { checked: boolean; indeterminate: boolean };

function checkStateOf(
  ids: string[],
  allowed: Record<string, boolean>,
): CheckState {
  if (ids.length === 0) {
    return { checked: false, indeterminate: false };
  }
  const allowedCount = ids.filter((id) => allowed[id]).length;
  return {
    checked: allowedCount === ids.length,
    indeterminate: allowedCount > 0 && allowedCount < ids.length,
  };
}

type MatrixRowProps = {
  screen: ScreenCatalog;
  functionCodes: string[];
  fnByCode: Map<string, ScreenCatalog["functions"][number]>;
  rowState: CheckState;
  allowed: Record<string, boolean>;
  /**
   * ลายเซ็นค่าติ๊กของ *แถวนี้* เท่านั้น — ตัวเทียบใน memo ใช้ค่านี้แทน
   * identity ของ `allowed` เพื่อให้ติ๊กช่องเดียวแล้ว re-render แค่แถวเดียว
   */
  signature: string;
  disabled: boolean;
  onToggle: (permissionId: string) => void;
  onToggleRow: (screen: ScreenCatalog, value: boolean) => void;
};

function matrixRowPropsEqual(prev: MatrixRowProps, next: MatrixRowProps) {
  return (
    prev.screen === next.screen &&
    prev.functionCodes === next.functionCodes &&
    prev.fnByCode === next.fnByCode &&
    prev.rowState.checked === next.rowState.checked &&
    prev.rowState.indeterminate === next.rowState.indeterminate &&
    prev.signature === next.signature &&
    prev.disabled === next.disabled &&
    prev.onToggle === next.onToggle &&
    prev.onToggleRow === next.onToggleRow
  );
}

const MatrixRow = memo(function MatrixRow({
  screen,
  functionCodes,
  fnByCode,
  rowState,
  allowed,
  disabled,
  onToggle,
  onToggleRow,
}: MatrixRowProps) {
  const t = useT();
  return (
    <tr>
      <td className={styles.screenCell}>
        <div className={styles.screenRow}>
          <Checkbox
            checked={rowState.checked}
            indeterminate={rowState.indeterminate}
            disabled={disabled}
            title={t("ติ๊ก/ถอดสิทธิ์ทั้งแถวนี้")}
            onChange={(event) => onToggleRow(screen, event.target.checked)}
          />
          <div className={styles.screenMeta}>
            <span className={styles.screenName}>{screen.screenName}</span>
            <span className={styles.screenModule}>{screen.screenCode}</span>
          </div>
        </div>
      </td>
      {functionCodes.map((code) => {
        const fn = fnByCode.get(code);
        return (
          <td key={code} className={styles.checkboxCell}>
            {fn ? (
              <Checkbox
                checked={Boolean(allowed[fn.permissionId])}
                disabled={disabled}
                onChange={() => onToggle(fn.permissionId)}
              />
            ) : (
              <span className={styles.notApplicable}>—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
},
matrixRowPropsEqual);

const EMPTY_FN_MAP: MatrixRowProps["fnByCode"] = new Map();
const EMPTY_ROW_STATE: CheckState = { checked: false, indeterminate: false };

type PermissionMatrixPageProps = {
  embedded?: boolean;
  fromRoles?: boolean;
};

export default function PermissionMatrixPage({
  embedded = false,
  fromRoles = false,
}: PermissionMatrixPageProps) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lockedRoleId = searchParams.get("roleId");

  useEffect(() => {
    // ผู้ที่ถูกติ๊กสิทธิ์หน้าสิทธิ์การใช้งานก็เข้าได้ ไม่จำกัดแค่ ADMINISTRATOR
    if (!isAdministrator() && !canAccessScreen("PERMISSIONS")) {
      router.replace("/");
    }
  }, [router, pathname]);

  const selectRole = (roleId: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "permissions");
    next.set("roleId", roleId);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

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
  /** ADMINISTRATOR ผ่านทุก guard อยู่แล้ว — ตารางเป็น read-only, backend ก็ปฏิเสธ PUT */
  const isAdminRole = selectedRole?.roleCode === ADMINISTRATOR_ROLE_CODE;
  /** roleId ใน URL ชี้ไปบทบาทที่ไม่มี/ถูกลบ — ห้ามให้กดบันทึกยิง PUT ทิ้ง */
  const roleNotFound =
    rolesQuery.isSuccess && Boolean(selectedRoleId) && !selectedRole;
  const updateMutation = useUpdateRolePermissionsMutation(
    selectedRoleId ?? "",
    selectedRole
      ? { roleCode: selectedRole.roleCode, roleName: selectedRole.roleName }
      : undefined,
  );
  const createRoleMutation = useCreateRoleMutation();
  const deleteRoleMutation = useDeleteRoleMutation();

  const [allowed, setAllowed] = useState<Record<string, boolean>>({});
  /** มีการติ๊กที่ยังไม่บันทึก — ใช้กันไม่ให้ response จาก server มาทับ */
  const [isDirty, setIsDirty] = useState(false);
  const serverAssignments = rolePermissionsQuery.data?.data.assignments;

  /**
   * sync ค่าที่ติ๊กจาก server → state ตอน render
   *
   * ต้องเก็บ roleId คู่กับ assignments แล้วเริ่มจาก `{}` เสมอ — ห้าม init ด้วย
   * `serverAssignments` เพราะถ้า mount ใหม่ตอน TanStack Query ยัง cache อยู่
   * (staleTime 30s) render แรกจะได้ array ก้อนเดิมมาทันที ทำให้ค่าเริ่มต้น
   * เท่ากับค่าที่จะเทียบ → เงื่อนไขไม่เข้า → ตารางขึ้นครบแต่ไม่มีติ๊กเลย
   *
   * และห้าม sync ทับตอน isDirty — ไม่งั้น refetch เบื้องหลังจะล้างสิ่งที่
   * ผู้ใช้เพิ่งติ๊กไปเงียบ ๆ (เปลี่ยน role ถือเป็นการทิ้งของที่แก้ค้าง)
   */
  const [syncedFrom, setSyncedFrom] = useState<{
    roleId?: string;
    assignments?: typeof serverAssignments;
  }>({});

  const roleChanged = syncedFrom.roleId !== selectedRoleId;
  if (
    roleChanged ||
    (!isDirty && syncedFrom.assignments !== serverAssignments)
  ) {
    setSyncedFrom({ roleId: selectedRoleId, assignments: serverAssignments });
    setAllowed(buildAllowedMap(serverAssignments));
    if (isDirty) {
      setIsDirty(false);
    }
  }

  const resetChanges = () => {
    setSyncedFrom({ roleId: selectedRoleId, assignments: serverAssignments });
    setAllowed(buildAllowedMap(serverAssignments));
    setIsDirty(false);
  };

  /** เตือนก่อนปิด/รีเฟรชแท็บถ้ายังมีสิทธิ์ที่ติ๊กค้างไว้ */
  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  /** เปลี่ยนบทบาท = ทิ้งของที่ติ๊กค้าง ต้องถามก่อน */
  const requestRoleChange = (roleId: string) => {
    if (roleId === selectedRoleId) {
      return;
    }
    if (
      isDirty &&
      !window.confirm(
        t("ยังมีสิทธิ์ที่ติ๊กไว้แต่ไม่ได้บันทึก — เปลี่ยนบทบาทแล้วจะหายไป ต้องการเปลี่ยนหรือไม่?"),
      )
    ) {
      return;
    }
    setIsDirty(false);
    selectRole(roleId);
  };

  /** ระหว่างโหลด/บันทึก ห้ามแก้ — กันติ๊กแล้วถูก response ทับ */
  const isBusy =
    updateMutation.isPending || rolePermissionsQuery.isFetching;
  const isReadOnly = isBusy || isAdminRole || roleNotFound;

  const goBackToRoles = () => {
    router.replace("/users?tab=roles");
  };

  /**
   * คอลัมน์ = function code ทุกตัวที่มีจริงใน catalog เรียงตาม FUNCTION_ORDER
   * code ที่ไม่รู้จักไปต่อท้าย (ใช้ code ดิบเป็นหัวคอลัมน์) เพื่อให้ทุกสิทธิ์ที่
   * backend seed มามีช่องให้ติ๊ก — ไม่ถูกส่ง false ทับเพราะมองไม่เห็น
   */
  const functionCodes = useMemo(() => {
    const present = new Set<string>();
    for (const screen of screens) {
      for (const fn of screen.functions) {
        if (fn.permissionId) {
          present.add(fn.functionCode);
        }
      }
    }
    const known = FUNCTION_ORDER.filter((code) => present.has(code));
    const unknown = [...present]
      .filter((code) => !FUNCTION_ORDER.includes(code))
      .sort((a, b) => a.localeCompare(b));
    return [...known, ...unknown];
  }, [screens]);

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
          label: t(item.label),
        }),
      ),
      ...[...present]
        .filter((code) => !MODULE_LABEL_BY_CODE[code])
        .sort((a, b) => a.localeCompare(b))
        .map((code) => ({ value: code, label: code })),
    ];
  }, [screens, t]);

  const visibleScreens = useMemo(
    () => moduleGroups.flatMap((group) => group.screens),
    [moduleGroups],
  );

  /** screenId → (functionCode → function) สร้างครั้งเดียวต่อ catalog */
  const fnByScreenId = useMemo(() => {
    const map = new Map<
      string,
      Map<string, ScreenCatalog["functions"][number]>
    >();
    for (const screen of screens) {
      map.set(
        screen.id,
        new Map(screen.functions.map((fn) => [fn.functionCode, fn])),
      );
    }
    return map;
  }, [screens]);

  /** ตารางช่วย cascade: permissionId → screen, และ VIEW / non-VIEW ต่อหน้าจอ */
  const cascadeIndex = useMemo(() => {
    const screenByPermissionId = new Map<string, ScreenCatalog>();
    const viewIdByScreenId = new Map<string, string>();
    const otherIdsByScreenId = new Map<string, string[]>();

    for (const screen of screens) {
      const others: string[] = [];
      for (const fn of screen.functions) {
        if (!fn.permissionId) continue;
        screenByPermissionId.set(fn.permissionId, screen);
        if (fn.functionCode === VIEW_FUNCTION_CODE) {
          viewIdByScreenId.set(screen.id, fn.permissionId);
        } else {
          others.push(fn.permissionId);
        }
      }
      otherIdsByScreenId.set(screen.id, others);
    }
    return { screenByPermissionId, viewIdByScreenId, otherIdsByScreenId };
  }, [screens]);

  /**
   * VIEW cascade — ให้ตารางตรงกับที่ PermissionsGuard บังคับจริง
   * - ติ๊ก action ใด ๆ → เปิด VIEW ของแถวนั้นให้ด้วย
   * - ถอด VIEW → ถอด action อื่นในแถวนั้นทั้งหมด
   * ใช้ทั้ง toggle ทีละช่องและปุ่ม bulk ทุกปุ่ม เพื่อให้กฎเดียวกันทั้งหน้า
   */
  const applyCascade = useCallback(
    (
      draft: Record<string, boolean>,
      changedIds: string[],
      value: boolean,
    ) => {
      const changed = new Set(changedIds);
      const touched = new Map<string, ScreenCatalog>();
      for (const id of changedIds) {
        const screen = cascadeIndex.screenByPermissionId.get(id);
        if (screen) {
          touched.set(screen.id, screen);
        }
      }

      for (const screen of touched.values()) {
        const viewId = cascadeIndex.viewIdByScreenId.get(screen.id);
        if (!viewId) continue;
        const otherIds = cascadeIndex.otherIdsByScreenId.get(screen.id) ?? [];

        if (value) {
          if (otherIds.some((id) => changed.has(id))) {
            draft[viewId] = true;
          }
        } else if (changed.has(viewId)) {
          for (const id of otherIds) {
            draft[id] = false;
          }
        }
      }
    },
    [cascadeIndex],
  );

  const setPermissionsAllowed = useCallback(
    (permissionIds: string[], value: boolean) => {
      if (permissionIds.length === 0) {
        return;
      }
      setAllowed((prev) => {
        const next = { ...prev };
        for (const id of permissionIds) {
          next[id] = value;
        }
        applyCascade(next, permissionIds, value);
        return next;
      });
      setIsDirty(true);
    },
    [applyCascade],
  );

  const toggle = useCallback(
    (permissionId: string) => {
      setAllowed((prev) => {
        const value = !prev[permissionId];
        const next = { ...prev, [permissionId]: value };
        applyCascade(next, [permissionId], value);
        return next;
      });
      setIsDirty(true);
    },
    [applyCascade],
  );

  const permissionIdsForScreens = useCallback(
    (groupScreens: ScreenCatalog[]) =>
      groupScreens.flatMap((screen) =>
        screen.functions
          .map((fn) => fn.permissionId)
          .filter((id): id is string => Boolean(id)),
      ),
    [],
  );

  const permissionIdsForFunction = useCallback(
    (groupScreens: ScreenCatalog[], functionCode: string) =>
      groupScreens
        .map(
          (screen) =>
            screen.functions.find((fn) => fn.functionCode === functionCode)
              ?.permissionId,
        )
        .filter((id): id is string => Boolean(id)),
    [],
  );

  const setScreenAllowed = useCallback(
    (screen: ScreenCatalog, value: boolean) => {
      setPermissionsAllowed(
        screen.functions
          .map((fn) => fn.permissionId)
          .filter((id): id is string => Boolean(id)),
        value,
      );
    },
    [setPermissionsAllowed],
  );

  /**
   * สถานะ checkbox หัวแถว / หัวคอลัมน์ — คำนวณรอบเดียวต่อการเปลี่ยน allowed
   * (เดิมเป็น function ที่ scan ตารางใหม่ทุก render ต่อการคลิก 1 ครั้ง)
   */
  /**
   * ADMINISTRATOR มีสิทธิ์ทุกอย่างโดย bypass ใน guard — แสดงเป็นติ๊กครบ
   * ไม่ต้องแยกเคสในทุกจุดที่วาด checkbox
   */
  const effectiveAllowed = useMemo(() => {
    if (!isAdminRole) {
      return allowed;
    }
    const all: Record<string, boolean> = {};
    for (const screen of screens) {
      for (const fn of screen.functions) {
        if (fn.permissionId) {
          all[fn.permissionId] = true;
        }
      }
    }
    return all;
  }, [isAdminRole, screens, allowed]);

  const rowStateByScreenId = useMemo(() => {
    const map = new Map<string, CheckState>();
    for (const screen of visibleScreens) {
      const ids = screen.functions
        .map((fn) => fn.permissionId)
        .filter((id): id is string => Boolean(id));
      map.set(screen.id, checkStateOf(ids, effectiveAllowed));
    }
    return map;
  }, [visibleScreens, effectiveAllowed]);

  /** ลายเซ็นต่อแถว ใช้เป็นตัวเทียบของ MatrixRow (ดู matrixRowPropsEqual) */
  const rowSignatureByScreenId = useMemo(() => {
    const map = new Map<string, string>();
    for (const screen of visibleScreens) {
      map.set(
        screen.id,
        screen.functions
          .map((fn) => (effectiveAllowed[fn.permissionId] ? "1" : "0"))
          .join(""),
      );
    }
    return map;
  }, [visibleScreens, effectiveAllowed]);

  const colStateByFunctionCode = useMemo(() => {
    const map = new Map<string, CheckState & { disabled: boolean }>();
    for (const code of functionCodes) {
      const ids = permissionIdsForFunction(visibleScreens, code);
      map.set(code, {
        ...checkStateOf(ids, effectiveAllowed),
        disabled: ids.length === 0,
      });
    }
    return map;
  }, [
    functionCodes,
    visibleScreens,
    effectiveAllowed,
    permissionIdsForFunction,
  ]);

  const handleSave = () => {
    if (!selectedRoleId || isAdminRole) {
      return;
    }
    const assignments = screens.flatMap((screen) =>
      screen.functions.map((fn) => ({
        permissionId: fn.permissionId,
        isAllowed: Boolean(allowed[fn.permissionId]),
      })),
    );
    updateMutation.mutate(assignments, {
      onSuccess: () => setIsDirty(false),
    });
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
          {t("กลับไปบทบาท")}
        </Button>
      ) : null}
      <Button
        size="large"
        icon={<PlusOutlined />}
        onClick={() => setRoleModalOpen(true)}
      >
        {t("สร้างบทบาทใหม่")}
      </Button>
      <Button
        size="large"
        icon={<UndoOutlined />}
        disabled={!isDirty || isBusy}
        onClick={resetChanges}
      >
        {t("ยกเลิกการแก้ไข")}
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
         * ต้องเช็ค isFetching ด้วย — ตอน refetch เบื้องหลัง isSuccess ยังเป็น true
         * แต่ค่าที่เห็นเป็นของเก่า กดบันทึกตอนนั้นคือเขียนทับด้วยของเก่า
         */
        disabled={
          !selectedRoleId ||
          screens.length === 0 ||
          !rolePermissionsQuery.isSuccess ||
          rolePermissionsQuery.isFetching ||
          isAdminRole ||
          roleNotFound
        }
        onClick={handleSave}
      >
        {isDirty ? t("บันทึกสิทธิ์ *") : t("บันทึกสิทธิ์")}
      </Button>
    </div>
  );

  return (
    <MasterPageGate isLoading={!embedded && isLoading}>
      <section className={masterStyles.page}>
        {!embedded ? (
          <PageHeader
            eyebrow="SECURITY"
            icon={<SafetyCertificateOutlined />}
            title="Permission Matrix"
            subtitle={t("กำหนดสิทธิ์รายหน้าจอต่อบทบาท — คอลัมน์ APPROVE ใช้จำกัดเฉพาะ role ที่อนุมัติได้")}
            actions={
              <>
{headerActions}
              </>
            }
          />
        ) : null}

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>FILTER</div>
              <h3>{t("เลือกบทบาทและโมดูล")}</h3>
              <p>
                {fromRoles
                  ? t("กำลังตั้งสิทธิ์สำหรับบทบาทใน URL — เปลี่ยนบทบาทได้จากช่องด้านล่าง หรือกลับไปแท็บ บทบาท")
                  : t("เลือกบทบาทเพื่อแก้สิทธิ์ แล้วเลือกโมดูลได้หลายอันเพื่อกรองตาราง")}
                {moduleFilter.length > 0
                  ? t(" — กำลังกรองโมดูล: ติ๊กสิทธิ์ในโมดูลอื่นด้วยก่อนบันทึก ถ้าต้องการให้ขึ้นเมนูครบ")
                  : ""}
              </p>
            </div>
            {embedded ? headerActions : null}
          </div>
          <div className={styles.filterFields}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>{t("บทบาท")}</span>
              <div className={styles.roleSelectRow}>
                <Select
                  className={styles.roleSelect}
                  value={selectedRoleId}
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("เลือกบทบาท")}
                  options={roles.map((role) => ({
                    value: role.id,
                    label: `${role.roleCode} — ${role.roleName}`,
                  }))}
                  onChange={(value) => {
                    if (typeof value === "string" && value) {
                      requestRoleChange(value);
                    }
                  }}
                />
                <Popconfirm
                  title={t("ลบบทบาท")}
                  description={
                    selectedRole
                      ? t('ต้องการลบ "{name}" หรือไม่?', { name: selectedRole.roleName })
                      : undefined
                  }
                  okText={t("ลบ")}
                  cancelText={t("ยกเลิก")}
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
                        ? t("ลบได้ถ้ายังไม่มีผู้ใช้ผูกบทบาทนี้")
                        : undefined
                    }
                  >
                    {t("ลบ")}
                  </Button>
                </Popconfirm>
              </div>
            </label>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>{t("โมดูล")}</span>
              <Select
                className={styles.moduleSelect}
                mode="multiple"
                allowClear
                maxTagCount="responsive"
                value={moduleFilter}
                onChange={(value) => setModuleFilter(value)}
                showSearch
                optionFilterProp="label"
                placeholder={t("ทุกโมดูล (เลือกได้หลายอัน)")}
                options={moduleFilterOptions}
              />
            </label>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>MATRIX</div>
              <h3>{t("สิทธิ์ตามหน้าจอ")}</h3>
              <p>
                {isAdminRole
                  ? t("ADMINISTRATOR มีสิทธิ์ทุกหน้าจอโดยระบบ ไม่ต้องตั้งค่า — ตารางนี้ดูได้อย่างเดียว")
                  : t("ติ๊กทั้งแถว / ทั้งกลุ่ม / ทั้งคอลัมน์ได้ — หรือใช้ปุ่มเปิด/ปิดทั้งหมดที่กำลังแสดง แล้วกดบันทึกสิทธิ์ · ติ๊ก แก้ไข/ลบ/อนุมัติ จะเปิด ดู ให้อัตโนมัติ เพราะเข้าหน้านั้นไม่ได้ถ้าไม่มีสิทธิ์ดู")}
                {isDirty ? t(" — มีการแก้ที่ยังไม่บันทึก") : ""}
              </p>
            </div>
            <div className={styles.matrixToolbar}>
              <div className={masterStyles.tableCount}>
                {visibleScreenCount}
                {moduleFilter.length > 0 ? ` / ${screens.length}` : ""} {t("หน้าจอ")}
              </div>
              <Button
                size="small"
                disabled={visibleScreenCount === 0 || isReadOnly}
                onClick={() =>
                  setPermissionsAllowed(
                    permissionIdsForScreens(visibleScreens),
                    true,
                  )
                }
              >
                {t("เปิดทั้งหมดที่เห็น")}
              </Button>
              <Button
                size="small"
                disabled={visibleScreenCount === 0 || isReadOnly}
                onClick={() =>
                  setPermissionsAllowed(
                    permissionIdsForScreens(visibleScreens),
                    false,
                  )
                }
              >
                {t("ปิดทั้งหมดที่เห็น")}
              </Button>
            </div>
          </div>

          {roleNotFound ? (
            <Empty
              className={styles.emptyBox}
              description={t("ไม่พบบทบาทรหัส {id} — อาจถูกลบไปแล้ว", { id: selectedRoleId ?? "" })}
            >
              <Button onClick={goBackToRoles}>{t("กลับไปแท็บบทบาท")}</Button>
            </Empty>
          ) : rolePermissionsQuery.isLoading ? (
            <div className={styles.loadingBox}>
              <Spin />
            </div>
          ) : rolePermissionsQuery.isError ? (
            <Empty
              className={styles.emptyBox}
              description={t("โหลดสิทธิ์ของบทบาทนี้ไม่สำเร็จ — ยังไม่ต้องกดบันทึก เพราะจะเขียนทับสิทธิ์เดิมทั้งชุด")}
            >
              <Button
                onClick={() => {
                  void rolePermissionsQuery.refetch();
                }}
                loading={rolePermissionsQuery.isFetching}
              >
                {t("ลองโหลดอีกครั้ง")}
              </Button>
            </Empty>
          ) : screens.length === 0 ? (
            <Empty
              className={styles.emptyBox}
              description={t("ยังไม่มีข้อมูล Screen")}
            />
          ) : visibleScreenCount === 0 ? (
            <Empty
              className={styles.emptyBox}
              description={t("ไม่พบหน้าจอในโมดูลที่เลือก")}
            />
          ) : (
            <div className={styles.matrixScroll}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th className={styles.screenHeaderCell}>{t("หน้าจอ")}</th>
                    {functionCodes.map((code) => {
                      const colState = colStateByFunctionCode.get(code);
                      return (
                        <th key={code} className={styles.functionHeaderCell}>
                          <div className={styles.columnHeader}>
                            <span title={code}>
                              {t(FUNCTION_LABELS[code] ?? code)}
                            </span>
                            <Checkbox
                              checked={Boolean(colState?.checked)}
                              indeterminate={Boolean(colState?.indeterminate)}
                              disabled={isReadOnly || colState?.disabled}
                              title={t("ติ๊ก/ถอด {name} ทั้งตารางที่เห็น", { name: t(FUNCTION_LABELS[code] ?? code) })}
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
                            {t(group.label)}
                          </span>
                          <span className={styles.sectionMeta}>
                            {group.code} · {group.screens.length} {t("หน้าจอ")}
                          </span>
                          {group.code === "WAREHOUSE" ? (
                            <span className={styles.sectionHint}>
                              {t("ติ๊กดู ของตรวจสต๊อกขาย / จ่ายของ / บรรจุ / ส่งของ เปิดหน้ารายละเอียดใบสั่งขายได้ โดยไม่ต้องติ๊กหน้าใบสั่งขาย")}
                            </span>
                          ) : null}
                          <span className={styles.sectionActions}>
                            <Button
                              type="link"
                              size="small"
                              disabled={isReadOnly}
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForFunction(
                                    group.screens,
                                    VIEW_FUNCTION_CODE,
                                  ),
                                  true,
                                )
                              }
                            >
                              {t("VIEW ทั้งกลุ่ม")}
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              disabled={isReadOnly}
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForFunction(
                                    group.screens,
                                    VIEW_FUNCTION_CODE,
                                  ),
                                  false,
                                )
                              }
                            >
                              {t("ถอด VIEW ทั้งกลุ่ม")}
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              disabled={isReadOnly}
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForScreens(group.screens),
                                  true,
                                )
                              }
                            >
                              {t("เปิดทั้งหมด")}
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              disabled={isReadOnly}
                              onClick={() =>
                                setPermissionsAllowed(
                                  permissionIdsForScreens(group.screens),
                                  false,
                                )
                              }
                            >
                              {t("ปิดทั้งหมด")}
                            </Button>
                          </span>
                        </td>
                      </tr>
                      {group.screens.map((screen) => (
                        <MatrixRow
                          key={screen.id}
                          screen={screen}
                          functionCodes={functionCodes}
                          fnByCode={fnByScreenId.get(screen.id) ?? EMPTY_FN_MAP}
                          rowState={
                            rowStateByScreenId.get(screen.id) ?? EMPTY_ROW_STATE
                          }
                          allowed={effectiveAllowed}
                          signature={
                            rowSignatureByScreenId.get(screen.id) ?? ""
                          }
                          disabled={isReadOnly}
                          onToggle={toggle}
                          onToggleRow={setScreenAllowed}
                        />
                      ))}
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
