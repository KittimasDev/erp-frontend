"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Table,
  Tooltip,
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
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import {
  useInventoryLotsQuery,
  useStockBalancesByItemQuery,
} from "@/hooks/inventory/useInventoryQueries";
import { useProductionRequestQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import type {
  CreateProductionOrderInputItemBody,
  CreateProductionOrderPlanLineBody,
} from "@/types/production-order";
import { ProductionOrderPlanLineType } from "@/types/production-order";
import styles from "./ProductionOrderCreatePage.module.css";

export type Row = {
  key: number;
  itemId?: string;
  unitId?: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  plannedQty?: number;
};

export type PlanRow = {
  key: number;
  itemId?: string;
  unitId?: string;
  plannedQty?: number;
};

/** ดาวแดงหลังชื่อช่องที่ต้องกรอก — ให้เห็นตั้งแต่ก่อนกดปุ่มว่าอะไรบังคับ */
function Required() {
  return (
    <span aria-hidden style={{ color: "#d4380d", marginLeft: 2 }}>
      *
    </span>
  );
}

let rowKeySeq = 1;
export function emptyRow(): Row {
  return { key: rowKeySeq++ };
}

export function emptyPlanRow(): PlanRow {
  return { key: rowKeySeq++ };
}

export function MaterialRow({
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
  const itemsQuery = useItemsQuery({
    isActive: true,
    isStockItem: true,
    itemCategoryCode: "RAW_MATERIAL",
  });
  // ยอดคงเหลือรวมต่อสินค้า — ใช้ปิดตัวเลือกที่ไม่มีของ (เลือกไปก็ไม่มี Lot ให้เลือกต่อ)
  const stockByItemQuery = useStockBalancesByItemQuery({ hasStock: true });
  const availableByItemId = useMemo(
    () =>
      new Map(
        (stockByItemQuery.data?.data ?? []).map((balance) => [
          balance.itemId,
          Number(balance.totalQuantityAvailable) || 0,
        ]),
      ),
    [stockByItemQuery.data],
  );
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
          <span className={styles.fieldLabel}>สินค้า (วัตถุดิบ)<Required /></span>
          <Select
            showSearch
            placeholder="เลือกสินค้า"
            optionFilterProp="label"
            loading={itemsQuery.isLoading || stockByItemQuery.isLoading}
            value={row.itemId}
            style={{ width: "100%" }}
            options={(itemsQuery.data?.data ?? []).map((item) => {
              const available = availableByItemId.get(item.id) ?? 0;
              // อ่านยอดคงเหลือไม่ได้ (สิทธิ์/เน็ตล่ม) = ไม่ปิดตัวเลือก
              // ปล่อยให้ backend ตรวจตอนบันทึก ดีกว่าปิดทั้งลิสต์
              const outOfStock = stockByItemQuery.isSuccess && available <= 0;
              return {
                value: item.id,
                // ของหมดยังโชว์ในลิสต์แต่กดไม่ได้ — ให้รู้ว่ามีสินค้านี้แต่ไม่มีของให้เบิก
                label: `${item.itemCode} — ${item.itemNameTh}${
                  outOfStock
                    ? " (ไม่มีสต๊อก)"
                    : stockByItemQuery.isSuccess
                      ? ` (คงเหลือ ${available.toLocaleString("th-TH")})`
                      : ""
                }`,
                unitId: item.unitId,
                disabled: outOfStock,
              };
            })}
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
          <span className={styles.fieldLabel}>คลัง<Required /></span>
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
          <span className={styles.fieldLabel}>ตำแหน่งจัดเก็บ<Required /></span>
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
          <span className={styles.fieldLabel}>Lot<Required /></span>
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
          <span className={styles.fieldLabel}>จำนวนที่วางแผน<Required /></span>
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

export function PlanLineRow({
  row,
  index,
  onChange,
  onRemove,
  removable,
  stockItemsOnly = false,
  itemCategoryCode,
}: {
  row: PlanRow;
  index: number;
  onChange: (row: PlanRow) => void;
  onRemove: () => void;
  removable: boolean;
  stockItemsOnly?: boolean;
  /** กรองหมวดสินค้า เช่น FINISHED_GOODS สำหรับผลผลิต */
  itemCategoryCode?: string;
}) {
  const itemsQuery = useItemsQuery({
    isActive: true,
    ...(stockItemsOnly ? { isStockItem: true } : {}),
    ...(itemCategoryCode ? { itemCategoryCode } : {}),
  });
  const unitsQuery = useUnitsQuery();

  return (
    <div className={styles.materialCard}>
      <span className={styles.materialCardNo}>{index + 1}</span>
      <div className={styles.materialGrid}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>สินค้า<Required /></span>
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
                unitId: opt?.unitId ?? row.unitId,
              });
            }}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>หน่วยนับ<Required /></span>
          <Select
            showSearch
            placeholder="เลือกหน่วย"
            optionFilterProp="label"
            loading={unitsQuery.isLoading}
            value={row.unitId}
            style={{ width: "100%" }}
            options={(unitsQuery.data?.data ?? []).map((unit) => ({
              value: unit.id,
              label: `${unit.code} — ${unit.nameTh}`,
            }))}
            onChange={(value) => onChange({ ...row, unitId: value })}
          />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>จำนวนที่วางแผน<Required /></span>
          <InputNumber
            min={0.001}
            style={{ width: "100%" }}
            value={row.plannedQty}
            onChange={(value) =>
              onChange({ ...row, plannedQty: value ?? undefined })
            }
          />
        </div>
      </div>
      {removable ? (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={onRemove}
          aria-label="ลบรายการ"
        />
      ) : null}
    </div>
  );
}

