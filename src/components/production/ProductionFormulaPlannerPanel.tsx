"use client";

import { useMemo } from "react";
import { Alert, Button, InputNumber, Select, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CalculatorOutlined } from "@ant-design/icons";

import { useProductionFormulaScaleQuery } from "@/hooks/production-formulas/useProductionFormulaQueries";
import type {
  ProductionFormula,
  ProductionFormulaScaleLine,
} from "@/types/production-formula";
import { FORMULA_LINE_ROLE_LABEL } from "@/types/production-formula";
import styles from "./ProductionFormulaPlannerPanel.module.css";

export type FormulaPlanResult = {
  inputs: ProductionFormulaScaleLine[];
  outputs: ProductionFormulaScaleLine[];
  wastes: ProductionFormulaScaleLine[];
  formulaId: string;
  targetQty: number;
  driverItemId: string;
};

type Props = {
  formulas: ProductionFormula[];
  loading: boolean;
  formulaId?: string;
  onFormulaId: (value?: string) => void;
  driverLineId?: string;
  onDriverLineId: (value?: string) => void;
  targetQty: number | null;
  onTargetQty: (value: number | null) => void;
  /** กดปุ่มแล้วส่งค่าที่คิดได้ออกไปให้หน้าแม่เติมลงแถว */
  onApply: (result: FormulaPlanResult) => void;
  disabled?: boolean;
  /** เติมลงฟอร์มไปแล้วหรือยัง — ใช้บอกสถานะให้ผู้ใช้เห็น */
  applied?: boolean;
};

