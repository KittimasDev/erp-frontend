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
import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import {
  useCreateSectionMutation,
  useDeleteSectionMutation,
  useUpdateSectionMutation,
} from "@/hooks/sections/useSectionMutations";
import { useSectionsQuery } from "@/hooks/sections/useSectionsQuery";
import type {
  CreateSectionRequest,
  Section,
  SectionQueryParams,
} from "@/types/sections";

import SectionFormModal from "./SectionFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type FilterValues = { name?: string; departmentId?: string; isActive?: boolean | null };

/** แท็บ "แผนกย่อย" ใต้ /users — ใช้สิทธิ์ USERS เดียวกับแผนก */
export default function SectionsPage() {
  const [form] = Form.useForm<FilterValues>();
  const [filters, setFilters] = useState<SectionQueryParams>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Section | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const departmentsQuery = useDepartmentsQuery({ isActive: true });
  const sectionsQuery = useSectionsQuery(filters);
  const createMutation = useCreateSectionMutation();
  const updateMutation = useUpdateSectionMutation();
  const deleteMutation = useDeleteSectionMutation();

  const departments = departmentsQuery.data?.data ?? [];
  const sections = sectionsQuery.data?.data ?? [];
  const hasFilters =
    filters.name !== undefined ||
    filters.departmentId !== undefined ||
    filters.isActive !== undefined;
  const activeCount = sections.filter((item) => item.isActive).length;

  const handleSearch = (values: FilterValues) => {
    setPage(1);
    setFilters({
      name: values.name?.trim() || undefined,
      departmentId: values.departmentId || undefined,
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

  const openEdit = (section: Section) => {
    setModalMode("edit");
    setEditing(section);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: CreateSectionRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: closeModal });
      return;
    }
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, body: values }, { onSuccess: closeModal });
  };

  const columns: ColumnsType<Section> = [
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
      title: "ชื่อแผนกย่อย",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "แผนก",
      dataIndex: "departmentName",
      key: "departmentName",
      width: 220,
      render: (value?: string) => value || "—",
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
                title: "ลบแผนกย่อย",
                content: `ต้องการลบ "${record.nameTh}" หรือไม่? (ลบไม่ได้ถ้ายังมีพนักงานสังกัดอยู่)`,
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
            <span className={styles.summaryLabel}>{hasFilters ? "ผลค้นหา" : "แผนกย่อยทั้งหมด"}</span>
            <strong>{sections.length}</strong>
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
            <strong>{sections.length - activeCount}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาแผนกย่อย</h3>
            <p>กรองด้วยชื่อ แผนก และสถานะ</p>
          </div>
          {hasFilters ? (
            <Tag className={styles.filterActiveTag} color="success">
              กำลังกรอง
            </Tag>
          ) : null}
        </div>
        <Form form={form} layout="vertical" className={styles.filterForm} onFinish={handleSearch}>
          <Row gutter={[16, 4]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="name" label="ชื่อแผนกย่อย">
                <Input allowClear placeholder="เช่น ส่วนเตรียมยาง" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="departmentId" label="แผนก">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  options={departments.map((dept) => ({
                    value: dept.id,
                    label: `${dept.code} — ${dept.nameTh}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
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
            <div className={styles.tableEyebrow}>SECTION MANAGEMENT</div>
            <h3>รายการแผนกย่อย</h3>
            <p>แผนกย่อยภายใต้แต่ละแผนก เลือกได้ในข้อมูลพนักงาน</p>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className={styles.createButton}
              onClick={openCreate}
            >
              เพิ่มแผนกย่อย
            </Button>
            <div className={styles.tableCount}>{sections.length} รายการ</div>
          </Space>
        </div>

        {sectionsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {sectionsQuery.error instanceof Error
                ? sectionsQuery.error.message
                : "โหลดข้อมูลแผนกย่อยไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={sections}
            loading={sectionsQuery.isLoading || sectionsQuery.isFetching}
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
              emptyText: hasFilters ? "ไม่พบแผนกย่อยตามเงื่อนไขที่ค้นหา" : "ยังไม่มีข้อมูลแผนกย่อย",
            }}
          />
        )}
      </div>

      <SectionFormModal
        open={modalOpen}
        mode={modalMode}
        initialSection={editing}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
