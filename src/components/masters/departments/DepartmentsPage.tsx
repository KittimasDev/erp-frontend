"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Col,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ClearOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateDepartmentMutation } from "@/hooks/departments/useCreateDepartmentMutation";
import { useDeleteDepartmentMutation } from "@/hooks/departments/useDeleteDepartmentMutation";
import { useDepartmentsQuery } from "@/hooks/departments/useDepartmentsQuery";
import { useUpdateDepartmentMutation } from "@/hooks/departments/useUpdateDepartmentMutation";
import type {
  CreateDepartmentRequest,
  Department,
  DepartmentQueryParams,
} from "@/types/departments";

import DepartmentFormModal from "./DepartmentFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type DepartmentFilterFormValues = {
  code?: string;
  name?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["code", "name", "isActive"] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): DepartmentQueryParams {
  const params: DepartmentQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  return params;
}

function toFormValues(
  params: DepartmentQueryParams,
): DepartmentFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: DepartmentFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

type DepartmentsPageProps = {
  /** When true, hide page chrome (used as tab under /users) */
  embedded?: boolean;
};

export default function DepartmentsPage({
  embedded = false,
}: DepartmentsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<DepartmentFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDepartment, setEditingDepartment] =
    useState<Department | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filters = useMemo(
    () => parseFiltersFromSearch(searchParams),
    [searchParams],
  );

  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  useEffect(() => {
    form.setFieldsValue(toFormValues(filters));
    setPage(1);
  }, [filters, form]);

  const departmentsQuery = useDepartmentsQuery(filters);
  const createMutation = useCreateDepartmentMutation();
  const updateMutation = useUpdateDepartmentMutation();
  const deleteMutation = useDeleteDepartmentMutation();

  const departments = departmentsQuery.data?.data ?? [];
  const activeDepartments = departments.filter((item) => item.isActive).length;
  const inactiveDepartments = departments.filter(
    (item) => !item.isActive,
  ).length;

  const applyFiltersToUrl = (values: DepartmentFilterFormValues) => {
    const next = buildSearchFromForm(values);
    if (embedded) {
      next.set("tab", "departments");
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: DepartmentFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    if (embedded) {
      router.replace(`${pathname}?tab=departments`);
      return;
    }
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingDepartment(null);
    setModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setModalMode("edit");
    setEditingDepartment(department);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDepartment(null);
  };

  const handleSubmit = (values: CreateDepartmentRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingDepartment) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingDepartment.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<Department> = [
    {
      title: "ลำดับ",
      key: "rowNo",
      width: 90,
      align: "center",
      render: (_value, _record, index) => (
        <span className={styles.orderBadge}>
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "code",
      key: "code",
      width: 160,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อแผนก",
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
      width: 190,
      align: "center",
      render: (_, record) => (
        <Space size={8}>
          <Button
            className={styles.editButton}
            onClick={() => openEditModal(record)}
          >
            แก้ไข
          </Button>

          <Popconfirm
            title="ลบแผนก"
            description={`ต้องการลบ "${record.code}" หรือไม่?`}
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button
              className={styles.deleteButton}
              loading={deleteMutation.isPending}
            >
              ลบ
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={!embedded && departmentsQuery.isLoading}>
      <section className={styles.page}>
      {!embedded ? (
      <div className={styles.pageHeader}>
        <div />

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>MASTER DATA</div>

          <Typography.Title level={2} className={styles.pageTitle}>
            แผนก
          </Typography.Title>

          <Typography.Text className={styles.pageSubtitle}>
            จัดการข้อมูลแผนกหรือส่วนงานภายในองค์กร
          </Typography.Text>
        </div>

        <Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มแผนก
        </Button>
      </div>
      ) : null}

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "แผนกทั้งหมด"}
            </span>
            <strong>{departments.length}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>สถานะใช้งาน</span>
            <strong>{activeDepartments}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>—</div>
          <div>
            <span className={styles.summaryLabel}>ปิดใช้งาน</span>
            <strong>{inactiveDepartments}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาแผนก</h3>
            <p>กรองรายการด้วยรหัส ชื่อแผนก และสถานะ</p>
          </div>

          {hasFilters ? (
            <Tag className={styles.filterActiveTag} color="success">
              กำลังกรอง
            </Tag>
          ) : null}
        </div>

        <Form
          form={form}
          layout="vertical"
          className={styles.filterForm}
          onFinish={handleSearch}
          initialValues={toFormValues(filters)}
        >
          <Row gutter={[16, 4]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="code" label="รหัสแผนก">
                <Input
                  allowClear
                  placeholder="เช่น PURCHASE"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="name" label="ชื่อแผนก">
                <Input allowClear placeholder="เช่น ฝ่ายจัดซื้อ" />
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

                  <Button
                    icon={<ClearOutlined />}
                    onClick={handleClearFilters}
                    disabled={!hasFilters}
                  >
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
            <div className={styles.tableEyebrow}>DEPARTMENT MANAGEMENT</div>
            <h3>รายการแผนก</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลแผนกทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <Space>
            {embedded ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={styles.createButton}
                onClick={openCreateModal}
              >
                เพิ่มแผนก
              </Button>
            ) : null}
            <div className={styles.tableCount}>{departments.length} รายการ</div>
          </Space>
        </div>

        {departmentsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {departmentsQuery.error instanceof Error
                ? departmentsQuery.error.message
                : "โหลดข้อมูลแผนกไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={departments}
            loading={
              departmentsQuery.isLoading || departmentsQuery.isFetching
            }
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
            scroll={{ x: 900 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบแผนกตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลแผนก",
            }}
          />
        )}
      </div>

      <DepartmentFormModal
        open={modalOpen}
        mode={modalMode}
        initialDepartment={editingDepartment}
        confirmLoading={
          createMutation.isPending || updateMutation.isPending
        }
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
      </section>
    </MasterPageGate>
  );
}
