"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Pagination, Progress, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useLinkedSalesOrdersQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import {
  PRODUCTION_REQUEST_STATUS_LABEL,
  type LinkedSalesOrder,
  type LinkedSalesOrderLine,
} from "@/types/production-request";
import {
  SALES_ORDER_STATUS_LABEL,
  type SalesOrderStatus,
} from "@/types/sales-orders";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./SalesOrdersInProductionPage.module.css";
import PageHeader from "@/components/common/PageHeader";

const PR_STATUS_COLOR: Record<string, string> = {
  PENDING: "default",
  IN_PRODUCTION: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

function fmtQty(value: string | number) {
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function hasReservedQty(line: LinkedSalesOrderLine) {
  return Number(line.reservedQty) > 0.0005;
}

type SharedItemPool = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  warehouseAvailable: number;
  totalNeed: number;
  competingSoCount: number;
  fullyCoverableSoCount: number;
  shortage: number;
};

function buildSharedItemPools(orders: LinkedSalesOrder[]): SharedItemPool[] {
  type Acc = {
    itemCode?: string;
    itemNameTh?: string;
    unitCode?: string;
    warehouseAvailable: number;
    totalNeed: number;
    soIds: Set<string>;
    soNeedsInOrder: number[];
  };

  const byItem = new Map<string, Acc>();

  for (const order of orders) {
    const needByItem = new Map<string, number>();
    for (const line of order.lines ?? []) {
      // ของที่รอผลิตผูกกับ SO ใบนี้แล้ว ไม่ได้แย่งสต๊อกกลางกับใบอื่น
      // จึงต้องหักออกก่อน ไม่งั้น totalNeed พองแล้วขึ้นเตือน "ของไม่พอ" ทั้งที่มีคนสั่งผลิตให้แล้ว
      const need = Math.max(
        Number(line.needQty) - Number(line.pendingProductionQty),
        0,
      );
      if (!(need > 0.0005)) {
        continue;
      }
      needByItem.set(line.itemId, (needByItem.get(line.itemId) ?? 0) + need);
      if (!byItem.has(line.itemId)) {
        byItem.set(line.itemId, {
          itemCode: line.itemCode,
          itemNameTh: line.itemNameTh,
          unitCode: line.unitCode,
          warehouseAvailable: Number(line.warehouseAvailableQty),
          totalNeed: 0,
          soIds: new Set(),
          soNeedsInOrder: [],
        });
      }
    }
    for (const [itemId, need] of needByItem) {
      const acc = byItem.get(itemId);
      if (!acc) {
        continue;
      }
      acc.totalNeed += need;
      acc.soIds.add(order.salesOrderId);
      acc.soNeedsInOrder.push(need);
    }
  }

  return [...byItem.entries()].map(([itemId, acc]) => {
    let remaining = acc.warehouseAvailable;
    let fullyCoverableSoCount = 0;
    for (const need of acc.soNeedsInOrder) {
      if (remaining + 0.0005 >= need) {
        fullyCoverableSoCount += 1;
        remaining -= need;
      }
    }
    return {
      itemId,
      itemCode: acc.itemCode,
      itemNameTh: acc.itemNameTh,
      unitCode: acc.unitCode,
      warehouseAvailable: acc.warehouseAvailable,
      totalNeed: acc.totalNeed,
      competingSoCount: acc.soIds.size,
      fullyCoverableSoCount,
      shortage: Math.max(acc.totalNeed - acc.warehouseAvailable, 0),
    };
  });
}

function shouldShowPoolBanner(pool: SharedItemPool) {
  return pool.competingSoCount > 1 || pool.shortage > 0.0005;
}

export default function SalesOrdersInProductionPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      q: q.trim() || undefined,
      page,
      limit: 20,
    }),
    [q, page],
  );
  const listQuery = useLinkedSalesOrdersQuery(queryParams);
  const rows = listQuery.data?.data.items ?? [];
  const total = listQuery.data?.data.total ?? 0;
  const sharedPools = useMemo(() => buildSharedItemPools(rows), [rows]);
  const bannerPools = useMemo(
    () => sharedPools.filter(shouldShowPoolBanner),
    [sharedPools],
  );
  const poolByItemId = useMemo(
    () => new Map(sharedPools.map((pool) => [pool.itemId, pool])),
    [sharedPools],
  );

  const itemColumns: ColumnsType<LinkedSalesOrderLine> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "seq",
        width: 64,
        align: "center",
        render: (_, __, index) => index + 1,
      },
      {
        title: "สินค้า",
        key: "item",
        render: (_, line) => (
          <div>
            <p className={styles.itemName}>
              {line.itemNameTh || line.itemCode || "สินค้า"}
            </p>
            <p className={styles.itemCode}>{line.itemCode || "—"}</p>
          </div>
        ),
      },
      {
        title: "สั่ง",
        key: "orderedQty",
        align: "right",
        render: (_, line) => `${fmtQty(line.orderedQty)} ${line.unitCode ?? ""}`,
      },
      {
        title: "จองแล้ว",
        key: "reservedQty",
        align: "right",
        render: (_, line) => (
          <span style={{ color: "#237804" }}>
            {fmtQty(line.reservedQty)} {line.unitCode ?? ""}
          </span>
        ),
      },
      {
        title: "รอผลิต",
        key: "pendingProductionQty",
        align: "right",
        render: (_, line) =>
          Number(line.pendingProductionQty) > 0.0005 ? (
            <span style={{ color: "#0958d9" }}>
              {fmtQty(line.pendingProductionQty)} {line.unitCode ?? ""}
            </span>
          ) : (
            "—"
          ),
      },
      {
        title: "ขาด",
        key: "shortageQty",
        align: "right",
        render: (_, line) =>
          Number(line.shortageQty) > 0.0005 ? (
            <strong style={{ color: "#cf1322" }}>
              {fmtQty(line.shortageQty)} {line.unitCode ?? ""}
            </strong>
          ) : (
            "—"
          ),
      },
      {
        title: "สถานะของ",
        key: "stockStatus",
        render: (_, line) => {
          if (line.isFullyReserved && hasReservedQty(line)) {
            return <Tag color="success">จัดลง SO ครบแล้ว</Tag>;
          }
          // มีใบขอผลิตคุมส่วนที่ขาดครบแล้ว — ไม่ต้องไปแย่งของกลาง
          if (
            Number(line.shortageQty) <= 0.0005 &&
            Number(line.pendingProductionQty) > 0.0005
          ) {
            return (
              <Tag color="processing">
                รอผลผลิต {fmtQty(line.pendingProductionQty)}
              </Tag>
            );
          }
          const need = Math.max(
            Number(line.needQty) - Number(line.pendingProductionQty),
            0,
          );
          const warehouse = Number(line.warehouseAvailableQty);
          const totalNeed = poolByItemId.get(line.itemId)?.totalNeed ?? need;
          if (need > warehouse + 0.0005) {
            return <Tag color="warning">คลังไม่พอ ต้องเปิดใบขอผลิตเพิ่ม</Tag>;
          }
          if (totalNeed > warehouse + 0.0005) {
            return <Tag color="processing">พอถ้าเลือกใบนี้</Tag>;
          }
          return <Tag color="success">คลังพอ</Tag>;
        },
      },
    ],
    [poolByItemId],
  );

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow="SALES · รอยืนยันใบสั่งขาย"
          title="ใบสั่งขายที่ส่งผลิต"
          subtitle="เห็นสินค้าต่อใบและยอดที่ยังต้องการ โดยไม่ต้องเปิดใบสั่งขายทีละใบ ของในคลังเป็นยอดรวม ต้องเลือกจัดลง SO ใบไหนก่อน"
        />

        {bannerPools.length ? (
          <div className={styles.poolBanner}>
            <p className={styles.poolBannerLead}>
              ของในคลังเป็นยอดรวม ไม่ใช่มีให้ทุกใบเท่ากัน ต้องเลือกจัดลง SO
              ใบไหนก่อน · คำนวณจากรายการบนหน้านี้
            </p>
            {bannerPools.map((pool) => (
              <div key={pool.itemId} className={styles.poolBannerCard}>
                <strong>
                  {pool.itemNameTh || pool.itemCode || "สินค้า"}
                  {pool.itemCode && pool.itemNameTh ? ` · ${pool.itemCode}` : ""}
                </strong>
                <span>
                  คลัง {fmtQty(pool.warehouseAvailable)} {pool.unitCode ?? ""} ·
                  ต้องการรวม {fmtQty(pool.totalNeed)} {pool.unitCode ?? ""} จาก{" "}
                  {pool.competingSoCount} ใบ · พอได้เต็ม{" "}
                  {pool.fullyCoverableSoCount} จาก {pool.competingSoCount} ใบ
                  {pool.shortage > 0.0005
                    ? ` · ขาดรวม ${fmtQty(pool.shortage)} ${pool.unitCode ?? ""}`
                    : ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className={masterStyles.filterCard}>
          <div className={masterStyles.filterHeader}>
            <div>
              <div className={masterStyles.filterEyebrow}>ค้นหา</div>
              <h3>รายการรอยืนยันใบสั่งขาย</h3>
              <p>ทั้งหมด {total} ใบ</p>
            </div>
          </div>
          <div className={masterStyles.filterForm}>
            <div className={masterStyles.formGrid}>
              <Input
                allowClear
                aria-label="ค้นหาเลขที่ใบสั่งขาย ลูกค้า หรือใบขอผลิต"
                prefix={<SearchOutlined />}
                placeholder="ค้นหาเลขที่ SO / ลูกค้า / ใบขอผลิต"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className={styles.list}>
          {listQuery.isFetching && !rows.length ? (
            <div className={styles.empty}>กำลังโหลดรายการ...</div>
          ) : null}
          {!listQuery.isFetching && !rows.length ? (
            <div className={styles.empty}>ยังไม่มีใบสั่งขายรอยืนยัน</div>
          ) : null}
          {rows.map((row) => (
            <article key={row.salesOrderId} className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>
                  <button
                    type="button"
                    className={styles.soNo}
                    onClick={() =>
                      router.push(`/sales-orders/${row.salesOrderId}`)
                    }
                  >
                    {row.soNo}
                  </button>
                  <p className={styles.meta}>
                    {row.customerName || "ไม่ระบุลูกค้า"} ·{" "}
                    {SALES_ORDER_STATUS_LABEL[row.soStatus as SalesOrderStatus] ??
                      row.soStatus}
                    {row.requestedDeliveryDate
                      ? ` · ต้องการภายใน ${dayjs(row.requestedDeliveryDate).format("DD/MM/YYYY")}`
                      : ""}
                  </p>
                  <div className={styles.prRow}>
                    {row.productionRequests.map((request) => (
                      <span
                        key={request.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          className={masterStyles.codeBadge}
                          style={{ border: 0, cursor: "pointer" }}
                          onClick={() =>
                            router.push(
                              `/production/production-requests/${request.id}`,
                            )
                          }
                        >
                          {request.requestNo}
                        </button>
                        <Tag
                          color={PR_STATUS_COLOR[request.status] ?? "default"}
                        >
                          {PRODUCTION_REQUEST_STATUS_LABEL[request.status] ??
                            request.status}
                        </Tag>
                        <Progress
                          percent={request.producedPercent}
                          size="small"
                          style={{ width: 120, margin: 0 }}
                          status={
                            request.producedPercent >= 100 ? "success" : "active"
                          }
                          format={(value) => `${value ?? 0}%`}
                        />
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.actions}>
                  {row.isFullyReserved ? (
                    <Tag color="success">พร้อมยืนยัน</Tag>
                  ) : row.hasUnplannedShortage ? (
                    <Tag color="warning">ของไม่พอ ต้องเปิดใบขอผลิตเพิ่ม</Tag>
                  ) : (
                    <Tag color="processing">รอผลผลิต</Tag>
                  )}
                  <Button
                    type="primary"
                    onClick={() =>
                      router.push(`/sales-orders/${row.salesOrderId}`)
                    }
                  >
                    จัดของลง SO
                  </Button>
                </div>
              </div>

              <div>
                <p className={styles.itemHint}>
                  สินค้าในใบนี้ · <strong>รอผลิต</strong>{" "}
                  คือของที่มีใบขอผลิตคุมไว้ให้ใบนี้แล้ว ผลิตเสร็จเมื่อไหร่ระบบจะจอง
                  กลับมาให้อัตโนมัติ ใบสั่งขายอื่นแย่งไปไม่ได้ ·{" "}
                  <strong>ขาด</strong> คือส่วนที่ยังไม่มีทั้งของและใบขอผลิต
                  ต้องเปิดใบขอผลิตเพิ่ม
                </p>
                <Table<LinkedSalesOrderLine>
                  size="small"
                  rowKey="salesOrderItemId"
                  pagination={false}
                  columns={itemColumns}
                  dataSource={row.lines ?? []}
                />
              </div>
            </article>
          ))}
        </div>

        {total > 20 ? (
          <div className={styles.pager}>
            <Pagination
              current={page}
              pageSize={20}
              total={total}
              onChange={setPage}
              showTotal={(count) => `ทั้งหมด ${count} ใบ`}
            />
          </div>
        ) : null}
      </section>
    </MasterPageGate>
  );
}
