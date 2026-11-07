"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { App, Button, Result, Spin, Tag } from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  RightOutlined,
  WifiOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { ApiError } from "@/lib/api/client";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";
import { clearAccessToken, hasAccessToken } from "@/lib/auth/token";
import { useLanguage } from "@/lib/i18n/language";
import { useT, type TFunction } from "@/lib/i18n/useT";
import {
  useSelfCheckInMutation,
  useSelfCheckOutMutation,
} from "@/hooks/attendance/useAttendanceSelfMutations";
import {
  useMyAttendanceHistoryQuery,
  useMyAttendanceTodayQuery,
} from "@/hooks/attendance/useMyAttendanceQuery";
import { ATTENDANCE_STATUS_LABEL } from "@/types/attendance";
import {
  SHIFT_SOURCE_LABEL,
  WORK_CALENDAR_DAY_TYPE_LABEL,
  type MyShiftDay,
} from "@/types/shifts";

import styles from "./TimeClockPage.module.css";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_WEEKDAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

function formatThaiFullDate(value: dayjs.Dayjs, lang: "th" | "en") {
  if (lang === "en") {
    return value.locale("en").format("dddd, D MMMM YYYY");
  }
  return `วัน${THAI_WEEKDAYS[value.day()]}ที่ ${value.date()} ${THAI_MONTHS[value.month()]} ${value.year() + 543}`;
}

function formatTime(value?: string) {
  return value ? dayjs(value).format("HH:mm") : "--:--";
}

function formatDuration(t: TFunction, hours?: number) {
  if (hours === undefined || hours <= 0) {
    return "—";
  }
  const totalMinutes = Math.round(hours * 60);
  return t("{h} ชม. {m} นาที", { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 });
}

/** นาฬิกาเดินวินาทีละครั้ง — ปัดเป็นวินาทีเพื่อให้ snapshot คงที่ระหว่าง render */
function subscribeSecond(onChange: () => void) {
  const timer = setInterval(onChange, 1000);
  return () => clearInterval(timer);
}

function currentSecond() {
  return Math.floor(Date.now() / 1000) * 1000;
}

function noopSubscribe() {
  return () => {};
}

/** กะของวันหนึ่งบนหน้าลงเวลา — วันหยุดโชว์เหตุผลแทนเวลาเข้ากะ */
function ShiftRow({
  label,
  shift,
  highlight,
}: {
  label: string;
  shift: MyShiftDay;
  highlight?: boolean;
}) {
  const t = useT();
  const isOff = shift.isHoliday || !shift.startTime;

  return (
    <div
      className={
        highlight
          ? `${styles.shiftRow} ${styles.shiftRowToday}`
          : styles.shiftRow
      }
    >
      <span className={styles.shiftRowLabel}>{label}</span>
      <span className={styles.shiftRowBody}>
        <strong>
          {shift.isHoliday
            ? t(WORK_CALENDAR_DAY_TYPE_LABEL[shift.holidayType ?? ""] ?? "วันหยุด")
            : (shift.shiftName ?? t("ยังไม่ได้จัดกะ"))}
        </strong>
        <span>
          {shift.isHoliday
            ? shift.holidayName
            : shift.isOvernight
              ? t("กะข้ามคืน — เลิกกะวันถัดไป")
              : t(SHIFT_SOURCE_LABEL[shift.source] ?? "")}
        </span>
      </span>
      <span
        className={
          isOff
            ? `${styles.shiftRowTime} ${styles.shiftRowOff}`
            : styles.shiftRowTime
        }
      >
        {shift.isHoliday
          ? t("หยุด")
          : shift.startTime
            ? `${shift.startTime}${shift.endTime ? ` - ${shift.endTime}` : ""}`
            : "—"}
      </span>
    </div>
  );
}

