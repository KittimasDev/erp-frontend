"use client";

import PageLoading from "@/components/common/PageLoading";

import { useState } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, DatePicker, Descriptions, Input, InputNumber, Select, Space, Table, Typography, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import {
  useApproveSalesCreditNoteMutation,
  useCancelSalesCreditNoteMutation,
  useConfirmSalesCreditNoteMutation,
  useUpdateSalesCreditNoteMutation,
  useUploadSalesCreditNoteAttachmentMutation,
} from "@/hooks/sales-credit-notes/useSalesCreditNoteMutations";
import {
  useSalesCreditNoteAttachmentsQuery,
  useSalesCreditNoteQuery,
} from "@/hooks/sales-credit-notes/useSalesCreditNotesQuery";
import { createReturnNoteFromCreditNote } from "@/lib/api/sales-credit-notes";
import { getAccessToken } from "@/lib/auth/token";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  SALES_CREDIT_NOTE_REASON_LABEL,
  salesCreditNoteStatusLabel,
  type SalesCreditNote,
} from "@/types/sales-credit-notes";
import PageHeader from "@/components/common/PageHeader";
import DocumentPaper from "@/components/common/DocumentPaper";
import CreditNoteSettlementCard from "./CreditNoteSettlementCard";

function useMoney() {
  const lang = useLanguage();
  return { format: (value: number) => formatMoney(value, lang) };
}

type DraftLine = {
  key: string;
  pendingId?: string | null;
  salesInvoiceItemId?: string | null;
  itemCode: string;
  itemName: string;
  unitName: string;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  discountAmount: number;
  adjustmentAmount: number;
};

function canEdit() {
  if (isAdministrator()) return true;
  if (isMatrixPermissionMode())
    return hasPermission("FINANCE_RECEIVABLE_CREDIT_NOTES.EDIT");
  return (
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER)
  );
}

function canApprove() {
  if (isAdministrator()) return true;
  if (isMatrixPermissionMode()) {
    return hasPermission("FINANCE_RECEIVABLE_CREDIT_NOTES.APPROVE");
  }
  return userHasRole(RoleCode.SALES_MANAGER);
}

function lineAmount(line: DraftLine, vatMode: string, vatRate: number) {
  const valueOnly = line.quantity <= 0;
  const gross = valueOnly ? Math.max(0, line.adjustmentAmount) : line.quantity * line.unitPrice;
  const discount = valueOnly
    ? 0
    : Math.min(Math.max(0, line.discountAmount), Math.max(0, gross));
  const net = Math.max(0, gross - discount);
  if (vatMode === "NONE" || vatRate <= 0) {
    return { gross, discount, net, vat: 0, total: net };
  }
  if (vatMode === "INCLUSIVE") {
    const vat = (net * vatRate) / (100 + vatRate);
    return { gross, discount, net: net - vat, vat, total: net };
  }
  const vat = (net * vatRate) / 100;
  return { gross, discount, net, vat, total: net + vat };
}

export default function SalesCreditNoteDetailPage({ id }: { id: string }) {
  const { message, modal } = App.useApp();
  const t = useT();
  const router = useRouter();
  const query = useSalesCreditNoteQuery(id);
  const attachments = useSalesCreditNoteAttachmentsQuery(id);
  const note = query.data;

  if (query.isLoading) {
    return <PageLoading label="กำลังโหลดใบลดหนี้" />;
  }
  if (!note) {
    return <Typography.Text>{t("ไม่พบใบลดหนี้")}</Typography.Text>;
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space>
        <Link href="/finance/receivables/credit-notes">{t("กลับหน้ารายการ")}</Link>
      </Space>
      {note.status === "DRAFT" && canEdit() ? (
        <DraftEditor
          note={note}
          onSaved={() => message.success(t("บันทึกใบลดหนี้แล้ว"))}
        />
      ) : (
        <ReadOnlyNote note={note} />
      )}
      <AttachmentCard
        id={id}
        files={attachments.data ?? []}
        canUpload={note.status !== "COMPLETED" && note.status !== "CANCELLED"}
      />
      <ESignatureHistoryCard documentId={id} />
      <ActionBar
        note={note}
        onDone={(text) => {
          message.success(text);
          if (text === t("ยกเลิกใบลดหนี้แล้ว"))
            router.push("/finance/receivables/credit-notes");
        }}
        confirm={(title, onOk) =>
          modal.confirm({
            title,
            okText: t("ยืนยัน"),
            cancelText: t("ปิด"),
            onOk,
          })
        }
      />
    </Space>
  );
}

