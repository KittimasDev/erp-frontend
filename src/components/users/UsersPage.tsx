"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { getStoredUser, isAdministrator } from "@/lib/auth/session";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import {
  useActivateUserMutation,
  useCreateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useResetUserPasswordMutation,
  useUpdateUserMutation,
} from "@/hooks/users/useUserMutations";
import { usePositionsQuery } from "@/hooks/positions/usePositionsQuery";
import { useRolesQuery } from "@/hooks/users/useRolesQuery";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import {
  EMPLOYMENT_TYPE_LABEL,
  EMPLOYMENT_TYPE_OPTIONS,
  type AppUser,
  type CreateUserRequest,
  type UpdateUserRequest,
  type UserQueryParams,
} from "@/types/users";

import ResetPasswordModal from "./ResetPasswordModal";
import UserFormModal from "./UserFormModal";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import styles from "./UsersPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type FilterFormValues = {
  q?: string;
  isActive?: boolean | null;
  roleId?: string | null;
  positionId?: string | null;
  employmentType?: string | null;
};

const FILTER_KEYS = ["q", "isActive", "roleId", "positionId", "employmentType"] as const;

type UsersPageProps = {
  /** Hide outer page header when shown as a tab */
  embedded?: boolean;
};

function parseFilters(searchParams: URLSearchParams): UserQueryParams {
  const params: UserQueryParams = {};
  const q = searchParams.get("q")?.trim();
  if (q) {
    params.q = q;
  }
  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }
  const roleId = searchParams.get("roleId")?.trim();
  if (roleId) {
    params.roleId = roleId;
  }
  const positionId = searchParams.get("positionId")?.trim();
  if (positionId) {
    params.positionId = positionId;
  }
  const employmentType = searchParams.get("employmentType")?.trim();
  if (employmentType) {
    params.employmentType = employmentType;
  }
  return params;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function UsersPage({ embedded = false }: UsersPageProps) {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<FilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    // ผู้ที่ถูกติ๊กสิทธิ์หน้าผู้ใช้ใน Permission Matrix ก็เข้าได้ ไม่จำกัดแค่ ADMINISTRATOR
    if (!isAdministrator() && !canAccessScreen("USERS")) {
      router.replace("/");
    }
  }, [router, pathname]);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  const usersQuery = useUsersQuery(filters);
  const rolesQuery = useRolesQuery();
  const positionsQuery = usePositionsQuery();
  const positions = positionsQuery.data?.data ?? [];
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const resetMutation = useResetUserPasswordMutation();
  const activateMutation = useActivateUserMutation();
  const deactivateMutation = useDeactivateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const currentUserId = getStoredUser()?.id;

  // sync ฟอร์มจาก URL — antd Form เป็น external system การใช้ effect ถูกต้องแล้ว
  useEffect(() => {
    form.setFieldsValue({
      q: filters.q,
      isActive: filters.isActive,
      roleId: filters.roleId,
      positionId: filters.positionId,
      employmentType: filters.employmentType,
    });
  }, [filters, form]);

  // ตัวกรองเปลี่ยน → กลับไปหน้า 1 · ปรับ state ตอน render ไม่ทำใน effect
  const [pagedFilters, setPagedFilters] = useState(filters);
  if (pagedFilters !== filters) {
    setPagedFilters(filters);
    setPage(1);
  }

  const users = usersQuery.data?.data?.items ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.filter((user) => !user.isActive).length;

  const applyFilters = (values: FilterFormValues) => {
    const next = new URLSearchParams();
    if (values.q?.trim()) {
      next.set("q", values.q.trim());
    }
    if (values.isActive === true || values.isActive === false) {
      next.set("isActive", String(values.isActive));
    }
    if (values.roleId) {
      next.set("roleId", values.roleId);
    }
    if (values.positionId) {
      next.set("positionId", values.positionId);
    }
    if (values.employmentType) {
      next.set("employmentType", values.employmentType);
    }
    // แท็บ users เป็นค่าเริ่มต้น — อย่าพก tab=departments ไว้
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const columns: ColumnsType<AppUser> = [
    {
      title: t("ลำดับ"),
      key: "index",
      width: 56,
      align: "center",
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: t("ผู้ใช้งาน"),
      key: "user",
      render: (_, record) => (
        <div className={styles.userCell}>
          <div
            className={`${styles.avatar} ${
              record.isActive ? "" : styles.avatarMuted
            }`}
          >
            {initials(record.displayName || record.username)}
          </div>
          <div className={styles.userMeta}>
            <span className={styles.userName}>{record.displayName}</span>
            <span className={styles.userSub}>@{record.username}</span>
          </div>
        </div>
      ),
    },
    {
      title: t("รหัส / แผนก"),
      key: "hr",
      width: 220,
      render: (_, record) => (
        <div className={styles.contactCell}>
          <span className={styles.contactPrimary}>
            {record.employeeCode?.trim() || "—"}
          </span>
          <span className={styles.contactSecondary}>
            {record.departmentName?.trim() || t("ไม่ระบุแผนก")}
            {record.sectionName ? ` › ${record.sectionName}` : ""}
          </span>
          {record.supervisorName ? (
            <span className={styles.contactSecondary}>
              {t("หัวหน้า:")} {record.supervisorName}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t("ตำแหน่ง / ประเภทจ้าง"),
      key: "positionType",
      width: 190,
      render: (_, record) => (
        <div className={styles.contactCell}>
          <span className={styles.contactPrimary}>
            {record.position?.trim() || "—"}
          </span>
          <span className={styles.contactSecondary}>
            {record.employmentType
              ? t(EMPLOYMENT_TYPE_LABEL[record.employmentType] ?? record.employmentType)
              : t("ไม่ระบุประเภทจ้าง")}
          </span>
        </div>
      ),
    },
    {
      title: t("ติดต่อ"),
      key: "contact",
      width: 200,
      render: (_, record) => (
        <div className={styles.contactCell}>
          <span className={styles.contactPrimary}>
            {record.email?.trim() || "—"}
          </span>
          <span className={styles.contactSecondary}>
            {record.phone?.trim() || t("ไม่มีเบอร์โทร")}
          </span>
        </div>
      ),
    },
    {
      title: "Login ERP",
      key: "canLogin",
      width: 100,
      render: (_, record) =>
        record.canLogin ? (
          <Tag color="blue">{lang === "en" ? "On" : "เปิด"}</Tag>
        ) : (
          <Tag>{lang === "en" ? "Off" : "ปิด"}</Tag>
        ),
    },
    {
      title: t("บทบาท"),
      key: "roles",
      render: (_, record) =>
        record.roles.length === 0 ? (
          <span className={styles.roleEmpty}>{t("ยังไม่มีบทบาท")}</span>
        ) : (
          <div className={styles.roleList}>
            {record.roles.map((role) => (
              <span key={role.id} className={styles.roleChip} title={role.roleName}>
                {role.roleCode}
              </span>
            ))}
          </div>
        ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      render: (value: boolean, record) => (
        <Space size={10}>
          <Switch
            checked={value}
            size="small"
            loading={
              activateMutation.isPending || deactivateMutation.isPending
            }
            onChange={(checked) => {
              if (checked) {
                activateMutation.mutate(record.id);
              } else {
                deactivateMutation.mutate(record.id);
              }
            }}
          />
          {value ? (
            <Tag
              className={`${masterStyles.statusTag} ${masterStyles.statusActive}`}
            >
              <span className={masterStyles.statusDot} />
              {t("ใช้งาน")}
            </Tag>
          ) : (
            <Tag
              className={`${masterStyles.statusTag} ${masterStyles.statusInactive}`}
            >
              <span className={masterStyles.statusDot} />
              {lang === "en" ? "Off" : "ปิด"}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: t("เข้าสู่ระบบล่าสุด"),
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 170,
      render: (value?: string) => (
        <span className={masterStyles.updatedText}>
          {value ? dayjs(value).format("DD/MM/YYYY HH:mm") : t("ยังไม่เคยเข้า")}
        </span>
      ),
    },
    {
      title: t("จัดการ"),
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => {
        const isSelf = Boolean(currentUserId && record.id === currentUserId);
        return (
          <RowActionsMenu
            ariaLabel={t("เมนูจัดการ @{username}", { username: record.username })}
            actions={[
              {
                key: "edit",
                icon: <EditOutlined />,
                label: t("แก้ไข"),
                onClick: () => {
                  setModalMode("edit");
                  setEditingUser(record);
                  setModalOpen(true);
                },
              },
              {
                key: "reset",
                icon: <KeyOutlined />,
                label: t("ตั้งรหัสผ่านใหม่"),
                onClick: () => setResetUser(record),
              },
              "divider",
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: t("ลบผู้ใช้งาน"),
                danger: true,
                disabled: isSelf,
                disabledReason: t("ลบบัญชีของตัวเองไม่ได้"),
                onClick: () => deleteMutation.mutate(record.id),
                confirm: {
                  title: t("ลบผู้ใช้งาน?"),
                  content: t('ลบ "@{username}" ถาวร — กู้คืนไม่ได้', { username: record.username }),
                  okText: t("ลบ"),
                  cancelText: t("ยกเลิก"),
                },
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <MasterPageGate
      isLoading={!embedded && (usersQuery.isLoading || rolesQuery.isLoading)}
    >
      <section className={masterStyles.page}>
        {!embedded ? (
          <PageHeader
            eyebrow="SECURITY"
            icon={<TeamOutlined />}
            title={t("จัดการผู้ใช้งาน")}
            subtitle={t("สร้างบัญชี กำหนด Role รีเซ็ตรหัสผ่าน และเปิด/ปิดการใช้งาน")}
            actions={
              <>
<Button
              type="primary"
              size="large"
              className={masterStyles.createButton}
              icon={<PlusOutlined />}
              onClick={() => {
                setModalMode("create");
                setEditingUser(null);
                setModalOpen(true);
              }}
            >
              {t("เพิ่มผู้ใช้งาน")}
            </Button>
              </>
            }
          />
        ) : null}

        <div className={masterStyles.summaryRow}>
          <div
            className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}
          >
            <div className={masterStyles.summaryIcon}>Σ</div>
            <div>
              <span className={masterStyles.summaryLabel}>
                {hasFilters ? t("ผลค้นหา") : t("ผู้ใช้ทั้งหมด")}
              </span>
              <strong>{users.length}</strong>
            </div>
          </div>

          <div
            className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}
          >
            <div className={masterStyles.summaryIcon}>✓</div>
            <div>
              <span className={masterStyles.summaryLabel}>{lang === "en" ? "Active" : "เปิดใช้งาน"}</span>
              <strong>{activeUsers}</strong>
            </div>
          </div>

          <div
            className={`${masterStyles.summaryCard} ${masterStyles.summaryInactive}`}
          >
            <div className={masterStyles.summaryIcon}>—</div>
            <div>
              <span className={masterStyles.summaryLabel}>{t("ปิดใช้งาน")}</span>
              <strong>{inactiveUsers}</strong>
            </div>
          </div>
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>SEARCH</div>
              <h3>{t("ค้นหาผู้ใช้งาน")}</h3>
              <p>{t("กรองด้วยชื่อ บทบาท หรือสถานะบัญชี")}</p>
            </div>
            {hasFilters ? (
              <Tag className={masterStyles.filterActiveTag} color="green">
                {t("มีตัวกรอง")}
              </Tag>
            ) : null}
          </div>

          <Form
            form={form}
            layout="vertical"
            className={masterStyles.filterForm}
            onFinish={applyFilters}
            initialValues={{
              q: "",
              isActive: null,
              roleId: null,
              positionId: null,
              employmentType: null,
            }}
          >
            <Row gutter={[14, 0]}>
              <Col xs={24} md={8}>
                <Form.Item name="q" label={t("ค้นหา")}>
                  <Input
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder={t("username / ชื่อ / อีเมล")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="roleId" label={t("บทบาท")}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("ทั้งหมด")}
                    listHeight={360}
                    options={roles.map((role) => ({
                      value: role.id,
                      label: `${role.roleCode} — ${role.roleName}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="positionId" label={lang === "en" ? "Position" : "ตำแหน่ง"}>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("ทั้งหมด")}
                    options={positions.map((item) => ({
                      value: item.id,
                      label: item.nameTh,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="employmentType" label={t("ประเภทการจ้าง")}>
                  <Select
                    allowClear
                    placeholder={t("ทั้งหมด")}
                    options={EMPLOYMENT_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={5}>
                <Form.Item name="isActive" label={t("สถานะ")}>
                  <Select
                    allowClear
                    placeholder={t("ทั้งหมด")}
                    options={[
                      { value: true, label: lang === "en" ? "Active" : "เปิดใช้งาน" },
                      { value: false, label: t("ปิดใช้งาน") },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={5}>
                <Form.Item label=" ">
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      className={masterStyles.filterSearchButton}
                    >
                      {t("ค้นหา")}
                    </Button>
                    <Button
                      icon={<ClearOutlined />}
                      onClick={() => {
                        handleClearFilters();
                        setPage(1);
                      }}
                    >
                      {t("ล้าง")}
                    </Button>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>DIRECTORY</div>
              <h3>{t("รายชื่อผู้ใช้งาน")}</h3>
              <p>{t("กดแก้ไขเพื่อเปลี่ยนข้อมูลหรือบทบาท")}</p>
            </div>
            <Space>
              {embedded ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className={masterStyles.createButton}
                  onClick={() => {
                    setModalMode("create");
                    setEditingUser(null);
                    setModalOpen(true);
                  }}
                >
                  {t("เพิ่มผู้ใช้งาน")}
                </Button>
              ) : null}
              <div className={masterStyles.tableCount}>{t("{n} คน", { n: users.length })}</div>
            </Space>
          </div>

          {usersQuery.isError ? (
            <Typography.Text type="danger">
              {t("โหลดรายชื่อไม่สำเร็จ:")}{" "}
              {usersQuery.error instanceof Error
                ? usersQuery.error.message
                : t("เกิดข้อผิดพลาด")}
            </Typography.Text>
          ) : (
            <Table
              rowKey="id"
              className={masterStyles.dataTable}
              columns={columns}
              dataSource={users}
              loading={usersQuery.isLoading || usersQuery.isFetching}
              pagination={{
                current: page,
                pageSize,
                total: users.length,
                onChange: setPage,
                showSizeChanger: false,
              }}
            />
          )}
        </div>

        <UserFormModal
          open={modalOpen}
          mode={modalMode}
          initialUser={editingUser}
          roles={roles}
          confirmLoading={
            createMutation.isPending || updateMutation.isPending
          }
          onCancel={() => {
            setModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={(values) => {
            if (modalMode === "create") {
              createMutation.mutate(values as CreateUserRequest, {
                onSuccess: () => {
                  setModalOpen(false);
                  setEditingUser(null);
                },
              });
              return;
            }
            if (!editingUser) {
              return;
            }
            updateMutation.mutate(
              { id: editingUser.id, body: values as UpdateUserRequest },
              {
                onSuccess: () => {
                  setModalOpen(false);
                  setEditingUser(null);
                },
              },
            );
          }}
        />

        <ResetPasswordModal
          open={Boolean(resetUser)}
          username={resetUser?.username}
          confirmLoading={resetMutation.isPending}
          onCancel={() => setResetUser(null)}
          onSubmit={(newPassword) => {
            if (!resetUser) {
              return;
            }
            resetMutation.mutate(
              { id: resetUser.id, body: { newPassword } },
              { onSuccess: () => setResetUser(null) },
            );
          }}
        />
      </section>
    </MasterPageGate>
  );
}
