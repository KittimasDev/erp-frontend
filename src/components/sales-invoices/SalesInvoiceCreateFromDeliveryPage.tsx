"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Form, Input, Spin } from "antd";
import { ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useT } from "@/lib/i18n/useT";

import { useCreateSalesInvoiceFromDeliveryMutation } from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import { useSalesInvoiceByDeliveryQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useDeliveryOrderQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import AccessDenied from "@/components/auth/AccessDenied";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
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
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const deliveryQuery = useDeliveryOrderQuery(deliveryOrderId);
  const existingQuery = useSalesInvoiceByDeliveryQuery(deliveryOrderId);
  const createMutation = useCreateSalesInvoiceFromDeliveryMutation();
  const invoiceActions = useScreenActionPermissions("SALES_INVOICES");
  const pendingActions = useScreenActionPermissions("SALES_INVOICES_PENDING");
  const canAdd = invoiceActions.canAdd || pendingActions.canEdit;

  const delivery = deliveryQuery.data?.data;
  const existing = existingQuery.data?.data;

  useEffect(() => {
    if (existing?.id) {
      router.replace(`/sales-invoices/${existing.id}`);
    }
  }, [existing, router]);

  if (!canAdd) {
    return <AccessDenied screenCodes={["SALES_INVOICES"]} />;
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
          <Link href="/sales-invoices/pending">{t("กลับ")}</Link>
        </div>
      </div>
    );
  }

  if (delivery.status !== "DELIVERED") {
    return (
      <div className={styles.page}>
        {t("สร้างใบแจ้งหนี้ได้เฉพาะ Delivery สถานะ DELIVERED")}
        <div style={{ marginTop: 12 }}>
          <Link href={`/delivery-orders/${delivery.id}`}>{t("กลับใบส่งสินค้า")}</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    const response = await createMutation.mutateAsync({
      deliveryOrderId,
      body: {
        invoiceDate: values.invoiceDate.format("YYYY-MM-DD"),
        dueDate: values.dueDate?.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
      },
    });
    router.push(`/sales-invoices/${response.data.id}`);
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
            onClick={() => router.push("/sales-invoices/pending")}
          >
            {t("กลับ")}
          </Button>
          </>
        }
      />

      <section className={styles.formCard}>
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("ใบส่งสินค้า")}</span>
            <div className={styles.metaValue}>{delivery.deliveryOrderNo}</div>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t("วันที่ส่ง")}</span>
            <div className={styles.metaValue}>
              {dayjs(delivery.deliveryDate).format("DD/MM/YYYY")}
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
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="dueDate" label={t("วันครบกำหนดชำระ")}>
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={3} placeholder={t("หมายเหตุ (ถ้ามี)")} />
          </Form.Item>
          <div className={styles.formActions}>
            <Button onClick={() => router.push("/sales-invoices/pending")}>
              {t("ยกเลิก")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
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
