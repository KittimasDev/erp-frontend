"use client";

import { useState } from "react";
import { Button, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, PlusOutlined, ToolOutlined } from "@ant-design/icons";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateShutdownPlanMutation,
  useShutdownPlansQuery,
  useUpdateShutdownPlanMutation,
} from "@/hooks/shutdown-plans/useShutdownPlans";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { CreateShutdownPlanRequest, ShutdownPlan } from "@/types/shutdown-plans";
import styles from "@/components/masters/shared/master-page.module.css";

import ShutdownPlanDetailDrawer from "./ShutdownPlanDetailDrawer";
import ShutdownPlanFormModal from "./ShutdownPlanFormModal";
import { formatBeRange } from "./shutdownPlanFormat";
import PageHeader from "@/components/common/PageHeader";

type StatusFilter = "ACTIVE" | "CANCELLED" | "ALL";

/** หน้า /hrm/shutdown-plans — แผนกำลังคนช่วง Shutdown แยกจากตารางกะปกติ */
export default function ShutdownPlansPage() {
  const t = useT();
  const lang = useLanguage();
  const [page, setPage] = useState(1);
  // draft = ค่าที่กำลังเลือก · status = ค่าที่ใช้กรองตารางจริง (เปลี่ยนเมื่อกด ค้นหา / Enter / ล้าง เท่านั้น)
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("ACTIVE");
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShutdownPlan | null>(null);
  const [detailId, setDetailId] = useState<string>();

  const plansQuery = useShutdownPlansQuery(status === "ALL" ? undefined : status);
  const createMutation = useCreateShutdownPlanMutation();
  const updateMutation = useUpdateShutdownPlanMutation();
  const plans = plansQuery.data?.data ?? [];

  const applyFilters = () => {
    setStatus(draftStatus);
    setPage(1);
  };
  const clearFilters = () => {
    setDraftStatus("ACTIVE");
    setStatus("ACTIVE");
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSubmit = (values: CreateShutdownPlanRequest) => {
    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          body: {
            name: values.name,
            dateFrom: values.dateFrom,
            dateTo: values.dateTo,
            note: values.note ?? "",
            demands: values.demands ?? [],
          },
        },
        { onSuccess: () => setFormOpen(false) },
      );
      return;
    }
    createMutation.mutate(values, {
      onSuccess: (res) => {
        setFormOpen(false);
        // สร้างเสร็จเปิดรายละเอียดต่อเลย ให้เลือกคนได้ทันที
        setDetailId(res.data.id);
      },
    });
  };

  const columns: ColumnsType<ShutdownPlan> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: t("ชื่อแผน"),
      key: "name",
      render: (_v, row) => (
        <button
          type="button"
          onClick={() => setDetailId(row.id)}
          style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontWeight: 600 }}
        >
          {row.name}
        </button>
      ),
    },
    {
      title: t("ช่วงวันที่"),
      key: "range",
      width: 230,
      render: (_v, row) => `${formatBeRange(row.dateFrom, row.dateTo, lang)} (${t("{n} วัน", { n: row.dayCount })})`,
    },
    {
      title: t("กำลังคนต่อวัน"),
      key: "headcount",
      width: 170,
      render: (_v, row) =>
        row.requiredHeadcount === 0 ? (
          <Tag>{t("ยังไม่ระบุความต้องการ")}</Tag>
        ) : row.shortageHeadcount > 0 ? (
          <Tag color="red">
            {row.assignedHeadcount}/{row.requiredHeadcount} · {t("ขาด {n}", { n: row.shortageHeadcount })}
          </Tag>
        ) : (
          <Tag color="green">
            {row.assignedHeadcount}/{row.requiredHeadcount} · {t("ครบ")}
          </Tag>
        ),
    },
    {
      title: t("คำเตือน"),
      key: "warnings",
      width: 100,
      align: "center",
      render: (_v, row) =>
        row.status === "ACTIVE" && row.warnings.length > 0 ? (
          <Tag color="orange">{row.warnings.length}</Tag>
        ) : (
          "—"
        ),
    },
    {
      title: t("สถานะ"),
      key: "status",
      width: 110,
      render: (_v, row) =>
        row.status === "ACTIVE" ? (
          <Tag color="green">{t("ใช้งาน")}</Tag>
        ) : (
          <Tag>{lang === "en" ? "Cancelled" : "ยกเลิก"}</Tag>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: (_v, row) =>
        row.status === "ACTIVE" ? (
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            {t("แก้ไข")}
          </Button>
        ) : null,
    },
  ];

  return (
    <MasterPageGate isLoading={plansQuery.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="HRM · SHUTDOWN"
          icon={<ToolOutlined />}
          title={t("แผนกำลังคนช่วง Shutdown")}
          subtitle={t(
            "วางกำลังคนช่วงหยุดเดินเครื่อง แยกจากตารางกะปกติ · สร้างแผนแล้วระบบลงวัน \"ซ่อมเครื่อง\" ในปฏิทินให้",
          )}
          actions={
            <>
<Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate}>
            {t("สร้างแผน Shutdown")}
          </Button>
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={plansQuery.isFetching}>
          <FilterField label={t("สถานะ")}>
            <Select<StatusFilter>
              value={draftStatus}
              style={{ width: "100%" }}
              onChange={setDraftStatus}
              options={[
                { value: "ACTIVE", label: t("ใช้งาน") },
                { value: "CANCELLED", label: t("ยกเลิกแล้ว") },
                { value: "ALL", label: t("ทั้งหมด") },
              ]}
            />
          </FilterField>
        </FilterCard>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3>{t("รายการแผน")}</h3>
              <p>{t("กดชื่อแผนเพื่อกำหนดผู้ทำงานและดูคำเตือน")}</p>
            </div>
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={plans}
            loading={plansQuery.isFetching}
            pagination={{ current: page, onChange: setPage, pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} แผน", { n: total }) }}
            scroll={{ x: 900 }}
            locale={{ emptyText: t("ยังไม่มีแผน Shutdown — กด สร้างแผน Shutdown") }}
          />
        </div>

        <ShutdownPlanFormModal
          open={formOpen}
          plan={editing}
          confirmLoading={createMutation.isPending || updateMutation.isPending}
          onCancel={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
        <ShutdownPlanDetailDrawer
          planId={detailId}
          open={Boolean(detailId)}
          onClose={() => setDetailId(undefined)}
        />
      </section>
    </MasterPageGate>
  );
}
