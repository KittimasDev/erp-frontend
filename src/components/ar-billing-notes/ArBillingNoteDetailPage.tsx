"use client";

import PageLoading from "@/components/common/PageLoading";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Breadcrumb, Button, DatePicker, Descriptions, Form, Input, Modal, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import AccessDenied from "@/components/auth/AccessDenied";
import PageHeader from "@/components/common/PageHeader";
import DocumentPaper from "@/components/common/DocumentPaper";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import pageStyles from "@/components/ar-billing-notes/ar-billing-notes-page.module.css";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useArBillingNoteQuery,
  useCancelArBillingNoteMutation,
  useConfirmArBillingNoteMutation,
  useUpdateArBillingNoteMutation,
} from "@/hooks/ar-billing-notes/useArBillingNotes";
import { useT } from "@/lib/i18n/useT";
import { arBillingRoutes, arRoutes } from "@/lib/sales/ar-routes";
import {
  AR_BILLING_STATUS_COLOR,
  AR_BILLING_STATUS_LABEL,
  type ArBillingNote,
  type ArBillingNoteItem,
} from "@/types/ar-billing-notes";

const SCREEN_CODE = "FINANCE_AR_BILLING_NOTES";

export default function ArBillingNoteDetailPage({ id }: { id: string }) {
  const t = useT();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const query = useArBillingNoteQuery(id);

  if (!perms.canView) {
    return <AccessDenied screenCodes={[SCREEN_CODE]} />;
  }
  if (query.isLoading) {
    return <PageLoading />;
  }
  if (!query.data) {
    return (
      <div style={{ padding: 24 }}>
        {t("ไม่พบใบวางบิล")}
        <div style={{ marginTop: 12 }}>
          <Link href={arBillingRoutes.list}>{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }
  return (
    <DetailView
      note={query.data}
      canEdit={perms.canEdit}
      canApprove={perms.canApprove}
    />
  );
}

function DetailView({
  note,
  canEdit,
  canApprove,
}: {
  note: ArBillingNote;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { modal, message } = App.useApp();
  const printPdf = async () => {
    const { generateArBillingNotePdf } = await import("@/utils/generateArDocumentsPdf");
    await generateArBillingNotePdf(note);
  };
  const confirmMutation = useConfirmArBillingNoteMutation();
  const cancelMutation = useCancelArBillingNoteMutation();
  const updateMutation = useUpdateArBillingNoteMutation();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editForm] = Form.useForm<{
    billingDate: dayjs.Dayjs;
    appointmentDate?: dayjs.Dayjs;
    remark?: string;
  }>();

  const isDraft = note.status === "DRAFT";
  const isConfirmed = note.status === "CONFIRMED";
  const busy =
    confirmMutation.isPending ||
    cancelMutation.isPending ||
    updateMutation.isPending;

  const save = (
    salesInvoiceIds: string[],
    header?: { billingDate?: string; appointmentDate?: string; remark?: string },
  ) =>
    updateMutation.mutateAsync({
      id: note.id,
      body: {
        customerId: note.customerId,
        salesInvoiceIds,
        billingDate: header?.billingDate ?? note.billingDate,
        appointmentDate: header
          ? header.appointmentDate
          : (note.appointmentDate ?? undefined),
        remark: header ? header.remark : (note.remark ?? undefined),
      },
    });

  const columns: ColumnsType<ArBillingNoteItem> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      dataIndex: "id",
      width: 84,
      align: "center",
      render: (_v, _r, index) => (
        <span className={pageStyles.index}>{index + 1}</span>
      ),
    },
    {
      title: t("เลขที่ AR"),
      dataIndex: "invoiceNo",
      render: (v: string, r) => <Link href={arRoutes.detail(r.salesInvoiceId)}>{v}</Link>,
    },
    {
      title: t("วันที่ AR"),
      dataIndex: "invoiceDate",
      width: 110,
      render: (v: string) => formatThaiDate(v),
    },
    { title: t("ใบสั่งขาย"), dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
    {
      title: t("ยอดรวม AR"),
      dataIndex: "invoiceTotalAmount",
      align: "right",
      render: (v: string) => money.format(Number(v)),
    },
    {
      title: t("ยอดที่วางบิล"),
      dataIndex: "amount",
      align: "right",
      render: (v: string) => <strong>{money.format(Number(v))}</strong>,
    },
    {
      title: t("ค้างชำระปัจจุบัน"),
      dataIndex: "currentOutstanding",
      align: "right",
      render: (v: string, r) => {
        const changed = Math.abs(Number(v) - Number(r.amount)) > 0.005;
        return (
          <span style={changed ? { color: "#d46b08" } : undefined}>
            {money.format(Number(v))}
          </span>
        );
      },
    },
    {
      title: t("วันครบกำหนด"),
      dataIndex: "dueDate",
      width: 120,
      render: (v?: string | null) => formatThaiDate(v),
    },
    ...(isDraft && canEdit
      ? [
          {
            title: "",
            key: "remove",
            width: 100,
            render: (_v: unknown, r: ArBillingNoteItem) => (
              <Button
                size="small"
                danger
                disabled={note.items.length <= 1 || busy}
                onClick={() =>
                  modal.confirm({
                    title: t("นำ {no} ออกจากใบวางบิล?", { no: r.invoiceNo }),
                    okText: t("นำออก"),
                    cancelText: t("ยกเลิก"),
                    okButtonProps: { danger: true },
                    onOk: async () => {
                      try {
                        await save(
                          note.items
                            .filter((i) => i.id !== r.id)
                            .map((i) => i.salesInvoiceId),
                        );
                      } catch {
                        // hook แจ้ง error แล้ว
                      }
                    },
                  })
                }
              >
                {t("นำออก")}
              </Button>
            ),
          },
        ]
      : []),
  ];

  const outstandingChanged = note.items.some(
    (i) => Math.abs(Number(i.currentOutstanding) - Number(i.amount)) > 0.005,
  );

  return (
    <section className={pageStyles.detailPage}>
      <Breadcrumb
        items={[
          { title: <Link href={arBillingRoutes.list}>{t("ใบวางบิล (ลูกหนี้)")}</Link> },
          { title: note.billingNo },
        ]}
      />
      <PageHeader
        eyebrow="FINANCE · RECEIVABLES"
        title={note.billingNo}
        subtitle={
          <>
            {note.customerCode ? `${note.customerCode} ` : ""}
            {note.customerName ?? ""}
          </>
        }
        actions={
          <>
            <Button onClick={() => router.push(arBillingRoutes.list)}>
              {t("กลับรายการ")}
            </Button>
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
                  editForm.setFieldsValue({
                    billingDate: dayjs(note.billingDate),
                    appointmentDate: note.appointmentDate
                      ? dayjs(note.appointmentDate)
                      : undefined,
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
                    title: t("ยืนยันใบวางบิล {no}?", { no: note.billingNo }),
                    content: t(
                      "ระบบจะคำนวณยอดค้างชำระล่าสุดของแต่ละ AR ใหม่ก่อนยืนยัน",
                    ),
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
                {t("ยืนยันใบวางบิล")}
              </Button>
            ) : null}
            {(isDraft || isConfirmed) && canEdit ? (
              <Button danger disabled={busy} onClick={() => setCancelOpen(true)}>
                {t("ยกเลิก")}
              </Button>
            ) : null}
          </>
        }
      />

      {isDraft && outstandingChanged ? (
        <Alert
          type="warning"
          showIcon
          title={t("ยอดค้างชำระของบาง AR เปลี่ยนไปแล้ว — ตอนยืนยัน ระบบจะอัปเดตยอดวางบิลเป็นยอดล่าสุด")}
        />
      ) : null}

      <DocumentPaper
        titleTh={t("ใบวางบิล")}
        titleEn="BILLING NOTE"
        meta={[
          { label: t("เลขที่เอกสาร"), value: note.billingNo },
          { label: t("วันที่เอกสาร"), value: formatThaiDate(note.billingDate) },
          { label: t("วันนัดรับเงิน"), value: formatThaiDate(note.appointmentDate) },
        ]}
      >
      <div className={pageStyles.detailCard}>
        <Descriptions
          column={{ xs: 1, md: 2, xl: 3 }}
          size="middle"
          items={[
            {
              key: "status",
              label: t("สถานะ"),
              children: (
                <Tag color={AR_BILLING_STATUS_COLOR[note.status] ?? "default"}>
                  {t(AR_BILLING_STATUS_LABEL[note.status] ?? note.status)}
                </Tag>
              ),
            },
            { key: "date", label: t("วันที่ใบวางบิล"), children: formatThaiDate(note.billingDate) },
            { key: "appt", label: t("วันนัดรับเงิน"), children: formatThaiDate(note.appointmentDate) },
            {
              key: "customer",
              label: t("ลูกค้า"),
              children: `${note.customerCode ?? ""} ${note.customerName ?? ""}`.trim() || "—",
            },
            {
              key: "total",
              label: t("ยอดวางบิลรวม"),
              children: <strong>{money.format(Number(note.totalAmount))}</strong>,
            },
            { key: "by", label: t("ผู้สร้าง"), children: note.createdByName ?? "—" },
            ...(note.confirmedAt
              ? [
                  {
                    key: "confirmed",
                    label: t("ยืนยันโดย"),
                    children: `${note.confirmedByName ?? "—"} · ${dayjs(note.confirmedAt).format("DD/MM/BBBB HH:mm")}`,
                  },
                ]
              : []),
            ...(note.status === "CANCELLED"
              ? [
                  {
                    key: "cancelled",
                    label: t("ยกเลิกโดย"),
                    children: `${note.cancelledByName ?? "—"}${note.cancelledAt ? ` · ${dayjs(note.cancelledAt).format("DD/MM/BBBB HH:mm")}` : ""}`,
                  },
                  {
                    key: "reason",
                    label: t("เหตุผลที่ยกเลิก"),
                    children: note.cancelReason || t("ไม่ได้ระบุเหตุผล"),
                  },
                ]
              : []),
            { key: "remark", label: t("หมายเหตุ"), children: note.remark || "—" },
          ]}
        />
      </div>

      <div className={pageStyles.detailCard}>
        <h3>
          {t("ใบตั้งลูกหนี้ในใบวางบิล ({n})", { n: note.items.length })}
        </h3>
        <Table
          className={pageStyles.table}
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={note.items}
          pagination={false}
          scroll={{ x: 1080 }}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <strong>{t("รวม")}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong>{money.format(Number(note.totalAmount))}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={isDraft && canEdit ? 3 : 2} />
            </Table.Summary.Row>
          )}
        />
      </div>

      </DocumentPaper>
      <ESignatureHistoryCard documentId={note.id} />

      <Modal
        open={editOpen}
        title={t("แก้ไขใบวางบิล")}
        okText={t("บันทึก")}
        cancelText={t("ยกเลิก")}
        confirmLoading={updateMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={async (values) => {
            try {
              await save(
                note.items.map((i) => i.salesInvoiceId),
                {
                  billingDate: values.billingDate.format("YYYY-MM-DD"),
                  appointmentDate: values.appointmentDate?.format("YYYY-MM-DD"),
                  remark: values.remark?.trim() || undefined,
                },
              );
              setEditOpen(false);
            } catch {
              // hook แจ้ง error แล้ว
            }
          }}
        >
          <Form.Item
            name="billingDate"
            label={t("วันที่ใบวางบิล")}
            rules={[{ required: true, message: t("ระบุวันที่") }]}
          >
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="appointmentDate" label={t("วันนัดรับเงิน")}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={cancelOpen}
        title={t("ยกเลิกใบวางบิล {no}", { no: note.billingNo })}
        okText={t("ยกเลิกใบวางบิล")}
        cancelText={t("ปิด")}
        okButtonProps={{
          danger: true,
          // ใบที่ยืนยันแล้วบังคับเหตุผล (ตรงกับ backend อย่างน้อย 5 ตัวอักษร)
          disabled: isConfirmed && cancelReason.trim().length < 5,
        }}
        confirmLoading={cancelMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        afterOpenChange={(visible) => {
          if (!visible) setCancelReason("");
        }}
        onCancel={() => setCancelOpen(false)}
        onOk={async () => {
          try {
            await cancelMutation.mutateAsync({
              id: note.id,
              reason: cancelReason.trim() || undefined,
            });
            setCancelOpen(false);
          } catch {
            // hook แจ้ง error แล้ว
          }
        }}
      >
        <p style={{ marginTop: 0, color: "#8a9199" }}>
          {t("ยกเลิกแล้ว AR ในใบนี้จะกลับไปรอวางบิลใหม่ได้ (ไม่ยกเลิก AR)")}
        </p>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          showCount
          placeholder={
            isConfirmed ? t("เหตุผลที่ยกเลิก (บังคับ)") : t("เหตุผลที่ยกเลิก (ถ้ามี)")
          }
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>
    </section>
  );
}
