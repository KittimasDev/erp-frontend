"use client";

import { Alert, Descriptions, Drawer, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { usePayablePurchaseOrderQuery } from "@/hooks/payable-purchase-orders/usePayablePurchaseOrders";
import {
  PAYABLE_ITEM_STATUS_COLOR,
  PAYABLE_ITEM_STATUS_LABEL,
  type PayableItemStatus,
  type PayablePurchaseOrderLine,
} from "@/types/payable-purchase-orders";
import { PAYMENT_TERM_TYPE_COLOR, PAYMENT_TERM_TYPE_LABEL } from "@/types/payment-terms";
import { PO_DELIVERY_RECEIVE_STATUS_LABEL } from "@/types/po-delivery-schedules";
import { SUPPLIER_PAYMENT_METHOD_LABEL } from "@/types/purchase-payments";
import { PURCHASE_ORDER_STATUS_LABEL } from "@/types/purchase-orders";

import { describeTerm, formatThaiDate, money } from "./payableFormat";

const VAT_MODE_LABEL: Record<string, string> = {
  NONE: "ไม่คิด VAT",
  EXCLUSIVE: "VAT แยกนอก",
  INCLUSIVE: "VAT รวมใน",
};

type Props = {
  id: string | null;
  onClose: () => void;
};

export default function PayablePurchaseOrderDetailDrawer({ id, onClose }: Props) {
  const query = usePayablePurchaseOrderQuery(id);
  const po = query.data;

  const columns: ColumnsType<PayablePurchaseOrderLine> = [
    {
      title: "#",
      key: "seq",
      width: 48,
      align: "center",
      render: (_, __, index) => index + 1,
    },
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
      width: 120,
      align: "right",
      render: (_, line) =>
        `${line.quantity.toLocaleString("th-TH", { maximumFractionDigits: 3 })} ${line.unitName ?? ""}`,
    },
    {
      title: "ราคาต่อหน่วย",
      dataIndex: "unitPrice",
      width: 120,
      align: "right",
      render: (value: number) => money.format(value),
    },
    {
      title: "ส่วนลด",
      dataIndex: "discountAmount",
      width: 100,
      align: "right",
      render: (value: number) => (value ? money.format(value) : "—"),
    },
    {
      title: "จำนวนเงิน",
      dataIndex: "amount",
      width: 130,
      align: "right",
      render: (value: number) => money.format(value),
    },
  ];

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      size="large"
      styles={{ wrapper: { width: "min(960px, 96vw)" } }}
      title={po ? `รายละเอียดรายการจ่ายเงิน — ${po.poNo}` : "รายละเอียดรายการจ่ายเงิน"}
      loading={query.isLoading}
      destroyOnHidden
    >
      {query.isError ? (
        <Alert
          type="error"
          showIcon
          title={
            query.error instanceof Error ? query.error.message : "โหลดรายละเอียดไม่สำเร็จ"
          }
        />
      ) : null}
      {po ? (
        <>
          <Descriptions
            title="เงื่อนไขการชำระเงิน"
            column={{ xs: 1, sm: 2 }}
            bordered
            size="small"
            style={{ marginBottom: 20 }}
          >
            <Descriptions.Item label="ประเภทเงื่อนไข">
              {po.paymentTerm ? (
                <Tag color={PAYMENT_TERM_TYPE_COLOR[po.paymentTerm.termType]}>
                  {PAYMENT_TERM_TYPE_LABEL[po.paymentTerm.termType] ?? po.paymentTerm.termType}
                </Tag>
              ) : (
                "ไม่ระบุเงื่อนไข"
              )}
            </Descriptions.Item>
            <Descriptions.Item label="เงื่อนไข">
              {po.paymentTerm
                ? `${po.paymentTerm.code} — ${po.paymentTerm.name} (${describeTerm(po.paymentTerm)})`
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="ยอดเงินตาม PO">{money.format(po.totalAmount)}</Descriptions.Item>
            <Descriptions.Item label="ยอดที่ต้องชำระตามเงื่อนไข">
              <Typography.Text strong>{money.format(po.amountDue)}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="วันครบกำหนดชำระ">{formatThaiDate(po.dueDate)}</Descriptions.Item>
            <Descriptions.Item label="สถานะรายการ">
              <Tag color={PAYABLE_ITEM_STATUS_COLOR[po.payableStatus] ?? "default"}>
                {PAYABLE_ITEM_STATUS_LABEL[po.payableStatus as PayableItemStatus] ??
                  po.payableStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="วิธีชำระเงิน">
              {po.paymentMethod
                ? (SUPPLIER_PAYMENT_METHOD_LABEL[po.paymentMethod] ?? po.paymentMethod)
                : "—"}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions
            title="ข้อมูลใบสั่งซื้อ"
            column={{ xs: 1, sm: 2 }}
            bordered
            size="small"
            style={{ marginBottom: 20 }}
          >
            <Descriptions.Item label="เลขที่ PO">{po.poNo}</Descriptions.Item>
            <Descriptions.Item label="วันที่ PO">{formatThaiDate(po.poDate)}</Descriptions.Item>
            <Descriptions.Item label="ผู้ขาย" span={2}>
              {po.creditor ? `${po.creditor.creditorCode} — ${po.creditor.nameTh}` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="วันที่ส่งมอบ">
              {formatThaiDate(po.expectedDeliveryDate)}
            </Descriptions.Item>
            <Descriptions.Item label="วันที่อนุมัติ">
              {po.approvedAt ? formatThaiDate(po.approvedAt.slice(0, 10)) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="สถานะ PO">
              {PURCHASE_ORDER_STATUS_LABEL[po.poStatus] ?? po.poStatus}
            </Descriptions.Item>
            <Descriptions.Item label="สถานะรับสินค้า">
              {PO_DELIVERY_RECEIVE_STATUS_LABEL[po.receiveStatus] ?? po.receiveStatus}
            </Descriptions.Item>
            {po.remark ? (
              <Descriptions.Item label="หมายเหตุ" span={2}>
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
            scroll={{ x: 700 }}
          />

          <Descriptions column={1} size="small" style={{ marginTop: 16, maxWidth: 360, marginLeft: "auto" }}>
            <Descriptions.Item label="รวมเป็นเงิน">{money.format(po.subtotalAmount)}</Descriptions.Item>
            {po.discountAmount ? (
              <Descriptions.Item label="ส่วนลด">{money.format(po.discountAmount)}</Descriptions.Item>
            ) : null}
            <Descriptions.Item label={`ภาษีมูลค่าเพิ่ม (${VAT_MODE_LABEL[po.vatMode] ?? po.vatMode})`}>
              {money.format(po.vatAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="ยอดรวมทั้งสิ้น">
              <Typography.Text strong>{money.format(po.totalAmount)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        </>
      ) : null}
    </Drawer>
  );
}
