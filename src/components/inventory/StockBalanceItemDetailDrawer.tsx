"use client";

import Link from "next/link";
import { Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useStockBalancesQuery } from "@/hooks/inventory/useInventoryQueries";
import type {
  StockBalanceByItemRow,
  StockBalanceQueryParams,
  StockBalanceRow,
} from "@/types/inventory";
import styles from "./StockBalancesPage.module.css";

function formatQty(value?: string) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) {
    return "-";
  }
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

type Props = {
  open: boolean;
  item: StockBalanceByItemRow | null;
  filters: StockBalanceQueryParams;
  onClose: () => void;
};

export default function StockBalanceItemDetailDrawer({
  open,
  item,
  filters,
  onClose,
}: Props) {
  const detailQuery = useStockBalancesQuery(
    item
      ? {
          itemId: item.itemId,
          warehouseId: filters.warehouseId,
          locationId: filters.locationId,
          hasStock: filters.hasStock,
          itemCategoryCode: filters.itemCategoryCode,
        }
      : undefined,
    { enabled: open && Boolean(item) },
  );

  const rows = detailQuery.data?.data ?? [];

  const columns: ColumnsType<StockBalanceRow> = [
    {
      title: "คลัง / ตำแหน่ง",
      key: "place",
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.itemName}>{row.warehouseCode}</span>
          <span className={styles.metaMuted}>
            {row.locationCode}
            {row.locationName ? ` — ${row.locationName}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: "คงเหลือ",
      dataIndex: "quantityOnHand",
      key: "quantityOnHand",
      align: "right",
      width: 110,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: "พร้อมใช้",
      dataIndex: "quantityAvailable",
      key: "quantityAvailable",
      align: "right",
      width: 110,
      render: (value: string) => (
        <span className={`${styles.qtyCell} ${styles.qtyAvailable}`}>
          {formatQty(value)}
        </span>
      ),
    },
    {
      title: "จอง",
      dataIndex: "quantityReserved",
      key: "quantityReserved",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
  ];

  return (
    <Drawer
      title={
        item ? (
          <div className={styles.drawerTitle}>
            <span className={styles.itemCode}>{item.itemCode}</span>
            <span className={styles.itemName}>{item.itemNameTh}</span>
          </div>
        ) : (
          "รายละเอียดยอดคงเหลือ"
        )
      }
      open={open}
      onClose={onClose}
      destroyOnHidden
      size={560}
      className={styles.detailDrawer}
    >
      {item ? (
        <>
          <div className={styles.drawerSummary}>
            <div>
              <span>คงเหลือรวม</span>
              <strong>
                {formatQty(item.totalQuantityOnHand)}
                {item.unitCode ? ` ${item.unitCode}` : ""}
              </strong>
            </div>
            <div>
              <span>พร้อมใช้</span>
              <strong className={styles.qtyAvailable}>
                {formatQty(item.totalQuantityAvailable)}
              </strong>
            </div>
            <div>
              <span>คลัง / ตำแหน่ง</span>
              <strong>
                {item.warehouseCount} / {item.locationCount}
              </strong>
            </div>
          </div>

          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={detailQuery.isFetching}
            pagination={{
              pageSize: 10,
              hideOnSinglePage: true,
              showTotal: (total) => `${total} รายการ`,
            }}
            locale={{
              emptyText: "ไม่มียอดคงเหลือตามเงื่อนไข",
            }}
          />

          <div className={styles.drawerFooter}>
            <Link
              href={`/inventory/lots?itemId=${item.itemId}${
                filters.itemCategoryCode
                  ? `&itemCategoryCode=${encodeURIComponent(filters.itemCategoryCode)}`
                  : ""
              }`}
              className={styles.drawerLink}
            >
              ดูยอดแยก Lot →
            </Link>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
