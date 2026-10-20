"use client";

import { useEffect } from "react";
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
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { usePaymentTermsQuery } from "@/hooks/payment-terms/usePaymentTermsQuery";
import { useUpdatePurchaseOrderMutation } from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseOrderQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import {
  resolveVatMode,
  resolveWithholdingPercent,
  resolveWithholdingTaxType,
  VatMode,
  VAT_MODE_OPTIONS,
  WITHHOLDING_TAX_TYPE_OPTIONS,
  WithholdingTaxType,
} from "@/lib/money/vat-totals";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";
import DocumentHtmlEditor from "@/components/common/DocumentHtmlEditor";
import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";
import PoChargesEditor, {
  chargeRowsToBody,
  chargesToFormRows,
  usePoChargesPreview,
  type ChargeFormRow,
} from "./PoChargesEditor";
import styles from "./PurchaseOrderFormPage.module.css";

type LineValues = {
  id: string;
  purchaseRequestItemId?: string;
  itemId: string;
  itemLabel: string;
  quantity: number;
  unitId: string;
  unitLabel: string;
  unitPrice: number;
  discountAmount?: number;
  description?: string;
};

type FormValues = {
  poDate: dayjs.Dayjs;
  creditorId: string;
  paymentTermId?: string;
  vatMode: VatMode;
  expectedDeliveryDate?: dayjs.Dayjs | null;
  paymentMethod?: string;
  withholdingTaxType: WithholdingTaxType;
  withholdingTaxPercent?: number;
  discountAmount?: number;
  remark?: string;
  items: LineValues[];
  charges?: ChargeFormRow[];
};

const PAYMENT_METHOD_OPTIONS = Object.entries(SUPPLIER_PAYMENT_METHOD_LABEL).map(
  ([value, label]) => ({ value, label }),
);

type Props = { id: string };

