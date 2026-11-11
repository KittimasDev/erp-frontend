"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
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
  ClockCircleOutlined,
  CopyOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useT } from "@/lib/i18n/useT";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import AttendanceRecordModal from "@/components/hrm/AttendanceRecordModal";
import {
  useAttendanceRecordsQuery,
  useAttendanceSummaryQuery,
} from "@/hooks/attendance/useAttendanceRecordsQuery";
import {
  ATTENDANCE_SOURCE_LABEL,
  ATTENDANCE_STATUS_LABEL,
  type AttendanceRecord,
} from "@/types/attendance";
import { LEAVE_TYPE_LABEL } from "@/types/leave";

import styles from "./AttendancePage.module.css";
import PageHeader from "@/components/common/PageHeader";

/** สีกราฟ — ใช้ร่วมกับสี Tag ในตารางให้อ่านง่ายเป็นชุดเดียวกัน */
const GREEN = "#8ab933";
const ORANGE = "#fa8c16";
const BLUE = "#1677ff";
const MUTED = "#77777C";

type RangeMode = "day" | "month" | "custom";

type AttendanceFilters = {
  mode: RangeMode;
  day: Dayjs;
  month: Dayjs;
  customRange: [Dayjs, Dayjs];
  keyword: string;
  status: string | undefined;
};

const MODE_OPTIONS = [
  { label: "รายวัน", value: "day" as const },
  { label: "รายเดือน", value: "month" as const },
  { label: "กำหนดเอง", value: "custom" as const },
];

function formatTime(value?: string) {
  return value ? dayjs(value).format("HH:mm") : "—";
}

