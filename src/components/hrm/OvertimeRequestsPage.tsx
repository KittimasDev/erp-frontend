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
  OVERTIME_STATUS_LABEL,
  type OvertimeRequest,
} from "@/types/overtime";

import OtSettingsModal from "./OtSettingsModal";
import styles from "./OvertimeRequestsPage.module.css";

const GREEN = "#8ab933";
const ORANGE = "#fa8c16";
const MUTED = "#77777C";

/** DRAFT = รออนุมัติ — ตั้งเป็นแท็บแรกเพราะเป็นงานที่ต้องทำ */
type StatusTab = "DRAFT" | "APPROVED" | "REJECTED" | "CANCELLED" | "ALL";

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatHours(value: string | number) {
  const n = Number(value);
  return Number.isNaN(n)
    ? String(value)
    : n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export default function OvertimeRequestsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { modal } = App.useApp();
  const today = dayjs();

  const [tab, setTab] = useState<StatusTab>("DRAFT");
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    today.startOf("month"),
    today.endOf("month"),
  ]);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
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
      title: `อนุมัติคำขอ OT ${ids.length} รายการ`,
      content: (
        <div className={styles.rejectBody}>
          <p>
            ระบบคิดเงิน OT ตอนอนุมัติ — ประเภทวันตัดสินจากปฏิทินให้อัตโนมัติ
            ถ้าเป็นการทำงานวันหยุดประจำสัปดาห์ของพนักงานคนนั้น ให้เลือกประเภทวันเอง
          </p>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder="อัตโนมัติ (ตามปฏิทิน)"
            onChange={(value) => {
              dayType = value;
            }}
            options={Object.entries(OT_DAY_TYPE_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
      ),
      okText: "อนุมัติ",
      cancelText: "ยกเลิก",
      centered: true,
      onOk: () => review(ids, "approve", undefined, dayType),
    });
  };

  const confirmReject = (ids: string[]) => {
    let remark = "";
    modal.confirm({
      title: `ปฏิเสธคำขอ OT ${ids.length} รายการ`,
      content: (
        <div className={styles.rejectBody}>
          <p>ระบุเหตุผลให้พนักงานทราบ (พนักงานจะเห็นข้อความนี้)</p>
          <Input.TextArea
            rows={3}
            placeholder="เช่น งานไม่เร่งด่วน ให้ทำในเวลาปกติ"
            onChange={(event) => {
              remark = event.target.value;
            }}
          />
        </div>
      ),
      okText: "ปฏิเสธ",
      okButtonProps: { danger: true },
      cancelText: "ยกเลิก",
      centered: true,
      onOk: () => review(ids, "reject", remark.trim() || undefined),
    });
  };

  const columns: ColumnsType<OvertimeRequest> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        fixed: "left",
        width: 64,
        align: "center",
        render: (_, __, index) => (page - 1) * pageSize + index + 1,
      },
      {
        title: "พนักงาน",
        key: "employee",
        fixed: "left",
        width: 190,
        render: (_v, row) => (
          <div className={styles.employeeCell}>
            <strong>{row.displayName ?? "—"}</strong>
            <span>
              {row.employeeCode ?? "ไม่มีรหัส"}
              {row.departmentName ? ` · ${row.departmentName}` : ""}
            </span>
          </div>
        ),
      },
      {
        title: "วันที่ทำ OT",
        dataIndex: "otDate",
        key: "otDate",
        width: 115,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "ชั่วโมง",
        dataIndex: "hours",
        key: "hours",
        width: 85,
        align: "right",
        render: (value: string) => (
          <strong className={styles.hoursValue}>{formatHours(value)}</strong>
        ),
      },
      {
        title: "ประเภทวัน",
        dataIndex: "dayType",
        key: "dayType",
        width: 110,
        render: (value: string | undefined) =>
          value ? (
            <Tag color={value === "NORMAL" ? "default" : "orange"}>
              {OT_DAY_TYPE_LABEL[value] ?? value}
            </Tag>
          ) : (
            "—"
          ),
      },
      {
        title: "ยอดเงิน OT (บาท)",
        dataIndex: "otAmount",
        key: "otAmount",
        width: 150,
        align: "right",
        render: (value: number | null | undefined, row) => {
          if (row.status !== "APPROVED") return "—";
          if (value == null) {
            return (
              <Tooltip title={row.calcDetail?.note ?? "คิดเงินไม่ได้"}>
                <Tag color="red">ไม่มีฐานค่าจ้าง</Tag>
              </Tooltip>
            );
          }
          const lines = row.calcDetail?.lines ?? [];
          return (
            <Tooltip
              title={
                <div>
                  <div>ค่าแรง {formatMoney(row.hourlyRate ?? 0)} บาท/ชม.</div>
                  {lines.map((line) => (
                    <div key={line.label}>
                      {line.label}: {formatHours(line.hours)} ชม. × {line.multiplier} ={" "}
                      {formatMoney(line.amount)}
                    </div>
                  ))}
                </div>
              }
            >
              <strong>{formatMoney(value)}</strong>
            </Tooltip>
          );
        },
      },
      {
        title: "เหตุผล",
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
        title: "ยื่นเมื่อ",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 130,
        render: (value: string, row) => (
          <div className={styles.stackedCell}>
            <span>{dayjs(value).format("DD/MM/YYYY HH:mm")}</span>
            <small>
              {row.source ? (OVERTIME_SOURCE_LABEL[row.source] ?? "") : ""}
            </small>
          </div>
        ),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center",
        render: (value: string, row) => (
          <div className={styles.stackedCell}>
            <Tag color={OVERTIME_STATUS_COLOR[value]}>
              {OVERTIME_STATUS_LABEL[value] ?? value}
            </Tag>
            {row.reviewRemark ? (
              <Tooltip title={row.reviewRemark}>
                <small className={styles.remarkHint}>ดูเหตุผล</small>
              </Tooltip>
            ) : null}
          </div>
        ),
      },
      {
        title: "ผู้พิจารณา",
        dataIndex: "approvedByName",
        key: "approvedByName",
        width: 140,
        render: (value: string | undefined, row) =>
          value ? (
            <div className={styles.stackedCell}>
              <span>{value}</span>
              <small>
                {row.approvedAt
                  ? dayjs(row.approvedAt).format("DD/MM/YYYY HH:mm")
                  : ""}
              </small>
            </div>
          ) : (
            "—"
          ),
      },
      {
        title: "จัดการ",
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
                อนุมัติ
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                disabled={reviewMutation.isPending}
                onClick={() => confirmReject([row.id])}
              >
                ปฏิเสธ
              </Button>
            </Space>
          ) : (
            <span className={styles.mutedText}>—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewMutation.isPending],
  );

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <FieldTimeOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>HRM</p>
            <h1 className={styles.pageTitle}>คำขอทำงานล่วงเวลา (OT)</h1>
            <p className={styles.pageSubtitle}>
              พนักงานยื่นคำขอเองผ่านมือถือที่ <code>/overtime</code> —
              หน้านี้ไว้พิจารณาอนุมัติ เลือกหลายรายการพร้อมกันได้
            </p>
          </div>
          <Button icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
            ตั้งค่าอัตรา OT
          </Button>
        </header>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAlert}`}>
            <span>รออนุมัติ (ทั้งหมด)</span>
            <strong>{summary?.pendingCount ?? 0} คำขอ</strong>
            <small>{formatHours(summary?.pendingHours ?? 0)} ชม.</small>
          </div>
          <div className={styles.summaryCard}>
            <span>อนุมัติแล้วในช่วงนี้</span>
            <strong>{summary?.approvedCount ?? 0} คำขอ</strong>
            <small>{formatHours(summary?.approvedHours ?? 0)} ชม.</small>
          </div>
          <div className={styles.summaryCard}>
            <span>ยอดเงิน OT ที่อนุมัติในช่วงนี้</span>
            <strong>{formatMoney(summary?.approvedAmount ?? 0)} บาท</strong>
            <small>
              {summary?.unpricedCount
                ? `ไม่รวม ${summary.unpricedCount} คำขอที่ไม่มีฐานค่าจ้าง`
                : "คิดเงินได้ครบทุกคำขอ"}
            </small>
          </div>
          <div className={styles.summaryCard}>
            <span>ปฏิเสธในช่วงนี้</span>
            <strong>{summary?.rejectedCount ?? 0} คำขอ</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>พนักงานยกเลิกเอง</span>
            <strong>{summary?.cancelledCount ?? 0} คำขอ</strong>
          </div>
        </div>

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
                    รออนุมัติ
                    {summary?.pendingCount ? (
                      <span className={styles.tabCount}>
                        {summary.pendingCount}
                      </span>
                    ) : null}
                  </span>
                ),
              },
              { value: "APPROVED", label: "อนุมัติแล้ว" },
              { value: "REJECTED", label: "ปฏิเสธ" },
              { value: "CANCELLED", label: "ยกเลิก" },
              { value: "ALL", label: "ทั้งหมด" },
            ]}
          />

          <div className={styles.toolbarRight}>
            <Tooltip
              title={
                isPendingTab
                  ? "แท็บรออนุมัติแสดงคำขอค้างทั้งหมด ไม่จำกัดช่วงวันที่"
                  : undefined
              }
            >
              <DatePicker.RangePicker
                allowClear={false}
                disabled={isPendingTab}
                value={range}
                format="DD/MM/YYYY"
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) return;
                  setRange([values[0], values[1]]);
                }}
              />
            </Tooltip>
            <Input
              allowClear
              placeholder="ค้นหาชื่อ / รหัส / เหตุผล"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={() => setAppliedKeyword(keyword)}
              onBlur={() => setAppliedKeyword(keyword)}
              style={{ width: 240 }}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void summaryQuery.refetch();
                void listQuery.refetch();
              }}
            >
              รีเฟรช
            </Button>
          </div>
        </div>

        {isPendingTab && selectedIds.length > 0 ? (
          <div className={styles.bulkBar}>
            <span>เลือกไว้ {selectedIds.length} รายการ</span>
            <Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={reviewMutation.isPending}
                onClick={() => confirmApprove(selectedIds)}
              >
                อนุมัติที่เลือก
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                loading={reviewMutation.isPending}
                onClick={() => confirmReject(selectedIds)}
              >
                ปฏิเสธที่เลือก
              </Button>
              <Button type="text" onClick={() => setSelectedIds([])}>
                ล้างที่เลือก
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
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
            }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    isPendingTab
                      ? "ไม่มีคำขอรออนุมัติ — เคลียร์หมดแล้ว 🎉"
                      : "ไม่มีคำขอในเงื่อนไขนี้"
                  }
                />
              ),
            }}
          />
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>ชั่วโมง OT รายวัน</h3>
            <p>เทียบชั่วโมงที่อนุมัติแล้วกับที่ยังรออนุมัติในช่วงที่เลือก</p>
          </div>
          <div className={styles.chartBody}>
            {chartData.length === 0 ? (
              <Empty
                className={styles.emptyState}
                description="ไม่มีข้อมูลในช่วงนี้"
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
                    formatter={(value, name) => [`${value} ชม.`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    stackId="ot"
                    dataKey="approvedHours"
                    name="อนุมัติแล้ว"
                    fill={GREEN}
                  />
                  <Bar
                    stackId="ot"
                    dataKey="pendingHours"
                    name="รออนุมัติ"
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
