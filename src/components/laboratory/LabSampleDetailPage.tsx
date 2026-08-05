"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { App, Button, Spin, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  ExperimentOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useLabSampleQuery,
} from "@/hooks/laboratory/useLaboratoryQuery";
import { getLabSampleCoa, getLabSampleQrCode } from "@/lib/api/laboratory";
import { getAccessToken } from "@/lib/auth/token";
import { ApiError } from "@/lib/api/client";
import type { LabTestResult } from "@/types/laboratory";
import { LAB_SAMPLE_STATUS_LABEL } from "@/types/laboratory";
import styles from "./LabSampleDetailPage.module.css";

type Props = { id: string };

function formatDate(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY");
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return dayjs(value).format("DD/MM/YYYY HH:mm");
}

export default function LabSampleDetailPage({ id }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const query = useLabSampleQuery(id);
  const data = query.data?.data;

  if (query.isLoading) {
    return (
      <div className={styles.stateCard}>
        <Spin /> กำลังโหลด...
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.emptyCard}>
        ไม่พบตัวอย่าง
        <div style={{ marginTop: 12 }}>
          <Link href="/laboratory/samples">กลับรายการ</Link>
        </div>
      </div>
    );
  }

  const columns: ColumnsType<LabTestResult> = [
    {
      title: "#",
      width: 48,
      render: (_v, _r, index) => index + 1,
    },
    { title: "พารามิเตอร์", dataIndex: "parameterName" },
    { title: "ผลตรวจ", dataIndex: "resultValue" },
    { title: "หน่วย", dataIndex: "unit", render: (v?: string) => v ?? "—" },
    { title: "Spec Min", dataIndex: "specMin", render: (v?: string) => v ?? "—" },
    { title: "Spec Max", dataIndex: "specMax", render: (v?: string) => v ?? "—" },
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
        remark: coa.sample.reviewRemark?.trim() || coa.sample.remark?.trim() || "",
        qrCodeDataUri: qrRes?.data.qrCodeDataUri,
        results: (coa.sample.results ?? []).map((r) => ({
          parameterName: r.parameterName,
          resultValue: r.resultValue,
          unit: r.unit ?? "—",
          specMin: r.specMin ?? "—",
          specMax: r.specMax ?? "—",
        })),
      });
      message.success("เปิด PDF COA แล้ว");
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "พิมพ์ COA ไม่สำเร็จ",
      );
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent} aria-hidden>
          <ExperimentOutlined />
        </div>
        <div className={styles.headerContent}>
          <p className={styles.eyebrow}>Laboratory · Sample</p>
          <h1 className={styles.pageTitle}>{data.sampleNo}</h1>
          <p className={styles.pageSubtitle}>
            {data.sampleType} · {formatDate(data.collectedDate)} ·{" "}
            {LAB_SAMPLE_STATUS_LABEL[data.status] ?? data.status}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/laboratory/samples")}
          >
            กลับ
          </Button>
          {data.status === "APPROVED" ? (
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => void printCoa()}
            >
              พิมพ์ COA
            </Button>
          ) : null}
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.mainCard}>
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ข้อมูลตัวอย่าง</h2>
              <Tag
                color={
                  data.status === "APPROVED"
                    ? "success"
                    : data.status === "REJECTED"
                      ? "error"
                      : "processing"
                }
              >
                {LAB_SAMPLE_STATUS_LABEL[data.status] ?? data.status}
              </Tag>
            </div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เลขที่</span>
                <div className={styles.metaValue}>{data.sampleNo}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ประเภท</span>
                <div className={styles.metaValue}>{data.sampleType}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>วันที่เก็บ</span>
                <div className={styles.metaValue}>
                  {formatDate(data.collectedDate)}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>เอกสารอ้างอิง</span>
                <div className={styles.metaValue}>
                  {data.referenceDocNo ?? "—"}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>หมายเหตุ</span>
                <div className={styles.metaValue}>{data.remark || "—"}</div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>ผลรีวิว</span>
                <div className={styles.metaValue}>
                  {data.reviewRemark || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>ผลตรวจ</h2>
            </div>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={data.results ?? []}
              pagination={false}
              size="small"
              locale={{ emptyText: "ยังไม่มีผลตรวจ" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
