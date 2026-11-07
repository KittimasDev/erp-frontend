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
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import MasterPageGate from "@/components/common/MasterPageGate";
import { useReviewLeaveRequestMutation } from "@/hooks/leave/useLeaveMutations";
import { getLeaveStaffingCheck } from "@/lib/api/leave";
import { getAccessToken } from "@/lib/auth/token";
import MinStaffingModal from "./MinStaffingModal";
import {
  useLeaveRequestsQuery,
  useLeaveSummaryQuery,
} from "@/hooks/leave/useLeaveQueries";
import {
  LEAVE_SOURCE_LABEL,
  LEAVE_STATUS_COLOR,
  LEAVE_TYPE_COLOR,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_OPTIONS,
  leaveStatusLabel,
  type LeaveRequest,
} from "@/types/leave";

import styles from "./LeaveRequestsPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const GREEN = "#8ab933";
const MUTED = "#77777C";

/** สีกราฟตามประเภทการลา ให้ตรงกับสี Tag ในตาราง */
const TYPE_CHART_COLOR: Record<string, string> = {
  ANNUAL: "#8ab933",
  SICK: "#fa541c",
  PERSONAL: "#1677ff",
  MATERNITY: "#eb2f96",
  OTHER: "#bfbfbf",
};

/** DRAFT = รออนุมัติ — ตั้งเป็นแท็บแรกเพราะเป็นงานที่ต้องทำ */
type StatusTab = "DRAFT" | "APPROVED" | "REJECTED" | "CANCELLED" | "ALL";

function formatRange(startDate: string, endDate: string) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (start.isSame(end, "day")) {
    return start.format("DD/MM/YYYY");
  }
  return `${start.format("DD/MM/YYYY")} - ${end.format("DD/MM/YYYY")}`;
}

