"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
  Spin,
  Upload,
} from "antd";
import type { UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  FileAddOutlined,
  PaperClipOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import DocumentHtmlEditor from "@/components/common/DocumentHtmlEditor";
import { useVendorsQuery } from "@/hooks/vendors/useVendorsQuery";
import { usePaymentTermsQuery } from "@/hooks/payment-terms/usePaymentTermsQuery";
import { useCreatePurchaseOrderFromPrMutation } from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseOrderByPrQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { usePurchaseRequestQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import {
  calcDocumentTotals,
  calcLineAmount,
  resolveVatMode,
  resolveWithholdingPercent,
  VatMode,
  resolveDocumentVatPercent,
  VAT_MODE_OPTIONS,
  vatAmountLabel,
  WITHHOLDING_TAX_TYPE_OPTIONS,
  WithholdingTaxType,
} from "@/lib/money/vat-totals";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";
import { uploadDocumentAttachment } from "@/lib/api/document-attachments";
import {
  getScreenActionPermissions,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/auth/token";
import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";
import {
  ATTACHMENT_GROUP_QUOTATION,
  DOCUMENT_TYPE_PO,
} from "@/types/document-attachments";
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
  vatMode: VatMode;
  expectedDeliveryDate?: dayjs.Dayjs;
  paymentMethod?: string;
  withholdingTaxType: WithholdingTaxType;
  withholdingTaxPercent?: number;
  discountAmount?: number;
  remark?: string;
  items: LineValues[];
};

const PAYMENT_METHOD_OPTIONS = Object.entries(SUPPLIER_PAYMENT_METHOD_LABEL).map(
  ([value, label]) => ({ value, label }),
);

type Props = {
  purchaseRequestId: string;
};

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** อนุญาตเฉพาะตัวเลขและจุดทศนิยม (บล็อก e / + / - / ตัวอักษร) */
function blockNonNumericKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const allowedKeys = new Set([
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ]);
  if (allowedKeys.has(event.key)) {
    return;
  }
  if (!/^[0-9.]$/.test(event.key)) {
    event.preventDefault();
  }
}

export default function PurchaseOrderCreateFromPrPage({
  purchaseRequestId,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const poActions = getScreenActionPermissions("PURCHASE_ORDERS");
  const legacyWrite =
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    isAdministrator();
  const canCreatePo = isMatrixPermissionMode()
    ? poActions.canAdd
    : legacyWrite;

  const prQuery = usePurchaseRequestQuery(purchaseRequestId);
  const existingPoQuery = usePurchaseOrderByPrQuery(purchaseRequestId);
  const createMutation = useCreatePurchaseOrderFromPrMutation();

  const vendorsQuery = useVendorsQuery({ isActive: true });
  const paymentTermsQuery = usePaymentTermsQuery({ isActive: true });

  const vendors = vendorsQuery.data?.data ?? [];
  const paymentTerms = paymentTermsQuery.data?.data ?? [];

  const pr = prQuery.data?.data;
  const existingPo = existingPoQuery.data?.data;

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discountAmount", form) ?? 0;
  const watchedVatMode = Form.useWatch("vatMode", form);
  const watchedWhtType = Form.useWatch("withholdingTaxType", form);
  const watchedWhtPercent = Form.useWatch("withholdingTaxPercent", form);

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
      vatMode: VatMode.EXCLUSIVE,
      withholdingTaxType: WithholdingTaxType.NONE,
      withholdingTaxPercent: 0,
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

  const preview = useMemo(() => {
    const lineAmounts = watchedItems.map((line, index) => {
      const prItemId =
        line?.purchaseRequestItemId ?? (pr?.items ?? [])[index]?.id ?? "";
      const meta = lineMetaByPrItemId.get(prItemId);
      const qty = Number(meta?.quantity ?? line?.quantity) || 0;
      const price = Number(line?.unitPrice) || 0;
      const disc = Number(line?.discountAmount) || 0;
      return calcLineAmount(qty, price, disc);
    });
    const vatMode = resolveVatMode(watchedVatMode);
    // อัตรา VAT = อัตราหัก ณ ที่จ่ายของใบนี้ (ดู resolveDocumentVatPercent)
    const rate = resolveDocumentVatPercent({
      vatMode,
      withholdingTaxType: watchedWhtType,
      withholdingTaxPercent: watchedWhtPercent,
    });
    return {
      ...calcDocumentTotals(
        lineAmounts,
        Number(watchedDiscount) || 0,
        vatMode,
        rate,
      ),
      vatRate: rate,
    };
  }, [
    watchedDiscount,
    watchedItems,
    watchedVatMode,
    watchedWhtType,
    watchedWhtPercent,
    lineMetaByPrItemId,
    pr?.items,
  ]);

  const uploadProps: UploadProps = {
    multiple: true,
    showUploadList: false,
    accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*",
    beforeUpload: (file) => {
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
        message.error("รองรับเฉพาะ PDF และรูป JPG/PNG/WEBP");
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        message.error("ขนาดไฟล์ต้องไม่เกิน 20MB");
        return Upload.LIST_IGNORE;
      }
      setPendingFiles((prev) => {
        if (prev.some((f) => f.name === file.name && f.size === file.size)) {
          return prev;
        }
        return [...prev, file];
      });
      return false;
    },
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (!canCreatePo) {
    return <AccessDenied screenCodes={["PURCHASE_ORDERS"]} />;
  }

  if (prQuery.isLoading || existingPoQuery.isLoading) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลดใบขอซื้อ...
      </div>
    );
  }

  if (prQuery.isError) {
    return (
      <div className={styles.page}>
        โหลดใบขอซื้อไม่สำเร็จ — ตรวจสิทธิ์ใบสั่งซื้อ (ADD/VIEW) ใน Permission Matrix
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className={styles.page}>
        ไม่พบใบขอซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
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

  const saving =
    isSubmitting || createMutation.isPending || isUploadingAttachments;

  const onFinish = async (values: FormValues) => {
    if (submitLockRef.current) {
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await createMutation.mutateAsync({
        purchaseRequestId,
        body: {
          poDate: values.poDate.format("YYYY-MM-DD"),
          creditorId: values.creditorId,
          paymentTermId: values.paymentTermId,
          vatMode: resolveVatMode(values.vatMode),
          expectedDeliveryDate: values.expectedDeliveryDate
            ? values.expectedDeliveryDate.format("YYYY-MM-DD")
            : undefined,
          paymentMethod: values.paymentMethod || undefined,
          withholdingTaxType: values.withholdingTaxType,
          withholdingTaxPercent: resolveWithholdingPercent(
            values.withholdingTaxType,
            values.withholdingTaxPercent,
          ),
          discountAmount: values.discountAmount ?? 0,
          remark: sanitizeDocumentHtml(values.remark) || undefined,
          items: values.items.map((item) => ({
            purchaseRequestItemId: item.purchaseRequestItemId,
            unitPrice: Number(item.unitPrice),
            discountAmount: Number(item.discountAmount) || 0,
            description: item.description?.trim() || undefined,
          })),
        },
      });

      const poId = response.data.id;
      if (pendingFiles.length > 0) {
        setIsUploadingAttachments(true);
        let failed = 0;
        try {
          for (const file of pendingFiles) {
            try {
              await uploadDocumentAttachment(getAccessToken(), {
                file,
                documentType: DOCUMENT_TYPE_PO,
                documentId: poId,
                attachmentGroup: ATTACHMENT_GROUP_QUOTATION,
              });
            } catch (error) {
              failed += 1;
              console.error(error);
            }
          }
          if (failed > 0) {
            message.warning(
              `สร้าง PO สำเร็จ แต่แนบไฟล์ไม่สำเร็จ ${failed} ไฟล์ — แนบใหม่ได้ที่หน้ารายละเอียด`,
            );
          } else {
            message.success(`แนบใบเสนอราคา ${pendingFiles.length} ไฟล์แล้ว`);
          }
        } finally {
          setIsUploadingAttachments(false);
        }
      }

      router.replace(`/purchase-orders/${poId}`);
    } catch {
      // mutation onError already toasts
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
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

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={saving}
        initialValues={{
          vatMode: VatMode.EXCLUSIVE,
          withholdingTaxType: WithholdingTaxType.NONE,
        }}
      >
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
                  {/*
                    ไม่มีช่อง "อัตรา VAT" แล้ว — อัตรามาจากช่องหัก ณ ที่จ่ายข้างล่าง
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
                                  {
                                    type: "number",
                                    min: 0,
                                    message: "ราคาต้องเป็นตัวเลข ≥ 0",
                                  },
                                ]}
                              >
                                <InputNumber
                                  min={0}
                                  precision={2}
                                  inputMode="decimal"
                                  controls={false}
                                  style={{ width: "100%" }}
                                  placeholder="0.00"
                                  onKeyDown={blockNonNumericKey}
                                  parser={(value) =>
                                    Number((value ?? "").replace(/[^\d.]/g, "")) ||
                                    0
                                  }
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                className={styles.field}
                                label="ส่วนลดรายการ"
                                name={[name, "discountAmount"]}
                              >
                                <InputNumber
                                  min={0}
                                  style={{ width: "100%" }}
                                />
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

              <div className={styles.sectionBlock}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    <PaperClipOutlined /> ใบเสนอราคา / หลักฐานราคา
                  </h2>
                  <p className={styles.sectionHint}>
                    แนบใบเสนอราคาจากพ่อค้าเพื่อยืนยันว่าราคาใน PO ตรงตามที่เสนอ
                  </p>
                </div>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} disabled={saving}>
                    เลือกไฟล์แนบ
                  </Button>
                </Upload>
                <p className={styles.sectionHint}>
                  รองรับ PDF และรูป JPG/PNG/WEBP ขนาดไม่เกิน 20MB —
                  จะอัปโหลดเมื่อกดบันทึก
                </p>
                {pendingFiles.length > 0 ? (
                  <ul className={styles.pendingFileList}>
                    {pendingFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        className={styles.pendingFileItem}
                      >
                        <span className={styles.pendingFileName}>
                          {file.name}
                        </span>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={saving}
                          onClick={() => removePendingFile(index)}
                          aria-label={`ลบ ${file.name}`}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div className={styles.footerBar}>
              <p className={styles.footerHint}>
                บันทึกแล้วสถานะเป็น DRAFT — Confirm ได้จากหน้ารายละเอียด
              </p>
              <div className={styles.footerActions}>
                <Button
                  className={styles.cancelBtn}
                  disabled={saving}
                  onClick={() => router.push(`/purchase-requests/${pr.id}`)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className={styles.saveBtn}
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  disabled={saving}
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
              <div className={styles.summaryRow}>
                <span>{vatAmountLabel(preview.vatRate)}</span>
                <strong>{formatMoney(preview.vat)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>ยอดสุทธิ</span>
                <strong>{formatMoney(preview.total)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>ไฟล์แนบ</span>
                <strong>{pendingFiles.length}</strong>
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
