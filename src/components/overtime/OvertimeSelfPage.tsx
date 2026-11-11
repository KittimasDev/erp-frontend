"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  App,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Result,
  Spin,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  FieldTimeOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { ApiError } from "@/lib/api/client";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { hasAccessToken } from "@/lib/auth/token";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  useCancelMyOvertimeRequestMutation,
  useCreateMyOvertimeRequestMutation,
} from "@/hooks/overtime/useOvertimeMutations";
import { useMyOvertimeRequestsQuery } from "@/hooks/overtime/useOvertimeQueries";
import {
  OVERTIME_STATUS_COLOR,
  overtimeStatusLabel,
} from "@/types/overtime";

import styles from "./OvertimeSelfPage.module.css";

const QUICK_HOURS = [1, 2, 3, 4];

type FormValues = {
  otDate: Dayjs;
  hours: number;
  reason: string;
};

function noopSubscribe() {
  return () => {};
}

function formatHours(value: string, lang: "th" | "en") {
  return `${Number(value).toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
    maximumFractionDigits: 2,
  })} ${lang === "en" ? "hrs" : "ชม."}`;
}

export default function OvertimeSelfPage() {
  const { modal } = App.useApp();
  const t = useT();
  const lang = useLanguage();
  const [form] = Form.useForm<FormValues>();
  const [hours, setHours] = useState<number | null>(2);

  const authChecked = useSyncExternalStore(
    noopSubscribe,
    hasAccessToken,
    () => false,
  );

  const listQuery = useMyOvertimeRequestsQuery(30, authChecked);
  const createMutation = useCreateMyOvertimeRequestMutation();
  const cancelMutation = useCancelMyOvertimeRequestMutation();

  // อ่าน token สดใน effect ไม่ใช้ค่าจาก snapshot ตอน hydrate (ตอนนั้นยังเป็น false เสมอ)
  useEffect(() => {
    if (!hasAccessToken()) {
      redirectToLogin("/overtime");
    }
  }, [authChecked]);

  useEffect(() => {
    const error = listQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("/overtime");
    }
  }, [listQuery.error]);

  const rows = listQuery.data?.data ?? [];
  const pending = rows.filter((row) => row.status === "DRAFT");

  const handleSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        otDate: values.otDate.format("YYYY-MM-DD"),
        hours: values.hours,
        reason: values.reason.trim(),
      });
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงค่าในฟอร์มไว้ให้แก้ต่อ
      return;
    }
    form.resetFields();
    setHours(2);
  };

  const confirmCancel = (id: string, otDate: string) => {
    modal.confirm({
      title: t("ยกเลิกคำขอ OT"),
      content: t("ยกเลิกคำขอของวันที่ {date}?", { date: dayjs(otDate).format("DD/MM/BBBB") }),
      okText: t("ยกเลิกคำขอ"),
      okButtonProps: { danger: true },
      cancelText: t("ไม่ใช่"),
      centered: true,
      onOk: () => cancelMutation.mutateAsync(id).then(() => undefined),
    });
  };

  if (!authChecked || listQuery.isLoading) {
    return (
      <div className={styles.centerScreen}>
        <Spin size="large" />
        <p className={styles.centerText}>{t("กำลังโหลดคำขอ OT...")}</p>
      </div>
    );
  }

  if (listQuery.isError) {
    return (
      <div className={styles.centerScreen}>
        <Result
          status="warning"
          title={t("โหลดข้อมูลไม่สำเร็จ")}
          subTitle={
            listQuery.error instanceof ApiError
              ? listQuery.error.message
              : t("ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง")
          }
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void listQuery.refetch()}
            >
              {t("ลองใหม่")}
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
            <span>{t("ลงเวลา")}</span>
          </a>
          <div className={styles.brand}>
            <FieldTimeOutlined />
            <span>{t("ขอทำงานล่วงเวลา")}</span>
          </div>
        </header>

        <section className={styles.formCard}>
          <h2 className={styles.formTitle}>{t("สร้างคำขอใหม่")}</h2>
          <Form<FormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{ otDate: dayjs(), hours: 2 }}
            onFinish={(values) => void handleSubmit(values)}
          >
            <Form.Item
              name="otDate"
              label={t("วันที่ทำ OT")}
              rules={[{ required: true, message: t("เลือกวันที่") }]}
            >
              <DatePicker
                allowClear={false}
                format="DD/MM/BBBB"
                inputReadOnly
                size="large"
                className={styles.fullWidth}
              />
            </Form.Item>

            <Form.Item
              name="hours"
              label={t("จำนวนชั่วโมง")}
              rules={[{ required: true, message: t("ระบุจำนวนชั่วโมง") }]}
            >
              <InputNumber
                min={0.5}
                max={24}
                step={0.5}
                size="large"
                className={styles.fullWidth}
                suffix={t("ชม.")}
                onChange={(value) => setHours(value)}
              />
            </Form.Item>

            {/* ปุ่มลัด — บนมือถือพิมพ์ตัวเลขทีละครั้งช้ากว่ากดเลือก */}
            <div className={styles.quickHours}>
              {QUICK_HOURS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.quickBtn} ${
                    hours === value ? styles.quickBtnActive : ""
                  }`}
                  onClick={() => {
                    form.setFieldValue("hours", value);
                    setHours(value);
                  }}
                >
                  {value} {t("ชม.")}
                </button>
              ))}
            </div>

            <Form.Item
              name="reason"
              label={t("เหตุผล")}
              rules={[
                { required: true, message: t("ระบุเหตุผล") },
                { max: 2000, message: t("ยาวเกินไป") },
              ]}
            >
              <Input.TextArea
                rows={3}
                size="large"
                placeholder={t("เช่น เร่งงานผลิตให้ทันส่งพรุ่งนี้")}
              />
            </Form.Item>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={createMutation.isPending}
            >
              <SendOutlined />
              <span>{t("ส่งคำขอ")}</span>
            </button>
          </Form>
        </section>

        {pending.length > 0 ? (
          <div className={styles.pendingHint}>
            {t("มีคำขอรออนุมัติอยู่ {n} รายการ", { n: pending.length })}
          </div>
        ) : null}

        <section className={styles.historyCard}>
          <h2 className={styles.historyTitle}>{t("คำขอของฉัน")}</h2>
          {rows.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t("ยังไม่มีคำขอ OT")}
            />
          ) : (
            <ul className={styles.historyList}>
              {rows.map((row) => (
                <li key={row.id} className={styles.historyItem}>
                  <div className={styles.historyTop}>
                    <strong>{dayjs(row.otDate).format("DD/MM/BBBB")}</strong>
                    <span className={styles.historyHours}>
                      {formatHours(row.hours, lang)}
                    </span>
                    <Tag color={OVERTIME_STATUS_COLOR[row.status]}>
                      {overtimeStatusLabel(row.status, lang)}
                    </Tag>
                  </div>
                  <p className={styles.historyReason}>{row.reason}</p>
                  {row.reviewRemark ? (
                    <p className={styles.historyRemark}>
                      {t("ผู้อนุมัติ")}: {row.reviewRemark}
                    </p>
                  ) : null}
                  {row.status === "DRAFT" ? (
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      disabled={cancelMutation.isPending}
                      onClick={() => confirmCancel(row.id, row.otDate)}
                    >
                      {t("ยกเลิกคำขอ")}
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
