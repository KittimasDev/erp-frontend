"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateProductionOrderMutation } from "@/hooks/production-orders/useProductionOrderMutations";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import type { CreateProductionOrderInputItemBody } from "@/types/production-order";
import styles from "./ProductionOrderCreatePage.module.css";

type Row = {
  key: number;
  itemId?: string;
  unitId?: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  plannedQty?: number;
};

let rowKeySeq = 1;
function emptyRow(): Row {
  return { key: rowKeySeq++ };
}

function MaterialRow({
  row,
  index,
  onChange,
  onRemove,
  removable,
}: {
  row: Row;
  index: number;
  onChange: (row: Row) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const itemsQuery = useItemsQuery({ isActive: true, isStockItem: true });
  const lotsForItemQuery = useInventoryLotsQuery(
    row.itemId ? { itemId: row.itemId, hasStock: true } : undefined,
    { enabled: Boolean(row.itemId) },
  );

  const lotsQuery = useInventoryLotsQuery(
    row.itemId && row.warehouseId && row.locationId
      ? {
          itemId: row.itemId,
          warehouseId: row.warehouseId,
          locationId: row.locationId,
          hasStock: true,
        }
      : undefined,
    { enabled: Boolean(row.itemId && row.warehouseId && row.locationId) },
  );

  const lotsForItem = lotsForItemQuery.data?.data ?? [];

  const warehouseOptions = Array.from(
    new Map(
      lotsForItem
        .filter((l) => Boolean(l.warehouseId))
        .map((l) => [
          l.warehouseId,
          { value: l.warehouseId, label: `${l.warehouseCode} — ${l.warehouseName}` },
        ]),
    ).values(),
  );

  const locationOptions = Array.from(
    new Map(
      lotsForItem
        .filter(
          (l) => Boolean(l.locationId) && row.warehouseId && l.warehouseId === row.warehouseId,
        )
        .map((l) => [
          l.locationId,
          { value: l.locationId, label: `${l.locationCode} — ${l.locationName}` },
        ]),
    ).values(),
  );

  return (
    <div className={styles.materialCard}>
      <span className={styles.materialCardNo}>{index + 1}</span>
      <div className={styles.materialGrid}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>สินค้า (วัตถุดิบ)</span>
          <Select
            showSearch
            placeholder="เลือกสินค้า"
            optionFilterProp="label"
            loading={itemsQuery.isLoading}
            value={row.itemId}
            style={{ width: "100%" }}
            options={(itemsQuery.data?.data ?? []).map((item) => ({
              value: item.id,
              label: `${item.itemCode} — ${item.itemNameTh}`,
              unitId: item.unitId,
            }))}
            onChange={(value, option) => {
              const opt = option as { unitId?: string } | undefined;
              onChange({
                ...row,
                itemId: value,
                unitId: opt?.unitId,
                warehouseId: undefined,
                locationId: undefined,
                lotId: undefined,
              });
            }}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>คลัง</span>
          <Select
            showSearch
            placeholder={row.itemId ? "เลือกคลังของสินค้านี้" : "เลือกสินค้าเพื่อดูคลัง"}
            optionFilterProp="label"
            loading={lotsForItemQuery.isLoading}
            disabled={!row.itemId}
            value={row.warehouseId}
            style={{ width: "100%" }}
            options={warehouseOptions}
            onChange={(value) =>
              onChange({
                ...row,
                warehouseId: value,
                locationId: undefined,
                lotId: undefined,
              })
            }
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>ตำแหน่งจัดเก็บ</span>
          <Select
            showSearch
            placeholder={row.warehouseId ? "เลือกตำแหน่งของสินค้านี้" : "เลือกคลังก่อน"}
            optionFilterProp="label"
            disabled={!(row.itemId && row.warehouseId)}
            loading={lotsForItemQuery.isLoading}
            value={row.locationId}
            style={{ width: "100%" }}
            options={locationOptions}
            onChange={(value) =>
              onChange({ ...row, locationId: value, lotId: undefined })
            }
          />
        </div>
      </div>
      <div className={styles.materialQtyRow}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Lot</span>
          <Select
            showSearch
            placeholder={
              row.itemId && row.warehouseId && row.locationId
                ? "เลือก Lot"
                : "เลือกสินค้า / คลัง / ตำแหน่งก่อน"
            }
            optionFilterProp="label"
            disabled={!(row.itemId && row.warehouseId && row.locationId)}
            loading={lotsQuery.isLoading}
            value={row.lotId}
            style={{ width: "100%" }}
            options={(lotsQuery.data?.data ?? []).map((lot) => ({
              value: lot.lotId,
              label: `${lot.lotNo} (คงเหลือ ${lot.quantityAvailable})`,
            }))}
            onChange={(value) => onChange({ ...row, lotId: value })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>จำนวนที่วางแผน</span>
          <InputNumber
            min={0.001}
            placeholder="0.000"
            style={{ width: "100%" }}
            value={row.plannedQty}
            onChange={(value) =>
              onChange({ ...row, plannedQty: value ?? undefined })
            }
          />
        </div>
        <Button
          danger
          icon={<DeleteOutlined />}
          className={styles.removeBtn}
          disabled={!removable}
          onClick={onRemove}
        >
          ลบ
        </Button>
      </div>
    </div>
  );
}

export default function ProductionOrderCreatePage() {
  const router = useRouter();
  const createMutation = useCreateProductionOrderMutation();

  const [productionDate, setProductionDate] = useState<Dayjs>(dayjs());
  const [batchNo, setBatchNo] = useState("");
  const [cycleTargetHours, setCycleTargetHours] = useState<number | null>(48);
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  const canSubmit =
    rows.length > 0 &&
    rows.every(
      (r) =>
        r.itemId &&
        r.unitId &&
        r.warehouseId &&
        r.locationId &&
        r.lotId &&
        r.plannedQty,
    );

  const handleSubmit = () => {
    const inputItems: CreateProductionOrderInputItemBody[] = rows.map((r) => ({
      itemId: r.itemId as string,
      warehouseId: r.warehouseId as string,
      locationId: r.locationId as string,
      lotId: r.lotId as string,
      unitId: r.unitId as string,
      plannedQty: r.plannedQty as number,
    }));

    createMutation.mutate(
      {
        productionDate: productionDate.format("YYYY-MM-DD"),
        batchNo: batchNo.trim() || undefined,
        cycleTargetHours: cycleTargetHours ?? undefined,
        remark: remark.trim() || undefined,
        inputItems,
      },
      {
        onSuccess: (response) => {
          router.push(`/production/production-orders/${response.data.id}`);
        },
      },
    );
  };

  return (
    <MasterPageGate>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.headerAccent} aria-hidden>
            <ExperimentOutlined />
          </div>
          <div className={styles.headerContent}>
            <Link
              href="/production/production-orders"
              className={styles.backLink}
            >
              <ArrowLeftOutlined /> กลับรายการ
            </Link>
            <p className={styles.eyebrow}>Production · Pyrolysis</p>
            <h1 className={styles.pageTitle}>สร้างใบสั่งผลิต</h1>
            <p className={styles.pageSubtitle}>
              ระบุวัตถุดิบและ Lot ที่จะใช้ — สถานะเริ่มต้น DRAFT
            </p>
          </div>
        </header>

        <section className={styles.formCard}>
          <h2 className={styles.sectionTitle}>ข้อมูลทั่วไป</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>วันที่ผลิต</span>
              <DatePicker
                style={{ width: "100%" }}
                value={productionDate}
                format="DD/MM/YYYY"
                onChange={(value) => value && setProductionDate(value)}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>เลข Batch (ไม่บังคับ)</span>
              <Input
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="BATCH-..."
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                Cycle เป้าหมาย (ชั่วโมง)
              </span>
              <InputNumber
                style={{ width: "100%" }}
                min={1}
                value={cycleTargetHours}
                onChange={setCycleTargetHours}
                placeholder="48"
              />
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>หมายเหตุ</span>
            <Input.TextArea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม..."
            />
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.materialsHeader}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              วัตถุดิบที่ใช้ผลิต ({rows.length} รายการ)
            </h2>
            <Button
              icon={<PlusOutlined />}
              className={styles.secondaryBtn}
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              เพิ่มวัตถุดิบ
            </Button>
          </div>
          <div className={styles.materialsList}>
            {rows.map((row, index) => (
              <MaterialRow
                key={row.key}
                row={row}
                index={index}
                removable={rows.length > 1}
                onChange={(next) =>
                  setRows((prev) =>
                    prev.map((r) => (r.key === row.key ? next : r)),
                  )
                }
                onRemove={() =>
                  setRows((prev) =>
                    prev.filter((r) => r.key !== row.key),
                  )
                }
              />
            ))}
          </div>
          <div className={styles.footerActions}>
            <Button
              className={styles.secondaryBtn}
              onClick={() => router.push("/production/production-orders")}
            >
              ยกเลิก
            </Button>
            <Button
              type="primary"
              className={styles.primaryBtn}
              disabled={!canSubmit}
              loading={createMutation.isPending}
              onClick={handleSubmit}
            >
              สร้างใบสั่งผลิต
            </Button>
          </div>
        </section>
      </div>
    </MasterPageGate>
  );
}
