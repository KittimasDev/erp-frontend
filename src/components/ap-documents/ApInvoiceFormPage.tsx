"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import {
  apDocumentsQueryKey,
  useApInvoiceDetailQuery,
  useDepositInfoQuery,
  useGrnCreateInfoQuery,
  usePoChargesQuery,
  useSaveApDocumentMutation,
} from "@/hooks/ap-documents/useApDocuments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useTaxRatesQuery } from "@/hooks/tax-rates/useTaxRatesQuery";
import { submitApInvoice } from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import { tNow, useT } from "@/lib/i18n/useT";
import { allocateChargeVat, STANDARD_VAT_PERCENT, VAT_MODE_OPTIONS } from "@/lib/money/vat-totals";
import type { SaveApInvoiceBody } from "@/types/ap-documents";
import { AP_DOCUMENT_STATUS_COLOR, AP_DOCUMENT_STATUS_LABEL } from "@/types/ap-documents";
import { PO_CHARGE_TYPE_LABEL, tStatus } from "@/types/purchase-orders";

import { AP_DOCUMENT_CONFIG, formatThaiDate, money, previewTotals, termText } from "./apDocumentConfig";
import PageHeader from "@/components/common/PageHeader";

const config = AP_DOCUMENT_CONFIG.invoice;
const toDate = (v?: Dayjs) => (v ? v.format("YYYY-MM-DD") : undefined);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** วันครบกำหนดเครดิต = ฐานวันที่ + จำนวนวันเครดิต (ฐานหลัก = วันที่ใบแจ้งหนี้ Supplier) */
function creditDueFrom(base: Dayjs | undefined, creditDays: number): Dayjs | undefined {
  if (!base || creditDays <= 0) return undefined;
  return base.add(creditDays, "day");
}

type LineValues = {
  goodsReceiptItemId?: string;
  itemCode?: string;
  description?: string;
  quantity?: number;
  /** จำนวนรับจริงทั้งใบ / จำนวนที่ยังตั้งหนี้ได้ (แสดงและใช้เป็นเพดาน) */
  receivedQuantity?: number;
  remainingQuantity?: number;
  unitLabel?: string;
  unitPrice?: number;
  discountAmount?: number;
};

type FormValues = {
  docDate?: Dayjs;
  supplierDocNo?: string;
  supplierDocDate?: Dayjs;
  taxInvoiceNo?: string;
  taxInvoiceDate?: Dayjs;
  dueDate?: Dayjs;
  vatMode: string;
  taxRateId?: string;
  remark?: string;
  internalNote?: string;
  items: LineValues[];
};

/**
 * สร้าง / แก้ไขใบตั้งหนี้ — สร้างจากปุ่มในตารางรอสร้าง (?grnId=) ดึง GRN → PO → รายการจ่ายเงินให้เอง
 * รายการและยอดตั้งหนี้ตั้งต้นจากจำนวนรับจริง (ลดได้ ห้ามเกิน) · เลือกหักมัดจำได้ (ค่าเริ่มต้นไม่หัก)
 */
