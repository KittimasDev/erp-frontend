"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, Descriptions, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClearOutlined, DownloadOutlined, EditOutlined, InfoCircleOutlined, PrinterOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

import {
  useCancelPayrollMutation,
  useExcludeAndRecalculateMutation,
  useFinalizePayrollMutation,
  usePayrollRunQuery,
  useRecalculatePayrollMutation,
} from "@/hooks/payroll/usePayroll";
import { payBaseIssuesFromError } from "@/lib/api/payroll";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { payrollStatusLabel, type PayBaseIssue, type PayrollExclusionInput, type PayrollSlip } from "@/types/payroll";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { openPayslipPdf } from "@/utils/generatePayslipPdf";
import { releasePdfWindow, reservePdfWindow } from "@/utils/pdf-common";
import { toPayrollSheet } from "@/utils/payrollSheet";

import PayrollAdjustmentsModal from "./PayrollAdjustmentsModal";
import PayrollPayBaseIssuesModal from "./PayrollPayBaseIssuesModal";
import {
  EMPTY_SLIP_FILTER,
  SLIP_STATUS_OPTIONS,
  filterSlips,
  isSlipFilterActive,
  type Range,
  type SlipFilter,
} from "./payrollSlipFilter";
import { formatBeRange } from "./shutdownPlanFormat";


const STATUS_COLOR = { DRAFT: "gold", FINALIZED: "green", CANCELLED: "default" } as const;

type Props = { runId?: string; onClose: () => void };

