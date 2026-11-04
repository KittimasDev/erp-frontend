"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClearOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import {
  useActivateWarehouseMutation,
  useDeactivateWarehouseMutation,
} from "@/hooks/warehouses/useActivateDeactivateWarehouseMutation";
import { useCreateWarehouseMutation } from "@/hooks/warehouses/useCreateWarehouseMutation";
import { useWarehouseTypesQuery } from "@/hooks/warehouse-types/useWarehouseTypesQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type {
  CreateWarehouseRequest,
  Warehouse,
  WarehouseQueryParams,
} from "@/types/warehouses";

import styles from "@/components/masters/shared/master-page.module.css";
import WarehouseFormModal from "./WarehouseFormModal";
import PageHeader from "@/components/common/PageHeader";

type WarehouseFilterFormValues = {
  code?: string;
  name?: string;
  warehouseGroup?: string;
  description?: string;
  isActive?: boolean | null;
  allowNegativeStock?: boolean | null;
  isQcRequired?: boolean | null;
};

const FILTER_KEYS = [
  "code",
  "name",
  "warehouseGroup",
  "description",
  "isActive",
  "allowNegativeStock",
  "isQcRequired",
] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): WarehouseQueryParams {
  const params: WarehouseQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const warehouseGroup = searchParams.get("warehouseGroup")?.trim();
  if (warehouseGroup) {
    params.warehouseGroup = warehouseGroup;
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

  const allowNegativeStockRaw = searchParams.get("allowNegativeStock");
  if (allowNegativeStockRaw === "true") {
    params.allowNegativeStock = true;
  } else if (allowNegativeStockRaw === "false") {
    params.allowNegativeStock = false;
  }

  const isQcRequiredRaw = searchParams.get("isQcRequired");
  if (isQcRequiredRaw === "true") {
    params.isQcRequired = true;
  } else if (isQcRequiredRaw === "false") {
    params.isQcRequired = false;
  }

  return params;
}

function toFormValues(params: WarehouseQueryParams): WarehouseFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    warehouseGroup: params.warehouseGroup,
    description: params.description,
    isActive: params.isActive,
    allowNegativeStock: params.allowNegativeStock,
    isQcRequired: params.isQcRequired,
  };
}

