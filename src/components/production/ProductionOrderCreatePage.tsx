"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Typography,
} from "antd";
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateProductionOrderMutation } from "@/hooks/production-orders/useProductionOrderMutations";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import type { CreateProductionOrderInputItemBody } from "@/types/production-order";
import masterStyles from "@/components/masters/shared/master-page.module.css";

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

function InputItemRow({
  row,
  onChange,
  onRemove,
  removable,
}: {
  row: Row;
  onChange: (row: Row) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const itemsQuery = useItemsQuery({ isActive: true, isStockItem: true });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    { warehouseId: row.warehouseId, isActive: true },
    { enabled: Boolean(row.warehouseId) },
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
  );

  return (
    <div className={masterStyles.formGrid} style={{ marginBottom: 12 }}>
      <Select
        showSearch
        placeholder="สินค้า (วัตถุดิบ)"
        optionFilterProp="label"
        loading={itemsQuery.isLoading}
        value={row.itemId}
        options={(itemsQuery.data?.data ?? []).map((item) => ({
          value: item.id,
          label: `${item.itemCode} — ${item.itemNameTh}`,
          unitId: item.unitId,
        }))}
        onChange={(value, option) => {
          const opt = option as { unitId?: string } | undefined;
          onChange({ ...row, itemId: value, unitId: opt?.unitId, lotId: undefined });
        }}
      />
      <Select
        showSearch
        placeholder="คลัง"
        optionFilterProp="label"
        loading={warehousesQuery.isLoading}
        value={row.warehouseId}
        options={(warehousesQuery.data?.data ?? []).map((w) => ({
          value: w.id,
          label: `${w.warehouseCode} — ${w.warehouseName}`,
        }))}
        onChange={(value) =>
          onChange({ ...row, warehouseId: value, locationId: undefined, lotId: undefined })
        }
      />
      <Select
        showSearch
        placeholder={row.warehouseId ? "ตำแหน่งจัดเก็บ" : "เลือกคลังก่อน"}
        optionFilterProp="label"
        disabled={!row.warehouseId}
        loading={locationsQuery.isLoading}
        value={row.locationId}
        options={(locationsQuery.data?.data ?? []).map((loc) => ({
          value: loc.id,
          label: `${loc.locationCode} — ${loc.locationName}`,
        }))}
        onChange={(value) => onChange({ ...row, locationId: value, lotId: undefined })}
      />
      <Select
        showSearch
        placeholder={
          row.itemId && row.warehouseId && row.locationId
            ? "เลือก Lot"
            : "เลือกสินค้า/คลัง/ตำแหน่งก่อน"
        }
        optionFilterProp="label"
        disabled={!(row.itemId && row.warehouseId && row.locationId)}
        loading={lotsQuery.isLoading}
        value={row.lotId}
        options={(lotsQuery.data?.data ?? []).map((lot) => ({
          value: lot.lotId,
          label: `${lot.lotNo} (คงเหลือ ${lot.quantityAvailable})`,
        }))}
        onChange={(value) => onChange({ ...row, lotId: value })}
      />
      <InputNumber
        min={0.001}
        placeholder="จำนวนที่วางแผน"
        style={{ width: "100%" }}
        value={row.plannedQty}
        onChange={(value) => onChange({ ...row, plannedQty: value ?? undefined })}
      />
      <Button danger icon={<DeleteOutlined />} disabled={!removable} onClick={onRemove}>
        ลบ
      </Button>
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
      (r) => r.itemId && r.unitId && r.warehouseId && r.locationId && r.lotId && r.plannedQty,
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
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>PO</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>PRODUCTION · PYROLYSIS</div>
            <h2 className={masterStyles.pageTitle}>สร้างใบสั่งผลิต</h2>
            <span className={masterStyles.pageSubtitle}>
              ระบุวัตถุดิบและ Lot ที่จะใช้ — สถานะเริ่มต้น DRAFT
            </span>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/production/production-orders")}
          >
            กลับรายการ
          </Button>
        </div>

        <div className={masterStyles.tableCard}>
          <div className={masterStyles.form}>
            <div className={masterStyles.formGrid}>
              <div>
                <Typography.Text>วันที่ผลิต</Typography.Text>
                <DatePicker
                  style={{ width: "100%" }}
                  value={productionDate}
                  format="DD/MM/YYYY"
                  onChange={(value) => value && setProductionDate(value)}
                />
              </div>
              <div>
                <Typography.Text>เลข Batch (ไม่บังคับ)</Typography.Text>
                <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
              </div>
              <div>
                <Typography.Text>Cycle เป้าหมาย (ชั่วโมง)</Typography.Text>
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  value={cycleTargetHours}
                  onChange={setCycleTargetHours}
                />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Typography.Text>หมายเหตุ</Typography.Text>
              <Input.TextArea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
            </div>

            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>วัตถุดิบที่ใช้ผลิต</Typography.Title>
              {rows.map((row) => (
                <InputItemRow
                  key={row.key}
                  row={row}
                  removable={rows.length > 1}
                  onChange={(next) =>
                    setRows((prev) => prev.map((r) => (r.key === row.key ? next : r)))
                  }
                  onRemove={() =>
                    setRows((prev) => prev.filter((r) => r.key !== row.key))
                  }
                />
              ))}
              <Button
                icon={<PlusOutlined />}
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
              >
                เพิ่มวัตถุดิบ
              </Button>
            </div>

            <div style={{ marginTop: 20 }}>
              <Button
                type="primary"
                className={masterStyles.createButton}
                disabled={!canSubmit}
                loading={createMutation.isPending}
                onClick={handleSubmit}
              >
                สร้างใบสั่งผลิต
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
