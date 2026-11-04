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
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
  UploadOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import {
  useActivateCustomerMutation,
  useDeactivateCustomerMutation,
} from "@/hooks/customers/useActivateDeactivateCustomerMutation";
import CsvImportModal, {
  CUSTOMER_CSV_HINT,
  CUSTOMER_CSV_TEMPLATE,
} from "@/components/masters/shared/CsvImportModal";
import { downloadCustomerImportTemplate } from "@/lib/api/customers";
import { getAccessToken } from "@/lib/auth/token";
import { downloadBlob } from "@/utils/downloadTabularReport";
import { useCreateCustomerMutation } from "@/hooks/customers/useCreateCustomerMutation";
import { useImportCustomersCsvMutation } from "@/hooks/customers/useImportCustomersCsvMutation";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { CUSTOMER_TYPES } from "@/types/customers";
import type {
  CreateCustomerRequest,
  Customer,
  CustomerQueryParams,
} from "@/types/customers";

import styles from "@/components/masters/shared/master-page.module.css";
import pageStyles from "./customers-page.module.css";
import CustomerFormModal from "./CustomerFormModal";
import PageHeader from "@/components/common/PageHeader";

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
  const [importOpen, setImportOpen] = useState(false);
  const pageSize = 10;

  /** เพิ่ม/แก้ไขลูกค้า = สิทธิ์ของหน้าข้อมูลลูกค้าใน Permission Matrix */
  const customerActions = useScreenActionPermissions("MASTERS_CUSTOMERS");
  const canManageCustomers = customerActions.canAdd || customerActions.canEdit;

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
  const createMutation = useCreateCustomerMutation();
  const importMutation = useImportCustomersCsvMutation();
  const activateMutation = useActivateCustomerMutation();
  const deactivateMutation = useDeactivateCustomerMutation();

  const customers = customersQuery.data?.data ?? [];
  const activeCount = customers.filter((item) => item.isActive).length;

  // ลูกค้าใหม่ในเดือนนี้ — นับจาก createdAt เทียบเดือน/ปีปัจจุบัน
  const nowForCount = new Date();
  const newThisMonthCount = customers.filter((item) => {
    if (!item.createdAt) {
      return false;
    }
    const created = new Date(item.createdAt);
    return (
      created.getFullYear() === nowForCount.getFullYear() &&
      created.getMonth() === nowForCount.getMonth()
    );
  }).length;

  // สัดส่วนเทียบจำนวนลูกค้าที่แสดงอยู่ ใช้เป็น caption ในการ์ดสรุป
  const sharePercent = (value: number) => {
    if (!customers.length) {
      return "0%";
    }
    return `${Math.round((value / customers.length) * 100)}%`;
  };

  const thisMonthLabel = new Date().toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  const summaryCardClass = `${styles.summaryCard} ${pageStyles.summaryCard}`;

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

  const handleCreate = (values: CreateCustomerRequest) => {
    createMutation.mutate(values, {
      onSuccess: closeCreate,
    });
  };

  const columns: ColumnsType<Customer> = [
    {
      title: "ลำดับ",
      key: "rowNo",
      width: 90,
      align: "center",
      render: (_value, _record, index) => (
        <span className={`${styles.orderBadge} ${pageStyles.orderBadge}`}>
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
        <span className={`${styles.codeBadge} ${pageStyles.codeBadge}`}>{value}</span>
      ),
    },
    {
      title: "ชื่อลูกค้า",
      dataIndex: "nameTh",
      key: "nameTh",
      render: (value: string) => (
        <div className={`${styles.nameCell} ${pageStyles.nameCell}`}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "ผู้ติดต่อ",
      key: "contact",
      render: (_value, record) => (
        <div className={`${styles.stackCell} ${pageStyles.stackCell}`}>
          <span>{record.contactName || "-"}</span>
          <span className={styles.symbolText}>
            {record.contactPhone || "-"}
          </span>
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
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 140,
      align: "center",
      render: (isActive: boolean) =>
        isActive ? (
          <Tag className={`${styles.statusTag} ${pageStyles.statusTag} ${styles.statusActive}`}>
            <span className={styles.statusDot} />
            ใช้งาน
          </Tag>
        ) : (
          <Tag className={`${styles.statusTag} ${pageStyles.statusTag} ${styles.statusInactive}`}>
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
        <span className={`${styles.updatedText} ${pageStyles.updatedText}`}>
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
          ariaLabel={`เมนูจัดการ ${record.customerCode}`}
          actions={[
            {
              key: "view",
              icon: <EyeOutlined />,
              label: "ดูรายละเอียด",
              onClick: () => router.push(`/customers/${record.id}`),
            },
            canManageCustomers && {
              key: "edit",
              icon: <EditOutlined />,
              label: "แก้ไข",
              onClick: () => router.push(`/customers/${record.id}/edit`),
            },
            canManageCustomers && "divider",
            canManageCustomers &&
              (record.isActive
                ? {
                    key: "deactivate",
                    icon: <StopOutlined />,
                    label: "ปิดการใช้งาน",
                    danger: true,
                    onClick: () => deactivateMutation.mutate(record.id),
                    confirm: {
                      title: "ปิดใช้งานลูกค้า",
                      content: `ต้องการปิดใช้งาน "${record.customerCode}" หรือไม่?`,
                      okText: "ปิดใช้งาน",
                      cancelText: "ยกเลิก",
                    },
                  }
                : {
                    key: "activate",
                    icon: <CheckCircleOutlined />,
                    label: "เปิดใช้งาน",
                    onClick: () => activateMutation.mutate(record.id),
                  }),
          ]}
        />
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={customersQuery.isLoading}>
      <section className={`${styles.page} ${pageStyles.page}`}>
        <PageHeader
          eyebrow="MASTER DATA"
          icon={<TeamOutlined />}
          title="ลูกค้า"
          subtitle="ฐานข้อมูลลูกค้าสำหรับใช้ต่อในใบเสนอราคา ใบสั่งขาย และใบส่งของ"
          actions={
            <>
{canManageCustomers ? (
            <div className={styles.headerActions}>
              {customerActions.canAdd ? (
                <Button
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={() => setImportOpen(true)}
                >
                  นำเข้า Excel / CSV
                </Button>
              ) : null}
              <Button
                type="primary"
                size="large"
                className={`${styles.createButton} ${pageStyles.createButton}`}
                icon={<PlusOutlined />}
                onClick={() => setCreateOpen(true)}
              >
                เพิ่มลูกค้า
              </Button>
            </div>
          ) : (
            <div />
          )}
            </>
          }
        />

        <div className={`${styles.summaryRow} ${pageStyles.summaryRow}`}>
          <div className={`${summaryCardClass} ${pageStyles.cardTotal}`}>
            <div className={`${styles.summaryIcon} ${pageStyles.summaryIcon}`}>
              <TeamOutlined />
            </div>
            <div className={pageStyles.summaryBody}>
              <span
                className={`${styles.summaryLabel} ${pageStyles.summaryLabel}`}
              >
                {hasFilters ? "ผลค้นหา" : "ลูกค้าทั้งหมด"}
              </span>
              <strong>{customers.length.toLocaleString("th-TH")}</strong>
              <span className={pageStyles.summaryCaption}>
                {hasFilters
                  ? "รายการที่ตรงเงื่อนไขการค้นหา"
                  : "ลูกค้าในฐานข้อมูลทั้งระบบ"}
              </span>
            </div>
          </div>

          <div className={`${summaryCardClass} ${pageStyles.cardNew}`}>
            <div className={`${styles.summaryIcon} ${pageStyles.summaryIcon}`}>
              <UserAddOutlined />
            </div>
            <div className={pageStyles.summaryBody}>
              <span
                className={`${styles.summaryLabel} ${pageStyles.summaryLabel}`}
              >
                ลูกค้าใหม่ในเดือนนี้
              </span>
              <strong>{newThisMonthCount.toLocaleString("th-TH")}</strong>
              <span className={pageStyles.summaryCaption}>
                <span className={pageStyles.summaryShare}>
                  {sharePercent(newThisMonthCount)}
                </span>
                {thisMonthLabel}
              </span>
            </div>
          </div>

          <div className={`${summaryCardClass} ${pageStyles.cardActive}`}>
            <div className={`${styles.summaryIcon} ${pageStyles.summaryIcon}`}>
              <CheckCircleOutlined />
            </div>
            <div className={pageStyles.summaryBody}>
              <span
                className={`${styles.summaryLabel} ${pageStyles.summaryLabel}`}
              >
                สถานะใช้งาน
              </span>
              <strong>{activeCount.toLocaleString("th-TH")}</strong>
              <span className={pageStyles.summaryCaption}>
                <span className={pageStyles.summaryShare}>
                  {sharePercent(activeCount)}
                </span>
                พร้อมใช้ในเอกสารขาย
              </span>
            </div>
          </div>
        </div>

        <div className={`${styles.filterCard} ${pageStyles.filterCard}`}>
          <div className={`${styles.filterHeader} ${pageStyles.filterHeader}`}>
            <div>
              <div
                className={`${styles.filterEyebrow} ${pageStyles.filterEyebrow}`}
              >
                SEARCH
              </div>
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
            className={`${styles.filterForm} ${pageStyles.filterForm}`}
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
                      className={`${styles.filterSearchButton} ${pageStyles.filterSearchButton}`}
                    >
                      ค้นหา
                    </Button>

                    <Button
                      icon={<ClearOutlined />}
                      className={pageStyles.filterClearButton}
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

        <div className={`${styles.tableCard} ${pageStyles.tableCard}`}>
          <div className={`${styles.tableHeader} ${pageStyles.tableHeader}`}>
            <div>
              <div className={`${styles.tableEyebrow} ${pageStyles.tableEyebrow}`}>CUSTOMER LIST</div>
              <h3>รายการลูกค้า</h3>
              <p>
                {hasFilters
                  ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                  : "ข้อมูลลูกค้าทั้งหมดที่ใช้ภายในระบบ"}
              </p>
            </div>

            <div className={`${styles.tableCount} ${pageStyles.tableCount}`}>{customers.length} รายการ</div>
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
              className={`${styles.dataTable} ${pageStyles.dataTable}`}
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
              scroll={{ x: 1180 }}
              locale={{
                emptyText: hasFilters
                  ? "ไม่พบลูกค้าตามเงื่อนไขที่ค้นหา"
                  : "ยังไม่มีข้อมูลลูกค้า",
              }}
            />
          )}
        </div>
      </section>

      <CsvImportModal
        open={importOpen}
        title="นำเข้าลูกค้าจาก Excel / CSV"
        acceptExtensions={[".csv", ".xlsx"]}
        onDownloadExcelTemplate={async () => {
          const { blob, filename } = await downloadCustomerImportTemplate(
            getAccessToken(),
          );
          downloadBlob(filename ?? "customers-import-template.xlsx", blob);
        }}
        templateFileName="customers-import-template.csv"
        templateCsv={CUSTOMER_CSV_TEMPLATE}
        hint={CUSTOMER_CSV_HINT}
        importing={importMutation.isPending}
        onClose={() => setImportOpen(false)}
        onImport={async (file) => {
          const response = await importMutation.mutateAsync(file);
          return response.data;
        }}
      />
      <CustomerFormModal
        open={createOpen}
        mode="create"
        confirmLoading={createMutation.isPending}
        onCancel={closeCreate}
        onSubmit={handleCreate}
      />
    </MasterPageGate>
  );
}
