"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Input, Modal, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
  EditOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  SendOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useApprovePurchaseRequestMutation,
  useCancelPurchaseRequestMutation,
  useRejectPurchaseRequestMutation,
  useReturnPurchaseRequestToDraftMutation,
  useSubmitPurchaseRequestMutation,
} from "@/hooks/purchase-requests/usePurchaseRequestMutations";
import { usePurchaseRequestQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { usePurchaseOrderByPrQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { usePurchasePaymentByPoQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import DocumentHtmlView from "@/components/common/DocumentHtmlView";
import { documentHtmlIsEmpty } from "@/lib/html/sanitize-document-html";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { purchaseRequestStatusLabel } from "@/types/purchase-requests";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { formatNumber } from "@/lib/i18n/format";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./PurchaseRequestDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = {
  id: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatQty(value: string, lang: "th" | "en") {
  return formatNumber(Number(value), lang, 3);
}

/** ร่าง กับ ที่ถูกส่งกลับแก้ไข ทำอย่างเดียวกันได้ — ตรงกับ guard ฝั่ง backend */
const PR_EDITABLE_STATUSES: string[] = ["DRAFT", "REVISING"];

function statusClass(status: string) {
  switch (status) {
    case "APPROVED":
      return styles.statusApproved;
    case "PENDING_APPROVAL":
      return styles.statusPending;
    case "REJECTED":
      return styles.statusRejected;
    case "REVISING":
      return styles.statusRevision;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function PurchaseRequestDetailPage({ id }: Props) {
  const router = useRouter();
  const t = useT();
  const lang = useLanguage();
  const { modal } = App.useApp();
  const query = usePurchaseRequestQuery(id);
  const submitMutation = useSubmitPurchaseRequestMutation();
  const approveMutation = useApprovePurchaseRequestMutation();
  const rejectMutation = useRejectPurchaseRequestMutation();
  const returnMutation = useReturnPurchaseRequestToDraftMutation();
  const cancelMutation = useCancelPurchaseRequestMutation();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  // modal เหตุผลตัวเดียวใช้ทั้งไม่อนุมัติและส่งกลับแก้ไข
  const [reviewAction, setReviewAction] = useState<"reject" | "return">(
    "reject",
  );

  const data = query.data?.data;
  const canApprove =
    hasPermission("PURCHASE_REQUEST_APPROVALS.APPROVE") ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.PROCUREMENT_MANAGER) || isAdministrator()));
  /** เปิด/ดูใบสั่งซื้อเป็นงานของหน้า PURCHASE_ORDERS — ใช้สิทธิ์ของหน้านั้นตัดสิน */
  const poActions = useScreenActionPermissions("PURCHASE_ORDERS");
  const canWritePo = poActions.canAdd;
  const canReadPo = poActions.canView;

  const linkedPoQuery = usePurchaseOrderByPrQuery(
    data?.status === "APPROVED" && canReadPo ? data.id : undefined,
  );
  const linkedPo = linkedPoQuery.data?.data ?? null;

  /*
    ใบขอซื้อใบเดียวแตกเป็นใบสั่งซื้อได้หลายใบตามเจ้าของสินค้า — เอารายการเต็มจาก
    ตัวเอกสาร ส่วน linkedPoQuery (endpoint by-pr) คืนได้ใบเดียวจึงใช้เป็นตัวสำรอง
  */
  const linkedPos =
    data?.linkedPurchaseOrders?.length
      ? data.linkedPurchaseOrders
      : linkedPo
        ? [linkedPo]
        : [];
  const hasUnorderedItems = (data?.items ?? []).some(
    (item) => !item.orderedPurchaseOrder,
  );

  const grByPoQuery = useGoodsReceiptsByPoQuery(linkedPo?.id);
  const linkedGrs = grByPoQuery.data?.data ?? [];
  const paymentByPoQuery = usePurchasePaymentByPoQuery(linkedPo?.id);
  const linkedPayment = paymentByPoQuery.data?.data ?? null;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> {t("กำลังโหลดรายละเอียดใบขอซื้อ...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบขอซื้อ")}
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-requests">{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  const busy =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;

  const statusLabel = purchaseRequestStatusLabel(data.status, lang);

  const printPdf = async () => {
    const { generatePurchaseRequestPdf } = await import(
      "@/utils/generatePurchaseRequestPdf"
    );
    generatePurchaseRequestPdf({
      prNo: data.prNo,
      requestBy: data.requestedBy?.displayName ?? "—",
      department: data.department?.nameTh ?? "—",
      requestDate: formatDate(data.prDate),
      requiredDate: formatDate(data.items?.[0]?.requiredDate),
      purchaseType: data.purchaseRequestType?.nameTh ?? "—",
      items: (data.items ?? []).map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.itemNameTh ?? item.description ?? "—",
        unit: item.unitNameTh ?? item.unitCode ?? "—",
        qty: Number(item.quantity),
      })),
    });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Purchase Request"
        icon={<FileTextOutlined />}
        title={data.prNo}
        subtitle={<>{data.purchaseRequestType?.nameTh ?? t("ใบขอซื้อ")} ·{" "}
            {formatDate(data.prDate)} ·{" "}
            {t("{n} รายการ", { n: data.items?.length ?? 0 })}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/purchase-requests")}
          >
            {t("กลับ")}
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            {t("พิมพ์ PDF")}
          </Button>
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลเอกสาร")}</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.prNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่ขอซื้อ")}</span>
                <div className={styles.metaValue}>{formatDate(data.prDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้ขอซื้อ")}</span>
                <div className={styles.metaValue}>
                  {data.requestedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ประเภท")}</span>
                <div className={styles.metaValue}>
                  {data.purchaseRequestType
                    ? `${data.purchaseRequestType.code} — ${data.purchaseRequestType.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ส่วนงาน")}</span>
                <div className={styles.metaValue}>
                  {data.department
                    ? `${data.department.code} — ${data.department.nameTh}`
                    : t("ไม่ระบุ")}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("อัปเดตล่าสุด")}</span>
                <div className={styles.metaValue}>
                  {dayjs(data.updatedAt).format("DD/MM/YYYY HH:mm")}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("วัตถุประสงค์")}</h2>
            </div>
            <p className={styles.textBlock}>
              {data.objective?.trim() || t("ไม่ระบุ")}
            </p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการสินค้า")}</h2>
              <p className={styles.sectionHint}>
                {t("{n} รายการ", { n: data.items?.length ?? 0 })}
              </p>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>
                      {item.itemNameTh ?? item.description ?? "—"}
                    </p>
                    <p className={styles.itemCode}>
                      {item.itemCode ?? "—"}
                      {item.description ? ` · ${item.description}` : ""}
                    </p>
                    <div className={styles.itemMeta}>
                      <span>
                        {t("ต้องการภายใน {date}", {
                          date: formatDate(item.requiredDate),
                        })}
                      </span>
                      {item.remark ? <span>
                          {t("หมายเหตุ")}: {item.remark}
                        </span> : null}
                      {/* ใบเดียวแตกเป็นหลายใบสั่งซื้อได้ จึงบอกเป็นรายบรรทัด */}
                      {item.orderedPurchaseOrder ? (
                        <span>
                          {t("สั่งซื้อแล้วใน")}{" "}
                          <Link
                            href={`/purchase-orders/${item.orderedPurchaseOrder.id}`}
                          >
                            {item.orderedPurchaseOrder.poNo}
                          </Link>
                        </span>
                      ) : (
                        <span>{t("ยังไม่ได้สั่งซื้อ")}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>{formatQty(item.quantity, lang)}</strong>
                    <span>{item.unitNameTh ?? item.unitCode ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {documentHtmlIsEmpty(data.remark) ? null : (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("หมายเหตุ")}</h2>
              </div>
              <DocumentHtmlView html={data.remark} />
            </div>
          )}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.prNo}</h2>
          </div>

          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {statusLabel}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("ผู้ขอ")}</span>
              <strong>{data.requestedBy?.displayName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("วันที่")}</span>
              <strong>{formatDate(data.prDate)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("รายการ")}</span>
              <strong>{t("{n} รายการ", { n: data.items?.length ?? 0 })}</strong>
            </div>
          </div>

          {/* สิ่งที่ผู้อนุมัติสั่งให้แก้ — ต้องเห็นชัดก่อนกดแก้ไข
              (เหตุผลที่ปฏิเสธยังอยู่ในหมายเหตุเหมือนเดิม) */}
          {data.rejectedReason ? (
            <div className={styles.flowNote}>
              <strong>{t("ผู้อนุมัติส่งกลับให้แก้ไข")}</strong>
              <p style={{ margin: "6px 0 0" }}>{data.rejectedReason}</p>
            </div>
          ) : null}

          <div className={styles.actionStack}>
            {PR_EDITABLE_STATUSES.includes(data.status) ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() => submitMutation.mutate(data.id)}
                >
                  {t("ส่งอนุมัติ")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/purchase-requests/${data.id}/edit`)
                  }
                >
                  {t("แก้ไข")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: t("ยืนยันยกเลิกใบขอซื้อ?"),
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ยกเลิกเอกสาร")}
                </Button>
              </>
            ) : null}

            {data.status === "PENDING_APPROVAL" ? (
              <>
                {canApprove ? (
                  <>
                    <Button
                      className={styles.primaryBtn}
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={busy}
                      onClick={() => approveMutation.mutate(data.id)}
                    >
                      {t("อนุมัติ")}
                    </Button>
                    <Button
                      className={styles.secondaryBtn}
                      icon={<RollbackOutlined />}
                      loading={busy}
                      onClick={() => {
                        setReviewAction("return");
                        setRejectReason("");
                        setRejectOpen(true);
                      }}
                    >
                      {t("ส่งกลับแก้ไข")}
                    </Button>
                    <Button
                      className={styles.secondaryBtn}
                      danger
                      icon={<CloseOutlined />}
                      loading={busy}
                      onClick={() => {
                        setReviewAction("reject");
                        setRejectReason("");
                        setRejectOpen(true);
                      }}
                    >
                      {t("ไม่อนุมัติ")}
                    </Button>
                  </>
                ) : null}
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: t("ยืนยันยกเลิกใบขอซื้อ?"),
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ยกเลิกเอกสาร")}
                </Button>
              </>
            ) : null}

            {data.status === "APPROVED" ? (
              linkedPos.length && canReadPo ? (
                <>
                  {linkedPos.map((po) => (
                    <Button
                      key={po.id}
                      className={styles.primaryBtn}
                      type="primary"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    >
                      {t("ดูใบสั่งซื้อ")} ({po.poNo})
                    </Button>
                  ))}
                  {hasUnorderedItems ? (
                    <Button
                      className={styles.secondaryBtn}
                      icon={<ShoppingCartOutlined />}
                      onClick={() => router.push("/purchase-orders")}
                    >
                      {t("สั่งซื้อรายการที่เหลือ")}
                    </Button>
                  ) : null}
                </>
              ) : !linkedPos.length && !linkedPoQuery.isLoading ? (
                <Button
                  className={styles.secondaryBtn}
                  icon={<ShoppingCartOutlined />}
                  onClick={() => router.push("/purchase-orders")}
                >
                  {t("ไปที่ใบสั่งซื้อ")}
                </Button>
              ) : null
            ) : null}

            <Button
              className={styles.secondaryBtn}
              icon={<FilePdfOutlined />}
              onClick={printPdf}
            >
              {t("พิมพ์ PDF")}
            </Button>
          </div>

          <ProcurementFlowTimeline
            input={{
              pr: {
                id: data.id,
                prNo: data.prNo,
                status: data.status,
              },
              po: linkedPo
                ? {
                    id: linkedPo.id,
                    poNo: linkedPo.poNo,
                    status: linkedPo.status,
                    paymentStatus: linkedPo.paymentStatus,
                  }
                : null,
              goodsReceipts: linkedGrs.map((gr) => ({
                id: gr.id,
                grNo: gr.grNo,
                status: gr.status,
              })),
              payment: linkedPayment
                ? {
                    id: linkedPayment.id,
                    voucherNo: linkedPayment.voucherNo,
                    status: linkedPayment.status,
                  }
                : null,
            }}
          />
        </aside>
      </div>

      <Modal
        title={
          reviewAction === "reject"
            ? t("ไม่อนุมัติใบขอซื้อ")
            : t("ส่งกลับให้ผู้ขอแก้ไข")
        }
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={async () => {
          const body = { reason: rejectReason.trim() || undefined };
          if (reviewAction === "reject") {
            await rejectMutation.mutateAsync({ id: data.id, body });
          } else {
            await returnMutation.mutateAsync({ id: data.id, body });
          }
          setRejectOpen(false);
          setRejectReason("");
        }}
        confirmLoading={rejectMutation.isPending || returnMutation.isPending}
        okText={
          reviewAction === "reject" ? t("ไม่อนุมัติ") : t("ส่งกลับแก้ไข")
        }
        cancelText={t("ยกเลิก")}
        okButtonProps={{ danger: reviewAction === "reject" }}
      >
        <Input.TextArea
          rows={3}
          placeholder={
            reviewAction === "reject"
              ? t("เหตุผลที่ไม่อนุมัติ (ถ้ามี)")
              : t("สิ่งที่ต้องแก้ไข (ถ้ามี)")
          }
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
