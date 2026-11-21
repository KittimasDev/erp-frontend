"use client";

import PageLoading from "@/components/common/PageLoading";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Descriptions, Space, Tabs, Tag, Tooltip, Typography } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, PrinterOutlined } from "@ant-design/icons";

import { JournalLinesTable } from "@/components/ap-documents/ApJournalVoucher";
import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import PageHeader from "@/components/common/PageHeader";
import { useArJournalEntryQuery } from "@/hooks/ar-journal/useArJournal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { useT } from "@/lib/i18n/useT";
import { arRefHref, arSourceHref } from "@/lib/sales/ar-journal-links";
import { AR_SOURCE_COLOR, AR_SOURCE_LABEL, type ArJournalKind } from "@/types/ar-journal";

const CONFIG: Record<ArJournalKind, { screen: string; listPath: string; title: string; refLabel: string }> = {
  SALES: {
    screen: "REPORTS_JOURNAL_SALES",
    listPath: "/reports/journals/sales",
    title: "สมุดรายวันขาย",
    refLabel: "เอกสารอ้างอิง",
  },
  RECEIPT: {
    screen: "REPORTS_JOURNAL_RECEIPTS",
    listPath: "/reports/journals/receipts",
    title: "สมุดรายวันรับ",
    refLabel: "ใบแจ้งหนี้/เอกสารที่อ้างอิง",
  },
};

