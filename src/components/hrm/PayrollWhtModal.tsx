"use client";

import { useState } from "react";
import { Alert, App, Button, Modal, Select, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PrinterOutlined } from "@ant-design/icons";

import { useWithholdingCertificatesQuery } from "@/hooks/payroll/usePayroll";
import { getCompanyInfoSnapshot } from "@/lib/company/company-info";
import type { WithholdingCertificate } from "@/types/payroll";
import { ensureCompanyInfo, releasePdfWindow, reservePdfWindow } from "@/utils/pdf-common";
import {
  openWhtCertificatesPdf,
  type WhtCertificatePdfData,
} from "@/utils/generateWhtCertificatePdf";

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = { open: boolean; onClose: () => void };

function toPdfData(
  year: number,
  index: number,
  c: WithholdingCertificate,
  payer: { name: string; taxId?: string; address?: string },
): WhtCertificatePdfData {
  const lastPayment = c.payments[c.payments.length - 1]?.paymentDate ?? `${year}-12-31`;
  const incomeType = "เงินเดือน ค่าจ้าง เบี้ยเลี้ยง โบนัส ฯลฯ ตามมาตรา 40 (1)";
  return {
    certNo: `50TW-${year}-${c.employeeCode ?? String(index + 1).padStart(3, "0")}`,
    taxForm: "PND1",
    incomeType,
    paymentDate: lastPayment,
    baseAmount: c.totalIncome,
    rate: 0,
    whtAmount: c.totalWithholdingTax,
    lines: [
      {
        incomeType,
        baseAmount: c.totalIncome,
        rate: null,
        whtAmount: c.totalWithholdingTax,
      },
    ],
    fundLines: [
      { label: "เงินสะสมกองทุนสำรองเลี้ยงชีพ", amount: c.totalProvidentFund },
      { label: "เงินสมทบประกันสังคม", amount: c.totalSocialSecurity },
    ],
    issuedAt: new Date().toISOString().slice(0, 10),
    payer,
    payee: { name: c.displayName, taxId: c.nationalId ?? undefined, address: c.address ?? undefined },
    referenceText: `รวม ${c.payments.length} งวดที่จ่ายในปี ${year + 543}`,
  };
}

/** 50 ทวิ เงินเดือนรายปี — รวมเฉพาะงวดที่ปิดแล้ว พิมพ์รายคนหรือทั้งบริษัท */
export default function PayrollWhtModal({ open, onClose }: Props) {
  const { message } = App.useApp();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const query = useWithholdingCertificatesQuery(year, open);
  const items = query.data?.data.items ?? [];

  const print = async (list: Array<{ c: WithholdingCertificate; index: number }>) => {
    reservePdfWindow();
    try {
      await ensureCompanyInfo();
      const company = getCompanyInfoSnapshot();
      const payer = { name: company.nameTh, taxId: company.taxId, address: company.addressText };
      await openWhtCertificatesPdf(list.map(({ c, index }) => toPdfData(year, index, c, payer)));
    } catch (error) {
      releasePdfWindow();
      message.error(error instanceof Error ? error.message : "สร้าง PDF ไม่สำเร็จ");
    }
  };

  const columns: ColumnsType<WithholdingCertificate> = [
    {
      title: "พนักงาน",
      key: "user",
      render: (_v, c) => (
        <div>
          <strong>{c.displayName}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[c.employeeCode, c.position].filter(Boolean).join(" · ") || "—"}
          </div>
          {!c.nationalId ? <Tag color="orange">ไม่มีเลขประจำตัวประชาชน</Tag> : null}
          {!c.address ? <Tag color="orange">ไม่มีที่อยู่</Tag> : null}
        </div>
      ),
    },
    { title: "จำนวนงวด", key: "n", width: 90, align: "center", render: (_v, c) => c.payments.length },
    { title: "เงินได้รวม", key: "income", width: 130, align: "right", render: (_v, c) => money(c.totalIncome) },
    { title: "ภาษีที่หัก", key: "tax", width: 120, align: "right", render: (_v, c) => money(c.totalWithholdingTax) },
    { title: "ประกันสังคม", key: "ss", width: 110, align: "right", render: (_v, c) => money(c.totalSocialSecurity) },
    { title: "กองทุน", key: "pf", width: 110, align: "right", render: (_v, c) => money(c.totalProvidentFund) },
    {
      title: "",
      key: "act",
      width: 90,
      render: (_v, c) => (
        <Button
          size="small"
          icon={<PrinterOutlined />}
          onClick={() => void print([{ c, index: items.indexOf(c) }])}
        >
          พิมพ์
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      title="หนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) — เงินเดือน"
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <span>ปีภาษี</span>
        <Select
          value={year}
          onChange={setYear}
          style={{ width: 140 }}
          options={[0, 1, 2, 3].map((i) => ({
            value: thisYear - i,
            label: `${thisYear - i + 543} (${thisYear - i})`,
          }))}
        />
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          disabled={items.length === 0}
          onClick={() => void print(items.map((c, index) => ({ c, index })))}
        >
          พิมพ์ทั้งหมด ({items.length})
        </Button>
      </Space>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title="รวมเฉพาะงวดที่ปิดงวดแล้ว โดยถือวันสิ้นสุดงวดเป็นวันที่จ่าย (ถ้าปิดงวดก่อนสิ้นสุดงวด ใช้วันปิดงวดแทน) — เลขประจำตัวประชาชนและที่อยู่ตั้งได้ที่ฟอร์มผู้ใช้งาน /users"
      />
      <Table
        rowKey="userId"
        size="small"
        loading={query.isLoading}
        columns={columns}
        dataSource={items}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: "ยังไม่มีงวดที่ปิดแล้วในปีนี้" }}
        scroll={{ x: 800 }}
      />
    </Modal>
  );
}
