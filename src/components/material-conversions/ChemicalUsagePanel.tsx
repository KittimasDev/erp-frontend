"use client";

import { Alert, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { useChemicalUsageQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import type { ChemicalUsageItem } from "@/types/material-conversion";
import { useT } from "@/lib/i18n/useT";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./MaterialConversionPage.module.css";

const qty = (v?: number) =>
  v === undefined ? "-" : v.toLocaleString("th-TH", { maximumFractionDigits: 3 });

const QC_COLOR: Record<string, string> = {
  APPROVED: "green",
  PENDING: "gold",
  HOLD: "orange",
  REJECTED: "red",
};

/**
 * สรุปสารเคมีที่ใช้ผสม (M7.4) — ต่อใบ (`runId`) หรือทั้ง Batch (`batchNo`)
 * เทียบสูตรแม่แบบของขั้นตอน เตือนเมื่อเบี่ยงเกินเกณฑ์ (ไม่บล็อก) · ไม่มีสารเคมีเลย = ไม่แสดงอะไร
 */
export default function ChemicalUsagePanel({
  runId,
  batchNo,
  enabled = true,
}: {
  runId?: string;
  batchNo?: string;
  enabled?: boolean;
}) {
  const t = useT();
  const query = useChemicalUsageQuery({ runId, batchNo }, enabled);
  const data = query.data?.data;
  if (!data || data.items.length === 0) return null;

  const columns: ColumnsType<ChemicalUsageItem> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("สารเคมี"),
      key: "item",
      render: (_v, row) => (
        <div className={styles.cellStack}>
          <span>{row.itemNameTh}</span>
          <span className={styles.cellMuted}>{row.itemCode}</span>
        </div>
      ),
    },
    {
      title: t("ใช้จริง"),
      key: "used",
      width: 130,
      align: "right",
      render: (_v, row) => `${qty(row.usedQty)} ${row.unitCode}`,
    },
    {
      title: t("ตามสูตร"),
      key: "expected",
      width: 190,
      align: "right",
      render: (_v, row) =>
        row.expectedQty === undefined ? (
          <span className={styles.cellMuted}>{t("ไม่ได้ตั้งสูตร")}</span>
        ) : (
          <span>
            {qty(row.expectedQty)} {row.unitCode}
            <Tag
              style={{ marginLeft: 6 }}
              color={row.overTolerance ? "orange" : "green"}
            >
              {(row.variancePct ?? 0) > 0 ? "+" : ""}
              {row.variancePct}%
            </Tag>
          </span>
        ),
    },
    {
      title: t("Lot ที่ใช้"),
      key: "lots",
      render: (_v, row) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {row.lots.map((lot) => (
            <Tag key={`${lot.lotId}-${lot.runNo}`} color={QC_COLOR[lot.qcStatus ?? ""]}>
              {lot.lotNo} · {qty(lot.qty)}
            </Tag>
          ))}
        </div>
      ),
    },
  ];

  const over = data.items.filter((i) => i.overTolerance);

  return (
    <div className={styles.detailSection}>
      <h3>
        {t("สารเคมีที่ใช้")} {data.scope === "BATCH" ? t("(ทั้ง Batch {batch})", { batch: data.batchNo ?? "" }) : t("(ใบนี้)")}
      </h3>
      {over.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          title={`${t("ใช้เบี่ยงจากสูตรเกิน {pct}%:", { pct: data.tolerancePct })} ${over
            .map((i) => i.itemNameTh)
            .join(", ")}`}
          description={t("เตือนเพื่อให้ตรวจสอบเท่านั้น ไม่ได้บล็อกการทำงาน")}
        />
      ) : null}
      <Table
        className={masterStyles.dataTable}
        rowKey="itemId"
        size="small"
        columns={columns}
        dataSource={data.items}
        pagination={false}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {t("นับเฉพาะใบที่เริ่มงานแล้ว · สูตร = สัดส่วนสารเคมีต่อวัตถุดิบหลักที่ตั้งไว้ในแม่แบบขั้นตอน")}
      </Typography.Text>
    </div>
  );
}
