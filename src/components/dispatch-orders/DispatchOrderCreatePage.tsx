"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, DatePicker, Input, Select, Spin } from "antd";
import { ArrowLeftOutlined, CarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useCreateDispatchOrderMutation } from "@/hooks/dispatch-orders/useDispatchOrderMutations";
import { useAvailableLocationsQuery } from "@/hooks/dispatch-orders/useDispatchOrdersQuery";
import {
  useSalesOrderAvailableWarehousesQuery,
  useSalesOrderQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { getFifoLotSuggestion } from "@/lib/api/dispatch-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { CreateDispatchOrderItemInput } from "@/types/dispatch-orders";
import styles from "./DispatchOrderDetailPage.module.css";

type Props = { salesOrderId: string };

type RowState = {
  salesOrderItemId: string;
  itemId: string;
  label: string;
  unitCode?: string;
  remaining: number;
  quantity: number;
  locationId?: string;
};

export default function DispatchOrderCreatePage({ salesOrderId }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const soQuery = useSalesOrderQuery(salesOrderId);
  const warehousesQuery = useSalesOrderAvailableWarehousesQuery(salesOrderId);
  const createMutation = useCreateDispatchOrderMutation();

  const [dispatchDate, setDispatchDate] = useState(dayjs());
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const warehouses = warehousesQuery.data?.data ?? [];

  const so = soQuery.data?.data;

  const initialRows = useMemo<RowState[]>(() => {
    if (!so) return [];
    return so.items
      .map((item) => {
        const remaining =
          Number(item.quantity) -
          Number(item.issuedQuantity) -
          Number(item.reservedQuantity);
        return {
          salesOrderItemId: item.id,
          itemId: item.itemId,
          label: item.itemCode
            ? `${item.itemCode} — ${item.itemNameTh ?? ""}`
            : (item.itemNameTh ?? item.itemId),
          unitCode: item.unitCode,
          remaining: Math.max(remaining, 0),
          quantity: Math.max(remaining, 0),
        };
      })
      .filter((row) => row.remaining > 1e-9);
  }, [so]);

  const [rows, setRows] = useState<RowState[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && initialRows.length > 0) {
      setRows(initialRows);
      initializedRef.current = true;
    }
  }, [initialRows]);

  const activeRows = rows;

  const updateRow = (salesOrderItemId: string, patch: Partial<RowState>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.salesOrderItemId === salesOrderItemId
          ? { ...row, ...patch }
          : row,
      ),
    );
  };

  if (soQuery.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!so) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบใบสั่งขายที่ต้องการ
        <div style={{ marginTop: 12 }}>
          <Link href="/sales-orders">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!warehouseId) {
      message.error("กรุณาเลือกคลังสินค้า");
      return;
    }
    const selectedRows = activeRows.filter((row) => row.quantity > 1e-9);
    if (selectedRows.length === 0) {
      message.error("ไม่มีรายการที่จะจัด");
      return;
    }
    const missingLocation = selectedRows.find((row) => !row.locationId);
    if (missingLocation) {
      message.error(`กรุณาเลือกตำแหน่งจัดเก็บของ ${missingLocation.label}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = getAccessToken();
      const itemsByRow = await Promise.all(
        selectedRows.map(async (row) => {
          const suggestion = await getFifoLotSuggestion(token, {
            itemId: row.itemId,
            warehouseId,
            locationId: row.locationId as string,
            quantity: row.quantity,
          });
          const resolvedQuantity = suggestion.data.reduce(
            (sum, lot) => sum + Number(lot.quantity),
            0,
          );
          if (resolvedQuantity < row.quantity - 1e-9) {
            throw new Error(
              `สต๊อกของ ${row.label} ที่ตำแหน่งนี้ไม่พอสำหรับจำนวนที่เลือก (มี ${resolvedQuantity.toLocaleString("th-TH")} ต้องการ ${row.quantity.toLocaleString("th-TH")})`,
            );
          }
          return suggestion.data.map(
            (lot): CreateDispatchOrderItemInput => ({
              salesOrderItemId: row.salesOrderItemId,
              locationId: row.locationId as string,
              lotId: lot.lotId,
              quantity: Number(lot.quantity),
            }),
          );
        }),
      );

      const items = itemsByRow.flat();
      createMutation.mutate(
        {
          salesOrderId,
          dispatchDate: dispatchDate.format("YYYY-MM-DD"),
          warehouseId,
          remark: remark.trim() || undefined,
          items,
        },
        {
          onSuccess: (res) => {
            router.push(`/dispatch-orders/${res.data.id}`);
          },
        },
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "ตรวจสอบสต๊อกไม่สำเร็จ — สินค้าบางรายการอาจมีไม่พอ",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <CarOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Sales · Dispatch Order</p>
          <h1 className={styles.pageTitle}>สร้างใบจ่ายสินค้า (Picking)</h1>
          <p className={styles.pageSubtitle}>
            จากใบสั่งขาย {so.soNo} — เลือก Lot ให้อัตโนมัติแบบ FIFO
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/sales-orders/${salesOrderId}`)}
          >
            กลับ
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลการจัดส่ง</h2>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่จัด</span>
                <DatePicker
                  value={dispatchDate}
                  onChange={(value) => value && setDispatchDate(value)}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>คลังสินค้า</span>
                <Select
                  placeholder="เลือกคลัง"
                  value={warehouseId}
                  onChange={setWarehouseId}
                  loading={warehousesQuery.isLoading}
                  notFoundContent="ไม่มีคลังที่มีสต๊อกของสินค้าในใบสั่งขายนี้"
                  options={warehouses.map((w) => ({
                    value: w.warehouseId,
                    label: `${w.warehouseCode ?? "—"} — ${w.warehouseName ?? ""}`,
                  }))}
                />
                {!warehousesQuery.isLoading && warehouses.length === 0 ? (
                  <p className={styles.itemCode} style={{ marginTop: 4 }}>
                    ไม่มีคลังที่มีสต๊อกของสินค้าในใบสั่งขายนี้เลย
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>รายการที่จะจัด</h2>
              <span className={styles.sectionHint}>
                Lot จะถูกเลือกอัตโนมัติแบบ FIFO ตามคลัง/ตำแหน่งที่เลือก
              </span>
            </div>
            <div className={styles.itemList}>
              {activeRows.length === 0 ? (
                <p className={styles.textBlock}>
                  ไม่มีรายการคงเหลือให้จัด (จัดครบทุกรายการแล้ว)
                </p>
              ) : (
                activeRows.map((row) => (
                  <DispatchItemRow
                    key={row.salesOrderItemId}
                    row={row}
                    warehouseId={warehouseId}
                    onChange={(patch) =>
                      updateRow(row.salesOrderItemId, patch)
                    }
                  />
                ))
              )}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>หมายเหตุ</h2>
            </div>
            <Input.TextArea
              rows={3}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
            />
          </div>
        </section>

        <aside className={styles.sideCard}>
          <div>
            <p className={styles.sideEyebrow}>ใบสั่งขายอ้างอิง</p>
            <h2 className={styles.sideTitle}>{so.soNo}</h2>
          </div>
          <Button
            className={styles.primaryBtn}
            type="primary"
            loading={submitting || createMutation.isPending}
            onClick={handleSubmit}
          >
            สร้างใบจ่ายสินค้าและจองสต๊อก
          </Button>
        </aside>
      </div>
    </div>
  );
}

