"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Segmented, Select, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useCreateUnitConversionMutation } from "@/hooks/unit-conversions/useCreateUnitConversionMutation";
import { useDeleteUnitConversionMutation } from "@/hooks/unit-conversions/useDeleteUnitConversionMutation";
import { useUnitConversionsQuery } from "@/hooks/unit-conversions/useUnitConversionsQuery";
import { useUpdateUnitConversionMutation } from "@/hooks/unit-conversions/useUpdateUnitConversionMutation";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import type {
  CreateUnitConversionRequest,
  UnitConversion,
  UnitConversionScope,
} from "@/types/unit-conversions";

import UnitConversionFormModal from "./UnitConversionFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

function unitLabel(unit?: { code: string; nameTh: string } | null): string {
  if (!unit) {
    return "-";
  }
  return unit.nameTh ? `${unit.nameTh} (${unit.code})` : unit.code;
}

function formatFactor(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return Number(numeric.toFixed(6)).toString();
}

export default function UnitConversionsPage() {
  const searchParams = useSearchParams();
  const presetItemId = searchParams.get("itemId") ?? undefined;
  const presetUnitId = searchParams.get("unitId") ?? undefined;

  const [scope, setScope] = useState<UnitConversionScope>("ALL");
  const [itemFilter, setItemFilter] = useState<string | undefined>(presetItemId);
  const [unitFilter, setUnitFilter] = useState<string | undefined>(presetUnitId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<UnitConversion | null>(null);

  const conversionsQuery = useUnitConversionsQuery();
  const unitsQuery = useUnitsQuery({ isActive: true });
  const itemsQuery = useItemsQuery({ isActive: true });

  const { canAdd, canEdit, canDelete } = useScreenActionPermissions(
    "MASTERS_UNIT_CONVERSIONS",
  );

  const createMutation = useCreateUnitConversionMutation();
  const updateMutation = useUpdateUnitConversionMutation();
  const deleteMutation = useDeleteUnitConversionMutation();

  const conversions = useMemo(
    () => conversionsQuery.data?.data ?? [],
    [conversionsQuery.data],
  );
  const units = useMemo(() => unitsQuery.data?.data ?? [], [unitsQuery.data]);
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);

  const globalCount = conversions.filter((rule) => !rule.itemId).length;
  const itemCount = conversions.filter((rule) => rule.itemId).length;
  const inactiveCount = conversions.filter((rule) => !rule.isActive).length;

  // กรองฝั่ง client เพราะกฎแปลงหน่วยมีจำนวนน้อย และดึงมาทั้งชุดอยู่แล้ว
  const filtered = useMemo(
    () =>
      conversions.filter((rule) => {
        if (scope === "GLOBAL" && rule.itemId) {
          return false;
        }
        if (scope === "ITEM" && !rule.itemId) {
          return false;
        }
        if (itemFilter && rule.itemId !== itemFilter) {
          return false;
        }
        if (
          unitFilter &&
          rule.fromUnitId !== unitFilter &&
          rule.toUnitId !== unitFilter
        ) {
          return false;
        }
        return true;
      }),
    [conversions, scope, itemFilter, unitFilter],
  );

  const openCreateModal = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (rule: UnitConversion) => {
    setModalMode("edit");
    setEditing(rule);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: CreateUnitConversionRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: closeModal });
      return;
    }

    if (!editing) {
      return;
    }

    // itemId ย้ายข้ามสินค้าไม่ได้ จึงไม่ส่งไปกับ payload แก้ไข
    const { itemId: _itemId, ...body } = values;
    updateMutation.mutate({ id: editing.id, body }, { onSuccess: closeModal });
  };

  const columns: ColumnsType<UnitConversion> = [
    {
      title: "ขอบเขต",
      key: "scope",
      width: 220,
      render: (_, record) =>
        record.itemId ? (
          <div className={styles.nameCell}>
            <span>
              {record.item
                ? `${record.item.itemCode} — ${record.item.itemNameTh}`
                : "รายสินค้า"}
            </span>
          </div>
        ) : (
          <Tag className={styles.statusTag}>กฎกลาง</Tag>
        ),
    },
    {
      title: "จาก",
      key: "fromUnit",
      width: 180,
      render: (_, record) => unitLabel(record.fromUnit),
    },
    {
      title: "ตัวคูณ",
      key: "factor",
      width: 220,
      align: "center",
      render: (_, record) => (
        <span className={styles.codeBadge}>
          1 : {formatFactor(record.factor)}
        </span>
      ),
    },
    {
      title: "เป็น",
      key: "toUnit",
      width: 180,
      render: (_, record) => unitLabel(record.toUnit),
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      align: "center",
      render: (isActive: boolean) =>
        isActive ? (
          <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
            <span className={styles.statusDot} />
            ใช้งาน
          </Tag>
        ) : (
          <Tag className={`${styles.statusTag} ${styles.statusInactive}`}>
            <span className={styles.statusDot} />
            ปิดใช้งาน
          </Tag>
        ),
    },
    ...(canEdit || canDelete
      ? ([
          {
            title: "จัดการ",
            key: "actions",
            width: 100,
            align: "center" as const,
            render: (_: unknown, record: UnitConversion) => (
              <RowActionsMenu
                ariaLabel={`เมนูจัดการกฎ ${unitLabel(record.fromUnit)}`}
                actions={[
                  canEdit && {
                    key: "edit",
                    icon: <EditOutlined />,
                    label: "แก้ไข",
                    onClick: () => openEditModal(record),
                  },
                  canDelete && "divider",
                  canDelete && {
                    key: "delete",
                    icon: <DeleteOutlined />,
                    label: "ลบ",
                    danger: true,
                    onClick: () => deleteMutation.mutate(record.id),
                    confirm: {
                      title: "ลบกฎแปลงหน่วย",
                      content: `ต้องการลบกฎ ${unitLabel(record.fromUnit)} เป็น ${unitLabel(record.toUnit)} หรือไม่?`,
                      okText: "ลบ",
                      cancelText: "ยกเลิก",
                    },
                  },
                ]}
              />
            ),
          },
        ] satisfies ColumnsType<UnitConversion>)
      : []),
  ];

  return (
    <MasterPageGate isLoading={conversionsQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div />

          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>MASTER DATA</div>

            <Typography.Title level={2} className={styles.pageTitle}>
              กฎแปลงหน่วยนับ
            </Typography.Title>

            <Typography.Text className={styles.pageSubtitle}>
              ตั้งกฎให้กรอกเอกสารด้วยหน่วยอื่นได้
              แล้วระบบแปลงกลับเป็นหน่วยหลักของสินค้าก่อนตัดสต๊อก
            </Typography.Text>
          </div>

          {canAdd ? (
            <Button
              type="primary"
              size="large"
              className={styles.createButton}
              onClick={openCreateModal}
            >
              <span className={styles.plusIcon}>+</span>
              เพิ่มกฎแปลงหน่วย
            </Button>
          ) : (
            // pageHeader เป็น grid 3 คอลัมน์ — ต้องคง element ที่สามไว้ ไม่งั้น layout เบี้ยว
            <div />
          )}
        </div>

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>Σ</div>

            <div>
              <span className={styles.summaryLabel}>กฎทั้งหมด</span>
              <strong>{conversions.length}</strong>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
            <div className={styles.summaryIcon}>✓</div>

            <div>
              <span className={styles.summaryLabel}>กฎกลาง</span>
              <strong>{globalCount}</strong>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>#</div>

            <div>
              <span className={styles.summaryLabel}>กฎรายสินค้า</span>
              <strong>{itemCount}</strong>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
            <div className={styles.summaryIcon}>—</div>

            <div>
              <span className={styles.summaryLabel}>ปิดใช้งาน</span>
              <strong>{inactiveCount}</strong>
            </div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableEyebrow}>UNIT CONVERSION</div>

              <h3>รายการกฎแปลงหน่วย</h3>

              <p>
                กฎรายสินค้าจะทับกฎกลางคู่หน่วยเดียวกัน
                และทิศย้อนกลับระบบคำนวณให้เอง
              </p>
            </div>

            <div className={styles.tableCount}>{filtered.length} รายการ</div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              padding: "0 16px 16px",
            }}
          >
            <Segmented
              value={scope}
              onChange={(value) => setScope(value as UnitConversionScope)}
              options={[
                { label: "ทั้งหมด", value: "ALL" },
                { label: "กฎกลาง", value: "GLOBAL" },
                { label: "รายสินค้า", value: "ITEM" },
              ]}
            />

            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 260 }}
              placeholder="กรองตามสินค้า"
              value={itemFilter}
              onChange={setItemFilter}
              loading={itemsQuery.isLoading}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.itemCode} — ${item.itemNameTh}`,
              }))}
            />

            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 220 }}
              placeholder="กรองตามหน่วย"
              value={unitFilter}
              onChange={setUnitFilter}
              loading={unitsQuery.isLoading}
              options={units.map((unit) => ({
                value: unit.id,
                label: `${unit.code} — ${unit.nameTh}`,
              }))}
            />
          </div>

          {conversionsQuery.isError ? (
            <div className={styles.errorBox}>
              <Typography.Text type="danger">
                {conversionsQuery.error instanceof Error
                  ? conversionsQuery.error.message
                  : "โหลดข้อมูลกฎแปลงหน่วยไม่สำเร็จ"}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={filtered}
              loading={conversionsQuery.isLoading || conversionsQuery.isFetching}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 1030 }}
            />
          )}
        </div>

        <UnitConversionFormModal
          open={modalOpen}
          mode={modalMode}
          initialConversion={editing}
          existingConversions={conversions}
          defaultItemId={presetItemId}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      </section>
    </MasterPageGate>
  );
}
