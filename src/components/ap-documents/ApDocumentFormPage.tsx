"use client";

import PageHeader from "@/components/common/PageHeader";
import { useEffect, useMemo, useRef, useState } from "react";
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

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useApDocumentQuery,
  useApInvoiceOptionsQuery,
  useApPurchaseOrderOptionsQuery,
  useGrnCreateInfoQuery,
  useSaveApDocumentMutation,
} from "@/hooks/ap-documents/useApDocuments";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { useT } from "@/lib/i18n/useT";
import { STANDARD_VAT_PERCENT, VAT_MODE_OPTIONS } from "@/lib/money/vat-totals";
import {
  AP_SETTLEMENT_METHOD_LABEL,
  type ApDocumentKind,
  type ApInvoiceOption,
  type SaveApCreditNoteBody,
  type SaveApDebitNoteBody,
  type SaveApInvoiceBody,
} from "@/types/ap-documents";
import { purchaseOrderStatusLabel, tStatus } from "@/types/purchase-orders";

import { AP_DOCUMENT_CONFIG, apFullLabel, apShortLabel, formatThaiDate, money, previewTotals } from "./apDocumentConfig";
import ApInvoicePickerModal from "./ApInvoicePickerModal";

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
  settlementMethod?: string;
  reason?: string;
  docDate?: Dayjs;
  supplierDocNo?: string;
  supplierDocDate?: Dayjs;
  dueDate?: Dayjs;
  vatMode: string;
  taxRateId?: string;
  remark?: string;
  internalNote?: string;
  items: LineValues[];
};

const EMPTY_LINE: LineValues = { quantity: 1 };

const toDate = (value?: Dayjs) => (value ? value.format("YYYY-MM-DD") : undefined);