function DispatchItemRow({
  row,
  warehouseId,
  onChange,
}: {
  row: RowState;
  warehouseId?: string;
  onChange: (patch: Partial<RowState>) => void;
}) {
  const locationsQuery = useAvailableLocationsQuery({
    itemId: row.itemId,
    warehouseId,
  });
  const locations = locationsQuery.data?.data ?? [];
  const selectedLocation = locations.find(
    (loc) => loc.locationId === row.locationId,
  );
  const availableQty = selectedLocation
    ? Number(selectedLocation.quantityAvailable)
    : 0;
  const maxQty = Math.min(row.remaining, availableQty);

  useEffect(() => {
    if (
      locationsQuery.isSuccess &&
      row.locationId &&
      !locations.some((loc) => loc.locationId === row.locationId)
    ) {
      onChange({ locationId: undefined, quantity: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsQuery.isSuccess, warehouseId]);

  return (
    <div className={styles.itemCard}>
      <div className={styles.itemIndex}>
        {row.remaining.toLocaleString("th-TH")}
      </div>
      <div className={styles.itemBody}>
        <p className={styles.itemName}>{row.label}</p>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <Select
            style={{ minWidth: 240 }}
            placeholder={
              warehouseId ? "เลือกตำแหน่งจัดเก็บ" : "เลือกคลังสินค้าก่อน"
            }
            value={row.locationId}
            onChange={(value) => {
              const loc = locations.find((l) => l.locationId === value);
              const newAvailable = loc ? Number(loc.quantityAvailable) : 0;
              onChange({
                locationId: value,
                quantity: Math.min(row.remaining, newAvailable),
              });
            }}
            loading={locationsQuery.isLoading}
            disabled={!warehouseId}
            notFoundContent={
              warehouseId ? "ไม่มีสต๊อกของสินค้านี้ในคลังนี้" : undefined
            }
            options={locations.map((loc) => ({
              value: loc.locationId,
              label: `${loc.locationCode ?? "—"} — ${loc.locationName ?? ""} (คงเหลือ ${Number(
                loc.quantityAvailable,
              ).toLocaleString("th-TH")})`,
            }))}
          />
          <Input
            type="number"
            style={{ width: 140 }}
            value={row.quantity}
            max={maxQty}
            min={0}
            disabled={!row.locationId}
            onChange={(e) =>
              onChange({
                quantity: Math.min(Number(e.target.value) || 0, maxQty),
              })
            }
            suffix={row.unitCode}
          />
        </div>
        {row.locationId ? (
          <p className={styles.itemCode}>
            สต๊อกพร้อมใช้ที่ตำแหน่งนี้ {availableQty.toLocaleString("th-TH")}{" "}
            {row.unitCode}
          </p>
        ) : null}
      </div>
    </div>
  );
}
