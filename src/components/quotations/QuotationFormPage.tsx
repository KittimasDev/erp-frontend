"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
  FilePdfOutlined,
  FileTextOutlined,
  PlusOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import DocumentHtmlEditor from "@/components/common/DocumentHtmlEditor";
import QuickCreateCustomerModal from "@/components/masters/customers/QuickCreateCustomerModal";
import UnitPriceSourceHint from "@/components/quotations/UnitPriceSourceHint";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitFieldResolver } from "@/hooks/unit-conversions/useUnitFieldResolver";
import { useCustomersQuery } from "@/hooks/customers/useCustomersQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { usePaymentTermsQuery } from "@/hooks/payment-terms/usePaymentTermsQuery";
import {
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
} from "@/hooks/quotations/useQuotationMutations";
import {
  useQuotationItemAvailabilityQuery,
  useQuotationQuery,
} from "@/hooks/quotations/useQuotationsQuery";
import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";
import type { CreateQuotationBody } from "@/types/quotations";
import { getStoredUser } from "@/lib/auth/session";
import {
  calcDocumentTotals,
  calcLineAmount,
  calcWithholdingAmount,
  resolveDocumentVatPercent,
  resolveVatMode,
  resolveWithholdingPercent,
  resolveWithholdingTaxType,
  VatMode,
  WITHHOLDING_TAX_TYPE_OPTIONS,
  WithholdingTaxType,
  withVatPercentLabel,
} from "@/lib/money/vat-totals";

import styles from "./QuotationFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";

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
  contactName?: string;
  customerAddress?: string;
  preparedByPhone?: string;
  paymentTermId?: string;
  vatMode: VatMode;
  withholdingTaxType: WithholdingTaxType;
  withholdingTaxPercent?: number;
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

function displayDash(value?: string | null) {
  const text = value?.trim();
  return text ? text : "—";
}

const QUOTATION_VAT_MODE_OPTIONS = [
  { value: VatMode.NONE, label: "ไม่คิดภาษีมูลค่าเพิ่ม" },
  { value: VatMode.EXCLUSIVE, label: "ไม่รวมในราคา" },
  { value: VatMode.INCLUSIVE, label: "รวมในราคา" },
];

