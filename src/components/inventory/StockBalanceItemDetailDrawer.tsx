"use client";

import Link from "next/link";
import { Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import {
  useStockBalanceReservationsQuery,
  useStockBalancesQuery,
} from "@/hooks/inventory/useInventoryQueries";
import { useT } from "@/lib/i18n/useT";
import { formatErpDateTime } from "@/lib/datetime/erp-timezone";
import type {
  StockBalanceByItemRow,
  StockBalanceQueryParams,
  StockBalanceReservationRow,
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
  const t = useT();
  const detailQuery = useStockBalancesQuery(
    item
      ? {
          itemId: item.itemId,
          warehouseId: filters.warehouseId,
          locationId: filters.locationId,
          hasStock: filters.hasStock,
          itemCategoryCode: filters.itemCategoryCode,
          isFinishedGood: filters.isFinishedGood,
        }
      : undefined,
    { enabled: open && Boolean(item) },
  );
  const reservationsQuery = useStockBalanceReservationsQuery(
    item
      ? {
          itemId: item.itemId,
          warehouseId: filters.warehouseId,
          locationId: filters.locationId,
        }
      : undefined,
    { enabled: open && Boolean(item) },
  );

  const rows = detailQuery.data?.data ?? [];
  const reservations = reservationsQuery.data?.data ?? [];

  const columns: ColumnsType<StockBalanceRow> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("คลัง / ตำแหน่ง"),
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
      title: t("คงเหลือ"),
      dataIndex: "quantityOnHand",
      key: "quantityOnHand",
      align: "right",
      width: 110,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: t("พร้อมใช้"),
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
      title: t("จอง"),
      dataIndex: "quantityReserved",
      key: "quantityReserved",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
  ];

  const reservationColumns: ColumnsType<StockBalanceReservationRow> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ลูกค้า"),
      key: "customer",
      render: (_, row) => (
        <div className={styles.itemCell}>
          <span className={styles.itemName}>
            {row.customerName || t("ไม่ระบุลูกค้า")}
          </span>
          {row.customerCode ? (
            <span className={styles.metaMuted}>{row.customerCode}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: t("ใบสั่งขาย"),
      key: "soNo",
      width: 140,
      render: (_, row) => (
        <Link href={`/sales-orders/${row.salesOrderId}`} className={styles.drawerLink}>
          {row.soNo || "—"}
        </Link>
      ),
    },
    {
      title: t("จำนวน"),
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      width: 100,
      render: (value: string) => (
        <span className={styles.qtyCell}>{formatQty(value)}</span>
      ),
    },
    {
      title: t("คลัง / ตำแหน่ง"),
      key: "place",
      width: 140,
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
      title: t("วันเวลาที่จอง"),
      dataIndex: "reservedAt",
      key: "reservedAt",
      width: 150,
      render: (value: string) => (
        <span className={styles.metaMuted}>{formatErpDateTime(value)}</span>
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
          t("รายละเอียดยอดคงเหลือ")
        )
      }
      open={open}
      onClose={onClose}
      destroyOnHidden
      size={720}
      className={styles.detailDrawer}
    >
      {item ? (
        <>
          <div className={styles.drawerSummary}>
            <div>
              <span>{t("คงเหลือรวม")}</span>
              <strong>
                {formatQty(item.totalQuantityOnHand)}
                {item.unitCode ? ` ${item.unitCode}` : ""}
              </strong>
            </div>
            <div>
              <span>{t("พร้อมใช้")}</span>
              <strong className={styles.qtyAvailable}>
                {formatQty(item.totalQuantityAvailable)}
              </strong>
            </div>
            <div>
              <span>{t("จองรวม")}</span>
              <strong>{formatQty(item.totalQuantityReserved)}</strong>
            </div>
            <div>
              <span>{t("คลัง / ตำแหน่ง")}</span>
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
              showTotal: (total) => t("{n} รายการ", { n: total }),
            }}
            locale={{
              emptyText: t("ไม่มียอดคงเหลือตามเงื่อนไข"),
            }}
          />

          <div className={styles.reservationSection}>
            <h4>{t("รายการจอง")}</h4>
            <p>{t("แยกตามลูกค้าและใบสั่งขาย — ของยังอยู่ในคลัง แต่พร้อมใช้ลดแล้ว")}</p>
            <Table
              rowKey="id"
              className={styles.dataTable}
              columns={reservationColumns}
              dataSource={reservations}
              loading={reservationsQuery.isFetching}
              scroll={{ x: 680 }}
              pagination={{
                pageSize: 10,
                hideOnSinglePage: true,
                showTotal: (total) => t("{n} รายการจอง", { n: total }),
              }}
              locale={{
                emptyText: t("ยังไม่มีการจองสินค้านี้"),
              }}
            />
          </div>

          <div className={styles.drawerFooter}>
            <Link
              href={`/inventory/lots?itemId=${item.itemId}${
                filters.isFinishedGood === true
                  ? "&isFinishedGood=true"
                  : filters.isFinishedGood === false
                    ? "&isFinishedGood=false"
                    : filters.itemCategoryCode
                      ? `&itemCategoryCode=${encodeURIComponent(filters.itemCategoryCode)}`
                      : ""
              }`}
              className={styles.drawerLink}
            >
              {t("ดูยอดแยก Lot →")}
            </Link>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
