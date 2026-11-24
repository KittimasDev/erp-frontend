"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { App, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import styles from "@/components/finance/shared/finance-list-page.module.css";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useArRefundsQuery,
  useCancelArRefundMutation,
  useCreateArRefundMutation,
  useCreditLedgerQuery,
  useCustomerCreditQuery,
} from "@/hooks/ar-receipts/useArReceipts";
import { useCompanyBankAccountsQuery } from "@/hooks/company-profile/useCompanyBankAccountsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useT } from "@/lib/i18n/useT";
import {
  AR_PAYMENT_METHOD_LABEL,
  AR_RECEIPT_STATUS_COLOR,
  AR_RECEIPT_STATUS_LABEL,
  CREDIT_ENTRY_LABEL,
  type ArRefund,
  type CreditLedgerRow,
} from "@/types/ar-receipts";

const SCREEN_CODE = "FINANCE_REFUNDS";
const PAGE_SIZE = 20;

/**
 * คืนเงินลูกค้า — เลือกลูกค้าเพื่อดูเครดิตคงเหลือ (เงินรับเกิน/มัดจำ) และสมุดเครดิต
 * คืนเงินได้ไม่เกินเครดิตคงเหลือ · ยกเลิกใบคืนเงินต้องระบุเหตุผล
 */