function formatHours(value?: number) {
  if (value === undefined || value <= 0) {
    return "—";
  }
  const minutes = Math.round(value * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function noopSubscribe() {
  return () => {};
}

function statusColor(status: string) {
  if (status === "LATE") return "warning";
  if (status === "ON_LEAVE") return "blue";
  if (status === "ABSENT") return "default";
  return "success";
}

export default function AttendancePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { message } = App.useApp();
  const t = useT();
  const today = dayjs();

  // อ่าน origin หลัง hydrate โดยไม่ setState ใน effect
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const selfServiceUrl = `${origin}/attendance`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(selfServiceUrl);
      message.success(t("คัดลอกลิงก์แล้ว"));
    } catch {
      message.warning(t("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตัวเอง"));
    }
  };

  // draft = ค่าที่กำลังกรอก · applied = ค่าที่ใช้กรองจริง (เปลี่ยนเมื่อกด ค้นหา / Enter / ล้าง เท่านั้น)
  const defaultFilters = (): AttendanceFilters => ({
    mode: "month",
    day: today,
    month: today,
    customRange: [today.subtract(6, "day"), today],
    keyword: "",
    status: undefined,
  });
  const [draft, setDraft] = useState<AttendanceFilters>(defaultFilters);
  const [applied, setApplied] = useState<AttendanceFilters>(defaultFilters);
  const { mode, day, month, customRange, status } = applied;
  const appliedKeyword = applied.keyword;
  const applyFilters = () => {
    setApplied({ ...draft, keyword: draft.keyword.trim() });
    setPage(1);
  };
  const clearFilters = () => {
    setDraft(defaultFilters());
    setApplied(defaultFilters());
    setPage(1);
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceRecord | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: AttendanceRecord) => {
    setEditing(row);
    setModalOpen(true);
  };

  const range = useMemo<{ dateFrom: string; dateTo: string }>(() => {
    if (mode === "day") {
      const value = day.format("YYYY-MM-DD");
      return { dateFrom: value, dateTo: value };
    }
    if (mode === "month") {
      return {
        dateFrom: month.startOf("month").format("YYYY-MM-DD"),
        dateTo: month.endOf("month").format("YYYY-MM-DD"),
      };
    }
    return {
      dateFrom: customRange[0].format("YYYY-MM-DD"),
      dateTo: customRange[1].format("YYYY-MM-DD"),
    };
  }, [mode, day, month, customRange]);

  const summaryQuery = useAttendanceSummaryQuery(range);
  const recordsQuery = useAttendanceRecordsQuery({
    ...range,
    q: appliedKeyword || undefined,
    status,
  });

  const summary = summaryQuery.data?.data;
  const rows = recordsQuery.data?.data ?? [];

  const dailyChartData = useMemo(
    () =>
      (summary?.daily ?? []).map((point) => ({
        ...point,
        label: dayjs(point.date).format("DD/MM"),
      })),
    [summary?.daily],
  );

  const topEmployees = useMemo(
    () =>
      (summary?.byUser ?? [])
        .slice(0, 8)
        .map((row) => ({
          ...row,
          label: row.displayName || row.employeeCode || row.userId.slice(0, 8),
        })),
    [summary?.byUser],
  );

  const columns: ColumnsType<AttendanceRecord> = useMemo(
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
        width: 200,
        render: (_v, row) => (
          <div className={styles.employeeCell}>
            <strong>{row.displayName ?? "—"}</strong>
            <span>{row.employeeCode ?? t("ไม่มีรหัสพนักงาน")}</span>
          </div>
        ),
      },
      {
        title: t("แผนก"),
        dataIndex: "departmentName",
        key: "departmentName",
        width: 140,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("วันที่"),
        dataIndex: "attendanceDate",
        key: "attendanceDate",
        width: 110,
        render: (value: string) => dayjs(value).format("DD/MM/BBBB"),
      },
      {
        title: t("กะ"),
        key: "shift",
        width: 130,
        render: (_v, row) =>
          row.shiftName ? (
            <div className={styles.employeeCell}>
              <strong>{row.shiftName}</strong>
              <span>{t("เข้ากะ {time}", { time: row.shiftStartTime ?? "—" })}</span>
            </div>
          ) : (
            <span className={styles.pending}>{t("ยังไม่จัดกะ")}</span>
          ),
      },
      {
        title: t("เข้างาน"),
        dataIndex: "checkInAt",
        key: "checkInAt",
        width: 90,
        align: "center",
        render: (value?: string) => formatTime(value),
      },
      {
        title: t("ออกงาน"),
        dataIndex: "checkOutAt",
        key: "checkOutAt",
        width: 90,
        align: "center",
        render: (value?: string) =>
          value ? (
            formatTime(value)
          ) : (
            <span className={styles.pending}>{t("ยังไม่กดออก")}</span>
          ),
      },
      {
        title: t("รวม (ชม.)"),
        dataIndex: "workHours",
        key: "workHours",
        width: 90,
        align: "right",
        render: (value?: number) => formatHours(value),
      },
      {
        title: t("สถานะ"),
        dataIndex: "status",
        key: "status",
        width: 130,
        align: "center",
        render: (value: string, row) => (
          <Tag color={statusColor(value)}>
            {value === "ON_LEAVE" && row.leaveType
              ? t(LEAVE_TYPE_LABEL[row.leaveType] ?? "ลางาน")
              : value === "LATE" && row.lateMinutes
                ? t("สาย {n} นาที", { n: row.lateMinutes })
                : t(ATTENDANCE_STATUS_LABEL[value] ?? value)}
          </Tag>
        ),
      },
      {
        title: t("วิธีลงเวลา"),
        dataIndex: "source",
        key: "source",
        width: 120,
        render: (value?: string) =>
          value ? t(ATTENDANCE_SOURCE_LABEL[value] ?? value) : "—",
      },
      {
        title: "IP",
        dataIndex: "checkInIp",
        key: "checkInIp",
        width: 130,
        render: (value?: string) => value ?? "—",
      },
      {
        title: t("จัดการ"),
        key: "action",
        width: 150,
        align: "center",
        fixed: "right",
        render: (_v, row) =>
          // แถวลาเป็นของเสมือนจากใบลา ต้องไปแก้ที่หน้าคำขอลาแทน
          row.isLeave ? (
            <Tooltip title={t("มาจากใบลาที่อนุมัติแล้ว — แก้ที่หน้าคำขอลางาน")}>
              <span className={styles.pending}>{t("ใบลา")}</span>
            </Tooltip>
          ) : (
            <Space size={4}>
              {!row.checkOutAt ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => openEdit(row)}
                >
                  {t("ปิดกะ")}
                </Button>
              ) : null}
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
              >
                {t("แก้ไข")}
              </Button>
            </Space>
          ),
      },
    ],
    [t],
  );

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <div className={styles.page}>
        <PageHeader
          eyebrow="HRM"
          icon={<ClockCircleOutlined />}
          title={t("บันทึกเวลาเข้า-ออกงาน")}
          subtitle={t("รายการลงเวลาของพนักงาน เรียงจากล่าสุด ดูได้ทั้งรายวันและทั้งเดือน พร้อมกราฟสรุป")}
        >
