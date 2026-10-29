"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Calendar,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

import {
  useScheduleCalendarQuery,
  useScheduleRoundsQuery,
  useScheduleSettingsQuery,
  useUpdateScheduleSettingsMutation,
} from "@/hooks/production-schedule/useProductionSchedule";
import CyclesPanel from "@/components/production-cycles/CyclesPanel";
import { canAccessScreen, getScreenActionPermissions } from "@/lib/auth/permissions-access";
import type {
  ScheduleCalendarDay,
  ScheduleDayType,
  ScheduleDisplayStatus,
  ScheduleRound,
} from "@/types/production-schedule";

import ConfirmProductionRoundModal from "./ConfirmProductionRoundModal";
import CreateProductionPlanModal from "./CreateProductionPlanModal";
import EditProductionRoundModal from "./EditProductionRoundModal";
import ProductionRoundDetailDrawer from "./ProductionRoundDetailDrawer";
import { fmtDate } from "./schedule-dates";
import styles from "./ProductionSchedulePage.module.css";

const STATUS_LABEL: Record<ScheduleDisplayStatus, string> = {
  PENDING: "รอยืนยัน",
  CONFIRMED: "ยืนยันแล้ว",
  OVERDUE: "เกินกำหนดยืนยัน",
};

const STATUS_COLOR: Record<ScheduleDisplayStatus, string> = {
  PENDING: "gold",
  CONFIRMED: "green",
  OVERDUE: "red",
};

const DAY_LABEL: Record<ScheduleDayType, string> = {
  PRODUCTION: "ผลิต",
  SHUTDOWN: "Shutdown",
  EXTRA_OFF: "หยุดเพิ่ม",
};

const DAY_CLASS: Record<ScheduleDayType, string> = {
  PRODUCTION: styles.prod,
  SHUTDOWN: styles.shutdown,
  EXTRA_OFF: styles.extra,
};

