"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined, ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";

import { useShiftsQuery } from "@/hooks/shifts/useShiftQueries";
import {
  useCancelShutdownPlanMutation,
  useSetShutdownMembersMutation,
  useShutdownPlanQuery,
  useSuggestShutdownMembersMutation,
} from "@/hooks/shutdown-plans/useShutdownPlans";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import type {
  ShutdownDemand,
  ShutdownMemberInput,
  ShutdownSuggestion,
} from "@/types/shutdown-plans";

import { formatBeRange } from "./shutdownPlanFormat";

type Props = {
  planId?: string;
  open: boolean;
  onClose: () => void;
};

/** ลิ้นชักรายละเอียดแผน: ความครบของกำลังคน · รายชื่อผู้ทำงาน (แก้แล้วกดบันทึก) · คำเตือน · ยกเลิกแผน */
export default function ShutdownPlanDetailDrawer({ planId, open, onClose }: Props) {
  const planQuery = useShutdownPlanQuery(open ? planId : undefined);
  const plan = planQuery.data?.data;
  const shiftsQuery = useShiftsQuery(false, open);
  const usersQuery = useUsersQuery({ isActive: true });
  const setMembers = useSetShutdownMembersMutation();
  const suggest = useSuggestShutdownMembersMutation();
  const cancel = useCancelShutdownPlanMutation();

  /**
   * รายชื่อที่กำลังแก้ — ยังไม่ส่ง backend จนกดบันทึก
   * จำ planId คู่ไว้ด้วย: เปลี่ยนไปเปิดแผนอื่นแล้วฉบับร่างของแผนเก่าไม่ติดมา (ไม่ต้องใช้ effect รีเซ็ต)
   */
  const [draftState, setDraftState] = useState<{
    planId?: string;
    members: ShutdownMemberInput[];
  } | null>(null);
  const draft = draftState && draftState.planId === planId ? draftState.members : null;
  const setDraft = (members: ShutdownMemberInput[] | null) =>
    setDraftState(members ? { planId, members } : null);
  const [addUserId, setAddUserId] = useState<string>();
  const [addShiftId, setAddShiftId] = useState<string>();
  const [suggestions, setSuggestions] = useState<ShutdownSuggestion[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState("");

  const shifts = shiftsQuery.data?.data ?? [];
  const users = useMemo(() => usersQuery.data?.data?.items ?? [], [usersQuery.data]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const shiftName = (id: string) => shifts.find((s) => s.id === id)?.name ?? "—";

  const serverMembers: ShutdownMemberInput[] = useMemo(
    () => (plan?.members ?? []).map((m) => ({ userId: m.userId, shiftId: m.shiftId })),
    [plan],
  );
  const members = draft ?? serverMembers;
  const dirty = draft !== null;
  const readOnly = plan?.status !== "ACTIVE";

  const memberInfo = (userId: string) => {
    const fromPlan = plan?.members.find((m) => m.userId === userId);
    const fromUser = userById.get(userId);
    return {
      name: fromPlan?.displayName ?? fromUser?.displayName ?? userId,
      code: fromPlan?.employeeCode ?? fromUser?.employeeCode,
      position: fromPlan?.position ?? fromUser?.position,
      warned: fromPlan?.hasWarning && !dirty,
    };
  };

  const warningsByUser = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const w of plan?.warnings ?? []) {
      if (!w.userId) continue;
      map.set(w.userId, [...(map.get(w.userId) ?? []), w.message]);
    }
    return map;
  }, [plan]);
  const generalWarnings = (plan?.warnings ?? []).filter((w) => !w.userId);

  const addMember = () => {
    if (!addUserId || !addShiftId) return;
    if (members.some((m) => m.userId === addUserId)) return;
    setDraft([...members, { userId: addUserId, shiftId: addShiftId }]);
    setAddUserId(undefined);
  };

  const runSuggest = async () => {
    if (!planId) return;
    const res = await suggest.mutateAsync(planId);
    setSuggestions(res.data.suggestions);
    setRemaining(res.data.remainingShortages.map((w) => w.message));
    setPicked(res.data.suggestions.map((s) => s.userId));
  };

  const applySuggestions = () => {
    const chosen = (suggestions ?? []).filter((s) => picked.includes(s.userId));
    const existing = new Set(members.map((m) => m.userId));
    setDraft([
      ...members,
      ...chosen
        .filter((s) => !existing.has(s.userId))
        .map((s) => ({ userId: s.userId, shiftId: s.shiftId })),
    ]);
    setSuggestions(null);
  };

  const save = async () => {
    if (!planId || !draft) return;
    await setMembers.mutateAsync({ id: planId, members: draft });
    setDraft(null);
  };

  const demandColumns: ColumnsType<ShutdownDemand> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    { title: "ตำแหน่ง", dataIndex: "position" },
    { title: "กะ", dataIndex: "shiftName", width: 130 },
    { title: "ต้องการ/วัน", dataIndex: "headcount", width: 110, align: "right" },
    { title: "กำหนดแล้ว", dataIndex: "assigned", width: 110, align: "right" },
    {
      title: "สถานะ",
      key: "status",
      width: 110,
      render: (_v, row) =>
        row.shortage > 0 ? <Tag color="red">ขาด {row.shortage}</Tag> : <Tag color="green">ครบ</Tag>,
    },
  ];

  const memberColumns: ColumnsType<ShutdownMemberInput> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "พนักงาน",
      key: "user",
      render: (_v, row) => {
        const info = memberInfo(row.userId);
        const warnings = warningsByUser.get(row.userId);
        return (
          <div>
            <strong>{info.name}</strong>
            <div style={{ fontSize: 12, color: "#8a94a6" }}>
              {[info.code, info.position].filter(Boolean).join(" · ") || "—"}
            </div>
            {!dirty && warnings?.length ? (
              <div style={{ fontSize: 12, color: "#d46b08" }}>
                <WarningOutlined /> {warnings.join(" · ")}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "กะ",
      key: "shift",
      width: 150,
      render: (_v, row) =>
        readOnly ? (
          shiftName(row.shiftId)
        ) : (
          <Select
            size="small"
            style={{ width: "100%" }}
            value={row.shiftId}
            options={shifts.map((s) => ({ value: s.id, label: s.name }))}
            onChange={(value) =>
              setDraft(members.map((m) => (m.userId === row.userId ? { ...m, shiftId: value } : m)))
            }
          />
        ),
    },
    {
      title: "",
      key: "remove",
      width: 50,
      render: (_v, row) =>
        readOnly ? null : (
          <Button
            size="small"
            aria-label="เอาออก"
            icon={<DeleteOutlined />}
            onClick={() => setDraft(members.filter((m) => m.userId !== row.userId))}
          />
        ),
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={760}
      title={plan ? `${plan.name} · ${formatBeRange(plan.dateFrom, plan.dateTo)} (${plan.dayCount} วัน)` : "แผน Shutdown"}
      destroyOnHidden
      extra={
        plan?.status === "ACTIVE" ? (
          <Popconfirm
            title="ยกเลิกแผน Shutdown?"
            description={
              <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
                <span>วัน &quot;ซ่อมเครื่อง&quot; ที่แผนนี้ลงไว้ในปฏิทินจะถูกถอน (วันที่ HR กดไว้เองไม่ถูกแตะ)</span>
                <Input
                  placeholder="เหตุผล (ไม่บังคับ)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            }
            okText="ยกเลิกแผน"
            okButtonProps={{ danger: true }}
            cancelText="ไม่"
            onConfirm={() => planId && cancel.mutate({ id: planId, reason: cancelReason.trim() || undefined })}
          >
            <Button danger loading={cancel.isPending}>
              ยกเลิกแผน
            </Button>
          </Popconfirm>
        ) : null
      }
    >
      {!plan ? (
        <Empty description={planQuery.isLoading ? "กำลังโหลด…" : "ไม่พบแผน"} />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {plan.status === "CANCELLED" ? (
            <Alert
              type="info"
              showIcon
              title="แผนนี้ถูกยกเลิกแล้ว"
              description={plan.cancelReason || undefined}
            />
          ) : null}

          {generalWarnings.length > 0 && plan.status === "ACTIVE" ? (
            <Alert
              type={generalWarnings.some((w) => w.code === "SHORTAGE") ? "warning" : "info"}
              showIcon
              title="ข้อควรตรวจ"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {generalWarnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              }
            />
          ) : null}

          <section>
            <h4 style={{ marginBottom: 8 }}>
              กำลังคนที่ต้องการ · กำหนดแล้ว {plan.assignedHeadcount}/{plan.requiredHeadcount} คนต่อวัน
            </h4>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={demandColumns}
              dataSource={plan.demands}
              locale={{ emptyText: "ยังไม่ได้ระบุความต้องการ — กดแก้ไขแผนเพื่อเพิ่ม" }}
            />
          </section>

          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>ผู้ทำงานช่วง Shutdown ({members.length} คน)</h4>
              {readOnly ? null : (
                <Space>
                  <Button
                    icon={<ThunderboltOutlined />}
                    loading={suggest.isPending}
                    disabled={dirty}
                    title={dirty ? "บันทึกรายชื่อที่แก้ค้างอยู่ก่อน" : undefined}
                    onClick={() => void runSuggest()}
                  >
                    แนะนำรายชื่อ
                  </Button>
                  <Button
                    type="primary"
                    disabled={!dirty}
                    loading={setMembers.isPending}
                    onClick={() => void save()}
                  >
                    บันทึกรายชื่อ
                  </Button>
                </Space>
              )}
            </div>

            {dirty ? (
              <Alert type="warning" showIcon style={{ marginBottom: 8 }} title="มีการแก้ไขรายชื่อที่ยังไม่บันทึก — คำเตือนจะอัปเดตหลังบันทึก" />
            ) : null}

            {readOnly ? null : (
              <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 2 }}
                  placeholder="เลือกพนักงาน"
                  value={addUserId}
                  loading={usersQuery.isLoading}
                  onChange={setAddUserId}
                  options={users
                    .filter((u) => !members.some((m) => m.userId === u.id))
                    .map((u) => ({
                      value: u.id,
                      label: [u.employeeCode, u.displayName, u.position].filter(Boolean).join(" · "),
                    }))}
                />
                <Select
                  style={{ flex: 1 }}
                  placeholder="กะ"
                  value={addShiftId}
                  onChange={setAddShiftId}
                  options={shifts.map((s) => ({ value: s.id, label: s.name }))}
                />
                <Button icon={<PlusOutlined />} disabled={!addUserId || !addShiftId} onClick={addMember}>
                  เพิ่ม
                </Button>
              </Space.Compact>
            )}

            <Table
              size="small"
              rowKey="userId"
              pagination={false}
              columns={memberColumns}
              dataSource={members}
              locale={{ emptyText: "ยังไม่มีผู้ทำงาน — เพิ่มเองหรือกด แนะนำรายชื่อ" }}
            />
          </section>
        </div>
      )}

      <Modal
        open={suggestions !== null}
        title="รายชื่อที่แนะนำ"
        okText="เพิ่มที่เลือก"
        cancelText="ปิด"
        okButtonProps={{ disabled: picked.length === 0 }}
        onOk={applySuggestions}
        onCancel={() => setSuggestions(null)}
        centered
      >
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ color: "#8a94a6", fontSize: 13 }}>
            เฉพาะคนที่ตำแหน่งตรง ยังใช้งาน ไม่มีลาที่อนุมัติทับช่วง และยังไม่อยู่ในแผน — เลือกแล้วกด เพิ่มที่เลือก
            ระบบจะยังไม่บันทึกจนกด บันทึกรายชื่อ
          </span>
          {(suggestions ?? []).length === 0 ? (
            <Empty description="ไม่มีคนที่แนะนำได้" />
          ) : (
            <Checkbox.Group
              style={{ display: "grid", gap: 6 }}
              value={picked}
              onChange={(values) => setPicked(values as string[])}
              options={(suggestions ?? []).map((s) => ({
                value: s.userId,
                label: `${[s.employeeCode, s.displayName].filter(Boolean).join(" ")} · ${s.position} · กะ${s.shiftName}`,
              }))}
            />
          )}
          {remaining.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              title="ยังไม่ครบแม้เพิ่มทุกคนที่แนะนำ"
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {remaining.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              }
            />
          ) : null}
        </div>
      </Modal>
    </Drawer>
  );
}
