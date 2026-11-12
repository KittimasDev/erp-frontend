"use client";

import { useMemo, useState } from "react";
import { Alert, App, Badge, Button, Descriptions, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  ClearOutlined,
  DownloadOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PrinterOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";

import {
  useApprovePayrollMutation,
  useCancelPayrollMutation,
  useExcludeAndRecalculateMutation,
  useFinalizePayrollMutation,
  usePayrollRunQuery,
  useRecalculatePayrollMutation,
  useReturnPayrollToDraftMutation,
  useSendBackPayrollMutation,
} from "@/hooks/payroll/usePayroll";
import { payBaseIssuesFromError } from "@/lib/api/payroll";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  PAYROLL_STATUS_COLOR,
  payrollStatusLabel,
  type PayBaseIssue,
  type PayrollExclusionInput,
  type PayrollSlip,
} from "@/types/payroll";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { openPayslipPdf } from "@/utils/generatePayslipPdf";
import { releasePdfWindow, reservePdfWindow } from "@/utils/pdf-common";
import { toPayrollSheet } from "@/utils/payrollSheet";

import PayrollAdjustmentsModal from "./PayrollAdjustmentsModal";
import PayrollHistoryTab from "./PayrollHistoryTab";
import PayrollPayBaseIssuesModal from "./PayrollPayBaseIssuesModal";
import PayrollIncompleteAlert from "./PayrollIncompleteAlert";
import PayrollPaymentsTab from "./PayrollPaymentsTab";
import { PayrollChecksModal, ReasonModal } from "./PayrollWorkflowModals";
import {
  EMPTY_SLIP_FILTER,
  SLIP_STATUS_OPTIONS,
  filterSlips,
  isSlipFilterActive,
  type Range,
  type SlipFilter,
} from "./payrollSlipFilter";
import { formatBeRange } from "./shutdownPlanFormat";


type Props = { runId?: string; onClose: () => void };

