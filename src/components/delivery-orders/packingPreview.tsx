import type { ColumnsType } from "antd/es/table";

import type { ReadyPacking, ReadyPackingItem } from "@/types/delivery-orders";
import styles from "./DeliveryOrdersListPage.module.css";

export type PackingPreviewLine = ReadyPackingItem & {
  packingId: string;
  packingNo: string;
  roundNo?: number;
};

export function fmtQty(value: string) {
  const n = Number(value);
  return Number.isNaN(n)
    ? value
    : n.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

/** ลำดับใบบรรจุในใบส่ง — ใบแรกเป็นหัวเอกสาร จึงเอารอบแรกสุดขึ้นก่อน */
export function byRoundThenNo(a: ReadyPacking, b: ReadyPacking) {
  return (
    (a.roundNo ?? Number.MAX_SAFE_INTEGER) -
      (b.roundNo ?? Number.MAX_SAFE_INTEGER) ||
    a.packingNo.localeCompare(b.packingNo)
  );
}

export function buildPackingPreviewLines(
  packings: ReadyPacking[],
): PackingPreviewLine[] {
  return packings.flatMap((packing) =>
    [...(packing.items ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        ...item,
        packingId: packing.id,
        packingNo: packing.packingNo,
        roundNo: packing.roundNo,
      })),
  );
}

export const packingPreviewRowKey = (line: PackingPreviewLine) =>
  `${line.packingId}:${line.id}`;

export const packingPreviewColumns: ColumnsType<PackingPreviewLine> = [
  {
    title: "ใบบรรจุ",
    dataIndex: "packingNo",
    width: 150,
    render: (v: string) => <span className={styles.prNo}>{v}</span>,
  },
  {
    title: "รอบ",
    dataIndex: "roundNo",
    width: 80,
    render: (v?: number) => (v ? `รอบที่ ${v}` : "—"),
  },
  {
    title: "สินค้า",
    key: "item",
    render: (_: unknown, line) => (
      <div style={{ lineHeight: 1.4 }}>
        <div>{line.itemNameTh ?? "—"}</div>
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {line.itemCode ?? "—"}
        </div>
      </div>
    ),
  },
  {
    title: "จำนวน",
    dataIndex: "packedQty",
    width: 110,
    align: "right",
    render: (v: string) => fmtQty(v),
  },
  {
    title: "หน่วย",
    dataIndex: "unitCode",
    width: 90,
    render: (v?: string) => v ?? "—",
  },
];
