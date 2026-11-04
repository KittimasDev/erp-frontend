"use client";

import { useState } from "react";
import { Button, Input, Select, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ClearOutlined, PlusOutlined, SearchOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";

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
import { useEquipmentTypesQuery } from "@/hooks/equipment-types/useEquipmentTypes";
import EquipmentFormModal from "./EquipmentFormModal";
import EquipmentHistoryDrawer from "./EquipmentHistoryDrawer";
import { fmtDate } from "./maintenance-format";
import PageHeader from "@/components/common/PageHeader";

const STATUS_COLOR: Record<string, string> = { ACTIVE: "green", UNDER_MAINTENANCE: "orange", RETIRED: "default" };

/** หน้า /maintenance/equipment — ข้อมูลเครื่องจักร + แจ้งเสีย + ประวัติ + สรุป Downtime */
export default function EquipmentPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [equipmentTypeId, setEquipmentTypeId] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [editing, setEditing] = useState<Equipment | "new" | null>(null);
  const [historyOf, setHistoryOf] = useState<Equipment | null>(null);
  const [breakdownFor, setBreakdownFor] = useState<string | "any" | null>(null);

  const typesQuery = useEquipmentTypesQuery();
  const allQuery = useEquipmentQuery({});
  const query = useEquipmentQuery({ q: applied, equipmentTypeId, status });
  const create = useCreateEquipmentMutation();
  const update = useUpdateEquipmentMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("EQUIPMENT");

  const rows = query.data?.data ?? [];

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
            {[
              e.equipmentTypeName ?? e.category,
              e.capacity != null ? `${e.capacity.toLocaleString("th-TH")} ${e.capacityUnitLabel ?? ""}/ชม.` : null,
              e.manufacturer,
              e.model,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
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
        <PageHeader
          eyebrow="MAINTENANCE · EQUIPMENT"
          icon={<ToolOutlined />}
          title="เครื่องจักร / อุปกรณ์"
          subtitle="ข้อมูลเครื่อง หมวด Serial ประกัน · แจ้งเสีย · ประวัติซ่อมบำรุง · สรุป Downtime"
          actions={
            <>
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
            </>
          }
        />

        <div className={styles.tableCard}>
          <Tabs
            tabBarStyle={{ padding: "0 20px", marginBottom: 0 }}
            items={[
              {
                key: "list",
                label: "เครื่องจักร",
                children: (
                  <>
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
                        <Input
                          allowClear
                          style={{ width: 280 }}
                          prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                          placeholder="ค้นหารหัส / ชื่อ / Serial / หมวด..."
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                          onPressEnter={() => setApplied(keyword)}
                          onBlur={() => setApplied(keyword)}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                            ประเภท:
                          </span>
                          <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="ทุกประเภท"
                            style={{ width: 180 }}
                            value={equipmentTypeId}
                            onChange={setEquipmentTypeId}
                            options={(typesQuery.data ?? []).map((t) => ({ value: t.id, label: t.nameTh }))}
                          />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500, whiteSpace: "nowrap" }}>
                            สถานะ:
                          </span>
                          <Select
                            allowClear
                            placeholder="ทุกสถานะ"
                            style={{ width: 150 }}
                            value={status}
                            onChange={setStatus}
                            options={Object.entries(EQUIPMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                          />
                        </div>
                        {(keyword || applied || equipmentTypeId || status) && (
                          <Button
                            type="text"
                            icon={<ClearOutlined />}
                            onClick={() => {
                              setKeyword("");
                              setApplied("");
                              setEquipmentTypeId(undefined);
                              setStatus(undefined);
                            }}
                            style={{ color: "#64748b" }}
                          >
                            ล้างตัวกรอง
                          </Button>
                        )}
                      </div>

                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        แสดง <strong style={{ color: "#1e293b" }}>{rows.length}</strong> จาก {allQuery.data?.data?.length ?? rows.length} เครื่อง
                      </div>
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
              {
                key: "downtime",
                label: "สรุป Downtime",
                children: (
                  <div style={{ padding: 20 }}>
                    <DowntimeSummaryTab />
                  </div>
                ),
              },
            ]}
          />
        </div>

        {editing ? (
          <EquipmentFormModal
            key={editing === "new" ? "new" : editing.id}
            equipment={editing === "new" ? null : editing}
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
