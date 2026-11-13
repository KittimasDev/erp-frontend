"use client";

import { useMemo, useState } from "react";
import { Alert, App, Button, Input, Popconfirm, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";

import {
  useDeleteLabResultMutation,
  useSaveLabResultsMutation,
  useSetLabSampleSpecMutation,
} from "@/hooks/laboratory/useLaboratoryQuery";
import { useLabSpecsQuery } from "@/hooks/laboratory/useLabSpecs";
import { useT } from "@/lib/i18n/useT";
import { labResultSnapshot } from "./labResultSnapshot";
import {
  LAB_JUDGEMENT_COLOR,
  LAB_JUDGEMENT_LABEL,
  LAB_SAMPLE_TYPE_LABEL,
  type AddLabResultLine,
  type LabSample,
  type LabSpecParameter,
  type LabTestResult,
} from "@/types/laboratory";

type Props = {
  sample: LabSample;
  /** แก้ผลได้ (สิทธิ์ + สถานะยังไม่ตัดสิน) */
  editable: boolean;
};

type RowDraft = { value: string; remark: string };

const dash = (v?: string) => (v && v.length > 0 ? v : "—");

const isNumeric = (text: string) =>
  text.trim() !== "" && Number.isFinite(Number(text.trim().replace(/,/g, "")));

const hasCriteria = (p: LabSpecParameter) => Boolean(p.specMin || p.specMax);

// ─── ผลตรวจเก่าที่ไม่ผูกพารามิเตอร์ใน Spec (กรอกเองเดิม) — อ่านอย่างเดียว ──────────

function LegacyResults({
  sampleId,
  results,
  editable,
}: {
  sampleId: string;
  results: LabTestResult[];
  editable: boolean;
}) {
  const t = useT();
  const remove = useDeleteLabResultMutation(sampleId);
  if (results.length === 0) return null;
  const columns: ColumnsType<LabTestResult> = [
    { title: t("พารามิเตอร์"), dataIndex: "parameterName" },
    { title: t("ผลตรวจ"), dataIndex: "resultValue" },
    { title: t("หน่วย"), dataIndex: "unit", render: dash },
    { title: "Min", dataIndex: "specMin", width: 80, render: dash },
    { title: "Max", dataIndex: "specMax", width: 80, render: dash },
    {
      title: t("ผลตัดสิน"),
      dataIndex: "judgement",
      width: 110,
      render: (v: string) => (
        <Tag color={LAB_JUDGEMENT_COLOR[v]}>{t(LAB_JUDGEMENT_LABEL[v] ?? v)}</Tag>
      ),
    },
  ];
  if (editable) {
    columns.push({
      title: "",
      key: "act",
      width: 60,
      render: (_v, r) => (
        <Popconfirm
          title={t("ลบผลบรรทัดนี้?")}
          okText={t("ลบ")}
          cancelText={t("ยกเลิก")}
          onConfirm={() => remove.mutate(r.id)}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            aria-label={t("ลบผล")}
          />
        </Popconfirm>
      ),
    });
  }
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {t("ผลตรวจเดิม (บันทึกก่อนใช้ Spec)")}
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={results}
        pagination={false}
        size="small"
      />
    </div>
  );
}

// ─── ตัวอย่างเก่าที่ยังไม่มี Spec: เลือก Spec ก่อนบันทึกผลใหม่ ─────────────────────

function SpecPicker({ sample }: { sample: LabSample }) {
  const t = useT();
  const specs = useLabSpecsQuery({ isActive: true });
  const setSpec = useSetLabSampleSpecMutation(sample.id);
  const [specId, setSpecId] = useState<string | undefined>();
  const options = useMemo(
    () =>
      (specs.data?.data ?? []).map((s) => ({
        value: s.id,
        label: `${s.nameTh} · ${t(LAB_SAMPLE_TYPE_LABEL[s.sampleType] ?? s.sampleType)}${
          s.itemCode ? ` · ${s.itemCode}` : ""
        }`,
      })),
    [specs.data, t],
  );
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 8 }}
      title={t("ตัวอย่างนี้ยังไม่ได้เลือก Spec")}
      description={
        <div>
          <p style={{ margin: "0 0 8px" }}>
            {t("เลือก Spec ก่อนบันทึกผลตรวจใหม่ — ผลตรวจเดิมที่บันทึกไว้จะไม่ถูกแก้ไข")}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 320 }}
              placeholder={t("เลือก Spec การตรวจ")}
              loading={specs.isLoading}
              options={options}
              value={specId}
              onChange={setSpecId}
            />
            <Button
              type="primary"
              disabled={!specId}
              loading={setSpec.isPending}
              onClick={() => specId && setSpec.mutate(specId)}
            >
              {t("ใช้ Spec นี้")}
            </Button>
          </div>
        </div>
      }
    />
  );
}

