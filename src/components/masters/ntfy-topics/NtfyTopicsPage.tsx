"use client";

import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Col, Form, Input, Row, Select, Space, Table, Tag, Typography } from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import PageHeader from "@/components/common/PageHeader";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useCreateNtfyTopicMutation } from "@/hooks/ntfy-topics/useCreateNtfyTopicMutation";
import { useDeleteNtfyTopicMutation } from "@/hooks/ntfy-topics/useDeleteNtfyTopicMutation";
import { useNtfyTopicsQuery } from "@/hooks/ntfy-topics/useNtfyTopicsQuery";
import { useUpdateNtfyTopicMutation } from "@/hooks/ntfy-topics/useUpdateNtfyTopicMutation";
import type {
  CreateNtfyTopicRequest,
  NtfyTopic,
  NtfyTopicQueryParams,
} from "@/types/ntfy-topics";

import NtfyTopicFormModal from "./NtfyTopicFormModal";
import styles from "@/components/masters/shared/master-page.module.css";

type FilterValues = {
  topic?: string;
  description?: string;
  isActive?: boolean | null;
};

const FILTER_KEYS = ["topic", "description", "isActive"] as const;

function parseFilters(searchParams: URLSearchParams): NtfyTopicQueryParams {
  const params: NtfyTopicQueryParams = {};
  const topic = searchParams.get("topic")?.trim();
  if (topic) params.topic = topic;
  const description = searchParams.get("description")?.trim();
  if (description) params.description = description;
  const isActiveRaw = searchParams.get("isActive");
  if (isActiveRaw === "true") params.isActive = true;
  else if (isActiveRaw === "false") params.isActive = false;
  return params;
}

function toFormValues(params: NtfyTopicQueryParams): FilterValues {
  return {
    topic: params.topic,
    description: params.description,
    isActive: params.isActive,
  };
}

function buildSearch(values: FilterValues): URLSearchParams {
  const next = new URLSearchParams();
  if (values.topic?.trim()) next.set("topic", values.topic.trim());
  if (values.description?.trim()) next.set("description", values.description.trim());
  if (values.isActive === true || values.isActive === false) {
    next.set("isActive", String(values.isActive));
  }
  return next;
}

