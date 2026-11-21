"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CloseOutlined,
  FilePdfOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import DocumentPaper from "@/components/common/DocumentPaper";
import PageHeader from "@/components/common/PageHeader";
import PageLoading from "@/components/common/PageLoading";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useCancelSalesTaxInvoiceMutation,
  useSalesTaxInvoiceQuery,
} from "@/hooks/sales-tax-invoices/useSalesTaxInvoices";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { useT } from "@/lib/i18n/useT";
import { advanceReceiptRoutes, arRoutes, taxInvoiceRoutes } from "@/lib/sales/ar-routes";
import type { SalesTaxInvoiceItem } from "@/types/sales-tax-invoices";
import { taxBaseAfterAdvance } from "@/utils/advance-deduction-totals";

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "—");
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalesTaxInvoiceDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const perms = useScreenActionPermissions("FINANCE_TAX_INVOICES");
  const query = useSalesTaxInvoiceQuery(id);
  const cancelMutation = useCancelSalesTaxInvoiceMutation();
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const doc = query.data?.data;
  const canPrint = !isMatrixPermissionMode() || hasPermission("FINANCE_TAX_INVOICES.EXPORT");

  const printPdf = async () => {
    if (!doc) return;
    const { generateSalesTaxInvoicePdf } = await import("@/utils/generateSalesTaxInvoicePdf");
    await generateSalesTaxInvoicePdf(doc);
  };

  const columns: ColumnsType<SalesTaxInvoiceItem> = [
    { title: t("ลำดับ"), width: 64, align: "center", render: (_v, _r, index) => index + 1 },
    { title: t("รหัส"), dataIndex: "itemCode", render: (value?: string) => value || "—" },
    { title: t("รายการ"), dataIndex: "itemName" },
    {
      title: t("จำนวน"),
      dataIndex: "quantity",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    { title: t("หน่วย"), dataIndex: "unitName", render: (value?: string) => value || "—" },
    {
      title: t("ราคา/หน่วย"),
      dataIndex: "unitPrice",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "amount",
      align: "right",
      render: (value: string) => formatMoney(value),
    },
  ];

  if (!perms.canView) {
    return <AccessDenied screenCodes={["FINANCE_TAX_INVOICES"]} />;
  }
  if (query.isLoading) return <PageLoading label="กำลังโหลดใบกำกับภาษี" />;
  if (!doc) {
    return (
      <div>
        <p>{t("ไม่พบใบกำกับภาษี")}</p>
        <Link href={taxInvoiceRoutes.list}>{t("กลับ")}</Link>
      </div>
    );
  }

  const beforeVat = Math.max(0, Number(doc.subtotalAmount) - Number(doc.discountAmount || 0));
  const rate = doc.vatRate != null ? Number(doc.vatRate) : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Finance · Tax invoice"
        icon={<FileTextOutlined />}
        title={doc.taxInvoiceNo}
        subtitle={`${doc.buyerName} · ${formatDate(doc.taxInvoiceDate)}`}
        actions={
          <>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(taxInvoiceRoutes.list)}>
              {t("กลับ")}
            </Button>
            {canPrint ? (
              <Button icon={<FilePdfOutlined />} onClick={() => void printPdf()}>
                {t("พิมพ์ PDF")}
              </Button>
            ) : null}
            {perms.canDelete && doc.status === "ISSUED" ? (
              <Button danger icon={<CloseOutlined />} onClick={() => setReasonOpen(true)}>
                {t("ยกเลิก")}
              </Button>
            ) : null}
          </>
        }
      />
      <DocumentPaper
        titleTh={t("ใบกำกับภาษี")}
        titleEn="TAX INVOICE"
        meta={[
          { label: t("เลขที่เอกสาร"), value: doc.taxInvoiceNo },
          { label: t("วันที่เอกสาร"), value: formatDate(doc.taxInvoiceDate) },
          { label: t("สถานะ"), value: doc.status === "ISSUED" ? t("ใช้งาน") : t("ยกเลิก") },
        ]}
        panels={[
          {
            title: t("ผู้ขาย"),
            rows: [
              { label: t("ชื่อ"), value: doc.sellerName },
              { label: t("เลขผู้เสียภาษี"), value: doc.sellerTaxId },
              { label: t("สาขา"), value: doc.sellerBranch },
            ],
          },
          {
            title: t("ผู้ซื้อ"),
            rows: [
              { label: t("ชื่อ"), value: doc.buyerName },
              { label: t("เลขผู้เสียภาษี"), value: doc.buyerTaxId },
              { label: t("สาขา"), value: doc.buyerBranch },
              {
                label: doc.sourceType === "ADVANCE_RECEIPT" ? t("รับเงินล่วงหน้า") : t("ใบแจ้งหนี้"),
                value: doc.advanceReceiptId ? (
                  <Link href={advanceReceiptRoutes.detail(doc.advanceReceiptId)}>{doc.invoiceNo}</Link>
                ) : doc.salesInvoiceId ? (
                  <Link href={arRoutes.detail(doc.salesInvoiceId)}>{doc.invoiceNo}</Link>
                ) : (
                  doc.invoiceNo
                ),
              },
            ],
          },
        ]}
      >
        {doc.status === "CANCELLED" ? (
          <Tag color="default" style={{ marginBottom: 12 }}>
            {t("ยกเลิกแล้ว")}
            {doc.cancelReason ? ` — ${doc.cancelReason}` : ""}
          </Tag>
        ) : null}
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={doc.items ?? []}
        />
        <div style={{ marginTop: 16, marginLeft: "auto", maxWidth: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>{t("ยอดก่อน VAT")}</span>
            <strong>{formatMoney(beforeVat)}</strong>
          </div>
          {(doc.advanceDeductions ?? []).map((row) => (
            <div key={row.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>
                {t("หักเงินล่วงหน้า {docNo}", { docNo: row.docNo })}
                {` (${t("ก่อน VAT {base} / VAT {vat}", {
                  base: formatMoney(row.baseAmount),
                  vat: formatMoney(row.vatAmount),
                })})`}
              </span>
              <strong>
                {doc.vatMode === "INCLUSIVE"
                  ? formatMoney(row.amount)
                  : formatMoney(row.baseAmount)}
              </strong>
            </div>
          ))}
          {(doc.advanceDeductions ?? []).length > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>{t("ฐานภาษีหลังหักมัดจำ")}</span>
              <strong>
                {formatMoney(
                  taxBaseAfterAdvance(
                    beforeVat,
                    (doc.advanceDeductions ?? []).map((row) => ({
                      baseAmount: Number(row.baseAmount) || 0,
                    })),
                  ),
                )}
              </strong>
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>
              {rate && rate > 0
                ? t("ภาษีมูลค่าเพิ่ม {rate}%", { rate })
                : t("ภาษีมูลค่าเพิ่ม")}
            </span>
            <strong>{formatMoney(doc.vatAmount)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{t("ยอดรวม")}</span>
            <strong>{formatMoney(doc.totalAmount)}</strong>
          </div>
        </div>
      </DocumentPaper>
      <Modal
        open={reasonOpen}
        title={t("ยกเลิกใบกำกับภาษี")}
        okText={t("ยกเลิกเอกสาร")}
        cancelText={t("ปิด")}
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        confirmLoading={cancelMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => {
          setReasonOpen(false);
          setReason("");
        }}
        onOk={async () => {
          await cancelMutation.mutateAsync({ id: doc.id, reason: reason.trim() });
          setReasonOpen(false);
          setReason("");
        }}
      >
        <p>{t("ยกเลิกแล้วจึงจะยกเลิกใบแจ้งหนี้ใบนี้ได้")}</p>
        <Input.TextArea
          value={reason}
          rows={3}
          maxLength={500}
          placeholder={t("เหตุผล")}
          onChange={(event) => setReason(event.target.value)}
        />
      </Modal>
    </div>
  );
}