function DraftEditor({
  note,
  onSaved,
}: {
  note: SalesCreditNote;
  onSaved: () => void;
}) {
  const { message } = App.useApp();
  const t = useT();
  const lang = useLanguage();
  const money = useMoney();
  const update = useUpdateSalesCreditNoteMutation(note.id);
  const [date, setDate] = useState<Dayjs>(dayjs(note.creditNoteDate));
  const [reasonCode, setReasonCode] = useState(note.reasonCode ?? "PRICE_REDUCTION");
  const [reason, setReason] = useState(note.reason ?? "");
  const [remark, setRemark] = useState(note.remark ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    note.items.map((item) => ({
      key: item.id,
      pendingId: item.pendingId,
      salesInvoiceItemId: item.salesInvoiceItemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unitName: item.unitName,
      quantity: item.quantity,
      remainingQuantity: item.remainingQuantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      adjustmentAmount: item.quantity <= 0 ? item.amount : 0,
    })),
  );

  const preview = lines.map((line) => lineAmount(line, note.vatMode, note.vatRate));
  const gross = preview.reduce((sum, row) => sum + row.gross, 0);
  const discount = preview.reduce((sum, row) => sum + row.discount, 0);
  const subtotal = preview.reduce((sum, row) => sum + row.net, 0);
  const vat = preview.reduce((sum, row) => sum + row.vat, 0);
  const total = preview.reduce((sum, row) => sum + row.total, 0);

  const columns: ColumnsType<DraftLine> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: t("รหัส"), dataIndex: "itemCode", width: 110 },
    { title: t("สินค้า"), dataIndex: "itemName" },
    { title: t("หน่วย"), dataIndex: "unitName", width: 80 },
    {
      title: t("จำนวน"),
      width: 140,
      render: (_, line, index) => (
        <InputNumber
          min={0}
          max={line.pendingId ? line.remainingQuantity : undefined}
          value={line.quantity}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, quantity: Number(value ?? 0) } : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: t("ราคาต่อหน่วย"),
      width: 150,
      render: (_, line, index) => (
        <InputNumber
          min={0}
          value={line.unitPrice}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, unitPrice: Number(value ?? 0) } : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: t("ส่วนลด"),
      width: 140,
      render: (_, line, index) => (
        <InputNumber
          min={0}
          value={line.discountAmount}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index
                  ? { ...row, discountAmount: Number(value ?? 0) }
                  : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: t("ลดเฉพาะมูลค่า"),
      width: 140,
      render: (_, line, index) => (
        <InputNumber
          min={0}
          disabled={line.quantity > 0}
          value={line.adjustmentAmount}
          style={{ width: "100%" }}
          onChange={(value) =>
            setLines((current) =>
              current.map((row, rowIndex) =>
                rowIndex === index ? { ...row, adjustmentAmount: Number(value ?? 0) } : row,
              ),
            )
          }
        />
      ),
    },
    {
      title: t("มูลค่าก่อน VAT"),
      width: 140,
      align: "right",
      render: (_, __, index) => money.format(preview[index]?.net ?? 0),
    },
    {
      title: "VAT",
      width: 110,
      align: "right",
      render: (_, __, index) => money.format(preview[index]?.vat ?? 0),
    },
    {
      title: t("ยอดรวม"),
      width: 130,
      align: "right",
      render: (_, __, index) => money.format(preview[index]?.total ?? 0),
    },
  ];

  async function save() {
    try {
      if (!note.salesInvoiceId) {
        message.error(t("ใบลดหนี้ใบนี้ยังไม่ผูกใบแจ้งหนี้"));
        return;
      }
      if (reason.trim().length < 5) {
        message.error(t("ระบุข้อความเหตุผลอย่างน้อย 5 ตัวอักษร"));
        return;
      }
      await update.mutateAsync({
        salesInvoiceId: note.salesInvoiceId,
        salesTaxInvoiceId: note.salesTaxInvoiceId ?? undefined,
        creditNoteDate: date.format("YYYY-MM-DD"),
        reasonCode,
        reason: reason.trim(),
        isReturn: reasonCode === "GOODS_RETURN",
        remark,
        items: lines.map((line) => ({
          pendingId: line.pendingId ?? undefined,
          salesInvoiceItemId: line.salesInvoiceItemId ?? undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          adjustmentAmount: line.quantity <= 0 ? line.adjustmentAmount : undefined,
        })),
      });
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("บันทึกไม่สำเร็จ"));
    }
  }

  return (
    <>
      <PageHeader
        title={`${note.creditNoteNo} · ${salesCreditNoteStatusLabel("DRAFT", lang)}`}
        actions={
          <Button type="primary" loading={update.isPending} onClick={save}>
            {t("บันทึก")}
          </Button>
        }
      />

      <Card>
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap>
          <DatePicker value={date} format="DD/MM/BBBB" onChange={(value) => value && setDate(value)} />
          <Typography.Text>{t("ลูกค้า")} {note.customerName}</Typography.Text>
          <Typography.Text>SO {note.salesOrderNo}</Typography.Text>
          <Typography.Text>{t("ใบส่ง")} {note.deliveryOrderNo || "—"}</Typography.Text>
          <Typography.Text>{t("ใบแจ้งหนี้")} {note.invoiceNo || "—"}</Typography.Text>
          <Typography.Text>{t("ใบกำกับ")} {note.taxInvoiceNo || "—"}</Typography.Text>
        </Space>
        <Select
          value={reasonCode}
          style={{ minWidth: 220 }}
          onChange={setReasonCode}
          options={Object.entries(SALES_CREDIT_NOTE_REASON_LABEL).map(([value, label]) => ({
            value,
            label: t(label),
          }))}
        />
        <Input
          placeholder={t("ข้อความเหตุผล")}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Input.TextArea
          placeholder={t("หมายเหตุ")}
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          rows={2}
        />
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          columns={columns}
          dataSource={lines}
        />
        <Descriptions column={1} size="small" style={{ maxWidth: 360, marginLeft: "auto" }}>
          <Descriptions.Item label={t("ยอดก่อนลด")}>{money.format(gross)}</Descriptions.Item>
          <Descriptions.Item label={t("ส่วนลด")}>{money.format(discount)}</Descriptions.Item>
          <Descriptions.Item label={t("มูลค่าก่อน VAT")}>{money.format(subtotal)}</Descriptions.Item>
          <Descriptions.Item label="VAT">{money.format(vat)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดรวมที่ลด")}>{money.format(total)}</Descriptions.Item>
        </Descriptions>
      </Space>
          </Card>
    </>
  );
}

