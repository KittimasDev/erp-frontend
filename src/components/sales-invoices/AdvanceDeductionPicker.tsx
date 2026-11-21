"use client";

import { Alert, InputNumber, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useAdvanceCandidatesQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useT } from "@/lib/i18n/useT";
import type {
  AdvanceCandidate,
  SalesInvoiceAdvanceDeductionInput,
} from "@/types/sales-invoices";

function roundMoney(value: string | number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Props = {
  salesOrderId?: string;
  value: SalesInvoiceAdvanceDeductionInput[];
  onChange: (value: SalesInvoiceAdvanceDeductionInput[]) => void;
};

export default function AdvanceDeductionPicker({ salesOrderId, value, onChange }: Props) {
  const t = useT();
  const query = useAdvanceCandidatesQuery(salesOrderId);
  const data = query.data?.data;
  const items = data?.items ?? [];
  const selected = new Map(value.map((row) => [row.advanceReceiptId, row.amount]));
  const sum = value.reduce((total, row) => total + (Number(row.amount) || 0), 0);
  const cap = Number(data?.maxDeductibleAmount ?? 0);

  if (!salesOrderId) return null;
  if (query.isLoading) return <Spin size="small" />;
  if (query.isError) {
    return <Alert type="warning" showIcon title={t("โหลดเงินล่วงหน้าไม่สำเร็จ")} />;
  }
  if (items.length === 0) {
    return (
      <p style={{ color: "#8a9199", marginBottom: 0 }}>
        {t("ไม่มีเงินล่วงหน้าคงเหลือของใบสั่งขายนี้")}
      </p>
    );
  }

  const columns: ColumnsType<AdvanceCandidate> = [
    { title: t("เลขที่"), dataIndex: "docNo" },
    {
      title: t("วันที่รับ"),
      dataIndex: "receiptDate",
      render: (v: string) => (v ? dayjs(v).format("DD/MM/BBBB") : "—"),
    },
    {
      title: t("คงเหลือ"),
      dataIndex: "remainingAmount",
      align: "right",
      render: (v: string, row) => (
        <span>
          {formatMoney(v)}
          <div style={{ color: "#8a9199", fontSize: 12 }}>
            {t("ก่อน VAT {base} / VAT {vat}", {
              base: formatMoney(row.remainingBaseAmount),
              vat: formatMoney(row.remainingVatAmount),
            })}
          </div>
        </span>
      ),
    },
    {
      title: t("ยอดหัก"),
      align: "right",
      width: 160,
      render: (_, row) => {
        const checked = selected.has(row.id);
        return (
          <InputNumber
            disabled={!checked}
            min={0.01}
            max={Number(row.remainingAmount)}
            step={0.01}
            precision={2}
            style={{ width: "100%" }}
            value={checked ? selected.get(row.id) : undefined}
            onChange={(next) => {
              const amount = typeof next === "number" ? roundMoney(next) : 0;
              onChange(
                value.map((line) =>
                  line.advanceReceiptId === row.id ? { ...line, amount } : line,
                ),
              );
            }}
          />
        );
      },
    },
  ];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8 }}>
        {t("เลือกเอกสารรับเงินล่วงหน้าของใบสั่งขายนี้ แล้วใส่ยอดหักรวม VAT ได้ไม่เกินยอดคงเหลือ")}
      </div>
      <div style={{ marginBottom: 8, color: "#8a9199" }}>
        {t("หักได้รวมไม่เกิน {amount}", { amount: formatMoney(data?.maxDeductibleAmount) })}
      </div>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={items}
        rowSelection={{
          selectedRowKeys: value.map((row) => row.advanceReceiptId),
          onChange: (keys) => {
            const next = new Set(keys.map(String));
            onChange(
              items
                .filter((row) => next.has(row.id))
                .map((row) => ({
                  advanceReceiptId: row.id,
                  amount: selected.get(row.id) ?? roundMoney(row.remainingAmount),
                })),
            );
          },
        }}
      />
      {value.length > 0 && sum > cap + 0.004 ? (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 8 }}
          title={t("ยอดหักรวมเกินเงินล่วงหน้าที่ยังใช้ได้")}
        />
      ) : null}
    </div>
  );
}
