"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Alert, Skeleton, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { ApiError } from "@/lib/api/client";
import { useT, type TFunction } from "@/lib/i18n/useT";
import type { PurchaseJournalItem } from "@/types/purchase-journal";

import styles from "./ApJournalVoucher.module.css";
import { type JournalLineRow, toJournalLineRows } from "./apJournalVoucher.utils";
import { formatThaiDate, money } from "./apDocumentConfig";

const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "");

/** หัวกลุ่มจาก apJournalVoucher.utils (ไทยเสมอเพราะ PDF ใช้ร่วม) — แปลตอนแสดงบนหน้าจอ */
function groupLabel(label: string, t: TFunction) {
  const m = label.match(/^รายการมี VAT \((.+)%\)$/);
  return m ? t("รายการมี VAT ({rate}%)", { rate: m[1] }) : t(label);
}

type LinesTableProps = {
  doc: Pick<PurchaseJournalItem, "lines" | "totalDebit" | "totalCredit">;
  /** แสดงคอลัมน์ "ที่" (หน้ารายงาน) — ใบสำคัญตามแบบไม่มีคอลัมน์นี้ */
  showNo?: boolean;
  /** หัวตารางสีฟ้าตามแบบใบสำคัญ */
  voucherStyle?: boolean;
};

/** ตารางบรรทัดบัญชี: รหัส/ชื่อบัญชี · เดบิต · เครดิต · คำอธิบายรายการย่อย + หัวกลุ่มมี/ไม่มี VAT + ยอดรวมสุทธิ */
export function JournalLinesTable({ doc, showNo = false, voucherStyle = false }: LinesTableProps) {
  const t = useT();
  const leading = showNo ? 1 : 0; // จำนวนคอลัมน์ก่อนคอลัมน์บัญชี
  const spanAll = 4 + leading;

  const noColumn: ColumnsType<JournalLineRow> = showNo
    ? [
        {
          title: t("ที่"),
          key: "no",
          width: 56,
          align: "center",
          onCell: (row) => (row.kind === "group" ? { colSpan: spanAll } : row.kind === "total" ? { colSpan: 2 } : {}),
          render: (_, row) => {
            if (row.kind === "group") return <Typography.Text strong>{groupLabel(row.label, t)}</Typography.Text>;
            if (row.kind === "total") return <Typography.Text strong>{t("ยอดรวมสุทธิ")}</Typography.Text>;
            return row.line.no;
          },
        },
      ]
    : [];

  const accountColumn: ColumnsType<JournalLineRow>[number] = {
    title: t("รหัสบัญชี / ชื่อบัญชี"),
    key: "account",
    width: 300,
    onCell: (row) => {
      if (showNo) return row.kind === "line" ? {} : { colSpan: 0 };
      if (row.kind === "group") return { colSpan: spanAll };
      if (row.kind === "total") return { colSpan: 1 };
      return {};
    },
    render: (_, row) => {
      if (row.kind === "group") return <Typography.Text strong>{groupLabel(row.label, t)}</Typography.Text>;
      if (row.kind === "total") return <div style={{ textAlign: "right" }}><Typography.Text strong>{t("ยอดรวมสุทธิ")}</Typography.Text></div>;
      const { accountCode, accountName } = row.line;
      return accountCode ? (
        <span>
          <Typography.Text strong>{accountCode}</Typography.Text> / {accountName}
        </span>
      ) : (
        <Tag color="red">{t("ยังไม่ผูกบัญชี")}</Tag>
      );
    },
  };

  const columns: ColumnsType<JournalLineRow> = [
    ...noColumn,
    accountColumn,
    {
      title: t("เดบิต"),
      key: "debit",
      width: 130,
      align: "right",
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) => {
        if (row.kind === "line") return moneyOrBlank(row.line.debit);
        if (row.kind === "total") return <Typography.Text strong>{money.format(row.debit)}</Typography.Text>;
        return null;
      },
    },
    {
      title: t("เครดิต"),
      key: "credit",
      width: 130,
      align: "right",
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) => {
        if (row.kind === "line") return moneyOrBlank(row.line.credit);
        if (row.kind === "total") return <Typography.Text strong>{money.format(row.credit)}</Typography.Text>;
        return null;
      },
    },
    {
      title: t("คำอธิบายรายการย่อย"),
      key: "description",
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) => {
        if (row.kind !== "line") return null;
        const { description, detail } = row.line;
        return (
          <span>
            {description}
            {detail ? <Typography.Text type="secondary"> · {detail}</Typography.Text> : null}
          </span>
        );
      },
    },
  ];

  return (
    <Table<JournalLineRow>
      className={voucherStyle ? styles.table : undefined}
      size={voucherStyle ? "middle" : "small"}
      rowKey="key"
      pagination={false}
      columns={columns}
      dataSource={toJournalLineRows(doc)}
      scroll={{ x: 760 }}
      style={voucherStyle ? undefined : { margin: "4px 0" }}
    />
  );
}

