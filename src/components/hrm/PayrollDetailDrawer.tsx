"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, Descriptions, Drawer, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClearOutlined, DownloadOutlined, EditOutlined, PrinterOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import {
  useCancelPayrollMutation,
  useFinalizePayrollMutation,
  usePayrollRunQuery,
  useRecalculatePayrollMutation,
} from "@/hooks/payroll/usePayroll";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { PAYROLL_STATUS_LABEL, type PayrollSlip } from "@/types/payroll";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { openPayslipPdf } from "@/utils/generatePayslipPdf";
import { releasePdfWindow, reservePdfWindow } from "@/utils/pdf-common";
import { toPayrollSheet } from "@/utils/payrollSheet";

import PayrollAdjustmentsModal from "./PayrollAdjustmentsModal";
import {
  EMPTY_SLIP_FILTER,
  SLIP_STATUS_OPTIONS,
  filterSlips,
  isSlipFilterActive,
  type Range,
  type SlipFilter,
} from "./payrollSlipFilter";
import { formatBeRange } from "./shutdownPlanFormat";

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLOR = { DRAFT: "gold", FINALIZED: "green", CANCELLED: "default" } as const;

type Props = { runId?: string; onClose: () => void };

/** รายละเอียดงวด: สลิปทุกคน ยอดรวม รายการปรับ + คำนวณใหม่/ปิดงวด/ยกเลิก/ส่งออก */
export default function PayrollDetailDrawer({ runId, onClose }: Props) {
  const { message } = App.useApp();
  const query = usePayrollRunQuery(runId);
  const recalc = useRecalculatePayrollMutation();
  const finalize = useFinalizePayrollMutation();
  const cancel = useCancelPayrollMutation();
  const [adjusting, setAdjusting] = useState<PayrollSlip | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<SlipFilter>(EMPTY_SLIP_FILTER);

  const run = query.data?.data;
  const filteredSlips = useMemo(() => filterSlips(run?.slips ?? [], filter), [run?.slips, filter]);
  const departmentOptions = useMemo(
    () =>
      [...new Set((run?.slips ?? []).map((s) => s.departmentName).filter((d): d is string => Boolean(d)))]
        .sort((a, b) => a.localeCompare(b, "th"))
        .map((d) => ({ value: d, label: d })),
    [run?.slips],
  );
  const isDraft = run?.status === "DRAFT";
  const canExport = !isMatrixPermissionMode() || hasPermission("HRM_PAYROLL.EXPORT");
  const canApprove = !isMatrixPermissionMode() || hasPermission("HRM_PAYROLL.APPROVE");

  const exportAs = async (format: "csv" | "xlsx") => {
    if (!run) return;
    try {
      await downloadTabularReport(format, toPayrollSheet(run));
    } catch {
      message.error("ส่งออกไม่สำเร็จ");
    }
  };

  const printSlips = async (slips: PayrollSlip[]) => {
    if (!run) return;
    reservePdfWindow();
    try {
      await openPayslipPdf(run, slips);
    } catch (error) {
      releasePdfWindow();
      message.error(error instanceof Error ? error.message : "สร้างสลิป PDF ไม่สำเร็จ");
    }
  };
  // สลิปที่ไม่มีรายได้เลย (ไม่มีฐานค่าจ้าง) ไม่พิมพ์ในชุดทั้งงวด
  const negativeSlips = run?.slips.filter((s) => s.netPay < 0) ?? [];
  const printableSlips = run?.slips.filter((s) => s.grossIncome > 0) ?? [];

  const rangeInputs = (label: string, key: "basePay" | "otAmount" | "netPay") => {
    const set = (patch: Partial<Range>) => setFilter((f) => ({ ...f, [key]: { ...f[key], ...patch } }));
    return (
      <Space size={4} align="center">
        <span style={{ color: "#8a94a6", fontSize: 12 }}>{label}</span>
        <InputNumber
          size="small"
          min={key === "netPay" ? undefined : 0}
          placeholder="ต่ำสุด"
          style={{ width: 96 }}
          value={filter[key].min ?? null}
          onChange={(v) => set({ min: v })}
          aria-label={`${label} ต่ำสุด`}
        />
        <span>–</span>
        <InputNumber
          size="small"
          min={key === "netPay" ? undefined : 0}
          placeholder="สูงสุด"
          style={{ width: 96 }}
          value={filter[key].max ?? null}
          onChange={(v) => set({ max: v })}
          aria-label={`${label} สูงสุด`}
        />
      </Space>
    );
  };

  const columns: ColumnsType<PayrollSlip> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "พนักงาน",
      key: "user",
      fixed: "left",
      width: 210,
      render: (_v, s) => (
        <div>
          <strong>{s.displayName}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[s.employeeCode, s.position].filter(Boolean).join(" · ") || "—"}
          </div>
          {s.warnings.map((w) => (
            <Tag key={w} color="orange" style={{ marginTop: 2, whiteSpace: "normal" }}>
              {w}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "ประเภท",
      key: "payType",
      width: 90,
      render: (_v, s) => (s.payType === "DAILY" ? "รายวัน" : "รายเดือน"),
    },
    {
      title: "เงินเดือน / ค่าแรงรายวัน",
      key: "base",
      width: 150,
      align: "right",
      render: (_v, s) => `${money(s.basePay)} ${s.payType === "DAILY" ? "/วัน" : "/เดือน"}`,
    },
    {
      title: "วัน (มา/ขาด/ลาจ่าย/ลาไม่จ่าย)",
      key: "days",
      width: 190,
      render: (_v, s) => `${s.attendedDays}/${s.absentDays}/${s.paidLeaveDays}/${s.unpaidLeaveDays}`,
    },
    { title: "ค่าจ้างปกติ", key: "reg", width: 110, align: "right", render: (_v, s) => money(s.regularPay) },
    { title: "หักขาด/ลา", key: "abs", width: 100, align: "right", render: (_v, s) => money(s.absenceDeduction) },
    {
      title: "OT",
      key: "ot",
      width: 120,
      align: "right",
      render: (_v, s) => `${money(s.otAmount)} (${s.otHours} ชม.)`,
    },
    {
      title: "ปรับ (+/−)",
      key: "adj",
      width: 130,
      align: "right",
      render: (_v, s) => `+${money(s.adjustmentEarnings)} / −${money(s.adjustmentDeductions)}`,
    },
    { title: "ประกันสังคม", key: "ss", width: 110, align: "right", render: (_v, s) => money(s.socialSecurity) },
    {
      title: "กองทุน",
      key: "pf",
      width: 120,
      align: "right",
      render: (_v, s) =>
        s.providentFundEmployer > 0
          ? `${money(s.providentFund)} (+นจ. ${money(s.providentFundEmployer)})`
          : money(s.providentFund),
    },
    { title: "ภาษีหัก ณ ที่จ่าย", key: "tax", width: 130, align: "right", render: (_v, s) => money(s.withholdingTax) },
    {
      title: "สุทธิ",
      key: "net",
      width: 120,
      align: "right",
      fixed: "right",
      render: (_v, s) => <strong>{money(s.netPay)}</strong>,
    },
    {
      title: "",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_v, s) => (
        <Space size={4}>
          {isDraft ? (
            <Button size="small" icon={<EditOutlined />} onClick={() => setAdjusting(s)}>
              ปรับ{s.adjustments.length ? ` (${s.adjustments.length})` : ""}
            </Button>
          ) : null}
          {canExport ? (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => void printSlips([s])}>
              สลิป
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      open={Boolean(runId)}
      onClose={() => {
        setFilter(EMPTY_SLIP_FILTER);
        onClose();
      }}
      size="large"
      styles={{ wrapper: { width: "min(1200px, 96vw)" } }}
      title={run ? `${run.name} · ${formatBeRange(run.periodStart, run.periodEnd)}` : "งวดเงินเดือน"}
      loading={query.isLoading}
      extra={
        run ? (
          <Space wrap>
            {canExport ? (
              <>
                <Button icon={<DownloadOutlined />} onClick={() => void exportAs("xlsx")}>
                  Excel
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => void exportAs("csv")}>
                  CSV
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  disabled={printableSlips.length === 0}
                  onClick={() => void printSlips(printableSlips)}
                >
                  สลิปทั้งงวด (PDF)
                </Button>
              </>
            ) : null}
            {isDraft ? (
              <Popconfirm
                title="คำนวณใหม่?"
                description="ดึงเวลา/ลา/OT/ฐานค่าจ้างล่าสุดมาคิดใหม่ทุกสลิป (รายการปรับคงอยู่)"
                okText="คำนวณใหม่"
                cancelText="ยกเลิก"
                onConfirm={() => recalc.mutate(run.id)}
              >
                <Button icon={<ReloadOutlined />} loading={recalc.isPending}>
                  คำนวณใหม่
                </Button>
              </Popconfirm>
            ) : null}
            {isDraft && canApprove ? (
              <Popconfirm
                title="ปิดงวดนี้?"
                description="ปิดแล้วแก้ไข/คำนวณใหม่ไม่ได้ (ยกเลิกงวดได้)"
                okText="ปิดงวด"
                cancelText="ยกเลิก"
                onConfirm={() => finalize.mutate(run.id)}
              >
                <Button type="primary" loading={finalize.isPending} disabled={negativeSlips.length > 0}>
                  ปิดงวด
                </Button>
              </Popconfirm>
            ) : null}
            {run.status !== "CANCELLED" && canApprove ? (
              <Button danger onClick={() => setCancelOpen(true)}>
                ยกเลิกงวด
              </Button>
            ) : null}
          </Space>
        ) : null
      }
    >
      {run ? (
        <>
          <Descriptions size="small" column={{ xs: 1, md: 3 }} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="สถานะ">
              <Tag color={STATUS_COLOR[run.status]}>{PAYROLL_STATUS_LABEL[run.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="จำนวนคน">{run.totals.slipCount}</Descriptions.Item>
            <Descriptions.Item label="รายได้รวม">{money(run.totals.grossIncome)}</Descriptions.Item>
            <Descriptions.Item label="ค่า OT">{money(run.totals.otAmount)}</Descriptions.Item>
            <Descriptions.Item label="ประกันสังคม">{money(run.totals.socialSecurity)}</Descriptions.Item>
            <Descriptions.Item label="กองทุน (พนักงาน / นายจ้างสมทบ)">
              {money(run.totals.providentFund)} / {money(run.totals.providentFundEmployer)}
            </Descriptions.Item>
            <Descriptions.Item label="ภาษีหัก ณ ที่จ่าย">{money(run.totals.withholdingTax)}</Descriptions.Item>
            <Descriptions.Item label="ยอดสุทธิรวม">
              <strong>{money(run.totals.netPay)}</strong>
            </Descriptions.Item>
          </Descriptions>
          {run.status === "CANCELLED" && run.cancelReason ? (
            <Alert type="info" showIcon title={`เหตุผลที่ยกเลิก: ${run.cancelReason}`} style={{ marginBottom: 12 }} />
          ) : null}
          {isDraft && negativeSlips.length > 0 ? (
            <Alert
              type="error"
              showIcon
              title={`ปิดงวดไม่ได้ — ${negativeSlips.length} สลิปมียอดสุทธิติดลบ: ${negativeSlips
                .slice(0, 5)
                .map((s) => s.displayName)
                .join(", ")}${negativeSlips.length > 5 ? " ..." : ""} (แก้รายการหัก/รายการปรับก่อน)`}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {run.totals.warningCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={`มี ${run.totals.warningCount} สลิปที่มีคำเตือน (เช่น ไม่มีฐานค่าจ้าง, OT คิดเงินไม่ได้) — ตรวจก่อนปิดงวด`}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Space wrap size={[12, 8]} style={{ marginBottom: 12 }}>
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined />}
              placeholder="ค้นหา ชื่อ / รหัส / ตำแหน่ง / แผนก"
              style={{ width: 260 }}
              value={filter.keyword}
              onChange={(e) => setFilter((f) => ({ ...f, keyword: e.target.value }))}
            />
            <Select
              size="small"
              style={{ width: 120 }}
              value={filter.payType}
              onChange={(payType) => setFilter((f) => ({ ...f, payType }))}
              options={[
                { value: "ALL", label: "ทุกประเภท" },
                { value: "MONTHLY", label: "รายเดือน" },
                { value: "DAILY", label: "รายวัน" },
              ]}
            />
            <Select
              size="small"
              style={{ width: 190 }}
              value={filter.status}
              onChange={(status) => setFilter((f) => ({ ...f, status }))}
              options={SLIP_STATUS_OPTIONS}
            />
            <Select
              size="small"
              allowClear
              showSearch
              placeholder="ทุกแผนก"
              style={{ width: 170 }}
              value={filter.department || undefined}
              onChange={(department) => setFilter((f) => ({ ...f, department: department ?? "" }))}
              options={departmentOptions}
            />
            {rangeInputs("เงินเดือน/ค่าแรง", "basePay")}
            {rangeInputs("ค่า OT (บาท)", "otAmount")}
            {rangeInputs("สุทธิ", "netPay")}
            <Button
              size="small"
              icon={<ClearOutlined />}
              disabled={!isSlipFilterActive(filter)}
              onClick={() => setFilter(EMPTY_SLIP_FILTER)}
            >
              ล้างตัวกรอง
            </Button>
          </Space>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredSlips}
            pagination={{
              pageSize: 50,
              showTotal: (t) =>
                isSlipFilterActive(filter) ? `พบ ${t} จาก ${run.slips.length} คน` : `ทั้งหมด ${t} คน`,
            }}
            scroll={{ x: 1440 }}
          />
          <PayrollAdjustmentsModal
            key={adjusting?.userId ?? "none"}
            runId={run.id}
            slip={adjusting ? (run.slips.find((s) => s.userId === adjusting.userId) ?? adjusting) : null}
            onClose={() => setAdjusting(null)}
          />
          <Modal
            open={cancelOpen}
            title="ยกเลิกงวดเงินเดือน"
            okText="ยืนยันยกเลิกงวด"
            okButtonProps={{ danger: true }}
            cancelText="ไม่ยกเลิก"
            confirmLoading={cancel.isPending}
            onCancel={() => setCancelOpen(false)}
            onOk={() =>
              cancel.mutate(
                { id: run.id, reason: reason.trim() || undefined },
                {
                  onSuccess: () => {
                    setCancelOpen(false);
                    setReason("");
                  },
                },
              )
            }
          >
            <Input.TextArea
              rows={3}
              maxLength={2000}
              placeholder="เหตุผล (ไม่บังคับ)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Modal>
        </>
      ) : null}
    </Drawer>
  );
}
