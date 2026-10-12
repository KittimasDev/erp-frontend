"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useApDocumentQuery,
  useApInvoiceOptionsQuery,
  useApPurchaseOrderOptionsQuery,
  useSaveApDocumentMutation,
} from "@/hooks/ap-documents/useApDocuments";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { STANDARD_VAT_PERCENT, VAT_MODE_OPTIONS } from "@/lib/money/vat-totals";
import type {
  ApDocumentKind,
  SaveApDebitNoteBody,
  SaveApInvoiceBody,
} from "@/types/ap-documents";
import { purchaseOrderStatusLabel } from "@/types/purchase-orders";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money, previewTotals } from "./apDocumentConfig";

type Props = { kind: ApDocumentKind; id?: string };

type LineValues = {
  description?: string;
  quantity?: number;
  unitLabel?: string;
  unitPrice?: number;
};

type FormValues = {
  creditorId?: string;
  purchaseOrderId?: string;
  referenceDocumentId?: string;
  reason?: string;
  docDate?: Dayjs;
  supplierDocNo?: string;
  supplierDocDate?: Dayjs;
  dueDate?: Dayjs;
  vatMode: string;
  taxRateId?: string;
  remark?: string;
  items: LineValues[];
};

const EMPTY_LINE: LineValues = { quantity: 1 };

const toDate = (value?: Dayjs) => (value ? value.format("YYYY-MM-DD") : undefined);

