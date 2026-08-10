"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Input, Modal, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
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
  useSubmitPurchaseRequestMutation,
} from "@/hooks/purchase-requests/usePurchaseRequestMutations";
import { usePurchaseRequestQuery } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";
import { usePurchaseOrderByPrQuery } from "@/hooks/purchase-orders/usePurchaseOrdersQuery";
import { useGoodsReceiptsByPoQuery } from "@/hooks/goods-receipts/useGoodsReceiptsQuery";
import { usePurchasePaymentByPoQuery } from "@/hooks/purchase-payments/usePurchasePaymentsQuery";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import {
  PURCHASE_REQUEST_STATUS_LABEL,
  type PurchaseRequestStatus,
} from "@/types/purchase-requests";
import ProcurementFlowTimeline from "@/components/procurement/ProcurementFlowTimeline";
import styles from "./PurchaseRequestDetailPage.module.css";

type Props = {
  id: string;
};

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatQty(value: string) {
  return Number(value).toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function statusClass(status: string) {
  switch (status) {
    case "APPROVED":
      return styles.statusApproved;
    case "PENDING_APPROVAL":
      return styles.statusPending;
    case "REJECTED":
      return styles.statusRejected;
    case "CANCELLED":
      return styles.statusCancelled;
    default:
      return styles.statusDraft;
  }
}

export default function PurchaseRequestDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = usePurchaseRequestQuery(id);
  const submitMutation = useSubmitPurchaseRequestMutation();
  const approveMutation = useApprovePurchaseRequestMutation();
  const rejectMutation = useRejectPurchaseRequestMutation();
  const cancelMutation = useCancelPurchaseRequestMutation();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);

  const data = query.data?.data;
  const canApprove =
    hasPermission("PURCHASE_REQUEST_APPROVALS.APPROVE") ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.PROCUREMENT_MANAGER) || isAdministrator()));
  const canWritePo =
    userHasRole(RoleCode.PROCUREMENT_OFFICER) ||
    userHasRole(RoleCode.PROCUREMENT_MANAGER) ||
    isAdministrator();
  const canReadPo =
    canWritePo ||
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.ACCOUNTING_OFFICER) ||
    userHasRole(RoleCode.EXECUTIVE);

  const linkedPoQuery = usePurchaseOrderByPrQuery(
    data?.status === "APPROVED" && canReadPo ? data.id : undefined,
  );
  const linkedPo = linkedPoQuery.data?.data ?? null;

  const grByPoQuery = useGoodsReceiptsByPoQuery(linkedPo?.id);
  const linkedGrs = grByPoQuery.data?.data ?? [];
  const paymentByPoQuery = usePurchasePaymentByPoQuery(linkedPo?.id);
  const linkedPayment = paymentByPoQuery.data?.data ?? null;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลดรายละเอียดใบขอซื้อ...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบขอซื้อ
        <div style={{ marginTop: 12 }}>
          <Link href="/purchase-requests">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;

  const statusLabel =
    PURCHASE_REQUEST_STATUS_LABEL[data.status as PurchaseRequestStatus] ??
    data.status;

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
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <FileTextOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Purchase Request</p>
          <h1 className={styles.pageTitle}>{data.prNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.purchaseRequestType?.nameTh ?? "ใบขอซื้อ"} ·{" "}
            {formatDate(data.prDate)} · {data.items?.length ?? 0} รายการ
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/purchase-requests")}
          >
            กลับ
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={printPdf}>
            พิมพ์ PDF
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.prNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่ขอซื้อ</span>
                <div className={styles.metaValue}>{formatDate(data.prDate)}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ขอซื้อ</span>
                <div className={styles.metaValue}>
                  {data.requestedBy?.displayName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ประเภท</span>
                <div className={styles.metaValue}>
                  {data.purchaseRequestType
                    ? `${data.purchaseRequestType.code} — ${data.purchaseRequestType.nameTh}`
                    : "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ส่วนงาน</span>
                <div className={styles.metaValue}>
                  {data.department
                    ? `${data.department.code} — ${data.department.nameTh}`
                    : "ไม่ระบุ"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>อัปเดตล่าสุด</span>
                <div className={styles.metaValue}>
                  {dayjs(data.updatedAt).format("DD/MM/YYYY HH:mm")}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>วัตถุประสงค์</h2>
            </div>
            <p className={styles.textBlock}>
              {data.objective?.trim() || "ไม่ระบุ"}
            </p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
              <p className={styles.sectionHint}>
                {data.items?.length ?? 0} รายการ
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
                        ต้องการภายใน {formatDate(item.requiredDate)}
                      </span>
                      {item.remark ? <span>หมายเหตุ: {item.remark}</span> : null}
                    </div>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>{formatQty(item.quantity)}</strong>
                    <span>{item.unitNameTh ?? item.unitCode ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.remark ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
              </div>
              <p className={styles.textBlock}>{data.remark}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.prNo}</h2>
          </div>

          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {statusLabel}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>ผู้ขอ</span>
              <strong>{data.requestedBy?.displayName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>วันที่</span>
              <strong>{formatDate(data.prDate)}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>รายการ</span>
              <strong>{data.items?.length ?? 0} รายการ</strong>
            </div>
          </div>

          <div className={styles.actionStack}>
            {data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() => submitMutation.mutate(data.id)}
                >
                  ส่งอนุมัติ
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/purchase-requests/${data.id}/edit`)
                  }
                >
                  แก้ไข
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "ยืนยันยกเลิกใบขอซื้อ?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
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
                      อนุมัติ
                    </Button>
                    <Button
                      className={styles.secondaryBtn}
                      danger
                      icon={<CloseOutlined />}
                      loading={busy}
                      onClick={() => setRejectOpen(true)}
                    >
                      ปฏิเสธ
                    </Button>
                  </>
                ) : null}
                <Button
                  className={styles.secondaryBtn}
                  danger
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "ยืนยันยกเลิกใบขอซื้อ?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
                </Button>
              </>
            ) : null}

            {data.status === "APPROVED" ? (
              linkedPo && canReadPo ? (
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<ShoppingCartOutlined />}
                  onClick={() =>
                    router.push(`/purchase-orders/${linkedPo.id}`)
                  }
                >
                  ดูใบสั่งซื้อ ({linkedPo.poNo})
                </Button>
              ) : !linkedPo && !linkedPoQuery.isLoading ? (
                <Button
                  className={styles.secondaryBtn}
                  icon={<ShoppingCartOutlined />}
                  onClick={() => router.push("/purchase-orders")}
                >
                  ไปที่ใบสั่งซื้อ
                </Button>
              ) : null
            ) : null}

            <Button
              className={styles.secondaryBtn}
              icon={<FilePdfOutlined />}
              onClick={printPdf}
            >
              พิมพ์ PDF
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
        title="ปฏิเสธใบขอซื้อ"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={async () => {
          await rejectMutation.mutateAsync({
            id: data.id,
            body: { reason: rejectReason.trim() || undefined },
          });
          setRejectOpen(false);
          setRejectReason("");
        }}
        confirmLoading={rejectMutation.isPending}
        okText="ปฏิเสธ"
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea
          rows={3}
          placeholder="เหตุผล (ถ้ามี)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
