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
import { useCreateItemCategoryMutation } from "@/hooks/item-categories/useCreateItemCategoryMutation";
import { useDeleteItemCategoryMutation } from "@/hooks/item-categories/useDeleteItemCategoryMutation";
import { useItemCategoriesQuery } from "@/hooks/item-categories/useItemCategoriesQuery";
import { useUpdateItemCategoryMutation } from "@/hooks/item-categories/useUpdateItemCategoryMutation";
import type {
  CreateItemCategoryRequest,
  ItemCategory,
  ItemCategoryQueryParams,
} from "@/types/item-categories";

import ItemCategoryFormModal from "./ItemCategoryFormModal";
import styles from "./ItemCategoryFormModal.module.css";

type ItemCategoryFilterFormValues = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["code", "name", "description", "isActive"] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): ItemCategoryQueryParams {
  const params: ItemCategoryQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const description = searchParams.get("description")?.trim();
  if (description) {
    params.description = description;
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
  params: ItemCategoryQueryParams,
): ItemCategoryFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    description: params.description,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: ItemCategoryFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.description?.trim()) {
    next.set("description", values.description.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function ItemCategoriesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<ItemCategoryFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItemCategory, setEditingItemCategory] =
    useState<ItemCategory | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters = useMemo(
    () => parseFiltersFromSearch(searchParams),
    [searchParams],
  );

  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  useEffect(() => {
    form.setFieldsValue(toFormValues(filters));
    setPage(1);
  }, [filters, form]);

  const itemCategoriesQuery = useItemCategoriesQuery(filters);
  const createMutation = useCreateItemCategoryMutation();
  const updateMutation = useUpdateItemCategoryMutation();
  const deleteMutation = useDeleteItemCategoryMutation();

  const categories = itemCategoriesQuery.data?.data ?? [];
  const activeCategories = categories.filter((item) => item.isActive).length;
  const inactiveCategories = categories.filter(
    (item) => !item.isActive,
  ).length;

  const applyFiltersToUrl = (values: ItemCategoryFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: ItemCategoryFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingItemCategory(null);
    setModalOpen(true);
  };

  const openEditModal = (category: ItemCategory) => {
    setModalMode("edit");
    setEditingItemCategory(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItemCategory(null);
  };

  const handleSubmit = (values: CreateItemCategoryRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingItemCategory) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingItemCategory.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<ItemCategory> = [
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
      width: 170,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อหมวดหมู่",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.itemCategoryNameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "คำอธิบาย",
      dataIndex: "description",
      key: "description",
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
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
            title="ลบหมวดหมู่สินค้า"
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
    <MasterPageGate isLoading={itemCategoriesQuery.isLoading}>
      <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div />

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>MASTER DATA</div>

          <Typography.Title level={2} className={styles.pageTitle}>
            หมวดหมู่สินค้า
          </Typography.Title>

          <Typography.Text className={styles.pageSubtitle}>
            จัดการหมวดหมู่สำหรับจัดกลุ่มสินค้า วัตถุดิบ และวัสดุต่าง ๆ
          </Typography.Text>
        </div>

        <Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มหมวดหมู่
        </Button>
      </div>

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "หมวดหมู่ทั้งหมด"}
            </span>
            <strong>{categories.length}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>สถานะใช้งาน</span>
            <strong>{activeCategories}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>—</div>
          <div>
            <span className={styles.summaryLabel}>ปิดใช้งาน</span>
            <strong>{inactiveCategories}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาหมวดหมู่</h3>
            <p>กรองรายการด้วยรหัส ชื่อ คำอธิบาย และสถานะ</p>
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
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="code" label="รหัสหมวดหมู่">
                <Input
                  allowClear
                  placeholder="เช่น RAW_MATERIAL"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อหมวดหมู่">
                <Input allowClear placeholder="เช่น วัตถุดิบ" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="description" label="คำอธิบาย">
                <Input allowClear placeholder="เช่น ผลิต" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
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
            <div className={styles.tableEyebrow}>CATEGORY MANAGEMENT</div>
            <h3>รายการหมวดหมู่สินค้า</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลหมวดหมู่ทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{categories.length} รายการ</div>
        </div>

        {itemCategoriesQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {itemCategoriesQuery.error instanceof Error
                ? itemCategoriesQuery.error.message
                : "โหลดข้อมูลหมวดหมู่สินค้าไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.itemCategoryTable}
            columns={columns}
            dataSource={categories}
            loading={
              itemCategoriesQuery.isLoading || itemCategoriesQuery.isFetching
            }
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              onChange: setPage,
            }}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบหมวดหมู่ตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลหมวดหมู่สินค้า",
            }}
          />
        )}
      </div>

      <ItemCategoryFormModal
        open={modalOpen}
        mode={modalMode}
        initialItemCategory={editingItemCategory}
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