export default function ArRefundsPage() {
  const t = useT();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const { message } = App.useApp();
  const customers = useCustomersQuery({ isActive: true });
  const searchParams = useSearchParams();
  const [customerId, setCustomerId] = useState<string | undefined>(
    () => searchParams.get("customerId") ?? undefined,
  );
  const [page, setPage] = useState(1);
  const refunds = useArRefundsQuery({ page, limit: PAGE_SIZE, customerId });
  const credit = useCustomerCreditQuery(customerId);
  const ledger = useCreditLedgerQuery(customerId);
  const createMutation = useCreateArRefundMutation();
  const cancelMutation = useCancelArRefundMutation();
  const [form] = Form.useForm<{ refundDate: dayjs.Dayjs; paymentMethod: string; amount: number; transactionRef?: string; companyBankAccountId?: string; remark?: string }>();
  const banks = useCompanyBankAccountsQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ArRefund | null>(null);
  const [reason, setReason] = useState("");

  if (!perms.canView) return <AccessDenied screenCodes={[SCREEN_CODE]} />;

  const balance = Number(credit.data?.balance ?? 0);

  const refundColumns: ColumnsType<ArRefund> = [
    { title: t("ลำดับ"), key: "seq", width: 72, align: "center" as const, render: (_v: unknown, _r: unknown, index: number) => (page - 1) * PAGE_SIZE + index + 1 },
    { title: t("เลขที่"), dataIndex: "refundNo", width: 150, render: (v: string) => <strong>{v}</strong> },
    { title: t("วันที่"), dataIndex: "refundDate", width: 110, render: (v: string) => formatThaiDate(v) },
    { title: t("ลูกค้า"), dataIndex: "customerName", render: (v?: string) => v ?? "—" },
    { title: t("วิธีคืนเงิน"), dataIndex: "paymentMethod", width: 110, render: (v: string) => t(AR_PAYMENT_METHOD_LABEL[v] ?? v) },
    { title: t("เลขอ้างอิง"), dataIndex: "transactionRef", render: (v?: string | null) => v ?? "—" },
    { title: t("จำนวนเงิน"), dataIndex: "amount", align: "right", render: (v: string) => money.format(Number(v)) },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 110,
      render: (v: string, r) => (
        <span title={r.cancelReason ?? undefined}>
          <Tag color={AR_RECEIPT_STATUS_COLOR[v] ?? "default"}>{t(AR_RECEIPT_STATUS_LABEL[v] ?? v)}</Tag>
        </span>
      ),
    },
    {
      title: "",
      key: "action",
      width: 160,
      render: (_v, r) => (
        <span style={{ display: "flex", gap: 6 }}>
          <Button
            size="small"
            onClick={() =>
              void import("@/utils/generateArDocumentsPdf")
                .then((m) => m.generateArRefundPdf(r))
                .catch((e: unknown) => message.error(e instanceof Error ? e.message : t("พิมพ์ไม่สำเร็จ")))
            }
          >
            {t("พิมพ์")}
          </Button>
          {r.status === "POSTED" && perms.canDelete ? (
            <Button size="small" danger onClick={() => setCancelTarget(r)}>
              {t("ยกเลิก")}
            </Button>
          ) : null}
        </span>
      ),
    },
  ];

  const ledgerColumns: ColumnsType<CreditLedgerRow> = [
    { title: t("วันที่"), dataIndex: "createdAt", width: 120, render: (v: string) => dayjs(v).format("DD/MM/BBBB HH:mm") },
    { title: t("รายการ"), dataIndex: "entryType", render: (v: string) => t(CREDIT_ENTRY_LABEL[v] ?? v) },
    { title: t("เอกสารอ้างอิง"), dataIndex: "refNo", render: (v?: string | null) => v ?? "—" },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "amount",
      align: "right",
      render: (v: string) => (
        <span style={{ color: Number(v) < 0 ? "#cf1322" : "#389e0d" }}>{money.format(Number(v))}</span>
      ),
    },
  ];

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={t("คืนเงินลูกค้า")}
        subtitle={t("คืนเงินจากเครดิตลูกค้า (เงินรับเกิน/เงินมัดจำ) ได้ไม่เกินเครดิตคงเหลือ")}
        actions={
          perms.canAdd ? (
            <Button type="primary" disabled={!customerId || balance <= 0} onClick={() => { form.setFieldsValue({ refundDate: dayjs(), paymentMethod: "TRANSFER", amount: balance }); setCreateOpen(true); }}>
              {t("คืนเงินลูกค้า")}
            </Button>
          ) : null
        }
      />

      <div className={masterStyles.tableCard}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <Select
            showSearch
            allowClear
            style={{ minWidth: 320 }}
            placeholder={t("เลือกลูกค้าเพื่อดูเครดิตคงเหลือ")}
            loading={customers.isLoading}
            value={customerId}
            optionFilterProp="label"
            options={(customers.data?.data ?? []).map((c) => ({ value: c.id, label: `${c.customerCode} — ${c.nameTh}` }))}
            onChange={(v) => { setCustomerId(v); setPage(1); }}
          />
          {customerId ? (
            <Typography.Text>
              {t("เครดิตคงเหลือ")}: <strong>{money.format(balance)}</strong>
            </Typography.Text>
          ) : null}
        </div>
        {customerId ? (
          <Table
            style={{ marginBottom: 16 }}
            size="small"
            rowKey="id"
            loading={ledger.isLoading}
            columns={ledgerColumns}
            dataSource={ledger.data ?? []}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            locale={{ emptyText: t("ลูกค้ารายนี้ยังไม่มีรายการเครดิต") }}
          />
        ) : null}
        <Table
          className={masterStyles.dataTable}
          size="middle"
          bordered={false}
          rowKey="id"
          loading={refunds.isLoading}
          columns={refundColumns}
          dataSource={refunds.data?.items ?? []}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: refunds.data?.total ?? 0,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }),
          }}
          scroll={{ x: 900 }}
          locale={{ emptyText: t("ยังไม่มีใบคืนเงิน") }}
        />
      </div>

      <Modal
        open={createOpen}
        title={t("คืนเงินลูกค้า")}
        okText={t("บันทึกคืนเงิน")}
        cancelText={t("ยกเลิก")}
        confirmLoading={createMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
      >
        <p style={{ marginTop: 0, color: "#8a9199" }}>
          {t("เครดิตคงเหลือ {amount}", { amount: money.format(balance) })}
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            if (!customerId) return;
            try {
              await createMutation.mutateAsync({
                customerId,
                refundDate: v.refundDate.format("YYYY-MM-DD"),
                paymentMethod: v.paymentMethod,
                amount: v.amount,
                transactionRef: v.transactionRef?.trim() || undefined,
                companyBankAccountId: v.paymentMethod === "CASH" ? undefined : v.companyBankAccountId,
                remark: v.remark?.trim() || undefined,
              });
              setCreateOpen(false);
            } catch {
              // hook แจ้ง error แล้ว
            }
          }}
        >
          <Form.Item name="refundDate" label={t("วันที่คืนเงิน")} rules={[{ required: true, message: t("ระบุวันที่") }]}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="paymentMethod" label={t("วิธีคืนเงิน")} rules={[{ required: true }]}>
            <Select options={Object.entries(AR_PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label: t(label) }))} />
          </Form.Item>
          <Form.Item
            name="amount"
            label={t("จำนวนเงินที่คืน")}
            rules={[
              { required: true, message: t("ระบุจำนวนเงิน") },
              { type: "number", min: 0.01, max: balance, message: t("ต้องมากกว่า 0 และไม่เกินเครดิตคงเหลือ") },
            ]}
          >
            <InputNumber precision={2} min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="companyBankAccountId" label={t("บัญชีธนาคารที่จ่ายคืน")}>
            <Select
              allowClear
              placeholder={t("เลือกบัญชีธนาคารของบริษัท")}
              loading={banks.isLoading}
              options={(banks.data ?? [])
                .filter((b) => b.isActive)
                .map((b) => ({ value: b.id, label: `${b.bankName} ${b.accountNumber} (${b.accountName})` }))}
            />
          </Form.Item>
          <Form.Item name="transactionRef" label={t("เลขอ้างอิง")}>
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        title={t("ยกเลิกใบคืนเงิน {no}", { no: cancelTarget?.refundNo ?? "" })}
        okText={t("ยกเลิกใบคืนเงิน")}
        cancelText={t("ปิด")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        confirmLoading={cancelMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        afterOpenChange={(v) => { if (!v) setReason(""); }}
        onCancel={() => setCancelTarget(null)}
        onOk={async () => {
          if (!cancelTarget) return;
          try {
            await cancelMutation.mutateAsync({ id: cancelTarget.id, reason: reason.trim() });
            setCancelTarget(null);
          } catch {
            // hook แจ้ง error แล้ว
          }
        }}
      >
        <p style={{ marginTop: 0, color: "#8a9199" }}>{t("ยกเลิกแล้วเครดิตที่คืนไปจะกลับเข้าเครดิตลูกค้า")}</p>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          placeholder={t("เหตุผลที่ยกเลิก (บังคับ อย่างน้อย 5 ตัวอักษร)")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </section>
  );
}
