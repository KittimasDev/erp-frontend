"use client";

import { useState } from "react";
import { App, Button, Drawer, Popconfirm, Table, Tag, Tooltip } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import {
  useCreateRouteStepMutation,
  useDeleteRouteStepMutation,
  useUpdateRouteStepMutation,
} from "@/hooks/material-conversions/useMaterialConversionMutations";
import type {
  MaterialConversionRoute,
  MaterialConversionRouteStep,
} from "@/types/material-conversion";
import { OUTPUT_TYPE_COLOR, OUTPUT_TYPE_LABEL } from "@/types/material-conversion";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import StepFormModal from "./StepFormModal";

export default function RouteStepsDrawer({
  open,
  route,
  canWrite,
  onClose,
}: {
  open: boolean;
  route?: MaterialConversionRoute;
  canWrite: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<
    MaterialConversionRouteStep | undefined
  >();

  const createStep = useCreateRouteStepMutation();
  const updateStep = useUpdateRouteStepMutation();
  const deleteStep = useDeleteRouteStepMutation();

  const columns: ColumnsType<MaterialConversionRouteStep> = [
    {
      title: "ลำดับ",
      dataIndex: "stepOrder",
      key: "stepOrder",
      width: 72,
      align: "center",
    },
    {
      title: "ขั้นตอน",
      key: "name",
      render: (_v, row) => (
        <div>
          <div>{row.nameTh}</div>
          <span className={masterStyles.codeBadge}>{row.stepCode}</span>
        </div>
      ),
    },
    {
      title: "แม่แบบรายการ",
      key: "lines",
      render: (_v, row) => {
        if (row.lines.length === 0) {
          return <span style={{ color: "#8a9199" }}>ยังไม่ตั้งแม่แบบ</span>;
        }
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {row.lines.map((line) => (
              <Tooltip
                key={line.id}
                title={
                  line.expectedRatio
                    ? `สัดส่วนคาดหมาย ${Number(line.expectedRatio)}`
                    : "ไม่ได้ตั้งสัดส่วน"
                }
              >
                <Tag
                  color={
                    line.lineRole === "INPUT"
                      ? "blue"
                      : (OUTPUT_TYPE_COLOR[line.outputType ?? "MAIN"] ??
                        "default")
                  }
                >
                  {line.lineRole === "INPUT"
                    ? "เข้า"
                    : (OUTPUT_TYPE_LABEL[line.outputType ?? "MAIN"] ?? "ออก")}
                  {line.itemCode ? ` · ${line.itemCode}` : ""}
                </Tag>
              </Tooltip>
            ))}
          </div>
        );
      },
    },
    {
      title: "ลำดับบนสายรวม",
      dataIndex: "sequenceNo",
      key: "sequenceNo",
      width: 130,
      align: "center",
      render: (value: number) => (
        <Tooltip title="ตำแหน่งบนกราฟความคืบหน้า 14 ขั้นของแดชบอร์ด">
          <span>{value}</span>
        </Tooltip>
      ),
    },
    {
      title: "สถานะ",
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (value: boolean, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Tag color={value ? "success" : "default"}>
            {value ? "ใช้งาน" : "ปิดใช้งาน"}
          </Tag>
          {row.runCount > 0 ? (
            <span style={{ color: "#8a9199", fontSize: 12 }}>
              {row.runCount} ใบ
            </span>
          ) : null}
        </div>
      ),
    },
    ...(canWrite
      ? ([
          {
            title: "จัดการ",
            key: "actions",
            width: 150,
            render: (_v, row) => (
              <div style={{ display: "flex", gap: 6 }}>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingStep(row);
                    setStepModalOpen(true);
                  }}
                >
                  แก้ไข
                </Button>
                {row.runCount > 0 ? (
                  <Tooltip title="มีรอบงานอ้างอิงแล้ว ลบไม่ได้ — ปิดใช้งานแทน">
                    <Button size="small" danger disabled icon={<DeleteOutlined />} />
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title="ลบขั้นตอนนี้?"
                    description="แม่แบบรายการของขั้นตอนนี้จะถูกลบไปด้วย"
                    okText="ลบ"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => {
                      if (!route) return;
                      deleteStep.mutate({ routeId: route.id, stepId: row.id });
                    }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </div>
            ),
          },
        ] as ColumnsType<MaterialConversionRouteStep>)
      : []),
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={960}
      title={route ? `ขั้นตอนของ "${route.nameTh}"` : "ขั้นตอน"}
      extra={
        canWrite && route ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingStep(undefined);
              setStepModalOpen(true);
            }}
          >
            เพิ่มขั้นตอน
          </Button>
        ) : null
      }
    >
      <Table
        className={masterStyles.dataTable}
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={route?.steps ?? []}
        pagination={false}
        locale={{ emptyText: "ยังไม่มีขั้นตอนในเส้นทางนี้" }}
      />

      {route ? (
        <StepFormModal
          open={stepModalOpen}
          step={editingStep}
          loading={createStep.isPending || updateStep.isPending}
          onCancel={() => setStepModalOpen(false)}
          onSubmit={(values) => {
            if (editingStep) {
              updateStep.mutate(
                {
                  routeId: route.id,
                  stepId: editingStep.id,
                  body: {
                    nameTh: values.nameTh,
                    stepOrder: values.stepOrder,
                    isActive: values.isActive,
                    remark: values.remark,
                    lines: values.lines,
                  },
                },
                { onSuccess: () => setStepModalOpen(false) },
              );
              return;
            }
            if (!values.stepCode) {
              message.warning("กรอกรหัสขั้นตอน");
              return;
            }
            createStep.mutate(
              {
                routeId: route.id,
                body: {
                  stepCode: values.stepCode,
                  nameTh: values.nameTh,
                  stepOrder: values.stepOrder,
                  remark: values.remark,
                  lines: values.lines,
                },
              },
              { onSuccess: () => setStepModalOpen(false) },
            );
          }}
        />
      ) : null}
    </Drawer>
  );
}
