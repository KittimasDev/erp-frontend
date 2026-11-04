"use client";

import { useMemo, useState } from "react";
import { Button, Col, Input, Row, Select, Space, Table, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

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

function behaviorTags(type: WarehouseTypeMaster) {
  const tags: { key: string; label: string; color: string }[] = [];
  tags.push(
    type.isSellable
      ? { key: "sell", label: "ขาย/เบิกได้", color: "green" }
      : { key: "sell", label: "ห้ามขาย/เบิก", color: "red" },
  );
  if (type.receiveAsOnHold) {
    tags.push({ key: "hold", label: "รับเข้าเป็นของพัก", color: "orange" });
  }
  if (type.isReturnInspection) {
    tags.push({ key: "insp", label: "รอตรวจของคืน", color: "gold" });
  }
  if (type.isReturnGoodTarget) {
    tags.push({ key: "good", label: "ปลายทางของดี", color: "cyan" });
  }
  if (type.isReturnRejectTarget) {
    tags.push({ key: "rej", label: "ปลายทางของเสีย", color: "volcano" });
  }
  const scope = MENU_SCOPE_OPTIONS.find((o) => o.value === type.menuScope);
  if (scope) {
    tags.push({ key: "scope", label: scope.label, color: "blue" });
  }
  return tags;
}

export default function WarehouseTypesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<boolean | undefined>(undefined);
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
      title: "ลำดับ",
      key: "order",
      width: 80,
      align: "center",
      render: (_, record, index) => positionById.get(record.id) ?? index + 1,
    },
    {
      title: "รหัส",
      dataIndex: "code",
      key: "code",
      width: 170,
      render: (value: string, record) => (
        <Space size={4} wrap>
          <span className={styles.codeBadge}>{value}</span>
          {record.isSystem ? <Tag>ระบบ</Tag> : null}
        </Space>
      ),
    },
    {
      title: "ชื่อประเภท",
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
      title: "พฤติกรรมสต๊อก",
      key: "behavior",
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {behaviorTags(record).map((tag) => (
            <Tag key={tag.key} color={tag.color}>
              {tag.label}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "คลังที่ใช้",
      dataIndex: "warehouseCount",
      key: "warehouseCount",
      width: 110,
      align: "center",
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
    {
      title: "จัดการ",
      key: "actions",
      width: 90,
      align: "center",
      render: (_, record) => {
        const deleteBlocked = record.isSystem
          ? "ประเภทของระบบลบไม่ได้ ปิดใช้งานแทน"
          : record.warehouseCount > 0
            ? `มีคลัง ${record.warehouseCount} แห่งใช้อยู่`
            : undefined;
        return (
          <RowActionsMenu
            ariaLabel={`เมนูจัดการ ${record.code}`}
            actions={[
              {
                key: "edit",
                icon: <EditOutlined />,
                label: "แก้ไข",
                onClick: () => openEdit(record),
              },
              "divider",
              {
                key: "delete",
                icon: <DeleteOutlined />,
                label: "ลบ",
                danger: true,
                disabled: !!deleteBlocked,
                disabledReason: deleteBlocked,
                onClick: () => deleteMutation.mutate(record.id),
                confirm: {
                  title: "ลบประเภทคลัง",
                  content: `ต้องการลบ "${record.code}" หรือไม่?`,
                  okText: "ลบ",
                  cancelText: "ยกเลิก",
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
          title="ประเภทคลัง"
          subtitle="ตั้งชื่อและพฤติกรรมของคลังแต่ละประเภท — ขายได้ไหม รับของเข้าเป็นของพักไหม ใช้รับของคืนแบบไหน และขึ้นในเมนูกลุ่มไหน"
          actions={
            <>
<Button
            type="primary"
            size="large"
            className={styles.createButton}
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            เพิ่มประเภท
          </Button>
            </>
          }
        />

        <div className={styles.filterCard}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={16} lg={10}>
              <Input
                allowClear
                placeholder="ค้นหารหัสหรือชื่อ"
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={8} lg={6}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="สถานะทั้งหมด"
                value={status}
                onChange={(value) => setStatus(value)}
                options={[
                  { value: true, label: "ใช้งาน" },
                  { value: false, label: "ปิดใช้งาน" },
                ]}
              />
            </Col>
          </Row>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <div className={styles.tableEyebrow}>WAREHOUSE TYPES</div>
              <h3>รายการประเภทคลัง</h3>
              <p>ประเภทที่มีคลังใช้อยู่แก้ชื่อและธงได้ แต่แก้รหัส/ลบ/ปิดไม่ได้</p>
            </div>
            <div className={styles.tableCount}>{items.length} รายการ</div>
          </div>

          {listQuery.isError ? (
            <div className={styles.errorBox}>
              <Typography.Text type="danger">
                {listQuery.error instanceof Error
                  ? listQuery.error.message
                  : "โหลดข้อมูลประเภทคลังไม่สำเร็จ"}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={items}
              loading={listQuery.isFetching}
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 1040 }}
              locale={{ emptyText: "ไม่พบประเภทคลัง" }}
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
