"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Space,
  Spin,
  Tabs,
  Tooltip,
  Typography,
} from "antd";
import { ArrowLeftOutlined, DownloadOutlined, PrinterOutlined } from "@ant-design/icons";

import { JournalLinesTable } from "@/components/ap-documents/ApJournalVoucher";
import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import { usePaymentJournalByDocQuery } from "@/hooks/payment-journal/usePaymentJournal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import {
  PAYMENT_KIND_LABEL,
  PAYMENT_METHOD_LABEL,
  type PaymentJournalItem,
} from "@/types/payment-journal";

const SCREEN_CODE = "REPORTS_JOURNAL_PAYMENTS";
const LIST_PATH = "/reports/journals/payments";
const PAYMENT_RECORD_PATH = "/finance/payables/payment-records";

type Props = { id: string };

/** วิธีจ่ายพร้อมรายละเอียด เช่น "โอนเงิน · กสิกรไทย 123-4-56789-0" */
function methodText(item: PaymentJournalItem): string {
  const label = PAYMENT_METHOD_LABEL[item.paymentMethod] ?? item.paymentMethod;
  const bank = [item.bankName, item.bankAccountNumber].filter(Boolean).join(" ");
  return bank ? `${label} · ${bank}` : label;
}

function buildPaymentDescription(entry: PaymentJournalItem): string {
  const parts = [
    entry.kindLabel,
    entry.po ? `ตามเอกสาร ${entry.po.no}` : null,
    `ถึง ${entry.creditorName}`,
    entry.voucher.no ? `PV ${entry.voucher.no}` : null,
  ];
  return parts.filter(Boolean).join(" ");
}

