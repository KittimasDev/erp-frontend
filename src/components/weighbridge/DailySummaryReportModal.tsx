"use client";

import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Typography,
} from "antd";
import { FilePdfOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { getT2900DailyReport, getT2900QualityReport } from "@/lib/api/t2900";
import { getAccessToken } from "@/lib/auth/token";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type {
  T2900DailyReport,
  T2900QualityReport,
  T2900QualityReportRow,
} from "@/types/t2900";

import styles from "./DailySummaryReportModal.module.css";

const { RangePicker } = DatePicker;

type Props = {
  open: boolean;
  onClose: () => void;
  /** ค่าเริ่มต้นช่วงวันที่เมื่อเปิด Modal (แยกจากตัวกรองตารางหน้า) */
  initialDateFrom: string;
  initialDateTo: string;
};

type TabKey = "daily" | "quality";

function toYmd(value: Dayjs | null | undefined, fallback: string) {
  return value?.isValid() ? value.format("YYYY-MM-DD") : fallback;
}

export default function DailySummaryReportModal({
  open,
  onClose,
  initialDateFrom,
  initialDateTo,
}: Props) {
  const { message } = App.useApp();
  const t = useT();

  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  const [dailyRange, setDailyRange] = useState<[Dayjs, Dayjs]>([
    dayjs(initialDateFrom),
    dayjs(initialDateTo),
  ]);
  const [custName, setCustName] = useState("");
  const [prodName, setProdName] = useState("");
  const [dailyReport, setDailyReport] = useState<T2900DailyReport | null>(null);
  const [dailyPreviewHtml, setDailyPreviewHtml] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyExporting, setDailyExporting] = useState(false);

  const [qualityRange, setQualityRange] = useState<[Dayjs, Dayjs]>([
    dayjs(initialDateFrom),
    dayjs(initialDateTo),
  ]);
  const [prodId, setProdId] = useState<string | undefined>(undefined);
  const [qualityReport, setQualityReport] =
    useState<T2900QualityReport | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityExporting, setQualityExporting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveTab("daily");
    setDailyRange([dayjs(initialDateFrom), dayjs(initialDateTo)]);
    setQualityRange([dayjs(initialDateFrom), dayjs(initialDateTo)]);
    setCustName("");
    setProdName("");
    setProdId(undefined);
    setDailyReport(null);
    setDailyPreviewHtml("");
    setQualityReport(null);
  }, [open, initialDateFrom, initialDateTo]);

  const loadDaily = async () => {
    setDailyLoading(true);
    try {
      const response = await getT2900DailyReport(getAccessToken(), {
        dateFrom: toYmd(dailyRange[0], initialDateFrom),
        dateTo: toYmd(dailyRange[1], initialDateTo),
        custName: custName.trim() || undefined,
        prodName: prodName.trim() || undefined,
      });
      const { buildT2900DailyReportPagesHtml } = await import(
        "@/utils/generateT2900DailyReportPdf"
      );
      setDailyReport(response.data);
      setDailyPreviewHtml(buildT2900DailyReportPagesHtml(response.data).join(""));
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t("โหลดรายงานบัตรชั่งครั้งสองไม่สำเร็จ"),
      );
    } finally {
      setDailyLoading(false);
    }
  };

  const loadQuality = async () => {
    setQualityLoading(true);
    try {
      const response = await getT2900QualityReport(getAccessToken(), {
        dateFrom: toYmd(qualityRange[0], initialDateFrom),
        dateTo: toYmd(qualityRange[1], initialDateTo),
        prodId: prodId || undefined,
      });
      setQualityReport(response.data);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t("โหลดรายงานคุณภาพสินค้าไม่สำเร็จ"),
      );
    } finally {
      setQualityLoading(false);
    }
  };

  const exportDailyPdf = async () => {
    if (!dailyReport) {
      message.warning(t("กรุณาค้นหารายงานก่อน Export PDF"));
      return;
    }
    setDailyExporting(true);
    try {
      const { generateT2900DailyReportPdf } = await import(
        "@/utils/generateT2900DailyReportPdf"
      );
      await generateT2900DailyReportPdf(dailyReport);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t("Export PDF ไม่สำเร็จ"),
      );
    } finally {
      setDailyExporting(false);
    }
  };

  const exportQualityPdf = async () => {
    if (!qualityReport) {
      message.warning(t("กรุณาค้นหารายงานก่อน Export PDF"));
      return;
    }
    setQualityExporting(true);
    try {
      const { generateT2900QualityReportPdf } = await import(
        "@/utils/generateT2900QualityReportPdf"
      );
      await generateT2900QualityReportPdf(qualityReport);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t("Export PDF ไม่สำเร็จ"),
      );
    } finally {
      setQualityExporting(false);
    }
  };

  const qualityColumns: ColumnsType<T2900QualityReportRow> = [
    {
      title: t("ลำดับที่"),
      dataIndex: "seq",
      key: "seq",
      width: 88,
      align: "center",
    },
    {
      title: t("ชื่อลูกค้า"),
      dataIndex: "custName",
      key: "custName",
      ellipsis: true,
    },
    { title: t("ทะเบียนรถ"), dataIndex: "truckNo", key: "truckNo", width: 120 },
    {
      title: t("สินค้า"),
      dataIndex: "prodName",
      key: "prodName",
      width: 160,
      ellipsis: true,
    },
    {
      title: t("น้ำหนัก (ตัน)"),
      dataIndex: "weightTons",
      key: "weightTons",
      width: 120,
      align: "right",
      render: (value: number) =>
        value.toLocaleString(getStoredLanguage() === "en" ? "en-GB" : "th-TH", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 3,
        }),
    },
    {
      title: t("สถานที่"),
      dataIndex: "location",
      key: "location",
      width: 160,
      ellipsis: true,
    },
  ];

  const productOptions = useMemo(() => {
    const products = qualityReport?.products ?? [];
    return [
      { value: "", label: t("ทั้งหมด") },
      ...products.map((p) => ({
        value: p.prodId,
        label: p.prodName
          ? `${p.prodId} — ${p.prodName}`
          : p.prodId || t("(ไม่มีรหัส)"),
      })),
    ];
  }, [qualityReport?.products, t]);

  return (
    <Modal
      title={t("รายงานสรุปประจำวัน")}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      centered
      width={1100}
      footer={null}
      className={styles.modal}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={[
          {
            key: "daily",
            label: t("รายงานบัตรชั่งครั้งสอง แยกตามสินค้า"),
            children: (
              <div className={styles.tabBody}>
                <div className={styles.filterRow}>
                  <div className={styles.filterField}>
                    <span>{t("ช่วงวันที่")}</span>
                    <RangePicker
                      value={dailyRange}
                      allowClear={false}
                      format="DD/MM/YYYY"
                      onChange={(values) => {
                        if (values?.[0] && values[1]) {
                          setDailyRange([values[0], values[1]]);
                        }
                      }}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <span>{t("ชื่อลูกค้า")}</span>
                    <Input
                      allowClear
                      placeholder={t("ชื่อหรือรหัสลูกค้า")}
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      onPressEnter={() => void loadDaily()}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <span>{t("ชื่อสินค้า")}</span>
                    <Input
                      allowClear
                      placeholder={t("ชื่อหรือรหัสสินค้า")}
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      onPressEnter={() => void loadDaily()}
                    />
                  </div>
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      loading={dailyLoading}
                      onClick={() => void loadDaily()}
                    >
                      {t("ค้นหา")}
                    </Button>
                    <Button
                      icon={<FilePdfOutlined />}
                      loading={dailyExporting}
                      disabled={!dailyReport}
                      onClick={() => void exportDailyPdf()}
                    >
                      Export PDF
                    </Button>
                  </Space>
                </div>
                {dailyReport?.truncated ? (
                  <Typography.Text type="warning">
                    {t("รายงานตัดที่ 5,000 ใบแรก — เลือกช่วงวันที่ให้สั้นลงเพื่อดูครบ")}
                  </Typography.Text>
                ) : null}
                <div className={styles.previewWrap}>
                  {dailyLoading ? (
                    <div className={styles.placeholder}>{t("กำลังโหลดรายงาน…")}</div>
                  ) : dailyReport ? (
                    <div className={styles.previewScale}>
                      <div
                        className={styles.previewHtml}
                        dangerouslySetInnerHTML={{ __html: dailyPreviewHtml }}
                      />
                    </div>
                  ) : (
                    <div className={styles.placeholder}>
                      {t("เลือกตัวกรองแล้วกดค้นหาเพื่อแสดงรายงาน")}
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: "quality",
            label: t("รายงานคุณภาพสินค้า"),
            children: (
              <div className={styles.tabBody}>
                <div className={styles.filterRow}>
                  <div className={styles.filterField}>
                    <span>{t("ช่วงวันที่")}</span>
                    <RangePicker
                      value={qualityRange}
                      allowClear={false}
                      format="DD/MM/YYYY"
                      onChange={(values) => {
                        if (values?.[0] && values[1]) {
                          setQualityRange([values[0], values[1]]);
                        }
                      }}
                    />
                  </div>
                  <div className={styles.filterField}>
                    <span>{t("สินค้า")}</span>
                    <Select
                      style={{ minWidth: 220 }}
                      value={prodId ?? ""}
                      options={productOptions}
                      onChange={(value) =>
                        setProdId(value ? String(value) : undefined)
                      }
                      placeholder={t("ทั้งหมด")}
                    />
                  </div>
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      loading={qualityLoading}
                      onClick={() => void loadQuality()}
                    >
                      {t("ค้นหา")}
                    </Button>
                    <Button
                      icon={<FilePdfOutlined />}
                      loading={qualityExporting}
                      disabled={!qualityReport}
                      onClick={() => void exportQualityPdf()}
                    >
                      Export PDF
                    </Button>
                  </Space>
                </div>
                {qualityReport?.truncated ? (
                  <Typography.Text type="warning">
                    {t("รายงานตัดที่ 5,000 ใบแรก — เลือกช่วงวันที่ให้สั้นลงเพื่อดูครบ")}
                  </Typography.Text>
                ) : null}
                <Table<T2900QualityReportRow>
                  size="small"
                  rowKey={(row) => `${row.seq}-${row.truckNo}-${row.prodName}`}
                  loading={qualityLoading}
                  columns={qualityColumns}
                  dataSource={qualityReport?.rows ?? []}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  locale={{
                    emptyText: qualityReport
                      ? t("ไม่พบข้อมูลตามตัวกรอง")
                      : t("เลือกตัวกรองแล้วกดค้นหาเพื่อแสดงรายงาน"),
                  }}
                  scroll={{ x: 800 }}
                />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
