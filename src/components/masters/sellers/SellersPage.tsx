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
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useCreateSellerMutation } from "@/hooks/sellers/useCreateSellerMutation";
import { useDeleteSellerMutation } from "@/hooks/sellers/useDeleteSellerMutation";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import { useUpdateSellerMutation } from "@/hooks/sellers/useUpdateSellerMutation";
import { useSellerTypesQuery } from "@/hooks/seller-types/useSellerTypesQuery";
import type {
  CreateSellerRequest,
  Seller,
  SellerQueryParams,
} from "@/types/sellers";

import SellerFormModal from "./SellerFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type SellerFilterFormValues = {
  code?: string;
  name?: string;
  sellerTypeId?: string;
  taxId?: string;
  phone?: string;
  paymentMethod?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = [
  "code",
  "name",
  "sellerTypeId",
  "taxId",
  "phone",
  "paymentMethod",
  "isActive",
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "CASH" },
  { value: "TRANSFER", label: "TRANSFER" },
];

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): SellerQueryParams {
  const params: SellerQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const sellerTypeId = searchParams.get("sellerTypeId")?.trim();
  if (sellerTypeId) {
    params.sellerTypeId = sellerTypeId;
  }

  const taxId = searchParams.get("taxId")?.trim();
  if (taxId) {
    params.taxId = taxId;
  }

  const phone = searchParams.get("phone")?.trim();
  if (phone) {
    params.phone = phone;
  }

  const paymentMethod = searchParams.get("paymentMethod")?.trim();
  if (paymentMethod) {
    params.paymentMethod = paymentMethod;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  return params;
}

function toFormValues(params: SellerQueryParams): SellerFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    sellerTypeId: params.sellerTypeId,
    taxId: params.taxId,
    phone: params.phone,
    paymentMethod: params.paymentMethod,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(values: SellerFilterFormValues): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.sellerTypeId?.trim()) {
    next.set("sellerTypeId", values.sellerTypeId.trim());
  }

  if (values.taxId?.trim()) {
    next.set("taxId", values.taxId.trim());
  }

  if (values.phone?.trim()) {
    next.set("phone", values.phone.trim());
  }

  if (values.paymentMethod?.trim()) {
    next.set("paymentMethod", values.paymentMethod.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function SellersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<SellerFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
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

  const sellerTypesQuery = useSellerTypesQuery();
  const sellersQuery = useSellersQuery(filters);
  const createMutation = useCreateSellerMutation();
  const updateMutation = useUpdateSellerMutation();
  const deleteMutation = useDeleteSellerMutation();

  const sellerTypes = sellerTypesQuery.data?.data ?? [];
  const sellerTypeOptions = useMemo(
    () =>
      sellerTypes.map((item) => ({
        value: item.id,
        label: `${item.sellerTypeCode} — ${item.sellerTypeName}`,
      })),
    [sellerTypes],
  );

  const sellerTypeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of sellerTypes) {
      map.set(item.id, `${item.sellerTypeCode} — ${item.sellerTypeName}`);
    }
    return map;
  }, [sellerTypes]);

  const sellers = sellersQuery.data?.data ?? [];
  const activeCount = sellers.filter((item) => item.isActive).length;
  const inactiveCount = sellers.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: SellerFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: SellerFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingSeller(null);
    setModalOpen(true);
  };

  const openEditModal = (seller: Seller) => {
    setModalMode("edit");
    setEditingSeller(seller);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSeller(null);
  };

  const handleSubmit = (values: CreateSellerRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingSeller) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingSeller.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<Seller> = [
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
      dataIndex: "sellerCode",
      key: "sellerCode",
      width: 130,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อผู้ขาย",
      dataIndex: "sellerName",
      key: "sellerName",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "ประเภท",
      dataIndex: "sellerTypeId",
      key: "sellerTypeId",
      width: 180,
      render: (value?: string) => (
        <span className={styles.symbolText}>
          {value ? sellerTypeLabelById.get(value) || value : "-"}
        </span>
      ),
    },
    {
      title: "โทรศัพท์",
      dataIndex: "phone",
      key: "phone",
      width: 130,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "ชำระเงิน",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 110,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 130,
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
      width: 170,
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
          ariaLabel={`เมนูจัดการ ${record.sellerCode}`}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: "แก้ไข",
              onClick: () => openEditModal(record),
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: "ลบ",
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: "ลบผู้ขาย",
                content: `ต้องการลบ "${record.sellerCode}" หรือไม่?`,
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
    <MasterPageGate isLoading={sellersQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title="ผู้ขายยาง"
        subtitle="จัดการข้อมูลผู้ขายยางรถยนต์ใช้แล้ว ติดต่อ และวิธีชำระเงิน"
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มผู้ขาย
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "ผู้ขายทั้งหมด"}
            </span>
            <strong>{sellers.length}</strong>
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
            <h3>ค้นหาผู้ขายยาง</h3>
            <p>กรองด้วยรหัส ชื่อ ประเภท โทรศัพท์ และสถานะ</p>
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
              <Form.Item name="code" label="รหัสผู้ขาย">
                <Input
                  allowClear
                  placeholder="เช่น SELL"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อผู้ขาย">
                <Input allowClear placeholder="เช่น รับซื้อยาง" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="sellerTypeId" label="ประเภทผู้ขาย">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  loading={sellerTypesQuery.isLoading}
                  options={sellerTypeOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="phone" label="เบอร์โทรศัพท์">
                <Input allowClear placeholder="เช่น 081" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="taxId" label="เลขประจำตัวผู้เสียภาษี">
                <Input allowClear placeholder="เช่น 1234" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="paymentMethod" label="วิธีชำระเงิน">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={PAYMENT_METHOD_OPTIONS}
                />
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
            <div className={styles.tableEyebrow}>SELLER MANAGEMENT</div>
            <h3>รายการผู้ขายยาง</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลผู้ขายยางทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{sellers.length} รายการ</div>
        </div>

        {sellersQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {sellersQuery.error instanceof Error
                ? sellersQuery.error.message
                : "โหลดข้อมูลผู้ขายไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={sellers}
            loading={sellersQuery.isLoading || sellersQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              onChange: setPage,
            }}
            scroll={{ x: 1160 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบผู้ขายตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลผู้ขาย",
            }}
          />
        )}
      </div>

      <SellerFormModal
        open={modalOpen}
        mode={modalMode}
        initialSeller={editingSeller}
        sellerTypeOptions={sellerTypeOptions}
        sellerTypesLoading={sellerTypesQuery.isLoading}
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
