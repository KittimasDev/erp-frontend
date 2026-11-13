"use client";
import { Tag } from "antd";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

import { useT } from "@/lib/i18n/useT";

import {
  readWarehouseGroup,
  withWarehouseGroup,
} from "@/components/inventory/warehouse-group-scope";
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
  stockAdjustmentTypeDisplayName,
  tStockLabel, STOCK_ADJUSTMENT_STATUS_COLOR } from "@/types/stock-adjustments";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import styles from "./StockAdjustmentDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}


function formatAdjustQty(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n > 0) return `+${n.toLocaleString("th-TH")}`;
  return n.toLocaleString("th-TH");
}

export default function StockAdjustmentDetailPage({ id }: Props) {
  const t = useT();
  const router = useRouter();
  const warehouseGroup = readWarehouseGroup(useSearchParams());
  const scopePath = (path: string) => withWarehouseGroup(path, warehouseGroup);
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
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบใบปรับปรุงสต๊อก")}
        <div style={{ marginTop: 12 }}>
          <Link href={scopePath("/inventory/stock-adjustments")}>{t("กลับรายการ")}</Link>
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
      <PageHeader
        eyebrow="Stock Adjustment"
        icon={<SwapOutlined />}
        title={data.adjustmentNo}
        subtitle={<>{formatDate(data.adjustmentDate)} · {data.items?.length ?? 0}{" "}
            {t("รายการ")} · {stockAdjustmentTypeDisplayName(data)}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(scopePath("/inventory/stock-adjustments"))}
          >
            {t("กลับ")}
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
                <div className={styles.metaValue}>{data.adjustmentNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.adjustmentDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ประเภท")}</span>
                <div className={styles.metaValue}>
                  {stockAdjustmentTypeDisplayName(data)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้ขอ")}</span>
                <div className={styles.metaValue}>
                  {data.requestedByName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผู้อนุมัติ")}</span>
                <div className={styles.metaValue}>
                  {data.approvedByName ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ปรับปรุงสต๊อกเมื่อ")}</span>
                <div className={styles.metaValue}>
                  {data.postedAt
                    ? dayjs(data.postedAt).format("DD/MM/BBBB HH:mm")
                    : t("ยังไม่อนุมัติ")}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("รายการปรับปรุง")}</h2>
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
                          {t("ก่อน")} {item.quantityBefore}
                        </span>
                        <span>·</span>
                        <span>
                          {t("ปรับ")}{" "}
                          <strong className={adjustTone}>
                            {formatAdjustQty(item.adjustQuantity)}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>{t("หลัง")} {item.quantityAfter}</span>
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
                <h2 className={styles.sectionTitle}>{t("เหตุผล")}</h2>
              </div>
              <p className={styles.textBlock}>{data.reason}</p>
            </div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>
                <PaperClipOutlined /> {t("ไฟล์แนบ")}
              </h2>
            </div>
            {attachments.length === 0 ? (
              <p className={styles.textBlock}>{t("ยังไม่มีไฟล์แนบ")}</p>
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
                  {t("อัปโหลดไฟล์")}
                </Button>
              </Upload>
            ) : null}
          </div>
          <ESignatureHistoryCard documentId={data.id} style={{ marginTop: 16 }} />
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>{t("สถานะเอกสาร")}</p>
            <h2 className={styles.sideTitle}>{data.adjustmentNo}</h2>
          </div>
          <div>
            <Tag color={STOCK_ADJUSTMENT_STATUS_COLOR[data.status] ?? "default"}>
            {STOCK_ADJUSTMENT_STATUS_LABEL[data.status]
              ? tStockLabel(STOCK_ADJUSTMENT_STATUS_LABEL[data.status])
              : data.status}
          </Tag>
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("รายการ")}</span>
              <strong>{data.items?.length ?? 0}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ไฟล์แนบ")}</span>
              <strong>{attachments.length}</strong>
            </div>
          </div>

          {data.status === "DRAFT" || data.status === "PENDING_APPROVAL" ? (
            <p className={styles.sideNote}>
              {t("ยังไม่ปรับสต๊อกจริง จนกว่าจะอนุมัติ — ตอนอนุมัติระบบอ่านยอดจากฐานข้อมูลอีกครั้ง")}
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
                      title: t("ส่งอนุมัติใบปรับปรุงสต๊อก?"),
                      content: t(
                        "หลังส่งแล้วจะแก้ไขไม่ได้ จนกว่าจะถูกปฏิเสธหรืออนุมัติ",
                      ),
                      onOk: () => submitMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ส่งอนุมัติ")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(
                      scopePath(`/inventory/stock-adjustments/${data.id}/edit`),
                    )
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
                      title: t("ยืนยันยกเลิกใบปรับปรุงสต๊อก?"),
                      onOk: () => cancelMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("ยกเลิกเอกสาร")}
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
                      title: t("อนุมัติและปรับปรุงสต๊อก?"),
                      content: t(
                        "ยืนยันแล้วระบบจะปรับยอดสต๊อกตามจำนวนที่ระบุ (คำนวณจากยอดปัจจุบันจริง) และแก้เอกสารไม่ได้",
                      ),
                      onOk: () => approveMutation.mutateAsync(data.id),
                    })
                  }
                >
                  {t("อนุมัติและปรับปรุงสต๊อก")}
                </Button>
                <Button
                  className={styles.secondaryBtn}
                  danger
                  icon={<CloseOutlined />}
                  loading={busy}
                  onClick={() => {
                    rejectReasonRef.current = "";
                    modal.confirm({
                      title: t("ไม่อนุมัติใบปรับปรุงสต๊อก?"),
                      content: (
                        <Input.TextArea
                          rows={3}
                          placeholder={t("เหตุผล (ถ้ามี)")}
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
                  {t("ไม่อนุมัติ")}
                </Button>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