export default function PaymentJournalDetailPage({ id }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const journalQuery = usePaymentJournalByDocQuery(id, Boolean(id));
  const entry = journalQuery.data?.entry;

  const canPrint =
    Boolean(entry) && (!isMatrixPermissionMode() || hasPermission(`${SCREEN_CODE}.PRINT`));

  const voucherInput = entry
    ? {
        title: "ใบสำคัญสมุดรายวันจ่าย",
        note: "ยอดจ่ายจริงเครดิตธนาคาร/เช็ค/เงินสด · WHT เครดิตภาษีหัก ณ ที่จ่ายค้างจ่ายเมื่อมี",
        docNo: entry.paymentNo ?? entry.voucher.no,
        docTypeLabel: PAYMENT_KIND_LABEL[entry.kind],
        docDateText: formatThaiDate(entry.paymentDate),
        creditorText: `${entry.creditorCode} ${entry.creditorName}`,
        reference: entry.transactionRef || entry.chequeNo || entry.voucher.no || "—",
        description: buildPaymentDescription(entry),
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
      message.error(e instanceof Error ? e.message : "พิมพ์เอกสารไม่สำเร็จ");
    }
  };

  const downloadVoucher = async () => {
    if (!voucherInput) return;
    try {
      const { downloadApJournalVoucherPdf } = await import("@/utils/generateApJournalVoucherPdf");
      await downloadApJournalVoucherPdf(voucherInput);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "ดาวน์โหลดไม่สำเร็จ");
    }
  };

  if (journalQuery.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (journalQuery.isError || !entry) {
    return (
      <Card>
        <Typography.Text type="danger">
          {journalQuery.error instanceof Error
            ? journalQuery.error.message
            : "ไม่พบรายการสมุดรายวันจ่าย"}
        </Typography.Text>
        <div style={{ marginTop: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST_PATH)}>
            กลับรายการ
          </Button>
        </div>
      </Card>
    );
  }

  const apText =
    entry.aps.length > 0 ? (
      <Space size={[6, 0]} wrap>
        {entry.aps.map((ap) => (
          <Link key={ap.id} href={`/finance/payables/ap-invoices/${ap.id}`}>
            {ap.no}
          </Link>
        ))}
      </Space>
    ) : (
      "—"
    );

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            รายการจ่ายเงิน {entry.paymentNo ?? entry.voucher.no}
          </Typography.Title>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST_PATH)}>
              กลับรายการ
            </Button>
            <Tooltip title={canPrint ? undefined : "ไม่มีสิทธิ์พิมพ์"}>
              <span>
                <Button
                  icon={<PrinterOutlined />}
                  disabled={!canPrint}
                  onClick={() => void printVoucher()}
                >
                  พิมพ์เอกสาร
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={canPrint ? undefined : "ไม่มีสิทธิ์พิมพ์"}>
              <span>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={!canPrint}
                  onClick={() => void downloadVoucher()}
                >
                  ดาวน์โหลด
                </Button>
              </span>
            </Tooltip>
            <Link href={`${PAYMENT_RECORD_PATH}/${entry.id}`}>
              <Button type="primary">ไปที่บันทึกจ่ายเงิน</Button>
            </Link>
          </Space>
        </div>
      </Card>

      <Card title="ข้อมูลเอกสาร" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="วันที่จ่ายเงิน">{formatThaiDate(entry.paymentDate)}</Descriptions.Item>
          <Descriptions.Item label="วันที่บัญชี">{formatThaiDate(entry.paymentDate)}</Descriptions.Item>
          <Descriptions.Item label="เลขที่รายการจ่าย">{entry.paymentNo ?? "—"}</Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย">
            <Link href={`/finance/payables/creditors/${entry.creditorId}`}>
              {entry.creditorCode} {entry.creditorName}
            </Link>
          </Descriptions.Item>
          <Descriptions.Item label="ใบสำคัญจ่าย">
            <Link href={`/finance/payables/payment-vouchers/${entry.voucher.id}`}>
              {entry.voucher.no}
            </Link>
          </Descriptions.Item>
          <Descriptions.Item label="ประเภทการจ่าย">{entry.kindLabel}</Descriptions.Item>
          <Descriptions.Item label="วิธีจ่าย" span={2}>
            {methodText(entry)}
            {entry.transactionRef ? ` · อ้างอิง ${entry.transactionRef}` : ""}
            {entry.chequeNo ? ` · เช็คเลขที่ ${entry.chequeNo}` : ""}
          </Descriptions.Item>
          <Descriptions.Item label="เลขที่ PO">
            {entry.po ? <Link href={`/purchase-orders/${entry.po.id}`}>{entry.po.no}</Link> : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="ใบขอจ่ายล่วงหน้า">
            {entry.advanceRequest ? (
              <Link href={`/finance/payables/advance-requests/${entry.advanceRequest.id}`}>
                {entry.advanceRequest.no}
              </Link>
            ) : (
              "—"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="ใบตั้งหนี้ (AP)" span={2}>
            {apText}
          </Descriptions.Item>
        </Descriptions>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
          ยอดรวมก่อนหัก {money.format(entry.grossAmount)} · WHT {money.format(entry.whtAmount)} · จ่ายจริง{" "}
          {money.format(entry.netAmount)} บาท · เดบิต {money.format(entry.totalDebit)} / เครดิต{" "}
          {money.format(entry.totalCredit)}
        </Typography.Paragraph>
      </Card>

      <Card size="small">
        <Tabs
          items={[
            {
              key: "journal",
              label: "รายละเอียดสมุดรายวันจ่าย",
              children: (
                <>
                  <JournalLinesTable doc={entry} voucherStyle />
                  {entry.unmapped.length > 0 ? (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="error"
                      showIcon
                      title={`ยังไม่ได้ผูก${entry.unmapped.join(", ")}`}
                      description={
                        <Link href="/masters/gl-accounts">ไปตั้งที่ ผังบัญชีและการผูกบัญชี</Link>
                      }
                    />
                  ) : null}
                  {!entry.balanced ? (
                    <Alert
                      style={{ marginTop: 12 }}
                      type="error"
                      showIcon
                      title="เดบิตไม่เท่ากับเครดิต — ตรวจยอดเอกสาร"
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
