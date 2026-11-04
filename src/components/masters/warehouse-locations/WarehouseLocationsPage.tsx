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
  useActivateWarehouseLocationMutation,
  useDeactivateWarehouseLocationMutation,
} from "@/hooks/warehouse-locations/useActivateDeactivateWarehouseLocationMutation";
import { useCreateWarehouseLocationMutation } from "@/hooks/warehouse-locations/useCreateWarehouseLocationMutation";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type {
  CreateWarehouseLocationRequest,
  WarehouseLocation,
  WarehouseLocationQueryParams,
} from "@/types/warehouse-locations";

import styles from "@/components/masters/shared/master-page.module.css";
import WarehouseLocationFormModal from "./WarehouseLocationFormModal";
import PageHeader from "@/components/common/PageHeader";

type WarehouseLocationFilterFormValues = {
  warehouseId?: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = [
  "warehouseId",
  "code",
  "name",
  "description",
  "isActive",
] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): WarehouseLocationQueryParams {
  const params: WarehouseLocationQueryParams = {};

  const warehouseId = searchParams.get("warehouseId")?.trim();
  if (warehouseId) {
    params.warehouseId = warehouseId;
  }

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
  params: WarehouseLocationQueryParams,
): WarehouseLocationFilterFormValues {
  return {
    warehouseId: params.warehouseId,
    code: params.code,
    name: params.name,
    description: params.description,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: WarehouseLocationFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.warehouseId?.trim()) {
    next.set("warehouseId", values.warehouseId.trim());
  }

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

export default function WarehouseLocationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<WarehouseLocationFilterFormValues>();

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

  const warehousesQuery = useWarehousesQuery();
  const locationsQuery = useWarehouseLocationsQuery(filters);
  const createMutation = useCreateWarehouseLocationMutation();
  const activateMutation = useActivateWarehouseLocationMutation();
  const deactivateMutation = useDeactivateWarehouseLocationMutation();

  const warehouses = warehousesQuery.data?.data ?? [];
  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.id,
        label: `${warehouse.warehouseCode} — ${warehouse.warehouseName}`,
      })),
    [warehouses],
  );

  const warehouseLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const warehouse of warehouses) {
      map.set(
        warehouse.id,
        `${warehouse.warehouseCode} — ${warehouse.warehouseName}`,
      );
    }
    return map;
  }, [warehouses]);

  const locations = locationsQuery.data?.data ?? [];
  const activeCount = locations.filter((item) => item.isActive).length;
  const inactiveCount = locations.filter((item) => !item.isActive).length;
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

  const applyFiltersToUrl = (values: WarehouseLocationFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: WarehouseLocationFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const handleCreate = (values: CreateWarehouseLocationRequest) => {
    createMutation.mutate(values, {
      onSuccess: closeCreate,
    });
  };

  const columns: ColumnsType<WarehouseLocation> = [
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
      title: "คลังสินค้า",
      dataIndex: "warehouseId",
      key: "warehouseId",
      width: 220,
      render: (value: string) => (
        <span className={styles.symbolText}>
          {warehouseLabelById.get(value) || value}
        </span>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "locationCode",
      key: "locationCode",
      width: 140,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อตำแหน่ง",
      dataIndex: "locationName",
      key: "locationName",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
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
      width: 100,
      align: "center",
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={`เมนูจัดการ ${record.locationCode}`}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "แก้ไข",
              onClick: () =>
                router.push(`/warehouse-locations/${record.id}/edit`),
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
                    title: "ปิดใช้งานตำแหน่งจัดเก็บ",
                    content: `ต้องการปิดใช้งาน "${record.locationCode}" หรือไม่?`,
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
    <MasterPageGate isLoading={locationsQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title="ตำแหน่งจัดเก็บ"
        subtitle="จัดการตำแหน่งย่อยภายในคลังสินค้า เช่น DEFAULT, YARD-A"
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          เพิ่มตำแหน่งจัดเก็บ
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "ตำแหน่งทั้งหมด"}
            </span>
            <strong>{locations.length}</strong>
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
            <h3>ค้นหาตำแหน่งจัดเก็บ</h3>
            <p>กรองด้วยคลัง รหัส ชื่อ รายละเอียด และสถานะ</p>
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
              <Form.Item name="warehouseId" label="คลังสินค้า">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  loading={warehousesQuery.isLoading}
                  options={warehouseOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="code" label="รหัสตำแหน่ง">
                <Input
                  allowClear
                  placeholder="เช่น RAW"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อตำแหน่ง">
                <Input allowClear placeholder="เช่น โซน A" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="description" label="รายละเอียด">
                <Input allowClear placeholder="เช่น ยางดิบ" />
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
            <div className={styles.tableEyebrow}>LOCATION MANAGEMENT</div>
            <h3>รายการตำแหน่งจัดเก็บ</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลตำแหน่งจัดเก็บทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{locations.length} รายการ</div>
        </div>

        {locationsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {locationsQuery.error instanceof Error
                ? locationsQuery.error.message
                : "โหลดข้อมูลตำแหน่งจัดเก็บไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={locations}
            loading={locationsQuery.isLoading || locationsQuery.isFetching}
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
                ? "ไม่พบตำแหน่งจัดเก็บตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลตำแหน่งจัดเก็บ",
            }}
          />
        )}
      </div>

      <WarehouseLocationFormModal
        open={createOpen}
        mode="create"
        warehouseOptions={warehouseOptions}
        warehousesLoading={warehousesQuery.isLoading}
        confirmLoading={createMutation.isPending}
        onCancel={closeCreate}
        onSubmit={handleCreate}
      />
      </section>
    </MasterPageGate>
  );
}
