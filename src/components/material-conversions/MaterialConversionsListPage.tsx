"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Input,
  Progress,
  Segmented,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
} from "antd";
import { DownOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useMaterialConversionRoutesQuery,
  useMaterialConversionsQuery,
} from "@/hooks/material-conversions/useMaterialConversionQueries";
import { useMaterialConversionJobsQuery } from "@/hooks/material-conversions/useMaterialConversionJobs";
import type {
  MaterialConversionJob,
  MaterialConversionRun,
} from "@/types/material-conversion";
import {
  MATERIAL_CONVERSION_JOB_PROGRESS_LABEL,
  MATERIAL_CONVERSION_JOB_STATUS_COLOR,
  MATERIAL_CONVERSION_JOB_STATUS_LABEL,
  MATERIAL_CONVERSION_STATUS_COLOR,
  MATERIAL_CONVERSION_STATUS_LABEL,
  OUTPUT_TYPE_COLOR,
} from "@/types/material-conversion";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./MaterialConversionPage.module.css";

const PAGE_SIZE = 20;
const ROUTE_BASE = "/production/material-conversions";

/** `2026-09-08` → `08/09/2026` — ตรงกับรูปแบบของ RangePicker ในกล่องค้นหา */
function fmtDate(value?: string | null) {
  if (!value) return "-";
  const day = dayjs(value);
  return day.isValid() ? day.format("DD/MM/YYYY") : value;
}