/** รายการสมุดรายวันขาย/รับ 1 รายการ — บรรทัดเดบิต/เครดิต เอกสารต้นทาง ใบสำคัญบัญชี (พิมพ์/ดาวน์โหลด) */
export default function ArJournalDetailPage({ kind, id }: { kind: ArJournalKind; id: string }) {
  const cfg = CONFIG[kind];
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const key = decodeURIComponent(id);
  const query = useArJournalEntryQuery(kind, key, Boolean(key));
  const entry = query.data?.entry;

  const canPrint =
    Boolean(entry) &&
    (!isMatrixPermissionMode() ||
      hasPermission(`${cfg.screen}.PRINT`) ||
      (kind === "SALES" && hasPermission("FINANCE_REPORT_SALES_TAX.PRINT")));

  const voucherInput = entry
    ? {
        title: `ใบสำคัญ${cfg.title}`,
        note:
          kind === "SALES"
            ? "เดบิตลูกหนี้การค้า = ยอดรวม · เครดิตรายได้จากการขาย + ภาษีขาย (ใบลดหนี้/กลับรายการสลับข้าง)"
            : "เดบิตเงินรับ (ธนาคาร/เงินสด) · เครดิตลูกหนี้การค้า/เงินรับล่วงหน้า (กลับรายการสลับข้าง)",
        docNo: entry.entryNo,
        docTypeLabel: entry.event === "REVERSAL" ? `กลับรายการ ${entry.sourceLabel}` : entry.sourceLabel,
        docDateText: formatThaiDate(entry.postingDate),
        creditorText: `${entry.customerCode} ${entry.customerName}`,
        reference: entry.docNo,
        description: entry.description,
        remark: null,
        internalNote: null,
        entry,
      }
    : null;

  const printVoucher = async () => {
    if (!voucherInput) return;
    try {
      const { printApJournalVoucherPdf } = await import("@/utils/generateApJournalVoucherPdf");
      await printApJournalVoucherPdf(voucherInput);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("พิมพ์เอกสารไม่สำเร็จ"));
    }
  };

  const downloadVoucher = async () => {
    if (!voucherInput) return;
    try {
      const { downloadApJournalVoucherPdf } = await import("@/utils/generateApJournalVoucherPdf");
      await downloadApJournalVoucherPdf(voucherInput);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("ดาวน์โหลดไม่สำเร็จ"));
    }
  };

  if (query.isLoading) {
    return <PageLoading />;
  }

  if (query.isError || !entry) {
    return (
      <Card>
        <Typography.Text type="danger">
          {query.error instanceof Error ? query.error.message : t("ไม่พบรายการสมุดรายวัน")}
        </Typography.Text>
        <div style={{ marginTop: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(cfg.listPath)}>
            {t("กลับรายการ")}
          </Button>
        </div>
      </Card>
    );
  }

  const sourceHref = arSourceHref(entry);
  const label = AR_SOURCE_LABEL[entry.sourceType];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{t(cfg.title)} {entry.entryNo}</>}
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(cfg.listPath)}>
              {t("กลับรายการ")}
            </Button>
            <Tooltip title={canPrint ? undefined : t("ไม่มีสิทธิ์พิมพ์")}>
              <span>
                <Button icon={<PrinterOutlined />} disabled={!canPrint} onClick={() => void printVoucher()}>
                  {t("พิมพ์เอกสาร")}
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={canPrint ? undefined : t("ไม่มีสิทธิ์พิมพ์")}>
              <span>
                <Button icon={<DownloadOutlined />} disabled={!canPrint} onClick={() => void downloadVoucher()}>
                  {t("ดาวน์โหลด")}
                </Button>
              </span>
            </Tooltip>
            {sourceHref ? (
              <Link href={sourceHref}>
                <Button type="primary">{t("เปิดเอกสารต้นทาง")}</Button>
              </Link>
            ) : null}
          </>
        }
      />

      <Card title={t("ข้อมูลรายการบัญชี")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label={t("วันที่ลงบัญชี")}>{formatThaiDate(entry.postingDate)}</Descriptions.Item>
          <Descriptions.Item label={t("เลขที่รายการบัญชี")}>{entry.entryNo}</Descriptions.Item>
          <Descriptions.Item label={t("ประเภทรายการ")}>
            <Space size={4} wrap>
              <Tag color={AR_SOURCE_COLOR[entry.sourceType]}>{label ? t(label) : entry.sourceLabel}</Tag>
              {entry.event === "REVERSAL" ? <Tag color="red">{t("กลับรายการ")}</Tag> : null}
              {entry.event === "POST" && entry.reversed ? <Tag>{t("ถูกกลับรายการแล้ว")}</Tag> : null}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label={t("เอกสารต้นทาง")}>
            {sourceHref ? <Link href={sourceHref}>{entry.docNo}</Link> : entry.docNo}
          </Descriptions.Item>
          <Descriptions.Item label={t("ลูกค้า")}>
            {entry.customerCode} {entry.customerName}
            {entry.customerTaxId ? ` · ${entry.customerTaxId}` : ""}
          </Descriptions.Item>
          <Descriptions.Item label={t(cfg.refLabel)}>
            {entry.refs.length > 0 ? (
              <Space size={[6, 0]} wrap>
                {entry.refs.map((ref) => (
                  <Link key={`${ref.type}-${ref.id}`} href={arRefHref(ref)}>
                    {ref.no}
                  </Link>
                ))}
              </Space>
            ) : (
              "—"
            )}
          </Descriptions.Item>
          {kind === "RECEIPT" ? (
            <>
              <Descriptions.Item label={t("วันที่รับเงิน")}>{formatThaiDate(entry.transactionDate)}</Descriptions.Item>
              <Descriptions.Item label={t("วิธีรับชำระ / บัญชีธนาคาร")}>
                {[entry.paymentMethod, entry.bankLabel].filter(Boolean).join(" · ") || "—"}
                {entry.transactionRef ? t(" · อ้างอิง {ref}", { ref: entry.transactionRef }) : ""}
              </Descriptions.Item>
            </>
          ) : null}
          <Descriptions.Item label={t("รายละเอียด")} span={2}>
            {entry.description}
          </Descriptions.Item>
        </Descriptions>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
          {kind === "SALES"
            ? t("ก่อน VAT {sub} · VAT {vat} · รวม {total} บาท · เดบิต {debit} / เครดิต {credit}", {
                sub: money.format(entry.subtotalAmount ?? 0),
                vat: money.format(entry.vatAmount ?? 0),
                total: money.format(entry.totalAmount ?? 0),
                debit: money.format(entry.totalDebit),
                credit: money.format(entry.totalCredit),
              })
            : t("เงินรับ {amount} บาท · เดบิต {debit} / เครดิต {credit}", {
                amount: money.format(entry.receivedAmount ?? 0),
                debit: money.format(entry.totalDebit),
                credit: money.format(entry.totalCredit),
              })}
          {entry.exportCount > 0 ? ` · ${t("ส่งออก Express แล้ว {n} ครั้ง", { n: entry.exportCount })}` : ""}
        </Typography.Paragraph>
      </Card>

      <Card size="small">
        <Tabs
          items={[
            {
              key: "journal",
              label: t("รายละเอียดสมุดรายวัน"),
              children: (
                <>
                  <JournalLinesTable doc={entry} voucherStyle />
                  {entry.frozen ? (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="info"
                      showIcon
                      title={t("บรรทัดบัญชีถูกตรึงตอนส่งออก Express — ไม่เปลี่ยนตามผังบัญชีที่แก้ภายหลัง")}
                    />
                  ) : null}
                  {entry.unmapped.length > 0 ? (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="error"
                      showIcon
                      title={t("ยังไม่ได้ผูก{items}", { items: entry.unmapped.join(", ") })}
                      description={<Link href="/masters/gl-accounts">{t("ไปตั้งที่ ผังบัญชีและการผูกบัญชี")}</Link>}
                    />
                  ) : null}
                  {!entry.balanced ? (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="error"
                      showIcon
                      title={t("เดบิตไม่เท่ากับเครดิต — ตรวจยอดเอกสาร")}
                    />
                  ) : null}
                </>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