export default function ProductionOrderCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productionRequestId =
    searchParams.get("productionRequestId") ?? undefined;
  const createMutation = useCreateProductionOrderMutation();

  const requestQuery = useProductionRequestQuery(productionRequestId);
  const productionRequest = requestQuery.data?.data;

  const [productionDate, setProductionDate] = useState<Dayjs>(dayjs());
  const [batchNo, setBatchNo] = useState("");
  const [cycleTargetHours, setCycleTargetHours] = useState<number | null>(48);
  const [plannedLaborHours, setPlannedLaborHours] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [outputRows, setOutputRows] = useState<PlanRow[]>([emptyPlanRow()]);
  const [wasteRows, setWasteRows] = useState<PlanRow[]>([]);
  /**
   * เติมแผนผลผลิตจากใบขอผลิตครั้งเดียว — ปรับ state ตอน render แทน effect
   * ใช้ตัวใบขอผลิตที่ sync แล้วเป็นตัวกันซ้ำ แทน flag boolean แยก
   * (เดิมเป็น effect จึงเห็นตารางว่างหนึ่งเฟรมก่อนค่าจะเด้งขึ้นมา)
   */
  const [prefilledRequest, setPrefilledRequest] = useState<
    typeof productionRequest | null
  >(null);
  if (productionRequest?.items?.length && prefilledRequest !== productionRequest) {
    setPrefilledRequest(productionRequest);
    setOutputRows(
      productionRequest.items.map((item) => ({
        key: rowKeySeq++,
        itemId: item.itemId,
        unitId: item.unitId,
        plannedQty: Number(item.requestedQty),
      })),
    );
  }

  /**
   * รายการช่องที่ยังกรอกไม่ครบ — บอกเป็นข้อความว่าขาดอะไรตรงไหน
   * ไม่ใช่แค่ปิดปุ่มเฉย ๆ ให้ผู้ใช้เดาเอง
   */
  const missingFields: string[] = [];

  if (rows.length === 0) {
    missingFields.push("วัตถุดิบที่ต้องใช้: ต้องมีอย่างน้อย 1 รายการ");
  }
  rows.forEach((row, index) => {
    const gaps: string[] = [];
    if (!row.itemId) gaps.push("สินค้า (วัตถุดิบ)");
    if (!row.warehouseId) gaps.push("คลัง");
    if (!row.locationId) gaps.push("ตำแหน่งจัดเก็บ");
    if (!row.lotId) gaps.push("Lot");
    if (!row.unitId) gaps.push("หน่วยนับ");
    if (!row.plannedQty) gaps.push("จำนวนที่วางแผน");
    if (gaps.length) {
      missingFields.push(
        `วัตถุดิบรายการที่ ${index + 1}: ยังขาด ${gaps.join(" · ")}`,
      );
    }
  });

  const collectPlanGaps = (row: PlanRow) => {
    const gaps: string[] = [];
    if (!row.itemId) gaps.push("สินค้า");
    if (!row.unitId) gaps.push("หน่วยนับ");
    if (!row.plannedQty) gaps.push("จำนวนที่วางแผน");
    return gaps;
  };

  if (outputRows.length === 0) {
    missingFields.push("ผลผลิตที่คาดว่าจะได้: ต้องมีอย่างน้อย 1 รายการ");
  }
  outputRows.forEach((row, index) => {
    const gaps = collectPlanGaps(row);
    if (gaps.length) {
      missingFields.push(
        `ผลผลิตรายการที่ ${index + 1}: ยังขาด ${gaps.join(" · ")}`,
      );
    }
  });

  wasteRows.forEach((row, index) => {
    const gaps = collectPlanGaps(row);
    if (gaps.length) {
      missingFields.push(
        `ของเสียรายการที่ ${index + 1}: ยังขาด ${gaps.join(" · ")} (ถ้าไม่ต้องการวางแผนของเสีย กดลบรายการทิ้งได้)`,
      );
    }
  });

  const canSubmit = missingFields.length === 0;

  const handleSubmit = () => {
    const inputItems: CreateProductionOrderInputItemBody[] = rows.map((r) => ({
      itemId: r.itemId as string,
      warehouseId: r.warehouseId as string,
      locationId: r.locationId as string,
      lotId: r.lotId as string,
      unitId: r.unitId as string,
      plannedQty: r.plannedQty as number,
    }));

    const planLines: CreateProductionOrderPlanLineBody[] = [
      ...outputRows.map((r, index) => ({
        lineType: ProductionOrderPlanLineType.OUTPUT,
        itemId: r.itemId as string,
        unitId: r.unitId as string,
        plannedQty: r.plannedQty as number,
        sortOrder: index,
      })),
      ...wasteRows.map((r, index) => ({
        lineType: ProductionOrderPlanLineType.WASTE,
        itemId: r.itemId as string,
        unitId: r.unitId as string,
        plannedQty: r.plannedQty as number,
        sortOrder: outputRows.length + index,
      })),
    ];

    createMutation.mutate(
      {
        productionDate: productionDate.format("YYYY-MM-DD"),
        productionRequestId,
        batchNo: batchNo.trim() || undefined,
        cycleTargetHours: cycleTargetHours ?? undefined,
        plannedLaborHours: plannedLaborHours ?? undefined,
        remark: remark.trim() || undefined,
        planLines,
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

        {productionRequestId ? (
          <section className={styles.formCard}>
            <h2 className={styles.sectionTitle}>ใบขอผลิตต้นทาง</h2>
            {productionRequest ? (
              <>
                <Alert
                  type={productionRequest.sourceSoCancelled ? "warning" : "info"}
                  showIcon
                  title={`${productionRequest.requestNo} · อ้างอิงใบสั่งขาย ${
                    productionRequest.soNo ?? "-"
                  }`}
                  description={
                    productionRequest.sourceSoCancelled
                      ? "ใบสั่งขายต้นทางถูกยกเลิกแล้ว — โปรดพิจารณาก่อนเปิดใบสั่งผลิต ผลผลิตที่ได้จะรับเข้าสต๊อกกลาง ไม่ผูกกับ SO เดิม"
                      : "เมื่อสร้างใบสั่งผลิตแล้ว ใบขอผลิตจะแสดงเป็น “ยังไม่เริ่มผลิต” จนกว่าจะกดเริ่มผลิต"
                  }
                  style={{ marginBottom: 12 }}
                />
                <Table
                  size="small"
                  rowKey="id"
                  pagination={false}
                  dataSource={productionRequest.items}
                  columns={[
                    {
                      title: "สินค้าที่ขอผลิต",
                      key: "item",
                      render: (_, row) =>
                        `${row.itemCode ?? "-"} — ${row.itemNameTh ?? ""}`,
                    },
                    {
                      title: "จำนวนที่ขอ",
                      key: "qty",
                      align: "right",
                      render: (_, row) =>
                        `${Number(row.requestedQty).toLocaleString("th-TH", {
                          maximumFractionDigits: 3,
                        })} ${row.unitCode ?? ""}`,
                    },
                  ]}
                />
              </>
            ) : (
              <Alert
                type="info"
                showIcon
                title="กำลังโหลดข้อมูลใบขอผลิต..."
              />
            )}
          </section>
        ) : null}

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
            <div className={styles.field}>
              <span className={styles.fieldLabel}>
                ชั่วโมงแรงงานที่วางแผน
              </span>
              <InputNumber
                style={{ width: "100%" }}
                min={0.01}
                value={plannedLaborHours}
                onChange={setPlannedLaborHours}
                placeholder="เช่น 24"
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
              วัตถุดิบที่ต้องใช้ ({rows.length} รายการ)
            </h2>
            <Button
              icon={<PlusOutlined />}
              className={styles.secondaryBtn}
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              เพิ่มวัตถุดิบ
            </Button>
          </div>
          <p className={styles.sectionHint}>
            ทุกแถวต้องเลือกให้ครบ: สินค้า · คลัง · ตำแหน่งจัดเก็บ · Lot ·
            จำนวนที่วางแผน (ช่องที่มี <Required />) — เลือกไล่จากซ้ายไปขวา
            เพราะคลัง/ตำแหน่ง/Lot จะขึ้นตามสินค้าที่เลือก
          </p>
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
        </section>

        <section className={styles.formCard}>
          <div className={styles.materialsHeader}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              ผลผลิตที่คาดว่าจะได้ ({outputRows.length} รายการ)
            </h2>
            <Button
              icon={<PlusOutlined />}
              className={styles.secondaryBtn}
              onClick={() => setOutputRows((prev) => [...prev, emptyPlanRow()])}
            >
              เพิ่มผลผลิต
            </Button>
          </div>
          <p className={styles.sectionHint}>
            ประมาณการผลผลิต — ใช้เทียบ yield กับของจริงที่รับเข้าคลังภายหลัง ·
            ต้องมีอย่างน้อย 1 รายการ และทุกแถวต้องครบ สินค้า · หน่วยนับ ·
            จำนวนที่วางแผน
          </p>
          <div className={styles.materialsList}>
            {outputRows.map((row, index) => (
              <PlanLineRow
                key={row.key}
                row={row}
                index={index}
                removable={outputRows.length > 1}
                itemCategoryCode="FINISHED_GOODS"
                onChange={(next) =>
                  setOutputRows((prev) =>
                    prev.map((r) => (r.key === row.key ? next : r)),
                  )
                }
                onRemove={() =>
                  setOutputRows((prev) => prev.filter((r) => r.key !== row.key))
                }
              />
            ))}
          </div>
        </section>

        <section className={styles.formCard}>
          <div className={styles.materialsHeader}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              ของเสีย (ถ้ามี) ({wasteRows.length} รายการ)
            </h2>
            <Button
              icon={<PlusOutlined />}
              className={styles.secondaryBtn}
              onClick={() => setWasteRows((prev) => [...prev, emptyPlanRow()])}
            >
              เพิ่มของเสีย
            </Button>
          </div>
          <p className={styles.sectionHint}>
            ของเสียไม่เข้าสต๊อก — บันทึกจำนวนจริงตอนยืนยันเสร็จสิ้นการผลิต
          </p>
          <div className={styles.materialsList}>
            {wasteRows.length === 0 ? (
              <Alert
                type="info"
                showIcon
                title="ไม่มีของเสียในรอบนี้ — กดปุ่ม “เพิ่มของเสีย” ถ้าต้องการวางแผน"
              />
            ) : (
              wasteRows.map((row, index) => (
                <PlanLineRow
                  key={row.key}
                  row={row}
                  index={index}
                  removable
                  onChange={(next) =>
                    setWasteRows((prev) =>
                      prev.map((r) => (r.key === row.key ? next : r)),
                    )
                  }
                  onRemove={() =>
                    setWasteRows((prev) => prev.filter((r) => r.key !== row.key))
                  }
                />
              ))
            )}
          </div>
          {canSubmit ? null : (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
              title="ยังกรอกไม่ครบ — เติมให้ครบก่อนถึงจะสร้างใบสั่งผลิตได้"
              description={
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {missingFields.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
              }
            />
          )}

          <div className={styles.footerActions}>
            <Button
              className={styles.secondaryBtn}
              onClick={() => router.push("/production/production-orders")}
            >
              ยกเลิก
            </Button>
            <Tooltip
              title={
                canSubmit ? "" : "ยังกรอกไม่ครบ — ดูรายการที่ขาดด้านบน"
              }
            >
              <span>
                <Button
                  type="primary"
                  className={styles.primaryBtn}
                  disabled={!canSubmit}
                  loading={createMutation.isPending}
                  onClick={handleSubmit}
                >
                  สร้างใบสั่งผลิต
                </Button>
              </span>
            </Tooltip>
          </div>
        </section>
      </div>
    </MasterPageGate>
  );
}
