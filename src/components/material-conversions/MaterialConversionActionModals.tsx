"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";

import type {
  CompleteMaterialConversionBody,
  MaterialConversionRun,
} from "@/types/material-conversion";
import {
  OUTPUT_TYPE_COLOR,
  OUTPUT_TYPE_LABEL,
  PACKAGING_TYPES,
  PACKAGING_TYPE_LABEL,
} from "@/types/material-conversion";
import { OUTPUT_VARIANCE_WARN_PERCENT } from "@/lib/production/constants";
import { useConversionScaleTicketsQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import styles from "./MaterialConversionPage.module.css";

const { Text } = Typography;

const CANCEL_REASON_MIN = 10;

function fmtQty(value?: string | null) {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

/**
 * ยืนยันเริ่มงาน — **ลิสต์บรรทัดวัตถุดิบทุกบรรทัดพร้อมจำนวนก่อนกด**
 *
 * ไม่ใช่ Popconfirm บรรทัดเดียวเหมือนรอบงานเดิม เพราะการยกเลิกไม่คืนสต๊อก
 * และตอนนี้มีหลายบรรทัด — กดผิดจะค้างของ N เท่าและต้องเปิดใบปรับปรุงสต๊อก N ครั้ง
 */
type StartModalProps = {
  open: boolean;
  run: MaterialConversionRun;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    inputs: Array<{ lineId: string; actualQty: number }>;
    remark?: string;
  }) => void;
};

export function StartConversionModal(props: StartModalProps) {
  // destroyOnHidden + ตั้งค่าเริ่มต้นใน useState ตอน mount — ไม่ใช้ effect มา sync
  // สิ่งที่ผู้ใช้พิมพ์อยู่จึงไม่ถูกล้างเมื่อข้อมูลเบื้องหลัง refetch
  return (
    <Modal
      open={props.open}
      destroyOnHidden
      title="เริ่มงาน — ตัดสต๊อกวัตถุดิบจริง"
      footer={null}
      onCancel={props.onCancel}
      width={720}
    >
      {props.open ? <StartModalBody {...props} /> : null}
    </Modal>
  );
}

function StartModalBody({
  run,
  loading,
  onCancel,
  onConfirm,
}: StartModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const line of run.inputs) {
      initial[line.id] = Number(line.plannedQty);
    }
    return initial;
  });
  const [remark, setRemark] = useState("");

  const totalPlanned = run.inputs.reduce(
    (acc, line) => acc + Number(line.plannedQty),
    0,
  );
  const totalActual = Object.values(quantities).reduce(
    (acc, value) => acc + (Number(value) || 0),
    0,
  );
  const variancePercent =
    totalPlanned > 0
      ? Math.abs(((totalActual - totalPlanned) / totalPlanned) * 100)
      : 0;
  const overVariance = variancePercent >= OUTPUT_VARIANCE_WARN_PERCENT;

  return (
    <>
      <Alert
        className={styles.notice}
        type="warning"
        showIcon
        title="กดแล้วสต๊อกจะถูกตัดทันที"
        description="ยกเลิกกลางคันได้ แต่วัตถุดิบที่ตัดไปแล้วจะไม่ถูกคืนเข้าคลัง — ของเข้าเครื่องไปแล้ว ถ้ามีของเหลือจริงต้องเปิดใบปรับปรุงสต๊อกซึ่งมีคนอนุมัติ"
      />

      <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        ยืนยันจำนวนที่ใช้จริงต่อบรรทัด — ใส่ 0 ได้ หมายถึงวางแผนไว้แต่ไม่ได้ใช้บรรทัดนั้น
      </Text>

      {run.inputs.map((line) => (
        <div key={line.id} className={styles.modalLineRow}>
          <div className={styles.modalLineName}>
            <strong>{line.itemNameTh ?? line.itemCode ?? "-"}</strong>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ตามแผน {fmtQty(line.plannedQty)} {line.unitCode ?? ""}
            </Text>
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={3}
              value={quantities[line.id]}
              onChange={(value) =>
                setQuantities((prev) => ({
                  ...prev,
                  [line.id]: Number(value ?? 0),
                }))
              }
            />
            {line.unitCode ? (
              <Input style={{ width: 56 }} value={line.unitCode} disabled />
            ) : null}
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {line.lotId ? "มี Lot ระบุแล้ว" : "ไม่มี Lot — ตัดสต๊อกไม่ได้"}
          </Text>
        </div>
      ))}

      {overVariance ? (
        <Alert
          style={{ marginTop: 12 }}
          type="warning"
          showIcon
          title={`ต่างจากแผน ${variancePercent.toFixed(1)}%`}
          description="บันทึกต่อได้ แต่ควรใส่เหตุผลไว้ในหมายเหตุเพื่อให้คนตรวจย้อนหลังเข้าใจ"
        />
      ) : null}

      <Input.TextArea
        style={{ marginTop: 12 }}
        rows={2}
        maxLength={500}
        showCount
        placeholder="หมายเหตุ เช่น ยางเปียกกว่าที่คิด ใช้เพิ่ม"
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      />

      <div className={styles.formActions}>
        <Button onClick={onCancel}>ยกเลิก</Button>
        <Button
          type="primary"
          loading={loading}
          onClick={() =>
            onConfirm({
              inputs: run.inputs.map((line) => ({
                lineId: line.id,
                actualQty: Number(quantities[line.id] ?? line.plannedQty),
              })),
              remark: remark.trim() || undefined,
            })
          }
        >
          ยืนยันและตัดสต๊อก
        </Button>
      </div>
    </>
  );
}

