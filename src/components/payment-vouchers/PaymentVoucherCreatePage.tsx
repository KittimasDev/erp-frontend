"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Card, Descriptions, Form, InputNumber, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { uploadVoucherAttachment } from "@/lib/api/payment-vouchers";
import { getAccessToken } from "@/lib/auth/token";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useCreateVoucherFromQueueMutation, useQueueContextQuery } from "@/hooks/payment-vouchers/usePaymentVouchers";
import PaymentMethodFields from "./PaymentMethodFields";
import PvAttachmentsPanel from "./PvAttachmentsPanel";
import {
  ApAllocationTable,
  ReferenceCard,
  SummaryCard,
  SupplierCard,
  TaxCard,
} from "./VoucherSections";
import { useT } from "@/lib/i18n/useT";
import { PV_BASE_PATH, fmtMoney, kindLabel, prorateAmount, referenceLine, tFin } from "./paymentVoucherUtils";
import { VOUCHER_STATUS_COLOR, VOUCHER_STATUS_LABEL } from "@/types/payment-vouchers";
import PageHeader from "@/components/common/PageHeader";

type FormValues = {
  voucherDate: Dayjs;
  paymentMethod: string;
  desiredPayDate?: Dayjs;
  companyBankAccountId?: string;
  remark?: string;
};

