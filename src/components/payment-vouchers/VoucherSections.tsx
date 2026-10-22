"use client";

import Link from "next/link";
import { Card, Descriptions, Table, Tag, Timeline, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { VOUCHER_EVENT_LABEL, type VoucherApDocument, type VoucherPersonAction, type VoucherSourceInfo } from "@/types/payment-vouchers";
import { fmtMoney, sourceHref, sourceLabel } from "./paymentVoucherUtils";

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
  const isBilling = sourceType === "BILLING_NOTE" || sourceType === "AP_INVOICE";
  return (
    <Card title="เอกสารอ้างอิง" size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
        <Descriptions.Item label="ประเภทเอกสารต้นทาง">{sourceLabel(sourceType)}</Descriptions.Item>
        <Descriptions.Item label={sourceType === "BILLING_NOTE" ? "เลขที่ใบวางบิล" : sourceType === "AP_INVOICE" ? "เลขที่ใบตั้งหนี้ (ต้นทาง)" : "เลขที่เอกสารต้นทาง"}>
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
          <Descriptions.Item label="เลขที่ AP" span={2}>
            {info.apDocuments.length === 0 ? "—" : info.apDocuments.map((a) => a.docNo).join(", ")}
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="เลขที่ PO">
          {info.purchaseOrders.length === 0
            ? "—"
            : info.purchaseOrders.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={`/purchase-orders/${p.id}`}>{p.poNo}</Link>
                </span>
              ))}
        </Descriptions.Item>
        <Descriptions.Item label="เลขที่รายการจ่ายเงิน">
          {info.purchaseOrders.length === 0 ? "—" : info.purchaseOrders.map((p) => p.poNo).join(", ")}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

/** 2.3 ข้อมูลผู้ขาย (อ่านอย่างเดียว) */
export function SupplierCard({ supplier }: { supplier: VoucherSourceInfo["supplier"] }) {
  return (
    <Card title="ข้อมูลผู้ขาย" size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
        <Descriptions.Item label="ชื่อ Supplier">{supplier.nameTh || "—"}</Descriptions.Item>
        <Descriptions.Item label="รหัส Supplier">{supplier.creditorCode ?? "—"}</Descriptions.Item>
        <Descriptions.Item label="เลขประจำตัวผู้เสียภาษี">{supplier.taxId ?? "—"}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

/** 2.5 ข้อมูลภาษี */
export function TaxCard({
  vat,
  whtBase,
  whtRate,
  whtAmount,
  net,
}: {
  vat: number | string;
  whtBase: number | string;
  whtRate: number | string;
  whtAmount: number | string;
  net: number | string;
}) {
  const hasWht = Number(whtAmount) > 0;
  return (
    <Card title="ข้อมูลภาษี (VAT / หัก ณ ที่จ่าย)" size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
        <Descriptions.Item label="VAT">{fmtMoney(vat)}</Descriptions.Item>
        <Descriptions.Item label="ฐานภาษีหัก ณ ที่จ่าย">{hasWht ? fmtMoney(whtBase) : "—"}</Descriptions.Item>
        <Descriptions.Item label="อัตรา WHT">{hasWht ? `${Number(whtRate)}%` : "ไม่มี"}</Descriptions.Item>
        <Descriptions.Item label="ยอด WHT">{fmtMoney(whtAmount)}</Descriptions.Item>
        <Descriptions.Item label="ยอดสุทธิจ่าย" span={2}>
          <Typography.Text strong>{fmtMoney(net)}</Typography.Text>
        </Descriptions.Item>
      </Descriptions>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        WHT คิดจากหัว PO (ค่าสินค้า) และ/หรือค่าใช้จ่ายที่ติ๊กหัก ณ ที่จ่าย — ฐานก่อน VAT · ไม่หักมัดจำ/ใบปรับหนี้ซ้ำ (คำนวณใน AP แล้ว)
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
  return (
    <Card title="สรุปยอดจ่าย (บาท)" size="small">
      <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
        <Descriptions.Item label="ยอดเอกสารต้นทาง">{fmtMoney(info.sourceDocumentAmount)}</Descriptions.Item>
        <Descriptions.Item label="ยอดที่ออก PV ไปแล้ว">{fmtMoney(info.issuedPvAmount)}</Descriptions.Item>
        <Descriptions.Item label="ยอดคงเหลือที่ออก PV ได้">{fmtMoney(info.remainingIssuable)}</Descriptions.Item>
        <Descriptions.Item label="ยอดที่ต้องการจ่าย">{fmtMoney(amount)}</Descriptions.Item>
        <Descriptions.Item label="ภาษีหัก ณ ที่จ่าย">{fmtMoney(wht)}</Descriptions.Item>
        <Descriptions.Item label="ยอดสุทธิที่ต้องจ่าย (โอนจริง)">
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
  if (rows.length === 0) return null;
  const columns: ColumnsType<VoucherApDocument> = [
    { title: "เลขที่ AP", dataIndex: "docNo" },
    { title: "เลขที่ PO", dataIndex: "poNo", render: (v?: string) => v ?? "—" },
    {
      title: "ยอดที่ PV ใบนี้นำไปชำระ",
      dataIndex: "allocatedAmount",
      align: "right",
      width: 220,
      render: (v: string, row) => (amountCell ? amountCell(row) : fmtMoney(v)),
    },
    { title: "WHT ของยอดนี้", dataIndex: "whtAmount", align: "right", width: 140, render: (v: string) => fmtMoney(v) },
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
  const cell = (p?: VoucherPersonAction) => (p?.name ? `${p.name} · ${dt(p.at)}` : "—");
  return (
    <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
      <Descriptions.Item label="ผู้จัดทำ / วันที่สร้าง">{cell(createdBy)}</Descriptions.Item>
      <Descriptions.Item label="ผู้ส่งอนุมัติ">{cell(submittedBy)}</Descriptions.Item>
      <Descriptions.Item label="ผู้ตรวจสอบ">{cell(reviewedBy)}</Descriptions.Item>
      <Descriptions.Item label="ผู้อนุมัติ / วันที่อนุมัติ">{cell(approvedBy)}</Descriptions.Item>
      {rejectedBy ? <Descriptions.Item label="ไม่อนุมัติโดย">{cell(rejectedBy)}</Descriptions.Item> : null}
      {cancelledBy ? <Descriptions.Item label="ยกเลิกโดย">{cell(cancelledBy)}</Descriptions.Item> : null}
    </Descriptions>
  );
}

export function EventsTimeline({
  events,
}: {
  events: Array<{ id: string; action: string; note?: string; performedByName?: string; performedAt: string }>;
}) {
  if (events.length === 0) return <Typography.Text type="secondary">ยังไม่มีประวัติ</Typography.Text>;
  return (
    <Timeline
      style={{ marginTop: 16 }}
      items={events.map((e) => ({
        key: e.id,
        content: (
          <span>
            <Tag>{VOUCHER_EVENT_LABEL[e.action] ?? e.action}</Tag>
            {e.performedByName ?? "—"} · {dt(e.performedAt)}
            {e.note ? <div style={{ color: "#8a94a6" }}>{e.note}</div> : null}
          </span>
        ),
      }))}
    />
  );
}
