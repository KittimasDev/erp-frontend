"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Modal,
  Statistic,
  Table,
  Tag,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { UploadOutlined } from "@ant-design/icons";

import {
  useImportLabSpecsMutation,
  usePreviewLabSpecImportMutation,
} from "@/hooks/laboratory/useLabSpecs";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/useT";
import {
  LAB_SAMPLE_TYPE_LABEL,
  type LabSpecImportAnalysis,
  type LabSpecImportResult,
  type LabSpecImportSpec,
} from "@/types/laboratory";

const ACCEPT = [".xlsx", ".csv"];

type Props = { open: boolean; onClose: () => void };

/** นำเข้า Spec: เลือกไฟล์ → ตรวจ/Preview → ยืนยัน → สรุปผล (ดาวน์โหลด Template อยู่ที่ปุ่มหน้ารายการ) */
export default function LabSpecImportModal({ open, onClose }: Props) {
  const t = useT();
  const { message } = App.useApp();
  const preview = usePreviewLabSpecImportMutation();
  const importer = useImportLabSpecsMutation();
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<LabSpecImportAnalysis | null>(null);
  const [result, setResult] = useState<LabSpecImportResult | null>(null);

  const fail = (e: unknown, fallback: string) =>
    message.error(e instanceof ApiError ? e.message : fallback);

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setResult(null);
  };

  const pick = async (next: File) => {
    const name = next.name.toLowerCase();
    if (!ACCEPT.some((ext) => name.endsWith(ext))) {
      message.error(t("รองรับเฉพาะไฟล์ .xlsx หรือ .csv"));
      return;
    }
    setFile(next);
    setAnalysis(null);
    try {
      const res = await preview.mutateAsync(next);
      setAnalysis(res.data);
    } catch (e) {
      setFile(null);
      fail(e, t("ตรวจไฟล์ไม่สำเร็จ"));
    }
  };

  const confirm = async () => {
    if (!file) return;
    try {
      const res = await importer.mutateAsync(file);
      setResult(res.data);
      setAnalysis(null);
    } catch (e) {
      fail(e, t("นำเข้าไม่สำเร็จ"));
    }
  };

  const typeText = (s: LabSpecImportSpec) =>
    `${t(LAB_SAMPLE_TYPE_LABEL[s.sampleType] ?? s.sampleType)} · ${
      s.itemCode ? `${s.itemCode} ${s.itemNameTh ?? ""}` : t("ทั้งประเภท")
    }`;

  const specColumns: ColumnsType<LabSpecImportSpec> = [
    {
      title: "Spec",
      key: "spec",
      render: (_v, s) => (
        <div>
          <strong>{s.nameTh}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>{typeText(s)}</div>
        </div>
      ),
    },
    {
      title: t("พารามิเตอร์"),
      key: "params",
      width: 110,
      align: "center",
      render: (_v, s) => s.parameters.length,
    },
    {
      title: t("สถานะ"),
      key: "st",
      width: 260,
      render: (_v, s) =>
        s.status === "OK" ? (
          <Tag color="green">{t("พร้อมนำเข้า")}</Tag>
        ) : (
          <div>
            <Tag color={s.status === "DUPLICATE" ? "orange" : "red"}>
              {s.status === "DUPLICATE"
                ? t("ซ้ำกับของเดิม")
                : t("มีข้อผิดพลาด")}
            </Tag>
            {s.status === "DUPLICATE" ? (
              <div style={{ fontSize: 12 }}>{s.messages[0]}</div>
            ) : null}
          </div>
        ),
    },
  ];

  const canConfirm = !!analysis && analysis.importableSpecCount > 0;

  return (
    <Modal
      open={open}
      title={t("นำเข้า Spec การตรวจจาก Excel / CSV")}
      width={820}
      destroyOnHidden
      afterClose={reset}
      onCancel={onClose}
      footer={
        result ? (
          <Button type="primary" onClick={onClose}>
            {t("ปิด")}
          </Button>
        ) : (
          [
            <Button key="close" onClick={onClose}>
              {t("ปิด")}
            </Button>,
            <Button
              key="ok"
              type="primary"
              disabled={!canConfirm}
              loading={importer.isPending}
              onClick={() => void confirm()}
            >
              {analysis
                ? t("ยืนยันนำเข้า {n} Spec", {
                    n: analysis.importableSpecCount.toLocaleString("th-TH"),
                  })
                : t("ยืนยันนำเข้า")}
            </Button>,
          ]
        )
      }
    >
      <p style={{ marginTop: 0, color: "#64748b" }}>
        {t(
          "1 แถว = 1 พารามิเตอร์ · Spec ที่มีหลายพารามิเตอร์ให้ใส่ประเภทตัวอย่าง รหัสสินค้าเฉพาะ และชื่อ Spec ซ้ำทุกแถว · เว้นรหัสสินค้าเฉพาะ = ใช้กับสินค้าทั้งประเภท · ประเภท/สินค้าเดียวกันมีได้หลาย Spec · ถ้ามี Spec ชื่อเดียวกันในประเภท/สินค้านั้นอยู่แล้ว ระบบจะไม่เขียนทับ · ดาวน์โหลด Template ได้จากปุ่มหน้ารายการ Spec",
        )}
      </p>
      {!result ? (
        <div style={{ marginBottom: 12 }}>
          <Upload
            accept=".xlsx,.csv,text/csv"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(next) => {
              void pick(next);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} loading={preview.isPending}>
              {file ? file.name : t("เลือกไฟล์ .xlsx / .csv")}
            </Button>
          </Upload>
        </div>
      ) : null}

      {analysis ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Statistic
              title={t("Spec ที่นำเข้าได้")}
              value={analysis.importableSpecCount}
            />
            <Statistic
              title={t("พารามิเตอร์ที่นำเข้าได้")}
              value={analysis.importableParameterCount}
            />
            <Statistic
              title={t("ซ้ำกับของเดิม")}
              value={analysis.duplicateSpecCount}
            />
            <Statistic
              title={t("Spec ที่มีข้อผิดพลาด")}
              value={analysis.errorSpecCount}
            />
          </div>
          {analysis.errorSpecCount > 0 || analysis.duplicateSpecCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={t(
                "Spec ที่ซ้ำหรือมีข้อผิดพลาดจะไม่ถูกนำเข้า (Spec ที่ผ่านนำเข้าได้ตามปกติ) — แก้ไฟล์แล้วอัปโหลดใหม่ได้",
              )}
            />
          ) : null}
          <Table
            rowKey={(s) => `${s.sampleType}-${s.itemId ?? ""}-${s.nameTh}`}
            size="small"
            columns={specColumns}
            dataSource={analysis.specs}
            pagination={{ pageSize: 6, hideOnSinglePage: true }}
            expandable={{
              rowExpandable: (s) => s.parameters.length > 0,
              expandedRowRender: (s) => (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {s.parameters.map((p) => (
                    <Tag key={p.row}>
                      {p.parameterName}
                      {p.specMin || p.specMax
                        ? ` (${p.specMin ?? "…"} – ${p.specMax ?? "…"}${p.unit ? ` ${p.unit}` : ""})`
                        : p.unit
                          ? ` (${p.unit})`
                          : ""}
                      {p.isRequired ? ` · ${t("จำเป็น")}` : ""}
                    </Tag>
                  ))}
                </div>
              ),
            }}
          />
          {analysis.errors.length > 0 ? (
            <>
              <h4 style={{ margin: "16px 0 8px" }}>
                {t("ข้อผิดพลาดรายแถว ({n} แถว)", {
                  n: analysis.errorRowCount.toLocaleString("th-TH"),
                })}
              </h4>
              <Table
                rowKey={(e) => `${e.row}-${e.message}`}
                size="small"
                columns={[
                  { title: t("เลขแถว"), dataIndex: "row", width: 72 },
                  { title: t("รายละเอียด"), dataIndex: "message" },
                ]}
                dataSource={analysis.errors}
                pagination={{ pageSize: 8, hideOnSinglePage: true }}
              />
            </>
          ) : null}
        </>
      ) : null}

      {result ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Statistic
              title={t("นำเข้าสำเร็จ (Spec)")}
              value={result.createdSpecs}
            />
            <Statistic
              title={t("พารามิเตอร์ที่นำเข้า")}
              value={result.createdParameters}
            />
            <Statistic
              title={t("ไม่สำเร็จ (Spec)")}
              value={result.failedSpecs}
            />
          </div>
          <Alert
            type={result.failedSpecs === 0 ? "success" : "warning"}
            showIcon
            style={{ marginBottom: 12 }}
            title={
              result.failedSpecs === 0
                ? t("นำเข้า Spec ครบทุกรายการ")
                : t(
                    "นำเข้าได้ {ok} จาก {all} Spec — รายการที่ไม่สำเร็จไม่ถูกบันทึก",
                    {
                      ok: result.createdSpecs.toLocaleString("th-TH"),
                      all: result.totalSpecs.toLocaleString("th-TH"),
                    },
                  )
            }
          />
          {result.failures.length > 0 ? (
            <Table
              rowKey={(f) => `${f.row}-${f.nameTh}`}
              size="small"
              columns={[
                { title: t("เลขแถว"), dataIndex: "row", width: 72 },
                { title: "Spec", dataIndex: "nameTh", width: 220 },
                { title: t("เหตุผล"), dataIndex: "reason" },
              ]}
              dataSource={result.failures}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
            />
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}
