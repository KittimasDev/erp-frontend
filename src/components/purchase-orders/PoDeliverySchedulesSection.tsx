"use client";

import { useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Table,
  Tag,
  Upload,
} from "antd";
import {
  CalendarOutlined,
  StopOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { uploadDocumentAttachment } from "@/lib/api/document-attachments";
import { getAccessToken } from "@/lib/auth/token";
import {
  DOCUMENT_TYPE_PO,
} from "@/types/document-attachments";
import {
  useCancelPoReceivingMutation,
  useClosePoRemainingMutation,
  usePoDeliverySchedulesQuery,
  useReschedulePoDeliveryMutation,
} from "@/hooks/po-delivery-schedules/usePoDeliverySchedulesQuery";
import {
  canCancelPoRoundReceiving,
  canClosePoRoundRemaining,
  isPoScheduleOpen,
  PO_DELIVERY_RECEIVE_STATUS_COLOR,
  PO_DELIVERY_RECEIVE_STATUS_LABEL,
  receiveTimingLabel,
  type PoDeliverySchedule,
} from "@/types/po-delivery-schedules";
import styles from "./PurchaseOrderDetailPage.module.css";

const ATTACHMENT_GROUP_PO_RESCHEDULE = "PO_RESCHEDULE";
const RESCHEDULE_FORM_ID = "po-delivery-reschedule-form";
const REASON_FORM_ID = "po-delivery-reason-form";

type Props = {
  purchaseOrderId: string;
  canManage: boolean;
  showCloseOnReceiving?: boolean;
};

export default function PoDeliverySchedulesSection({
  purchaseOrderId,
  canManage,
  showCloseOnReceiving = false,
}: Props) {
  const schedulesQuery = usePoDeliverySchedulesQuery(purchaseOrderId);
  const rescheduleMutation = useReschedulePoDeliveryMutation();
  const cancelMutation = useCancelPoReceivingMutation();
  const closeMutation = useClosePoRemainingMutation();
  const [active, setActive] = useState<PoDeliverySchedule | null>(null);
  const [mode, setMode] = useState<"reschedule" | "cancel" | "close" | "history" | null>(
    null,
  );
  const [file, setFile] = useState<File | null>(null);

  const schedules = schedulesQuery.data?.data ?? [];

  const closeModal = () => {
    setActive(null);
    setMode(null);
    setFile(null);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>รอบจัดส่ง</h2>
      </div>
      {schedules.length === 0 ? (
        <p>ยังไม่มีรอบจัดส่ง</p>
      ) : (
        schedules.map((schedule) => {
          const statusLabel =
            PO_DELIVERY_RECEIVE_STATUS_LABEL[schedule.status] ?? schedule.status;
          const timing = receiveTimingLabel(
            schedule.latestActualReceiveDate,
            schedule.effectiveDeliveryDate,
          );
          return (
            <div key={schedule.id} className={styles.section} style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>รอบที่ {schedule.roundNo}</strong>
                  <div>
                    กำหนดส่ง {dayjs(schedule.effectiveDeliveryDate).format("DD/MM/YYYY")}
                    {schedule.originalDeliveryDate &&
                    schedule.originalDeliveryDate !== schedule.deliveryDate
                      ? ` (เลื่อนจาก ${dayjs(schedule.originalDeliveryDate).format("DD/MM/YYYY")})`
                      : null}
                  </div>
                  {schedule.latestActualReceiveDate ? (
                    <div>
                      รับจริงล่าสุด{" "}
                      {dayjs(schedule.latestActualReceiveDate).format("DD/MM/YYYY")}
                      {timing ? ` · ${timing}` : null}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Tag
                    color={
                      PO_DELIVERY_RECEIVE_STATUS_COLOR[schedule.status] ?? "default"
                    }
                  >
                    {statusLabel}
                  </Tag>
                  {schedule.isLate ? <Tag color="red">ล่าช้า</Tag> : null}
                </div>
              </div>
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                style={{ marginTop: 12 }}
                dataSource={schedule.items}
                columns={[
                  {
                    title: "สินค้า",
                    render: (_, item) =>
                      `${item.itemCode ?? ""} ${item.itemNameTh ?? ""}`.trim(),
                  },
                  { title: "Qty ตามรอบ", dataIndex: "quantity" },
                  { title: "รับแล้ว", dataIndex: "receivedQuantity" },
                  { title: "ยกเลิกการรับ", dataIndex: "cancelledQuantity" },
                  { title: "คงเหลือ", dataIndex: "remainingQuantity" },
                  { title: "หน่วย", dataIndex: "unitCode" },
                ]}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {schedule.reschedules.length ? (
                  <Button
                    icon={<HistoryOutlined />}
                    onClick={() => {
                      setActive(schedule);
                      setMode("history");
                    }}
                  >
                    ประวัติเลื่อนวัน
                  </Button>
                ) : null}
                {canManage && isPoScheduleOpen(schedule.status) ? (
                  <Button
                    icon={<CalendarOutlined />}
                    onClick={() => {
                      setActive(schedule);
                      setMode("reschedule");
                    }}
                  >
                    เลื่อนวันส่ง
                  </Button>
                ) : null}
                {canManage && canCancelPoRoundReceiving(schedule) ? (
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={() => {
                      setActive(schedule);
                      setMode("cancel");
                    }}
                  >
                    ยกเลิกการรับทั้งรอบ
                  </Button>
                ) : null}
                {(canManage || showCloseOnReceiving) &&
                canClosePoRoundRemaining(schedule) ? (
                  <Button
                    danger
                    onClick={() => {
                      setActive(schedule);
                      setMode("close");
                    }}
                  >
                    ยุติการรับสินค้าคงเหลือ
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      <Modal
        title="เลื่อนวันส่ง"
        open={mode === "reschedule"}
        destroyOnHidden
        onCancel={closeModal}
        confirmLoading={rescheduleMutation.isPending}
        okText="บันทึก"
        okButtonProps={{ htmlType: "submit", form: RESCHEDULE_FORM_ID }}
      >
        <Form
          id={RESCHEDULE_FORM_ID}
          layout="vertical"
          onFinish={async (values: { newDate: dayjs.Dayjs; reason: string }) => {
            if (!active) {
              return;
            }
            let attachmentId: string | undefined;
            if (file) {
              const uploaded = await uploadDocumentAttachment(getAccessToken(), {
                file,
                documentType: DOCUMENT_TYPE_PO,
                documentId: purchaseOrderId,
                attachmentGroup: ATTACHMENT_GROUP_PO_RESCHEDULE,
              });
              attachmentId = uploaded.data?.id;
            }
            await rescheduleMutation.mutateAsync({
              id: active.id,
              body: {
                newDate: values.newDate.format("YYYY-MM-DD"),
                reason: values.reason,
                attachmentId,
              },
            });
            closeModal();
          }}
        >
          <Form.Item
            name="newDate"
            label="วันที่ส่งใหม่"
            rules={[{ required: true, message: "ระบุวันที่ส่งใหม่" }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="reason"
            label="เหตุผล"
            rules={[{ required: true, message: "ระบุเหตุผล" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Upload
            beforeUpload={(next) => {
              setFile(next);
              return false;
            }}
            maxCount={1}
            onRemove={() => setFile(null)}
          >
            <Button>แนบหลักฐาน (ถ้ามี)</Button>
          </Upload>
        </Form>
      </Modal>

      <Modal
        title={mode === "cancel" ? "ยกเลิกการรับทั้งรอบ" : "ยุติการรับสินค้าคงเหลือ"}
        open={mode === "cancel" || mode === "close"}
        destroyOnHidden
        onCancel={closeModal}
        confirmLoading={cancelMutation.isPending || closeMutation.isPending}
        okText="ยืนยัน"
        okButtonProps={{
          danger: true,
          htmlType: "submit",
          form: REASON_FORM_ID,
        }}
      >
        <Form
          id={REASON_FORM_ID}
          layout="vertical"
          onFinish={async (values: { reason: string }) => {
            if (!active || (mode !== "cancel" && mode !== "close")) {
              return;
            }
            const payload = { id: active.id, body: { reason: values.reason } };
            if (mode === "cancel") {
              await cancelMutation.mutateAsync(payload);
            } else {
              await closeMutation.mutateAsync(payload);
            }
            closeModal();
          }}
        >
          <Form.Item
            name="reason"
            label="เหตุผล"
            rules={[{ required: true, message: "ระบุเหตุผล" }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="ประวัติการเลื่อนวันส่ง"
        open={mode === "history"}
        destroyOnHidden
        footer={null}
        onCancel={closeModal}
      >
        {(active?.reschedules ?? []).map((row) => (
          <div key={row.id} style={{ marginBottom: 12 }}>
            <div>
              {dayjs(row.fromDate).format("DD/MM/YYYY")} →{" "}
              {dayjs(row.toDate).format("DD/MM/YYYY")}
            </div>
            <div>{row.reason}</div>
            <div>
              {row.createdByName ?? ""}{" "}
              {row.createdAt ? dayjs(row.createdAt).format("DD/MM/YYYY HH:mm") : ""}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
}
