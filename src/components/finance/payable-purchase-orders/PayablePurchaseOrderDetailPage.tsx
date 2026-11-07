"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { useT } from "@/lib/i18n/useT";
import { usePayablePurchaseOrderQuery } from "@/hooks/payable-purchase-orders/usePayablePurchaseOrders";
import { AP_VAT_MODE_LABEL } from "@/types/ap-documents";
import {
  CREDIT_BASE_SOURCE_LABEL,
  PAYABLE_ITEM_STATUS_COLOR,
  PAYABLE_ITEM_STATUS_LABEL,
  type PayableApDueDate,
  type PayableItemStatus,
  type PayablePurchaseOrderDetail,
  type PayablePurchaseOrderLine,
  type PaymentInstallment,
} from "@/types/payable-purchase-orders";
import { PAYMENT_TERM_TYPE_COLOR, PAYMENT_TERM_TYPE_LABEL } from "@/types/payment-terms";
import { PO_DELIVERY_RECEIVE_STATUS_LABEL } from "@/types/po-delivery-schedules";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";

import { describeTerm, formatThaiDate, money } from "./payableFormat";
import PageHeader from "@/components/common/PageHeader";

const LIST_PATH = "/finance/payables/creditors";
const ADVANCE_REQUESTS_PATH = "/finance/payables/advance-requests";

/**
 * Section ของหน้า — Phase ถัดไปเพิ่ม `goodsReceipts` / `apDocuments` / `payments` / `history`
 * เป็นรายการใหม่ในอาร์เรย์ ไม่ต้องจัดหน้าใหม่ · `visible: false` = ยังไม่มีข้อมูลจริง ไม่แสดง
 */
type DetailSection = {
  key: string;
  title: string;
  extra?: ReactNode;
  visible: boolean;
  render: () => ReactNode;
};

type Props = { id: string };

export default function PayablePurchaseOrderDetailPage({ id }: Props) {
  const router = useRouter();
  const t = useT();
  const query = usePayablePurchaseOrderQuery(id);
  const po = query.data;

  if (query.isLoading) return <Spin />;
  if (!po) {
    return (
      <Result
        status="404"
        title={t("ไม่พบรายการจ่ายเงิน")}
        subTitle={
          query.error instanceof Error
            ? query.error.message
            : t("ใบสั่งซื้อนี้อาจยังไม่ผ่านอนุมัติหรือถูกยกเลิกแล้ว")
        }
        extra={<Button onClick={() => router.push(LIST_PATH)}>{t("กลับรายการ")}</Button>}
      />
    );
  }

  const sections: DetailSection[] = [
    {
      key: "purchaseOrder",
      title: t("ข้อมูลใบสั่งซื้อ (PO)"),
      visible: true,
      render: () => <PurchaseOrderSection po={po} />,
    },
    {
      key: "financialSummary",
      title: t("สรุปยอดเงิน"),
      visible: true,
      render: () => <FinancialSummarySection po={po} />,
    },
    {
      key: "paymentTerm",
      title: t("เงื่อนไขการชำระเงิน"),
      extra: po.paymentTerm ? (
        <Tag color={PAYMENT_TERM_TYPE_COLOR[po.paymentTerm.termType]}>
          {t(PAYMENT_TERM_TYPE_LABEL[po.paymentTerm.termType] ?? po.paymentTerm.termType)}
        </Tag>
      ) : null,
      visible: true,
      render: () => <PaymentTermSection po={po} />,
    },
    {
      key: "apDueDates",
      title: t("วันครบกำหนดตามใบตั้งหนี้"),
      visible: (po.apDueDates?.length ?? 0) > 0,
      render: () => <ApDueDatesSection aps={po.apDueDates ?? []} />,
    },
    {
      key: "paymentPlan",
      title: t("แผนการจ่ายเงิน"),
      visible: po.paymentPlan.installments.length > 0,
      render: () => <PaymentPlanSection po={po} />,
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        title={<>{t("รายการจ่ายเงิน")} {po.poNo}</>}
        meta={
          <>
<Tag color={PAYABLE_ITEM_STATUS_COLOR[po.payableStatus] ?? "default"}>
              {t(
                PAYABLE_ITEM_STATUS_LABEL[po.payableStatus as PayableItemStatus] ??
                  po.payableStatus,
              )}
            </Tag>
          </>
        }
        actions={
          <>
            {po.paymentTerm?.termType === "ADVANCE" && po.payableStatus !== "PAID" ? (
              <Button type="primary" onClick={() => router.push(ADVANCE_REQUESTS_PATH)}>
                {t("ขอจ่ายมัดจำ")}
              </Button>
            ) : null}
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST_PATH)}>
              {t("กลับ")}
            </Button>
          
          </>
        }
      />

      <Card>
        <Alert
          type="info"
          showIcon
          title={t("สถานะเทียบยอดจ่ายจริงกับยอดทั้งใบ")}
          description={t(
            "หลังตั้งหนี้แล้ววันครบกำหนดมาจากใบตั้งหนี้ · ยังไม่ตั้งหนี้ใช้ประมาณการจากเงื่อนไขใน PO · สถานะเทียบยอดจ่ายจริงกับยอดทั้งใบ และดูว่างวดที่ยังค้างเลยกำหนดหรือยัง",
          )}
        />
      </Card>

      {sections
        .filter((section) => section.visible)
        .map((section) => (
          <Card key={section.key} id={section.key} title={section.title} extra={section.extra}>
            {section.render()}
          </Card>
        ))}
    </Space>
  );
}

