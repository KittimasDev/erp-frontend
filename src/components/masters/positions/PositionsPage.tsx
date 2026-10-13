"use client";

import { useState } from "react";
import { Button, Col, Form, Input, Row, Select, Space, Table, Tag, Typography } from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import RowActionsMenu from "@/components/common/RowActionsMenu";
import {
  useCreatePositionMutation,
  useDeletePositionMutation,
  useUpdatePositionMutation,
} from "@/hooks/positions/usePositionMutations";
import { usePositionsQuery } from "@/hooks/positions/usePositionsQuery";
import type {
  CreatePositionRequest,
  Position,
  PositionQueryParams,
} from "@/types/positions";

import PositionFormModal from "./PositionFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type FilterValues = { name?: string; isActive?: boolean | null };

/** แท็บ "ตำแหน่ง" ใต้ /users — ใช้สิทธิ์ USERS เดียวกับแผนก */
export default function PositionsPage() {
  const [form] = Form.useForm<FilterValues>();
  const [filters, setFilters] = useState<PositionQueryParams>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Position | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const positionsQuery = usePositionsQuery(filters);
  const createMutation = useCreatePositionMutation();
  const updateMutation = useUpdatePositionMutation();
  const deleteMutation = useDeletePositionMutation();

  const positions = positionsQuery.data?.data ?? [];
  const hasFilters = filters.name !== undefined || filters.isActive !== undefined;
  const activeCount = positions.filter((item) => item.isActive).length;

  const handleSearch = (values: FilterValues) => {
    setPage(1);
    setFilters({
      name: values.name?.trim() || undefined,
      isActive: values.isActive === true || values.isActive === false ? values.isActive : undefined,
    });
  };

  const handleClear = () => {
    form.resetFields();
    setPage(1);
    setFilters({});
  };

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (position: Position) => {
    setModalMode("edit");
    setEditing(position);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: CreatePositionRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: closeModal });
      return;
    }
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, body: values }, { onSuccess: closeModal });
  };

  const columns: ColumnsType<Position> = [
    {
      title: "ลำดับ",
      key: "rowNo",
      width: 90,
      align: "center",
      render: (_v, _r, index) => (
        <span className={styles.orderBadge}>{(page - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "code",
      key: "code",
      width: 160,
      render: (value: string) => <span className={styles.codeBadge}>{value}</span>,
    },
    {
      title: "ชื่อตำแหน่ง",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 140,
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
      title: "อัปเดตล่าสุด",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => (
        <span className={styles.updatedText}>
          {value ? new Date(value).toLocaleString("th-TH") : "-"}
        </span>
      ),
    },
    {
      title: "จัดการ",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={`เมนูจัดการ ${record.code}`}
          actions={[
            { key: "edit", icon: <EditOutlined />, label: "แก้ไข", onClick: () => openEdit(record) },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: "ลบ",
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: "ลบตำแหน่ง",
                content: `ต้องการลบ "${record.nameTh}" หรือไม่? (ลบไม่ได้ถ้ายังมีพนักงานใช้อยู่)`,
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
    <section className={styles.page}>
      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>{hasFilters ? "ผลค้นหา" : "ตำแหน่งทั้งหมด"}</span>
            <strong>{positions.length}</strong>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>สถานะใช้งาน</span>
            <strong>{activeCount}</strong>
          </div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>—</div>
          <div>
            <span className={styles.summaryLabel}>ปิดใช้งาน</span>
            <strong>{positions.length - activeCount}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาตำแหน่ง</h3>
            <p>กรองด้วยชื่อตำแหน่งและสถานะ</p>
          </div>
          {hasFilters ? (
            <Tag className={styles.filterActiveTag} color="success">
              กำลังกรอง
            </Tag>
          ) : null}
        </div>
        <Form form={form} layout="vertical" className={styles.filterForm} onFinish={handleSearch}>
          <Row gutter={[16, 4]}>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item name="name" label="ชื่อตำแหน่ง">
                <Input allowClear placeholder="เช่น ช่างเทคนิค" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item name="isActive" label="สถานะ">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "ใช้งาน" },
                    { value: false, label: "ปิดใช้งาน" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label=" " colon={false}>
                <Space wrap>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SearchOutlined />}
                    className={styles.filterSearchButton}
                  >
                    ค้นหา
                  </Button>
                  <Button icon={<ClearOutlined />} onClick={handleClear} disabled={!hasFilters}>
                    ล้างค่า
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableEyebrow}>POSITION MANAGEMENT</div>
            <h3>รายการตำแหน่ง</h3>
            <p>ตำแหน่งงานที่เลือกได้ในข้อมูลพนักงาน และใช้จัดกลุ่มในตัวจัดกะอัตโนมัติ</p>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={styles.createButton}
              onClick={openCreate}
            >
              เพิ่มตำแหน่ง
            </Button>
            <div className={styles.tableCount}>{positions.length} รายการ</div>
          </Space>
        </div>

        {positionsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {positionsQuery.error instanceof Error
                ? positionsQuery.error.message
                : "โหลดข้อมูลตำแหน่งไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={positions}
            loading={positionsQuery.isLoading || positionsQuery.isFetching}
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
            scroll={{ x: 810 }}
            locale={{
              emptyText: hasFilters ? "ไม่พบตำแหน่งตามเงื่อนไขที่ค้นหา" : "ยังไม่มีข้อมูลตำแหน่ง",
            }}
          />
        )}
      </div>

      <PositionFormModal
        open={modalOpen}
        mode={modalMode}
        initialPosition={editing}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
