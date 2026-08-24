"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Col,
  DatePicker,
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
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateRawTirePriceRuleMutation } from "@/hooks/raw-tire-price-rules/useCreateRawTirePriceRuleMutation";
import { useDeleteRawTirePriceRuleMutation } from "@/hooks/raw-tire-price-rules/useDeleteRawTirePriceRuleMutation";
import { useRawTirePriceRulesQuery } from "@/hooks/raw-tire-price-rules/useRawTirePriceRulesQuery";
import { useUpdateRawTirePriceRuleMutation } from "@/hooks/raw-tire-price-rules/useUpdateRawTirePriceRuleMutation";
import { useTireClassificationsQuery } from "@/hooks/tire-classifications/useTireClassificationsQuery";
import type {
  CreateRawTirePriceRuleRequest,
  RawTirePriceRule,
  RawTirePriceRuleQueryParams,
} from "@/types/raw-tire-price-rules";

import RawTirePriceRuleFormModal from "./RawTirePriceRuleFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type PriceRuleFilterFormValues = {
  code?: string;
  tireClassificationId?: string;
  effectiveOn?: Dayjs | null;
  isActive?: boolean | null;
};

const FILTER_KEYS = [
  "code",
  "tireClassificationId",
  "effectiveOn",
  "isActive",
] as const;

function parseFiltersFromSearch(
  searchParams: URLSearchParams,
): RawTirePriceRuleQueryParams {
  const params: RawTirePriceRuleQueryParams = {};

  const code = searchParams.get("code")?.trim();
  if (code) {
    params.code = code;
  }

  const tireClassificationId = searchParams
    .get("tireClassificationId")
    ?.trim();
  if (tireClassificationId) {
    params.tireClassificationId = tireClassificationId;
  }

  const effectiveOn = searchParams.get("effectiveOn")?.trim();
  if (effectiveOn) {
    params.effectiveOn = effectiveOn;
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
  params: RawTirePriceRuleQueryParams,
): PriceRuleFilterFormValues {
  return {
    code: params.code,
    tireClassificationId: params.tireClassificationId,
    effectiveOn: params.effectiveOn ? dayjs(params.effectiveOn) : null,
    isActive: params.isActive,
  };
}

function buildSearchFromForm(
  values: PriceRuleFilterFormValues,
): URLSearchParams {
  const next = new URLSearchParams();

  if (values.code?.trim()) {
    next.set("code", values.code.trim());
  }

  if (values.tireClassificationId?.trim()) {
    next.set("tireClassificationId", values.tireClassificationId.trim());
  }

  if (values.effectiveOn) {
    next.set("effectiveOn", values.effectiveOn.format("YYYY-MM-DD"));
  }

  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }

  return next;
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("DD/MM/YYYY");
}

