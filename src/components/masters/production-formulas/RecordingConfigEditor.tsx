"use client";

import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { createClientId } from "@/utils/createClientId";
import type {
  ProductionRecordingConfig,
  RecordingCalcType,
  RecordingFieldDef,
  RecordingResultRole,
} from "@/types/production-formula";
import {
  RECORDING_CALC_TYPE_LABEL,
  RECORDING_RESULT_ROLE_LABEL,
} from "@/types/production-formula";

type BomLineOption = {
  itemId: string;
  lineRole: "INPUT" | "OUTPUT";
  label: string;
};

type Props = {
  value: ProductionRecordingConfig;
  onChange: (next: ProductionRecordingConfig) => void;
  bomLines: BomLineOption[];
};

const CALC_OPTIONS = (
  Object.keys(RECORDING_CALC_TYPE_LABEL) as RecordingCalcType[]
).map((value) => ({ value, label: RECORDING_CALC_TYPE_LABEL[value] }));

const ROLE_OPTIONS = (
  Object.keys(RECORDING_RESULT_ROLE_LABEL) as RecordingResultRole[]
).map((value) => ({ value, label: RECORDING_RESULT_ROLE_LABEL[value] }));

function emptyField(sortOrder: number): RecordingFieldDef {
  return {
    id: createClientId(),
    sortOrder,
    code: `F${sortOrder + 1}`,
    label: "",
    unitLabel: "",
    required: false,
    calcType: "DIRECT",
    resultRole: "INFORMATION",
    linkedLineRole: null,
    linkedItemId: null,
    unitToStockFactor: 1,
  };
}

