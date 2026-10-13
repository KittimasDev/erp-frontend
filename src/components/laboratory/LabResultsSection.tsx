"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import {
  useAddLabResultsMutation,
  useDeleteLabResultMutation,
  useUpdateLabResultMutation,
} from "@/hooks/laboratory/useLaboratoryQuery";
import { useResolveLabSpecQuery } from "@/hooks/laboratory/useLabSpecs";
import {
  LAB_JUDGEMENT_COLOR,
  LAB_JUDGEMENT_LABEL,
  type AddLabResultLine,
  type LabSample,
  type LabTestResult,
} from "@/types/laboratory";

type Props = {
  sample: LabSample;
  /** แก้ผลได้ (สิทธิ์ + สถานะยังไม่ตัดสิน) */
  editable: boolean;
};

// ─── เพิ่มผลตรวจ: พารามิเตอร์จาก Spec + แถวอิสระ ─────────────────────────────

type EntryValues = {
  spec: Record<string, string | undefined>;
  extra?: Array<{
    parameterName?: string;
    resultValue?: string;
    unit?: string;
    specMin?: string;
    specMax?: string;
  }>;
};

function ResultEntryModal({
  sample,
  onClose,
}: {
  sample: LabSample;
  onClose: () => void;
}) {
  const [form] = Form.useForm<EntryValues>();
  const specQuery = useResolveLabSpecQuery({
    sampleType: sample.sampleType,
    itemId: sample.itemId,
  });
  const add = useAddLabResultsMutation(sample.id);
  const spec = specQuery.data?.data;

  // พารามิเตอร์ที่ยังไม่มีผล — ไม่เสนอซ้ำ
  const entered = new Set(
    (sample.results ?? []).map((r) => r.specParameterId).filter(Boolean),
  );
  const pending = (spec?.parameters ?? []).filter((p) => !entered.has(p.id));

  const submit = () => {
    const v = form.getFieldsValue();
    const lines: AddLabResultLine[] = [];
    for (const p of pending) {
      const value = v.spec?.[p.id]?.trim();
      if (value) {
        lines.push({
          specParameterId: p.id,
          parameterName: p.parameterName,
          resultValue: value,
        });
      }
    }
    for (const e of v.extra ?? []) {
      if (e?.parameterName?.trim() && e.resultValue?.trim()) {
        lines.push({
          parameterName: e.parameterName.trim(),
          resultValue: e.resultValue.trim(),
          unit: e.unit?.trim() || undefined,
          specMin: e.specMin?.trim() || undefined,
          specMax: e.specMax?.trim() || undefined,
        });
      }
    }
    if (lines.length === 0) return;
    add.mutate(lines, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      width={720}
      title="บันทึกผลตรวจ"
      okText="บันทึกผล"
      cancelText="ยกเลิก"
      confirmLoading={add.isPending}
      onCancel={onClose}
      onOk={submit}
    >
      <Form form={form} layout="vertical">
        {spec ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              ตาม Spec: {spec.nameTh}
            </div>
            {pending.length === 0 ? (
              <p style={{ color: "#8a94a6" }}>
                บันทึกครบทุกพารามิเตอร์ของ Spec แล้ว
              </p>
            ) : (
              pending.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ flex: 3 }}>
                    {p.parameterName}
                    {p.isRequired ? (
                      <Tag color="red" style={{ marginLeft: 6 }}>
                        จำเป็น
                      </Tag>
                    ) : null}
                    <div style={{ fontSize: 12, color: "#8a94a6" }}>
                      {p.specMin || p.specMax
                        ? `เกณฑ์ ${p.specMin ?? "…"} – ${p.specMax ?? "…"}`
                        : "ยังไม่ตั้งเกณฑ์"}
                      {p.unit ? ` ${p.unit}` : ""}
                    </div>
                  </div>
                  <Form.Item
                    name={["spec", p.id]}
                    style={{ flex: 2, marginBottom: 0 }}
                  >
                    <Input placeholder="ผลที่วัดได้" maxLength={100} />
                  </Form.Item>
                </div>
              ))
            )}
          </>
        ) : (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            title="ยังไม่มี Spec ของประเภท/สินค้านี้"
            description="กรอกพารามิเตอร์และเกณฑ์เองด้านล่างได้ หรือให้ผู้ดูแลตั้ง Spec ที่หน้า Spec การตรวจ"
          />
        )}

        <div style={{ fontWeight: 600, margin: "12px 0 6px" }}>
          พารามิเตอร์อื่น (กรอกเอง)
        </div>
        <Form.List name="extra">
          {(fields, { add: addRow, remove }) => (
            <>
              {fields.map((field) => (
                <div
                  key={field.key}
                  style={{ display: "flex", gap: 6, alignItems: "flex-start" }}
                >
                  <Form.Item
                    name={[field.name, "parameterName"]}
                    style={{ flex: 3 }}
                  >
                    <Input placeholder="พารามิเตอร์" maxLength={255} />
                  </Form.Item>
                  <Form.Item
                    name={[field.name, "resultValue"]}
                    style={{ flex: 2 }}
                  >
                    <Input placeholder="ผล" maxLength={100} />
                  </Form.Item>
                  <Form.Item name={[field.name, "unit"]} style={{ flex: 1 }}>
                    <Input placeholder="หน่วย" maxLength={50} />
                  </Form.Item>
                  <Form.Item name={[field.name, "specMin"]} style={{ flex: 1 }}>
                    <Input placeholder="Min" maxLength={100} />
                  </Form.Item>
                  <Form.Item name={[field.name, "specMax"]} style={{ flex: 1 }}>
                    <Input placeholder="Max" maxLength={100} />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label="ลบแถว"
                    onClick={() => remove(field.name)}
                  />
                </div>
              ))}
              <Button icon={<PlusOutlined />} onClick={() => addRow({})}>
                เพิ่มแถว
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

// ─── แก้ผลบรรทัดเดียว ────────────────────────────────────────────────────────

function ResultEditModal({
  sampleId,
  result,
  onClose,
}: {
  sampleId: string;
  result: LabTestResult;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{
    resultValue: string;
    unit?: string;
    specMin?: string;
    specMax?: string;
    remark?: string;
  }>();
  const update = useUpdateLabResultMutation(sampleId);
  return (
    <Modal
      open
      title={`แก้ผล — ${result.parameterName}`}
      okText="บันทึก"
      cancelText="ยกเลิก"
      confirmLoading={update.isPending}
      onCancel={onClose}
      onOk={() =>
        void form.validateFields().then((v) =>
          update.mutate(
            {
              resultId: result.id,
              body: {
                resultValue: v.resultValue.trim(),
                unit: v.unit?.trim() ?? "",
                specMin: v.specMin?.trim() ?? "",
                specMax: v.specMax?.trim() ?? "",
                remark: v.remark?.trim() ?? "",
              },
            },
            { onSuccess: onClose },
          ),
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          resultValue: result.resultValue,
          unit: result.unit,
          specMin: result.specMin,
          specMax: result.specMax,
          remark: result.remark,
        }}
      >
        <Form.Item
          name="resultValue"
          label="ผลที่วัดได้"
          rules={[{ required: true, message: "ใส่ผล" }]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <div style={{ display: "flex", gap: 8 }}>
          <Form.Item name="unit" label="หน่วย" style={{ flex: 1 }}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="specMin" label="Min" style={{ flex: 1 }}>
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="specMax" label="Max" style={{ flex: 1 }}>
            <Input maxLength={100} />
          </Form.Item>
        </div>
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── ตารางผลตรวจ ─────────────────────────────────────────────────────────────

export default function LabResultsSection({ sample, editable }: Props) {
  const remove = useDeleteLabResultMutation(sample.id);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LabTestResult | null>(null);
  const specQuery = useResolveLabSpecQuery(
    { sampleType: sample.sampleType, itemId: sample.itemId },
    editable,
  );
  const results = useMemo(() => sample.results ?? [], [sample.results]);

  const fails = results.filter((r) => r.judgement === "FAIL");
  const missingRequired = useMemo(() => {
    const have = new Set(results.map((r) => r.specParameterId).filter(Boolean));
    return (specQuery.data?.data?.parameters ?? []).filter(
      (p) => p.isRequired && !have.has(p.id),
    );
  }, [results, specQuery.data]);

  const columns: ColumnsType<LabTestResult> = [
    { title: "ลำดับ", width: 56, render: (_v, _r, i) => i + 1 },
    { title: "พารามิเตอร์", dataIndex: "parameterName" },
    {
      title: "ผลตรวจ",
      dataIndex: "resultValue",
      render: (v: string, r) =>
        r.judgement === "FAIL" ? (
          <strong style={{ color: "#cf1322" }}>{v}</strong>
        ) : (
          v
        ),
    },
    { title: "หน่วย", dataIndex: "unit", render: (v?: string) => v ?? "—" },
    {
      title: "Min",
      dataIndex: "specMin",
      width: 80,
      render: (v?: string) => v ?? "—",
    },
    {
      title: "Max",
      dataIndex: "specMax",
      width: 80,
      render: (v?: string) => v ?? "—",
    },
    {
      title: "ผลตัดสิน",
      dataIndex: "judgement",
      width: 110,
      render: (v: string) => (
        <Tag color={LAB_JUDGEMENT_COLOR[v]}>{LAB_JUDGEMENT_LABEL[v] ?? v}</Tag>
      ),
    },
  ];
  if (editable) {
    columns.push({
      title: "",
      key: "act",
      width: 90,
      render: (_v, r) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-label="แก้ผล"
            onClick={() => setEditing(r)}
          />
          <Popconfirm
            title="ลบผลบรรทัดนี้?"
            okText="ลบ"
            cancelText="ยกเลิก"
            onConfirm={() => remove.mutate(r.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="ลบผล"
            />
          </Popconfirm>
        </div>
      ),
    });
  }

  return (
    <div>
      {fails.length > 0 ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
          title={`มี ${fails.length} พารามิเตอร์ไม่ผ่านเกณฑ์: ${fails.map((r) => r.parameterName).join(", ")}`}
          description="อนุมัติได้ แต่ต้องระบุเหตุผล · หรือตีกลับเพื่อปฏิเสธ Lot"
        />
      ) : null}
      {editable && missingRequired.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          title={`ยังไม่มีผลพารามิเตอร์ที่จำเป็น: ${missingRequired.map((p) => p.parameterName).join(", ")}`}
          description="เตือนเท่านั้น ไม่บล็อกการอนุมัติ"
        />
      ) : null}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={results}
        pagination={false}
        size="small"
        locale={{ emptyText: "ยังไม่มีผลตรวจ" }}
      />
      {editable ? (
        <Button
          style={{ marginTop: 8 }}
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAdding(true)}
        >
          บันทึกผลตรวจ
        </Button>
      ) : null}
      {adding ? (
        <ResultEntryModal sample={sample} onClose={() => setAdding(false)} />
      ) : null}
      {editing ? (
        <ResultEditModal
          key={editing.id}
          sampleId={sample.id}
          result={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