export default function ApDocumentFormPage({ kind, id }: Props) {
  const config = AP_DOCUMENT_CONFIG[kind];
  const isInvoice = kind === "invoice";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const perms = useScreenActionPermissions(config.screenCode);
  const allowed = id ? perms.canEdit : perms.canAdd;

  const existingQuery = useApDocumentQuery(kind, id ?? "");
  const existing = existingQuery.data;
  const saveMutation = useSaveApDocumentMutation(kind, id);

  const creditorId = Form.useWatch("creditorId", form);
  const vatMode = Form.useWatch("vatMode", form) ?? "EXCLUSIVE";
  const taxRateId = Form.useWatch("taxRateId", form);
  const watchedLines = Form.useWatch("items", form);
  const lines = useMemo(() => watchedLines ?? [], [watchedLines]);

  const vendorsQuery = useVendorsQuery({ isActive: true });
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });
  const poOptionsQuery = useApPurchaseOrderOptionsQuery(isInvoice ? creditorId : undefined);
  const invoiceOptionsQuery = useApInvoiceOptionsQuery(isInvoice ? undefined : creditorId);

  const taxRates = taxRatesQuery.data?.data ?? [];
  const vatRate =
    vatMode === "NONE"
      ? 0
      : taxRateId
        ? Number(taxRates.find((rate) => rate.id === taxRateId)?.rate ?? STANDARD_VAT_PERCENT)
        : STANDARD_VAT_PERCENT;
  const totals = useMemo(() => previewTotals(lines, vatMode, vatRate), [lines, vatMode, vatRate]);

  /* เติมค่าครั้งเดียว — แก้ใบเดิม หรือกด "ออกใบเพิ่มหนี้" มาจากหน้าใบตั้งหนี้ (?creditorId=&invoiceId=) */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (id) {
      if (!existing) return;
      seeded.current = true;
      form.setFieldsValue({
        creditorId: existing.creditorId,
        purchaseOrderId: existing.purchaseOrderId ?? undefined,
        referenceDocumentId: existing.referenceDocumentId ?? undefined,
        reason: existing.reason ?? undefined,
        docDate: dayjs(existing.docDate),
        supplierDocNo: existing.supplierDocNo ?? undefined,
        supplierDocDate: existing.supplierDocDate ? dayjs(existing.supplierDocDate) : undefined,
        dueDate: existing.dueDate ? dayjs(existing.dueDate) : undefined,
        vatMode: existing.vatMode,
        taxRateId: existing.taxRateId ?? undefined,
        remark: existing.remark ?? undefined,
        items: existing.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitLabel: item.unitLabel ?? undefined,
          unitPrice: item.unitPrice,
        })),
      });
      return;
    }
    seeded.current = true;
    form.setFieldsValue({
      creditorId: searchParams.get("creditorId") ?? undefined,
      referenceDocumentId: searchParams.get("invoiceId") ?? undefined,
    });
  }, [existing, form, id, searchParams]);

  /*
    มาจากปุ่ม "ออกใบเพิ่มหนี้" — ใบตั้งหนี้ถูกเลือกไว้ก่อนตัวเลือกโหลดเสร็จ onChange จึงไม่ทำงาน
    ตั้งการคิด VAT ตามใบตั้งหนี้ให้ครั้งเดียวเมื่อรายการตัวเลือกมาถึง (เฉพาะใบใหม่ ไม่ทับใบที่กำลังแก้)
  */
  const vatSeededFromInvoice = useRef(false);
  useEffect(() => {
    if (id || isInvoice || vatSeededFromInvoice.current || !invoiceOptionsQuery.data) return;
    const preset = searchParams.get("invoiceId");
    const picked = invoiceOptionsQuery.data.find((option) => option.id === preset);
    if (!picked) return;
    vatSeededFromInvoice.current = true;
    form.setFieldsValue({ vatMode: picked.vatMode, taxRateId: picked.taxRateId ?? undefined });
  }, [form, id, invoiceOptionsQuery.data, isInvoice, searchParams]);

  const onCreditorChange = () => {
    form.setFieldsValue({ purchaseOrderId: undefined, referenceDocumentId: undefined });
  };

  /* ตั้งหนี้จาก PO — ตั้งต้นการคิด VAT ตาม PO ให้ แก้ต่อได้ถ้าใบแจ้งหนี้ผู้ขายออกต่างไป */
  const onPurchaseOrderPicked = (purchaseOrderId?: string) => {
    const picked = poOptionsQuery.data?.find((option) => option.id === purchaseOrderId);
    if (picked) {
      form.setFieldsValue({ vatMode: picked.vatMode, taxRateId: picked.taxRateId ?? undefined });
    }
  };

  const onInvoicePicked = (invoiceId?: string) => {
    const picked = invoiceOptionsQuery.data?.find((option) => option.id === invoiceId);
    if (picked) {
      // ใบเพิ่มหนี้ตั้งต้นการคิด VAT ตามใบตั้งหนี้ที่อ้าง — แก้ได้ถ้าผู้ขายออกต่างไป
      form.setFieldsValue({ vatMode: picked.vatMode, taxRateId: picked.taxRateId ?? undefined });
    }
  };

  const submit = async (values: FormValues) => {
    const common = {
      docDate: toDate(values.docDate),
      supplierDocNo: values.supplierDocNo?.trim() || undefined,
      supplierDocDate: toDate(values.supplierDocDate),
      vatMode: values.vatMode,
      taxRateId: values.vatMode === "NONE" ? undefined : values.taxRateId,
      remark: values.remark?.trim() || undefined,
      items: values.items.map((line) => ({
        description: (line.description ?? "").trim(),
        quantity: Number(line.quantity),
        unitLabel: line.unitLabel?.trim() || undefined,
        unitPrice: Number(line.unitPrice),
      })),
    };
    const body: SaveApInvoiceBody | SaveApDebitNoteBody = isInvoice
      ? {
          ...common,
          creditorId: values.creditorId as string,
          purchaseOrderId: values.purchaseOrderId as string,
          dueDate: toDate(values.dueDate),
        }
      : {
          ...common,
          referenceDocumentId: values.referenceDocumentId as string,
          reason: (values.reason ?? "").trim(),
        };
    try {
      const res = await saveMutation.mutateAsync(body);
      message.success(id ? "บันทึกแล้ว" : `สร้าง${config.shortLabel} ${res.data.docNo} แล้ว`);
      router.push(`${config.basePath}/${res.data.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    }
  };

  if (id && existingQuery.isLoading) return <Spin />;
  if (id && existing && existing.status !== "DRAFT") {
    return (
      <Alert
        type="warning"
        showIcon
        title={`${config.shortLabel} ${existing.docNo} ไม่ได้อยู่ในสถานะร่าง แก้ไขไม่ได้`}
        action={<Button onClick={() => router.push(`${config.basePath}/${id}`)}>กลับ</Button>}
      />
    );
  }

  return (
    <Card
      title={id ? `แก้ไข${config.shortLabel} ${existing?.docNo ?? ""}` : `สร้าง${config.title}`}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          กลับ
        </Button>
      }
    >
      {!allowed ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`บัญชีนี้ไม่มีสิทธิ์${id ? "แก้ไข" : "สร้าง"}${config.shortLabel}`}
        />
      ) : null}
      {!isInvoice ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="เลือกเจ้าหนี้ แล้วเลือกใบตั้งหนี้ที่อนุมัติแล้วที่จะเพิ่มหนี้ — ยอดในใบนี้คือส่วนที่เพิ่มขึ้นเท่านั้น"
        />
      ) : null}
      <Form<FormValues>
        form={form}
        layout="vertical"
        disabled={!allowed}
        initialValues={{ vatMode: "EXCLUSIVE", docDate: dayjs(), items: [EMPTY_LINE] }}
        onFinish={(values) => void submit(values)}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="creditorId"
              label="เจ้าหนี้"
              rules={[{ required: true, message: "เลือกเจ้าหนี้" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="เลือกเจ้าหนี้"
                loading={vendorsQuery.isLoading}
                onChange={onCreditorChange}
                options={(vendorsQuery.data?.data ?? []).map((vendor) => ({
                  value: vendor.id,
                  label: `${vendor.creditorCode} — ${vendor.nameTh}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            {isInvoice ? (
              <Form.Item
                name="purchaseOrderId"
                label="ใบสั่งซื้อ (ยืนยันแล้ว)"
                tooltip="ตั้งหนี้ได้เฉพาะใบสั่งซื้อที่อนุมัติแล้ว รวมใบที่รับของบางส่วน / รับครบ / ปิดรับบางส่วน"
                rules={[{ required: true, message: "เลือกใบสั่งซื้อที่ยืนยันแล้ว" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  disabled={!creditorId || !allowed}
                  placeholder={creditorId ? "เลือกใบสั่งซื้อ" : "เลือกเจ้าหนี้ก่อน"}
                  loading={poOptionsQuery.isFetching}
                  notFoundContent="เจ้าหนี้รายนี้ยังไม่มีใบสั่งซื้อที่ยืนยันแล้ว"
                  onChange={onPurchaseOrderPicked}
                  options={(poOptionsQuery.data ?? []).map((po) => ({
                    value: po.id,
                    label: `${po.poNo} · ${formatThaiDate(po.poDate)} · ${money.format(po.totalAmount)} · ${purchaseOrderStatusLabel(po)}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="referenceDocumentId"
                label="ใบตั้งหนี้ที่จะเพิ่มหนี้"
                rules={[{ required: true, message: "เลือกใบตั้งหนี้" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  disabled={!creditorId || !allowed}
                  placeholder={creditorId ? "เลือกใบตั้งหนี้ที่อนุมัติแล้ว" : "เลือกเจ้าหนี้ก่อน"}
                  loading={invoiceOptionsQuery.isFetching}
                  notFoundContent="เจ้าหนี้รายนี้ยังไม่มีใบตั้งหนี้ที่อนุมัติแล้ว"
                  onChange={onInvoicePicked}
                  options={(invoiceOptionsQuery.data ?? []).map((invoice) => ({
                    value: invoice.id,
                    label: `${invoice.docNo}${invoice.supplierDocNo ? ` (${invoice.supplierDocNo})` : ""} · ${money.format(invoice.totalAmount)}`,
                  }))}
                />
              </Form.Item>
            )}
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="docDate" label="วันที่เอกสาร" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="supplierDocNo"
              label={isInvoice ? "เลขที่ใบแจ้งหนี้/ใบกำกับของผู้ขาย" : "เลขที่ใบเพิ่มหนี้ของผู้ขาย"}
            >
              <Input maxLength={100} placeholder="เช่น IV-6810-0012" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="supplierDocDate" label="วันที่เอกสารผู้ขาย">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          {isInvoice ? (
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="dueDate" label="ครบกำหนดชำระ">
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          ) : null}
          {!isInvoice ? (
            <Col xs={24}>
              <Form.Item
                name="reason"
                label="เหตุผลที่เพิ่มหนี้"
                rules={[{ required: true, whitespace: true, message: "ระบุเหตุผล" }]}
              >
                <Input.TextArea rows={2} maxLength={2000} />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="vatMode" label="การคิด VAT" rules={[{ required: true }]}>
              <Select options={VAT_MODE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="taxRateId" label="อัตราภาษี">
              <Select
                allowClear
                disabled={vatMode === "NONE" || !allowed}
                placeholder={`มาตรฐาน ${STANDARD_VAT_PERCENT}%`}
                options={taxRates.map((rate) => ({
                  value: rate.id,
                  label: `${rate.name} (${Number(rate.rate)}%)`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Title level={5}>รายการ</Typography.Title>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <Space orientation="vertical" style={{ width: "100%" }} size={8}>
              {fields.map((field, index) => {
                const line = lines[field.name] ?? {};
                const amount = (line.quantity ?? 0) * (line.unitPrice ?? 0);
                return (
                  <Row key={field.key} gutter={8} align="top">
                    <Col flex="32px" style={{ paddingTop: 6 }}>
                      {index + 1}.
                    </Col>
                    <Col flex="auto">
                      <Form.Item
                        name={[field.name, "description"]}
                        rules={[{ required: true, whitespace: true, message: "ระบุรายละเอียด" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input maxLength={500} placeholder="รายละเอียด" />
                      </Form.Item>
                    </Col>
                    <Col flex="110px">
                      <Form.Item
                        name={[field.name, "quantity"]}
                        rules={[{ required: true, message: "จำนวน" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0.001} precision={3} placeholder="จำนวน" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col flex="90px">
                      <Form.Item name={[field.name, "unitLabel"]} style={{ marginBottom: 0 }}>
                        <Input maxLength={50} placeholder="หน่วย" />
                      </Form.Item>
                    </Col>
                    <Col flex="140px">
                      <Form.Item
                        name={[field.name, "unitPrice"]}
                        rules={[{ required: true, message: "ราคา" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} precision={2} placeholder="ราคา/หน่วย" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col flex="120px" style={{ paddingTop: 6, textAlign: "right" }}>
                      {money.format(amount)}
                    </Col>
                    <Col flex="40px">
                      <Button
                        icon={<DeleteOutlined />}
                        disabled={fields.length <= 1 || !allowed}
                        onClick={() => remove(field.name)}
                        aria-label={`ลบรายการที่ ${index + 1}`}
                      />
                    </Col>
                  </Row>
                );
              })}
              <Button icon={<PlusOutlined />} onClick={() => add({ ...EMPTY_LINE })}>
                เพิ่มรายการ
              </Button>
            </Space>
          )}
        </Form.List>

        <Row justify="end" style={{ marginTop: 16 }}>
          <Col xs={24} md={10}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="มูลค่าก่อน VAT">{money.format(totals.subtotal)}</Descriptions.Item>
              <Descriptions.Item label={`VAT ${vatRate}%`}>{money.format(totals.vat)}</Descriptions.Item>
              <Descriptions.Item label={isInvoice ? "ยอดตั้งหนี้" : "ยอดเพิ่มหนี้"}>
                <Typography.Text strong>{money.format(totals.total)}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Form.Item name="remark" label="หมายเหตุ" style={{ marginTop: 16 }}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            บันทึกเป็นร่าง
          </Button>
          <Typography.Text type="secondary">ร่างแก้ไขได้จนกว่าจะอนุมัติ</Typography.Text>
        </Space>
      </Form>
    </Card>
  );
}