export default function LeaveRequestsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { modal } = App.useApp();
  const t = useT();
  const lang = useLanguage();
  const today = dayjs();

  const [tab, setTab] = useState<StatusTab>("DRAFT");
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    today.startOf("month"),
    today.endOf("month"),
  ]);
  const [leaveType, setLeaveType] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const rangeParams = {
    dateFrom: range[0].format("YYYY-MM-DD"),
    dateTo: range[1].format("YYYY-MM-DD"),
  };

  const summaryQuery = useLeaveSummaryQuery(rangeParams);
  const summary = summaryQuery.data?.data;

  // คิวรออนุมัติดูทั้งหมดไม่ผูกช่วงวันที่ — ของค้างเก่าต้องไม่หายไปจากคิว
  const listQuery = useLeaveRequestsQuery({
    status: tab === "ALL" ? undefined : tab,
    leaveType,
    q: appliedKeyword || undefined,
    ...(tab === "DRAFT" ? {} : rangeParams),
  });
  const rows = listQuery.data?.data ?? [];

  const reviewMutation = useReviewLeaveRequestMutation();
  const isPendingTab = tab === "DRAFT";
  const [minStaffingOpen, setMinStaffingOpen] = useState(false);

  const typeChartData = useMemo(
    () =>
      (summary?.byType ?? []).map((row) => ({
        ...row,
        label: t(LEAVE_TYPE_LABEL[row.leaveType] ?? row.leaveType),
      })),
    [summary?.byType, t],
  );

  const userChartData = useMemo(
    () =>
      (summary?.byUser ?? []).slice(0, 8).map((row) => ({
        ...row,
        label: row.displayName || row.employeeCode || row.userId.slice(0, 8),
      })),
    [summary?.byUser],
  );

  const review = async (
    ids: string[],
    action: "approve" | "reject",
    remark?: string,
    acknowledgeShortage?: boolean,
  ) => {
    for (const id of ids) {
      await reviewMutation.mutateAsync({ id, action, remark, acknowledgeShortage });
    }
    setSelectedIds([]);
  };

  /**
   * ตรวจกำลังคนขั้นต่ำก่อนอนุมัติ — ถ้าอนุมัติแล้วกะไหนเหลือน้อยกว่าขั้นต่ำ แสดงรายการให้รับทราบก่อน
   * (ไม่บล็อก ผู้อนุมัติตัดสินใจเอง · backend ก็ตอบ 409 ถ้าไม่รับทราบ)
   */
  const confirmApprove = async (ids: string[], names: string[]) => {
    const token = getAccessToken();
    let warnings: Array<{ name: string; messages: string[] }> = [];
    try {
      const checks = await Promise.all(ids.map((id) => getLeaveStaffingCheck(token, id)));
      warnings = checks
        .map((check, index) => ({
          name: names[index] ?? t("พนักงาน"),
          messages: check.data.messages,
        }))
        .filter((item) => item.messages.length > 0);
    } catch {
      // ตรวจไม่ได้ (เช่น เครือข่าย) — ปล่อยให้ backend เป็นด่านสุดท้าย (ตอบ 409 ถ้าไม่พอ)
    }

    if (warnings.length === 0) {
      modal.confirm({
        title: t("อนุมัติคำขอลา {n} รายการ", { n: ids.length }),
        content: t("ยืนยันอนุมัติคำขอที่เลือกทั้งหมด?"),
        okText: t("อนุมัติ"),
        cancelText: t("ยกเลิก"),
        centered: true,
        onOk: () => review(ids, "approve"),
      });
      return;
    }

    modal.confirm({
      title: t("กำลังคนในกะต่ำกว่าขั้นต่ำ — รับทราบก่อนอนุมัติ"),
      width: 560,
      content: (
        <div className={styles.rejectBody}>
          <p>
            {t("อนุมัติแล้วกะต่อไปนี้จะเหลือคน (ตำแหน่งเดียวกัน หักคนที่ลาอยู่) น้อยกว่าขั้นต่ำที่ตั้งไว้ — อนุมัติได้ ระบบจะบันทึกว่าคุณรับทราบ")}
          </p>
          {warnings.map((item) => (
            <div key={item.name}>
              <strong>{item.name}</strong>
              <ul style={{ margin: "4px 0 8px", paddingLeft: 18 }}>
                {item.messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ),
      okText: t("รับทราบและอนุมัติ"),
      cancelText: t("ยกเลิก"),
      centered: true,
      onOk: () => review(ids, "approve", undefined, true),
    });
  };

  const confirmReject = (ids: string[]) => {
    let remark = "";
    modal.confirm({
      title: t("ปฏิเสธคำขอลา {n} รายการ", { n: ids.length }),
      content: (
        <div className={styles.rejectBody}>
          <p>{t("ระบุเหตุผลให้พนักงานทราบ (พนักงานจะเห็นข้อความนี้)")}</p>
          <Input.TextArea
            rows={3}
            placeholder={t("เช่น ช่วงนี้กำลังเร่งผลิต ขอให้เลื่อนไปสัปดาห์หน้า")}
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

  const columns: ColumnsType<LeaveRequest> = useMemo(
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
        title: t("ประเภท"),
        dataIndex: "leaveType",
        key: "leaveType",
        width: 110,
        align: "center",
        render: (value: string) => (
          <Tag color={LEAVE_TYPE_COLOR[value]}>
            {t(LEAVE_TYPE_LABEL[value] ?? value)}
          </Tag>
        ),
      },
      {
        title: t("ช่วงวันที่ลา"),
        key: "range",
        width: 190,
        render: (_v, row) => formatRange(row.startDate, row.endDate),
      },
      {
        title: t("จำนวนวัน"),
        dataIndex: "days",
        key: "days",
        width: 90,
        align: "right",
        render: (value: number) => (
          <strong className={styles.daysValue}>{value}</strong>
        ),
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
            <span>{dayjs(value).format("DD/MM/YYYY HH:mm")}</span>
            <small>
              {row.source ? t(LEAVE_SOURCE_LABEL[row.source] ?? "") : ""}
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
            <Tag color={LEAVE_STATUS_COLOR[value]}>
              {leaveStatusLabel(value, lang)}
            </Tag>
            {row.staffingWarning?.length ? (
              <Tooltip
                title={row.staffingWarning
                  .map(
                    (item) =>
                      t("{date} {position} กะ{shift} เหลือ {remaining} (ขั้นต่ำ {min})", { date: dayjs(item.date).format("DD/MM"), position: item.position, shift: item.shiftName, remaining: item.remaining, min: item.minHeadcount }),
                  )
                  .join(" · ")}
              >
                <small className={styles.remarkHint}>{t("รับทราบกำลังคนต่ำกว่าขั้นต่ำ")}</small>
              </Tooltip>
            ) : null}
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
                  ? dayjs(row.approvedAt).format("DD/MM/YYYY HH:mm")
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
                onClick={() => void confirmApprove([row.id], [row.displayName ?? t("พนักงาน")])}
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
          icon={<CalendarOutlined />}
          title={t("คำขอลางาน")}
          subtitle={<>{t("พนักงานยื่นคำขอเองผ่านมือถือที่")}<code>/leave</code> — {t("หน้านี้ไว้พิจารณาอนุมัติ เลือกหลายรายการพร้อมกันได้")}</>}
          actions={
            <>
<Button onClick={() => setMinStaffingOpen(true)}>{t("ตั้งกำลังคนขั้นต่ำ")}</Button>
            </>
          }
        />

        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryCard} ${styles.summaryCardAlert}`}>
            <span>{t("รออนุมัติ (ทั้งหมด)")}</span>
            <strong>{t("{n} คำขอ", { n: summary?.pendingCount ?? 0 })}</strong>
            <small>{t("{n} วัน", { n: summary?.pendingDays ?? 0 })}</small>
          </div>
          <div className={`${styles.summaryCard} ${styles.summaryCardToday}`}>
            <span>{t("ลาอยู่วันนี้")}</span>
            <strong>{t("{n} คน", { n: summary?.onLeaveToday ?? 0 })}</strong>
            <small>{t("เฉพาะคำขอที่อนุมัติแล้ว")}</small>
          </div>
          <div className={styles.summaryCard}>
            <span>{t("อนุมัติแล้วในช่วงนี้")}</span>
            <strong>{t("{n} คำขอ", { n: summary?.approvedCount ?? 0 })}</strong>
            <small>{t("{n} วัน", { n: summary?.approvedDays ?? 0 })}</small>
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
                    {leaveStatusLabel("DRAFT", lang)}
                    {summary?.pendingCount ? (
                      <span className={styles.tabCount}>
                        {summary.pendingCount}
                      </span>
                    ) : null}
                  </span>
                ),
              },
              { value: "APPROVED", label: leaveStatusLabel("APPROVED", lang) },
              { value: "REJECTED", label: leaveStatusLabel("REJECTED", lang) },
              { value: "CANCELLED", label: leaveStatusLabel("CANCELLED", lang) },
              { value: "ALL", label: t("ทั้งหมด") },
            ]}
          />

          <div className={styles.toolbarRight}>
            <Select
              allowClear
              placeholder={t("ทุกประเภท")}
              value={leaveType}
              onChange={setLeaveType}
              style={{ width: 150 }}
              options={LEAVE_TYPE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            />
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
              placeholder={t("ค้นหาชื่อ / รหัส / เหตุผล")}
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onPressEnter={() => setAppliedKeyword(keyword)}
              onBlur={() => setAppliedKeyword(keyword)}
              style={{ width: 220 }}
            />
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
                onClick={() =>
                  void confirmApprove(
                    selectedIds,
                    selectedIds.map((id) => rows.find((r) => r.id === id)?.displayName ?? t("พนักงาน")),
                  )
                }
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
          <Table<LeaveRequest>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={rows}
            loading={listQuery.isFetching}
            scroll={{ x: 1240 }}
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
                      ? t("ไม่มีคำขอลารออนุมัติ — เคลียร์หมดแล้ว 🎉")
                      : t("ไม่มีคำขอในเงื่อนไขนี้")
                  }
                />
              ),
            }}
          />
        </div>

        <div className={styles.chartsGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("วันลาแยกตามประเภท")}</h3>
              <p>{t("นับเฉพาะคำขอที่อนุมัติแล้วในช่วงที่เลือก")}</p>
            </div>
            <div className={styles.chartBody}>
              {typeChartData.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description={t("ไม่มีข้อมูลในช่วงนี้")}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={typeChartData}
                    margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: MUTED, fontSize: 12 }}
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
                      formatter={(value) => [`${value} ${t("วัน")}`, t("รวม")]}
                    />
                    <Bar dataKey="days" radius={[4, 4, 0, 0]}>
                      {typeChartData.map((row) => (
                        <Cell
                          key={row.leaveType}
                          fill={TYPE_CHART_COLOR[row.leaveType] ?? GREEN}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3>{t("วันลารายบุคคล (สูงสุด 8 คน)")}</h3>
              <p>{t("ยอดวันลาที่อนุมัติแล้วในช่วงที่เลือก")}</p>
            </div>
            <div className={styles.chartBody}>
              {userChartData.length === 0 ? (
                <Empty
                  className={styles.emptyState}
                  description={t("ไม่มีข้อมูลในช่วงนี้")}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={userChartData}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0f3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
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
                      formatter={(value) => [`${value} ${t("วัน")}`, t("รวม")]}
                    />
                    <Bar
                      dataKey="approvedDays"
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

        <MinStaffingModal open={minStaffingOpen} onClose={() => setMinStaffingOpen(false)} />
      </div>
    </MasterPageGate>
  );
}
