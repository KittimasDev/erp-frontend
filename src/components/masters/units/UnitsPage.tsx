"use client";

import { useState } from "react";
import {
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateUnitMutation } from "@/hooks/units/useCreateUnitMutation";
import { useDeleteUnitMutation } from "@/hooks/units/useDeleteUnitMutation";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useUpdateUnitMutation } from "@/hooks/units/useUpdateUnitMutation";
import type { CreateUnitRequest, Unit } from "@/types/units";

import UnitFormModal from "./UnitFormModal";
import styles from "./UnitFormModal.module.css";

export default function UnitsPage() {
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
      title: "ลำดับ",
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
      title: "รหัส",
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
      title: "ชื่อหน่วยนับ",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.unitNameCell}>
          {/* <span className={styles.unitIcon}>
            U
          </span> */}

          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "สัญลักษณ์",
      dataIndex: "nameEn",
      key: "nameEn",
      render: (value?: string) => (
        <span className={styles.symbolText}>
          {value || "-"}
        </span>
      ),
    },
    {
      title: "สถานะ",
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
            ใช้งาน
          </Tag>
        ) : (
          <Tag
            className={`${styles.statusTag} ${styles.statusInactive}`}
          >
            <span className={styles.statusDot} />
            ปิดใช้งาน
          </Tag>
        ),
    },
    {
      title: "อัปเดตล่าสุด",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 190,
      render: (value: string) => (
        <span className={styles.updatedText}>
          {value
            ? new Date(value).toLocaleString(
                "th-TH",
              )
            : "-"}
        </span>
      ),
    },
    {
      title: "จัดการ",
      key: "actions",
      width: 190,
      align: "center",
      render: (_, record) => (
        <Space size={8}>
          <Button
            className={styles.editButton}
            onClick={() =>
              openEditModal(record)
            }
          >
            แก้ไข
          </Button>

          <Popconfirm
            title="ลบหน่วยนับ"
            description={`ต้องการลบ "${record.code}" หรือไม่?`}
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() =>
              deleteMutation.mutate(record.id)
            }
          >
            <Button
              className={styles.deleteButton}
              loading={
                deleteMutation.isPending
              }
            >
              ลบ
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={unitsQuery.isLoading}>
      <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          {/* <span>U</span> */}
        </div>

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>
            MASTER DATA
          </div>

          <Typography.Title
            level={2}
            className={styles.pageTitle}
          >
            หน่วยนับ
          </Typography.Title>

          <Typography.Text
            className={styles.pageSubtitle}
          >
            จัดการข้อมูลหน่วยนับสำหรับระบบจัดซื้อ
            และคลังสินค้า
          </Typography.Text>
        </div>

        <Button
          type="primary"
          size="large"
          className={styles.createButton}
          onClick={openCreateModal}
        >
          <span className={styles.plusIcon}>
            +
          </span>

          เพิ่มหน่วยนับ
        </Button>
      </div>

      <div className={styles.summaryRow}>
        <div
          className={`${styles.summaryCard} ${styles.summaryTotal}`}
        >
          <div className={styles.summaryIcon}>
            Σ
          </div>

          <div>
            <span className={styles.summaryLabel}>
              หน่วยนับทั้งหมด
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
              สถานะใช้งาน
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
              ปิดใช้งาน
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

            <h3>รายการหน่วยนับ</h3>

            <p>
              ข้อมูลหน่วยนับทั้งหมดที่ใช้ภายในระบบ
            </p>
          </div>

          <div className={styles.tableCount}>
            {units.length} รายการ
          </div>
        </div>

        {unitsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {unitsQuery.error instanceof Error
                ? unitsQuery.error.message
                : "โหลดข้อมูลหน่วยนับไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.unitTable}
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
              x: 980,
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