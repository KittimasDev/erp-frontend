"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Checkbox,
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
import {
  useCreatePurchaseOrderFromPrMutation,
  useCreatePurchaseOrderFromPrsMutation,
} from "@/hooks/purchase-orders/usePurchaseOrderMutations";
import { usePurchaseRequestsQueries } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
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
import { clearPurchaseOrderPrLineSelection } from "@/types/purchase-order-pr-line-selection";
import type { PurchaseRequest } from "@/types/purchase-requests";
import styles from "./PurchaseOrderFormPage.module.css";

type LineValues = {
  /* ติ๊กเลือกรายบรรทัด — สินค้าในใบเดียวมักคนละเจ้า ต้องแตกเป็นหลายใบสั่งซื้อ */
  selected: boolean;
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

const PAYMENT_METHOD_OPTIONS = Object.entries(
  SUPPLIER_PAYMENT_METHOD_LABEL,
).map(([value, label]) => ({ value, label }));

type Props = {
  /** ใบขอซื้อต้นทาง — ใบเดียวคือเส้นทางเดิม, หลายใบคือรวมเป็นใบสั่งซื้อใบเดียว */
  purchaseRequestIds: string[];
  /**
   * บรรทัดที่ติ๊กมาจากหน้ารายการใบสั่งซื้อ — ไม่ส่งมา = ติ๊กทุกบรรทัด (พฤติกรรมเดิม)
   * บรรทัดที่ถูกสั่งไประหว่างทางจะหลุดจาก openItemsByPr เองอยู่แล้ว
   */
  preselectedPrItemIds?: string[];
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
  purchaseRequestIds,
  preselectedPrItemIds,
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
  const canCreatePo = isMatrixPermissionMode() ? poActions.canAdd : legacyWrite;

  const isSinglePr = purchaseRequestIds.length === 1;

  const prQueries = usePurchaseRequestsQueries(purchaseRequestIds);
  /*
    ไม่เด้งออกเมื่อใบขอซื้อมีใบสั่งซื้อแล้ว — ใบเดียวแตกเป็นหลายใบสั่งซื้อได้
    ตามเจ้าของสินค้า จึงต้องเปิดฟอร์มซ้ำเพื่อสั่งรายการที่ยังเหลือ
    ใบที่เคยเปิดไปแล้วแสดงเป็นลิงก์ที่หัวฟอร์มแทน
  */
  const createMutation = useCreatePurchaseOrderFromPrMutation();
  const createFromPrsMutation = useCreatePurchaseOrderFromPrsMutation();

  const vendorsQuery = useVendorsQuery({ isActive: true });
  const paymentTermsQuery = usePaymentTermsQuery({ isActive: true });

  const vendors = vendorsQuery.data?.data ?? [];
  const paymentTerms = paymentTermsQuery.data?.data ?? [];

  const loadedPrs = prQueries.map((query) => query.data?.data);
  /* คีย์จากรหัสใบที่โหลดได้ — กัน useMemo ด้านล่างคิดใหม่ทุกรอบเพราะ array ตัวใหม่ */
  const loadedPrsKey = loadedPrs.map((row) => row?.id ?? "").join(",");
  const prs = useMemo(
    () => loadedPrs.filter((row): row is PurchaseRequest => Boolean(row)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadedPrsKey],
  );
  const pr = prs[0];

  const watchedItems = Form.useWatch("items", form) ?? [];
  const watchedDiscount = Form.useWatch("discountAmount", form) ?? 0;
  const watchedVatMode = Form.useWatch("vatMode", form);
  const watchedWhtType = Form.useWatch("withholdingTaxType", form);
  const watchedWhtPercent = Form.useWatch("withholdingTaxPercent", form);

  /*
    บรรทัดที่ถูกสั่งไปแล้วไม่ต้องเอามาให้เลือกซ้ำ — ฟอร์มนี้ทำหน้าที่สั่งของที่ยังไม่ได้สั่ง
    แต่ยังต้องรู้ว่ามีอะไรบ้างเพื่อบอกผู้ใช้ว่าของไม่ได้หายไปไหน
  */
  const openItemsByPr = useMemo(
    () =>
      prs.map((row) => ({
        pr: row,
        open: (row.items ?? []).filter((item) => !item.orderedPurchaseOrder),
        ordered: (row.items ?? []).filter((item) => item.orderedPurchaseOrder),
      })),
    [prs],
  );

  const lineMetaByPrItemId = useMemo(() => {
    const map = new Map<
      string,
      {
        itemLabel: string;
        quantity: number;
        unitLabel: string;
        prId: string;
        prNo: string;
      }
    >();
    for (const { pr: row, open } of openItemsByPr) {
      for (const item of open) {
        const itemLabel =
          [item.itemCode, item.itemNameTh].filter(Boolean).join(" — ") ||
          "ไม่ระบุชื่อสินค้า";
        map.set(item.id, {
          itemLabel,
          quantity: Number(item.quantity),
          unitLabel: item.unitNameTh ?? item.unitCode ?? "—",
          prId: row.id,
          prNo: row.prNo,
        });
      }
    }
    return map;
  }, [openItemsByPr]);

  /* prop เป็น array ตัวใหม่ทุก render — แปลงเป็นคีย์สตริงก่อนใส่ dep ไม่งั้น effect วน */
  const preselectKey = preselectedPrItemIds?.join(",") ?? "";
  const preselectSet = useMemo(
    () => (preselectKey ? new Set(preselectKey.split(",")) : undefined),
    [preselectKey],
  );

  /*
    บรรทัดที่ติ๊กมาไม่เหลืออยู่เลยทั้งที่ยังมีของให้สั่ง = ค่าที่ส่งมาหมดอายุ
    (ถูกคนอื่นสั่งไปก่อน) — กลับไปติ๊กทั้งหมดแล้วขึ้นข้อความเตือน
    ดีกว่าโชว์ฟอร์มที่ไม่ติ๊กอะไรเลยโดยไม่บอกเหตุผล
  */
  const preselectWentStale = useMemo(() => {
    if (!preselectSet?.size) {
      return false;
    }
    const openItems = openItemsByPr.flatMap(({ open }) => open);
    return (
      openItems.length > 0 &&
      !openItems.some((item) => preselectSet.has(item.id))
    );
  }, [preselectSet, openItemsByPr]);

  useEffect(() => {
    if (prs.length !== purchaseRequestIds.length) return;

    const usePreselect = preselectSet && !preselectWentStale;

    form.setFieldsValue({
      poDate: dayjs(),
      vatMode: VatMode.EXCLUSIVE,
      withholdingTaxType: WithholdingTaxType.NONE,
      withholdingTaxPercent: 0,
      discountAmount: 0,
      /* หมายเหตุของใบขอซื้อเอามาได้เฉพาะตอนมีใบเดียว รวมหลายใบแล้วจะกำกวม */
      remark: prs.length === 1 ? prs[0].remark : undefined,
      /* เรียงตามลำดับใบที่เลือก ให้ตรงกับลำดับที่ backend เขียนลงบรรทัด */
      items: openItemsByPr.flatMap(({ open }) =>
        open.map((item) => ({
          /* ไม่ได้ติ๊กมาจากหน้ารายการ = ติ๊กทั้งหมด (สั่งเจ้าเดียวทั้งใบเจอบ่อยสุด) */
          selected: usePreselect ? preselectSet.has(item.id) : true,
          purchaseRequestItemId: item.id,
          quantity: Number(item.quantity),
          unitPrice: undefined,
          discountAmount: 0,
          description: item.description,
        })),
      ),
    });
  }, [
    form,
    prs,
    openItemsByPr,
    purchaseRequestIds.length,
    preselectSet,
    preselectWentStale,
  ]);

  /* ลำดับบรรทัดที่แบนแล้ว ใช้เป็นตัวสำรองตอน form ยังไม่มี purchaseRequestItemId */
  const flatPrItemIds = useMemo(
    () => openItemsByPr.flatMap(({ open }) => open.map((item) => item.id)),
    [openItemsByPr],
  );

  const selectedCount = watchedItems.filter((line) => line?.selected).length;

  /** ติ๊ก/ล้างทุกบรรทัดของใบขอซื้อใบหนึ่งรวดเดียว */
  const setGroupSelection = (prId: string | undefined, selected: boolean) => {
    if (!prId) {
      return;
    }
    const current: LineValues[] = form.getFieldValue("items") ?? [];
    form.setFieldValue(
      "items",
      current.map((line) =>
        lineMetaByPrItemId.get(line.purchaseRequestItemId)?.prId === prId
          ? { ...line, selected }
          : line,
      ),
    );
  };

  /* บรรทัดที่สั่งไปแล้ว — ไม่แสดงในฟอร์ม แต่ต้องบอกว่าไปอยู่ใบไหน */
  const orderedSummary = openItemsByPr
    .filter(({ ordered }) => ordered.length)
    .map(({ pr: row, ordered }) => ({
      prNo: row.prNo,
      count: ordered.length,
      pos: [
        ...new Map(
          ordered
            .map((item) => item.orderedPurchaseOrder!)
            .map((po) => [po.id, po] as const),
        ).values(),
      ],
    }));

  const preview = useMemo(() => {
    const lineAmounts = watchedItems.map((line, index) => {
      /* บรรทัดที่ไม่ติ๊กไม่เข้ายอดรวม */
      if (!line?.selected) {
        return 0;
      }
      const prItemId =
        line?.purchaseRequestItemId ?? flatPrItemIds[index] ?? "";
      const meta = lineMetaByPrItemId.get(prItemId);
      const qty = Number(meta?.quantity ?? line?.quantity) || 0;
      const price = Number(line?.unitPrice) || 0;
      const disc = Number(line?.discountAmount) || 0;
      return calcLineAmount(qty, price, disc);
    });
    const vatMode = resolveVatMode(watchedVatMode);
    // อัตรา VAT = 7% เมื่อรูปแบบไม่ใช่ไม่คิด VAT (ดู resolveDocumentVatPercent)
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
    flatPrItemIds,
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

  if (prQueries.some((query) => query.isLoading)) {
    return (
      <div className={styles.page}>
        <Spin /> กำลังโหลดใบขอซื้อ...
      </div>
    );
  }

  if (prQueries.some((query) => query.isError)) {
    return (
      <div className={styles.page}>
        โหลดใบขอซื้อไม่สำเร็จ — ตรวจสิทธิ์ใบสั่งซื้อ (ADD/VIEW) ใน Permission
        Matrix
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  if (!pr || prs.length !== purchaseRequestIds.length) {
    return (
      <div className={styles.page}>
        ไม่พบใบขอซื้อ{prs.length ? "บางใบ" : ""}
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  const notApprovedPrs = prs.filter((row) => row.status !== "APPROVED");
  if (notApprovedPrs.length) {
    return (
      <div className={styles.page}>
        สร้างใบสั่งซื้อได้เฉพาะ PR สถานะ APPROVED — ใบที่ยังไม่ผ่าน:{" "}
        {notApprovedPrs.map((row) => `${row.prNo} (${row.status})`).join(", ")}
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  /* ทุกบรรทัดถูกสั่งไปหมดแล้ว — ไม่มีอะไรให้กรอก */
  if (!openItemsByPr.some(({ open }) => open.length)) {
    const allPos = [
      ...new Map(
        prs
          .flatMap((row) => row.linkedPurchaseOrders ?? [])
          .map((po) => [po.id, po] as const),
      ).values(),
    ];

    return (
      <div className={styles.page}>
        ทุกรายการของใบขอซื้อที่เลือกถูกสั่งซื้อไปหมดแล้ว
        {allPos.length ? (
          <div style={{ marginTop: 8 }}>
            ใบสั่งซื้อที่เกี่ยวข้อง:{" "}
            {allPos.map((po, index) => (
              <span key={po.id}>
                {index > 0 ? ", " : null}
                <Link href={`/purchase-orders/${po.id}`}>{po.poNo}</Link>
              </span>
            ))}
          </div>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-orders">กลับรายการใบสั่งซื้อ</Link>
        </div>
      </div>
    );
  }

  const saving =
    isSubmitting ||
    createMutation.isPending ||
    createFromPrsMutation.isPending ||
    isUploadingAttachments;

  const onFinish = async (values: FormValues) => {
    if (submitLockRef.current) {
      return;
    }

    if (!values.items.some((item) => item.selected)) {
      form.setFields([
        {
          name: "items",
          errors: ["เลือกอย่างน้อย 1 รายการที่จะสั่งซื้อ"],
        },
      ]);
      message.error("เลือกอย่างน้อย 1 รายการที่จะสั่งซื้อ");
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const body = {
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
        items: values.items
          .filter((item) => item.selected)
          .map((item) => ({
            purchaseRequestItemId: item.purchaseRequestItemId,
            unitPrice: Number(item.unitPrice),
            discountAmount: Number(item.discountAmount) || 0,
            description: item.description?.trim() || undefined,
          })),
      };

      /* ใบเดียวใช้ endpoint เดิม ไม่เปลี่ยนเส้นทางของงานที่ใช้อยู่ทุกวัน */
      const response = isSinglePr
        ? await createMutation.mutateAsync({
            purchaseRequestId: purchaseRequestIds[0],
            body,
          })
        : await createFromPrsMutation.mutateAsync({
            ...body,
            purchaseRequestIds,
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

      /* สร้างสำเร็จแล้ว ค่าที่ฝากไว้หมดหน้าที่ — ห้ามเคลียร์ตอนอ่าน ไม่งั้น F5 แล้วหาย */
      clearPurchaseOrderPrLineSelection();
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
          <h1 className={styles.pageTitle}>
            {isSinglePr
              ? "สร้างใบสั่งซื้อจาก PR"
              : `รวมใบขอซื้อ ${prs.length} ใบเป็นใบสั่งซื้อเดียว`}
          </h1>
          <p className={styles.pageSubtitle}>
            อ้างอิง {prs.map((row) => row.prNo).join(", ")} ·
            คัดลอกรายการสินค้าจากใบขอซื้อ
          </p>
        </div>
        <div className={styles.backLink}>
          <Link
            href={
              isSinglePr ? `/purchase-requests/${pr.id}` : "/purchase-orders"
            }
          >
            <Button icon={<ArrowLeftOutlined />}>
              {isSinglePr ? "กลับ PR" : "กลับรายการใบสั่งซื้อ"}
            </Button>
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
                      <InputNumber
                        min={0}
                        max={100}
                        style={{ width: "100%" }}
                      />
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
                  <p className={styles.sectionHint}>
                    เลือกเฉพาะรายการที่จะสั่งจากผู้ขายรายนี้ — รายการที่เหลือยังอยู่
                    ในคิวให้เปิดใบสั่งซื้อใบถัดไปได้
                  </p>
                </div>

                <div className={styles.selectionBar}>
                  <span>
                    เลือกไว้{" "}
                    <strong>
                      {selectedCount} / {watchedItems.length}
                    </strong>{" "}
                    รายการ
                  </span>
                  {selectedCount === 0 ? (
                    <span className={styles.selectionWarn}>
                      ต้องเลือกอย่างน้อย 1 รายการ
                    </span>
                  ) : null}
                  {preselectWentStale ? (
                    <span className={styles.selectionWarn}>
                      รายการที่เลือกไว้ถูกสั่งซื้อไปแล้ว — ตรวจการติ๊กอีกครั้ง
                    </span>
                  ) : null}
                </div>

                {orderedSummary.length ? (
                  <div className={styles.orderedNote}>
                    {orderedSummary.map((row) => (
                      <div key={row.prNo}>
                        {row.prNo}: อีก {row.count} รายการสั่งไปแล้วใน{" "}
                        {row.pos.map((po, i) => (
                          <span key={po.id}>
                            {i > 0 ? ", " : null}
                            <Link href={`/purchase-orders/${po.id}`}>
                              {po.poNo}
                            </Link>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                <Form.List name="items">
                  {(fields) => (
                    <div className={styles.lineList}>
                      {fields.map(({ key, name, ...restField }, index) => {
                        const line = watchedItems[index];
                        const prItemId =
                          line?.purchaseRequestItemId ??
                          flatPrItemIds[index] ??
                          "";
                        const meta = lineMetaByPrItemId.get(prItemId);
                        const itemLabel =
                          meta?.itemLabel || `รายการที่ ${index + 1}`;
                        const qty = meta?.quantity ?? line?.quantity ?? 0;
                        const unitLabel = meta?.unitLabel ?? "";
                        /*
                          ขึ้นหัวกลุ่มเมื่อเปลี่ยนใบขอซื้อ — ไม่งั้นผู้ใช้แยกไม่ออกว่า
                          บรรทัดไหนมาจากใบไหน (ใบเดียวไม่ต้องขึ้น หน้าตาเหมือนเดิม)
                        */
                        const prevPrId = index
                          ? lineMetaByPrItemId.get(
                              watchedItems[index - 1]?.purchaseRequestItemId ??
                                flatPrItemIds[index - 1] ??
                                "",
                            )?.prId
                          : undefined;
                        const showGroupHead =
                          !isSinglePr && meta?.prId !== prevPrId;
                        return (
                          <div key={key}>
                            {showGroupHead ? (
                              <div className={styles.sourcePrHead}>
                                <span>
                                  ใบขอซื้อ <strong>{meta?.prNo}</strong>
                                </span>
                                {/* แยกตามเจ้าทีละกลุ่มคือท่าที่ใช้จริง ปุ่มนี้ย่นเวลาติ๊ก */}
                                <span className={styles.sourcePrActions}>
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() =>
                                      setGroupSelection(meta?.prId, true)
                                    }
                                  >
                                    เลือกทั้งใบ
                                  </Button>
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() =>
                                      setGroupSelection(meta?.prId, false)
                                    }
                                  >
                                    ล้างทั้งใบ
                                  </Button>
                                </span>
                              </div>
                            ) : null}
                            <div className={styles.lineCard}>
                              <div className={styles.lineCardHeader}>
                                <Form.Item
                                  {...restField}
                                  name={[name, "selected"]}
                                  valuePropName="checked"
                                  style={{ marginBottom: 0 }}
                                >
                                  <Checkbox>
                                    <strong>{itemLabel}</strong>
                                  </Checkbox>
                                </Form.Item>
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
                                    /* บรรทัดที่ไม่ติ๊กไม่ได้ส่งไป จึงไม่ควรบล็อกการบันทึก */
                                    {
                                      required: Boolean(line?.selected),
                                      message: "ระบุราคา",
                                    },
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
                                      Number(
                                        (value ?? "").replace(/[^\d.]/g, ""),
                                      ) || 0
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
