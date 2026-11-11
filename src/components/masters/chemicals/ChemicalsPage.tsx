"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Input, Select, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, SearchOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";

import MasterPageGate from "@/components/common/MasterPageGate";
import { chemicalsKey, useChemicalsQuery, useHazardClassesQuery } from "@/hooks/chemicals/useChemicals";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import type { ChemicalRow } from "@/types/chemicals";
import styles from "@/components/masters/shared/master-page.module.css";

import ChemicalProfileModal from "./ChemicalProfileModal";
import HazardMatrixTab from "./HazardMatrixTab";
import FilterCard, { FilterField } from "@/components/common/FilterCard";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

/** หน้า /masters/chemicals — ข้อมูลสารเคมี (ผู้ผลิต/CAS/Hazard Class/SDS) + ตารางห้ามเก็บรวม */
export default function ChemicalsPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [hazardDraft, setHazardDraft] = useState<string>();
  const [applied, setApplied] = useState("");
  const [hazardFilter, setHazardFilter] = useState<string>();
  const [editing, setEditing] = useState<ChemicalRow | null>(null);

  const query = useChemicalsQuery(applied);
  const hazardsQuery = useHazardClassesQuery();
  const rows = (query.data?.data ?? []).filter((r) => !hazardFilter || r.hazardClassId === hazardFilter);
  const { canEdit } = getScreenActionPermissions("MASTERS_CHEMICALS");

  const applyFilters = () => {
    setApplied(keyword);
    setHazardFilter(hazardDraft);
    setPage(1);
  };
  const clearFilters = () => {
    setKeyword("");
    setHazardDraft(undefined);
    setApplied("");
    setHazardFilter(undefined);
    setPage(1);
  };

  const columns: ColumnsType<ChemicalRow> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("สารเคมี"),
      key: "item",
      render: (_v, r) => (
        <div>
          <strong>{r.itemCode}</strong> — {r.itemNameTh}
          {!r.isActive ? <Tag style={{ marginLeft: 6 }}>{t("ปิดใช้งาน")}</Tag> : null}
        </div>
      ),
    },
    { title: t("ผู้ผลิต"), key: "manufacturer", width: 180, render: (_v, r) => r.manufacturer ?? "—" },
    { title: t("เลข CAS"), key: "cas", width: 130, render: (_v, r) => r.casNo ?? "—" },
    {
      title: "Hazard Class",
      key: "hazard",
      width: 160,
      render: (_v, r) =>
        r.hazardClassName ? <Tag color="volcano">{r.hazardClassName}</Tag> : <Tag>{t("ยังไม่กำหนด")}</Tag>,
    },
    {
      title: "SDS",
      key: "sds",
      width: 110,
      render: (_v, r) =>
        r.sdsCount > 0 ? <Tag color="green">{t("{n} ไฟล์", { n: r.sdsCount })}</Tag> : <Tag color="orange">{t("ยังไม่แนบ")}</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_v, r) => (
        <Button size="small" onClick={() => setEditing(r)}>
          {canEdit ? t("แก้ไข / SDS") : t("ดูข้อมูล")}
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="MASTER · CHEMICAL"
          icon={<ExperimentOutlined />}
          title={t("สารเคมี")}
          subtitle={t("ผู้ผลิต เลข CAS Hazard Class และ Safety Data Sheet ของสินค้าประเภทสารเคมี · ตารางห้ามเก็บรวมใช้เตือนตอนรับของ/โอนย้าย")}
        />

        <div className={styles.tableCard}>
          <Tabs
            items={[
              {
                key: "chemicals",
                label: t("สารเคมี"),
                children: (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      title={t("รายการนี้คือสินค้าที่ตั้งประเภทเป็น “สารเคมี”")}
                      description={
                        <span>
                          {t("ต้องการเพิ่มสารเคมีใหม่ → สร้างสินค้าที่")} <Link href="/masters/items">{t("สินค้า / วัตถุดิบ")}</Link>{" "}
                          {t("เลือกประเภทสินค้า \"สารเคมี\" แล้วกลับมากรอกข้อมูลที่หน้านี้")}
                        </span>
                      }
                    />
                    <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={query.isFetching}>
                      <FilterField label={t("ค้นรหัส / ชื่อ / CAS / ผู้ผลิต")}>
                        <Input
                          allowClear
                          style={{ width: "100%" }}
                          prefix={<SearchOutlined />}
                          placeholder={t("ค้นรหัส / ชื่อ / CAS / ผู้ผลิต")}
                          value={keyword}
                          onChange={(e) => setKeyword(e.target.value)}
                        />
                      </FilterField>
                      <FilterField label="Hazard Class">
                        <Select
                          allowClear
                          style={{ width: "100%" }}
                          placeholder={t("ทุก Hazard Class")}
                          value={hazardDraft}
                          onChange={setHazardDraft}
                          options={(hazardsQuery.data?.data ?? []).map((h) => ({ value: h.id, label: h.nameTh }))}
                        />
                      </FilterField>
                    </FilterCard>
                    <Table
                      rowKey="itemId"
                      className={styles.dataTable}
                      columns={columns}
                      dataSource={rows}
                      loading={query.isFetching}
                      pagination={{ current: page, onChange: setPage, pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} รายการ", { n: total }) }}
                      scroll={{ x: 900 }}
                      locale={{ emptyText: t("ยังไม่มีสินค้าประเภทสารเคมี") }}
                    />
                  </>
                ),
              },
              {
                key: "hazard",
                label: t("Hazard Class / ห้ามเก็บรวม"),
                children: <HazardMatrixTab canEdit={canEdit} />,
              },
            ]}
          />
        </div>

        <ChemicalProfileModal
          key={editing?.itemId ?? "none"}
          chemical={editing}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
          onSdsChanged={() => void queryClient.invalidateQueries({ queryKey: chemicalsKey })}
        />
      </section>
    </MasterPageGate>
  );
}
