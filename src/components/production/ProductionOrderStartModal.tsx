"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Input, InputNumber, Modal, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import type {
  ProductionOrder,
  ProductionOrderInputItem,
  StartProductionOrderBody,
} from "@/types/production-order";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./ProductionOrderStartModal.module.css";
import { useT } from "@/lib/i18n/useT";
import { getStoredLanguage } from "@/lib/i18n/language";
import { formatNumber } from "@/lib/i18n/format";

/**
 * ยืนยันวัตถุดิบที่ใช้จริงก่อนกดเริ่มผลิต
 *
 * เดิมปุ่มเริ่มผลิตเป็น `Popconfirm` แล้วระบบตัดสต๊อก "ตามแผน" เสมอ — คนหน้างาน
 * ไม่เคยได้บอกว่าใส่ยางเข้าไปเท่าไรจริง ตัวหารของสูตร yield จึงเป็นตัวเลขแผน
 * ตลอด ทำให้ "yield จริง" ไม่เคยจริง
 *
 * แยกไฟล์เพราะหน้ารายละเอียดยาวเป็นพันบรรทัดและมี Modal อยู่แล้วสี่ตัว
 */

/** เกินเท่านี้ต้องบอกเหตุผล — ไม่ได้ห้าม แค่ให้หยุดคิด */
const REASON_REQUIRED_PERCENT = 5;
/** เกินเท่านี้เปลี่ยนปุ่มเป็นสีอันตราย น่าจะกรอกผิดหลักมากกว่าใช้จริง */
const DANGER_PERCENT = 20;

type DraftLine = {
  item: ProductionOrderInputItem;
  actualQty: number | null;
};

function fmt(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : formatNumber(num, getStoredLanguage(), 3);
}

type StartModalProps = {
  open: boolean;
  order: ProductionOrder;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (body: StartProductionOrderBody) => void;
};

/**
 * ตัวห่อคุม Modal อย่างเดียว — เนื้อในถูก unmount ทุกครั้งที่ปิด (`destroyOnHidden`)
 * ค่าเริ่มต้นจึงตั้งได้ใน `useState` ตอน mount ไม่ต้องใช้ effect มา sync
 * ซึ่งเป็นวิธีที่ทำให้สิ่งที่ผู้ใช้กำลังพิมพ์ไม่ถูกล้างเมื่อข้อมูลเบื้องหลัง refetch
 */
export default function ProductionOrderStartModal(props: StartModalProps) {
  const t = useT();
  const deferred =
    props.order.inputStockMode === "ON_SHIFT_CONFIRM";
  return (
    <Modal
      open={props.open}
      title={
        deferred
          ? t("เริ่มผลิต")
          : t("เริ่มผลิต — ยืนยันวัตถุดิบที่ใช้จริง")
      }
      width={deferred ? 560 : 880}
      footer={null}
      destroyOnHidden
      onCancel={props.onCancel}
    >
      {deferred ? (
        <DeferredStartBody {...props} />
      ) : (
        <StartModalBody {...props} />
      )}
    </Modal>
  );
}

/** โหมด ON_SHIFT_CONFIRM — เริ่มผลิตโดยไม่ตัดสต๊อก */
function DeferredStartBody({
  loading,
  onCancel,
  onConfirm,
}: StartModalProps) {
  const t = useT();
  return (
    <>
      <Alert
        type="info"
        showIcon
        className={styles.notice}
        title={t("เริ่มผลิตโดยยังไม่ตัดสต๊อกวัตถุดิบ")}
        description={t("ระบบจะตัดสต๊อกเมื่อยืนยันบันทึกผลรายกะ และเลือกคลัง/Lot ตอนนั้น")}
      />
      <div className={styles.footer}>
        <Button onClick={onCancel}>{t("ยกเลิก")}</Button>
        <Button
          type="primary"
          loading={loading}
          onClick={() => onConfirm({})}
        >
          {t("เริ่มผลิต")}
        </Button>
      </div>
    </>
  );
}

