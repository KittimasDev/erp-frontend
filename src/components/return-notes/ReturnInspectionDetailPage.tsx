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
import type { ReturnNoteItem } from "@/types/return-notes";
import { returnNoteStatusLabel } from "@/types/return-notes";
import ReturnInspectionSortModal from "./ReturnInspectionSortModal";
import styles from "./ReturnNoteDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

type Props = { id: string };

function formatQty(value?: string) {
  if (value == null) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? value : n.toLocaleString("th-TH");
}

export default function ReturnInspectionDetailPage({ id }: Props) {
  const t = useT();
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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("สินค้า"),
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
      title: t("จำนวนคืน"),
      dataIndex: "returnQty",
      align: "right",
      render: (value: string) => formatQty(value),
    },
    {
      title: t("ใช้งานได้"),
      dataIndex: "goodQty",
      align: "right",
      render: (value?: string) => formatQty(value),
    },
    {
      title: t("เสีย"),
      dataIndex: "scrapQty",
      align: "right",
      render: (value?: string) => formatQty(value),
    },
    {
      title: t("ปลายทาง"),
      key: "dest",
      render: (_, row) => (
        <div style={{ lineHeight: 1.4 }}>
          {row.goodQty != null ? (
            <div>{t("ดี:")} {row.goodWarehouseCode ?? "—"}</div>
          ) : null}
          {row.scrapQty != null ? (
            <div>{t("เสีย:")} {row.scrapWarehouseCode ?? "—"}</div>
          ) : (
            t("ยังไม่คัดแยก")
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
            {t("คัดแยกสินค้า")}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("ตรวจสอบและคัดแยกสินค้า")}
        subtitle={data.returnNoteNo}
        back={
          <Link href="/return-notes/inspections">
            <ArrowLeftOutlined /> {t("รอตรวจสอบ")}
          </Link>
        }
      />
      <div className={styles.layout}>
        <section>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data.items}
            pagination={false}
          />
          <div style={{ marginTop: 12 }}>
            <div>{t("เอกสารที่เกี่ยวข้อง")}</div>
            <div>
              <Link href={`/return-notes/${data.id}`}>{data.returnNoteNo}</Link>
              {data.salesOrderNo ? ` · SO ${data.salesOrderNo}` : ""}
              {data.pickingNo ? t(" · ใบจ่าย {pickingNo}", { pickingNo: data.pickingNo }) : ""}
              {data.deliveryOrderNo ? t(" · ใบส่ง {deliveryOrderNo}", { deliveryOrderNo: data.deliveryOrderNo }) : ""}
            </div>
          </div>
        </section>
        <aside className={styles.sideCard}>
          <div className={styles.sideRows}>
            <div className={styles.sideRow}>
              <span>{t("วันที่คืน")}</span>
              <strong>{dayjs(data.createdAt).format("DD/MM/BBBB")}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ลูกค้า")}</span>
              <strong>{data.customerName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>SO</span>
              <strong>{data.salesOrderNo ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ใบจ่ายสินค้า")}</span>
              <strong>{data.pickingNo ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ใบส่งสินค้า")}</span>
              <strong>{data.deliveryOrderNo ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("ผู้รับคืน")}</span>
              <strong>{data.approvedByName ?? "—"}</strong>
            </div>
            <div className={styles.sideRow}>
              <span>{t("สถานะ")}</span>
              <strong>
                {confirmed
                  ? t("ตรวจสอบแล้ว")
                  : returnNoteStatusLabel(data.status)}
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
              {t("ยืนยันผลการตรวจทั้งหมด")}
            </Button>
          ) : null}
          {confirmed ? (
            <p className={styles.sideNote}>
              {t("ยืนยันแล้วโดย")} {data.inspectionConfirmedByName ?? "—"} {t("ของดีเข้าคลังสำเร็จรูป")}
              {t("และของเสียเข้าคลังของเสีย")}
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
