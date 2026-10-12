"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useReturnNoteQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import type { ReturnNoteStatus } from "@/types/return-notes";
import { RETURN_NOTE_STATUS_LABEL } from "@/types/return-notes";
import {
  ApproveReturnNoteModal,
  RejectReturnNoteModal,
} from "./ReturnNoteDecisionModals";
import styles from "./ReturnNoteDetailPage.module.css";

type Props = { id: string };

function formatDateTime(value?: string) {
  return value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";
}

function formatQty(value: string) {
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("th-TH");
}

function statusClass(status: string) {
  if (status === "APPROVED") return styles.statusApproved;
  if (status === "REJECTED") return styles.statusCancelled;
  return styles.statusDraft;
}

export default function ReturnNoteDetailPage({ id }: Props) {
  const router = useRouter();
  const query = useReturnNoteQuery(id);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const canApprove = useScreenActionPermissions("RETURN_NOTES").canApprove;
  const data = query.data?.data;

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
        ไม่พบใบคืนสินค้า
        <div style={{ marginTop: 12 }}>
          <Link href="/return-notes">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const pending = data.status === "PENDING_APPROVAL";

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <RollbackOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Return Note</p>
          <h1 className={styles.pageTitle}>{data.returnNoteNo}</h1>
          <p className={styles.pageSubtitle}>
            {formatDateTime(data.createdAt)} · {data.items.length} รายการ ·{" "}
            {data.customerName ?? "—"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/return-notes")}
          >
            กลับ
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            onClick={async () => {
              const { generateReturnNotePdf } = await import(
                "@/utils/generateReturnNotePdf"
              );
              const statusLabel =
                RETURN_NOTE_STATUS_LABEL[data.status as ReturnNoteStatus] ?? data.status;
              void generateReturnNotePdf({
                returnNoteNo: data.returnNoteNo,
                docDate: dayjs(data.createdAt).format("DD/MM/YYYY"),
                statusLabel,
                draftBanner:
                  data.status === "APPROVED"
                    ? undefined
                    : data.status === "REJECTED"
                      ? `ไม่อนุมัติ${data.rejectReason ? ` — ${data.rejectReason}` : ""}`
                      : "รอคลังอนุมัติ — ยังไม่ได้รับคืนเข้าสต๊อก",
                customerName: data.customerName ?? "—",
                salesOrderNo: data.salesOrderNo ?? "—",
                deliveryOrderNo: data.deliveryOrderNo ?? "—",
                pickingNo: data.pickingNo ?? "—",
                reason: data.reason || "—",
                warehouse: data.warehouseCode
                  ? `${data.warehouseCode}${data.locationCode ? ` / ${data.locationCode}` : ""}`
                  : "—",
                createdBy: data.createdByName ?? "—",
                approvedBy: data.approvedByName
                  ? `${data.approvedByName} · ${formatDateTime(data.approvedAt)}`
                  : "—",
                remark: data.remark?.trim() || "",
                items: data.items.map((item, index) => ({
                  no: index + 1,
                  itemCode: item.itemCode ?? "—",
                  itemName: item.itemNameTh ?? "—",
                  unit: item.unitCode ?? "—",
                  qty: Number(item.returnQty) || 0,
                  lotNo: item.lotNo,
                  /** ยึดเวลาตรวจ ไม่ใช่ว่าเลขว่าง — ก่อนตรวจอาจได้ "0.000" มาแทน null */
                  goodQty: item.inspectedAt ? Number(item.goodQty ?? 0) : undefined,
                  scrapQty: item.inspectedAt ? Number(item.scrapQty ?? 0) : undefined,
                })),
              });
            }}
          >
            พิมพ์ PDF
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>เอกสารอ้างอิง</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ใบสั่งขาย</span>
                <div className={styles.metaValue}>
                  <Link href={`/sales-orders/${data.salesOrderId}`}>
                    {data.salesOrderNo ?? "—"}
                  </Link>
                  {data.roundNo ? ` · รอบที่ ${data.roundNo}` : ""}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ใบจ่ายสินค้า</span>
                <div className={styles.metaValue}>
                  <Link href={`/pickings/${data.pickingId}`}>
                    {data.pickingNo ?? "—"}
                  </Link>
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ใบส่งสินค้า</span>
                <div className={styles.metaValue}>
                  {data.deliveryOrderId ? (
                    <Link href={`/delivery-orders/${data.deliveryOrderId}`}>
                      {data.deliveryOrderNo ?? "—"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ลูกค้า</span>
                <div className={styles.metaValue}>{data.customerName ?? "—"}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผู้สร้าง</span>
                <div className={styles.metaValue}>{data.createdByName ?? "—"}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่สร้าง</span>
                <div className={styles.metaValue}>
                  {formatDateTime(data.createdAt)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการคืน</h2>
            </div>
            <div className={styles.itemList}>
              {data.items.map((item, index) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className={styles.itemBody}>
                    <p className={styles.itemName}>{item.itemNameTh ?? "—"}</p>
                    <p className={styles.itemCode}>
                      {item.itemCode ?? "—"}
                      {item.lotNo ? ` · Lot ${item.lotNo}` : ""}
                    </p>
                  </div>
                  <div className={styles.itemQty}>
                    <strong>
                      {formatQty(item.returnQty)} {item.unitCode ?? ""}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>เหตุผลการคืน</h2>
            </div>
            <p className={styles.textBlock}>{data.reason}</p>
            {data.remark ? (
              <p className={styles.textBlock}>หมายเหตุ: {data.remark}</p>
            ) : null}
          </div>

          {data.status === "REJECTED" ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>เหตุผลที่ไม่อนุมัติ</h2>
              </div>
              <p className={styles.textBlock}>{data.rejectReason ?? "—"}</p>
            </div>
          ) : null}
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>สถานะเอกสาร</p>
            <h2 className={styles.sideTitle}>{data.returnNoteNo}</h2>
          </div>
          <div className={`${styles.statusPill} ${statusClass(data.status)}`}>
            {RETURN_NOTE_STATUS_LABEL[data.status as ReturnNoteStatus] ??
              data.status}
          </div>

          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>จำนวนคืนรวม</span>
              <strong>{formatQty(data.totalReturnQty)}</strong>
            </div>
            {data.status === "APPROVED" ? (
              <>
                <div className={styles.sideRow}>
                  <span>รับเข้าคลัง</span>
                  <strong>
                    {data.warehouseCode ?? "—"}
                    {data.locationCode ? ` / ${data.locationCode}` : ""}
                  </strong>
                </div>
                <div className={styles.sideRow}>
                  <span>ผู้อนุมัติ</span>
                  <strong>{data.approvedByName ?? "—"}</strong>
                </div>
                <div className={styles.sideRow}>
                  <span>อนุมัติเมื่อ</span>
                  <strong>{formatDateTime(data.approvedAt)}</strong>
                </div>
                <div className={styles.sideRow}>
                  <span>ผลการตรวจ</span>
                  <strong>
                    <Link href={`/return-notes/inspections/${data.id}`}>
                      {data.inspectionStatus === "CONFIRMED"
                        ? "ตรวจสอบแล้ว"
                        : "รอตรวจสอบ"}
                    </Link>
                  </strong>
                </div>
              </>
            ) : null}
            {data.status === "REJECTED" ? (
              <>
                <div className={styles.sideRow}>
                  <span>ผู้ไม่อนุมัติ</span>
                  <strong>{data.rejectedByName ?? "—"}</strong>
                </div>
                <div className={styles.sideRow}>
                  <span>เมื่อ</span>
                  <strong>{formatDateTime(data.rejectedAt)}</strong>
                </div>
              </>
            ) : null}
          </div>

          {pending ? (
            <p className={styles.sideNote}>
              ยังไม่รับของเข้าสต๊อก — คลังอนุมัติแล้วระบบจึงรับเข้าคลังตรวจสอบพร้อมบันทึกการเคลื่อนไหว
            </p>
          ) : null}

          {canApprove && pending ? (
            <div className={styles.actionStack}>
              <Button
                className={styles.primaryBtn}
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => setApproveOpen(true)}
              >
                อนุมัติ รับเข้าคลังตรวจสอบ
              </Button>
              <Button
                className={styles.secondaryBtn}
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectOpen(true)}
              >
                ไม่อนุมัติ
              </Button>
            </div>
          ) : null}
        </aside>
      </div>

      <ApproveReturnNoteModal
        note={approveOpen ? data : null}
        onClose={() => setApproveOpen(false)}
      />
      <RejectReturnNoteModal
        note={rejectOpen ? data : null}
        onClose={() => setRejectOpen(false)}
      />
    </div>
  );
}
