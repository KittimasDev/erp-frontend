"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Space, Table, Tabs, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  ExperimentOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useLabSamplesQuery } from "@/hooks/laboratory/useLaboratoryQuery";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import type { LabSample } from "@/types/laboratory";
import {
  LAB_SAMPLE_STATUS_LABEL,
  LAB_SAMPLE_TYPE_LABEL,
  LAB_SAMPLE_TYPES,
} from "@/types/laboratory";
import LabCoaHistoryTab from "./LabCoaHistoryTab";
import LabSampleCreateModal from "./LabSampleCreateModal";
import styles from "./LabSamplesListPage.module.css";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

export default function LabSamplesListPage() {
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [sampleNo, setSampleNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [sampleType, setSampleType] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
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
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * 20 + index + 1,
      },
      {
        title: "เลขที่ตัวอย่าง",
        dataIndex: "sampleNo",
        render: (v: string) => <span className={styles.prNo}>{v}</span>,
      },
      {
        title: "ประเภท",
        dataIndex: "sampleType",
        render: (v: string) => LAB_SAMPLE_TYPE_LABEL[v] ?? v,
      },
      {
        title: "สินค้า / Lot",
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
    [router, page],
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
            ลงทะเบียนตัวอย่างจากการผลิต วัตถุดิบ สารเคมี สินค้าสำเร็จรูป
            พร้อมผูก Lot · พิมพ์ Certificate of Analysis (COA)
          </p>
        </div>
        {canAdd ? (
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setCreating(true)}
          >
            ลงทะเบียนตัวอย่าง
          </Button>
        ) : null}
      </header>

      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as "samples" | "coas")}
        items={[
          { key: "samples", label: "ตัวอย่าง" },
          { key: "coas", label: "ประวัติ COA" },
        ]}
      />

      {tab === "coas" ? <LabCoaHistoryTab /> : null}
      {tab === "samples" ? (
        <>
          <section className={styles.filterCard}>
            <div className={styles.filterGrid}>
              <div className={styles.filterItem}>
                <label>ประเภท</label>
                <Select
                  allowClear
                  style={{ width: "100%" }}
                  value={sampleType}
                  onChange={setSampleType}
                  options={LAB_SAMPLE_TYPES.map((value) => ({
                    value,
                    label: LAB_SAMPLE_TYPE_LABEL[value],
                  }))}
                />
              </div>
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
                  setSampleType(undefined);
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
                    sampleType,
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
              pagination={{ current: page, pageSize: 20, onChange: setPage }}
              onRow={(row) => ({
                onClick: () => router.push(`/laboratory/samples/${row.id}`),
              })}
              locale={{
                emptyText: (
                  <div className={styles.emptyState}>
                    <strong>ยังไม่มีตัวอย่าง</strong>
                    กดปุ่มลงทะเบียนตัวอย่างเพื่อเริ่มต้น
                  </div>
                ),
              }}
            />
          </section>
        </>
      ) : null}
      {creating ? (
        <LabSampleCreateModal
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/laboratory/samples/${id}`)}
        />
      ) : null}
    </div>
  );
}
