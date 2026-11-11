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
import { useT } from "@/lib/i18n/useT";
import { tConvStatusLabel } from "@/types/material-conversion";
import styles from "./MaterialConversionPage.module.css";
import FilterCard, { FilterField } from "@/components/common/FilterCard";

const PAGE_SIZE = 20;

type ConversionFilters = {
  runNo: string;
  batchNo: string;
  routeId?: string;
  stepCode?: string;
  status?: string;
  range: [Dayjs, Dayjs] | null;
  includeLegacy: boolean;
  hasJob?: boolean;
};
const DEFAULT_FILTERS: ConversionFilters = { runNo: "", batchNo: "", range: null, includeLegacy: true };
const ROUTE_BASE = "/production/material-conversions";

/** `2026-09-08` → `08/09/2026` — ตรงกับรูปแบบของ RangePicker ในกล่องค้นหา */
function fmtDate(value?: string | null) {
  if (!value) return "-";
  const day = dayjs(value);
  return day.isValid() ? day.format("DD/MM/BBBB") : value;
}

function fmtQty(value?: string | null) {
  if (!value) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

export default function MaterialConversionsListPage() {
  const t = useT();
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

  /*
    draft = ค่าที่ผู้ใช้กำลังกรอก · applied = ค่าที่ใช้ยิง API จริง (เปลี่ยนเมื่อกดค้นหา/Enter เท่านั้น)
    ตัวกรองชุดเดียวใช้ร่วมกันทั้งสองแท็บ (สลับแท็บแล้วเงื่อนไขยังอยู่)
  */
  const [draft, setDraft] = useState<ConversionFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<ConversionFilters>(DEFAULT_FILTERS);
  const [draftRouteTouched, setDraftRouteTouched] = useState(false);
  const [appliedRouteTouched, setAppliedRouteTouched] = useState(false);
  const [page, setPage] = useState(1);
  const { runNo, batchNo, stepCode, status, range, includeLegacy, hasJob } = applied;

  const routesQuery = useMaterialConversionRoutesQuery();
  const routes = useMemo(() => routesQuery.data?.data ?? [], [routesQuery.data]);

  const routeIdFromUrl = useMemo(
    () =>
      routeCodeFromUrl
        ? routes.find((route) => route.routeCode === routeCodeFromUrl)?.id
        : undefined,
    [routes, routeCodeFromUrl],
  );
  /** เส้นทางที่ใช้ยิง API — ถ้าผู้ใช้ยังไม่เคยแตะ ใช้ค่าจาก ?route= ใน URL */
  const routeId = appliedRouteTouched ? applied.routeId : (routeIdFromUrl ?? applied.routeId);
  /** เส้นทางที่แสดงในช่องกรอก (draft) */
  const draftRouteId = draftRouteTouched ? draft.routeId : (routeIdFromUrl ?? draft.routeId);

  const patchDraft = (patch: Partial<ConversionFilters>) => setDraft((d) => ({ ...d, ...patch }));

  const applyFilters = () => {
    setApplied(draft);
    setAppliedRouteTouched(draftRouteTouched);
    setPage(1);
  };
  const clearFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setDraftRouteTouched(false);
    setAppliedRouteTouched(false);
    setPage(1);
  };

  /** ขั้นตอนของเส้นทางที่เลือก — ไม่เลือกเส้นทางก็ให้เลือกจากทุกขั้น */
  const stepOptions = useMemo(() => {
    const source = draftRouteId
      ? routes.filter((route) => route.id === draftRouteId)
      : routes;
    return source.flatMap((route) =>
      route.steps.map((step) => ({
        value: step.stepCode,
        label: draftRouteId
          ? `${step.stepOrder}. ${step.nameTh}`
          : `${route.nameTh} · ${step.nameTh}`,
      })),
    );
  }, [routes, draftRouteId]);

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
      title: t("ลำดับ"),
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: t("เลขที่เอกสาร"),
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
              <Tooltip title={t("เอกสารจากเมนูเดิม — เปิดดูและเดินงานได้ที่หน้าเดิม หน้านี้แสดงไว้ให้เห็นประวัติรวมกัน")}>
                <span className={styles.legacyChip}>{t("เมนูเดิม")}</span>
              </Tooltip>
            ) : null}
          </div>
          {/* ยุบ Batch มาเป็นบรรทัดรอง — เดิมกินทั้งคอลัมน์ทั้งที่ส่วนใหญ่ว่าง */}
          <span className={styles.cellMuted}>
            {row.batchNo ? `Batch ${row.batchNo}` : t("ไม่ระบุ Batch")}
          </span>
        </div>
      ),
    },
    {
      title: t("ขั้นตอน"),
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
      title: t("ใบงาน"),
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
          <span className={styles.cellMuted}>{t("เอกสารเดี่ยว")}</span>
        ),
    },
    {
      title: t("วันที่"),
      dataIndex: "runDate",
      key: "runDate",
      width: 116,
      // รูปแบบเดียวกับตัวเลือกช่วงวันที่ในกล่องค้นหาบนหน้าเดียวกัน
      render: (value: string) => (
        <span style={{ whiteSpace: "nowrap" }}>{fmtDate(value)}</span>
      ),
    },
    {
      title: t("วัตถุดิบเข้า"),
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
                {t("และอีก {n} รายการ", { n: lines.length - 1 })}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: t("ผลผลิตออก"),
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
              <Tooltip title={t("โครงเดิมรับผลผลิตได้ตัวเดียว · ของพลอยได้ในเอกสารเก่าเป็นตัวเลขอ้างอิงที่ไม่เคยเข้าสต๊อก")}>
                <span className={styles.subNote}>
                  {row.legacyByproductQty
                    ? t("ของพลอยได้ {qty} — อ้างอิง ไม่เข้าคลัง", { qty: fmtQty(row.legacyByproductQty) })
                    : t("ผลผลิตตัวเดียว")}
                </span>
              </Tooltip>
            ) : waste.length > 0 ? (
              <span className={styles.subNote}>
                {t("+ ของเสีย")}{" "}
                {waste
                  .map((line) => fmtQty(line.actualQty ?? line.plannedQty))
                  .join(", ")}{" "}
                {t("(ไม่เข้าคลัง)")}
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
                t("ยังไม่มีตัวเลข หรือรวมเป็นน้ำหนักเดียวกันไม่ได้")
              }
            >
              <span className={`${styles.yieldPill} ${styles.yieldPillMuted}`}>
                {t("เทียบไม่ได้")}
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
              <span className={styles.subNote}>{t("ผลผลิตเกินวัตถุดิบ")}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: string, row) => (
        <div className={styles.cellStack}>
          <Tag color={MATERIAL_CONVERSION_STATUS_COLOR[value] ?? "default"}>
            {tConvStatusLabel(MATERIAL_CONVERSION_STATUS_LABEL[value] ?? value)}
          </Tag>
          {row.stepSkipWarning ? (
            <Tooltip title={row.stepSkipWarning}>
              <Tag color="warning">{t("ข้ามขั้นตอน")}</Tag>
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
            <h2 className={masterStyles.pageTitle}>{t("ใบแปรสภาพวัตถุดิบ")}</h2>
            <span className={masterStyles.pageSubtitle}>
              {t("ตัดยางหนึ่งครั้งได้เนื้อยาง ลวดเหล็ก และผ้าใบพร้อมกัน — บันทึกวัตถุดิบเข้าหลายตัว และผลผลิตออกหลายตัวในเอกสารใบเดียว แต่ละตัวได้ Lot ของตัวเอง")}
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
                {t("เปิดใบงานตามเส้นทาง")}
              </Button>
              <Dropdown
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: "single",
                      label: t("สร้างเอกสารเดี่ยว (ขั้นตอนเดียว)"),
                      onClick: () => router.push(`${ROUTE_BASE}/create`),
                    },
                  ],
                }}
              >
                <Button
                  type="primary"
                  className={styles.splitCreateMore}
                  aria-label={t("เมนูสร้างเอกสารอื่น")}
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
            { value: "runs", label: t("เอกสารรายขั้นตอน") },
            { value: "jobs", label: t("ใบงานตามเส้นทาง") },
          ]}
        />

        <FilterCard
          onSearch={applyFilters}
          onClear={clearFilters}
          loading={tab === "jobs" ? jobsQuery.isFetching : listQuery.isFetching}
        >
          <FilterField label={t("ค้นหา")}>
            <Input
              allowClear
              style={{ width: "100%" }}
              prefix={<SearchOutlined />}
              placeholder={
                tab === "jobs"
                  ? t("ค้นหาเลขที่ใบงาน เช่น MCJ-20260908-001")
                  : t("ค้นหาเลขที่เอกสาร เช่น TPS-20260907-001")
              }
              value={draft.runNo}
              onChange={(e) => patchDraft({ runNo: e.target.value })}
            />
          </FilterField>
          <FilterField label="Batch">
            <Input
              allowClear
              style={{ width: "100%" }}
              placeholder={t("ค้นหาด้วย Batch")}
              value={draft.batchNo}
              onChange={(e) => patchDraft({ batchNo: e.target.value })}
            />
          </FilterField>
          {tab === "runs" ? (
            <FilterField label={t("สถานะ")}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder={t("สถานะทั้งหมด")}
                value={draft.status}
                onChange={(value) => patchDraft({ status: value })}
                options={Object.entries(MATERIAL_CONVERSION_STATUS_LABEL).map(
                  ([value, label]) => ({ value, label: tConvStatusLabel(label) }),
                )}
              />
            </FilterField>
          ) : null}
          <FilterField label={t("เส้นทาง")}>
            <Select
              allowClear
              showSearch
              style={{ width: "100%" }}
              optionFilterProp="label"
              placeholder={t("เส้นทางทั้งหมด")}
              value={draftRouteId}
              onChange={(value) => {
                setDraftRouteTouched(true);
                patchDraft({ routeId: value, stepCode: undefined });
              }}
              options={routes.map((route) => ({
                value: route.id,
                label: route.nameTh,
              }))}
            />
          </FilterField>
          {tab === "runs" ? (
            <FilterField label={t("ขั้นตอน")}>
              <Select
                allowClear
                showSearch
                style={{ width: "100%" }}
                optionFilterProp="label"
                placeholder={t("ขั้นตอนทั้งหมด")}
                value={draft.stepCode}
                onChange={(value) => patchDraft({ stepCode: value })}
                options={stepOptions}
              />
            </FilterField>
          ) : null}
          <FilterField label={t("ช่วงวันที่")} wide>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={draft.range}
              onChange={(value) => patchDraft({ range: value as [Dayjs, Dayjs] | null })}
              format="DD/MM/BBBB"
              placeholder={[t("ตั้งแต่วันที่"), t("ถึงวันที่")]}
            />
          </FilterField>
          {tab === "runs" ? (
            <FilterField label={t("ใบงานตามเส้นทาง")}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder={t("ทั้งหมด (ในใบงาน + เดี่ยว)")}
                value={draft.hasJob}
                onChange={(value) => patchDraft({ hasJob: value })}
                options={[
                  { value: true, label: t("เฉพาะที่อยู่ในใบงาน") },
                  { value: false, label: t("เฉพาะเอกสารเดี่ยว") },
                ]}
              />
            </FilterField>
          ) : null}
          {tab === "runs" ? (
            <FilterField label={t("รวมประวัติจากเมนูเดิม")}>
              <Tooltip title={t("เอกสารจาก ขั้นตอนเตรียมยาง / กระบวนการผลิต rCB จะแสดงรวมด้วย ติดป้าย “เมนูเดิม” และกดแล้วพาไปหน้าเดิม")}>
                <span>
                  <Switch
                    size="small"
                    checked={draft.includeLegacy}
                    onChange={(checked) => patchDraft({ includeLegacy: checked })}
                  />
                </span>
              </Tooltip>
            </FilterField>
          ) : null}
        </FilterCard>

        {tab === "jobs" ? (
          <JobsTab
            rows={jobRows}
            total={jobTotal}
            page={page}
            loading={jobsQuery.isFetching}
            onPage={setPage}
            onOpen={(id) => router.push(`${ROUTE_BASE}/jobs/${id}`)}
          />
        ) : (
        <>
        {/*
          แถบสรุป — บอกขอบเขต "ในหน้านี้" ครั้งเดียวที่หัวแถบ
          เดิมเขียนต่อท้ายป้ายทั้งสามอันจนรก และยอดรวมซ้ำกับตัวเลขอีกสองที่ด้านล่าง
        */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryGroup}>
            <span className={styles.summaryGroupLabel}>{t("สรุปในหน้านี้")}</span>
            <div className={styles.summaryStats}>
              <Stat label={t("แบบร่างเอกสาร")} value={pageStats.draft} color="#c4c8cd" />
              <Stat
                label={t("กำลังทำงาน")}
                value={pageStats.inProgress}
                color="#1677ff"
              />
              <Stat label={t("เสร็จแล้ว")} value={pageStats.completed} color="#52c41a" />
              {pageStats.legacy > 0 ? (
                <Stat
                  label={t("จากเมนูเดิม")}
                  value={pageStats.legacy}
                  color="#d4d8dd"
                />
              ) : null}
            </div>
          </div>
          <div className={styles.summaryTotal}>
            <span className={styles.summaryTotalLabel}>{t("ทั้งหมด")}</span>
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
              <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
              <h3 style={{ margin: 0 }}>{t("ใบแปรสภาพวัตถุดิบ")}</h3>
            </div>
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
                      {t("ยังไม่มีใบแปรสภาพวัตถุดิบตามเงื่อนไขที่ค้นหา")}
                      <br />
                      <span className={styles.subNote}>
                        {t("ใช้บันทึกตอนแปรสภาพวัตถุดิบที่ได้ผลผลิตหลายตัวพร้อมกัน เช่น ตัดยางแล้วได้ทั้งเนื้อยาง ลวดเหล็ก และผ้าใบ")}
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
              showTotal: (n) => t("ทั้งหมด {n} รายการ", { n }),
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
}: {
  rows: MaterialConversionJob[];
  total: number;
  page: number;
  loading: boolean;
  onPage: (page: number) => void;
  onOpen: (id: string) => void;
}) {
  const t = useT();
  const columns: ColumnsType<MaterialConversionJob> = [
    {
      title: t("ลำดับ"),
      key: "index",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: t("เลขที่ใบงาน"),
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
      title: t("เส้นทาง"),
      key: "route",
      render: (_v, row) => row.routeNameTh ?? row.routeCode ?? "-",
    },
    {
      title: t("เริ่มตามแผน"),
      dataIndex: "plannedStartDate",
      key: "plannedStartDate",
      width: 116,
      render: (value: string) => (
        <span style={{ whiteSpace: "nowrap" }}>{fmtDate(value)}</span>
      ),
    },
    {
      title: t("ความคืบหน้า"),
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
              {row.completedStepCount} / {row.plannedStepCount} {t("ขั้นตอน")}
            </span>
            <Progress
              percent={percent}
              size="small"
              strokeColor="#739816"
              showInfo={false}
            />
            {row.openRunCount > 0 ? (
              <span className={styles.subNote}>
                {t("ค้างอยู่ {n} ขั้นตอน", { n: row.openRunCount })}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: t("สถานะ"),
      key: "status",
      width: 170,
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <Tag color={MATERIAL_CONVERSION_JOB_STATUS_COLOR[row.status]}>
            {tConvStatusLabel(MATERIAL_CONVERSION_JOB_STATUS_LABEL[row.status] ?? row.status)}
          </Tag>
          <span className={styles.subNote}>
            {tConvStatusLabel(MATERIAL_CONVERSION_JOB_PROGRESS_LABEL[row.progressStatus] ??
              row.progressStatus)}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className={masterStyles.tableCard}>
      <div className={styles.filterBar}>
        <div>
          <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
          <h3 style={{ margin: 0 }}>{t("ใบงานแปรสภาพตามเส้นทาง")}</h3>
        </div>
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
                  {t("ยังไม่มีใบงานตามเงื่อนไขที่ค้นหา")}
                  <br />
                  <span className={styles.subNote}>
                    {t("เปิดใบงานหนึ่งใบแล้วกรอกทุกขั้นในหน้าเดียว ระบบจะใส่เลข Batch ให้ตรงกันทั้งสายเอง")}
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
          showTotal: (n) => t("ทั้งหมด {n} ใบงาน", { n }),
        }}
      />
    </div>
  );
}