export default function ApDocumentFormPage({ kind, id }: Props) {
  const config = AP_DOCUMENT_CONFIG[kind];
  const isInvoice = kind === "invoice";
  const isCredit = kind === "creditNote";
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const perms = useScreenActionPermissions(config.screenCode);
  const allowed = id ? perms.canEdit : perms.canAdd;

  const existingQuery = useApDocumentQuery(kind, id ?? "");
  const existing = existingQuery.data;
  const saveMutation = useSaveApDocumentMutation(kind, id);

  /* มาจากปุ่ม "สร้างใบตั้งหนี้" ในตารางรอสร้าง (?grnId=) — ดึง GRN → PO → ผู้ขาย → รายการ → เงื่อนไขชำระให้เอง ไม่ต้องเลือกซ้ำ */
  const grnId = !id && isInvoice ? searchParams.get("grnId") : null;
  const grnQuery = useGrnCreateInfoQuery(grnId);
  const grnInfo = grnQuery.data;
  /** GRN ที่ผูกอยู่ (สร้างใหม่จาก GRN หรือร่างที่ตั้งจาก GRN) — ล็อกเจ้าหนี้/PO ไม่ให้เปลี่ยน */
  const linkedGrnId = grnId ?? existing?.goodsReceiptId ?? undefined;
  const lockedByGrn = Boolean(linkedGrnId);
  const grnNo = grnInfo?.grnNo ?? existing?.goodsReceiptNo ?? undefined;

  const creditorId = Form.useWatch("creditorId", form);
  const settlementMethod = Form.useWatch("settlementMethod", form);
  const referenceDocumentId = Form.useWatch("referenceDocumentId", form);
  const vatMode = Form.useWatch("vatMode", form) ?? "EXCLUSIVE";
  const taxRateId = Form.useWatch("taxRateId", form);
  const watchedLines = Form.useWatch("items", form);
  const lines = useMemo(() => watchedLines ?? [], [watchedLines]);

  const vendorsQuery = useVendorsQuery({ isActive: true });
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });
  const poOptionsQuery = useApPurchaseOrderOptionsQuery(isInvoice ? creditorId : undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedAp, setSelectedAp] = useState<ApInvoiceOption | null>(null);
  const noteKind = isCredit ? "creditNote" : "debitNote";
  /** โหลด AP ที่ preset จาก URL / แก้ไข — billingStatus ALL เพื่อหาได้แม้วางบิลแล้ว */
  const presetInvoiceId = !isInvoice ? (referenceDocumentId || searchParams.get("invoiceId") || undefined) : undefined;
  const presetOptionsQuery = useApInvoiceOptionsQuery(
    !isInvoice && creditorId && presetInvoiceId && (!selectedAp || selectedAp.id !== presetInvoiceId)
      ? { creditorId, billingStatus: "ALL", page: 1, limit: 100 }
      : undefined,
    noteKind,
  );

  const taxRates = taxRatesQuery.data?.data ?? [];
  const vatRate =
    vatMode === "NONE"
      ? 0
      : taxRateId
        ? Number(taxRates.find((rate) => rate.id === taxRateId)?.rate ?? STANDARD_VAT_PERCENT)
        : STANDARD_VAT_PERCENT;
  const totals = useMemo(() => previewTotals(lines, vatMode, vatRate), [lines, vatMode, vatRate]);

  /** AP ที่เลือก — หักยอดได้เฉพาะยังไม่วางบิลและมียอดคงเหลือ */
  const canOffsetSelectedAp =
    selectedAp == null ||
    (Number(selectedAp.remainingAmount) > 0 && selectedAp.billingStatus !== "BILLED");
  const settlementMethodOptions = useMemo(
    () =>
      Object.entries(AP_SETTLEMENT_METHOD_LABEL)
        .filter(([value]) => canOffsetSelectedAp || value !== "OFFSET_AP")
        .map(([value, label]) => ({ value, label: t(label) })),
    [canOffsetSelectedAp, t],
  );

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
        settlementMethod: existing.settlementMethod ?? undefined,
        reason: existing.reason ?? undefined,
        docDate: dayjs(existing.docDate),
        supplierDocNo: existing.supplierDocNo ?? undefined,
        supplierDocDate: existing.supplierDocDate ? dayjs(existing.supplierDocDate) : undefined,
        dueDate: existing.dueDate ? dayjs(existing.dueDate) : undefined,
        vatMode: existing.vatMode,
        taxRateId: existing.taxRateId ?? undefined,
        remark: existing.remark ?? undefined,
        internalNote: existing.internalNote ?? undefined,
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

  const grnSeeded = useRef(false);
  useEffect(() => {
    if (!grnInfo || grnSeeded.current) return;
    grnSeeded.current = true;
    if (grnInfo.draftApId) {
      // มีร่างของ GRN นี้อยู่แล้ว — เปิดร่างเดิมแทนการสร้างซ้ำ
      router.replace(`${config.basePath}/${grnInfo.draftApId}/edit`);
      return;
    }
    form.setFieldsValue({
      creditorId: grnInfo.creditorId,
      purchaseOrderId: grnInfo.purchaseOrderId,
      vatMode: grnInfo.vatMode,
      taxRateId: grnInfo.taxRateId,
      docDate: dayjs(),
      dueDate: grnInfo.suggestedDueDate ? dayjs(grnInfo.suggestedDueDate) : undefined,
      items:
        grnInfo.items.length > 0
          ? grnInfo.items.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitLabel: item.unitLabel,
              unitPrice: item.unitPrice,
            }))
          : [EMPTY_LINE],
    });
  }, [config.basePath, form, grnInfo, router]);

  /* preset จาก URL หรือแก้ไข — หา AP จากรายการ ALL แล้ว seed VAT / selectedAp */
  const vatSeededFromInvoice = useRef(false);
  useEffect(() => {
    if (isInvoice || !presetInvoiceId || !presetOptionsQuery.data) return;
    const picked = presetOptionsQuery.data.items.find((option) => option.id === presetInvoiceId);
    if (!picked) return;
    setSelectedAp(picked);
    if (!id && !vatSeededFromInvoice.current) {
      vatSeededFromInvoice.current = true;
      form.setFieldsValue({ vatMode: picked.vatMode, taxRateId: picked.taxRateId ?? undefined });
    }
  }, [form, id, isInvoice, presetInvoiceId, presetOptionsQuery.data]);

  const onCreditorChange = () => {
    form.setFieldsValue({ purchaseOrderId: undefined, referenceDocumentId: undefined });
    setSelectedAp(null);
  };

  /* ตั้งหนี้จาก PO — ตั้งต้นการคิด VAT ตาม PO ให้ แก้ต่อได้ถ้าใบแจ้งหนี้ผู้ขายออกต่างไป */
  const onPurchaseOrderPicked = (purchaseOrderId?: string) => {
    const picked = poOptionsQuery.data?.find((option) => option.id === purchaseOrderId);
    if (picked) {
      form.setFieldsValue({ vatMode: picked.vatMode, taxRateId: picked.taxRateId ?? undefined });
    }
  };

  const onInvoicePicked = (picked: ApInvoiceOption) => {
    setSelectedAp(picked);
    const patch: Partial<FormValues> = {
      referenceDocumentId: picked.id,
      vatMode: picked.vatMode,
      taxRateId: picked.taxRateId ?? undefined,
    };
    const cannotOffset = Number(picked.remainingAmount) <= 0 || picked.billingStatus === "BILLED";
    if (isCredit && cannotOffset && settlementMethod === "OFFSET_AP") {
      patch.settlementMethod = undefined;
    }
    form.setFieldsValue(patch);
  };

  const clearInvoice = () => {
    setSelectedAp(null);
    form.setFieldsValue({ referenceDocumentId: undefined });
  };

  /* AP ที่เลือกหักยอดไม่ได้แต่ยังติด OFFSET_AP (เช่น โหลดจาก draft) → เคลียร์ */
  useEffect(() => {
    if (!isCredit || !selectedAp || canOffsetSelectedAp) return;
    if (settlementMethod !== "OFFSET_AP") return;
    form.setFieldsValue({ settlementMethod: undefined });
  }, [canOffsetSelectedAp, form, isCredit, selectedAp, settlementMethod]);

  const submit = async (values: FormValues) => {
    const common = {
      docDate: toDate(values.docDate),
      supplierDocNo: values.supplierDocNo?.trim() || undefined,
      supplierDocDate: toDate(values.supplierDocDate),
      vatMode: values.vatMode,
      taxRateId: values.vatMode === "NONE" ? undefined : values.taxRateId,
      remark: values.remark?.trim() || undefined,
      internalNote: values.internalNote?.trim() || undefined,
      items: values.items.map((line) => ({
        description: (line.description ?? "").trim(),
        quantity: Number(line.quantity),
        unitLabel: line.unitLabel?.trim() || undefined,
        unitPrice: Number(line.unitPrice),
      })),
    };
    const body: SaveApInvoiceBody | SaveApDebitNoteBody | SaveApCreditNoteBody = isInvoice
      ? {
          ...common,
          creditorId: values.creditorId as string,
          purchaseOrderId: values.purchaseOrderId as string,
          dueDate: toDate(values.dueDate),
          goodsReceiptId: linkedGrnId,
        }
      : isCredit
        ? {
            ...common,
            creditorId: values.creditorId as string,
            referenceDocumentId: values.referenceDocumentId || undefined,
            settlementMethod: values.settlementMethod as string,
            reason: (values.reason ?? "").trim(),
          }
        : {
            ...common,
            referenceDocumentId: values.referenceDocumentId as string,
            reason: (values.reason ?? "").trim(),
          };
    try {
      const res = await saveMutation.mutateAsync(body);
      message.success(
        id ? t("บันทึกแล้ว") : t("สร้าง{label} {docNo} แล้ว", { label: apShortLabel(config), docNo: res.data.docNo }),
      );
      router.push(`${config.basePath}/${res.data.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : t("บันทึกไม่สำเร็จ"));
    }
  };

  if (id && existingQuery.isLoading) return <Spin />;
  if (grnId && grnQuery.isLoading) return <Spin />;
  if (grnId && grnQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={grnQuery.error instanceof Error ? grnQuery.error.message : t("ดึงข้อมูลจาก GRN ไม่สำเร็จ")}
        action={<Button onClick={() => router.push(config.basePath)}>{t("กลับ")}</Button>}
      />
    );
  }
  if (id && existing && existing.status !== "DRAFT" && (isInvoice || existing.status !== "REJECTED")) {
    return (
      <Alert
        type="warning"
        showIcon
        title={t("{label} {docNo} ไม่ได้อยู่ในสถานะร่างหรือไม่อนุมัติ แก้ไขไม่ได้", { label: apShortLabel(config), docNo: existing.docNo })}
        action={<Button onClick={() => router.push(`${config.basePath}/${id}`)}>{t("กลับ")}</Button>}
      />
    );
  }

  return (
    <>
    <PageHeader
      title={
        id
          ? t("แก้ไข{label} {docNo}", { label: apShortLabel(config), docNo: existing?.docNo ?? "" })
          : t("สร้าง{label}", { label: apFullLabel(config) })
      }
      actions={
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          {t("กลับ")}
        </Button>
      }
    />

    <Card>
      {!allowed ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={t(id ? "บัญชีนี้ไม่มีสิทธิ์แก้ไข{label}" : "บัญชีนี้ไม่มีสิทธิ์สร้าง{label}", { label: apShortLabel(config) })}
        />
      ) : null}
      {lockedByGrn ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${t("ตั้งหนี้จากใบรับสินค้า {grnNo}", { grnNo: grnNo ?? "" })}${grnInfo ? ` · ${t("ใบสั่งซื้อ {poNo} (รายการจ่ายเงิน)", { poNo: grnInfo.poNo })}` : ""}`}
          description={
            grnInfo
              ? t("ยอดรอตั้งหนี้ {amount} บาท · ข้อมูลเจ้าหนี้/ใบสั่งซื้อ/รายการดึงจาก GRN แล้ว ไม่ต้องเลือกซ้ำ — ยอดตั้งหนี้ต้องไม่เกินยอดที่ยังตั้งได้", { amount: money.format(grnInfo.pendingAmount) })
              : t("เจ้าหนี้และใบสั่งซื้อล็อกตาม GRN ที่ตั้งหนี้ไว้")
          }
        />
      ) : null}
      {id && existing?.status === "REJECTED" ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title={t("ไม่อนุมัติโดย {name}", { name: existing.rejectedByName ?? "—" })}
          description={existing.rejectReason ? t("เหตุผล: {reason}", { reason: existing.rejectReason }) : undefined}
        />
      ) : null}
      {kind === "debitNote" ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={t("เลือกเจ้าหนี้ แล้วเลือกใบตั้งหนี้ที่อนุมัติแล้วที่จะเพิ่มหนี้ — ยอดในใบนี้คือส่วนที่เพิ่มขึ้นเท่านั้น")}
        />
      ) : null}
      {isCredit ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={t("เลือกเจ้าหนี้และวิธีจัดการยอดลดหนี้ (เลือกได้ 1 วิธี) — ยอดในใบนี้คือส่วนที่ลดลง สร้างและอนุมัติไว้ก่อนได้ ยอด AP ยังไม่เปลี่ยนจนกว่าจะยืนยันนำไปใช้")}
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
              label={t("เจ้าหนี้")}
              rules={[{ required: true, message: t("เลือกเจ้าหนี้") }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t("เลือกเจ้าหนี้")}
                loading={vendorsQuery.isLoading}
                disabled={lockedByGrn}
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
                label={t("ใบสั่งซื้อ (ยืนยันแล้ว)")}
                tooltip={t("ตั้งหนี้ได้เฉพาะใบสั่งซื้อที่อนุมัติแล้ว รวมใบที่รับของบางส่วน / รับครบ / ปิดรับบางส่วน")}
                rules={[{ required: true, message: t("เลือกใบสั่งซื้อที่ยืนยันแล้ว") }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  disabled={!creditorId || !allowed || lockedByGrn}
                  placeholder={creditorId ? t("เลือกใบสั่งซื้อ") : t("เลือกเจ้าหนี้ก่อน")}
                  loading={poOptionsQuery.isFetching}
                  notFoundContent={t("เจ้าหนี้รายนี้ยังไม่มีใบสั่งซื้อที่ยืนยันแล้ว")}
                  onChange={onPurchaseOrderPicked}
                  options={(poOptionsQuery.data ?? []).map((po) => ({
                    value: po.id,
                    label: `${po.poNo} · ${formatThaiDate(po.poDate)} · ${money.format(po.totalAmount)} · ${tStatus(purchaseOrderStatusLabel(po))}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <>
                <Form.Item
                  name="referenceDocumentId"
                  rules={[
                    {
                      required: !isCredit || settlementMethod === "OFFSET_AP",
                      message: t("เลือกใบตั้งหนี้"),
                    },
                  ]}
                  hidden
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label={
                    !isCredit
                      ? t("ใบตั้งหนี้ที่จะเพิ่มหนี้")
                      : settlementMethod === "SUPPLIER_CREDIT"
                        ? t("ใบตั้งหนี้ต้นทาง (เก็บประวัติ)")
                        : t("ใบตั้งหนี้ที่อ้างอิง (AP)")
                  }
                  tooltip={
                    isCredit
                      ? settlementMethod === "SUPPLIER_CREDIT"
                        ? t("บันทึกว่าเครดิตเกิดจาก AP ใบนี้ · หลังอนุมัติใช้หักกับใบตั้งหนี้ใดก็ได้ของผู้ขายเดียวกัน")
                        : settlementMethod === "OFFSET_AP"
                          ? t("บังคับเมื่อเลือกวิธี “หักยอดเจ้าหนี้คงค้าง”")
                          : t("อ้างใบตั้งหนี้หรือไม่ก็ได้")
                      : undefined
                  }
                  required={!isCredit || settlementMethod === "OFFSET_AP"}
                >
                  <Space orientation="vertical" style={{ width: "100%" }} size={4}>
                    <Space wrap>
                      <Button
                        disabled={!creditorId || !allowed}
                        onClick={() => setPickerOpen(true)}
                      >
                        {t("เลือกใบตั้งหนี้")}
                      </Button>
                      {isCredit && selectedAp ? (
                        <Button type="link" danger disabled={!allowed} onClick={clearInvoice}>
                          {t("ล้าง")}
                        </Button>
                      ) : null}
                    </Space>
                    {selectedAp ? (
                      <Typography.Text>
                        {selectedAp.docNo}
                        {selectedAp.poNo ? ` · ${selectedAp.poNo}` : ""}
                        {` · ${money.format(selectedAp.totalAmount)}`}
                        {` · ${t("คงเหลือ {amount}", { amount: money.format(selectedAp.remainingAmount) })}`}
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">
                        {creditorId ? t("ยังไม่ได้เลือกใบตั้งหนี้") : t("เลือกเจ้าหนี้ก่อน")}
                      </Typography.Text>
                    )}
                  </Space>
                </Form.Item>
              </>
            )}
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="docDate" label={t("วันที่เอกสาร")} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="supplierDocNo"
              label={
                isInvoice
                  ? t("เลขที่ใบแจ้งหนี้/ใบกำกับของผู้ขาย")
                  : isCredit
                    ? t("เลขที่ใบลดหนี้ของผู้ขาย")
                    : t("เลขที่ใบเพิ่มหนี้ของผู้ขาย")
              }
            >
              <Input maxLength={100} placeholder={t("เช่น IV-6810-0012")} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="supplierDocDate" label={t("วันที่เอกสารผู้ขาย")}>
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          {isInvoice ? (
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="dueDate" label={t("ครบกำหนดชำระ")}>
                <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          ) : null}
          {isCredit ? (
            <Col xs={24} md={12}>
              <Form.Item
                name="settlementMethod"
                label={t("วิธีจัดการยอดลดหนี้")}
                rules={[{ required: true, message: t("เลือกวิธีจัดการยอด") }]}
                extra={
                  !canOffsetSelectedAp
                    ? t("ใบตั้งหนี้ที่เลือกวางบิลแล้วหรือจ่ายครบแล้ว — หักยอดเจ้าหนี้คงค้างไม่ได้ เลือกวิธีรับเงินคืนหรือเครดิตผู้ขายแทน")
                    : undefined
                }
              >
                <Select placeholder={t("เลือกวิธีจัดการยอด")} options={settlementMethodOptions} />
              </Form.Item>
            </Col>
          ) : null}
          {!isInvoice ? (
            <Col xs={24}>
              <Form.Item
                name="reason"
                label={
                  isCredit
                    ? t("สาเหตุที่ลดหนี้ (เช่น คืนสินค้า สินค้าชำรุด ลดราคา ราคาคลาดเคลื่อน)")
                    : t("เหตุผลที่เพิ่มหนี้ (เช่น ค่าขนส่ง ปรับราคา ค่าใช้จ่ายเพิ่มเติม ส่วนต่างภาษี)")
                }
                rules={[{ required: true, whitespace: true, message: t("ระบุเหตุผล") }]}
              >
                <Input.TextArea rows={2} maxLength={2000} />
              </Form.Item>
            </Col>
          ) : null}
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="vatMode" label={t("การคิด VAT")} rules={[{ required: true }]}>
              <Select options={VAT_MODE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="taxRateId" label={t("อัตราภาษี")}>
              <Select
                allowClear
                disabled={vatMode === "NONE" || !allowed}
                placeholder={t("มาตรฐาน {rate}%", { rate: STANDARD_VAT_PERCENT })}
                options={taxRates.map((rate) => ({
                  value: rate.id,
                  label: `${rate.name} (${Number(rate.rate)}%)`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Title level={5}>{t("รายการ")}</Typography.Title>
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
                        rules={[{ required: true, whitespace: true, message: t("ระบุรายละเอียด") }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input maxLength={500} placeholder={t("รายละเอียด")} />
                      </Form.Item>
                    </Col>
                    <Col flex="110px">
                      <Form.Item
                        name={[field.name, "quantity"]}
                        rules={[{ required: true, message: t("จำนวน") }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0.001} precision={3} placeholder={t("จำนวน")} style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col flex="90px">
                      <Form.Item name={[field.name, "unitLabel"]} style={{ marginBottom: 0 }}>
                        <Input maxLength={50} placeholder={t("หน่วย")} />
                      </Form.Item>
                    </Col>
                    <Col flex="140px">
                      <Form.Item
                        name={[field.name, "unitPrice"]}
                        rules={[{ required: true, message: t("ราคา") }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} precision={2} placeholder={t("ราคา/หน่วย")} style={{ width: "100%" }} />
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
                        aria-label={t("ลบรายการที่ {n}", { n: index + 1 })}
                      />
                    </Col>
                  </Row>
                );
              })}
              <Button icon={<PlusOutlined />} onClick={() => add({ ...EMPTY_LINE })}>
                {t("เพิ่มรายการ")}
              </Button>
            </Space>
          )}
        </Form.List>

        <Row justify="end" style={{ marginTop: 16 }}>
          <Col xs={24} md={10}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label={t("มูลค่าก่อน VAT")}>{money.format(totals.subtotal)}</Descriptions.Item>
              <Descriptions.Item label={t("VAT {rate}%", { rate: vatRate })}>{money.format(totals.vat)}</Descriptions.Item>
              <Descriptions.Item label={t(isInvoice ? "ยอดตั้งหนี้" : isCredit ? "ยอดลดหนี้" : "ยอดเพิ่มหนี้")}>
                <Typography.Text strong>{money.format(totals.total)}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>

        <Form.Item name="remark" label={t("หมายเหตุ")} style={{ marginTop: 16 }}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Form.Item name="internalNote" label={t("โน้ตภายในบริษัท")} extra={t("เห็นเฉพาะภายในบริษัท — ไม่ส่งให้ผู้ขาย")}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>

        {!isInvoice ? (
          <Card title={t("เอกสารแนบ")} size="small" style={{ marginBottom: 16 }}>
            {id ? (
              <DocumentAttachmentsPanel
                documentType={isCredit ? "AP_CREDIT_NOTE" : "AP_DEBIT_NOTE"}
                documentId={id}
                canEdit={allowed}
                emptyText={t("ยังไม่มีเอกสารแนบ")}
              />
            ) : (
              <Typography.Text type="secondary">{t("แนบไฟล์ได้หลังบันทึกร่าง (ในหน้าแก้ไข/รายละเอียด)")}</Typography.Text>
            )}
          </Card>
        ) : null}

        <Space>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            {t("บันทึกเป็นร่าง")}
          </Button>
          <Typography.Text type="secondary">{t("ร่างแก้ไขได้จนกว่าจะส่งอนุมัติ — ส่งอนุมัติได้ที่หน้ารายละเอียด")}</Typography.Text>
        </Space>
      </Form>
    </Card>
    {!isInvoice && creditorId ? (
      <ApInvoicePickerModal
        open={pickerOpen}
        creditorId={creditorId}
        kind={noteKind}
        selectedId={selectedAp?.id}
        onClose={() => setPickerOpen(false)}
        onSelect={onInvoicePicked}
      />
    ) : null}
    </>
  );
}
