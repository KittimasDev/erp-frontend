"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Input, Select, Table, Tag, Tooltip } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useStageRunsQuery } from "@/hooks/production-stages/useStageRunQueries";
import type { StageRun } from "@/types/production-stage-run";
import {
  STAGE_RUN_STATUS_COLOR,
  STAGE_RUN_STATUS_LABEL,
} from "@/types/production-stage-run";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { stageTypeLabel, type StageModuleConfig } from "./stage-modules";
import styles from "./StageRunPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { tConvStatusLabel } from "@/types/material-conversion";

const PAGE_SIZE = 20;

function fmtQty(value?: string) {
  if (!value) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export default function StageRunsListPage({
  config,
}: {
  config: StageModuleConfig;
}) {
  const t = useT();
  const router = useRouter();
  const actions = useScreenActionPermissions(config.screenCode);

  const [runNo, setRunNo] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [stageType, setStageType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      runNo: runNo.trim() || undefined,
      batchNo: batchNo.trim() || undefined,
      stageType,
      status,
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      page,
      limit: PAGE_SIZE,
    }),
    [runNo, batchNo, stageType, status, range, page],
  );

  const listQuery = useStageRunsQuery(config, queryParams);
  // ห่อด้วย useMemo ไม่ใช่ `?? []` เปล่า — array literal ใหม่ทุก render
  // จะทำให้ useMemo ที่นับสถานะด้านล่างคำนวณซ้ำฟรีทุกครั้ง
  const rows = useMemo(
    () => listQuery.data?.data.items ?? [],
    [listQuery.data],
  );
  const total = listQuery.data?.data.total ?? 0;

  /*
    การ์ดสรุปนับจาก "หน้าปัจจุบัน" เท่านั้น — backend ไม่มี endpoint สรุปยอด
    และการยิงนับทุกสถานะเพิ่มอีก 3 request ต่อการเปิดหน้าไม่คุ้ม
    จึงติดป้ายไว้ให้ชัดว่าเป็นยอดของหน้านี้ ไม่ใช่ทั้งหมด
  */
  const pageStats = useMemo(() => {
    const counts = { draft: 0, inProgress: 0, completed: 0 };
    for (const row of rows) {
      if (row.status === "DRAFT") counts.draft += 1;
      else if (row.status === "IN_PROGRESS") counts.inProgress += 1;
      else if (row.status === "COMPLETED") counts.completed += 1;
    }
    return counts;
  }, [rows]);

  const columns: ColumnsType<StageRun> = [
    {
      title: t("ลำดับ"),
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: t("เลขที่รอบ"),
      dataIndex: "runNo",
      key: "runNo",
      render: (value: string, row) => (
        <button
          type="button"
          className={masterStyles.codeBadge}
          style={{ border: 0, cursor: "pointer" }}
          onClick={() => router.push(`${config.routeBase}/${row.id}`)}
        >
          {value}
        </button>
      ),
    },
    {
      title: "Batch",
      dataIndex: "batchNo",
      key: "batchNo",
      // แถวเก่าไม่มีค่า — backfill ไม่ได้ ต้องโชว์ตามจริงไม่ใช่เดาให้
      render: (value?: string) =>
        value ? (
          <span>{value}</span>
        ) : (
          <span className={styles.cellMuted}>{t("ไม่ระบุ Batch")}</span>
        ),
    },
    {
      title: t("ขั้นตอน"),
      dataIndex: "stageType",
      key: "stageType",
      render: (value: string) => <Tag>{stageTypeLabel(config, value)}</Tag>,
    },
    {
      title: t("วันที่"),
      dataIndex: "runDate",
      key: "runDate",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: t("วัตถุดิบเข้า"),
      key: "input",
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <span>{row.inputItemCode ?? row.inputItemNameTh ?? "-"}</span>
          <span className={styles.cellMuted}>
            {t("แผน")} {fmtQty(row.inputQty)}
            {Number(row.inputActualQty) > 0
              ? ` · ${t("ตัดจริง")} ${fmtQty(row.inputActualQty)}`
              : ""}
          </span>
        </div>
      ),
    },
    {
      title: t("ผลผลิตออก"),
      key: "output",
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <span>{row.outputItemCode ?? row.outputItemNameTh ?? "-"}</span>
          <span className={styles.cellMuted}>
            {fmtQty(row.outputQty)}
            {row.outputLotNo ? ` · Lot ${row.outputLotNo}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "Yield",
      key: "yield",
      align: "right",
      // ตัวเลขมาจาก backend ไม่คิดเองบนหน้าจอ — สูตรอยู่ที่เดียวที่ stage-run-yield.util.ts
      render: (_v, row) => {
        if (!row.yieldComparable) {
          return (
            <Tooltip title={t("หน่วยของวัตถุดิบกับผลผลิตต่างกัน เทียบเป็นเปอร์เซ็นต์ไม่ได้")}>
              <span className={styles.cellMuted}>{t("เทียบไม่ได้")}</span>
            </Tooltip>
          );
        }
        if (row.yieldPercent === null) return <span>-</span>;
        // ยังไม่ปิดงาน = ยังไม่มีผลผลิตจริง ตัวเลขจึงเป็นค่าคาดการณ์จากแผน
        const isPlanned = !row.outputActualQty;
        return (
          <span>
            {row.yieldPercent}%
            {isPlanned ? <span className={styles.cellMuted}> ({t("แผน")})</span> : null}
          </span>
        );
      },
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      render: (value: string) => (
        <Tag color={STAGE_RUN_STATUS_COLOR[value] ?? "default"}>
          {tConvStatusLabel(STAGE_RUN_STATUS_LABEL[value] ?? value)}
        </Tag>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow={config.eyebrow}
          title={t(config.title)}
          subtitle={t(config.subtitle)}
          actions={
            <>
{actions.canAdd ? (
            <Button
              type="primary"
              className={masterStyles.createButton}
              icon={<PlusOutlined className={masterStyles.plusIcon} />}
              onClick={() => router.push(`${config.routeBase}/create`)}
            >
              {t("สร้างรอบการทำงาน")}
            </Button>
          ) : null}
            </>
          }
        />

        <div className={styles.summaryRow}>
          <SummaryCard label={t("ร่าง (ในหน้านี้)")} value={pageStats.draft} />
          <SummaryCard
            label={t("กำลังทำงาน (ในหน้านี้)")}
            value={pageStats.inProgress}
          />
          <SummaryCard label={t("เสร็จแล้ว (ในหน้านี้)")} value={pageStats.completed} />
          <SummaryCard label={t("ทั้งหมด")} value={total} accent />
        </div>

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>{t("ค้นหา")}</div>
              <h3>{t("รายการรอบการทำงาน")}</h3>
              <p>{t("ทั้งหมด {n} รอบ", { n: total })}</p>
            </div>
          </div>
          <div className={masterStyles.filterForm}>
            <div className={masterStyles.formGrid}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder={t(config.runNoPlaceholder)}
                value={runNo}
                onChange={(e) => {
                  setRunNo(e.target.value);
                  setPage(1);
                }}
              />
              <Input
                allowClear
                placeholder={t("ค้นหาด้วย Batch")}
                value={batchNo}
                onChange={(e) => {
                  setBatchNo(e.target.value);
                  setPage(1);
                }}
              />
              <Select
                allowClear
                placeholder={t("ขั้นตอนทั้งหมด")}
                value={stageType}
                onChange={(value) => {
                  setStageType(value);
                  setPage(1);
                }}
                options={config.stageTypes.map((option) => ({
                  value: option.value,
                  label: t(option.label),
                }))}
              />
              <Select
                allowClear
                placeholder={t("สถานะทั้งหมด")}
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                options={Object.entries(STAGE_RUN_STATUS_LABEL).map(
                  ([value, label]) => ({ value, label: tConvStatusLabel(label) }),
                )}
              />
              <DatePicker.RangePicker
                value={range}
                onChange={(value) => {
                  setRange(value as [Dayjs, Dayjs] | null);
                  setPage(1);
                }}
                format="DD/MM/YYYY"
                placeholder={[t("ตั้งแต่วันที่"), t("ถึงวันที่")]}
              />
            </div>
          </div>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.tableHeader}>
            <div>
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3>{t(config.title)}</h3>
            </div>
            <span className={masterStyles.tableCount}>{t("{n} รอบ", { n: total })}</span>
          </div>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            locale={{ emptyText: t("ยังไม่มีรอบการทำงาน") }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (n) => t("ทั้งหมด {n} รายการ", { n }),
            }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent ? `${styles.summaryCard} ${styles.summaryCardAccent}` : styles.summaryCard
      }
    >
      <span className={styles.summaryLabel}>{label}</span>
      <strong className={styles.summaryValue}>{value}</strong>
    </div>
  );
}
