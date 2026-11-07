"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { App } from "antd";

import MasterPageGate from "@/components/common/MasterPageGate";
import RowActionsMenu from "@/components/common/RowActionsMenu";
import { useCreateTempCaseMutation } from "@/hooks/temp-cases/useCreateTempCaseMutation";
import { useDeleteTempCaseMutation } from "@/hooks/temp-cases/useDeleteTempCaseMutation";
import { useTempCaseCategoriesQuery } from "@/hooks/temp-cases/useTempCaseCategoriesQuery";
import { tempCaseImagesQueryKey } from "@/hooks/temp-cases/useTempCaseImagesQuery";
import { useTempCasesQuery } from "@/hooks/temp-cases/useTempCasesQuery";
import { useUpdateTempCaseMutation } from "@/hooks/temp-cases/useUpdateTempCaseMutation";
import { ApiError } from "@/lib/api/client";
import { uploadTempCaseImage } from "@/lib/api/temp-cases";
import { getAccessToken } from "@/lib/auth/token";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { TempCase, TempCaseStatus } from "@/types/temp-cases";
import { TEMP_CASE_STATUS_LABEL } from "@/types/temp-cases";

import CaseDashboardModal from "./CaseDashboardModal";
import CaseFormModal, { type CaseFormSubmitPayload } from "./CaseFormModal";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";

type StatusFilter = "ALL" | TempCaseStatus;

