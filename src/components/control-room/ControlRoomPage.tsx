"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import { Alert, App, Button, Progress, Select, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FullscreenExitOutlined, FullscreenOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { formatThaiDate as formatThaiDateBE } from "@/components/ap-documents/apDocumentConfig";
import { getStoredLanguage } from "@/lib/i18n/language";
import { tNow, useT } from "@/lib/i18n/useT";
import StatusLight from "@/components/common/StatusLight";
import { DashboardExportButtons } from "@/components/dashboard/DashboardKit";
import { buildControlRoomReport } from "@/utils/dashboardExport";
import { useControlRoomQuery } from "@/hooks/control-room/useControlRoomQuery";
import type {
  ControlRoomCycle,
  ControlRoomEquipment,
  ControlRoomOrder,
  ControlRoomOutputRow,
} from "@/types/control-room";

import styles from "./ControlRoomPage.module.css";

const REFRESH_OPTIONS = [1, 2, 3, 5] as const;
const DEFAULT_REFRESH_MIN = 1;
const STORAGE_KEY = "control-room-refresh-min";
const REFRESH_EVENT = "control-room-refresh-change";

const numLocale = () => (getStoredLanguage() === "en" ? "en-GB" : "th-TH");
const num = { format: (v: number) => new Intl.NumberFormat(numLocale(), { maximumFractionDigits: 1 }).format(v) };
const qty = { format: (v: number) => new Intl.NumberFormat(numLocale(), { maximumFractionDigits: 3 }).format(v) };

/** วันที่ตามภาษา — ไทย = พ.ศ. · อังกฤษ = ค.ศ. */
function formatThaiDate(value?: string | null) {
  if (getStoredLanguage() !== "en") return formatThaiDateBE(value);
  return value ? dayjs(value.slice(0, 10)).format("DD/MM/YYYY") : "—";
}

/** รอบรีเฟรช (นาที) ที่ผู้ใช้เลือก — จำไว้ในเครื่องนี้ (localStorage อาจใช้ไม่ได้ จึงครอบ try/catch) */
function readRefreshMin(): number {
  try {
    const v = Number(window.localStorage.getItem(STORAGE_KEY));
    return (REFRESH_OPTIONS as readonly number[]).includes(v) ? v : DEFAULT_REFRESH_MIN;
  } catch {
    return DEFAULT_REFRESH_MIN;
  }
}

