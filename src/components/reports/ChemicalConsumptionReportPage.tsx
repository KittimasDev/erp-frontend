"use client";

import { useMemo, useState } from "react";
import { App, Button, DatePicker, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DownloadOutlined, ExperimentOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useChemicalConsumptionReportQuery } from "@/hooks/chemical-consumption-report/useChemicalConsumptionReportQuery";
import { useItemsQuery } from "@/hooks/items/useItemsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import type { ChemicalConsumptionReportRow } from "@/types/chemical-issues";
import {
  CHEMICAL_ISSUE_PURPOSE_LABEL,
  CHEMICAL_ISSUE_PURPOSE_OPTIONS,
} from "@/types/chemical-issues";
import styles from "./ChemicalConsumptionReportPage.module.css";

function formatNumber(value: string) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function downloadCsv(rows: ChemicalConsumptionReportRow[]) {
  const header = [
    "รหัสสารเคมี",
    "ชื่อสารเคมี",
    "วัตถุประสงค์",
    "จำนวนรวม",
    "หน่วย",
    "จำนวนใบเบิก",
  ];
  const lines = rows.map((row) =>
    [
      row.itemCode ?? "",
      row.itemNameTh ?? "",
      CHEMICAL_ISSUE_PURPOSE_LABEL[row.purpose] ?? row.purpose,
      row.totalQuantity,
      row.unitCode ?? "",
      row.issueCount,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chemical-consumption-report-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ChemicalConsumptionReportPage() {
  const { message } = App.useApp();
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [itemId, setItemId] = useState<string | undefined>();
  const [purpose, setPurpose] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [applied, setApplied] = useState<{
    dateFrom?: string;
    dateTo?: string;
    itemId?: string;
    purpose?: string;
    warehouseId?: string;
  }>({});

  const itemsQuery = useItemsQuery({ isActive: true, itemCategoryCode: "CHEMICAL" });
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const query = useChemicalConsumptionReportQuery(applied);

  const items = itemsQuery.data?.data ?? [];
  const warehouses = Array.isArray(warehousesQuery.data?.data)
    ? warehousesQuery.data.data
    : [];
  const rows = query.data?.data.items ?? [];
  const summary = query.data?.data.summary;

  const applySearch = () => {
    setApplied({
      dateFrom: dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : undefined,
      dateTo: dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : undefined,
      itemId,
      purpose,
      warehouseId,
    });
  };

  const clearFilters = () => {
    setDateRange(null);
    setItemId(undefined);
    setPurpose(undefined);
    setWarehouseId(undefined);
    setApplied({});
  };

  const handleExport = () => {
    if (!rows.length) {
      message.warning("ไม่มีข้อมูลสำหรับ Export");
      return;
    }
    downloadCsv(rows);
  };

  const columns: ColumnsType<ChemicalConsumptionReportRow> = useMemo(
    () => [
      {
        title: "ลำดับ",
        key: "no",
        width: 52,
        align: "center",
        render: (_v, _r, index) => index + 1,
      },
      {
        title: "สารเคมี",
        key: "item",
        render: (_v, row) =>
          row.itemNameTh ? `${row.itemCode ?? ""} — ${row.itemNameTh}` : "—",
      },
      {
        title: "วัตถุประสงค์",
        dataIndex: "purpose",
        key: "purpose",
        width: 160,
        render: (value: string) => CHEMICAL_ISSUE_PURPOSE_LABEL[value] ?? value,
      },
      {
        title: "จำนวนรวมที่ใช้",
        dataIndex: "totalQuantity",
        key: "totalQuantity",
        align: "right",
        render: (value: string, row) =>
          `${formatNumber(value)} ${row.unitCode ?? ""}`,
      },
      {
        title: "จำนวนใบเบิก",
        dataIndex: "issueCount",
        key: "issueCount",
        align: "right",
        width: 110,
      },
    ],
    [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeIcon} aria-hidden>
              <ExperimentOutlined />
            </span>
            Reports · Chemical Consumption
          </div>
          <h1 className={styles.pageTitle}>รายงานการใช้สารเคมี</h1>
          <p className={styles.pageSubtitle}>
            สรุปการเบิกจ่ายสารเคมีที่อนุมัติแล้ว (POSTED) แยกตามสารเคมีและวัตถุประสงค์การใช้งาน
          </p>
        </div>
        <div className={styles.heroActions}>
          <Button
            className={styles.exportBtn}
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>
      </header>

      <div className={styles.statRow}>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>จำนวนใบเบิกที่อนุมัติแล้ว</span>
          <span className={styles.statValue}>{summary?.totalIssues ?? 0}</span>
          <span className={styles.statHint}>ตามเงื่อนไขที่กรอง</span>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statLabel}>จำนวนสารเคมีที่ใช้</span>
          <span className={styles.statValue}>{summary?.distinctItems ?? 0}</span>
          <span className={styles.statHint}>รายการที่แตกต่างกัน</span>
        </div>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.filterItem}>
            <label>ช่วงวันที่เบิก</label>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              onChange={(values) =>
                setDateRange(
                  values as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
                )
              }
              format="DD/MM/YYYY"
            />
          </div>
          <div className={styles.filterItem}>
            <label>สารเคมี</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={itemId}
              onChange={setItemId}
              loading={itemsQuery.isLoading}
              options={items.map((item) => ({
                value: item.id,
                label: `${item.itemCode} — ${item.itemNameTh}`,
              }))}
            />
          </div>
          <div className={styles.filterItem}>
            <label>วัตถุประสงค์</label>
            <Select
              allowClear
              placeholder="ทั้งหมด"
              value={purpose}
              onChange={setPurpose}
              options={CHEMICAL_ISSUE_PURPOSE_OPTIONS}
            />
          </div>
          <div className={styles.filterItem}>
            <label>คลัง</label>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="ทั้งหมด"
              value={warehouseId}
              onChange={setWarehouseId}
              loading={warehousesQuery.isLoading}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.warehouseCode} — ${w.warehouseName}`,
              }))}
            />
          </div>
        </div>
        <div className={styles.filterActions}>
          <Button onClick={clearFilters}>เคลียร์</Button>
          <Button
            type="primary"
            className={styles.searchBtn}
            icon={<SearchOutlined />}
            onClick={applySearch}
          >
            ค้นหา
          </Button>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            พบทั้งหมด <strong>{rows.length}</strong> รายการ
          </div>
        </div>

        <Table
          rowKey={(row) => `${row.itemId}-${row.purpose}`}
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          className={styles.table}
          locale={{
            emptyText: (
              <div className={styles.emptyState}>
                <strong>ไม่พบข้อมูลการใช้สารเคมีตามเงื่อนไขที่ค้นหา</strong>
                ลองปรับช่วงวันที่หรือตัวกรองอื่น
              </div>
            ),
          }}
        />
      </section>
    </div>
  );
}
