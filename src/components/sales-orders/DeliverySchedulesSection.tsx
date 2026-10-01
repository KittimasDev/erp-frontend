"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  App,
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
} from "antd";
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelDeliveryScheduleMutation,
  useCreateDeliveryScheduleMutation,
  useDeliverySchedulesQuery,
  useRescheduleDeliveryScheduleMutation,
  useUpdateDeliveryScheduleMutation,
} from "@/hooks/delivery-schedules/useDeliverySchedulesQuery";
import {
  isStaleDocumentConflict,
  staleDocumentMessage,
} from "@/lib/api/conflict";
import { ApiError } from "@/lib/api/client";
import {
  DELIVERY_SCHEDULE_STATUS_COLOR,
  DELIVERY_SCHEDULE_STATUS_LABEL,
  isDeliveryScheduleEditable,
  isDeliveryScheduleReschedulable,
  type DeliverySchedule,
  type DeliveryScheduleStatus,
  type UpsertDeliveryScheduleItemBody,
} from "@/types/delivery-schedules";
import {
  isPreConfirmSalesOrderStatus,
  type SalesOrderItem,
} from "@/types/sales-orders";

const EPS = 0.0005;

function toNum(value: string | number | null | undefined): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function statusTag(status: string) {
  const key = status as DeliveryScheduleStatus;
  return (
    <Tag color={DELIVERY_SCHEDULE_STATUS_COLOR[key] ?? "default"}>
      {DELIVERY_SCHEDULE_STATUS_LABEL[key] ?? status}
    </Tag>
  );
}

type DraftLine = {
  salesOrderItemId: string;
  quantity: number;
};

/**
 * แผงจัดรอบจัดส่งของใบสั่งขาย
 *
 * กติกาที่หน้าจอนี้ต้องสื่อให้ชัด:
 *  - Σ จำนวนทุกรอบ **ต้องเท่ากับ** จำนวนที่ตกลงขาย ก่อนจะยืนยันใบสั่งขายได้
 *  - จำนวนที่ตกลงขายบนบรรทัด SO คือ "สัญญา" · จำนวนจริงที่ส่งอยู่ที่บรรทัดรอบ
 *    (ยกเว้นการยกเลิกรอบหลังยืนยัน ซึ่งลดสัญญาลงตามรอบนั้น)
 *  - แก้รอบได้เฉพาะรอบที่ยังไม่จ่ายของ · **เลื่อนวัน** ทำได้จนก่อนส่งจบ
 *  - ยกเลิกรอบหลังยืนยันใบสั่งขาย **ลดจำนวนและยอดเงิน** ต้องบอกผู้ใช้ก่อนกด
 */
