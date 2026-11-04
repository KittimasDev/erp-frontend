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
import { useCreateTaxRateMutation } from "@/hooks/tax-rates/useCreateTaxRateMutation";
import { useDeleteTaxRateMutation } from "@/hooks/tax-rates/useDeleteTaxRateMutation";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { useUpdateTaxRateMutation } from "@/hooks/tax-rates/useUpdateTaxRateMutation";
import type {
  CreateTaxRateRequest,
  TaxRate,
  TaxRateQueryParams,
} from "@/types/tax-rates";

import TaxRateFormModal from "./TaxRateFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type TaxRateFilterFormValues = {
  code?: string;
  name?: string;
  rate?: number | null;
  taxType?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["code", "name", "rate", "taxType", "isActive"] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): TaxRateQueryParams {
  const params: TaxRateQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
  }

  const rateRaw = searchParams.get("rate");
  if (rateRaw !== null && rateRaw !== "") {
    const rate = Number(rateRaw);
    if (!Number.isNaN(rate)) {
      params.rate = rate;
    }
  }

  const taxType = searchParams.get("taxType")?.trim();
  if (taxType) {
    params.taxType = taxType;
  }

  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") {
    params.isActive = true;
  } else if (isActiveRaw === "false") {
    params.isActive = false;
  }

  return params;
}

function toFormValues(params: TaxRateQueryParams): TaxRateFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    rate: params.rate,
    taxType: params.taxType,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: TaxRateFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
  }

  if (
    values.rate !== undefined &&
    values.rate !== null &&
    !Number.isNaN(values.rate)
  ) {
    next.set("rate", String(values.rate));
  }

  if (values.taxType?.trim()) {
    next.set("taxType", values.taxType.trim());
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function TaxRatesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<TaxRateFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTaxRate, setEditingTaxRate] = useState<TaxRate | null>(null);
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

  const taxRatesQuery = useTaxRatesQuery(filters);
  const createMutation = useCreateTaxRateMutation();
  const updateMutation = useUpdateTaxRateMutation();
  const deleteMutation = useDeleteTaxRateMutation();

  const taxRates = taxRatesQuery.data?.data ?? [];
  const activeCount = taxRates.filter((item) => item.isActive).length;
  const inactiveCount = taxRates.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: TaxRateFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: TaxRateFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTaxRate(null);
    setModalOpen(true);
  };

  const openEditModal = (taxRate: TaxRate) => {
    setModalMode("edit");
    setEditingTaxRate(taxRate);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTaxRate(null);
  };

  const handleSubmit = (values: CreateTaxRateRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingTaxRate) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingTaxRate.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<TaxRate> = [
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
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ชื่อภาษี",
      dataIndex: "name",
      key: "name",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: "อัตรา (%)",
      dataIndex: "rate",
      key: "rate",
      width: 110,
      align: "center",
      render: (value: number | string) => (
        <span className={styles.orderBadge}>{Number(value)}</span>
      ),
    },
    {
      title: "ประเภท",
      dataIndex: "taxType",
      key: "taxType",
      width: 110,
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
          ariaLabel={`เมนูจัดการ ${record.code}`}
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
                title: "ลบอัตราภาษี",
                content: `ต้องการลบ "${record.code}" หรือไม่?`,
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
    <MasterPageGate isLoading={taxRatesQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title="อัตราภาษี"
        subtitle="จัดการอัตราภาษีมูลค่าเพิ่มและประเภทภาษีที่ใช้ในเอกสาร"
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มอัตราภาษี
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "อัตราภาษีทั้งหมด"}
            </span>
            <strong>{taxRates.length}</strong>
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
            <h3>ค้นหาอัตราภาษี</h3>
            <p>กรองด้วยรหัส ชื่อ อัตรา ประเภท และสถานะ</p>
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
              <Form.Item name="code" label="รหัสภาษี">
                <Input
                  allowClear
                  placeholder="เช่น VAT7"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label="ชื่อภาษี">
                <Input allowClear placeholder="เช่น มูลค่าเพิ่ม" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={4}>
              <Form.Item name="rate" label="อัตรา (%)">
                <InputNumber
                  min={0}
                  step={0.01}
                  placeholder="เช่น 7"
                  controls={false}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={4}>
              <Form.Item name="taxType" label="ประเภท">
                <Select
                  allowClear
                  placeholder="ทั้งหมด"
                  options={[
                    { value: "VAT", label: "VAT" },
                    { value: "WHT", label: "WHT" },
                    { value: "NONE", label: "NONE" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={4}>
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
            <div className={styles.tableEyebrow}>TAX RATE MANAGEMENT</div>
            <h3>รายการอัตราภาษี</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลอัตราภาษีทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{taxRates.length} รายการ</div>
        </div>

        {taxRatesQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {taxRatesQuery.error instanceof Error
                ? taxRatesQuery.error.message
                : "โหลดข้อมูลอัตราภาษีไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={taxRates}
            loading={taxRatesQuery.isLoading || taxRatesQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
              onChange: setPage,
            }}
            scroll={{ x: 960 }}
            locale={{
              emptyText: hasFilters
                ? "ไม่พบอัตราภาษีตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลอัตราภาษี",
            }}
          />
        )}
      </div>

      <TaxRateFormModal
        open={modalOpen}
        mode={modalMode}
        initialTaxRate={editingTaxRate}
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
