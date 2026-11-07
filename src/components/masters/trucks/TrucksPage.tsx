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
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useCreateTruckMutation } from "@/hooks/trucks/useCreateTruckMutation";
import { useDeleteTruckMutation } from "@/hooks/trucks/useDeleteTruckMutation";
import { useTrucksQuery } from "@/hooks/trucks/useTrucksQuery";
import { useUpdateTruckMutation } from "@/hooks/trucks/useUpdateTruckMutation";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import type {
  CreateTruckRequest,
  Truck,
  TruckQueryParams,
} from "@/types/trucks";

import TruckFormModal from "./TruckFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type TruckFilterFormValues = {
  code?: string;
  licensePlate?: string;
  sellerId?: string;
  province?: string;
  truckType?: string;
  driverName?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = [
  "code",
  "licensePlate",
  "sellerId",
  "province",
  "truckType",
  "driverName",
  "isActive",
] as const;

const TRUCK_TYPE_OPTIONS = [
  { value: "6_WHEEL", label: "6_WHEEL" },
  { value: "10_WHEEL", label: "10_WHEEL" },
  { value: "TRAILER", label: "TRAILER" },
  { value: "PICKUP", label: "PICKUP" },
];

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): TruckQueryParams {
  const params: TruckQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const licensePlate = searchParams.get("licensePlate")?.trim();
  if (licensePlate) {
    params.licensePlate = licensePlate;
  }

  const sellerId = searchParams.get("sellerId")?.trim();
  if (sellerId) {
    params.sellerId = sellerId;
  }

  const province = searchParams.get("province")?.trim();
  if (province) {
    params.province = province;
  }

  const truckType = searchParams.get("truckType")?.trim();
  if (truckType) {
    params.truckType = truckType;
  }

  const driverName = searchParams.get("driverName")?.trim();
  if (driverName) {
    params.driverName = driverName;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  return params;
}

function toFormValues(params: TruckQueryParams): TruckFilterFormValues {
  return {
    code: params.code,
    licensePlate: params.licensePlate,
    sellerId: params.sellerId,
    province: params.province,
    truckType: params.truckType,
    driverName: params.driverName,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(values: TruckFilterFormValues): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.licensePlate?.trim()) {
    next.set("licensePlate", values.licensePlate.trim());
  }

  if (values.sellerId?.trim()) {
    next.set("sellerId", values.sellerId.trim());
  }

  if (values.province?.trim()) {
    next.set("province", values.province.trim());
  }

  if (values.truckType?.trim()) {
    next.set("truckType", values.truckType.trim());
  }

  if (values.driverName?.trim()) {
    next.set("driverName", values.driverName.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function TrucksPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<TruckFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
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

  const sellersQuery = useSellersQuery();
  const trucksQuery = useTrucksQuery(filters);
  const createMutation = useCreateTruckMutation();
  const updateMutation = useUpdateTruckMutation();
  const deleteMutation = useDeleteTruckMutation();

  const sellers = sellersQuery.data?.data ?? [];
  const sellerOptions = useMemo(
    () =>
      sellers.map((seller) => ({
        value: seller.id,
        label: `${seller.sellerCode} — ${seller.sellerName}`,
      })),
    [sellers],
  );

  const sellerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const seller of sellers) {
      map.set(seller.id, `${seller.sellerCode} — ${seller.sellerName}`);
    }
    return map;
  }, [sellers]);

  const trucks = trucksQuery.data?.data ?? [];
  const activeCount = trucks.filter((item) => item.isActive).length;
  const inactiveCount = trucks.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: TruckFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: TruckFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTruck(null);
    setModalOpen(true);
  };

  const openEditModal = (truck: Truck) => {
    setModalMode("edit");
    setEditingTruck(truck);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTruck(null);
  };

  const handleSubmit = (values: CreateTruckRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingTruck) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingTruck.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<Truck> = [
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
      dataIndex: "truckCode",
      key: "truckCode",
      width: 120,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: t("ทะเบียน"),
      dataIndex: "licensePlate",
      key: "licensePlate",
      width: 120,
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: t("ผู้ขาย"),
      dataIndex: "sellerId",
      key: "sellerId",
      width: 200,
      render: (value?: string) => (
        <span className={styles.symbolText}>
          {value ? sellerLabelById.get(value) || value : "-"}
        </span>
      ),
    },
    {
      title: t("ประเภท"),
      dataIndex: "truckType",
      key: "truckType",
      width: 110,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: t("คนขับ"),
      dataIndex: "driverName",
      key: "driverName",
      width: 140,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
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
      width: 170,
      render: (value: string) => (
        <span className={styles.updatedText}>
          {value ? new Date(value).toLocaleString(lang === "en" ? "en-GB" : "th-TH") : "-"}
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
          ariaLabel={t("เมนูจัดการ {no}", { no: record.truckCode })}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: t("แก้ไข"),
              onClick: () => openEditModal(record),
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: t("ลบ"),
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: t("ลบรถบรรทุก"),
                content: t('ต้องการลบ "{code}" หรือไม่?', { code: record.truckCode }),
                okText: t("ลบ"),
                cancelText: t("ยกเลิก"),
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={trucksQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title={t("รถบรรทุก")}
        subtitle={t("จัดการทะเบียนรถบรรทุกที่ใช้รับซื้อหรือขนส่งยาง")}
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          {t("เพิ่มรถบรรทุก")}
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? t("ผลค้นหา") : t("รถทั้งหมด")}
            </span>
            <strong>{trucks.length}</strong>
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
            <h3>{t("ค้นหารถบรรทุก")}</h3>
            <p>{t("กรองด้วยรหัส ทะเบียน ผู้ขาย ประเภท และสถานะ")}</p>
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
              <Form.Item name="code" label={t("รหัสรถ")}>
                <Input
                  allowClear
                  placeholder={t("เช่น TRK")}
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="licensePlate" label={t("ทะเบียนรถ")}>
                <Input allowClear placeholder={t("เช่น กข")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="sellerId" label={t("ผู้ขาย")}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={t("ทั้งหมด")}
                  loading={sellersQuery.isLoading}
                  options={sellerOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="truckType" label={t("ประเภทรถ")}>
                <Select
                  allowClear
                  placeholder={t("ทั้งหมด")}
                  options={TRUCK_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="province" label={t("จังหวัด")}>
                <Input allowClear placeholder={t("เช่น สมุทรปราการ")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="driverName" label={t("ชื่อคนขับ")}>
                <Input allowClear placeholder={t("เช่น สมชาย")} />
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
            <div className={styles.tableEyebrow}>TRUCK MANAGEMENT</div>
            <h3>{t("รายการรถบรรทุก")}</h3>
            <p>
              {hasFilters
                ? t("ผลลัพธ์ตามเงื่อนไขการค้นหา")
                : t("ข้อมูลรถบรรทุกทั้งหมดที่ใช้ภายในระบบ")}
            </p>
          </div>

          <div className={styles.tableCount}>{t("{n} รายการ", { n: trucks.length })}</div>
        </div>

        {trucksQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {trucksQuery.error instanceof Error
                ? trucksQuery.error.message
                : t("โหลดข้อมูลรถบรรทุกไม่สำเร็จ")}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={trucks}
            loading={trucksQuery.isLoading || trucksQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => t("ทั้งหมด {total} รายการ", { total }),
              onChange: setPage,
            }}
            scroll={{ x: 1160 }}
            locale={{
              emptyText: hasFilters
                ? t("ไม่พบรถบรรทุกตามเงื่อนไขที่ค้นหา")
                : t("ยังไม่มีข้อมูลรถบรรทุก"),
            }}
          />
        )}
      </div>

      <TruckFormModal
        open={modalOpen}
        mode={modalMode}
        initialTruck={editingTruck}
        sellerOptions={sellerOptions}
        sellersLoading={sellersQuery.isLoading}
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
