"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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

import ApJournalVoucher from "@/components/ap-documents/ApJournalVoucher";
import {
  buildVoucherDescription,
  pickVoucherReference,
} from "@/components/ap-documents/apJournalVoucher.utils";
import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import { usePurchaseJournalByDocQuery } from "@/hooks/purchase-journal/usePurchaseJournal";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import {
  JOURNAL_DOC_TYPE_LABEL,
  type JournalDocType,
} from "@/types/purchase-journal";

const SCREEN_CODE = "REPORTS_JOURNAL_PURCHASES";
const LIST_PATH = "/reports/journals/purchases";

const DOC_BASE_PATH: Record<JournalDocType, string> = {
  AP_INVOICE: "/finance/payables/ap-invoices",
  DEBIT_NOTE: "/finance/payables/debit-notes",
  CREDIT_NOTE: "/finance/payables/credit-notes",
};

const GO_DOC_LABEL: Record<JournalDocType, string> = {
  AP_INVOICE: "ไปที่ใบตั้งหนี้",
  DEBIT_NOTE: "ไปที่ใบเพิ่มหนี้",
  CREDIT_NOTE: "ไปที่ใบลดหนี้",
};

type Props = { id: string };

export default function PurchaseJournalDetailPage({ id }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const journalQuery = usePurchaseJournalByDocQuery(id, Boolean(id));
  const data = journalQuery.data;
  const entry = data?.entry;
  const preview = Boolean(data?.preview);

  const canPrint =
    !preview &&
    Boolean(entry) &&
    (!isMatrixPermissionMode() || hasPermission(`${SCREEN_CODE}.PRINT`));

  const voucherInput = entry
    ? {
        docNo: entry.docNo,
        docTypeLabel: JOURNAL_DOC_TYPE_LABEL[entry.docType],
        docDateText: formatThaiDate(entry.docDate),
        creditorText: `${entry.creditorCode} ${entry.creditorName}`,
        reference: pickVoucherReference({
          supplierDocNo: entry.supplierDocNo,
          taxInvoiceNo: entry.taxInvoiceNo,
          purchaseOrderNo: entry.po?.no,
        }),
        description: buildVoucherDescription({
          purchaseOrderNo: entry.po?.no,
          creditorName: entry.creditorName,
          supplierDocNo: entry.supplierDocNo,
          taxInvoiceNo: entry.taxInvoiceNo,
          hasItems: entry.grns.length > 0,
        }),
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
            : "ไม่พบรายการสมุดรายวันซื้อ"}
        </Typography.Text>
        <div style={{ marginTop: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST_PATH)}>
            กลับรายการ
          </Button>
        </div>
      </Card>
    );
  }

  const docTypeLabel = JOURNAL_DOC_TYPE_LABEL[entry.docType];
  const supplierInvoiceNo = entry.supplierDocNo || entry.taxInvoiceNo || "—";
  const grnText =
    entry.grns.length > 0 ? entry.grns.map((g) => g.no).join(", ") : "—";
  const docNoLabel = entry.docType === "AP_INVOICE" ? "เลขที่ AP" : "เลขที่เอกสาร";

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            รายการ{docTypeLabel} {entry.docNo}
          </Typography.Title>
          <Space wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST_PATH)}>
              กลับรายการ
            </Button>
            <Tooltip
              title={
                canPrint
                  ? undefined
                  : preview
                    ? "พิมพ์ได้เมื่อเอกสารอนุมัติแล้ว"
                    : "ไม่มีสิทธิ์พิมพ์"
              }
            >
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
            <Tooltip
              title={
                canPrint
                  ? undefined
                  : preview
                    ? "ดาวน์โหลดได้เมื่อเอกสารอนุมัติแล้ว"
                    : "ไม่มีสิทธิ์พิมพ์"
              }
            >
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
            <Link href={`${DOC_BASE_PATH[entry.docType]}/${entry.id}`}>
              <Button type="primary">{GO_DOC_LABEL[entry.docType]}</Button>
            </Link>
          </Space>
        </div>
      </Card>

      <Card title="ข้อมูลเอกสาร" size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="วันที่เอกสาร">{formatThaiDate(entry.docDate)}</Descriptions.Item>
          <Descriptions.Item label="วันที่บัญชี">{formatThaiDate(entry.docDate)}</Descriptions.Item>
          <Descriptions.Item label={docNoLabel}>{entry.docNo}</Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย">
            <Link href={`/finance/payables/creditors/${entry.creditorId}`}>
              {entry.creditorCode} {entry.creditorName}
            </Link>
          </Descriptions.Item>
          <Descriptions.Item label="เลขที่ใบแจ้งหนี้ผู้ขาย">{supplierInvoiceNo}</Descriptions.Item>
          <Descriptions.Item label="เลขที่ PO">
            {entry.po ? (
              <Link href={`/purchase-orders/${entry.po.id}`}>{entry.po.no}</Link>
            ) : (
              "—"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="เลขที่ GRN">{grnText}</Descriptions.Item>
          <Descriptions.Item label="ประเภทเอกสาร">{docTypeLabel}</Descriptions.Item>
        </Descriptions>
        <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
          ยอดรวม {money.format(entry.totalAmount)} บาท · เดบิต {money.format(entry.totalDebit)} / เครดิต{" "}
          {money.format(entry.totalCredit)}
        </Typography.Paragraph>
      </Card>

      <Card size="small">
        <Tabs
          items={[
            {
              key: "journal",
              label: "รายละเอียดสมุดรายวันซื้อ",
              children: (
                <ApJournalVoucher
                  entry={entry}
                  isLoading={false}
                  error={undefined}
                  preview={preview}
                  docDate={entry.docDate}
                  creditorId={entry.creditorId}
                  creditorCode={entry.creditorCode}
                  creditorName={entry.creditorName}
                  reference={voucherInput?.reference ?? "—"}
                  description={voucherInput?.description ?? "—"}
                  showMeta={false}
                />
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