/** ฟอร์มสร้างใบสำคัญจ่ายจากรายการรอสร้าง — ข้อมูลต้นทางดึงอัตโนมัติ ไม่ต้องเลือกเอกสารอ้างอิงซ้ำ */
export default function PaymentVoucherCreatePage({ queueItemId }: { queueItemId: string }) {
  const t = useT();
  const router = useRouter();
  const { message } = App.useApp();
  const perms = useScreenActionPermissions("FINANCE_PAYMENT_VOUCHERS");
  const query = useQueueContextQuery(queueItemId);
  const create = useCreateVoucherFromQueueMutation();
  const [form] = Form.useForm<FormValues>();
  const ctx = query.data?.data;
  const item = ctx?.queueItem;

  const queueAmount = Number(item?.amount ?? 0);
  // ใบวางบิล และใบตั้งหนี้ที่ออก PV ตรง: ออก PV บางส่วนได้ (ยอดที่เหลือกลับเข้าคิว)
  const isBilling = item?.sourceType === "BILLING_NOTE" || item?.sourceType === "AP_INVOICE";
  // ค่าที่ผู้ใช้แก้เอง — ถ้ายังไม่แก้ใช้ค่าตั้งต้นจากคิว (ไม่ต้อง setState ใน effect)
  const [amountInput, setAmountInput] = useState<number | null>(null);
  const [allocInput, setAllocInput] = useState<Record<string, number>>({});
  const amount = amountInput ?? queueAmount;
  const allocs: Record<string, number> = Object.fromEntries(
    (ctx?.apDocuments ?? []).map((a) => [a.id, allocInput[a.id] ?? Number(a.allocatedAmount)]),
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ctx || !item) return;
    form.setFieldsValue({
      voucherDate: dayjs(),
      paymentMethod: "TRANSFER",
      desiredPayDate: item.desiredPayDate ? dayjs(item.desiredPayDate) : undefined,
      companyBankAccountId: ctx.defaultBankAccount?.id,
    });
  }, [ctx, item, form]);

  // ตัวอย่างยอดบนจอ — ตัวเลขจริงคิดที่ backend
  const wht = useMemo(
    () => (item ? prorateAmount(Number(item.whtAmount), amount, queueAmount) : 0),
    [item, amount, queueAmount],
  );
  const whtBase = useMemo(
    () => (item ? prorateAmount(Number(item.whtBaseAmount), amount, queueAmount) : 0),
    [item, amount, queueAmount],
  );
  const vat = useMemo(
    () => (item ? prorateAmount(Number(item.vatAmount), amount, queueAmount) : 0),
    [item, amount, queueAmount],
  );
  const net = Math.max(Math.round((amount - wht) * 100) / 100, 0);
  const partial = amount < queueAmount - 0.0001;
  const allocSum = ctx ? Math.round(Object.values(allocs).reduce((s, v) => s + (v || 0), 0) * 100) / 100 : 0;
  const hasAllocs = (ctx?.apDocuments.length ?? 0) > 0;
  const allocMismatch = hasAllocs && partial && Math.abs(allocSum - amount) > 0.001;

  if (query.isLoading) return <Spin />;
  if (!ctx || !item) {
    return <Alert type="error" showIcon title={t("ไม่พบรายการรอสร้างใบสำคัญจ่าย (อาจสร้างใบสำคัญจ่ายไปแล้ว)")} />;
  }
  if (item.status !== "PENDING") {
    return <Alert type="warning" showIcon title={t("รายการนี้ไม่อยู่ในสถานะรอสร้างใบสำคัญจ่ายแล้ว")} />;
  }

  const save = async (submit: boolean) => {
    const v = await form.validateFields();
    if (!(amount > 0)) {
      message.error(t("ยอดที่ต้องการจ่ายต้องมากกว่า 0"));
      return;
    }
    if (allocMismatch) {
      message.error(t("ยอดที่จัดสรรให้ AP รวมต้องเท่ากับยอดที่ต้องการจ่าย"));
      return;
    }
    setSaving(true);
    try {
      const res = await create.mutateAsync({
        queueItemId,
        body: {
          voucherDate: v.voucherDate.format("YYYY-MM-DD"),
          amount: partial ? amount : undefined,
          paymentMethod: v.paymentMethod,
          desiredPayDate: v.desiredPayDate?.format("YYYY-MM-DD"),
          companyBankAccountId: v.companyBankAccountId,
          remark: v.remark?.trim() || undefined,
          allocations:
            hasAllocs && partial
              ? ctx.apDocuments
                  .filter((a) => (allocs[a.id] ?? 0) > 0)
                  .map((a) => ({ apDocumentId: a.id, apDocumentNo: a.docNo, amount: allocs[a.id] }))
              : undefined,
          submit,
        },
      });
      const id = res.data.voucher.id;
      // อัปโหลดไฟล์ที่เลือกไว้ หลังบันทึกร่างสำเร็จ
      for (const f of pendingFiles) {
        try {
          await uploadVoucherAttachment(getAccessToken(), id, f);
        } catch {
          message.warning(t("แนบไฟล์ {name} ไม่สำเร็จ — แนบใหม่ได้ที่หน้ารายละเอียด", { name: f.name }));
        }
      }
      router.replace(`${PV_BASE_PATH}/${id}`);
    } catch {
      // error แสดงโดย mutation แล้ว
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{t("สร้างใบสำคัญจ่าย")}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.push(PV_BASE_PATH)}>
              {t("กลับ")}
            </Button>
          </>
        }
        meta={
          <>
<Tag color={VOUCHER_STATUS_COLOR.DRAFT}>{tFin(VOUCHER_STATUS_LABEL.DRAFT)} · {t("ยังไม่บันทึก")}</Tag>
          </>
        }
        actions={
          <>
<Typography.Text type="secondary">
            {t("อ้างอิง")} {referenceLine(ctx) || item.sourceNo} · {t("คิว")} {item.queueNo}
          </Typography.Text>
          </>
        }
      />

      <Card title={t("ข้อมูลเอกสาร")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label={t("เลขที่ PV")}>{t("สร้างอัตโนมัติเมื่อบันทึก")}</Descriptions.Item>
          <Descriptions.Item label={t("ประเภทการจ่าย")}>{kindLabel(item.paymentKind)}</Descriptions.Item>
          <Descriptions.Item label={t("สถานะ PV")}>{tFin(VOUCHER_STATUS_LABEL.DRAFT)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <ReferenceCard info={ctx} sourceType={item.sourceType} purchaseOrderId={item.purchaseOrderId} />
      <SupplierCard supplier={ctx.supplier} />

      <Card title={t("รายละเอียดการจ่าย")} size="small">
        <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
          <Descriptions.Item label={t("ยอดเอกสารต้นทาง")}>{fmtMoney(ctx.sourceDocumentAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดที่ออก PV ไปแล้ว")}>{fmtMoney(ctx.issuedPvAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดคงเหลือที่ออก PV ได้")}>{fmtMoney(ctx.remainingIssuable)}</Descriptions.Item>
          <Descriptions.Item label={t("ยอดที่ยืนยันส่งเข้าคิว")} span="filled">
            {fmtMoney(queueAmount)}
          </Descriptions.Item>
        </Descriptions>
        <div style={{ marginTop: 12 }}>
          <Typography.Text>{t("จำนวนเงินที่ต้องการจ่าย:")}</Typography.Text>
          {isBilling ? (
            <InputNumber
              min={0.01}
              max={queueAmount}
              step={100}
              precision={2}
              value={amount}
              onChange={(v) => setAmountInput(Number(v ?? 0))}
              style={{ width: 200 }}
              addonAfter={t("บาท")}
            />
          ) : (
            <Typography.Text strong>{fmtMoney(amount)} {t("บาท")}</Typography.Text>
          )}
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {isBilling
                ? t("ออกได้ไม่เกิน {amount} · ออกบางส่วนได้ ยอดที่เหลือจะกลับเข้าคิวรอสร้าง PV", { amount: fmtMoney(queueAmount) })
                : t("รายการขอจ่ายล่วงหน้า/มัดจำออก PV เต็มยอดที่ยืนยัน")}
            </Typography.Text>
          </div>
        </div>
        <ApAllocationTable
          rows={ctx.apDocuments}
          amountCell={(row) =>
            partial ? (
              <InputNumber
                min={0}
                max={Number(row.allocatedAmount)}
                precision={2}
                value={allocs[row.id]}
                onChange={(v) => setAllocInput((s) => ({ ...s, [row.id]: Number(v ?? 0) }))}
                style={{ width: 160 }}
              />
            ) : (
              fmtMoney(row.allocatedAmount)
            )
          }
        />
        {allocMismatch ? (
          <Alert
            style={{ marginTop: 8 }}
            type="warning"
            showIcon
            title={t("ยอดที่จัดสรรให้ AP รวม {sum} ไม่เท่ากับยอดที่ต้องการจ่าย {amount}", { sum: fmtMoney(allocSum), amount: fmtMoney(amount) })}
          />
        ) : null}
      </Card>

      <TaxCard vat={vat} whtBase={whtBase} whtRate={item.whtRate} whtAmount={wht} net={net} />
      <SummaryCard info={ctx} amount={amount} wht={wht} net={net} />

      <Card title={t("วิธีชำระเงินและบัญชีที่ใช้จ่าย")} size="small">
        <Form form={form} layout="vertical">
          <PaymentMethodFields bankAccounts={ctx.bankAccounts} />
        </Form>
      </Card>

      <Card title={t("เอกสารแนบ / หลักฐานประกอบ")} size="small">
        <PvAttachmentsPanel canEdit pendingFiles={{ files: pendingFiles, onChange: setPendingFiles }} />
      </Card>

      <Card size="small">
        <Space wrap>
          <Button onClick={() => router.push(PV_BASE_PATH)}>{t("ยกเลิก")}</Button>
          {perms.canAdd ? (
            <>
              <Button loading={saving} onClick={() => void save(false)}>
                {t("บันทึกร่าง")}
              </Button>
              <Button type="primary" loading={saving} onClick={() => void save(true)}>
                {t("บันทึกและส่งอนุมัติ")}
              </Button>
            </>
          ) : (
            <Typography.Text type="secondary">{t("คุณไม่มีสิทธิ์สร้างใบสำคัญจ่าย")}</Typography.Text>
          )}
        </Space>
      </Card>
    </Space>
  );
}
