"use client";

import { useMemo, useState } from "react";
import { Button, Input, Select, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateEquipmentMutation,
  useEquipmentQuery,
  useUpdateEquipmentMutation,
} from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { EQUIPMENT_STATUS_LABEL, type Equipment } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import BreakdownModal from "./BreakdownModal";
import DowntimeSummaryTab from "./DowntimeSummaryTab";
import EquipmentFormModal from "./EquipmentFormModal";
import EquipmentHistoryDrawer from "./EquipmentHistoryDrawer";
import { fmtDate } from "./maintenance-format";

const STATUS_COLOR: Record<string, string> = { ACTIVE: "green", UNDER_MAINTENANCE: "orange", RETIRED: "default" };

/** หน้า /maintenance/equipment — ข้อมูลเครื่องจักร + แจ้งเสีย + ประวัติ + สรุป Downtime */
export default function EquipmentPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [category, setCategory] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [editing, setEditing] = useState<Equipment | "new" | null>(null);
  const [historyOf, setHistoryOf] = useState<Equipment | null>(null);
  const [breakdownFor, setBreakdownFor] = useState<string | "any" | null>(null);

  const query = useEquipmentQuery({ q: applied, category, status });
  const allQuery = useEquipmentQuery({});
  const create = useCreateEquipmentMutation();
  const update = useUpdateEquipmentMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("EQUIPMENT");

  const rows = query.data?.data ?? [];
  const categories = useMemo(
    () => [...new Set((allQuery.data?.data ?? []).map((e) => e.category).filter((c): c is string => Boolean(c)))].sort(),
    [allQuery.data],
  );

  const columns: ColumnsType<Equipment> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: "เครื่องจักร",
      key: "name",
      render: (_v, e) => (
        <div>
          <strong>{e.equipmentCode}</strong> — {e.name}
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[e.category, e.manufacturer, e.model].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    { title: "Serial", key: "sn", width: 140, render: (_v, e) => e.serialNumber ?? "—" },
    { title: "ตำแหน่ง", key: "loc", width: 110, render: (_v, e) => e.locationCode ?? "—" },
    {
      title: "ประกัน",
      key: "warranty",
      width: 160,
      render: (_v, e) =>
        e.warrantyExpiryDate ? (
          <Tag color={e.underWarranty ? "green" : "default"}>
            {e.underWarranty ? "ในประกัน" : "หมดประกัน"} · {fmtDate(e.warrantyExpiryDate)}
          </Tag>
        ) : (
          "—"
        ),
    },
    { title: "ชม.เดินเครื่อง", key: "rh", width: 120, align: "right", render: (_v, e) => e.runningHours ?? "—" },
    {
      title: "สถานะ",
      key: "status",
      width: 110,
      render: (_v, e) => <Tag color={STATUS_COLOR[e.status]}>{EQUIPMENT_STATUS_LABEL[e.status] ?? e.status}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 260,
      render: (_v, e) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="small" onClick={() => setHistoryOf(e)}>ประวัติ</Button>
          {e.status !== "RETIRED" ? (
            <Button size="small" danger icon={<WarningOutlined />} onClick={() => setBreakdownFor(e.id)}>แจ้งเสีย</Button>
          ) : null}
          {canEdit ? <Button size="small" onClick={() => setEditing(e)}>แก้ไข</Button> : null}
        </div>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <ToolOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>MAINTENANCE · EQUIPMENT</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              เครื่องจักร / อุปกรณ์
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              ข้อมูลเครื่อง หมวด Serial ประกัน · แจ้งเสีย · ประวัติซ่อมบำรุง · สรุป Downtime
            </Typography.Text>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="large" danger icon={<WarningOutlined />} onClick={() => setBreakdownFor("any")}>
              แจ้งเสีย
            </Button>
            {canAdd ? (
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
                เพิ่มเครื่องจักร
              </Button>
            ) : null}
          </div>
        </div>

        <div className={styles.tableCard}>
          <Tabs
            items={[
              {
                key: "list",
                label: "เครื่องจักร",
                children: (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <Input
                        allowClear
                        style={{ width: 260 }}
                        prefix={<SearchOutlined />}
                        placeholder="ค้นรหัส / ชื่อ / Serial / หมวด"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onPressEnter={() => setApplied(keyword)}
                        onBlur={() => setApplied(keyword)}
                      />
                      <Select allowClear placeholder="ทุกหมวด" style={{ width: 160 }} value={category} onChange={setCategory} options={categories.map((c) => ({ value: c, label: c }))} />
                      <Select
                        allowClear
                        placeholder="ทุกสถานะ"
                        style={{ width: 150 }}
                        value={status}
                        onChange={setStatus}
                        options={Object.entries(EQUIPMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                      />
                    </div>
                    <Table
                      rowKey="id"
                      className={styles.dataTable}
                      columns={columns}
                      dataSource={rows}
                      loading={query.isFetching}
                      pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} เครื่อง` }}
                      scroll={{ x: 1000 }}
                      locale={{ emptyText: "ยังไม่มีข้อมูลเครื่องจักร" }}
                    />
                  </>
                ),
              },
              { key: "downtime", label: "สรุป Downtime", children: <DowntimeSummaryTab /> },
            ]}
          />
        </div>

        {editing ? (
          <EquipmentFormModal
            key={editing === "new" ? "new" : editing.id}
            equipment={editing === "new" ? null : editing}
            categories={categories}
            loading={create.isPending || update.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={(body) => {
              if (editing === "new") {
                create.mutate(body, { onSuccess: () => setEditing(null) });
              } else {
                update.mutate({ id: editing.id, body }, { onSuccess: () => setEditing(null) });
              }
            }}
          />
        ) : null}
        <EquipmentHistoryDrawer key={historyOf?.id ?? "none"} equipment={historyOf} onClose={() => setHistoryOf(null)} />
        {breakdownFor ? (
          <BreakdownModal equipmentId={breakdownFor === "any" ? undefined : breakdownFor} onClose={() => setBreakdownFor(null)} />
        ) : null}
      </section>
    </MasterPageGate>
  );
}