function buildSearchFromForm(
  values: WarehouseFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.warehouseGroup?.trim()) {
    next.set("warehouseGroup", values.warehouseGroup.trim());
  }

  if (values.description?.trim()) {
    next.set("description", values.description.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  if (
    values.allowNegativeStock === true ||
    values.allowNegativeStock === false
  ) {
    next.set("allowNegativeStock", String(values.allowNegativeStock));
  }

  if (values.isQcRequired === true || values.isQcRequired === false) {
    next.set("isQcRequired", String(values.isQcRequired));
  }

  return next;
}

export default function WarehousesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<WarehouseFilterFormValues>();

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters = useMemo(
    () => parseFiltersFromSearch(searchParams),
    [searchParams],
  );

  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  // sync ฟอร์มจาก URL — antd Form เป็น external system การใช้ effect ถูกต้องแล้ว
  useEffect(() => {
    form.setFieldsValue(toFormValues(filters));
  }, [filters, form]);

  // ตัวกรองเปลี่ยน → กลับไปหน้า 1 · ปรับ state ตอน render ตามที่ React แนะนำ
  // ไม่ทำใน effect เพราะจะสั่ง render รอบสองทุกครั้งที่กรอง (cascading render)
  const [pagedFilters, setPagedFilters] = useState(filters);
  if (pagedFilters !== filters) {
    setPagedFilters(filters);
    setPage(1);
  }

  const warehousesQuery = useWarehousesQuery(filters);
  const createMutation = useCreateWarehouseMutation();
  const activateMutation = useActivateWarehouseMutation();
  const deactivateMutation = useDeactivateWarehouseMutation();

  const warehouseTypesQuery = useWarehouseTypesQuery();
  const warehouseTypeByCode = new Map(
    (warehouseTypesQuery.data?.data ?? []).map((type) => [type.code, type]),
  );

  const warehouses = warehousesQuery.data?.data ?? [];
  const activeCount = warehouses.filter((item) => item.isActive).length;
  const inactiveCount = warehouses.filter((item) => !item.isActive).length;
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("create") === "1",
  );

  const closeCreate = () => {
    setCreateOpen(false);
    if (searchParams.get("create") !== "1") {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    const query = next.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${pathname}?${query}` : pathname,
    );
  };

  const applyFiltersToUrl = (values: WarehouseFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: WarehouseFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const handleCreate = (values: CreateWarehouseRequest) => {
    createMutation.mutate(values, {
      onSuccess: closeCreate,
    });
  };

  const columns: ColumnsType<Warehouse> = [
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
      dataIndex: "warehouseCode",
      key: "warehouseCode",
      width: 140,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อคลัง",
      dataIndex: "warehouseName",
      key: "warehouseName",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "ประเภทคลัง",
      key: "warehouseType",
      width: 200,
      render: (_value, record) => {
        const code = record.warehouseType ?? record.warehouseGroup;
        const type = code ? warehouseTypeByCode.get(code) : undefined;
        return (
          <Space size={4} wrap>
            <span className={styles.symbolText}>
              {type ? type.name : code || "-"}
            </span>
            {record.isDefaultReturnInspection ? (
              <Tag color="gold">รอตรวจของคืนตั้งต้น</Tag>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "ยอดติดลบ",
      dataIndex: "allowNegativeStock",
      key: "allowNegativeStock",
      width: 110,
      align: "center",
      render: (value: boolean) =>
        value ? (
          <Tag color="warning">อนุญาต</Tag>
        ) : (
          <Tag>ไม่อนุญาต</Tag>
        ),
    },
    {
      title: "QC",
      dataIndex: "isQcRequired",
      key: "isQcRequired",
      width: 100,
      align: "center",
      render: (value: boolean) =>
        value ? <Tag color="processing">ต้องผ่าน</Tag> : <Tag>ไม่ต้อง</Tag>,
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
          ariaLabel={`เมนูจัดการ ${record.warehouseCode}`}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "แก้ไข",
              onClick: () => router.push(`/warehouses/${record.id}/edit`),
            },
            "divider",
            record.isActive
              ? {
                  key: "deactivate",
                  icon: <StopOutlined />,
                  label: "ปิดการใช้งาน",
                  danger: true,
                  onClick: () => deactivateMutation.mutate(record.id),
                  confirm: {
                    title: "ปิดใช้งานคลังสินค้า",
                    content: `ต้องการปิดใช้งาน "${record.warehouseCode}" หรือไม่?`,
                    okText: "ปิดใช้งาน",
                    cancelText: "ยกเลิก",
                  },
                }
              : {
                  key: "activate",
                  icon: <CheckCircleOutlined />,
                  label: "เปิดใช้งาน",
                  onClick: () => activateMutation.mutate(record.id),
                },
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={warehousesQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title="คลังสินค้า"
        subtitle="จัดการคลังสินค้า กลุ่มคลัง และการตั้งค่าสต็อก/QC"
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          เพิ่มคลังสินค้า
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "คลังทั้งหมด"}
            </span>
            <strong>{warehouses.length}</strong>
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
            <h3>ค้นหาคลังสินค้า</h3>
            <p>กรองด้วยรหัส ชื่อ กลุ่ม รายละเอียด และสถานะ</p>
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
              <Form.Item name="code" label="รหัสคลัง">
                <Input
                  allowClear
                  placeholder="เช่น RAW"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อคลัง">
                <Input allowClear placeholder="เช่น วัตถุดิบ" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="warehouseGroup" label="ประเภทคลัง">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  options={(warehouseTypesQuery.data?.data ?? []).map(
                    (type) => ({
                      value: type.code,
                      label: `${type.name} (${type.code})`,
                    }),
                  )}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="description" label="รายละเอียด">
                <Input allowClear placeholder="เช่น โรงงาน" />
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

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="allowNegativeStock" label="ยอดติดลบ">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "อนุญาต" },
                    { value: false, label: "ไม่อนุญาต" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isQcRequired" label="QC">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: true, label: "ต้องผ่าน" },
                    { value: false, label: "ไม่ต้อง" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
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
            <div className={styles.tableEyebrow}>WAREHOUSE MANAGEMENT</div>
            <h3>รายการคลังสินค้า</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลคลังสินค้าทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{warehouses.length} รายการ</div>
        </div>

        {warehousesQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {warehousesQuery.error instanceof Error
                ? warehousesQuery.error.message
                : "โหลดข้อมูลคลังสินค้าไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={warehouses}
            loading={warehousesQuery.isLoading || warehousesQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              onChange: setPage,
            }}
            scroll={{ x: 1110 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบคลังสินค้าตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลคลังสินค้า",
            }}
          />
        )}
      </div>

      <WarehouseFormModal
        open={createOpen}
        mode="create"
        confirmLoading={createMutation.isPending}
        onCancel={closeCreate}
        onSubmit={handleCreate}
      />
      </section>
    </MasterPageGate>
  );
}
