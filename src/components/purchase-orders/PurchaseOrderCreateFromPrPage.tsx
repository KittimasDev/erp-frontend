"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { usePaymentTermsQuery } from "@/hooks/payment-terms/usePaymentTermsQuery";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { useCreatePurchaseOrderFromPrMutation } from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseOrderByPrQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { usePurchaseRequestQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import styles from "./PurchaseOrderFormPage.module.css";

type LineValues = {
  purchaseRequestItemId: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
  description?: string;
};

type FormValues = {
  poDate: dayjs.Dayjs;
  creditorId: string;
  paymentTermId?: string;
  taxRateId?: string;
  discountAmount?: number;
  remark?: string;
  items: LineValues[];
};

type Props = {
  purchaseRequestId: string;
};

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PurchaseOrderCreateFromPrPage({
  purchaseRequestId,
}: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const prQuery = usePurchaseRequestQuery(purchaseRequestId);
  const existingPoQuery = usePurchaseOrderByPrQuery(purchaseRequestId);
  const createMutation = useCreatePurchaseOrderFromPrMutation();

  const vendorsQuery = useVendorsQuery({ isActive: true });
  const paymentTermsQuery = usePaymentTermsQuery({ isActive: true });
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });

  const vendors = vendorsQuery.data?.data ?? [];
  const paymentTerms = paymentTermsQuery.data?.data ?? [];
  const taxRates = taxRatesQuery.data?.data ?? [];

  const pr = prQuery.data?.data;
  const existingPo = existingPoQuery.data?.data;

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discountAmount", form) ?? 0;
  const watchedTaxId = Form.useWatch("taxRateId", form);

  const lineMetaByPrItemId = useMemo(() => {
    const map = new Map<
      string,
      { itemLabel: string; quantity: number; unitLabel: string }
    >();
    for (const item of pr?.items ?? []) {
      const itemLabel =
        [item.itemCode, item.itemNameTh].filter(Boolean).join(" — ") ||
        "ไม่ระบุชื่อสินค้า";
      map.set(item.id, {
        itemLabel,
        quantity: Number(item.quantity),
        unitLabel: item.unitNameTh ?? item.unitCode ?? "—",
      });
    }
    return map;
  }, [pr?.items]);

  useEffect(() => {
    if (!pr) return;
    form.setFieldsValue({
      poDate: dayjs(),
      discountAmount: 0,
      remark: pr.remark,
      items: (pr.items ?? []).map((item) => ({
        purchaseRequestItemId: item.id,
        quantity: Number(item.quantity),
        unitPrice: undefined,
        discountAmount: 0,
        description: item.description,
      })),
    });
  }, [form, pr]);

  useEffect(() => {
    if (existingPo?.id) {
      router.replace(`/purchase-orders/${existingPo.id}`);
    }
  }, [existingPo, router]);

  const selectedTax = useMemo(
    () => taxRates.find((tax) => tax.id === watchedTaxId),
    [taxRates, watchedTaxId],
  );

  const preview = useMemo(() => {
    const lineAmounts = watchedItems.map((line, index) => {
      const prItemId =
        line?.purchaseRequestItemId ?? (pr?.items ?? [])[index]?.id ?? "";
      const meta = lineMetaByPrItemId.get(prItemId);
      const qty = Number(meta?.quantity ?? line?.quantity) || 0;
      const price = Number(line?.unitPrice) || 0;
      const disc = Number(line?.discountAmount) || 0;
      return Math.max(0, qty * price - disc);
    });
    const subtotal = lineAmounts.reduce((s, n) => s + n, 0);
    const discount = Math.min(Number(watchedDiscount) || 0, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const rate = Number(selectedTax?.rate ?? 0);
    const vat = (taxable * rate) / 100;
    const total = taxable + vat;
    return { subtotal, discount, vat, total };
  }, [watchedDiscount, watchedItems, selectedTax, lineMetaByPrItemId, pr?.items]);

  if (prQuery.isLoading || existingPoQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลดใบขอซื้อ...
      </div>
    );
  }

  if (!pr) {
    return (
      <div className={styles.page}>
        ไม่พบใบขอซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-requests">กลับ</Link>
        </div>
      </div>
    );
  }

  if (pr.status !== "APPROVED") {
    return (
      <div className={styles.page}>
        สร้างใบสั่งซื้อได้เฉพาะ PR สถานะ APPROVED (ปัจจุบัน: {pr.status})
        <div style={{ marginTop: 12 }}>
          <Link href={`/purchase-requests/${pr.id}`}>กลับรายละเอียด PR</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    const response = await createMutation.mutateAsync({
      purchaseRequestId,
      body: {
        poDate: values.poDate.format("YYYY-MM-DD"),
        creditorId: values.creditorId,
        paymentTermId: values.paymentTermId,
        taxRateId: values.taxRateId,
        discountAmount: values.discountAmount ?? 0,
        remark: values.remark?.trim() || undefined,
        items: values.items.map((item) => ({
          purchaseRequestItemId: item.purchaseRequestItemId,
          unitPrice: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount) || 0,
          description: item.description?.trim() || undefined,
        })),
      },
    });
    router.push(`/purchase-orders/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileAddOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Order</p>
          <h1 className={styles.pageTitle}>สร้างใบสั่งซื้อจาก PR</h1>
          <p className={styles.pageSubtitle}>
            อ้างอิง {pr.prNo} · คัดลอกรายการสินค้าจากใบขอซื้อ
          </p>
        </div>
        <div className={styles.backLink}>
          <Link href={`/purchase-requests/${pr.id}`}>
            <Button icon={<ArrowLeftOutlined />}>กลับ PR</Button>
          </Link>
        </div>
      </header>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
                </div>
                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่ใบสั่งซื้อ"
                    name="poDate"
                    rules={[{ required: true, message: "เลือกวันที่" }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="ผู้ขาย / เจ้าหนี้"
                    name="creditorId"
                    rules={[{ required: true, message: "เลือกผู้ขาย" }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="เลือกผู้ขาย"
                      options={vendors.map((v) => ({
                        value: v.id,
                        label: `${v.creditorCode} — ${v.nameTh}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="เงื่อนไขชำระเงิน"
                    name="paymentTermId"
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="เลือกเงื่อนไข"
                      options={paymentTerms.map((t) => ({
                        value: t.id,
                        label: `${t.code} — ${t.name}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="อัตราภาษี"
                    name="taxRateId"
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="เลือกภาษี"
                      options={taxRates.map((t) => ({
                        value: t.id,
                        label: `${t.code} — ${t.name} (${t.rate}%)`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="ส่วนลดหัวเอกสาร"
                    name="discountAmount"
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
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

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>รายการสินค้าจาก PR</h2>
                  <p className={styles.sectionHint}>กรอกราคาต่อหน่วย</p>
                </div>
                <Form.List name="items">
                  {(fields) => (
                    <div className={styles.lineList}>
                      {fields.map(({ key, name, ...restField }, index) => {
                        const line = watchedItems[index];
                        const prItemId =
                          line?.purchaseRequestItemId ??
                          (pr.items ?? [])[index]?.id ??
                          "";
                        const meta = lineMetaByPrItemId.get(prItemId);
                        const itemLabel =
                          meta?.itemLabel || `รายการที่ ${index + 1}`;
                        const qty = meta?.quantity ?? line?.quantity ?? 0;
                        const unitLabel = meta?.unitLabel ?? "";
                        return (
                          <div key={key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>{itemLabel}</strong>
                              <span className={styles.sectionHint}>
                                {qty} {unitLabel}
                              </span>
                            </div>
                            <Form.Item
                              {...restField}
                              name={[name, "purchaseRequestItemId"]}
                              hidden
                            >
                              <Input />
                            </Form.Item>
                            <div className={styles.lineGrid}>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="ราคาต่อหน่วย"
                                name={[name, "unitPrice"]}
                                rules={[
                                  { required: true, message: "ระบุราคา" },
                                ]}
                              >
                                <InputNumber min={0} style={{ width: "100%" }} />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="ส่วนลดรายการ"
                                name={[name, "discountAmount"]}
                              >
                                <InputNumber min={0} style={{ width: "100%" }} />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="รายละเอียด"
                                name={[name, "description"]}
                              >
                                <Input />
                              </Form.Item>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Form.List>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                บันทึกแล้วสถานะเป็น DRAFT — Confirm ได้จากหน้ารายละเอียด
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  onClick={() => router.push(`/purchase-requests/${pr.id}`)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                >
                  บันทึกใบสั่งซื้อ
                </Button>
              </div>
            </div>
          </section>

          <aside className={styles.summaryCard}>
            <div>
              <p className={styles.summaryEyebrow}>สรุปยอด</p>
              <h2 className={styles.summaryTitle}>{pr.prNo}</h2>
            </div>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <strong>{formatMoney(preview.subtotal)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>ส่วนลด</span>
                <strong>{formatMoney(preview.discount)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>VAT</span>
                <strong>{formatMoney(preview.vat)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>รวมทั้งสิ้น</span>
                <strong>{formatMoney(preview.total)}</strong>
              </div>
            </div>
            <div className={styles.flowNote}>
              <strong>หมายเหตุ</strong>
              <p>ยอดสุดท้ายคำนวณอีกครั้งที่ backend เมื่อบันทึก</p>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
