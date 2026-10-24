"use client";

import { useState } from "react";
import { Button, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { EditOutlined, PlusOutlined, ToolOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCreateShutdownPlanMutation,
  useShutdownPlansQuery,
  useUpdateShutdownPlanMutation,
} from "@/hooks/shutdown-plans/useShutdownPlans";
import type { CreateShutdownPlanRequest, ShutdownPlan } from "@/types/shutdown-plans";
import styles from "@/components/masters/shared/master-page.module.css";

import ShutdownPlanDetailDrawer from "./ShutdownPlanDetailDrawer";
import ShutdownPlanFormModal from "./ShutdownPlanFormModal";
import { formatBeRange } from "./shutdownPlanFormat";

type StatusFilter = "ACTIVE" | "CANCELLED" | "ALL";

/** หน้า /hrm/shutdown-plans — แผนกำลังคนช่วง Shutdown แยกจากตารางกะปกติ */
export default function ShutdownPlansPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("ACTIVE");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShutdownPlan | null>(null);
  const [detailId, setDetailId] = useState<string>();

  const plansQuery = useShutdownPlansQuery(status === "ALL" ? undefined : status);
  const createMutation = useCreateShutdownPlanMutation();
  const updateMutation = useUpdateShutdownPlanMutation();
  const plans = plansQuery.data?.data ?? [];

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
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: "ชื่อแผน",
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
      title: "ช่วงวันที่",
      key: "range",
      width: 230,
      render: (_v, row) => `${formatBeRange(row.dateFrom, row.dateTo)} (${row.dayCount} วัน)`,
    },
    {
      title: "กำลังคนต่อวัน",
      key: "headcount",
      width: 170,
      render: (_v, row) =>
        row.requiredHeadcount === 0 ? (
          <Tag>ยังไม่ระบุความต้องการ</Tag>
        ) : row.shortageHeadcount > 0 ? (
          <Tag color="red">
            {row.assignedHeadcount}/{row.requiredHeadcount} · ขาด {row.shortageHeadcount}
          </Tag>
        ) : (
          <Tag color="green">
            {row.assignedHeadcount}/{row.requiredHeadcount} · ครบ
          </Tag>
        ),
    },
    {
      title: "คำเตือน",
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
      title: "สถานะ",
      key: "status",
      width: 110,
      render: (_v, row) =>
        row.status === "ACTIVE" ? <Tag color="green">ใช้งาน</Tag> : <Tag>ยกเลิก</Tag>,
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
            แก้ไข
          </Button>
        ) : null,
    },
  ];

  return (
    <MasterPageGate isLoading={plansQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <ToolOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>HRM · SHUTDOWN</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              แผนกำลังคนช่วง Shutdown
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              วางกำลังคนช่วงหยุดเดินเครื่อง แยกจากตารางกะปกติ · สร้างแผนแล้วระบบลงวัน &quot;ซ่อมเครื่อง&quot; ในปฏิทินให้
            </Typography.Text>
          </div>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate}>
            สร้างแผน Shutdown
          </Button>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3>รายการแผน</h3>
              <p>กดชื่อแผนเพื่อกำหนดผู้ทำงานและดูคำเตือน</p>
            </div>
            <Select<StatusFilter>
              value={status}
              style={{ width: 160 }}
              onChange={setStatus}
              options={[
                { value: "ACTIVE", label: "ใช้งาน" },
                { value: "CANCELLED", label: "ยกเลิกแล้ว" },
                { value: "ALL", label: "ทั้งหมด" },
              ]}
            />
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={plans}
            loading={plansQuery.isFetching}
            pagination={{ pageSize: 20, showTotal: (total) => `ทั้งหมด ${total} แผน` }}
            scroll={{ x: 900 }}
            locale={{ emptyText: "ยังไม่มีแผน Shutdown — กด สร้างแผน Shutdown" }}
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
