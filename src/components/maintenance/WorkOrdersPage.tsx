"use client";

import { useState } from "react";
import { Button, Input, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClearOutlined, FileTextOutlined, PlusOutlined, SearchOutlined, WarningOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useWorkOrdersQuery } from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { PRIORITY_OPTIONS, WORK_ORDER_STATUS_LABEL, type WorkOrder } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import BreakdownModal from "./BreakdownModal";
import { fmtDate, fmtMoney } from "./maintenance-format";
import WorkOrderDetailDrawer from "./WorkOrderDetailDrawer";
import { CreateWorkOrderModal } from "./WorkOrderModals";

const STATUS_COLOR: Record<string, string> = { DRAFT: "default", OPEN: "blue", IN_PROGRESS: "orange", COMPLETED: "green", CANCELLED: "default" };
const PRIORITY_COLOR: Record<string, string> = { LOW: "default", NORMAL: "blue", HIGH: "orange", CRITICAL: "red" };

/** หน้า /maintenance/work-orders — ใบสั่งงานซ่อมบำรุง (PM/CM) · แจ้งเสีย · มอบหมายช่าง · เริ่ม/ปิดงาน · อะไหล่ */
export default function WorkOrdersPage() {
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
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: "ใบสั่งงาน",
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
    { title: "ประเภท", dataIndex: "type", width: 70, render: (t: string) => <Tag color={t === "PM" ? "blue" : "volcano"}>{t}</Tag> },
    {
      title: "เครื่อง / งาน",
      key: "eq",
      render: (_v, w) => (
        <div>
          <strong>{w.equipmentCode}</strong> {w.equipmentName}
          <div style={{ fontSize: 12, color: "#8a94a6", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.description}</div>
        </div>
      ),
    },
    { title: "เร่งด่วน", key: "pr", width: 90, render: (_v, w) => <Tag color={PRIORITY_COLOR[w.priority]}>{PRIORITY_OPTIONS.find((p) => p.value === w.priority)?.label ?? w.priority}</Tag> },
    { title: "ช่าง", key: "tech", width: 170, render: (_v, w) => w.technicians.map((t) => t.displayName).filter(Boolean).join(", ") || "—" },
    { title: "วางแผน", key: "plan", width: 110, render: (_v, w) => fmtDate(w.plannedDate) },
    { title: "ต้นทุนอะไหล่", key: "cost", width: 110, align: "right", render: (_v, w) => (w.partsCost ? fmtMoney(w.partsCost) : "—") },
    { title: "สถานะ", key: "st", width: 110, render: (_v, w) => <Tag color={STATUS_COLOR[w.status]}>{WORK_ORDER_STATUS_LABEL[w.status] ?? w.status}</Tag> },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <FileTextOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>MAINTENANCE · WORK ORDER</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              ใบสั่งงานซ่อมบำรุง
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              PM / CM · แจ้งเสีย · มอบหมายช่าง · เริ่มและปิดงาน · วิเคราะห์สาเหตุ · เบิก/คืนอะไหล่และต้นทุน
            </Typography.Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="large" danger icon={<WarningOutlined />} onClick={() => setBreakdown(true)}>
              แจ้งเสีย
            </Button>
            {canAdd ? (
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
                สร้างใบสั่งงาน
              </Button>
            ) : null}
          </div>
        </div>

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
                  สถานะ:
                </span>
                <Select
                  style={{ width: 140 }}
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ACTIVE", label: "ที่ยังไม่ปิด" },
                    { value: "COMPLETED", label: "เสร็จแล้ว" },
                    { value: "CANCELLED", label: "ยกเลิก" },
                    { value: "ALL", label: "ทั้งหมด" },
                  ]}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                  ประเภท:
                </span>
                <Select
                  allowClear
                  placeholder="ทุกประเภท"
                  style={{ width: 145 }}
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "PM", label: "PM (บำรุงรักษา)" },
                    { value: "CM", label: "CM (ซ่อมแซม)" },
                  ]}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                  ความเร่งด่วน:
                </span>
                <Select
                  allowClear
                  placeholder="ทุกระดับ"
                  style={{ width: 130 }}
                  value={priority}
                  onChange={setPriority}
                  options={[...PRIORITY_OPTIONS]}
                />
              </div>

              <Input
                allowClear
                style={{ width: 220 }}
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder="ค้นหาเลขที่ใบสั่งงาน..."
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
                  ล้างตัวกรอง
                </Button>
              )}
            </div>

            <div style={{ fontSize: 13, color: "#64748b" }}>
              แสดง <strong style={{ color: "#1e293b" }}>{rows.length}</strong> จาก {all.length} ใบ
            </div>
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={query.isFetching}
            pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} ใบ` }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: "ไม่มีใบสั่งงานตามเงื่อนไข" }}
          />
        </div>

        {creating ? <CreateWorkOrderModal onClose={() => setCreating(false)} /> : null}
        {breakdown ? <BreakdownModal onClose={() => setBreakdown(false)} /> : null}
        <WorkOrderDetailDrawer key={selectedId ?? "none"} workOrderId={selectedId} onClose={() => setSelectedId(undefined)} />
      </section>
    </MasterPageGate>
  );
}
