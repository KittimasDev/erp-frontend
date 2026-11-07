"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useCreateUnitMutation } from "@/hooks/units/useCreateUnitMutation";
import { useDeleteUnitMutation } from "@/hooks/units/useDeleteUnitMutation";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useUpdateUnitMutation } from "@/hooks/units/useUpdateUnitMutation";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import type { CreateUnitRequest, Unit } from "@/types/units";

import UnitFormModal from "./UnitFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

export default function UnitsPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState<
    "create" | "edit"
  >("create");

  const [editingUnit, setEditingUnit] =
    useState<Unit | null>(null);

  const unitsQuery = useUnitsQuery();
  const createMutation = useCreateUnitMutation();
  const updateMutation = useUpdateUnitMutation();
  const deleteMutation = useDeleteUnitMutation();

  const units = unitsQuery.data?.data ?? [];

  const activeUnits = units.filter(
    (unit) => unit.isActive,
  ).length;

  const inactiveUnits = units.filter(
    (unit) => !unit.isActive,
  ).length;

  const openCreateModal = () => {
    setModalMode("create");
    setEditingUnit(null);
    setModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setModalMode("edit");
    setEditingUnit(unit);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUnit(null);
  };

  const handleSubmit = (
    values: CreateUnitRequest,
  ) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });

      return;
    }

    if (!editingUnit) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingUnit.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<Unit> = [
    {
      title: t("ลำดับ"),
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 90,
      align: "center",
      render: (value: number) => (
        <span className={styles.orderBadge}>
          {value}
        </span>
      ),
    },
    {
      title: t("รหัส"),
      dataIndex: "code",
      key: "code",
      width: 130,
      render: (value: string) => (
        <span className={styles.codeBadge}>
          {value}
        </span>
      ),
    },
    {
      title: t("ชื่อหน่วยนับ"),
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.nameCell}>
          {/* <span className={styles.unitIcon}>
            U
          </span> */}

          <span>{value}</span>
        </div>
      ),
    },
    {
      title: t("สัญลักษณ์"),
      dataIndex: "nameEn",
      key: "nameEn",
      render: (value?: string) => (
        <span className={styles.symbolText}>
          {value || "-"}
        </span>
      ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      align: "center",
      render: (isActive: boolean) =>
        isActive ? (
          <Tag
            className={`${styles.statusTag} ${styles.statusActive}`}
          >
            <span className={styles.statusDot} />
            {t("ใช้งาน")}
          </Tag>
        ) : (
          <Tag
            className={`${styles.statusTag} ${styles.statusInactive}`}
          >
            <span className={styles.statusDot} />
            {t("ปิดใช้งาน")}
          </Tag>
        ),
    },
    {
      title: t("อัปเดตล่าสุด"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 190,
      render: (value: string) => (
        <span className={styles.updatedText}>
          {value
            ? new Date(value).toLocaleString(
                lang === "en" ? "en-GB" : "th-TH",
              )
            : "-"}
        </span>
      ),
    },
    {
      title: t("จัดการ"),
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={t("เมนูจัดการ {code}", { code: record.code })}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: t("แก้ไข"),
              onClick: () => openEditModal(record),
            },
            canAccessScreen("MASTERS_UNIT_CONVERSIONS") && {
              key: "unit-conversions",
              icon: <SwapOutlined />,
              label: t("กฎแปลงหน่วย"),
              onClick: () =>
                router.push(`/masters/unit-conversions?unitId=${record.id}`),
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: t("ลบ"),
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: t("ลบหน่วยนับ"),
                content: t("ต้องการลบ \"{code}\" หรือไม่?", { code: record.code }),
                okText: t("ลบ"),
                cancelText: t("ยกเลิก"),
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={unitsQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title={t("หน่วยนับ")}
        subtitle={t("จัดการข้อมูลหน่วยนับสำหรับระบบจัดซื้อ และคลังสินค้า")}
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          onClick={openCreateModal}
        >
          <span className={styles.plusIcon}>
            +
          </span>

          {t("เพิ่มหน่วยนับ")}
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div
          className={`${styles.summaryCard} ${styles.summaryTotal}`}
        >
          <div className={styles.summaryIcon}>
            Σ
          </div>

          <div>
            <span className={styles.summaryLabel}>
              {t("หน่วยนับทั้งหมด")}
            </span>

            <strong>{units.length}</strong>
          </div>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.summaryActive}`}
        >
          <div className={styles.summaryIcon}>
            ✓
          </div>

          <div>
            <span className={styles.summaryLabel}>
              {t("สถานะใช้งาน")}
            </span>

            <strong>{activeUnits}</strong>
          </div>
        </div>

        <div
          className={`${styles.summaryCard} ${styles.summaryInactive}`}
        >
          <div className={styles.summaryIcon}>
            —
          </div>

          <div>
            <span className={styles.summaryLabel}>
              {t("ปิดใช้งาน")}
            </span>

            <strong>{inactiveUnits}</strong>
          </div>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableEyebrow}>
              UNIT MANAGEMENT
            </div>

            <h3>{t("รายการหน่วยนับ")}</h3>

            <p>
              {t("ข้อมูลหน่วยนับทั้งหมดที่ใช้ภายในระบบ")}
            </p>
          </div>

          <div className={styles.tableCount}>
            {t("{n} รายการ", { n: units.length })}
          </div>
        </div>

        {unitsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {unitsQuery.error instanceof Error
                ? unitsQuery.error.message
                : t("โหลดข้อมูลหน่วยนับไม่สำเร็จ")}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={units}
            loading={
              unitsQuery.isLoading ||
              unitsQuery.isFetching
            }
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
            }}
            scroll={{
              x: 890,
            }}
          />
        )}
      </div>

      <UnitFormModal
        open={modalOpen}
        mode={modalMode}
        initialUnit={editingUnit}
        confirmLoading={
          createMutation.isPending ||
          updateMutation.isPending
        }
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
      </section>
    </MasterPageGate>
  );
}