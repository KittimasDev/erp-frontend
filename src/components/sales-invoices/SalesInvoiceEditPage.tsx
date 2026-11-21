"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, DatePicker, Form, Input, Spin } from "antd";
import { ArrowLeftOutlined, FileTextOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AdvanceDeductionPicker from "@/components/sales-invoices/AdvanceDeductionPicker";
import { useUpdateSalesInvoiceMutation } from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import { useSalesInvoiceQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useT } from "@/lib/i18n/useT";
import { arRoutes } from "@/lib/sales/ar-routes";
import type { SalesInvoiceAdvanceDeductionInput } from "@/types/sales-invoices";
import styles from "./SalesInvoiceFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type FormValues = {
  invoiceDate: dayjs.Dayjs;
  dueDate?: dayjs.Dayjs;
  remark?: string;
};

type Props = { id: string };

export default function SalesInvoiceEditPage({ id }: Props) {
  const t = useT();
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const query = useSalesInvoiceQuery(id);
  const updateMutation = useUpdateSalesInvoiceMutation();
  const data = query.data?.data;
  const [deductions, setDeductions] = useState<SalesInvoiceAdvanceDeductionInput[]>([]);
  const [deductionsReady, setDeductionsReady] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (data.status !== "DRAFT") {
      router.replace(arRoutes.detail(data.id));
      return;
    }
    form.setFieldsValue({
      invoiceDate: dayjs(data.invoiceDate),
      dueDate: data.dueDate ? dayjs(data.dueDate) : undefined,
      remark: data.remark,
    });
    setDeductions(
      (data.advanceDeductions ?? []).map((row) => ({
        advanceReceiptId: row.advanceReceiptId,
        amount: Number(row.amount),
      })),
    );
    setDeductionsReady(true);
  }, [data, form, router]);

  if (query.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        {t("ไม่พบใบแจ้งหนี้")}
        <div style={{ marginTop: 12 }}>
          <Link href={arRoutes.list}>{t("กลับ")}</Link>
        </div>
      </div>
    );
  }

  const deliveryOrderIds = (
    data.deliveryOrders?.length
      ? data.deliveryOrders.map((d) => d.id)
      : data.deliveryOrderId
        ? [data.deliveryOrderId]
        : []
  );

  const onFinish = async (values: FormValues) => {
    if (deductions.some((row) => !(row.amount > 0))) {
      message.warning(t("ระบุยอดหักของเอกสารที่เลือก"));
      return;
    }
    await updateMutation.mutateAsync({
      id,
      body: {
        invoiceDate: values.invoiceDate.format("YYYY-MM-DD"),
        dueDate: values.dueDate?.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
        advanceDeductions: deductions,
      },
    });
    router.push(arRoutes.detail(id));
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Sales Invoices · Edit Draft"
        icon={<FileTextOutlined />}
        title={data.invoiceNo}
        subtitle={t("แก้ไขหัวใบแจ้งหนี้และยอดหักมัดจำ (เฉพาะ DRAFT)")}
        actions={
          <>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push(arRoutes.detail(id))}
            >
              {t("กลับ")}
            </Button>
          </>
        }
      />

      <section className={styles.formCard}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
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
            <Input.TextArea rows={3} />
          </Form.Item>
          {deductionsReady ? (
            <AdvanceDeductionPicker
              salesOrderId={data.salesOrderId}
              deliveryOrderIds={deliveryOrderIds}
              excludeInvoiceId={data.id}
              autoFillSuggested={false}
              invoiceGrossEstimate={
                Number(data.totalAmount) +
                (data.advanceDeductions ?? []).reduce(
                  (sum, row) => sum + Number(row.amount || 0),
                  0,
                )
              }
              value={deductions}
              onChange={setDeductions}
            />
          ) : null}
          <div className={styles.formActions}>
            <Button onClick={() => router.push(arRoutes.detail(id))}>
              {t("ยกเลิก")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
            >
              {t("บันทึก")}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