function ReadOnlyNote({ note }: { note: SalesCreditNote }) {
  const t = useT();
  const lang = useLanguage();
  const money = useMoney();
  return (
    <>
      <PageHeader title={`${note.creditNoteNo} · ${salesCreditNoteStatusLabel(note.status, lang)}`} />

      <DocumentPaper
        titleTh={t("ใบลดหนี้")}
        titleEn="CREDIT NOTE"
        meta={[
          { label: t("เลขที่เอกสาร"), value: note.creditNoteNo },
          { label: t("วันที่เอกสาร"), value: dayjs(note.creditNoteDate).format("DD/MM/BBBB") },
        ]}
      >
      <Card>
      <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t("วันที่")}>{dayjs(note.creditNoteDate).format("DD/MM/BBBB")}</Descriptions.Item>
        <Descriptions.Item label={t("ลูกค้า")}>{note.customerName}</Descriptions.Item>
        <Descriptions.Item label={t("ใบสั่งขาย")}>{note.salesOrderNo}</Descriptions.Item>
        <Descriptions.Item label={t("ใบส่งสินค้า")}>{note.deliveryOrderNo || "—"}</Descriptions.Item>
        <Descriptions.Item label={t("ใบแจ้งหนี้")}>{note.invoiceNo || "—"}</Descriptions.Item>
        <Descriptions.Item label={t("ใบกำกับ")}>{note.taxInvoiceNo || "—"}</Descriptions.Item>
        <Descriptions.Item label={t("วันที่เอกสารต้นทาง")}>
          {note.invoiceDate ? dayjs(note.invoiceDate).format("DD/MM/BBBB") : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t("มูลค่าเดิม")}>{money.format(note.sourceTotalAmount ?? 0)}</Descriptions.Item>
        <Descriptions.Item label={t("รหัสเหตุผล")}>
          {t(SALES_CREDIT_NOTE_REASON_LABEL[note.reasonCode ?? ""] ?? note.reasonCode ?? "—")}
        </Descriptions.Item>
        <Descriptions.Item label={t("เหตุผล")}>{note.reason || "—"}</Descriptions.Item>
        {note.cancelReason ? (
          <Descriptions.Item label={t("เหตุผลที่ยกเลิก")}>{note.cancelReason}</Descriptions.Item>
        ) : null}
        <Descriptions.Item label={t("หมายเหตุ")}>{note.remark || "—"}</Descriptions.Item>
        <Descriptions.Item label={t("ผู้สร้าง")}>{note.createdByName || "—"}</Descriptions.Item>
        <Descriptions.Item label={t("ผู้อนุมัติ")}>
          {note.approvedByName || "—"}
          {note.approvedAt
            ? ` · ${dayjs(note.approvedAt).format("DD/MM/BBBB HH:mm")}`
            : ""}
        </Descriptions.Item>
      </Descriptions>
      {note.items.some((item) => (item.deliveryReturnedQuantity ?? 0) > 0) ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={t("ใบส่งสินค้าต้นทางมีของตีกลับ — ตรวจว่าใบลดหนี้นี้ไม่ลดซ้ำกับของที่ตีกลับ")}
          description={t("ดูคอลัมน์ «ใบส่ง: รับ / ตีกลับ» · ใบแจ้งหนี้ที่คิดเฉพาะของที่ลูกค้ารับ ไม่ต้องลดหนี้ของที่ตีกลับอีก")}
        />
      ) : null}
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={note.items}
        columns={[
          { title: t("รหัส"), dataIndex: "itemCode" },
          { title: t("สินค้า"), dataIndex: "itemName" },
          { title: t("จำนวน"), dataIndex: "quantity", align: "right" },
          { title: t("หน่วย"), dataIndex: "unitName" },
          ...(note.items.some((item) => (item.deliveryReturnedQuantity ?? 0) > 0)
            ? [
                {
                  title: t("ใบส่ง: รับ / ตีกลับ"),
                  key: "deliveryQty",
                  align: "right" as const,
                  render: (_: unknown, item: (typeof note.items)[number]) =>
                    item.deliveryAcceptedQuantity === undefined
                      ? "—"
                      : `${item.deliveryAcceptedQuantity} / ${item.deliveryReturnedQuantity ?? 0}`,
                },
              ]
            : []),
          {
            title: t("ราคาต่อหน่วย"),
            dataIndex: "unitPrice",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: t("ส่วนลด"),
            dataIndex: "discountAmount",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: t("มูลค่าก่อน VAT"),
            dataIndex: "amount",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: "VAT",
            dataIndex: "vatAmount",
            align: "right",
            render: (value: number) => money.format(value),
          },
          {
            title: t("ยอดรวม"),
            dataIndex: "lineTotal",
            align: "right",
            render: (value: number) => money.format(value),
          },
        ]}
      />
      <Descriptions column={1} size="small" style={{ maxWidth: 360, marginLeft: "auto", marginTop: 12 }}>
        <Descriptions.Item label={t("ยอดก่อนลด")}>{money.format(note.grossAmount)}</Descriptions.Item>
        <Descriptions.Item label={t("ส่วนลด")}>{money.format(note.discountAmount)}</Descriptions.Item>
        <Descriptions.Item label={t("มูลค่าก่อน VAT")}>{money.format(note.subtotalAmount)}</Descriptions.Item>
        <Descriptions.Item label="VAT">{money.format(note.vatAmount)}</Descriptions.Item>
        <Descriptions.Item label={t("ยอดรวมที่ลด")}>{money.format(note.totalAmount)}</Descriptions.Item>
      </Descriptions>
          </Card>
      </DocumentPaper>
      {note.status === "COMPLETED" ? <CreditNoteSettlementCard creditNoteId={note.id} /> : null}
    </>
  );
}