// ─── ตารางกรอกผลตามพารามิเตอร์ของ Spec ───────────────────────────────────────

function SpecResultsTable({
  sample,
  editable,
  byParam,
}: {
  sample: LabSample;
  editable: boolean;
  byParam: Map<string, LabTestResult>;
}) {
  const t = useT();
  const { message } = App.useApp();
  const save = useSaveLabResultsMutation(sample.id);
  const remove = useDeleteLabResultMutation(sample.id);
  const spec = sample.spec!;

  const [draft, setDraft] = useState<Record<string, RowDraft>>(() => {
    const init: Record<string, RowDraft> = {};
    for (const p of spec.parameters) {
      const r = byParam.get(p.id);
      init[p.id] = { value: r?.resultValue ?? "", remark: r?.remark ?? "" };
    }
    return init;
  });
  const patch = (id: string, change: Partial<RowDraft>) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...change } }));

  const missingRequired = spec.parameters.filter(
    (p) => p.isRequired && !byParam.has(p.id),
  );

  const submit = () => {
    const adds: AddLabResultLine[] = [];
    const updates: Array<{
      resultId: string;
      body: { resultValue?: string; remark?: string };
    }> = [];
    for (const p of spec.parameters) {
      const d = draft[p.id];
      const value = d.value.trim();
      const remark = d.remark.trim();
      const existing = byParam.get(p.id);
      if (existing) {
        if (!value) {
          message.error(
            t("{name}: ผลตรวจห้ามว่าง (ลบผลด้วยปุ่มถังขยะ)", {
              name: p.parameterName,
            }),
          );
          return;
        }
        if (hasCriteria(p) && !isNumeric(value)) {
          message.error(
            t("{name}: ต้องกรอกเป็นตัวเลข", { name: p.parameterName }),
          );
          return;
        }
        const body: { resultValue?: string; remark?: string } = {};
        if (value !== existing.resultValue) body.resultValue = value;
        if (remark !== (existing.remark ?? "")) body.remark = remark;
        if (Object.keys(body).length > 0) {
          updates.push({ resultId: existing.id, body });
        }
      } else if (value) {
        if (hasCriteria(p) && !isNumeric(value)) {
          message.error(
            t("{name}: ต้องกรอกเป็นตัวเลข", { name: p.parameterName }),
          );
          return;
        }
        adds.push({
          specParameterId: p.id,
          resultValue: value,
          remark: remark || undefined,
        });
      }
    }
    if (adds.length === 0 && updates.length === 0) {
      message.info(t("ยังไม่มีผลตรวจที่เปลี่ยนแปลง"));
      return;
    }
    save.mutate({ adds, updates });
  };

  const columns: ColumnsType<LabSpecParameter> = [
    { title: t("ลำดับ"), width: 56, render: (_v, _p, i) => i + 1 },
    {
      title: t("พารามิเตอร์"),
      key: "name",
      // มีผลแล้ว = ชื่อ ณ เวลาที่บันทึก (Snapshot) · ยังไม่มีผล = ชื่อใน Spec ปัจจุบัน (แถวสำหรับกรอก)
      render: (_v, p) => (
        <span>
          {byParam.get(p.id)?.parameterName ?? p.parameterName}
          {p.isRequired ? (
            <Tag color="red" style={{ marginLeft: 6 }}>
              {t("จำเป็น")}
            </Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: t("ผลตรวจ"),
      key: "value",
      width: 180,
      render: (_v, p) => {
        const r = byParam.get(p.id);
        if (!editable) {
          return r?.judgement === "FAIL" ? (
            <strong style={{ color: "#cf1322" }}>{r.resultValue}</strong>
          ) : (
            dash(r?.resultValue)
          );
        }
        return (
          <Input
            value={draft[p.id]?.value}
            maxLength={100}
            placeholder={t("ผลที่วัดได้")}
            status={r?.judgement === "FAIL" ? "error" : undefined}
            onChange={(e) => patch(p.id, { value: e.target.value })}
          />
        );
      },
    },
    // หน่วย/Min/Max: ผลที่บันทึกแล้วใช้ค่า Snapshot ของผลนั้น (ตรงกับผลตัดสินและ COA)
    // เฉพาะแถวที่ยังไม่มีผลถึงจะแสดงเกณฑ์ของ Spec ปัจจุบัน
    {
      title: t("หน่วย"),
      key: "unit",
      width: 90,
      render: (_v, p) => {
        const r = byParam.get(p.id);
        return r ? labResultSnapshot(r).unit : dash(p.unit);
      },
    },
    {
      title: "Min",
      key: "specMin",
      width: 80,
      render: (_v, p) => {
        const r = byParam.get(p.id);
        return r ? labResultSnapshot(r).specMin : dash(p.specMin);
      },
    },
    {
      title: "Max",
      key: "specMax",
      width: 80,
      render: (_v, p) => {
        const r = byParam.get(p.id);
        return r ? labResultSnapshot(r).specMax : dash(p.specMax);
      },
    },
    {
      title: t("ผลตัดสิน"),
      key: "judgement",
      width: 110,
      render: (_v, p) => {
        const r = byParam.get(p.id);
        if (!r) return "—";
        return (
          <Tag color={LAB_JUDGEMENT_COLOR[r.judgement]}>
            {t(LAB_JUDGEMENT_LABEL[r.judgement] ?? r.judgement)}
          </Tag>
        );
      },
    },
    {
      title: t("หมายเหตุ"),
      key: "remark",
      width: 180,
      render: (_v, p) =>
        editable ? (
          <Input
            value={draft[p.id]?.remark}
            maxLength={2000}
            onChange={(e) => patch(p.id, { remark: e.target.value })}
          />
        ) : (
          dash(byParam.get(p.id)?.remark)
        ),
    },
  ];
  if (editable) {
    columns.push({
      title: "",
      key: "act",
      width: 56,
      render: (_v, p) => {
        const r = byParam.get(p.id);
        return r ? (
          <Popconfirm
            title={t("ลบผลบรรทัดนี้?")}
            okText={t("ลบ")}
            cancelText={t("ยกเลิก")}
            onConfirm={() => remove.mutate(r.id)}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={t("ลบผล")}
            />
          </Popconfirm>
        ) : null;
      },
    });
  }

  return (
    <>
      {editable && missingRequired.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          title={t("ยังไม่มีผลพารามิเตอร์ที่จำเป็น: {names}", {
            names: missingRequired.map((p) => p.parameterName).join(", "),
          })}
          description={t("เตือนเท่านั้น ไม่บล็อกการอนุมัติ")}
        />
      ) : null}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={spec.parameters}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
        locale={{ emptyText: t("Spec นี้ยังไม่มีพารามิเตอร์") }}
      />
      {editable && spec.parameters.length > 0 ? (
        <Button
          style={{ marginTop: 8 }}
          type="primary"
          icon={<SaveOutlined />}
          loading={save.isPending}
          onClick={submit}
        >
          {t("บันทึกผลตรวจ")}
        </Button>
      ) : null}
    </>
  );
}

// ─── ส่วนผลตรวจ ───────────────────────────────────────────────────────────────

export default function LabResultsSection({ sample, editable }: Props) {
  const t = useT();
  const results = useMemo(() => sample.results ?? [], [sample.results]);
  const spec = sample.spec;

  const paramIds = useMemo(
    () => new Set((spec?.parameters ?? []).map((p) => p.id)),
    [spec],
  );
  const byParam = useMemo(() => {
    const m = new Map<string, LabTestResult>();
    for (const r of results) {
      if (r.specParameterId && paramIds.has(r.specParameterId)) {
        m.set(r.specParameterId, r);
      }
    }
    return m;
  }, [results, paramIds]);
  const legacy = useMemo(
    () => results.filter((r) => !isLinked(r, byParam)),
    [results, byParam],
  );

  const fails = results.filter((r) => r.judgement === "FAIL");

  return (
    <div>
      {spec ? (
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "#8a94a6" }}>{t("Spec ที่เลือก")}: </span>
          <strong>{spec.nameTh}</strong>
          {!spec.isActive ? (
            <Tag style={{ marginLeft: 8 }}>{t("ปิดใช้งาน")}</Tag>
          ) : null}
        </div>
      ) : editable ? (
        <SpecPicker sample={sample} />
      ) : (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 8 }}
          title={t("ตัวอย่างนี้ไม่มี Spec (ข้อมูลเดิม)")}
        />
      )}
      {fails.length > 0 ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 8 }}
          title={t("มี {n} พารามิเตอร์ไม่ผ่านเกณฑ์: {names}", {
            n: fails.length,
            names: fails.map((r) => r.parameterName).join(", "),
          })}
          description={t("อนุมัติได้ แต่ต้องระบุเหตุผล · หรือตีกลับเพื่อปฏิเสธ Lot")}
        />
      ) : null}
      {spec ? (
        <SpecResultsTable
          key={`${sample.id}-${sample.updatedAt}-${results.length}`}
          sample={sample}
          editable={editable}
          byParam={byParam}
        />
      ) : null}
      <LegacyResults
        sampleId={sample.id}
        results={legacy}
        editable={editable}
      />
      {!spec && results.length === 0 && !editable ? (
        <p style={{ color: "#8a94a6" }}>{t("ยังไม่มีผลตรวจ")}</p>
      ) : null}
    </div>
  );
}

/** ผลที่ผูกพารามิเตอร์ของ Spec ปัจจุบันแล้ว (อยู่ใน byParam) */
function isLinked(r: LabTestResult, byParam: Map<string, LabTestResult>) {
  return Boolean(r.specParameterId && byParam.get(r.specParameterId)?.id === r.id);
}