function PurchaseOrderSection({ po }: { po: PayablePurchaseOrderDetail }) {
  const t = useT();
  const columns: ColumnsType<PayablePurchaseOrderLine> = [
    { title: "#", key: "seq", width: 48, align: "center", render: (_, __, index) => index + 1 },
    {
      title: t("สินค้า"),
      key: "item",
      render: (_, line) => (
        <div>
          <Typography.Text type="secondary">{line.itemCode ?? ""}</Typography.Text>{" "}
          {line.itemName ?? "—"}
          {line.description ? (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {line.description}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: t("จำนวน"),
      key: "quantity",
      width: 130,
      align: "right",
      render: (_, line) =>
        `${line.quantity.toLocaleString("th-TH", { maximumFractionDigits: 3 })} ${line.unitName ?? ""}`,
    },
    {
      title: t("ราคาต่อหน่วย"),
      dataIndex: "unitPrice",
      width: 130,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: t("ส่วนลด"),
      dataIndex: "discountAmount",
      width: 110,
      align: "right",
      render: (value: number) => (value ? money.format(value) : "—"),
    },
    {
      title: t("ยอดรวม"),
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (value: number) => money.format(value),
    },
  ];

  return (
    <>
      <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label={t("เลขที่ PO")}>
          <Typography.Text strong>{po.poNo}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("วันที่ PO")}>{formatThaiDate(po.poDate)}</Descriptions.Item>
        <Descriptions.Item label={t("สถานะ PO")}>
          {t(PURCHASE_ORDER_STATUS_LABEL[po.poStatus] ?? po.poStatus)}
        </Descriptions.Item>
        <Descriptions.Item label={t("ผู้ขาย (Supplier)")} span={2}>
          {po.creditor ? `${po.creditor.creditorCode} — ${po.creditor.nameTh}` : "—"}
        </Descriptions.Item>
        <Descriptions.Item label={t("มูลค่ารวมตาม PO")}>
          <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("วันที่ส่งมอบ")}>{formatThaiDate(po.expectedDeliveryDate)}</Descriptions.Item>
        <Descriptions.Item label={t("สถานะรับสินค้า")}>
          {t(PO_DELIVERY_RECEIVE_STATUS_LABEL[po.receiveStatus] ?? po.receiveStatus)}
        </Descriptions.Item>
        <Descriptions.Item label={t("วันที่อนุมัติ")}>
          {po.approvedAt ? formatThaiDate(po.approvedAt.slice(0, 10)) : "—"}
        </Descriptions.Item>
        {po.paymentMethod ? (
          <Descriptions.Item label={t("วิธีชำระเงิน")}>
            {t(SUPPLIER_PAYMENT_METHOD_LABEL[po.paymentMethod] ?? po.paymentMethod)}
          </Descriptions.Item>
        ) : null}
        {po.remark ? (
          <Descriptions.Item label={t("หมายเหตุ")} span={3}>
            {po.remark}
          </Descriptions.Item>
        ) : null}
      </Descriptions>
      <Typography.Title level={5}>{t("รายการสินค้า")}</Typography.Title>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={po.items}
        pagination={false}
        scroll={{ x: 720 }}
      />
    </>
  );
}

function FinancialSummarySection({ po }: { po: PayablePurchaseOrderDetail }) {
  const t = useT();
  return (
    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
      <Descriptions.Item label={t("ยอดก่อน VAT")}>{money.format(po.amountBeforeVat)}</Descriptions.Item>
      {po.discountAmount > 0 ? (
        <Descriptions.Item label={t("ส่วนลด")}>{money.format(po.discountAmount)}</Descriptions.Item>
      ) : null}
      <Descriptions.Item label={`VAT (${t(AP_VAT_MODE_LABEL[po.vatMode] ?? po.vatMode)})`}>
        {money.format(po.vatAmount)}
      </Descriptions.Item>
      {po.extraChargesAmount > 0 ? (
        <>
          <Descriptions.Item label={t("ค่าสินค้า (รวม VAT)")}>{money.format(po.goodsAmount)}</Descriptions.Item>
          <Descriptions.Item label={t("ค่าใช้จ่ายเพิ่มเติม (รวม VAT)")}>
            {money.format(po.extraChargesAmount)} · {t("ตั้งหนี้แล้ว")} {money.format(po.extraChargesInvoiced)} · {t("คงเหลือ")}{" "}
            {money.format(po.extraChargesRemaining)}
          </Descriptions.Item>
        </>
      ) : null}
      <Descriptions.Item label={t("ยอดสุทธิ PO")}>
        <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label={t("ยอดที่ต้องชำระตามเงื่อนไข")}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          {money.format(po.amountDue)}
        </Typography.Text>
        {po.paymentPlan.termType === "ADVANCE" && po.amountDue < po.totalAmount ? (
          <Typography.Text type="secondary"> ({t("งวดมัดจำ")})</Typography.Text>
        ) : null}
      </Descriptions.Item>
      <Descriptions.Item label={t("สกุลเงิน")}>{po.currency === "THB" ? t("บาท (THB)") : po.currency}</Descriptions.Item>
    </Descriptions>
  );
}

function PaymentTermSection({ po }: { po: PayablePurchaseOrderDetail }) {
  const t = useT();
  const term = po.paymentTerm;
  const plan = po.paymentPlan;
  if (!term) {
    return (
      <Alert
        type="warning"
        showIcon
        title={t("PO ไม่ระบุเงื่อนไขชำระ")}
        description={t("ถือยอดเต็มตาม PO และยังไม่มีกำหนดชำระ")}
      />
    );
  }

  const termName = `${term.code} — ${term.name} (${describeTerm(term)})`;

  if (term.termType === "ADVANCE") {
    const deposit = plan.installments.find((item) => item.kind === "DEPOSIT");
    const balance = plan.installments.find((item) => item.kind === "BALANCE");
    return (
      <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
        <Descriptions.Item label={t("เงื่อนไข")} span={2}>
          {termName}
        </Descriptions.Item>
        <Descriptions.Item label={t("เปอร์เซ็นต์มัดจำ")}>{plan.depositPercent ?? 100}%</Descriptions.Item>
        <Descriptions.Item label={t("ยอดมัดจำที่ต้องชำระ")}>
          <Typography.Text strong>{money.format(plan.depositAmount ?? 0)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("ยอดส่วนที่เหลือตามแผน")}>
          {balance ? money.format(plan.remainingAmount ?? 0) : t("— (ชำระเต็มจำนวนล่วงหน้า)")}
        </Descriptions.Item>
        <Descriptions.Item label={t("กำหนดชำระตาม PO")}>
          <div>
            {t("มัดจำ")}: {deposit?.dueNote ?? t("ชำระก่อนรับสินค้า")}
            {po.expectedDeliveryDate
              ? ` (${t("กำหนดส่งมอบ")} ${formatThaiDate(po.expectedDeliveryDate)})`
              : ""}
          </div>
          {balance ? (
            <div>
              {t("ส่วนที่เหลือ")}: {balance.dueNote}
              {balance.dueDate ? ` (${formatThaiDate(balance.dueDate)})` : ""}
            </div>
          ) : null}
        </Descriptions.Item>
      </Descriptions>
    );
  }

  if (term.termType === "ON_RECEIPT") {
    return (
      <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
        <Descriptions.Item label={t("เงื่อนไข")} span={2}>
          {termName}
        </Descriptions.Item>
        <Descriptions.Item label={t("ยอดที่ต้องชำระตาม PO")}>
          <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t("เงื่อนไขชำระ")}>{t("ชำระเต็มจำนวนเมื่อรับสินค้า")}</Descriptions.Item>
        <Descriptions.Item label={t("วันส่งมอบตาม PO")}>
          {formatThaiDate(po.expectedDeliveryDate)}
        </Descriptions.Item>
      </Descriptions>
    );
  }

  const fromAp = plan.creditBaseSource === "AP_INVOICE" || (po.apDueDates?.length ?? 0) > 0;
  const credit = plan.installments.find((item) => item.kind === "CREDIT");
  return (
    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
      <Descriptions.Item label={t("เงื่อนไข")} span={2}>
        {termName}
      </Descriptions.Item>
      <Descriptions.Item label={t("จำนวนวันเครดิต")}>{t("{n} วัน", { n: plan.creditDays ?? term.creditDays })}</Descriptions.Item>
      <Descriptions.Item label={t("ฐานวันที่เริ่มนับเครดิต")}>
        {fromAp
          ? t("ตามวันครบกำหนดของใบตั้งหนี้ (นับจากวันที่ใบแจ้งหนี้ Supplier)")
          : plan.creditBaseSource
            ? `${t(CREDIT_BASE_SOURCE_LABEL[plan.creditBaseSource])} — ${formatThaiDate(plan.creditBaseDate)}`
            : "—"}
      </Descriptions.Item>
      {po.dueDate ? (
        <Descriptions.Item label={t("วันครบกำหนดชำระ")}>
          <Typography.Text strong>{formatThaiDate(po.dueDate)}</Typography.Text>
          {fromAp && (po.apDueDates?.length ?? 0) > 1 ? (
            <Typography.Text type="secondary"> ({t("เร็วสุดจาก {n} ใบ", { n: po.apDueDates.length })})</Typography.Text>
          ) : null}
        </Descriptions.Item>
      ) : credit?.dueDate ? (
        <Descriptions.Item label={t("วันครบกำหนดชำระ (ประมาณการ)")}>
          <Typography.Text strong>{formatThaiDate(credit.dueDate)}</Typography.Text>
        </Descriptions.Item>
      ) : null}
      <Descriptions.Item label={t("ยอดที่ต้องชำระ")}>{money.format(po.totalAmount)}</Descriptions.Item>
    </Descriptions>
  );
}

