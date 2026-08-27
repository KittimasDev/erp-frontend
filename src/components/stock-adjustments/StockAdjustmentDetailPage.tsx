"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Input, Spin, Upload } from "antd";
import type { UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  PaperClipOutlined,
  SendOutlined,
  SwapOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useApproveStockAdjustmentMutation,
  useCancelStockAdjustmentMutation,
  useRejectStockAdjustmentMutation,
  useSubmitStockAdjustmentMutation,
  useUploadStockAdjustmentAttachmentMutation,
} from "@/hooks/stock-adjustments/useStockAdjustmentMutations";
import {
  useStockAdjustmentAttachmentsQuery,
  useStockAdjustmentQuery,
} from "@/hooks/stock-adjustments/useStockAdjustmentsQuery";
import {
  STOCK_ADJUSTMENT_STATUS_LABEL,
  STOCK_ADJUSTMENT_TYPE_LABEL,
} from "@/types/stock-adjustments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./StockAdjustmentDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function statusClass(status: string) {
  switch (status) {
    case "POSTED":
      return styles.statusApproved;
    case "CANCELLED":
    case "REJECTED":
      return styles.statusCancelled;
    case "PENDING_APPROVAL":
      return styles.statusDraft;
    default:
      return styles.statusDraft;
  }
}

function formatAdjustQty(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n > 0) return `+${n.toLocaleString("th-TH")}`;
  return n.toLocaleString("th-TH");
}

