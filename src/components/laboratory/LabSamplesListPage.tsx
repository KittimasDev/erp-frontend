"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, EyeOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useLabSamplesQuery } from "@/hooks/laboratory/useLaboratoryQuery";
import type { LabSample } from "@/types/laboratory";
import { LAB_SAMPLE_STATUS_LABEL } from "@/types/laboratory";
import styles from "./LabSamplesListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function LabSamplesListPage() {
  const router = useRouter();
  const [sampleNo, setSampleNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [applied, setApplied] = useState<{
    sampleNo?: string;
    status?: string;
  }>({});

  const query = useLabSamplesQuery(applied);
  const rows = query.data?.data ?? [];

  const columns: ColumnsType<LabSample> = useMemo(
    () => [
      {
        title: "เลขที่ตัวอย่าง",
        dataIndex: "sampleNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      {
        title: "ประเภท",
        dataIndex: "sampleType",
      },
      {
        title: "วันที่เก็บ",
        dataIndex: "collectedDate",
        width: 110,
        render: formatDate,
      },
      {
        title: "อ้างอิง",
        dataIndex: "referenceDocNo",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        width: 120,
        render: (v: string) => (
          <Tag
            color={
              v === "APPROVED"
                ? "success"
                : v === "REJECTED"
                  ? "error"
                  : v === "TESTING"
                    ? "processing"
                    : "default"
            }
          >
            {LAB_SAMPLE_STATUS_LABEL[v] ?? v}
          </Tag>
        ),
      },
      {
        title: "ผลตรวจ",
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
    [router],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ExperimentOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Laboratory · LIMS</p>
          <h1 className={styles.pageTitle}>ตัวอย่างตรวจสอบ</h1>
          <p className={styles.pageSubtitle}>
            ดูรายการตัวอย่างและพิมพ์ Certificate of Analysis (COA)
          </p>
        </div>
      </header>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ค้นหา</label>
            <Input
              allowClear
              value={sampleNo}
              onChange={(e) => setSampleNo(e.target.value)}
              placeholder="เช่น LS-20260723"
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={Object.entries(LAB_SAMPLE_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setSampleNo("");
              setStatus(undefined);
              setApplied({});
            }}
          >
            เคลียร์
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<SearchOutlined />}
            onClick={() =>
              setApplied({
                sampleNo: sampleNo.trim() || undefined,
                status,
              })
            }
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          onRow={(row) => ({
            onClick: () => router.push(`/laboratory/samples/${row.id}`),
          })}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ยังไม่มีตัวอย่าง</strong>
                ลงทะเบียนตัวอย่างผ่าน API / ระบบ Lab
              </div>
            ),
          }}
        />
      </section>
    </div>
  );
}
