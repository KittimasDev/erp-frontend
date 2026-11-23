"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, App, Button, DatePicker, Form, Input, Spin } from "antd";
import { ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";
import { arRoutes } from "@/lib/sales/ar-routes";

import { useCreateSalesInvoiceFromDeliveryMutation } from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import {
  useAdvanceCandidatesQuery,
  useSalesInvoiceByDeliveryQuery,
} from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { advanceDeductionErrors } from "@/utils/advance-deduction-validation";
import CustomerCreditNotice from "@/components/sales-invoices/CustomerCreditNotice";
import { useDeliveryOrderQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import AccessDenied from "@/components/auth/AccessDenied";
import AdvanceDeductionPicker from "@/components/sales-invoices/AdvanceDeductionPicker";
import type { SalesInvoiceAdvanceDeductionInput } from "@/types/sales-invoices";
import { useArInvoicePermissions } from "@/hooks/sales-invoices/useArInvoicePermissions";
import styles from "./SalesInvoiceFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type FormValues = {
  invoiceDate: dayjs.Dayjs;
  dueDate?: dayjs.Dayjs;
  remark?: string;
};

type Props = { deliveryOrderId: string };

export default function SalesInvoiceCreateFromDeliveryPage({
  deliveryOrderId,
}: Props) {
  const t = useT();
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const [deductions, setDeductions] = useState<SalesInvoiceAdvanceDeductionInput[]>([]);
  const deliveryQuery = useDeliveryOrderQuery(deliveryOrderId);
  const existingQuery = useSalesInvoiceByDeliveryQuery(deliveryOrderId);
  const createMutation = useCreateSalesInvoiceFromDeliveryMutation();
  const { canCreate: canAdd } = useArInvoicePermissions();

  const delivery = deliveryQuery.data?.data;
  const existing = existingQuery.data?.data;
  // queryKey เดียวกับที่ AdvanceDeductionPicker ใช้ → ไม่ยิง API ซ้ำ
  const deliveryOrderIds = useMemo(() => [deliveryOrderId], [deliveryOrderId]);
  const candidatesQuery = useAdvanceCandidatesQuery(delivery?.salesOrderId, deliveryOrderIds);
  const candidates = candidatesQuery.data?.data;
  const deductionErrors = advanceDeductionErrors(
    deductions,
    candidates?.items,
    candidates ? Number(candidates.maxDeductibleAmount) : undefined,
  );
  const canSubmitDeductions = deductionErrors.length === 0;

  // รอบส่งซ้ำที่ผูก SI เดิม: ไม่ redirect เงียบ ๆ — แสดงข้อความว่าห้ามออก SI ใหม่ พร้อมลิงก์ SI เดิม
  const viaRedelivery = delivery?.salesInvoiceViaRedelivery === true;
  useEffect(() => {
    if (existing?.id && !viaRedelivery && delivery) {
      router.replace(arRoutes.detail(existing.id));
    }
  }, [existing, viaRedelivery, delivery, router]);

  if (!canAdd) {
    return <AccessDenied screenCodes={["FINANCE_AR_INVOICES", "SALES_INVOICES"]} />;
  }
  if (deliveryQuery.isLoading || existingQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className={styles.page}>
        {t("ไม่พบใบส่งสินค้า")}
        <div style={{ marginTop: 12 }}>
          <Link href={arRoutes.pending}>{t("กลับ")}</Link>
        </div>
      </div>
    );
  }

  if (viaRedelivery) {
    return (
      <div className={styles.page}>
        <Alert
          type="warning"
          showIcon
          title={t("{no} เป็นรอบส่งซ้ำของใบส่งที่บิลไปแล้ว — ห้ามออกใบแจ้งหนี้ใหม่", { no: delivery.deliveryOrderNo })}
          description={
            <>
              {t("จำนวนที่ส่งซ้ำอยู่ในใบแจ้งหนี้เดิมแล้ว")}{" "}
              <Link href={arRoutes.detail(delivery.salesInvoiceId ?? existing?.id ?? "")}>
                {delivery.salesInvoiceNo ?? existing?.invoiceNo}
              </Link>
            </>
          }
        />
        <div style={{ marginTop: 12 }}>
          <Link href={`/delivery-orders/${delivery.id}`}>{t("กลับใบส่งสินค้า")}</Link>
        </div>
      </div>
    );
  }

  // DELIVERED ออกได้ทุกเงื่อนไข · CONFIRMED (ยังไม่ส่งของ) ออกได้เฉพาะชำระตอนรับสินค้า (คิดตามจำนวนที่ส่ง)
  const billBeforeDelivery =
    delivery.status === "CONFIRMED" && delivery.canInvoiceBeforeDelivery === true;
  if (delivery.status !== "DELIVERED" && !billBeforeDelivery) {
    return (
      <div className={styles.page}>
        {delivery.status === "CONFIRMED"
          ? t("ออกใบแจ้งหนี้ก่อนส่งของได้เฉพาะใบสั่งขายที่ชำระตอนรับสินค้า — เงื่อนไขนี้ต้องรอส่งของ (DELIVERED) ก่อน")
          : t("สร้างใบแจ้งหนี้ได้เฉพาะ Delivery สถานะ DELIVERED")}
        <div style={{ marginTop: 12 }}>
          <Link href={`/delivery-orders/${delivery.id}`}>{t("กลับใบส่งสินค้า")}</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    if (!canSubmitDeductions) {
      message.warning(t(deductionErrors[0].message));
      return;
    }
    const response = await createMutation.mutateAsync({
      deliveryOrderId,
      body: {
        invoiceDate: values.invoiceDate.format("YYYY-MM-DD"),
        dueDate: values.dueDate?.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
        advanceDeductions: deductions.length ? deductions : undefined,
      },
    });
    router.push(arRoutes.detail(response.data.id));
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales Invoices · AR"
        icon={<FileTextOutlined />}
        title={t("สร้างใบแจ้งหนี้")}
        subtitle={<>{delivery.deliveryOrderNo} · {delivery.customerName ?? "—"} · SO{" "}
            {delivery.salesOrderNo ?? "—"}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(arRoutes.pending)}
          >
            {t("กลับ")}
          </Button>
          </>
        }
      />

      <section className={styles.formCard}>
        <Alert
          style={{ marginBottom: 16 }}
          type={billBeforeDelivery ? "warning" : "info"}
          showIcon
          title={
            billBeforeDelivery
              ? t("บิลตามจำนวนที่ส่ง — ยังไม่ส่งของ")
              : t("บิลตามจำนวนที่ลูกค้ารับ")
          }
          description={
            billBeforeDelivery
              ? t("ออกใบแจ้งหนี้ก่อนส่งของ (ชำระตอนรับสินค้า) คิดเงินตามจำนวนที่ส่ง ถ้ามีของตีกลับภายหลังต้องออกใบลดหนี้คืนสินค้า (ถ้าออกใบกำกับภาษีแล้ว ใบลดหนี้มี VAT)")
              : t("คิดเงินตามจำนวนที่ลูกค้ารับจริง ของที่ตีกลับไม่อยู่ในบิล")
          }
        />
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("ใบส่งสินค้า")}</span>
            <div className={styles.metaValue}>{delivery.deliveryOrderNo}</div>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("วันที่ส่ง")}</span>
            <div className={styles.metaValue}>
              {dayjs(delivery.deliveryDate).format("DD/MM/BBBB")}
            </div>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("จำนวนรายการ")}</span>
            <div className={styles.metaValue}>
              {delivery.items?.length ?? 0}
            </div>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ invoiceDate: dayjs() }}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="invoiceDate"
            label={t("วันที่ใบแจ้งหนี้")}
            rules={[{ required: true, message: t("ระบุวันที่") }]}
          >
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="dueDate" label={t("วันครบกำหนดชำระ")}>
            <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={3} placeholder={t("หมายเหตุ (ถ้ามี)")} />
          </Form.Item>
          <AdvanceDeductionPicker
            salesOrderId={delivery.salesOrderId}
            deliveryOrderIds={deliveryOrderIds}
            value={deductions}
            onChange={setDeductions}
          />
          <CustomerCreditNotice customerId={delivery.customerId} />
          <div className={styles.formActions}>
            <Button onClick={() => router.push(arRoutes.pending)}>
              {t("ยกเลิก")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={!canSubmitDeductions}
              loading={createMutation.isPending}
            >
              {t("สร้างใบแจ้งหนี้ (DRAFT)")}
            </Button>
          </div>
        </Form>
        <p style={{ marginTop: 12, color: "#8a9199", fontSize: 13 }}>
          {t("ยอดจะคำนวณจากจำนวนที่ส่ง × ราคาในใบสั่งขาย (ส่วนลด/VAT ตามสัดส่วน)")}
          {delivery.salesOrderId ? ` · ${t("อ้างอิง SO")}` : null}
        </p>
      </section>
    </div>
  );
}
