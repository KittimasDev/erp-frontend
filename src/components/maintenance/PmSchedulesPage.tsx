"use client";

import { useState } from "react";
import { Alert, Button, Popconfirm, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CalendarOutlined, PlusOutlined, SyncOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreatePmScheduleMutation,
  useGeneratePmWorkOrderMutation,
  usePmSchedulesQuery,
  useRunPmCheckMutation,
  useUpdatePmScheduleMutation,
} from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useT } from "@/lib/i18n/useT";
import type { PmDueState, PmSchedule } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import { fmtDate } from "./maintenance-format";
import PmScheduleFormModal from "./PmScheduleFormModal";
import PageHeader from "@/components/common/PageHeader";

const DUE_COLOR: Record<PmDueState, string> = { NOT_DUE: "default", UPCOMING: "gold", DUE: "orange", OVERDUE: "red" };
const DUE_TEXT: Record<PmDueState, string> = { NOT_DUE: "ยังไม่ถึง", UPCOMING: "ใกล้ถึงกำหนด", DUE: "ถึงกำหนด", OVERDUE: "เกินกำหนด" };

/** หน้า /maintenance/pm-schedules — แผน PM ปฏิทิน/รอบผลิต + สร้างใบสั่งงานอัตโนมัติ + แจ้งเตือนล่วงหน้า */
export default function PmSchedulesPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PmSchedule | "new" | null>(null);
  const query = usePmSchedulesQuery();
  const create = useCreatePmScheduleMutation();
  const update = useUpdatePmScheduleMutation();
  const generate = useGeneratePmWorkOrderMutation();
  const runCheck = useRunPmCheckMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("PM_SCHEDULES");
  const rows = query.data?.data ?? [];

  const columns: ColumnsType<PmSchedule> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("แผน PM"),
      key: "plan",
      render: (_v, s) => (
        <div>
          <strong>{s.equipmentCode}</strong> {s.title ?? "PM"}
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{s.equipmentName}</div>
        </div>
      ),
    },
    {
      title: t("รอบ"),
      key: "freq",
      width: 150,
      render: (_v, s) => (s.scheduleType === "CYCLE" ? t("ทุก {n} รอบผลิต", { n: s.frequencyCycles ?? "" }) : t("ทุก {n} วัน", { n: s.frequencyDays ?? "" })),
    },
    {
      title: t("ครบกำหนด"),
      key: "due",
      width: 220,
      render: (_v, s) => (
        <div>
          {s.scheduleType === "CALENDAR" ? fmtDate(s.nextDueDate) : t("ตามรอบผลิต")}
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{s.dueLabel}</div>
        </div>
      ),
    },
    {
      title: t("สถานะ"),
      key: "state",
      width: 130,
      render: (_v, s) => (s.isActive ? <Tag color={DUE_COLOR[s.dueState]}>{t(DUE_TEXT[s.dueState])}</Tag> : <Tag>{t("ปิดใช้งาน")}</Tag>),
    },
    {
      title: t("เตรียมของ"),
      key: "prep",
      render: (_v, s) => (
        <div style={{ fontSize: 12 }}>
          {s.plannedParts?.length ? s.plannedParts.map((p) => `${p.partName} ×${p.quantity}`).join(", ") : "—"}
          {s.plannedManpower ? ` · ${t("ช่าง {n} คน", { n: s.plannedManpower })}` : ""}
        </div>
      ),
    },
    {
      title: t("ใบสั่งงาน"),
      key: "wo",
      width: 150,
      render: (_v, s) =>
        s.openWorkOrderNo ? <Tag color="blue">{s.openWorkOrderNo}</Tag> : s.autoGenerate ? <span style={{ color: "#8a94a6" }}>{t("สร้างอัตโนมัติ")}</span> : "—",
    },
    {
      title: t("ใช้งาน"),
      key: "active",
      width: 80,
      render: (_v, s) => (
        <Switch
          size="small"
          checked={s.isActive}
          disabled={!canEdit}
          onChange={(checked) => update.mutate({ id: s.id, body: { isActive: checked } })}
        />
      ),
    },
    {
      title: "",
      key: "act",
      width: 210,
      render: (_v, s) => (
        <div style={{ display: "flex", gap: 6 }}>
          {canEdit ? <Button size="small" onClick={() => setEditing(s)}>{t("แก้ไข")}</Button> : null}
          {s.isActive && !s.openWorkOrderNo && canEdit ? (
            <Popconfirm title={t("สร้างใบสั่งงาน PM จากแผนนี้ตอนนี้?")} okText={t("สร้าง")} cancelText={t("ยกเลิก")} onConfirm={() => generate.mutate(s.id)}>
              <Button size="small" type="primary" loading={generate.isPending && generate.variables === s.id}>
                {t("สร้างใบสั่งงาน")}
              </Button>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MAINTENANCE · PM"
          icon={<CalendarOutlined />}
          title={t("แผน PM (บำรุงรักษาเชิงป้องกัน)")}
          subtitle={t("รายวัน/รายสัปดาห์/ทุก N วัน หรือทุก N รอบผลิต · ระบบสร้างใบสั่งงานและแจ้งเตือนล่วงหน้าให้เตรียมอะไหล่และช่าง")}
          actions={
            <>
<div style={{ display: "flex", gap: 8 }}>
            {canEdit ? (
              <Popconfirm
                title={t("ตรวจแผน PM ตอนนี้?")}
                description={t("สร้างใบสั่งงานให้แผนที่ใกล้ถึง/ถึงกำหนด และแจ้งเตือน (ปกติระบบทำเองทุกชั่วโมง)")}
                okText={t("ตรวจเลย")}
                cancelText={t("ยกเลิก")}
                onConfirm={() => runCheck.mutate(undefined)}
              >
                <Button size="large" icon={<SyncOutlined />} loading={runCheck.isPending}>
                  {t("ตรวจแผนตอนนี้")}
                </Button>
              </Popconfirm>
            ) : null}
            {canAdd ? (
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
                {t("สร้างแผน PM")}
              </Button>
            ) : null}
          </div>
            </>
          }
        />

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={t("กำหนดครั้งถัดไปขยับตอน “ปิดใบสั่งงาน PM” (นับจากวันที่ทำเสร็จจริง / จากรอบผลิตที่ปิดแล้ว) ไม่ใช่ตอนสร้างใบ · แผนที่มีใบ PM ค้างอยู่จะไม่สร้างซ้ำ")}
        />

        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={query.isFetching}
            pagination={{ pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} แผน", { n: total }) }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: t("ยังไม่มีแผน PM — กด สร้างแผน PM") }}
          />
        </div>

        {editing ? (
          <PmScheduleFormModal
            key={editing === "new" ? "new" : editing.id}
            schedule={editing === "new" ? null : editing}
            loading={create.isPending || update.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(body) => {
              if (editing === "new") create.mutate(body, { onSuccess: () => setEditing(null) });
              else update.mutate({ id: editing.id, body }, { onSuccess: () => setEditing(null) });
            }}
          />
        ) : null}
      </section>
    </MasterPageGate>
  );
}
