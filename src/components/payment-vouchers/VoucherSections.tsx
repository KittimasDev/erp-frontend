"use client";

import Link from "next/link";
import { Card, Descriptions, Table, Tag, Timeline, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { VOUCHER_EVENT_LABEL, type VoucherApDocument, type VoucherPersonAction, type VoucherSourceInfo, type WhtLine } from "@/types/payment-vouchers";
import { useT } from "@/lib/i18n/useT";
import { tFin, fmtMoney, sourceHref, sourceLabel } from "./paymentVoucherUtils";

const dt = (v?: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—");

/** 2.2 เอกสารอ้างอิง — ใบวางบิลที่รวมหลาย AP/PO แสดงเลขที่ทั้งหมด */
export function ReferenceCard({
  info,
  sourceType,
  purchaseOrderId,
}: {
  info: VoucherSourceInfo;
  sourceType: string;
  purchaseOrderId?: string;
}) {
  const t = useT();
  const isBilling = sourceType === "BILLING_NOTE" || sourceType === "AP_INVOICE";
  return (
    <Card title={t("เอกสารอ้างอิง")} size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label={t("ประเภทเอกสารต้นทาง")}>{sourceLabel(sourceType)}</Descriptions.Item>
        <Descriptions.Item label={sourceType === "BILLING_NOTE" ? t("เลขที่ใบวางบิล") : sourceType === "AP_INVOICE" ? t("เลขที่ใบตั้งหนี้ (ต้นทาง)") : t("เลขที่เอกสารต้นทาง")}>
          {info.sources.length === 0
            ? "—"
            : info.sources.map((s, i) => {
                const href = sourceHref(s.documentType, s.documentId ?? "", purchaseOrderId);
                return (
                  <span key={s.documentNo}>
                    {i > 0 ? ", " : ""}
                    {href ? <Link href={href}>{s.documentNo}</Link> : s.documentNo}
                  </span>
                );
              })}
        </Descriptions.Item>
        {isBilling ? (
          <Descriptions.Item label={t("เลขที่ AP")} span="filled">
            {info.apDocuments.length === 0 ? "—" : info.apDocuments.map((a) => a.docNo).join(", ")}
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label={t("เลขที่ PO")}>
          {info.purchaseOrders.length === 0
            ? "—"
            : info.purchaseOrders.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={`/purchase-orders/${p.id}`}>{p.poNo}</Link>
                </span>
              ))}
        </Descriptions.Item>
        <Descriptions.Item label={t("เลขที่รายการจ่ายเงิน")}>
          {info.purchaseOrders.length === 0 ? "—" : info.purchaseOrders.map((p) => p.poNo).join(", ")}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

/** 2.3 ข้อมูลผู้ขาย (อ่านอย่างเดียว) */
export function SupplierCard({ supplier }: { supplier: VoucherSourceInfo["supplier"] }) {
  const t = useT();
  return (
    <Card title={t("ข้อมูลผู้ขาย")} size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
        <Descriptions.Item label={t("ชื่อ Supplier")}>{supplier.nameTh || "—"}</Descriptions.Item>
        <Descriptions.Item label={t("รหัส Supplier")}>{supplier.creditorCode ?? "—"}</Descriptions.Item>
        <Descriptions.Item label={t("เลขประจำตัวผู้เสียภาษี")}>{supplier.taxId ?? "—"}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

/** ตารางรายการ WHT แยกประเภทเงินได้ / ฐาน / อัตราจริง / ยอดหัก */
export function WhtLinesTable({
  lines,
  total,
}: {
  lines: Array<{ incomeType?: string; baseAmount: string; rate: string; whtAmount: string }>;
  total: number | string;
}) {
  const t = useT();
  return (
    <div style={{ overflowX: "auto", margin: "12px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {[t("ประเภทเงินได้"), t("ฐานภาษี"), t("อัตรา"), t("ยอดหัก")].map((h, i) => (
              <th
                key={h}
                style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 10px", borderBottom: "1px solid #e1e2dd", color: "#6b727a", fontWeight: 500 }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={`${l.incomeType ?? ""}-${l.rate}-${i}`}>
              <td style={{ padding: "6px 10px" }}>{l.incomeType || t("ไม่ระบุประเภท (ต้นทางไม่ได้ตั้งไว้)")}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmtMoney(l.baseAmount)}</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{Number(l.rate)}%</td>
              <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmtMoney(l.whtAmount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} style={{ padding: "6px 10px", fontWeight: 600, borderTop: "1px solid #e1e2dd" }}>
              {t("รวมภาษีหัก ณ ที่จ่าย")}
            </td>
            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, borderTop: "1px solid #e1e2dd" }}>
              {fmtMoney(total)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** 2.5 ข้อมูลภาษี */
export function TaxCard({
  vat,
  whtBase,
  whtRate,
  whtAmount,
  net,
  whtLines,
}: {
  vat: number | string;
  whtBase: number | string;
  whtRate: number | string;
  whtAmount: number | string;
  net: number | string;
  /** รายการแยกอัตรา — มีมากกว่า 1 บรรทัดจะแสดงตารางแทนอัตราเดียว */
  whtLines?: WhtLine[];
}) {
  const t = useT();
  const hasWht = Number(whtAmount) > 0;
  const multi = hasWht && new Set((whtLines ?? []).map((l) => Number(l.rate))).size > 1;
  return (
    <Card title={t("ข้อมูลภาษี (VAT / หัก ณ ที่จ่าย)")} size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
        <Descriptions.Item label="VAT">{fmtMoney(vat)}</Descriptions.Item>
        <Descriptions.Item label={t("ฐานภาษีหัก ณ ที่จ่าย")}>{hasWht ? fmtMoney(whtBase) : "—"}</Descriptions.Item>
        <Descriptions.Item label={t("อัตรา WHT")}>
          {!hasWht ? t("ไม่มี") : multi ? t("หลายอัตรา") : `${Number(whtRate)}%`}
        </Descriptions.Item>
        <Descriptions.Item label={t("ยอด WHT")}>{fmtMoney(whtAmount)}</Descriptions.Item>
        <Descriptions.Item label={t("ยอดสุทธิจ่าย")} span="filled">
          <Typography.Text strong>{fmtMoney(net)}</Typography.Text>
        </Descriptions.Item>
      </Descriptions>
      {multi ? <WhtLinesTable lines={whtLines ?? []} total={whtAmount} /> : null}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("WHT คิดจากหัว PO (ค่าสินค้า) และ/หรือค่าใช้จ่ายที่ติ๊กหัก ณ ที่จ่าย — ฐานก่อน VAT · ไม่หักมัดจำ/ใบปรับหนี้ซ้ำ (คำนวณใน AP แล้ว)")}
      </Typography.Text>
    </Card>
  );
}

/** 2.6 สรุปยอดจ่าย — แยกยอดเอกสารต้นทาง / ยอดที่ขอจ่าย / ยอดโอนจริง ให้ชัด */
export function SummaryCard({
  info,
  amount,
  wht,
  net,
}: {
  info: Pick<VoucherSourceInfo, "sourceDocumentAmount" | "issuedPvAmount" | "remainingIssuable">;
  amount: number | string;
  wht: number | string;
  net: number | string;
}) {
  const t = useT();
  return (
    <Card title={t("สรุปยอดจ่าย (บาท)")} size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
        <Descriptions.Item label={t("ยอดเอกสารต้นทาง")}>{fmtMoney(info.sourceDocumentAmount)}</Descriptions.Item>
        <Descriptions.Item label={t("ยอดที่ออก PV ไปแล้ว")}>{fmtMoney(info.issuedPvAmount)}</Descriptions.Item>
        <Descriptions.Item label={t("ยอดคงเหลือที่ออก PV ได้")}>{fmtMoney(info.remainingIssuable)}</Descriptions.Item>
        <Descriptions.Item label={t("ยอดที่ต้องการจ่าย")}>{fmtMoney(amount)}</Descriptions.Item>
        <Descriptions.Item label={t("ภาษีหัก ณ ที่จ่าย")}>{fmtMoney(wht)}</Descriptions.Item>
        <Descriptions.Item label={t("ยอดสุทธิที่ต้องจ่าย (โอนจริง)")}>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {fmtMoney(net)}
          </Typography.Text>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

/** รายการ AP ที่เกี่ยวข้อง + ยอดจัดสรร (กรณีใบวางบิล) */
export function ApAllocationTable({
  rows,
  amountCell,
}: {
  rows: VoucherApDocument[];
  /** หน้าสร้างส่ง input ให้กรอกยอดจัดสรรต่อ AP */
  amountCell?: (row: VoucherApDocument) => React.ReactNode;
}) {
  const t = useT();
  if (rows.length === 0) return null;
  const columns: ColumnsType<VoucherApDocument> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("เลขที่ AP"), dataIndex: "docNo" },
    { title: t("เลขที่ PO"), dataIndex: "poNo", render: (v?: string) => v ?? "—" },
    {
      title: t("ยอดที่ PV ใบนี้นำไปชำระ"),
      dataIndex: "allocatedAmount",
      align: "right",
      width: 220,
      render: (v: string, row) => (amountCell ? amountCell(row) : fmtMoney(v)),
    },
    { title: t("WHT ของยอดนี้"), dataIndex: "whtAmount", align: "right", width: 140, render: (v: string) => fmtMoney(v) },
  ];
  return (
    <Table size="small" rowKey="id" columns={columns} dataSource={rows} pagination={false} style={{ marginTop: 12 }} />
  );
}

/** 2.9 ผู้ดำเนินการ */
export function PeopleCard({
  createdBy,
  submittedBy,
  reviewedBy,
  approvedBy,
  rejectedBy,
  cancelledBy,
}: {
  createdBy?: VoucherPersonAction;
  submittedBy?: VoucherPersonAction;
  reviewedBy?: VoucherPersonAction;
  approvedBy?: VoucherPersonAction;
  rejectedBy?: VoucherPersonAction;
  cancelledBy?: VoucherPersonAction;
}) {
  const t = useT();
  const cell = (p?: VoucherPersonAction) => (p?.name ? `${p.name} · ${dt(p.at)}` : "—");
  return (
    <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
      <Descriptions.Item label={t("ผู้จัดทำ / วันที่สร้าง")}>{cell(createdBy)}</Descriptions.Item>
      <Descriptions.Item label={t("ผู้ส่งอนุมัติ")}>{cell(submittedBy)}</Descriptions.Item>
      <Descriptions.Item label={t("ผู้ตรวจสอบ")}>{cell(reviewedBy)}</Descriptions.Item>
      <Descriptions.Item label={t("ผู้อนุมัติ / วันที่อนุมัติ")}>{cell(approvedBy)}</Descriptions.Item>
      {rejectedBy ? <Descriptions.Item label={t("ไม่อนุมัติโดย")}>{cell(rejectedBy)}</Descriptions.Item> : null}
      {cancelledBy ? <Descriptions.Item label={t("ยกเลิกโดย")}>{cell(cancelledBy)}</Descriptions.Item> : null}
    </Descriptions>
  );
}

export function EventsTimeline({
  events,
}: {
  events: Array<{ id: string; action: string; note?: string; performedByName?: string; performedAt: string }>;
}) {
  const t = useT();
  if (events.length === 0) return <Typography.Text type="secondary">{t("ยังไม่มีประวัติ")}</Typography.Text>;
  return (
    <Timeline
      style={{ marginTop: 16 }}
      items={events.map((e) => ({
        key: e.id,
        content: (
          <span>
            <Tag>{VOUCHER_EVENT_LABEL[e.action] ? tFin(VOUCHER_EVENT_LABEL[e.action]) : e.action}</Tag>
            {e.performedByName ?? "—"} · {dt(e.performedAt)}
            {e.note ? <div style={{ color: "#8a94a6" }}>{e.note}</div> : null}
          </span>
        ),
      }))}
    />
  );
}
