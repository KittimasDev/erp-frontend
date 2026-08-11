"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Result,
  Segmented,
  Spin,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { ApiError } from "@/lib/api/client";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { hasAccessToken } from "@/lib/auth/token";
import {
  useCancelMyLeaveRequestMutation,
  useCreateMyLeaveRequestMutation,
} from "@/hooks/leave/useLeaveMutations";
import { useMyLeaveRequestsQuery } from "@/hooks/leave/useLeaveQueries";
import {
  LEAVE_STATUS_COLOR,
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_COLOR,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPE_OPTIONS,
} from "@/types/leave";

import styles from "./LeaveSelfPage.module.css";

type FormValues = {
  leaveType: string;
  range: [Dayjs, Dayjs];
  reason: string;
};

function noopSubscribe() {
  return () => {};
}

function formatRange(startDate: string, endDate: string) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  if (start.isSame(end, "day")) {
    return start.format("DD/MM/YYYY");
  }
  return `${start.format("DD/MM")} - ${end.format("DD/MM/YYYY")}`;
}

export default function LeaveSelfPage() {
  const { modal } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs(),
    dayjs(),
  ]);

  const authChecked = useSyncExternalStore(
    noopSubscribe,
    hasAccessToken,
    () => false,
  );

  const listQuery = useMyLeaveRequestsQuery(30, authChecked);
  const createMutation = useCreateMyLeaveRequestMutation();
  const cancelMutation = useCancelMyLeaveRequestMutation();

  // อ่าน token สดใน effect ไม่ใช้ค่าจาก snapshot ตอน hydrate (ตอนนั้นยังเป็น false เสมอ)
  useEffect(() => {
    if (!hasAccessToken()) {
      redirectToLogin("/leave");
    }
  }, [authChecked]);

  useEffect(() => {
    const error = listQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("/leave");
    }
  }, [listQuery.error]);

  const rows = listQuery.data?.data ?? [];
  const pending = rows.filter((row) => row.status === "DRAFT");
  // นับรวมวันเริ่มและวันจบ ให้ตรงกับที่ backend คำนวณ
  const days = range ? range[1].diff(range[0], "day") + 1 : 0;

  const handleSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        leaveType: values.leaveType,
        startDate: values.range[0].format("YYYY-MM-DD"),
        endDate: values.range[1].format("YYYY-MM-DD"),
        reason: values.reason.trim(),
      });
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงค่าในฟอร์มไว้ให้แก้ต่อ
      return;
    }
    form.resetFields();
    setRange([dayjs(), dayjs()]);
  };

  const confirmCancel = (id: string, startDate: string, endDate: string) => {
    modal.confirm({
      title: "ยกเลิกคำขอลา",
      content: `ยกเลิกคำขอลาช่วง ${formatRange(startDate, endDate)}?`,
      okText: "ยกเลิกคำขอ",
      okButtonProps: { danger: true },
      cancelText: "ไม่ใช่",
      centered: true,
      onOk: () => cancelMutation.mutateAsync(id).then(() => undefined),
    });
  };

  if (!authChecked || listQuery.isLoading) {
    return (
      <div className={styles.centerScreen}>
        <Spin size="large" />
        <p className={styles.centerText}>กำลังโหลดคำขอลา...</p>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className={styles.centerScreen}>
        <Result
          status="warning"
          title="โหลดข้อมูลไม่สำเร็จ"
          subTitle={
            listQuery.error instanceof ApiError
              ? listQuery.error.message
              : "ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง"
          }
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void listQuery.refetch()}
            >
              ลองใหม่
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a className={styles.backLink} href="/attendance">
            <ArrowLeftOutlined />
            <span>ลงเวลา</span>
          </a>
          <div className={styles.brand}>
            <CalendarOutlined />
            <span>ขอลางาน</span>
          </div>
        </header>

        <section className={styles.formCard}>
          <h2 className={styles.formTitle}>ยื่นคำขอลา</h2>
          <Form<FormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              leaveType: "ANNUAL",
              range: [dayjs(), dayjs()],
            }}
            onFinish={(values) => void handleSubmit(values)}
          >
            <Form.Item
              name="leaveType"
              label="ประเภทการลา"
              rules={[{ required: true, message: "เลือกประเภทการลา" }]}
            >
              {/* Segmented แทน Select — บนมือถือเห็นตัวเลือกครบโดยไม่ต้องเปิด dropdown */}
              <Segmented block options={LEAVE_TYPE_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="range"
              label="ช่วงวันที่ลา"
              rules={[{ required: true, message: "เลือกช่วงวันที่" }]}
            >
              <DatePicker.RangePicker
                allowClear={false}
                format="DD/MM/YYYY"
                inputReadOnly
                size="large"
                className={styles.fullWidth}
                onChange={(values) => {
                  if (values?.[0] && values[1]) {
                    setRange([values[0], values[1]]);
                  }
                }}
              />
            </Form.Item>

            {days > 0 ? (
              <div className={styles.daysHint}>รวม {days} วัน</div>
            ) : null}

            <Form.Item
              name="reason"
              label="เหตุผล"
              rules={[
                { required: true, message: "ระบุเหตุผล" },
                { max: 2000, message: "ยาวเกินไป" },
              ]}
            >
              <Input.TextArea
                rows={3}
                size="large"
                placeholder="เช่น พาพ่อแม่ไปหาหมอ"
              />
            </Form.Item>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={createMutation.isPending}
            >
              <SendOutlined />
              <span>ส่งคำขอลา</span>
            </button>
          </Form>
        </section>

        {pending.length > 0 ? (
          <div className={styles.pendingHint}>
            มีคำขอรออนุมัติอยู่ {pending.length} รายการ
          </div>
        ) : null}

        <section className={styles.historyCard}>
          <h2 className={styles.historyTitle}>คำขอลาของฉัน</h2>
          {rows.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="ยังไม่มีคำขอลา"
            />
          ) : (
            <ul className={styles.historyList}>
              {rows.map((row) => (
                <li key={row.id} className={styles.historyItem}>
                  <div className={styles.historyTop}>
                    <Tag color={LEAVE_TYPE_COLOR[row.leaveType]}>
                      {LEAVE_TYPE_LABEL[row.leaveType] ?? row.leaveType}
                    </Tag>
                    <strong>{formatRange(row.startDate, row.endDate)}</strong>
                    <span className={styles.historyDays}>{row.days} วัน</span>
                    <Tag color={LEAVE_STATUS_COLOR[row.status]}>
                      {LEAVE_STATUS_LABEL[row.status] ?? row.status}
                    </Tag>
                  </div>
                  <p className={styles.historyReason}>{row.reason}</p>
                  {row.reviewRemark ? (
                    <p className={styles.historyRemark}>
                      ผู้อนุมัติ: {row.reviewRemark}
                    </p>
                  ) : null}
                  {row.status === "DRAFT" ? (
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      disabled={cancelMutation.isPending}
                      onClick={() =>
                        confirmCancel(row.id, row.startDate, row.endDate)
                      }
                    >
                      ยกเลิกคำขอ
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
