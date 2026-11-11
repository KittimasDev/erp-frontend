"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { App, Button, Input, Modal, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  ExperimentOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { useLabSampleQuery } from "@/hooks/laboratory/useLaboratoryQuery";
import { getLabSampleCoa, getLabSampleQrCode } from "@/lib/api/laboratory";
import { getAccessToken } from "@/lib/auth/token";
import { ApiError } from "@/lib/api/client";
import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import LotQcModal from "@/components/inventory/LotQcModal";
import { useReissueLabCoaMutation } from "@/hooks/laboratory/useLaboratoryQuery";
import { getScreenActionPermissions } from "@/lib/auth/permissions-access";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import type { LabCoa } from "@/types/laboratory";
import {
  labCoaStatusLabel,
  labSampleStatusLabel,
  LAB_SAMPLE_STATUS_COLOR,
  LAB_SAMPLE_TYPE_LABEL,
  LOT_QC_COLOR,
  LOT_QC_LABEL,
} from "@/types/laboratory";
import LabResultsSection from "./LabResultsSection";
import LabSignModal from "./LabSignModal";
import styles from "./LabSampleDetailPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/BBBB HH:mm");
}

export default function LabSampleDetailPage({ id }: Props) {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const { message } = App.useApp();
  const query = useLabSampleQuery(id);
  const data = query.data?.data;
  const { canEdit, canApprove } = getScreenActionPermissions("LAB_SAMPLES");
  const [signAction, setSignAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [lotModal, setLotModal] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);
  const [reissueReason, setReissueReason] = useState("");
  const reissue = useReissueLabCoaMutation(id);

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> {t("กำลังโหลด...")}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        {t("ไม่พบตัวอย่าง")}
        <div style={{ marginTop: 12 }}>
          <Link href="/laboratory/samples">{t("กลับรายการ")}</Link>
        </div>
      </div>
    );
  }

  const decided = data.status === "APPROVED" || data.status === "REJECTED";
  const editable = canEdit && !decided;
  const coas = data.coas ?? [];
  const currentCoa = coas.find((c) => c.status === "ISSUED");

  const coaColumns: ColumnsType<LabCoa> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เลขที่ COA"),
      dataIndex: "coaNo",
      render: (v: string, r) => (
        <span>
          {v} <Tag>{t("ฉบับที่ {n}", { n: r.version })}</Tag>
        </span>
      ),
    },
    {
      title: t("ออกเมื่อ"),
      dataIndex: "issuedAt",
      width: 140,
      render: formatDateTime,
    },
    {
      title: t("ผู้ออก"),
      dataIndex: "issuedByName",
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("สถานะ"),
      key: "st",
      render: (_v, r) =>
        r.status === "VOIDED" ? (
          <span>
            <Tag color="default">{labCoaStatusLabel("VOIDED", lang)}</Tag> {r.voidReason}
          </span>
        ) : (
          <Tag color="success">{labCoaStatusLabel("ISSUED", lang)}</Tag>
        ),
    },
  ];

  const printCoa = async () => {
    try {
      const token = getAccessToken();
      const [coaRes, qrRes] = await Promise.all([
        getLabSampleCoa(token, id),
        getLabSampleQrCode(token, id).catch(() => null),
      ]);
      const coa = coaRes.data;
      const { generateLabCoaPdf } = await import("@/utils/generateLabCoaPdf");
      await generateLabCoaPdf({
        sampleNo: coa.sample.sampleNo,
        sampleType: coa.sample.sampleType,
        collectedDate: formatDate(coa.sample.collectedDate),
        referenceDocNo: coa.sample.referenceDocNo ?? "—",
        approvedByName: coa.approvedByName ?? "—",
        approvedAt: formatDateTime(coa.approvedAt),
        remark: [
          coa.sample.reviewRemark?.trim() || coa.sample.remark?.trim() || "",
          coa.sample.failApproveReason
            ? `มีค่านอกเกณฑ์ (✗) — เหตุผลที่อนุมัติ: ${coa.sample.failApproveReason}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
        qrCodeDataUri: qrRes?.data.qrCodeDataUri,
        coaNo: coa.coaNo,
        coaVersion: coa.coaVersion,
        signatureNote: coa.signature
          ? `ลงนามอิเล็กทรอนิกส์ ${formatDateTime(coa.signature.signedAt)}`
          : undefined,
        results: (coa.sample.results ?? []).map((r) => ({
          parameterName: r.parameterName,
          resultValue: r.resultValue,
          unit: r.unit ?? "—",
          specMin: r.specMin ?? "—",
          specMax: r.specMax ?? "—",
          judgement: r.judgement,
        })),
      });
      message.success(t("เปิด PDF COA แล้ว"));
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : t("พิมพ์ COA ไม่สำเร็จ"),
      );
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Laboratory · Sample"
        icon={<ExperimentOutlined />}
        title={data.sampleNo}
        subtitle={<>{data.sampleType} · {formatDate(data.collectedDate)} ·{" "}
            {labSampleStatusLabel(data.status, lang)}</>}
        actions={
          <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/laboratory/samples")}
          >
            {t("กลับ")}
          </Button>
          {canApprove && data.status === "TESTING" ? (
            <>
              <Button danger onClick={() => setSignAction("reject")}>
                {t("ตีกลับผลตรวจ")}
              </Button>
              <Button type="primary" onClick={() => setSignAction("approve")}>
                {t("อนุมัติผลตรวจ")}
              </Button>
            </>
          ) : null}
          {data.status === "APPROVED" ? (
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => void printCoa()}
            >
              {t("พิมพ์ COA")}
            </Button>
          ) : null}
          </>
        }
      />

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ข้อมูลตัวอย่าง")}</h2>
              <Tag
                color={LAB_SAMPLE_STATUS_COLOR[data.status] ?? "default"}
              >
                {labSampleStatusLabel(data.status, lang)}
              </Tag>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เลขที่")}</span>
                <div className={styles.metaValue}>{data.sampleNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ประเภท")}</span>
                <div className={styles.metaValue}>
                  {t(LAB_SAMPLE_TYPE_LABEL[data.sampleType] ?? data.sampleType)}
                </div>
              </div>
              {data.lotNo ? (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>{t("สินค้า / Lot")}</span>
                  <div className={styles.metaValue}>
                    {data.itemNameTh ?? data.itemCode ?? "—"}
                    <div style={{ fontSize: 12 }}>
                      <Link href="/inventory/lots">Lot {data.lotNo}</Link>
                      {data.batchNo ? ` · Batch ${data.batchNo}` : ""}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("วันที่เก็บ")}</span>
                <div className={styles.metaValue}>
                  {formatDate(data.collectedDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("เอกสารอ้างอิง")}</span>
                <div className={styles.metaValue}>
                  {data.referenceDocNo ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("หมายเหตุ")}</span>
                <div className={styles.metaValue}>{data.remark || "—"}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>{t("ผลรีวิว")}</span>
                <div className={styles.metaValue}>
                  {data.reviewRemark || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ผลตรวจ")}</h2>
            </div>
            <LabResultsSection sample={data} editable={editable} />
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("ไฟล์แนบ / รูปภาพผลตรวจ")}</h2>
            </div>
            <DocumentAttachmentsPanel
              documentType="LAB_SAMPLE"
              documentId={data.id}
              canEdit={editable}
              emptyText={t("ยังไม่มีไฟล์แนบ (ผลวิเคราะห์ ภาพถ่ายตัวอย่าง ฯลฯ)")}
              uploadLabel={t("แนบไฟล์ / รูปภาพ")}
            />
          </div>

          {data.lotNo ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("สถานะสินค้า (Lot)")}</h2>
              </div>
              <p style={{ margin: "0 0 8px" }}>
                {data.itemNameTh ?? data.itemCode} · Lot {data.lotNo}
                {data.batchNo ? ` · Batch ${data.batchNo}` : ""} ·{" "}
                <Tag color={LOT_QC_COLOR[data.lotQcStatus ?? ""]}>
                  {t(
                    LOT_QC_LABEL[data.lotQcStatus ?? ""] ??
                      data.lotQcStatus ??
                      "—",
                  )}
                </Tag>
              </p>
              <p style={{ color: "#8a94a6", margin: "0 0 8px" }}>
                {t(
                  "ผล Lab อนุมัติ → ปล่อย Lot ที่รอ QC · ตีกลับ → ปฏิเสธ Lot · Lot ที่ QC ตัดสินไปแล้วไม่ถูกทับ",
                )}
              </p>
              {canApprove ? (
                <Button onClick={() => setLotModal(true)}>
                  {t("จัดการสถานะ QC / Hold ของ Lot")}
                </Button>
              ) : null}
            </div>
          ) : null}

          {(data.signatures?.length ?? 0) > 0 || coas.length > 0 ? (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  {t("ลายเซ็นอิเล็กทรอนิกส์และ COA")}
                </h2>
              </div>
              {(data.signatures ?? []).map((s) => (
                <p key={s.id} style={{ margin: "0 0 6px" }}>
                  <Tag color={s.action === "APPROVE" ? "success" : "error"}>
                    {s.meaning}
                  </Tag>
                  {s.signedByName} · {formatDateTime(s.signedAt)}
                  <span style={{ color: "#8a94a6", fontSize: 12 }}>
                    {" "}
                    · hash {s.resultsHash.slice(0, 12)}…
                  </span>
                  {s.remark ? <span> · {s.remark}</span> : null}
                </p>
              ))}
              {data.failApproveReason ? (
                <p style={{ margin: "0 0 8px" }}>
                  <Tag color="warning">{t("อนุมัติทั้งที่มีค่านอกเกณฑ์")}</Tag>
                  {data.failApproveReason}
                </p>
              ) : null}
              {coas.length > 0 ? (
                <Table
                  rowKey="id"
                  columns={coaColumns}
                  dataSource={coas}
                  pagination={false}
                  size="small"
                />
              ) : null}
              {canApprove && data.status === "APPROVED" ? (
                <Button
                  style={{ marginTop: 8 }}
                  onClick={() => setReissueOpen(true)}
                >
                  {currentCoa
                    ? t("ออก COA ใหม่ (ยกเลิกฉบับเดิม)")
                    : t("ออกเลขที่ COA")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      {signAction ? (
        <LabSignModal
          key={signAction}
          sample={data}
          action={signAction}
          onClose={() => setSignAction(null)}
        />
      ) : null}
      {lotModal && data.lotId ? (
        <LotQcModal
          lot={{
            lotId: data.lotId,
            lotNo: data.lotNo ?? "",
            itemCode: data.itemCode ?? "",
            itemNameTh: data.itemNameTh ?? "",
            qcStatus: data.lotQcStatus,
          }}
          onClose={() => setLotModal(false)}
        />
      ) : null}
      <Modal
        open={reissueOpen}
        title={currentCoa ? t("ออก COA ใหม่") : t("ออกเลขที่ COA")}
        okText={t("ยืนยัน")}
        cancelText={t("ยกเลิก")}
        okButtonProps={{ disabled: reissueReason.trim().length < 5 }}
        confirmLoading={reissue.isPending}
        onCancel={() => setReissueOpen(false)}
        onOk={() =>
          reissue.mutate(reissueReason.trim(), {
            onSuccess: () => {
              setReissueOpen(false);
              setReissueReason("");
            },
          })
        }
      >
        <p>
          {currentCoa
            ? t("ฉบับเดิม {no} จะถูกยกเลิกและเก็บไว้ในประวัติ", {
                no: currentCoa.coaNo,
              })
            : t("ตัวอย่างนี้อนุมัติไปก่อนมีระบบเลขที่ COA — ออกเลขที่ให้ตอนนี้")}
        </p>
        <Input.TextArea
          rows={3}
          maxLength={2000}
          placeholder={t("เหตุผล (อย่างน้อย 5 ตัวอักษร)")}
          value={reissueReason}
          onChange={(e) => setReissueReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