/**
 * ปิดงาน — จำนวนที่ชั่งได้จริงต่อบรรทัดผลผลิต
 *
 * แถวของเสียแยกให้เห็นชัดว่าไม่เข้าสต๊อก · แสดงสมดุลมวลสด ๆ ให้เห็นก่อนกด
 * แต่ไม่บล็อกแม้ผลผลิตเกินวัตถุดิบ (ของอยู่ในคลังจริงแล้ว การห้ามรับเข้าจะทำให้
 * สต๊อกไม่ตรงของจริง ซึ่งแย่กว่าการมีตัวเลขที่ติดธงว่าน่าสงสัย)
 */
type CompleteModalProps = {
  open: boolean;
  run: MaterialConversionRun;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: {
    outputs: NonNullable<CompleteMaterialConversionBody["outputs"]>;
    remark?: string;
  }) => void;
};

type PackState = {
  type?: string;
  count?: number | null;
  gross?: number | null;
  tare?: number | null;
};

export function CompleteConversionModal(props: CompleteModalProps) {
  return (
    <Modal
      open={props.open}
      destroyOnHidden
      title="ปิดงาน — รับผลผลิตทุกบรรทัดเข้าคลัง"
      footer={null}
      onCancel={props.onCancel}
      width={760}
    >
      {props.open ? <CompleteModalBody {...props} /> : null}
    </Modal>
  );
}

