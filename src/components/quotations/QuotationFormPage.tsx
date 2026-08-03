"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useStockBalancesQuery } from "@/hooks/inventory/useInventoryQueries";
import { usePaymentTermsQuery } from "@/hooks/payment-terms/usePaymentTermsQuery";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import {
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
} from "@/hooks/quotations/useQuotationMutations";
import { useQuotationQuery } from "@/hooks/quotations/useQuotationsQuery";
import type { CreateQuotationBody } from "@/types/quotations";
import styles from "./QuotationFormPage.module.css";

type LineValues = {
  itemId?: string;
  unitId?: string;
  quantity?: number;
  unitPrice?: number;
  discountAmount?: number;
  description?: string;
};

type FormValues = {
  quotationDate: dayjs.Dayjs;
  customerId: string;
  paymentTermId?: string;
  taxRateId?: string;
  validUntil?: dayjs.Dayjs | null;
  discountAmount?: number;
  remark?: string;
  items: LineValues[];
};

type Props = {
  mode: "create" | "edit";
  id?: string;
};

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatQty(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export default function QuotationFormPage({ mode, id }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useQuotationQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateQuotationMutation();
  const updateMutation = useUpdateQuotationMutation();

  const customersQuery = useCustomersQuery();
  const itemsQuery = useItemsQuery({
    isActive: true,
    isSalesItem: true,
    itemCategoryCode: "FINISHED_GOODS",
  });
  const balancesQuery = useStockBalancesQuery({
    itemCategoryCode: "FINISHED_GOODS",
    hasStock: true,
  });
  const unitsQuery = useUnitsQuery({ isActive: true });
  const paymentTermsQuery = usePaymentTermsQuery({ isActive: true });
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });

  const customers = customersQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  const units = unitsQuery.data?.data ?? [];
  const paymentTerms = paymentTermsQuery.data?.data ?? [];
  const taxRates = taxRatesQuery.data?.data ?? [];

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discountAmount", form) ?? 0;
  const watchedTaxId = Form.useWatch("taxRateId", form);
  const watchedCustomerId = Form.useWatch("customerId", form);

  const availableByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of balancesQuery.data?.data ?? []) {
      const qty = Number(row.quantityAvailable || 0);
      if (!(qty > 1e-9)) continue;
      map.set(
        row.itemId,
        Number(((map.get(row.itemId) ?? 0) + qty).toFixed(3)),
      );
    }
    return map;
  }, [balancesQuery.data?.data]);

  const selectedItemIds = useMemo(
    () =>
      new Set(
        watchedItems
          .map((line) => line?.itemId)
          .filter((value): value is string => Boolean(value)),
      ),
    [watchedItems],
  );

  const selectableItems = useMemo(() => {
    return items.filter((item) => {
      const available = availableByItemId.get(item.id) ?? 0;
      if (available > 1e-9) return true;
      return mode === "edit" && selectedItemIds.has(item.id);
    });
  }, [items, availableByItemId, mode, selectedItemIds]);

  useEffect(() => {
    if (mode === "create") {
      form.setFieldsValue({
        quotationDate: dayjs(),
        discountAmount: 0,
        items: [{ discountAmount: 0 }],
      });
      return;
    }

    const data = detailQuery.data?.data;
    if (!data) return;

    if (data.status !== "DRAFT") {
      router.replace(`/quotations/${data.id}`);
      return;
    }

    form.setFieldsValue({
      quotationDate: dayjs(data.quotationDate),
      customerId: data.customerId,
      paymentTermId: data.paymentTermId,
      taxRateId: data.taxRateId,
      validUntil: data.validUntil ? dayjs(data.validUntil) : null,
      discountAmount: Number(data.discountAmount) || 0,
      remark: data.remark,
      items: (data.items ?? []).map((item) => ({
        itemId: item.itemId,
        unitId: item.unitId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount) || 0,
        description: item.description,
      })),
    });
  }, [detailQuery.data, form, mode, router]);

  const selectedTax = useMemo(
    () => taxRates.find((tax) => tax.id === watchedTaxId),
    [taxRates, watchedTaxId],
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === watchedCustomerId),
    [customers, watchedCustomerId],
  );

  const preview = useMemo(() => {
    const lineAmounts = watchedItems.map((line) => {
      const qty = Number(line?.quantity) || 0;
      const price = Number(line?.unitPrice) || 0;
      const disc = Number(line?.discountAmount) || 0;
      return Math.max(0, qty * price - disc);
    });
    const subtotal = lineAmounts.reduce((s, n) => s + n, 0);
    const discount = Math.min(Number(watchedDiscount) || 0, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const rate = selectedTax ? Number(selectedTax.rate) || 0 : 0;
    const vat = (taxable * rate) / 100;
    return {
      subtotal,
      discount,
      vat,
      total: taxable + vat,
    };
  }, [watchedItems, watchedDiscount, selectedTax]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const getAvailableForLine = (index: number, itemId?: string) => {
    if (!itemId) return 0;
    const total = availableByItemId.get(itemId) ?? 0;
    const usedElsewhere = watchedItems.reduce((sum, line, i) => {
      if (i === index || line?.itemId !== itemId) return sum;
      return sum + (Number(line?.quantity) || 0);
    }, 0);
    return Number(Math.max(0, total - usedElsewhere).toFixed(3));
  };

  const handleItemChange = (index: number, itemId?: string) => {
    const item = items.find((row) => row.id === itemId);
    if (item?.unitId) {
      form.setFieldValue(["items", index, "unitId"], item.unitId);
    }
    const available = (() => {
      if (!itemId) return 0;
      const total = availableByItemId.get(itemId) ?? 0;
      const usedElsewhere = watchedItems.reduce((sum, line, i) => {
        if (i === index || line?.itemId !== itemId) return sum;
        return sum + (Number(line?.quantity) || 0);
      }, 0);
      return Number(Math.max(0, total - usedElsewhere).toFixed(3));
    })();
    const currentQty = Number(
      form.getFieldValue(["items", index, "quantity"]) || 0,
    );
    if (!currentQty || currentQty > available) {
      form.setFieldValue(
        ["items", index, "quantity"],
        available > 0 ? available : undefined,
      );
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    for (const [index, line] of values.items.entries()) {
      const itemId = line.itemId as string;
      const qty = Number(line.quantity) || 0;
      const available = availableByItemId.get(itemId) ?? 0;
      const item = items.find((row) => row.id === itemId);
      const label = item
        ? `${item.itemCode} — ${item.itemNameTh}`
        : `รายการที่ ${index + 1}`;

      if (!(available > 1e-9) && mode === "create") {
        message.error(`${label}: ไม่มีสต๊อกพร้อมใช้`);
        return;
      }

      const usedElsewhere = values.items.reduce((sum, other, i) => {
        if (i === index || other.itemId !== itemId) return sum;
        return sum + (Number(other.quantity) || 0);
      }, 0);
      const remaining = Number(
        Math.max(0, available - usedElsewhere).toFixed(3),
      );

      if (qty > remaining + 1e-9) {
        message.error(
          `${label}: จำนวน ${formatQty(qty)} เกินคงเหลือที่ขอได้ ${formatQty(remaining)} (สต๊อกพร้อมใช้ ${formatQty(available)})`,
        );
        return;
      }
    }

    const body: CreateQuotationBody = {
      quotationDate: values.quotationDate.format("YYYY-MM-DD"),
      customerId: values.customerId,
      paymentTermId: values.paymentTermId,
      taxRateId: values.taxRateId,
      validUntil: values.validUntil
        ? values.validUntil.format("YYYY-MM-DD")
        : undefined,
      discountAmount: values.discountAmount ?? 0,
      remark: values.remark?.trim() || undefined,
      items: values.items.map((line) => ({
        itemId: line.itemId as string,
        unitId: line.unitId as string,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        discountAmount: Number(line.discountAmount) || 0,
        description: line.description?.trim() || undefined,
      })),
    };

    if (mode === "create") {
      createMutation.mutate(body, {
        onSuccess: (res) => {
          router.push(`/quotations/${res.data.id}`);
        },
      });
      return;
    }

    if (!id) return;
    updateMutation.mutate(
      { id, body },
      {
        onSuccess: () => {
          router.push(`/quotations/${id}`);
        },
      },
    );
  };

  const itemsLoading = itemsQuery.isLoading || balancesQuery.isLoading;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Quotation</p>
          <h1 className={styles.pageTitle}>
            {mode === "create" ? "สร้างใบเสนอราคา" : "แก้ไขใบเสนอราคา"}
          </h1>
          <p className={styles.pageSubtitle}>
            เลือกลูกค้าและสินค้าที่มีสต๊อกพร้อมใช้ — แสดงจำนวนคงเหลือในรายการ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              router.push(
                mode === "edit" && id ? `/quotations/${id}` : "/quotations",
              )
            }
          >
            กลับ
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            disabled={saving}
            onFinish={() => void handleSubmit()}
          >
            <div className={styles.formBody}>
              <div className={styles.sectionBlock}>
                <Typography.Title level={5}>ข้อมูลหัวเอกสาร</Typography.Title>
                <div className={styles.formGrid}>
                  <Form.Item
                    name="customerId"
                    label="ลูกค้า"
                    rules={[{ required: true, message: "เลือกลูกค้า" }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="เลือกจาก Master ลูกค้า"
                      loading={customersQuery.isLoading}
                      notFoundContent={
                        customersQuery.isLoading
                          ? "กำลังโหลด..."
                          : customersQuery.isError
                            ? "โหลดลูกค้าไม่สำเร็จ — ตรวจสิทธิ์หรือลองรีเฟรช"
                            : "ไม่พบลูกค้า — ไปเพิ่มที่ Master ลูกค้า"
                      }
                      options={customers.map((c) => ({
                        value: c.id,
                        label: `${c.customerCode} — ${c.nameTh}${
                          c.isActive ? "" : " (ปิดใช้งาน)"
                        }`,
                        disabled: !c.isActive,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item
                    name="quotationDate"
                    label="วันที่"
                    rules={[{ required: true, message: "เลือกวันที่" }]}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="validUntil" label="วันหมดอายุ">
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="paymentTermId" label="เงื่อนไขชำระ">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="ถ้ามี"
                      options={paymentTerms.map((t) => ({
                        value: t.id,
                        label: `${t.code} — ${t.name}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="taxRateId" label="อัตราภาษี (VAT)">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="ไม่เลือก = VAT 0"
                      options={taxRates.map((t) => ({
                        value: t.id,
                        label: `${t.code} — ${t.name} (${t.rate}%)`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="discountAmount" label="ส่วนลดหัวเอกสาร">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item
                    className={styles.formGridFull}
                    name="remark"
                    label="หมายเหตุ"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <Typography.Title level={5}>รายการสินค้า</Typography.Title>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: -4, marginBottom: 12 }}
                >
                  เลือกได้เฉพาะสินค้าที่มีสต๊อกพร้อมใช้ &gt; 0 และจำนวนที่ขอต้องไม่เกินคงเหลือ
                </Typography.Paragraph>
                <Form.List
                  name="items"
                  rules={[
                    {
                      validator: async (_, value) => {
                        if (!value || value.length < 1) {
                          return Promise.reject(
                            new Error("เพิ่มอย่างน้อย 1 รายการ"),
                          );
                        }
                      },
                    },
                  ]}
                >
                  {(fields, { add, remove }, { errors }) => (
                    <div className={styles.lineList}>
                      {fields.map((field, index) => {
                        const lineItemId = watchedItems[index]?.itemId;
                        const availableTotal = lineItemId
                          ? (availableByItemId.get(lineItemId) ?? 0)
                          : 0;
                        const maxQty = getAvailableForLine(index, lineItemId);

                        return (
                          <div key={field.key} className={styles.lineCard}>
                            <div className={styles.lineCardHeader}>
                              <strong>รายการที่ {index + 1}</strong>
                              {fields.length > 1 ? (
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}
                                >
                                  ลบ
                                </Button>
                              ) : null}
                            </div>
                            <div className={styles.formGrid}>
                              <Form.Item
                                className={styles.formGridFull}
                                name={[field.name, "itemId"]}
                                label="สินค้า"
                                rules={[
                                  { required: true, message: "เลือกสินค้า" },
                                ]}
                                extra={
                                  lineItemId
                                    ? `สต๊อกพร้อมใช้รวม ${formatQty(availableTotal)} · ขอในบรรทัดนี้ได้สูงสุด ${formatQty(maxQty)}`
                                    : "แสดงเฉพาะสินค้าที่มีสต๊อกพร้อมใช้"
                                }
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder="เลือกสินค้าที่มีสต๊อก"
                                  loading={itemsLoading}
                                  notFoundContent={
                                    itemsLoading
                                      ? "กำลังโหลด..."
                                      : "ไม่พบสินค้าที่มีสต๊อกพร้อมใช้"
                                  }
                                  options={selectableItems.map((item) => {
                                    const available =
                                      availableByItemId.get(item.id) ?? 0;
                                    return {
                                      value: item.id,
                                      label: `${item.itemCode} — ${item.itemNameTh} (คงเหลือ ${formatQty(available)})`,
                                    };
                                  })}
                                  onChange={(value) =>
                                    handleItemChange(index, value)
                                  }
                                />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "quantity"]}
                                label="จำนวน"
                                rules={[
                                  { required: true, message: "กรอกจำนวน" },
                                  {
                                    validator: async (_, value) => {
                                      const qty = Number(value) || 0;
                                      const itemId = form.getFieldValue([
                                        "items",
                                        index,
                                        "itemId",
                                      ]) as string | undefined;
                                      if (!itemId) return;
                                      const max = getAvailableForLine(
                                        index,
                                        itemId,
                                      );
                                      if (qty > max + 1e-9) {
                                        return Promise.reject(
                                          new Error(
                                            `ต้องไม่เกินคงเหลือ ${formatQty(max)}`,
                                          ),
                                        );
                                      }
                                    },
                                  },
                                ]}
                              >
                                <InputNumber
                                  min={0.001}
                                  max={maxQty > 0 ? maxQty : undefined}
                                  step={0.001}
                                  style={{ width: "100%" }}
                                  disabled={!lineItemId}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "unitId"]}
                                label="หน่วย"
                                rules={[
                                  { required: true, message: "เลือกหน่วย" },
                                ]}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  options={units.map((u) => ({
                                    value: u.id,
                                    label: `${u.code} — ${u.nameTh}`,
                                  }))}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "unitPrice"]}
                                label="ราคา/หน่วย"
                                rules={[
                                  { required: true, message: "กรอกราคา" },
                                ]}
                              >
                                <InputNumber min={0} style={{ width: "100%" }} />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "discountAmount"]}
                                label="ส่วนลดรายการ"
                              >
                                <InputNumber min={0} style={{ width: "100%" }} />
                              </Form.Item>
                              <Form.Item
                                className={styles.formGridFull}
                                name={[field.name, "description"]}
                                label="รายละเอียด"
                              >
                                <Input />
                              </Form.Item>
                            </div>
                          </div>
                        );
                      })}
                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        disabled={selectableItems.length === 0}
                        onClick={() => add({ discountAmount: 0 })}
                      >
                        เพิ่มรายการ
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </div>
                  )}
                </Form.List>
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                ยอดที่แสดงเป็นประมาณการ — ยอดจริงคำนวณที่เซิร์ฟเวอร์หลังบันทึก
              </p>
              <div className={styles.footerActions}>
                <Button
                  onClick={() =>
                    router.push(
                      mode === "edit" && id ? `/quotations/${id}` : "/quotations",
                    )
                  }
                >
                  ยกเลิก
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  className={styles.primaryBtn}
                  loading={saving}
                >
                  บันทึก DRAFT
                </Button>
              </div>
            </div>
          </Form>
        </section>

        <aside className={styles.summaryCard}>
          <div className={styles.summaryEyebrow}>SUMMARY</div>
          <h3 className={styles.summaryTitle}>สรุปยอด</h3>
          <p className={styles.summaryLead}>
            {selectedCustomer
              ? `${selectedCustomer.customerCode} — ${selectedCustomer.nameTh}`
              : "ยังไม่ได้เลือกลูกค้า"}
          </p>
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(preview.subtotal)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Discount</span>
              <strong>{formatMoney(preview.discount)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>VAT</span>
              <strong>{formatMoney(preview.vat)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Total</span>
              <strong>{formatMoney(preview.total)}</strong>
            </div>
          </div>
          <p className={styles.masterHint}>
            สินค้าที่มีสต๊อก {selectableItems.length} รายการ ·{" "}
            <Link href="/inventory/stock-balances?itemCategoryCode=FINISHED_GOODS">
              ดูยอดคงเหลือ
            </Link>
            {" · "}
            <Link href="/customers">ลูกค้า</Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
