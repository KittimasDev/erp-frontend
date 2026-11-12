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
  useImportLabSamplesMutation,
  usePreviewLabSampleImportMutation,
} from "@/hooks/laboratory/useLaboratoryQuery";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/useT";
import {
  LAB_JUDGEMENT_COLOR,
  LAB_JUDGEMENT_LABEL,
  LAB_SAMPLE_TYPE_LABEL,
  type LabSampleImportAnalysis,
  type LabSampleImportResult,
  type LabSampleImportSample,
} from "@/types/laboratory";

const ACCEPT = [".xlsx", ".csv"];

type Props = { open: boolean; onClose: () => void };

/** นำเข้าตัวอย่าง+ผลตรวจ: เลือกไฟล์ → ตรวจ/Preview → (แก้ไฟล์ถ้ามี error) → ยืนยัน → สรุปผล */
export default function LabSampleImportModal({ open, onClose }: Props) {
  const t = useT();
  const { message } = App.useApp();
  const preview = usePreviewLabSampleImportMutation();
  const importer = useImportLabSamplesMutation();
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<LabSampleImportAnalysis | null>(null);
  const [result, setResult] = useState<LabSampleImportResult | null>(null);

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

  const columns: ColumnsType<LabSampleImportSample> = [
    { title: t("ลำดับตัวอย่าง"), dataIndex: "seq", width: 100 },
    {
      title: t("ตัวอย่าง"),
      key: "sample",
      render: (_v, s) => (
        <div>
          <strong>
            {s.itemCode ? `${s.itemCode} ${s.itemNameTh ?? ""}` : "—"}
          </strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {s.sampleType
              ? t(LAB_SAMPLE_TYPE_LABEL[s.sampleType] ?? s.sampleType)
              : "—"}
            {s.specName ? ` · ${s.specName}` : ""}
            {s.collectedDate ? ` · ${s.collectedDate}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: t("ผลตรวจ"),
      key: "n",
      width: 80,
      align: "center",
      render: (_v, s) => s.results.length,
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
                ? t("ซ้ำกับข้อมูลเดิม")
                : t("มีข้อผิดพลาด")}
            </Tag>
            {s.status === "DUPLICATE" ? (
              <div style={{ fontSize: 12 }}>{s.messages[0]}</div>
            ) : null}
          </div>
        ),
    },
  ];

  const hasErrors = !!analysis && analysis.errorSampleCount > 0;
  const canConfirm =
    !!analysis && !hasErrors && analysis.importableSampleCount > 0;

  return (
    <Modal
      open={open}
      title={t("นำเข้าตัวอย่างและผลตรวจจาก Excel / CSV")}
      width={900}
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
                ? t("ยืนยันนำเข้า {n} ตัวอย่าง", {
                    n: analysis.importableSampleCount.toLocaleString("th-TH"),
                  })
                : t("ยืนยันนำเข้า")}
            </Button>,
          ]
        )
      }
    >
      <p style={{ marginTop: 0, color: "#64748b" }}>
        {t(
          "1 แถว = 1 ผลตรวจ · แถวที่ลำดับตัวอย่างเดียวกันรวมเป็นตัวอย่างเดียว (ระบบสร้างเลข LS-... ให้เอง) · ไฟล์เดียวมีได้หลายสินค้า/หลาย Spec · หน่วย Min/Max และผลผ่าน–ไม่ผ่านระบบดึงจาก Spec · ถ้ามีข้อผิดพลาดแม้แถวเดียวจะไม่บันทึกอะไร ให้แก้ไฟล์แล้วอัปโหลดใหม่ · ไม่อนุมัติผล QC และไม่เปลี่ยนสถานะ Lot · ดาวน์โหลด Template ได้จากปุ่มหน้ารายการ",
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
              title={t("ตัวอย่างที่นำเข้าได้")}
              value={analysis.importableSampleCount}
            />
            <Statistic
              title={t("ผลตรวจที่นำเข้าได้")}
              value={analysis.importableResultCount}
            />
            <Statistic
              title={t("ซ้ำกับข้อมูลเดิม")}
              value={analysis.duplicateSampleCount}
            />
            <Statistic
              title={t("ตัวอย่างที่มีข้อผิดพลาด")}
              value={analysis.errorSampleCount}
            />
          </div>
          {hasErrors ? (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title={t("ไฟล์มีข้อผิดพลาด — แก้ไขไฟล์แล้วอัปโหลดใหม่ก่อนยืนยันนำเข้า")}
            />
          ) : null}
          {analysis.duplicateSampleCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title={t(
                "ตัวอย่างที่ซ้ำกับข้อมูลเดิมจะไม่ถูกนำเข้าซ้ำ (ข้ามให้อัตโนมัติ)",
              )}
            />
          ) : null}
          <Table
            rowKey="seq"
            size="small"
            columns={columns}
            dataSource={analysis.samples}
            pagination={{ pageSize: 6, hideOnSinglePage: true }}
            expandable={{
              rowExpandable: (s) => s.results.length > 0,
              expandedRowRender: (s) => (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {s.results.map((r) => (
                    <Tag key={r.row} color={LAB_JUDGEMENT_COLOR[r.judgement]}>
                      {r.parameterName}: {r.resultValue}
                      {r.unit ? ` ${r.unit}` : ""} ·{" "}
                      {t(LAB_JUDGEMENT_LABEL[r.judgement] ?? r.judgement)}
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
                  { title: t("เลขแถว"), dataIndex: "row", width: 80 },
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
              title={t("สร้างตัวอย่าง")}
              value={result.createdSamples}
            />
            <Statistic
              title={t("บันทึกผลตรวจ")}
              value={result.createdResults}
            />
            <Statistic
              title={t("ข้ามเพราะซ้ำ")}
              value={result.skippedDuplicates}
            />
          </div>
          <Alert
            type="success"
            showIcon
            style={{ marginBottom: 12 }}
            title={t("นำเข้าสำเร็จ — ตัวอย่างอยู่สถานะกำลังตรวจ รออนุมัติผลตามขั้นตอนปกติ")}
          />
          <Table
            rowKey="sampleNo"
            size="small"
            columns={[
              { title: t("ลำดับตัวอย่าง"), dataIndex: "seq", width: 120 },
              { title: t("เลขตัวอย่าง"), dataIndex: "sampleNo" },
              { title: t("ผลตรวจ"), dataIndex: "results", width: 100 },
            ]}
            dataSource={result.samples}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
          />
        </>
      ) : null}
    </Modal>
  );
}
