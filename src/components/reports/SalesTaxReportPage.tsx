"use client";

import { useMemo, useState } from "react";
import { Alert, DatePicker, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";

import FilterCard, { FilterField } from "@/components/common/FilterCard";
import PageHeader from "@/components/common/PageHeader";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { useSalesTaxReportQuery } from "@/hooks/sales-reports/useSalesTaxReportQuery";
import { formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { SalesTaxReportRow } from "@/types/sales-tax-report";

const TYPE_COLOR: Record<string, string> = {
  TAX_INVOICE: "blue",
  ADVANCE_TAX_INVOICE: "cyan",
  CREDIT_NOTE: "red",
  DEBIT_NOTE: "orange",
};

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

/**
 * รายงานภาษีขาย — ดึงจากใบกำกับภาษีจริง (ใบตั้งลูกหนี้ + ใบมัดจำ) ที่ออกแล้วและไม่ยกเลิก
 * ใบลดหนี้หักออก · ใบเพิ่มหนี้บวกเข้า · นับตามวันที่ของเอกสาร · ไม่นับ SI ซ้ำกับ TX ของใบเดียวกัน
 */
export default function SalesTaxReportPage() {
  const t = useT();
  const lang = useLanguage();
  const [draftRange, setDraftRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [draftType, setDraftType] = useState<string | undefined>();
  const [draftKeyword, setDraftKeyword] = useState("");
  const [applied, setApplied] = useState({
    range: defaultRange() as [Dayjs, Dayjs] | null,
    docType: undefined as string | undefined,
    keyword: "",
  });

  const params = useMemo(
    () => ({
      dateFrom: applied.range?.[0]?.format("YYYY-MM-DD"),
      dateTo: applied.range?.[1]?.format("YYYY-MM-DD"),
      docType: applied.docType,
      keyword: applied.keyword.trim() || undefined,
    }),
    [applied],
  );
  const query = useSalesTaxReportQuery(params);
  const data = query.data?.data;
  const summary = data?.summary;
  const money = (n: number | undefined) => formatMoney(n ?? 0, lang);
  const signed = (r: SalesTaxReportRow, n: number) => money(r.sign * n);

  const columns: ColumnsType<SalesTaxReportRow> = [
    {
      title: t("วันที่"),
      dataIndex: "docDate",
      width: 110,
      render: (v: string) => dayjs(v).format("DD/MM/BBBB"),
    },
    {
      title: t("ประเภท"),
      dataIndex: "docType",
      width: 190,
      render: (v: string, r) => <Tag color={TYPE_COLOR[v] ?? "default"}>{t(r.docTypeLabel)}</Tag>,
    },
    { title: t("เลขที่เอกสาร"), dataIndex: "docNo", width: 150 },
    { title: t("อ้างอิง"), dataIndex: "refNo", width: 150, render: (v?: string) => v || "—" },
    {
      title: t("ลูกค้า"),
      dataIndex: "customerName",
      render: (v: string, r) => (
        <div>
          <div>{v || "—"}</div>
          {r.customerTaxId ? <div style={{ fontSize: 12, opacity: 0.65 }}>{r.customerTaxId}</div> : null}
        </div>
      ),
    },
    {
      title: t("มูลค่าก่อน VAT"),
      dataIndex: "subtotalAmount",
      align: "right",
      width: 140,
      render: (v: number, r) => signed(r, v),
    },
    {
      title: t("ภาษีขาย"),
      dataIndex: "vatAmount",
      align: "right",
      width: 130,
      render: (v: number, r) => <strong>{signed(r, v)}</strong>,
    },
    {
      title: t("รวม"),
      dataIndex: "totalAmount",
      align: "right",
      width: 140,
      render: (v: number, r) => signed(r, v),
    },
  ];

  return (
    <section className={masterStyles.page}>
      <PageHeader
        eyebrow="FINANCE · REPORTS"
        title={t("รายงานภาษีขาย")}
        subtitle={t("ใบกำกับภาษีที่ออกจริง (ใบตั้งลูกหนี้และใบมัดจำ) หักใบลดหนี้ บวกใบเพิ่มหนี้ ตามวันที่ของเอกสาร")}
      />

      <div className={masterStyles.summaryRow} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryTotal}`}>
          <span className={masterStyles.summaryLabel}>{t("ภาษีขายสุทธิ")}</span>
          <strong>{money(summary?.vatAmount)}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryActive}`}>
          <span className={masterStyles.summaryLabel}>{t("ใบกำกับภาษี + ใบมัดจำ")}</span>
          <strong>
            {money((summary?.byType.TAX_INVOICE?.vatAmount ?? 0) + (summary?.byType.ADVANCE_TAX_INVOICE?.vatAmount ?? 0))}
          </strong>
        </div>
        <div className={masterStyles.summaryCard}>
          <span className={masterStyles.summaryLabel}>{t("ใบลดหนี้ (หักออก)")}</span>
          <strong>{money(-(summary?.byType.CREDIT_NOTE?.vatAmount ?? 0))}</strong>
        </div>
        <div className={`${masterStyles.summaryCard} ${masterStyles.summaryInactive}`}>
          <span className={masterStyles.summaryLabel}>{t("ใบเพิ่มหนี้ (บวกเข้า)")}</span>
          <strong>{money(summary?.byType.DEBIT_NOTE?.vatAmount)}</strong>
        </div>
      </div>

      <FilterCard
        loading={query.isFetching}
        onSearch={() => setApplied({ range: draftRange, docType: draftType, keyword: draftKeyword })}
        onClear={() => {
          const fresh = defaultRange();
          setDraftRange(fresh);
          setDraftType(undefined);
          setDraftKeyword("");
          setApplied({ range: fresh, docType: undefined, keyword: "" });
        }}
      >
        <FilterField label={t("วันที่เอกสาร")} wide>
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            format="DD/MM/BBBB"
            value={draftRange}
            onChange={(v) => setDraftRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
          />
        </FilterField>
        <FilterField label={t("ประเภทเอกสาร")}>
          <Select
            allowClear
            style={{ width: "100%" }}
            placeholder={t("ทุกประเภท")}
            value={draftType}
            onChange={setDraftType}
            options={[
              { value: "TAX_INVOICE", label: t("ใบกำกับภาษี (ใบตั้งลูกหนี้)") },
              { value: "ADVANCE_TAX_INVOICE", label: t("ใบกำกับภาษีมัดจำ") },
              { value: "CREDIT_NOTE", label: t("ใบลดหนี้") },
              { value: "DEBIT_NOTE", label: t("ใบเพิ่มหนี้") },
            ]}
          />
        </FilterField>
        <FilterField label={t("ค้นหา")}>
          <Input
            allowClear
            placeholder={t("เลขที่เอกสาร / ลูกค้า / เลขผู้เสียภาษี")}
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
          />
        </FilterField>
      </FilterCard>

      {data?.truncated ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={t("แสดงเฉพาะ 5,000 รายการแรก — ยอดสรุปด้านบนคิดจากทุกรายการ ให้ย่อช่วงวันที่เพื่อดูครบ")}
        />
      ) : null}

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>{t("รายการ")}</div>
            <h3>{t("รายการภาษีขาย")}</h3>
          </div>
          <span className={masterStyles.tableCount}>
            {lang === "en" ? `${summary?.count ?? 0} documents` : `${summary?.count ?? 0} ฉบับ`}
          </span>
        </div>
        <Table
          className={masterStyles.dataTable}
          rowKey={(r) => `${r.docType}:${r.id}`}
          size="middle"
          loading={query.isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (n) => t("ทั้งหมด {n} รายการ", { n }) }}
          summary={() =>
            summary ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <strong>{t("รวมสุทธิ")}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{money(summary.subtotalAmount)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <strong>{money(summary.vatAmount)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <strong>{money(summary.totalAmount)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </div>
    </section>
  );
}
