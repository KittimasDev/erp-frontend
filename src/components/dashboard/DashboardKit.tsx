"use client";

import { useState, type ReactNode } from "react";
import { Alert, App, DatePicker, Spin } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import PageHeader from "@/components/common/PageHeader";
import ReportExportButtons, { type ReportExportFormat } from "@/components/reports/ReportExportButtons";
import { hasPermission, isMatrixPermissionMode } from "@/lib/auth/permissions-access";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { DashboardRange } from "@/types/dashboards";
import { downloadTabularReport, type TabularReport } from "@/utils/downloadTabularReport";

import styles from "./DashboardKit.module.css";

/** ชุดสีเดียวกับแดชบอร์ดที่มีอยู่ (ProductionDashboardPage / ProcurementDashboardPage) */
export const DASH_COLORS = {
  green: "#739816",
  greenDark: "#627F13",
  amber: "#F9BB0C",
  red: "#CF1322",
  blue: "#2F6FDE",
  muted: "#77777C",
};

export function fmt(value?: number | null, digits = 2) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(getStoredLanguage() === "en" ? "en-GB" : "th-TH", { maximumFractionDigits: digits });
}
export const fmtKg = (v?: number | null) => (v === null || v === undefined ? "—" : `${fmt(v, 0)} kg`);
export const fmtBaht = (v?: number | null) => (v === null || v === undefined ? "—" : `฿${fmt(v, 0)}`);
export const fmtPercent = (v?: number | null) => (v === null || v === undefined ? "—" : `${fmt(v, 1)}%`);
/** 17 ต.ค. — ย่อสำหรับแกนกราฟ */
export const shortDate = (ymd: string) => dayjs(ymd).format("D/M");

/** ช่วงวันที่ตั้งต้น 30 วันย้อนหลัง (รอบเตา 48 ชั่วโมง ช่วงสั้นได้จุดข้อมูลน้อย) */
export function useDashboardRange(): [DashboardRange, [Dayjs, Dayjs], (v: [Dayjs, Dayjs]) => void] {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day"), dayjs()]);
  return [{ from: range[0].format("YYYY-MM-DD"), to: range[1].format("YYYY-MM-DD") }, range, setRange];
}

/**
 * ปุ่มส่งออก Excel / PDF / CSV ของแดชบอร์ด — ใช้ข้อมูลที่แสดงอยู่บนจอ (ไม่เรียก API ซ้ำ)
 * PDF/Excel ผูกสิทธิ์ `<screenCode>.EXPORT` ของหน้านั้น · CSV แสดงเสมอเหมือนรายงานอื่น (ข้อมูลเดียวกับที่เห็นบนจอ)
 * `build` คืน null = ยังไม่มีข้อมูลให้ส่งออก (ปุ่มกดไม่ได้)
 */
export function DashboardExportButtons({
  screenCode,
  build,
}: {
  screenCode: string;
  build: () => TabularReport | null;
}) {
  const t = useT();
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState<ReportExportFormat | null>(null);
  const canExport = !isMatrixPermissionMode() || hasPermission(`${screenCode}.EXPORT`);
  const ready = build() !== null;

  const run = async (format: ReportExportFormat) => {
    const report = build();
    if (!report) {
      message.warning(t("ยังไม่มีข้อมูลให้ส่งออก"));
      return;
    }
    setDownloading(format);
    try {
      await downloadTabularReport(format, report);
    } catch (e) {
      message.error(e instanceof Error && e.message ? e.message : t("ส่งออกรายงานไม่สำเร็จ"));
    } finally {
      setDownloading(null);
    }
  };

  if (!ready) return null;
  return <ReportExportButtons canExport={canExport} downloading={downloading} onExport={(f) => void run(f)} />;
}

export function DashboardShell({
  eyebrow,
  title,
  subtitle,
  range,
  onRangeChange,
  loading,
  error,
  extra,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  range?: [Dayjs, Dayjs];
  onRangeChange?: (v: [Dayjs, Dayjs]) => void;
  loading?: boolean;
  error?: unknown;
  /** ปุ่มเพิ่มบนแถบเครื่องมือ เช่น ส่งออก */
  extra?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        controls={
          range && onRangeChange ? (
            <>
              <div className={styles.field}>
                <span>{t("ช่วงวันที่ (กว้างสุด 90 วัน)")}</span>
                <DatePicker.RangePicker
                  value={range}
                  allowClear={false}
                  format="DD/MM/BBBB"
                  onChange={(v) => {
                    if (v?.[0] && v[1]) onRangeChange([v[0], v[1]]);
                  }}
                />
              </div>
              {loading ? <Spin size="small" /> : null}
            </>
          ) : undefined
        }
        actions={range && onRangeChange && extra ? extra : undefined}
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          title={t("โหลดข้อมูลแดชบอร์ดไม่สำเร็จ")}
          description={error instanceof Error ? error.message : undefined}
        />
      ) : null}
      {children}
    </section>
  );
}

export function KpiGrid({ children, hero }: { children: ReactNode; hero?: boolean }) {
  return <div className={`${styles.kpis} ${hero ? styles.kpisHero : ""}`}>{children}</div>;
}

/** หัวข้อกลุ่มของหน้า เช่น "ตัวเลขหลัก" */
export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className={styles.section}>
      {children}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  note,
  tone = "default",
  icon,
  hero,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
  /** ไอคอนในกรอบสีตาม tone */
  icon?: ReactNode;
  /** การ์ดตัวเลขหลัก — ใหญ่กว่า */
  hero?: boolean;
}) {
  const toneClass = { default: styles.toneDefault, good: styles.toneGood, warn: styles.toneWarn, bad: styles.toneBad }[tone];
  return (
    <div className={`${styles.kpi} ${toneClass} ${hero ? styles.kpiHero : ""}`}>
      <div className={styles.kpiHead}>
        {icon ? <span className={styles.kpiIcon}>{icon}</span> : null}
        <div className={styles.kpiLabel}>{label}</div>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      {note ? <div className={styles.kpiNote}>{note}</div> : null}
    </div>
  );
}

export function Panel({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>{title}</h3>
        {extra}
      </div>
      {children}
    </div>
  );
}

export function Grid2({ children }: { children: ReactNode }) {
  return <div className={styles.grid2}>{children}</div>;
}

export function ChartBox({ children }: { children: ReactNode }) {
  return <div className={styles.chart}>{children}</div>;
}

/** แถวรายการ ชื่อ — ค่า */
export function ListRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className={styles.listItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <span className={styles.muted}>{text}</span>;
}
