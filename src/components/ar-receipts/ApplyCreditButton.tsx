"use client";

import { useState } from "react";
import { Button, Form, Input, InputNumber, Modal } from "antd";

import { money } from "@/components/ap-documents/apDocumentConfig";
import {
  useApplyCreditMutation,
  useCustomerCreditQuery,
  useDepositStatusQuery,
} from "@/hooks/ar-receipts/useArReceipts";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useT } from "@/lib/i18n/useT";

type Props = {
  customerId: string;
  salesInvoiceId: string;
  /** ใบสั่งขายของ AR — ใช้ดึงมัดจำของ SO นี้มาหัก และกันใช้มัดจำของ SO อื่น */
  salesOrderId?: string;
  invoiceNo: string;
  /** ยอดค้างชำระของ AR */
  outstanding: number;
};

/** ปุ่ม "ใช้เครดิตลูกค้า" บนหน้ารายละเอียด AR — หักได้ไม่เกินเครดิตคงเหลือและยอดค้างของ AR */
export default function ApplyCreditButton({ customerId, salesInvoiceId, salesOrderId, invoiceNo, outstanding }: Props) {
  const t = useT();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_RECEIPTS");
  const credit = useCustomerCreditQuery(perms.canAdd ? customerId : undefined);
  const mutation = useApplyCreditMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ amount: number; remark?: string }>();

  const deposit = useDepositStatusQuery(perms.canAdd ? salesOrderId : undefined);
  const balance = Number(credit.data?.balance ?? 0);
  // ใช้ได้จริง = เครดิตคงเหลือ − มัดจำที่ยังไม่ใช้ของ SO อื่น (backend บังคับกติกานี้ด้วย) · ไม่มีข้อมูล SO = ใช้เครดิตทั้งหมดตามเดิม
  const usable = deposit.data?.usableCreditAmount !== undefined ? Number(deposit.data.usableCreditAmount) : balance;
  const depositAvailable = Number(deposit.data?.availableAmount ?? 0);
  const max = Math.min(balance, usable, outstanding);
  if (!perms.canAdd || max <= 0) return null;
  // มัดจำของ SO นี้ที่ยังไม่ได้หัก → เสนอเป็นค่าเริ่มต้น
  const suggested = Math.min(depositAvailable > 0 ? depositAvailable : max, max);

  return (
    <>
      <Button
        onClick={() => {
          form.setFieldsValue({ amount: suggested });
          setOpen(true);
        }}
      >
        {depositAvailable > 0
          ? t("หักมัดจำของ SO นี้ ({amount})", { amount: money.format(depositAvailable) })
          : t("ใช้เครดิตลูกค้า ({amount})", { amount: money.format(max) })}
      </Button>
      <Modal
        open={open}
        title={t("ใช้เครดิตหักยอด {no}", { no: invoiceNo })}
        okText={t("หักเครดิต")}
        cancelText={t("ยกเลิก")}
        confirmLoading={mutation.isPending}
        mask={{ closable: false }}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <p style={{ marginTop: 0, color: "#8a9199" }}>
          {t("เครดิตคงเหลือ {credit} · ค้างชำระ {due}", {
            credit: money.format(balance),
            due: money.format(outstanding),
          })}
        </p>
        {depositAvailable > 0 ? (
          <p style={{ marginTop: 0 }}>
            {t("มัดจำของ SO นี้ที่ยังไม่ได้หัก {amount}", { amount: money.format(depositAvailable) })}
          </p>
        ) : null}
        {usable < balance ? (
          <p style={{ marginTop: 0, color: "#d46b08" }}>
            {t("เครดิต {amount} เป็นมัดจำที่จองไว้กับใบสั่งขายอื่น — หักกับ AR นี้ไม่ได้", {
              amount: money.format(balance - usable),
            })}
          </p>
        ) : null}
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            try {
              await mutation.mutateAsync({
                customerId,
                salesInvoiceId,
                amount: v.amount,
                remark: v.remark?.trim() || undefined,
              });
              setOpen(false);
            } catch {
              // hook แจ้ง error แล้ว
            }
          }}
        >
          <Form.Item
            name="amount"
            label={t("จำนวนเงินที่หัก")}
            rules={[
              { required: true, message: t("ระบุจำนวนเงิน") },
              { type: "number", min: 0.01, max, message: t("ต้องมากกว่า 0 และไม่เกินเครดิต/ยอดค้าง") },
            ]}
          >
            <InputNumber precision={2} min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={5000} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
