"use client";
import { useT } from "@/lib/i18n/useT";
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
  const t = useT();
  const language = useLanguage();
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
      title: t("รหัส"),
      dataIndex: "warehouseCode",
      key: "warehouseCode",
      width: 140,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: t("ชื่อคลัง"),
      dataIndex: "warehouseName",
      key: "warehouseName",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: t("ประเภทคลัง"),
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
              <Tag color="gold">{t("รอตรวจของคืนตั้งต้น")}</Tag>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: t("ยอดติดลบ"),
      dataIndex: "allowNegativeStock",
      key: "allowNegativeStock",
      width: 110,
      align: "center",
      render: (value: boolean) =>
        value ? (
          <Tag color="warning">{t("อนุญาต")}</Tag>
        ) : (
          <Tag>{t("ไม่อนุญาต")}</Tag>
        ),
    },
    {
      title: "QC",
      dataIndex: "isQcRequired",
      key: "isQcRequired",
      width: 100,
      align: "center",
      render: (value: boolean) =>
        value ? <Tag color="processing">{t("ต้องผ่าน")}</Tag> : <Tag>{t("ไม่ต้อง")}</Tag>,
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
          {value ? new Date(value).toLocaleString(language === "en" ? "en-GB" : "th-TH") : "-"}
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
          ariaLabel={t("เมนูจัดการ {code}", { code: record.warehouseCode })}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: t("แก้ไข"),
              onClick: () => router.push(`/warehouses/${record.id}/edit`),
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
                    title: t("ปิดใช้งานคลังสินค้า"),
                    content: t("ต้องการปิดใช้งาน \"{code}\" หรือไม่?", { code: record.warehouseCode }),
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
    <MasterPageGate isLoading={warehousesQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title={t("คลังสินค้า")}
        subtitle={t("จัดการคลังสินค้า กลุ่มคลัง และการตั้งค่าสต็อก/QC")}
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {t("เพิ่มคลังสินค้า")}
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? t("ผลค้นหา") : t("คลังทั้งหมด")}
            </span>
            <strong>{warehouses.length}</strong>
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
            <h3>{t("ค้นหาคลังสินค้า")}</h3>
            <p>{t("กรองด้วยรหัส ชื่อ กลุ่ม รายละเอียด และสถานะ")}</p>
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
              <Form.Item name="code" label={t("รหัสคลัง")}>
                <Input
                  allowClear
                  placeholder={t("เช่น RAW")}
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label={t("ชื่อคลัง")}>
                <Input allowClear placeholder={t("เช่น วัตถุดิบ")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="warehouseGroup" label={t("ประเภทคลัง")}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("ทั้งหมด")}
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
              <Form.Item name="description" label={t("รายละเอียด")}>
                <Input allowClear placeholder={t("เช่น โรงงาน")} />
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
              <Form.Item name="allowNegativeStock" label={t("ยอดติดลบ")}>
                <Select
                  allowClear
                  placeholder={t("ทั้งหมด")}
                  options={[
                    { value: true, label: t("อนุญาต") },
                    { value: false, label: t("ไม่อนุญาต") },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isQcRequired" label="QC">
                <Select
                  allowClear
                  placeholder={t("ทั้งหมด")}
                  options={[
                    { value: true, label: t("ต้องผ่าน") },
                    { value: false, label: t("ไม่ต้อง") },
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
            <div className={styles.tableEyebrow}>WAREHOUSE MANAGEMENT</div>
            <h3>{t("รายการคลังสินค้า")}</h3>
            <p>
              {hasFilters
                ? t("ผลลัพธ์ตามเงื่อนไขการค้นหา")
                : t("ข้อมูลคลังสินค้าทั้งหมดที่ใช้ภายในระบบ")}
            </p>
          </div>

          <div className={styles.tableCount}>{t("{n} รายการ", { n: warehouses.length })}</div>
        </div>

        {warehousesQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {warehousesQuery.error instanceof Error
                ? warehousesQuery.error.message
                : t("โหลดข้อมูลคลังสินค้าไม่สำเร็จ")}
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
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
              onChange: setPage,
            }}
            scroll={{ x: 1110 }}
            locale={{
              emptyText: hasFilters
                ? t("ไม่พบคลังสินค้าตามเงื่อนไขที่ค้นหา")
                : t("ยังไม่มีข้อมูลคลังสินค้า"),
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
