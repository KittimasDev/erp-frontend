"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, DatePicker, Form, Input, Spin } from "antd";
import { ArrowLeftOutlined, FileTextOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useUpdateSalesInvoiceMutation } from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import { useSalesInvoiceQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import styles from "./SalesInvoiceFormPage.module.css";

type FormValues = {
  invoiceDate: dayjs.Dayjs;
  dueDate?: dayjs.Dayjs;
  remark?: string;
};

type Props = { id: string };

export default function SalesInvoiceEditPage({ id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const query = useSalesInvoiceQuery(id);
  const updateMutation = useUpdateSalesInvoiceMutation();
  const data = query.data?.data;

  useEffect(() => {
    if (!data) return;
    if (data.status !== "DRAFT") {
      router.replace(`/sales-invoices/${data.id}`);
      return;
    }
    form.setFieldsValue({
      invoiceDate: dayjs(data.invoiceDate),
      dueDate: data.dueDate ? dayjs(data.dueDate) : undefined,
      remark: data.remark,
    });
  }, [data, form, router]);

  if (query.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        ไม่พบใบแจ้งหนี้
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-invoices">กลับ</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    await updateMutation.mutateAsync({
      id,
      body: {
        invoiceDate: values.invoiceDate.format("YYYY-MM-DD"),
        dueDate: values.dueDate?.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
      },
    });
    router.push(`/sales-invoices/${id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales Invoices · Edit Draft</p>
          <h1 className={styles.pageTitle}>{data.invoiceNo}</h1>
          <p className={styles.pageSubtitle}>
            แก้ไขหัวใบแจ้งหนี้ (เฉพาะ DRAFT)
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/sales-invoices/${id}`)}
          >
            กลับ
          </Button>
        </div>
      </header>

      <section className={styles.formCard}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="invoiceDate"
            label="วันที่ใบแจ้งหนี้"
            rules={[{ required: true, message: "ระบุวันที่" }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="dueDate" label="วันครบกำหนดชำระ">
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="remark" label="หมายเหตุ">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className={styles.formActions}>
            <Button onClick={() => router.push(`/sales-invoices/${id}`)}>
              ยกเลิก
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
            >
              บันทึก
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