export default function RawTirePriceRulesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<PriceRuleFilterFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingRule, setEditingRule] = useState<RawTirePriceRule | null>(
    null,
  );
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

  const classificationsQuery = useTireClassificationsQuery();
  const rulesQuery = useRawTirePriceRulesQuery(filters);
  const createMutation = useCreateRawTirePriceRuleMutation();
  const updateMutation = useUpdateRawTirePriceRuleMutation();
  const deleteMutation = useDeleteRawTirePriceRuleMutation();

  const classifications = classificationsQuery.data?.data ?? [];
  const classificationOptions = useMemo(
    () =>
      classifications.map((item) => ({
        value: item.id,
        label: `${item.classificationCode} — ${item.classificationName}`,
      })),
    [classifications],
  );

  /** ฟอร์มเพิ่ม/แก้กฎ — แสดงเฉพาะประเภทที่ active (ถ้าแก้กฎที่ผูกประเภทปิดอยู่ ให้คงตัวเดิมในรายการ) */
  const formClassificationOptions = useMemo(() => {
    const active = classifications.filter((item) => item.isActive);
    if (
      modalMode === "edit" &&
      editingRule?.tireClassificationId &&
      !active.some((item) => item.id === editingRule.tireClassificationId)
    ) {
      const current = classifications.find(
        (item) => item.id === editingRule.tireClassificationId,
      );
      if (current) {
        return [...active, current].map((item) => ({
          value: item.id,
          label: `${item.classificationCode} — ${item.classificationName}${
            item.isActive ? "" : " (ปิดใช้งาน)"
          }`,
        }));
      }
    }
    return active.map((item) => ({
      value: item.id,
      label: `${item.classificationCode} — ${item.classificationName}`,
    }));
  }, [classifications, modalMode, editingRule]);

  const classificationLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of classifications) {
      map.set(
        item.id,
        `${item.classificationCode} — ${item.classificationName}`,
      );
    }
    return map;
  }, [classifications]);

  const rules = rulesQuery.data?.data ?? [];
  const activeCount = rules.filter((item) => item.isActive).length;
  const inactiveCount = rules.filter((item) => !item.isActive).length;

  const applyFiltersToUrl = (values: PriceRuleFilterFormValues) => {
    const next = buildSearchFromForm(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleSearch = (values: PriceRuleFilterFormValues) => {
    applyFiltersToUrl(values);
  };

  const handleClearFilters = () => {
    form.resetFields();
    router.replace(pathname);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingRule(null);
    setModalOpen(true);
  };

  const openEditModal = (rule: RawTirePriceRule) => {
    setModalMode("edit");
    setEditingRule(rule);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRule(null);
  };

  const handleSubmit = (values: CreateRawTirePriceRuleRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, {
        onSuccess: closeModal,
      });
      return;
    }

    if (!editingRule) {
      return;
    }

    updateMutation.mutate(
      {
        id: editingRule.id,
        body: values,
      },
      {
        onSuccess: closeModal,
      },
    );
  };

  const columns: ColumnsType<RawTirePriceRule> = [
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
      dataIndex: "ruleCode",
      key: "ruleCode",
      width: 160,
      render: (value: string) => (
        <span className={styles.codeBadge}>{value}</span>
      ),
    },
    {
      title: "ประเภทสินค้า",
      dataIndex: "tireClassificationId",
      key: "tireClassificationId",
      width: 200,
      render: (value: string) => (
        <span className={styles.symbolText}>
          {classificationLabelById.get(value) || value}
        </span>
      ),
    },
    {
      title: "ราคา/กก.",
      dataIndex: "pricePerKg",
      key: "pricePerKg",
      width: 110,
      align: "right",
      render: (value: string | number) => (
        <span className={styles.orderBadge}>
          {Number(value).toLocaleString("th-TH")}
        </span>
      ),
    },
    {
      title: "เริ่มมีผล",
      dataIndex: "effectiveFrom",
      key: "effectiveFrom",
      width: 120,
      render: (value: string) => (
        <span className={styles.symbolText}>{formatDate(value)}</span>
      ),
    },
    {
      title: "สิ้นสุดผล",
      dataIndex: "effectiveTo",
      key: "effectiveTo",
      width: 120,
      render: (value?: string) => (
        <span className={styles.symbolText}>{formatDate(value)}</span>
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
      width: 190,
      align: "center",
      render: (_, record) => (
        <Space size={8}>
          <Button
            className={styles.editButton}
            onClick={() => openEditModal(record)}
          >
            แก้ไข
          </Button>

          <Popconfirm
            title="ลบกฎราคา"
            description={`ต้องการลบ "${record.ruleCode}" หรือไม่?`}
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button
              className={styles.deleteButton}
              loading={deleteMutation.isPending}
            >
              ลบ
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={rulesQuery.isLoading}>
      <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div />

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>MASTER DATA</div>

          <Typography.Title level={2} className={styles.pageTitle}>
            กฎราคาซื้อยาง
          </Typography.Title>

          <Typography.Text className={styles.pageSubtitle}>
            จัดการราคารับซื้อยางตามประเภทและช่วงวันที่มีผล
          </Typography.Text>
        </div>

        <Button
          type="primary"
          size="large"
          className={styles.createButton}
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          เพิ่มกฎราคา
        </Button>
      </div>

      <div className={styles.summaryRow}>
        <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
          <div className={styles.summaryIcon}>Σ</div>
          <div>
            <span className={styles.summaryLabel}>
              {hasFilters ? "ผลค้นหา" : "กฎทั้งหมด"}
            </span>
            <strong>{rules.length}</strong>
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
            <h3>ค้นหากฎราคาซื้อยาง</h3>
            <p>กรองด้วยรหัส ประเภทสินค้า วันที่มีผล และสถานะ</p>
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
              <Form.Item name="code" label="รหัสกฎ">
                <Input
                  allowClear
                  placeholder="เช่น PRULE"
                  prefix={<SearchOutlined />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="tireClassificationId" label="ประเภท/กลุ่มสินค้า">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="ทั้งหมด"
                  loading={classificationsQuery.isLoading}
                  options={classificationOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="effectiveOn" label="วันที่มีผล">
                <DatePicker
                  allowClear
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                  placeholder="เลือกวัน"
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
            <div className={styles.tableEyebrow}>PRICE RULE MANAGEMENT</div>
            <h3>รายการกฎราคาซื้อยาง</h3>
            <p>
              {hasFilters
                ? "ผลลัพธ์ตามเงื่อนไขการค้นหา"
                : "ข้อมูลกฎราคาซื้อยางทั้งหมดที่ใช้ภายในระบบ"}
            </p>
          </div>

          <div className={styles.tableCount}>{rules.length} รายการ</div>
        </div>

        {rulesQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {rulesQuery.error instanceof Error
                ? rulesQuery.error.message
                : "โหลดข้อมูลกฎราคาไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rules}
            loading={rulesQuery.isLoading || rulesQuery.isFetching}
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
                ? "ไม่พบกฎราคาตามเงื่อนไขที่ค้นหา"
                : "ยังไม่มีข้อมูลกฎราคา",
            }}
          />
        )}
      </div>

      <RawTirePriceRuleFormModal
        open={modalOpen}
        mode={modalMode}
        initialRule={editingRule}
        classificationOptions={formClassificationOptions}
        classificationsLoading={classificationsQuery.isLoading}
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
