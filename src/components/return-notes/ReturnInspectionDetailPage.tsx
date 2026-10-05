"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Spin, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useInspectionDetailQuery } from "@/hooks/return-notes/useReturnNotesQuery";
import { useConfirmInspectionMutation } from "@/hooks/return-notes/useReturnNoteMutations";
import type { ReturnNoteItem, ReturnNoteStatus } from "@/types/return-notes";
import { RETURN_NOTE_STATUS_LABEL } from "@/types/return-notes";
import ReturnInspectionSortModal from "./ReturnInspectionSortModal";
import styles from "./ReturnNoteDetailPage.module.css";

type Props = { id: string };

function formatQty(value?: string) {
  if (value == null) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("th-TH");
}

export default function ReturnInspectionDetailPage({ id }: Props) {
  const query = useInspectionDetailQuery(id);
  const data = query.data?.data;
  const actions = useScreenActionPermissions("RETURN_INSPECTIONS");
  const confirm = useConfirmInspectionMutation(id);
  const [sorting, setSorting] = useState<ReturnNoteItem | null>(null);

  if (query.isLoading || !data) {
    return (
      <div className={styles.page}>
        <Spin />
      </div>
    );
  }

  const confirmed = data.inspectionStatus === "CONFIRMED";
  const allSorted = data.items.every(
    (item) => item.goodQty != null && item.scrapQty != null,
  );
  const canSort = actions.canEdit && !confirmed;
  const canConfirm = actions.canApprove && !confirmed && allSorted;

  const columns: ColumnsType<ReturnNoteItem> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_, row) => (
        <div>
          <div>{row.itemCode}</div>
          <div style={{ color: "#64748b" }}>{row.itemNameTh}</div>
        </div>
      ),
    },
    { title: "Lot", dataIndex: "lotNo", render: (value?: string) => value || "—" },
    {
      title: "จำนวนคืน",
      dataIndex: "returnQty",
      align: "right",
      render: (value: string) => formatQty(value),
    },
    {
      title: "ใช้งานได้",
      dataIndex: "goodQty",
      align: "right",
      render: (value?: string) => formatQty(value),
    },
    {
      title: "เสีย",
      dataIndex: "scrapQty",
      align: "right",
      render: (value?: string) => formatQty(value),
    },
    {
      title: "ปลายทาง",
      key: "dest",
      render: (_, row) => (
        <div style={{ lineHeight: 1.4 }}>
          {row.goodQty != null ? (
            <div>ดี: {row.goodWarehouseCode ?? "—"}</div>
          ) : null}
          {row.scrapQty != null ? (
            <div>เสีย: {row.scrapWarehouseCode ?? "—"}</div>
          ) : (
            "ยังไม่คัดแยก"
          )}
        </div>
      ),
    },
    {
      title: "",
      key: "action",
      width: 120,
      render: (_, row) =>
        canSort ? (
          <Button size="small" onClick={() => setSorting(row)}>
            คัดแยกสินค้า
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={styles.page}>
      <Link href="/return-notes/inspections">
        <ArrowLeftOutlined /> รอตรวจสอบ
      </Link>
      <div className={styles.layout}>
        <section>
          <h1 className={styles.pageTitle}>ตรวจสอบและคัดแยกสินค้า</h1>
          <p className={styles.pageSubtitle}>{data.returnNoteNo}</p>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.items}
            pagination={false}
          />
          <div style={{ marginTop: 12 }}>
            <div>เอกสารที่เกี่ยวข้อง</div>
            <div>
              <Link href={`/return-notes/${data.id}`}>{data.returnNoteNo}</Link>
              {data.salesOrderNo ? ` · SO ${data.salesOrderNo}` : ""}
              {data.pickingNo ? ` · ใบจ่าย ${data.pickingNo}` : ""}
              {data.deliveryOrderNo ? ` · ใบส่ง ${data.deliveryOrderNo}` : ""}
            </div>
          </div>
        </section>
        <aside className={styles.sideCard}>
          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>วันที่คืน</span>
              <strong>{dayjs(data.createdAt).format("DD/MM/YYYY")}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ลูกค้า</span>
              <strong>{data.customerName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>SO</span>
              <strong>{data.salesOrderNo ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ใบจ่ายสินค้า</span>
              <strong>{data.pickingNo ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ใบส่งสินค้า</span>
              <strong>{data.deliveryOrderNo ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>ผู้รับคืน</span>
              <strong>{data.approvedByName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>สถานะ</span>
              <strong>
                {confirmed
                  ? "ตรวจสอบแล้ว"
                  : (RETURN_NOTE_STATUS_LABEL[data.status as ReturnNoteStatus] ??
                    data.status)}
              </strong>
            </div>
          </div>
          {canConfirm ? (
            <Button
              type="primary"
              loading={confirm.isPending}
              onClick={() => confirm.mutate()}
              style={{ marginTop: 16 }}
            >
              ยืนยันผลการตรวจทั้งหมด
            </Button>
          ) : null}
          {confirmed ? (
            <p className={styles.sideNote}>
              ยืนยันแล้วโดย {data.inspectionConfirmedByName ?? "—"} ของดีเข้าคลังสำเร็จรูป
              และของเสียเข้าคลังของเสีย
            </p>
          ) : null}
        </aside>
      </div>
      <ReturnInspectionSortModal
        noteId={data.id}
        item={sorting}
        onClose={() => setSorting(null)}
      />
    </div>
  );
}
