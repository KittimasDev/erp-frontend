"use client";

import { useState } from "react";
import { Alert, Button, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SettingOutlined } from "@ant-design/icons";

import { canAccessScreen } from "@/lib/auth/permissions-access";
import { isAdministrator } from "@/lib/auth/session";
import { useT } from "@/lib/i18n/useT";
import type { PayBaseIssue, PayrollExclusionInput, PayrollExclusionReason } from "@/types/payroll";

type Pick = { reasonCode?: PayrollExclusionReason; note: string };

type Props = {
  open: boolean;
  /** พนักงานที่ยังไม่มีฐานค่าจ้าง (จาก validate หรือ error 400 ของ backend) */
  issues: PayBaseIssue[];
  /** รายการ "ไม่คำนวณ" ที่งวดมีอยู่แล้ว (งวดที่สร้างแล้ว) — คงไว้เมื่อส่งกลับ */
  existing?: PayrollExclusionInput[];
  loading?: boolean;
  /** ส่งรายการไม่คำนวณทั้งชุด (เดิม + ที่เลือกใหม่) — ผู้เรียกตรวจซ้ำ/คำนวณต่อ */
  onSubmit: (exclusions: PayrollExclusionInput[]) => void | Promise<void>;
  onClose: () => void;
};

const REASONS: Array<{ value: PayrollExclusionReason; label: string }> = [
  { value: "RESIGNED", label: "ลาออกแล้ว" },
  { value: "NOT_STARTED", label: "พนักงานใหม่ ยังไม่เริ่มงาน" },
  { value: "NO_PAY_THIS_PERIOD", label: "ไม่รับค่าจ้างงวดนี้" },
  { value: "OTHER", label: "อื่น ๆ (ระบุเหตุผล)" },
];

/** เปิดหน้าตั้งค่าพนักงานในแท็บใหม่ — ไม่ทิ้งฟอร์ม/รายชื่อที่เลือกไว้ในหน้านี้ */
const userSetupHref = (userId: string) => `/users?editUserId=${encodeURIComponent(userId)}`;