export default function NtfyTopicsPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [form] = Form.useForm<FilterValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<NtfyTopic | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const hasFilters = FILTER_KEYS.some((key) => filters[key] !== undefined);

  useEffect(() => {
    form.setFieldsValue(toFormValues(filters));
  }, [filters, form]);

  const [pagedFilters, setPagedFilters] = useState(filters);
  if (pagedFilters !== filters) {
    setPagedFilters(filters);
    setPage(1);
  }

  const topicsQuery = useNtfyTopicsQuery(filters);
  const createMutation = useCreateNtfyTopicMutation();
  const updateMutation = useUpdateNtfyTopicMutation();
  const deleteMutation = useDeleteNtfyTopicMutation();
  const topics = topicsQuery.data?.data ?? [];
  const activeCount = topics.filter((item) => item.isActive).length;
  const inactiveCount = topics.filter((item) => !item.isActive).length;

  const applyFilters = (values: FilterValues) => {
    const next = buildSearch(values);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: CreateNtfyTopicRequest) => {
    if (modalMode === "create") {
      createMutation.mutate(values, { onSuccess: closeModal });
      return;
    }
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, body: values }, { onSuccess: closeModal });
  };

  const columns: ColumnsType<NtfyTopic> = [
    {
      title: t("ลำดับ"),
      key: "rowNo",
      width: 90,
      align: "center",
      render: (_value, _record, index) => (
        <span className={styles.orderBadge}>{(page - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: t("ชื่อ topic"),
      dataIndex: "topic",
      key: "topic",
      width: 220,
      render: (value: string) => <span className={styles.codeBadge}>{value}</span>,
    },
    {
      title: t("แจ้งเตือนเรื่อง"),
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (value: string) => <span className={styles.symbolText}>{value}</span>,
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
          ariaLabel={t("เมนูจัดการ {no}", { no: record.topic })}
          actions={[
            {
              key: "edit",
              icon: <EditOutlined />,
              label: t("แก้ไข"),
              onClick: () => {
                setModalMode("edit");
                setEditing(record);
                setModalOpen(true);
              },
            },
            "divider",
            {
              key: "delete",
              icon: <DeleteOutlined />,
              label: t("ลบ"),
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: t("ลบหัวข้อแจ้งเตือน"),
                content: t('ต้องการลบ "{code}" หรือไม่?', { code: record.topic }),
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
    <MasterPageGate isLoading={topicsQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MASTER DATA"
          title={t("หัวข้อแจ้งเตือน ntfy")}
          subtitle={t("กำหนดชื่อ topic และคำอธิบายว่าแต่ละหัวข้อแจ้งเตือนเรื่องอะไร")}
          actions={
            <Button
              type="primary"
              size="large"
              className={styles.createButton}
              icon={<PlusOutlined />}
              onClick={() => {
                setModalMode("create");
                setEditing(null);
                setModalOpen(true);
              }}
            >
              {t("เพิ่มหัวข้อแจ้งเตือน")}
            </Button>
          }
        />

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>Σ</div>
            <div>
              <span className={styles.summaryLabel}>
                {hasFilters ? t("ผลค้นหา") : t("หัวข้อทั้งหมด")}
              </span>
              <strong>{topics.length}</strong>
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
              <h3>{t("ค้นหาหัวข้อแจ้งเตือน")}</h3>
              <p>{t("กรองด้วยชื่อ topic คำอธิบาย และสถานะ")}</p>
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
            onFinish={applyFilters}
            initialValues={toFormValues(filters)}
          >
            <Row gutter={[16, 4]}>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="topic" label={t("ชื่อ topic")}>
                  <Input allowClear placeholder="astar" prefix={<SearchOutlined />} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="description" label={t("แจ้งเตือนเรื่อง")}>
                  <Input allowClear placeholder={t("เช่น ใบรับซื้อ")} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} lg={8}>
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
                      onClick={() => {
                        form.resetFields();
                        router.replace(pathname);
                      }}
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
              <div className={styles.tableEyebrow}>NTFY TOPICS</div>
              <h3>{t("รายการหัวข้อแจ้งเตือน")}</h3>
              <p>
                {hasFilters
                  ? t("ผลลัพธ์ตามเงื่อนไขการค้นหา")
                  : t("หัวข้อที่ผู้ใช้เลือกเพื่อรับแจ้งเตือนบนมือถือ")}
              </p>
            </div>
            <div className={styles.tableCount}>{t("{n} รายการ", { n: topics.length })}</div>
          </div>
          {topicsQuery.isError ? (
            <div className={styles.errorBox}>
              <Typography.Text type="danger">
                {topicsQuery.error instanceof Error
                  ? topicsQuery.error.message
                  : t("โหลดหัวข้อแจ้งเตือนไม่สำเร็จ")}
              </Typography.Text>
            </div>
          ) : (
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={columns}
              dataSource={topics}
              loading={topicsQuery.isLoading || topicsQuery.isFetching}
              pagination={{
                current: page,
                pageSize,
                showSizeChanger: false,
                showTotal: (total) => t("ทั้งหมด {total} รายการ", { total }),
                onChange: setPage,
              }}
              scroll={{ x: 960 }}
              locale={{
                emptyText: hasFilters
                  ? t("ไม่พบหัวข้อแจ้งเตือนตามเงื่อนไขที่ค้นหา")
                  : t("ยังไม่มีหัวข้อแจ้งเตือน"),
              }}
            />
          )}
        </div>

        <NtfyTopicFormModal
          open={modalOpen}
          mode={modalMode}
          initialTopic={editing}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      </section>
    </MasterPageGate>
  );
}
