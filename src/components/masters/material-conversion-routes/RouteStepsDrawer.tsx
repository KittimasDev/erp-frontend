"use client";
import { useT } from "@/lib/i18n/useT";

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
  const t = useT();
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
      title: t("ลำดับ"),
      dataIndex: "stepOrder",
      key: "stepOrder",
      width: 72,
      align: "center",
    },
    {
      title: t("ขั้นตอน"),
      key: "name",
      render: (_v, row) => (
        <div>
          <div>{row.nameTh}</div>
          <span className={masterStyles.codeBadge}>{row.stepCode}</span>
        </div>
      ),
    },
    {
      title: t("แม่แบบรายการ"),
      key: "lines",
      render: (_v, row) => {
        if (row.lines.length === 0) {
          return <span style={{ color: "#8a9199" }}>{t("ยังไม่ตั้งแม่แบบ")}</span>;
        }
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {row.lines.map((line) => (
              <Tooltip
                key={line.id}
                title={
                  line.expectedRatio
                    ? t("สัดส่วนคาดหมาย {ratio}", { ratio: Number(line.expectedRatio) })
                    : t("ไม่ได้ตั้งสัดส่วน")
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
                    ? t("เข้า")
                    : t(OUTPUT_TYPE_LABEL[line.outputType ?? "MAIN"] ?? "ออก")}
                  {line.itemCode ? ` · ${line.itemCode}` : ""}
                </Tag>
              </Tooltip>
            ))}
          </div>
        );
      },
    },
    {
      title: t("ลำดับบนสายรวม"),
      dataIndex: "sequenceNo",
      key: "sequenceNo",
      width: 130,
      align: "center",
      render: (value: number) => (
        <Tooltip title={t("ตำแหน่งบนกราฟความคืบหน้า 14 ขั้นของแดชบอร์ด")}>
          <span>{value}</span>
        </Tooltip>
      ),
    },
    {
      title: t("สถานะ"),
      dataIndex: "isActive",
      key: "isActive",
      width: 110,
      render: (value: boolean, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Tag color={value ? "success" : "default"}>
            {value ? t("ใช้งาน") : t("ปิดใช้งาน")}
          </Tag>
          {row.runCount > 0 ? (
            <span style={{ color: "#8a9199", fontSize: 12 }}>
              {t("{runs} ใบ", { runs: row.runCount })}
            </span>
          ) : null}
        </div>
      ),
    },
    ...(canWrite
      ? ([
          {
            title: t("จัดการ"),
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
                  {t("แก้ไข")}
                </Button>
                {row.runCount > 0 ? (
                  <Tooltip title={t("มีรอบงานอ้างอิงแล้ว ลบไม่ได้ — ปิดใช้งานแทน")}>
                    <Button size="small" danger disabled icon={<DeleteOutlined />} />
                  </Tooltip>
                ) : (
                  <Popconfirm
                    title={t("ลบขั้นตอนนี้?")}
                    description={t("แม่แบบรายการของขั้นตอนนี้จะถูกลบไปด้วย")}
                    okText={t("ลบ")}
                    cancelText={t("ยกเลิก")}
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
      title={route ? `ขั้นตอนของ "${route.nameTh}"` : t("ขั้นตอน")}
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
            {t("เพิ่มขั้นตอน")}
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
        locale={{ emptyText: t("ยังไม่มีขั้นตอนในเส้นทางนี้") }}
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
              message.warning(t("กรอกรหัสขั้นตอน"));
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
