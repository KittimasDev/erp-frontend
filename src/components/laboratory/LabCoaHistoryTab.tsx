"use client";

import { useState } from "react";
import { Button, DatePicker, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";

import { useLabCoaHistoryQuery } from "@/hooks/laboratory/useLaboratoryQuery";
import type { LabCoa, LabCoaQueryParams } from "@/types/laboratory";
import styles from "./LabSamplesListPage.module.css";

/** ประวัติ COA ที่ออกทั้งหมด (M8.6) — เลขที่ ฉบับ ตัวอย่าง Lot สถานะ (ยกเลิกพร้อมเหตุผล) */
export default function LabCoaHistoryTab() {
  const [coaNo, setCoaNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [applied, setApplied] = useState<LabCoaQueryParams>({});
  const query = useLabCoaHistoryQuery(applied);

  const columns: ColumnsType<LabCoa> = [
    {
      title: "เลขที่ COA",
      dataIndex: "coaNo",
      render: (v: string, r) => (
        <span>
          <strong>{v}</strong> <Tag>ฉบับที่ {r.version}</Tag>
        </span>
      ),
    },
    {
      title: "ตัวอย่าง",
      dataIndex: "sampleNo",
      render: (v: string, r) => (
        <Link href={`/laboratory/samples/${r.sampleId}`}>{v}</Link>
      ),
    },
    { title: "Lot", dataIndex: "lotNo", render: (v?: string) => v ?? "—" },
    {
      title: "ออกเมื่อ",
      dataIndex: "issuedAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
    {
      title: "ผู้ออก",
      dataIndex: "issuedByName",
      render: (v?: string) => v ?? "—",
    },
    {
      title: "สถานะ",
      key: "st",
      render: (_v, r) =>
        r.status === "VOIDED" ? (
          <span>
            <Tag>ยกเลิก</Tag>
            {r.voidReason}
          </span>
        ) : (
          <Tag color="success">ใช้งานอยู่</Tag>
        ),
    },
  ];

  return (
    <>
      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>เลขที่ COA</label>
            <Input
              allowClear
              value={coaNo}
              onChange={(e) => setCoaNo(e.target.value)}
              placeholder="เช่น COA-20261013"
            />
          </div>
          <div className={styles.filterItem}>
            <label>Lot</label>
            <Input
              allowClear
              value={lotNo}
              onChange={(e) => setLotNo(e.target.value)}
            />
          </div>
          <div className={styles.filterItem}>
            <label>สถานะ</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={[
                { value: "ISSUED", label: "ใช้งานอยู่" },
                { value: "VOIDED", label: "ยกเลิก" },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วันที่ออก</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              value={range}
              onChange={(v) => setRange(v?.[0] && v[1] ? [v[0], v[1]] : null)}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button
            onClick={() => {
              setCoaNo("");
              setLotNo("");
              setStatus(undefined);
              setRange(null);
              setApplied({});
            }}
          >
            เคลียร์
          </Button>
          <Button
            type="primary"
            className={styles.primaryBtn}
            onClick={() =>
              setApplied({
                coaNo: coaNo.trim() || undefined,
                lotNo: lotNo.trim() || undefined,
                status,
                dateFrom: range?.[0].format("YYYY-MM-DD"),
                dateTo: range?.[1].format("YYYY-MM-DD"),
              })
            }
          >
            ค้นหา
          </Button>
        </div>
      </section>
      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={query.data?.data ?? []}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: "ยังไม่มี COA ที่ออก" }}
        />
      </section>
    </>
  );
}
