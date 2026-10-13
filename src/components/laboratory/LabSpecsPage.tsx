"use client";

import { useState } from "react";
import { Button, Popconfirm, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, PlusOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateLabSpecMutation,
  useDeleteLabSpecMutation,
  useLabSpecsQuery,
  useUpdateLabSpecMutation,
} from "@/hooks/laboratory/useLabSpecs";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { LAB_SAMPLE_TYPE_LABEL, type LabSpec } from "@/types/laboratory";
import styles from "@/components/masters/shared/master-page.module.css";

import LabSpecFormModal from "./LabSpecFormModal";

/** หน้า /laboratory/specs — Spec การตรวจ (พารามิเตอร์ + เกณฑ์ min/max) ตามประเภทตัวอย่าง/สินค้า (M8.3) */
export default function LabSpecsPage() {
  const query = useLabSpecsQuery();
  const create = useCreateLabSpecMutation();
  const update = useUpdateLabSpecMutation();
  const remove = useDeleteLabSpecMutation();
  const { canAdd, canEdit, canDelete } =
    getScreenActionPermissions("LAB_SPECS");
  const [editing, setEditing] = useState<LabSpec | "new" | null>(null);

  const columns: ColumnsType<LabSpec> = [
    {
      title: "Spec",
      key: "name",
      render: (_v, s) => (
        <div>
          <strong>{s.nameTh}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {LAB_SAMPLE_TYPE_LABEL[s.sampleType] ?? s.sampleType}
            {s.itemNameTh
              ? ` · เฉพาะ ${s.itemCode} ${s.itemNameTh}`
              : " · ทั้งประเภท"}
          </div>
        </div>
      ),
    },
    {
      title: "พารามิเตอร์",
      key: "params",
      render: (_v, s) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {s.parameters.map((p) => (
            <Tag key={p.id} color={p.specMin || p.specMax ? "blue" : "default"}>
              {p.parameterName}
              {p.specMin || p.specMax
                ? ` (${p.specMin ?? "…"} – ${p.specMax ?? "…"}${p.unit ? ` ${p.unit}` : ""})`
                : " (ยังไม่ตั้งเกณฑ์)"}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "สถานะ",
      key: "st",
      width: 100,
      render: (_v, s) => (
        <Tag color={s.isActive ? "green" : "default"}>
          {s.isActive ? "ใช้งาน" : "ปิด"}
        </Tag>
      ),
    },
    {
      title: "",
      key: "act",
      width: 150,
      render: (_v, s) => (
        <div style={{ display: "flex", gap: 6 }}>
          {canEdit ? (
            <Button size="small" onClick={() => setEditing(s)}>
              แก้ไข
            </Button>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title="ลบ Spec นี้?"
              description="ผลตรวจที่บันทึกไปแล้วไม่ได้รับผลกระทบ"
              okText="ลบ"
              cancelText="ยกเลิก"
              onConfirm={() => remove.mutate(s.id)}
            >
              <Button size="small" danger>
                ลบ
              </Button>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  const close = () => setEditing(null);

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <ExperimentOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>LABORATORY · SPEC</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              Spec การตรวจ
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              กำหนดพารามิเตอร์และเกณฑ์ผ่าน/ไม่ผ่านตามประเภทตัวอย่าง
              (หรือสินค้าเฉพาะ) — ตอนคีย์ผลระบบตัดสินให้อัตโนมัติ
            </Typography.Text>
          </div>
          {canAdd ? (
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setEditing("new")}
            >
              เพิ่ม Spec
            </Button>
          ) : (
            <div />
          )}
        </div>
        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={query.data?.data ?? []}
            loading={query.isFetching}
            pagination={false}
            locale={{ emptyText: "ยังไม่มี Spec — กด เพิ่ม Spec" }}
          />
        </div>
        {editing ? (
          <LabSpecFormModal
            key={editing === "new" ? "new" : editing.id}
            spec={editing === "new" ? null : editing}
            loading={create.isPending || update.isPending}
            onCancel={close}
            onCreate={(body) => create.mutate(body, { onSuccess: close })}
            onUpdate={(id, body) =>
              update.mutate({ id, body }, { onSuccess: close })
            }
          />
        ) : null}
      </section>
    </MasterPageGate>
  );
}