function fmtQty(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

/**
 * กล่องวางแผนจากสูตรการผลิต
 *
 * เลือกสูตร เลือกบรรทัดที่ใช้เป็นตัวตั้ง ใส่จำนวนที่ต้องการ แล้วเห็นประมาณการทั้ง
 * วัตถุดิบและผลผลิตทันที · **ตั้งจากบรรทัดผลผลิต** = "อยากได้น้ำมัน 100 ต้องใช้อะไร"
 * **ตั้งจากบรรทัดวัตถุดิบ** = "มียางสับ 1000 จะได้อะไร" — คอนโทรลตัวเดียวสลับได้ทั้งสองทาง
 *
 * ## พรีวิวสด แต่ลงมือต้องกดปุ่ม
 *
 * แถวข้างล่างในหน้าสร้างแก้มือได้ และถูกเติมจากใบขอผลิตไปแล้ว · ถ้าเขียนทับทุกครั้ง
 * ที่พิมพ์จะลบ Lot ที่ผู้ใช้เลือกและน้ำหนักที่แก้เองทิ้งหมด · จึงให้พรีวิวสดตามภาพ
 * ต้นแบบ แต่การเติมลงฟอร์มเป็นการกดปุ่มที่ผู้ใช้ตั้งใจ
 *
 * ## การคำนวณอยู่ backend ทั้งหมด
 *
 * ไม่ลอกเลขคณิตมาไว้ที่นี่ เพราะ `frontend_web` ไม่มี test runner —
 * กฎที่บั๊กมักอยู่ (ตัวตั้งเป็น 0, ปัดเหลือ 0) มีเทสต์คุมอยู่ฝั่ง backend
 */
export default function ProductionFormulaPlannerPanel({
  formulas,
  loading,
  formulaId,
  onFormulaId,
  driverLineId,
  onDriverLineId,
  targetQty,
  onTargetQty,
  onApply,
  disabled,
  applied,
}: Props) {
  const selected = useMemo(
    () => formulas.find((formula) => formula.id === formulaId),
    [formulas, formulaId],
  );

  const scaleQuery = useProductionFormulaScaleQuery({
    formulaId,
    driverLineId,
    targetQty,
  });
  const scale = scaleQuery.data?.data;

  const grouped = useMemo(() => {
    const lines = scale?.lines ?? [];
    return {
      inputs: lines.filter((line) => line.lineRole === "INPUT"),
      outputs: lines.filter((line) => line.lineRole === "OUTPUT"),
      wastes: lines.filter((line) => line.lineRole === "WASTE"),
    };
  }, [scale]);

  const driverOptions = useMemo(() => {
    if (!selected) return [];
    const group = (role: string) => ({
      label: FORMULA_LINE_ROLE_LABEL[role],
      options: selected.lines
        .filter((line) => line.lineRole === role)
        .map((line) => ({
          value: line.id,
          label: `${line.itemNameTh ?? line.itemCode ?? "-"} · สูตร ${fmtQty(
            Number(line.quantity),
          )} ${line.unitCode ?? ""}`,
        })),
    });
    // ผลผลิตขึ้นก่อน เพราะเป็นทางที่ใช้บ่อยกว่า ("อยากได้เท่านี้")
    return [group("OUTPUT"), group("INPUT"), group("WASTE")].filter(
      (item) => item.options.length > 0,
    );
  }, [selected]);

  const columns: ColumnsType<ProductionFormulaScaleLine> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <span>{row.itemNameTh ?? row.itemCode ?? "-"}</span>
          {row.isDriver ? (
            <span className={styles.driverNote}>ตัวตั้ง</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "ตามสูตร (1 รอบ)",
      key: "formulaQty",
      width: 140,
      align: "right",
      render: (_v, row) => (
        <span className={styles.muted}>
          {fmtQty(row.formulaQty)} {row.unitCode ?? ""}
        </span>
      ),
    },
    {
      title: "ประมาณการ",
      key: "plannedQty",
      width: 150,
      align: "right",
      render: (_v, row) => {
        const zero = scale?.roundedToZeroLineIds.includes(row.lineId);
        return (
          <strong className={zero ? styles.qtyBad : styles.qty}>
            {fmtQty(row.plannedQty)} {row.unitCode ?? ""}
          </strong>
        );
      },
    },
  ];

  const canApply =
    !disabled &&
    Boolean(scale) &&
    scale?.factor !== null &&
    grouped.inputs.length > 0 &&
    grouped.outputs.length > 0 &&
    (scale?.roundedToZeroLineIds.length ?? 0) === 0;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <div className={styles.eyebrow}>วางแผนจากสูตร</div>
          <h4 className={styles.title}>เลือกสูตร ใส่จำนวน ระบบคิดให้ทั้งสองฝั่ง</h4>
        </div>
        {applied ? (
          <Tag color="green">เติมลงฟอร์มแล้ว</Tag>
        ) : scale && scale.factor !== null ? (
          <Tag>ยังไม่ได้เติมลงฟอร์ม</Tag>
        ) : null}
      </div>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.label}>สูตรที่ใช้</span>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="เลือกสูตรการผลิต"
            loading={loading}
            value={formulaId}
            disabled={disabled}
            onChange={(value) => {
              onFormulaId(value);
              /*
                เปลี่ยนสูตรแล้วตั้งตัวตั้งใหม่ให้เลย — บรรทัดที่ติ๊ก
                "ตัวตั้งเริ่มต้น" ไว้ ถ้าไม่มีก็ใช้ผลผลิตบรรทัดแรก
                (ตรงกับภาพต้นแบบที่มี "ผลผลิตที่ต้องการ: น้ำมัน" เลือกไว้แล้ว)
              */
              const next = formulas.find((formula) => formula.id === value);
              const driver =
                next?.lines.find((line) => line.isDefaultDriver) ??
                next?.lines.find((line) => line.lineRole === "OUTPUT");
              onDriverLineId(driver?.id);
            }}
            options={formulas.map((formula) => ({
              value: formula.id,
              label: `${formula.formulaCode} — ${formula.nameTh}`,
            }))}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>ตั้งจากบรรทัด</span>
          <Tooltip title="เลือกผลผลิตคือ “อยากได้เท่านี้ ต้องใช้อะไร” · เลือกวัตถุดิบคือ “มีเท่านี้ จะได้อะไร”">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={formulaId ? "เลือกบรรทัด" : "เลือกสูตรก่อน"}
              disabled={disabled || !formulaId}
              value={driverLineId}
              onChange={onDriverLineId}
              options={driverOptions}
            />
          </Tooltip>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>จำนวนที่ต้องการ</span>
          <InputNumber
            style={{ width: "100%" }}
            min={0.001}
            precision={3}
            placeholder="0.000"
            value={targetQty}
            disabled={disabled || !driverLineId}
            onChange={onTargetQty}
          />
        </label>

        <div className={styles.applyWrap}>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            disabled={!canApply}
            loading={scaleQuery.isFetching}
            onClick={() => {
              if (!scale || !formulaId || targetQty === null) return;
              const driver = scale.lines.find((line) => line.isDriver);
              onApply({
                ...grouped,
                formulaId,
                targetQty,
                driverItemId: driver?.itemId ?? "",
              });
            }}
          >
            ใช้ค่านี้เป็นแผน
          </Button>
        </div>
      </div>

      {selected?.batchLabel ? (
        <div className={styles.batchLabel}>
          ขนาด 1 รอบตามสูตร: {selected.batchLabel}
        </div>
      ) : null}

      {scale?.reason ? (
        <Alert
          className={styles.notice}
          type="info"
          showIcon
          title="ยังคิดประมาณการไม่ได้"
          description={scale.reason}
        />
      ) : null}

      {(scale?.roundedToZeroLineIds.length ?? 0) > 0 ? (
        <Alert
          className={styles.notice}
          type="warning"
          showIcon
          title="จำนวนที่ตั้งไว้น้อยเกินไป"
          description="มีบรรทัดที่คิดแล้วปัดเหลือ 0 ซึ่งบันทึกเป็นใบสั่งผลิตไม่ได้ (ระบบบังคับอย่างน้อย 0.001) — เพิ่มจำนวนที่ต้องการ หรือตัดบรรทัดนั้นออกจากสูตร"
        />
      ) : null}

      {selected && selected.warnings.length > 0 ? (
        <Alert
          className={styles.notice}
          type="warning"
          showIcon
          title="ข้อสังเกตของสูตรนี้"
          description={
            <ul className={styles.warnList}>
              {selected.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          }
        />
      ) : null}

      {scale && scale.factor !== null ? (
        <div className={styles.tables}>
          <div className={styles.tableBlock}>
            <div className={styles.tableTitle}>
              ผลผลิตที่คาดว่าจะได้
              {grouped.wastes.length > 0 ? (
                <span className={styles.muted}> (ของเสียแยกตารางล่าง)</span>
              ) : null}
            </div>
            <Table
              size="small"
              rowKey="lineId"
              columns={columns}
              dataSource={grouped.outputs}
              pagination={false}
            />
          </div>

          <div className={styles.tableBlock}>
            <div className={styles.tableTitle}>วัตถุดิบที่ต้องใช้</div>
            <Table
              size="small"
              rowKey="lineId"
              columns={columns}
              dataSource={grouped.inputs}
              pagination={false}
            />
          </div>

          {grouped.wastes.length > 0 ? (
            <div className={styles.tableBlock}>
              <div className={styles.tableTitle}>
                ของเสีย <span className={styles.muted}>(ไม่เข้าคลัง)</span>
              </div>
              <Table
                size="small"
                rowKey="lineId"
                columns={columns}
                dataSource={grouped.wastes}
                pagination={false}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
