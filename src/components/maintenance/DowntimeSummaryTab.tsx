"use client";

import { useState } from "react";
import { Card, Col, DatePicker, Row, Statistic, Table } from "antd";
import dayjs, { type Dayjs } from "dayjs";

import { useDowntimeSummaryQuery } from "@/hooks/maintenance/useMaintenance";

/** สรุป Downtime รายช่วง: Planned vs Unplanned, MTTR, ตามเครื่อง, ตามกลุ่มสาเหตุ */
export default function DowntimeSummaryTab() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(29, "day"), dayjs()]);
  const query = useDowntimeSummaryQuery(range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"));
  const data = query.data?.data;

  const cols = (title: string) => [
    { title, dataIndex: "label" },
    { title: "ครั้ง", dataIndex: "count", width: 80, align: "right" as const },
    { title: "ชั่วโมง", dataIndex: "hours", width: 100, align: "right" as const },
  ];

  return (
    <div>
      <DatePicker.RangePicker
        value={range}
        allowClear={false}
        format="DD/MM/YYYY"
        onChange={(v) => v?.[0] && v[1] && setRange([v[0], v[1]])}
        style={{ marginBottom: 12 }}
      />
      {data ? (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} md={4}><Card size="small"><Statistic title="Downtime รวม (ชม.)" value={data.totalHours} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title="Planned (ตามแผน)" value={data.plannedHours} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title="Unplanned (Breakdown)" value={data.unplannedHours} styles={{ content: { color: "#cf1322" } }} /></Card></Col>
            <Col xs={12} md={5}><Card size="small"><Statistic title="MTTR เฉลี่ย (ชม./ครั้ง)" value={data.mttrHours} /></Card></Col>
            <Col xs={24} md={5}><Card size="small"><Statistic title="รอซ่อมเฉลี่ย (ชม.)" value={data.avgWaitingHours} /></Card></Col>
          </Row>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Table rowKey="key" size="small" pagination={false} columns={cols("เครื่องจักร")} dataSource={data.byEquipment} locale={{ emptyText: "ไม่มี Downtime ในช่วงนี้" }} />
            </Col>
            <Col xs={24} md={12}>
              <Table rowKey="key" size="small" pagination={false} columns={cols("กลุ่มสาเหตุ (เฉพาะ Breakdown)")} dataSource={data.byRootCause} locale={{ emptyText: "ไม่มี Breakdown ในช่วงนี้" }} />
            </Col>
          </Row>
        </>
      ) : null}
    </div>
  );
}