export default function PurchaseOrderEditPage({ id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = usePurchaseOrderQuery(id);
  const updateMutation = useUpdatePurchaseOrderMutation();

  const vendorsQuery = useVendorsQuery({ isActive: true });
  const paymentTermsQuery = usePaymentTermsQuery({ isActive: true });

  const vendors = vendorsQuery.data?.data ?? [];
  const paymentTerms = paymentTermsQuery.data?.data ?? [];
  const data = detailQuery.data?.data;

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedWhtType = Form.useWatch("withholdingTaxType", form);
  const watchedCharges = Form.useWatch("charges", form) as
    | ChargeFormRow[]
    | undefined;
  const chargePreview = usePoChargesPreview(watchedCharges);

  useEffect(() => {
    if (!data) return;
    // ใบที่ถูกส่งกลับแก้ไขต้องเข้าฟอร์มได้ ไม่งั้นแก้ตามที่หัวหน้าสั่งไม่ได้เลย
    if (data.status !== "DRAFT" && data.status !== "REVISING") {
      router.replace(`/purchase-orders/${data.id}`);
      return;
    }
    form.setFieldsValue({
      poDate: dayjs(data.poDate),
      creditorId: data.creditorId,
      paymentTermId: data.paymentTermId,
      vatMode: resolveVatMode(data.vatMode),
      expectedDeliveryDate: data.expectedDeliveryDate
        ? dayjs(data.expectedDeliveryDate)
        : null,
      paymentMethod: data.paymentMethod,
      withholdingTaxType: resolveWithholdingTaxType(data.withholdingTaxType),
      withholdingTaxPercent: Number(data.withholdingTaxPercent) || 0,
      discountAmount: Number(data.discountAmount),
      remark: data.remark,
      charges: chargesToFormRows(data.charges),
      items: (data.items ?? []).map((item) => ({
        id: item.id,
        purchaseRequestItemId: item.purchaseRequestItemId,
        itemId: item.itemId,
        itemLabel: `${item.itemCode ?? ""} — ${item.itemNameTh ?? ""}`,
        quantity: Number(item.quantity),
        unitId: item.unitId,
        unitLabel: item.unitNameTh ?? item.unitCode ?? "—",
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        description: item.description,
      })),
    });
  }, [data, form, router]);

  if (detailQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        ไม่พบใบสั่งซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับ</Link>
        </div>
      </div>
    );
  }

  const onFinish = async (values: FormValues) => {
    const response = await updateMutation.mutateAsync({
      id,
      body: {
        poDate: values.poDate.format("YYYY-MM-DD"),
        creditorId: values.creditorId,
        paymentTermId: values.paymentTermId ?? null,
        vatMode: resolveVatMode(values.vatMode),
        expectedDeliveryDate: values.expectedDeliveryDate
          ? values.expectedDeliveryDate.format("YYYY-MM-DD")
          : null,
        paymentMethod: values.paymentMethod || null,
        withholdingTaxType: values.withholdingTaxType,
        withholdingTaxPercent: resolveWithholdingPercent(
          values.withholdingTaxType,
          values.withholdingTaxPercent,
        ),
        discountAmount: values.discountAmount ?? 0,
        remark: sanitizeDocumentHtml(values.remark) || undefined,
        items: values.items.map((item, index) => ({
          id: item.id,
          purchaseRequestItemId: item.purchaseRequestItemId,
          itemId: item.itemId,
          unitId: item.unitId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount) || 0,
          description: item.description?.trim() || undefined,
          sortOrder: index,
        })),
        // ส่งรายการทั้งชุดเสมอ (upsert ตาม id) — ที่ตั้งหนี้แล้วลบ/ลดต่ำกว่ายอดที่ตั้งไม่ได้ backend ตรวจให้
        charges: chargeRowsToBody(values.charges),
      },
    });
    router.push(`/purchase-orders/${response.data.id}`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <EditOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Order</p>
          <h1 className={styles.pageTitle}>แก้ไขใบสั่งซื้อ</h1>
          <p className={styles.pageSubtitle}>{data.poNo}</p>
        </div>
        <div className={styles.backLink}>
          <Link href={`/purchase-orders/${data.id}`}>
            <Button icon={<ArrowLeftOutlined />}>กลับ</Button>
          </Link>
        </div>
      </header>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <div className={styles.layout}>
          <section className={styles.formCard}>
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <div className={styles.formGrid}>
                  <Form.Item
                    className={styles.field}
                    label="วันที่"
                    name="poDate"
                    rules={[{ required: true }]}
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="ผู้ขาย"
                    name="creditorId"
                    rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={vendors.map((v) => ({
                        value: v.id,
                        label: `${v.creditorCode} — ${v.nameTh}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="เงื่อนไขชำระ"
                    name="paymentTermId"
                  >
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={paymentTerms.map((t) => ({
                        value: t.id,
                        label: `${t.code} — ${t.name}`,
                      }))}
                    />
                  </Form.Item>
                  {/*
                    ไม่มีช่อง "อัตรา VAT" — เมื่อคิด VAT บังคับ 7% ตามรูปแบบ VAT
                    (ดู resolveDocumentVatPercent)
                  */}
                  <Form.Item
                    className={styles.field}
                    label="รูปแบบ VAT"
                    name="vatMode"
                  >
                    <Select options={VAT_MODE_OPTIONS} />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="ภาษีหัก ณ ที่จ่าย"
                    name="withholdingTaxType"
                  >
                    <Select options={WITHHOLDING_TAX_TYPE_OPTIONS} />
                  </Form.Item>
                  {watchedWhtType === WithholdingTaxType.CUSTOM ? (
                    <Form.Item
                      className={styles.field}
                      label="อัตราหัก ณ ที่จ่าย (%)"
                      name="withholdingTaxPercent"
                    >
                      <InputNumber min={0} max={100} style={{ width: "100%" }} />
                    </Form.Item>
                  ) : null}
                  <Form.Item
                    className={styles.field}
                    label="วิธีการชำระเงิน"
                    name="paymentMethod"
                  >
                    <Select
                      allowClear
                      placeholder="ถ้ามี"
                      options={PAYMENT_METHOD_OPTIONS}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="วันที่ส่งมอบ"
                    name="expectedDeliveryDate"
                  >
                    <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                  </Form.Item>
                  <Form.Item
                    className={styles.field}
                    label="ส่วนลดท้ายบิล"
                    name="discountAmount"
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item
                    className={`${styles.field} ${styles.formGridFull}`}
                    label="หมายเหตุ"
                    name="remark"
                    style={{ marginBottom: 0 }}
                  >
                    <DocumentHtmlEditor
                      ariaLabel="หมายเหตุ"
                      placeholder="รายละเอียดเพิ่มเติมบนใบสั่งซื้อ"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <Form.List name="items">
                  {(fields) => (
                    <div className={styles.lineList}>
                      {fields.map(({ key, name, ...restField }, index) => (
                        <div key={key} className={styles.lineCard}>
                          <div className={styles.lineCardHeader}>
                            <strong>
                              {watchedItems[index]?.itemLabel ||
                                `รายการที่ ${index + 1}`}
                            </strong>
                          </div>
                          <Form.Item {...restField} name={[name, "id"]} hidden>
                            <Input />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "itemId"]}
                            hidden
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, "unitId"]}
                            hidden
                          >
                            <Input />
                          </Form.Item>
                          <div className={styles.lineGrid}>
                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="จำนวน"
                              name={[name, "quantity"]}
                              rules={[{ required: true }]}
                            >
                              <InputNumber min={0.001} style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="ราคา/หน่วย"
                              name={[name, "unitPrice"]}
                              rules={[{ required: true }]}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              className={styles.field}
                              label="ส่วนลด"
                              name={[name, "discountAmount"]}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} />
                            </Form.Item>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.List>
              </div>

              <PoChargesEditor form={form} disabled={updateMutation.isPending} />
            </div>
            <div className={styles.footerBar}>
              <div />
              <div className={styles.footerActions}>
                <Button onClick={() => router.push(`/purchase-orders/${id}`)}>
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isPending}
                >
                  บันทึก
                </Button>
              </div>
            </div>
          </section>
          <aside className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>แก้ไข DRAFT</p>
            <h2 className={styles.summaryTitle}>{data.poNo}</h2>
            <p className={styles.summaryLead}>
              บันทึกแล้วระบบจะคำนวณยอดใหม่ให้อัตโนมัติ
            </p>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>ค่าใช้จ่ายเพิ่มเติม (ก่อน VAT)</span>
                <strong>
                  {chargePreview.amountBeforeVat.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>VAT ค่าใช้จ่าย</span>
                <strong>
                  {chargePreview.vat.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>รวมค่าใช้จ่าย</span>
                <strong>
                  {chargePreview.total.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </Form>
    </div>
  );
}
