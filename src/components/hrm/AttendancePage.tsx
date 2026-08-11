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

/** สีกราฟ — ใช้ร่วมกับสี Tag ในตารางให้อ่านง่ายเป็นชุดเดียวกัน */
const GREEN = "#8ab933";
const ORANGE = "#fa8c16";
const BLUE = "#1677ff";
const MUTED = "#77777C";

type RangeMode = "day" | "month" | "custom";

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
  const { message } = App.useApp();
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
      message.success("คัดลอกลิงก์แล้ว");
    } catch {
      message.warning("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตัวเอง");
    }
  };

  const [mode, setMode] = useState<RangeMode>("month");
  const [day, setDay] = useState<Dayjs>(today);
  const [month, setMonth] = useState<Dayjs>(today);
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([
    today.subtract(6, "day"),
    today,
  ]);

  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState<string | undefined>();
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
        title: "พนักงาน",
        key: "employee",
        fixed: "left",
        width: 200,
        render: (_v, row) => (
          <div className={styles.employeeCell}>
            <strong>{row.displayName ?? "—"}</strong>
            <span>{row.employeeCode ?? "ไม่มีรหัสพนักงาน"}</span>
          </div>
        ),
      },
      {
        title: "แผนก",
        dataIndex: "departmentName",
        key: "departmentName",
        width: 140,
        ellipsis: true,
        render: (value?: string) => value ?? "—",
      },
      {
        title: "วันที่",
        dataIndex: "attendanceDate",
        key: "attendanceDate",
        width: 110,
        render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
      },
      {
        title: "เข้างาน",
        dataIndex: "checkInAt",
        key: "checkInAt",
        width: 90,
        align: "center",
        render: (value?: string) => formatTime(value),
      },
      {
        title: "ออกงาน",
        dataIndex: "checkOutAt",
        key: "checkOutAt",
        width: 90,
        align: "center",
        render: (value?: string) =>
          value ? (
            formatTime(value)
          ) : (
            <span className={styles.pending}>ยังไม่กดออก</span>
          ),
      },
      {
        title: "รวม (ชม.)",
        dataIndex: "workHours",
        key: "workHours",
        width: 90,
        align: "right",
        render: (value?: number) => formatHours(value),
      },
      {
        title: "สถานะ",
        dataIndex: "status",
        key: "status",
        width: 110,
        align: "center",
        render: (value: string, row) => (
          <Tag color={statusColor(value)}>
            {value === "ON_LEAVE" && row.leaveType
              ? (LEAVE_TYPE_LABEL[row.leaveType] ?? "ลางาน")
              : (ATTENDANCE_STATUS_LABEL[value] ?? value)}
          </Tag>
        ),
      },
      {
        title: "วิธีลงเวลา",
        dataIndex: "source",
        key: "source",
        width: 120,
        render: (value?: string) =>
          value ? (ATTENDANCE_SOURCE_LABEL[value] ?? value) : "—",
      },
      {
        title: "IP",
        dataIndex: "checkInIp",
        key: "checkInIp",
        width: 130,
        render: (value?: string) => value ?? "—",
      },
      {
        title: "จัดการ",
        key: "action",
        width: 150,
        align: "center",
        fixed: "right",
        render: (_v, row) =>
          // แถวลาเป็นของเสมือนจากใบลา ต้องไปแก้ที่หน้าคำขอลาแทน
          row.isLeave ? (
            <Tooltip title="มาจากใบลาที่อนุมัติแล้ว — แก้ที่หน้าคำขอลางาน">
              <span className={styles.pending}>ใบลา</span>
            </Tooltip>
          ) : (
            <Space size={4}>
              {!row.checkOutAt ? (
                <Button
                  size="small"
                  type="primary"
                  onClick={() => openEdit(row)}
                >
                  ปิดกะ
                </Button>
              ) : null}
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(row)}
              >
                แก้ไข
              </Button>
            </Space>
          ),
      },
    ],
    [],
  );

  return (
    <MasterPageGate isLoading={summaryQuery.isLoading}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <ClockCircleOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>HRM</p>
            <h1 className={styles.pageTitle}>บันทึกเวลาเข้า-ออกงาน</h1>
            <p className={styles.pageSubtitle}>
              รายการลงเวลาของพนักงาน เรียงจากล่าสุด ดูได้ทั้งรายวันและทั้งเดือน
              พร้อมกราฟสรุป
            </p>
            <div className={styles.shareLink}>
              <span>ลิงก์ให้พนักงานกดเข้า-ออกงาน</span>
              <code>{selfServiceUrl}</code>
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyLink}
              >
                คัดลอก
              </Button>
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <label className={styles.filterField}>
            <span>ช่วงข้อมูล</span>
            <Segmented
              options={MODE_OPTIONS}
              value={mode}
              onChange={(value) => setMode(value as RangeMode)}
            />
          </label>

          {mode === "day" ? (
            <label className={styles.filterField}>
              <span>วันที่</span>
              <DatePicker
                allowClear={false}
                value={day}
                format="DD/MM/YYYY"
                onChange={(value) => value && setDay(value)}
              />
            </label>
          ) : null}

          {mode === "month" ? (
            <label className={styles.filterField}>
              <span>เดือน</span>
              <DatePicker
                picker="month"
                allowClear={false}
                value={month}
                format="MM/YYYY"
                onChange={(value) => value && setMonth(value)}
              />
            </label>
          ) : null}

          {mode === "custom" ? (
            <label className={styles.filterField}>
              <span>ช่วงวันที่</span>
              <DatePicker.RangePicker
                allowClear={false}
                value={customRange}
                format="DD/MM/YYYY"
                onChange={(values) => {
                  if (!values?.[0] || !values[1]) return;
                  setCustomRange([values[0], values[1]]);
                }}
              />
            </label>
          ) : null}

          <label className={styles.filterField}>
            <span>ค้นหาพนักงาน</span>
            <Input
              allowClear
              placeholder="ชื่อ หรือ รหัสพนักงาน"
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={() => setAppliedKeyword(keyword)}
              onBlur={() => setAppliedKeyword(keyword)}
              style={{ width: 220 }}
            />
          </label>

          <label className={styles.filterField}>
            <span>สถานะ</span>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={status}
              onChange={setStatus}
              style={{ width: 140 }}
              options={[
                { label: "ปกติ", value: "PRESENT" },
                { label: "สาย", value: "LATE" },
                { label: "ขาดงาน", value: "ABSENT" },
                { label: "ลางาน", value: "ON_LEAVE" },
              ]}
            />
          </label>

          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void summaryQuery.refetch();
              void recordsQuery.refetch();
            }}
          >
            รีเฟรช
          </Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            บันทึกเวลาย้อนหลัง
          </Button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAccent}`}>
            <span>พนักงานที่ลงเวลา</span>
            <strong>{summary?.totalEmployees ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ลงเวลาปกติ</span>
            <strong>{summary?.presentCount ?? 0}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>มาสาย</span>
            <strong className={styles.warnValue}>
              {summary?.lateCount ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ยังไม่กดออกงาน</span>
            <strong className={styles.warnValue}>
              {summary?.missingCheckOutCount ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ลางาน (วัน-คน)</span>
            <strong className={styles.leaveValue}>
              {summary?.onLeaveCount ?? 0}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span>ชั่วโมงทำงานเฉลี่ย</span>
            <strong>{(summary?.avgWorkHours ?? 0).toFixed(2)} ชม.</strong>
          </div>
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>จำนวนคนลงเวลาต่อวัน</h3>
              <p>แยกพนักงานที่มาปกติกับมาสายในแต่ละวัน</p>
            </div>
            <div className={styles.chartBody}>
              {dailyChartData.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description="ไม่มีข้อมูลในช่วงนี้"
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
                      name="ปกติ"
                      fill={GREEN}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      stackId="attendance"
                      dataKey="late"
                      name="สาย"
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
              <h3>ชั่วโมงทำงานเฉลี่ยต่อวัน</h3>
              <p>นับเฉพาะคนที่กดออกงานครบแล้ว</p>
            </div>
            <div className={styles.chartBody}>
              {dailyChartData.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description="ไม่มีข้อมูลในช่วงนี้"
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
                      formatter={(value) => [`${value} ชม.`, "เฉลี่ย"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgWorkHours"
                      name="ชั่วโมงเฉลี่ย"
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
              <h3>ชั่วโมงทำงานรวมรายบุคคล (สูงสุด 8 คน)</h3>
              <p>ยอดสะสมในช่วงที่เลือก</p>
            </div>
            <div className={styles.chartBody}>
              {topEmployees.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description="ไม่มีข้อมูลในช่วงนี้"
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
                      formatter={(value) => [`${value} ชม.`, "รวม"]}
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
            scroll={{ x: 1240 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
            }}
            locale={{
              emptyText: <Empty description="ไม่มีรายการลงเวลาในช่วงนี้" />,
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
