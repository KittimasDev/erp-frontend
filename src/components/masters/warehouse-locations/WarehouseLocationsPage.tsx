"use client";
import { formatDateTime } from "@/lib/i18n/format";
import { useT } from "@/lib/i18n/useT";
import { tLoc } from "@/types/warehouse-locations";
import { useLanguage } from "@/lib/i18n/language";

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
  const t = useT();
  const language = useLanguage();
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
      title: t("ลำดับ"),
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
      title: t("คลังสินค้า"),
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
      title: t("รหัส"),
      dataIndex: "locationCode",
      key: "locationCode",
      width: 140,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: tLoc("ชื่อตำแหน่ง"),
      dataIndex: "locationName",
      key: "locationName",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: t("รายละเอียด"),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      key: "isActive",
      width: 140,
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
      title: t("อัปเดตล่าสุด"),
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => (
        <span className={styles.updatedText}>
          {value ? formatDateTime(value, language) : "-"}
        </span>
      ),
    },
    {
      title: t("จัดการ"),
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <RowActionsMenu
          ariaLabel={t("เมนูจัดการ {code}", { code: record.locationCode })}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: t("แก้ไข"),
              onClick: () =>
                router.push(`/warehouse-locations/${record.id}/edit`),
            },
            "divider",
            record.isActive
              ? {
                  key: "deactivate",
                  icon: <StopOutlined />,
                  label: t("ปิดการใช้งาน"),
                  danger: true,
                  onClick: () => deactivateMutation.mutate(record.id),
                  confirm: {
                    title: t("ปิดใช้งานตำแหน่งจัดเก็บ"),
                    content: t("ต้องการปิดใช้งาน \"{code}\" หรือไม่?", { code: record.locationCode }),
                    okText: t("ปิดใช้งาน"),
                    cancelText: t("ยกเลิก"),
                  },
                }
              : {
                  key: "activate",
                  icon: <CheckCircleOutlined />,
                  label: t("เปิดใช้งาน"),
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
        title={t("ตำแหน่งจัดเก็บ")}
        subtitle={t("จัดการตำแหน่งย่อยภายในคลังสินค้า เช่น DEFAULT, YARD-A")}
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {t("เพิ่มตำแหน่งจัดเก็บ")}
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? t("ผลค้นหา") : tLoc("ตำแหน่งทั้งหมด")}
            </span>
            <strong>{locations.length}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>{t("สถานะใช้งาน")}</span>
            <strong>{activeCount}</strong>
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

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>{t("ค้นหาตำแหน่งจัดเก็บ")}</h3>
            <p>{t("กรองด้วยคลัง รหัส ชื่อ รายละเอียด และสถานะ")}</p>
          </div>

          {hasFilters ? (
            <Tag className={styles.filterActiveTag} color="success">
              {t("กำลังกรอง")}
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
              <Form.Item name="warehouseId" label={t("คลังสินค้า")}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("ทั้งหมด")}
                  loading={warehousesQuery.isLoading}
                  options={warehouseOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="code" label={tLoc("รหัสตำแหน่ง")}>
                <Input
                  allowClear
                  placeholder={t("เช่น RAW")}
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label={tLoc("ชื่อตำแหน่ง")}>
                <Input allowClear placeholder={t("เช่น โซน A")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="description" label={t("รายละเอียด")}>
                <Input allowClear placeholder={t("เช่น ยางดิบ")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isActive" label={t("สถานะ")}>
                <Select
                  allowClear
                  placeholder={t("ทั้งหมด")}
                  options={[
                    { value: true, label: t("ใช้งาน") },
                    { value: false, label: t("ปิดใช้งาน") },
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
                    {t("ค้นหา")}
                  </Button>

                  <Button
                    icon={<ClearOutlined />}
                    onClick={handleClearFilters}
                    disabled={!hasFilters}
                  >
                    {t("ล้างค่า")}
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
            <h3>{t("รายการตำแหน่งจัดเก็บ")}</h3>
            <p>
              {hasFilters
                ? t("ผลลัพธ์ตามเงื่อนไขการค้นหา")
                : t("ข้อมูลตำแหน่งจัดเก็บทั้งหมดที่ใช้ภายในระบบ")}
            </p>
          </div>

          <div className={styles.tableCount}>{t("{n} รายการ", { n: locations.length })}</div>
        </div>

        {locationsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {locationsQuery.error instanceof Error
                ? locationsQuery.error.message
                : t("โหลดข้อมูลตำแหน่งจัดเก็บไม่สำเร็จ")}
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
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
              onChange: setPage,
            }}
            scroll={{ x: 1110 }}
            locale={{
              emptyText: hasFilters
                ? t("ไม่พบตำแหน่งจัดเก็บตามเงื่อนไขที่ค้นหา")
                : t("ยังไม่มีข้อมูลตำแหน่งจัดเก็บ"),
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
