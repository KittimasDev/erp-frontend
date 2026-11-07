"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Checkbox, DatePicker, Input, Modal, Tag } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { useCreateProductionPlanMutation } from "@/hooks/production-schedule/useProductionSchedule";
import type { ScheduleRound } from "@/types/production-schedule";

import {
  addIsoDays,
  draftFromFirstStart,
  fmtDate,
  gapBetween,
  isShutdownDay,
  isWithinRound,
  shiftDraftStart,
  type DraftHoliday,
  type DraftRound,
} from "./schedule-dates";
import { useT } from "@/lib/i18n/useT";
import styles from "./ProductionSchedulePage.module.css";

type Props = {
  open: boolean;
  existingRounds: ScheduleRound[];
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateProductionPlanModal({
  open,
  existingRounds,
  onClose,
  onCreated,
}: Props) {
  const t = useT();
  const { modal } = App.useApp();
  const create = useCreateProductionPlanMutation();
  const [rounds, setRounds] = useState<DraftRound[]>([]);

  const previous = useMemo(() => {
    if (existingRounds.length === 0) return null;
    return [...existingRounds].sort((a, b) =>
      b.shutdownEndDate.localeCompare(a.shutdownEndDate),
    )[0];
  }, [existingRounds]);

  useEffect(() => {
    if (!open) return;
    const anchor = previous
      ? addIsoDays(previous.shutdownEndDate, 1)
      : dayjs().format("YYYY-MM-DD");
    setRounds(draftFromFirstStart(anchor));
  }, [open, previous]);

  const selectedCount = rounds.filter((round) => round.selected).length;
  const missingNote = rounds.some(
    (round) => round.selected && round.holidays.some((holiday) => !holiday.note.trim()),
  );

  const updateHolidays = (
    roundIndex: number,
    change: (holidays: DraftHoliday[]) => DraftHoliday[],
  ) =>
    setRounds((current) =>
      current.map((item) =>
        item.index === roundIndex ? { ...item, holidays: change(item.holidays) } : item,
      ),
    );

  const addHoliday = (roundIndex: number, value: Dayjs | null) => {
    if (!value) return;
    const iso = value.format("YYYY-MM-DD");
    updateHolidays(roundIndex, (holidays) =>
      holidays.some((holiday) => holiday.date === iso)
        ? holidays
        : [...holidays, { date: iso, note: "" }].sort((a, b) => a.date.localeCompare(b.date)),
    );
  };

  const onStartChange = (index: number, value: Dayjs | null) => {
    if (!value) return;
    const iso = value.format("YYYY-MM-DD");
    if (iso === rounds[index]?.startDate) return;
    const result = shiftDraftStart(
      rounds,
      index,
      iso,
      existingRounds.map((round) => ({
        roundNo: round.roundNo,
        startDate: round.startDate,
        shutdownEndDate: round.shutdownEndDate,
      })),
    );
    if (!result.ok) {
      modal.error({ title: t("เปลี่ยนวันเริ่มไม่ได้"), content: result.message });
      return;
    }
    const changed = result.rounds.filter(
      (round, row) => row >= index && round.startDate !== rounds[row]?.startDate,
    );
    modal.confirm({
      title: t("ยืนยันเปลี่ยนวันเริ่มผลิต?"),
      okText: t("เปลี่ยนวันที่"),
      cancelText: t("ยกเลิก"),
      content: (
        <div>
          <p>
            {t("รอบก่อนหน้าไม่เปลี่ยน รอบนี้และรอบถัดไปจะถูกคำนวณใหม่ โดยรอบถัดไปเริ่มชิดจาก Shutdown ของรอบก่อนหน้า ช่องว่างเดิมของรอบถัดไปจะหายไป")}
          </p>
          <ul style={{ paddingLeft: 18 }}>
            {changed.map((round) => {
              const before = rounds[round.index - 1];
              return (
                <li key={round.index}>
                  {t("รอบ {no}: ผลิต", { no: round.index })} {fmtDate(before.startDate)} – {fmtDate(before.endDate)}{" "}
                  {t("เป็น")} {fmtDate(round.startDate)} – {fmtDate(round.endDate)}
                  <br />
                  Shutdown {fmtDate(before.shutdownStartDate)} – {fmtDate(before.shutdownEndDate)}{" "}
                  {t("เป็น")} {fmtDate(round.shutdownStartDate)} – {fmtDate(round.shutdownEndDate)}
                </li>
              );
            })}
          </ul>
          {result.dropped.length > 0 ? (
            <p>
              {t("วันหยุดที่หลุดช่วงและจะถูกตัดออก:")}{" "}
              {result.dropped
                .map((holiday) =>
                  `${t("รอบ {no}", { no: holiday.index })} ${fmtDate(holiday.date)}${holiday.note.trim() ? ` (${holiday.note.trim()})` : ""}`,
                )
                .join(", ")}
            </p>
          ) : null}
        </div>
      ),
      onOk: () => setRounds(result.rounds),
    });
  };

  return (
    <Modal
      open={open}
      title={t("สร้างแผนการผลิต")}
      okText={t("สร้างแผนการผลิต")}
      cancelText={t("ยกเลิก")}
      destroyOnHidden
      width={860}
      confirmLoading={create.isPending}
      okButtonProps={{ disabled: selectedCount === 0 || missingNote }}
      onCancel={onClose}
      onOk={() => {
        const selected = rounds.filter((round) => round.selected);
        if (selected.length === 0 || missingNote) return;
        create.mutate(
          {
            rounds: selected.map((round) => ({
              startDate: round.startDate,
              holidays: round.holidays.map((holiday) => ({
                date: holiday.date,
                note: holiday.note.trim(),
              })),
            })),
          },
          { onSuccess: onCreated },
        );
      }}
    >
      <p>{t("ผลิต 45 วัน / Shutdown 3 วัน ระบบคำนวณช่วงวันที่ให้ และบันทึกเฉพาะรอบที่เลือก เป็นสถานะรอยืนยัน")}</p>
      {previous ? (
        <p>
          {t("รอบก่อนหน้า {no}: ผลิต", { no: previous.roundNo })} {fmtDate(previous.startDate)} – {fmtDate(previous.endDate)}
          {" · "}Shutdown {fmtDate(previous.shutdownStartDate)} – {fmtDate(previous.shutdownEndDate)}
        </p>
      ) : null}
      <div className={styles.draftList}>
        {rounds.map((round, index) => {
          const anchor =
            index === 0 ? previous?.shutdownEndDate : rounds[index - 1]?.shutdownEndDate;
          const gap = anchor ? gapBetween(anchor, round.startDate) : null;
          return (
            <div key={round.index}>
              {gap ? (
                <div className={styles.gapBanner}>
                  {t("ช่วงหยุดผลิตเพิ่มเติม")} {fmtDate(gap.from)} – {fmtDate(gap.to)}
                </div>
              ) : null}
              <div className={styles.draftRow}>
                <Checkbox
                  aria-label={t("สร้างรอบที่ {no}", { no: round.index })}
                  checked={round.selected}
                  onChange={(event) =>
                    setRounds((current) =>
                      current.map((item) =>
                        item.index === round.index
                          ? { ...item, selected: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                <strong>{t("รอบ {no}", { no: round.index })}</strong>
                <DatePicker
                  aria-label={t("วันเริ่มผลิตรอบที่ {no}", { no: round.index })}
                  value={dayjs(round.startDate)}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  onChange={(value) => onStartChange(index, value)}
                />
                <span className={styles.draftMeta}>
                  {t("ผลิต")} {fmtDate(round.startDate)} – {fmtDate(round.endDate)}
                  {" · "}Shutdown {fmtDate(round.shutdownStartDate)} – {fmtDate(round.shutdownEndDate)}
                </span>
              </div>
              <div className={styles.holidayBlock}>
                <div className={styles.holidayHeader}>
                  <span>{t("วันหยุดผลิตเพิ่มเติม")}</span>
                  <DatePicker
                    size="small"
                    aria-label={t("เพิ่มวันหยุดผลิตเพิ่มเติมรอบที่ {no}", { no: round.index })}
                    placeholder={t("เพิ่มวันหยุด")}
                    value={null}
                    format="DD/MM/YYYY"
                    defaultPickerValue={dayjs(round.startDate)}
                    disabledDate={(current) => {
                      const iso = current.format("YYYY-MM-DD");
                      return (
                        !isWithinRound(round, iso) ||
                        round.holidays.some((holiday) => holiday.date === iso)
                      );
                    }}
                    onChange={(value) => addHoliday(round.index, value)}
                  />
                </div>
                {round.holidays.map((holiday) => {
                  const empty = !holiday.note.trim();
                  return (
                    <div key={holiday.date} className={styles.holidayRow}>
                      <span>{fmtDate(holiday.date)}</span>
                      {isShutdownDay(round, holiday.date) ? (
                        <Tag color="orange">Shutdown</Tag>
                      ) : (
                        <Tag color="blue">{t("ผลิต")}</Tag>
                      )}
                      <Input
                        size="small"
                        aria-label={t("หมายเหตุวันหยุด {date}", { date: fmtDate(holiday.date) })}
                        placeholder={t("เช่น วันปีใหม่")}
                        maxLength={200}
                        value={holiday.note}
                        status={empty ? "error" : undefined}
                        onChange={(event) =>
                          updateHolidays(round.index, (holidays) =>
                            holidays.map((item) =>
                              item.date === holiday.date
                                ? { ...item, note: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={t("ลบวันหยุด {date}", { date: fmtDate(holiday.date) })}
                        onClick={() =>
                          updateHolidays(round.index, (holidays) =>
                            holidays.filter((item) => item.date !== holiday.date),
                          )
                        }
                      />
                    </div>
                  );
                })}
                {round.selected && round.holidays.some((holiday) => !holiday.note.trim()) ? (
                  <span className={styles.holidayHint}>{t("ระบุหมายเหตุของวันหยุดทุกวัน")}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
