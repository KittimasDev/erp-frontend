"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  CloseOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import { useReviewOvertimeRequestMutation } from "@/hooks/overtime/useOvertimeMutations";
import {
  useOvertimeRequestsQuery,
  useOvertimeSummaryQuery,
} from "@/hooks/overtime/useOvertimeQueries";
import {
  OT_DAY_TYPE_LABEL,
  OVERTIME_SOURCE_LABEL,
  OVERTIME_STATUS_COLOR,
  overtimeStatusLabel,
  type OvertimeRequest,
} from "@/types/overtime";

import OtSettingsModal from "./OtSettingsModal";
import styles from "./OvertimeRequestsPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const GREEN = "#8ab933";
const ORANGE = "#fa8c16";
const MUTED = "#77777C";

/** DRAFT = รออนุมัติ — ตั้งเป็นแท็บแรกเพราะเป็นงานที่ต้องทำ */
type StatusTab = "DRAFT" | "APPROVED" | "REJECTED" | "CANCELLED" | "ALL";

type OvertimeFilters = { range: [Dayjs, Dayjs]; keyword: string };

function formatHours(value: string | number, lang: "th" | "en") {
  const n = Number(value);
  return Number.isNaN(n)
    ? String(value)
    : n.toLocaleString(lang === "en" ? "en-GB" : "th-TH", { maximumFractionDigits: 2 });
}

