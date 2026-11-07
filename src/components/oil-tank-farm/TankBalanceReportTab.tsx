"use client";

import { useState } from "react";
import { Card, DatePicker, Radio, Select, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import { useOilTanksQuery, useTankBalanceReportQuery } from "@/hooks/oil-tank-farm/useOilTankFarm";
import { useT } from "@/lib/i18n/useT";
import type { TankBalanceRow } from "@/types/oil-tank-farm";

const n = (v: number) => v.toLocaleString("th-TH", { maximumFractionDigits: 3 });

/** รายงานยอดรายถัง รายวัน/รายเดือน: ยอดยกมา เข้า ออก (สูญเสียจากโอน) ยอดปิด */
export default function TankBalanceReportTab() {
  const tr = useT();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day"), dayjs()]);
  const [granularity, setGranularity] = useState<"DAY" | "MONTH">("DAY");
  const [tankId, setTankId] = useState<string>();
  const tanksQuery = useOilTanksQuery();
  const query = useTankBalanceReportQuery({
    from: range[0].format("YYYY-MM-DD"),
    to: range[1].format("YYYY-MM-DD"),
    granularity,
    tankId,
  });

  const columns: ColumnsType<TankBalanceRow> = [
    {
      title: tr("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: granularity === "DAY" ? tr("วันที่") : tr("เดือน"),
      dataIndex: "period",
      width: 120,
      render: (p: string) => dayjs(p).format(granularity === "DAY" ? "DD/MM/YYYY" : "MM/YYYY"),
    },
    { title: tr("ยกมา"), dataIndex: "opening", align: "right", render: n },
    { title: tr("เข้า"), dataIndex: "in", align: "right", render: (v: number) => (v ? <span style={{ color: "#389e0d" }}>+{n(v)}</span> : "—") },
    { title: tr("ออก"), dataIndex: "out", align: "right", render: (v: number) => (v ? <span style={{ color: "#cf1322" }}>−{n(v)}</span> : "—") },
    { title: tr("สูญเสียจากโอน"), dataIndex: "loss", align: "right", render: (v: number) => (v ? n(v) : "—") },
    { title: tr("ยอดปิด"), dataIndex: "closing", align: "right", render: (v: number) => <strong>{n(v)}</strong> },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <DatePicker.RangePicker value={range} allowClear={false} format="DD/MM/YYYY" onChange={(v) => v?.[0] && v[1] && setRange([v[0], v[1]])} />
        <Radio.Group
          value={granularity}
          onChange={(e) => setGranularity(e.target.value)}
          options={[{ value: "DAY", label: tr("รายวัน") }, { value: "MONTH", label: tr("รายเดือน") }]}
          optionType="button"
        />
        <Select
          allowClear
          placeholder={tr("ทุกถัง")}
          style={{ width: 160 }}
          value={tankId}
          onChange={setTankId}
          options={(tanksQuery.data?.data ?? []).map((t) => ({ value: t.id, label: t.tankNo }))}
        />
      </div>
      <p style={{ color: "#8a94a6", marginTop: 0 }}>
        {tr("ตัวเลขมาจากรายการเคลื่อนไหวสต๊อกของตำแหน่งถัง (ลิตร) · “สูญเสียจากโอน” รวมอยู่ใน “ออก” ของถังต้นทางแล้ว แสดงแยกไว้ติดตามเท่านั้น")}
      </p>
      {(query.data?.data.tanks ?? []).map((t) => (
        <Card
          key={t.tankId}
          size="small"
          style={{ marginBottom: 12 }}
          title={<Typography.Text strong>{t.tankNo}</Typography.Text>}
          extra={<span>{tr("คงเหลือตอนนี้ {cur} / ความจุ {cap} ลิตร", { cur: n(t.currentOnHand), cap: n(t.capacityLiters) })}</span>}
        >
          <Table rowKey="period" size="small" columns={columns} dataSource={t.rows} pagination={{ pageSize: 31, hideOnSinglePage: true }} />
        </Card>
      ))}
      {query.isLoading ? null : (query.data?.data.tanks.length ?? 0) === 0 ? <p>{tr("ไม่มีถัง")}</p> : null}
    </div>
  );
}
