"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  App,
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
import { useProductionFormulasQuery } from "@/hooks/production-formulas/useProductionFormulaQueries";
import {
  describeMerge,
  mergeFormulaInputRows,
  mergeFormulaPlanRows,
} from "@/lib/production/formulaRowMerge";
import ProductionFormulaPlannerPanel, {
  type FormulaPlanResult,
} from "./ProductionFormulaPlannerPanel";
import {
  useConsolidatedCreateProductionOrderMutation,
  useCreateProductionOrderMutation,
} from "@/hooks/production-orders/useProductionOrderMutations";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import FormulaReferenceCards from "./FormulaReferenceCards";
import MachineSelectionCard from "./MachineSelectionCard";
import ProductionRequestPickerModal from "./ProductionRequestPickerModal";
import SelectedProductionRequestsCard, {
  selectionKeyOf,
  type SelectionLabel,
} from "./SelectedProductionRequestsCard";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useDomainConvertsUnits } from "@/hooks/unit-conversions/useDomainConvertsUnits";
import { useUnitOptionContext } from "@/hooks/unit-conversions/useUnitOptionContext";
import {
  buildUnitSelectOptions,
  type UnitOptionContext,
} from "@/lib/units/unitSelectOptions";
import { useStockBalancesByItemQuery } from "@/hooks/inventory/useInventoryQueries";
import { useProductionRequestQuery } from "@/hooks/production-requests/useProductionRequestQueries";
import type {
  BulkCreateProductionOrderSelectionBody,
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

/**
 * ออกเลข key ถัดไปให้แถว — **ต้องใช้ตัวนับเดียวกับ `emptyRow()`**
 *
 * ตัว merge จากสูตรอยู่ไฟล์อื่นแต่ห้ามออก key ด้วย `Date.now()`/`Math.random()`
 * เพราะ key ชนกันแล้ว React จะสลับแถว และ `MaterialRow` แต่ละตัวถือ query
 * ของ Lot อยู่ การ remount จะทำให้ตัวเลือก Lot ว่างไปหนึ่งจังหวะ
 */
export function nextRowKey(): number {
  return rowKeySeq++;
}

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
  /*
    เปิดหลายหมวด — ตรวจข้อมูลจริง 2026-09-08 พบว่าวัตถุดิบที่ **เคยเบิกเข้าผลิตจริง**
    มาจาก 4 หมวด (RAW_MATERIAL, CHEMICAL, CONSUMABLE, FINISHED_GOODS) แต่เดิม
    กรองเหลือ RAW_MATERIAL หมวดเดียวซึ่งมีสินค้าแค่ 2 ตัวทั้งฐานข้อมูล ·
    สูตรที่มีสารเคมีจะเติมบรรทัดที่เลือกสินค้าไม่ได้เลยถ้าไม่เปิดหมวดนี้
  */
  const itemsQuery = useItemsQuery({
    isActive: true,
    isStockItem: true,
    itemCategoryCode: "RAW_MATERIAL,CHEMICAL,CONSUMABLE,PACKAGING",
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
              return {
                value: item.id,
                label: `${item.itemCode} — ${item.itemNameTh}${
                  stockByItemQuery.isSuccess
                    ? ` (คงเหลือ ${available.toLocaleString("th-TH")})`
                    : ""
                }`,
                unitId: item.unitId,
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
        <div className={styles.field}>
          <span className={styles.fieldLabel}>สถานะสต๊อกรวม</span>
          {(() => {
            if (!row.itemId || !row.plannedQty) {
              return (
                <span style={{ color: "#8c8c8c", fontSize: 13 }}>—</span>
              );
            }
            if (!stockByItemQuery.isSuccess) {
              return (
                <span style={{ color: "#8c8c8c", fontSize: 13 }}>
                  กำลังโหลด…
                </span>
              );
            }
            const available = availableByItemId.get(row.itemId) ?? 0;
            const planned = Number(row.plannedQty) || 0;
            const shortfall = Math.max(0, planned - available);
            if (shortfall <= 1e-9) {
              return (
                <span style={{ color: "#739816", fontWeight: 600, fontSize: 13 }}>
                  เพียงพอ (คงเหลือ {available.toLocaleString("th-TH")})
                </span>
              );
            }
            return (
              <span style={{ color: "#cf1322", fontWeight: 600, fontSize: 13 }}>
                ไม่เพียงพอ · ขาด {shortfall.toLocaleString("th-TH")}
                {" "}(คงเหลือ {available.toLocaleString("th-TH")})
              </span>
            );
          })()}
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
      <p style={{ margin: "0 0 0 36px", color: "#8c8c8c", fontSize: 12 }}>
        ไม่ต้องเลือกคลัง/Lot ตอนสร้าง — เลือกตอนยืนยันบันทึกกะเพื่อตัดสต๊อก
      </p>
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
  isFinishedGood,
  unitCtx,
}: {
  row: PlanRow;
  index: number;
  onChange: (row: PlanRow) => void;
  onRemove: () => void;
  removable: boolean;
  stockItemsOnly?: boolean;
  /** กรองหมวดสินค้า เช่น RAW_MATERIAL สำหรับวัตถุดิบ */
  itemCategoryCode?: string;
  /** กรองสินค้าสำเร็จรูป สำหรับผลผลิต */
  isFinishedGood?: boolean;
  /** ก้อนกฎแปลงหน่วย — parent สร้างครั้งเดียวแล้วส่งลงมา เพื่อให้ graphCache ถูกแชร์ */
  unitCtx: UnitOptionContext & { isLoading: boolean };
}) {
  const itemsQuery = useItemsQuery({
    isActive: true,
    ...(stockItemsOnly ? { isStockItem: true } : {}),
    ...(itemCategoryCode ? { itemCategoryCode } : {}),
    ...(isFinishedGood !== undefined ? { isFinishedGood } : {}),
  });

  const itemList = itemsQuery.data?.data ?? [];
  const baseUnitId = row.itemId
    ? itemList.find((item) => item.id === row.itemId)?.unitId
    : undefined;
  /*
    dropdown หน่วยเสนอเท่าที่ backend โดเมนนี้รับได้ — ใบสั่งผลิตแปลงหน่วยแล้ว
    (resolvePlanLines / resolveInputLines เรียก resolveLinesToBase) จึงเสนอหน่วยที่
    เดินกฎแปลงถึงได้ · สวิตช์ระดับระบบปิด = เหลือหน่วยหลักตัวเดียวเหมือนเดิม
  */
  const canPickUnit = useDomainConvertsUnits("PRODUCTION_ORDERS");
  const unitField = buildUnitSelectOptions(unitCtx, {
    itemId: row.itemId,
    baseUnitId,
    currentUnitId: row.unitId,
    allowConvertible: canPickUnit,
  });

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
            options={itemList.map((item) => ({
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
            optionFilterProp="title"
            loading={unitCtx.isLoading}
            value={row.unitId}
            style={{ width: "100%" }}
            {...unitField}
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
  const { modal } = App.useApp();
  const searchParams = useSearchParams();
  const productionRequestId =
    searchParams.get("productionRequestId") ?? undefined;
  const createMutation = useCreateProductionOrderMutation();

  const requestQuery = useProductionRequestQuery(productionRequestId);
  const productionRequest = requestQuery.data?.data;

  const [productionDateRange, setProductionDateRange] = useState<
    [Dayjs, Dayjs]
  >([dayjs(), dayjs()]);
  const productionDayCount =
    productionDateRange[1].diff(productionDateRange[0], "day") + 1;
  const [multiplyByProductionDays, setMultiplyByProductionDays] =
    useState(false);
  const [batchNo, setBatchNo] = useState("");
  const [cycleTargetHours, setCycleTargetHours] = useState<number | null>(48);
  const [plannedLaborHours, setPlannedLaborHours] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [outputRows, setOutputRows] = useState<PlanRow[]>([emptyPlanRow()]);
  // สร้างครั้งเดียวต่อหน้า แล้วส่งให้ทุกแถว เพื่อให้ graphCache ของกฎแปลงถูกแชร์
  const unitCtx = useUnitOptionContext();
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

  // ─── วางแผนจากสูตรการผลิต ───────────────────────────────────────────────
  const formulasQuery = useProductionFormulasQuery({ isActive: true });
  const formulas = useMemo(
    () => formulasQuery.data?.data ?? [],
    [formulasQuery.data],
  );
  const [formulaId, setFormulaId] = useState<string | undefined>();
  // formulaEquipmentId → equipmentId ที่ผู้ใช้เลือกแทน (ไม่มี key = ใช้ตามสูตร) — เปลี่ยนสูตรแล้วล้าง
  const [machineChoices, setMachineChoices] = useState<Record<string, string>>({});
  const [driverLineId, setDriverLineId] = useState<string | undefined>();
  const [targetQty, setTargetQty] = useState<number | null>(null);
  /** ที่มาของแผนที่ถูกเติมลงฟอร์มแล้ว — ส่งไปเก็บบนใบตอนบันทึก */
  const [appliedPlan, setAppliedPlan] = useState<{
    formulaId: string;
    targetQty: number;
    driverItemId: string;
  } | null>(null);

  // ─── ใบขอผลิตที่จะผลิตรอบนี้ ──────────────────────────────────────────────
  const requestActions = useScreenActionPermissions("PRODUCTION_REQUESTS");
  const consolidatedMutation = useConsolidatedCreateProductionOrderMutation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selections, setSelections] = useState<
    BulkCreateProductionOrderSelectionBody[]
  >([]);
  /*
    ชื่อที่อ่านออกของแต่ละใบ — `selections` เก็บแค่ id ตาม DTO · เก็บ label คู่กันไว้
    ตอนเลือก จะได้ไม่ต้องยิง planning-summary ซ้ำเพียงเพื่อวาดตารางสรุป
  */
  const [selectionLabels, setSelectionLabels] = useState<
    Record<string, SelectionLabel>
  >({});

  /**
   * เติมค่าจากสูตรลงแถว — **จับคู่ด้วยสินค้า ไม่ล้างทั้งชุด**
   *
   * ถามยืนยันก่อนเฉพาะเมื่อฟอร์มมีข้อมูลอยู่แล้ว · ฟอร์มว่างเปล่าเติมได้เลย
   * ไม่ต้องกวนผู้ใช้ · คลัง/ตำแหน่ง/Lot ของแถวที่จับคู่ได้ไม่ถูกล้าง
   */
  const applyFormulaPlan = (plan: FormulaPlanResult) => {
    const inputMerge = mergeFormulaInputRows(rows, plan.inputs, nextRowKey);
    const outputMerge = mergeFormulaPlanRows(
      outputRows,
      plan.outputs,
      nextRowKey,
    );
    const wasteMerge = mergeFormulaPlanRows(wasteRows, plan.wastes, nextRowKey);

    const commit = () => {
      setRows(inputMerge.rows as Row[]);
      setOutputRows(outputMerge.rows as PlanRow[]);
      setWasteRows(wasteMerge.rows as PlanRow[]);
      setAppliedPlan({
        formulaId: plan.formulaId,
        targetQty: plan.targetQty,
        driverItemId: plan.driverItemId,
      });
    };

    const hasExistingData =
      rows.some((row) => row.itemId) ||
      outputRows.some((row) => row.itemId) ||
      wasteRows.some((row) => row.itemId);

    if (!hasExistingData) {
      commit();
      return;
    }

    modal.confirm({
      title: "เติมค่าจากสูตรลงฟอร์ม",
      okText: "เติมเลย",
      cancelText: "ยกเลิก",
      content: (
        <div>
          <p style={{ marginTop: 0 }}>
            {describeMerge([
              inputMerge.summary,
              outputMerge.summary,
              wasteMerge.summary,
            ])}
          </p>
          <p style={{ color: "#8a9199", fontSize: 12, marginBottom: 0 }}>
            คลัง ตำแหน่ง และ Lot ของแถวที่มีอยู่แล้วจะไม่ถูกล้าง
          </p>
        </div>
      ),
      onOk: commit,
    });
  };

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

  /*
    ใบขอผลิตที่เลือกไว้ต้องมีสินค้าอยู่ในบรรทัดผลผลิตของใบนี้ด้วย

    `resolvePlanningSelections()` ฝั่ง backend ตรวจแค่ว่าสินค้าตรงกับบรรทัดในใบขอผลิต
    และจำนวนไม่เกินยอดค้าง — **ไม่ได้ตรวจว่าใบสั่งผลิตนี้ผลิตสินค้านั้นจริงไหม** ·
    ถ้าปล่อยไว้จะสร้างใบที่จัดสรรน้ำมันให้ลูกค้า ทั้งที่แผนของใบไม่มีน้ำมันเลย
    แล้ว `fulfilled_qty` ของ source line นั้นจะไม่มีวันขยับ กลายเป็นยอดค้างผีที่หาไม่เจอ
  */
  const plannedOutputItemIds = new Set(
    outputRows.map((row) => row.itemId).filter(Boolean),
  );
  const unplannedSelections = selections.filter(
    (selection) => !plannedOutputItemIds.has(selection.itemId),
  );
  if (unplannedSelections.length > 0) {
    const names = unplannedSelections
      .map(
        (selection) =>
          selectionLabels[selectionKeyOf(selection)]?.itemLabel ??
          selection.itemId,
      )
      .join(" · ");
    missingFields.push(
      `ใบขอผลิตที่เลือกขอ ${names} แต่แผนผลผลิตของใบนี้ยังไม่มีสินค้านั้น — เพิ่มลงในผลผลิตที่คาดว่าจะได้ หรือเอาใบขอผลิตนั้นออก`,
    );
  }

  const canSubmit = missingFields.length === 0;

  /*
    เลือกสูตรไว้แต่ยังไม่ได้กด "ใช้ค่านี้เป็นแผน"

    ที่มาของสูตรถูกบันทึกลงใบตอนกดปุ่มนั้นเท่านั้น — ตั้งใจให้เป็นอย่างนั้น เพราะการกดปุ่ม
    คือการยืนยันว่าจะเอาค่าจากสูตรมาทับแถวข้างล่าง · แต่คนที่เลือกสูตรแล้วพิมพ์เอง
    จะได้ใบที่ "ไม่รู้จักสูตร" โดยไม่มีอะไรบอก แล้วไปงงทีหลังตอนเปิดดูว่าทำไมไม่มีสูตร

    **เตือนอย่างเดียว ไม่บล็อก** — กรอกเองทั้งใบเป็นการใช้งานที่ถูกต้อง
  */
  const formulaPickedButNotApplied = Boolean(
    formulaId && appliedPlan?.formulaId !== formulaId,
  );

  const handleSubmit = () => {
    const inputItems: CreateProductionOrderInputItemBody[] = rows.map((r) => ({
      itemId: r.itemId as string,
      unitId: r.unitId as string,
      plannedQty: r.plannedQty as number,
      ...(r.warehouseId ? { warehouseId: r.warehouseId } : {}),
      ...(r.locationId ? { locationId: r.locationId } : {}),
      ...(r.lotId ? { lotId: r.lotId } : {}),
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

    /*
      ที่มาของแผน — เก็บไว้ให้ตอบได้ว่าทำไมใบนี้ประมาณการเท่านี้ แม้สูตรจะถูกแก้
      ภายหลัง (backend เก็บเลขรุ่นของสูตรให้เองจาก id ที่ส่งไป)
    */
    const appliedFormula = formulas.find(
      (formula) => formula.id === appliedPlan?.formulaId,
    );
    const machineBody = (appliedFormula?.recordingConfig?.equipmentIds ?? [])
      .filter((id) => machineChoices[id] && machineChoices[id] !== id)
      .map((id) => ({ formulaEquipmentId: id, equipmentId: machineChoices[id] }));
    const formulaProvenance = {
      productionFormulaId: appliedPlan?.formulaId,
      formulaTargetQty: appliedPlan?.targetQty,
      formulaDriverItemId: appliedPlan?.driverItemId || undefined,
      ...(machineBody.length > 0 ? { machines: machineBody } : {}),
    };

    const goToOrder = {
      onSuccess: (response: { data: { id: string } }) => {
        router.push(`/production/production-orders/${response.data.id}`);
      },
    };

    /*
      สองเส้นทางบันทึกโดยตั้งใจ — ไม่ใช่โค้ดซ้ำ

      เลือกใบขอผลิตจาก popup → `/consolidated` ซึ่งเขียน `production_order_source_lines`
      ให้ครบทุกใบ และกันเปิดใบซ้ำให้ด้วย

      ไม่ได้เลือก (รวมกรณีเข้ามาจากปุ่ม "เปิดใบสั่งผลิตจากใบขอผลิตนี้" ที่ส่ง
      `?productionRequestId=` มา) → เส้นเดิมที่ผูกผ่านคอลัมน์หัวเอกสาร · เส้นเดิม
      **ยอมให้เปิดใบสั่งผลิตใบที่สองจากใบขอผลิตเดิมได้** ซึ่งเส้นรวมไม่ยอม —
      บังคับทุกอย่างไปเส้นรวมจะเป็นการเปลี่ยนกฎธุรกิจที่ไม่มีใครสั่ง
    */
    const productionDate = productionDateRange[0].format("YYYY-MM-DD");
    const productionDateEnd = productionDateRange[1].format("YYYY-MM-DD");

    if (selections.length > 0) {
      consolidatedMutation.mutate(
        {
          productionDate,
          productionDateEnd,
          batchNo: batchNo.trim() || undefined,
          cycleTargetHours: cycleTargetHours ?? undefined,
          plannedLaborHours: plannedLaborHours ?? undefined,
          remark: remark.trim() || undefined,
          ...formulaProvenance,
          // ส่งแผนทั้งชุด (ผลผลิต + ของเสีย) เพื่อให้แผนของรอบชนะผลรวมของใบที่เลือก
          sharedPlanLines: planLines,
          inputItems,
          selections,
        },
        goToOrder,
      );
      return;
    }

    createMutation.mutate(
      {
        productionDate,
        productionDateEnd,
        productionRequestId,
        batchNo: batchNo.trim() || undefined,
        cycleTargetHours: cycleTargetHours ?? undefined,
        plannedLaborHours: plannedLaborHours ?? undefined,
        remark: remark.trim() || undefined,
        ...formulaProvenance,
        planLines,
        inputItems,
      },
      goToOrder,
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
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
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
              <DatePicker.RangePicker
                style={{ width: "100%" }}
                allowEmpty={[false, false]}
                value={productionDateRange}
                format="DD/MM/YYYY"
                onChange={(value) => {
                  if (value?.[0] && value[1]) {
                    setProductionDateRange([value[0], value[1]]);
                    if (value[1].diff(value[0], "day") + 1 <= 1) {
                      setMultiplyByProductionDays(false);
                    }
                  }
                }}
              />
              <span style={{ fontSize: 12, color: "#8a9199", marginTop: 4 }}>
                จำนวนวันผลิต: {productionDayCount} วัน
                {productionDayCount === 1 ? " (เลือกวันเดียวหรือช่วงเดียวกันได้)" : ""}
              </span>
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

        {/*
          บล็อกวางแผน — วางไว้เหนือส่วนวัตถุดิบ เพราะเป็นขั้นที่ทำก่อน
          ซ้าย = การ์ดสูตรให้เทียบเห็นพร้อมกัน · ขวา = เลือกจำนวน เห็นประมาณการ
          แล้วเลือกใบขอผลิตที่จะจัดสรรให้ · เฉพาะบล็อกนี้ที่เป็นสองคอลัมน์
          ส่วนที่เหลือของฟอร์มยังเต็มความกว้างเหมือนเดิม
        */}
        <div className={styles.planningGrid}>
          <FormulaReferenceCards
            formulas={formulas}
            loading={formulasQuery.isFetching}
            selectedId={formulaId}
            onSelect={(id) => {
              setFormulaId(id);
              // ตั้งตัวตั้งให้เหมือนตอนเลือกจาก dropdown — บรรทัดที่ติ๊กไว้ ไม่งั้นผลผลิตแรก
              const next = formulas.find((formula) => formula.id === id);
              const driver =
                next?.lines.find((line) => line.isDefaultDriver) ??
                next?.lines.find((line) => line.lineRole === "OUTPUT");
              setDriverLineId(driver?.id);
              setMachineChoices({});
            }}
          />

          <div className={styles.planningMain}>
            <ProductionFormulaPlannerPanel
              formulas={formulas}
              loading={formulasQuery.isFetching}
              formulaId={formulaId}
              onFormulaId={setFormulaId}
              driverLineId={driverLineId}
              onDriverLineId={setDriverLineId}
              targetQty={targetQty}
              onTargetQty={setTargetQty}
              onApply={applyFormulaPlan}
              applied={Boolean(
                appliedPlan && appliedPlan.formulaId === formulaId,
              )}
              productionDayCount={productionDayCount}
              multiplyByProductionDays={multiplyByProductionDays}
              onMultiplyByProductionDays={setMultiplyByProductionDays}
            />

            <MachineSelectionCard
              formula={formulas.find((formula) => formula.id === formulaId)}
              choices={machineChoices}
              onChange={setMachineChoices}
            />

            <section className={styles.formCard}>
              <SelectedProductionRequestsCard
                selections={selections}
                labelByKey={selectionLabels}
                canPick={requestActions.canView}
                onOpenPicker={() => setPickerOpen(true)}
                onRemove={(row) => {
                  const key = selectionKeyOf(row);
                  setSelections((prev) =>
                    prev.filter((item) => selectionKeyOf(item) !== key),
                  );
                }}
              />
            </section>
          </div>
        </div>

        <ProductionRequestPickerModal
          open={pickerOpen}
          selected={selections}
          scopedToOwnRequests={!requestActions.canViewAll}
          onCancel={() => setPickerOpen(false)}
          onConfirm={({ selections: picked, labels }) => {
            setSelections(picked);
            setSelectionLabels(labels);
            setPickerOpen(false);
          }}
        />

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
                isFinishedGood
                unitCtx={unitCtx}
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
                  unitCtx={unitCtx}
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
          {formulaPickedButNotApplied ? (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 16 }}
              title="เลือกสูตรไว้ แต่ยังไม่ได้กด “ใช้ค่านี้เป็นแผน”"
              description="ใบนี้จะถูกบันทึกเป็นใบที่กรอกเอง ไม่ได้จำว่ามาจากสูตรไหน — ถ้าอยากให้ใบจำสูตรไว้ ให้กดปุ่มในกล่องวางแผนก่อนสร้าง · ถ้าตั้งใจกรอกเองก็สร้างต่อได้เลย"
            />
          ) : null}

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