function subscribeRefresh(cb: () => void) {
  window.addEventListener(REFRESH_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(REFRESH_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function saveRefreshMin(min: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(min));
  } catch {
    /* ใช้ค่าเดิมต่อไปในหน้านี้ */
  }
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

const subscribeFullscreen = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

const downtimeText = (minutes: number) =>
  minutes >= 60
    ? tNow("{h} ชม. {m} นาที", { h: Math.floor(minutes / 60), m: minutes % 60 })
    : tNow("{m} นาที", { m: minutes });

function cycleLine(c: ControlRoomCycle): string {
  switch (c.phase) {
    case "RUNNING":
      return tNow("เหลืออีก {n} วันถึง Shutdown (เริ่ม {date})", { n: c.daysToShutdown ?? 0, date: formatThaiDate(c.shutdownStartDate) });
    case "NOT_STARTED":
      return tNow("รอบจะเริ่ม {date} · อีก {n} วันถึง Shutdown", { date: formatThaiDate(c.startDate), n: c.daysToShutdown ?? 0 });
    case "SHUTDOWN":
      return tNow("อยู่ในช่วง Shutdown ถึง {date}", { date: formatThaiDate(c.shutdownEndDate) });
    case "OVERDUE":
      return tNow("เลยวันสิ้นสุดรอบ ({date}) แต่ยังไม่ปิดรอบ", { date: formatThaiDate(c.shutdownEndDate) });
    default:
      return "";
  }
}

function OutputList({ rows, empty }: { rows: ControlRoomOutputRow[]; empty: string }) {
  if (rows.length === 0) return <Typography.Text className={styles.muted}>{empty}</Typography.Text>;
  return (
    <div>
      {rows.map((r) => (
        <div key={`${r.itemCode ?? r.itemName}-${r.unit ?? ""}`} className={styles.alertItem}>
          <strong>{r.itemName}</strong>
          <span>
            {qty.format(r.quantity)} {r.unit ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Control Room (M15.3–15.6): สถานะการผลิตสด · เต็มจอ/TV · รีเฟรชอัตโนมัติ 1–5 นาที · ไฟเขียว/เหลือง/แดง
 */
export default function ControlRoomPage() {
  const t = useT();
  const { message } = App.useApp();
  const rootRef = useRef<HTMLDivElement>(null);
  const refreshMin = useSyncExternalStore(subscribeRefresh, readRefreshMin, () => DEFAULT_REFRESH_MIN);
  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => document.fullscreenElement !== null,
    () => false,
  );
  // draft = สวิตช์ที่กำลังเลือก · onlyProblems = ค่าที่ใช้กรองการ์ดเครื่องจักรจริง (เปลี่ยนเมื่อกด ค้นหา/ล้าง)
  const [draftOnlyProblems, setDraftOnlyProblems] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const query = useControlRoomQuery(refreshMin * 60_000);
  const data = query.data;

  // นับถอยหลังถึงรอบรีเฟรชถัดไป (ตั้งค่าใน callback ของ interval ไม่ใช่ใน body ของ effect)
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const secondsLeft = Math.max(Math.ceil((refreshMin * 60_000 - (nowMs - query.dataUpdatedAt)) / 1000), 0);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      message.error(t("เบราว์เซอร์นี้เปิดโหมดเต็มจอไม่ได้"));
    }
  };

  const orderColumns: ColumnsType<ControlRoomOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    { title: t("สถานะ"), dataIndex: "light", width: 150, render: (_v, r) => <StatusLight light={r.light} /> },
    { title: t("ใบสั่งผลิต"), dataIndex: "orderNo", render: (v: string) => <strong>{v}</strong> },
    { title: "Batch", dataIndex: "batchNo", render: (v?: string) => v ?? "—" },
    {
      title: t("เดินมาแล้ว (ชม.)"),
      dataIndex: "elapsedHours",
      align: "right",
      render: (v: number, r) => `${num.format(v)} (${t("สุทธิ")} ${num.format(r.netRunHours)})`,
    },
    {
      title: t("ความคืบหน้า"),
      dataIndex: "cycleProgressPercent",
      width: 180,
      render: (v: number | null | undefined, r) =>
        v === null || v === undefined ? (
          "—"
        ) : (
          <Progress
            percent={Math.min(Math.round(v), 100)}
            size="small"
            status={r.light === "RED" ? "exception" : undefined}
            format={() => `${Math.round(v)}%`}
          />
        ),
    },
    {
      title: t("เหตุผล"),
      dataIndex: "reasons",
      render: (v: string[]) => (v.length ? v.join(" · ") : <span className={styles.muted}>—</span>),
    },
  ];

  if (!data) {
    return query.isError ? (
      <Alert type="error" showIcon title={t("โหลดข้อมูลห้องควบคุมไม่สำเร็จ")} description={query.error instanceof Error ? query.error.message : undefined} />
    ) : (
      <Typography.Text className={styles.muted}>{t("กำลังโหลดข้อมูลห้องควบคุม…")}</Typography.Text>
    );
  }

  const equipment: ControlRoomEquipment[] = onlyProblems ? data.equipment.filter((e) => e.light !== "GREEN") : data.equipment;
  const feed = data.production.feedRate;

  return (
    <div ref={rootRef} className={`${styles.root} ${isFullscreen ? styles.tv : ""}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Typography.Title level={3} className={styles.title}>
            {t("Control Room — ห้องควบคุมการผลิต")}
          </Typography.Title>
          <StatusLight light={data.overallLight} size="lg" />
          <div className={styles.counts} aria-label={t("สรุปจำนวนตามสถานะ")}>
            <span className={`${styles.count} ${styles.countRed}`}>{t("หยุด/เสีย")} {data.counts.red}</span>
            <span className={`${styles.count} ${styles.countYellow}`}>{t("เฝ้าระวัง")} {data.counts.yellow}</span>
            <span className={`${styles.count} ${styles.countGreen}`}>{t("ปกติ")} {data.counts.green}</span>
          </div>
        </div>
        <div className={styles.controls}>
          <span className={styles.updated}>
            {t("อัปเดต {time} · รีเฟรชอีก {n} วินาที", { time: dayjs(data.asOf).format("HH:mm:ss"), n: secondsLeft })}
          </span>
          <Select
            aria-label={t("รอบรีเฟรชอัตโนมัติ")}
            value={refreshMin}
            style={{ width: 150 }}
            onChange={saveRefreshMin}
            options={REFRESH_OPTIONS.map((m) => ({ value: m, label: t("รีเฟรชทุก {n} นาที", { n: m }) }))}
          />
          <DashboardExportButtons screenCode="CONTROL_ROOM_DASHBOARD" build={() => buildControlRoomReport(data)} />
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>
            {t("รีเฟรชทันที")}
          </Button>
          <Button
            type="primary"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? t("ออกจากเต็มจอ") : t("เต็มจอ / TV")}
          </Button>
        </div>
      </div>

      {query.isError ? (
        <Alert
          type="warning"
          showIcon
          title={t("รีเฟรชไม่สำเร็จ — กำลังแสดงข้อมูลเมื่อ {time} (จะลองใหม่ตามรอบ)", { time: dayjs(data.asOf).format("HH:mm:ss") })}
        />
      ) : null}

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{t("รอบการผลิต (Cycle Counter)")}</h3>
        {data.cycle ? (
          <div>
            <div className={styles.cycleBig}>
              {data.cycle.phase === "NOT_STARTED" ? t("ยังไม่เริ่มรอบ") : t("วันที่ {day} จาก {total}", { day: data.cycle.runDay, total: data.cycle.runDays })}
              <span className={styles.kpiNote}> · {data.cycle.cycleNo}</span>
            </div>
            <Progress percent={Math.round(data.cycle.progressPercent)} status={data.cycle.phase === "OVERDUE" ? "exception" : "active"} />
            <Typography.Text>{cycleLine(data.cycle)}</Typography.Text>
          </div>
        ) : (
          <Typography.Text className={styles.muted}>{t("ไม่มีรอบผลิตที่เปิดอยู่")}</Typography.Text>
        )}
      </div>

      <div className={styles.kpis}>
        <div className={styles.card}>
          <div className={styles.kpiLabel}>Feed Rate</div>
          <div className={styles.kpiValue}>
            {feed.value === null || feed.value === undefined ? "—" : `${num.format(feed.value)} ${feed.unit}`}
          </div>
          <StatusLight light={feed.light} />
          <div className={styles.kpiNote}>
            {feed.source === "LIVE"
              ? t("ค่าสดจากอุปกรณ์")
              : feed.source === "SHIFT"
                ? `${t("จากบันทึกกะล่าสุด")}${feed.recordedAt ? ` (${dayjs(feed.recordedAt).format("DD/MM HH:mm")})` : ""}`
                : t("ยังไม่มีข้อมูล")}
            {feed.cycleAvg ? ` · ${t("เฉลี่ยรอบ")} ${num.format(feed.cycleAvg)}` : ""}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.kpiLabel}>{t("ยางที่ป้อนวันนี้")}</div>
          <div className={styles.kpiValue}>{num.format(data.production.inputTodayKg)} kg</div>
          <div className={styles.kpiNote}>{t("จากบันทึกกะ")}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.kpiLabel}>{t("ชั่วโมงเดินเครื่องวันนี้")}</div>
          <div className={styles.kpiValue}>{num.format(data.production.operatingHoursToday)} {t("ชม.")}</div>
          <div className={styles.kpiNote}>{t("จากบันทึกกะ")}</div>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t("ผลผลิตวันนี้ (อนุมัติรับเข้าคลังแล้ว)")}</h3>
          <OutputList rows={data.outputs.today} empty={t("ยังไม่มีผลผลิตรับเข้าคลังวันนี้")} />
        </div>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>{t("ผลผลิตสะสมของรอบนี้")}</h3>
          <OutputList rows={data.outputs.cycleTotal} empty={t("ยังไม่มีผลผลิตสะสมของรอบนี้")} />
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>{t("ใบสั่งผลิตที่กำลังเดิน")}</h3>
        <Table<ControlRoomOrder>
          rowKey="id"
          size="small"
          columns={orderColumns}
          dataSource={data.production.runningOrders}
          pagination={false}
          scroll={{ x: 800 }}
          locale={{ emptyText: t("ไม่มีการผลิตตอนนี้") }}
        />
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          {t("Downtime ที่ยังไม่ปิด")}{" "}
          {data.downtimeAlerts.length > 0 ? <Tag color="red">{t("{n} รายการ", { n: data.downtimeAlerts.length })}</Tag> : null}
        </h3>
        {data.downtimeAlerts.length === 0 ? (
          <Typography.Text className={styles.muted}>{t("ไม่มี Downtime ค้างอยู่")}</Typography.Text>
        ) : (
          data.downtimeAlerts.map((d) => (
            <div key={`${d.source}-${d.ref}-${d.startedAt}`} className={styles.alertItem}>
              <Tag color={d.source === "PRODUCTION" ? "volcano" : "red"}>{d.source === "PRODUCTION" ? t("การผลิต") : t("เครื่องจักร")}</Tag>
              <strong>{d.ref}</strong>
              <span>{d.reason ?? t("ไม่ระบุเหตุผล")}</span>
              <span className={styles.muted}>{t("หยุดมาแล้ว")} {downtimeText(d.minutesOpen)}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          {t("สถานะเครื่องจักรแต่ละชุด")}
        </h3>
        <FilterCard
          onSearch={() => setOnlyProblems(draftOnlyProblems)}
          onClear={() => {
            setDraftOnlyProblems(false);
            setOnlyProblems(false);
          }}
        >
          <FilterField label={t("เฉพาะที่ไม่ปกติ")}>
            <Switch checked={draftOnlyProblems} onChange={setDraftOnlyProblems} aria-label={t("แสดงเฉพาะที่ไม่ปกติ")} />
          </FilterField>
        </FilterCard>
        {equipment.length === 0 ? (
          <Typography.Text className={styles.muted}>
            {onlyProblems ? t("ทุกเครื่องปกติ") : t("ยังไม่มีทะเบียนเครื่องจักร")}
          </Typography.Text>
        ) : (
          <div className={styles.equipmentGrid}>
            {equipment.map((e) => (
              <div key={e.id} className={`${styles.equipmentCard} ${styles[`equip${e.light}` as keyof typeof styles]}`}>
                <StatusLight light={e.light} />
                <div className={styles.equipmentName}>
                  {e.code} · {e.name}
                </div>
                {e.reasons.map((r) => (
                  <div key={r} className={styles.reason}>
                    {r}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