export default function QuotationFormPage({ mode, id }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const detailQuery = useQuotationQuery(mode === "edit" ? id : undefined);
  const createMutation = useCreateQuotationMutation();
  const updateMutation = useUpdateQuotationMutation();

  const quotationActions = useScreenActionPermissions("QUOTATIONS");
  const customerActions = useScreenActionPermissions("MASTERS_CUSTOMERS");
  const itemActions = useScreenActionPermissions("MASTERS_ITEMS");
  const canCreate = quotationActions.canAdd;
  const canEdit = quotationActions.canEdit;
  const canCreateCustomer = customerActions.canAdd;
  const allowed = mode === "create" ? canCreate : canEdit;

  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const customersQuery = useCustomersQuery();
  const itemsQuery = useItemsQuery({
    isActive: true,
    isFinishedGood: true,
    isSalesItem: true,
  });
  const availabilityQuery = useQuotationItemAvailabilityQuery({
    isFinishedGood: true,
  });
  const paymentTermsQuery = usePaymentTermsQuery({ isActive: true });

  const customers = customersQuery.data?.data ?? [];
  const items = itemsQuery.data?.data ?? [];
  // dropdown หน่วยต้องเสนอเท่าที่ backend โดเมนนี้รับได้ = หน่วยหลักของสินค้าเท่านั้น
  /*
    เปิดให้เลือกหน่วยอื่นได้เมื่อ backend โดเมนนี้แปลงหน่วยจริงแล้ว **และ**
    สวิตช์ระดับระบบเปิดอยู่ — ดู lib/units/domainCapability.ts
    ปิดอยู่ = dropdown เหลือหน่วยหลักตัวเดียวเหมือนเดิมทุกประการ
  */
  const canPickUnit = useDomainConvertsUnits("SALES_QUOTATIONS");
  const { resolveUnitField } = useUnitFieldResolver(items, canPickUnit);
  const paymentTerms = paymentTermsQuery.data?.data ?? [];

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discountAmount", form) ?? 0;
  const watchedVatMode = Form.useWatch("vatMode", form);
  const watchedWhtType = Form.useWatch("withholdingTaxType", form);
  const watchedWhtPercent = Form.useWatch("withholdingTaxPercent", form);
  const watchedCustomerId = Form.useWatch("customerId", form);
  const preparedByName =
    getStoredUser()?.displayName?.trim() ||
    getStoredUser()?.username ||
    "—";

  const availableByItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of availabilityQuery.data?.data ?? []) {
      map.set(row.itemId, Number(row.quantityAvailable || 0));
    }
    return map;
  }, [availabilityQuery.data?.data]);

  const itemSelectOptions = useMemo(() => {
    return items
      .map((item) => {
        const available = availableByItemId.get(item.id) ?? 0;
        const hasStock = available > 1e-9;
        return {
          value: item.id,
          available,
          label: hasStock
            ? `${item.itemCode} — ${item.itemNameTh} (คงเหลือ ${formatQty(available)})`
            : `${item.itemCode} — ${item.itemNameTh} (ไม่มีสต๊อก)`,
        };
      })
      .sort((a, b) => {
        const aHasStock = a.available > 1e-9;
        const bHasStock = b.available > 1e-9;
        if (aHasStock !== bHasStock) {
          return aHasStock ? -1 : 1;
        }
        return a.label.localeCompare(b.label, "th");
      });
  }, [availableByItemId, items]);

  useEffect(() => {
    if (mode === "create") {
      form.setFieldsValue({
        quotationDate: dayjs(),
        discountAmount: 0,
        vatMode: VatMode.EXCLUSIVE,
        withholdingTaxType: WithholdingTaxType.NONE,
        withholdingTaxPercent: 0,
        remark: "",
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
      contactName: data.contactName,
      customerAddress: data.customerAddress,
      preparedByPhone: data.preparedByPhone,
      paymentTermId: data.paymentTermId,
      vatMode: resolveVatMode(data.vatMode),
      withholdingTaxType: resolveWithholdingTaxType(data.withholdingTaxType),
      withholdingTaxPercent: Number(data.withholdingTaxPercent) || 0,
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

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === watchedCustomerId),
    [customers, watchedCustomerId],
  );

  const preview = useMemo(() => {
    const vatMode = resolveVatMode(watchedVatMode);
    const lineAmounts = watchedItems.map((line) =>
      calcLineAmount(
        Number(line?.quantity) || 0,
        Number(line?.unitPrice) || 0,
        Number(line?.discountAmount) || 0,
      ),
    );
    // อัตรา VAT = 7% เมื่อรูปแบบไม่ใช่ไม่คิด VAT (ดู resolveDocumentVatPercent)
    const rate = resolveDocumentVatPercent({
      vatMode,
      withholdingTaxType: watchedWhtType,
      withholdingTaxPercent: watchedWhtPercent,
    });
    const totals = calcDocumentTotals(
      lineAmounts,
      Number(watchedDiscount) || 0,
      vatMode,
      rate,
    );
    const whtPercent = resolveWithholdingPercent(
      watchedWhtType,
      watchedWhtPercent,
    );
    return {
      ...totals,
      vatRate: rate,
      whtPercent,
      whtAmount: calcWithholdingAmount(totals.taxableBase, whtPercent),
      lineAmounts,
    };
  }, [
    watchedItems,
    watchedDiscount,
    watchedVatMode,
    watchedWhtType,
    watchedWhtPercent,
  ]);

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleDraftPreview = async () => {
    const values = form.getFieldsValue();
    const { generateSalesQuotationPdf } = await import(
      "@/utils/generateSalesQuotationPdf"
    );
    const stored = getStoredUser();
    await generateSalesQuotationPdf({
      quotationNo:
        mode === "edit" && detailQuery.data?.data?.quotationNo
          ? detailQuery.data.data.quotationNo
          : "แบบร่างเอกสาร",
      quotationDate: values.quotationDate
        ? values.quotationDate.format("DD/MM/YYYY")
        : "—",
      customerName: selectedCustomer?.nameTh ?? "—",
      customerCode: selectedCustomer?.customerCode ?? "—",
      customerTaxId: selectedCustomer?.taxId,
      customerAddress: values.customerAddress?.trim() || undefined,
      customerPhone: selectedCustomer?.contactPhone,
      contactName: values.contactName?.trim() || "—",
      paymentTerm:
        paymentTerms.find((term) => term.id === values.paymentTermId)?.name ??
        "—",
      taxRateLabel: withVatPercentLabel(
        QUOTATION_VAT_MODE_OPTIONS.find(
          (option) => option.value === resolveVatMode(values.vatMode),
        )?.label ?? "—",
        preview.vatRate,
      ),
      vatMode: resolveVatMode(values.vatMode),
      withholdingTaxType: values.withholdingTaxType,
      validUntil: values.validUntil
        ? values.validUntil.format("DD/MM/YYYY")
        : "—",
      remark: sanitizeDocumentHtml(values.remark) || "",
      preparedBy: { id: stored?.id, name: preparedByName },
      preparedByPhone: values.preparedByPhone,
      draftBanner: mode === "create" ? "ตัวอย่างเอกสารร่าง" : undefined,
      subtotalAmount: preview.subtotal,
      discountAmount: preview.discount,
      afterDiscount: preview.afterDiscount,
      vatAmount: preview.vat,
      vatRate: preview.vatRate,
      withholdingAmount: preview.whtAmount,
      withholdingPercent: preview.whtPercent,
      totalAmount: preview.total,
      items: (values.items ?? []).map((line, index) => {
        const item = items.find((row) => row.id === line.itemId);
        return {
          no: index + 1,
          itemCode: item?.itemCode ?? "—",
          itemName: item?.itemNameTh ?? line.description ?? "—",
          unit: item?.unit?.nameTh ?? item?.unit?.code ?? "—",
          qty: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
          discountAmount: Number(line.discountAmount) || 0,
          amount: preview.lineAmounts[index] ?? 0,
        };
      }),
    });
  };

  const handleItemChange = (index: number, itemId?: string) => {
    if (!itemId) {
      return;
    }
    const item = items.find((row) => row.id === itemId);
    if (item?.unitId) {
      form.setFieldValue(["items", index, "unitId"], item.unitId);
    }
    /*
      เติมราคาขายจาก master ให้ตอนเลือกสินค้า แล้วผู้ใช้แก้ทับได้ตามปกติ
      ทำเฉพาะตอนเปลี่ยนสินค้าเท่านั้น จึงไม่ไปทับราคาที่พิมพ์ไว้เองหรือราคาเดิม
      ของใบเสนอราคาที่เปิดขึ้นมาแก้
    */
    if (item?.sellingPrice != null) {
      form.setFieldValue(
        ["items", index, "unitPrice"],
        Number(item.sellingPrice),
      );
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    const vatMode = resolveVatMode(values.vatMode);
    const body: CreateQuotationBody = {
      quotationDate: values.quotationDate.format("YYYY-MM-DD"),
      customerId: values.customerId,
      contactName: values.contactName?.trim() || undefined,
      customerAddress: values.customerAddress?.trim() ?? "",
      preparedByPhone: values.preparedByPhone?.trim() || undefined,
      paymentTermId: values.paymentTermId,
      vatMode,
      withholdingTaxType: values.withholdingTaxType,
      withholdingTaxPercent: resolveWithholdingPercent(
        values.withholdingTaxType,
        values.withholdingTaxPercent,
      ),
      validUntil: values.validUntil
        ? values.validUntil.format("YYYY-MM-DD")
        : undefined,
      discountAmount: values.discountAmount ?? 0,
      remark: sanitizeDocumentHtml(values.remark) || undefined,
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

  const itemsLoading = itemsQuery.isLoading || availabilityQuery.isLoading;

  if (!allowed) {
    return <AccessDenied screenCodes={["QUOTATIONS"]} />;
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="ใบเสนอราคา"
        icon={<FileTextOutlined />}
        title={mode === "create" ? "สร้างใบเสนอราคา" : "แก้ไขใบเสนอราคา"}
        subtitle="เลือกลูกค้าและสินค้าสำเร็จรูป — แสดงยอดคงเหลือเพื่ออ้างอิง (ยังไม่ตัดสต๊อก)"
        actions={
          <>
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
          </>
        }
      />

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
                <Typography.Title level={5}>ข้อมูลลูกค้า</Typography.Title>
                <div className={styles.formGrid}>
                  <Form.Item label="ลูกค้า" required>
                    <div className={styles.customerField}>
                      <Form.Item
                        name="customerId"
                        noStyle
                        rules={[{ required: true, message: "เลือกลูกค้า" }]}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder="เลือกลูกค้า"
                          loading={customersQuery.isLoading}
                          notFoundContent={
                            customersQuery.isLoading
                              ? "กำลังโหลด..."
                              : customersQuery.isError
                                ? "โหลดลูกค้าไม่สำเร็จ — ตรวจสิทธิ์หรือลองรีเฟรช"
                                : "ไม่พบลูกค้า — กดเพิ่มลูกค้าใหม่ได้เลย"
                          }
                          options={customers.map((c) => ({
                            value: c.id,
                            label: `${c.customerCode} — ${c.nameTh}${
                              c.isActive ? "" : " (ปิดใช้งาน)"
                            }`,
                            disabled: !c.isActive,
                          }))}
                          onChange={(customerId) => {
                            const customer = customers.find(
                              (row) => row.id === customerId,
                            );
                            form.setFieldValue(
                              "contactName",
                              customer?.contactName?.trim() || undefined,
                            );
                            form.setFieldValue(
                              "customerAddress",
                              customer?.address?.trim() || undefined,
                            );
                          }}
                          popupRender={(menu) => (
                            <>
                              {menu}
                              {canCreateCustomer ? (
                                <div className={styles.customerDropdownFooter}>
                                  <Button
                                    type="link"
                                    icon={<UserAddOutlined />}
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => setCustomerModalOpen(true)}
                                  >
                                    เพิ่มลูกค้าใหม่
                                  </Button>
                                </div>
                              ) : null}
                            </>
                          )}
                        />
                      </Form.Item>
                      {canCreateCustomer ? (
                        <Button
                          icon={<UserAddOutlined />}
                          onClick={() => setCustomerModalOpen(true)}
                          aria-label="เพิ่มลูกค้าใหม่"
                        >
                          เพิ่ม
                        </Button>
                      ) : null}
                    </div>
                  </Form.Item>
                  <Form.Item label="รหัสลูกค้า">
                    <Input
                      disabled
                      value={displayDash(selectedCustomer?.customerCode)}
                    />
                  </Form.Item>
                  <Form.Item label="เลขที่ผู้เสียภาษี">
                    <Input
                      disabled
                      value={displayDash(selectedCustomer?.taxId)}
                    />
                  </Form.Item>
                  <Form.Item label="เบอร์โทร">
                    <Input
                      disabled
                      value={displayDash(selectedCustomer?.contactPhone)}
                    />
                  </Form.Item>
                  <Form.Item
                    className={styles.formGridFull}
                    name="customerAddress"
                    label="ที่อยู่"
                    extra="ใช้ต่อในใบสั่งขายและเป็นค่าเริ่มต้นที่อยู่จัดส่งของใบส่งสินค้า"
                  >
                    <Input.TextArea
                      rows={2}
                      maxLength={2000}
                      placeholder="ดึงจากข้อมูลลูกค้า แล้วแก้ได้"
                    />
                  </Form.Item>
                  <Form.Item name="contactName" label="ผู้ติดต่อ">
                    <Input placeholder="ดึงจากข้อมูลลูกค้า แล้วแก้ได้" />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <Typography.Title level={5}>
                  การชำระเงินและการจัดส่ง
                </Typography.Title>
                <div className={styles.formGrid}>
                  <Form.Item
                    name="quotationDate"
                    label="วันที่เอกสาร"
                    rules={[{ required: true, message: "เลือกวันที่เอกสาร" }]}
                  >
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="validUntil" label="วันหมดอายุ">
                    <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="paymentTermId" label="เงื่อนไขการชำระเงิน">
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
                  {/*
                    ไม่มีช่อง "อัตราภาษี" — เมื่อคิด VAT บังคับ 7% ตามรูปแบบภาษีมูลค่าเพิ่ม
                    (ดู resolveDocumentVatPercent)
                  */}
                  <Form.Item name="vatMode" label="รูปแบบภาษีมูลค่าเพิ่ม">
                    <Select options={QUOTATION_VAT_MODE_OPTIONS} />
                  </Form.Item>
                  <Form.Item
                    name="withholdingTaxType"
                    label="ภาษีหัก ณ ที่จ่าย"
                  >
                    <Select options={WITHHOLDING_TAX_TYPE_OPTIONS} />
                  </Form.Item>
                  {watchedWhtType === WithholdingTaxType.CUSTOM ? (
                    <Form.Item
                      name="withholdingTaxPercent"
                      label="อัตราหัก ณ ที่จ่าย (%)"
                    >
                      <InputNumber min={0} max={100} style={{ width: "100%" }} />
                    </Form.Item>
                  ) : null}
                  <Form.Item name="discountAmount" label="ส่วนลดท้ายบิล">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item label="ผู้เสนอราคา">
                    <Input value={preparedByName} disabled />
                  </Form.Item>
                  <Form.Item name="preparedByPhone" label="เบอร์โทรผู้เสนอราคา">
                    <Input placeholder="เช่น 0812345678" />
                  </Form.Item>
                  <Form.Item
                    className={styles.formGridFull}
                    name="remark"
                    label="หมายเหตุ"
                    style={{ marginBottom: 0 }}
                  >
                    <DocumentHtmlEditor
                      ariaLabel="หมายเหตุ"
                      placeholder="รายละเอียดเพิ่มเติมบนใบเสนอราคา"
                    />
                  </Form.Item>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <Typography.Title level={5}>รายการสินค้า</Typography.Title>
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginTop: -4, marginBottom: 12 }}
                >
                  เลือกสินค้าสำเร็จรูปที่เปิดใช้งานได้ — ใบเสนอราคายังไม่ตัดสต๊อก
                  (แสดงยอดคงเหลือเพื่ออ้างอิง)
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
                        const lineItem = lineItemId
                          ? items.find((row) => row.id === lineItemId)
                          : undefined;
                        const availableTotal = lineItemId
                          ? (availableByItemId.get(lineItemId) ?? 0)
                          : 0;

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
                                    ? `สต๊อกพร้อมใช้: ${formatQty(availableTotal)} (อ้างอิง — ใบเสนอราคาไม่ตัดสต๊อก)`
                                    : "สินค้าสำเร็จรูปที่เปิดใช้งาน"
                                }
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="label"
                                  placeholder="เลือกสินค้า"
                                  loading={itemsLoading}
                                  notFoundContent={
                                    itemsLoading
                                      ? "กำลังโหลด..."
                                      : "ไม่พบสินค้าสำเร็จรูป"
                                  }
                                  options={itemSelectOptions}
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
                                      if (!(Number(value) > 0)) {
                                        return Promise.reject(
                                          new Error("จำนวนต้องมากกว่า 0"),
                                        );
                                      }
                                    },
                                  },
                                ]}
                              >
                                <InputNumber
                                  min={0.001}
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
                                  optionFilterProp="title"
                                  {...resolveUnitField(
                                    watchedItems[field.name]?.itemId,
                                    watchedItems[field.name]?.unitId,
                                  )}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "unitPrice"]}
                                label="ราคา/หน่วย"
                                rules={[
                                  { required: true, message: "กรอกราคา" },
                                ]}
                                extra={
                                  <UnitPriceSourceHint
                                    item={lineItem}
                                    currentPrice={
                                      watchedItems[index]?.unitPrice
                                    }
                                    canViewItemMaster={itemActions.canView}
                                    onUseBasePrice={() => {
                                      if (lineItem?.sellingPrice == null) {
                                        return;
                                      }
                                      form.setFieldValue(
                                        ["items", field.name, "unitPrice"],
                                        Number(lineItem.sellingPrice),
                                      );
                                    }}
                                  />
                                }
                              >
                                <InputNumber min={0} style={{ width: "100%" }} />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "discountAmount"]}
                                label="ส่วนลดรายการ"
                              >
                                <InputNumber min={0} style={{ width: "100%" }} />
                              </Form.Item>
                              <div className={styles.lineAmount}>
                                <span>จำนวนเงิน</span>
                                <strong>
                                  {formatMoney(
                                    preview.lineAmounts[index] ?? 0,
                                  )}
                                </strong>
                              </div>
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
                        disabled={items.length === 0}
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
                  htmlType="button"
                  icon={<FilePdfOutlined />}
                  onClick={() => void handleDraftPreview()}
                >
                  ดูตัวอย่าง
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  className={styles.primaryBtn}
                  loading={saving}
                >
                  บันทึกร่าง
                </Button>
              </div>
            </div>
          </Form>
        </section>

        <aside className={styles.summaryCard}>
          <h3 className={styles.summaryTitle}>สรุปยอดเงิน</h3>
          <p className={styles.summaryLead}>
            {selectedCustomer
              ? `${selectedCustomer.customerCode} — ${selectedCustomer.nameTh}`
              : "ยังไม่ได้เลือกลูกค้า"}
          </p>
          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span>ยอดรวมก่อนส่วนลด</span>
              <strong>{formatMoney(preview.subtotal)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>ส่วนลดท้ายบิล</span>
              <strong>{formatMoney(preview.discount)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>ยอดหลังหักส่วนลด</span>
              <strong>{formatMoney(preview.afterDiscount)}</strong>
            </div>
            <p className={styles.summaryHint}>ฐานก่อนคำนวณภาษีมูลค่าเพิ่ม</p>
            <div className={styles.summaryRow}>
              <span>
                {preview.vatRate > 0
                  ? `ภาษีมูลค่าเพิ่ม ${preview.vatRate}%`
                  : "ภาษีมูลค่าเพิ่ม"}
              </span>
              <strong>{formatMoney(preview.vat)}</strong>
            </div>
            {preview.whtPercent > 0 ? (
              <div className={styles.summaryRow}>
                <span>ภาษีหัก ณ ที่จ่าย {preview.whtPercent}%</span>
                <strong>{formatMoney(preview.whtAmount)}</strong>
              </div>
            ) : null}
            <div className={styles.summaryRow}>
              <span>ยอดสุทธิ</span>
              <strong>{formatMoney(preview.total)}</strong>
            </div>
          </div>
          <p className={styles.masterHint}>
            สินค้าสำเร็จรูป {items.length} รายการ
            {itemSelectOptions.length
              ? ` · มีสต๊อก ${itemSelectOptions.filter((row) => row.available > 1e-9).length} · ไม่มีสต๊อก ${itemSelectOptions.filter((row) => row.available <= 1e-9).length}`
              : ""}{" "}
            ·{" "}
            <Link href="/inventory/stock-balances?isFinishedGood=true">
              ดูยอดคงเหลือ
            </Link>
            {" · "}
            <Link href="/customers">ลูกค้า</Link>
          </p>
        </aside>
      </div>

      <QuickCreateCustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={(customer) => {
          form.setFieldValue("customerId", customer.id);
          form.setFieldValue(
            "contactName",
            customer.contactName?.trim() || undefined,
          );
          form.setFieldValue(
            "customerAddress",
            customer.address?.trim() || undefined,
          );
          void customersQuery.refetch();
        }}
      />
    </div>
  );
}
