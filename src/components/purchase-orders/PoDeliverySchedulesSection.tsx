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
import { useT } from "@/lib/i18n/useT";
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
  RECEIVE_TIMING_COLOR,
  RECEIVE_TIMING_LABEL,
  receiveTiming,
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
  /** PO ถูกยกเลิกแล้ว — รอบที่ยังไม่รับไม่ใช่ "ยังไม่รับสินค้า" อีกต่อไป และไม่มีการจัดการรอบใดๆ */
  purchaseOrderCancelled?: boolean;
};

export default function PoDeliverySchedulesSection({
  purchaseOrderId,
  canManage,
  showCloseOnReceiving = false,
  purchaseOrderCancelled = false,
}: Props) {
  const t = useT();
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
        <h2 className={styles.sectionTitle}>{t("รอบจัดส่ง")}</h2>
      </div>
      {schedules.length === 0 ? (
        <p>{t("ยังไม่มีรอบจัดส่ง")}</p>
      ) : (
        schedules.map((schedule) => {
          // PO ยกเลิกแล้ว: รอบที่ยังเปิดอยู่ไม่แสดง "ยังไม่รับสินค้า" (ไม่มีการรับอีกแล้ว)
          const poDead =
            purchaseOrderCancelled && isPoScheduleOpen(schedule.status);
          const statusLabel = poDead
            ? t("PO ยกเลิกแล้ว")
            : t(PO_DELIVERY_RECEIVE_STATUS_LABEL[schedule.status] ?? schedule.status);
          const timing = receiveTiming(
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
                  <strong>{t("รอบที่ {n}", { n: schedule.roundNo })}</strong>
                  <div>
                    {t("กำหนดส่ง {date}", {
                      date: dayjs(schedule.effectiveDeliveryDate).format("DD/MM/BBBB"),
                    })}
                    {schedule.originalDeliveryDate &&
                    schedule.originalDeliveryDate !== schedule.deliveryDate
                      ? ` ${t("(เลื่อนจาก {date})", {
                          date: dayjs(schedule.originalDeliveryDate).format("DD/MM/BBBB"),
                        })}`
                      : null}
                  </div>
                  {schedule.latestActualReceiveDate ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 2,
                      }}
                    >
                      <span>
                        {t("รับจริงล่าสุด {date}", {
                          date: dayjs(schedule.latestActualReceiveDate).format("DD/MM/BBBB"),
                        })}
                      </span>
                      {timing ? (
                        <Tag
                          color={RECEIVE_TIMING_COLOR[timing]}
                          style={{ fontWeight: 600, marginInlineEnd: 0 }}
                        >
                          {t(RECEIVE_TIMING_LABEL[timing])}
                        </Tag>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Tag
                    color={
                      poDead
                        ? "default"
                        : (PO_DELIVERY_RECEIVE_STATUS_COLOR[schedule.status] ?? "default")
                    }
                  >
                    {statusLabel}
                  </Tag>
                  {schedule.isLate && !poDead ? <Tag color="red">{t("ล่าช้า")}</Tag> : null}
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
                    title: t("สินค้า"),
                    render: (_, item) =>
                      `${item.itemCode ?? ""} ${item.itemNameTh ?? ""}`.trim(),
                  },
                  { title: t("Qty ตามรอบ"), dataIndex: "quantity" },
                  { title: t("รับแล้ว"), dataIndex: "receivedQuantity" },
                  { title: t("ยกเลิกการรับ"), dataIndex: "cancelledQuantity" },
                  { title: t("คงเหลือ"), dataIndex: "remainingQuantity" },
                  { title: t("หน่วย"), dataIndex: "unitCode" },
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
                    {t("ประวัติเลื่อนวัน")}
                  </Button>
                ) : null}
                {canManage && !poDead && isPoScheduleOpen(schedule.status) ? (
                  <Button
                    icon={<CalendarOutlined />}
                    onClick={() => {
                      setActive(schedule);
                      setMode("reschedule");
                    }}
                  >
                    {t("เลื่อนวันส่ง")}
                  </Button>
                ) : null}
                {canManage && !poDead && canCancelPoRoundReceiving(schedule) ? (
                  <Button
                    danger
                    icon={<StopOutlined />}
                    onClick={() => {
                      setActive(schedule);
                      setMode("cancel");
                    }}
                  >
                    {t("ยกเลิกการรับทั้งรอบ")}
                  </Button>
                ) : null}
                {(canManage || showCloseOnReceiving) &&
                !poDead &&
                canClosePoRoundRemaining(schedule) ? (
                  <Button
                    danger
                    onClick={() => {
                      setActive(schedule);
                      setMode("close");
                    }}
                  >
                    {t("ยุติการรับสินค้าคงเหลือ")}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      <Modal
        title={t("เลื่อนวันส่ง")}
        open={mode === "reschedule"}
        destroyOnHidden
        onCancel={closeModal}
        confirmLoading={rescheduleMutation.isPending}
        okText={t("บันทึก")}
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
            label={t("วันที่ส่งใหม่")}
            rules={[{ required: true, message: t("ระบุวันที่ส่งใหม่") }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/BBBB" />
          </Form.Item>
          <Form.Item
            name="reason"
            label={t("เหตุผล")}
            rules={[{ required: true, message: t("ระบุเหตุผล") }]}
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
            <Button>{t("แนบหลักฐาน (ถ้ามี)")}</Button>
          </Upload>
        </Form>
      </Modal>

      <Modal
        title={
          mode === "cancel"
            ? t("ยกเลิกการรับทั้งรอบ")
            : t("ยุติการรับสินค้าคงเหลือ")
        }
        open={mode === "cancel" || mode === "close"}
        destroyOnHidden
        onCancel={closeModal}
        confirmLoading={cancelMutation.isPending || closeMutation.isPending}
        okText={t("ยืนยัน")}
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
            label={t("เหตุผล")}
            rules={[{ required: true, message: t("ระบุเหตุผล") }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("ประวัติการเลื่อนวันส่ง")}
        open={mode === "history"}
        destroyOnHidden
        footer={null}
        onCancel={closeModal}
      >
        {(active?.reschedules ?? []).map((row) => (
          <div key={row.id} style={{ marginBottom: 12 }}>
            <div>
              {dayjs(row.fromDate).format("DD/MM/BBBB")} →{" "}
              {dayjs(row.toDate).format("DD/MM/BBBB")}
            </div>
            <div>{row.reason}</div>
            <div>
              {row.createdByName ?? ""}{" "}
              {row.createdAt ? dayjs(row.createdAt).format("DD/MM/BBBB HH:mm") : ""}
            </div>
          </div>
        ))}
      </Modal>
    </div>
  );
}