export default function ApInvoiceFormPage({ id }: { id?: string }) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const perms = useScreenActionPermissions(config.screenCode);
  const allowed = id ? perms.canEdit : perms.canAdd;

  const existingQuery = useApInvoiceDetailQuery(id);
  const existing = existingQuery.data;
  const grnIdParam = !id ? searchParams.get("grnId") : null;
  const grnId = grnIdParam ?? existing?.goodsReceiptId ?? null;
  const grnQuery = useGrnCreateInfoQuery(grnId, id);
  const grn = grnQuery.data;
  const isGrnLinked = Boolean(grnId);
  /* ใบตั้งหนี้ค่าใช้จ่ายเพิ่มเติมล้วน (?poId=) — ไม่มี GRN ไม่มีบรรทัดสินค้า ไม่สร้างรายการรับสินค้า/สต๊อก */
  const poIdParam = !id ? searchParams.get("poId") : null;
  const isChargeOnly = !grnId && (Boolean(poIdParam) || Boolean(existing && existing.items.length === 0));

  const poId = grn?.purchaseOrderId ?? existing?.purchaseOrderId ?? poIdParam ?? null;
  const depositQuery = useDepositInfoQuery(poId, id);
  const depositInfo = depositQuery.data;
  const poChargesQuery = usePoChargesQuery(poId, id);
  const poInfo = poChargesQuery.data;
  const chargeOptions = useMemo(() => poInfo?.charges ?? [], [poInfo]);
  /**
   * ยอดก่อน VAT ต่อรายการค่าใช้จ่ายที่ตั้งใน AP ใบนี้ (ไม่กรอก = ไม่ตั้งรายการนี้)
   * ค่าตั้งต้น (seed): แก้ร่าง = ค่าเดิมของใบ · สร้างใหม่ (จาก GRN หรือค่าใช้จ่ายล้วน) = ยอดคงเหลือทั้งหมด
   * ที่ผู้ใช้แก้เองอยู่ใน chargeEdits และทับค่าตั้งต้น
   */
  const [chargeEdits, setChargeEdits] = useState<Record<string, number | undefined>>({});
  const chargeSeed = useMemo<Record<string, number | undefined>>(() => {
    if (!poInfo) return {};
    if (id) return Object.fromEntries((existing?.charges ?? []).map((c) => [c.poChargeId, c.amountBeforeVat]));
    return Object.fromEntries(
      poInfo.charges.filter((c) => c.remaining > 0).map((c) => [c.poChargeId, c.remaining]),
    );
  }, [existing, id, poInfo]);
  const chargeInputs = useMemo(() => ({ ...chargeSeed, ...chargeEdits }), [chargeSeed, chargeEdits]);
  const setChargeInputs = setChargeEdits;

  const saveMutation = useSaveApDocumentMutation("invoice", id);
  const taxRatesQuery = useTaxRatesQuery({ isActive: true });
  const taxRates = taxRatesQuery.data?.data ?? [];

  const vatMode = Form.useWatch("vatMode", form) ?? "EXCLUSIVE";
  const taxRateId = Form.useWatch("taxRateId", form);
  const watchedLines = Form.useWatch("items", form);
  const lines = useMemo(() => watchedLines ?? [], [watchedLines]);
  const vatRate =
    vatMode === "NONE"
      ? 0
      : taxRateId
        ? Number(taxRates.find((r) => r.id === taxRateId)?.rate ?? STANDARD_VAT_PERCENT)
        : STANDARD_VAT_PERCENT;
  const goodsTotals = useMemo(() => previewTotals(lines, vatMode, vatRate), [lines, vatMode, vatRate]);

  /* ค่าใช้จ่ายเพิ่มเติม: VAT คิดตามอัตราของแต่ละรายการและยอดที่ตั้งจริง (ครั้งสุดท้ายรับ VAT ที่เหลือ — ตรงกับ backend) */
  const chargeRows = useMemo(
    () =>
      chargeOptions.map((opt) => {
        const amount = round2(Math.min(Math.max(Number(chargeInputs[opt.poChargeId]) || 0, 0), opt.remaining));
        const vat =
          amount > 0
            ? allocateChargeVat({
                chargeAmountBeforeVat: opt.poAmountBeforeVat,
                chargeVat: opt.poVatAmount,
                taxRatePercent: opt.taxRatePercent,
                allocBase: amount,
                priorAllocBase: opt.allocatedByOthers,
                priorAllocVat: opt.allocatedVatByOthers,
              })
            : 0;
        return { opt, amount, vat, total: round2(amount + vat) };
      }),
    [chargeOptions, chargeInputs],
  );
  const chargeSum = useMemo(
    () => ({
      base: round2(chargeRows.reduce((s, r) => s + r.amount, 0)),
      vat: round2(chargeRows.reduce((s, r) => s + r.vat, 0)),
      total: round2(chargeRows.reduce((s, r) => s + r.total, 0)),
    }),
    [chargeRows],
  );
  const chargeOver = chargeOptions.some((o) => (Number(chargeInputs[o.poChargeId]) || 0) > o.remaining + 0.004);
  /** ยอดรวมทั้งใบ = ค่าสินค้า + ค่าใช้จ่ายที่จัดสรร (รวม VAT) */
  const totals = useMemo(
    () => ({
      subtotal: round2(goodsTotals.subtotal + chargeSum.base),
      vat: round2(goodsTotals.vat + chargeSum.vat),
      total: round2(goodsTotals.total + chargeSum.total),
    }),
    [goodsTotals, chargeSum],
  );

  // ── หักมัดจำ: ค่าเริ่มต้น "ไม่หัก" · ติ๊กแล้วค่าเริ่มต้น = ยอดสูงสุดที่ใช้ได้ ──
  const available = depositInfo?.available ?? 0;
  const maxDeduct = Math.max(round2(Math.min(available, totals.total)), 0);
  const [useDepositOverride, setUseDepositOverride] = useState<boolean | null>(null);
  const [depositInput, setDepositInput] = useState<number | null>(null);
  const useDeposit = useDepositOverride ?? Boolean(existing && existing.deposit.thisDeduct > 0);
  const deductRaw = useDeposit ? (depositInput ?? existing?.deposit.thisDeduct ?? maxDeduct) : 0;
  const deduct = useDeposit ? Math.min(Math.max(deductRaw, 0), maxDeduct) : 0;
  const netAfterDeposit = Math.max(round2(totals.total - deduct), 0);
  const deductMismatch = useDeposit && deductRaw > maxDeduct + 0.001;

  /* เติมค่าครั้งเดียว — แก้ร่างเดิม หรือสร้างใหม่จาก GRN (มีร่างอยู่แล้ว → เปิดร่างเดิมแทน) */
  const seeded = useRef(false);
  const prevSupplierKey = useRef<string | null>(null);
  const supplierTracked = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (id) {
      if (!existing || (existing.goodsReceiptId && !grn)) return;
      seeded.current = true;
      // ฐานตั้งต้นของการเทียบ "เปลี่ยนวันที่ใบแจ้งหนี้" — กันถามยืนยันตอนเพิ่งโหลดใบเดิม
      supplierTracked.current = true;
      prevSupplierKey.current = existing.supplierDocDate ? existing.supplierDocDate.slice(0, 10) : null;
      const byItem = new Map((grn?.items ?? []).map((i) => [i.goodsReceiptItemId, i]));
      form.setFieldsValue({
        docDate: dayjs(existing.docDate),
        supplierDocNo: existing.supplierDocNo ?? undefined,
        supplierDocDate: existing.supplierDocDate ? dayjs(existing.supplierDocDate) : undefined,
        taxInvoiceNo: existing.taxInvoiceNo,
        taxInvoiceDate: existing.taxInvoiceDate ? dayjs(existing.taxInvoiceDate) : undefined,
        dueDate: existing.dueDate ? dayjs(existing.dueDate) : undefined,
        vatMode: existing.vatMode,
        taxRateId: existing.taxRateId ?? undefined,
        remark: existing.remark ?? undefined,
        internalNote: existing.internalNote ?? undefined,
        items: existing.items.map((item) => {
          const g = item.goodsReceiptItemId ? byItem.get(item.goodsReceiptItemId) : undefined;
          return {
            goodsReceiptItemId: item.goodsReceiptItemId ?? undefined,
            itemCode: item.itemCode ?? undefined,
            description: item.description,
            quantity: item.quantity,
            receivedQuantity: g?.receivedQuantity,
            remainingQuantity: g?.remainingQuantity,
            unitLabel: item.unitLabel ?? undefined,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount ?? 0,
          };
        }),
      });
      return;
    }
    if (!grn) {
      if (poIdParam && poInfo) {
        // โหมดค่าใช้จ่ายล้วน: ตั้งต้นจาก PO — due ชั่วคราวจากวันนี้จนกว่าจะใส่วันที่ใบแจ้งหนี้
        seeded.current = true;
        const creditDays = poInfo.paymentTerm.termType === "CREDIT" ? poInfo.paymentTerm.creditDays : 0;
        form.setFieldsValue({
          docDate: dayjs(),
          dueDate: creditDueFrom(dayjs(), creditDays),
          vatMode: poInfo.vatMode,
          taxRateId: poInfo.taxRateId,
          items: [],
        });
      }
      return;
    }
    seeded.current = true;
    if (grn.draftApId) {
      router.replace(`${config.basePath}/${grn.draftApId}/edit`);
      return;
    }
    form.setFieldsValue({
      docDate: dayjs(),
      // ค่าแนะนำชั่วคราวจาก GRN — จะอัปเดตเมื่อใส่วันที่ใบแจ้งหนี้ Supplier
      dueDate: grn.suggestedDueDate ? dayjs(grn.suggestedDueDate) : undefined,
      vatMode: grn.vatMode,
      taxRateId: grn.taxRateId,
      items: grn.items.map((item) => ({
        goodsReceiptItemId: item.goodsReceiptItemId,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        remainingQuantity: item.remainingQuantity,
        unitLabel: item.unitLabel,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
      })),
    });
  }, [existing, form, grn, id, poIdParam, poInfo, router]);

  const supplierDocDateWatch = Form.useWatch("supplierDocDate", form);
  const dueDateWatch = Form.useWatch("dueDate", form);
  const activeTerm = (grn ?? poInfo)?.paymentTerm ?? existing?.paymentTerm;
  const creditDaysForDue = Number(activeTerm?.creditDays ?? 0);
  const isCreditTerm = activeTerm?.termType === "CREDIT";
  // จำนวนวันที่บวกจากวันที่ใบแจ้งหนี้ — เงินสด (ชำระเมื่อรับสินค้า / เครดิต 0 วัน) = 0 · เครดิต = X วัน · อื่น ๆ ไม่คำนวณ
  const dueOffsetDays: number | null =
    activeTerm?.termType === "ON_RECEIPT"
      ? 0
      : isCreditTerm
        ? Math.max(creditDaysForDue, 0)
        : null;
  const isCashTerm = dueOffsetDays === 0;

  // ฐานหลัก = วันที่ใบแจ้งหนี้ Supplier · เปลี่ยนวันที่ → คำนวณ due ใหม่ (ทั้งสร้างและแก้ไข)
  // due ที่ผู้ใช้กำหนดเอง (ไม่ตรงสูตรของวันที่เดิม) ห้ามเขียนทับเงียบ ๆ — ถามยืนยันก่อน
  useEffect(() => {
    if (!seeded.current) return;
    const key = supplierDocDateWatch ? supplierDocDateWatch.format("YYYY-MM-DD") : null;
    if (!supplierTracked.current) {
      supplierTracked.current = true;
      prevSupplierKey.current = key;
      if (id) return; // แก้ใบเดิม: ค่าที่โหลดมาคือฐานตั้งต้น ยังไม่ใช่การเปลี่ยนวันที่
    }
    if (key === prevSupplierKey.current) return;
    const prevKey = prevSupplierKey.current;
    prevSupplierKey.current = key;
    if (dueOffsetDays === null || !supplierDocDateWatch) return;
    const next = supplierDocDateWatch.add(dueOffsetDays, "day");
    const nextKey = next.format("YYYY-MM-DD");
    const currentKey = dueDateWatch ? dueDateWatch.format("YYYY-MM-DD") : null;
    if (currentKey === nextKey) return;
    const prevExpected = prevKey ? dayjs(prevKey).add(dueOffsetDays, "day").format("YYYY-MM-DD") : null;
    if (!currentKey || currentKey === prevExpected) {
      form.setFieldValue("dueDate", next);
      return;
    }
    modal.confirm({
      title: tNow("คำนวณวันครบกำหนดใหม่?"),
      content: tNow(
        "วันครบกำหนดปัจจุบัน ({current}) เป็นค่าที่กำหนดเอง · คำนวณใหม่จากวันที่ใบแจ้งหนี้{basis} ได้ {next}",
        {
          current: dayjs(currentKey).format("DD/MM/BBBB"),
          basis: isCashTerm ? ` ${tNow("(เงินสด)")}` : ` + ${tNow("เครดิต {n} วัน", { n: dueOffsetDays })}`,
          next: next.format("DD/MM/BBBB"),
        },
      ),
      okText: tNow("ใช้ค่าที่คำนวณใหม่"),
      cancelText: tNow("คงค่าเดิม"),
      onOk: () => form.setFieldValue("dueDate", next),
    });
  }, [dueDateWatch, dueOffsetDays, form, id, isCashTerm, modal, supplierDocDateWatch]);

  const [saving, setSaving] = useState(false);

  const buildBody = (values: FormValues): SaveApInvoiceBody => ({
    docDate: toDate(values.docDate),
    supplierDocNo: values.supplierDocNo?.trim() || undefined,
    supplierDocDate: toDate(values.supplierDocDate),
    taxInvoiceNo: values.taxInvoiceNo?.trim() || undefined,
    taxInvoiceDate: toDate(values.taxInvoiceDate),
    dueDate: toDate(values.dueDate),
    vatMode: values.vatMode,
    taxRateId: values.vatMode === "NONE" ? undefined : values.taxRateId,
    remark: values.remark?.trim() || undefined,
    internalNote: values.internalNote?.trim() || undefined,
    creditorId: (grn?.creditorId ?? existing?.creditorId ?? poInfo?.creditorId) as string,
    purchaseOrderId: (grn?.purchaseOrderId ?? existing?.purchaseOrderId ?? poIdParam) as string,
    goodsReceiptId: grnId ?? undefined,
    depositDeductAmount: deduct > 0 ? deduct : 0,
    charges: chargeRows.filter((r) => r.amount > 0).map((r) => ({ poChargeId: r.opt.poChargeId, amount: r.amount })),
    items: (isChargeOnly ? [] : values.items).map((line) => ({
      goodsReceiptItemId: line.goodsReceiptItemId,
      description: (line.description ?? "").trim(),
      quantity: Number(line.quantity),
      unitLabel: line.unitLabel?.trim() || undefined,
      unitPrice: Number(line.unitPrice),
      discountAmount: Number(line.discountAmount ?? 0),
    })),
  });

  const save = async (andSubmit: boolean) => {
    const values = await form.validateFields();
    if (chargeOver) {
      message.error(t("ยอดค่าใช้จ่ายที่ตั้งหนี้เกินยอดคงเหลือของ PO"));
      return;
    }
    if (isChargeOnly && chargeSum.base <= 0) {
      message.error(t("ใบตั้งหนี้ค่าใช้จ่ายเพิ่มเติมต้องเลือกยอดค่าใช้จ่ายอย่างน้อย 1 รายการ"));
      return;
    }
    if (deductMismatch) {
      message.error(t("ยอดหักมัดจำเกินมัดจำที่ใช้ได้ ({amount} บาท)", { amount: money.format(maxDeduct) }));
      return;
    }
    setSaving(true);
    try {
      const res = await saveMutation.mutateAsync(buildBody(values));
      const apId = res.data.id;
      if (andSubmit) {
        await submitApInvoice(getAccessToken(), apId);
        void queryClient.invalidateQueries({ queryKey: apDocumentsQueryKey });
        message.success(t("บันทึกและส่งอนุมัติ {docNo} แล้ว", { docNo: res.data.docNo }));
      } else {
        message.success(id ? t("บันทึกร่างแล้ว") : t("บันทึกร่าง {docNo} แล้ว", { docNo: res.data.docNo }));
      }
      router.push(`${config.basePath}/${apId}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("บันทึกไม่สำเร็จ"));
    } finally {
      setSaving(false);
    }
  };

  if (!id && !grnIdParam && !poIdParam) {
    return (
      <Alert
        type="info"
        showIcon
        title={t("สร้างใบตั้งหนี้จากปุ่ม \"สร้างใบตั้งหนี้\" ในตารางรายการรอสร้างใบตั้งหนี้ (GRN ที่ยืนยันแล้ว) หรือจากตาราง \"PO ค้างค่าใช้จ่ายเพิ่มเติม\" เท่านั้น")}
        action={<Button onClick={() => router.push(config.basePath)}>{t("ไปหน้ารายการ")}</Button>}
      />
    );
  }
  if (
    (id && existingQuery.isLoading) ||
    (grnId && grnQuery.isLoading) ||
    (poId && poChargesQuery.isLoading && (poIdParam || isChargeOnly))
  ) {
    return <Spin />;
  }
  if (id && !existing) return <Alert type="error" showIcon title={t("ไม่พบใบตั้งหนี้")} />;
  if (poIdParam && poChargesQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        title={poChargesQuery.error instanceof Error ? poChargesQuery.error.message : t("ดึงข้อมูลใบสั่งซื้อไม่สำเร็จ")}
        action={<Button onClick={() => router.push(config.basePath)}>{t("กลับ")}</Button>}
      />
    );
  }
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
  if (id && existing && existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return (
      <Alert
        type="warning"
        showIcon
        title={t("ใบตั้งหนี้ {docNo} ไม่ได้อยู่ในสถานะร่าง/ไม่อนุมัติ แก้ไขไม่ได้", { docNo: existing.docNo })}
        action={<Button onClick={() => router.push(`${config.basePath}/${id}`)}>{t("กลับ")}</Button>}
      />
    );
  }

  const info = grn ?? poInfo ?? null;
  const poNo = info?.poNo ?? existing?.purchaseOrderNo ?? "—";
  const grnNo = grn?.grnNo ?? existing?.goodsReceiptNo ?? "—";
  const supplier = info
    ? `${info.creditorCode} ${info.creditorName}`
    : `${existing?.creditorCode ?? ""} ${existing?.creditorName ?? ""}`;
  const term = info?.paymentTerm ?? existing?.paymentTerm;
  const status = existing?.status ?? "DRAFT";

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{id ? t("แก้ไขใบตั้งหนี้ {docNo}", { docNo: existing?.docNo ?? "" }) : t("สร้างใบตั้งหนี้")}</>}
        back={
          <>
<Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            {t("กลับ")}
          </Button>
          </>
        }
        meta={
          <>
<Tag color={AP_DOCUMENT_STATUS_COLOR[status]}>{tStatus(AP_DOCUMENT_STATUS_LABEL[status] ?? status)}</Tag>
          </>
        }
      />
      {existing?.status === "REJECTED" && existing.rejectReason ? (
          <Alert style={{ marginTop: 12 }} type="error" showIcon title={t("ไม่อนุมัติ — แก้ไขแล้วส่งอนุมัติใหม่")} description={existing.rejectReason} />
        ) : null}
      {!allowed ? (
          <Alert style={{ marginTop: 12 }} type="warning" showIcon title={t(id ? "บัญชีนี้ไม่มีสิทธิ์แก้ไขใบตั้งหนี้" : "บัญชีนี้ไม่มีสิทธิ์สร้างใบตั้งหนี้")} />
        ) : null}

      <Form<FormValues>
        form={form}
        layout="vertical"
        disabled={!allowed}
        initialValues={{ vatMode: "EXCLUSIVE", docDate: dayjs(), items: [] }}
        style={{ display: "contents" }}
      >
        <Card title={t("1. ข้อมูลเอกสาร")} size="small">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
            <Form.Item label={t("เลขที่ใบตั้งหนี้")}>
              <Input disabled value={existing?.docNo ?? t("สร้างอัตโนมัติเมื่อบันทึก")} />
            </Form.Item>
            <Form.Item name="docDate" label={t("วันที่ตั้งหนี้")} rules={[{ required: true, message: t("ระบุวันที่ตั้งหนี้") }]}>
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label={t("สถานะเอกสาร")}>
              <Input disabled value={tStatus(AP_DOCUMENT_STATUS_LABEL[status] ?? status)} />
            </Form.Item>
            <Form.Item label={t("ผู้ขาย (ดึงจาก PO)")}>
              <Input disabled value={supplier} />
            </Form.Item>
          </div>
        </Card>

        <Card title={t("2. เอกสารอ้างอิง")} size="small">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px" }}>
            <Form.Item label={t("เลขที่รายการจ่ายเงิน (ผ่าน PO)")}>
              <Input disabled value={poNo} />
            </Form.Item>
            <Form.Item label={t("เลขที่ PO")}>
              <Input disabled value={poNo} />
            </Form.Item>
            <Form.Item label={t("เลขที่ GRN")}>
              <Input disabled value={grnNo} />
            </Form.Item>
            <Form.Item name="supplierDocNo" label={t("เลขที่ใบแจ้งหนี้ Supplier")} rules={[{ required: true, whitespace: true, message: t("ระบุเลขที่ใบแจ้งหนี้ผู้ขาย") }]}>
              <Input maxLength={100} placeholder={t("เช่น IV-6810-0012")} />
            </Form.Item>
            <Form.Item
              name="supplierDocDate"
              label={t("วันที่ใบแจ้งหนี้")}
              extra={dueOffsetDays !== null ? t("ใช้เป็นฐานคำนวณวันครบกำหนดชำระ (เงินสด = วันเดียวกัน · เครดิต = บวกวันเครดิต)") : undefined}
            >
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="taxInvoiceNo" label={t("เลขที่ใบกำกับภาษี (ถ้ามี)")}>
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="taxInvoiceDate" label={t("วันที่ใบกำกับภาษี (ถ้ามี)")}>
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
          </div>
        </Card>

        {!isChargeOnly ? (
        <Card title={t("3. รายการสินค้า / บริการ (ดึงจากยอดรับจริงของ GRN)")} size="small">
          <Form.List name="items">
            {(fields, { remove }) => (
              <Table
                size="small"
                pagination={false}
                rowKey="key"
                dataSource={fields}
                scroll={{ x: 1000 }}
                columns={[
                  { title: "#", key: "no", width: 44, render: (_v, _f, i) => i + 1 },
                  { title: t("รหัสสินค้า"), key: "code", width: 120, render: (_v, f) => lines[f.name]?.itemCode ?? "—" },
                  {
                    title: t("ชื่อสินค้า / รายละเอียด"),
                    key: "desc",
                    render: (_v, f) =>
                      isGrnLinked ? (
                        <>
                          {lines[f.name]?.description}
                          <Form.Item name={[f.name, "description"]} hidden>
                            <Input />
                          </Form.Item>
                        </>
                      ) : (
                        <Form.Item name={[f.name, "description"]} style={{ marginBottom: 0 }} rules={[{ required: true, whitespace: true }]}>
                          <Input maxLength={500} />
                        </Form.Item>
                      ),
                  },
                  {
                    title: t("จำนวนรับจริง / ตั้งได้"),
                    key: "recv",
                    width: 150,
                    align: "right",
                    render: (_v, f) => {
                      const l = lines[f.name];
                      return l?.receivedQuantity !== undefined
                        ? `${l.receivedQuantity.toLocaleString("th-TH", { maximumFractionDigits: 3 })} / ${(l.remainingQuantity ?? 0).toLocaleString("th-TH", { maximumFractionDigits: 3 })}`
                        : "—";
                    },
                  },
                  {
                    title: t("จำนวนที่ตั้งหนี้"),
                    key: "qty",
                    width: 130,
                    render: (_v, f) => (
                      <Form.Item
                        name={[f.name, "quantity"]}
                        style={{ marginBottom: 0 }}
                        rules={[
                          { required: true, message: t("จำนวน") },
                          {
                            validator: (_r, v: number | undefined) => {
                              const max = lines[f.name]?.remainingQuantity;
                              return max !== undefined && v !== undefined && v > max + 0.0005
                                ? Promise.reject(new Error(t("ไม่เกิน {max}", { max })))
                                : Promise.resolve();
                            },
                          },
                        ]}
                      >
                        <InputNumber min={0.001} precision={3} style={{ width: "100%" }} />
                      </Form.Item>
                    ),
                  },
                  { title: t("หน่วย"), key: "unit", width: 80, render: (_v, f) => lines[f.name]?.unitLabel ?? "—" },
                  {
                    title: t("ราคา/หน่วย (ตาม PO)"),
                    key: "price",
                    width: 140,
                    align: "right",
                    render: (_v, f) => (
                      <>
                        {money.format(lines[f.name]?.unitPrice ?? 0)}
                        <Form.Item name={[f.name, "unitPrice"]} hidden>
                          <InputNumber />
                        </Form.Item>
                      </>
                    ),
                  },
                  {
                    title: t("ส่วนลด"),
                    key: "disc",
                    width: 120,
                    render: (_v, f) => (
                      <Form.Item name={[f.name, "discountAmount"]} style={{ marginBottom: 0 }}>
                        <InputNumber min={0} precision={2} style={{ width: "100%" }} />
                      </Form.Item>
                    ),
                  },
                  {
                    title: t("มูลค่า"),
                    key: "amt",
                    width: 130,
                    align: "right",
                    render: (_v, f) => {
                      const l = lines[f.name];
                      return money.format(Math.max((l?.quantity ?? 0) * (l?.unitPrice ?? 0) - (l?.discountAmount ?? 0), 0));
                    },
                  },
                  {
                    title: "",
                    key: "del",
                    width: 50,
                    render: (_v, f) => (
                      <Button
                        icon={<DeleteOutlined />}
                        disabled={fields.length <= 1 || !allowed}
                        onClick={() => remove(f.name)}
                        aria-label={t("ลบรายการ")}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Form.List>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t("ตั้งหนี้เกินจำนวนที่รับจริงและยังไม่ได้ตั้งหนี้ไม่ได้ — ลบบรรทัดหรือลดจำนวนได้")}
          </Typography.Text>
        </Card>
        ) : (
          <Alert
            type="info"
            showIcon
            title={t("ใบตั้งหนี้ค่าใช้จ่ายเพิ่มเติมจาก PO — ไม่มี GRN ไม่มีรายการรับสินค้า ไม่เพิ่มสต๊อก และไม่ดึงค่าสินค้าที่ตั้งหนี้แล้วมาคิดซ้ำ")}
          />
        )}

        {chargeOptions.length > 0 || isChargeOnly ? (
          <Card title={isChargeOnly ? t("3. ค่าใช้จ่ายเพิ่มเติมจาก PO") : t("3.1 ค่าใช้จ่ายเพิ่มเติมจาก PO")} size="small">
            <Table
              size="small"
              pagination={false}
              rowKey={(r) => r.opt.poChargeId}
              dataSource={chargeRows}
              scroll={{ x: 1100 }}
              locale={{ emptyText: t("PO นี้ไม่มีค่าใช้จ่ายเพิ่มเติม") }}
              columns={[
                {
                  title: t("ประเภท / รายละเอียดจาก PO"),
                  key: "desc",
                  render: (_v, r) => (
                    <span>
                      <Tag>{t(PO_CHARGE_TYPE_LABEL[r.opt.chargeType] ?? r.opt.chargeType)}</Tag> {r.opt.description}
                      {r.opt.whtApplicable ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {" "}
                          · {t("หัก ณ ที่จ่าย {rate}%", { rate: r.opt.whtRate })}
                        </Typography.Text>
                      ) : null}
                    </span>
                  ),
                },
                {
                  title: t("ยอดตาม PO (ก่อน VAT) / วงเงินที่อนุมัติ"),
                  key: "po",
                  align: "right",
                  width: 170,
                  render: (_v, r) => money.format(r.opt.poAmountBeforeVat),
                },
                { title: "VAT", key: "rate", align: "right", width: 70, render: (_v, r) => `${r.opt.taxRatePercent}%` },
                {
                  title: t("ตั้งหนี้แล้ว (AP อื่น)"),
                  key: "used",
                  align: "right",
                  width: 140,
                  render: (_v, r) => money.format(r.opt.allocatedByOthers),
                },
                {
                  title: t("คงเหลือที่ตั้งได้"),
                  key: "remain",
                  align: "right",
                  width: 130,
                  render: (_v, r) => money.format(r.opt.remaining),
                },
                {
                  title: t("ยอดที่ใช้ใน AP นี้ (ก่อน VAT)"),
                  key: "use",
                  width: 230,
                  render: (_v, r) => (
                    <Space.Compact style={{ width: "100%" }}>
                      <InputNumber
                        min={0}
                        max={r.opt.remaining}
                        precision={2}
                        disabled={!allowed || r.opt.remaining <= 0}
                        value={chargeInputs[r.opt.poChargeId]}
                        placeholder="0.00"
                        status={(Number(chargeInputs[r.opt.poChargeId]) || 0) > r.opt.remaining + 0.004 ? "error" : undefined}
                        onChange={(v) => setChargeInputs((prev) => ({ ...prev, [r.opt.poChargeId]: v ?? undefined }))}
                        style={{ width: "100%" }}
                      />
                      <Button
                        disabled={!allowed || r.opt.remaining <= 0}
                        onClick={() =>
                          setChargeInputs((prev) => ({ ...prev, [r.opt.poChargeId]: r.opt.remaining }))
                        }
                      >
                        {t("ทั้งหมด")}
                      </Button>
                    </Space.Compact>
                  ),
                },
                { title: t("VAT ของยอดนี้"), key: "vat", align: "right", width: 120, render: (_v, r) => money.format(r.vat) },
                {
                  title: t("รวม"),
                  key: "total",
                  align: "right",
                  width: 120,
                  render: (_v, r) => <Typography.Text strong>{money.format(r.total)}</Typography.Text>,
                },
              ]}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t("เลือกยอดค่าใช้จ่ายที่จะตั้งหนี้ในใบนี้เองได้ ไม่ต้องแบ่งเท่ากันทุกใบ และไม่เลือกก็ได้ — ยอดสะสมทุก AP ต้องไม่เกินวงเงินที่อนุมัติใน PO · VAT คิดตามอัตราของแต่ละรายการ และใบที่ตั้งยอดคงเหลือสุดท้ายจะรับ VAT ส่วนที่เหลือให้ผลรวมตรงกับ PO")}
            </Typography.Text>
          </Card>
        ) : null}

        <Card title={t("4. ข้อมูลยอดเงิน")} size="small">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0 16px", marginBottom: 8 }}>
            <Form.Item name="vatMode" label={t("การคิด VAT")} rules={[{ required: true }]}>
              <Select options={VAT_MODE_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} />
            </Form.Item>
            <Form.Item name="taxRateId" label={t("อัตราภาษี")}>
              <Select
                allowClear
                disabled={vatMode === "NONE" || !allowed}
                placeholder={t("มาตรฐาน {rate}%", { rate: STANDARD_VAT_PERCENT })}
                options={taxRates.map((r) => ({ value: r.id, label: `${r.name} (${Number(r.rate)}%)` }))}
              />
            </Form.Item>
            <Form.Item
              name="dueDate"
              label={t("วันครบกำหนดชำระ")}
              extra={
                term
                  ? isCashTerm
                    ? t("เงื่อนไข: {term} · เงินสด ครบกำหนดตามวันที่ใบแจ้งหนี้ Supplier", { term: termText(term) })
                    : isCreditTerm
                      ? t("เงื่อนไข: {term} · นับจากวันที่ใบแจ้งหนี้ Supplier (+ {days} วัน)", { term: termText(term), days: creditDaysForDue })
                      : t("เงื่อนไข: {term}", { term: termText(term) })
                  : undefined
              }
            >
              <DatePicker format="DD/MM/BBBB" style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
            {!isChargeOnly ? (
              <Descriptions.Item label={t("ค่าสินค้า (รวม VAT)")}>{money.format(goodsTotals.total)}</Descriptions.Item>
            ) : null}
            {chargeSum.base > 0 ? (
              <Descriptions.Item label={t("ค่าใช้จ่ายเพิ่มเติม (ก่อน VAT)")}>{money.format(chargeSum.base)}</Descriptions.Item>
            ) : null}
            <Descriptions.Item label={t("มูลค่าก่อนภาษี")}>{money.format(totals.subtotal)}</Descriptions.Item>
            <Descriptions.Item label={chargeSum.base > 0 ? t("ภาษีมูลค่าเพิ่ม (สินค้า + ค่าใช้จ่าย)") : t("ภาษีมูลค่าเพิ่ม {rate}%", { rate: vatRate })}>
              {money.format(totals.vat)}
            </Descriptions.Item>
            <Descriptions.Item label={t("ยอดตั้งหนี้รวม")}>
              <Typography.Text strong>{money.format(totals.total)}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label={t("เงินล่วงหน้า / มัดจำทั้งหมด (จ่ายจริงแล้ว)")}>{money.format(depositInfo?.totalPaid ?? 0)}</Descriptions.Item>
            <Descriptions.Item label={t("มัดจำที่ใช้ไปแล้ว (AP ใบอื่น)")}>{money.format(depositInfo?.usedByOthers ?? 0)}</Descriptions.Item>
            <Descriptions.Item label={t("มัดจำคงเหลือที่ใช้ได้")}>{money.format(available)}</Descriptions.Item>
            <Descriptions.Item label={t("มัดจำที่เลือกนำมาหัก")}>{money.format(deduct)}</Descriptions.Item>
            <Descriptions.Item label={t("ยอดคงเหลือที่ต้องจ่าย")} span="filled">
              <Typography.Text strong>{money.format(netAfterDeposit)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
        <Card title={t("หมายเหตุและเอกสารแนบ")} size="small">
          <Form.Item name="remark" label={t("หมายเหตุ")}>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          <Form.Item name="internalNote" label={t("โน้ตภายในบริษัท")} extra={t("เห็นเฉพาะภายในบริษัท — แสดงท้ายใบสำคัญบัญชี ไม่ส่งให้ผู้ขาย")}>
            <Input.TextArea rows={2} maxLength={2000} />
          </Form.Item>
          {id ? (
            <DocumentAttachmentsPanel documentType="AP_INVOICE" documentId={id} canEdit={allowed} emptyText={t("ยังไม่มีเอกสารแนบ")} />
          ) : (
            <Typography.Text type="secondary">{t("แนบไฟล์ได้หลังบันทึกร่าง (ในหน้าแก้ไข/รายละเอียด)")}</Typography.Text>
          )}
        </Card>
      </Form>

      <Card title={t("5. การหักเงินล่วงหน้า / มัดจำ")} size="small">
        {(depositInfo?.sources.length ?? 0) === 0 ? (
          <Typography.Text type="secondary">
            {t("ยังไม่มีเงินล่วงหน้า/มัดจำที่บันทึกจ่ายจริงแล้วของรายการจ่ายเงินนี้ — ไม่มีมัดจำให้หัก")}
          </Typography.Text>
        ) : (
          <>
            {available > 0 ? (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                title={t("คุณมีเงินมัดจำที่ชำระไว้แล้ว สามารถนำมาหักยอดใบตั้งหนี้นี้ได้")}
                description={t("คงเหลือที่ใช้ได้ {amount} บาท", { amount: money.format(available) })}
              />
            ) : null}
            <Checkbox
              checked={useDeposit}
              disabled={!allowed || available <= 0}
              onChange={(e) => {
                setUseDepositOverride(e.target.checked);
                setDepositInput(e.target.checked ? maxDeduct : null);
              }}
            >
              {t("นำเงินล่วงหน้า / มัดจำมาหักในใบตั้งหนี้นี้")}
            </Checkbox>
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <Typography.Text>{t("จำนวนเงินที่หัก:")} </Typography.Text>
              <Space.Compact style={{ width: 200 }}>
                <InputNumber
                  min={0}
                  max={maxDeduct}
                  precision={2}
                  disabled={!useDeposit || !allowed}
                  value={useDeposit ? deductRaw : 0}
                  onChange={(v) => setDepositInput(Number(v ?? 0))}
                  style={{ width: "100%" }}
                />
                <Input style={{ width: 52 }} value={t("บาท")} disabled />
              </Space.Compact>
              <Typography.Text type="secondary">
                {t("สูงสุด {amount} บาท (เต็มจำนวน บางส่วน หรือแบ่งหักหลาย AP ได้ — ส่วนที่ไม่หักเก็บไว้หักใบถัดไป)", { amount: money.format(maxDeduct) })}
              </Typography.Text>
            </div>
            {deductMismatch ? (
              <Alert style={{ marginTop: 8 }} type="warning" showIcon title={t("ยอดหักเกินยอดที่ใช้ได้ ({amount} บาท)", { amount: money.format(maxDeduct) })} />
            ) : null}
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
              {t("ใช้เฉพาะมัดจำที่บันทึกจ่ายจริงแล้ว · ภาษีหัก ณ ที่จ่ายของมัดจำ ({amount} บาท) ถูกหักไปแล้วตอนจ่ายมัดจำ ใบตั้งหนี้นี้ไม่หักซ้ำ · อนุมัติแล้วแก้ยอดหักโดยตรงไม่ได้", { amount: money.format(depositInfo?.whtWithheld ?? 0) })}
            </Typography.Paragraph>
          </>
        )}
      </Card>

      <Card size="small">
        <Space wrap>
          <Button onClick={() => router.push(config.basePath)}>{t("ยกเลิก")}</Button>
          {allowed ? (
            <>
              <Button loading={saving} onClick={() => void save(false)}>
                {t("บันทึกร่าง")}
              </Button>
              <Button type="primary" loading={saving} onClick={() => void save(true)}>
                {t("บันทึกและส่งอนุมัติ")}
              </Button>
            </>
          ) : null}
          <Typography.Text type="secondary">
            {t("วันที่ตั้งหนี้ {date} · ร่างแก้ไขได้จนกว่าจะอนุมัติ", { date: formatThaiDate(dayjs().format("YYYY-MM-DD")) })}
          </Typography.Text>
        </Space>
      </Card>
    </Space>
  );
}
