"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import RoleFormModal from "@/components/permissions/RoleFormModal";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
} from "@/hooks/users/useRoleMutations";
import { useRolesQuery } from "@/hooks/users/useRolesQuery";
import type { Role } from "@/types/users";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type RolesPageProps = {
  embedded?: boolean;
};

export default function RolesPage({ embedded = false }: RolesPageProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const rolesQuery = useRolesQuery();
  const createMutation = useCreateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const roles = rolesQuery.data?.data ?? [];
  const customCount = useMemo(
    () => roles.filter((role) => !role.isSystemRole).length,
    [roles],
  );
  const systemCount = roles.length - customCount;

  const columns: ColumnsType<Role> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: "รหัส",
      dataIndex: "roleCode",
      key: "roleCode",
      width: 260,
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: "ชื่อบทบาท",
      dataIndex: "roleName",
      key: "roleName",
    },
    {
      title: "คำอธิบาย",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value?: string) => value?.trim() || "—",
    },
    {
      title: "ประเภท",
      key: "type",
      width: 120,
      render: (_, record) =>
        record.isSystemRole ? (
          <Tag color="blue">ระบบ</Tag>
        ) : (
          <Tag color="green">กำหนดเอง</Tag>
        ),
    },
    {
      title: "จัดการ",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={`เมนูจัดการบทบาท ${record.roleName}`}
          actions={[
            {
              key: "permissions",
              icon: <SafetyCertificateOutlined />,
              label: "ตั้งสิทธิ์",
              onClick: () =>
                router.push(`/users?tab=permissions&roleId=${record.id}`),
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: "ลบบทบาท",
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: "ลบบทบาทนี้?",
                content: record.isSystemRole
                  ? "บทบาทนี้เคยเป็นของระบบ — ลบแล้วจะไม่ถูกสร้างกลับตอน restart (ต้องไม่มีผู้ใช้ผูก)"
                  : "ลบได้เฉพาะบทบาทที่ยังไม่มีผู้ใช้ผูกอยู่",
                okText: "ลบ",
                cancelText: "ยกเลิก",
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={!embedded && rolesQuery.isLoading}>
      <section className={masterStyles.page}>
        {!embedded ? (
          <PageHeader
            eyebrow="SECURITY · ROLES"
            icon={<SafetyCertificateOutlined />}
            title="บทบาทผู้ใช้งาน"
            subtitle="สร้างบทบาท (Role) เพื่อกำหนดสิทธิ์ — ไม่ใช่แผนกองค์กร"
            actions={
              <>
<Button
              type="primary"
              size="large"
              className={masterStyles.createButton}
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              เพิ่มบทบาท
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
              <span className={masterStyles.summaryLabel}>บทบาททั้งหมด</span>
              <strong>{roles.length}</strong>
            </div>
          </div>
          <div
            className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}
          >
            <div className={masterStyles.summaryIcon}>✓</div>
            <div>
              <span className={masterStyles.summaryLabel}>มาตรฐานระบบ</span>
              <strong>{systemCount}</strong>
            </div>
          </div>
          <div
            className={`${masterStyles.summaryCard} ${masterStyles.summaryInactive}`}
          >
            <div className={masterStyles.summaryIcon}>+</div>
            <div>
              <span className={masterStyles.summaryLabel}>กำหนดเอง</span>
              <strong>{customCount}</strong>
            </div>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>ROLE CATALOG</div>
              <h3>รายการบทบาท</h3>
              <p>
                ใช้เลือกตอนสร้าง/แก้ไขผู้ใช้งาน — แผนกอยู่แท็บอื่น ไม่ใช่บทบาท
              </p>
            </div>
            <Space>
              {embedded ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className={masterStyles.createButton}
                  onClick={() => setModalOpen(true)}
                >
                  เพิ่มบทบาท
                </Button>
              ) : null}
              <div className={masterStyles.tableCount}>
                {roles.length} รายการ
              </div>
            </Space>
          </div>

          {rolesQuery.isError ? (
            <div className={masterStyles.errorBox}>
              <Typography.Text type="danger">
                {rolesQuery.error instanceof Error
                  ? rolesQuery.error.message
                  : "โหลดบทบาทไม่สำเร็จ"}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={masterStyles.dataTable}
              columns={columns}
              dataSource={roles}
              loading={rolesQuery.isLoading || rolesQuery.isFetching}
              pagination={{
                current: page,
                pageSize,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100],
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                onChange: (nextPage, nextSize) => {
                  setPage(nextPage);
                  if (nextSize && nextSize !== pageSize) {
                    setPageSize(nextSize);
                    setPage(1);
                  }
                },
              }}
              scroll={{ x: 780 }}
              locale={{ emptyText: "ยังไม่มีบทบาท" }}
            />
          )}
        </div>

        <RoleFormModal
          open={modalOpen}
          confirmLoading={createMutation.isPending}
          onCancel={() => setModalOpen(false)}
          onSubmit={(values) => {
            createMutation.mutate(values, {
              onSuccess: () => setModalOpen(false),
            });
          }}
        />
      </section>
    </MasterPageGate>
  );
}