/** รายละเอียดงวด: สลิปทุกคน ยอดรวม รายการปรับ + คำนวณใหม่/ปิดงวด/ยกเลิก/ส่งออก */
export default function PayrollDetailDrawer({ runId, onClose }: Props) {
  const { message } = App.useApp();
  const t = useT();
  const language = useLanguage();
  const money = (v: number) => formatMoney(v, language);
  // คำเตือนต่อสลิปมาจาก backend (ไทย) — มีชุดข้อความจำกัด จึงแปลฝั่งหน้าจอ · ข้อความที่ไม่รู้จักแสดงตามเดิม
  const warningText = (w: string) => {
    const otUnpriced = w.match(/^มีคำขอ OT ที่อนุมัติแล้วแต่คิดเงินไม่ได้ (\d+) รายการ/);
    return otUnpriced
      ? t("มีคำขอ OT ที่อนุมัติแล้วแต่คิดเงินไม่ได้ {n} รายการ (ไม่มีฐานค่าจ้างตอนอนุมัติ) — ไม่รวมในยอด", {
          n: otUnpriced[1],
        })
      : t(w);
  };
  const query = usePayrollRunQuery(runId);
  const recalc = useRecalculatePayrollMutation();
  const finalize = useFinalizePayrollMutation();
  const cancel = useCancelPayrollMutation();
  const excludeAndRecalc = useExcludeAndRecalculateMutation();
  // ฐานค่าจ้างไม่ครบตอนคำนวณใหม่/ปิดงวด → modal รายชื่อ (ตั้งค่าแล้วกลับมาคำนวณงวดเดิมได้)
  const [issues, setIssues] = useState<PayBaseIssue[]>([]);
  const onPayBaseError = (error: unknown) => {
    const found = payBaseIssuesFromError(error);
    if (found) setIssues(found);
  };
  const recheck = async (items: PayrollExclusionInput[]) => {
    if (!runId) return;
    try {
      await excludeAndRecalc.mutateAsync({ id: runId, items });
      setIssues([]);
    } catch (error) {
      onPayBaseError(error);
    }
  };
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
      message.error(t("ส่งออกไม่สำเร็จ"));
    }
  };

  const printSlips = async (slips: PayrollSlip[]) => {
    if (!run) return;
    reservePdfWindow();
    try {
      await openPayslipPdf(run, slips);
    } catch (error) {
      releasePdfWindow();
      message.error(error instanceof Error ? error.message : t("สร้างสลิป PDF ไม่สำเร็จ"));
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
          placeholder={t("ต่ำสุด")}
          style={{ width: 96 }}
          value={filter[key].min ?? null}
          onChange={(v) => set({ min: v })}
          aria-label={`${label} ${t("ต่ำสุด")}`}
        />
        <span>–</span>
        <InputNumber
          size="small"
          min={key === "netPay" ? undefined : 0}
          placeholder={t("สูงสุด")}
          style={{ width: 96 }}
          value={filter[key].max ?? null}
          onChange={(v) => set({ max: v })}
          aria-label={`${label} ${t("สูงสุด")}`}
        />
      </Space>
    );
  };

  const columns: ColumnsType<PayrollSlip> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 48,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("พนักงาน"),
      key: "user",
      width: 190,
      render: (_v, s) => (
        <div>
          <strong>{s.displayName}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[s.employeeCode, s.position].filter(Boolean).join(" · ") || "—"}
          </div>
          {s.warnings.map((w) => (
            <Tag key={w} color="orange" style={{ marginTop: 2, whiteSpace: "normal" }}>
              {warningText(w)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: t("เงินเดือน / ค่าแรงรายวัน"),
      key: "base",
      width: 140,
      align: "right",
      render: (_v, s) => `${money(s.basePay)} ${s.payType === "DAILY" ? t("/วัน") : t("/เดือน")}`,
    },
    {
      title: t("วัน (มา/ขาด/ลาจ่าย/ลาไม่จ่าย)"),
      key: "days",
      width: 130,
      render: (_v, s) => `${s.attendedDays}/${s.absentDays}/${s.paidLeaveDays}/${s.unpaidLeaveDays}`,
    },
    { title: t("ค่าจ้างปกติ"), key: "reg", width: 110, align: "right", render: (_v, s) => money(s.regularPay) },
    { title: t("หักขาด/ลา"), key: "abs", width: 100, align: "right", render: (_v, s) => money(s.absenceDeduction) },
    {
      title: "OT",
      key: "ot",
      width: 120,
      align: "right",
      render: (_v, s) => `${money(s.otAmount)} (${s.otHours} ${t("ชม.")})`,
    },
    {
      title: t("ปรับ (+/−)"),
      key: "adj",
      width: 130,
      align: "right",
      render: (_v, s) => `+${money(s.adjustmentEarnings)} / −${money(s.adjustmentDeductions)}`,
    },
    { title: t("ประกันสังคม"), key: "ss", width: 110, align: "right", render: (_v, s) => money(s.socialSecurity) },
    {
      title: t("กองทุน"),
      key: "pf",
      width: 120,
      align: "right",
      render: (_v, s) =>
        s.providentFundEmployer > 0
          ? `${money(s.providentFund)} (+${t("นจ.")} ${money(s.providentFundEmployer)})`
          : money(s.providentFund),
    },
    { title: t("ภาษีหัก ณ ที่จ่าย"), key: "tax", width: 130, align: "right", render: (_v, s) => money(s.withholdingTax) },
    {
      title: t("สุทธิ"),
      key: "net",
      width: 120,
      align: "right",
      render: (_v, s) => <strong>{money(s.netPay)}</strong>,
    },
    {
      title: "",
      key: "actions",
      width: 150,
      render: (_v, s) => (
        <Space size={4}>
          {isDraft ? (
            <Button size="small" icon={<EditOutlined />} onClick={() => setAdjusting(s)}>
              {t("ปรับ")}{s.adjustments.length ? ` (${s.adjustments.length})` : ""}
            </Button>
          ) : null}
          {canExport ? (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => void printSlips([s])}>
              {t("สลิป")}
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={Boolean(runId)}
      onCancel={() => {
        setFilter(EMPTY_SLIP_FILTER);
        onClose();
      }}
      centered
      width="min(1700px, 97vw)"
      footer={null}
      destroyOnHidden
      styles={{ body: { maxHeight: "calc(100vh - 160px)", overflowY: "auto", overflowX: "hidden" } }}
      title={run ? `${run.name} · ${formatBeRange(run.periodStart, run.periodEnd, language)}` : t("งวดเงินเดือน")}
      loading={query.isLoading}
    >
      {run ? (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {run ? (
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
                  {t("สลิปทั้งงวด (PDF)")}
                </Button>
              </>
            ) : null}
            {isDraft ? (
              <Popconfirm
                title={t("คำนวณใหม่?")}
                description={t("ดึงเวลา/ลา/OT/ฐานค่าจ้างล่าสุดมาคิดใหม่ทุกสลิป (รายการปรับคงอยู่)")}
                okText={t("คำนวณใหม่")}
                cancelText={t("ยกเลิก")}
                onConfirm={() => recalc.mutate(run.id, { onError: onPayBaseError })}
              >
                <Button icon={<ReloadOutlined />} loading={recalc.isPending}>
                  {t("คำนวณใหม่")}
                </Button>
              </Popconfirm>
            ) : null}
            {isDraft && canApprove ? (
              <Popconfirm
                title={t("ปิดงวดนี้?")}
                description={t("ปิดแล้วแก้ไข/คำนวณใหม่ไม่ได้ (ยกเลิกงวดได้)")}
                okText={t("ปิดงวด")}
                cancelText={t("ยกเลิก")}
                onConfirm={() => finalize.mutate(run.id, { onError: onPayBaseError })}
              >
                <Button type="primary" loading={finalize.isPending} disabled={negativeSlips.length > 0}>
                  {t("ปิดงวด")}
                </Button>
              </Popconfirm>
            ) : null}
            {run.status !== "CANCELLED" && canApprove ? (
              <Button danger onClick={() => setCancelOpen(true)}>
                {t("ยกเลิกงวด")}
              </Button>
            ) : null}
          </Space>
        ) : null}
          </div>
          {/* ยอดจ่ายสุทธิรวมเป็น KPI หลัก · รายการอื่นเป็นตัวเลขประกอบ (UI เท่านั้น ไม่เปลี่ยนการคำนวณ) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch", marginBottom: 12 }}>
            <div
              style={{
                minWidth: 280,
                padding: "12px 20px",
                borderRadius: 8,
                border: "1px solid var(--ant-color-primary-border, #b7eb8f)",
                background: "var(--ant-color-primary-bg, #f6ffed)",
              }}
            >
              <div style={{ fontSize: 13, color: "var(--ant-color-text-secondary, #5b6475)" }}>
                {t("ยอดจ่ายสุทธิรวม")}{" "}
                <Tooltip title={t("ยอดเงินที่ต้องจ่ายให้พนักงานหลังหักรายการทั้งหมด ไม่ใช่สถานะยืนยันการโอนเงิน")}>
                  <InfoCircleOutlined aria-label={t("ยอดจ่ายสุทธิรวม")} />
                </Tooltip>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25 }}>{money(run.totals.netPay)}</div>
            </div>
            <Descriptions size="small" column={{ xs: 1, md: 2, xl: 3 }} style={{ flex: 1, minWidth: 320 }}>
              <Descriptions.Item label={t("สถานะ")}>
                <Tag color={STATUS_COLOR[run.status]}>{payrollStatusLabel(run.status, language)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t("พนักงานในงวด")}>{run.totals.slipCount}</Descriptions.Item>
              <Descriptions.Item
                label={
                  <span>
                    {t("รายได้รวมก่อนหัก")}{" "}
                    <Tooltip title={t("รวมค่าจ้างปกติ ค่าล่วงเวลา และรายได้เพิ่มเติม ก่อนหักวันขาดงานและรายการหักอื่น ๆ")}>
                      <InfoCircleOutlined aria-label={t("รายได้รวมก่อนหัก")} />
                    </Tooltip>
                  </span>
                }
              >
                {money(run.totals.grossIncome)}
              </Descriptions.Item>
              <Descriptions.Item label={t("ค่าล่วงเวลา (OT)")}>{money(run.totals.otAmount)}</Descriptions.Item>
              <Descriptions.Item label={t("เงินสมทบประกันสังคม (พนักงาน)")}>{money(run.totals.socialSecurity)}</Descriptions.Item>
              <Descriptions.Item label={t("เงินสะสมกองทุน (พนักงาน)")}>{money(run.totals.providentFund)}</Descriptions.Item>
              <Descriptions.Item label={t("เงินสมทบกองทุน (นายจ้าง)")}>{money(run.totals.providentFundEmployer)}</Descriptions.Item>
              <Descriptions.Item label={t("ภาษีเงินได้หัก ณ ที่จ่าย")}>{money(run.totals.withholdingTax)}</Descriptions.Item>
            </Descriptions>
          </div>
          {run.status === "CANCELLED" && run.cancelReason ? (
            <Alert type="info" showIcon title={`${t("เหตุผลที่ยกเลิก")}: ${run.cancelReason}`} style={{ marginBottom: 12 }} />
          ) : null}
          {isDraft && negativeSlips.length > 0 ? (
            <Alert
              type="error"
              showIcon
              title={t("ปิดงวดไม่ได้ — {n} สลิปมียอดสุทธิติดลบ: {names} (แก้รายการหัก/รายการปรับก่อน)", {
                n: negativeSlips.length,
                names: `${negativeSlips
                  .slice(0, 5)
                  .map((s) => s.displayName)
                  .join(", ")}${negativeSlips.length > 5 ? " ..." : ""}`,
              })}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {run.totals.warningCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={t("มี {n} สลิปที่มีคำเตือน (เช่น ไม่มีฐานค่าจ้าง, OT คิดเงินไม่ได้) — ตรวจก่อนปิดงวด", {
                n: run.totals.warningCount,
              })}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Space wrap size={[12, 8]} style={{ marginBottom: 12 }}>
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined />}
              placeholder={t("ค้นหา ชื่อ / รหัส / ตำแหน่ง / แผนก")}
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
                { value: "ALL", label: t("ทุกประเภท") },
                { value: "MONTHLY", label: t("รายเดือน") },
                { value: "DAILY", label: t("รายวัน") },
              ]}
            />
            <Select
              size="small"
              style={{ width: 190 }}
              value={filter.status}
              onChange={(status) => setFilter((f) => ({ ...f, status }))}
              options={SLIP_STATUS_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            />
            <Select
              size="small"
              allowClear
              showSearch
              placeholder={t("ทุกแผนก")}
              style={{ width: 170 }}
              value={filter.department || undefined}
              onChange={(department) => setFilter((f) => ({ ...f, department: department ?? "" }))}
              options={departmentOptions}
            />
            {rangeInputs(t("เงินเดือน/ค่าแรง"), "basePay")}
            {rangeInputs(t("ค่า OT (บาท)"), "otAmount")}
            {rangeInputs(t("สุทธิ"), "netPay")}
            <Button
              size="small"
              icon={<ClearOutlined />}
              disabled={!isSlipFilterActive(filter)}
              onClick={() => setFilter(EMPTY_SLIP_FILTER)}
            >
              {t("ล้างตัวกรอง")}
            </Button>
          </Space>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={filteredSlips}
            pagination={{
              pageSize: 50,
              showTotal: (total) =>
                isSlipFilterActive(filter)
                  ? t("พบ {n} จาก {total} คน", { n: total, total: run.slips.length })
                  : t("ทั้งหมด {n} คน", { n: total }),
            }}
            tableLayout="auto"
          />
          <PayrollAdjustmentsModal
            key={adjusting?.userId ?? "none"}
            runId={run.id}
            slip={adjusting ? (run.slips.find((s) => s.userId === adjusting.userId) ?? adjusting) : null}
            onClose={() => setAdjusting(null)}
          />
          <PayrollPayBaseIssuesModal
            open={issues.length > 0}
            issues={issues}
            existing={(run.exclusions ?? []).map((e) => ({
              userId: e.userId,
              reasonCode: e.reasonCode,
              reasonNote: e.reasonNote ?? undefined,
            }))}
            loading={excludeAndRecalc.isPending}
            onSubmit={recheck}
            onClose={() => setIssues([])}
          />
          <Modal
            open={cancelOpen}
            title={t("ยกเลิกงวดเงินเดือน")}
            okText={t("ยืนยันยกเลิกงวด")}
            okButtonProps={{ danger: true }}
            cancelText={t("ไม่ยกเลิก")}
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
              placeholder={t("เหตุผล (ไม่บังคับ)")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Modal>
        </>
      ) : null}
    </Modal>
  );
}
