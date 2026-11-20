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
import type { ColumnsType } from "antd/es/table";
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
  type PoDeliveryScheduleItem,
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

type ScheduleRow = {
  key: string;
  schedule: PoDeliverySchedule;
  item: PoDeliveryScheduleItem | null;
  span: number;
};

function deliveryDateText(schedule: PoDeliverySchedule) {
  const current = dayjs(schedule.effectiveDeliveryDate).format("DD/MM/BBBB");
  const original = schedule.originalDeliveryDate
    ? dayjs(schedule.originalDeliveryDate).format("DD/MM/BBBB")
    : "";
  const postponed =
    !!schedule.originalDeliveryDate &&
    schedule.originalDeliveryDate !== schedule.deliveryDate;
  return postponed ? `${original} เลื่อนเป็น ${current}` : current;
}

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

  const rows: ScheduleRow[] = schedules.flatMap((schedule) => {
    const items = schedule.items.length > 0 ? schedule.items : [null];
    return items.map((item, index) => ({
      key: item?.id ?? `${schedule.id}-empty`,
      schedule,
      item,
      span: index === 0 ? items.length : 0,
    }));
  });

  const columns: ColumnsType<ScheduleRow> = [
    {
      title: t("รอบ"),
      width: 64,
      align: "center",
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => row.schedule.roundNo,
    },
    {
      title: t("กำหนดส่ง"),
      width: 180,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => {
        const schedule = row.schedule;
        const poDead =
          purchaseOrderCancelled && isPoScheduleOpen(schedule.status);
        const timing = receiveTiming(
          schedule.latestActualReceiveDate,
          schedule.effectiveDeliveryDate,
        );
        return (
          <div>
            <div>{deliveryDateText(schedule)}</div>
            {schedule.latestActualReceiveDate ? (
              <div className={styles.paperSub}>
                {t("รับจริงล่าสุด {date}", {
                  date: dayjs(schedule.latestActualReceiveDate).format("DD/MM/BBBB"),
                })}
                {timing ? (
                  <>
                    {" "}
                    <Tag color={RECEIVE_TIMING_COLOR[timing]} style={{ marginInlineEnd: 0 }}>
                      {t(RECEIVE_TIMING_LABEL[timing])}
                    </Tag>
                  </>
                ) : null}
              </div>
            ) : null}
            {schedule.isLate && !poDead ? <Tag color="red">{t("ล่าช้า")}</Tag> : null}
          </div>
        );
      },
    },
    {
      title: t("รหัสสินค้า"),
      width: 110,
      render: (_, row) => row.item?.itemCode ?? "—",
    },
    {
      title: t("รายการสินค้า"),
      render: (_, row) => row.item?.itemNameTh ?? "—",
    },
    {
      title: t("จำนวน"),
      width: 90,
      align: "right",
      render: (_, row) => row.item?.quantity ?? "—",
    },
    {
      title: t("หน่วย"),
      width: 72,
      align: "center",
      render: (_, row) => row.item?.unitCode ?? "—",
    },
    {
      title: t("รับแล้ว"),
      width: 80,
      align: "right",
      render: (_, row) => row.item?.receivedQuantity ?? "—",
    },
    {
      title: t("ยกเลิกการรับ"),
      width: 100,
      align: "right",
      render: (_, row) => row.item?.cancelledQuantity ?? "—",
    },
    {
      title: t("คงเหลือ"),
      width: 80,
      align: "right",
      render: (_, row) => row.item?.remainingQuantity ?? "—",
    },
    {
      title: t("สถานะ"),
      width: 130,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => {
        const schedule = row.schedule;
        const poDead =
          purchaseOrderCancelled && isPoScheduleOpen(schedule.status);
        const statusLabel = poDead
          ? t("PO ยกเลิกแล้ว")
          : t(PO_DELIVERY_RECEIVE_STATUS_LABEL[schedule.status] ?? schedule.status);
        return (
          <Tag
            color={
              poDead
                ? "default"
                : (PO_DELIVERY_RECEIVE_STATUS_COLOR[schedule.status] ?? "default")
            }
          >
            {statusLabel}
          </Tag>
        );
      },
    },
    {
      title: t("จัดการ"),
      width: 220,
      onCell: (row) => ({ rowSpan: row.span }),
      render: (_, row) => {
        const schedule = row.schedule;
        const poDead =
          purchaseOrderCancelled && isPoScheduleOpen(schedule.status);
        return (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        );
      },
    },
  ];

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t("กำหนดการจัดส่งสินค้า")}</h2>
      </div>
      {schedules.length === 0 ? (
        <p>{t("ยังไม่มีรอบจัดส่ง")}</p>
      ) : (
        <Table<ScheduleRow>
          size="small"
          pagination={false}
          rowKey="key"
          scroll={{ x: 1180 }}
          dataSource={rows}
          columns={columns}
        />
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