export default function DeliverySchedulesSection({
  salesOrderId,
  salesOrderItems,
  canEdit,
  salesOrderStatus,
  salesOrderEditVersion,
  deliveryStatus,
}: {
  salesOrderId: string;
  salesOrderItems: SalesOrderItem[];
  canEdit: boolean;
  /**
   * เลขรุ่นของใบสั่งขาย — ใช้กับ "เพิ่มรอบ" เท่านั้น
   * (ยังไม่มีรอบให้เทียบ และจำนวนตั้งต้นในกล่องมาจากยอดคงเหลือระดับทั้งใบ)
   */
  salesOrderEditVersion: number;
  /** ต้องรู้เพื่อบอกล่วงหน้าว่าการยกเลิกรอบจะลดจำนวน/ยอดเงินหรือไม่ */
  salesOrderStatus: string;
  /** สรุปจากทุกรอบ — ส่งครบแล้วห้ามเพิ่มรอบ */
  deliveryStatus?: string;
}) {
  const canAddSchedule = canEdit && deliveryStatus !== "DELIVERED";
  const { message } = App.useApp();
  const schedulesQuery = useDeliverySchedulesQuery(salesOrderId);
  const createMutation = useCreateDeliveryScheduleMutation(salesOrderId);
  const updateMutation = useUpdateDeliveryScheduleMutation(salesOrderId);
  const cancelMutation = useCancelDeliveryScheduleMutation(salesOrderId);
  const rescheduleMutation =
    useRescheduleDeliveryScheduleMutation(salesOrderId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliverySchedule | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null);
  const [remark, setRemark] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  /**
   * เลขรุ่นที่กล่องนี้เปิดค้างไว้ตอนแรก — ใช้ตรวจว่ามีคนแก้ทับหรือยัง
   *
   * กล่องพวกนี้ seed ค่าตอนเปิดครั้งเดียว ไม่มี effect sync กลับ ค่าที่ผู้ใช้
   * เห็นจึงเป็นของ ณ วินาทีที่เปิด · ถ้าไม่จำเลขรุ่นไว้ การกดบันทึกจะเอาค่าเก่า
   * ไปทับสิ่งที่คนอื่นเพิ่งแก้
   */
  const [openedVersion, setOpenedVersion] = useState<number>(0);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);

  // ── เลื่อนกำหนดส่ง ─────────────────────────────────────────────────────────
  const [rescheduleTarget, setRescheduleTarget] =
    useState<DeliverySchedule | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState<dayjs.Dayjs | null>(
    null,
  );
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [cascadeDates, setCascadeDates] = useState(true);

  // ── ยกเลิกรอบ ──────────────────────────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState<DeliverySchedule | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  /*
   * ใบแจ้งหนี้ผูกกับใบสั่งขายไม่ผูกกับรอบ backend จึงถามกลับมาให้คนยืนยัน
   * ไม่โชว์ช่องนี้ตั้งแต่แรกเพราะส่วนใหญ่ไม่มีใบแจ้งหนี้ — โชว์ตอน backend ทักมา
   * พร้อมเลขใบจริง จะเข้าใจง่ายกว่าเดาไว้ล่วงหน้า
   */
  const [invoiceWarning, setInvoiceWarning] = useState<string | null>(null);
  const [acknowledgeInvoice, setAcknowledgeInvoice] = useState(false);

  // ห่อด้วย useMemo ไม่ใช่ `?? []` เปล่า — array literal ใหม่ทุก render
  // จะทำให้ dependency ของ useMemo ข้างล่างเปลี่ยนทุกครั้ง คำนวณซ้ำฟรี
  const schedules = useMemo(
    () => schedulesQuery.data ?? [],
    [schedulesQuery.data],
  );
  const activeSchedules = useMemo(
    () => schedules.filter((s) => s.status !== "CANCELLED"),
    [schedules],
  );

  /**
   * ยอดที่จัดรอบไปแล้วต่อบรรทัด SO (ไม่นับรอบที่ยกเลิก)
   * ตัดรอบที่กำลังแก้ออก เพราะจำนวนของมันจะถูกแทนด้วยค่าใน draft
   */
  const scheduledByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const schedule of activeSchedules) {
      if (editing && schedule.id === editing.id) continue;
      for (const line of schedule.items ?? []) {
        map.set(
          line.salesOrderItemId,
          (map.get(line.salesOrderItemId) ?? 0) + toNum(line.quantity),
        );
      }
    }
    return map;
  }, [activeSchedules, editing]);

  const unscheduled = useMemo(
    () =>
      salesOrderItems.map((item) => ({
        item,
        remaining: Math.max(
          toNum(item.quantity) - (scheduledByItem.get(item.id) ?? 0),
          0,
        ),
      })),
    [salesOrderItems, scheduledByItem],
  );

  const totalUnscheduled = unscheduled.reduce(
    (sum, row) => sum + row.remaining,
    0,
  );
  const fullyScheduled = totalUnscheduled <= EPS;

  /** รอบที่กล่องไหนสักกล่องเปิดค้างอยู่ — ใช้เทียบว่าเลขรุ่นขยับไปหรือยัง */
  const openTarget = editing ?? rescheduleTarget ?? cancelTarget;
  const liveVersion = openTarget
    ? schedules.find((row) => row.id === openTarget.id)?.editVersion
    : modalOpen
      ? salesOrderEditVersion
      : undefined;

  /*
    เตือน *ก่อน* ผู้ใช้กดบันทึก ไม่ใช่รอให้ 409 เด้งกลับมา
    ตัวนี้ยังแก้กับดักอีกอย่างด้วย: ด่านเช็คจำนวนเกินฝั่งหน้าจออ่าน scheduledByItem
    จากข้อมูลสด ขณะที่กล่องถือค่าตอนเปิด — ฐานเทียบจึงขยับใต้เท้าผู้ใช้ได้

    คำนวณตอน render ไม่ผ่าน useEffect + setState — มันเป็นค่าที่ derive ได้ตรง ๆ
    จากข้อมูลที่มีอยู่แล้ว การยัดลง state จะได้ render ซ้อนฟรี ๆ
  */
  const versionDrifted =
    liveVersion !== undefined && liveVersion !== openedVersion;
  const staleMessage =
    staleWarning ??
    (versionDrifted
      ? "มีคนอื่นแก้ข้อมูลนี้ระหว่างที่คุณเปิดกล่องค้างไว้ — โหลดค่าล่าสุดก่อนบันทึก"
      : null);

  /** โหลดค่าล่าสุดแล้วเปิดกล่องเดิมซ้ำ — reseed ทุกฟิลด์และเลขรุ่นในทางเดียว */
  async function reloadOpenModal() {
    const refreshed = await schedulesQuery.refetch();
    const rows = refreshed.data ?? [];
    setStaleWarning(null);
    if (editing) {
      const fresh = rows.find((row) => row.id === editing.id);
      if (fresh) openEdit(fresh);
      else setModalOpen(false);
      return;
    }
    if (rescheduleTarget) {
      const fresh = rows.find((row) => row.id === rescheduleTarget.id);
      if (fresh) openReschedule(fresh);
      else setRescheduleTarget(null);
      return;
    }
    if (cancelTarget) {
      const fresh = rows.find((row) => row.id === cancelTarget.id);
      if (fresh) openCancel(fresh);
      else setCancelTarget(null);
      return;
    }
    // กล่อง "เพิ่มรอบ" — จำนวนตั้งต้นคำนวณจาก schedules ที่เพิ่งโหลดมาใหม่
    openCreate();
  }

  const staleAlert = staleMessage ? (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 12 }}
      title="ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น"
      description={staleMessage}
      action={
        <Button size="small" onClick={() => void reloadOpenModal()}>
          โหลดค่าล่าสุด
        </Button>
      }
    />
  ) : null;

  function openCreate() {
    setEditing(null);
    setOpenedVersion(salesOrderEditVersion);
    setStaleWarning(null);
    setDeliveryDate(null);
    setRemark("");
    // ตั้งค่าตั้งต้นเป็น "ที่เหลือทั้งหมด" — เคสที่พบบ่อยสุดคือส่งรอบเดียวจบ
    setDraftLines(
      salesOrderItems.map((item) => ({
        salesOrderItemId: item.id,
        quantity: Math.max(
          toNum(item.quantity) - (scheduledByItem.get(item.id) ?? 0),
          0,
        ),
      })),
    );
    setModalOpen(true);
  }

  function openEdit(schedule: DeliverySchedule) {
    setEditing(schedule);
    setOpenedVersion(schedule.editVersion);
    setStaleWarning(null);
    setDeliveryDate(dayjs(schedule.deliveryDate));
    setRemark(schedule.remark ?? "");
    setDraftLines(
      salesOrderItems.map((item) => {
        const line = (schedule.items ?? []).find(
          (row) => row.salesOrderItemId === item.id,
        );
        return {
          salesOrderItemId: item.id,
          quantity: toNum(line?.quantity),
        };
      }),
    );
    setModalOpen(true);
  }

  async function submit() {
    if (!deliveryDate) {
      message.error("ต้องระบุวันที่จัดส่งของรอบนี้");
      return;
    }
    const items: UpsertDeliveryScheduleItemBody[] = draftLines
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        salesOrderItemId: line.salesOrderItemId,
        quantity: line.quantity,
      }));
    if (!items.length) {
      message.error("ต้องมีสินค้าอย่างน้อย 1 รายการที่จำนวนมากกว่า 0");
      return;
    }

    // ด่านฝั่งหน้าจอ — backend มีด่านจริงอยู่แล้ว (recomputeOrderMoney)
    // แต่บอกก่อนกดส่งจะเข้าใจง่ายกว่าเจอ error หลังบันทึก
    for (const line of items) {
      const item = salesOrderItems.find((row) => row.id === line.salesOrderItemId);
      if (!item) continue;
      const already = scheduledByItem.get(line.salesOrderItemId) ?? 0;
      if (already + line.quantity - toNum(item.quantity) > EPS) {
        message.error(
          `${item.itemCode ?? item.itemNameTh ?? "สินค้า"} จัดรอบรวมกันเกินจำนวนที่ตกลงขาย ` +
            `(ตกลงขาย ${toNum(item.quantity).toFixed(3)} · จัดไปแล้ว ${already.toFixed(3)})`,
        );
        return;
      }
    }

    const body = {
      deliveryDate: deliveryDate.format("YYYY-MM-DD"),
      remark: remark.trim() || undefined,
      items,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body,
          expectedVersion: openedVersion,
        });
        message.success("แก้ไขรอบจัดส่งแล้ว");
      } else {
        await createMutation.mutateAsync({
          body,
          expectedVersion: openedVersion,
        });
        message.success("เพิ่มรอบจัดส่งแล้ว");
      }
      setModalOpen(false);
    } catch (error) {
      // ชนกับคนอื่น → คากล่องไว้ ไม่ปิดทิ้ง ผู้ใช้จะได้ไม่ต้องกรอกใหม่ทั้งชุด
      if (isStaleDocumentConflict(error)) {
        setStaleWarning(staleDocumentMessage(error));
        return;
      }
      message.error(
        error instanceof ApiError ? error.message : "บันทึกไม่สำเร็จ",
      );
    }
  }

  function openReschedule(schedule: DeliverySchedule) {
    setRescheduleTarget(schedule);
    setOpenedVersion(schedule.editVersion);
    setStaleWarning(null);
    setNewDeliveryDate(dayjs(schedule.deliveryDate));
    setRescheduleReason("");
    setCascadeDates(true);
  }

  async function submitReschedule() {
    if (!rescheduleTarget) return;
    if (!newDeliveryDate) {
      message.error("ต้องระบุวันจัดส่งใหม่");
      return;
    }
    const nextDate = newDeliveryDate.format("YYYY-MM-DD");
    if (nextDate === rescheduleTarget.deliveryDate) {
      message.error("วันใหม่ตรงกับวันเดิม — ไม่มีอะไรต้องเลื่อน");
      return;
    }
    if (!rescheduleReason.trim()) {
      message.error("ต้องระบุเหตุผลการเลื่อนกำหนดส่ง");
      return;
    }

    try {
      await rescheduleMutation.mutateAsync({
        id: rescheduleTarget.id,
        body: {
          deliveryDate: nextDate,
          reason: rescheduleReason.trim(),
          cascadeToDocuments: cascadeDates,
        },
        expectedVersion: openedVersion,
      });
      message.success(
        `เลื่อนกำหนดส่งรอบ ${rescheduleTarget.roundNo} เป็น ${newDeliveryDate.format("DD/MM/YYYY")} แล้ว`,
      );
      setRescheduleTarget(null);
    } catch (error) {
      if (isStaleDocumentConflict(error)) {
        setStaleWarning(staleDocumentMessage(error));
        return;
      }
      message.error(
        error instanceof ApiError ? error.message : "เลื่อนกำหนดส่งไม่สำเร็จ",
      );
    }
  }

  function openCancel(schedule: DeliverySchedule) {
    setCancelTarget(schedule);
    setOpenedVersion(schedule.editVersion);
    setStaleWarning(null);
    setCancelReason("");
    setInvoiceWarning(null);
    setAcknowledgeInvoice(false);
  }

  async function submitCancel() {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      message.error("ต้องระบุเหตุผลการยกเลิกรอบ");
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: cancelTarget.id,
        body: {
          reason: cancelReason.trim(),
          acknowledgeInvoice: acknowledgeInvoice || undefined,
        },
        expectedVersion: openedVersion,
      });
      message.success(`ยกเลิกรอบ ${cancelTarget.roundNo} แล้ว`);
      setCancelTarget(null);
    } catch (error) {
      if (isStaleDocumentConflict(error)) {
        setStaleWarning(staleDocumentMessage(error));
        return;
      }
      const detail =
        error instanceof ApiError ? error.message : "ยกเลิกไม่สำเร็จ";
      /*
       * backend ทักว่ามีใบแจ้งหนี้ → เปิดช่องยืนยันในโมดัลเดิม ไม่ปิดโมดัลทิ้ง
       * ให้คนอ่านเลขใบแจ้งหนี้จริงจาก backend แล้วตัดสินใจ ไม่ใช่เดาไว้ล่วงหน้า
       */
      if (detail.includes("ใบแจ้งหนี้")) {
        setInvoiceWarning(detail);
        return;
      }
      message.error(detail);
    }
  }

  /** ยกเลิกรอบนี้แล้วจำนวนที่ตกลงขายจะลดไหม — ลดเฉพาะใบที่ยืนยันแล้ว */
  const cancelReducesQuantity = salesOrderStatus === "CONFIRMED";

  /** รอบที่ยังเดินอยู่ นับรวมรอบที่กำลังจะยกเลิก — ใช้เตือนว่าจะปิดใบทั้งใบ */
  const cancelClosesOrder = Boolean(
    cancelTarget && activeSchedules.length <= 1,
  );

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    cancelMutation.isPending ||
    rescheduleMutation.isPending;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>รอบจัดส่ง</h2>
        {canAddSchedule ? (
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            disabled={busy}
            onClick={openCreate}
          >
            เพิ่มรอบ
          </Button>
        ) : null}
      </div>

      {!fullyScheduled ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          title="ยังจัดรอบไม่ครบ — ยืนยันใบสั่งขายไม่ได้"
          description={
            <div>
              ต้องจัดรอบให้ครบทุกรายการก่อน (Σ จำนวนทุกรอบ = จำนวนที่ตกลงขาย)
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {unscheduled
                  .filter((row) => row.remaining > EPS)
                  .map((row) => (
                    <li key={row.item.id}>
                      {row.item.itemCode ?? row.item.itemNameTh ?? "สินค้า"} —
                      ยังไม่จัดรอบอีก {row.remaining.toFixed(3)}{" "}
                      {row.item.unitCode ?? ""}
                    </li>
                  ))}
              </ul>
            </div>
          }
        />
      ) : (
        <Alert
          type="success"
          showIcon
          style={{ marginTop: 12 }}
          title="จัดรอบครบทุกรายการแล้ว"
          description="ยืนยันใบสั่งขายได้ แม้สต๊อกยังไม่พอ — ของจะถูกตรวจตอนคลังเปิดใบจ่ายของแต่ละรอบ"
        />
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        {schedulesQuery.isLoading ? (
          <div>กำลังโหลดรอบจัดส่ง…</div>
        ) : schedules.length === 0 ? (
          <Empty description="ยังไม่มีรอบจัดส่ง" />
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              style={{
                border: "1px solid var(--erp-border, #e5e7eb)",
                borderRadius: 8,
                padding: 12,
                opacity: schedule.status === "CANCELLED" ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <strong>รอบ {schedule.roundNo}</strong>
                <span>
                  ส่งวันที่ {dayjs(schedule.deliveryDate).format("DD/MM/YYYY")}
                </span>
                {statusTag(schedule.status)}
                {schedule.sourceDeliveryOrderId ? (
                  <Link href={`/delivery-orders/${schedule.sourceDeliveryOrderId}`}>
                    <Tag color="volcano">ส่งชดเชยของที่ตีกลับ</Tag>
                  </Link>
                ) : null}
                {(schedule.rescheduledCount ?? 0) > 0 ? (
                  <Tooltip
                    title={
                      <span>
                        เดิม{" "}
                        {schedule.originalDeliveryDate
                          ? dayjs(schedule.originalDeliveryDate).format(
                              "DD/MM/YYYY",
                            )
                          : "—"}{" "}
                        → ปัจจุบัน{" "}
                        {dayjs(schedule.deliveryDate).format("DD/MM/YYYY")}
                        {schedule.lastRescheduleReason
                          ? ` · เหตุผลล่าสุด: ${schedule.lastRescheduleReason}`
                          : ""}
                      </span>
                    }
                  >
                    <Tag color="warning" icon={<HistoryOutlined />}>
                      เลื่อนกำหนดส่งแล้ว {schedule.rescheduledCount} ครั้ง
                    </Tag>
                  </Tooltip>
                ) : null}
                <span style={{ flex: 1 }} />
                {canEdit ? (
                  <Space>
                    {/* เลื่อนวันทำได้กว้างกว่าแก้รอบ — วันเปลี่ยนแต่ของยังอยู่ครบ
                        โชว์หลังยืนยัน SO เท่านั้น ก่อนนั้นแก้วันผ่านปุ่มแก้ไข */}
                    {!isPreConfirmSalesOrderStatus(salesOrderStatus) &&
                    isDeliveryScheduleReschedulable(schedule.status) ? (
                      <Button
                        size="small"
                        icon={<CalendarOutlined />}
                        disabled={busy}
                        onClick={() => openReschedule(schedule)}
                      >
                        เลื่อนกำหนดส่ง
                      </Button>
                    ) : null}
                    {isDeliveryScheduleEditable(schedule.status) ? (
                      <>
                        {isPreConfirmSalesOrderStatus(salesOrderStatus) ? (
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            disabled={busy}
                            onClick={() => openEdit(schedule)}
                          >
                            แก้ไข
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={busy}
                          onClick={() => openCancel(schedule)}
                        >
                          ยกเลิกรอบ
                        </Button>
                      </>
                    ) : null}
                  </Space>
                ) : null}
              </div>

              {schedule.remark ? (
                <p style={{ margin: "8px 0 0", color: "#6b7280" }}>
                  {schedule.remark}
                </p>
              ) : null}
              {schedule.cancelledReason ? (
                <p style={{ margin: "8px 0 0", color: "#cf1322" }}>
                  เหตุผลที่ยกเลิก: {schedule.cancelledReason}
                </p>
              ) : null}

              <Table
                rowKey="id"
                size="small"
                pagination={false}
                style={{ marginTop: 12 }}
                dataSource={schedule.items ?? []}
                columns={[
                  {
                    title: "สินค้า",
                    key: "item",
                    render: (_v, line) =>
                      line.itemCode
                        ? `${line.itemCode} — ${line.itemNameTh ?? ""}`
                        : (line.itemNameTh ?? "—"),
                  },
                  {
                    title: "สั่ง",
                    dataIndex: "quantity",
                    align: "right",
                    width: 100,
                    render: (v: string, line) => `${v} ${line.unitCode ?? ""}`,
                  },
                  {
                    title: "จองแล้ว",
                    dataIndex: "reservedQuantity",
                    align: "right",
                    width: 100,
                  },
                  {
                    title: "จ่ายแล้ว",
                    dataIndex: "issuedQuantity",
                    align: "right",
                    width: 100,
                  },
                  {
                    title: "บรรจุแล้ว",
                    dataIndex: "packedQuantity",
                    align: "right",
                    width: 100,
                  },
                  {
                    title: "ส่งแล้ว",
                    dataIndex: "deliveredQuantity",
                    align: "right",
                    width: 100,
                  },
                  {
                    title: "คงเหลือ",
                    dataIndex: "remainingQuantity",
                    align: "right",
                    width: 100,
                    render: (v: string) =>
                      Number(v) > 0 ? <strong>{v}</strong> : "—",
                  },
                ]}
              />
            </div>
          ))
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? `แก้ไขรอบ ${editing.roundNo}` : "เพิ่มรอบจัดส่ง"}
        onCancel={() => setModalOpen(false)}
        onOk={() => void submit()}
        okText="บันทึก"
        cancelText="ปิด"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={720}
        destroyOnHidden
      >
        {staleAlert}
        <Form layout="vertical">
          <Form.Item label="วันที่จัดส่ง" required>
            <DatePicker
              value={deliveryDate}
              onChange={setDeliveryDate}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item label="หมายเหตุ">
            <Input.TextArea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </Form.Item>
        </Form>

        <Table
          rowKey="salesOrderItemId"
          size="small"
          pagination={false}
          dataSource={draftLines}
          columns={[
            {
              title: "สินค้า",
              key: "item",
              render: (_v, line) => {
                const item = salesOrderItems.find(
                  (row) => row.id === line.salesOrderItemId,
                );
                return item?.itemCode
                  ? `${item.itemCode} — ${item.itemNameTh ?? ""}`
                  : (item?.itemNameTh ?? "—");
              },
            },
            {
              title: "ตกลงขาย",
              key: "agreed",
              align: "right",
              width: 110,
              render: (_v, line) => {
                const item = salesOrderItems.find(
                  (row) => row.id === line.salesOrderItemId,
                );
                return toNum(item?.quantity).toFixed(3);
              },
            },
            {
              title: "จัดรอบอื่นแล้ว",
              key: "already",
              align: "right",
              width: 120,
              render: (_v, line) =>
                (scheduledByItem.get(line.salesOrderItemId) ?? 0).toFixed(3),
            },
            {
              title: "รอบนี้",
              key: "quantity",
              align: "right",
              width: 140,
              render: (_v, line, index) => (
                <InputNumber
                  min={0}
                  precision={3}
                  value={line.quantity}
                  style={{ width: "100%" }}
                  onChange={(value) =>
                    setDraftLines((prev) => {
                      const next = [...prev];
                      next[index] = {
                        ...next[index],
                        quantity: Number(value ?? 0),
                      };
                      return next;
                    })
                  }
                />
              ),
            },
          ]}
        />
        <p style={{ marginTop: 8, color: "#6b7280" }}>
          ใส่ 0 ในรายการที่ไม่ต้องส่งในรอบนี้ · สินค้าเดียวกันอยู่ได้หลายรอบ
          แต่รวมกันต้องไม่เกินจำนวนที่ตกลงขาย
        </p>
      </Modal>

      {/* ── เลื่อนกำหนดส่ง ─────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(rescheduleTarget)}
        title={`เลื่อนกำหนดส่ง — รอบ ${rescheduleTarget?.roundNo ?? ""}`}
        onCancel={() => setRescheduleTarget(null)}
        onOk={() => void submitReschedule()}
        okText="เลื่อนกำหนดส่ง"
        cancelText="ปิด"
        confirmLoading={rescheduleMutation.isPending}
        width={560}
        destroyOnHidden
      >
        {staleAlert}
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="เปลี่ยนแค่วันส่ง — จำนวนและยอดเงินไม่เปลี่ยน"
          description={
            rescheduleTarget?.status !== "PLANNED"
              ? "รอบนี้คลังเริ่มทำงานไปแล้ว ระบบจะแจ้งเตือนคลังให้ทราบ · วันบนเอกสารที่ยืนยันแล้วจะไม่ถูกแก้"
              : "ถ้ามีใบจ่าย/ใบบรรจุ/ใบส่งที่ยังเป็นร่างของรอบนี้ วันบนใบนั้นจะขยับตามให้"
          }
        />

        <Form layout="vertical">
          <Form.Item label="วันส่งเดิม">
            <Input
              disabled
              value={
                rescheduleTarget
                  ? dayjs(rescheduleTarget.deliveryDate).format("DD/MM/YYYY")
                  : ""
              }
            />
          </Form.Item>
          <Form.Item label="วันส่งใหม่" required>
            <DatePicker
              value={newDeliveryDate}
              onChange={setNewDeliveryDate}
              format="DD/MM/YYYY"
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item
            label="เหตุผลการเลื่อน"
            required
            extra="บันทึกไว้ในประวัติของใบสั่งขาย — เป็นหลักฐานเวลาต้องอธิบายย้อนหลัง"
          >
            <Input.TextArea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="เช่น ลูกค้าขอเลื่อนรับของ ไซต์ยังไม่พร้อม"
            />
          </Form.Item>
          <Form.Item>
            <Checkbox
              checked={cascadeDates}
              onChange={(e) => setCascadeDates(e.target.checked)}
            >
              ขยับวันบนเอกสารของรอบนี้ที่ยังเป็นร่างให้ตามด้วย
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── ยกเลิกรอบ ──────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(cancelTarget)}
        title={`ยกเลิกรอบ ${cancelTarget?.roundNo ?? ""}`}
        onCancel={() => setCancelTarget(null)}
        onOk={() => void submitCancel()}
        okText="ยกเลิกรอบนี้"
        okButtonProps={{ danger: true }}
        cancelText="ปิด"
        confirmLoading={cancelMutation.isPending}
        width={620}
        destroyOnHidden
      >
        {staleAlert}
        {/*
          สรุปผลกระทบก่อนกด — รอบก่อนคนกดยกเลิกแล้วตกใจว่ายอดเงินเปลี่ยน
          เพราะไม่มีใครบอกล่วงหน้า
        */}
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            cancelClosesOrder
              ? "นี่เป็นรอบสุดท้ายที่ยังเดินอยู่ — ยกเลิกแล้วใบสั่งขายจะถูกยกเลิกทั้งใบ"
              : "ยกเลิกรอบนี้แล้วจะเกิดอะไรขึ้น"
          }
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>ของที่จองไว้ให้รอบนี้คืนเป็นสต๊อกกลาง ให้ใบอื่นใช้ได้ทันที</li>
              <li>
                ใบขอผลิตของรอบนี้ที่ <strong>ยังไม่เริ่มผลิต</strong>{" "}
                จะถูกยกเลิกอัตโนมัติ · ใบที่เริ่มผลิตแล้วไม่ถูกยกเลิก
                แต่จะแจ้งเตือนฝ่ายผลิต
              </li>
              {cancelReducesQuantity ? (
                <li>
                  <strong>จำนวนที่ตกลงขายและยอดเงินของใบสั่งขายจะลดลง</strong>{" "}
                  ตามจำนวนของรอบนี้
                  <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                    {(cancelTarget?.items ?? []).map((line) => {
                      const soItem = salesOrderItems.find(
                        (row) => row.id === line.salesOrderItemId,
                      );
                      const before = toNum(soItem?.quantity);
                      const after = Math.max(before - toNum(line.quantity), 0);
                      return (
                        <li key={line.id}>
                          {line.itemCode ?? line.itemNameTh ?? "สินค้า"}:{" "}
                          {before.toFixed(3)} → {after.toFixed(3)}{" "}
                          {line.unitCode ?? ""}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ) : (
                <li>
                  ใบสั่งขายยังไม่ยืนยัน — จำนวนที่ตกลงขายไม่เปลี่ยน
                  (รอบนี้แค่ถูกเอาออก ต้องจัดรอบใหม่ให้ครบก่อนยืนยัน)
                </li>
              )}
            </ul>
          }
        />

        {invoiceWarning ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            title="ใบสั่งขายนี้มีใบแจ้งหนี้ออกไปแล้ว"
            description={
              <div>
                {invoiceWarning}
                <div style={{ marginTop: 8 }}>
                  <Checkbox
                    checked={acknowledgeInvoice}
                    onChange={(e) => setAcknowledgeInvoice(e.target.checked)}
                  >
                    ตรวจใบแจ้งหนี้แล้ว ยืนยันว่าไม่ครอบรอบนี้ — ยกเลิกรอบต่อได้
                  </Checkbox>
                </div>
              </div>
            }
          />
        ) : null}

        <Form layout="vertical">
          <Form.Item
            label="เหตุผลการยกเลิก"
            required
            extra="บันทึกไว้ในประวัติของใบสั่งขาย พร้อมจำนวนและยอดเงินก่อน/หลัง"
          >
            <Input.TextArea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="เช่น ลูกค้ายกเลิกออเดอร์ส่วนนี้"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
