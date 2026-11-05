"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
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

import { useEquipmentQuery } from "@/hooks/maintenance/useMaintenance";
import { createClientId } from "@/utils/createClientId";
import type {
  ProductionRecordingConfig,
  RecordingCalcType,
  RecordingFieldDef,
  RecordingResultRole,
} from "@/types/production-formula";
import {
  RECORDING_CALC_TYPE_LABEL,
  RECORDING_DATA_SOURCE_LABEL,
  RECORDING_RESULT_ROLE_LABEL,
  type RecordingDataSource,
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

const DATA_SOURCE_OPTIONS = (
  Object.keys(RECORDING_DATA_SOURCE_LABEL) as RecordingDataSource[]
).map((value) => ({ value, label: RECORDING_DATA_SOURCE_LABEL[value] }));

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
    equipmentId: null,
    dataSource: "MANUAL",
    deviceTagCode: null,
    compareToCapacity: false,
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
  const equipmentIds = value.equipmentIds ?? [];
  const equipmentQuery = useEquipmentQuery({});
  const equipmentList = (equipmentQuery.data?.data ?? []).filter(
    (e) => e.status !== "RETIRED" || equipmentIds.includes(e.id),
  );
  const equipmentById = new Map(equipmentList.map((e) => [e.id, e] as const));
  const capacityText = (id: string) => {
    const e = equipmentById.get(id);
    return e?.capacity != null
      ? `${e.capacity.toLocaleString("th-TH")} ${e.capacityUnitLabel ?? ""}/ชม.`
      : "ยังไม่ตั้ง Capacity";
  };

  // ต้องคง equipmentIds ไว้ทุกครั้งที่แก้ฟิลด์ — ไม่งั้นเครื่องที่เลือกไว้หาย
  const setFields = (next: RecordingFieldDef[]) => {
    onChange({
      ...value,
      fields: next.map((f, i) => ({ ...f, sortOrder: i })),
    });
  };

  const setEquipmentIds = (ids: string[]) => {
    // เอาเครื่องออกจากสูตร → ฟิลด์ที่ผูกเครื่องนั้นกลับเป็นฟิลด์ทั่วไป (ไม่ทิ้งการผูกค้าง)
    const kept = new Set(ids);
    onChange({
      ...value,
      equipmentIds: ids,
      fields: fields.map((f) =>
        f.equipmentId && !kept.has(f.equipmentId)
          ? {
              ...f,
              equipmentId: null,
              compareToCapacity: false,
              dataSource: "MANUAL",
              deviceTagCode: null,
            }
          : f,
      ),
    });
  };

  const patch = (id: string, partial: Partial<RecordingFieldDef>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  };

  const exemptions = value.bomExemptions ?? [];
  const linkedInputIds = new Set(
    fields.flatMap((f) =>
      f.resultRole === "INPUT" && f.linkedItemId ? [f.linkedItemId] : [],
    ),
  );
  const unlinkedNames = bomLines
    .filter(
      (l) =>
        l.lineRole === "INPUT" &&
        !linkedInputIds.has(l.itemId) &&
        !exemptions.some((e) => e.itemId === l.itemId),
    )
    .map((l) => l.label.replace(/^INPUT · /, ""));
  // เฉพาะวัตถุดิบที่ยังอยู่ใน BOM — ตัดรายการยกเว้นที่ค้างจากบรรทัดที่ถูกลบ
  const setExemptions = (next: { itemId: string; reason: string }[]) =>
    onChange({
      ...value,
      bomExemptions: next.filter((e) =>
        bomLines.some((l) => l.lineRole === "INPUT" && l.itemId === e.itemId),
      ),
    });

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
        <Space orientation="vertical" size={4} style={{ width: "100%" }}>
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
      title: "ใช้คำนวณ",
      width: 160,
      render: (_v, row) => (
        <Select
          size="small"
          allowClear
          style={{ width: "100%" }}
          placeholder="ไม่ใช้"
          options={[
            { value: "INPUT_TIRE", label: "ยางป้อน" },
            { value: "OPERATING_HOURS", label: "ชั่วโมงเดินเครื่อง" },
          ]}
          value={row.dashboardMetric}
          onChange={(metric) => {
            const dashboardMetric = metric ?? undefined;
            setFields(
              fields.map((f) => {
                if (f.id === row.id) {
                  return { ...f, dashboardMetric };
                }
                if (dashboardMetric && f.dashboardMetric === dashboardMetric) {
                  return { ...f, dashboardMetric: undefined };
                }
                return f;
              }),
            );
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
            onChange={(itemId) => {
              const base = {
                linkedItemId: itemId ?? null,
                linkedLineRole: itemId
                  ? (row.resultRole as "INPUT" | "OUTPUT")
                  : null,
              };
              // วัตถุดิบนี้มีช่องอื่นตัด Stock อยู่แล้ว → ช่องใหม่เป็น "บันทึกอย่างเดียว" กันตัดซ้ำ
              const taken =
                row.resultRole === "INPUT" &&
                itemId &&
                fields.some(
                  (f) =>
                    f.id !== row.id &&
                    f.resultRole === "INPUT" &&
                    f.linkedItemId === itemId &&
                    f.stockDeduct !== false,
                );
              if (taken) {
                setFields(
                  fields.map((f) =>
                    f.id === row.id
                      ? { ...f, ...base, stockDeduct: false }
                      : f.resultRole === "INPUT" &&
                          f.linkedItemId === itemId &&
                          f.stockDeduct === undefined
                        ? { ...f, stockDeduct: true }
                        : f,
                  ),
                );
                return;
              }
              patch(row.id, { ...base, stockDeduct: undefined });
            }}
          />
        );
      },
    },
    {
      title: "จุดตัด Stock",
      width: 170,
      render: (_v, row) => {
        if (row.resultRole !== "INPUT" || !row.linkedItemId) {
          return <Typography.Text type="secondary">—</Typography.Text>;
        }
        return (
          <Select
            size="small"
            style={{ width: "100%" }}
            options={[
              { value: "deduct", label: "ตัด Stock" },
              { value: "record", label: "บันทึกข้อมูลอย่างเดียว" },
            ]}
            value={row.stockDeduct === false ? "record" : "deduct"}
            onChange={(v) => {
              if (v === "record") {
                patch(row.id, { stockDeduct: false });
                return;
              }
              // เลือกตัดที่ช่องนี้ → ช่องอื่นของวัตถุดิบเดียวกันเป็นบันทึกอย่างเดียว (ตัดได้ 1 จุด)
              setFields(
                fields.map((f) =>
                  f.id === row.id
                    ? { ...f, stockDeduct: true }
                    : f.resultRole === "INPUT" && f.linkedItemId === row.linkedItemId
                      ? { ...f, stockDeduct: false }
                      : f,
                ),
              );
            }}
          />
        );
      },
    },
    {
      title: "เครื่องจักร",
      width: 200,
      render: (_v, row) => (
        <Select
          size="small"
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          placeholder={equipmentIds.length ? "เลือกเครื่อง" : "เลือกเครื่องของสูตรก่อน"}
          disabled={equipmentIds.length === 0}
          options={equipmentIds.map((id) => ({
            value: id,
            label: equipmentById.get(id)?.equipmentCode ?? id,
          }))}
          value={row.equipmentId ?? undefined}
          onChange={(equipmentId) =>
            patch(row.id, {
              equipmentId: equipmentId ?? null,
              // ไม่ผูกเครื่องแล้ว ตัวเลือกที่ต้องอาศัยเครื่องต้องปิดตาม
              ...(equipmentId
                ? {}
                : { compareToCapacity: false, dataSource: "MANUAL" as const, deviceTagCode: null }),
            })
          }
        />
      ),
    },
    {
      title: "แหล่งข้อมูล",
      width: 200,
      render: (_v, row) => (
        <Space orientation="vertical" size={4} style={{ width: "100%" }}>
          <Select
            size="small"
            style={{ width: "100%" }}
            options={DATA_SOURCE_OPTIONS}
            value={row.dataSource ?? "MANUAL"}
            onChange={(dataSource) =>
              patch(row.id, {
                dataSource,
                ...(dataSource === "MANUAL" ? { deviceTagCode: null } : {}),
              })
            }
          />
          {row.dataSource === "AUTO" ? (
            <Input
              size="small"
              placeholder="Device Tag (tag_code)"
              value={row.deviceTagCode ?? ""}
              onChange={(e) => patch(row.id, { deviceTagCode: e.target.value })}
            />
          ) : null}
        </Space>
      ),
    },
    {
      title: "เทียบกำลังผลิต",
      width: 110,
      align: "center",
      render: (_v, row) => (
        <Checkbox
          disabled={
            !row.equipmentId ||
            (row.calcType === "INFORMATION" &&
              (row.infoValueKind === "TEXT" || row.infoValueKind === "QC"))
          }
          checked={Boolean(row.compareToCapacity)}
          onChange={(e) =>
            // 1 ฟิลด์ต่อเครื่อง — ติ๊กฟิลด์นี้แล้วฟิลด์อื่นของเครื่องเดียวกันถูกเอาออก
            setFields(
              fields.map((f) =>
                f.id === row.id
                  ? { ...f, compareToCapacity: e.target.checked }
                  : e.target.checked && f.equipmentId === row.equipmentId
                    ? { ...f, compareToCapacity: false }
                    : f,
              ),
            )
          }
        />
      ),
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

      <Card size="small" title="เครื่องจักรที่ใช้ในสูตรนี้">
        <Select
          mode="multiple"
          showSearch
          optionFilterProp="label"
          style={{ width: "100%" }}
          placeholder="เลือกเครื่องจักร (เลือกได้หลายเครื่อง)"
          loading={equipmentQuery.isLoading}
          value={equipmentIds}
          onChange={setEquipmentIds}
          options={equipmentList.map((e) => ({
            value: e.id,
            label: `${e.equipmentCode} — ${e.name}${e.equipmentTypeName ? ` · ${e.equipmentTypeName}` : ""}`,
          }))}
        />
        {equipmentIds.length > 0 ? (
          <Space size={[8, 4]} wrap style={{ marginTop: 8 }}>
            {equipmentIds.map((id) => (
              <Tag key={id}>
                {equipmentById.get(id)?.equipmentCode ?? id} · กำลังผลิต {capacityText(id)}
              </Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            ไม่เลือกเครื่อง = สูตรนี้ไม่ผูกเครื่องจักร (ใบสั่งผลิตทำงานแบบเดิม)
          </Typography.Text>
        )}
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 8 }}
          title="ผูกเครื่องกับแต่ละฟิลด์ที่คอลัมน์ ‘เครื่องจักร’ · ติ๊ก ‘เทียบกำลังผลิต’ ที่ฟิลด์ผลจริงของเครื่อง (หน่วยต้องตรงกับหน่วย Capacity — ผูก BOM จะเทียบหน่วยได้แม่นที่สุด) · แหล่งข้อมูล AUTO ยังไม่ทำงานจริง"
        />
      </Card>

      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={fields}
        columns={columns}
        locale={{ emptyText: "ยังไม่มีรายการ — กดเพิ่มรายการด้านล่าง" }}
        scroll={{ x: 1760 }}
      />

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setFields([...fields, emptyField(fields.length)])}
      >
        เพิ่มรายการบันทึก
      </Button>

      <Card size="small" title="การลิงก์วัตถุดิบ (BOM) กับช่องบันทึก Input">
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            วัตถุดิบทุกตัวในสูตรต้องมีช่อง Input ที่ลิงก์ไว้ (เพื่อให้ตัดสต๊อกครบ) หรือยกเว้นพร้อมเหตุผล ·
            ถ้ายังไม่ครบ บันทึกเป็นฉบับร่าง (ปิดสถานะใช้งาน) ได้ แต่เปิดใช้งานไม่ได้
          </Typography.Text>
          {unlinkedNames.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              message={`ยังไม่ได้ลิงก์ ${unlinkedNames.length} รายการ: ${unlinkedNames.join(", ")}`}
              description="บันทึกเป็นฉบับร่าง (ปิดสถานะใช้งาน) ได้ แต่ต้องลิงก์หรือยกเว้นพร้อมเหตุผลให้ครบก่อนเปิดใช้งาน"
            />
          ) : null}
          {bomLines
            .filter((l) => l.lineRole === "INPUT")
            .map((l) => {
              const isLinked = linkedInputIds.has(l.itemId);
              const ex = exemptions.find((e) => e.itemId === l.itemId);
              const name = l.label.replace(/^INPUT · /, "");
              return (
                <Space key={l.itemId} wrap size={8}>
                  <Typography.Text>{name}</Typography.Text>
                  {isLinked ? (
                    <Tag color="green">ลิงก์แล้ว</Tag>
                  ) : ex ? (
                    <Tag color="gold">ยกเว้น</Tag>
                  ) : (
                    <Tag color="red">ยังไม่ได้ลิงก์</Tag>
                  )}
                  {!isLinked ? (
                    <>
                      <Switch
                        size="small"
                        checked={Boolean(ex)}
                        checkedChildren="ไม่ต้องบันทึกรายกะ"
                        unCheckedChildren="ไม่ต้องบันทึกรายกะ"
                        onChange={(on) =>
                          setExemptions(
                            on
                              ? [...exemptions, { itemId: l.itemId, reason: "" }]
                              : exemptions.filter((e) => e.itemId !== l.itemId),
                          )
                        }
                      />
                      {ex ? (
                        <Input
                          size="small"
                          style={{ width: 280 }}
                          placeholder="เหตุผล (จำเป็น)"
                          value={ex.reason}
                          status={ex.reason.trim() ? undefined : "error"}
                          onChange={(e) =>
                            setExemptions(
                              exemptions.map((x) =>
                                x.itemId === l.itemId
                                  ? { ...x, reason: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
                </Space>
              );
            })}
        </Space>
      </Card>

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
                  {field.equipmentId ? (
                    <Tag color="geekblue">{equipmentById.get(field.equipmentId)?.equipmentCode ?? "เครื่อง"}</Tag>
                  ) : null}
                  {field.dataSource === "AUTO" ? <Tag color="purple">AUTO</Tag> : null}
                  {field.compareToCapacity ? <Tag color="green">เทียบกำลังผลิต</Tag> : null}
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
