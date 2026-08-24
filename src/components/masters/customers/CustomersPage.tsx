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
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useActivateCustomerMutation,
  useDeactivateCustomerMutation,
} from "@/hooks/customers/useActivateDeactivateCustomerMutation";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import { CUSTOMER_TYPES } from "@/types/customers";
import type { Customer, CustomerQueryParams } from "@/types/customers";

import styles from "@/components/masters/shared/master-page.module.css";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

type CustomerFilterFormValues = {
  q?: string;
  customerType?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["q", "customerType", "isActive"] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): CustomerQueryParams {
  const params: CustomerQueryParams = {};

  const q = searchParams.get("q")?.trim();
  if (q) {
    params.q = q;
  }

  const customerType = searchParams.get("customerType")?.trim();
  if (customerType) {
    params.customerType = customerType;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  return params;
}

function toFormValues(params: CustomerQueryParams): CustomerFilterFormValues {
  return {
    q: params.q,
    customerType: params.customerType,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: CustomerFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.q?.trim()) {
    next.set("q", values.q.trim());
  }

  if (values.customerType?.trim()) {
    next.set("customerType", values.customerType.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function CustomersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<CustomerFilterFormValues>();

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const canManageCustomers =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();

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

  const customersQuery = useCustomersQuery(filters);
  const activateMutation = useActivateCustomerMutation();
  const deactivateMutation = useDeactivateCustomerMutation();

  const customers = customersQuery.data?.data ?? [];
  const activeCount = customers.filter((item) => item.isActive).length;
  const inactiveCount = customers.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: CustomerFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: CustomerFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const columns: ColumnsType<Customer> = [
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
      title: "รหัสลูกค้า",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 140,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อลูกค้า",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "ประเภท",
      dataIndex: "customerType",
      key: "customerType",
      width: 130,
      render: (value?: string) => (
        <span className={styles.symbolText}>
          {value ? (CUSTOMER_TYPE_LABEL[value] ?? value) : "-"}
        </span>
      ),
    },
    {
      title: "เลขผู้เสียภาษี",
      dataIndex: "taxId",
      key: "taxId",
      width: 150,
      render: (value?: string) => (
        <span className={styles.symbolText}>{value || "-"}</span>
      ),
    },
    {
      title: "ผู้ติดต่อ",
      key: "contact",
      render: (_value, record) => (
        <div className={styles.nameCell}>
          <span>{record.contactName || "-"}</span>
          <span className={styles.symbolText}>
            {record.contactPhone || "-"}
          </span>
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
      width: 240,
      align: "center",
      render: (_, record) => (
        <Space size={8}>
          <Button
            icon={<EyeOutlined />}
            onClick={() => router.push(`/customers/${record.id}`)}
          >
            ดู
          </Button>

          {canManageCustomers ? (
            <>
              <Button
                className={styles.editButton}
                onClick={() => router.push(`/customers/${record.id}/edit`)}
              >
                แก้ไข
              </Button>

              {record.isActive ? (
                <Popconfirm
                  title="ปิดใช้งานลูกค้า"
                  description={`ต้องการปิดใช้งาน "${record.customerCode}" หรือไม่?`}
                  okText="ปิดใช้งาน"
                  cancelText="ยกเลิก"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deactivateMutation.mutate(record.id)}
                >
                  <Button
                    className={styles.deleteButton}
                    loading={deactivateMutation.isPending}
                  >
                    ปิดใช้งาน
                  </Button>
                </Popconfirm>
              ) : (
                <Button
                  className={styles.editButton}
                  loading={activateMutation.isPending}
                  onClick={() => activateMutation.mutate(record.id)}
                >
                  เปิดใช้งาน
                </Button>
              )}
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={customersQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div />

          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>MASTER DATA</div>

            <Typography.Title level={2} className={styles.pageTitle}>
              ลูกค้า
            </Typography.Title>

            <Typography.Text className={styles.pageSubtitle}>
              ฐานข้อมูลลูกค้าสำหรับใช้ต่อในใบเสนอราคา ใบสั่งขาย และใบส่งของ
            </Typography.Text>
          </div>

          {canManageCustomers ? (
            <Button
              type="primary"
              size="large"
              className={styles.createButton}
              icon={<PlusOutlined />}
              onClick={() => router.push("/customers/create")}
            >
              เพิ่มลูกค้า
            </Button>
          ) : (
            <div />
          )}
        </div>

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>Σ</div>
            <div>
              <span className={styles.summaryLabel}>
                {hasFilters ? "ผลค้นหา" : "ลูกค้าทั้งหมด"}
              </span>
              <strong>{customers.length}</strong>
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
              <h3>ค้นหาลูกค้า</h3>
              <p>กรองด้วยรหัส/ชื่อ/เลขผู้เสียภาษี ประเภทลูกค้า และสถานะ</p>
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
                <Form.Item name="q" label="ค้นหา">
                  <Input
                    allowClear
                    placeholder="รหัส / ชื่อ / เลขผู้เสียภาษี / ผู้ติดต่อ"
                    prefix={<SearchOutlined />}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="customerType" label="ประเภทลูกค้า">
                  <Select
                    allowClear
                    placeholder="ทั้งหมด"
                    options={CUSTOMER_TYPES.map((type) => ({
                      value: type,
                      label: CUSTOMER_TYPE_LABEL[type] ?? type,
                    }))}
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

              <Col xs={24} sm={12} lg={4}>
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
              <div className={styles.tableEyebrow}>CUSTOMER MANAGEMENT</div>
              <h3>รายการลูกค้า</h3>
              <p>
                {hasFilters
                  ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                  : "ข้อมูลลูกค้าทั้งหมดที่ใช้ภายในระบบ"}
              </p>
            </div>

            <div className={styles.tableCount}>{customers.length} รายการ</div>
          </div>

          {customersQuery.isError ? (
            <div className={styles.errorBox}>
              <Typography.Text type="danger">
                {customersQuery.error instanceof Error
                  ? customersQuery.error.message
                  : "โหลดข้อมูลลูกค้าไม่สำเร็จ"}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={customers}
              loading={customersQuery.isLoading || customersQuery.isFetching}
              pagination={{
                current: page,
                pageSize,
                showSizeChanger: false,
                showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                onChange: setPage,
              }}
              scroll={{ x: 1300 }}
              locale={{
                emptyText: hasFilters
                  ? "ไม่พบลูกค้าตามเงื่อนไขที่ค้นหา"
                  : "ยังไม่มีข้อมูลลูกค้า",
              }}
            />
          )}
        </div>
      </section>
    </MasterPageGate>
  );
}
