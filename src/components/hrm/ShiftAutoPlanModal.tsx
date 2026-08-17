"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";

import { useShiftAutoPlanPositionsQuery } from "@/hooks/shifts/useShiftQueries";
import {
  useApplyShiftAutoPlanMutation,
  useShiftAutoPlanPreviewMutation,
} from "@/hooks/shifts/useShiftMutations";
import type {
  Shift,
  ShiftAutoPlan,
  ShiftAutoPlanPositionInput,
} from "@/types/shifts";

import ShiftAutoPlanPreview from "./ShiftAutoPlanPreview";
import styles from "./ShiftAutoPlanModal.module.css";

type DemandDraft = {
  key: number;
  shiftId?: string;
  headcount: number;
};

type PositionDraft = {
  key: number;
  position?: string;
  demands: DemandDraft[];
};

type Props = {
  open: boolean;
  shifts: Shift[];
  /** เดือนที่ปฏิทินเปิดอยู่ — ใช้เป็นค่าเริ่มต้น */
  month: Dayjs;
  onClose: () => void;
};

let nextKey = 1;
const newKey = () => nextKey++;

/** ตั้งต้นให้ 3 กะแรกที่มีในระบบ เพราะเคสปกติคือเช้า/บ่าย/ดึก */
function initialDemands(shifts: Shift[]): DemandDraft[] {
  const picked = shifts.slice(0, 3);
  if (picked.length === 0) {
    return [{ key: newKey(), headcount: 1 }];
  }
  return picked.map((shift) => ({
    key: newKey(),
    shiftId: shift.id,
    headcount: 1,
  }));
}

