"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, Popconfirm, Typography } from "antd";
import {
  ArrowLeftOutlined,
  AuditOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useApproveProductionOutputStockRequestMutation,
  useRejectProductionOutputStockRequestMutation,
} from "@/hooks/production-output/useProductionOutputMutations";
import {
  useProductionOutputApprovalQuery,
  useProductionOutputStockRequestQuery,
} from "@/hooks/production-output/useProductionOutputQueries";
import {
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { userHasRole } from "@/lib/auth/session";
import {
  PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL,
  ProductionOutputRequestStatus,
} from "@/types/production-output-stock-request";
import styles from "./ProductionOutputApprovalDetailPage.module.css";

type Props = {
  requestId: string;
  backHref?: string;
  backLabel?: string;
  /**
   * ซ่อนปุ่มอนุมัติ/ไม่อนุมัติ — ใช้ตอนเปิดจากฝั่งการผลิต (ขอรับผลผลิตเข้าคลัง)
   * ให้เห็นสถานะคำขอของตัวเองได้ แต่การอนุมัติทำที่เมนูคลัง FG ที่เดียว
   * (สิทธิ์จริงบังคับที่ backend อยู่แล้ว อันนี้คือความชัดเจนของ flow)
   */
  readOnly?: boolean;
};

function formatQty(value?: string) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return dayjs(value).format("DD/MM/YYYY");
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

export default function ProductionOutputApprovalDetailPage({
  requestId,
  backHref = "/warehouse/production-output-approvals",
  backLabel = "กลับรายการอนุมัติ",
  readOnly = false,
}: Props) {
  const router = useRouter();
  /** มีสิทธิ์อนุมัติจริงไหม — ใช้ตัดสินว่าจะโชว์ทางลัดไปหน้าอนุมัติด้วย */
  const hasApproveRight =
    hasPermission("PRODUCTION_OUTPUT_APPROVALS.APPROVE") ||
    (!isMatrixPermissionMode() &&
      (userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
        userHasRole(RoleCode.ADMINISTRATOR)));
  /** ปุ่มอนุมัติจริงมีเฉพาะหน้าฝั่งคลัง FG — ฝั่งผลิตดูอย่างเดียว */
  const canApprove = !readOnly && hasApproveRight;
  const canViewProductionOrders = useScreenActionPermissions(
    "PRODUCTION_ORDERS",
  ).canView;
  const canViewStockMovements =
    useScreenActionPermissions("STOCK_MOVEMENTS").canView;
  const canViewFgStockMovements = useScreenActionPermissions(
    "FG_STOCK_MOVEMENTS",
  ).canView;
  const stockMovementsHref = canViewStockMovements
    ? "/inventory/stock-movements"
    : canViewFgStockMovements
      ? "/inventory/stock-movements?itemCategoryCode=FINISHED_GOODS"
      : null;
  /** ฝั่งผลิตใช้ GET stock-requests (ไม่ต้องมีสิทธิ์อนุมัติคลัง) */
  const stockRequestQuery = useProductionOutputStockRequestQuery(
    readOnly ? requestId : undefined,
  );
  const approvalQuery = useProductionOutputApprovalQuery(
    readOnly ? undefined : requestId,
  );
  const detailQuery = readOnly ? stockRequestQuery : approvalQuery;
  const approveMutation = useApproveProductionOutputStockRequestMutation();
  const rejectMutation = useRejectProductionOutputStockRequestMutation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const request = detailQuery.data?.data;
  const isPending =
    request?.status === ProductionOutputRequestStatus.PENDING_APPROVAL;
  const isApproved =
    request?.status === ProductionOutputRequestStatus.APPROVED;
  const isRejected =
    request?.status === ProductionOutputRequestStatus.REJECTED;

  const refs =
    request?.references && request.references.length > 0
      ? request.references
      : request?.referenceDocNo
        ? [
            {
              id: "primary",
              referenceDocType: request.referenceDocType ?? "",
              referenceDocId: request.referenceDocId ?? "",
              referenceDocNo: request.referenceDocNo,
            },
          ]
        : [];

  const handleApprove = () => {
    approveMutation.mutate(requestId, {
      onSuccess: () => {
        void detailQuery.refetch();
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      return;
    }
    rejectMutation.mutate(
      { id: requestId, body: { rejectReason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason("");
          void detailQuery.refetch();
        },
      },
    );
  };

  const statusBannerClass = [
    styles.statusBanner,
    isPending ? styles.statusBannerPending : "",
    isApproved ? styles.statusBannerApproved : "",
    isRejected ? styles.statusBannerRejected : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MasterPageGate isLoading={detailQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.eyebrow}>WAREHOUSE · APPROVAL</div>
            <div className={styles.titleRow}>
              <Typography.Title level={2} className={styles.title}>
                รายละเอียดคำขอรับผลผลิต
              </Typography.Title>
              {request?.requestNo ? (
                <span className={styles.requestNo}>{request.requestNo}</span>
              ) : null}
            </div>
            <span className={styles.subtitle}>
              ตรวจรายการ เอกสารอ้างอิง และอนุมัติเพื่อ POST สต๊อก
            </span>
          </div>
          <div className={styles.headerActions}>
            <Button
              icon={<ArrowLeftOutlined />}
              className={styles.backButton}
              onClick={() => router.push(backHref)}
            >
              {backLabel}
            </Button>
          </div>
        </div>

        {request ? (
          <>
            <div className={styles.summaryGrid}>
              <div
                className={`${styles.summaryCard} ${styles.summaryCardAccent}`}
              >
                <span>จำนวนรับเข้า</span>
                <strong>
                  {formatQty(request.quantity)}
                  <span className={styles.summaryUnit}>
                    {request.unitCode || request.unitNameTh || ""}
                  </span>
                </strong>
              </div>
              <div className={styles.summaryCard}>
                <span>เอกสารอ้างอิง</span>
                <strong>{refs.length} ตั๋ว</strong>
              </div>
              <div className={styles.summaryCard}>
                <span>วันที่รับเข้า</span>
                <strong className={styles.summaryCompact}>
                  {formatDate(request.postingDate)}
                </strong>
              </div>
              <div className={styles.summaryCard}>
                <span>สถานะ</span>
                <strong className={styles.summaryCompact}>
                  {PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[request.status] ??
                    request.status}
                </strong>
              </div>
            </div>

            <div className={styles.layout}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>รายละเอียดรับเข้า</h3>
                  <p>สินค้า / คลัง / Lot ที่จะ POST เมื่ออนุมัติ</p>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.fieldGrid}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>สินค้า</span>
                      <span className={styles.fieldValue}>
                        {request.itemCode
                          ? `${request.itemCode} — ${request.itemNameTh ?? ""}`
                          : request.itemId}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>จำนวน</span>
                      <span className={styles.fieldValue}>
                        {formatQty(request.quantity)}{" "}
                        {request.unitCode || request.unitNameTh || ""}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>คลัง</span>
                      <span className={styles.fieldValue}>
                        {request.warehouseCode
                          ? `${request.warehouseCode} — ${request.warehouseName ?? ""}`
                          : "-"}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>ตำแหน่ง</span>
                      <span className={styles.fieldValue}>
                        {request.locationCode
                          ? `${request.locationCode} — ${request.locationName ?? ""}`
                          : "-"}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Lot</span>
                      <span className={styles.fieldValue}>
                        {request.lotNo || "สร้างตอนอนุมัติ"}
                      </span>
                    </div>
                    {request.productionOrderId ? (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>ใบสั่งผลิตต้นทาง</span>
                        <span className={styles.fieldValue}>
                          {canViewProductionOrders ? (
                            <button
                              type="button"
                              style={{
                                border: "none",
                                background: "transparent",
                                padding: 0,
                                cursor: "pointer",
                                color: "inherit",
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                router.push(
                                  `/production/production-orders/${request.productionOrderId}`,
                                )
                              }
                            >
                              {request.productionOrderNo ??
                                request.productionOrderId}
                            </button>
                          ) : (
                            (request.productionOrderNo ??
                              request.productionOrderId)
                          )}
                        </span>
                      </div>
                    ) : null}
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>ผู้ขอ</span>
                      <span className={styles.fieldValue}>
                        {request.requestedByName ?? request.requestedById}
                      </span>
                    </div>
                    <div className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>หมายเหตุ</span>
                      <span className={styles.fieldValue}>
                        {request.remark || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardHeader}>
                  <h3>เอกสารอ้างอิง (ตั๋วชั่ง)</h3>
                  <p>
                    ตั๋วที่รวบในคำขอนี้ — จำนวนด้านบนเป็นยอดรวมของทั้งชุด
                  </p>
                </div>
                <div className={styles.cardBody}>
                  {refs.length > 0 ? (
                    <>
                      <div className={styles.ticketList}>
                        {refs.map((ref) => (
                          <span
                            key={ref.id || ref.referenceDocId}
                            className={styles.ticketChip}
                          >
                            {ref.referenceDocNo || ref.referenceDocId}
                          </span>
                        ))}
                      </div>
                      <div className={styles.ticketMeta}>
                        รวม {refs.length} ตั๋ว
                      </div>
                    </>
                  ) : (
                    <span className={styles.fieldValue}>-</span>
                  )}
                </div>
              </div>

              <aside className={styles.sideCard}>
                <div className={statusBannerClass}>
                  <span>สถานะคำขอ</span>
                  <strong>
                    {PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[request.status] ??
                      request.status}
                  </strong>
                </div>

                {isPending && canApprove ? (
                  <div className={styles.actionCard}>
                    <p className={styles.actionHint}>
                      อนุมัติแล้วระบบจะสร้าง Lot / balances / movement RECEIVE
                      และเพิ่มยอดคงเหลือทันที
                    </p>
                    <div className={styles.actionButtons}>
                      <Popconfirm
                        title="อนุมัติรับผลผลิตเข้าคลัง"
                        description="ยืนยัน POST สต๊อกสำหรับคำขอนี้"
                        okText="อนุมัติ"
                        cancelText="ยกเลิก"
                        onConfirm={handleApprove}
                      >
                        <Button
                          type="primary"
                          icon={<CheckOutlined />}
                          className={styles.approveButton}
                          loading={approveMutation.isPending}
                          block
                        >
                          อนุมัติเข้าคลัง
                        </Button>
                      </Popconfirm>
                      <Button
                        danger
                        icon={<CloseOutlined />}
                        className={styles.rejectButton}
                        onClick={() => setRejectOpen(true)}
                        block
                      >
                        ไม่อนุมัติ
                      </Button>
                    </div>
                  </div>
                ) : null}

                {readOnly && isPending ? (
                  <div className={styles.actionCard}>
                    <p className={styles.actionHint}>
                      คำขอนี้รอหัวหน้าคลังอนุมัติ — สต๊อกจะเพิ่มหลังอนุมัติ
                      เท่านั้น การอนุมัติทำที่เมนู คลัง FG →
                      อนุมัติรับผลผลิตเข้าคลัง
                    </p>
                    {hasApproveRight ? (
                      <div className={styles.actionButtons}>
                        <Button
                          icon={<AuditOutlined />}
                          block
                          onClick={() =>
                            router.push(
                              `/warehouse/production-output-approvals/${requestId}`,
                            )
                          }
                        >
                          ไปหน้าอนุมัติ
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!readOnly && !canApprove && isPending ? (
                  <div className={styles.actionCard}>
                    <p className={styles.actionHint}>
                      ดูรายละเอียดได้ — การอนุมัติ/ไม่อนุมัติต้องเปิดสิทธิ์{" "}
                      PRODUCTION_OUTPUT_APPROVALS · APPROVE ที่หน้าผู้ใช้งาน →
                      การอนุญาต
                    </p>
                  </div>
                ) : null}

                {isApproved ? (
                  <div className={styles.actionCard}>
                    <p className={styles.actionHint}>
                      อนุมัติแล้ว — ดูรายการเคลื่อนไหวสต๊อกที่เกิดจากคำขอนี้ได้
                    </p>
                    {stockMovementsHref ? (
                      <Button
                        block
                        onClick={() => router.push(stockMovementsHref)}
                      >
                        ดู Stock Movement
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {request.rejectReason ? (
                  <div className={styles.rejectBox}>
                    <strong>เหตุผลไม่อนุมัติ</strong>
                    <p>{request.rejectReason}</p>
                  </div>
                ) : null}

                <div className={styles.metaList}>
                  <div className={styles.metaRow}>
                    <span>ส่งคำขอ</span>
                    <strong>{formatDateTime(request.requestedAt)}</strong>
                  </div>
                  {request.approvedAt ? (
                    <div className={styles.metaRow}>
                      <span>อนุมัติ</span>
                      <strong>
                        {formatDateTime(request.approvedAt)}
                        {request.approvedByName
                          ? ` · ${request.approvedByName}`
                          : ""}
                      </strong>
                    </div>
                  ) : null}
                  {request.rejectedAt ? (
                    <div className={styles.metaRow}>
                      <span>ไม่อนุมัติ</span>
                      <strong>
                        {formatDateTime(request.rejectedAt)}
                        {request.rejectedByName
                          ? ` · ${request.rejectedByName}`
                          : ""}
                      </strong>
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>ไม่พบคำขอที่ต้องการ</div>
        )}

        <Modal
          title="ไม่อนุมัติคำขอ"
          open={rejectOpen}
          onCancel={() => setRejectOpen(false)}
          onOk={handleReject}
          okText="ยืนยัน"
          confirmLoading={rejectMutation.isPending}
          okButtonProps={{ disabled: !rejectReason.trim(), danger: true }}
        >
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="ระบุเหตุผล"
          />
        </Modal>
      </section>
    </MasterPageGate>
  );
}
