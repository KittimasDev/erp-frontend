"use client";

import { useState } from "react";
import { Alert, App, Button, Card, DatePicker, Descriptions, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatThaiDate, money } from "@/components/ap-documents/apDocumentConfig";
import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import {
  useBillingNoteDetailQuery,
  useCancelBillingNoteMutation,
  useConfirmBillingNoteMutation,
  useIssueBillingPvMutation,
} from "@/hooks/billing-notes/useBillingNotes";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  BILLING_NOTE_STATUS_COLOR,
  BILLING_NOTE_STATUS_LABEL,
  BILLING_PV_STATUS_COLOR,
  BILLING_PV_STATUS_LABEL,
  BILLING_QUEUE_STATUS_LABEL,
  type BillingNoteDetail,
  type BillingNoteDetailItem,
  type BillingNotePv,
} from "@/types/billing-notes";
import { tFin } from "@/components/payment-vouchers/paymentVoucherUtils";
import { useT } from "@/lib/i18n/useT";
import PageHeader from "@/components/common/PageHeader";

const SCREEN_CODE = "FINANCE_BILLING_NOTES";
const BASE_PATH = "/finance/payables/billing-notes";
const PV_PATH = "/finance/payables/payment-vouchers";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const dateTime = (v?: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—");

/** Modal ออกใบสำคัญจ่าย — ส่งยอดเข้าคิวรอสร้าง PV (หน้า PV เดิม) */
function IssuePvModal({ note, onClose }: { note: BillingNoteDetail; onClose: () => void }) {
  const t = useT();
  const { message } = App.useApp();
  const mutation = useIssueBillingPvMutation(note.id);
  const [amountInput, setAmountInput] = useState<number | null | undefined>(undefined);
  const [dateInput, setDateInput] = useState<Dayjs | null | undefined>(undefined);
  const amount = amountInput === undefined ? note.remainingAmount : amountInput;
  const payDate = dateInput === undefined ? (note.appointmentDate ? dayjs(note.appointmentDate) : null) : dateInput;
  const invalid = !(amount && amount > 0) || amount > note.remainingAmount + 0.004;

  return (
    <Modal
      open
      title={t("ออกใบสำคัญจ่าย")}
      onCancel={onClose}
      okText={t("ยืนยัน")}
      cancelText={t("ปิด")}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: invalid }}
      onOk={async () => {
        try {
          await mutation.mutateAsync({ amount: amount as number, desiredPayDate: payDate?.format("YYYY-MM-DD") });
          message.success(t("ส่งรายการเข้าคิวรอสร้างใบสำคัญจ่ายแล้ว"));
          onClose();
        } catch (e) {
          message.error(errText(e, t("ออกใบสำคัญจ่ายไม่สำเร็จ")));
        }
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          {t("ยอดคงเหลือที่ออกได้ {amount} บาท — ออกได้หลายใบ แต่รวมกันต้องไม่เกินยอดวางบิล", { amount: money.format(note.remainingAmount) })}
        </Typography.Text>
        <Space>
          <Typography.Text>{t("ยอดที่ออก PV")}</Typography.Text>
          <InputNumber
            min={0}
            max={note.remainingAmount}
            precision={2}
            style={{ width: 160 }}
            status={invalid ? "error" : undefined}
            value={amount}
            onChange={(v) => setAmountInput(v)}
          />
        </Space>
        <Space>
          <Typography.Text>{t("วันที่ต้องการจ่าย")}</Typography.Text>
          <DatePicker format="DD/MM/YYYY" value={payDate} onChange={(v) => setDateInput(v)} />
        </Space>
        <Typography.Text type="secondary">
          {t("ระบบจัดสรรยอดให้ใบตั้งหนี้แต่ละใบอัตโนมัติ · หัก ณ ที่จ่ายกรอกต่อในฟอร์มใบสำคัญจ่าย")}
        </Typography.Text>
      </Space>
    </Modal>
  );
}

/** Modal ยกเลิกใบวางบิล — ใบที่ยืนยันแล้วต้องระบุเหตุผล */
function CancelModal({ note, onClose }: { note: BillingNoteDetail; onClose: () => void }) {
  const t = useT();
  const { message } = App.useApp();
  const mutation = useCancelBillingNoteMutation(note.id);
  const [reason, setReason] = useState("");
  const needReason = note.status === "CONFIRMED";
  const tooShort = needReason && reason.trim().length < 5;
  return (
    <Modal
      open
      title={t("ยกเลิกใบวางบิล {no}", { no: note.billingNo })}
      onCancel={onClose}
      okText={t("ยกเลิกใบวางบิล")}
      okButtonProps={{ danger: true, disabled: tooShort }}
      cancelText={t("ปิด")}
      confirmLoading={mutation.isPending}
      onOk={async () => {
        try {
          await mutation.mutateAsync(reason.trim() || undefined);
          message.success(t("ยกเลิกใบวางบิลแล้ว คืนยอดให้ใบตั้งหนี้เรียบร้อย"));
          onClose();
        } catch (e) {
          message.error(errText(e, t("ยกเลิกใบวางบิลไม่สำเร็จ")));
        }
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        {needReason ? (
          <Typography.Text type="secondary">
            {t("ถ้ามีใบสำคัญจ่ายที่ออกจากใบนี้และยังมีผลอยู่ ระบบจะไม่ให้ยกเลิก ต้องยกเลิกใบสำคัญจ่ายก่อน")}
          </Typography.Text>
        ) : null}
        <Input.TextArea
          rows={3}
          maxLength={1000}
          placeholder={needReason ? t("เหตุผลการยกเลิก (อย่างน้อย 5 ตัวอักษร)") : t("เหตุผล (ไม่บังคับ)")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Space>
    </Modal>
  );
}

export default function BillingNoteDetailPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const query = useBillingNoteDetailQuery(id);
  const confirmMutation = useConfirmBillingNoteMutation();
  const [modal, setModal] = useState<"issue" | "cancel" | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const n = query.data;

  if (query.error) {
    return (
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert type="error" showIcon title={errText(query.error, t("โหลดใบวางบิลไม่สำเร็จ"))} />
        <Button onClick={() => router.push(BASE_PATH)}>{t("กลับไปหน้ารายการ")}</Button>
      </Space>
    );
  }
  if (!n) return <Card loading />;

  const handlePrintPdf = async () => {
    setPdfLoading(true);
    try {
      const { generateBillingNotePdf } = await import("@/utils/generateBillingNotePdf");
      await generateBillingNotePdf(n);
    } catch (e) {
      message.error(errText(e, t("สร้างไฟล์ PDF ไม่สำเร็จ")));
    } finally {
      setPdfLoading(false);
    }
  };

  const itemColumns: ColumnsType<BillingNoteDetailItem> = [
      {
        title: t("ลำดับ"),
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
    {
      title: t("เลขที่ AP"),
      dataIndex: "docNo",
      render: (v: string, r) => <Link href={`/finance/payables/ap-invoices/${r.apId}`}>{v}</Link>,
    },
    {
      title: t("เลขที่ PO"),
      dataIndex: "poNo",
      render: (v: string | undefined, r) =>
        v && r.purchaseOrderId ? <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link> : "—",
    },
    { title: t("วันครบกำหนด"), dataIndex: "dueDate", render: (v?: string) => formatThaiDate(v) },
    { title: t("ยอดวางบิล (จัดสรรให้ AP)"), dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    { title: t("ออก PV แล้ว"), dataIndex: "issuedAmount", align: "right", render: (v: number) => money.format(v) },
    {
      title: t("คงเหลือออก PV"),
      key: "left",
      align: "right",
      render: (_v, r) => money.format(Math.max(r.amount - r.issuedAmount, 0)),
    },
  ];

  const pvColumns: ColumnsType<BillingNotePv> = [
      {
        title: t("ลำดับ"),
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
    { title: t("เลขที่คิว"), dataIndex: "queueNo" },
    { title: t("วันที่ส่งเข้าคิว"), dataIndex: "createdAt", render: (v: string) => dateTime(v) },
    { title: t("ยอด"), dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    {
      title: t("สถานะ"),
      dataIndex: "queueStatus",
      render: (v: string) => (
        <Tag color={v === "CANCELLED" ? "red" : v === "PV_CREATED" ? "green" : "gold"}>
          {BILLING_QUEUE_STATUS_LABEL[v] ? tFin(BILLING_QUEUE_STATUS_LABEL[v]) : v}
        </Tag>
      ),
    },
    {
      title: t("ใบสำคัญจ่าย"),
      key: "voucher",
      render: (_v, r) =>
        r.voucherId ? (
          <Link href={`${PV_PATH}/${r.voucherId}`}>{r.voucherNo ?? t("ดูใบสำคัญจ่าย")}</Link>
        ) : r.queueStatus === "PENDING" ? (
          <Link href={PV_PATH}>{t("ไปสร้างที่หน้าใบสำคัญจ่าย")}</Link>
        ) : (
          "—"
        ),
    },
  ];

  const isDraft = n.status === "DRAFT";
  const isConfirmed = n.status === "CONFIRMED";

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{tFin("ใบวางบิล")} {n.billingNo}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(BASE_PATH)}>
            {t("กลับ")}
          </Button>
          </>
        }
        meta={
          <>
<Tag color={BILLING_NOTE_STATUS_COLOR[n.status] ?? "default"}>{BILLING_NOTE_STATUS_LABEL[n.status] ? tFin(BILLING_NOTE_STATUS_LABEL[n.status]) : n.status}</Tag>
{isConfirmed ? (
            <Tag color={BILLING_PV_STATUS_COLOR[n.pvStatus] ?? "default"}>{BILLING_PV_STATUS_LABEL[n.pvStatus] ? tFin(BILLING_PV_STATUS_LABEL[n.pvStatus]) : n.pvStatus}</Tag>
          ) : null}
          </>
        }
        actions={
          <>
          <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={() => void handlePrintPdf()}>
            {t("พิมพ์ PDF")}
          </Button>
          {isDraft && perms.canEdit ? (
            <>
              <Button onClick={() => router.push(`${BASE_PATH}/${n.id}/edit`)}>{t("แก้ไข")}</Button>
              <Popconfirm
                title={t("ยืนยันใบวางบิล?")}
                description={t("ยืนยันแล้วระบบจะจองยอดของ AP และแก้ไขยอดโดยตรงไม่ได้")}
                okText={t("ยืนยัน")}
                cancelText={t("ยกเลิก")}
                onConfirm={async () => {
                  try {
                    await confirmMutation.mutateAsync(n.id);
                    message.success(t("ยืนยันใบวางบิลแล้ว"));
                  } catch (e) {
                    message.error(errText(e, t("ยืนยันใบวางบิลไม่สำเร็จ")));
                  }
                }}
              >
                <Button type="primary" loading={confirmMutation.isPending}>
                  {t("ยืนยันใบวางบิล")}
                </Button>
              </Popconfirm>
            </>
          ) : null}
          {isConfirmed && perms.canEdit ? (
            <Button type="primary" disabled={n.remainingAmount <= 0} onClick={() => setModal("issue")}>
              {t("ออกใบสำคัญจ่าย")}
            </Button>
          ) : null}
          {(isDraft || isConfirmed) && perms.canDelete ? (
            <Button danger onClick={() => setModal("cancel")}>
              {t("ยกเลิก")}
            </Button>
          ) : null}
        
          </>
        }
      />

      {n.status === "CANCELLED" ? (
        <Alert
          type="error"
          showIcon
          title={`${t("ยกเลิกเมื่อ")} ${dateTime(n.cancelledAt)}${n.cancelledByName ? ` ${t("โดย")} ${n.cancelledByName}` : ""}`}
          description={n.cancelReason ? `${t("เหตุผล")}: ${n.cancelReason}` : undefined}
        />
      ) : null}

      <Card title={t("ข้อมูลเอกสาร")}>
        <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
          <Descriptions.Item label={t("เลขที่ใบวางบิล")}>{n.billingNo}</Descriptions.Item>
          <Descriptions.Item label={t("วันที่")}>{formatThaiDate(n.billingDate)}</Descriptions.Item>
          <Descriptions.Item label={t("สถานะ")}>{BILLING_NOTE_STATUS_LABEL[n.status] ? tFin(BILLING_NOTE_STATUS_LABEL[n.status]) : n.status}</Descriptions.Item>
          <Descriptions.Item label={t("ผู้ขาย")}>
            {n.creditorCode} {n.creditorName}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t("รายการใบตั้งหนี้ (AP)")}>
        <Table<BillingNoteDetailItem>
          rowKey="apId"
          columns={itemColumns}
          dataSource={n.items}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Card title={t("สรุปยอด")}>
        <Descriptions column={{ xs: 1, md: 3 }} bordered size="small">
          <Descriptions.Item label={t("ยอดวางบิลรวม")}>{money.format(n.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดออก PV แล้ว")}>{money.format(n.issuedPvAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดที่ออก PV เพิ่มได้")}>{money.format(isConfirmed ? n.remainingAmount : 0)}</Descriptions.Item>
        </Descriptions>
      </Card>

      {n.pvs.length > 0 ? (
        <Card title={t("รายการใบสำคัญจ่ายที่ออกจากใบวางบิลนี้")}>
          <Table<BillingNotePv> rowKey="queueItemId" columns={pvColumns} dataSource={n.pvs} pagination={false} />
        </Card>
      ) : null}

      <Card title={t("ข้อมูลเพิ่มเติม")}>
        <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label={t("วันที่นัดชำระ")}>{formatThaiDate(n.appointmentDate)}</Descriptions.Item>
          <Descriptions.Item label={t("หมายเหตุ")}>{n.remark || "—"}</Descriptions.Item>
        </Descriptions>
        <DocumentAttachmentsPanel
          documentType="BILLING_NOTE"
          documentId={n.id}
          canEdit={isDraft && perms.canEdit}
          emptyText={t("ไม่มีเอกสารแนบ")}
        />
      </Card>

      <Card title={t("ผู้ดำเนินการ")}>
        <Descriptions column={{ xs: 1, md: 3 }} size="small">
          <Descriptions.Item label={t("ผู้สร้าง")}>
            {n.createdByName ?? "—"} · {dateTime(n.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label={t("ผู้ยืนยัน")}>
            {n.confirmedAt ? `${n.confirmedByName ?? "—"} · ${dateTime(n.confirmedAt)}` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label={t("ผู้ยกเลิก")}>
            {n.cancelledAt ? `${n.cancelledByName ?? "—"} · ${dateTime(n.cancelledAt)}` : "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {modal === "issue" ? <IssuePvModal note={n} onClose={() => setModal(null)} /> : null}
      {modal === "cancel" ? <CancelModal note={n} onClose={() => setModal(null)} /> : null}
    </Space>
  );
}
