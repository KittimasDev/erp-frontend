"use client";

import { useState } from "react";
import { Button, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FileTextOutlined, PlusOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useWorkOrdersQuery } from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { PRIORITY_OPTIONS, type WorkOrder } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import BreakdownModal from "./BreakdownModal";
import { fmtDate, fmtMoney, woStatusLabel } from "./maintenance-format";
import WorkOrderDetailDrawer from "./WorkOrderDetailDrawer";
import { CreateWorkOrderModal } from "./WorkOrderModals";
import PageHeader from "@/components/common/PageHeader";
import FilterCard, { FilterField } from "@/components/common/FilterCard";

type WorkOrderFilters = { status: string; type?: string; priority?: string; keyword: string };
const DEFAULT_FILTERS: WorkOrderFilters = { status: "ACTIVE", keyword: "" };

const STATUS_COLOR: Record<string, string> = { DRAFT: "default", OPEN: "blue", IN_PROGRESS: "orange", COMPLETED: "green", CANCELLED: "default" };
const PRIORITY_COLOR: Record<string, string> = { LOW: "default", NORMAL: "blue", HIGH: "orange", CRITICAL: "red" };

/** หน้า /maintenance/work-orders — ใบสั่งงานซ่อมบำรุง (PM/CM) · แจ้งเสีย · มอบหมายช่าง · เริ่ม/ปิดงาน · อะไหล่ */
export default function WorkOrdersPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<WorkOrderFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<WorkOrderFilters>(DEFAULT_FILTERS);
  const [creating, setCreating] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();

  const query = useWorkOrdersQuery({ type: applied.type, priority: applied.priority, workOrderNo: applied.keyword });
  const { canAdd } = getScreenActionPermissions("WORK_ORDERS");
  const all = query.data?.data ?? [];
  const rows = all.filter((w) =>
    applied.status === "ACTIVE"
      ? ["DRAFT", "OPEN", "IN_PROGRESS"].includes(w.status)
      : applied.status === "ALL"
        ? true
        : w.status === applied.status,
  );

  const applyFilters = () => {
    setApplied(draft);
    setPage(1);
  };
  const clearFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
  };

  const columns: ColumnsType<WorkOrder> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("ใบสั่งงาน"),
      key: "no",
      width: 160,
      render: (_v, w) => (
        <button
          type="button"
          onClick={() => setSelectedId(w.id)}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
        >
          {w.workOrderNo}
        </button>
      ),
    },
    { title: t("ประเภท"), dataIndex: "type", width: 70, render: (ty: string) => <Tag color={ty === "PM" ? "blue" : "volcano"}>{ty}</Tag> },
    {
      title: t("เครื่อง / งาน"),
      key: "eq",
      render: (_v, w) => (
        <div>
          <strong>{w.equipmentCode}</strong> {w.equipmentName}
          <div style={{ fontSize: 12, color: "#8a94a6", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.description}</div>
        </div>
      ),
    },
    { title: t("เร่งด่วน"), key: "pr", width: 90, render: (_v, w) => <Tag color={PRIORITY_COLOR[w.priority]}>{t(PRIORITY_OPTIONS.find((p) => p.value === w.priority)?.label ?? w.priority)}</Tag> },
    { title: t("ช่าง"), key: "tech", width: 170, render: (_v, w) => w.technicians.map((tech) => tech.displayName).filter(Boolean).join(", ") || "—" },
    { title: t("วางแผน"), key: "plan", width: 110, render: (_v, w) => fmtDate(w.plannedDate) },
    { title: t("ต้นทุนอะไหล่"), key: "cost", width: 110, align: "right", render: (_v, w) => (w.partsCost ? fmtMoney(w.partsCost) : "—") },
    { title: t("สถานะ"), key: "st", width: 110, render: (_v, w) => <Tag color={STATUS_COLOR[w.status]}>{woStatusLabel(w.status, lang)}</Tag> },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MAINTENANCE · WORK ORDER"
          icon={<FileTextOutlined />}
          title={t("ใบสั่งงานซ่อมบำรุง")}
          subtitle={t("PM / CM · แจ้งเสีย · มอบหมายช่าง · เริ่มและปิดงาน · วิเคราะห์สาเหตุ · เบิก/คืนอะไหล่และต้นทุน")}
          actions={
            <>
<div style={{ display: "flex", gap: 8 }}>
            <Button size="large" danger icon={<WarningOutlined />} onClick={() => setBreakdown(true)}>
              {t("แจ้งเสีย")}
            </Button>
            {canAdd ? (
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
                {t("สร้างใบสั่งงาน")}
              </Button>
            ) : null}
          </div>
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={query.isFetching}>
          <FilterField label={t("สถานะ")}>
            <Select
              style={{ width: "100%" }}
              value={draft.status}
              onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
              options={[
                { value: "ACTIVE", label: t("ที่ยังไม่ปิด") },
                { value: "COMPLETED", label: lang === "en" ? "Completed" : "เสร็จแล้ว" },
                { value: "CANCELLED", label: woStatusLabel("CANCELLED", lang) },
                { value: "ALL", label: t("ทั้งหมด") },
              ]}
            />
          </FilterField>
          <FilterField label={t("ประเภท")}>
            <Select
              allowClear
              placeholder={t("ทุกประเภท")}
              style={{ width: "100%" }}
              value={draft.type}
              onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
              options={[
                { value: "PM", label: t("PM (บำรุงรักษา)") },
                { value: "CM", label: t("CM (ซ่อมแซม)") },
              ]}
            />
          </FilterField>
          <FilterField label={t("ความเร่งด่วน")}>
            <Select
              allowClear
              placeholder={t("ทุกระดับ")}
              style={{ width: "100%" }}
              value={draft.priority}
              onChange={(v) => setDraft((d) => ({ ...d, priority: v }))}
              options={PRIORITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            />
          </FilterField>
          <FilterField label={t("ค้นหา")}>
            <Input
              allowClear
              style={{ width: "100%" }}
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              placeholder={t("ค้นหาเลขที่ใบสั่งงาน...")}
              value={draft.keyword}
              onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.tableCard}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f2f5", background: "#fafbfc", textAlign: "right" }}>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {t("แสดง")} <strong style={{ color: "#1e293b" }}>{rows.length}</strong> {t("จาก {n} ใบ", { n: all.length })}
            </div>
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={query.isFetching}
            pagination={{ current: page, onChange: setPage, pageSize: 20, showTotal: (total) => lang === "en" ? `${total} work orders in total` : `ทั้งหมด ${total} ใบ` }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: t("ไม่มีใบสั่งงานตามเงื่อนไข") }}
          />
        </div>

        {creating ? <CreateWorkOrderModal onClose={() => setCreating(false)} /> : null}
        {breakdown ? <BreakdownModal onClose={() => setBreakdown(false)} /> : null}
        <WorkOrderDetailDrawer key={selectedId ?? "none"} workOrderId={selectedId} onClose={() => setSelectedId(undefined)} />
      </section>
    </MasterPageGate>
  );
}
