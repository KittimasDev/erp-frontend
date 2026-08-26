"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelDeliveryScheduleMutation,
  useCreateDeliveryScheduleMutation,
  useDeliverySchedulesQuery,
  useUpdateDeliveryScheduleMutation,
} from "@/hooks/delivery-schedules/useDeliverySchedulesQuery";
import { ApiError } from "@/lib/api/client";
import {
  DELIVERY_SCHEDULE_STATUS_COLOR,
  DELIVERY_SCHEDULE_STATUS_LABEL,
  isDeliveryScheduleEditable,
  type DeliverySchedule,
  type DeliveryScheduleStatus,
  type UpsertDeliveryScheduleItemBody,
} from "@/types/delivery-schedules";
import type { SalesOrderItem } from "@/types/sales-orders";

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
 *  - แก้/ยกเลิกรอบได้เฉพาะรอบที่ยังไม่จ่ายของ
 */
export default function DeliverySchedulesSection({
  salesOrderId,
  salesOrderItems,
  canEdit,
}: {
  salesOrderId: string;
  salesOrderItems: SalesOrderItem[];
  canEdit: boolean;
}) {
  const { message } = App.useApp();
  const schedulesQuery = useDeliverySchedulesQuery(salesOrderId);
  const createMutation = useCreateDeliveryScheduleMutation(salesOrderId);
  const updateMutation = useUpdateDeliveryScheduleMutation(salesOrderId);
  const cancelMutation = useCancelDeliveryScheduleMutation(salesOrderId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliverySchedule | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null);
  const [remark, setRemark] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);

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

  function openCreate() {
    setEditing(null);
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
        await updateMutation.mutateAsync({ id: editing.id, body });
        message.success("แก้ไขรอบจัดส่งแล้ว");
      } else {
        await createMutation.mutateAsync(body);
        message.success("เพิ่มรอบจัดส่งแล้ว");
      }
      setModalOpen(false);
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "บันทึกไม่สำเร็จ",
      );
    }
  }

  function confirmCancel(schedule: DeliverySchedule) {
    Modal.confirm({
      title: `ยกเลิกรอบ ${schedule.roundNo}?`,
      content:
        "ของที่จองไว้ให้รอบนี้จะถูกคืนเป็นสต๊อกกลาง · รอบอื่นไม่กระทบ",
      okText: "ยกเลิกรอบนี้",
      okButtonProps: { danger: true },
      cancelText: "ปิด",
      onOk: async () => {
        try {
          await cancelMutation.mutateAsync({ id: schedule.id });
          message.success("ยกเลิกรอบจัดส่งแล้ว");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "ยกเลิกไม่สำเร็จ",
          );
        }
      },
    });
  }

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    cancelMutation.isPending;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>รอบจัดส่ง</h2>
        {canEdit ? (
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
                <span style={{ flex: 1 }} />
                {canEdit && isDeliveryScheduleEditable(schedule.status) ? (
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      disabled={busy}
                      onClick={() => openEdit(schedule)}
                    >
                      แก้ไข
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      disabled={busy}
                      onClick={() => confirmCancel(schedule)}
                    >
                      ยกเลิกรอบ
                    </Button>
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
    </>
  );
}
