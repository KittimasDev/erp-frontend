"use client";

import { useState } from "react";
import { Alert, App, Button, Card, DatePicker, Descriptions, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
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
import PageHeader from "@/components/common/PageHeader";

const SCREEN_CODE = "FINANCE_BILLING_NOTES";
const BASE_PATH = "/finance/payables/billing-notes";
const PV_PATH = "/finance/payables/payment-vouchers";

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const dateTime = (v?: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—");

/** Modal ออกใบสำคัญจ่าย — ส่งยอดเข้าคิวรอสร้าง PV (หน้า PV เดิม) */
function IssuePvModal({ note, onClose }: { note: BillingNoteDetail; onClose: () => void }) {
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
      title="ออกใบสำคัญจ่าย"
      onCancel={onClose}
      okText="ยืนยัน"
      cancelText="ปิด"
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: invalid }}
      onOk={async () => {
        try {
          await mutation.mutateAsync({ amount: amount as number, desiredPayDate: payDate?.format("YYYY-MM-DD") });
          message.success("ส่งรายการเข้าคิวรอสร้างใบสำคัญจ่ายแล้ว");
          onClose();
        } catch (e) {
          message.error(errText(e, "ออกใบสำคัญจ่ายไม่สำเร็จ"));
        }
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          ยอดคงเหลือที่ออกได้ {money.format(note.remainingAmount)} บาท — ออกได้หลายใบ แต่รวมกันต้องไม่เกินยอดวางบิล
        </Typography.Text>
        <Space>
          <Typography.Text>ยอดที่ออก PV</Typography.Text>
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
          <Typography.Text>วันที่ต้องการจ่าย</Typography.Text>
          <DatePicker format="DD/MM/YYYY" value={payDate} onChange={(v) => setDateInput(v)} />
        </Space>
        <Typography.Text type="secondary">
          ระบบจัดสรรยอดให้ใบตั้งหนี้แต่ละใบอัตโนมัติ · หัก ณ ที่จ่ายกรอกต่อในฟอร์มใบสำคัญจ่าย
        </Typography.Text>
      </Space>
    </Modal>
  );
}

/** Modal ยกเลิกใบวางบิล — ใบที่ยืนยันแล้วต้องระบุเหตุผล */
function CancelModal({ note, onClose }: { note: BillingNoteDetail; onClose: () => void }) {
  const { message } = App.useApp();
  const mutation = useCancelBillingNoteMutation(note.id);
  const [reason, setReason] = useState("");
  const needReason = note.status === "CONFIRMED";
  const tooShort = needReason && reason.trim().length < 5;
  return (
    <Modal
      open
      title={`ยกเลิกใบวางบิล ${note.billingNo}`}
      onCancel={onClose}
      okText="ยกเลิกใบวางบิล"
      okButtonProps={{ danger: true, disabled: tooShort }}
      cancelText="ปิด"
      confirmLoading={mutation.isPending}
      onOk={async () => {
        try {
          await mutation.mutateAsync(reason.trim() || undefined);
          message.success("ยกเลิกใบวางบิลแล้ว คืนยอดให้ใบตั้งหนี้เรียบร้อย");
          onClose();
        } catch (e) {
          message.error(errText(e, "ยกเลิกใบวางบิลไม่สำเร็จ"));
        }
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        {needReason ? (
          <Typography.Text type="secondary">
            ถ้ามีใบสำคัญจ่ายที่ออกจากใบนี้และยังมีผลอยู่ ระบบจะไม่ให้ยกเลิก ต้องยกเลิกใบสำคัญจ่ายก่อน
          </Typography.Text>
        ) : null}
        <Input.TextArea
          rows={3}
          maxLength={1000}
          placeholder={needReason ? "เหตุผลการยกเลิก (อย่างน้อย 5 ตัวอักษร)" : "เหตุผล (ไม่บังคับ)"}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Space>
    </Modal>
  );
}

export default function BillingNoteDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions(SCREEN_CODE);
  const query = useBillingNoteDetailQuery(id);
  const confirmMutation = useConfirmBillingNoteMutation();
  const [modal, setModal] = useState<"issue" | "cancel" | null>(null);
  const n = query.data;

  if (query.error) {
    return (
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert type="error" showIcon message={errText(query.error, "โหลดใบวางบิลไม่สำเร็จ")} />
        <Button onClick={() => router.push(BASE_PATH)}>กลับไปหน้ารายการ</Button>
      </Space>
    );
  }
  if (!n) return <Card loading />;

  const itemColumns: ColumnsType<BillingNoteDetailItem> = [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
    {
      title: "เลขที่ AP",
      dataIndex: "docNo",
      render: (v: string, r) => <Link href={`/finance/payables/ap-invoices/${r.apId}`}>{v}</Link>,
    },
    {
      title: "เลขที่ PO",
      dataIndex: "poNo",
      render: (v: string | undefined, r) =>
        v && r.purchaseOrderId ? <Link href={`/purchase-orders/${r.purchaseOrderId}`}>{v}</Link> : "—",
    },
    { title: "วันครบกำหนด", dataIndex: "dueDate", render: (v?: string) => formatThaiDate(v) },
    { title: "ยอดวางบิล (จัดสรรให้ AP)", dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    { title: "ออก PV แล้ว", dataIndex: "issuedAmount", align: "right", render: (v: number) => money.format(v) },
    {
      title: "คงเหลือออก PV",
      key: "left",
      align: "right",
      render: (_v, r) => money.format(Math.max(r.amount - r.issuedAmount, 0)),
    },
  ];

  const pvColumns: ColumnsType<BillingNotePv> = [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_: unknown, __: unknown, index: number) => index + 1,
      },
    { title: "เลขที่คิว", dataIndex: "queueNo" },
    { title: "วันที่ส่งเข้าคิว", dataIndex: "createdAt", render: (v: string) => dateTime(v) },
    { title: "ยอด", dataIndex: "amount", align: "right", render: (v: number) => money.format(v) },
    {
      title: "สถานะ",
      dataIndex: "queueStatus",
      render: (v: string) => (
        <Tag color={v === "CANCELLED" ? "red" : v === "PV_CREATED" ? "green" : "gold"}>
          {BILLING_QUEUE_STATUS_LABEL[v] ?? v}
        </Tag>
      ),
    },
    {
      title: "ใบสำคัญจ่าย",
      key: "voucher",
      render: (_v, r) =>
        r.voucherId ? (
          <Link href={`${PV_PATH}/${r.voucherId}`}>{r.voucherNo ?? "ดูใบสำคัญจ่าย"}</Link>
        ) : r.queueStatus === "PENDING" ? (
          <Link href={PV_PATH}>ไปสร้างที่หน้าใบสำคัญจ่าย</Link>
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
        title={<>ใบวางบิล {n.billingNo}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(BASE_PATH)}>
            กลับ
          </Button>
          </>
        }
        meta={
          <>
<Tag color={BILLING_NOTE_STATUS_COLOR[n.status] ?? "default"}>{BILLING_NOTE_STATUS_LABEL[n.status] ?? n.status}</Tag>
{isConfirmed ? (
            <Tag color={BILLING_PV_STATUS_COLOR[n.pvStatus] ?? "default"}>{BILLING_PV_STATUS_LABEL[n.pvStatus] ?? n.pvStatus}</Tag>
          ) : null}
          </>
        }
        actions={
          <>
          {isDraft && perms.canEdit ? (
            <>
              <Button onClick={() => router.push(`${BASE_PATH}/${n.id}/edit`)}>แก้ไข</Button>
              <Popconfirm
                title="ยืนยันใบวางบิล?"
                description="ยืนยันแล้วระบบจะจองยอดของ AP และแก้ไขยอดโดยตรงไม่ได้"
                okText="ยืนยัน"
                cancelText="ยกเลิก"
                onConfirm={async () => {
                  try {
                    await confirmMutation.mutateAsync(n.id);
                    message.success("ยืนยันใบวางบิลแล้ว");
                  } catch (e) {
                    message.error(errText(e, "ยืนยันใบวางบิลไม่สำเร็จ"));
                  }
                }}
              >
                <Button type="primary" loading={confirmMutation.isPending}>
                  ยืนยันใบวางบิล
                </Button>
              </Popconfirm>
            </>
          ) : null}
          {isConfirmed && perms.canEdit ? (
            <Button type="primary" disabled={n.remainingAmount <= 0} onClick={() => setModal("issue")}>
              ออกใบสำคัญจ่าย
            </Button>
          ) : null}
          {(isDraft || isConfirmed) && perms.canDelete ? (
            <Button danger onClick={() => setModal("cancel")}>
              ยกเลิก
            </Button>
          ) : null}
        
          </>
        }
      />

      {n.status === "CANCELLED" ? (
        <Alert
          type="error"
          showIcon
          message={`ยกเลิกเมื่อ ${dateTime(n.cancelledAt)}${n.cancelledByName ? ` โดย ${n.cancelledByName}` : ""}`}
          description={n.cancelReason ? `เหตุผล: ${n.cancelReason}` : undefined}
        />
      ) : null}

      <Card title="ข้อมูลเอกสาร">
        <Descriptions column={{ xs: 1, md: 2 }} bordered size="small">
          <Descriptions.Item label="เลขที่ใบวางบิล">{n.billingNo}</Descriptions.Item>
          <Descriptions.Item label="วันที่">{formatThaiDate(n.billingDate)}</Descriptions.Item>
          <Descriptions.Item label="สถานะ">{BILLING_NOTE_STATUS_LABEL[n.status] ?? n.status}</Descriptions.Item>
          <Descriptions.Item label="ผู้ขาย">
            {n.creditorCode} {n.creditorName}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="รายการใบตั้งหนี้ (AP)">
        <Table<BillingNoteDetailItem>
          rowKey="apId"
          columns={itemColumns}
          dataSource={n.items}
          pagination={false}
          scroll={{ x: 900 }}
        />
      </Card>

      <Card title="สรุปยอด">
        <Descriptions column={{ xs: 1, md: 3 }} bordered size="small">
          <Descriptions.Item label="ยอดวางบิลรวม">{money.format(n.totalAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดออก PV แล้ว">{money.format(n.issuedPvAmount)}</Descriptions.Item>
          <Descriptions.Item label="ยอดที่ออก PV เพิ่มได้">{money.format(isConfirmed ? n.remainingAmount : 0)}</Descriptions.Item>
        </Descriptions>
      </Card>

      {n.pvs.length > 0 ? (
        <Card title="รายการใบสำคัญจ่ายที่ออกจากใบวางบิลนี้">
          <Table<BillingNotePv> rowKey="queueItemId" columns={pvColumns} dataSource={n.pvs} pagination={false} />
        </Card>
      ) : null}

      <Card title="ข้อมูลเพิ่มเติม">
        <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label="วันที่นัดชำระ">{formatThaiDate(n.appointmentDate)}</Descriptions.Item>
          <Descriptions.Item label="หมายเหตุ">{n.remark || "—"}</Descriptions.Item>
        </Descriptions>
        <DocumentAttachmentsPanel
          documentType="BILLING_NOTE"
          documentId={n.id}
          canEdit={isDraft && perms.canEdit}
          emptyText="ไม่มีเอกสารแนบ"
        />
      </Card>

      <Card title="ผู้ดำเนินการ">
        <Descriptions column={{ xs: 1, md: 3 }} size="small">
          <Descriptions.Item label="ผู้สร้าง">
            {n.createdByName ?? "—"} · {dateTime(n.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="ผู้ยืนยัน">
            {n.confirmedAt ? `${n.confirmedByName ?? "—"} · ${dateTime(n.confirmedAt)}` : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="ผู้ยกเลิก">
            {n.cancelledAt ? `${n.cancelledByName ?? "—"} · ${dateTime(n.cancelledAt)}` : "—"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {modal === "issue" ? <IssuePvModal note={n} onClose={() => setModal(null)} /> : null}
      {modal === "cancel" ? <CancelModal note={n} onClose={() => setModal(null)} /> : null}
    </Space>
  );
}