function StartModalBody({
  order,
  loading,
  onCancel,
  onConfirm,
}: StartModalProps) {
  const t = useT();
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (order.inputItems ?? []).map((item) => ({
      item,
      actualQty: Number(item.plannedQty) || 0,
    })),
  );
  const [reason, setReason] = useState("");

  const totals = useMemo(() => {
    let planned = 0;
    let actual = 0;
    let maxDeviation = 0;
    for (const line of lines) {
      const p = Number(line.item.plannedQty) || 0;
      const a = line.actualQty ?? 0;
      planned += p;
      actual += a;
      if (p > 0) {
        maxDeviation = Math.max(maxDeviation, Math.abs(((a - p) / p) * 100));
      } else if (a > 0) {
        maxDeviation = Math.max(maxDeviation, DANGER_PERCENT + 1);
      }
    }
    return { planned, actual, maxDeviation };
  }, [lines]);

  /** ผลผลิตตามแผนหารด้วยวัตถุดิบที่กำลังจะใส่จริง — เห็นผลก่อนกดตัดสต๊อก */
  const plannedOutput = useMemo(
    () =>
      (order.planLines ?? [])
        .filter((line) => line.lineType === "OUTPUT")
        .reduce((sum, line) => sum + (Number(line.plannedQty) || 0), 0),
    [order.planLines],
  );

  const projectedYield =
    totals.actual > 0 ? Number(((plannedOutput / totals.actual) * 100).toFixed(2)) : null;
  const plannedYield =
    totals.planned > 0
      ? Number(((plannedOutput / totals.planned) * 100).toFixed(2))
      : null;

  const hasInvalid = lines.some(
    (line) => line.actualQty === null || Number.isNaN(line.actualQty),
  );
  const needsReason = totals.maxDeviation > REASON_REQUIRED_PERCENT;
  const isDanger = totals.maxDeviation > DANGER_PERCENT;
  const blocked = hasInvalid || (needsReason && !reason.trim());

  const setQty = (itemId: string, value: number | null) => {
    setLines((prev) =>
      prev.map((line) =>
        line.item.id === itemId ? { ...line, actualQty: value } : line,
      ),
    );
  };

  const columns: ColumnsType<DraftLine> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("วัตถุดิบ"),
      key: "item",
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <span>
            {row.item.itemCode
              ? `${row.item.itemCode} — ${row.item.itemNameTh ?? ""}`
              : row.item.itemId}
          </span>
          <span className={styles.cellMuted}>
            {row.item.warehouseCode ?? "-"}/{row.item.locationCode ?? "-"}
            {row.item.lotNo ? ` · Lot ${row.item.lotNo}` : ""}
          </span>
        </div>
      ),
    },
    {
      title: t("แผน"),
      key: "planned",
      align: "right",
      width: 130,
      render: (_v, row) =>
        `${fmt(row.item.plannedQty)} ${row.item.unitCode ?? ""}`,
    },
    {
      title: t("ใช้จริง"),
      key: "actual",
      align: "right",
      width: 170,
      render: (_v, row) => (
        <Space.Compact style={{ width: "100%" }}>
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            step={0.001}
            precision={3}
            value={row.actualQty}
            onChange={(value) => setQty(row.item.id, value)}
            status={
              row.actualQty === null || Number.isNaN(row.actualQty)
                ? "error"
                : undefined
            }
          />
          {row.item.unitCode ? (
            <Input style={{ width: 56 }} value={row.item.unitCode} disabled />
          ) : null}
        </Space.Compact>
      ),
    },
    {
      title: t("ผลต่าง"),
      key: "variance",
      align: "right",
      width: 150,
      render: (_v, row) => {
        const planned = Number(row.item.plannedQty) || 0;
        const actual = row.actualQty ?? 0;
        const diff = actual - planned;
        if (Math.abs(diff) < 0.0005) {
          return <span className={styles.cellMuted}>{t("ตรงตามแผน")}</span>;
        }
        const percent = planned > 0 ? (diff / planned) * 100 : 0;
        const tone =
          Math.abs(percent) > DANGER_PERCENT
            ? styles.varianceDanger
            : Math.abs(percent) > REASON_REQUIRED_PERCENT
              ? styles.varianceWarn
              : styles.varianceOk;
        return (
          <span className={tone}>
            {diff > 0 ? "+" : ""}
            {fmt(diff)}
            {planned > 0 ? ` (${percent > 0 ? "+" : ""}${percent.toFixed(1)}%)` : ""}
          </span>
        );
      },
    },
  ];

  const submit = () =>
    onConfirm({
      inputLines: lines.map((line) => ({
        inputItemId: line.item.id,
        actualQty: line.actualQty ?? 0,
        remark: reason.trim() || undefined,
      })),
    });

  return (
    <>
      <Alert
        type="info"
        showIcon
        className={styles.notice}
        title={t("การเริ่มผลิตจะตัดสต๊อกตามจำนวนด้านล่างทันที และย้อนกลับไม่ได้")}
        description={t("ใส่ 0 ได้ถ้าวางแผนไว้แต่ไม่ได้ใช้บรรทัดนั้น — ระบบจะข้ามการตัดสต๊อกให้")}
      />

      <Table
        className={masterStyles.dataTable}
        rowKey={(row) => row.item.id}
        size="small"
        pagination={false}
        dataSource={lines}
        columns={columns}
      />


      <div className={styles.totals}>
        <Total label={t("รวมตามแผน")} value={fmt(totals.planned)} />
        <Total label={t("รวมที่จะใช้จริง")} value={fmt(totals.actual)} />
        <Total
          label={t("Yield คาดการณ์")}
          value={projectedYield !== null ? `${projectedYield}%` : "-"}
          hint={plannedYield !== null ? t("แผน {n}%", { n: plannedYield }) : undefined}
        />
      </div>

      {needsReason ? (
        <>
          <Alert
            type={isDanger ? "error" : "warning"}
            showIcon
            className={styles.notice}
            title={
              isDanger
                ? t("ต่างจากแผนมาก — ตรวจตัวเลขอีกครั้งก่อนกด")
                : t("มีรายการที่ใช้จริงต่างจากแผนเกิน {n}% กรุณาระบุเหตุผล", { n: REASON_REQUIRED_PERCENT })
            }
          />
          <Input.TextArea
            rows={2}
            maxLength={500}
            placeholder={t("เหตุผลที่ใช้จริงต่างจากแผน เช่น ยางชื้นกว่าปกติ ต้องเพิ่มปริมาณ")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </>
      ) : null}

      <div className={styles.footer}>
        <Button onClick={onCancel}>{t("ยกเลิก")}</Button>
        <Button
          type="primary"
          danger={isDanger}
          disabled={blocked}
          loading={loading}
          onClick={submit}
        >
          {t("เริ่มผลิตและตัดสต๊อก")}
        </Button>
      </div>
    </>
  );
}

function Total({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className={styles.totalItem}>
      <span className={styles.totalLabel}>{label}</span>
      <strong className={styles.totalValue}>{value}</strong>
      {hint ? <span className={styles.totalHint}>{hint}</span> : null}
    </div>
  );
}