function Content({ issues, existing = [], loading, onSubmit, onClose }: Omit<Props, "open">) {
  const t = useT();
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  // ผู้ใช้ที่เห็นหน้า payroll อาจไม่มีสิทธิ์หน้า /users (เช่น EXECUTIVE) — ปุ่มลิงก์จึงปิดพร้อมคำอธิบาย
  const canSetup = isAdministrator() || canAccessScreen("USERS");

  const setPick = (userId: string, patch: Partial<Pick>) =>
    setPicks((p) => ({ ...p, [userId]: { ...p[userId], note: p[userId]?.note ?? "", ...patch } }));

  const chosen = issues.filter((i) => picks[i.userId]?.reasonCode);
  const unresolved = issues.length - chosen.length;
  const missingNote = chosen.some((i) => picks[i.userId]?.reasonCode === "OTHER" && !picks[i.userId]?.note.trim());

  const submit = () => {
    const added: PayrollExclusionInput[] = chosen.map((i) => ({
      userId: i.userId,
      reasonCode: picks[i.userId].reasonCode as PayrollExclusionReason,
      reasonNote: picks[i.userId].note.trim() || undefined,
    }));
    const keep = existing.filter((e) => !added.some((a) => a.userId === e.userId));
    return onSubmit([...keep, ...added]);
  };

  const columns: ColumnsType<PayBaseIssue> = [
    { title: t("รหัส"), dataIndex: "employeeCode", width: 100, render: (v?: string | null) => v ?? "—" },
    { title: t("ชื่อ"), dataIndex: "displayName" },
    {
      title: t("ข้อมูลที่ขาด"),
      key: "missing",
      width: 220,
      render: (_v, r) => (
        <Space size={4} wrap>
          {r.missing.map((m) => (
            <Tag key={m} color="red">
              {m === "BASE_PAY" ? t("เงินเดือน/ค่าแรงรายวัน") : t("ประเภทการจ้าง")}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: t("ไม่คำนวณค่าจ้างงวดนี้"),
      key: "exclude",
      width: 260,
      render: (_v, r) => {
        const pick = picks[r.userId];
        return (
          <Space orientation="vertical" size={4} style={{ width: "100%" }}>
            <Select
              allowClear
              size="small"
              style={{ width: "100%" }}
              placeholder={t("ต้องคำนวณ (ไปตั้งค่าเงินเดือน)")}
              value={pick?.reasonCode}
              options={REASONS.map((o) => ({ value: o.value, label: t(o.label) }))}
              onChange={(v) => setPick(r.userId, { reasonCode: v })}
            />
            {pick?.reasonCode === "OTHER" ? (
              <Input
                size="small"
                maxLength={500}
                placeholder={t("ระบุเหตุผลที่ไม่คำนวณค่าจ้าง")}
                value={pick.note}
                onChange={(e) => setPick(r.userId, { note: e.target.value })}
              />
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "",
      key: "setup",
      width: 90,
      render: (_v, r) =>
        canSetup ? (
          <a href={userSetupHref(r.userId)} target="_blank" rel="noreferrer">
            {t("ตั้งค่า")}
          </a>
        ) : null,
    },
  ];

  const setupButton = (
    <Button
      icon={<SettingOutlined />}
      disabled={!canSetup}
      href={canSetup ? userSetupHref(issues[0]?.userId ?? "") : undefined}
      target="_blank"
    >
      {t("ตั้งค่าข้อมูลเงินเดือน")}
    </Button>
  );

  return (
    <Modal
      open
      width={820}
      title={t("พบพนักงาน {n} คนที่ยังไม่ได้ตั้งเงินเดือน/ค่าแรงรายวัน", { n: issues.length })}
      onCancel={loading ? undefined : onClose}
      mask={{ closable: false }}
      footer={
        <Space>
          <Button onClick={onClose} disabled={loading}>
            {t("ปิด")}
          </Button>
          {canSetup ? setupButton : <Tooltip title={t("ต้องให้ผู้ดูแลระบบตั้งค่าข้อมูลเงินเดือนให้")}>{setupButton}</Tooltip>}
          <Button type="primary" loading={loading} disabled={missingNote} onClick={() => void submit()}>
            {t("ตรวจใหม่และคำนวณ")}
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          title={t("ยังคำนวณ/ปิดงวดไม่ได้ จนกว่าพนักงานทุกคนในรายการนี้จะมีเงินเดือน/ค่าแรงรายวัน หรือระบุว่าไม่คำนวณค่าจ้างในงวดนี้")}
          description={t("ตั้งค่าแล้วกดตรวจใหม่และคำนวณ (ไม่ต้องสร้างงวดใหม่) · พนักงานที่ตั้งใจไม่รับค่าจ้างในงวดนี้ ให้เลือกเหตุผลแทนการตั้งเงินเดือนเป็น 0")}
        />
        <Typography.Text type="secondary">
          {unresolved > 0
            ? t("ยังไม่ได้จัดการ {n} คน", { n: unresolved })
            : t("จัดการครบแล้ว — กดตรวจใหม่และคำนวณได้")}
        </Typography.Text>
        <Table
          size="small"
          rowKey="userId"
          columns={columns}
          dataSource={issues}
          pagination={issues.length > 8 ? { pageSize: 8, showSizeChanger: false } : false}
          scroll={{ x: 700 }}
        />
      </Space>
    </Modal>
  );
}

/** Modal แจ้งพนักงานที่ไม่มีฐานค่าจ้าง ก่อนเริ่มคำนวณ/ปิดงวด — ตั้งค่าที่หน้าผู้ใช้ หรือระบุว่าไม่คำนวณค่าจ้างงวดนี้ */
export default function PayrollPayBaseIssuesModal(props: Props) {
  // mount เฉพาะตอนเปิด เพื่อให้รายการที่เลือกไว้รีเซ็ตทุกครั้ง
  return props.open ? <Content {...props} /> : null;
}