type VoucherProps = {
  entry?: PurchaseJournalItem;
  isLoading: boolean;
  error?: unknown;
  /** true = ตัวอย่างของเอกสารที่ยังไม่อนุมัติ */
  preview: boolean;
  docDate: string;
  creditorId: string;
  creditorCode: string;
  creditorName: string;
  reference: string;
  description: string;
  remark?: string | null;
  internalNote?: string | null;
  /** ไอคอนพิมพ์/ดาวน์โหลด/เพิ่มเติม มุมขวาบน */
  toolbar?: ReactNode;
  /** false = ซ่อนแถววันที่/ผู้ติดต่อ/อ้างอิง (หน้ารายละเอียดสมุดรายวันมี Descriptions แยก) */
  showMeta?: boolean;
};

/** ใบสำคัญสมุดรายวัน (template ตามแบบ): หัวเอกสาร → คำอธิบาย → ตารางบัญชี → หมายเหตุ/โน้ตภายใน */
export default function ApJournalVoucher({
  entry,
  isLoading,
  error,
  preview,
  docDate,
  creditorId,
  creditorCode,
  creditorName,
  reference,
  description,
  remark,
  internalNote,
  toolbar,
  showMeta = true,
}: VoucherProps) {
  const t = useT();
  const forbidden = error instanceof ApiError && error.status === 403;

  let body: ReactNode;
  if (isLoading) {
    body = <Skeleton active paragraph={{ rows: 5 }} />;
  } else if (forbidden) {
    body = (
      <Alert
        type="info"
        showIcon
        title={t("ไม่มีสิทธิ์ดูรายการบัญชี")}
        description={t("ใบสำคัญบัญชีใช้สิทธิ์ของ สมุดรายวันซื้อ — ขอสิทธิ์จากผู้ดูแลระบบถ้าต้องดู")}
      />
    );
  } else if (error || !entry) {
    body = <Alert type="warning" showIcon title={t("โหลดรายการบัญชีไม่สำเร็จ")} description={error instanceof Error ? error.message : undefined} />;
  } else {
    body = (
      <>
        <JournalLinesTable doc={entry} voucherStyle />
        {entry.unmapped.length > 0 ? (
          <Alert
            style={{ marginTop: 12 }}
            type="error"
            showIcon
            title={t("ยังไม่ได้ผูก{items}", { items: entry.unmapped.join(", ") })}
            description={<Link href="/masters/gl-accounts">{t("ไปตั้งที่ ผังบัญชีและการผูกบัญชี")}</Link>}
          />
        ) : null}
        {!entry.balanced ? <Alert style={{ marginTop: 12 }} type="error" showIcon title={t("เดบิตไม่เท่ากับเครดิต — ตรวจยอดเอกสาร")} /> : null}
        <div className={styles.note}>
          {showMeta
            ? t("เจ้าหนี้แสดงเต็มยอดตั้งหนี้ ไม่หักมัดจำ/ภาษีหัก ณ ที่จ่าย (ยอดที่ต้องชำระจริงดูที่แท็บรายละเอียดและการชำระเงิน)")
            : t("เจ้าหนี้แสดงเต็มยอดตั้งหนี้ ไม่หักมัดจำ/ภาษีหัก ณ ที่จ่าย")}
        </div>
      </>
    );
  }

  return (
    <div className={styles.voucher}>
      {toolbar ? <div className={styles.toolbar}>{toolbar}</div> : null}
      {preview ? (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          title={t("ตัวอย่างรายการบัญชี — ยังไม่อนุมัติ")}
          description={t("ใบสำคัญจริงจะสร้างเมื่ออนุมัติ · ตัวอย่างนี้พิมพ์/ดาวน์โหลดไม่ได้")}
        />
      ) : null}
      {showMeta ? (
        <div className={styles.meta}>
          <span className={styles.metaLabel}>{t("วันที่เอกสาร:")}</span>
          <span>{formatThaiDate(docDate)}</span>
          <span className={styles.metaLabel}>{t("ผู้ติดต่อ:")}</span>
          <Link href={`/finance/payables/creditors/${creditorId}`}>
            {creditorCode} {creditorName}
          </Link>
          <span className={styles.metaLabel}>{t("เลขที่อ้างอิง:")}</span>
          <span>{reference}</span>
        </div>
      ) : null}

      <div className={styles.description}>
        <span className={styles.metaLabel}>{t("คำอธิบาย:")}</span>
        <span>{description}</span>
      </div>

      {body}

      <div className={styles.footer}>
        <div>
          <span className={styles.footerLabel}>{t("หมายเหตุ:")}</span>
          <span>{remark || ""}</span>
        </div>
        <div>
          <span className={styles.footerLabel}>{t("โน้ตภายในบริษัท:")}</span>
          <span>{internalNote || ""}</span>
        </div>
      </div>
    </div>
  );
}
