"use client";

import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

export type ReportExportFormat = "csv" | "xlsx" | "pdf";

type Props = {
  /** ปุ่ม PDF / Excel — ผูกสิทธิ์ EXPORT ของหน้า */
  canExport: boolean;
  /** รูปแบบที่กำลังดาวน์โหลด — กดซ้อนไม่ได้ระหว่างนี้ */
  downloading: ReportExportFormat | null;
  onExport: (format: ReportExportFormat) => void;
};

/**
 * ปุ่มส่งออกของรายงานกลุ่มขาย (ลูกหนี้ / ใบแจ้งหนี้ / รับชำระ)
 *
 * CSV แสดงเสมอเหมือนเดิม — endpoint CSV ของ backend เช็คแค่สิทธิ์ VIEW
 * PDF / Excel ที่เพิ่มทีหลังผูก EXPORT ตามรายงานตัวอื่นในระบบ
 */
export default function ReportExportButtons({ canExport, downloading, onExport }: Props) {
  const button = (format: ReportExportFormat, label: string) => (
    <Button
      key={format}
      icon={<DownloadOutlined />}
      loading={downloading === format}
      disabled={downloading !== null && downloading !== format}
      onClick={() => onExport(format)}
    >
      {label}
    </Button>
  );

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "none" }}>
      {canExport ? [button("pdf", "PDF"), button("xlsx", "Excel")] : null}
      {button("csv", "CSV")}
    </div>
  );
}
