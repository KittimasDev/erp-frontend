"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Checkbox, DatePicker, Input, InputNumber, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useCreateArReceiptMutation,
  useCustomerCreditQuery,
  useOutstandingArInvoicesQuery,
} from "@/hooks/ar-receipts/useArReceipts";
import { useCompanyBankAccountsQuery } from "@/hooks/company-profile/useCompanyBankAccountsQuery";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useSalesOrdersQuery } from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useT } from "@/lib/i18n/useT";
import { arReceiptRoutes, arRoutes } from "@/lib/sales/ar-routes";
import { AR_PAYMENT_METHOD_LABEL, type OutstandingArInvoice } from "@/types/ar-receipts";

const SCREEN_CODE = "FINANCE_PAYMENT_RECEIPTS";

type Line = { amount: number; wht: number };

const satang = (v: number) => Math.round((v || 0) * 100);

/**
 * บันทึกรับชำระ — เลือกลูกค้า → AR ที่ค้างชำระ → ใส่เงินสด/ภาษีที่ลูกค้าหักต่อ AR
 * เงินที่รับจริงมากกว่าที่ตัด = รับเกิน ต้องติ๊กยืนยันเก็บเป็นเครดิตลูกค้า
 */
export default function ArReceiptFormPage() {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const createMutation = useCreateArReceiptMutation();
  const customers = useCustomersQuery({ isActive: true });
  // เติมล่วงหน้าจากหน้ารายการรับเงิน (/finance/receivables/customers): ?customerId=&salesOrderId=&deposit=1 — ผู้ใช้แก้ได้ทั้งหมด
  const searchParams = useSearchParams();

  const [customerId, setCustomerId] = useState<string | undefined>(searchParams.get("customerId") ?? undefined);
  const [receiptDate, setReceiptDate] = useState(dayjs());
  const [method, setMethod] = useState("TRANSFER");
  const [ref, setRef] = useState("");
  const [bankId, setBankId] = useState<string | undefined>();
  const banks = useCompanyBankAccountsQuery();
  const [remark, setRemark] = useState("");
  const [received, setReceived] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [overpayOk, setOverpayOk] = useState(false);
  // เงินมัดจำ/รับล่วงหน้า — ไม่ตัด AR เก็บทั้งก้อนเป็นเครดิตลูกค้า (อ้าง SO ได้)
  const [isDeposit, setIsDeposit] = useState(searchParams.get("deposit") === "1");
  const [salesOrderId, setSalesOrderId] = useState<string | undefined>(
    searchParams.get("deposit") === "1" ? (searchParams.get("salesOrderId") ?? undefined) : undefined,
  );

  const salesOrders = useSalesOrdersQuery(isDeposit && customerId ? { customerId } : undefined);
  const outstanding = useOutstandingArInvoicesQuery(isDeposit ? undefined : customerId);
  const credit = useCustomerCreditQuery(customerId);
  const rows = useMemo(() => outstanding.data ?? [], [outstanding.data]);

  // ใบวางบิลของ AR ที่ค้างอยู่ — เลือกทั้งใบแล้วเติมทุก AR ในใบนั้นให้ (ตัดเต็มยอดค้าง)
  const [billingNoteNo, setBillingNoteNo] = useState<string | undefined>();
  const billingGroups = useMemo(() => {
    const map = new Map<string, OutstandingArInvoice[]>();
    for (const r of rows) {
      if (!r.billingNoteNo) continue;
      map.set(r.billingNoteNo, [...(map.get(r.billingNoteNo) ?? []), r]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const picked = isDeposit
    ? []
    : rows.filter((r) => {
        const l = lines[r.id];
        return l && (l.amount > 0 || l.wht > 0);
      });
  const cashTotal = picked.reduce((s, r) => s + satang(lines[r.id].amount), 0);
  const whtTotal = picked.reduce((s, r) => s + satang(lines[r.id].wht), 0);
  const receivedSatang = satang(received ?? 0);
  const rest = receivedSatang - cashTotal;
  const overLine = picked.find(
    (r) => satang(lines[r.id].amount) + satang(lines[r.id].wht) > satang(Number(r.outstandingAmount)),
  );

  const setLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { amount: 0, wht: 0 }), ...patch },
    }));

  // ตัดเต็มยอดค้างของ AR นี้ (เงินสด = ค้าง − WHT ที่ใส่ไว้)
  const fillFull = (r: OutstandingArInvoice) =>
    setLine(r.id, {
      amount: Math.max(0, (satang(Number(r.outstandingAmount)) - satang(lines[r.id]?.wht ?? 0)) / 100),
    });

  // เลือกทั้งใบวางบิล: ตัดเต็มยอดค้างของทุก AR ในใบนั้น (คง WHT ที่กรอกไว้แล้ว) + ตั้งเงินที่รับให้เท่ายอดเงินสดรวมถ้ายังไม่กรอก
  const pickBillingNote = (no: string) => {
    const group = billingGroups.find(([n]) => n === no)?.[1] ?? [];
    const next: Record<string, Line> = { ...lines };
    for (const r of group) {
      const wht = next[r.id]?.wht ?? 0;
      next[r.id] = {
        wht,
        amount: Math.max(0, (satang(Number(r.outstandingAmount)) - satang(wht)) / 100),
      };
    }
    setLines(next);
    if (received === null) {
      setReceived(
        group.reduce((sum, r) => sum + satang(next[r.id].amount), 0) / 100,
      );
    }
  };

  if (!perms.canAdd) return <AccessDenied screenCodes={[SCREEN_CODE]} />;

  const canSave =
    Boolean(customerId) &&
    (isDeposit || picked.length > 0) &&
    receivedSatang > 0 &&
    rest >= 0 &&
    !overLine &&
    (isDeposit || rest === 0 || overpayOk);

  const columns: ColumnsType<OutstandingArInvoice> = [
    {
      title: t("เลขที่ AR"),
      dataIndex: "invoiceNo",
      render: (v: string, r) => <Link href={arRoutes.detail(r.id)}>{v}</Link>,
    },
    { title: t("ใบสั่งขาย"), dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
    { title: t("วันครบกำหนด"), dataIndex: "dueDate", width: 120, render: (v?: string | null) => formatThaiDate(v) },
    {
      title: t("ยอดรวม"),
      dataIndex: "totalAmount",
      align: "right",
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: t("ค้างชำระ"),
      dataIndex: "outstandingAmount",
      align: "right",
      render: (v: string) => <strong>{money.format(Number(v))}</strong>,
    },
    {
      title: t("เงินสดที่ตัด"),
      key: "amount",
      width: 190,
      render: (_v, r) => (
        <div style={{ display: "flex", gap: 4 }}>
          <InputNumber
            min={0}
            precision={2}
            style={{ width: 120 }}
            value={lines[r.id]?.amount ?? 0}
            onChange={(v) => setLine(r.id, { amount: Number(v ?? 0) })}
          />
          <Button size="small" onClick={() => fillFull(r)}>
            {t("เต็มยอด")}
          </Button>
        </div>
      ),
    },
    {
      title: t("ภาษีที่ลูกค้าหัก (WHT)"),
      key: "wht",
      width: 150,
      render: (_v, r) => (
        <InputNumber
          min={0}
          precision={2}
          style={{ width: 130 }}
          value={lines[r.id]?.wht ?? 0}
          onChange={(v) => setLine(r.id, { wht: Number(v ?? 0) })}
        />
      ),
    },
    {
      title: t("ใบวางบิล"),
      dataIndex: "billingNoteNo",
      width: 140,
      render: (v?: string | null) => v ?? "—",
    },
  ];

  const submit = async () => {
    if (!customerId || !canSave) return;
    try {
      const res = await createMutation.mutateAsync({
        customerId,
        receiptDate: receiptDate.format("YYYY-MM-DD"),
        paymentMethod: method,
        transactionRef: ref.trim() || undefined,
        companyBankAccountId: method === "CASH" ? undefined : bankId,
        receivedAmount: receivedSatang / 100,
        allocations: picked.map((r) => ({
          salesInvoiceId: r.id,
          amount: lines[r.id].amount,
          whtAmount: lines[r.id].wht || undefined,
        })),
        overpayToCredit: !isDeposit && rest > 0 ? overpayOk : undefined,
        isDeposit: isDeposit || undefined,
        salesOrderId: isDeposit ? salesOrderId : undefined,
        remark: remark.trim() || undefined,
      });
      router.push(arReceiptRoutes.detail(res.data.id));
    } catch {
      // hook แจ้ง error แล้ว (เช่น AR ถูกรับชำระโดยคนอื่นไปแล้ว) — อยู่หน้าเดิม
    }
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={t("บันทึกรับชำระเงิน")}
        subtitle={t("รับเงินครั้งเดียวตัดได้หลายใบตั้งลูกหนี้ของลูกค้าเดียวกัน")}
        actions={<Button onClick={() => router.push(arReceiptRoutes.list)}>{t("กลับรายการ")}</Button>}
      />

      <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div>
          <label>{t("ลูกค้า")}</label>
          <Select
            showSearch
            style={{ width: "100%" }}
            placeholder={t("เลือกลูกค้า")}
            loading={customers.isLoading}
            value={customerId}
            optionFilterProp="label"
            options={(customers.data?.data ?? []).map((c) => ({ value: c.id, label: `${c.customerCode} — ${c.nameTh}` }))}
            onChange={(v) => {
              setCustomerId(v);
              setLines({});
              setOverpayOk(false);
            }}
          />
        </div>
        <div>
          <label>{t("วันที่รับชำระ")}</label>
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/BBBB"
            allowClear={false}
            value={receiptDate}
            onChange={(v) => v && setReceiptDate(v)}
          />
        </div>
        <div>
          <label>{t("วิธีรับชำระ")}</label>
          <Select
            style={{ width: "100%" }}
            value={method}
            onChange={setMethod}
            options={Object.entries(AR_PAYMENT_METHOD_LABEL).map(([value, label]) => ({ value, label: t(label) }))}
          />
        </div>
        {method !== "CASH" ? (
          <div>
            <label>{t("บัญชีธนาคารที่รับเงิน")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              placeholder={t("เลือกบัญชีธนาคารของบริษัท")}
              loading={banks.isLoading}
              value={bankId}
              onChange={setBankId}
              options={(banks.data ?? [])
                .filter((b) => b.isActive)
                .map((b) => ({ value: b.id, label: `${b.bankName} ${b.accountNumber} (${b.accountName})` }))}
            />
          </div>
        ) : null}
        <div>
          <label>{t("เลขอ้างอิง (สลิป/เลขที่เช็ค)")}</label>
          <Input value={ref} maxLength={255} onChange={(e) => setRef(e.target.value)} />
        </div>
        <div>
          <label>{t("เงินที่รับจริง (ไม่รวม WHT)")}</label>
          <InputNumber
            min={0}
            precision={2}
            style={{ width: "100%" }}
            value={received}
            onChange={(v) => setReceived(v === null ? null : Number(v))}
          />
        </div>
      </div>

      {customerId ? (
        <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12, display: "grid", gap: 8 }}>
          <Checkbox
            checked={isDeposit}
            onChange={(e) => {
              setIsDeposit(e.target.checked);
              setLines({});
              setOverpayOk(false);
            }}
          >
            {t("รับเป็นเงินมัดจำ/รับล่วงหน้า (ไม่ตัดใบตั้งลูกหนี้ — เก็บเป็นเครดิตลูกค้า)")}
          </Checkbox>
          {isDeposit ? (
            <Select
              allowClear
              showSearch
              style={{ maxWidth: 420 }}
              placeholder={t("ใบสั่งขายที่มัดจำ (ไม่บังคับ)")}
              loading={salesOrders.isLoading}
              value={salesOrderId}
              optionFilterProp="label"
              options={(salesOrders.data?.data ?? []).map((so) => ({ value: so.id, label: so.soNo }))}
              onChange={setSalesOrderId}
            />
          ) : null}
        </div>
      ) : null}

      {customerId && !isDeposit ? (
        <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{t("ใบตั้งลูกหนี้ที่ค้างชำระ")}</h3>
            <Typography.Text type="secondary">
              {t("เครดิตลูกค้าคงเหลือ {amount}", { amount: money.format(Number(credit.data?.balance ?? 0)) })}
            </Typography.Text>
          </div>
          {billingGroups.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <Typography.Text>{t("เลือกทั้งใบวางบิล")}:</Typography.Text>
              <Select
                allowClear
                showSearch
                style={{ minWidth: 300 }}
                placeholder={t("เลือกใบวางบิล")}
                value={billingNoteNo}
                onChange={setBillingNoteNo}
                optionFilterProp="label"
                options={billingGroups.map(([no, list]) => ({
                  value: no,
                  label: t("{no} ({n} AR · ค้าง {amount})", {
                    no,
                    n: list.length,
                    amount: money.format(list.reduce((sum, r) => sum + Number(r.outstandingAmount), 0)),
                  }),
                }))}
              />
              <Button
                disabled={!billingNoteNo}
                onClick={() => {
                  if (billingNoteNo) pickBillingNote(billingNoteNo);
                }}
              >
                {t("เติม AR ทั้งใบ (ตัดเต็มยอด)")}
              </Button>
            </div>
          ) : null}
          <Table
            rowKey="id"
            size="middle"
            loading={outstanding.isLoading}
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 1100 }}
            locale={{ emptyText: t("ลูกค้ารายนี้ไม่มีใบตั้งลูกหนี้ค้างชำระ") }}
          />
        </div>
      ) : null}

      <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <span>{t("เงินที่รับจริง")}: <strong>{money.format(receivedSatang / 100)}</strong></span>
          <span>{t("ตัด AR (เงินสด)")}: <strong>{money.format(cashTotal / 100)}</strong></span>
          <span>{t("ภาษีที่ลูกค้าหัก")}: <strong>{money.format(whtTotal / 100)}</strong></span>
          <span>{t("เงินเหลือ (รับเกิน)")}: <strong style={rest < 0 ? { color: "#cf1322" } : undefined}>{money.format(rest / 100)}</strong></span>
        </div>
        {overLine ? (
          <Alert type="error" showIcon message={t("{no}: เงินสด + WHT เกินยอดค้างชำระ", { no: overLine.invoiceNo })} />
        ) : null}
        {rest < 0 ? (
          <Alert type="error" showIcon message={t("เงินที่ตัด AR เกินเงินที่รับจริง")} />
        ) : null}
        {rest > 0 && !isDeposit ? (
          <Checkbox checked={overpayOk} onChange={(e) => setOverpayOk(e.target.checked)}>
            {t("เงินเหลือ {amount} เก็บเป็นเครดิตลูกค้า", { amount: money.format(rest / 100) })}
          </Checkbox>
        ) : null}
        <Input.TextArea
          rows={2}
          maxLength={5000}
          placeholder={t("หมายเหตุ (ถ้ามี)")}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        <div>
          <Button type="primary" disabled={!canSave} loading={createMutation.isPending} onClick={() => void submit()}>
            {t("บันทึกรับชำระ")}
          </Button>
        </div>
      </div>
    </section>
  );
}
