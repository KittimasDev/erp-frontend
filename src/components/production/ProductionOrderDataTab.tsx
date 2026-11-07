"use client";

import { useMemo, useState } from "react";
import { Alert, DatePicker, Segmented, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useProductionOrderOutputTrendQuery } from "@/hooks/production-orders/useProductionOrderQueries";
import type {
  ProductionOrderOutputTrendBucket,
  ProductionOrderOutputTrendPoint,
} from "@/types/production-order";
import styles from "./ProductionOrderDataTab.module.css";
import { useT } from "@/lib/i18n/useT";
import { getStoredLanguage } from "@/lib/i18n/language";
import { formatNumber } from "@/lib/i18n/format";

const GREEN = "#739816";
const GREEN_DARK = "#627F13";
const MUTED = "#77777C";
const ITEM_COLORS = [
  "#739816",
  "#627F13",
  "#A9C46C",
  "#F9BB0C",
  "#1677ff",
  "#CF1322",
  "#77777C",
];

const { RangePicker } = DatePicker;

function fmt(value?: number | null, digits = 2) {
  if (value === null || value === undefined) return "—";
  return formatNumber(value, getStoredLanguage(), digits);
}

function itemLabel(item: {
  itemCode?: string;
  itemNameTh?: string;
  itemId: string;
}) {
  if (item.itemCode) {
    return `${item.itemCode}${item.itemNameTh ? ` — ${item.itemNameTh}` : ""}`;
  }
  return item.itemNameTh ?? item.itemId;
}

type Props = {
  orderId: string;
  startedAt?: string;
  completedAt?: string;
  productionDate?: string;
};

