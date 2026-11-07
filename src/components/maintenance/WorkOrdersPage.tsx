"use client";

import { useState } from "react";
import { Button, Input, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClearOutlined, FileTextOutlined, PlusOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";

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

const STATUS_COLOR: Record<string, string> = { DRAFT: "default", OPEN: "blue", IN_PROGRESS: "orange", COMPLETED: "green", CANCELLED: "default" };
const PRIORITY_COLOR: Record<string, string> = { LOW: "default", NORMAL: "blue", HIGH: "orange", CRITICAL: "red" };

/** หน้า /maintenance/work-orders — ใบสั่งงานซ่อมบำรุง (PM/CM) · แจ้งเสีย · มอบหมายช่าง · เริ่ม/ปิดงาน · อะไหล่ */
export default function WorkOrdersPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("ACTIVE");
  const [type, setType] = useState<string>();
  const [priority, setPriority] = useState<string>();
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [creating, setCreating] = useState(false);
  const [breakdown, setBreakdown] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();

  const query = useWorkOrdersQuery({ type, priority, workOrderNo: applied });
  const { canAdd } = getScreenActionPermissions("WORK_ORDERS");
  const all = query.data?.data ?? [];
  const rows = all.filter((w) =>
    status === "ACTIVE" ? ["DRAFT", "OPEN", "IN_PROGRESS"].includes(w.status) : status === "ALL" ? true : w.status === status,
  );

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

        <div className={styles.tableCard}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #f0f2f5",
              background: "#fafbfc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {t("สถานะ")}:
                </span>
                <Select
                  style={{ width: 140 }}
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ACTIVE", label: t("ที่ยังไม่ปิด") },
                    { value: "COMPLETED", label: lang === "en" ? "Completed" : "เสร็จแล้ว" },
                    { value: "CANCELLED", label: woStatusLabel("CANCELLED", lang) },
                    { value: "ALL", label: t("ทั้งหมด") },
                  ]}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {t("ประเภท")}:
                </span>
                <Select
                  allowClear
                  placeholder={t("ทุกประเภท")}
                  style={{ width: 145 }}
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "PM", label: t("PM (บำรุงรักษา)") },
                    { value: "CM", label: t("CM (ซ่อมแซม)") },
                  ]}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {t("ความเร่งด่วน")}:
                </span>
                <Select
                  allowClear
                  placeholder={t("ทุกระดับ")}
                  style={{ width: 130 }}
                  value={priority}
                  onChange={setPriority}
                  options={PRIORITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
                />
              </div>

              <Input
                allowClear
                style={{ width: 220 }}
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder={t("ค้นหาเลขที่ใบสั่งงาน...")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={() => setApplied(keyword)}
                onBlur={() => setApplied(keyword)}
              />

              {(status !== "ACTIVE" || type || priority || keyword || applied) && (
                <Button
                  type="text"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setStatus("ACTIVE");
                    setType(undefined);
                    setPriority(undefined);
                    setKeyword("");
                    setApplied("");
                  }}
                  style={{ color: "#64748b" }}
                >
                  {t("ล้างตัวกรอง")}
                </Button>
              )}
            </div>

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
            pagination={{ pageSize: 20, showTotal: (total) => lang === "en" ? `${total} work orders in total` : `ทั้งหมด ${total} ใบ` }}
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