export default function CasesPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingCase, setEditingCase] = useState<TempCase | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const queryParams = useMemo(
    () => (statusFilter === "ALL" ? undefined : { status: statusFilter }),
    [statusFilter],
  );

  const casesQuery = useTempCasesQuery(queryParams);
  const categoriesQuery = useTempCaseCategoriesQuery();
  const createMutation = useCreateTempCaseMutation();
  const updateMutation = useUpdateTempCaseMutation();
  const deleteMutation = useDeleteTempCaseMutation();

  const cases = casesQuery.data?.data ?? [];
  const categories = categoriesQuery.data?.data ?? [];

  const openCount = cases.filter((c) => c.status === "OPEN").length;
  const doneCount = cases.filter((c) => c.status === "DONE").length;

  const openCreateModal = () => {
    setModalMode("create");
    setEditingCase(null);
    setModalOpen(true);
  };

  const openEditModal = (record: TempCase) => {
    setModalMode("edit");
    setEditingCase(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCase(null);
  };

  const uploadPendingImages = async (caseId: string, files: File[]) => {
    if (files.length === 0) {
      return;
    }
    setUploadingImages(true);
    let failed = 0;
    let lastError = "";
    try {
      for (const file of files) {
        try {
          await uploadTempCaseImage(getAccessToken(), caseId, file);
        } catch (error) {
          failed += 1;
          lastError =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : t("อัปโหลดไม่สำเร็จ");
        }
      }
      await Promise.all([
        casesQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: tempCaseImagesQueryKey(caseId),
        }),
      ]);
      if (failed > 0) {
        message.warning(
          `${t("บันทึกเคสแล้ว แต่แนบรูปไม่สำเร็จ {failed} ไฟล์", { failed })}${lastError ? ` — ${lastError}` : ""}`,
        );
      } else {
        message.success(t("แนบรูป {n} ไฟล์แล้ว", { n: files.length }));
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (values: CaseFormSubmitPayload) => {
    const { pendingFiles, ...body } = values;

    if (modalMode === "create") {
      const response = await createMutation.mutateAsync(body);
      await uploadPendingImages(response.data.id, pendingFiles);
      closeModal();
      return;
    }

    if (!editingCase) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingCase.id,
      body,
    });
    await uploadPendingImages(editingCase.id, pendingFiles);
    closeModal();
  };

  const toggleStatus = (record: TempCase) => {
    const nextStatus: TempCaseStatus =
      record.status === "OPEN" ? "DONE" : "OPEN";
    updateMutation.mutate({
      id: record.id,
      body: { status: nextStatus },
    });
  };

  const columns: ColumnsType<TempCase> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 10 + index + 1,
    },
    {
      title: t("หัวข้อ"),
      dataIndex: "title",
      key: "title",
      render: (value: string, record) => (
        <div className={styles.nameCell}>
          <span>{value}</span>
          <Typography.Paragraph
            type="secondary"
            style={{ marginBottom: 0, marginTop: 4, fontSize: 12 }}
            ellipsis={{ rows: 2 }}
          >
            {record.description}
          </Typography.Paragraph>
        </div>
      ),
    },
    {
      title: t("หมวด"),
      dataIndex: "categoryNameTh",
      key: "categoryNameTh",
      width: 110,
      render: (value?: string) => value || "-",
    },
    {
      title: "URL",
      dataIndex: "pageUrl",
      key: "pageUrl",
      width: 200,
      ellipsis: true,
      render: (value: string) => (
        <Typography.Link href={value} target="_blank" rel="noreferrer">
          {value}
        </Typography.Link>
      ),
    },
    {
      title: t("รูป"),
      dataIndex: "imageCount",
      key: "imageCount",
      width: 70,
      align: "center",
      render: (count: number) => (count > 0 ? <Tag>{count}</Tag> : "-"),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      width: 120,
      align: "center",
      render: (status: TempCaseStatus) =>
        status === "DONE" ? (
          <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
            <span className={styles.statusDot} />
            {t(TEMP_CASE_STATUS_LABEL[status])}
          </Tag>
        ) : (
          <Tag className={`${styles.statusTag} ${styles.statusInactive}`}>
            <span className={styles.statusDot} />
            {t(TEMP_CASE_STATUS_LABEL[status])}
          </Tag>
        ),
    },
    {
      title: t("ผู้สร้าง"),
      dataIndex: "createdByDisplayName",
      key: "createdByDisplayName",
      width: 130,
      render: (value?: string) => value || "-",
    },
    {
      title: t("วันที่"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
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
          ariaLabel={t("เมนูจัดการเคส {title}", { title: record.title })}
          actions={[
            {
              key: "toggle",
              icon:
                record.status === "OPEN" ? (
                  <CheckOutlined />
                ) : (
                  <ReloadOutlined />
                ),
              label: record.status === "OPEN" ? t("ทำแล้ว") : t("เปิดใหม่"),
              onClick: () => toggleStatus(record),
            },
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
              label: t("ลบเคส"),
              danger: true,
              onClick: () => deleteMutation.mutate(record.id),
              confirm: {
                title: t("ลบเคส"),
                content: t("ต้องการลบ \"{title}\" หรือไม่?", { title: record.title }),
                okText: t("ลบ"),
                cancelText: t("ยกเลิก"),
              },
            },
          ]}
        />
      ),
    },
  ];

  const loading =
    casesQuery.isLoading ||
    casesQuery.isFetching ||
    categoriesQuery.isLoading;

  const formBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    uploadingImages;

  return (
    <MasterPageGate isLoading={categoriesQuery.isLoading && !categories.length}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="TEMP TRACKER"
          title="Case / Issue"
          subtitle={t("บันทึกเคสจากหน้าจอในระบบสำหรับทีม — หน้าชั่วคราว ลบทิ้งได้เมื่อจบโปรเจกต์")}
          actions={
            <>
<Space>
            <Button size="large" onClick={() => setDashboardOpen(true)}>
              Dashboard
            </Button>
            <Button
              type="primary"
              size="large"
              className={styles.createButton}
              onClick={openCreateModal}
            >
              <span className={styles.plusIcon}>+</span>
              {t("เพิ่มเคส")}
            </Button>
          </Space>
            </>
          }
        />

        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.summaryTotal}`}>
            <div className={styles.summaryIcon}>Σ</div>
            <div>
              <span className={styles.summaryLabel}>{t("ทั้งหมด (ตามตัวกรอง)")}</span>
              <strong>{cases.length}</strong>
            </div>
          </div>
          <div className={`${styles.summaryCard} ${styles.summaryInactive}`}>
            <div className={styles.summaryIcon}>○</div>
            <div>
              <span className={styles.summaryLabel}>{t("ยังไม่ทำ")}</span>
              <strong>{openCount}</strong>
            </div>
          </div>
          <div className={`${styles.summaryCard} ${styles.summaryActive}`}>
            <div className={styles.summaryIcon}>✓</div>
            <div>
              <span className={styles.summaryLabel}>{t("ทำแล้ว")}</span>
              <strong>{doneCount}</strong>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Segmented
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
            options={[
              { label: t("ทั้งหมด"), value: "ALL" },
              { label: t("ยังไม่ทำ"), value: "OPEN" },
              { label: t("ทำแล้ว"), value: "DONE" },
            ]}
          />
        </div>

        <Table<TempCase>
          rowKey="id"
          columns={columns}
          dataSource={cases}
          loading={loading}
          pagination={{ current: page, pageSize: 10, onChange: setPage }}
          scroll={{ x: 1040 }}
        />

        <CaseFormModal
          open={modalOpen}
          mode={modalMode}
          initialCase={editingCase}
          categories={categories}
          confirmLoading={formBusy}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />

        <CaseDashboardModal
          open={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
        />
      </section>
    </MasterPageGate>
  );
}
