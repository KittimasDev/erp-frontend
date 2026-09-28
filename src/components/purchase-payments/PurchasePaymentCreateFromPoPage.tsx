"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, DatePicker, Form, Input, Select, Spin } from "antd";
import { ArrowLeftOutlined, DollarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreatePurchasePaymentFromPoMutation } from "@/hooks/purchase-payments/usePurchasePaymentMutations";
import {
  purchasePaymentsQueryKey,
  usePurchasePaymentByPoQuery,
} from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import {
  purchaseOrdersQueryKey,
  usePurchaseOrderQuery,
} from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { goodsReceiptsQueryKey } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { getGoodsReceipt } from "@/lib/api/goods-receipts";
import { getPurchaseOrderByPr } from "@/lib/api/purchase-orders";
import { getPurchasePayment } from "@/lib/api/purchase-payments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import styles from "./PurchasePaymentFormPage.module.css";

type FormValues = {
  voucherDate: dayjs.Dayjs;
  paymentMethod: string;
  remark?: string;
};

type Props = { purchaseOrderId: string };

function formatMoney(value?: string) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return value ?? "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function apiStatus(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

export default function PurchasePaymentCreateFromPoPage({
  purchaseOrderId,
}: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const poQuery = usePurchaseOrderQuery(purchaseOrderId);
  const existingQuery = usePurchasePaymentByPoQuery(purchaseOrderId);
  const createMutation = useCreatePurchasePaymentFromPoMutation();

  const po = poQuery.data?.data;
  const existing = existingQuery.data?.data;
  const forbidden = apiStatus(poQuery.error) === 403;
  const shouldResolve =
    !poQuery.isLoading && !po && !forbidden && poQuery.isFetched;

  const grResolveQuery = useQuery({
    queryKey: [
      ...goodsReceiptsQueryKey,
      "detail",
      purchaseOrderId,
      "pay-resolve",
    ],
    queryFn: () => getGoodsReceipt(getAccessToken(), purchaseOrderId),
    enabled: shouldResolve,
    retry: false,
  });
  const prResolveQuery = useQuery({
    queryKey: [
      ...purchaseOrdersQueryKey,
      "by-pr",
      purchaseOrderId,
      "pay-resolve",
    ],
    queryFn: () => getPurchaseOrderByPr(getAccessToken(), purchaseOrderId),
    enabled: shouldResolve,
    retry: false,
  });
  const paymentResolveQuery = useQuery({
    queryKey: [
      ...purchasePaymentsQueryKey,
      "detail",
      purchaseOrderId,
      "pay-resolve",
    ],
    queryFn: () => getPurchasePayment(getAccessToken(), purchaseOrderId),
    enabled: shouldResolve,
    retry: false,
  });

  const resolvedPoId =
    grResolveQuery.data?.data?.purchaseOrderId ??
    prResolveQuery.data?.data?.id;
  const resolvedPaymentId = paymentResolveQuery.data?.data?.id;

  useEffect(() => {
    if (existing?.id) {
      router.replace(`/purchase-payments/${existing.id}`);
    }
  }, [existing, router]);

  useEffect(() => {
    if (resolvedPoId && resolvedPoId !== purchaseOrderId) {
      router.replace(`/purchase-payments/create-from-po/${resolvedPoId}`);
      return;
    }
    if (resolvedPaymentId) {
      router.replace(`/purchase-payments/${resolvedPaymentId}`);
    }
  }, [purchaseOrderId, resolvedPaymentId, resolvedPoId, router]);

  const resolving =
    shouldResolve &&
    (grResolveQuery.isLoading ||
      prResolveQuery.isLoading ||
      paymentResolveQuery.isLoading);
  const redirecting = Boolean(
    existing?.id ||
      (resolvedPoId && resolvedPoId !== purchaseOrderId) ||
      resolvedPaymentId,
  );

  if (forbidden) {
    return (
      <AccessDenied
        screenCodes={["PURCHASE_ORDERS", "PURCHASE_PAYMENTS_PENDING"]}
      />
    );
  }

  if (
    poQuery.isLoading ||
    existingQuery.isLoading ||
    resolving ||
    redirecting
  ) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!po) {
    return (
      <div className={styles.page}>
        <Alert
          type="warning"
          showIcon
          title="รหัสนี้ไม่ใช่ใบสั่งซื้อ"
          description="ลิงก์นี้ไม่ตรงกับใบสั่งซื้อ ใบขอซื้อ ใบรับของ หรือใบสำคัญจ่ายที่ระบบรู้จัก"
        />
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <Link href="/procurement/tracking">กลับติดตามจัดซื้อ</Link>
          <Link href="/purchase-payments/pending">ไปหน้ารอจ่ายเงิน</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    const response = await createMutation.mutateAsync({
      purchaseOrderId,
      body: {
        voucherDate: values.voucherDate.format("YYYY-MM-DD"),
        paymentMethod: values.paymentMethod,
        remark: values.remark?.trim() || undefined,
      },
    });
    router.push(`/purchase-payments/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <DollarOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Payments</p>
          <h1 className={styles.pageTitle}>สร้างใบสำคัญจ่าย</h1>
          <p className={styles.pageSubtitle}>
            {po.poNo} · {po.creditor?.nameTh ?? "—"} ·{" "}
            {formatMoney(po.totalAmount)} บาท
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href={`/purchase-orders/${po.id}`}>
            <Button icon={<ArrowLeftOutlined />}>กลับ PO</Button>
          </Link>
        </div>
      </header>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          voucherDate: dayjs(),
          paymentMethod: "TRANSFER",
        }}
      >
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่ใบสำคัญ"
                    name="voucherDate"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="วิธีชำระ"
                    name="paymentMethod"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={[
                        { value: "CASH", label: "เงินสด" },
                        { value: "TRANSFER", label: "โอนเงิน" },
                        { value: "CHEQUE", label: "เช็ค" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="หมายเหตุ"
                    name="remark"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </div>
              </div>
            </div>
            <div className={styles.footerBar}>
              <div />
              <div className={styles.footerActions}>
                <Button
                  onClick={() =>
                    router.push(`/purchase-orders/${purchaseOrderId}`)
                  }
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                >
                  สร้างใบสำคัญ (DRAFT)
                </Button>
              </div>
            </div>
          </section>
          <aside className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>ยอดจ่ายเต็มจำนวน</p>
            <h2 className={styles.summaryTitle}>
              {formatMoney(po.totalAmount)}
            </h2>
            <p className={styles.summaryLead}>
              Phase นี้จ่ายเต็มยอด PO เท่านั้น · Confirm ทีหลังจึงบันทึกจ่ายจริง
            </p>
          </aside>
        </div>
      </Form>
    </div>
  );
}
