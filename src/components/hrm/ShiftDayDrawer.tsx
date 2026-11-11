"use client";

import { useState } from "react";
import { Alert, Button, Drawer, Empty, Popconfirm, Space, Tag } from "antd";
import {
  CalendarOutlined,
  PlusOutlined,
  StopOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { useRemoveHolidayMutation } from "@/hooks/shifts/useShiftMutations";
import {
  WORK_CALENDAR_DAY_TYPE_LABEL,
  type Shift,
  type ShiftCalendarDay,
  type ShiftSchedule,
} from "@/types/shifts";

import ShiftRoundCard from "./ShiftRoundCard";
import ShiftScheduleModal from "./ShiftScheduleModal";
import WorkCalendarDayModal from "./WorkCalendarDayModal";
import styles from "./ShiftCalendarPage.module.css";

type Props = {
  open: boolean;
  date: string;
  day?: ShiftCalendarDay;
  shifts: Shift[];
  onClose: () => void;
  /** ย้ายรอบกะไปวันอื่นสำเร็จ — ให้ปฏิทินตามไปเปิดวันปลายทาง */
  onMoved?: (date: string) => void;
};

const THAI_WEEKDAYS = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

function formatThaiDate(date: string, lang: "th" | "en" = "th") {
  const value = dayjs(date);
  if (lang === "en") {
    return value.locale("en").format("dddd, D/M/BBBB");
  }
  return `วัน${THAI_WEEKDAYS[value.day()]}ที่ ${value.format("D/M/BBBB")}`;
}

/** รายละเอียดของวันที่กดในปฏิทิน — รอบกะทั้งหมด คนในกะ และการกดหยุด */
export default function ShiftDayDrawer({
  open,
  date,
  day,
  shifts,
  onClose,
  onMoved,
}: Props) {
  const t = useT();
  const lang = useLanguage();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftSchedule | null>(null);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);

  const removeHolidayMutation = useRemoveHolidayMutation();

  const schedules = day?.schedules ?? [];
  const holiday = day?.holiday;

  const openCreate = () => {
    setEditing(null);
    setScheduleModalOpen(true);
  };

  const openEdit = (schedule: ShiftSchedule) => {
    setEditing(schedule);
    setScheduleModalOpen(true);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={480}
      destroyOnHidden
      title={
        <div className={styles.drawerTitle}>
          <CalendarOutlined />
          <span>{formatThaiDate(date, lang)}</span>
        </div>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("เพิ่มรอบกะ")}
        </Button>
      }
    >
      {holiday ? (
        <Alert
          type={holiday.dayType === "MAINTENANCE" ? "warning" : "info"}
          showIcon
          icon={holiday.dayType === "MAINTENANCE" ? <ToolOutlined /> : undefined}
          style={{ marginBottom: 16 }}
          title={`${t(WORK_CALENDAR_DAY_TYPE_LABEL[holiday.dayType] ?? "วันหยุด")} — ${holiday.name}`}
          description={
            <div className={styles.holidayBody}>
              {holiday.note ? <p>{holiday.note}</p> : null}
              <p className={styles.holidayHint}>
                {t("วันนี้ไม่คิดสายให้พนักงาน แต่ยังกดเข้า-ออกงานได้ปกติ")}
              </p>
              <Space size={8} wrap>
                <Button size="small" onClick={() => setHolidayModalOpen(true)}>
                  {t("แก้ไข")}
                </Button>
                <Popconfirm
                  title={t("ยกเลิกวันหยุดนี้?")}
                  description={t("วันนี้จะกลับเป็นวันทำงานปกติ")}
                  okText={t("ยกเลิกวันหยุด")}
                  cancelText={t("ไม่")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() =>
                    removeHolidayMutation.mutateAsync(holiday.id)
                  }
                >
                  <Button size="small" danger>
                    {t("ยกเลิกวันหยุด")}
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          }
        />
      ) : (
        <Button
          block
          icon={<StopOutlined />}
          style={{ marginBottom: 16 }}
          onClick={() => setHolidayModalOpen(true)}
        >
          {t("กดหยุดวันนี้ (วันหยุด / วันซ่อมเครื่อง)")}
        </Button>
      )}

      <div className={styles.drawerSection}>
        <div className={styles.drawerSectionHead}>
          <h3>{t("รอบกะของวันนี้")}</h3>
          {schedules.length > 0 ? (
            <Tag color="green">{t("{n} คน", { n: day?.totalMembers ?? 0 })}</Tag>
          ) : null}
        </div>

        {schedules.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t("ยังไม่ได้จัดกะของวันนี้")}
          />
        ) : (
          <div className={styles.roundList}>
            {schedules.map((schedule) => (
              <ShiftRoundCard
                key={schedule.id}
                schedule={schedule}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <ShiftScheduleModal
        open={scheduleModalOpen}
        date={date}
        shifts={shifts}
        schedule={editing}
        onClose={() => setScheduleModalOpen(false)}
        onMoved={onMoved}
      />

      <WorkCalendarDayModal
        open={holidayModalOpen}
        date={date}
        holiday={holiday}
        onClose={() => setHolidayModalOpen(false)}
      />
    </Drawer>
  );
}