export default function RecordingConfigEditor({
  value,
  onChange,
  bomLines,
}: Props) {
  const fields = [...(value.fields ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const setFields = (next: RecordingFieldDef[]) => {
    onChange({
      fields: next.map((f, i) => ({ ...f, sortOrder: i })),
    });
  };

  const patch = (id: string, partial: Partial<RecordingFieldDef>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    setFields(next);
  };

  const columns: ColumnsType<RecordingFieldDef> = [
    {
      title: "#",
      width: 48,
      render: (_v, _r, i) => i + 1,
    },
    {
      title: "รหัส / ชื่อ",
      width: 220,
      render: (_v, row) => (
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Input
            size="small"
            placeholder="รหัส"
            value={row.code}
            onChange={(e) => patch(row.id, { code: e.target.value })}
          />
          <Input
            size="small"
            placeholder="ชื่อรายการ"
            value={row.label}
            onChange={(e) => patch(row.id, { label: e.target.value })}
          />
        </Space>
      ),
    },
    {
      title: "หน่วย",
      width: 90,
      render: (_v, row) => (
        <Input
          size="small"
          value={row.unitLabel}
          onChange={(e) => patch(row.id, { unitLabel: e.target.value })}
        />
      ),
    },
    {
      title: "บังคับ",
      width: 72,
      align: "center",
      render: (_v, row) => (
        <Switch
          size="small"
          checked={row.required}
          onChange={(checked) => patch(row.id, { required: checked })}
        />
      ),
    },
    {
      title: "วิธีคำนวณ",
      width: 180,
      render: (_v, row) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          options={CALC_OPTIONS}
          value={row.calcType}
          onChange={(calcType) => patch(row.id, { calcType })}
        />
      ),
    },
    {
      title: "ผลลัพธ์",
      width: 160,
      render: (_v, row) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          options={ROLE_OPTIONS}
          value={row.resultRole}
          onChange={(resultRole) => {
            const clearLink =
              resultRole === "TRACKING" || resultRole === "INFORMATION";
            patch(row.id, {
              resultRole,
              ...(clearLink
                ? { linkedItemId: null, linkedLineRole: null }
                : {}),
            });
          }}
        />
      ),
    },
    {
      title: "ลิงก์ BOM",
      width: 200,
      render: (_v, row) => {
        if (row.resultRole !== "INPUT" && row.resultRole !== "OUTPUT") {
          return <Typography.Text type="secondary">—</Typography.Text>;
        }
        const options = bomLines
          .filter((l) => l.lineRole === row.resultRole)
          .map((l) => ({ value: l.itemId, label: l.label }));
        return (
          <Select
            size="small"
            allowClear
            style={{ width: "100%" }}
            placeholder="เลือกสินค้า"
            options={options}
            value={row.linkedItemId ?? undefined}
            onChange={(itemId) =>
              patch(row.id, {
                linkedItemId: itemId ?? null,
                linkedLineRole: itemId
                  ? (row.resultRole as "INPUT" | "OUTPUT")
                  : null,
              })
            }
          />
        );
      },
    },
    {
      title: "",
      width: 110,
      render: (_v, _row, index) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => move(index, -1)}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === fields.length - 1}
            onClick={() => move(index, 1)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setFields(fields.filter((_, i) => i !== index))}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        กำหนดรายการที่ต้องบันทึกเมื่อใช้สูตรนี้ในใบสั่งผลิต — ไม่ตัด/รับ Stock
        โดยตรงจากฟอร์มนี้
      </Typography.Paragraph>

      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={fields}
        columns={columns}
        locale={{ emptyText: "ยังไม่มีรายการ — กดเพิ่มรายการด้านล่าง" }}
        scroll={{ x: 1100 }}
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setFields([...fields, emptyField(fields.length)])}
      >
        เพิ่มรายการบันทึก
      </Button>

      <Card size="small" title="ตัวอย่างฟอร์มบันทึกผล">
        {fields.length === 0 ? (
          <Typography.Text type="secondary">ยังไม่มีฟิลด์</Typography.Text>
        ) : (
          <Form layout="vertical" disabled>
            {fields.map((field) => (
              <div key={field.id} style={{ marginBottom: 12 }}>
                <Space size={8} wrap>
                  <Typography.Text strong>
                    {field.label || field.code || "(ไม่มีชื่อ)"}
                    {field.required ? " *" : ""}
                  </Typography.Text>
                  <Tag>{RECORDING_CALC_TYPE_LABEL[field.calcType]}</Tag>
                  <Tag color="blue">
                    {RECORDING_RESULT_ROLE_LABEL[field.resultRole]}
                  </Tag>
                  {field.unitLabel ? <Tag>{field.unitLabel}</Tag> : null}
                </Space>
                <PreviewInputs field={field} />
              </div>
            ))}
          </Form>
        )}
      </Card>
    </div>
  );
}

function PreviewInputs({ field }: { field: RecordingFieldDef }) {
  switch (field.calcType) {
    case "METER_DELTA":
      return (
        <Space>
          <Form.Item label="ต้นกะ" style={{ marginBottom: 0 }}>
            <InputNumber disabled style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="ปลายกะ" style={{ marginBottom: 0 }}>
            <InputNumber disabled style={{ width: 120 }} />
          </Form.Item>
        </Space>
      );
    case "HOURS_TIMES_RATE":
      return (
        <Space>
          <Form.Item label="ชั่วโมง" style={{ marginBottom: 0 }}>
            <InputNumber disabled style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="อัตรา" style={{ marginBottom: 0 }}>
            <InputNumber disabled style={{ width: 100 }} />
          </Form.Item>
        </Space>
      );
    case "QTY_TIMES_UNIT_WEIGHT":
      return (
        <Space>
          <Form.Item label="จำนวน" style={{ marginBottom: 0 }}>
            <InputNumber disabled style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="น้ำหนัก/หน่วย" style={{ marginBottom: 0 }}>
            <InputNumber disabled style={{ width: 120 }} />
          </Form.Item>
        </Space>
      );
    case "INFORMATION":
      return field.infoValueKind === "TEXT" || field.infoValueKind === "QC" ? (
        <Input disabled placeholder="ข้อความ" />
      ) : (
        <InputNumber disabled style={{ width: 160 }} />
      );
    default:
      return <InputNumber disabled style={{ width: 160 }} />;
  }
}