<div className={styles.shareLink}>
              <span>{t("ลิงก์ให้พนักงานกดเข้า-ออกงาน")}</span>
              <code>{selfServiceUrl}</code>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyLink}
              >
                {t("คัดลอก")}
              </Button>
            </div>
        </PageHeader>

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={recordsQuery.isFetching}>
          <FilterField label={t("ช่วงข้อมูล")}>
            <Segmented
              options={MODE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              value={draft.mode}
              onChange={(value) => setDraft((d) => ({ ...d, mode: value as RangeMode }))}
            />
          </FilterField>

          {draft.mode === "day" ? (
            <FilterField label={t("วันที่")}>
              <DatePicker
                allowClear={false}
                style={{ width: "100%" }}
                value={draft.day}
                format="DD/MM/BBBB"
                onChange={(value) => value && setDraft((d) => ({ ...d, day: value }))}
              />
            </FilterField>
          ) : null}

          {draft.mode === "month" ? (
            <FilterField label={t("เดือน")}>
              <DatePicker
                picker="month"
                allowClear={false}
                style={{ width: "100%" }}
                value={draft.month}
                format="MM/BBBB"
                onChange={(value) => value && setDraft((d) => ({ ...d, month: value }))}
              />
            </FilterField>
          ) : null}

          {draft.mode === "custom" ? (
            <FilterField label={t("ช่วงวันที่")} wide>
              <DatePicker.RangePicker
                allowClear={false}
                style={{ width: "100%" }}
                value={draft.customRange}
                format="DD/MM/BBBB"
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) return;
                  const next: [Dayjs, Dayjs] = [values[0], values[1]];
                  setDraft((d) => ({ ...d, customRange: next }));
                }}
              />
            </FilterField>
          ) : null}

          <FilterField label={t("ค้นหาพนักงาน")}>
            <Input
              allowClear
              placeholder={t("ชื่อ หรือ รหัสพนักงาน")}
              prefix={<SearchOutlined />}
              value={draft.keyword}
              onChange={(event) => setDraft((d) => ({ ...d, keyword: event.target.value }))}
              style={{ width: "100%" }}
            />
          </FilterField>

          <FilterField label={t("สถานะ")}>
            <Select
              allowClear
              placeholder={t("ทั้งหมด")}
              value={draft.status}
              onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
              style={{ width: "100%" }}
              options={[
                { label: t("ปกติ"), value: "PRESENT" },
                { label: t("สาย"), value: "LATE" },
                { label: t("ขาดงาน"), value: "ABSENT" },
                { label: t("ลางาน"), value: "ON_LEAVE" },
              ]}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.toolbar}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void summaryQuery.refetch();
              void recordsQuery.refetch();
            }}
          >
            {t("รีเฟรช")}
          </Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t("บันทึกเวลาย้อนหลัง")}
          </Button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>{t("พนักงานที่ลงเวลา")}</span>
            <strong>{summary?.totalEmployees ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ลงเวลาปกติ")}</span>
            <strong>{summary?.presentCount ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("มาสาย")}</span>
            <strong className={styles.warnValue}>
              {summary?.lateCount ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ยังไม่กดออกงาน")}</span>
            <strong className={styles.warnValue}>
              {summary?.missingCheckOutCount ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ลางาน (วัน-คน)")}</span>
            <strong className={styles.leaveValue}>
              {summary?.onLeaveCount ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("ชั่วโมงทำงานเฉลี่ย")}</span>
            <strong>{(summary?.avgWorkHours ?? 0).toFixed(2)} {t("ชม.")}</strong>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("จำนวนคนลงเวลาต่อวัน")}</h3>
              <p>{t("แยกพนักงานที่มาปกติกับมาสายในแต่ละวัน")}</p>
            </div>
            <div className={styles.chartBody}>
              {dailyChartData.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description={t("ไม่มีข้อมูลในช่วงนี้")}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyChartData}
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
                      allowDecimals={false}
                      tick={{ fill: MUTED, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      stackId="attendance"
                      dataKey="present"
                      name={t("ปกติ")}
                      fill={GREEN}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      stackId="attendance"
                      dataKey="late"
                      name={t("สาย")}
                      fill={ORANGE}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("ชั่วโมงทำงานเฉลี่ยต่อวัน")}</h3>
              <p>{t("นับเฉพาะคนที่กดออกงานครบแล้ว")}</p>
            </div>
            <div className={styles.chartBody}>
              {dailyChartData.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description={t("ไม่มีข้อมูลในช่วงนี้")}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyChartData}
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
                      formatter={(value) => [`${value} ${t("ชม.")}`, t("เฉลี่ย")]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgWorkHours"
                      name={t("ชั่วโมงเฉลี่ย")}
                      stroke={BLUE}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
            <div className={styles.chartHeader}>
              <h3>{t("ชั่วโมงทำงานรวมรายบุคคล (สูงสุด 8 คน)")}</h3>
              <p>{t("ยอดสะสมในช่วงที่เลือก")}</p>
            </div>
            <div className={styles.chartBody}>
              {topEmployees.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description={t("ไม่มีข้อมูลในช่วงนี้")}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={topEmployees}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0f3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: MUTED, fontSize: 11 }}
                      axisLine={{ stroke: "#e4e7eb" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={130}
                      tick={{ fill: MUTED, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e4e7eb",
                      }}
                      formatter={(value) => [`${value} ${t("ชม.")}`, t("รวม")]}
                    />
                    <Bar
                      dataKey="totalWorkHours"
                      fill={GREEN}
                      radius={[0, 4, 4, 0]}
                      minPointSize={4}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <Table<AttendanceRecord>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={recordsQuery.isFetching}
            scroll={{ x: 1400 }}
            pagination={{
              current: page,
              pageSize,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
            }}
            locale={{
              emptyText: <Empty description={t("ไม่มีรายการลงเวลาในช่วงนี้")} />,
            }}
          />
        </div>

        <AttendanceRecordModal
          open={modalOpen}
          record={editing}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </MasterPageGate>
  );
}
