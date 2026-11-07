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
  Segmented,
  Select,
  Space,
  Tooltip,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  useShiftAutoPlanPositionsQuery,
  useShiftAutoPlanRolesQuery,
  useShiftCalendarQuery,
} from "@/hooks/shifts/useShiftQueries";
import {
  useApplyShiftAutoPlanMutation,
  useShiftAutoPlanPreviewMutation,
} from "@/hooks/shifts/useShiftMutations";
import type {
  Shift,
  ShiftAutoPlan,
  ShiftAutoPlanPositionInput,
  ShiftAutoPlanProductionPhase,
} from "@/types/shifts";

import ShiftAutoPlanPreview from "./ShiftAutoPlanPreview";
import styles from "./ShiftAutoPlanModal.module.css";

const PHASE_LABEL: Record<ShiftAutoPlanProductionPhase, string> = {
  RUN: "ปฏิบัติงานปกติ",
  SHUTDOWN: "ช่วงสิ้นสุดรอบผลิต",
};

const NO_DAYS_MESSAGE = "ไม่มีวันที่สำหรับจัดกะประเภทนี้ในเดือนที่เลือก";

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
  /** เดือนที่ปฏิทินเปิดอยู่ — ใช้เป็นค่าเริ่มต้นของเดือนที่จะจัด */
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
  const t = useT();
  const lang = useLanguage();
  const positionWord = lang === "en" ? "Position" : "แผนก";
  // โมดัลถูก mount ใหม่ทุกครั้งที่เปิด (หน้าปฏิทิน render แบบมีเงื่อนไข)
  // จึงตั้งค่าเริ่มต้นตอนสร้าง state ได้เลย ไม่ต้องมี effect รีเซ็ต
  const [targetMonth, setTargetMonth] = useState<Dayjs>(month);
  const [productionPhase, setProductionPhase] =
    useState<ShiftAutoPlanProductionPhase>("RUN");
  const [positions, setPositions] = useState<PositionDraft[]>(() => [
    { key: newKey(), demands: initialDemands(shifts) },
  ]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState<ShiftAutoPlan | null>(null);

  // ขั้นเลือกบทบาทมาก่อนขั้นกรอกจำนวนคน — ข้ามได้ถ้าจะเอาพนักงานทุกคน
  const [step, setStep] = useState<"roles" | "setup">("roles");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [includeEmployeesWithoutRole, setIncludeEmployeesWithoutRole] =
    useState(false);

  const monthRange = useMemo(
    () => ({
      dateFrom: targetMonth.startOf("month").format("YYYY-MM-DD"),
      dateTo: targetMonth.endOf("month").format("YYYY-MM-DD"),
    }),
    [targetMonth],
  );
  const calendarQuery = useShiftCalendarQuery(monthRange);
  const rolesQuery = useShiftAutoPlanRolesQuery(open);
  const previewMutation = useShiftAutoPlanPreviewMutation();
  const applyMutation = useApplyShiftAutoPlanMutation();

  const roleOptions = rolesQuery.data?.data;

  /** sort ให้ key คงที่ ไม่ว่าจะกดเลือกบทบาทเรียงลำดับไหน */
  const positionsParams = useMemo(
    () => ({
      roleIds: roleIds.length > 0 ? [...roleIds].sort() : undefined,
      includeEmployeesWithoutRole: includeEmployeesWithoutRole || undefined,
    }),
    [roleIds, includeEmployeesWithoutRole],
  );

  const positionsQuery = useShiftAutoPlanPositionsQuery(
    positionsParams,
    open && step === "setup",
  );

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

  /** นับจากปฏิทินเดือนนั้นเท่านั้น — backend คิดวันจากรอบการผลิตที่ยืนยันแล้วชุดเดียวกัน */
  const matchingDays = useMemo(
    () =>
      (calendarQuery.data?.data.days ?? [])
        .filter((day) => day.productionDay?.dayType === productionPhase)
        .map((day) => day.date),
    [calendarQuery.data, productionPhase],
  );
  const calendarReady = calendarQuery.isSuccess;
  const noMatchingDays = calendarReady && matchingDays.length === 0;

  /** ใช้ชุดเดียวกันทั้ง preview และ apply (ไม่งั้นบันทึกคนละช่วงกับที่เพิ่งดู) */
  const period = {
    payload: {
      month: targetMonth.format("YYYY-MM"),
      productionPhase,
    },
    label: `${t(PHASE_LABEL[productionPhase])} ${targetMonth.format("MM/YYYY")}`,
  };
  const shutdownPhase = productionPhase === "SHUTDOWN";

  const shiftOptions = shifts.map((shift) => ({
    value: shift.id,
    label: `${shift.name} · ${shift.startTime}-${shift.endTime}${shift.isOvernight ? ` ${t("(ข้ามคืน)")}` : ""}`,
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
  const canPreview =
    requestPositions.length > 0 && calendarReady && matchingDays.length > 0;
  const previewBlockedReason = calendarQuery.isError
    ? t("โหลดปฏิทินของเดือนที่เลือกไม่สำเร็จ")
    : !calendarReady
    ? t("กำลังโหลดปฏิทินของเดือนที่เลือก")
    : matchingDays.length === 0
      ? t(NO_DAYS_MESSAGE)
      : requestPositions.length === 0
        ? t("เลือกแผนกและจำนวนคนต่อกะก่อน")
        : undefined;

  /**
   * ตัวกรองต้องส่งเหมือนกันทั้ง preview และ apply
   * ถ้าลืมใส่ที่ apply จะบันทึกตารางที่ต่างจากที่ HR เพิ่งดูไป
   */
  const filterPayload = {
    roleIds: roleIds.length > 0 ? roleIds : undefined,
    includeEmployeesWithoutRole: includeEmployeesWithoutRole || undefined,
  };

  const handlePreview = async () => {
    try {
      const response = await previewMutation.mutateAsync({
        ...period.payload,
        positions: requestPositions,
        ...filterPayload,
        note: note.trim() || undefined,
      });
      setPlan(response.data);

      /**
       * เดือนที่มีรอบกะอยู่แล้ว = ติ๊ก "ทับ" ให้เลย
       * ค่าเริ่มต้นไม่ทับทำให้กดบันทึกแล้วไม่มีอะไรเกิดขึ้น ซึ่งเข้าใจผิดง่ายมาก
       * (ยังเอาติ๊กออกได้ถ้าไม่ต้องการทับ)
       */
      if (response.data.existingRoundCount > 0) {
        setOverwriteExisting(true);
      }
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว
    }
  };

  const handleApply = async (forcePublish = false) => {
    try {
      const response = await applyMutation.mutateAsync({
        ...period.payload,
        positions: requestPositions,
        ...filterPayload,
        overwriteExisting,
        forcePublish: forcePublish || undefined,
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

  /** บันทึกไปแล้วแต่ไม่มีอะไรถูกเขียน — ต้องให้ติ๊กทับแล้วกดซ้ำได้จากหน้านี้เลย */
  const nothingWritten = Boolean(
    plan?.applied &&
      plan.writeResult &&
      plan.writeResult.createdRounds === 0 &&
      plan.writeResult.updatedRounds === 0 &&
      plan.writeResult.addedMembers === 0,
  );
  const canSave = Boolean(plan) && (!plan?.applied || nothingWritten);

  return (
    <Modal
      open={open}
      title={t("จัดตารางกะอัตโนมัติ")}
      width={plan ? 1120 : 720}
      onCancel={onClose}
      destroyOnHidden
      centered
      footer={
        <div className={styles.footer}>
          <Button onClick={onClose}>
            {plan?.applied && !nothingWritten ? t("เสร็จสิ้น") : t("ปิด")}
          </Button>
          {canSave && plan ? (
            <>
              <Button onClick={() => setPlan(null)}>{t("กลับไปแก้ค่า")}</Button>
              {plan.coverage.pass ? (
                <Popconfirm
                  title={`${t("บันทึกตารางกะ")} ${period.label}`}
                  description={
                    <div className={styles.ruleList}>
                      <p>
                        {t("รอบกะที่จะเขียน")} <strong>{plan.plannedRoundCount}</strong> {lang === "en" ? "rounds" : "รอบ"} ·{" "}
                        {t("ลงคน")} <strong>{plan.filledSlots}</strong> {lang === "en" ? "slots" : "ช่อง"}
                      </p>
                      {plan.existingRoundCount > 0 ? (
                        <p>
                          {t("มีรอบกะเดิมทับอยู่")} <strong>{plan.existingRoundCount}</strong> {lang === "en" ? "rounds" : "รอบ"} —{" "}
                          {overwriteExisting ? (
                            <strong>{t("จะเขียนทับรายชื่อเดิมทั้งหมด")}</strong>
                          ) : (
                            <strong>{t("จะถูกข้ามไป ไม่มีคนถูกลงกะในรอบเหล่านั้น")}</strong>
                          )}
                        </p>
                      ) : null}
                      {!plan.workload.pass ? (
                        <p>
                          {t("จำนวนวันทำงานยังต่างกันสูงสุด {n} วัน — บันทึกได้แต่ควรตรวจในตัวอย่างก่อน", {
                            n: plan.workload.maxSpread,
                          })}
                        </p>
                      ) : null}
                    </div>
                  }
                  okText={t("บันทึก")}
                  cancelText={t("ยกเลิก")}
                  onConfirm={() => void handleApply()}
                >
                  <Button type="primary" loading={applyMutation.isPending}>
                    {t("บันทึกตารางกะ")}
                  </Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title={t("บังคับบันทึกทั้งที่ยังขาดกำลังคน?")}
                  description={
                    <div className={styles.ruleList}>
                      <p>
                        {t("Coverage ยังไม่ผ่าน — ขาด")}{" "}
                        <strong>{plan.coverage.shortageSlots}</strong> {t("ช่อง จากที่ต้องใช้")}{" "}
                        <strong>{plan.coverage.requiredSlots}</strong> {lang === "en" ? "slots" : "ช่อง"}
                      </p>
                      <p>{t("ตารางจะถูกบันทึกตามที่จัดได้ และช่องที่ขาดคนจะว่างไว้")}</p>
                    </div>
                  }
                  okText={t("บังคับบันทึก")}
                  cancelText={t("ยกเลิก")}
                  onConfirm={() => void handleApply(true)}
                >
                  <Button danger loading={applyMutation.isPending}>
                    {t("บังคับบันทึกทั้งที่ขาดคน")}
                  </Button>
                </Popconfirm>
              )}
            </>
          ) : step === "roles" ? (
            <>
              <Button
                onClick={() => {
                  setRoleIds([]);
                  setIncludeEmployeesWithoutRole(false);
                  setStep("setup");
                }}
              >
                {t("ข้ามขั้นนี้ (ใช้พนักงานทุกคน)")}
              </Button>
              <Button type="primary" onClick={() => setStep("setup")}>
                {t("ถัดไป")}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setStep("roles")}>{t("กลับไปเลือกบทบาท")}</Button>
              <Tooltip title={previewBlockedReason}>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  disabled={!canPreview}
                  loading={previewMutation.isPending}
                  onClick={() => void handlePreview()}
                >
                  {t("ดูตัวอย่าง")}
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      }
    >
      {plan ? (
        <div className={styles.body}>
          {plan.applied && plan.writeResult ? (
            <Alert
              // ไม่ได้เขียนอะไรเลย = ไม่ใช่ success ต้องขึ้นเหลืองให้เห็นว่าต้องทำอะไรต่อ
              type={
                plan.writeResult.createdRounds === 0 &&
                plan.writeResult.updatedRounds === 0 &&
                plan.writeResult.addedMembers === 0
                  ? "warning"
                  : "success"
              }
              showIcon
              title={
                plan.writeResult.createdRounds === 0 &&
                plan.writeResult.updatedRounds === 0 &&
                plan.writeResult.addedMembers === 0
                  ? t("ยังไม่ได้บันทึกอะไร — รอบกะ {n} รอบมีอยู่แล้ว", {
                      n: plan.writeResult.skippedRounds.length,
                    })
                  : t("บันทึกแล้ว — สร้าง {c} รอบ · ทับ {u} รอบ · ลงคน {m} ช่อง", {
                      c: plan.writeResult.createdRounds,
                      u: plan.writeResult.updatedRounds,
                      m: plan.writeResult.addedMembers,
                    })
              }
              description={
                <div className={styles.ruleList}>
                  {plan.writeResult.skippedRounds.length > 0 ? (
                    <p>
                      {t(
                        "ข้ามไป {n} รอบ เพราะมีรอบกะอยู่แล้ว — ติ๊ก \"ทับรอบกะที่มีอยู่แล้ว\" แล้วบันทึกใหม่ถ้าต้องการเขียนทับ",
                        { n: plan.writeResult.skippedRounds.length },
                      )}
                      {": "}
                      {plan.writeResult.skippedRounds
                        .slice(0, 12)
                        .map(
                          (round) =>
                            `${round.date.slice(8)}/${round.date.slice(5, 7)} ${round.shiftName}`,
                        )
                        .join(", ")}
                      {plan.writeResult.skippedRounds.length > 12 ? " …" : ""}
                    </p>
                  ) : null}
                  {plan.writeResult.removedMembers > 0 ? (
                    <p>
                      {t("เขียนทับรายชื่อเดิมไป {n} รายการ", {
                        n: plan.writeResult.removedMembers,
                      })}
                    </p>
                  ) : null}
                  <p>{t("เปิดปฏิทินหรือหน้า \"รายการเข้ากะ\" เพื่อตรวจผลได้เลย")}</p>
                </div>
              }
            />
          ) : null}

          {hasExistingRounds && canSave ? (
            <Checkbox
              checked={overwriteExisting}
              onChange={(event) => setOverwriteExisting(event.target.checked)}
            >
              {t("ทับรายชื่อในรอบกะที่มีอยู่แล้ว {n} รอบ", {
                n: plan.existingRoundCount,
              })}
              {overwriteExisting
                ? ""
                : ` ${t("— ไม่ติ๊ก = ข้ามรอบเหล่านั้น จะไม่มีคนถูกลงกะ")}`}
            </Checkbox>
          ) : null}
          <ShiftAutoPlanPreview plan={plan} shifts={shifts} />
        </div>
      ) : step === "roles" ? (
        <div className={styles.body}>
          <div className={styles.field}>
            <span className={styles.label}>{t("บทบาทที่จะเอามาจัด")}</span>
            <Select
              className={styles.roleSelect}
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              maxTagCount="responsive"
              placeholder={t("ไม่เลือก = เอาพนักงานทุกคน")}
              loading={rolesQuery.isLoading}
              value={roleIds}
              onChange={(value) => {
                setRoleIds(value);
                invalidatePlan();
              }}
              options={(roleOptions?.roles ?? []).map((role) => ({
                value: role.roleId,
                label: `${role.roleName} (${role.roleCode}) · ${t("{n} คน", { n: role.employeeCount })}`,
              }))}
              notFoundContent={t("ยังไม่มีบทบาทในระบบ")}
            />
          </div>

          {roleOptions && roleOptions.employeesWithoutRoleCount > 0 ? (
            <Checkbox
              checked={includeEmployeesWithoutRole}
              onChange={(event) => {
                setIncludeEmployeesWithoutRole(event.target.checked);
                invalidatePlan();
              }}
            >
              {t("รวมพนักงานที่ยังไม่มีบทบาทเลย ({n} คน)", {
                n: roleOptions.employeesWithoutRoleCount,
              })}
            </Checkbox>
          ) : null}

          {roleOptions &&
          roleIds.length > 0 &&
          !includeEmployeesWithoutRole &&
          roleOptions.employeesWithoutRoleCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={t("มีพนักงาน {n} คนที่ไม่มีบทบาทในระบบ — จะไม่ถูกจัดกะ", {
                n: roleOptions.employeesWithoutRoleCount,
              })}
              description={t("พนักงานที่ไม่ได้เปิด login ให้ใช้ระบบ จะไม่มีบทบาทติดตัวเลย ซึ่งมักเป็นคนหน้างานที่ต้องเข้ากะ — ติ๊กช่องด้านบนถ้าต้องการดึงกลับมาด้วย")}
            />
          ) : null}

          <Alert
            type="info"
            showIcon
            title={t("บทบาทใช้เป็นตัวกรองคน ไม่ใช่ตัวแบ่งกลุ่ม")}
            description={
              <ul className={styles.ruleList}>
                <li>
                  {t("เลือกบทบาท = เอาเฉพาะคนกลุ่มนั้นมาจัด · ไม่เลือก = เอาพนักงานทุกคน")}
                </li>
                <li>
                  {t("การแบ่งกลุ่มและการนับจำนวนคนต่อกะ ยังใช้")}{" "}
                  <strong>{positionWord}</strong>{" "}
                  {t("(ตำแหน่งของพนักงาน) ในขั้นถัดไป")}
                </li>
                <li>
                  {t("คนหนึ่งมีได้หลายบทบาท — เลือกหลายบทบาทที่มีคนซ้อนกัน ระบบนับให้ครั้งเดียว")}
                </li>
                {roleOptions ? (
                  <li>
                    {t("พนักงาน active ทั้งหมด {n} คน (ผลรวมของทุกบทบาทจะมากกว่านี้ เพราะคนหนึ่งมีได้หลายบทบาท)", {
                      n: roleOptions.activeEmployeeCount,
                    })}
                  </li>
                ) : null}
              </ul>
            }
          />
        </div>
      ) : (
        <div className={styles.body}>
          {shifts.length === 0 ? (
            <Empty description={t("ยังไม่มีกะในระบบ — กด จัดการกะ เพื่อสร้างกะเช้า/บ่าย/ดึกก่อน")} />
          ) : null}

          <Alert
            type="info"
            showIcon
            title={
              roleIds.length > 0
                ? t("กรองบทบาทไว้ {n} บทบาท{extra} — จำนวนคนด้านล่างนับหลังกรองแล้ว", {
                    n: roleIds.length,
                    extra: includeEmployeesWithoutRole ? ` ${t("+ คนที่ไม่มีบทบาท")}` : "",
                  })
                : includeEmployeesWithoutRole
                  ? t("เอาเฉพาะพนักงานที่ไม่มีบทบาท")
                  : t("ไม่กรองบทบาท — ใช้พนักงานทุกคน")
            }
            action={
              <Button size="small" onClick={() => setStep("roles")}>
                {t("แก้ไขบทบาท")}
              </Button>
            }
          />

          <div className={styles.field}>
            <span className={styles.label}>{t("เดือนที่จะจัด")}</span>
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

          <div className={styles.field}>
            <span className={styles.label}>{t("ประเภทการปฏิบัติงาน")}</span>
            <Segmented<ShiftAutoPlanProductionPhase>
              aria-label={t("ประเภทการปฏิบัติงาน")}
              value={productionPhase}
              onChange={(value) => {
                setProductionPhase(value);
                invalidatePlan();
              }}
              options={[
                { label: t(PHASE_LABEL.RUN), value: "RUN" },
                { label: t(PHASE_LABEL.SHUTDOWN), value: "SHUTDOWN" },
              ]}
            />
            {calendarReady && matchingDays.length > 0 ? (
              <span className={styles.hint}>
                {t("จะจัด")} <strong>{matchingDays.length}</strong> {t("วัน ในเดือน")}{" "}
                {targetMonth.format("MM/YYYY")} {t("— ตามรอบการผลิตที่ยืนยันแล้ว")}
              </span>
            ) : null}
          </div>

          {noMatchingDays ? (
            <Alert type="warning" showIcon title={t(NO_DAYS_MESSAGE)} />
          ) : null}
          {calendarQuery.isError ? (
            <Alert
              type="error"
              showIcon
              title={t("โหลดปฏิทินของเดือนที่เลือกไม่สำเร็จ")}
              action={
                <Button size="small" onClick={() => void calendarQuery.refetch()}>
                  {t("ลองใหม่")}
                </Button>
              }
            />
          ) : null}

          {positions.map((item) => {
            const dailyHeadcount = item.demands.reduce(
              (sum, demand) =>
                sum + (demand.shiftId ? Math.max(demand.headcount, 0) : 0),
              0,
            );
            const minimumEmployees = shutdownPhase
              ? dailyHeadcount
              : Math.ceil((dailyHeadcount * 7) / 6);
            const available = item.position
              ? (employeeCountByPosition.get(item.position) ?? 0)
              : 0;
            const short = Boolean(
              item.position && dailyHeadcount > 0 && available < minimumEmployees,
            );

            return (
              <div key={item.key} className={styles.positionCard}>
                <div className={styles.positionHead}>
                  <span className={styles.columnLabel}>{positionWord}</span>
                  <Select
                    className={styles.positionSelect}
                    aria-label={positionWord}
                    showSearch
                    optionFilterProp="label"
                    placeholder={t("เลือกแผนก")}
                    loading={positionsQuery.isLoading}
                    value={item.position}
                    onChange={(value) =>
                      updatePosition(item.key, { position: value })
                    }
                    notFoundContent={t("ยังไม่มีพนักงานที่ระบุแผนกไว้")}
                    options={positionOptions.map((option) => ({
                      value: option.position,
                      label: `${option.position} (${t("{n} คน", { n: option.employeeCount })})`,
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
                      {t("ลบ")}
                    </Button>
                  ) : null}
                </div>

                <div className={styles.demandList}>
                  <div className={styles.demandHeader} aria-hidden>
                    <span className={styles.shiftSelect}>{t("เวลาทำงาน")}</span>
                    <span className={styles.headcountInput}>
                      {t("จำนวนที่ต้องการต่อกะ")}
                    </span>
                    {item.demands.length > 1 ? (
                      <span className={styles.demandActionSpacer} />
                    ) : null}
                  </div>
                  {item.demands.map((demand) => (
                    <div key={demand.key} className={styles.demandRow}>
                      <Select
                        className={styles.shiftSelect}
                        aria-label={t("เวลาทำงาน")}
                        showSearch
                        optionFilterProp="label"
                        placeholder={t("เลือกกะ")}
                        value={demand.shiftId}
                        options={shiftOptions}
                        onChange={(value) =>
                          updateDemand(item.key, demand.key, {
                            shiftId: value,
                          })
                        }
                      />
                      <Space.Compact className={styles.headcountInput}>
                        <InputNumber
                          aria-label={t("จำนวนที่ต้องการต่อกะ")}
                          min={0}
                          max={100}
                          value={demand.headcount}
                          onChange={(value) =>
                            updateDemand(item.key, demand.key, {
                              headcount: value ?? 0,
                            })
                          }
                        />
                        <Button disabled>{t("คน")}</Button>
                      </Space.Compact>
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
                    {t("เพิ่มกะ")}
                  </Button>
                </div>

                <p className={styles.positionSummary}>
                  {t("ต้องใช้")} <strong>{dailyHeadcount}</strong> {t("คน/วัน")} · {t("ขั้นต่ำ")}{" "}
                  <strong>{minimumEmployees}</strong> {t("คน")} (
                  {shutdownPhase
                    ? t("ไม่มีวันหยุดประจำสัปดาห์")
                    : t("ปัดขึ้นจาก {n} × 7 ÷ 6", { n: dailyHeadcount })}
                  ) ·{" "}
                  {item.position ? (
                    <>
                      {t("มีพนักงาน")}{" "}
                      <strong className={short ? styles.shortValue : undefined}>
                        {available}
                      </strong>{" "}
                      {t("คน")}
                    </>
                  ) : (
                    t("ยังไม่เลือกแผนก")
                  )}
                </p>

                {short ? (
                  <Alert
                    type="warning"
                    showIcon
                    title={t("คนน้อยกว่าขั้นต่ำ")}
                    description={t("แผนกนี้มี {a} คน แต่ควรมี {m} คน — จัดได้แต่จะมีช่องขาดคน", {
                      a: available,
                      m: minimumEmployees,
                    })}
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
            {t("เพิ่มแผนก")}
          </Button>

          <div className={styles.field}>
            <span className={styles.label}>{t("หมายเหตุ")}</span>
            <Input.TextArea
              rows={2}
              value={note}
              placeholder={t("เช่น จัดอัตโนมัติรอบเดือนกันยายน")}
              onChange={(event) => {
                setNote(event.target.value);
                invalidatePlan();
              }}
            />
          </div>

          <Alert
            type="info"
            showIcon
            title={t("ระบบจัดให้แบบนี้")}
            description={
              <ul className={styles.ruleList}>
                <li>
                  {t("จัดเฉพาะวันที่เป็น")} <strong>{t(PHASE_LABEL[productionPhase])}</strong>{" "}
                  {t("ในเดือนที่เลือก ตามรอบการผลิตที่ยืนยันแล้ว — วันประเภทอื่นและเดือนอื่นไม่ถูกแตะ (วันหยุดในปฏิทินที่ตรงกับวันประเภทนี้ก็ถูกจัดด้วย)")}
                </li>
                <li>
                  {t("กำหนดจำนวนคนที่ต้องใช้ต่อ")} <strong>{t("แผนก + กะ")}</strong>{" "}
                  {t("แล้วแบ่งพนักงานไปคนละกะ")}
                </li>
                <li>
                  {shutdownPhase
                    ? t("ช่วงสิ้นสุดรอบผลิตไม่มีวันหยุดประจำสัปดาห์ — ขั้นต่ำต่อกะเท่ากับจำนวนคนที่ต้องใช้")
                    : t("วันหยุดประจำสัปดาห์เวียนด้วย % 7 ในกลุ่มแผนก + กะนั้น (คนที่ 1 ของกะหยุดจันทร์)")}
                </li>
                <li>
                  {t("คนที่ลาอนุมัติแล้วหรือติดกะอื่นวันนั้นจะไม่ถูกเลือก — เลือกคนที่ทำงานน้อยสุดก่อน")}
                </li>
                <li>
                  {t("ตรวจ Coverage (จัดครบหรือขาดคน) และ Workload (วันทำงานใกล้เคียงกัน) ในหน้าตัวอย่างก่อนบันทึก")}
                </li>
              </ul>
            }
          />
        </div>
      )}
    </Modal>
  );
}