export default function ProductionSchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAdd, canEdit, canApprove } = getScreenActionPermissions("PRODUCTION_SCHEDULE");
  // รอบผลิตจริงใช้สิทธิ์ PRODUCTION_CYCLES แยกจากสิทธิ์ตารางการผลิต
  const canViewSchedule = canAccessScreen("PRODUCTION_SCHEDULE");
  const canViewCycles = canAccessScreen("PRODUCTION_CYCLES");
  const tabParam = searchParams.get("tab");
  const requestedTab =
    tabParam === "rounds" || tabParam === "cycles" ? tabParam : "calendar";
  const tab =
    requestedTab === "cycles" && !canViewCycles
      ? "calendar"
      : requestedTab !== "cycles" && !canViewSchedule && canViewCycles
        ? "cycles"
        : requestedTab;

  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ScheduleDisplayStatus | "">("");
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leadDays, setLeadDays] = useState<number>(15);
  const [detail, setDetail] = useState<ScheduleRound | null>(null);
  const [editing, setEditing] = useState<ScheduleRound | null>(null);
  const [confirming, setConfirming] = useState<ScheduleRound | null>(null);

  const roundsQuery = useScheduleRoundsQuery({});
  const calendarQuery = useScheduleCalendarQuery(month.format("YYYY-MM"));
  const settingsQuery = useScheduleSettingsQuery(settingsOpen);
  const saveSettings = useUpdateScheduleSettingsMutation();

  const items = roundsQuery.data?.data.items ?? [];
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !item.roundNo.toLowerCase().includes(q)) return false;
      if (status && item.displayStatus !== status) return false;
      return true;
    });
  }, [items, keyword, status]);

  const near = items.filter((item) => item.nearDeadline);
  const overdue = items.filter((item) => item.displayStatus === "OVERDUE");
  const totalRounds = calendarQuery.data?.data.totalRounds ?? items.length;
  const dayMap = useMemo(() => {
    const map = new Map<string, ScheduleCalendarDay>();
    for (const day of calendarQuery.data?.data.days ?? []) map.set(day.date, day);
    return map;
  }, [calendarQuery.data]);

  const setTab = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "rounds" || key === "cycles") params.set("tab", key);
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/production/schedule?${qs}` : "/production/schedule");
  };

  const openCreate = () => setCreateOpen(true);

  const columns: ColumnsType<ScheduleRound> = [
    { title: "ลำดับ", dataIndex: "sequence", width: 80 },
    { title: "รหัสรอบ", dataIndex: "roundNo", width: 140 },
    {
      title: "ช่วงวันที่ผลิต",
      render: (_value, row) => `${fmtDate(row.startDate)} – ${fmtDate(row.endDate)}`,
    },
    {
      title: "ช่วง Shutdown",
      render: (_value, row) =>
        `${fmtDate(row.shutdownStartDate)} – ${fmtDate(row.shutdownEndDate)}`,
    },
    {
      title: "สถานะ",
      width: 160,
      render: (_value, row) => (
        <Tag color={STATUS_COLOR[row.displayStatus]}>{STATUS_LABEL[row.displayStatus]}</Tag>
      ),
    },
    {
      title: "การจัดการ",
      width: 240,
      render: (_value, row) => {
        const locked = row.displayStatus === "CONFIRMED";
        return (
          <Space size={0}>
            <Button type="link" onClick={() => setDetail(row)}>
              ดูรายละเอียด
            </Button>
            {!locked && canEdit ? (
              <Button type="link" onClick={() => setEditing(row)}>
                แก้ไข
              </Button>
            ) : null}
            {!locked && canApprove ? (
              <Button type="link" onClick={() => setConfirming(row)}>
                ยืนยัน
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  const calendar = (
    <div>
      {calendarQuery.isLoading ? (
        <Spin />
      ) : totalRounds === 0 ? (
        <Empty description="ยังไม่มีแผนการผลิต">
          {canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              สร้างแผนการผลิต
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <Calendar
            value={month}
            mode="month"
            onPanelChange={(value) => setMonth(value)}
            onSelect={(value) => {
              if (!value.isSame(month, "month")) setMonth(value);
            }}
            cellRender={(current, info) => {
              if (info.type !== "date") return null;
              const day = dayMap.get(current.format("YYYY-MM-DD"));
              if (!day) return null;
              const pending = !day.confirmed;
              return (
                <Tooltip
                  title={`${day.roundNo} · ${DAY_LABEL[day.dayType]} · ${STATUS_LABEL[day.displayStatus]}${day.note ? ` · ${day.note}` : ""}`}
                >
                  <div className={`${styles.chip} ${pending ? styles.pending : DAY_CLASS[day.dayType]}`}>
                    <strong>{day.roundNo}</strong>
                    <span>{DAY_LABEL[day.dayType]}</span>
                  </div>
                </Tooltip>
              );
            }}
          />
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <i className={`${styles.swatch} ${styles.prod}`} /> วันผลิต (ยืนยันแล้ว)
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.swatch} ${styles.shutdown}`} /> วัน Shutdown (ยืนยันแล้ว)
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.swatch} ${styles.extra}`} /> วันหยุดผลิตเพิ่มเติม (ยืนยันแล้ว)
            </span>
            <span className={styles.legendItem}>
              <i className={`${styles.swatch} ${styles.pending}`} /> ยังไม่ยืนยัน (ป้ายบอกชนิดวัน)
            </span>
          </div>
        </>
      )}
    </div>
  );

  const list = (
    <div style={{ display: "grid", gap: 12 }}>
      <Space wrap>
        <Input
          aria-label="ค้นหารหัสรอบ"
          allowClear
          placeholder="ค้นหารหัสรอบ"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          style={{ width: 220 }}
        />
        <Select
          aria-label="กรองสถานะ"
          allowClear
          placeholder="สถานะ"
          value={status || undefined}
          onChange={(value) => setStatus(value ?? "")}
          style={{ width: 200 }}
          options={[
            { value: "PENDING", label: STATUS_LABEL.PENDING },
            { value: "CONFIRMED", label: STATUS_LABEL.CONFIRMED },
            { value: "OVERDUE", label: STATUS_LABEL.OVERDUE },
          ]}
        />
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={roundsQuery.isLoading}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: items.length === 0 ? "ยังไม่มีแผนการผลิต" : "ไม่พบรอบตามเงื่อนไข" }}
      />
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ตารางการผลิต</h1>
          <p className={styles.subtitle}>
            ดูภาพรวมรายเดือน วางแผนและยืนยันรอบการผลิต แล้วติดตามรอบผลิตจริงในแท็บเดียว · รหัสรอบเป็นรหัสเดียวกันตั้งแต่ตอนวางแผน
          </p>
        </div>
        <div className={styles.actions}>
          {canEdit ? (
            <Button
              icon={<SettingOutlined />}
              onClick={() => {
                setLeadDays(roundsQuery.data?.data.leadDays ?? 15);
                setSettingsOpen(true);
              }}
            >
              ตั้งค่าวันล่วงหน้า
            </Button>
          ) : null}
          {canAdd ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              สร้างแผนการผลิต
            </Button>
          ) : null}
        </div>
      </header>

      {near.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          title="มีรอบใกล้ถึงกำหนดยืนยัน"
          description={near
            .map((item) => `${item.roundNo} ภายใน ${fmtDate(item.confirmByDate)}`)
            .join(" · ")}
        />
      ) : null}
      {overdue.length > 0 ? (
        <Alert
          type="error"
          showIcon
          title="มีรอบเกินกำหนดยืนยัน"
          description={overdue.map((item) => item.roundNo).join(", ")}
        />
      ) : null}
      {canViewSchedule && (roundsQuery.isError || calendarQuery.isError) ? (
        <Alert type="error" showIcon title="โหลดตารางการผลิตไม่สำเร็จ" />
      ) : null}

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          ...(canViewSchedule
            ? [
                { key: "calendar", label: "ตารางการผลิต", children: calendar },
                { key: "rounds", label: "รายการรอบการผลิต", children: list },
              ]
            : []),
          ...(canViewCycles
            ? [{ key: "cycles", label: "รอบผลิตจริง", children: <CyclesPanel /> }]
            : []),
        ]}
      />

      <CreateProductionPlanModal
        open={createOpen}
        existingRounds={items}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setTab("rounds");
        }}
      />
      {editing ? (
        <EditProductionRoundModal round={editing} onClose={() => setEditing(null)} />
      ) : null}
      {confirming ? (
        <ConfirmProductionRoundModal round={confirming} onClose={() => setConfirming(null)} />
      ) : null}
      <ProductionRoundDetailDrawer round={detail} onClose={() => setDetail(null)} />

      <Modal
        open={settingsOpen}
        title="กำหนดวันล่วงหน้าก่อนยืนยัน"
        okText="บันทึก"
        cancelText="ยกเลิก"
        destroyOnHidden
        confirmLoading={saveSettings.isPending}
        onCancel={() => setSettingsOpen(false)}
        onOk={() =>
          saveSettings.mutate(leadDays, {
            onSuccess: () => setSettingsOpen(false),
          })
        }
      >
        <p>
          ต้องยืนยันรอบก่อนวันเริ่มผลิตอย่างน้อยกี่วัน
          {settingsQuery.data ? ` (ปัจจุบัน ${settingsQuery.data.data.confirmLeadDays} วัน)` : ""}
        </p>
        <InputNumber
          aria-label="จำนวนวันล่วงหน้า"
          min={1}
          max={180}
          precision={0}
          value={leadDays}
          onChange={(value) => setLeadDays(value ?? 15)}
          style={{ width: "100%" }}
        />
      </Modal>
    </div>
  );
}
