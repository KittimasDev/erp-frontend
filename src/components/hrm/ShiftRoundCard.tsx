"use client";

import { useMemo, useState } from "react";
import { Button, Empty, Popconfirm, Select, Space, Spin, Tooltip } from "antd";
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  UpOutlined,
} from "@ant-design/icons";

import {
  useDeleteShiftScheduleMutation,
  useRemoveShiftScheduleMemberMutation,
  useSetShiftScheduleMembersMutation,
} from "@/hooks/shifts/useShiftMutations";
import { useShiftScheduleQuery } from "@/hooks/shifts/useShiftQueries";
import { useUsersQuery } from "@/hooks/users/useUsersQuery";
import type { ShiftSchedule } from "@/types/shifts";

import styles from "./ShiftCalendarPage.module.css";

type Props = {
  schedule: ShiftSchedule;
  onEdit: (schedule: ShiftSchedule) => void;
};

/**
 * รอบกะหนึ่งรอบในลิ้นชักรายวัน — กด "ดูรายชื่อ" แล้วจึงโหลดคนในกะ
 * (ปฏิทินส่งมาแค่จำนวนคน ไม่ได้ส่งรายชื่อมาด้วย)
 */
export default function ShiftRoundCard({ schedule, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pickedUserIds, setPickedUserIds] = useState<string[]>([]);

  const detailQuery = useShiftScheduleQuery(schedule.id, expanded);
  const usersQuery = useUsersQuery({ limit: 200 });
  const deleteMutation = useDeleteShiftScheduleMutation();
  const setMembersMutation = useSetShiftScheduleMembersMutation();
  const removeMemberMutation = useRemoveShiftScheduleMemberMutation();

  const members = useMemo(
    () => detailQuery.data?.data.members ?? [],
    [detailQuery.data],
  );
  const memberIds = useMemo(
    () => members.map((member) => member.userId),
    [members],
  );

  const availableOptions = useMemo(
    () =>
      (usersQuery.data?.data.items ?? [])
        .filter((user) => !memberIds.includes(user.id))
        .map((user) => ({
          value: user.id,
          label: `${user.displayName}${user.employeeCode ? ` (${user.employeeCode})` : ""}`,
        })),
    [usersQuery.data, memberIds],
  );

  const handleAddMembers = async () => {
    if (pickedUserIds.length === 0) {
      setAdding(false);
      return;
    }
    try {
      await setMembersMutation.mutateAsync({
        id: schedule.id,
        userIds: [...memberIds, ...pickedUserIds],
      });
    } catch {
      // mutation แจ้ง error ผ่าน message ให้แล้ว — คงรายชื่อที่เลือกไว้ให้แก้ต่อ
      return;
    }
    setPickedUserIds([]);
    setAdding(false);
  };

  return (
    <div className={styles.roundCard}>
      <div className={styles.roundHead}>
        <span
          className={styles.roundColor}
          style={{ background: schedule.color || "#8ab933" }}
          aria-hidden
        />
        <div className={styles.roundTitle}>
          <strong>{schedule.shiftName}</strong>
          <span>
            {schedule.startTime} - {schedule.endTime} น.
            {schedule.isOvernight ? " (ข้ามคืน)" : ""}
          </span>
        </div>
        <Space size={4}>
          <Tooltip title="แก้เวลา / ย้ายวัน / สลับกะ">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(schedule)}
            />
          </Tooltip>
          <Popconfirm
            title="ลบรอบกะนี้?"
            description="รายชื่อพนักงานในรอบนี้จะถูกลบไปด้วย"
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true }}
            onConfirm={() => deleteMutation.mutateAsync(schedule.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>

      {schedule.note ? (
        <p className={styles.roundNote}>{schedule.note}</p>
      ) : null}

      <button
        type="button"
        className={styles.roundToggle}
        onClick={() => setExpanded((value) => !value)}
      >
        <TeamOutlined />
        <span>
          {schedule.memberCount > 0
            ? `ดูรายชื่อในกะ (${schedule.memberCount} คน)`
            : "ยังไม่มีคนในกะนี้ — กดเพื่อเพิ่ม"}
        </span>
        {expanded ? <UpOutlined /> : <DownOutlined />}
      </button>

      {expanded ? (
        <div className={styles.memberArea}>
          {detailQuery.isLoading ? (
            <div className={styles.memberLoading}>
              <Spin size="small" />
            </div>
          ) : members.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="ยังไม่มีพนักงานในรอบกะนี้"
            />
          ) : (
            <ul className={styles.memberList}>
              {members.map((member) => (
                <li key={member.id} className={styles.memberItem}>
                  <div className={styles.memberName}>
                    <strong>{member.displayName ?? "—"}</strong>
                    <span>
                      {member.employeeCode ?? "ไม่มีรหัส"}
                      {member.departmentName ? ` · ${member.departmentName}` : ""}
                    </span>
                  </div>
                  <Popconfirm
                    title="เอาออกจากกะนี้?"
                    okText="เอาออก"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true }}
                    onConfirm={() =>
                      removeMemberMutation.mutateAsync({
                        id: schedule.id,
                        userId: member.userId,
                      })
                    }
                  >
                    <Button size="small" type="text" danger>
                      เอาออก
                    </Button>
                  </Popconfirm>
                </li>
              ))}
            </ul>
          )}

          {adding ? (
            <div className={styles.memberAdd}>
              <Select
                mode="multiple"
                showSearch
                autoFocus
                optionFilterProp="label"
                placeholder="ค้นหาชื่อหรือรหัสพนักงาน"
                loading={usersQuery.isLoading}
                options={availableOptions}
                value={pickedUserIds}
                onChange={setPickedUserIds}
                maxTagCount="responsive"
                style={{ flex: 1, minWidth: 200 }}
              />
              <Button
                type="primary"
                loading={setMembersMutation.isPending}
                onClick={() => void handleAddMembers()}
              >
                เพิ่ม
              </Button>
              <Button
                onClick={() => {
                  setPickedUserIds([]);
                  setAdding(false);
                }}
              >
                ยกเลิก
              </Button>
            </div>
          ) : (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAdding(true)}
            >
              เพิ่มพนักงานเข้ากะ
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