function CompleteModalBody({
  run,
  loading,
  onCancel,
  onConfirm,
}: CompleteModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const line of run.outputs) {
      initial[line.id] = Number(line.actualQty ?? line.plannedQty);
    }
    return initial;
  });
  const [remark, setRemark] = useState("");
  // M7.5: ข้อมูลภาชนะบรรจุต่อบรรทัด — ใส่ gross แล้วน้ำหนักสุทธิ (gross − tare) ใช้แทนจำนวนที่กรอก
  const [pack, setPack] = useState<Record<string, PackState>>(() => {
    const initial: Record<string, PackState> = {};
    for (const line of run.outputs) {
      initial[line.id] = {
        type: line.packagingType,
        count: line.packageCount ?? null,
        gross: line.grossQty === undefined ? null : Number(line.grossQty),
        tare: line.tareQty === undefined ? null : Number(line.tareQty),
      };
    }
    return initial;
  });
  const [packOpen, setPackOpen] = useState<Record<string, boolean>>({});
  // M4.3: ตั๋วชั่ง Floor Scale ต่อบรรทัด — เลือกแล้วน้ำหนักสุทธิตามตั๋วถูกใช้ (Auto) · กรอกเองต่างจากตั๋วได้ถ้ามีเหตุผล
  const ticketsQuery = useConversionScaleTicketsQuery();
  const tickets = ticketsQuery.data?.data ?? [];
  const [scale, setScale] = useState<
    Record<string, { ticketId?: string; override?: boolean; reason?: string }>
  >({});
  const patchScale = (
    lineId: string,
    value: { ticketId?: string; override?: boolean; reason?: string },
  ) => setScale((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...value } }));
  const usedTicketIds = new Set(
    Object.values(scale)
      .map((s) => s.ticketId)
      .filter(Boolean),
  );
  /** น้ำหนักตามตั๋วในหน่วยของบรรทัด — รู้ค่าเฉพาะหน่วย KG (หน่วยอื่น backend แปลงให้ตอนบันทึก) */
  const ticketQtyOf = (lineId: string, unitCode?: string): number | null => {
    const id = scale[lineId]?.ticketId;
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return null;
    return unitCode?.toUpperCase() === "KG" ? Number(ticket.netWeightKg) : null;
  };
  const netOf = (lineId: string): number => {
    const sc = scale[lineId];
    if (sc?.ticketId && !sc.override) {
      const unit = run.outputs.find((l) => l.id === lineId)?.unitCode;
      const t = ticketQtyOf(lineId, unit);
      if (t !== null) return t;
    }
    const p = pack[lineId];
    if (p?.gross !== undefined && p.gross !== null) {
      return Math.max(Number(p.gross) - Number(p.tare ?? 0), 0);
    }
    return Number(quantities[lineId]) || 0;
  };
  const patchPack = (lineId: string, value: Partial<PackState>) =>
    setPack((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...value } }));

  const totalInput = useMemo(
    () => run.inputs.reduce((acc, line) => acc + Number(line.actualQty), 0),
    [run.inputs],
  );

  /*
    พรีวิวฝั่งหน้าจอเทียบด้วย "จำนวนตามหน่วยของแต่ละบรรทัด" ตรง ๆ
    ต่างจาก backend ที่แปลงเป็นหน่วยเทียบร่วมก่อน — จึงเป็นเพียงการประมาณ
    เพื่อให้เห็นทิศทาง ตัวเลขจริงมาจาก backend หลังบันทึก
  */
  const sameUnitAsInput = useMemo(() => {
    const inputUnits = new Set(run.inputs.map((line) => line.unitId));
    const outputUnits = new Set(run.outputs.map((line) => line.unitId));
    return (
      inputUnits.size === 1 &&
      outputUnits.size === 1 &&
      [...inputUnits][0] === [...outputUnits][0]
    );
  }, [run.inputs, run.outputs]);

  const totalOutput = run.outputs
    .filter((line) => line.postsToStock)
    .reduce((acc, line) => acc + netOf(line.id), 0);
  const totalWaste = run.outputs
    .filter((line) => !line.postsToStock)
    .reduce((acc, line) => acc + (Number(quantities[line.id]) || 0), 0);

  const previewYield =
    sameUnitAsInput && totalInput > 0
      ? Number(((totalOutput / totalInput) * 100).toFixed(2))
      : null;
  const impossible =
    sameUnitAsInput && totalInput > 0 && totalOutput + totalWaste > totalInput * 1.01;

  return (
    <>
      <Text type="secondary" style={{ display: "block", marginBottom: 10 }}>
        กรอกจำนวนที่ชั่งได้จริง — แต่ละบรรทัดที่เข้าสต๊อกจะได้ Lot ของตัวเอง
        พร้อมต้นทุนที่ปันมาจากวัตถุดิบตามน้ำหนัก
      </Text>

      {run.outputs.map((line) => (
        <div
          key={line.id}
          className={
            line.postsToStock
              ? styles.modalLineRow
              : `${styles.modalLineRow} ${styles.modalLineRowWaste}`
          }
        >
          <div className={styles.modalLineName}>
            <strong>{line.itemNameTh ?? line.itemCode ?? "-"}</strong>
            <span>
              <Tag color={OUTPUT_TYPE_COLOR[line.outputType]}>
                {OUTPUT_TYPE_LABEL[line.outputType] ?? line.outputType}
              </Tag>
            </span>
          </div>
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={3}
              value={
                pack[line.id]?.gross !== undefined && pack[line.id]?.gross !== null
                  ? netOf(line.id)
                  : quantities[line.id]
              }
              disabled={
                (pack[line.id]?.gross !== undefined && pack[line.id]?.gross !== null) ||
                Boolean(scale[line.id]?.ticketId && !scale[line.id]?.override)
              }
              onChange={(value) =>
                setQuantities((prev) => ({
                  ...prev,
                  [line.id]: Number(value ?? 0),
                }))
              }
            />
            {line.unitCode ? (
              <Input style={{ width: 56 }} value={line.unitCode} disabled />
            ) : null}
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ตามแผน {fmtQty(line.plannedQty)}
            {line.postsToStock ? "" : " · ไม่เข้าสต๊อก"}
          </Text>
          {line.postsToStock && tickets.length + (scale[line.id]?.ticketId ? 1 : 0) > 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="ตั๋วชั่ง Floor Scale (ดึงน้ำหนักสุทธิอัตโนมัติ)"
                style={{ minWidth: 280 }}
                value={scale[line.id]?.ticketId}
                onChange={(value) =>
                  patchScale(line.id, { ticketId: value, override: false, reason: "" })
                }
                options={tickets
                  .filter((t) => t.id === scale[line.id]?.ticketId || !usedTicketIds.has(t.id))
                  .map((t) => ({
                    value: t.id,
                    label: `${t.ticketNo} · ${fmtQty(t.netWeightKg)} กก.${t.scaleCode ? " · " + t.scaleCode : ""}`,
                  }))}
              />
              {scale[line.id]?.ticketId ? (
                <>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {ticketQtyOf(line.id, line.unitCode) === null
                      ? "น้ำหนักตามตั๋ว — ระบบแปลงเป็นหน่วยของบรรทัดตอนบันทึก"
                      : "ใช้น้ำหนักสุทธิตามตั๋ว"}
                  </Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() =>
                      patchScale(line.id, { override: !scale[line.id]?.override })
                    }
                  >
                    {scale[line.id]?.override ? "ใช้ตามตั๋ว" : "กรอกน้ำหนักเองต่างจากตั๋ว"}
                  </Button>
                  {scale[line.id]?.override ? (
                    <Input
                      style={{ minWidth: 260, flex: 1 }}
                      maxLength={500}
                      placeholder="เหตุผลที่น้ำหนักต่างจากตั๋ว (บังคับ)"
                      value={scale[line.id]?.reason}
                      onChange={(e) => patchScale(line.id, { reason: e.target.value })}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
          {line.postsToStock ? (
            run.stepCode === "PACKING" ||
            line.packagingType ||
            packOpen[line.id] ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Select
                  allowClear
                  placeholder="ภาชนะ"
                  style={{ width: 130 }}
                  value={pack[line.id]?.type}
                  onChange={(value) => patchPack(line.id, { type: value })}
                  options={PACKAGING_TYPES.map((value) => ({
                    value,
                    label: PACKAGING_TYPE_LABEL[value],
                  }))}
                />
                <InputNumber
                  min={1}
                  precision={0}
                  placeholder="จำนวนถุง"
                  style={{ width: 110 }}
                  value={pack[line.id]?.count ?? null}
                  onChange={(value) => patchPack(line.id, { count: value })}
                />
                <InputNumber
                  min={0}
                  precision={3}
                  placeholder="น้ำหนักรวม (gross)"
                  style={{ width: 160 }}
                  value={pack[line.id]?.gross ?? null}
                  onChange={(value) => patchPack(line.id, { gross: value })}
                />
                <InputNumber
                  min={0}
                  precision={3}
                  placeholder="น้ำหนักภาชนะ (tare)"
                  style={{ width: 160 }}
                  value={pack[line.id]?.tare ?? null}
                  onChange={(value) => patchPack(line.id, { tare: value })}
                />
                {pack[line.id]?.gross !== undefined &&
                pack[line.id]?.gross !== null ? (
                  <Text strong>
                    สุทธิ {fmtQty(String(netOf(line.id)))} {line.unitCode ?? ""}
                    {pack[line.id]?.count
                      ? ` · เฉลี่ย ${fmtQty(
                          String(netOf(line.id) / Number(pack[line.id]?.count)),
                        )}/ถุง`
                      : ""}
                  </Text>
                ) : null}
              </div>
            ) : (
              <Button
                type="link"
                size="small"
                style={{ gridColumn: "1 / -1", justifySelf: "start", padding: 0 }}
                onClick={() => setPackOpen((prev) => ({ ...prev, [line.id]: true }))}
              >
                + บันทึกการบรรจุภาชนะ (Big Bag / ถุง)
              </Button>
            )
          ) : null}
        </div>
      ))}

      <div className={styles.balanceRow} style={{ marginTop: 14 }}>
        <div className={styles.balanceCard}>
          <span className={styles.balanceLabel}>วัตถุดิบที่ตัดไป</span>
          <strong className={styles.balanceValue}>{fmtQty(String(totalInput))}</strong>
        </div>
        <div className={styles.balanceCard}>
          <span className={styles.balanceLabel}>ผลผลิตเข้าคลัง</span>
          <strong className={styles.balanceValue}>{fmtQty(String(totalOutput))}</strong>
        </div>
        <div className={styles.balanceCard}>
          <span className={styles.balanceLabel}>ของเสีย</span>
          <strong className={styles.balanceValue}>{fmtQty(String(totalWaste))}</strong>
        </div>
        <div
          className={`${styles.balanceCard} ${styles.balanceCardStrong}`}
        >
          <span className={styles.balanceLabel}>Yield ประมาณ</span>
          <strong className={styles.balanceValue}>
            {previewYield === null ? "เทียบไม่ได้" : `${previewYield}%`}
          </strong>
          <span className={styles.balanceHint}>
            {previewYield === null
              ? "หน่วยต่างกัน — ตัวเลขจริงคำนวณหลังบันทึก"
              : "ประมาณจากหน่วยเดียวกัน"}
          </span>
        </div>
      </div>

      {impossible ? (
        <Alert
          type="error"
          showIcon
          title="ผลผลิตรวมของเสียมากกว่าวัตถุดิบที่ใส่เข้าไป"
          description="เป็นไปไม่ได้ทางกายภาพ — ตรวจจำนวนอีกครั้ง · บันทึกต่อได้ แต่ตัวเลข Yield ของใบนี้จะถูกกันออกจากค่าเฉลี่ยบนแดชบอร์ด"
        />
      ) : null}

      <Input.TextArea
        style={{ marginTop: 12 }}
        rows={2}
        maxLength={500}
        showCount
        placeholder="หมายเหตุ เช่น ปิดงานตามน้ำหนักที่ชั่งได้"
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      />

      <div className={styles.formActions}>
        <Button onClick={onCancel}>ยกเลิก</Button>
        <Button
          type="primary"
          loading={loading}
          onClick={() =>
            onConfirm({
              outputs: run.outputs.map((line) => {
                const p = pack[line.id];
                const hasGross =
                  line.postsToStock &&
                  p?.gross !== undefined &&
                  p.gross !== null;
                const hasPackMeta =
                  line.postsToStock && (p?.type || p?.count || hasGross);
                const sc = scale[line.id];
                const ticketId = line.postsToStock ? sc?.ticketId : undefined;
                return {
                  lineId: line.id,
                  ...(ticketId
                    ? {
                        floorScaleTicketId: ticketId,
                        weightDiffReason: sc?.override ? sc.reason?.trim() || undefined : undefined,
                      }
                    : {}),
                  actualQty: ticketId
                    ? sc?.override
                      ? Number(quantities[line.id])
                      : undefined
                    : hasGross
                      ? undefined
                      : Number(
                          quantities[line.id] ?? line.actualQty ?? line.plannedQty,
                        ),
                  ...(hasPackMeta
                    ? {
                        packagingType: p?.type || undefined,
                        packageCount: p?.count || undefined,
                        grossQty: hasGross ? Number(p?.gross) : undefined,
                        tareQty: hasGross ? Number(p?.tare ?? 0) : undefined,
                      }
                    : {}),
                };
              }),
              remark: remark.trim() || undefined,
            })
          }
        >
          ยืนยันปิดงาน
        </Button>
      </div>
    </>
  );
}

type CancelModalProps = {
  open: boolean;
  /** true = ตัดสต๊อกไปแล้ว เหตุผลบังคับ */
  requireReason: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { cancelReason?: string }) => void;
};

export function CancelConversionModal(props: CancelModalProps) {
  return (
    <Modal
      open={props.open}
      destroyOnHidden
      title="ยกเลิกใบแปรสภาพวัตถุดิบ"
      footer={null}
      onCancel={props.onCancel}
    >
      {props.open ? <CancelModalBody {...props} /> : null}
    </Modal>
  );
}

function CancelModalBody({
  requireReason,
  loading,
  onCancel,
  onConfirm,
}: CancelModalProps) {
  const [reason, setReason] = useState("");
  const tooShort = requireReason && reason.trim().length < CANCEL_REASON_MIN;

  return (
    <>
      {requireReason ? (
        <Alert
          className={styles.notice}
          type="error"
          showIcon
          title="วัตถุดิบที่ตัดไปแล้วจะไม่ถูกคืนเข้าสต๊อก"
          description="ของเข้าเครื่องไปแล้ว ไม่ได้กลับมาวางบนชั้นเพราะเครื่องพัง — ถ้ามีของเหลือจริงให้เปิดใบปรับปรุงสต๊อกโดยชั่งของจริงและมีคนอนุมัติ"
        />
      ) : (
        <Alert
          className={styles.notice}
          type="info"
          showIcon
          title="เอกสารนี้ยังไม่ได้ตัดสต๊อก"
          description="ยกเลิกได้ทันที ไม่มีผลกับยอดคงเหลือ"
        />
      )}
      <Input.TextArea
        rows={3}
        maxLength={2000}
        showCount
        placeholder={
          requireReason
            ? `เหตุผลการยกเลิก (อย่างน้อย ${CANCEL_REASON_MIN} ตัวอักษร) เช่น เครื่องย่อยพัง หยุดกลางคัน`
            : "เหตุผลการยกเลิก (ไม่บังคับ)"
        }
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        status={tooShort && reason.length > 0 ? "error" : undefined}
      />

      <div className={styles.formActions}>
        <Button onClick={onCancel}>ปิด</Button>
        <Button
          danger
          type="primary"
          loading={loading}
          disabled={tooShort}
          onClick={() =>
            onConfirm({ cancelReason: reason.trim() || undefined })
          }
        >
          ยืนยันยกเลิกเอกสาร
        </Button>
      </div>
    </>
  );
}
