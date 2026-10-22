"use client";

import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { JournalLine, PurchaseJournalItem } from "@/types/purchase-journal";

import { money } from "./apDocumentConfig";

type Source = Pick<PurchaseJournalItem, "lines" | "totalDebit" | "totalCredit">;

type Row =
  | { key: string; kind: "line"; line: JournalLine }
  | { key: string; kind: "total"; debit: number; credit: number };

const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "");

/** ป้ายบอกว่าบรรทัดนั้นมี VAT หรือไม่ (เฉพาะบรรทัดสินค้า/ค่าใช้จ่าย — ภาษีซื้อและเจ้าหนี้ไม่ต้องมี) */
function vatTag(line: JournalLine) {
  if (line.taxGroup === "VAT") {
    return <Tag color="green">{line.vatRate ? `มี VAT ${line.vatRate}%` : "มี VAT"}</Tag>;
  }
  if (line.taxGroup === "NON_VAT") return <Tag>ไม่มี VAT</Tag>;
  return null;
}

/**
 * ตารางบรรทัดบัญชีของหน้าสมุดรายวันซื้อ (แถวขยาย):
 * ลำดับที่ | รหัสบัญชี | ชื่อบัญชี | เดบิต | เครดิต | คำอธิบายรายการย่อย + ป้าย VAT
 * ไม่มีแถวหัวกลุ่ม "มี VAT / ไม่มี VAT" — แยกด้วยป้ายท้ายคำอธิบายแทน
 */
export default function JournalLinesDetailTable({ doc }: { doc: Source }) {
  const rows: Row[] = [
    ...doc.lines.map((line): Row => ({ key: `l-${line.no}`, kind: "line", line })),
    { key: "total", kind: "total", debit: doc.totalDebit, credit: doc.totalCredit },
  ];

  const columns: ColumnsType<Row> = [
    {
      title: "ลำดับที่",
      key: "no",
      width: 88,
      align: "center",
      // แถวรวม: ยุบ ลำดับที่ + รหัสบัญชี + ชื่อบัญชี เป็นช่องเดียว ชิดขวา
      onCell: (row) => (row.kind === "total" ? { colSpan: 3 } : {}),
      render: (_, row) =>
        row.kind === "total" ? (
          <div style={{ textAlign: "right" }}>
            <Typography.Text strong>ยอดรวมสุทธิ</Typography.Text>
          </div>
        ) : (
          row.line.no
        ),
    },
    {
      title: "รหัสบัญชี",
      key: "code",
      width: 150,
      onCell: (row) => (row.kind === "total" ? { colSpan: 0 } : {}),
      render: (_, row) => {
        if (row.kind === "total") return null;
        return row.line.accountCode ? (
          <Typography.Text strong>{row.line.accountCode}</Typography.Text>
        ) : (
          <Tag color="red">ยังไม่ผูกบัญชี</Tag>
        );
      },
    },
    {
      title: "ชื่อบัญชี",
      key: "name",
      width: 250,
      onCell: (row) => (row.kind === "total" ? { colSpan: 0 } : {}),
      render: (_, row) => (row.kind === "total" ? null : (row.line.accountName ?? "—")),
    },
    {
      title: "เดบิต",
      key: "debit",
      width: 130,
      align: "right",
      render: (_, row) =>
        row.kind === "total" ? (
          <Typography.Text strong>{money.format(row.debit)}</Typography.Text>
        ) : (
          moneyOrBlank(row.line.debit)
        ),
    },
    {
      title: "เครดิต",
      key: "credit",
      width: 130,
      align: "right",
      render: (_, row) =>
        row.kind === "total" ? (
          <Typography.Text strong>{money.format(row.credit)}</Typography.Text>
        ) : (
          moneyOrBlank(row.line.credit)
        ),
    },
    {
      title: "คำอธิบายรายการย่อย",
      key: "description",
      // เว้นระยะซ้ายให้ห่างจากช่องเครดิต ไม่ให้ตัวเลขชิดข้อความ
      onHeaderCell: () => ({ style: { paddingLeft: 40 } }),
      onCell: () => ({ style: { paddingLeft: 40 } }),
      render: (_, row) => {
        if (row.kind === "total") return null;
        const { description, detail } = row.line;
        return (
          <span>
            {description}
            {detail ? <Typography.Text type="secondary"> · {detail}</Typography.Text> : null}
            {vatTag(row.line) ? <span style={{ marginLeft: 8 }}>{vatTag(row.line)}</span> : null}
          </span>
        );
      },
    },
  ];

  return (
    <Table<Row>
      size="small"
      rowKey="key"
      pagination={false}
      columns={columns}
      dataSource={rows}
      scroll={{ x: 960 }}
      style={{ margin: "4px 0" }}
    />
  );
}
