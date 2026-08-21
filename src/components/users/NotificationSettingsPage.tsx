"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { App, Alert, Button, Space, Switch, Table, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  BellOutlined,
  ExperimentOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useNotificationEventQuery,
  useNotificationEventsQuery,
  useTestNotificationEventMutation,
  useUpdateNotificationEventRolesMutation,
} from "@/hooks/notification-settings/useNotificationSettingsQueries";
import type {
  NotificationEventRoleRow,
  NotificationEventSummary,
} from "@/types/notification-settings";
import masterStyles from "@/components/masters/shared/master-page.module.css";

type NotificationSettingsPageProps = {
  embedded?: boolean;
};

export default function NotificationSettingsPage({
  embedded = false,
}: NotificationSettingsPageProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventCode = searchParams.get("event")?.trim() || undefined;

  const eventsQuery = useNotificationEventsQuery({ enabled: !eventCode });
  const eventQuery = useNotificationEventQuery(eventCode, {
    enabled: Boolean(eventCode),
  });
  const updateMutation = useUpdateNotificationEventRolesMutation(
    eventCode ?? "",
  );
  const testMutation = useTestNotificationEventMutation(eventCode ?? "");

  const [draftEnabled, setDraftEnabled] = useState<Record<string, boolean>>({});

  const detail = eventQuery.data?.data;
  const roles = detail?.roles ?? [];

  useEffect(() => {
    if (!detail) {
      return;
    }
    const next: Record<string, boolean> = {};
    for (const row of detail.roles) {
      next[row.roleId] = row.isEnabled;
    }
    setDraftEnabled(next);
  }, [detail]);

  const dirty = useMemo(() => {
    if (!detail) {
      return false;
    }
    return detail.roles.some(
      (row) => draftEnabled[row.roleId] !== row.isEnabled,
    );
  }, [detail, draftEnabled]);

  const openEvent = (code: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "notifications");
    next.set("event", code);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const backToList = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "notifications");
    next.delete("event");
    router.replace(`${pathname}?${next.toString()}`);
  };

  const handleSave = async () => {
    if (!eventCode || !detail) {
      return;
    }
    try {
      await updateMutation.mutateAsync({
        roles: detail.roles.map((row) => ({
          roleId: row.roleId,
          isEnabled: draftEnabled[row.roleId] ?? row.isEnabled,
        })),
      });
      message.success("บันทึกการตั้งค่าแจ้งเตือนแล้ว");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "บันทึกไม่สำเร็จ",
      );
    }
  };

  const handleTest = async () => {
    if (!eventCode) {
      return;
    }
    if (dirty) {
      message.warning("บันทึกการตั้งค่าก่อนทดสอบ หรือยกเลิกการแก้ไขที่ยังไม่บันทึก");
      return;
    }
    try {
      const res = await testMutation.mutateAsync();
      const rolesLabel = res.data.notifiedRoleCodes.join(", ");
      message.success(
        rolesLabel
          ? `ส่งแจ้งเตือนทดสอบแล้ว → ${rolesLabel} (ดูที่กระดิ่ง)`
          : "ส่งแจ้งเตือนทดสอบแล้ว",
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "ทดสอบแจ้งเตือนไม่สำเร็จ",
      );
    }
  };

  const eventColumns: ColumnsType<NotificationEventSummary> = [
    {
      title: "เมนู / ประเภท",
      key: "name",
      render: (_, row) => (
        <div>
          <Space size={8} wrap>
            <Typography.Text strong>{row.nameTh}</Typography.Text>
            {row.code.includes("PURCHASE_REQUEST") ? (
              <Tag color="green">PR</Tag>
            ) : null}
            {row.code.includes("STOCK_POSTING") ? (
              <Tag color="blue">รับยาง</Tag>
            ) : null}
            {row.code.includes("PICKING") ? (
              <Tag color="cyan">Picking</Tag>
            ) : null}
          </Space>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.descriptionTh}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "รหัส",
      dataIndex: "code",
      key: "code",
      width: 280,
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: "หน้าปลายทาง",
      dataIndex: "href",
      key: "href",
      width: 260,
      render: (value: string) => (
        <Typography.Text type="secondary">{value}</Typography.Text>
      ),
    },
  ];

  const roleColumns: ColumnsType<NotificationEventRoleRow> = [
    {
      title: "รหัสบทบาท",
      dataIndex: "roleCode",
      key: "roleCode",
      width: 220,
      render: (value: string) => <code>{value}</code>,
    },
    {
      title: "ชื่อบทบาท",
      dataIndex: "roleName",
      key: "roleName",
    },
    {
      title: "ประเภท",
      key: "type",
      width: 120,
      render: (_, record) =>
        record.isSystemRole ? (
          <Tag color="blue">ระบบ</Tag>
        ) : (
          <Tag color="green">กำหนดเอง</Tag>
        ),
    },
    {
      title: "รับแจ้งเตือน",
      key: "isEnabled",
      width: 140,
      align: "center",
      render: (_, record) => (
        <Switch
          checked={draftEnabled[record.roleId] ?? record.isEnabled}
          onChange={(checked) =>
            setDraftEnabled((prev) => ({
              ...prev,
              [record.roleId]: checked,
            }))
          }
        />
      ),
    },
  ];

  if (eventCode) {
    const enabledCount = roles.filter(
      (row) => draftEnabled[row.roleId] ?? row.isEnabled,
    ).length;

    return (
      <MasterPageGate isLoading={!embedded && eventQuery.isLoading}>
        <section className={masterStyles.page}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={backToList}
                style={{ paddingInline: 0, marginBottom: 8 }}
              >
                กลับรายการแจ้งเตือน
              </Button>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {detail?.nameTh ?? "ตั้งค่าแจ้งเตือน"}
              </Typography.Title>
              <Typography.Text type="secondary">
                {detail?.descriptionTh ??
                  "เลือกบทบาทที่จะได้รับการแจ้งเตือนเมื่อมีรายการใหม่"}
              </Typography.Text>
            </div>
            <Space wrap>
              <Button
                icon={<ExperimentOutlined />}
                disabled={enabledCount === 0 || dirty}
                loading={testMutation.isPending}
                onClick={() => void handleTest()}
              >
                ทดสอบแจ้งเตือน
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                disabled={!dirty}
                loading={updateMutation.isPending}
                onClick={() => void handleSave()}
              >
                บันทึก
              </Button>
            </Space>
          </div>

          {detail && enabledCount === 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="ยังไม่มีบทบาทที่รับแจ้งเตือน"
              description="เปิดสวิตช์บทบาทของบัญชีที่ควรอนุมัติ แล้วกดบันทึก — ระบบจะยิงแจ้งเตือนตามบทบาทที่เปิดไว้ที่นี่เท่านั้น"
            />
          ) : null}

          <Table
            rowKey="roleId"
            columns={roleColumns}
            dataSource={roles}
            loading={eventQuery.isFetching}
            pagination={false}
            locale={{ emptyText: "ยังไม่มีบทบาทในระบบ" }}
          />
        </section>
      </MasterPageGate>
    );
  }

  const events = eventsQuery.data?.data ?? [];
  const eventsError =
    eventsQuery.error instanceof Error
      ? eventsQuery.error.message
      : eventsQuery.isError
        ? "โหลดรายการแจ้งเตือนไม่สำเร็จ"
        : null;

  return (
    <MasterPageGate isLoading={eventsQuery.isLoading}>
      <section className={masterStyles.page}>
        <div style={{ marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            <BellOutlined style={{ marginRight: 8 }} />
            ประเภทการแจ้งเตือน
          </Typography.Title>
          <Typography.Text type="secondary">
            เลือกรายการเพื่อกำหนดว่าบทบาทไหนจะได้รับแจ้งเตือนเมื่อมีงานเข้าคิว
            {events.length > 0 ? ` (${events.length} รายการ)` : null}
          </Typography.Text>
        </div>

        {eventsError ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="โหลดรายการไม่สำเร็จ"
            description={eventsError}
            action={
              <Button size="small" onClick={() => void eventsQuery.refetch()}>
                ลองใหม่
              </Button>
            }
          />
        ) : null}

        <Table
          rowKey="code"
          columns={eventColumns}
          dataSource={events}
          loading={eventsQuery.isFetching}
          pagination={false}
          onRow={(row) => ({
            onClick: () => openEvent(row.code),
            style: { cursor: "pointer" },
          })}
          locale={{ emptyText: "ยังไม่มีประเภทการแจ้งเตือน" }}
        />
      </section>
    </MasterPageGate>
  );
}
