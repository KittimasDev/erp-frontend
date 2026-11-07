"use client";

import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { usePartyLabels } from "@/lib/i18n/partyLabels";

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
import { useCreateSellerBankAccountMutation } from "@/hooks/seller-bank-accounts/useCreateSellerBankAccountMutation";
import { useDeleteSellerBankAccountMutation } from "@/hooks/seller-bank-accounts/useDeleteSellerBankAccountMutation";
import { useSellerBankAccountsQuery } from "@/hooks/seller-bank-accounts/useSellerBankAccountsQuery";
import { useUpdateSellerBankAccountMutation } from "@/hooks/seller-bank-accounts/useUpdateSellerBankAccountMutation";
import { useSellersQuery } from "@/hooks/sellers/useSellersQuery";
import type {
  CreateSellerBankAccountRequest,
  SellerBankAccount,
  SellerBankAccountQueryParams,
} from "@/types/seller-bank-accounts";

import SellerBankAccountFormModal from "./SellerBankAccountFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type SellerBankAccountFilterFormValues = {
  sellerId?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  isDefault?: boolean | null;
  isActive?: boolean | null;
};

const FILTER_KEYS = [
  "sellerId",
  "bankName",
  "accountNo",
  "accountName",
  "isDefault",
  "isActive",
] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): SellerBankAccountQueryParams {
  const params: SellerBankAccountQueryParams = {};

  const sellerId = searchParams.get("sellerId")?.trim();
  if (sellerId) {
    params.sellerId = sellerId;
  }

  const bankName = searchParams.get("bankName")?.trim();
  if (bankName) {
    params.bankName = bankName;
  }

  const accountNo = searchParams.get("accountNo")?.trim();
  if (accountNo) {
    params.accountNo = accountNo;
  }

  const accountName = searchParams.get("accountName")?.trim();
  if (accountName) {
    params.accountName = accountName;
  }

  const isDefaultRaw = searchParams.get("isDefault");
  if (isDefaultRaw === "true") {
    params.isDefault = true;
  } else if (isDefaultRaw === "false") {
    params.isDefault = false;
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
  params: SellerBankAccountQueryParams,
): SellerBankAccountFilterFormValues {
  return {
    sellerId: params.sellerId,
    bankName: params.bankName,
    accountNo: params.accountNo,
    accountName: params.accountName,
    isDefault: params.isDefault,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: SellerBankAccountFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.sellerId?.trim()) {
    next.set("sellerId", values.sellerId.trim());
  }

  if (values.bankName?.trim()) {
    next.set("bankName", values.bankName.trim());
  }

  if (values.accountNo?.trim()) {
    next.set("accountNo", values.accountNo.trim());
  }

  if (values.accountName?.trim()) {
    next.set("accountName", values.accountName.trim());
  }

  if (values.isDefault === true || values.isDefault === false) {
    next.set("isDefault", String(values.isDefault));
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

export default function SellerBankAccountsPage() {
  const t = useT();
  const lang = useLanguage();
  const partyLabels = usePartyLabels();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<SellerBankAccountFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingAccount, setEditingAccount] =
    useState<SellerBankAccount | null>(null);
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
  const accountsQuery = useSellerBankAccountsQuery(filters);
  const createMutation = useCreateSellerBankAccountMutation();
  const updateMutation = useUpdateSellerBankAccountMutation();
  const deleteMutation = useDeleteSellerBankAccountMutation();

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

  const accounts = accountsQuery.data?.data ?? [];
  const activeCount = accounts.filter((item) => item.isActive).length;
  const inactiveCount = accounts.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: SellerBankAccountFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: SellerBankAccountFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingAccount(null);
    setModalOpen(true);
  };

  const openEditModal = (account: SellerBankAccount) => {
    setModalMode("edit");
    setEditingAccount(account);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAccount(null);
  };

  const handleSubmit = (values: CreateSellerBankAccountRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingAccount) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingAccount.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<SellerBankAccount> = [
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
      title: t("ผู้ขาย"),
      dataIndex: "sellerId",
      key: "sellerId",
      width: 220,
      render: (value: string) => (
        <span className={styles.symbolText}>
          {sellerLabelById.get(value) || value}
        </span>
      ),
    },
    {
      title: t("ธนาคาร"),
      dataIndex: "bankName",
      key: "bankName",
      width: 160,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: t("เลขที่บัญชี"),
      dataIndex: "accountNo",
      key: "accountNo",
      width: 140,
      render: (value: string) => (
        <span className={styles.symbolText}>{value}</span>
      ),
    },
    {
      title: t("ชื่อบัญชี"),
      dataIndex: "accountName",
      key: "accountName",
      render: (value: string) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
        </div>
      ),
    },
    {
      title: t("บัญชีหลัก"),
      dataIndex: "isDefault",
      key: "isDefault",
      width: 110,
      align: "center",
      render: (value: boolean) =>
        value ? <Tag color="processing">{partyLabels.primary}</Tag> : <Tag>{partyLabels.secondary}</Tag>,
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
          ariaLabel={t("เมนูจัดการ {no}", { no: record.accountNo })}
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
                title: t("ลบบัญชีธนาคาร"),
                content: t('ต้องการลบ "{code}" หรือไม่?', { code: record.accountNo }),
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
    <MasterPageGate isLoading={accountsQuery.isLoading}>
      <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        title={t("บัญชีธนาคารผู้ขาย")}
        subtitle={t("จัดการบัญชีธนาคารสำหรับโอนเงินให้ผู้ขายยาง")}
        actions={
          <>
<Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          {t("เพิ่มบัญชี")}
        </Button>
          </>
        }
      />

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? t("ผลค้นหา") : t("บัญชีทั้งหมด")}
            </span>
            <strong>{accounts.length}</strong>
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
            <h3>{t("ค้นหาบัญชีธนาคาร")}</h3>
            <p>{t("กรองด้วยผู้ขาย ธนาคาร เลขบัญชี และสถานะ")}</p>
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
              <Form.Item name="bankName" label={t("ชื่อธนาคาร")}>
                <Input
                  allowClear
                  placeholder={t("เช่น กรุงเทพ")}
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="accountNo" label={t("เลขที่บัญชี")}>
                <Input allowClear placeholder={t("เช่น 1234")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="accountName" label={t("ชื่อบัญชี")}>
                <Input allowClear placeholder={t("เช่น ABC")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="isDefault" label={t("บัญชีหลัก")}>
                <Select
                  allowClear
                  placeholder={t("ทั้งหมด")}
                  options={[
                    { value: true, label: partyLabels.primary },
                    { value: false, label: partyLabels.secondary },
                  ]}
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
            <div className={styles.tableEyebrow}>BANK ACCOUNT MANAGEMENT</div>
            <h3>{t("รายการบัญชีธนาคารผู้ขาย")}</h3>
            <p>
              {hasFilters
                ? t("ผลลัพธ์ตามเงื่อนไขการค้นหา")
                : t("ข้อมูลบัญชีธนาคารผู้ขายทั้งหมดที่ใช้ภายในระบบ")}
            </p>
          </div>

          <div className={styles.tableCount}>{t("{n} รายการ", { n: accounts.length })}</div>
        </div>

        {accountsQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {accountsQuery.error instanceof Error
                ? accountsQuery.error.message
                : t("โหลดข้อมูลบัญชีธนาคารไม่สำเร็จ")}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={accounts}
            loading={accountsQuery.isLoading || accountsQuery.isFetching}
            pagination={{
              current: page,
              pageSize,
              showSizeChanger: false,
              showTotal: (total) => t("ทั้งหมด {total} รายการ", { total }),
              onChange: setPage,
            }}
            scroll={{ x: 1210 }}
            locale={{
              emptyText: hasFilters
                ? t("ไม่พบบัญชีธนาคารตามเงื่อนไขที่ค้นหา")
                : t("ยังไม่มีข้อมูลบัญชีธนาคาร"),
            }}
          />
        )}
      </div>

      <SellerBankAccountFormModal
        open={modalOpen}
        mode={modalMode}
        initialAccount={editingAccount}
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
