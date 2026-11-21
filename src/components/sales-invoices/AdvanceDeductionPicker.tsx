"use client";

import { useEffect, useRef } from "react";
import { Alert, Button, Descriptions, InputNumber, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useAdvanceCandidatesQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useT } from "@/lib/i18n/useT";
import {
  advanceDeductionErrors,
  splitAdvanceDeduction,
} from "@/utils/advance-deduction-validation";
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
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  salesOrderId?: string;
  /** DN ที่กำลังจะตั้งหนี้ — ใช้คำนวณยอดหักมัดจำแนะนำตามสัดส่วน */
  deliveryOrderIds?: string[];
  /** ใบร่างที่กำลังแก้ — ไม่นับยอดจองของใบนี้ในคงเหลือ/แนะนำ */
  excludeInvoiceId?: string;
  /** ยอดสินค้า+VAT โดยประมาณของ Invoice (ถ้ามี) เพื่อแสดงยอดสุทธิหลังหัก */
  invoiceGrossEstimate?: number;
  /** false = ไม่ auto-fill (ใช้ตอนแก้ Draft ที่มียอดหักอยู่แล้ว) */
  autoFillSuggested?: boolean;
  value: SalesInvoiceAdvanceDeductionInput[];
  onChange: (value: SalesInvoiceAdvanceDeductionInput[]) => void;
};

