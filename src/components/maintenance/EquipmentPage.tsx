"use client";

import { useState } from "react";
import { Button, Input, Select, Table, Tabs, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateEquipmentMutation,
  useEquipmentQuery,
  useUpdateEquipmentMutation,
} from "@/hooks/maintenance/useMaintenance";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { formatNumber } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import { EQUIPMENT_STATUS_LABEL, type Equipment } from "@/types/maintenance";
import styles from "@/components/masters/shared/master-page.module.css";

import BreakdownModal from "./BreakdownModal";
import DowntimeSummaryTab from "./DowntimeSummaryTab";
import { useEquipmentTypesQuery } from "@/hooks/equipment-types/useEquipmentTypes";
import EquipmentFormModal from "./EquipmentFormModal";
import EquipmentHistoryDrawer from "./EquipmentHistoryDrawer";
import { equipmentStatusLabel, fmtDate } from "./maintenance-format";
import PageHeader from "@/components/common/PageHeader";
import FilterCard, { FilterField } from "@/components/common/FilterCard";

type EquipmentFilters = { keyword: string; equipmentTypeId?: string; status?: string };
const EMPTY_FILTERS: EquipmentFilters = { keyword: "" };

const STATUS_COLOR: Record<string, string> = { ACTIVE: "green", UNDER_MAINTENANCE: "orange", RETIRED: "default" };

/** หน้า /maintenance/equipment — ข้อมูลเครื่องจักร + แจ้งเสีย + ประวัติ + สรุป Downtime */
export default function EquipmentPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("list");
  const [draft, setDraft] = useState<EquipmentFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<EquipmentFilters>(EMPTY_FILTERS);
  const [editing, setEditing] = useState<Equipment | "new" | null>(null);
  const [historyOf, setHistoryOf] = useState<Equipment | null>(null);
  const [breakdownFor, setBreakdownFor] = useState<string | "any" | null>(null);

  const typesQuery = useEquipmentTypesQuery();
  const allQuery = useEquipmentQuery({});
  const query = useEquipmentQuery({ q: applied.keyword, equipmentTypeId: applied.equipmentTypeId, status: applied.status });
  const create = useCreateEquipmentMutation();
  const update = useUpdateEquipmentMutation();
  const { canAdd, canEdit } = getScreenActionPermissions("EQUIPMENT");

  const rows = query.data?.data ?? [];

  const applyFilters = () => {
    setApplied(draft);
    setPage(1);
  };
  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const columns: ColumnsType<Equipment> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("เครื่องจักร"),
      key: "name",
      render: (_v, e) => (
        <div>
          <strong>{e.equipmentCode}</strong> — {e.name}
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[
              e.equipmentTypeName ?? e.category,
              e.capacity != null ? `${formatNumber(e.capacity, lang)} ${e.capacityUnitLabel ?? ""}/${t("ชม.")}` : null,
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
    { title: t("ตำแหน่ง"), key: "loc", width: 110, render: (_v, e) => e.locationCode ?? "—" },
    {
      title: t("ประกัน"),
      key: "warranty",
      width: 160,
      render: (_v, e) =>
        e.warrantyExpiryDate ? (
          <Tag color={e.underWarranty ? "green" : "default"}>
            {e.underWarranty ? t("ในประกัน") : t("หมดประกัน")} · {fmtDate(e.warrantyExpiryDate)}
          </Tag>
        ) : (
          "—"
        ),
    },
    { title: t("ชม.เดินเครื่อง"), key: "rh", width: 120, align: "right", render: (_v, e) => e.runningHours ?? "—" },
    {
      title: t("สถานะ"),
      key: "status",
      width: 110,
      render: (_v, e) => <Tag color={STATUS_COLOR[e.status]}>{equipmentStatusLabel(e.status, lang)}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 260,
      render: (_v, e) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="small" onClick={() => setHistoryOf(e)}>{t("ประวัติ")}</Button>
          {e.status !== "RETIRED" ? (
            <Button size="small" danger icon={<WarningOutlined />} onClick={() => setBreakdownFor(e.id)}>{t("แจ้งเสีย")}</Button>
          ) : null}
          {canEdit ? <Button size="small" onClick={() => setEditing(e)}>{t("แก้ไข")}</Button> : null}
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
          title={t("เครื่องจักร / อุปกรณ์")}
          subtitle={t("ข้อมูลเครื่อง หมวด Serial ประกัน · แจ้งเสีย · ประวัติซ่อมบำรุง · สรุป Downtime")}
          actions={
            <>
<div style={{ display: "flex", gap: 8 }}>
            <Button size="large" danger icon={<WarningOutlined />} onClick={() => setBreakdownFor("any")}>
              {t("แจ้งเสีย")}
            </Button>
            {canAdd ? (
              <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => setEditing("new")}>
                {t("เพิ่มเครื่องจักร")}
              </Button>
            ) : null}
          </div>
            </>
          }
        />

        {activeTab === "list" ? (
          <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={query.isFetching}>
            <FilterField label={t("ค้นหา")}>
              <Input
                allowClear
                style={{ width: "100%" }}
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                placeholder={t("ค้นหารหัส / ชื่อ / Serial / หมวด...")}
                value={draft.keyword}
                onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
              />
            </FilterField>
            <FilterField label={t("ประเภท")}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t("ทุกประเภท")}
                style={{ width: "100%" }}
                value={draft.equipmentTypeId}
                onChange={(v) => setDraft((d) => ({ ...d, equipmentTypeId: v }))}
                options={(typesQuery.data ?? []).map((ty) => ({ value: ty.id, label: ty.nameTh }))}
              />
            </FilterField>
            <FilterField label={t("สถานะ")}>
              <Select
                allowClear
                placeholder={t("ทุกสถานะ")}
                style={{ width: "100%" }}
                value={draft.status}
                onChange={(v) => setDraft((d) => ({ ...d, status: v }))}
                options={Object.entries(EQUIPMENT_STATUS_LABEL).map(([value]) => ({ value, label: equipmentStatusLabel(value, lang) }))}
              />
            </FilterField>
          </FilterCard>
        ) : null}

        <div className={styles.tableCard}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            tabBarStyle={{ padding: "0 20px", marginBottom: 0 }}
            items={[
              {
                key: "list",
                label: t("เครื่องจักร"),
                children: (
                  <>
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f2f5", background: "#fafbfc", textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        {t("แสดง")} <strong style={{ color: "#1e293b" }}>{rows.length}</strong> {t("จาก {n} เครื่อง", { n: allQuery.data?.data?.length ?? rows.length })}
                      </div>
                    </div>
                    <Table
                      rowKey="id"
                      className={styles.dataTable}
                      columns={columns}
                      dataSource={rows}
                      loading={query.isFetching}
                      pagination={{ current: page, onChange: setPage, pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} เครื่อง", { n: total }) }}
                      scroll={{ x: 1000 }}
                      locale={{ emptyText: t("ยังไม่มีข้อมูลเครื่องจักร") }}
                    />
                  </>
                ),
              },
              {
                key: "downtime",
                label: t("สรุป Downtime"),
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
