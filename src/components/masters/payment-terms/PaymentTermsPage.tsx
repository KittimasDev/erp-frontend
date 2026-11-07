"use client";

import { formatDateTime } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
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
import { useCreatePaymentTermMutation } from "@/hooks/payment-terms/useCreatePaymentTermMutation";
import { useDeletePaymentTermMutation } from "@/hooks/payment-terms/useDeletePaymentTermMutation";
import { usePaymentTermsQuery } from "@/hooks/payment-terms/usePaymentTermsQuery";
import { useUpdatePaymentTermMutation } from "@/hooks/payment-terms/useUpdatePaymentTermMutation";
import {
  PAYMENT_TERM_TYPE_COLOR,
  PAYMENT_TERM_TYPE_LABEL,
  type CreatePaymentTermRequest,
  type PaymentTerm,
  type PaymentTermQueryParams,
  type PaymentTermType,
} from "@/types/payment-terms";

import PaymentTermFormModal from "./PaymentTermFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type PaymentTermFilterFormValues = {
  code?: string;
  name?: string;
  creditDays?: number | null;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["code", "name", "creditDays", "isActive"] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): PaymentTermQueryParams {
  const params: PaymentTermQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const name = searchParams.get("name")?.trim();
  if (name) {
    params.name = name;
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
  params: PaymentTermQueryParams,
): PaymentTermFilterFormValues {
  return {
    code: params.code,
    name: params.name,
    creditDays: params.creditDays,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: PaymentTermFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.name?.trim()) {
    next.set("name", values.name.trim());
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

export default function PaymentTermsPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<PaymentTermFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingPaymentTerm, setEditingPaymentTerm] =
    useState<PaymentTerm | null>(null);
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

  const paymentTermsQuery = usePaymentTermsQuery(filters);
  const createMutation = useCreatePaymentTermMutation();
  const updateMutation = useUpdatePaymentTermMutation();
  const deleteMutation = useDeletePaymentTermMutation();

  const paymentTerms = paymentTermsQuery.data?.data ?? [];
  const activeCount = paymentTerms.filter((item) => item.isActive).length;
  const inactiveCount = paymentTerms.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: PaymentTermFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: PaymentTermFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingPaymentTerm(null);
    setModalOpen(true);
  };

  const openEditModal = (paymentTerm: PaymentTerm) => {
    setModalMode("edit");
    setEditingPaymentTerm(paymentTerm);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPaymentTerm(null);
  };

  const handleSubmit = (values: CreatePaymentTermRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingPaymentTerm) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingPaymentTerm.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<PaymentTerm> = [
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
      dataIndex: "code",
      key: "code",
      width: 160,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: t("ชื่อเงื่อนไข"),
      dataIndex: "name",
      key: "name",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: t("ประเภท"),
      dataIndex: "termType",
      key: "termType",
      width: 200,
      render: (value: PaymentTermType | undefined, record) =>
        value ? (
          <Tag color={PAYMENT_TERM_TYPE_COLOR[value]}>
            {t(PAYMENT_TERM_TYPE_LABEL[value])}
            {value === "ADVANCE" ? ` ${record.advancePercent}%` : ""}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: t("วันเครดิต"),
      dataIndex: "creditDays",
      key: "creditDays",
      width: 120,
      align: "center",
      render: (value: number) => (
        <span className={styles.orderBadge}>{value}</span>
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
          {formatDateTime(value, lang)}
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
          ariaLabel={t("เมนูจัดการ {no}", { no: record.code })}
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
                title: t("ลบเงื่อนไขชำระเงิน"),
                content: t('ต้องการลบ "{name}" หรือไม่?', { name: record.code }),
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
    <MasterPageGate isLoading={paymentTermsQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title={t("เงื่อนไขชำระเงิน")}
        subtitle={t("จัดการเงื่อนไขการชำระเงินและจำนวนวันเครดิตของผู้ขาย")}
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          {t("เพิ่มเงื่อนไข")}
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? t("ผลค้นหา") : t("เงื่อนไขทั้งหมด")}
            </span>
            <strong>{paymentTerms.length}</strong>
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
            <h3>{t("ค้นหาเงื่อนไข")}</h3>
            <p>{t("กรองด้วยรหัส ชื่อ วันเครดิต และสถานะ")}</p>
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
              <Form.Item name="code" label={t("รหัสเงื่อนไข")}>
                <Input
                  allowClear
                  placeholder={t("เช่น CREDIT_30")}
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="name" label={t("ชื่อเงื่อนไข")}>
                <Input allowClear placeholder={t("เช่น เครดิต")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="creditDays" label={t("วันเครดิต")}>
                <InputNumber
                  className={styles.filterNumber}
                  min={0}
                  precision={0}
                  placeholder={t("เช่น 30")}
                  controls={false}
                  style={{ width: "100%" }}
                />
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

            <Col xs={24}>
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
            <div className={styles.tableEyebrow}>PAYMENT TERM MANAGEMENT</div>
            <h3>{t("รายการเงื่อนไขชำระเงิน")}</h3>
            <p>
              {hasFilters
                ? t("ผลลัพธ์ตามเงื่อนไขการค้นหา")
                : t("ข้อมูลเงื่อนไขทั้งหมดที่ใช้ภายในระบบ")}
            </p>
          </div>

          <div className={styles.tableCount}>{t("{n} รายการ", { n: paymentTerms.length })}</div>
        </div>

        {paymentTermsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {paymentTermsQuery.error instanceof Error
                ? paymentTermsQuery.error.message
                : t("โหลดข้อมูลเงื่อนไขชำระเงินไม่สำเร็จ")}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={paymentTerms}
            loading={
              paymentTermsQuery.isLoading || paymentTermsQuery.isFetching
            }
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
                ? t("ไม่พบเงื่อนไขตามเงื่อนไขที่ค้นหา")
                : t("ยังไม่มีข้อมูลเงื่อนไขชำระเงิน"),
            }}
          />
        )}
      </div>

      <PaymentTermFormModal
        open={modalOpen}
        mode={modalMode}
        initialPaymentTerm={editingPaymentTerm}
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
