"use client";

import { useState } from "react";
import { Alert, App, Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Popconfirm, Radio, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import {
  useBulkRecordPayrollPaymentsMutation,
  useExportPayrollPaymentsMutation,
  useRecordPayrollPaymentsMutation,
} from "@/hooks/payroll/usePayroll";
import { bankMissingFromError } from "@/lib/api/payroll";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { PayrollPayment, PayrollPaymentMethod, PayrollRunDetail } from "@/types/payroll";
import { downloadTabularReport } from "@/utils/downloadTabularReport";
import { toPaymentSheet } from "@/utils/payrollSheet";

import { userSetupHref } from "./PayrollPayBaseIssuesModal";

const METHOD_OPTIONS: Array<{ value: PayrollPaymentMethod; label: string }> = [
  { value: "BANK_TRANSFER", label: "โอนผ่านธนาคาร" },
  { value: "CASH", label: "เงินสด" },
  { value: "CHEQUE", label: "เช็ค" },
  { value: "OTHER", label: "อื่น ๆ" },
];

type Props = {
  run: PayrollRunDetail;
  canPay: boolean;
  canExport: boolean;
};

type MissingBank = Array<{ userId: string; employeeCode?: string | null; displayName: string }>;

/**
 * แท็บ "การจ่ายเงิน": ส่งออกรายการจ่าย → จ่ายนอกระบบ → บันทึกผลรายคน
 * บันทึกทีเดียวได้ทั้งงวด/ที่เลือก (วันที่/วิธี/เลขอ้างอิงตั้งครั้งเดียว) · จ่ายบางส่วน/ไม่สำเร็จกรอกรายคน
 */
export default function PayrollPaymentsTab({ run, canPay, canExport }: Props) {
  const t = useT();
  const language = useLanguage();
  const { message, modal } = App.useApp();
  const money = (v: number) => formatMoney(v, language);
  const exportMutation = useExportPayrollPaymentsMutation();
  const recordMutation = useRecordPayrollPaymentsMutation();
  const bulkMutation = useBulkRecordPayrollPaymentsMutation();
  const [selected, setSelected] = useState<string[]>([]);
  const [paidDate, setPaidDate] = useState<Dayjs>(dayjs());
  const [method, setMethod] = useState<PayrollPaymentMethod>("BANK_TRANSFER");
  const [referenceNo, setReferenceNo] = useState("");
  const [editing, setEditing] = useState<PayrollPayment | null>(null);
  const [missingBank, setMissingBank] = useState<MissingBank>([]);
  const [form] = Form.useForm<{ result: "SUCCESS" | "FAILED"; amount?: number; note?: string }>();
  // ผู้ใช้ที่เห็นหน้า payroll อาจไม่มีสิทธิ์หน้า /users — ปิดลิงก์ไปตั้งค่าพนักงาน
  const canSetup = isAdministrator() || canAccessScreen("USERS");

  const open = run.status === "PENDING_PAYMENT";
  const summary = run.paymentSummary;
  const payments = run.payments;
  const remaining = payments.filter((p) => p.status !== "SUCCESS");

  const common = () => ({
    paidDate: paidDate.format("YYYY-MM-DD"),
    method,
    referenceNo: referenceNo.trim() || undefined,
  });

  const exportAs = async (format: "csv" | "xlsx") => {
    try {
      const res = await exportMutation.mutateAsync(run.id);
      await downloadTabularReport(format, toPaymentSheet(res.data));
    } catch (error) {
      const missing = bankMissingFromError(error);
      if (missing) setMissingBank(missing);
      else if (!(error instanceof Error)) message.error(t("ส่งออกรายการจ่ายไม่สำเร็จ"));
    }
  };

  const bulk = async (status: "SUCCESS" | "FAILED", userIds?: string[]) => {
    try {
      await bulkMutation.mutateAsync({ id: run.id, body: { userIds, status, ...common() } });
      setSelected([]);
    } catch {
      /* useRunMutation แสดงข้อความผิดพลาดแล้ว */
    }
  };

  const saveOne = async () => {
    if (!editing) return;
    const v = await form.validateFields();
    try {
      await recordMutation.mutateAsync({
        id: run.id,
        items: [
          {
            userId: editing.userId,
            status: v.result,
            amountPaid: v.result === "SUCCESS" ? v.amount : undefined,
            note: v.note?.trim() || undefined,
            ...common(),
          },
        ],
      });
      setEditing(null);
    } catch {
      /* แสดงข้อความแล้ว */
    }
  };

  const statusTag = (p: PayrollPayment) => {
    if (p.status === "SUCCESS") return <Tag color="green">{t("จ่ายสำเร็จ")}</Tag>;
    if (p.status === "FAILED") return <Tag color="red">{t("จ่ายไม่สำเร็จ")}</Tag>;
    if (p.amountPaid > 0) return <Tag color="blue">{t("จ่ายบางส่วน")}</Tag>;
    return <Tag>{t("รอจ่าย")}</Tag>;
  };

  const columns: ColumnsType<PayrollPayment> = [
    {
      title: t("พนักงาน"),
      key: "user",
      render: (_v, p) => (
        <div>
          <strong>{p.displayName}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{p.employeeCode ?? "—"}</div>
        </div>
      ),
    },
    {
      title: t("บัญชีธนาคาร"),
      key: "bank",
      render: (_v, p) =>
        p.bankName && p.bankAccountNo ? (
          <div>
            {p.bankName}
            <div style={{ fontSize: 12, color: "#8a94a6" }}>{p.bankAccountNo}</div>
          </div>
        ) : (
          <Tag color="orange">{t("ยังไม่มีข้อมูลธนาคาร")}</Tag>
        ),
    },
    { title: t("ยอดที่ต้องจ่าย"), key: "due", align: "right", render: (_v, p) => money(p.amountDue) },
    { title: t("จ่ายแล้ว"), key: "paid", align: "right", render: (_v, p) => money(p.amountPaid) },
    { title: t("สถานะ"), key: "status", render: (_v, p) => statusTag(p) },
    {
      title: t("วันที่จ่าย / วิธี / อ้างอิง"),
      key: "detail",
      render: (_v, p) =>
        p.paidDate || p.referenceNo || p.method ? (
          <div style={{ fontSize: 12 }}>
            {[p.paidDate ? formatDate(p.paidDate, language) : null, p.method ? t(METHOD_OPTIONS.find((m) => m.value === p.method)?.label ?? p.method) : null, p.referenceNo]
              .filter(Boolean)
              .join(" · ")}
            {p.recordedByName ? <div style={{ color: "#8a94a6" }}>{t("บันทึกโดย")} {p.recordedByName}</div> : null}
            {p.note ? <div style={{ color: "#8a94a6" }}>{p.note}</div> : null}
          </div>
        ) : (
          "—"
        ),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      render: (_v, p) =>
        open && canPay && p.status !== "SUCCESS" ? (
          <Button
            size="small"
            onClick={() => {
              setEditing(p);
              form.setFieldsValue({
                result: "SUCCESS",
                amount: Number((p.amountDue).toFixed(2)),
                note: undefined,
              });
            }}
          >
            {t("บันทึกผล")}
          </Button>
        ) : null,
    },
  ];

  if (payments.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          run.status === "FINALIZED" || run.status === "PAID"
            ? t("งวดนี้ไม่มีรายการจ่าย (งวดที่ปิดก่อนมีขั้นตอนบันทึกการจ่ายเงิน)")
            : t("รายการจ่ายจะถูกสร้างเมื่ออนุมัติงวด")
        }
      />
    );
  }

  return (
    <div>
      <Space wrap size={[16, 8]} style={{ marginBottom: 12 }}>
        <span>
          {t("ต้องจ่ายรวม")} <strong>{money(summary.dueTotal)}</strong>
        </span>
        <span>
          {t("จ่ายแล้วรวม")} <strong>{money(summary.paidTotal)}</strong>
        </span>
        <Tag color="green">{t("สำเร็จ")} {summary.successCount}</Tag>
        <Tag color="blue">{t("บางส่วน")} {summary.partialCount}</Tag>
        <Tag>{t("รอจ่าย")} {summary.pendingCount}</Tag>
        <Tag color="red">{t("ไม่สำเร็จ")} {summary.failedCount}</Tag>
      </Space>

      {open ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={t("ส่งออกรายการจ่ายให้ฝ่ายการเงินโอน แล้วกลับมาบันทึกผลที่นี่ — การส่งออกไม่เปลี่ยนสถานะเป็นจ่ายแล้ว งวดจะเป็น \"จ่ายเงินแล้ว\" เมื่อทุกรายการจ่ายสำเร็จครบ")}
        />
      ) : null}

      {open ? (
        <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
          {canExport ? (
            <>
              <Button icon={<DownloadOutlined />} loading={exportMutation.isPending} onClick={() => void exportAs("xlsx")}>
                {t("ส่งออกรายการจ่าย (Excel)")}
              </Button>
              <Button icon={<DownloadOutlined />} loading={exportMutation.isPending} onClick={() => void exportAs("csv")}>
                {t("ส่งออกรายการจ่าย (CSV)")}
              </Button>
            </>
          ) : null}
        </Space>
      ) : null}

      {open && canPay ? (
        <div style={{ border: "1px solid #e5e8ef", borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Typography.Text strong>{t("บันทึกผลจ่ายทีเดียว")}</Typography.Text>
          <Space wrap size={[12, 8]} style={{ display: "flex", marginTop: 8 }}>
            <DatePicker value={paidDate} onChange={(d) => d && setPaidDate(d)} format="DD/MM/YYYY" allowClear={false} aria-label={t("วันที่จ่าย")} />
            <Select
              style={{ width: 160 }}
              value={method}
              onChange={setMethod}
              options={METHOD_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
              aria-label={t("วิธีจ่าย")}
            />
            <Input
              style={{ width: 200 }}
              maxLength={100}
              placeholder={t("เลขอ้างอิงธุรกรรม (ถ้ามี)")}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </Space>
          <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
            <Popconfirm
              title={t("บันทึกว่าจ่ายสำเร็จทุกคนที่ยังเหลือ {n} คน?", { n: remaining.length })}
              description={t("วันที่/วิธี/เลขอ้างอิงตามที่กรอกด้านบน")}
              okText={t("ยืนยัน")}
              cancelText={t("ปิดหน้าต่าง")}
              disabled={remaining.length === 0}
              onConfirm={() => void bulk("SUCCESS")}
            >
              <Button type="primary" loading={bulkMutation.isPending} disabled={remaining.length === 0}>
                {t("จ่ายสำเร็จทุกคนที่เหลือ ({n})", { n: remaining.length })}
              </Button>
            </Popconfirm>
            <Button disabled={selected.length === 0} loading={bulkMutation.isPending} onClick={() => void bulk("SUCCESS", selected)}>
              {t("จ่ายสำเร็จที่เลือก ({n})", { n: selected.length })}
            </Button>
            <Button
              danger
              disabled={selected.length === 0}
              loading={bulkMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: t("บันทึกว่าจ่ายไม่สำเร็จ {n} คน?", { n: selected.length }),
                  okText: t("ยืนยัน"),
                  cancelText: t("ปิดหน้าต่าง"),
                  onOk: () => bulk("FAILED", selected),
                })
              }
            >
              {t("จ่ายไม่สำเร็จที่เลือก ({n})", { n: selected.length })}
            </Button>
            <Tooltip title={t("จ่ายบางส่วนหรือกรอกรายคน กดปุ่ม บันทึกผล ที่แถวของพนักงาน")}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("จ่ายบางส่วน → กรอกรายคน")}
              </Typography.Text>
            </Tooltip>
          </Space>
        </div>
      ) : null}

      <Table
        rowKey="userId"
        size="small"
        columns={columns}
        dataSource={payments}
        pagination={{ pageSize: 50, showTotal: (total) => t("ทั้งหมด {n} คน", { n: total }) }}
        rowSelection={
          open && canPay
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys as string[]),
                getCheckboxProps: (p) => ({ disabled: p.status === "SUCCESS" }),
              }
            : undefined
        }
      />

      <Modal
        open={Boolean(editing)}
        title={editing ? t("บันทึกผลจ่าย — {name}", { name: editing.displayName }) : ""}
        okText={t("บันทึก")}
        cancelText={t("ปิดหน้าต่าง")}
        confirmLoading={recordMutation.isPending}
        onCancel={() => setEditing(null)}
        onOk={() => void saveOne()}
        destroyOnHidden
      >
        {editing ? (
          <Form form={form} layout="vertical" preserve={false}>
            <Typography.Paragraph type="secondary">
              {t("ยอดที่ต้องจ่าย")} {money(editing.amountDue)} · {t("จ่ายแล้ว")} {money(editing.amountPaid)} · {t("วันที่/วิธี/เลขอ้างอิง ใช้ตามที่กรอกในกล่องบันทึกทีเดียว")}
            </Typography.Paragraph>
            <Form.Item name="result" label={t("ผลการจ่าย")}>
              <Radio.Group>
                <Radio value="SUCCESS">{t("จ่ายสำเร็จ")}</Radio>
                <Radio value="FAILED">{t("จ่ายไม่สำเร็จ")}</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(a, b) => a.result !== b.result}>
              {({ getFieldValue }) =>
                getFieldValue("result") === "SUCCESS" ? (
                  <Form.Item
                    name="amount"
                    label={t("ยอดที่จ่ายรวมจริง (น้อยกว่ายอดที่ต้องจ่าย = จ่ายบางส่วน)")}
                    rules={[
                      { required: true, message: t("ใส่ยอดที่จ่าย") },
                      {
                        validator: (_r, value?: number) =>
                          value != null && value > editing.amountDue
                            ? Promise.reject(new Error(t("ยอดจ่ายเกินยอดที่ต้องจ่าย")))
                            : value != null && value <= editing.amountPaid
                              ? Promise.reject(new Error(t("ต้องมากกว่ายอดที่จ่ายไปแล้ว")))
                              : Promise.resolve(),
                      },
                    ]}
                  >
                    <InputNumber min={0.01} precision={2} style={{ width: "100%" }} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
            <Form.Item name="note" label={t("หมายเหตุ")}>
              <Input.TextArea rows={2} maxLength={1000} />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={missingBank.length > 0}
        title={t("ส่งออกไม่ได้ — ยังไม่มีข้อมูลบัญชีธนาคาร")}
        footer={<Button onClick={() => setMissingBank([])}>{t("ปิดหน้าต่าง")}</Button>}
        onCancel={() => setMissingBank([])}
      >
        <Typography.Paragraph>{t("พนักงานต่อไปนี้ยังไม่มีธนาคาร/เลขบัญชี ตั้งค่าในข้อมูลพนักงานแล้วส่งออกใหม่")}</Typography.Paragraph>
        <ul style={{ maxHeight: 280, overflowY: "auto" }}>
          {missingBank.map((m) => (
            <li key={m.userId}>
              {m.displayName}
              {m.employeeCode ? ` (${m.employeeCode})` : ""}{" "}
              {canSetup ? (
                <a href={userSetupHref(m.userId)} target="_blank" rel="noreferrer">
                  {t("ตั้งค่าข้อมูลพนักงาน")}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
