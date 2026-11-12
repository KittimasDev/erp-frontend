"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Dropdown, Input, Select, Space, Table, Tabs, Tag } from "antd";
import { DownloadOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  ExperimentOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useLabSamplesQuery } from "@/hooks/laboratory/useLaboratoryQuery";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import type { LabSample } from "@/types/laboratory";
import {
  labSampleStatusLabel,
  LAB_SAMPLE_STATUS_COLOR,
  LAB_SAMPLE_STATUS_LABEL,
  LAB_SAMPLE_TYPE_LABEL,
  LAB_SAMPLE_TYPES,
} from "@/types/laboratory";
import LabCoaHistoryTab from "./LabCoaHistoryTab";
import LabSampleCreateModal from "./LabSampleCreateModal";
import LabSampleImportModal from "./LabSampleImportModal";
import { ApiError } from "@/lib/api/client";
import { downloadLabSampleImportTemplate } from "@/lib/api/laboratory";
import { getAccessToken } from "@/lib/auth/token";
import { downloadBlob } from "@/utils/downloadTabularReport";
import styles from "./LabSamplesListPage.module.css";
import PageHeader from "@/components/common/PageHeader";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

export default function LabSamplesListPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [sampleNo, setSampleNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [sampleType, setSampleType] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const { message } = App.useApp();

  const downloadTemplate = async (format: "xlsx" | "csv") => {
    try {
      const { blob, filename } = await downloadLabSampleImportTemplate(
        getAccessToken(),
        format,
      );
      downloadBlob(filename ?? `lab-samples-import-template.${format}`, blob);
    } catch (e) {
      message.error(
        e instanceof ApiError ? e.message : t("ดาวน์โหลด Template ไม่สำเร็จ"),
      );
    }
  };
  const [tab, setTab] = useState<"samples" | "coas">("samples");
  const { canAdd } = getScreenActionPermissions("LAB_SAMPLES");
  const [applied, setApplied] = useState<{
    sampleNo?: string;
    status?: string;
    sampleType?: string;
  }>({});

  const query = useLabSamplesQuery(applied);
  const rows = query.data?.data ?? [];

  const columns: ColumnsType<LabSample> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * 20 + index + 1,
      },
      {
        title: t("เลขที่ตัวอย่าง"),
        dataIndex: "sampleNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      {
        title: t("ประเภท"),
        dataIndex: "sampleType",
        render: (v: string) => t(LAB_SAMPLE_TYPE_LABEL[v] ?? v),
      },
      {
        title: t("สินค้า / Lot"),
        key: "lot",
        render: (_v, row) =>
          row.lotNo ? (
            <div>
              <div>{row.itemNameTh ?? row.itemCode ?? "—"}</div>
              <div style={{ fontSize: 12, color: "#8a94a6" }}>
                Lot {row.lotNo}
                {row.batchNo ? ` · Batch ${row.batchNo}` : ""}
              </div>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: t("วันที่เก็บ"),
        dataIndex: "collectedDate",
        width: 110,
        render: formatDate,
      },
      {
        title: t("อ้างอิง"),
        dataIndex: "referenceDocNo",
        render: (v?: string) => v ?? "—",
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        width: 120,
        render: (v: string) => (
          <Tag
            color={LAB_SAMPLE_STATUS_COLOR[v] ?? "default"}
          >
            {labSampleStatusLabel(v, lang)}
          </Tag>
        ),
      },
      {
        title: t("ผลตรวจ"),
        key: "results",
        width: 80,
        align: "center",
        render: (_v, row) => row.results?.length ?? 0,
      },
      {
        title: "",
        key: "actions",
        width: 56,
        render: (_v, row) => (
          <Space size={6} onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/laboratory/samples/${row.id}`)}
            />
          </Space>
        ),
      },
    ],
    [router, page, t, lang],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Laboratory · LIMS"
        icon={<ExperimentOutlined />}
        title={t("ตัวอย่างตรวจสอบ")}
        subtitle={t(
          "ลงทะเบียนตัวอย่างจากการผลิต วัตถุดิบ สารเคมี สินค้าสำเร็จรูป พร้อมผูก Lot · พิมพ์ Certificate of Analysis (COA)",
        )}
        actions={
          <>
          <Dropdown
            menu={{
              items: [
                { key: "xlsx", label: t("Excel (.xlsx)") },
                { key: "csv", label: t("CSV (.csv)") },
              ],
              onClick: ({ key }) => void downloadTemplate(key as "xlsx" | "csv"),
            }}
          >
            <Button size="large" icon={<DownloadOutlined />}>
              {t("ดาวน์โหลด Template")}
            </Button>
          </Dropdown>
          {canAdd ? (
            <Button
              size="large"
              icon={<UploadOutlined />}
              onClick={() => setImporting(true)}
            >
              {t("นำเข้าข้อมูล")}
            </Button>
          ) : null}
{canAdd ? (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
          >
            {t("ลงทะเบียนตัวอย่าง")}
          </Button>
        ) : null}
          </>
        }
      />

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as "samples" | "coas")}
        items={[
          { key: "samples", label: t("ตัวอย่าง") },
          { key: "coas", label: t("ประวัติ COA") },
        ]}
      />

      {tab === "coas" ? <LabCoaHistoryTab /> : null}
      {tab === "samples" ? (
        <>
          <section className={styles.filterCard}>
            <div className={styles.filterGrid}>
              <div className={styles.filterItem}>
                <label>{t("ประเภท")}</label>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  value={sampleType}
                  onChange={setSampleType}
                  options={LAB_SAMPLE_TYPES.map((value) => ({
                    value,
                    label: t(LAB_SAMPLE_TYPE_LABEL[value]),
                  }))}
                />
              </div>
              <div className={styles.filterItem}>
                <label>{t("ค้นหา")}</label>
                <Input
                  allowClear
                  value={sampleNo}
                  onChange={(e) => setSampleNo(e.target.value)}
                  placeholder={t("เช่น LS-20260723")}
                />
              </div>
              <div className={styles.filterItem}>
                <label>{t("สถานะ")}</label>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  value={status}
                  onChange={setStatus}
                  options={Object.keys(LAB_SAMPLE_STATUS_LABEL).map(
                    (value) => ({
                      value,
                      label: labSampleStatusLabel(value, lang),
                    }),
                  )}
                />
              </div>
            </div>
            <div className={styles.filterActions}>
              <Button
                onClick={() => {
                  setSampleNo("");
                  setStatus(undefined);
                  setSampleType(undefined);
                  setApplied({});
                }}
              >
                {t("เคลียร์")}
              </Button>
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<SearchOutlined />}
                onClick={() =>
                  setApplied({
                    sampleNo: sampleNo.trim() || undefined,
                    status,
                    sampleType,
                  })
                }
              >
                {t("ค้นหา")}
              </Button>
            </div>
          </section>

          <section className={styles.tableCard}>
            <Table
              rowKey="id"
              loading={query.isLoading}
              columns={columns}
              dataSource={rows}
              pagination={{ current: page, pageSize: 20, onChange: setPage }}
              onRow={(row) => ({
                onClick: () => router.push(`/laboratory/samples/${row.id}`),
              })}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>{t("ยังไม่มีตัวอย่าง")}</strong>
                    {t("กดปุ่มลงทะเบียนตัวอย่างเพื่อเริ่มต้น")}
                  </div>
                ),
              }}
            />
          </section>
        </>
      ) : null}
      <LabSampleImportModal open={importing} onClose={() => setImporting(false)} />
      {creating ? (
        <LabSampleCreateModal
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/laboratory/samples/${id}`)}
        />
      ) : null}
    </div>
  );
}
