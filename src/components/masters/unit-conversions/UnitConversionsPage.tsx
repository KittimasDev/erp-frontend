"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Segmented, Select, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
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
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

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
  const t = useT();
  const lang = useLanguage();
  const searchParams = useSearchParams();
  const presetItemId = searchParams.get("itemId") ?? undefined;
  const presetUnitId = searchParams.get("unitId") ?? undefined;

  const [scopeDraft, setScopeDraft] = useState<UnitConversionScope>("ALL");
  const [itemDraft, setItemDraft] = useState<string | undefined>(presetItemId);
  const [unitDraft, setUnitDraft] = useState<string | undefined>(presetUnitId);
  const [scope, setScope] = useState<UnitConversionScope>("ALL");
  const [itemFilter, setItemFilter] = useState<string | undefined>(presetItemId);
  const [unitFilter, setUnitFilter] = useState<string | undefined>(presetUnitId);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<UnitConversion | null>(null);
  const [page, setPage] = useState(1);

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

  const applyFilters = () => {
    setScope(scopeDraft);
    setItemFilter(itemDraft);
    setUnitFilter(unitDraft);
    setPage(1);
  };

  const clearFilters = () => {
    setScopeDraft("ALL");
    setItemDraft(undefined);
    setUnitDraft(undefined);
    setScope("ALL");
    setItemFilter(undefined);
    setUnitFilter(undefined);
    setPage(1);
  };

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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 10 + index + 1,
    },
    {
      title: t("ขอบเขต"),
      key: "scope",
      width: 220,
      render: (_, record) =>
        record.itemId ? (
          <div className={styles.nameCell}>
            <span>
              {record.item
                ? `${record.item.itemCode} — ${record.item.itemNameTh}`
                : t("รายสินค้า")}
            </span>
          </div>
        ) : (
          <Tag className={styles.statusTag}>{t("กฎกลาง")}</Tag>
        ),
    },
    {
      title: lang === "en" ? "From" : "จาก",
      key: "fromUnit",
      width: 180,
      render: (_, record) => unitLabel(record.fromUnit),
    },
    {
      title: t("ตัวคูณ"),
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
      title: lang === "en" ? "To" : "เป็น",
      key: "toUnit",
      width: 180,
      render: (_, record) => unitLabel(record.toUnit),
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
      align: "center",
      render: (isActive: boolean) =>
        isActive ? (
          <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
            <span className={styles.statusDot} />
            {t("ใช้งาน")}
          </Tag>
        ) : (
          <Tag className={`${styles.statusTag} ${styles.statusInactive}`}>
            <span className={styles.statusDot} />
            {t("ปิดใช้งาน")}
          </Tag>
        ),
    },
    ...(canEdit || canDelete
      ? ([
          {
            title: t("จัดการ"),
            key: "actions",
            width: 100,
            align: "center" as const,
            render: (_: unknown, record: UnitConversion) => (
              <RowActionsMenu
                ariaLabel={t("เมนูจัดการกฎ {name}", { name: unitLabel(record.fromUnit) })}
                actions={[
                  canEdit && {
                    key: "edit",
                    icon: <EditOutlined />,
                    label: t("แก้ไข"),
                    onClick: () => openEditModal(record),
                  },
                  canDelete && "divider",
                  canDelete && {
                    key: "delete",
                    icon: <DeleteOutlined />,
                    label: t("ลบ"),
                    danger: true,
                    onClick: () => deleteMutation.mutate(record.id),
                    confirm: {
                      title: t("ลบกฎแปลงหน่วย"),
                      content: t("ต้องการลบกฎ {from} เป็น {to} หรือไม่?", {
                        from: unitLabel(record.fromUnit),
                        to: unitLabel(record.toUnit),
                      }),
                      okText: t("ลบ"),
                      cancelText: t("ยกเลิก"),
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
        <PageHeader
          eyebrow="MASTER DATA"
          title={t("กฎแปลงหน่วยนับ")}
          subtitle={t("ตั้งกฎให้กรอกเอกสารด้วยหน่วยอื่นได้ แล้วระบบแปลงกลับเป็นหน่วยหลักของสินค้าก่อนตัดสต๊อก")}
          actions={
            <>
{canAdd ? (
            <Button
              type="primary"
              size="large"
              className={styles.createButton}
              onClick={openCreateModal}
            >
              <span className={styles.plusIcon}>+</span>
              {t("เพิ่มกฎแปลงหน่วย")}
            </Button>
          ) : (
            // pageHeader เป็น grid 3 คอลัมน์ — ต้องคง element ที่สามไว้ ไม่งั้น layout เบี้ยว
            <div />
          )}
            </>
          }
        />

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>Σ</div>

            <div>
              <span className={styles.summaryLabel}>{t("กฎทั้งหมด")}</span>
              <strong>{conversions.length}</strong>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
            <div className={styles.summaryIcon}>✓</div>

            <div>
              <span className={styles.summaryLabel}>{t("กฎกลาง")}</span>
              <strong>{globalCount}</strong>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>#</div>

            <div>
              <span className={styles.summaryLabel}>{t("กฎรายสินค้า")}</span>
              <strong>{itemCount}</strong>
            </div>
          </div>

          <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
            <div className={styles.summaryIcon}>—</div>

            <div>
              <span className={styles.summaryLabel}>{t("ปิดใช้งาน")}</span>
              <strong>{inactiveCount}</strong>
            </div>
          </div>
        </div>

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={conversionsQuery.isFetching}>
          <FilterField label={t("ขอบเขต")}>
            <Segmented
              value={scopeDraft}
              onChange={(value) => setScopeDraft(value as UnitConversionScope)}
              options={[
                { label: t("ทั้งหมด"), value: "ALL" },
                { label: t("กฎกลาง"), value: "GLOBAL" },
                { label: t("รายสินค้า"), value: "ITEM" },
              ]}
            />
          </FilterField>
          <FilterField label={t("กรองตามสินค้า")}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              placeholder={t("กรองตามสินค้า")}
              value={itemDraft}
              onChange={setItemDraft}
              loading={itemsQuery.isLoading}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.itemCode} — ${item.itemNameTh}`,
              }))}
            />
          </FilterField>
          <FilterField label={t("กรองตามหน่วย")}>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: "100%" }}
              placeholder={t("กรองตามหน่วย")}
              value={unitDraft}
              onChange={setUnitDraft}
              loading={unitsQuery.isLoading}
              options={units.map((unit) => ({
                value: unit.id,
                label: `${unit.code} — ${unit.nameTh}`,
              }))}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableEyebrow}>UNIT CONVERSION</div>

              <h3>{t("รายการกฎแปลงหน่วย")}</h3>

              <p>
                {t("กฎรายสินค้าจะทับกฎกลางคู่หน่วยเดียวกัน และทิศย้อนกลับระบบคำนวณให้เอง")}
              </p>
            </div>

            <div className={styles.tableCount}>{t("{n} รายการ", { n: filtered.length })}</div>
          </div>

          {conversionsQuery.isError ? (
            <div className={styles.errorBox}>
              <Typography.Text type="danger">
                {conversionsQuery.error instanceof Error
                  ? conversionsQuery.error.message
                  : t("โหลดข้อมูลกฎแปลงหน่วยไม่สำเร็จ")}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={filtered}
              loading={conversionsQuery.isLoading || conversionsQuery.isFetching}
              pagination={{ current: page, pageSize: 10, onChange: setPage, showSizeChanger: false }}
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
