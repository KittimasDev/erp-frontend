"use client";

import { useState } from "react";
import { Alert, Button, Input, InputNumber, Switch, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DollarOutlined, SearchOutlined } from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useCompensationQuery,
  useUpdateCompensationMutation,
} from "@/hooks/compensation/useCompensation";
import type { CompensationRow } from "@/types/compensation";
import styles from "@/components/masters/shared/master-page.module.css";

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** หน้า /hrm/compensation — ฐานค่าจ้างพนักงาน (เงินเดือน/ค่าแรงต่อวัน) ใช้คำนวณ OT และเงินเดือน */
export default function CompensationPage() {
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  /** ค่าที่กำลังพิมพ์ ต่อ userId — ยังไม่บันทึกจนกดปุ่มบันทึกของแถวนั้น */
  const [drafts, setDrafts] = useState<Record<string, number | null>>({});

  const query = useCompensationQuery(applied);
  const update = useUpdateCompensationMutation();
  const rows = query.data?.data ?? [];

  const save = (row: CompensationRow) => {
    const value = drafts[row.userId];
    update.mutate(
      { userId: row.userId, body: { basePay: value ?? null } },
      {
        onSuccess: () =>
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[row.userId];
            return next;
          }),
      },
    );
  };

  const columns: ColumnsType<CompensationRow> = [
    {
      title: "พนักงาน",
      key: "user",
      render: (_v, row) => (
        <div>
          <strong>{row.displayName}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[row.employeeCode, row.position, row.departmentName].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    {
      title: "ประเภทค่าจ้าง",
      key: "payType",
      width: 150,
      render: (_v, row) =>
        row.payType === "DAILY" ? (
          <Tag color="orange">รายวัน (ค่าแรง/วัน)</Tag>
        ) : (
          <Tag color="blue">รายเดือน (เงินเดือน)</Tag>
        ),
    },
    {
      title: "ฐานค่าจ้าง (บาท)",
      key: "basePay",
      width: 230,
      render: (_v, row) => {
        const hasDraft = row.userId in drafts;
        const value = hasDraft ? drafts[row.userId] : (row.basePay ?? null);
        return (
          <div style={{ display: "flex", gap: 6 }}>
            <InputNumber
              style={{ width: 140 }}
              min={0}
              max={99999999}
              precision={2}
              value={value}
              placeholder="ยังไม่ตั้ง"
              onChange={(next) => setDrafts((prev) => ({ ...prev, [row.userId]: next }))}
            />
            {hasDraft ? (
              <Button type="primary" loading={update.isPending} onClick={() => save(row)}>
                บันทึก
              </Button>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "ค่าแรง/ชม.",
      key: "hourlyRate",
      width: 130,
      align: "right",
      render: (_v, row) => (row.hourlyRate ? money(row.hourlyRate) : "—"),
    },
    {
      title: "ประกันสังคม",
      key: "socialSecurity",
      width: 110,
      align: "center",
      render: (_v, row) => (
        <Switch
          size="small"
          checked={row.socialSecurityEnabled !== false}
          loading={update.isPending && update.variables?.userId === row.userId}
          onChange={(checked) =>
            update.mutate({ userId: row.userId, body: { socialSecurityEnabled: checked } })
          }
        />
      ),
    },
    {
      title: "สถานะ",
      key: "isActive",
      width: 100,
      render: (_v, row) => (row.isActive ? <Tag color="green">ใช้งาน</Tag> : <Tag>ปิด</Tag>),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <DollarOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>HRM · COMPENSATION</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              ฐานค่าจ้างพนักงาน
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              เงินเดือน (รายเดือน) หรือค่าแรงต่อวัน (รายวัน) — ใช้คำนวณเงิน OT ตอนอนุมัติ
            </Typography.Text>
          </div>
          <div />
        </div>

        <Alert
          type="info"
          showIcon
          title="ข้อมูลอ่อนไหว — เห็นได้เฉพาะผู้ที่ได้รับสิทธิ์หน้านี้"
          description="ประเภทค่าจ้างดูจาก ประเภทการจ้าง ของพนักงาน (รายวัน = ค่าแรงต่อวัน, อื่น ๆ = เงินเดือน) · คำขอ OT ที่อนุมัติไปแล้วไม่ถูกคำนวณใหม่เมื่อแก้ฐานค่าจ้างภายหลัง · ตัวคูณ OT และสูตรค่าแรงต่อชั่วโมงตั้งที่หน้าคำขอ OT"
          style={{ marginBottom: 12 }}
        />

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>
              <h3>รายการพนักงาน</h3>
              <p>พนักงานที่ยังไม่ตั้งฐานค่าจ้าง ระบบอนุมัติ OT ให้ได้แต่คิดเงินไม่ได้</p>
            </div>
            <Input
              allowClear
              style={{ width: 260 }}
              prefix={<SearchOutlined />}
              placeholder="ค้นชื่อ / รหัสพนักงาน"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => setApplied(keyword)}
              onBlur={() => setApplied(keyword)}
            />
          </div>
          <Table
            rowKey="userId"
            className={styles.dataTable}
            columns={columns}
            dataSource={rows}
            loading={query.isFetching}
            pagination={{ pageSize: 20, showTotal: (total) => `ทั้งหมด ${total} คน` }}
            scroll={{ x: 800 }}
          />
        </div>
      </section>
    </MasterPageGate>
  );
}
