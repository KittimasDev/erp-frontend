"use client";

import { useState } from "react";
import { App, Button, Dropdown, Popconfirm, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  ExperimentOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateLabSpecMutation,
  useDeleteLabSpecMutation,
  useLabSpecsQuery,
  useUpdateLabSpecMutation,
} from "@/hooks/laboratory/useLabSpecs";
import { ApiError } from "@/lib/api/client";
import { downloadLabSpecImportTemplate } from "@/lib/api/lab-specs";
import { getAccessToken } from "@/lib/auth/token";
import { downloadBlob } from "@/utils/downloadTabularReport";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import {
  labSpecActiveLabel,
  LAB_SAMPLE_TYPE_LABEL,
  type LabSpec,
} from "@/types/laboratory";
import styles from "@/components/masters/shared/master-page.module.css";

import LabSpecFormModal from "./LabSpecFormModal";
import LabSpecImportModal from "./LabSpecImportModal";
import PageHeader from "@/components/common/PageHeader";

/** หน้า /laboratory/specs — Spec การตรวจ (พารามิเตอร์ + เกณฑ์ min/max) ตามประเภทตัวอย่าง/สินค้า (M8.3) */
export default function LabSpecsPage() {
  const t = useT();
  const lang = useLanguage();
  const query = useLabSpecsQuery();
  const create = useCreateLabSpecMutation();
  const update = useUpdateLabSpecMutation();
  const remove = useDeleteLabSpecMutation();
  const { canAdd, canEdit, canDelete } =
    getScreenActionPermissions("LAB_SPECS");
  const [editing, setEditing] = useState<LabSpec | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { message } = App.useApp();

  const downloadTemplate = async (format: "xlsx" | "csv") => {
    try {
      const { blob, filename } = await downloadLabSpecImportTemplate(
        getAccessToken(),
        format,
      );
      downloadBlob(filename ?? `lab-specs-import-template.${format}`, blob);
    } catch (e) {
      message.error(
        e instanceof ApiError ? e.message : t("ดาวน์โหลด Template ไม่สำเร็จ"),
      );
    }
  };

  const columns: ColumnsType<LabSpec> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Spec",
      key: "name",
      render: (_v, s) => (
        <div>
          <strong>{s.nameTh}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {t(LAB_SAMPLE_TYPE_LABEL[s.sampleType] ?? s.sampleType)}
            {s.itemNameTh
              ? ` · ${t("เฉพาะ {code} {name}", { code: s.itemCode ?? "", name: s.itemNameTh })}`
              : ` · ${t("ทั้งประเภท")}`}
          </div>
        </div>
      ),
    },
    {
      title: t("พารามิเตอร์"),
      key: "params",
      render: (_v, s) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {s.parameters.map((p) => (
            <Tag key={p.id} color={p.specMin || p.specMax ? "blue" : "default"}>
              {p.parameterName}
              {p.specMin || p.specMax
                ? ` (${p.specMin ?? "…"} – ${p.specMax ?? "…"}${p.unit ? ` ${p.unit}` : ""})`
                : ` (${t("ยังไม่ตั้งเกณฑ์")})`}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: t("สถานะ"),
      key: "st",
      width: 100,
      render: (_v, s) => (
        <Tag color={s.isActive ? "green" : "default"}>
          {labSpecActiveLabel(s.isActive, lang)}
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
              {t("แก้ไข")}
            </Button>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title={t("ลบ Spec นี้?")}
              description={t("ผลตรวจที่บันทึกไปแล้วไม่ได้รับผลกระทบ")}
              okText={t("ลบ")}
              cancelText={t("ยกเลิก")}
              onConfirm={() => remove.mutate(s.id)}
            >
              <Button size="small" danger>
                {t("ลบ")}
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
        <PageHeader
          eyebrow="LABORATORY · SPEC"
          icon={<ExperimentOutlined />}
          title={t("Spec การตรวจ")}
          subtitle={t(
            "กำหนดพารามิเตอร์และเกณฑ์ผ่าน/ไม่ผ่านตามประเภทตัวอย่าง (หรือสินค้าเฉพาะ) — ตอนคีย์ผลระบบตัดสินให้อัตโนมัติ",
          )}
          actions={
            <>
              <Dropdown
                menu={{
                  items: [
                    { key: "xlsx", label: t("Excel (.xlsx)") },
                    { key: "csv", label: t("CSV (.csv)") },
                  ],
                  onClick: ({ key }) =>
                    void downloadTemplate(key as "xlsx" | "csv"),
                }}
              >
                <Button size="large" icon={<DownloadOutlined />}>
                  {t("ดาวน์โหลด Template")}
                </Button>
              </Dropdown>
              {canAdd ? (
                <Button
                  size="large"
                  icon={<UploadOutlined />}
                  onClick={() => setImportOpen(true)}
                >
                  {t("นำเข้าข้อมูล")}
                </Button>
              ) : null}
{canAdd ? (
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => setEditing("new")}
            >
              {t("เพิ่ม Spec")}
            </Button>
          ) : (
            <div />
          )}
            </>
          }
        />
        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={query.data?.data ?? []}
            loading={query.isFetching}
            pagination={false}
            locale={{ emptyText: t("ยังไม่มี Spec — กด เพิ่ม Spec") }}
          />
        </div>
        <LabSpecImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
        />
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