export default function ProductionOrderDataTab({
  orderId,
  startedAt,
  completedAt,
  productionDate,
}: Props) {
  const t = useT();
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => {
    const to = completedAt ? dayjs(completedAt) : dayjs();
    const from = startedAt
      ? dayjs(startedAt)
      : productionDate
        ? dayjs(productionDate)
        : to.subtract(30, "day");
    const span = to.diff(from, "day") + 1;
    if (span > 90) {
      return [to.subtract(89, "day"), to];
    }
    if (from.isAfter(to)) {
      return [to, to];
    }
    return [from, to];
  });
  const [bucket, setBucket] =
    useState<ProductionOrderOutputTrendBucket>("DAY");

  const params = useMemo(
    () => ({
      from: range[0].format("YYYY-MM-DD"),
      to: range[1].format("YYYY-MM-DD"),
      bucket,
    }),
    [range, bucket],
  );

  const trendQuery = useProductionOrderOutputTrendQuery(orderId, params);
  const trend = trendQuery.data?.data;

  const composedData = useMemo(
    () =>
      (trend?.points ?? []).map((point) => ({
        ...point,
        label:
          bucket === "WEEK"
            ? t("สัปดาห์ {d}", { d: dayjs(point.bucket).format("DD/MM") })
            : dayjs(point.bucket).format("DD/MM"),
        actualOutputQty: Number(point.actualOutputQty),
        cumulativeYieldPercent:
          point.cumulativeYieldPercent === null
            ? null
            : Number(point.cumulativeYieldPercent),
        plannedYieldPercent:
          point.plannedYieldPercent === null
            ? null
            : Number(point.plannedYieldPercent),
      })),
    [trend?.points, bucket, t],
  );

  const stackedData = useMemo(
    () =>
      composedData.map((point) => {
        const row: Record<string, string | number | null> = {
          label: point.label,
        };
        for (const item of point.byItem) {
          row[item.itemId] = Number(item.qty);
        }
        return row;
      }),
    [composedData],
  );

  const tableColumns: ColumnsType<ProductionOrderOutputTrendPoint> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ช่วง"),
      dataIndex: "bucket",
      key: "bucket",
      render: (value: string) =>
        bucket === "WEEK"
          ? t("สัปดาห์ {d}", { d: dayjs(value).format("DD/MM/YYYY") })
          : dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: t("ผลผลิตในช่วง"),
      dataIndex: "actualOutputQty",
      key: "actualOutputQty",
      align: "right",
      render: (value: number) => fmt(Number(value), 3),
    },
    {
      title: t("ผลผลิตสะสม"),
      dataIndex: "cumulativeOutputQty",
      key: "cumulativeOutputQty",
      align: "right",
      render: (value: number) => fmt(Number(value), 3),
    },
    {
      title: t("Yield สะสม"),
      dataIndex: "cumulativeYieldPercent",
      key: "cumulativeYieldPercent",
      align: "right",
      render: (value: number | null) =>
        value === null ? t("เทียบไม่ได้") : `${fmt(value)}%`,
    },
  ];

  const errorMessage =
    trendQuery.error instanceof Error
      ? trendQuery.error.message
      : trendQuery.isError
        ? t("โหลดแนวโน้มผลผลิตไม่สำเร็จ")
        : null;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.filterField}>
          <span>{t("ช่วงวันที่")}</span>
          <RangePicker
            allowClear={false}
            value={range}
            aria-label={t("ช่วงวันที่แนวโน้มผลผลิต")}
            onChange={(value) => {
              if (value?.[0] && value[1]) {
                setRange([value[0], value[1]]);
              }
            }}
          />
        </div>
        <div className={styles.filterField}>
          <span>{t("ความละเอียด")}</span>
          <Segmented
            aria-label={t("ความละเอียดแกนเวลา")}
            value={bucket}
            onChange={(value) =>
              setBucket(value as ProductionOrderOutputTrendBucket)
            }
            options={[
              { value: "DAY", label: t("รายวัน") },
              { value: "WEEK", label: t("รายสัปดาห์") },
            ]}
          />
        </div>
      </div>

      {errorMessage ? (
        <Alert type="error" showIcon title={t("โหลดข้อมูลไม่สำเร็จ")} description={errorMessage} />
      ) : null}

      {trend && trend.items.length > 1 ? (
        <Alert
          type="info"
          showIcon
          title={t("ไม่คำนวณ Yield รวม — มีหลายสินค้า")}
          description={t("กราฟด้านล่างแยกจำนวนตามสินค้า ไม่ได้บวกข้ามรายการเป็นยอดเดียว")}
        />
      ) : trend && !trend.quantitiesComparable ? (
        <Alert
          type="warning"
          showIcon
          title={t("ตัวเลข Yield เทียบไม่ได้ — ใบนี้มีหลายหน่วย")}
          description={t(
            "พบหน่วย {units} ในใบเดียวกัน เส้น Yield จึงไม่วาด ค่าในตารางผลผลิตยังใช้ดูรายสินค้าได้",
            { units: trend.unitCodes.join(" · ") },
          )}
        />
      ) : null}

      {trend?.massBalanceStatus === "EXCEEDS_INPUT" &&
      trend.massBalanceWarning ? (
        <Alert
          type="error"
          showIcon
          title={t("ตัวเลขเป็นไปไม่ได้ — ผลผลิตมากกว่าวัตถุดิบ")}
          description={trend.massBalanceWarning}
        />
      ) : null}

      {(trend?.items.length ?? 0) > 1 ? null : (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3>{t("ผลผลิตและ Yield ตามเวลา")}</h3>
          <p>
            {t("แท่งคือผลผลิตที่คลังอนุมัติในช่วงนั้น · เส้นคือ Yield สะสมเทียบวัตถุดิบที่ตัดตอนเริ่มผลิต")}
          </p>
        </div>
        <div className={styles.chartBody}>
          {trendQuery.isLoading ? (
            <div className={styles.emptyState}>{t("กำลังโหลด...")}</div>
          ) : !trend?.hasApprovedOutput ? (
            <div className={styles.emptyState}>
              {t("ยังไม่มีคำขอรับผลผลิตที่อนุมัติแล้ว")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={composedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} />
                <YAxis
                  yAxisId="qty"
                  tick={{ fill: MUTED, fontSize: 12 }}
                  width={70}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  tick={{ fill: MUTED, fontSize: 12 }}
                  width={50}
                  unit="%"
                />
                <Tooltip
                  formatter={(value, name) => [
                    value === null ? t("เทียบไม่ได้") : fmt(Number(value)),
                    name,
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="qty"
                  dataKey="actualOutputQty"
                  name={t("ผลผลิตจริง")}
                  fill={GREEN}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="cumulativeYieldPercent"
                  name={t("Yield สะสม")}
                  stroke={GREEN_DARK}
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="plannedYieldPercent"
                  name={t("Yield ตามแผน")}
                  stroke={MUTED}
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      )}

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3>{t("ผลผลิตรายสินค้า")}</h3>
          <p>{t("จำนวนที่อนุมัติเข้าคลังในแต่ละช่วง แยกตามสินค้าในแผน")}</p>
        </div>
        <div className={styles.chartBody}>
          {trendQuery.isLoading ? (
            <div className={styles.emptyState}>{t("กำลังโหลด...")}</div>
          ) : !trend?.hasApprovedOutput ? (
            <div className={styles.emptyState}>
              {t("ยังไม่มีคำขอรับผลผลิตที่อนุมัติแล้ว")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} />
                <YAxis tick={{ fill: MUTED, fontSize: 12 }} width={70} />
                <Tooltip
                  formatter={(value, name) => [fmt(Number(value), 3), name]}
                />
                <Legend />
                {(trend.items ?? []).map((item, index) => (
                  <Bar
                    key={item.itemId}
                    dataKey={item.itemId}
                    name={itemLabel(item)}
                    stackId="output"
                    fill={ITEM_COLORS[index % ITEM_COLORS.length]}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.chartHeader}>
          <h3>{t("ตารางจุดข้อมูล")}</h3>
        </div>
        <Table
          rowKey="bucket"
          size="small"
          pagination={false}
          loading={trendQuery.isFetching}
          dataSource={trend?.points ?? []}
          columns={tableColumns}
          locale={{ emptyText: t("ยังไม่มีข้อมูลในช่วงนี้") }}
        />
      </div>
    </div>
  );
}
