"use client";

import { Empty, Table, Tag, Timeline } from "antd";
import type { ColumnsType } from "antd/es/table";

import { formatDateTime, formatMoney } from "@/lib/i18n/format";
import { useLanguage } from "@/lib/i18n/language";
import { useT, type TFunction } from "@/lib/i18n/useT";
import { payrollStatusLabel, PAYROLL_STATUS_COLOR, type PayrollEvent, type PayrollExportBatch, type PayrollRunStatus } from "@/types/payroll";

const ACTION_COLOR: Record<string, string> = {
  SUBMIT: "blue",
  APPROVE: "green",
  SEND_BACK: "orange",
  RETURN_TO_DRAFT: "orange",
  CANCEL: "red",
  EXPORT_PAYMENTS: "purple",
  RECORD_PAYMENT: "cyan",
  PAID: "green",
  FINALIZE: "green",
};

function actionLabel(action: string, t: TFunction): string {
  switch (action) {
    case "SUBMIT":
      return t("ส่งอนุมัติ");
    case "APPROVE":
      return t("อนุมัติ");
    case "SEND_BACK":
      return t("ส่งกลับแก้ไข");
    case "RETURN_TO_DRAFT":
      return t("ถอนกลับเป็นร่าง");
    case "CANCEL":
      return t("ยกเลิกงวด");
    case "EXPORT_PAYMENTS":
      return t("ส่งออกรายการจ่าย");
    case "RECORD_PAYMENT":
      return t("บันทึกผลจ่าย");
    case "PAID":
      return t("จ่ายครบทุกรายการ");
    case "FINALIZE":
      return t("ปิดงวด");
    default:
      return action;
  }
}

type Props = { events: PayrollEvent[]; exportBatches: PayrollExportBatch[] };

/** ประวัติเปลี่ยนสถานะ (ผู้ทำ วันเวลา สถานะก่อน–หลัง เหตุผล) + ประวัติส่งออกรายการจ่าย */
export default function PayrollHistoryTab({ events, exportBatches }: Props) {
  const t = useT();
  const language = useLanguage();
  const statusTag = (status?: string | null) =>
    status ? (
      <Tag color={PAYROLL_STATUS_COLOR[status as PayrollRunStatus] ?? "default"}>
        {payrollStatusLabel(status as PayrollRunStatus, language)}
      </Tag>
    ) : null;

  const batchColumns: ColumnsType<PayrollExportBatch> = [
    { title: t("วันที่/เวลา"), dataIndex: "exportedAt", render: (v: string) => formatDateTime(v, language) },
    { title: t("ผู้ดำเนินการ"), dataIndex: "exportedByName", render: (v?: string | null) => v ?? "—" },
    { title: t("จำนวนคน"), dataIndex: "rowCount", align: "right" },
    { title: t("ยอดรวม"), dataIndex: "totalAmount", align: "right", render: (v: number) => formatMoney(v, language) },
  ];

  return (
    <div>
      {events.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("ยังไม่มีประวัติเปลี่ยนสถานะ (งวดที่ทำก่อนมีขั้นตอนอนุมัติจะไม่มีประวัติย้อนหลัง)")}
        />
      ) : (
        <Timeline
          items={events.map((e) => ({
            key: e.id,
            color: ACTION_COLOR[e.action] ?? "gray",
            content: (
              <div>
                <Tag color={ACTION_COLOR[e.action] ?? "default"}>{actionLabel(e.action, t)}</Tag>{" "}
                <span style={{ fontSize: 13 }}>{e.performedByName ?? t("ระบบ")}</span>
                <div style={{ fontSize: 12, color: "#8a9199" }}>
                  {formatDateTime(e.performedAt, language)}
                  {e.fromStatus && e.toStatus && e.fromStatus !== e.toStatus ? (
                    <>
                      {" · "}
                      {statusTag(e.fromStatus)} → {statusTag(e.toStatus)}
                    </>
                  ) : null}
                </div>
                {e.note ? <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{e.note}</div> : null}
              </div>
            ),
          }))}
        />
      )}
      {exportBatches.length > 0 ? (
        <>
          <h4 style={{ margin: "16px 0 8px" }}>{t("ประวัติส่งออกรายการจ่าย")}</h4>
          <Table rowKey="id" size="small" columns={batchColumns} dataSource={exportBatches} pagination={false} />
        </>
      ) : null}
    </div>
  );
}
