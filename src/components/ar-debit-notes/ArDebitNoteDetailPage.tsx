"use client";

import PageLoading from "@/components/common/PageLoading";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Breadcrumb, Button, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Table, Tag } from "antd";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import DocumentPaper from "@/components/common/DocumentPaper";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import {
  useArDebitNoteQuery,
  useCancelArDebitNoteMutation,
  useConfirmArDebitNoteMutation,
  useUpdateArDebitNoteMutation,
} from "@/hooks/ar-adjustments/useArAdjustments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useT } from "@/lib/i18n/useT";
import { AR_DEBIT_BASE, arRoutes } from "@/lib/sales/ar-routes";
import { AR_DEBIT_STATUS_COLOR, AR_DEBIT_STATUS_LABEL, type ArDebitNote } from "@/types/ar-adjustments";

const SCREEN_CODE = "FINANCE_RECEIVABLE_DEBIT_NOTES";

export default function ArDebitNoteDetailPage({ id }: { id: string }) {
  const t = useT();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const query = useArDebitNoteQuery(id);
  if (!perms.canView) return <AccessDenied screenCodes={[SCREEN_CODE]} />;
  if (query.isLoading) {
    return <PageLoading />;
  }
  if (!query.data) {
    return (
      <div style={{ padding: 24 }}>
        {t("ไม่พบใบเพิ่มหนี้")}
        <div style={{ marginTop: 12 }}>
          <Link href={AR_DEBIT_BASE}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }
  return <View note={query.data} canEdit={perms.canEdit} canApprove={perms.canApprove} />;
}

function View({ note, canEdit, canApprove }: { note: ArDebitNote; canEdit: boolean; canApprove: boolean }) {
  const t = useT();
  const router = useRouter();
  const { modal, message } = App.useApp();
  const printPdf = async () => {
    const { generateArDebitNotePdf } = await import("@/utils/generateArDocumentsPdf");
    await generateArDebitNotePdf(note);
  };
  const confirmMutation = useConfirmArDebitNoteMutation();
  const cancelMutation = useCancelArDebitNoteMutation();
  const updateMutation = useUpdateArDebitNoteMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [form] = Form.useForm<{ debitNoteDate: dayjs.Dayjs; reason: string; subtotalAmount: number; vatPercent?: number; remark?: string }>();
  const isDraft = note.status === "DRAFT";
  const isPosted = note.status === "POSTED";
  const busy = confirmMutation.isPending || cancelMutation.isPending || updateMutation.isPending;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Breadcrumb items={[{ title: <Link href={AR_DEBIT_BASE}>{t("ใบเพิ่มหนี้ (ลูกหนี้)")}</Link> }, { title: note.debitNoteNo }]} />
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={note.debitNoteNo}
        subtitle={note.customerName ?? ""}
        actions={
          <>
            <Button onClick={() => router.push(AR_DEBIT_BASE)}>{t("กลับรายการ")}</Button>
            <Button
              onClick={() =>
                void printPdf().catch((e: unknown) =>
                  message.error(e instanceof Error ? e.message : t("พิมพ์ไม่สำเร็จ")),
                )
              }
            >
              {t("พิมพ์ PDF")}
            </Button>
            {isDraft && canEdit ? (
              <Button
                disabled={busy}
                onClick={() => {
                  form.setFieldsValue({
                    debitNoteDate: dayjs(note.debitNoteDate),
                    reason: note.reason,
                    subtotalAmount: Number(note.subtotalAmount),
                    vatPercent: Number(note.vatPercent),
                    remark: note.remark ?? undefined,
                  });
                  setEditOpen(true);
                }}
              >
                {t("แก้ไข")}
              </Button>
            ) : null}
            {isDraft && canApprove ? (
              <Button
                type="primary"
                loading={confirmMutation.isPending}
                disabled={busy}
                onClick={() =>
                  modal.confirm({
                    title: t("ยืนยันใบเพิ่มหนี้ {no}?", { no: note.debitNoteNo }),
                    content: t("ยอดค้างชำระของ {inv} จะเพิ่มขึ้น {amount}", { inv: note.invoiceNo ?? "AR", amount: money.format(Number(note.totalAmount)) }),
                    okText: t("ยืนยัน"),
                    cancelText: t("ยกเลิก"),
                    onOk: async () => {
                      try {
                        await confirmMutation.mutateAsync(note.id);
                      } catch {
                        // hook แจ้ง error แล้ว (ยกเลิกยืนยันตัวตนไม่แจ้ง)
                      }
                    },
                  })
                }
              >
                {t("ยืนยันใบเพิ่มหนี้")}
              </Button>
            ) : null}
            {(isDraft || isPosted) && canEdit ? (
              <Button danger disabled={busy} onClick={() => setCancelOpen(true)}>
                {t("ยกเลิก")}
              </Button>
            ) : null}
          </>
        }
      />
      <DocumentPaper
        titleTh={t("ใบเพิ่มหนี้")}
        titleEn="DEBIT NOTE"
        meta={[
          { label: t("เลขที่เอกสาร"), value: note.debitNoteNo },
          { label: t("วันที่เอกสาร"), value: formatThaiDate(note.debitNoteDate) },
        ]}
      >
      <div style={{ background: "var(--ant-color-bg-container, #fff)", padding: 16, borderRadius: 12 }}>
        <Descriptions
          column={{ xs: 1, md: 2, xl: 3 }}
          size="small"
          items={[
            { key: "st", label: t("สถานะ"), children: <Tag color={AR_DEBIT_STATUS_COLOR[note.status] ?? "default"}>{t(AR_DEBIT_STATUS_LABEL[note.status] ?? note.status)}</Tag> },
            { key: "d", label: t("วันที่"), children: formatThaiDate(note.debitNoteDate) },
            { key: "inv", label: t("ใบตั้งลูกหนี้ที่เพิ่มยอด"), children: <Link href={arRoutes.detail(note.salesInvoiceId)}>{note.invoiceNo}</Link> },
            { key: "invd", label: t("วันที่เอกสารต้นทาง"), children: note.invoiceDate ? formatThaiDate(note.invoiceDate) : "—" },
            { key: "tax", label: t("ใบกำกับ"), children: note.taxInvoiceNo || "—" },
            { key: "taxd", label: t("วันที่ใบกำกับ"), children: note.taxInvoiceDate ? formatThaiDate(note.taxInvoiceDate) : "—" },
            { key: "rs", label: t("เหตุผล"), children: note.reason },
            { key: "sub", label: t("ยอดเพิ่ม (ก่อน VAT)"), children: money.format(Number(note.subtotalAmount)) },
            { key: "vat", label: `VAT ${Number(note.vatPercent)}%`, children: money.format(Number(note.vatAmount)) },
            { key: "tot", label: t("ยอดรวม"), children: <strong>{money.format(Number(note.totalAmount))}</strong> },
            ...(note.status === "CANCELLED" ? [{ key: "cr", label: t("เหตุผลที่ยกเลิก"), children: note.cancelReason || "—" }] : []),
            { key: "rm", label: t("หมายเหตุ"), children: note.remark || "—" },
          ]}
        />
        {note.items?.length ? (
          <Table
            style={{ marginTop: 12 }}
            size="small"
            pagination={false}
            rowKey="salesInvoiceItemId"
            dataSource={note.items}
            columns={[
              { title: t("รหัส"), dataIndex: "itemCode" },
              { title: t("สินค้า"), dataIndex: "itemName" },
              { title: t("จำนวน"), dataIndex: "quantity", align: "right" },
              { title: t("ราคาต่อหน่วย"), dataIndex: "unitPrice", align: "right", render: (v: string) => money.format(Number(v)) },
              { title: t("มูลค่าก่อน VAT"), dataIndex: "amount", align: "right", render: (v: string) => money.format(Number(v)) },
              { title: "VAT", dataIndex: "vatAmount", align: "right", render: (v: string) => money.format(Number(v)) },
              { title: t("ยอดรวม"), dataIndex: "lineTotal", align: "right", render: (v: string) => money.format(Number(v)) },
            ]}
          />
        ) : null}
      </div>
      </DocumentPaper>
      <ESignatureHistoryCard documentId={note.id} />

      <Modal
        open={editOpen}
        title={t("แก้ไขใบเพิ่มหนี้")}
        okText={t("บันทึก")}
        cancelText={t("ยกเลิก")}
        confirmLoading={updateMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setEditOpen(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              await updateMutation.mutateAsync({
                id: note.id,
                body: {
                  salesInvoiceId: note.salesInvoiceId,
                  debitNoteDate: v.debitNoteDate.format("YYYY-MM-DD"),
                  reason: v.reason.trim(),
                  subtotalAmount: v.subtotalAmount,
                  vatPercent: v.vatPercent,
                  remark: v.remark?.trim() || undefined,
                },
              });
              setEditOpen(false);
            } catch {
              // hook แจ้ง error แล้ว
            }
          }}
        >
          <Form.Item name="debitNoteDate" label={t("วันที่")} rules={[{ required: true, message: t("ระบุวันที่") }]}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="reason" label={t("เหตุผล")} rules={[{ required: true, message: t("ระบุเหตุผล") }]}>
            <Input maxLength={2000} />
          </Form.Item>
          <Form.Item name="subtotalAmount" label={t("ยอดเพิ่ม (ก่อน VAT)")} rules={[{ required: true, message: t("ระบุจำนวนเงิน") }, { type: "number", min: 0.01, message: t("ต้องมากกว่า 0") }]}>
            <InputNumber precision={2} min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="vatPercent" label={t("VAT % (เว้นว่าง = ตามใบสั่งขาย)")}>
            <InputNumber precision={2} min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={cancelOpen}
        title={t("ยกเลิกใบเพิ่มหนี้ {no}", { no: note.debitNoteNo })}
        okText={t("ยกเลิกใบเพิ่มหนี้")}
        cancelText={t("ปิด")}
        okButtonProps={{ danger: true, disabled: isPosted && reason.trim().length < 5 }}
        confirmLoading={cancelMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        afterOpenChange={(v) => { if (!v) setReason(""); }}
        onCancel={() => setCancelOpen(false)}
        onOk={async () => {
          try {
            await cancelMutation.mutateAsync({ id: note.id, reason: reason.trim() || undefined });
            setCancelOpen(false);
          } catch {
            // hook แจ้ง error แล้ว
          }
        }}
      >
        {isPosted ? (
          <p style={{ marginTop: 0, color: "#8a9199" }}>{t("ยกเลิกได้เมื่อยอดที่เพิ่มยังไม่ถูกรับชำระ — ยอดค้างของ AR จะลดลงตามเดิม")}</p>
        ) : null}
        <Input.TextArea rows={4} maxLength={2000} showCount placeholder={isPosted ? t("เหตุผลที่ยกเลิก (บังคับ อย่างน้อย 5 ตัวอักษร)") : t("เหตุผลที่ยกเลิก (ถ้ามี)")} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </section>
  );
}
