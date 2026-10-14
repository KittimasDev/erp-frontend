"use client";

import { useState } from "react";
import { Alert, App, Button, Descriptions, Drawer, Input, Modal, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, EditOutlined, ReloadOutlined } from "@ant-design/icons";

import {
  useCancelPayrollMutation,
  useFinalizePayrollMutation,
  usePayrollRunQuery,
  useRecalculatePayrollMutation,
} from "@/hooks/payroll/usePayroll";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { PAYROLL_STATUS_LABEL, type PayrollSlip } from "@/types/payroll";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { toPayrollSheet } from "@/utils/payrollSheet";

import PayrollAdjustmentsModal from "./PayrollAdjustmentsModal";
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

  const run = query.data?.data;
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

  const columns: ColumnsType<PayrollSlip> = [
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
      width: 100,
      fixed: "right",
      render: (_v, s) =>
        isDraft ? (
          <Button size="small" icon={<EditOutlined />} onClick={() => setAdjusting(s)}>
            ปรับ{s.adjustments.length ? ` (${s.adjustments.length})` : ""}
          </Button>
        ) : null,
    },
  ];

  return (
    <Drawer
      open={Boolean(runId)}
      onClose={onClose}
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
                <Button type="primary" loading={finalize.isPending}>
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
            <Descriptions.Item label="ยอดสุทธิรวม">
              <strong>{money(run.totals.netPay)}</strong>
            </Descriptions.Item>
          </Descriptions>
          {run.status === "CANCELLED" && run.cancelReason ? (
            <Alert type="info" showIcon title={`เหตุผลที่ยกเลิก: ${run.cancelReason}`} style={{ marginBottom: 12 }} />
          ) : null}
          {run.totals.warningCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={`มี ${run.totals.warningCount} สลิปที่มีคำเตือน (เช่น ไม่มีฐานค่าจ้าง, OT คิดเงินไม่ได้) — ตรวจก่อนปิดงวด`}
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={run.slips}
            pagination={{ pageSize: 50, showTotal: (t) => `ทั้งหมด ${t} คน` }}
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