function AttachmentCard({
  id,
  files,
  canUpload,
}: {
  id: string;
  files: Array<{ id: string; originalFileName?: string }>;
  canUpload: boolean;
}) {
  const { message } = App.useApp();
  const t = useT();
  const upload = useUploadSalesCreditNoteAttachmentMutation(id);
  return (
    <Card title={t("เอกสารแนบ")}>
      <Space orientation="vertical">
        {files.map((file) => (
          <Typography.Text key={file.id}>
            {file.originalFileName || file.id}
          </Typography.Text>
        ))}
        {files.length === 0 ? (
          <Typography.Text type="secondary">{t("ยังไม่มีเอกสารแนบ")}</Typography.Text>
        ) : null}
        {canUpload ? (
          <Upload
            showUploadList={false}
            beforeUpload={(file) => {
              upload.mutate(file, {
                onSuccess: () => message.success(t("แนบเอกสารแล้ว")),
                onError: (error) =>
                  message.error(
                    error instanceof Error ? error.message : t("แนบเอกสารไม่สำเร็จ"),
                  ),
              });
              return false;
            }}
          >
            <Button loading={upload.isPending}>{t("แนบเอกสาร")}</Button>
          </Upload>
        ) : null}
      </Space>
    </Card>
  );
}

function ActionBar({
  note,
  onDone,
  confirm,
}: {
  note: SalesCreditNote;
  onDone: (text: string) => void;
  confirm: (title: string, onOk: () => Promise<void>) => void;
}) {
  const { message, modal } = App.useApp();
  const t = useT();
  const confirmNote = useConfirmSalesCreditNoteMutation(note.id);
  const approveNote = useApproveSalesCreditNoteMutation(note.id);
  const cancelNote = useCancelSalesCreditNoteMutation(note.id);

  async function run(
    action: () => Promise<unknown>,
    success: string,
  ) {
    try {
      await action();
      onDone(success);
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("ทำรายการไม่สำเร็จ"));
    }
  }

  async function printPdf() {
    const { generateSalesCreditNotePdf } = await import(
      "@/utils/generateSalesCreditNotePdf"
    );
    await generateSalesCreditNotePdf({
      creditNoteNo: note.creditNoteNo,
      creditNoteDate: dayjs(note.creditNoteDate).format("DD/MM/BBBB"),
      customerName: note.customerName,
      salesOrderNo: note.salesOrderNo,
      deliveryOrderNo: note.deliveryOrderNo ?? "",
      invoiceNo: note.invoiceNo ?? "",
      invoiceDate: note.invoiceDate ? dayjs(note.invoiceDate).format("DD/MM/BBBB") : "",
      taxInvoiceNo: note.taxInvoiceNo ?? "",
      taxInvoiceDate: note.taxInvoiceDate ? dayjs(note.taxInvoiceDate).format("DD/MM/BBBB") : "",
      sourceTotalAmount: note.sourceTotalAmount ?? 0,
      reason: note.reason ?? "",
      remark: note.remark ?? "",
      grossAmount: note.grossAmount,
      discountAmount: note.discountAmount,
      subtotalAmount: note.subtotalAmount,
      vatAmount: note.vatAmount,
      vatRate: note.vatRate,
      totalAmount: note.totalAmount,
      createdByName: note.createdByName,
      approvedByName: note.approvedByName,
      items: note.items.map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode,
        itemName: item.itemName,
        unit: item.unitName,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        amount: item.amount,
      })),
    });
  }

  return (
    <Space>
      {note.status === "DRAFT" && canEdit() ? (
        <>
          <Button
            type="primary"
            loading={confirmNote.isPending}
            onClick={() =>
              confirm(t("ยืนยันใบลดหนี้และส่งรออนุมัติ"), () =>
                run(() => confirmNote.mutateAsync(), t("ส่งรออนุมัติแล้ว")),
              )
            }
          >
            {t("ยืนยัน")}
          </Button>
          <Button
            danger
            loading={cancelNote.isPending}
            onClick={() =>
              confirm(t("ยกเลิกใบลดหนี้ร่าง จำนวนจะกลับเข้าคิว"), () =>
                run(() => cancelNote.mutateAsync({}), t("ยกเลิกใบลดหนี้แล้ว")),
              )
            }
          >
            {t("ยกเลิก")}
          </Button>
        </>
      ) : null}
      {note.status === "PENDING_APPROVAL" && canEdit() ? (
        <Button
          danger
          loading={cancelNote.isPending}
          onClick={() =>
            confirm(t("ยกเลิกใบลดหนี้ที่รออนุมัติ"), () =>
              run(() => cancelNote.mutateAsync({}), t("ยกเลิกใบลดหนี้แล้ว")),
            )
          }
        >
          {t("ยกเลิก")}
        </Button>
      ) : null}
      {note.status === "PENDING_APPROVAL" && canApprove() ? (
        <Button
          type="primary"
          loading={approveNote.isPending}
          onClick={() =>
            confirm(t("อนุมัติใบลดหนี้เป็นฉบับเสร็จสิ้น"), () =>
              run(() => approveNote.mutateAsync(), t("อนุมัติใบลดหนี้แล้ว")),
            )
          }
        >
          {t("อนุมัติ")}
        </Button>
      ) : null}
      {note.status === "COMPLETED" ? (
        <>
          <Button onClick={() => printPdf().catch((error: unknown) =>
            message.error(error instanceof Error ? error.message : t("พิมพ์ไม่สำเร็จ")),
          )}>
            {t("พิมพ์ PDF")}
          </Button>
          {note.returnNoteId ? (
            <Link href={`/return-notes/${note.returnNoteId}`}>
              <Button>
                {t("ดูใบรับคืน")}
                {note.returnNoteNo ? ` ${note.returnNoteNo}` : ""}
              </Button>
            </Link>
          ) : note.canCreateReturnNote !== false &&
          note.isReturn &&
          note.deliveryOrderId &&
          note.returnToStock !== false ? (
            <Button
              onClick={() =>
                confirm(t("สร้างใบรับคืนจากใบลดหนี้ใบนี้"), async () => {
                  try {
                    const res = await createReturnNoteFromCreditNote(getAccessToken(), note.id);
                    onDone(t("สร้างใบรับคืนแล้ว"));
                    window.location.assign(`/return-notes/${res.data.id}`);
                  } catch (error) {
                    message.error(error instanceof Error ? error.message : t("สร้างใบรับคืนไม่สำเร็จ"));
                  }
                })
              }
            >
              {t("สร้างใบรับคืน")}
            </Button>
          ) : null}
          {canEdit() ? (
            <Button
              danger
              loading={cancelNote.isPending}
              onClick={() => {
                let reason = "";
                modal.confirm({
                  title: t("ยกเลิกใบลดหนี้ที่อนุมัติแล้ว"),
                  content: (
                    <Input.TextArea
                      rows={3}
                      placeholder={t("เหตุผลที่ยกเลิกอย่างน้อย 5 ตัวอักษร")}
                      onChange={(event) => {
                        reason = event.target.value;
                      }}
                    />
                  ),
                  okText: t("ยืนยัน"),
                  cancelText: t("ปิด"),
                  onOk: () =>
                    run(
                      () => cancelNote.mutateAsync({ reason: reason.trim() }),
                      t("ยกเลิกใบลดหนี้แล้ว"),
                    ),
                });
              }}
            >
              {t("ยกเลิก")}
            </Button>
          ) : null}
        </>
      ) : null}
    </Space>
  );
}
