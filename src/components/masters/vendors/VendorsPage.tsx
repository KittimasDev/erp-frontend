"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
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
import { useCreateVendorMutation } from "@/hooks/vendors/useCreateVendorMutation";
import { useDeleteVendorMutation } from "@/hooks/vendors/useDeleteVendorMutation";
import { useUpdateVendorMutation } from "@/hooks/vendors/useUpdateVendorMutation";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import type {
  CreateVendorRequest,
  Vendor,
  VendorQueryParams,
} from "@/types/vendors";

import VendorFormModal from "./VendorFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type VendorFilterFormValues = {
  name?: string;
  taxId?: string;
  contactName?: string;
  contactPhone?: string;
  creditDays?: number | null;
  isActive?: boolean | null;
};

const FILTER_KEYS = [
  "name",
  "taxId",
  "contactName",
  "contactPhone",
  "creditDays",
  "isActive",
] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): VendorQueryParams {
  const params: VendorQueryParams = {};

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const taxId = searchParams.get("taxId")?.trim();
  if (taxId) {
    params.taxId = taxId;
  }

  const contactName = searchParams.get("contactName")?.trim();
  if (contactName) {
    params.contactName = contactName;
  }

  const contactPhone = searchParams.get("contactPhone")?.trim();
  if (contactPhone) {
    params.contactPhone = contactPhone;
  }

  const creditDaysRaw = searchParams.get("creditDays");
  if (creditDaysRaw !== null && creditDaysRaw !== "") {
    const creditDays = Number(creditDaysRaw);
    if (!Number.isNaN(creditDays)) {
      params.creditDays = creditDays;
    }
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
  params: VendorQueryParams,
): VendorFilterFormValues {
  return {
    name: params.name,
    taxId: params.taxId,
    contactName: params.contactName,
    contactPhone: params.contactPhone,
    creditDays: params.creditDays,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: VendorFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (values.taxId?.trim()) {
    next.set("taxId", values.taxId.trim());
  }

  if (values.contactName?.trim()) {
    next.set("contactName", values.contactName.trim());
  }

  if (values.contactPhone?.trim()) {
    next.set("contactPhone", values.contactPhone.trim());
  }

  if (
    values.creditDays !== undefined &&
    values.creditDays !== null &&
    !Number.isNaN(values.creditDays)
  ) {
    next.set("creditDays", String(values.creditDays));
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function VendorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<VendorFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => parseFiltersFromSearch(searchParams),
    [searchParams],
  );

  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  useEffect(() => {
    form.setFieldsValue(toFormValues(filters));
  }, [filters, form]);

  const vendorsQuery = useVendorsQuery(filters);
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();
  const deleteMutation = useDeleteVendorMutation();

  const vendors = vendorsQuery.data?.data ?? [];
  const activeVendors = vendors.filter((vendor) => vendor.isActive).length;
  const inactiveVendors = vendors.filter((vendor) => !vendor.isActive).length;

  const applyFiltersToUrl = (values: VendorFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: VendorFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingVendor(null);
    setModalOpen(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setModalMode("edit");
    setEditingVendor(vendor);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVendor(null);
  };

  const handleSubmit = (values: CreateVendorRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingVendor) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingVendor.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<Vendor> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 10 + index + 1,
    },
    {
      title: "รหัส",
      dataIndex: "creditorCode",
      key: "creditorCode",
      width: 130,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อผู้ขาย",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "เลขภาษี",
      dataIndex: "taxId",
      key: "taxId",
      width: 140,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "ผู้ติดต่อ",
      dataIndex: "contactName",
      key: "contactName",
      width: 140,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "เบอร์",
      dataIndex: "contactPhone",
      key: "contactPhone",
      width: 120,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "วันเครดิต",
      dataIndex: "defaultCreditDays",
      key: "defaultCreditDays",
      width: 100,
      align: "center",
      render: (value: number) => (
        <span className={styles.orderBadge}>{value}</span>
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
          ariaLabel={`เมนูจัดการ ${record.creditorCode}`}
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
                content: `ต้องการลบ "${record.creditorCode}" หรือไม่?`,
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
    <MasterPageGate isLoading={vendorsQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title="ผู้ขาย"
        subtitle="จัดการข้อมูลผู้ขายสำหรับระบบจัดซื้อและใบสั่งซื้อ"
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
            <strong>{vendors.length}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
          <div className={styles.summaryIcon}>✓</div>
          <div>
            <span className={styles.summaryLabel}>สถานะใช้งาน</span>
            <strong>{activeVendors}</strong>
          </div>
        </div>

        <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
          <div className={styles.summaryIcon}>—</div>
          <div>
            <span className={styles.summaryLabel}>ปิดใช้งาน</span>
            <strong>{inactiveVendors}</strong>
          </div>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div>
            <div className={styles.filterEyebrow}>SEARCH</div>
            <h3>ค้นหาผู้ขาย</h3>
            <p>กรองรายการด้วยชื่อ เลขภาษี ผู้ติดต่อ เบอร์ วันเครดิต และสถานะ</p>
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
            <Col xs={24} sm={12} lg={8} xl={6}>
              <Form.Item name="name" label="ชื่อผู้ขาย">
                <Input
                  allowClear
                  placeholder="เช่น บริษัท ตัวอย่าง"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8} xl={6}>
              <Form.Item name="taxId" label="เลขภาษี">
                <Input allowClear placeholder="เช่น 0123456789012" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8} xl={6}>
              <Form.Item name="contactName" label="ผู้ติดต่อ">
                <Input allowClear placeholder="เช่น สมชาย" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8} xl={6}>
              <Form.Item name="contactPhone" label="เบอร์">
                <Input allowClear placeholder="เช่น 0812345678" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8} xl={6}>
              <Form.Item name="creditDays" label="วันเครดิต">
                <InputNumber
                  className={styles.filterNumber}
                  min={0}
                  precision={0}
                  placeholder="เช่น 30"
                  controls={false}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={8} xl={6}>
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

            <Col xs={24} sm={24} lg={8} xl={12}>
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
            <div className={styles.tableEyebrow}>VENDOR MANAGEMENT</div>
            <h3>รายการผู้ขาย</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลผู้ขายทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{vendors.length} รายการ</div>
        </div>

        {vendorsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {vendorsQuery.error instanceof Error
                ? vendorsQuery.error.message
                : "โหลดข้อมูลผู้ขายไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={vendors}
            loading={vendorsQuery.isLoading || vendorsQuery.isFetching}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
            }}
            scroll={{ x: 1110 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบผู้ขายตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลผู้ขาย",
            }}
          />
        )}
      </div>

      <VendorFormModal
        open={modalOpen}
        mode={modalMode}
        initialVendor={editingVendor}
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
