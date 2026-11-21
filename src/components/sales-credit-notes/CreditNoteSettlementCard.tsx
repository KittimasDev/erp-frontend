"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Form, Input, InputNumber, Modal, Radio, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { money } from "@/components/ap-documents/apDocumentConfig";
import {
  useCancelSettlementMutation,
  useCreditNoteSettlementsQuery,
  useSettleCreditNoteMutation,
} from "@/hooks/ar-adjustments/useArAdjustments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useT } from "@/lib/i18n/useT";
import { arRoutes } from "@/lib/sales/ar-routes";
import type { CreditNoteSettlement } from "@/types/ar-adjustments";

/**
 * ตัดยอดใบลดหนี้ที่อนุมัติแล้ว — หักยอด AR ของลูกค้าเดียวกัน หรือเข้าเครดิตลูกค้า (คืนเงินทำต่อที่หน้าคืนเงิน)
 * ตัดรวมได้ไม่เกินยอดใบลดหนี้ · ยกเลิกการตัดต้องมีเหตุผล
 */
export default function CreditNoteSettlementCard({ creditNoteId }: { creditNoteId: string }) {
  const t = useT();
  const perms = useScreenActionPermissions("FINANCE_RECEIVABLE_CREDIT_NOTES");
  const query = useCreditNoteSettlementsQuery(creditNoteId);
  const settleMutation = useSettleCreditNoteMutation();
  const cancelMutation = useCancelSettlementMutation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"OFFSET" | "CREDIT">("OFFSET");
  const [cancelTarget, setCancelTarget] = useState<CreditNoteSettlement | null>(null);
  const [reason, setReason] = useState("");
  const [form] = Form.useForm<{ salesInvoiceId?: string; amount: number; remark?: string }>();

  const data = query.data;
  if (!data) return null;
  const remaining = Number(data.remainingAmount);
  const selectedInvoice = (id?: string) => data.openInvoices.find((i) => i.id === id);

  const columns: ColumnsType<CreditNoteSettlement> = [
    { title: t("วันที่"), dataIndex: "createdAt", width: 130, render: (v: string) => dayjs(v).format("DD/MM/BBBB HH:mm") },
    {
      title: t("วิธีตัดยอด"),
      dataIndex: "settleType",
      render: (v: string, r) =>
        v === "OFFSET" ? (
          <span>
            {t("หักยอด AR")}{" "}
            {r.salesInvoiceId ? <Link href={arRoutes.detail(r.salesInvoiceId)}>{r.invoiceNo}</Link> : null}
          </span>
        ) : (
          t("เข้าเครดิตลูกค้า")
        ),
    },
    {
      title: t("ที่มา"),
      dataIndex: "origin",
      width: 110,
      render: (v?: string) => (v === "AUTO" ? t("อัตโนมัติ") : t("ตัดมือ")),
    },
    { title: t("จำนวนเงิน"), dataIndex: "amount", align: "right", render: (v: string) => money.format(Number(v)) },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      width: 110,
      render: (v: string, r) => (
        <span title={r.cancelReason ?? undefined}>
          <Tag color={v === "ACTIVE" ? "green" : "red"}>{v === "ACTIVE" ? t("ใช้งาน") : t("ยกเลิก")}</Tag>
        </span>
      ),
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_v, r) =>
        r.status === "ACTIVE" && perms.canEdit ? (
          <Button size="small" danger onClick={() => setCancelTarget(r)}>
            {t("ยกเลิก")}
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      style={{ marginTop: 16 }}
      title={t("การตัดยอดใบลดหนี้")}
      extra={
        perms.canEdit && remaining > 0 ? (
          <Button
            type="primary"
            onClick={() => {
              setType("OFFSET");
              form.resetFields();
              // AR ที่ตั้งจากใบส่งสินค้าใบเดียวกับใบลดหนี้ → เลือกให้ก่อน (ค้างน้อยกว่ายอดลด → ตัดเท่ายอดค้าง)
              const linked = data.openInvoices.find((i) => i.sameDelivery);
              form.setFieldsValue({
                salesInvoiceId: linked?.id,
                amount: linked ? Math.min(remaining, Number(linked.outstandingAmount)) : remaining,
              });
              setOpen(true);
            }}
          >
            {t("ตัดยอด")}
          </Button>
        ) : null
      }
    >
      {remaining > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={t("ใบลดหนี้นี้อนุมัติแล้วแต่ยังตัดยอดไม่ครบ — ยอด AR ของลูกค้ายังไม่ลดจนกว่าจะตัดยอด")}
          description={
            data.openInvoices.some((i) => i.sameDelivery)
              ? t("พบ AR ที่ตั้งจากใบส่งสินค้าใบเดียวกัน — กด \"ตัดยอด\" เพื่อหักกับใบนั้น")
              : undefined
          }
        />
      ) : null}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
        <span>{t("ยอดใบลดหนี้")}: <strong>{money.format(Number(data.totalAmount))}</strong></span>
        <span>{t("ตัดแล้ว")}: <strong>{money.format(Number(data.settledAmount))}</strong></span>
        <span>{t("คงเหลือ")}: <strong>{money.format(remaining)}</strong></span>
      </div>
      <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={data.settlements} locale={{ emptyText: t("ยังไม่ได้ตัดยอด") }} />

      <Modal
        open={open}
        title={t("ตัดยอดใบลดหนี้ {no}", { no: data.creditNoteNo })}
        okText={t("ตัดยอด")}
        cancelText={t("ยกเลิก")}
        confirmLoading={settleMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={t("ถ้า AR ถูกตั้งหลังตีกลับ ยอดนั้นไม่รวมของที่ตีกลับอยู่แล้ว ไม่ต้องตัดซ้ำ — ตัดเฉพาะ AR ที่ตั้งก่อนมีการตีกลับ")}
        />
        <Radio.Group value={type} onChange={(e) => { setType(e.target.value); form.setFieldValue("salesInvoiceId", undefined); }} style={{ marginBottom: 12 }}>
          <Radio value="OFFSET">{t("หักยอดใบตั้งลูกหนี้ (AR)")}</Radio>
          <Radio value="CREDIT">{t("เข้าเครดิตลูกค้า")}</Radio>
        </Radio.Group>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              await settleMutation.mutateAsync({
                id: creditNoteId,
                body: {
                  settleType: type,
                  salesInvoiceId: type === "OFFSET" ? v.salesInvoiceId : undefined,
                  amount: v.amount,
                  remark: v.remark?.trim() || undefined,
                },
              });
              setOpen(false);
            } catch {
              // hook แจ้ง error แล้ว
            }
          }}
        >
          {type === "OFFSET" ? (
            <Form.Item name="salesInvoiceId" label={t("ใบตั้งลูกหนี้ที่หักยอด")} rules={[{ required: true, message: t("เลือกใบตั้งลูกหนี้") }]}>
              <Select
                placeholder={t("เลือกใบตั้งลูกหนี้ของลูกค้านี้")}
                options={data.openInvoices.map((i) => ({
                  value: i.id,
                  label: `${i.invoiceNo} · ${t("ค้าง")} ${money.format(Number(i.outstandingAmount))}${i.sameDelivery ? ` · ${t("ใบส่งสินค้าเดียวกัน")}` : ""}`,
                }))}
                notFoundContent={t("ลูกค้ารายนี้ไม่มีใบตั้งลูกหนี้ค้างชำระ")}
              />
            </Form.Item>
          ) : null}
          <Form.Item
            noStyle
            shouldUpdate
          >
            {() => {
              const inv = selectedInvoice(form.getFieldValue("salesInvoiceId"));
              const max = type === "OFFSET" && inv ? Math.min(remaining, Number(inv.outstandingAmount)) : remaining;
              return (
                <Form.Item
                  name="amount"
                  label={t("จำนวนเงินที่ตัด (คงเหลือ {amount})", { amount: money.format(max) })}
                  rules={[
                    { required: true, message: t("ระบุจำนวนเงิน") },
                    { type: "number", min: 0.01, max, message: t("ต้องมากกว่า 0 และไม่เกินยอดคงเหลือ/ยอดค้าง") },
                  ]}
                >
                  <InputNumber precision={2} min={0} style={{ width: "100%" }} />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        title={t("ยกเลิกการตัดยอด")}
        okText={t("ยกเลิกการตัดยอด")}
        cancelText={t("ปิด")}
        okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
        confirmLoading={cancelMutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        afterOpenChange={(v) => { if (!v) setReason(""); }}
        onCancel={() => setCancelTarget(null)}
        onOk={async () => {
          if (!cancelTarget) return;
          try {
            await cancelMutation.mutateAsync({ id: cancelTarget.id, reason: reason.trim() });
            setCancelTarget(null);
          } catch {
            // hook แจ้ง error แล้ว
          }
        }}
      >
        <p style={{ marginTop: 0, color: "#8a9199" }}>{t("ยกเลิกแล้วยอดค้างของ AR กลับมา (หรือเครดิตจะถูกถอนออก)")}</p>
        <Input.TextArea rows={4} maxLength={2000} showCount placeholder={t("เหตุผลที่ยกเลิก (บังคับ อย่างน้อย 5 ตัวอักษร)")} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </Card>
  );
}
