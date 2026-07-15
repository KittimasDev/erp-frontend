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
import { useCreateTireClassificationMutation } from "@/hooks/tire-classifications/useCreateTireClassificationMutation";
import { useDeleteTireClassificationMutation } from "@/hooks/tire-classifications/useDeleteTireClassificationMutation";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import { useUpdateTireClassificationMutation } from "@/hooks/tire-classifications/useUpdateTireClassificationMutation";
import type {
  CreateTireClassificationRequest,
  TireClassification,
  TireClassificationQueryParams,
} from "@/types/tire-classifications";

import TireClassificationFormModal from "./TireClassificationFormModal";
import styles from "./TireClassificationFormModal.module.css";

type TireClassificationFilterFormValues = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["code", "name", "description", "isActive"] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): TireClassificationQueryParams {
  const params: TireClassificationQueryParams = {};

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
  params: TireClassificationQueryParams,
): TireClassificationFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    description: params.description,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: TireClassificationFilterFormValues,
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

export default function TireClassificationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<TireClassificationFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingClassification, setEditingClassification] =
    useState<TireClassification | null>(null);
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

  const classificationsQuery = useTireClassificationsQuery(filters);
  const createMutation = useCreateTireClassificationMutation();
  const updateMutation = useUpdateTireClassificationMutation();
  const deleteMutation = useDeleteTireClassificationMutation();

  const classifications = classificationsQuery.data?.data ?? [];
  const activeCount = classifications.filter((item) => item.isActive).length;
  const inactiveCount = classifications.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: TireClassificationFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: TireClassificationFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingClassification(null);
    setModalOpen(true);
  };

  const openEditModal = (classification: TireClassification) => {
    setModalMode("edit");
    setEditingClassification(classification);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingClassification(null);
  };

  const handleSubmit = (values: CreateTireClassificationRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingClassification) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingClassification.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<TireClassification> = [
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
      dataIndex: "classificationCode",
      key: "classificationCode",
      width: 150,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อ",
      dataIndex: "classificationName",
      key: "classificationName",
      render: (value: string) => (
        <div className={styles.tireClassificationNameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "ราคา/กก.",
      dataIndex: "defaultPricePerKg",
      key: "defaultPricePerKg",
      width: 120,
      align: "right",
      render: (value: string | number) => (
        <span className={styles.orderBadge}>{Number(value).toLocaleString("th-TH")}</span>
      ),
    },
    {
      title: "รายละเอียด",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
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
            title="ลบประเภท/กลุ่มยาง"
            description={`ต้องการลบ "${record.classificationCode}" หรือไม่?`}
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
    <MasterPageGate isLoading={classificationsQuery.isLoading}>
      <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div />

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>MASTER DATA</div>

          <Typography.Title level={2} className={styles.pageTitle}>
            ประเภท/กลุ่มยาง
          </Typography.Title>

          <Typography.Text className={styles.pageSubtitle}>
            จัดการประเภทยาง เช่น ยางนั่ง กระบะ บรรทุก และราคารับซื้อมาตรฐาน
          </Typography.Text>
        </div>

        <Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มประเภท/กลุ่มยาง
        </Button>
      </div>

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "ประเภททั้งหมด"}
            </span>
            <strong>{classifications.length}</strong>
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
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาประเภท/กลุ่มยาง</h3>
            <p>กรองด้วยรหัส ชื่อ รายละเอียด และสถานะ</p>
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
              <Form.Item name="code" label="รหัส">
                <Input
                  allowClear
                  placeholder="เช่น PASS"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อ">
                <Input allowClear placeholder="เช่น นั่ง" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="description" label="รายละเอียด">
                <Input allowClear placeholder="เช่น รถยนต์" />
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
            <div className={styles.tableEyebrow}>
              TIRE CLASSIFICATION MANAGEMENT
            </div>
            <h3>รายการประเภท/กลุ่มยาง</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลประเภท/กลุ่มยางทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>
            {classifications.length} รายการ
          </div>
        </div>

        {classificationsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {classificationsQuery.error instanceof Error
                ? classificationsQuery.error.message
                : "โหลดข้อมูลประเภท/กลุ่มยางไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.tireClassificationTable}
            columns={columns}
            dataSource={classifications}
            loading={
              classificationsQuery.isLoading || classificationsQuery.isFetching
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
                ? "ไม่พบประเภท/กลุ่มยางตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลประเภท/กลุ่มยาง",
            }}
          />
        )}
      </div>

      <TireClassificationFormModal
        open={modalOpen}
        mode={modalMode}
        initialClassification={editingClassification}
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