function ApDueDatesSection({ aps }: { aps: PayableApDueDate[] }) {
  const t = useT();
  const columns: ColumnsType<PayableApDueDate> = [
    {
      title: t("เลขที่ใบตั้งหนี้"),
      dataIndex: "docNo",
      render: (no, row) => <Link href={`/finance/payables/ap-invoices/${row.id}`}>{no}</Link>,
    },
    {
      title: t("วันครบกำหนด"),
      dataIndex: "dueDate",
      width: 140,
      render: (v: string) => formatThaiDate(v),
    },
    {
      title: t("ยอดตั้งหนี้"),
      dataIndex: "totalAmount",
      width: 140,
      align: "right",
      render: (v: number) => money.format(v),
    },
  ];
  return (
    <>
      <Typography.Paragraph type="secondary">
        {t("หลังตั้งหนี้แล้วใช้วันครบกำหนดของแต่ละใบตั้งหนี้เป็นหลัก (สอดคล้องกับหน้า AP และใบวางบิล)")}
      </Typography.Paragraph>
      <Table rowKey="id" size="small" columns={columns} dataSource={aps} pagination={false} />
    </>
  );
}

function PaymentPlanSection({ po }: { po: PayablePurchaseOrderDetail }) {
  const t = useT();
  const installments = po.paymentPlan.installments;
  const total = installments.reduce((sum, item) => sum + item.amount, 0);

  const columns: ColumnsType<PaymentInstallment> = [
    { title: t("งวด"), dataIndex: "seq", width: 64, align: "center" },
    { title: t("รายการ"), dataIndex: "label" },
    {
      title: t("สัดส่วน"),
      dataIndex: "percent",
      width: 100,
      align: "right",
      render: (value: number) => `${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`,
    },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "amount",
      width: 150,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: t("กำหนดชำระ"),
      key: "due",
      width: 260,
      render: (_, item) => (
        <div>
          <div>{item.dueDate ? formatThaiDate(item.dueDate) : "—"}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {item.dueNote}
          </Typography.Text>
        </div>
      ),
    },
  ];

  return (
    <>
      <Typography.Paragraph type="secondary">
        {po.paymentPlan.creditBaseSource === "AP_INVOICE"
          ? t("แผนตามใบตั้งหนี้ที่ผูก PO — วันครบกำหนดแยกตามแต่ละใบ")
          : t("แผนการจ่ายตามเงื่อนไขใน PO (ประมาณการ) — ไม่ใช่ประวัติการจ่ายเงินจริง")}
      </Typography.Paragraph>
      <Table
        rowKey="seq"
        size="small"
        columns={columns}
        dataSource={installments}
        pagination={false}
        scroll={{ x: 640 }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3} align="right">
              <Typography.Text strong>{t("รวมตามแผน")}</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Typography.Text strong>{money.format(total)}</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        )}
      />
    </>
  );
}
