"use client";
import { useT, type TFunction } from "@/lib/i18n/useT";

import { useMemo, useState } from "react";
import { Button, Input, Select, Space, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import {
  useCreateWarehouseTypeMutation,
  useDeleteWarehouseTypeMutation,
  useUpdateWarehouseTypeMutation,
} from "@/hooks/warehouse-types/useWarehouseTypeMutations";
import { useWarehouseTypesQuery } from "@/hooks/warehouse-types/useWarehouseTypesQuery";
import type {
  CreateWarehouseTypeRequest,
  WarehouseTypeMaster,
} from "@/types/warehouse-types";
import styles from "@/components/masters/shared/master-page.module.css";

import WarehouseTypeFormModal, { MENU_SCOPE_OPTIONS } from "./WarehouseTypeFormModal";
import PageHeader from "@/components/common/PageHeader";

function behaviorTags(type: WarehouseTypeMaster, t: TFunction) {
  const tags: { key: string; label: string; color: string }[] = [];
  tags.push(
    type.isSellable
      ? { key: "sell", label: t("ขาย/เบิกได้"), color: "green" }
      : { key: "sell", label: t("ห้ามขาย/เบิก"), color: "red" },
  );
  if (type.receiveAsOnHold) {
    tags.push({ key: "hold", label: t("รับเข้าเป็นของพัก"), color: "orange" });
  }
  if (type.isReturnInspection) {
    tags.push({ key: "insp", label: t("รอตรวจของคืน"), color: "gold" });
  }
  if (type.isReturnGoodTarget) {
    tags.push({ key: "good", label: t("ปลายทางของดี"), color: "cyan" });
  }
  if (type.isReturnRejectTarget) {
    tags.push({ key: "rej", label: t("ปลายทางของเสีย"), color: "volcano" });
  }
  const scope = MENU_SCOPE_OPTIONS.find((o) => o.value === type.menuScope);
  if (scope) {
    tags.push({ key: "scope", label: t(scope.label), color: "blue" });
  }
  return tags;
}

export default function WarehouseTypesPage() {
  const t = useT();
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState<boolean | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const applyFilters = () => {
    setSearch(draftSearch);
    setStatus(draftStatus);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftSearch("");
    setDraftStatus(undefined);
    setSearch("");
    setStatus(undefined);
    setPage(1);
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseTypeMaster | null>(null);

  const listQuery = useWarehouseTypesQuery();
  const createMutation = useCreateWarehouseTypeMutation();
  const updateMutation = useUpdateWarehouseTypeMutation();
  const deleteMutation = useDeleteWarehouseTypeMutation();
  const allItems = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (status !== undefined && item.isActive !== status) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
      );
    });
  }, [allItems, search, status]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (item: WarehouseTypeMaster) => {
    setEditing(item);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const positionById = useMemo(
    () => new Map(allItems.map((item, index) => [item.id, index + 1])),
    [allItems],
  );
  const handleSubmit = (values: CreateWarehouseTypeRequest) => {
    if (!editing) {
      createMutation.mutate(values, { onSuccess: closeModal });
      return;
    }
    updateMutation.mutate({ id: editing.id, body: values }, { onSuccess: closeModal });
  };

  const columns: ColumnsType<WarehouseTypeMaster> = [
    {
      title: t("ลำดับ"),
      key: "order",
      width: 80,
      align: "center",
      render: (_, record, index) => positionById.get(record.id) ?? index + 1,
    },
    {
      title: t("รหัส"),
      dataIndex: "code",
      key: "code",
      width: 170,
      render: (value: string, record) => (
        <Space size={4} wrap>
          <span className={styles.codeBadge}>{value}</span>
          {record.isSystem ? <Tag>{t("ระบบ")}</Tag> : null}
        </Space>
      ),
    },
    {
      title: t("ชื่อประเภท"),
      dataIndex: "name",
      key: "name",
      render: (value: string, record) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
          {record.description ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: t("พฤติกรรมสต๊อก"),
      key: "behavior",
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {behaviorTags(record, t).map((tag) => (
            <Tag key={tag.key} color={tag.color}>
              {tag.label}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t("คลังที่ใช้"),
      dataIndex: "warehouseCount",
      key: "warehouseCount",
      width: 110,
      align: "center",
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
    {
      title: t("จัดการ"),
      key: "actions",
      width: 90,
      align: "center",
      render: (_, record) => {
        const deleteBlocked = record.isSystem
          ? t("ประเภทของระบบลบไม่ได้ ปิดใช้งานแทน")
          : record.warehouseCount > 0
            ? t("มีคลัง {n} แห่งใช้อยู่", { n: record.warehouseCount })
            : undefined;
        return (
          <RowActionsMenu
            ariaLabel={t("เมนูจัดการ {code}", { code: record.code })}
            actions={[
              {
                key: "edit",
                icon: <EditOutlined />,
                label: t("แก้ไข"),
                onClick: () => openEdit(record),
              },
              "divider",
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: t("ลบ"),
                danger: true,
                disabled: !!deleteBlocked,
                disabledReason: deleteBlocked,
                onClick: () => deleteMutation.mutate(record.id),
                confirm: {
                  title: t("ลบประเภทคลัง"),
                  content: t("ต้องการลบ \"{code}\" หรือไม่?", { code: record.code }),
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
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MASTER DATA"
          title={t("ประเภทคลัง")}
          subtitle={t("ตั้งชื่อและพฤติกรรมของคลังแต่ละประเภท — ขายได้ไหม รับของเข้าเป็นของพักไหม ใช้รับของคืนแบบไหน และขึ้นในเมนูกลุ่มไหน")}
          actions={
            <>
<Button
            type="primary"
            size="large"
            className={styles.createButton}
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            {t("เพิ่มประเภท")}
          </Button>
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={listQuery.isFetching}>
          <FilterField label={t("ค้นหา")}>
            <Input
              allowClear
              placeholder={t("ค้นหารหัสหรือชื่อ")}
              prefix={<SearchOutlined />}
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
          </FilterField>
          <FilterField label={t("สถานะ")}>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={t("สถานะทั้งหมด")}
              value={draftStatus}
              onChange={(value) => setDraftStatus(value)}
              options={[
                { value: true, label: t("ใช้งาน") },
                { value: false, label: t("ปิดใช้งาน") },
              ]}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableEyebrow}>WAREHOUSE TYPES</div>
              <h3>{t("รายการประเภทคลัง")}</h3>
              <p>{t("ประเภทที่มีคลังใช้อยู่แก้ชื่อและธงได้ แต่แก้รหัส/ลบ/ปิดไม่ได้")}</p>
            </div>
            <div className={styles.tableCount}>{t("{n} รายการ", { n: items.length })}</div>
          </div>

          {listQuery.isError ? (
            <div className={styles.errorBox}>
              <Typography.Text type="danger">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : t("โหลดข้อมูลประเภทคลังไม่สำเร็จ")}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={items}
              loading={listQuery.isFetching}
              pagination={{ current: page, onChange: setPage, pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 1040 }}
              locale={{ emptyText: t("ไม่พบประเภทคลัง") }}
            />
          )}
        </div>

        <WarehouseTypeFormModal
          open={modalOpen}
          mode={editing ? "edit" : "create"}
          initialValue={editing}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      </section>
    </MasterPageGate>
  );
}
