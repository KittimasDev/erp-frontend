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
    label: `${PHASE_LABEL[productionPhase]} ${targetMonth.format("MM/YYYY")}`,
  };
  const shutdownPhase = productionPhase === "SHUTDOWN";

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
  const canPreview =
    requestPositions.length > 0 && calendarReady && matchingDays.length > 0;
  const previewBlockedReason = calendarQuery.isError
    ? "โหลดปฏิทินของเดือนที่เลือกไม่สำเร็จ"
    : !calendarReady
    ? "กำลังโหลดปฏิทินของเดือนที่เลือก"
    : matchingDays.length === 0
      ? NO_DAYS_MESSAGE
      : requestPositions.length === 0
        ? "เลือกแผนกและจำนวนคนต่อกะก่อน"
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
      title="จัดตารางกะอัตโนมัติ"
      width={plan ? 1120 : 720}
      onCancel={onClose}
      destroyOnHidden
      centered
      footer={
        <div className={styles.footer}>
          <Button onClick={onClose}>
            {plan?.applied && !nothingWritten ? "เสร็จสิ้น" : "ปิด"}
          </Button>
          {canSave && plan ? (
            <>
              <Button onClick={() => setPlan(null)}>กลับไปแก้ค่า</Button>
              {plan.coverage.pass ? (
                <Popconfirm
                  title={`บันทึกตารางกะ ${period.label}`}
                  description={
                    <div className={styles.ruleList}>
                      <p>
                        รอบกะที่จะเขียน <strong>{plan.plannedRoundCount}</strong> รอบ ·
                        ลงคน <strong>{plan.filledSlots}</strong> ช่อง
                      </p>
                      {plan.existingRoundCount > 0 ? (
                        <p>
                          มีรอบกะเดิมทับอยู่ <strong>{plan.existingRoundCount}</strong> รอบ —{" "}
                          {overwriteExisting ? (
                            <strong>จะเขียนทับรายชื่อเดิมทั้งหมด</strong>
                          ) : (
                            <strong>จะถูกข้ามไป ไม่มีคนถูกลงกะในรอบเหล่านั้น</strong>
                          )}
                        </p>
                      ) : null}
                      {!plan.workload.pass ? (
                        <p>
                          จำนวนวันทำงานยังต่างกันสูงสุด {plan.workload.maxSpread} วัน —
                          บันทึกได้แต่ควรตรวจในตัวอย่างก่อน
                        </p>
                      ) : null}
                    </div>
                  }
                  okText="บันทึก"
                  cancelText="ยกเลิก"
                  onConfirm={() => void handleApply()}
                >
                  <Button type="primary" loading={applyMutation.isPending}>
                    บันทึกตารางกะ
                  </Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="บังคับบันทึกทั้งที่ยังขาดกำลังคน?"
                  description={
                    <div className={styles.ruleList}>
                      <p>
                        Coverage ยังไม่ผ่าน — ขาด{" "}
                        <strong>{plan.coverage.shortageSlots}</strong> ช่อง จากที่ต้องใช้{" "}
                        <strong>{plan.coverage.requiredSlots}</strong> ช่อง
                      </p>
                      <p>ตารางจะถูกบันทึกตามที่จัดได้ และช่องที่ขาดคนจะว่างไว้</p>
                    </div>
                  }
                  okText="บังคับบันทึก"
                  cancelText="ยกเลิก"
                  onConfirm={() => void handleApply(true)}
                >
                  <Button danger loading={applyMutation.isPending}>
                    บังคับบันทึกทั้งที่ขาดคน
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
                ข้ามขั้นนี้ (ใช้พนักงานทุกคน)
              </Button>
              <Button type="primary" onClick={() => setStep("setup")}>
                ถัดไป
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setStep("roles")}>กลับไปเลือกบทบาท</Button>
              <Tooltip title={previewBlockedReason}>
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
                  ? `ยังไม่ได้บันทึกอะไร — รอบกะ ${plan.writeResult.skippedRounds.length} รอบมีอยู่แล้ว`
                  : `บันทึกแล้ว — สร้าง ${plan.writeResult.createdRounds} รอบ · ทับ ${plan.writeResult.updatedRounds} รอบ · ลงคน ${plan.writeResult.addedMembers} ช่อง`
              }
              description={
                <div className={styles.ruleList}>
                  {plan.writeResult.skippedRounds.length > 0 ? (
                    <p>
                      ข้ามไป {plan.writeResult.skippedRounds.length} รอบ
                      เพราะมีรอบกะอยู่แล้ว — ติ๊ก
                      &quot;ทับรอบกะที่มีอยู่แล้ว&quot; แล้วบันทึกใหม่ถ้าต้องการเขียนทับ
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
                      เขียนทับรายชื่อเดิมไป {plan.writeResult.removedMembers} รายการ
                    </p>
                  ) : null}
                  <p>เปิดปฏิทินหรือหน้า &quot;รายการเข้ากะ&quot; เพื่อตรวจผลได้เลย</p>
                </div>
              }
            />
          ) : null}

          {hasExistingRounds && canSave ? (
            <Checkbox
              checked={overwriteExisting}
              onChange={(event) => setOverwriteExisting(event.target.checked)}
            >
              ทับรายชื่อในรอบกะที่มีอยู่แล้ว {plan.existingRoundCount} รอบ
              {overwriteExisting
                ? ""
                : " — ไม่ติ๊ก = ข้ามรอบเหล่านั้น จะไม่มีคนถูกลงกะ"}
            </Checkbox>
          ) : null}
          <ShiftAutoPlanPreview plan={plan} shifts={shifts} />
        </div>
      ) : step === "roles" ? (
        <div className={styles.body}>
          <div className={styles.field}>
            <span className={styles.label}>บทบาทที่จะเอามาจัด</span>
            <Select
              className={styles.roleSelect}
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              maxTagCount="responsive"
              placeholder="ไม่เลือก = เอาพนักงานทุกคน"
              loading={rolesQuery.isLoading}
              value={roleIds}
              onChange={(value) => {
                setRoleIds(value);
                invalidatePlan();
              }}
              options={(roleOptions?.roles ?? []).map((role) => ({
                value: role.roleId,
                label: `${role.roleName} (${role.roleCode}) · ${role.employeeCount} คน`,
              }))}
              notFoundContent="ยังไม่มีบทบาทในระบบ"
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
              รวมพนักงานที่ยังไม่มีบทบาทเลย ({roleOptions.employeesWithoutRoleCount}{" "}
              คน)
            </Checkbox>
          ) : null}

          {roleOptions &&
          roleIds.length > 0 &&
          !includeEmployeesWithoutRole &&
          roleOptions.employeesWithoutRoleCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              title={`มีพนักงาน ${roleOptions.employeesWithoutRoleCount} คนที่ไม่มีบทบาทในระบบ — จะไม่ถูกจัดกะ`}
              description="พนักงานที่ไม่ได้เปิด login ให้ใช้ระบบ จะไม่มีบทบาทติดตัวเลย ซึ่งมักเป็นคนหน้างานที่ต้องเข้ากะ — ติ๊กช่องด้านบนถ้าต้องการดึงกลับมาด้วย"
            />
          ) : null}

          <Alert
            type="info"
            showIcon
            title="บทบาทใช้เป็นตัวกรองคน ไม่ใช่ตัวแบ่งกลุ่ม"
            description={
              <ul className={styles.ruleList}>
                <li>
                  เลือกบทบาท = เอาเฉพาะคนกลุ่มนั้นมาจัด · ไม่เลือก = เอาพนักงานทุกคน
                </li>
                <li>
                  การแบ่งกลุ่มและการนับจำนวนคนต่อกะ ยังใช้ <strong>แผนก</strong>{" "}
                  (ตำแหน่งของพนักงาน) ในขั้นถัดไป
                </li>
                <li>
                  คนหนึ่งมีได้หลายบทบาท — เลือกหลายบทบาทที่มีคนซ้อนกัน
                  ระบบนับให้ครั้งเดียว
                </li>
                {roleOptions ? (
                  <li>
                    พนักงาน active ทั้งหมด {roleOptions.activeEmployeeCount} คน
                    (ผลรวมของทุกบทบาทจะมากกว่านี้ เพราะคนหนึ่งมีได้หลายบทบาท)
                  </li>
                ) : null}
              </ul>
            }
          />
        </div>
      ) : (
        <div className={styles.body}>
          {shifts.length === 0 ? (
            <Empty description="ยังไม่มีกะในระบบ — กด จัดการกะ เพื่อสร้างกะเช้า/บ่าย/ดึกก่อน" />
          ) : null}

          <Alert
            type="info"
            showIcon
            title={
              roleIds.length > 0
                ? `กรองบทบาทไว้ ${roleIds.length} บทบาท${includeEmployeesWithoutRole ? " + คนที่ไม่มีบทบาท" : ""} — จำนวนคนด้านล่างนับหลังกรองแล้ว`
                : includeEmployeesWithoutRole
                  ? "เอาเฉพาะพนักงานที่ไม่มีบทบาท"
                  : "ไม่กรองบทบาท — ใช้พนักงานทุกคน"
            }
            action={
              <Button size="small" onClick={() => setStep("roles")}>
                แก้ไขบทบาท
              </Button>
            }
          />

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

          <div className={styles.field}>
            <span className={styles.label}>ประเภทการปฏิบัติงาน</span>
            <Segmented<ShiftAutoPlanProductionPhase>
              aria-label="ประเภทการปฏิบัติงาน"
              value={productionPhase}
              onChange={(value) => {
                setProductionPhase(value);
                invalidatePlan();
              }}
              options={[
                { label: PHASE_LABEL.RUN, value: "RUN" },
                { label: PHASE_LABEL.SHUTDOWN, value: "SHUTDOWN" },
              ]}
            />
            {calendarReady && matchingDays.length > 0 ? (
              <span className={styles.hint}>
                จะจัด <strong>{matchingDays.length}</strong> วัน ในเดือน{" "}
                {targetMonth.format("MM/YYYY")} — ตามรอบการผลิตที่ยืนยันแล้ว
              </span>
            ) : null}
          </div>

          {noMatchingDays ? (
            <Alert type="warning" showIcon title={NO_DAYS_MESSAGE} />
          ) : null}
          {calendarQuery.isError ? (
            <Alert
              type="error"
              showIcon
              title="โหลดปฏิทินของเดือนที่เลือกไม่สำเร็จ"
              action={
                <Button size="small" onClick={() => void calendarQuery.refetch()}>
                  ลองใหม่
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
                  <span className={styles.columnLabel}>แผนก</span>
                  <Select
                    className={styles.positionSelect}
                    aria-label="แผนก"
                    showSearch
                    optionFilterProp="label"
                    placeholder="เลือกแผนก"
                    loading={positionsQuery.isLoading}
                    value={item.position}
                    onChange={(value) =>
                      updatePosition(item.key, { position: value })
                    }
                    notFoundContent="ยังไม่มีพนักงานที่ระบุแผนกไว้"
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
                  <div className={styles.demandHeader} aria-hidden>
                    <span className={styles.shiftSelect}>เวลาทำงาน</span>
                    <span className={styles.headcountInput}>
                      จำนวนที่ต้องการต่อกะ
                    </span>
                    {item.demands.length > 1 ? (
                      <span className={styles.demandActionSpacer} />
                    ) : null}
                  </div>
                  {item.demands.map((demand) => (
                    <div key={demand.key} className={styles.demandRow}>
                      <Select
                        className={styles.shiftSelect}
                        aria-label="เวลาทำงาน"
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
                      <Space.Compact className={styles.headcountInput}>
                        <InputNumber
                          aria-label="จำนวนที่ต้องการต่อกะ"
                          min={0}
                          max={100}
                          value={demand.headcount}
                          onChange={(value) =>
                            updateDemand(item.key, demand.key, {
                              headcount: value ?? 0,
                            })
                          }
                        />
                        <Button disabled>คน</Button>
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
                    เพิ่มกะ
                  </Button>
                </div>

                <p className={styles.positionSummary}>
                  ต้องใช้ <strong>{dailyHeadcount}</strong> คน/วัน · ขั้นต่ำ{" "}
                  <strong>{minimumEmployees}</strong> คน (
                  {shutdownPhase
                    ? "ไม่มีวันหยุดประจำสัปดาห์"
                    : `ปัดขึ้นจาก ${dailyHeadcount} × 7 ÷ 6`}
                  ) ·{" "}
                  {item.position ? (
                    <>
                      มีพนักงาน{" "}
                      <strong className={short ? styles.shortValue : undefined}>
                        {available}
                      </strong>{" "}
                      คน
                    </>
                  ) : (
                    "ยังไม่เลือกแผนก"
                  )}
                </p>

                {short ? (
                  <Alert
                    type="warning"
                    showIcon
                    title="คนน้อยกว่าขั้นต่ำ"
                    description={`แผนกนี้มี ${available} คน แต่ควรมี ${minimumEmployees} คน — จัดได้แต่จะมีช่องขาดคน`}
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
            เพิ่มแผนก
          </Button>

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
                  จัดเฉพาะวันที่เป็น <strong>{PHASE_LABEL[productionPhase]}</strong>{" "}
                  ในเดือนที่เลือก ตามรอบการผลิตที่ยืนยันแล้ว — วันประเภทอื่นและเดือนอื่นไม่ถูกแตะ
                  (วันหยุดในปฏิทินที่ตรงกับวันประเภทนี้ก็ถูกจัดด้วย)
                </li>
                <li>
                  กำหนดจำนวนคนที่ต้องใช้ต่อ <strong>แผนก + กะ</strong> แล้วแบ่งพนักงานไปคนละกะ
                </li>
                <li>
                  {shutdownPhase
                    ? "ช่วงสิ้นสุดรอบผลิตไม่มีวันหยุดประจำสัปดาห์ — ขั้นต่ำต่อกะเท่ากับจำนวนคนที่ต้องใช้"
                    : "วันหยุดประจำสัปดาห์เวียนด้วย % 7 ในกลุ่มแผนก + กะนั้น (คนที่ 1 ของกะหยุดจันทร์)"}
                </li>
                <li>
                  คนที่ลาอนุมัติแล้วหรือติดกะอื่นวันนั้นจะไม่ถูกเลือก — เลือกคนที่ทำงานน้อยสุดก่อน
                </li>
                <li>
                  ตรวจ Coverage (จัดครบหรือขาดคน) และ Workload (วันทำงานใกล้เคียงกัน)
                  ในหน้าตัวอย่างก่อนบันทึก
                </li>
              </ul>
            }
          />
        </div>
      )}
    </Modal>
  );
}
