"use client";

import type { ReactNode } from "react";
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

import { usePayablePurchaseOrderQuery } from "@/hooks/payable-purchase-orders/usePayablePurchaseOrders";
import { AP_VAT_MODE_LABEL } from "@/types/ap-documents";
import {
  CREDIT_BASE_SOURCE_LABEL,
  PAYABLE_ITEM_STATUS_COLOR,
  PAYABLE_ITEM_STATUS_LABEL,
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
  const query = usePayablePurchaseOrderQuery(id);
  const po = query.data;

  if (query.isLoading) return <Spin />;
  if (!po) {
    return (
      <Result
        status="404"
        title="ไม่พบรายการจ่ายเงิน"
        subTitle={
          query.error instanceof Error
            ? query.error.message
            : "ใบสั่งซื้อนี้อาจยังไม่ผ่านอนุมัติหรือถูกยกเลิกแล้ว"
        }
        extra={<Button onClick={() => router.push(LIST_PATH)}>กลับรายการ</Button>}
      />
    );
  }

  const sections: DetailSection[] = [
    {
      key: "purchaseOrder",
      title: "ข้อมูลใบสั่งซื้อ (PO)",
      visible: true,
      render: () => <PurchaseOrderSection po={po} />,
    },
    {
      key: "financialSummary",
      title: "สรุปยอดเงิน",
      visible: true,
      render: () => <FinancialSummarySection po={po} />,
    },
    {
      key: "paymentTerm",
      title: "เงื่อนไขการชำระเงิน",
      extra: po.paymentTerm ? (
        <Tag color={PAYMENT_TERM_TYPE_COLOR[po.paymentTerm.termType]}>
          {PAYMENT_TERM_TYPE_LABEL[po.paymentTerm.termType] ?? po.paymentTerm.termType}
        </Tag>
      ) : null,
      visible: true,
      render: () => <PaymentTermSection po={po} />,
    },
    {
      key: "paymentPlan",
      title: "แผนการจ่ายเงิน",
      visible: po.paymentPlan.installments.length > 0,
      render: () => <PaymentPlanSection po={po} />,
    },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={
          <Space wrap>
            <span>รายการจ่ายเงิน {po.poNo}</span>
            <Tag color={PAYABLE_ITEM_STATUS_COLOR[po.payableStatus] ?? "default"}>
              {PAYABLE_ITEM_STATUS_LABEL[po.payableStatus as PayableItemStatus] ??
                po.payableStatus}
            </Tag>
          </Space>
        }
        extra={
          <Space wrap>
            {po.paymentTerm?.termType === "ADVANCE" && po.payableStatus !== "PAID" ? (
              <Button type="primary" onClick={() => router.push(ADVANCE_REQUESTS_PATH)}>
                ขอจ่ายมัดจำ
              </Button>
            ) : null}
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(LIST_PATH)}>
              กลับ
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          title="สถานะเทียบยอดจ่ายจริงกับยอดทั้งใบ"
          description="ยอดที่ต้องชำระ วันครบกำหนด และแผนการจ่ายยังคำนวณจากเงื่อนไขในใบสั่งซื้อ สถานะรายการใช้ยอดจ่ายที่บันทึกแล้วก่อนหัก ณ ที่จ่าย เทียบกับยอดทั้งใบ และดูว่างวดที่ยังค้างเลยวันครบกำหนดหรือยัง"
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
  const columns: ColumnsType<PayablePurchaseOrderLine> = [
    { title: "#", key: "seq", width: 48, align: "center", render: (_, __, index) => index + 1 },
    {
      title: "สินค้า",
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
      title: "จำนวน",
      key: "quantity",
      width: 130,
      align: "right",
      render: (_, line) =>
        `${line.quantity.toLocaleString("th-TH", { maximumFractionDigits: 3 })} ${line.unitName ?? ""}`,
    },
    {
      title: "ราคาต่อหน่วย",
      dataIndex: "unitPrice",
      width: 130,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: "ส่วนลด",
      dataIndex: "discountAmount",
      width: 110,
      align: "right",
      render: (value: number) => (value ? money.format(value) : "—"),
    },
    {
      title: "ยอดรวม",
      dataIndex: "amount",
      width: 140,
      align: "right",
      render: (value: number) => money.format(value),
    },
  ];

  return (
    <>
      <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="เลขที่ PO">
          <Typography.Text strong>{po.poNo}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="วันที่ PO">{formatThaiDate(po.poDate)}</Descriptions.Item>
        <Descriptions.Item label="สถานะ PO">
          {PURCHASE_ORDER_STATUS_LABEL[po.poStatus] ?? po.poStatus}
        </Descriptions.Item>
        <Descriptions.Item label="ผู้ขาย (Supplier)" span={2}>
          {po.creditor ? `${po.creditor.creditorCode} — ${po.creditor.nameTh}` : "—"}
        </Descriptions.Item>
        <Descriptions.Item label="มูลค่ารวมตาม PO">
          <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="วันที่ส่งมอบ">{formatThaiDate(po.expectedDeliveryDate)}</Descriptions.Item>
        <Descriptions.Item label="สถานะรับสินค้า">
          {PO_DELIVERY_RECEIVE_STATUS_LABEL[po.receiveStatus] ?? po.receiveStatus}
        </Descriptions.Item>
        <Descriptions.Item label="วันที่อนุมัติ">
          {po.approvedAt ? formatThaiDate(po.approvedAt.slice(0, 10)) : "—"}
        </Descriptions.Item>
        {po.paymentMethod ? (
          <Descriptions.Item label="วิธีชำระเงิน">
            {SUPPLIER_PAYMENT_METHOD_LABEL[po.paymentMethod] ?? po.paymentMethod}
          </Descriptions.Item>
        ) : null}
        {po.remark ? (
          <Descriptions.Item label="หมายเหตุ" span={3}>
            {po.remark}
          </Descriptions.Item>
        ) : null}
      </Descriptions>
      <Typography.Title level={5}>รายการสินค้า</Typography.Title>
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
  return (
    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
      <Descriptions.Item label="ยอดก่อน VAT">{money.format(po.amountBeforeVat)}</Descriptions.Item>
      {po.discountAmount > 0 ? (
        <Descriptions.Item label="ส่วนลด">{money.format(po.discountAmount)}</Descriptions.Item>
      ) : null}
      <Descriptions.Item label={`VAT (${AP_VAT_MODE_LABEL[po.vatMode] ?? po.vatMode})`}>
        {money.format(po.vatAmount)}
      </Descriptions.Item>
      <Descriptions.Item label="ยอดสุทธิ PO">
        <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label="ยอดที่ต้องชำระตามเงื่อนไข">
        <Typography.Text strong style={{ fontSize: 16 }}>
          {money.format(po.amountDue)}
        </Typography.Text>
        {po.paymentPlan.termType === "ADVANCE" && po.amountDue < po.totalAmount ? (
          <Typography.Text type="secondary"> (งวดมัดจำ)</Typography.Text>
        ) : null}
      </Descriptions.Item>
      <Descriptions.Item label="สกุลเงิน">{po.currency === "THB" ? "บาท (THB)" : po.currency}</Descriptions.Item>
    </Descriptions>
  );
}

function PaymentTermSection({ po }: { po: PayablePurchaseOrderDetail }) {
  const term = po.paymentTerm;
  const plan = po.paymentPlan;
  if (!term) {
    return (
      <Alert
        type="warning"
        showIcon
        title="PO ไม่ระบุเงื่อนไขชำระ"
        description="ถือยอดเต็มตาม PO และยังไม่มีกำหนดชำระ"
      />
    );
  }

  const termName = `${term.code} — ${term.name} (${describeTerm(term)})`;

  if (term.termType === "ADVANCE") {
    const deposit = plan.installments.find((item) => item.kind === "DEPOSIT");
    const balance = plan.installments.find((item) => item.kind === "BALANCE");
    return (
      <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
        <Descriptions.Item label="เงื่อนไข" span={2}>
          {termName}
        </Descriptions.Item>
        <Descriptions.Item label="เปอร์เซ็นต์มัดจำ">{plan.depositPercent ?? 100}%</Descriptions.Item>
        <Descriptions.Item label="ยอดมัดจำที่ต้องชำระ">
          <Typography.Text strong>{money.format(plan.depositAmount ?? 0)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="ยอดส่วนที่เหลือตามแผน">
          {balance ? money.format(plan.remainingAmount ?? 0) : "— (ชำระเต็มจำนวนล่วงหน้า)"}
        </Descriptions.Item>
        <Descriptions.Item label="กำหนดชำระตาม PO">
          <div>
            มัดจำ: {deposit?.dueNote ?? "ชำระก่อนรับสินค้า"}
            {po.expectedDeliveryDate ? ` (กำหนดส่งมอบ ${formatThaiDate(po.expectedDeliveryDate)})` : ""}
          </div>
          {balance ? (
            <div>
              ส่วนที่เหลือ: {balance.dueNote}
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
        <Descriptions.Item label="เงื่อนไข" span={2}>
          {termName}
        </Descriptions.Item>
        <Descriptions.Item label="ยอดที่ต้องชำระตาม PO">
          <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="เงื่อนไขชำระ">ชำระเต็มจำนวนเมื่อรับสินค้า</Descriptions.Item>
        <Descriptions.Item label="วันส่งมอบตาม PO">
          {formatThaiDate(po.expectedDeliveryDate)}
        </Descriptions.Item>
      </Descriptions>
    );
  }

  const credit = plan.installments.find((item) => item.kind === "CREDIT");
  return (
    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
      <Descriptions.Item label="เงื่อนไข" span={2}>
        {termName}
      </Descriptions.Item>
      <Descriptions.Item label="จำนวนวันเครดิต">{plan.creditDays ?? term.creditDays} วัน</Descriptions.Item>
      <Descriptions.Item label="ฐานวันที่เริ่มนับเครดิต">
        {plan.creditBaseSource
          ? `${CREDIT_BASE_SOURCE_LABEL[plan.creditBaseSource]} — ${formatThaiDate(plan.creditBaseDate)}`
          : "—"}
      </Descriptions.Item>
      {credit?.dueDate ? (
        <Descriptions.Item label="วันครบกำหนดชำระ">
          <Typography.Text strong>{formatThaiDate(credit.dueDate)}</Typography.Text>
        </Descriptions.Item>
      ) : null}
      <Descriptions.Item label="ยอดที่ต้องชำระ">{money.format(po.totalAmount)}</Descriptions.Item>
    </Descriptions>
  );
}

function PaymentPlanSection({ po }: { po: PayablePurchaseOrderDetail }) {
  const installments = po.paymentPlan.installments;
  const total = installments.reduce((sum, item) => sum + item.amount, 0);

  const columns: ColumnsType<PaymentInstallment> = [
    { title: "งวด", dataIndex: "seq", width: 64, align: "center" },
    { title: "รายการ", dataIndex: "label" },
    {
      title: "สัดส่วน",
      dataIndex: "percent",
      width: 100,
      align: "right",
      render: (value: number) => `${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`,
    },
    {
      title: "จำนวนเงิน",
      dataIndex: "amount",
      width: 150,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: "กำหนดชำระ",
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
        แผนการจ่ายตามเงื่อนไขใน PO — ไม่ใช่ประวัติการจ่ายเงินจริง
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
              <Typography.Text strong>รวมตามแผน</Typography.Text>
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