export default function AdvanceDeductionPicker({
  salesOrderId,
  deliveryOrderIds,
  excludeInvoiceId,
  invoiceGrossEstimate,
  autoFillSuggested = true,
  value,
  onChange,
}: Props) {
  const t = useT();
  const query = useAdvanceCandidatesQuery(
    salesOrderId,
    deliveryOrderIds,
    excludeInvoiceId,
  );
  const data = query.data?.data;
  const items = data?.items ?? [];
  const selected = new Map(value.map((row) => [row.advanceReceiptId, row.amount]));
  const sum = value.reduce((total, row) => total + (Number(row.amount) || 0), 0);
  const cap = Number(data?.maxDeductibleAmount ?? 0);
  const suggested = Number(data?.suggestedAmount ?? 0);
  const grossFromApi = Number(data?.currentInvoiceGrossAmount ?? 0);
  const gross =
    typeof invoiceGrossEstimate === "number" && Number.isFinite(invoiceGrossEstimate)
      ? invoiceGrossEstimate
      : grossFromApi > 0
        ? grossFromApi
        : null;
  const seededKey = useRef<string>("");

  // Auto-fill ยอดแนะนำเมื่อโหลดครั้งแรกของชุด Delivery นี้ (ยังไม่แตะมือ)
  useEffect(() => {
    if (!autoFillSuggested || !data || !salesOrderId) return;
    const key = `${salesOrderId}:${[...(deliveryOrderIds ?? [])].sort().join(",")}:${excludeInvoiceId ?? ""}`;
    if (seededKey.current === key) return;
    seededKey.current = key;
    const allocations = data.suggestedAllocations ?? [];
    if (allocations.length === 0) {
      onChange([]);
      return;
    }
    onChange(
      allocations.map((row) => ({
        advanceReceiptId: row.advanceReceiptId,
        amount: roundMoney(row.amount),
      })),
    );
  }, [
    autoFillSuggested,
    data,
    deliveryOrderIds,
    excludeInvoiceId,
    onChange,
    salesOrderId,
  ]);

  if (!salesOrderId) return null;
  if (query.isLoading) return <Spin size="small" />;
  if (query.isError) {
    return <Alert type="warning" showIcon title={t("โหลดเงินล่วงหน้าไม่สำเร็จ")} />;
  }
  if (items.length === 0 && !(Number(data?.depositTotalAmount ?? 0) > 0)) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>{t("หักเงินมัดจำ / เงินล่วงหน้า")}</div>
        <p style={{ color: "#8a9199", marginBottom: 0 }}>
          {t("ไม่มีเงินล่วงหน้าคงเหลือของใบสั่งขายนี้")} · {t("ยอดหัก")}:{" "}
          <strong>0.00</strong>
        </p>
      </div>
    );
  }

  const errors = advanceDeductionErrors(value, items, cap);
  const rowErrorIds = new Set(
    errors.flatMap((err) => (err.advanceReceiptId ? [err.advanceReceiptId] : [])),
  );

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
      render: (v: string, row) => {
        const typed = selected.get(row.id);
        const remainingLine = t("ก่อน VAT {base} / VAT {vat}", {
          base: formatMoney(row.remainingBaseAmount),
          vat: formatMoney(row.remainingVatAmount),
        });
        if (typeof typed === "number" && typed > 0) {
          // TASK 06: แสดงฐาน/VAT ของ "ยอดหักที่กรอก" (แยกแบบ EXCLUSIVE ด้วย vatRate ของใบรับเงิน)
          const { base, vat } = splitAdvanceDeduction(typed, row);
          return (
            <span>
              <div>
                {t("ยอดหักนี้ ก่อน VAT {base} / VAT {vat}", {
                  base: formatMoney(base),
                  vat: formatMoney(vat),
                })}
              </div>
              <div style={{ color: "#8a9199", fontSize: 12 }}>
                {t("คงเหลือรวม {amount}", { amount: formatMoney(v) })} · {remainingLine}
              </div>
            </span>
          );
        }
        return (
          <span>
            {formatMoney(v)}
            <div style={{ color: "#8a9199", fontSize: 12 }}>{remainingLine}</div>
          </span>
        );
      },
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
            step={0.01}
            precision={2}
            style={{ width: "100%" }}
            status={rowErrorIds.has(row.id) ? "error" : undefined}
            value={checked ? selected.get(row.id) : undefined}
            onChange={(next) => {
              // ไม่ clamp — เก็บตามที่กรอก (รวม 0 / ติดลบ / เกินคงเหลือ) แล้วให้ alert ด้านล่างแจ้ง
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

  const netEstimate =
    gross != null ? Math.max(0, roundMoney(gross - sum)) : null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>{t("หักเงินมัดจำ / เงินล่วงหน้า")}</div>
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 3 }}
        style={{ marginBottom: 12 }}
        items={[
          {
            key: "total",
            label: t("มัดจำที่ได้รับทั้งหมด"),
            children: formatMoney(data?.depositTotalAmount),
          },
          {
            key: "reserved",
            label: t("จองโดยใบร่าง"),
            children:
              data?.depositReservedAmount != null
                ? formatMoney(data.depositReservedAmount)
                : "—",
          },
          {
            key: "used",
            label: t("ใช้จริง (ยืนยันแล้ว)"),
            children: formatMoney(data?.depositUsedAmount ?? data?.depositAppliedAmount),
          },
          {
            key: "avail",
            label: t("ใช้ได้"),
            children: formatMoney(data?.depositAvailableAmount),
          },
          {
            key: "suggest",
            label: t("ยอดแนะนำให้หัก"),
            children: <strong>{formatMoney(data?.suggestedAmount ?? 0)}</strong>,
          },
          {
            key: "cum",
            label: t("แนะนำสะสมตามสัดส่วน"),
            children: formatMoney(data?.suggestedCumulativeAmount),
          },
          {
            key: "base",
            label: t("ฐานสินค้าที่เลือก / SO"),
            children: `${formatMoney(data?.currentBaseAmount)} / ${formatMoney(data?.soBaseAmount)}`,
          },
          {
            key: "prior",
            label: t("ฐานที่ออก Invoice ไปแล้ว"),
            children: formatMoney(data?.priorInvoicedBaseAmount),
          },
          {
            key: "gross",
            label: t("ยอด Invoice โดยประมาณ"),
            children: formatMoney(gross ?? 0),
          },
        ]}
      />
      {suggested > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
          title={
            autoFillSuggested
              ? t("ระบบเติมยอดหักตามสัดส่วนมูลค่า Delivery แล้ว — แก้ไขได้ก่อนบันทึก")
              : t("ยอดแนะนำตามสัดส่วน — กดใช้ยอดแนะนำหรือแก้เองได้")
          }
          description={
            <div>
              <div>
                {t(
                  "สูตร: มัดจำทั้งหมด × (มูลค่า Delivery สะสม ÷ มูลค่า SO) − ยอดที่หักไปแล้ว",
                )}
              </div>
              {!autoFillSuggested ? (
                <Button
                  size="small"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const allocations = data?.suggestedAllocations ?? [];
                    onChange(
                      allocations.map((row) => ({
                        advanceReceiptId: row.advanceReceiptId,
                        amount: roundMoney(row.amount),
                      })),
                    );
                  }}
                >
                  {t("ใช้ยอดแนะนำ {amount}", {
                    amount: formatMoney(data?.suggestedAmount),
                  })}
                </Button>
              ) : null}
            </div>
          }
        />
      ) : Number(data?.depositTotalAmount ?? 0) > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
          title={t("ยอดแนะนำให้หักเป็น 0")}
          description={t("ยังไม่มี Delivery ที่เลือก หรือหักครบตามสัดส่วนแล้ว")}
        />
      ) : null}
      <div style={{ marginBottom: 8, color: "#8a9199" }}>
        {t("หักได้รวมไม่เกิน {amount}", { amount: formatMoney(data?.maxDeductibleAmount) })}
      </div>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={items}
        locale={{ emptyText: t("ไม่มีเงินล่วงหน้าคงเหลือของใบสั่งขายนี้") }}
        rowSelection={{
          selectedRowKeys: value.map((row) => row.advanceReceiptId),
          onChange: (keys) => {
            const next = new Set(keys.map(String));
            onChange(
              items
                .filter((row) => next.has(row.id))
                .map((row) => ({
                  advanceReceiptId: row.id,
                  amount:
                    selected.get(row.id) ??
                    roundMoney(
                      data?.suggestedAllocations?.find(
                        (a) => a.advanceReceiptId === row.id,
                      )?.amount ?? row.remainingAmount,
                    ),
                })),
            );
          },
        }}
      />
      <div style={{ marginTop: 8 }}>
        {t("ยอดหักจริง")}: <strong>{formatMoney(sum)}</strong>
        {netEstimate != null ? (
          <>
            {" · "}
            {t("ยอดตั้งหนี้สุทธิโดยประมาณ")}: <strong>{formatMoney(netEstimate)}</strong>
          </>
        ) : null}
      </div>
      {errors.map((err) => {
        const docNo = err.advanceReceiptId
          ? items.find((row) => row.id === err.advanceReceiptId)?.docNo
          : undefined;
        return (
          <Alert
            key={`${err.advanceReceiptId ?? "sum"}:${err.message}`}
            type="error"
            showIcon
            style={{ marginTop: 8 }}
            title={docNo ? `${docNo}: ${t(err.message)}` : t(err.message)}
          />
        );
      })}
    </div>
  );
}