export default function ShiftAutoPlanModal({
  open,
  shifts,
  month,
  onClose,
}: Props) {
  // โมดัลถูก mount ใหม่ทุกครั้งที่เปิด (หน้าปฏิทิน render แบบมีเงื่อนไข)
  // จึงตั้งค่าเริ่มต้นตอนสร้าง state ได้เลย ไม่ต้องมี effect รีเซ็ต
  const [targetMonth, setTargetMonth] = useState<Dayjs>(month);
  const [positions, setPositions] = useState<PositionDraft[]>(() => [
    { key: newKey(), demands: initialDemands(shifts) },
  ]);
  const [skipHolidays, setSkipHolidays] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState<ShiftAutoPlan | null>(null);

  const positionsQuery = useShiftAutoPlanPositionsQuery(open);
  const previewMutation = useShiftAutoPlanPreviewMutation();
  const applyMutation = useApplyShiftAutoPlanMutation();

  const positionOptions = useMemo(
    () => positionsQuery.data?.data ?? [],
    [positionsQuery.data],
  );
  const employeeCountByPosition = useMemo(
    () =>
      new Map(
        positionOptions.map((option) => [
          option.position,
          option.employeeCount,
        ]),
      ),
    [positionOptions],
  );

  /** แก้ค่าอะไรก็ตามหลังกดดูตัวอย่าง = ตัวอย่างเก่าใช้ไม่ได้แล้ว ต้องคำนวณใหม่ */
  const invalidatePlan = () => setPlan(null);

  const shiftOptions = shifts.map((shift) => ({
    value: shift.id,
    label: `${shift.name} · ${shift.startTime}-${shift.endTime}${shift.isOvernight ? " (ข้ามคืน)" : ""}`,
  }));

  const updatePosition = (key: number, patch: Partial<PositionDraft>) => {
    setPositions((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
    invalidatePlan();
  };

  const updateDemand = (
    positionKey: number,
    demandKey: number,
    patch: Partial<DemandDraft>,
  ) => {
    setPositions((prev) =>
      prev.map((item) =>
        item.key === positionKey
          ? {
              ...item,
              demands: item.demands.map((demand) =>
                demand.key === demandKey ? { ...demand, ...patch } : demand,
              ),
            }
          : item,
      ),
    );
    invalidatePlan();
  };

  const usedPositions = new Set(
    positions.map((item) => item.position).filter(Boolean),
  );

  const buildRequestPositions = (): ShiftAutoPlanPositionInput[] =>
    positions
      .filter((item) => item.position)
      .map((item) => ({
        position: item.position!,
        demands: item.demands
          .filter((demand) => demand.shiftId && demand.headcount > 0)
          .map((demand) => ({
            shiftId: demand.shiftId!,
            headcount: demand.headcount,
          })),
      }))
      .filter((item) => item.demands.length > 0);

  const requestPositions = buildRequestPositions();
  const canPreview = requestPositions.length > 0;

  const handlePreview = async () => {
    try {
      const response = await previewMutation.mutateAsync({
        month: targetMonth.format("YYYY-MM"),
        positions: requestPositions,
        skipHolidays,
        note: note.trim() || undefined,
      });
      setPlan(response.data);
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว
    }
  };

  const handleApply = async () => {
    try {
      const response = await applyMutation.mutateAsync({
        month: targetMonth.format("YYYY-MM"),
        positions: requestPositions,
        skipHolidays,
        overwriteExisting,
        note: note.trim() || undefined,
      });
      // ไม่ปิดโมดัลทันที — ต้องให้เห็นว่ารอบไหนถูกข้าม/ใครติดกะอื่นก่อน
      setPlan(response.data);
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงหน้าตัวอย่างไว้ให้แก้ต่อ
    }
  };

  const hasExistingRounds = Boolean(
    plan?.warnings.some((warning) => warning.code === "EXISTING_ROUNDS"),
  );

  return (
    <Modal
      open={open}
      title="จัดตารางกะรายเดือนอัตโนมัติ"
      width={plan ? 1120 : 720}
      onCancel={onClose}
      destroyOnHidden
      centered
      footer={
        <div className={styles.footer}>
          <Button onClick={onClose}>ปิด</Button>
          {plan ? (
            <>
              <Button onClick={() => setPlan(null)}>กลับไปแก้ค่า</Button>
              <Popconfirm
                title="บันทึกตารางกะลงระบบ"
                description={
                  <span>
                    จะสร้างรอบกะของเดือน {targetMonth.format("MM/YYYY")} ทั้งเดือน
                    {plan.understaffedSlots > 0
                      ? ` — มีช่องขาดคน ${plan.understaffedSlots} ช่อง ที่ต้องหาคนเติมภายหลัง`
                      : ""}
                    {overwriteExisting
                      ? " · จะเขียนทับรายชื่อในรอบกะที่มีอยู่แล้ว"
                      : ""}
                  </span>
                }
                okText="บันทึก"
                cancelText="ยกเลิก"
                onConfirm={() => void handleApply()}
              >
                <Button type="primary" loading={applyMutation.isPending}>
                  บันทึกตารางกะ
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Tooltip
              title={canPreview ? undefined : "เลือกตำแหน่งและจำนวนคนต่อกะก่อน"}
            >
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                disabled={!canPreview}
                loading={previewMutation.isPending}
                onClick={() => void handlePreview()}
              >
                ดูตัวอย่าง
              </Button>
            </Tooltip>
          )}
        </div>
      }
    >
      {plan ? (
        <div className={styles.body}>
          {hasExistingRounds ? (
            <Checkbox
              checked={overwriteExisting}
              onChange={(event) => setOverwriteExisting(event.target.checked)}
            >
              ทับรายชื่อในรอบกะที่มีอยู่แล้ว (ไม่ติ๊ก = ข้ามรอบนั้นไว้ ไม่แตะของเดิม)
            </Checkbox>
          ) : null}
          <ShiftAutoPlanPreview plan={plan} shifts={shifts} />
        </div>
      ) : (
        <div className={styles.body}>
          {shifts.length === 0 ? (
            <Empty description="ยังไม่มีกะในระบบ — กด จัดการกะ เพื่อสร้างกะเช้า/บ่าย/ดึกก่อน" />
          ) : null}

          <div className={styles.field}>
            <span className={styles.label}>เดือนที่จะจัด</span>
            <DatePicker
              picker="month"
              allowClear={false}
              format="MM/YYYY"
              value={targetMonth}
              onChange={(value) => {
                if (value) {
                  setTargetMonth(value);
                  invalidatePlan();
                }
              }}
            />
          </div>

          {positions.map((item) => {
            const dailyHeadcount = item.demands.reduce(
              (sum, demand) =>
                sum + (demand.shiftId ? Math.max(demand.headcount, 0) : 0),
              0,
            );
            const minimumEmployees = Math.ceil((dailyHeadcount * 7) / 6);
            const available = item.position
              ? (employeeCountByPosition.get(item.position) ?? 0)
              : 0;
            const short = Boolean(
              item.position && dailyHeadcount > 0 && available < minimumEmployees,
            );

            return (
              <div key={item.key} className={styles.positionCard}>
                <div className={styles.positionHead}>
                  <Select
                    className={styles.positionSelect}
                    showSearch
                    optionFilterProp="label"
                    placeholder="เลือกตำแหน่ง"
                    loading={positionsQuery.isLoading}
                    value={item.position}
                    onChange={(value) =>
                      updatePosition(item.key, { position: value })
                    }
                    notFoundContent="ยังไม่มีพนักงานที่ระบุตำแหน่งไว้"
                    options={positionOptions.map((option) => ({
                      value: option.position,
                      label: `${option.position} (${option.employeeCount} คน)`,
                      disabled:
                        option.position !== item.position &&
                        usedPositions.has(option.position),
                    }))}
                  />
                  {positions.length > 1 ? (
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setPositions((prev) =>
                          prev.filter((row) => row.key !== item.key),
                        );
                        invalidatePlan();
                      }}
                    >
                      ลบ
                    </Button>
                  ) : null}
                </div>

                <div className={styles.demandList}>
                  {item.demands.map((demand) => (
                    <div key={demand.key} className={styles.demandRow}>
                      <Select
                        className={styles.shiftSelect}
                        showSearch
                        optionFilterProp="label"
                        placeholder="เลือกกะ"
                        value={demand.shiftId}
                        options={shiftOptions}
                        onChange={(value) =>
                          updateDemand(item.key, demand.key, {
                            shiftId: value,
                          })
                        }
                      />
                      <InputNumber
                        className={styles.headcountInput}
                        min={0}
                        max={100}
                        value={demand.headcount}
                        addonAfter="คน"
                        onChange={(value) =>
                          updateDemand(item.key, demand.key, {
                            headcount: value ?? 0,
                          })
                        }
                      />
                      {item.demands.length > 1 ? (
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            updatePosition(item.key, {
                              demands: item.demands.filter(
                                (row) => row.key !== demand.key,
                              ),
                            })
                          }
                        />
                      ) : null}
                    </div>
                  ))}

                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      updatePosition(item.key, {
                        demands: [
                          ...item.demands,
                          { key: newKey(), headcount: 1 },
                        ],
                      })
                    }
                  >
                    เพิ่มกะ
                  </Button>
                </div>

                <p className={styles.positionSummary}>
                  ต้องใช้ <strong>{dailyHeadcount}</strong> คน/วัน · ขั้นต่ำ{" "}
                  <strong>{minimumEmployees}</strong> คน (ปัดขึ้นจาก{" "}
                  {dailyHeadcount} × 7 ÷ 6) ·{" "}
                  {item.position ? (
                    <>
                      มีพนักงาน{" "}
                      <strong className={short ? styles.shortValue : undefined}>
                        {available}
                      </strong>{" "}
                      คน
                    </>
                  ) : (
                    "ยังไม่เลือกตำแหน่ง"
                  )}
                </p>

                {short ? (
                  <Alert
                    type="warning"
                    showIcon
                    title="คนน้อยกว่าขั้นต่ำ"
                    description={`ตำแหน่งนี้มี ${available} คน แต่ควรมี ${minimumEmployees} คน — จัดได้แต่จะมีช่องขาดคน`}
                  />
                ) : null}
              </div>
            );
          })}

          <Button
            icon={<PlusOutlined />}
            block
            onClick={() => {
              setPositions((prev) => [
                ...prev,
                { key: newKey(), demands: initialDemands(shifts) },
              ]);
              invalidatePlan();
            }}
          >
            เพิ่มตำแหน่ง
          </Button>

          <div className={styles.field}>
            <span className={styles.label}>ข้ามวันหยุด / วันซ่อมเครื่อง</span>
            <Switch
              checked={skipHolidays}
              onChange={(value) => {
                setSkipHolidays(value);
                invalidatePlan();
              }}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>หมายเหตุ</span>
            <Input.TextArea
              rows={2}
              value={note}
              placeholder="เช่น จัดอัตโนมัติรอบเดือนกันยายน"
              onChange={(event) => {
                setNote(event.target.value);
                invalidatePlan();
              }}
            />
          </div>

          <Alert
            type="info"
            showIcon
            title="ระบบจัดให้แบบนี้"
            description={
              <ul className={styles.ruleList}>
                <li>
                  เรียงพนักงานตามรหัสพนักงาน — คนที่ 1 ถึงคนที่เท่ากับจำนวนช่อง
                  เป็น <strong>คนหลัก</strong> ได้กะเดียวทั้งเดือน ที่เหลือเป็น{" "}
                  <strong>คนเสริม</strong>
                </li>
                <li>
                  วันหยุดประจำสัปดาห์เวียนตามลำดับคน — คนที่ 1 หยุดจันทร์
                  คนที่ 2 หยุดอังคาร ไปจนครบ 7 วันแล้ววนใหม่
                </li>
                <li>
                  วันที่คนหลักหยุด ดึงคนเสริมมาแทน (ต้องไม่ใช่วันหยุดตัวเอง
                  และยังไม่ถูกจัดกะอื่นวันนั้น) — หาไม่ได้จะขึ้นว่า{" "}
                  <strong>ขาดคน</strong>
                </li>
                <li>
                  คนเสริมอาจได้กะไม่เหมือนกันในแต่ละวัน ระบบยังไม่ได้กันเวลาพัก
                  ระหว่างกะดึกต่อกะเช้า — ตรวจในหน้าตัวอย่างก่อนบันทึก
                </li>
              </ul>
            }
          />
        </div>
      )}
    </Modal>
  );
}
