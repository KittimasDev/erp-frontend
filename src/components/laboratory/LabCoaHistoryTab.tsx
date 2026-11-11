"use client";

import { useState } from "react";
import { Button, DatePicker, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";

import { useLabCoaHistoryQuery } from "@/hooks/laboratory/useLaboratoryQuery";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import {
  labCoaStatusLabel,
  type LabCoa,
  type LabCoaQueryParams,
} from "@/types/laboratory";
import styles from "./LabSamplesListPage.module.css";

/** ประวัติ COA ที่ออกทั้งหมด (M8.6) — เลขที่ ฉบับ ตัวอย่าง Lot สถานะ (ยกเลิกพร้อมเหตุผล) */
export default function LabCoaHistoryTab() {
  const t = useT();
  const lang = useLanguage();
  const [coaNo, setCoaNo] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [applied, setApplied] = useState<LabCoaQueryParams>({});
  const query = useLabCoaHistoryQuery(applied);

  const columns: ColumnsType<LabCoa> = [
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
          <strong>{v}</strong> <Tag>{t("ฉบับที่ {n}", { n: r.version })}</Tag>
        </span>
      ),
    },
    {
      title: t("ตัวอย่าง"),
      dataIndex: "sampleNo",
      render: (v: string, r) => (
        <Link href={`/laboratory/samples/${r.sampleId}`}>{v}</Link>
      ),
    },
    { title: "Lot", dataIndex: "lotNo", render: (v?: string) => v ?? "—" },
    {
      title: t("ออกเมื่อ"),
      dataIndex: "issuedAt",
      width: 150,
      render: (v: string) => dayjs(v).format("DD/MM/BBBB HH:mm"),
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
            <Tag>{labCoaStatusLabel("VOIDED", lang)}</Tag>
            {r.voidReason}
          </span>
        ) : (
          <Tag color="success">{labCoaStatusLabel("ISSUED", lang)}</Tag>
        ),
    },
  ];

  return (
    <>
      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>{t("เลขที่ COA")}</label>
            <Input
              allowClear
              value={coaNo}
              onChange={(e) => setCoaNo(e.target.value)}
              placeholder={t("เช่น COA-20261013")}
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
            <label>{t("สถานะ")}</label>
            <Select
              allowClear
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              options={[
                { value: "ISSUED", label: labCoaStatusLabel("ISSUED", lang) },
                { value: "VOIDED", label: labCoaStatusLabel("VOIDED", lang) },
              ]}
            />
          </div>
          <div className={styles.filterItem}>
            <label>{t("วันที่ออก")}</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              format="DD/MM/BBBB"
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
            {t("เคลียร์")}
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
            {t("ค้นหา")}
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
          locale={{ emptyText: t("ยังไม่มี COA ที่ออก") }}
        />
      </section>
    </>
  );
}