function fmtQty(value?: string | null) {
  if (!value) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export default function MaterialConversionsListPage() {
  const router = useRouter();
  const actions = useScreenActionPermissions("MATERIAL_CONVERSIONS");

  /*
    เมนูเดิมสองอันถูกยุบมาที่หน้านี้ (เฟส 3) แล้ว redirect มาพร้อม `?route=<รหัสเส้นทาง>`
    ใช้รหัสเส้นทางไม่ใช่ id เพราะ id เป็น uuid ที่รู้ตอน build ไม่ได้ ·
    ค่าจาก URL เป็นเพียงค่าเริ่มต้น พอผู้ใช้แตะตัวกรองเองก็เลิกฟัง URL
    (คิดจากค่าที่มี ไม่ sync ด้วย effect เพื่อไม่ให้เกิด cascading render)
  */
  const searchParams = useSearchParams();
  const routeCodeFromUrl = searchParams.get("route") ?? undefined;

  /*
    สองมุมมองบนหน้าเดียว — **ค่าตั้งต้นคือแท็บเดิมเป๊ะ** เพื่อไม่ให้หน้าตา
    ของคนที่ใช้อยู่เปลี่ยนไปเอง · ใบงานเป็นทางใหม่ที่ต้องเลือกเข้าไปเอง
  */
  const tabFromUrl = searchParams.get("tab") === "jobs" ? "jobs" : "runs";
  const [tabTouched, setTabTouched] = useState(false);
  const [pickedTab, setPickedTab] = useState<"runs" | "jobs">("runs");
  const tab = tabTouched ? pickedTab : tabFromUrl;

  const [runNo, setRunNo] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [pickedRouteId, setPickedRouteId] = useState<string | undefined>();
  const [routeTouched, setRouteTouched] = useState(false);
  const [stepCode, setStepCode] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [includeLegacy, setIncludeLegacy] = useState(true);
  const [hasJob, setHasJob] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);

  const routesQuery = useMaterialConversionRoutesQuery();
  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data]);

  const routeIdFromUrl = useMemo(
    () =>
      routeCodeFromUrl
        ? routes.find((route) => route.routeCode === routeCodeFromUrl)?.id
        : undefined,
    [routes, routeCodeFromUrl],
  );
  const routeId = routeTouched ? pickedRouteId : (routeIdFromUrl ?? pickedRouteId);

  const setRouteId = (value?: string) => {
    setRouteTouched(true);
    setPickedRouteId(value);
  };

  /** ขั้นตอนของเส้นทางที่เลือก — ไม่เลือกเส้นทางก็ให้เลือกจากทุกขั้น */
  const stepOptions = useMemo(() => {
    const source = routeId
      ? routes.filter((route) => route.id === routeId)
      : routes;
    return source.flatMap((route) =>
      route.steps.map((step) => ({
        value: step.stepCode,
        label: routeId
          ? `${step.stepOrder}. ${step.nameTh}`
          : `${route.nameTh} · ${step.nameTh}`,
      })),
    );
  }, [routes, routeId]);

  const queryParams = useMemo(
    () => ({
      runNo: runNo.trim() || undefined,
      batchNo: batchNo.trim() || undefined,
      routeId,
      stepCode,
      status,
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      includeLegacy,
      hasJob,
      page,
      limit: PAGE_SIZE,
    }),
    [runNo, batchNo, routeId, stepCode, status, range, includeLegacy, hasJob, page],
  );

  // ยิงเฉพาะแท็บที่กำลังดูอยู่ — เปิดหน้าแล้วไม่ต้องโหลดทั้งสองชุดทิ้ง
  const listQuery = useMaterialConversionsQuery(queryParams);
  const rows = useMemo(
    () => listQuery.data?.data.items ?? [],
    [listQuery.data],
  );
  const total = listQuery.data?.data.total ?? 0;

  const jobsQuery = useMaterialConversionJobsQuery(
    {
      jobNo: runNo.trim() || undefined,
      batchNo: batchNo.trim() || undefined,
      routeId,
      dateFrom: range?.[0]?.format("YYYY-MM-DD"),
      dateTo: range?.[1]?.format("YYYY-MM-DD"),
      page,
      limit: PAGE_SIZE,
    },
    { enabled: tab === "jobs" },
  );
  const jobRows = useMemo(
    () => jobsQuery.data?.data.items ?? [],
    [jobsQuery.data],
  );
  const jobTotal = jobsQuery.data?.data.total ?? 0;

  /*
    การ์ดสรุปนับจาก "หน้าปัจจุบัน" เท่านั้น — backend ไม่มี endpoint สรุปยอด
    และการยิงนับทุกสถานะเพิ่มอีก 3 request ต่อการเปิดหน้าไม่คุ้ม
    จึงติดป้ายไว้ให้ชัดว่าเป็นยอดของหน้านี้
  */
  const pageStats = useMemo(() => {
    const counts = { draft: 0, inProgress: 0, completed: 0, legacy: 0 };
    for (const row of rows) {
      if (row.isLegacy) counts.legacy += 1;
      if (row.status === "DRAFT") counts.draft += 1;
      else if (row.status === "IN_PROGRESS") counts.inProgress += 1;
      else if (row.status === "COMPLETED") counts.completed += 1;
    }
    return counts;
  }, [rows]);

  /** แถวเก่าเปิดที่หน้าเดิม — หน้านี้เดินงานให้มันไม่ได้ */
  const openRow = (row: MaterialConversionRun) =>
    router.push(row.legacyDetailPath ?? `${ROUTE_BASE}/${row.id}`);

  const columns: ColumnsType<MaterialConversionRun> = [
    {
      title: "#",
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "เลขที่เอกสาร",
      dataIndex: "runNo",
      key: "runNo",
      render: (value: string, row) => (
        <div className={styles.cellStack}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className={masterStyles.codeBadge}
              style={{ border: 0, cursor: "pointer" }}
              onClick={() => openRow(row)}
            >
              {value}
            </button>
            {row.isLegacy ? (
              <Tooltip title="เอกสารจากเมนูเดิม — เปิดดูและเดินงานได้ที่หน้าเดิม หน้านี้แสดงไว้ให้เห็นประวัติรวมกัน">
                <span className={styles.legacyChip}>เมนูเดิม</span>
              </Tooltip>
            ) : null}
          </div>
          {/* ยุบ Batch มาเป็นบรรทัดรอง — เดิมกินทั้งคอลัมน์ทั้งที่ส่วนใหญ่ว่าง */}
          <span className={styles.cellMuted}>
            {row.batchNo ? `Batch ${row.batchNo}` : "ไม่ระบุ Batch"}
          </span>
        </div>
      ),
    },
    {
      title: "ขั้นตอน",
      key: "step",
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <span>{row.stepNameTh ?? row.stepCode}</span>
          <span className={styles.cellMuted}>{row.routeNameTh ?? "-"}</span>
        </div>
      ),
    },
    {
      /*
        เอกสารชนิดเดียวกันเข้ามาได้สองทาง — ชิปนี้คือสิ่งที่บอกว่าใบไหนอยู่ใน
        ใบงานตามเส้นทาง และใบไหนเป็นเอกสารเดี่ยว ไม่งั้นอีกหกเดือนจะไม่มีใครตอบได้
      */
      title: "ใบงาน",
      key: "job",
      width: 170,
      render: (_v, row) =>
        row.jobId && row.jobNo ? (
          <button
            type="button"
            className={styles.legacyChip}
            style={{ borderStyle: "solid", cursor: "pointer", background: "none" }}
            onClick={() => router.push(`${ROUTE_BASE}/jobs/${row.jobId}`)}
          >
            {row.jobNo}
            {row.jobPlannedStepCount
              ? ` (${row.jobCompletedStepCount ?? 0}/${row.jobPlannedStepCount})`
              : ""}
          </button>
        ) : (
          <span className={styles.cellMuted}>เอกสารเดี่ยว</span>
        ),
    },
    {
      title: "วันที่",
      dataIndex: "runDate",
      key: "runDate",
      width: 116,
      // รูปแบบเดียวกับตัวเลือกช่วงวันที่ในกล่องค้นหาบนหน้าเดียวกัน
      render: (value: string) => (
        <span style={{ whiteSpace: "nowrap" }}>{fmtDate(value)}</span>
      ),
    },
    {
      title: "วัตถุดิบเข้า",
      key: "inputs",
      render: (_v, row) => {
        const lines = row.inputs ?? [];
        if (lines.length === 0) return <span className={styles.cellMuted}>-</span>;
        const first = lines[0];
        return (
          <div className={styles.cellStack}>
            <span>
              {first.itemNameTh ?? first.itemCode ?? "-"}{" "}
              {fmtQty(
                Number(first.actualQty) > 0 ? first.actualQty : first.plannedQty,
              )}{" "}
              {first.unitCode ?? ""}
            </span>
            {lines.length > 1 ? (
              <span className={styles.cellMuted}>
                และอีก {lines.length - 1} รายการ
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "ผลผลิตออก",
      key: "outputs",
      render: (_v, row) => {
        const lines = row.outputs ?? [];
        if (lines.length === 0)
          return <span className={styles.cellMuted}>-</span>;

        /*
          จุดขายของหน้านี้คือ "ออกได้หลายตัว" — เดิมเขียนแค่ "เข้าคลัง N รายการ"
          ซึ่งบอกไม่ได้ว่าได้อะไรมา จึงโชว์ชื่อของจริงเป็นชิปพร้อมสีตามชนิด
        */
        const posting = lines.filter((line) => line.postsToStock);
        const waste = lines.filter((line) => !line.postsToStock);
        const shown = posting.slice(0, 2);

        return (
          <div className={styles.cellStack}>
            <div className={styles.outputChips}>
              {shown.map((line) => (
                <Tag
                  key={line.id}
                  color={OUTPUT_TYPE_COLOR[line.outputType] ?? "default"}
                >
                  {line.itemNameTh ?? line.itemCode ?? "-"}{" "}
                  {fmtQty(line.actualQty ?? line.plannedQty)}
                  {line.unitCode ? ` ${line.unitCode}` : ""}
                </Tag>
              ))}
              {posting.length > shown.length ? (
                <Tooltip
                  title={posting
                    .slice(2)
                    .map((line) => line.itemNameTh ?? line.itemCode)
                    .join(", ")}
                >
                  <Tag>+{posting.length - shown.length}</Tag>
                </Tooltip>
              ) : null}
            </div>
            {row.isLegacy ? (
              <Tooltip title="โครงเดิมรับผลผลิตได้ตัวเดียว · ของพลอยได้ในเอกสารเก่าเป็นตัวเลขอ้างอิงที่ไม่เคยเข้าสต๊อก">
                <span className={styles.subNote}>
                  {row.legacyByproductQty
                    ? `ของพลอยได้ ${fmtQty(row.legacyByproductQty)} — อ้างอิง ไม่เข้าคลัง`
                    : "ผลผลิตตัวเดียว"}
                </span>
              </Tooltip>
            ) : waste.length > 0 ? (
              <span className={styles.subNote}>
                + ของเสีย{" "}
                {waste
                  .map((line) => fmtQty(line.actualQty ?? line.plannedQty))
                  .join(", ")}{" "}
                (ไม่เข้าคลัง)
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Yield",
      key: "yield",
      width: 130,
      render: (_v, row) => {
        if (row.yieldPercent === null) {
          return (
            <Tooltip
              title={
                row.massBalanceMessage ??
                "ยังไม่มีตัวเลข หรือรวมเป็นน้ำหนักเดียวกันไม่ได้"
              }
            >
              <span className={`${styles.yieldPill} ${styles.yieldPillMuted}`}>
                เทียบไม่ได้
              </span>
            </Tooltip>
          );
        }
        const impossible = row.massBalanceStatus === "EXCEEDS_INPUT";
        return (
          <div className={styles.cellStack}>
            <span
              className={
                impossible
                  ? `${styles.yieldPill} ${styles.yieldPillBad}`
                  : styles.yieldPill
              }
            >
              {row.yieldPercent.toLocaleString("th-TH", {
                maximumFractionDigits: 2,
              })}
              %
            </span>
            {impossible ? (
              <span className={styles.subNote}>ผลผลิตเกินวัตถุดิบ</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: string, row) => (
        <div className={styles.cellStack}>
          <Tag color={MATERIAL_CONVERSION_STATUS_COLOR[value] ?? "default"}>
            {MATERIAL_CONVERSION_STATUS_LABEL[value] ?? value}
          </Tag>
          {row.stepSkipWarning ? (
            <Tooltip title={row.stepSkipWarning}>
              <Tag color="warning">ข้ามขั้นตอน</Tag>
            </Tooltip>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={listQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>MC</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              PRODUCTION · MATERIAL CONVERSION
            </div>
            <h2 className={masterStyles.pageTitle}>ใบแปรสภาพวัตถุดิบ</h2>
            <span className={masterStyles.pageSubtitle}>
              ตัดยางหนึ่งครั้งได้เนื้อยาง ลวดเหล็ก และผ้าใบพร้อมกัน — บันทึกวัตถุดิบเข้าหลายตัว
              และผลผลิตออกหลายตัวในเอกสารใบเดียว แต่ละตัวได้ Lot ของตัวเอง
            </span>
          </div>
          {actions.canAdd ? (
            <div className={styles.splitCreate}>
              <Button
                type="primary"
                className={styles.splitCreateMain}
                icon={<PlusOutlined className={masterStyles.plusIcon} />}
                onClick={() => router.push(`${ROUTE_BASE}/jobs/create`)}
              >
                เปิดใบงานตามเส้นทาง
              </Button>
              <Dropdown
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: "single",
                      label: "สร้างเอกสารเดี่ยว (ขั้นตอนเดียว)",
                      onClick: () => router.push(`${ROUTE_BASE}/create`),
                    },
                  ],
                }}
              >
                <Button
                  type="primary"
                  className={styles.splitCreateMore}
                  aria-label="เมนูสร้างเอกสารอื่น"
                  icon={<DownOutlined />}
                />
              </Dropdown>
            </div>
          ) : null}
        </div>

        <Segmented
          style={{ marginBottom: 14 }}
          value={tab}
          onChange={(value) => {
            setTabTouched(true);
            setPickedTab(value as "runs" | "jobs");
            setPage(1);
          }}
          options={[
            { value: "runs", label: "เอกสารรายขั้นตอน" },
            { value: "jobs", label: "ใบงานตามเส้นทาง" },
          ]}
        />

        {tab === "jobs" ? (
          <JobsTab
            rows={jobRows}
            total={jobTotal}
            page={page}
            loading={jobsQuery.isFetching}
            onPage={setPage}
            onOpen={(id) => router.push(`${ROUTE_BASE}/jobs/${id}`)}
            jobNo={runNo}
            onJobNo={(value) => {
              setRunNo(value);
              setPage(1);
            }}
            batchNo={batchNo}
            onBatchNo={(value) => {
              setBatchNo(value);
              setPage(1);
            }}
            routeId={routeId}
            onRouteId={(value) => {
              setRouteId(value);
              setPage(1);
            }}
            routeOptions={routes.map((route) => ({
              value: route.id,
              label: route.nameTh,
            }))}
          />
        ) : (
        <>
        {/*
          แถบสรุป — บอกขอบเขต "ในหน้านี้" ครั้งเดียวที่หัวแถบ
          เดิมเขียนต่อท้ายป้ายทั้งสามอันจนรก และยอดรวมซ้ำกับตัวเลขอีกสองที่ด้านล่าง
        */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryGroup}>
            <span className={styles.summaryGroupLabel}>สรุปในหน้านี้</span>
            <div className={styles.summaryStats}>
              <Stat label="แบบร่างเอกสาร" value={pageStats.draft} color="#c4c8cd" />
              <Stat
                label="กำลังทำงาน"
                value={pageStats.inProgress}
                color="#1677ff"
              />
              <Stat label="เสร็จแล้ว" value={pageStats.completed} color="#52c41a" />
              {pageStats.legacy > 0 ? (
                <Stat
                  label="จากเมนูเดิม"
                  value={pageStats.legacy}
                  color="#d4d8dd"
                />
              ) : null}
            </div>
          </div>
          <div className={styles.summaryTotal}>
            <span className={styles.summaryTotalLabel}>ทั้งหมด</span>
            <strong className={styles.summaryTotalValue}>{total}</strong>
          </div>
        </div>

        {/*
          ตัวกรองกับตารางอยู่ในการ์ดใบเดียว — เดิมเป็นสองใบที่มีหัวข้อ
          "รายการใบแปรสภาพวัตถุดิบ" ซ้ำกันติดกัน กินที่เปล่า ๆ ร้อยกว่าพิกเซล
        */}
        <div className={masterStyles.tableCard}>
          <div className={styles.filterBar}>
            <div>
              <div className={masterStyles.tableEyebrow}>รายการ</div>
              <h3 style={{ margin: 0 }}>ใบแปรสภาพวัตถุดิบ</h3>
            </div>
            <Tooltip title="เอกสารจาก ขั้นตอนเตรียมยาง / กระบวนการผลิต rCB จะแสดงรวมด้วย ติดป้าย “เมนูเดิม” และกดแล้วพาไปหน้าเดิม">
              <label className={styles.filterToggle}>
                <Switch
                  size="small"
                  checked={includeLegacy}
                  onChange={(checked) => {
                    setIncludeLegacy(checked);
                    setPage(1);
                  }}
                />
                รวมประวัติจากเมนูเดิม
              </label>
            </Tooltip>
          </div>

          <div className={styles.filterGrid}>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="ค้นหาเลขที่เอกสาร เช่น TPS-20260907-001"
              value={runNo}
              onChange={(e) => {
                setRunNo(e.target.value);
                setPage(1);
              }}
            />
            <Input
              allowClear
              placeholder="ค้นหาด้วย Batch"
              value={batchNo}
              onChange={(e) => {
                setBatchNo(e.target.value);
                setPage(1);
              }}
            />
            <Select
              allowClear
              placeholder="สถานะทั้งหมด"
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              options={Object.entries(MATERIAL_CONVERSION_STATUS_LABEL).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="เส้นทางทั้งหมด"
              value={routeId}
              onChange={(value) => {
                setRouteId(value);
                setStepCode(undefined);
                setPage(1);
              }}
              options={routes.map((route) => ({
                value: route.id,
                label: route.nameTh,
              }))}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ขั้นตอนทั้งหมด"
              value={stepCode}
              onChange={(value) => {
                setStepCode(value);
                setPage(1);
              }}
              options={stepOptions}
            />
            <DatePicker.RangePicker
              value={range}
              onChange={(value) => {
                setRange(value as [Dayjs, Dayjs] | null);
                setPage(1);
              }}
              format="DD/MM/YYYY"
              placeholder={["ตั้งแต่วันที่", "ถึงวันที่"]}
            />
            <Select
              allowClear
              placeholder="ทั้งหมด (ในใบงาน + เดี่ยว)"
              value={hasJob}
              onChange={(value) => {
                setHasJob(value);
                setPage(1);
              }}
              options={[
                { value: true, label: "เฉพาะที่อยู่ในใบงาน" },
                { value: false, label: "เฉพาะเอกสารเดี่ยว" },
              ]}
            />
          </div>

          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      ยังไม่มีใบแปรสภาพวัตถุดิบตามเงื่อนไขที่ค้นหา
                      <br />
                      <span className={styles.subNote}>
                        ใช้บันทึกตอนแปรสภาพวัตถุดิบที่ได้ผลผลิตหลายตัวพร้อมกัน
                        เช่น ตัดยางแล้วได้ทั้งเนื้อยาง ลวดเหล็ก และผ้าใบ
                      </span>
                    </span>
                  }
                />
              ),
            }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: (t) => `ทั้งหมด ${t} รายการ`,
            }}
          />
        </div>
        </>
        )}
      </section>
    </MasterPageGate>
  );
}

/** ตัวเลขสถานะหนึ่งตัวพร้อมจุดสีที่ตรงกับป้ายสถานะในตาราง */
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={styles.summaryStat}>
      <span className={styles.summaryDot} style={{ background: color }} />
      <strong className={styles.summaryStatValue}>{value}</strong>
      <span className={styles.summaryStatLabel}>{label}</span>
    </div>
  );
}

/**
 * แท็บใบงานตามเส้นทาง
 *
 * ใช้ช่องค้นหาชุดเดียวกับแท็บเอกสาร (เลขที่ / Batch / เส้นทาง / ช่วงวันที่)
 * เพื่อไม่ให้ผู้ใช้ต้องเรียนรู้ตัวกรองสองชุด — สลับแท็บแล้วเงื่อนไขยังอยู่
 */
function JobsTab({
  rows,
  total,
  page,
  loading,
  onPage,
  onOpen,
  jobNo,
  onJobNo,
  batchNo,
  onBatchNo,
  routeId,
  onRouteId,
  routeOptions,
}: {
  rows: MaterialConversionJob[];
  total: number;
  page: number;
  loading: boolean;
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
  jobNo: string;
  onJobNo: (value: string) => void;
  batchNo: string;
  onBatchNo: (value: string) => void;
  routeId?: string;
  onRouteId: (value?: string) => void;
  routeOptions: Array<{ value: string; label: string }>;
}) {
  const columns: ColumnsType<MaterialConversionJob> = [
    {
      title: "#",
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "เลขที่ใบงาน",
      dataIndex: "jobNo",
      key: "jobNo",
      render: (value: string, row) => (
        <div className={styles.cellStack}>
          <button
            type="button"
            className={masterStyles.codeBadge}
            style={{ border: 0, cursor: "pointer" }}
            onClick={() => onOpen(row.id)}
          >
            {value}
          </button>
          <span className={styles.cellMuted}>Batch {row.batchNo}</span>
        </div>
      ),
    },
    {
      title: "เส้นทาง",
      key: "route",
      render: (_v, row) => row.routeNameTh ?? row.routeCode ?? "-",
    },
    {
      title: "เริ่มตามแผน",
      dataIndex: "plannedStartDate",
      key: "plannedStartDate",
      width: 116,
      render: (value: string) => (
        <span style={{ whiteSpace: "nowrap" }}>{fmtDate(value)}</span>
      ),
    },
    {
      title: "ความคืบหน้า",
      key: "progress",
      width: 190,
      render: (_v, row) => {
        const percent =
          row.plannedStepCount > 0
            ? Math.round((row.completedStepCount / row.plannedStepCount) * 100)
            : 0;
        return (
          <div className={styles.cellStack}>
            <span>
              {row.completedStepCount} / {row.plannedStepCount} ขั้นตอน
            </span>
            <Progress
              percent={percent}
              size="small"
              strokeColor="#739816"
              showInfo={false}
            />
            {row.openRunCount > 0 ? (
              <span className={styles.subNote}>
                ค้างอยู่ {row.openRunCount} ขั้นตอน
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "สถานะ",
      key: "status",
      width: 170,
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <Tag color={MATERIAL_CONVERSION_JOB_STATUS_COLOR[row.status]}>
            {MATERIAL_CONVERSION_JOB_STATUS_LABEL[row.status] ?? row.status}
          </Tag>
          <span className={styles.subNote}>
            {MATERIAL_CONVERSION_JOB_PROGRESS_LABEL[row.progressStatus] ??
              row.progressStatus}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className={masterStyles.tableCard}>
      <div className={styles.filterBar}>
        <div>
          <div className={masterStyles.tableEyebrow}>รายการ</div>
          <h3 style={{ margin: 0 }}>ใบงานแปรสภาพตามเส้นทาง</h3>
        </div>
      </div>

      <div className={styles.filterGrid}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="ค้นหาเลขที่ใบงาน เช่น MCJ-20260908-001"
          value={jobNo}
          onChange={(e) => onJobNo(e.target.value)}
        />
        <Input
          allowClear
          placeholder="ค้นหาด้วย Batch"
          value={batchNo}
          onChange={(e) => onBatchNo(e.target.value)}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="เส้นทางทั้งหมด"
          value={routeId}
          onChange={onRouteId}
          options={routeOptions}
        />
      </div>

      <Table
        className={masterStyles.dataTable}
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  ยังไม่มีใบงานตามเงื่อนไขที่ค้นหา
                  <br />
                  <span className={styles.subNote}>
                    เปิดใบงานหนึ่งใบแล้วกรอกทุกขั้นในหน้าเดียว
                    ระบบจะใส่เลข Batch ให้ตรงกันทั้งสายเอง
                  </span>
                </span>
              }
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: onPage,
          showSizeChanger: false,
          showTotal: (t) => `ทั้งหมด ${t} ใบงาน`,
        }}
      />
    </div>
  );
}