export default function OvertimeRequestsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { modal } = App.useApp();
  const t = useT();
  const lang = useLanguage();
  const today = dayjs();

  const [tab, setTab] = useState<StatusTab>("DRAFT");
  // draft = ค่าที่กำลังกรอก · applied = ค่าที่ใช้กรองจริง (เปลี่ยนเมื่อกด ค้นหา / Enter / ล้าง เท่านั้น)
  const defaultFilters = (): OvertimeFilters => ({
    range: [today.startOf("month"), today.endOf("month")],
    keyword: "",
  });
  const [draft, setDraft] = useState<OvertimeFilters>(defaultFilters);
  const [applied, setApplied] = useState<OvertimeFilters>(defaultFilters);
  const { range } = applied;
  const appliedKeyword = applied.keyword;
  const applyFilters = () => {
    setApplied({ ...draft, keyword: draft.keyword.trim() });
    setPage(1);
  };
  const clearFilters = () => {
    const fresh = defaultFilters();
    setDraft(fresh);
    setApplied(defaultFilters());
    setPage(1);
  };
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rangeParams = {
    dateFrom: range[0].format("YYYY-MM-DD"),
    dateTo: range[1].format("YYYY-MM-DD"),
  };

  const summaryQuery = useOvertimeSummaryQuery(rangeParams);
  const summary = summaryQuery.data?.data;

  // คิวรออนุมัติดูทั้งหมดไม่ผูกช่วงวันที่ — ของค้างเก่าต้องไม่หายไปจากคิว
  const listQuery = useOvertimeRequestsQuery({
    status: tab === "ALL" ? undefined : tab,
    q: appliedKeyword || undefined,
    ...(tab === "DRAFT" ? {} : rangeParams),
  });
  const rows = listQuery.data?.data ?? [];

  const reviewMutation = useReviewOvertimeRequestMutation();
  const isPendingTab = tab === "DRAFT";

  const chartData = useMemo(
    () =>
      (summary?.daily ?? []).map((point) => ({
        ...point,
        label: dayjs(point.date).format("DD/MM"),
      })),
    [summary?.daily],
  );

  const review = async (
    ids: string[],
    action: "approve" | "reject",
    remark?: string,
    dayType?: string,
  ) => {
    for (const id of ids) {
      await reviewMutation.mutateAsync({ id, action, remark, dayType });
    }
    setSelectedIds([]);
  };

  const confirmApprove = (ids: string[]) => {
    // ว่าง = ให้ระบบตัดสินจากปฏิทิน (วันหยุด / Shutdown / วันปกติ)
    let dayType: string | undefined;
    modal.confirm({
      title: t("อนุมัติคำขอ OT {n} รายการ", { n: ids.length }),
      content: (
        <div className={styles.rejectBody}>
          <p>
            {t("ระบบคิดเงิน OT ตอนอนุมัติ — ประเภทวันตัดสินจากปฏิทินให้อัตโนมัติ ถ้าเป็นการทำงานวันหยุดประจำสัปดาห์ของพนักงานคนนั้น ให้เลือกประเภทวันเอง")}
          </p>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder={t("อัตโนมัติ (ตามปฏิทิน)")}
            onChange={(value) => {
              dayType = value;
            }}
            options={Object.entries(OT_DAY_TYPE_LABEL).map(([value, label]) => ({
              value,
              label: t(label),
            }))}
          />
        </div>
      ),
      okText: t("อนุมัติ"),
      cancelText: t("ยกเลิก"),
      centered: true,
      onOk: () => review(ids, "approve", undefined, dayType),
    });
  };

  const confirmReject = (ids: string[]) => {
    let remark = "";
    modal.confirm({
      title: t("ปฏิเสธคำขอ OT {n} รายการ", { n: ids.length }),
      content: (
        <div className={styles.rejectBody}>
          <p>{t("ระบุเหตุผลให้พนักงานทราบ (พนักงานจะเห็นข้อความนี้)")}</p>
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น งานไม่เร่งด่วน ให้ทำในเวลาปกติ")}
            onChange={(event) => {
              remark = event.target.value;
            }}
          />
        </div>
      ),
      okText: t("ปฏิเสธ"),
      okButtonProps: { danger: true },
      cancelText: t("ยกเลิก"),
      centered: true,
      onOk: () => review(ids, "reject", remark.trim() || undefined),
    });
  };

  const columns: ColumnsType<OvertimeRequest> = useMemo(
    () => [
      {
        title: t("ลำดับ"),
        key: "seq",
        fixed: "left",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: t("พนักงาน"),
        key: "employee",
        fixed: "left",
        width: 190,
        render: (_v, row) => (
          <div className={styles.employeeCell}>
            <strong>{row.displayName ?? "—"}</strong>
            <span>
              {row.employeeCode ?? t("ไม่มีรหัส")}
              {row.departmentName ? ` · ${row.departmentName}` : ""}
            </span>
          </div>
        ),
      },
      {
        title: t("วันที่ทำ OT"),
        dataIndex: "otDate",
        key: "otDate",
        width: 115,
        render: (value: string) => dayjs(value).format("DD/MM/BBBB"),
      },
      {
        title: t("ชั่วโมง"),
        dataIndex: "hours",
        key: "hours",
        width: 85,
        align: "right",
        render: (value: string) => (
          <strong className={styles.hoursValue}>{formatHours(value, lang)}</strong>
        ),
      },
      {
        title: t("ประเภทวัน"),
        dataIndex: "dayType",
        key: "dayType",
        width: 110,
        render: (value: string | undefined) =>
          value ? (
            <Tag color={value === "NORMAL" ? "default" : "orange"}>
              {t(OT_DAY_TYPE_LABEL[value] ?? value)}
            </Tag>
          ) : (
            "—"
          ),
      },
      {
        title: t("ยอดเงิน OT (บาท)"),
        dataIndex: "otAmount",
        key: "otAmount",
        width: 150,
        align: "right",
        render: (value: number | null | undefined, row) => {
          if (row.status !== "APPROVED") return "—";
          if (value == null) {
            return (
              <Tooltip title={row.calcDetail?.note ?? t("คิดเงินไม่ได้")}>
                <Tag color="red">{t("ไม่มีฐานค่าจ้าง")}</Tag>
              </Tooltip>
            );
          }
          const lines = row.calcDetail?.lines ?? [];
          return (
            <Tooltip
              title={
                <div>
                  <div>{t("ค่าแรง {amount} บาท/ชม.", { amount: formatMoney(row.hourlyRate ?? 0, lang) })}</div>
                  {lines.map((line) => (
                    <div key={line.label}>
                      {line.label}: {formatHours(line.hours, lang)} {t("ชม.")} × {line.multiplier} ={" "}
                      {formatMoney(line.amount, lang)}
                    </div>
                  ))}
                </div>
              }
            >
              <strong>{formatMoney(value, lang)}</strong>
            </Tooltip>
          );
        },
      },
      {
        title: t("เหตุผล"),
        dataIndex: "reason",
        key: "reason",
        ellipsis: true,
        render: (value: string) => (
          <Tooltip title={value}>
            <span>{value}</span>
          </Tooltip>
        ),
      },
      {
        title: t("ยื่นเมื่อ"),
        dataIndex: "createdAt",
        key: "createdAt",
        width: 130,
        render: (value: string, row) => (
          <div className={styles.stackedCell}>
            <span>{dayjs(value).format("DD/MM/BBBB HH:mm")}</span>
            <small>
              {row.source ? t(OVERTIME_SOURCE_LABEL[row.source] ?? "") : ""}
            </small>
          </div>
        ),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center",
        render: (value: string, row) => (
          <div className={styles.stackedCell}>
            <Tag color={OVERTIME_STATUS_COLOR[value]}>
              {overtimeStatusLabel(value, lang)}
            </Tag>
            {row.reviewRemark ? (
              <Tooltip title={row.reviewRemark}>
                <small className={styles.remarkHint}>{t("ดูเหตุผล")}</small>
              </Tooltip>
            ) : null}
          </div>
        ),
      },
      {
        title: t("ผู้พิจารณา"),
        dataIndex: "approvedByName",
        key: "approvedByName",
        width: 140,
        render: (value: string | undefined, row) =>
          value ? (
            <div className={styles.stackedCell}>
              <span>{value}</span>
              <small>
                {row.approvedAt
                  ? dayjs(row.approvedAt).format("DD/MM/BBBB HH:mm")
                  : ""}
              </small>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: 150,
        align: "center",
        render: (_v, row) =>
          row.status === "DRAFT" ? (
            <Space size={4}>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                disabled={reviewMutation.isPending}
                onClick={() => confirmApprove([row.id])}
              >
                {t("อนุมัติ")}
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                disabled={reviewMutation.isPending}
                onClick={() => confirmReject([row.id])}
              >
                {t("ปฏิเสธ")}
              </Button>
            </Space>
          ) : (
            <span className={styles.mutedText}>—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewMutation.isPending, t, lang],
  );

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <div className={styles.page}>
        <PageHeader
          eyebrow="HRM"
          icon={<FieldTimeOutlined />}
          title={t("คำขอทำงานล่วงเวลา (OT)")}
          subtitle={<>{t("พนักงานยื่นคำขอเองผ่านมือถือที่")}<code>/overtime</code> — {t("หน้านี้ไว้พิจารณาอนุมัติ เลือกหลายรายการพร้อมกันได้")}</>}
          actions={
            <>
<Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
            {t("ตั้งค่าอัตรา OT")}
          </Button>
            </>
          }
        />

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAlert}`}>
            <span>{t("รออนุมัติ (ทั้งหมด)")}</span>
            <strong>{t("{n} คำขอ", { n: summary?.pendingCount ?? 0 })}</strong>
            <small>{formatHours(summary?.pendingHours ?? 0, lang)} {t("ชม.")}</small>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("อนุมัติแล้วในช่วงนี้")}</span>
            <strong>{t("{n} คำขอ", { n: summary?.approvedCount ?? 0 })}</strong>
            <small>{formatHours(summary?.approvedHours ?? 0, lang)} {t("ชม.")}</small>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ยอดเงิน OT ที่อนุมัติในช่วงนี้")}</span>
            <strong>{formatMoney(summary?.approvedAmount ?? 0, lang)} {t("บาท")}</strong>
            <small>
              {summary?.unpricedCount
                ? t("ไม่รวม {n} คำขอที่ไม่มีฐานค่าจ้าง", { n: summary.unpricedCount })
                : t("คิดเงินได้ครบทุกคำขอ")}
            </small>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ปฏิเสธในช่วงนี้")}</span>
            <strong>{t("{n} คำขอ", { n: summary?.rejectedCount ?? 0 })}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("พนักงานยกเลิกเอง")}</span>
            <strong>{t("{n} คำขอ", { n: summary?.cancelledCount ?? 0 })}</strong>
          </div>
        </div>

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={listQuery.isFetching}>
          <FilterField label={t("ช่วงวันที่")} wide>
            <Tooltip
              title={
                isPendingTab
                  ? t("แท็บรออนุมัติแสดงคำขอค้างทั้งหมด ไม่จำกัดช่วงวันที่")
                  : undefined
              }
            >
              <DatePicker.RangePicker
                allowClear={false}
                disabled={isPendingTab}
                style={{ width: "100%" }}
                value={draft.range}
                format="DD/MM/BBBB"
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) return;
                  const next: [Dayjs, Dayjs] = [values[0], values[1]];
                  setDraft((d) => ({ ...d, range: next }));
                }}
              />
            </Tooltip>
          </FilterField>
          <FilterField label={t("ค้นหา")}>
            <Input
              allowClear
              placeholder={t("ค้นหาชื่อ / รหัส / เหตุผล")}
              prefix={<SearchOutlined />}
              value={draft.keyword}
              onChange={(event) => setDraft((d) => ({ ...d, keyword: event.target.value }))}
              style={{ width: "100%" }}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.toolbar}>
          <Segmented
            value={tab}
            onChange={(value) => {
              setTab(value as StatusTab);
              setSelectedIds([]);
            }}
            options={[
              {
                value: "DRAFT",
                label: (
                  // นับเองแทน antd Badge — Badge ค้าง leave-animation แล้วโชว์เลขเก่าตอนคิวเหลือ 0
                  <span className={styles.tabLabel}>
                    {overtimeStatusLabel("DRAFT", lang)}
                    {summary?.pendingCount ? (
                      <span className={styles.tabCount}>
                        {summary.pendingCount}
                      </span>
                    ) : null}
                  </span>
                ),
              },
              { value: "APPROVED", label: overtimeStatusLabel("APPROVED", lang) },
              { value: "REJECTED", label: overtimeStatusLabel("REJECTED", lang) },
              { value: "CANCELLED", label: overtimeStatusLabel("CANCELLED", lang) },
              { value: "ALL", label: t("ทั้งหมด") },
            ]}
          />

          <div className={styles.toolbarRight}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void summaryQuery.refetch();
                void listQuery.refetch();
              }}
            >
              {t("รีเฟรช")}
            </Button>
          </div>
        </div>

        {isPendingTab && selectedIds.length > 0 ? (
          <div className={styles.bulkBar}>
            <span>{t("เลือกไว้ {n} รายการ", { n: selectedIds.length })}</span>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={reviewMutation.isPending}
                onClick={() => confirmApprove(selectedIds)}
              >
                {t("อนุมัติที่เลือก")}
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                loading={reviewMutation.isPending}
                onClick={() => confirmReject(selectedIds)}
              >
                {t("ปฏิเสธที่เลือก")}
              </Button>
              <Button type="text" onClick={() => setSelectedIds([])}>
                {t("ล้างที่เลือก")}
              </Button>
            </Space>
          </div>
        ) : null}

        <div className={styles.tableCard}>
          <Table<OvertimeRequest>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            scroll={{ x: 1380 }}
            rowSelection={
              isPendingTab
                ? {
                    selectedRowKeys: selectedIds,
                    onChange: (keys) => setSelectedIds(keys as string[]),
                  }
                : undefined
            }
            pagination={{
              current: page,
              pageSize,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
            }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    isPendingTab
                      ? t("ไม่มีคำขอรออนุมัติ — เคลียร์หมดแล้ว 🎉")
                      : t("ไม่มีคำขอในเงื่อนไขนี้")
                  }
                />
              ),
            }}
          />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>{t("ชั่วโมง OT รายวัน")}</h3>
            <p>{t("เทียบชั่วโมงที่อนุมัติแล้วกับที่ยังรออนุมัติในช่วงที่เลือก")}</p>
          </div>
          <div className={styles.chartBody}>
            {chartData.length === 0 ? (
              <Empty
                className={styles.emptyState}
                description={t("ไม่มีข้อมูลในช่วงนี้")}
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={{ stroke: "#e4e7eb" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: MUTED, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e4e7eb",
                    }}
                    formatter={(value, name) => [`${value} ${t("ชม.")}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    stackId="ot"
                    dataKey="approvedHours"
                    name={overtimeStatusLabel("APPROVED", lang)}
                    fill={GREEN}
                  />
                  <Bar
                    stackId="ot"
                    dataKey="pendingHours"
                    name={overtimeStatusLabel("DRAFT", lang)}
                    fill={ORANGE}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <OtSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </MasterPageGate>
  );
}
