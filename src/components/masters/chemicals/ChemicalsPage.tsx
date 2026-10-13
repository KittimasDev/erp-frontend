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

/** หน้า /masters/chemicals — ข้อมูลสารเคมี (ผู้ผลิต/CAS/Hazard Class/SDS) + ตารางห้ามเก็บรวม */
export default function ChemicalsPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [hazardFilter, setHazardFilter] = useState<string>();
  const [editing, setEditing] = useState<ChemicalRow | null>(null);

  const query = useChemicalsQuery(applied);
  const hazardsQuery = useHazardClassesQuery();
  const rows = (query.data?.data ?? []).filter((r) => !hazardFilter || r.hazardClassId === hazardFilter);
  const { canEdit } = getScreenActionPermissions("MASTERS_CHEMICALS");

  const columns: ColumnsType<ChemicalRow> = [
    {
      title: "สารเคมี",
      key: "item",
      render: (_v, r) => (
        <div>
          <strong>{r.itemCode}</strong> — {r.itemNameTh}
          {!r.isActive ? <Tag style={{ marginLeft: 6 }}>ปิดใช้งาน</Tag> : null}
        </div>
      ),
    },
    { title: "ผู้ผลิต", key: "manufacturer", width: 180, render: (_v, r) => r.manufacturer ?? "—" },
    { title: "เลข CAS", key: "cas", width: 130, render: (_v, r) => r.casNo ?? "—" },
    {
      title: "Hazard Class",
      key: "hazard",
      width: 160,
      render: (_v, r) =>
        r.hazardClassName ? <Tag color="volcano">{r.hazardClassName}</Tag> : <Tag>ยังไม่กำหนด</Tag>,
    },
    {
      title: "SDS",
      key: "sds",
      width: 110,
      render: (_v, r) =>
        r.sdsCount > 0 ? <Tag color="green">{r.sdsCount} ไฟล์</Tag> : <Tag color="orange">ยังไม่แนบ</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 100,
      render: (_v, r) => (
        <Button size="small" onClick={() => setEditing(r)}>
          {canEdit ? "แก้ไข / SDS" : "ดูข้อมูล"}
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <ExperimentOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>MASTER · CHEMICAL</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              สารเคมี
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              ผู้ผลิต เลข CAS Hazard Class และ Safety Data Sheet ของสินค้าประเภทสารเคมี · ตารางห้ามเก็บรวมใช้เตือนตอนรับของ/โอนย้าย
            </Typography.Text>
          </div>
          <div />
        </div>

        <div className={styles.tableCard}>
          <Tabs
            items={[
              {
                key: "chemicals",
                label: "สารเคมี",
                children: (
                  <>
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      title={"รายการนี้คือสินค้าที่ตั้งประเภทเป็น “สารเคมี”"}
                      description={
                        <span>
                          ต้องการเพิ่มสารเคมีใหม่ → สร้างสินค้าที่ <Link href="/masters/items">สินค้า / วัตถุดิบ</Link>{" "}
                          เลือกประเภทสินค้า &quot;สารเคมี&quot; แล้วกลับมากรอกข้อมูลที่หน้านี้
                        </span>
                      }
                    />
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <Input
                        allowClear
                        style={{ width: 280 }}
                        prefix={<SearchOutlined />}
                        placeholder="ค้นรหัส / ชื่อ / CAS / ผู้ผลิต"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onPressEnter={() => setApplied(keyword)}
                        onBlur={() => setApplied(keyword)}
                      />
                      <Select
                        allowClear
                        style={{ width: 200 }}
                        placeholder="ทุก Hazard Class"
                        value={hazardFilter}
                        onChange={setHazardFilter}
                        options={(hazardsQuery.data?.data ?? []).map((h) => ({ value: h.id, label: h.nameTh }))}
                      />
                    </div>
                    <Table
                      rowKey="itemId"
                      className={styles.dataTable}
                      columns={columns}
                      dataSource={rows}
                      loading={query.isFetching}
                      pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} รายการ` }}
                      scroll={{ x: 900 }}
                      locale={{ emptyText: "ยังไม่มีสินค้าประเภทสารเคมี" }}
                    />
                  </>
                ),
              },
              {
                key: "hazard",
                label: "Hazard Class / ห้ามเก็บรวม",
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