/**
 * รายละเอียดงวด: สลิปทุกคน ยอดรวม รายการปรับ + ขั้นตอน ส่งอนุมัติ → อนุมัติ → ส่งออก/บันทึกผลจ่าย → ปิดงวด
 * ปุ่มแสดงตามสถานะ+สิทธิ์ (SUBMIT / APPROVE / PAY / EXPORT / DELETE) — backend ตรวจซ้ำทุกครั้ง
 */
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
  const approve = useApprovePayrollMutation();
  const sendBack = useSendBackPayrollMutation();
  const returnToDraft = useReturnPayrollToDraftMutation();
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
  const [reasonDialog, setReasonDialog] = useState<"cancel" | "sendBack" | "returnToDraft" | null>(null);
  const [checksOpen, setChecksOpen] = useState(false);
  const [tab, setTab] = useState("slips");
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
  const can = (code: string) => !isMatrixPermissionMode() || hasPermission(`HRM_PAYROLL.${code}`);
  const canExport = can("EXPORT");
  const canEdit = can("EDIT");
  const canSubmit = can("SUBMIT");
  const canApprove = can("APPROVE");
  const canPay = can("PAY");
  const canCancel = can("DELETE");

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
  const zeroSlips = run?.slips.filter((s) => s.netPay === 0) ?? [];
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
        setTab("slips");
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
            <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>
              {t("รีเฟรชข้อมูล")}
            </Button>
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
            {isDraft && canEdit ? (
              <Popconfirm
                title={t("คำนวณใหม่?")}
                description={t("ดึงเวลา/ลา/OT/ฐานค่าจ้างล่าสุดมาคิดใหม่ทุกสลิป (รายการปรับคงอยู่)")}
                okText={t("คำนวณใหม่")}
                cancelText={t("ปิดหน้าต่าง")}
                onConfirm={() => recalc.mutate(run.id, { onError: onPayBaseError })}
              >
                <Button icon={<ReloadOutlined />} loading={recalc.isPending}>
                  {t("คำนวณใหม่")}
                </Button>
              </Popconfirm>
            ) : null}
            {isDraft && canSubmit ? (
              <Button type="primary" icon={<SendOutlined />} onClick={() => setChecksOpen(true)}>
                {t("ตรวจและส่งอนุมัติ")}
              </Button>
            ) : null}
            {run.status === "PENDING_APPROVAL" && canApprove ? (
              <>
                <Popconfirm
                  title={t("อนุมัติงวดนี้?")}
                  description={t("อนุมัติแล้วระบบสร้างรายการจ่ายรายพนักงาน และแก้ยอดโดยตรงไม่ได้")}
                  okText={t("อนุมัติ")}
                  cancelText={t("ปิดหน้าต่าง")}
                  onConfirm={() => approve.mutate(run.id)}
                >
                  <Button type="primary" icon={<CheckOutlined />} loading={approve.isPending}>
                    {t("อนุมัติ")}
                  </Button>
                </Popconfirm>
                <Button icon={<RollbackOutlined />} onClick={() => setReasonDialog("sendBack")}>
                  {t("ส่งกลับแก้ไข")}
                </Button>
              </>
            ) : null}
            {run.status === "PENDING_PAYMENT" && canApprove ? (
              <Button icon={<RollbackOutlined />} onClick={() => setReasonDialog("returnToDraft")}>
                {t("ถอนกลับเป็นร่าง")}
              </Button>
            ) : null}
            {run.status === "PAID" && canApprove ? (
              <Popconfirm
                title={t("ปิดงวดนี้?")}
                description={t("ปิดแล้วล็อกทุกอย่าง และข้อมูลงวดนี้ใช้ออก 50 ทวิ ได้")}
                okText={t("ปิดงวด")}
                cancelText={t("ปิดหน้าต่าง")}
                onConfirm={() => finalize.mutate(run.id)}
              >
                <Button type="primary" icon={<CheckOutlined />} loading={finalize.isPending}>
                  {t("ปิดงวด")}
                </Button>
              </Popconfirm>
            ) : null}
            {["DRAFT", "PENDING_APPROVAL", "PENDING_PAYMENT"].includes(run.status) && canCancel ? (
              <Button danger onClick={() => setReasonDialog("cancel")}>
                {t("ยกเลิกงวด")}
              </Button>
            ) : null}
          </Space>
        ) : null}
          </div>
          {/* ยอดจ่ายสุทธิรวมเป็น KPI หลัก · รายการอื่นเป็นตัวเลขประกอบ (UI เท่านั้น ไม่เปลี่ยนการคำนวณ) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "stretch", marginBottom: 12 }}>
            <Descriptions size="small" column={{ xs: 1, md: 2, xl: 3 }} style={{ flex: 1, minWidth: 320 }}>
              <Descriptions.Item label={t("สถานะ")}>
                <Tag color={PAYROLL_STATUS_COLOR[run.status]}>{payrollStatusLabel(run.status, language)}</Tag>
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
          </div>
          {run.status === "CANCELLED" && run.cancelReason ? (
            <Alert type="info" showIcon title={`${t("เหตุผลที่ยกเลิก")}: ${run.cancelReason}`} style={{ marginBottom: 12 }} />
          ) : null}
          {isDraft && run.returnReason ? (
            <Alert
              type="warning"
              showIcon
              title={`${t("ถูกส่งกลับแก้ไข")}: ${run.returnReason}`}
              description={t("แก้ไข/คำนวณใหม่ตามเหตุผล แล้วส่งอนุมัติอีกครั้ง")}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {run.status === "PENDING_APPROVAL" ? (
            <Alert
              type="info"
              showIcon
              title={t("รออนุมัติ — แก้รายการปรับ/คำนวณใหม่ถูกล็อก ผู้อนุมัติตรวจยอดแล้วอนุมัติ หรือส่งกลับแก้ไขพร้อมเหตุผล")}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {run.status === "PAID" ? (
            <Alert
              type="success"
              showIcon
              title={t("จ่ายเงินครบทุกรายการแล้ว — ตรวจยอดแล้วปิดงวด")}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {isDraft && negativeSlips.length > 0 ? (
            <Alert
              type="error"
              showIcon
              title={t("ส่งอนุมัติไม่ได้ — {n} สลิปมียอดสุทธิติดลบ: {names} (แก้รายการหัก/รายการปรับก่อน)", {
                n: negativeSlips.length,
                names: `${negativeSlips
                  .slice(0, 5)
                  .map((s) => s.displayName)
                  .join(", ")}${negativeSlips.length > 5 ? " ..." : ""}`,
              })}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {isDraft && zeroSlips.length > 0 ? (
            <Alert
              type="error"
              showIcon
              title={t("ส่งอนุมัติไม่ได้ — {n} สลิปมียอดสุทธิเป็น 0: {names} (แก้ไข หรือระบุว่าไม่คำนวณค่าจ้างงวดนี้)", {
                n: zeroSlips.length,
                names: `${zeroSlips
                  .slice(0, 5)
                  .map((s) => s.displayName)
                  .join(", ")}${zeroSlips.length > 5 ? " ..." : ""}`,
              })}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          {isDraft && run.totals.warningCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={t("มี {n} สลิปที่มีคำเตือน (เช่น ไม่มีฐานค่าจ้าง, OT คิดเงินไม่ได้) — ตรวจก่อนส่งอนุมัติ", {
                n: run.totals.warningCount,
              })}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Tabs
            activeKey={tab}
            onChange={(key) => {
              setTab(key);
              // เปิดแท็บการจ่ายเงินทีไร โหลดข้อมูลล่าสุดใหม่ (บัญชีพนักงานอาจถูกแก้จากอีกแท็บ)
              if (key === "payments") void query.refetch();
            }}
            items={[
              {
                key: "slips",
                label: t("สลิปเงินเดือน"),
                children: (
                  <>
              <PayrollIncompleteAlert employees={run.incompleteEmployees ?? []} />
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
                  </>
                ),
              },
              {
                key: "payments",
                label: (
                  <span>
                    {t("การจ่ายเงิน")}{" "}
                    {run.paymentSummary.count > 0 ? (
                      <Badge
                        count={`${run.paymentSummary.successCount}/${run.paymentSummary.count}`}
                        color={run.paymentSummary.successCount === run.paymentSummary.count ? "green" : "blue"}
                      />
                    ) : null}
                  </span>
                ),
                children: <PayrollPaymentsTab run={run} canPay={canPay} canExport={canExport} />,
              },
              {
                key: "history",
                label: t("ประวัติ"),
                children: <PayrollHistoryTab events={run.events} exportBatches={run.exportBatches} />,
              },
            ]}
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
          <PayrollChecksModal open={checksOpen} runId={run.id} onClose={() => setChecksOpen(false)} />
          <ReasonModal
            open={reasonDialog === "sendBack"}
            title={t("ส่งกลับแก้ไข")}
            okText={t("ยืนยันส่งกลับแก้ไข")}
            placeholder={t("เหตุผลที่ส่งกลับแก้ไข (บังคับ)")}
            loading={sendBack.isPending}
            onOk={(reason) => sendBack.mutateAsync({ id: run.id, reason })}
            onClose={() => setReasonDialog(null)}
          />
          <ReasonModal
            open={reasonDialog === "returnToDraft"}
            title={t("ถอนอนุมัติกลับเป็นร่าง")}
            okText={t("ยืนยันถอนกลับเป็นร่าง")}
            placeholder={t("เหตุผลที่ถอนกลับเป็นร่าง (บังคับ)")}
            notice={
              <Alert
                type="warning"
                showIcon
                title={t("รายการจ่ายที่สร้างไว้จะถูกลบ และต้องส่งอนุมัติใหม่ — ทำได้เฉพาะเมื่อยังไม่มีรายการจ่ายสำเร็จ/บางส่วน")}
              />
            }
            loading={returnToDraft.isPending}
            onOk={(reason) => returnToDraft.mutateAsync({ id: run.id, reason })}
            onClose={() => setReasonDialog(null)}
          />
          <ReasonModal
            open={reasonDialog === "cancel"}
            title={t("ยกเลิกงวดเงินเดือน")}
            okText={t("ยืนยันยกเลิกงวด")}
            danger
            placeholder={t("เหตุผลที่ยกเลิก (บังคับ)")}
            notice={
              <Alert
                type="warning"
                showIcon
                title={t("ผลกระทบของการยกเลิก")}
                description={
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>{t("สลิปของงวดนี้ ({n} ใบ) ใช้ไม่ได้ และไม่นับในรายงาน", { n: run.totals.slipCount })}</li>
                    <li>{t("ข้อมูลของงวดนี้จะไม่ถูกนำไปออก 50 ทวิ")}</li>
                    <li>{t("รายการจ่ายที่สร้างไว้ (ถ้ามี) จะถูกลบ — ยกเลิกไม่ได้เมื่อมีรายการจ่ายแล้ว")}</li>
                    <li>{t("งวดที่ยกเลิกแล้วไม่บล็อกการสร้างงวดใหม่ในช่วงวันเดียวกัน")}</li>
                  </ul>
                }
              />
            }
            loading={cancel.isPending}
            onOk={(reason) => cancel.mutateAsync({ id: run.id, reason })}
            onClose={() => setReasonDialog(null)}
          />
        </>
      ) : null}
    </Modal>
  );
}
