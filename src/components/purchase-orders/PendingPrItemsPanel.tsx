"use client";

import { memo } from "react";
import Link from "next/link";
import { Checkbox, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

import type {
  PurchaseRequest,
  PurchaseRequestItem,
} from "@/types/purchase-requests";

import styles from "./PurchaseOrdersListPage.module.css";

/** ชื่อสินค้าให้ตรงกับที่หน้าสร้างใบสั่งซื้อใช้ */
export function itemLabelOf(item: PurchaseRequestItem) {
  return (
    [item.itemCode, item.itemNameTh].filter(Boolean).join(" — ") ||
    "ไม่ระบุชื่อสินค้า"
  );
}

/** บรรทัดที่ยังสั่งซื้อได้ — จุดเดียวที่นิยามคำว่า "ติ๊กได้" */
export function openItemsOf(pr: PurchaseRequest) {
  return (pr.items ?? []).filter((item) => !item.orderedPurchaseOrder);
}

function formatQty(value: string) {
  /* quantity มาเป็น string จาก backend (decimal) */
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

type Props = {
  pr: PurchaseRequest;
  /** ไม่มีสิทธิ์สร้างใบสั่งซื้อ = แผงนี้อ่านอย่างเดียว ไม่มีช่องติ๊ก */
  selectable: boolean;
  selectedItemIds: Record<string, unknown>;
  onToggleItem: (
    pr: PurchaseRequest,
    item: PurchaseRequestItem,
    next: boolean,
  ) => void;
};

function PendingPrItemsPanel({
  pr,
  selectable,
  selectedItemIds,
  onToggleItem,
}: Props) {
  const items = pr.items ?? [];

  const columns: ColumnsType<PurchaseRequestItem> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    ...(selectable
      ? [
          {
            key: "select",
            width: 44,
            align: "center" as const,
            render: (_v: unknown, item: PurchaseRequestItem) => (
              <Checkbox
                checked={Boolean(selectedItemIds[item.id])}
                disabled={Boolean(item.orderedPurchaseOrder)}
                onChange={(event) =>
                  onToggleItem(pr, item, event.target.checked)
                }
                aria-label={`เลือก ${itemLabelOf(item)}`}
              />
            ),
          },
        ]
      : []),
    {
      title: "สินค้า",
      key: "item",
      ellipsis: true,
      render: (_v, item) => (
        <div>
          <div className={styles.panelItemName}>{itemLabelOf(item)}</div>
          {item.description ? (
            <div className={styles.panelItemDesc}>{item.description}</div>
          ) : null}
        </div>
      ),
    },
    {
      title: "จำนวน",
      key: "qty",
      width: 100,
      align: "right",
      render: (_v, item) => formatQty(item.quantity),
    },
    {
      title: "หน่วย",
      key: "unit",
      width: 90,
      render: (_v, item) => item.unitNameTh ?? item.unitCode ?? "—",
    },
    {
      title: "ต้องการภายใน",
      key: "requiredDate",
      width: 130,
      render: (_v, item) => formatDate(item.requiredDate),
    },
    {
      title: "สถานะ",
      key: "status",
      width: 190,
      render: (_v, item) =>
        item.orderedPurchaseOrder ? (
          <span className={styles.panelOrdered}>
            <Tag>สั่งแล้ว</Tag>
            <Link href={`/purchase-orders/${item.orderedPurchaseOrder.id}`}>
              {item.orderedPurchaseOrder.poNo}
            </Link>
          </span>
        ) : (
          <Tag color="success">ยังไม่สั่ง</Tag>
        ),
    },
  ];

  return (
    /* คลิกในแผงย่อยไม่ควรไปโดน onRow ของตารางแม่ (ดับเบิลคลิก = เปิดหน้าสร้าง) */
    <div
      className={styles.panel}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <p className={styles.panelHint}>
        {selectable
          ? "เลือกเฉพาะสินค้าที่จะสั่งจากผู้ขายรายนี้ — ที่เหลือยังค้างอยู่ในคิวให้เปิดใบถัดไปได้"
          : "รายการสินค้าในใบขอซื้อนี้"}
      </p>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={items}
        pagination={false}
        rowClassName={(item) =>
          item.orderedPurchaseOrder ? styles.panelRowOrdered : ""
        }
      />
    </div>
  );
}

/**
 * เทียบ "ลายเซ็นการติ๊ก" ของใบนี้ — กางไว้หลายใบแล้วติ๊กทีเดียว
 * ไม่ควร re-render แผงของใบอื่นทั้งหมด
 */
export default memo(PendingPrItemsPanel, (prev, next) => {
  if (
    prev.pr !== next.pr ||
    prev.selectable !== next.selectable ||
    prev.onToggleItem !== next.onToggleItem
  ) {
    return false;
  }
  const sign = (props: Props) =>
    (props.pr.items ?? [])
      .map((item) => (props.selectedItemIds[item.id] ? "1" : "0"))
      .join("");
  return sign(prev) === sign(next);
});