export default function StockAdjustmentDetailPage({ id }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const rejectReasonRef = useRef("");

  const query = useStockAdjustmentQuery(id);
  const attachmentsQuery = useStockAdjustmentAttachmentsQuery(id);
  const submitMutation = useSubmitStockAdjustmentMutation();
  const cancelMutation = useCancelStockAdjustmentMutation();
  const approveMutation = useApproveStockAdjustmentMutation();
  const rejectMutation = useRejectStockAdjustmentMutation();
  const uploadMutation = useUploadStockAdjustmentAttachmentMutation();

  const data = query.data?.data;
  const attachments = attachmentsQuery.data?.data ?? [];

  /** ส่งเอกสาร = สิทธิ์แก้ไข · อนุมัติ = สิทธิ์อนุมัติ ตาม Permission Matrix ของหน้านี้ */
  const screenActions = useScreenActionPermissions("STOCK_ADJUSTMENTS");
  const canRequest = screenActions.canEdit;
  const canApprove = screenActions.canApprove;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบปรับปรุงสต๊อก
        <div style={{ marginTop: 12 }}>
          <Link href="/inventory/stock-adjustments">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const busy =
    submitMutation.isPending ||
    cancelMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    uploadMutation.isPending;

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: (file) => {
      void uploadMutation.mutateAsync({ documentId: data.id, file });
      return false;
    },
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <SwapOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Stock Adjustment</p>
          <h1 className={styles.pageTitle}>{data.adjustmentNo}</h1>
          <p className={styles.pageSubtitle}>
            {formatDate(data.adjustmentDate)} · {data.items?.length ?? 0}{" "}
            รายการ ·{" "}
            {STOCK_ADJUSTMENT_TYPE_LABEL[data.adjustmentType] ??
              data.adjustmentType}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/inventory/stock-adjustments")}
          >
            กลับ
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
                <div className={styles.metaValue}>{data.adjustmentNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่</span>
                <div className={styles.metaValue}>
                  {formatDate(data.adjustmentDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ประเภท</span>
                <div className={styles.metaValue}>
                  {STOCK_ADJUSTMENT_TYPE_LABEL[data.adjustmentType] ??
                    data.adjustmentType}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้ขอ</span>
                <div className={styles.metaValue}>
                  {data.requestedByName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้อนุมัติ</span>
                <div className={styles.metaValue}>
                  {data.approvedByName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ปรับปรุงสต๊อกเมื่อ</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/YYYY HH:mm")
                    : "ยังไม่อนุมัติ"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการปรับปรุง</h2>
            </div>
            <div className={styles.itemList}>
              {(data.items ?? []).map((item, index) => {
                const adjust = Number(item.adjustQuantity);
                const adjustTone =
                  Math.abs(adjust) < 1e-9
                    ? styles.varianceZero
                    : adjust > 0
                      ? styles.variancePositive
                      : styles.varianceNegative;

                return (
                  <div key={item.id} className={styles.itemCard}>
                    <div className={styles.itemIndex}>{index + 1}</div>
                    <div className={styles.itemBody}>
                      <p className={styles.itemName}>
                        {item.itemNameTh ?? "—"}
                      </p>
                      <p className={styles.itemCode}>
                        {item.itemCode ?? "—"}
                        {item.lotNo ? ` · Lot ${item.lotNo}` : ""}
                        {item.warehouseCode
                          ? ` · ${item.warehouseCode}/${item.locationCode ?? "—"}`
                          : ""}
                      </p>
                      <div className={styles.qtyLine}>
                        <span className={styles.qtyTag}>
                          ก่อน {item.quantityBefore}
                        </span>
                        <span>·</span>
                        <span>
                          ปรับ{" "}
                          <strong className={adjustTone}>
                            {formatAdjustQty(item.adjustQuantity)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>หลัง {item.quantityAfter}</span>
                      </div>
                      {item.remark ? (
                        <p className={styles.itemCode}>{item.remark}</p>
                      ) : null}
                    </div>
                    <div className={styles.itemQty}>
                      <strong className={adjustTone}>
                        {formatAdjustQty(item.adjustQuantity)}{" "}
                        {item.unitCode ?? ""}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {data.reason ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>เหตุผล</h2>
              </div>
              <p className={styles.textBlock}>{data.reason}</p>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                <PaperClipOutlined /> ไฟล์แนบ
              </h2>
            </div>
            {attachments.length === 0 ? (
              <p className={styles.textBlock}>ยังไม่มีไฟล์แนบ</p>
            ) : (
              <ul className={styles.textBlock}>
                {attachments.map((file) => (
                  <li key={file.id}>
                    {file.originalFileName || file.fileName}
                    {file.description ? ` — ${file.description}` : ""}
                  </li>
                ))}
              </ul>
            )}
            {canRequest && data.status === "DRAFT" ? (
              <Upload {...uploadProps}>
                <Button
                  icon={<UploadOutlined />}
                  loading={uploadMutation.isPending}
                  style={{ marginTop: 8 }}
                >
                  อัปโหลดไฟล์
                </Button>
              </Upload>
            ) : null}
          </div>
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.adjustmentNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {STOCK_ADJUSTMENT_STATUS_LABEL[data.status] ?? data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>รายการ</span>
              <strong>{data.items?.length ?? 0}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ไฟล์แนบ</span>
              <strong>{attachments.length}</strong>
            </div>
          </div>

          {data.status === "DRAFT" || data.status === "PENDING_APPROVAL" ? (
            <p className={styles.sideNote}>
              ยังไม่ปรับสต๊อกจริง จนกว่าจะอนุมัติ — ตอนอนุมัติระบบอ่านยอดจากฐานข้อมูลอีกครั้ง
            </p>
          ) : null}

          <div className={styles.actionStack}>
            {canRequest && data.status === "DRAFT" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<SendOutlined />}
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "ส่งอนุมัติใบปรับปรุงสต๊อก?",
                      content:
                        "หลังส่งแล้วจะแก้ไขไม่ได้ จนกว่าจะถูกปฏิเสธหรืออนุมัติ",
                      onOk: () => submitMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ส่งอนุมัติ
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/inventory/stock-adjustments/${data.id}/edit`)
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
                      title: "ยืนยันยกเลิกใบปรับปรุงสต๊อก?",
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  ยกเลิกเอกสาร
                </Button>
              </>
            ) : null}

            {canApprove && data.status === "PENDING_APPROVAL" ? (
              <>
                <Button
                  className={styles.primaryBtn}
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={busy}
                  onClick={() =>
                    modal.confirm({
                      title: "อนุมัติและปรับปรุงสต๊อก?",
                      content:
                        "ยืนยันแล้วระบบจะปรับยอดสต๊อกตามจำนวนที่ระบุ (คำนวณจากยอดปัจจุบันจริง) และแก้เอกสารไม่ได้",
                      onOk: () => approveMutation.mutateAsync(data.id),
                    })
                  }
                >
                  อนุมัติและปรับปรุงสต๊อก
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  icon={<CloseOutlined />}
                  loading={busy}
                  onClick={() => {
                    rejectReasonRef.current = "";
                    modal.confirm({
                      title: "ไม่อนุมัติใบปรับปรุงสต๊อก?",
                      content: (
                        <Input.TextArea
                          rows={3}
                          placeholder="เหตุผล (ถ้ามี)"
                          onChange={(e) => {
                            rejectReasonRef.current = e.target.value;
                          }}
                        />
                      ),
                      onOk: () =>
                        rejectMutation.mutateAsync({
                          id: data.id,
                          body: {
                            rejectReason:
                              rejectReasonRef.current.trim() || undefined,
                          },
                        }),
                    });
                  }}
                >
                  ไม่อนุมัติ
                </Button>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