export default function TimeClockPage() {
  const { modal } = App.useApp();
  const t = useT();
  const lang = useLanguage();

  // อ่านค่าฝั่ง client หลัง hydrate — ไม่ setState ใน effect เพื่อกัน cascading render
  const authChecked = useSyncExternalStore(
    noopSubscribe,
    hasAccessToken,
    () => false,
  );
  const tick = useSyncExternalStore(subscribeSecond, currentSecond, () => null);

  const todayQuery = useMyAttendanceTodayQuery(authChecked);
  const historyQuery = useMyAttendanceHistoryQuery(7, authChecked);
  const checkInMutation = useSelfCheckInMutation();
  const checkOutMutation = useSelfCheckOutMutation();

  const status = todayQuery.data?.data;
  const record = status?.record;

  // หน้านี้เข้าตรงจากลิงก์ได้เลย ไม่ผ่าน portal — เช็ค token เองแล้วเด้งไป login
  // อ่าน token สดใน effect ไม่ใช้ค่าจาก snapshot ตอน hydrate (ตอนนั้นยังเป็น false เสมอ)
  useEffect(() => {
    if (!hasAccessToken()) {
      redirectToLogin("/attendance");
    }
  }, [authChecked]);

  /** offset ระหว่างนาฬิกาเครื่องกับ server — กันเครื่องพนักงานตั้งเวลาเพี้ยน */
  const serverOffsetMs =
    status?.serverTime && todayQuery.dataUpdatedAt
      ? new Date(status.serverTime).getTime() - todayQuery.dataUpdatedAt
      : 0;

  // token หมดอายุระหว่างเปิดหน้าค้างไว้
  useEffect(() => {
    const error = todayQuery.error;
    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("/attendance");
    }
  }, [todayQuery.error]);

  const clock = useMemo(
    () => (tick === null ? null : dayjs(tick + serverOffsetMs)),
    [tick, serverOffsetMs],
  );

  const isBusy = checkInMutation.isPending || checkOutMutation.isPending;
  const ipBlocked = Boolean(status?.ipRestricted && !status.ipAllowed);
  const doneForToday = Boolean(record?.checkOutAt);
  const pendingDate = status?.pendingCheckOutDate;

  /*
   * เปิดหน้าค้างข้ามเที่ยงคืน — ดึงสถานะใหม่ทันทีที่นาฬิกาข้ามวัน
   * ไม่งั้นต้องรอ refetchInterval รอบถัดไป แล้วปุ่มจะยังเป็นของเมื่อวานอยู่
   */
  const clockDate = clock?.format("YYYY-MM-DD");
  useEffect(() => {
    if (clockDate && status?.today && clockDate !== status.today) {
      void todayQuery.refetch();
    }
  }, [clockDate, status?.today, todayQuery]);

  /** สายกี่นาทีถ้ากดตอนนี้ — คิดจากเวลาเข้ากะของวันนี้ (ไม่คิดในวันหยุด) */
  const lateNowMinutes = useMemo(() => {
    const shift = status?.todayShift;
    if (!clock || !shift || shift.isHoliday || !shift.startTime) {
      return 0;
    }
    const [hour, minute] = shift.startTime.split(":").map(Number);
    const diff = clock.diff(clock.hour(hour).minute(minute).second(0), "minute");
    return Math.max(0, diff);
  }, [clock, status?.todayShift]);

  const confirmCheckIn = () => {
    // ไม่ตัดสินว่า "สาย" ตรงนี้ เพราะยังไม่หักเวลาผ่อนผัน — ฝั่ง server เป็นคนตัดสิน
    const shiftLabel = status?.todayShift?.startTime
      ? ` (${t("เข้ากะ {time} น.", { time: status.todayShift.startTime })}${lateNowMinutes > 0 ? ` — ${t("ช้ากว่าเวลาเข้ากะ {n} นาที", { n: lateNowMinutes })}` : ""})`
      : "";

    modal.confirm({
      title: t("ยืนยันการเข้างาน"),
      content: `${t("บันทึกเวลาเข้างาน {time} น.", { time: clock ? clock.format("HH:mm") : "" })}${shiftLabel}`,
      okText: t("เข้างาน"),
      cancelText: t("ยกเลิก"),
      centered: true,
      onOk: () => checkInMutation.mutateAsync(undefined).then(() => undefined),
    });
  };

  const confirmCheckOut = () => {
    modal.confirm({
      title: t("ยืนยันการออกงาน"),
      content: pendingDate
        ? t("ปิดกะของวันที่ {date} ด้วยเวลา {time} น.", { date: dayjs(pendingDate).format("DD/MM/YYYY"), time: clock ? clock.format("HH:mm") : "" })
        : t("บันทึกเวลาออกงาน {time} น.", { time: clock ? clock.format("HH:mm") : "" }),
      okText: t("ออกงาน"),
      cancelText: t("ยกเลิก"),
      centered: true,
      onOk: () => checkOutMutation.mutateAsync().then(() => undefined),
    });
  };

  const handleLogout = () => {
    clearAccessToken();
    window.location.replace("/login?next=%2Fattendance");
  };

  if (!authChecked || todayQuery.isLoading) {
    return (
      <div className={styles.centerScreen}>
        <Spin size="large" />
        <p className={styles.centerText}>{t("กำลังโหลดข้อมูลการลงเวลา...")}</p>
      </div>
    );
  }

  if (todayQuery.isError || !status) {
    return (
      <div className={styles.centerScreen}>
        <Result
          status="warning"
          title={t("โหลดข้อมูลไม่สำเร็จ")}
          subTitle={
            todayQuery.error instanceof ApiError
              ? todayQuery.error.message
              : t("ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง")
          }
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void todayQuery.refetch()}
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
          <div className={styles.brand}>
            <ClockCircleOutlined />
            <span>{t("ลงเวลาเข้า-ออกงาน")}</span>
          </div>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            {t("ออกจากระบบ")}
          </button>
        </header>

        <section className={styles.clockCard}>
          <p className={styles.clockDate}>
            {clock ? formatThaiFullDate(clock, lang) : " "}
          </p>
          <p className={styles.clockTime}>
            {clock ? clock.format("HH:mm") : "--:--"}
            <span className={styles.clockSeconds}>
              {clock ? clock.format("ss") : "--"}
            </span>
          </p>
          <p className={styles.clockUser}>
            {status.displayName}
            {status.employeeCode ? ` · ${status.employeeCode}` : ""}
          </p>
          {status.departmentName ? (
            <p className={styles.clockDept}>{status.departmentName}</p>
          ) : null}
        </section>

        {ipBlocked ? (
          <div className={styles.alertDanger}>
            <WifiOutlined />
            <div>
              <strong>{t("ลงเวลาจากเครือข่ายนี้ไม่ได้")}</strong>
              <p>
                {t("ต้องเชื่อมต่อ Wi-Fi ของบริษัทก่อนกดเข้า-ออกงาน (IP ปัจจุบัน {ip})", { ip: status.clientIp || t("ไม่ทราบ") })}
              </p>
            </div>
          </div>
        ) : status.ipRestricted ? (
          <div className={styles.alertOk}>
            <EnvironmentOutlined />
            <span>{t("อยู่ในเครือข่ายบริษัท ({ip}) ลงเวลาได้", { ip: status.clientIp })}</span>
          </div>
        ) : null}

        {pendingDate ? (
          <div className={styles.alertWarn}>
            <ExclamationCircleOutlined />
            <div>
              <strong>{t("ยังไม่ได้กดออกงานของเมื่อวาน")}</strong>
              <p>
                {t("กะวันที่ {date} เข้างาน {time} น. — กดออกงานให้เรียบร้อยก่อนจึงจะเข้างานวันนี้ได้", { date: dayjs(pendingDate).format("DD/MM/YYYY"), time: formatTime(status.pendingCheckInAt) })}
              </p>
            </div>
          </div>
        ) : null}

        {/* กะที่ต้องเข้า — พนักงานต้องรู้ทั้งวันนี้และพรุ่งนี้ก่อนกดเข้างาน */}
        {status.todayShift ? (
          <section className={styles.shiftCard}>
            <ShiftRow label={t("วันนี้")} shift={status.todayShift} highlight />
            {status.tomorrowShift ? (
              <ShiftRow label={t("พรุ่งนี้")} shift={status.tomorrowShift} />
            ) : null}
            {status.todayShift.source === "DEFAULT" ? (
              <p className={styles.shiftHint}>
                {t("ฝ่ายบุคคลยังไม่ได้จัดกะของวันนี้ — ใช้เวลาเข้างานมาตรฐานไปก่อน")}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* เข้า/ออกอยู่แถวบน (สั้นทั้งคู่) ส่วนรวมเวลาแยกแถวล่าง — ยัด 3 ช่องบนจอ 375px แล้วบีบ */}
        <section className={styles.todayCard}>
          {pendingDate ? (
            <p className={styles.todayCardNote}>
              {t("กะค้างของวันที่ {date}", { date: dayjs(pendingDate).format("DD/MM/YYYY") })}
            </p>
          ) : null}
          <div className={styles.todayTimes}>
            <div className={styles.todayItem}>
              <span>{t("เข้างาน")}</span>
              <strong>{formatTime(record?.checkInAt)}</strong>
            </div>
            <div className={styles.todayDivider} aria-hidden />
            <div className={styles.todayItem}>
              <span>{t("ออกงาน")}</span>
              <strong>{formatTime(record?.checkOutAt)}</strong>
            </div>
          </div>
          <div className={styles.todayTotal}>
            <span>{t("รวมเวลาทำงาน")}</span>
            <strong>{formatDuration(t, record?.workHours)}</strong>
          </div>
        </section>

        {record ? (
          <div className={styles.statusRow}>
            <Tag color={record.status === "LATE" ? "warning" : "success"}>
              {record.status === "LATE" && record.lateMinutes
                ? t("สาย {n} นาที", { n: record.lateMinutes })
                : t(ATTENDANCE_STATUS_LABEL[record.status] ?? record.status)}
            </Tag>
            <span className={styles.statusHint}>
              {record.shiftName
                ? t("{shift} เข้ากะ {time} น.", { shift: record.shiftName, time: record.shiftStartTime ?? status.workStartTime })
                : t("เวลาเข้างาน {time} น.", { time: status.workStartTime })}
            </span>
          </div>
        ) : null}

        <div className={styles.actions}>
          {status.canCheckIn ? (
            <button
              type="button"
              className={`${styles.bigBtn} ${styles.bigBtnIn}`}
              disabled={ipBlocked || isBusy}
              onClick={confirmCheckIn}
            >
              <LoginOutlined />
              <span>{t("เข้างาน")}</span>
            </button>
          ) : null}

          {status.canCheckOut ? (
            <button
              type="button"
              className={`${styles.bigBtn} ${styles.bigBtnOut}`}
              disabled={ipBlocked || isBusy}
              onClick={confirmCheckOut}
            >
              <LogoutOutlined />
              <span>{t("ออกงาน")}</span>
            </button>
          ) : null}

          {doneForToday ? (
            <div className={styles.doneCard}>
              <strong>{t("ลงเวลาครบแล้ววันนี้")}</strong>
              <p>{t("ขอบคุณสำหรับการทำงานวันนี้ 🎉")}</p>
            </div>
          ) : null}

        </div>

        {/* เมนูบริการตัวเอง — แถวเต็มความกว้าง ไอคอน + ลูกศร ให้อ่านออกว่ากดได้ */}
        <nav className={styles.selfServiceLinks}>
          <p className={styles.selfServiceTitle}>{t("บริการพนักงาน")}</p>

          <a className={styles.selfServiceLink} href="/overtime">
            <span className={styles.selfServiceIcon} aria-hidden>
              <FieldTimeOutlined />
            </span>
            <span className={styles.selfServiceText}>
              <strong>{t("ขอทำงานล่วงเวลา")}</strong>
              <small>{t("ยื่นคำขอ OT และดูสถานะ")}</small>
            </span>
            <RightOutlined className={styles.selfServiceChevron} aria-hidden />
          </a>

          <a className={styles.selfServiceLink} href="/leave">
            <span
              className={`${styles.selfServiceIcon} ${styles.selfServiceIconLeave}`}
              aria-hidden
            >
              <CalendarOutlined />
            </span>
            <span className={styles.selfServiceText}>
              <strong>{t("ขอลางาน")}</strong>
              <small>{t("ยื่นใบลาและดูสถานะ")}</small>
            </span>
            <RightOutlined className={styles.selfServiceChevron} aria-hidden />
          </a>
        </nav>

        <section className={styles.historyCard}>
          <h2 className={styles.historyTitle}>{t("ประวัติล่าสุด")}</h2>
          {historyQuery.isLoading ? (
            <div className={styles.historyEmpty}>{t("กำลังโหลด...")}</div>
          ) : (historyQuery.data?.data.length ?? 0) === 0 ? (
            <div className={styles.historyEmpty}>{t("ยังไม่มีประวัติการลงเวลา")}</div>
          ) : (
            <ul className={styles.historyList}>
              {historyQuery.data?.data.map((row) => (
                <li key={row.id} className={styles.historyItem}>
                  <div className={styles.historyDate}>
                    <strong>{dayjs(row.attendanceDate).format("DD/MM")}</strong>
                    <span>{lang === "en" ? dayjs(row.attendanceDate).locale("en").format("ddd") : THAI_WEEKDAYS[dayjs(row.attendanceDate).day()]}</span>
                  </div>
                  <div className={styles.historyTimes}>
                    <span>
                      {formatTime(row.checkInAt)} - {formatTime(row.checkOutAt)}
                    </span>
                    <small>{formatDuration(t, row.workHours)}</small>
                  </div>
                  <Tag
                    color={row.status === "LATE" ? "warning" : "success"}
                    className={styles.historyTag}
                  >
                    {t(ATTENDANCE_STATUS_LABEL[row.status] ?? row.status)}
                  </Tag>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
