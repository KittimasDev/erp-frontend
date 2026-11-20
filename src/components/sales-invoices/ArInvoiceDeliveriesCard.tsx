"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Modal, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useAddSalesInvoiceDeliveriesMutation,
  useRemoveSalesInvoiceDeliveryMutation,
} from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import { usePendingSalesInvoicesQuery } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useT } from "@/lib/i18n/useT";
import type {
  SalesInvoice,
  SalesInvoiceDeliveryOrderSummary,
} from "@/types/sales-invoices";
import styles from "./SalesInvoiceDetailPage.module.css";

type Props = {
  invoice: SalesInvoice;
  /** แก้ DN ได้เมื่อมีสิทธิ์แก้ไขและ AR ยังเป็น DRAFT */
  canEdit: boolean;
};

/** รายการ DN ที่รวมอยู่ใน AR — DRAFT เพิ่ม/เอาออกได้ (ต้องเหลืออย่างน้อย 1 ใบ) */
export default function ArInvoiceDeliveriesCard({ invoice, canEdit }: Props) {
  const t = useT();
  const { modal } = App.useApp();
  const removeMutation = useRemoveSalesInvoiceDeliveryMutation();
  const [addOpen, setAddOpen] = useState(false);

  const deliveries: SalesInvoiceDeliveryOrderSummary[] =
    invoice.deliveryOrders && invoice.deliveryOrders.length > 0
      ? invoice.deliveryOrders
      : invoice.deliveryOrder
        ? [invoice.deliveryOrder]
        : [];
  const editable = canEdit && invoice.status === "DRAFT";

  const columns: ColumnsType<SalesInvoiceDeliveryOrderSummary> = useMemo(
    () => [
      {
        title: t("เลขที่ DO"),
        dataIndex: "deliveryOrderNo",
        render: (value: string, row) => (
          <Link href={`/delivery-orders/${row.id}`}>{value}</Link>
        ),
      },
      {
        title: t("วันที่ส่ง"),
        dataIndex: "deliveryDate",
        width: 120,
        render: (value: string) =>
          value ? dayjs(value).format("DD/MM/BBBB") : "—",
      },
      ...(editable
        ? [
            {
              title: "",
              key: "remove",
              width: 110,
              render: (_v: unknown, row: SalesInvoiceDeliveryOrderSummary) => (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={deliveries.length <= 1}
                  loading={removeMutation.isPending}
                  title={
                    deliveries.length <= 1
                      ? t("ต้องเหลืออย่างน้อย 1 ใบ — ถ้าไม่ต้องการ AR ให้ยกเลิกใบ")
                      : undefined
                  }
                  onClick={() =>
                    modal.confirm({
                      title: t("เอา {no} ออกจากใบแจ้งหนี้?", {
                        no: row.deliveryOrderNo,
                      }),
                      content: t("รายการและยอดของ DN นี้จะถูกตัดออก แล้ว DN กลับไปรอตั้งหนี้"),
                      okText: t("เอาออก"),
                      cancelText: t("ยกเลิก"),
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        try {
                          await removeMutation.mutateAsync({
                            id: invoice.id,
                            deliveryOrderId: row.id,
                          });
                        } catch {
                          // hook แจ้ง error แล้ว
                        }
                      },
                    })
                  }
                >
                  {t("เอาออก")}
                </Button>
              ),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deliveries.length, editable, invoice.id, removeMutation.isPending, t],
  );

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>
          {t("ใบส่งสินค้าที่รวมอยู่ ({n})", { n: deliveries.length })}
        </h2>
        {editable ? (
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
          >
            {t("เพิ่มใบส่งสินค้า")}
          </Button>
        ) : null}
      </div>
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={deliveries}
        pagination={false}
      />
      {addOpen ? (
        <AddDeliveriesModal invoice={invoice} onClose={() => setAddOpen(false)} />
      ) : null}
    </div>
  );
}

/** เลือก DN รอตั้งหนี้ของใบสั่งขายเดียวกัน — mount เฉพาะตอนเปิด เพื่อไม่ยิง query โดยไม่จำเป็น */
function AddDeliveriesModal({
  invoice,
  onClose,
}: {
  invoice: SalesInvoice;
  onClose: () => void;
}) {
  const t = useT();
  const addMutation = useAddSalesInvoiceDeliveriesMutation();
  const [picked, setPicked] = useState<string[]>([]);
  const pending = usePendingSalesInvoicesQuery({ page: 1, limit: 100 });
  const options = (pending.data?.data.items ?? [])
    .filter((row) => row.salesOrderId === invoice.salesOrderId)
    .map((row) => ({
      value: row.id,
      label: `${row.deliveryOrderNo} · ${dayjs(row.deliveryDate).format("DD/MM/BBBB")}${
        row.billableAmount
          ? ` · ${Number(row.billableAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
          : ""
      }`,
    }));

  return (
    <Modal
      open
      title={t("เพิ่มใบส่งสินค้าเข้า {no}", { no: invoice.invoiceNo })}
      okText={t("เพิ่ม")}
      cancelText={t("ยกเลิก")}
      okButtonProps={{ disabled: picked.length === 0 }}
      confirmLoading={addMutation.isPending}
      mask={{ closable: false }}
      onCancel={onClose}
      onOk={async () => {
        try {
          await addMutation.mutateAsync({
            id: invoice.id,
            deliveryOrderIds: picked,
          });
          onClose();
        } catch {
          // hook แจ้ง error แล้ว — ค้าง modal ไว้
        }
      }}
    >
      <p style={{ marginTop: 0, color: "#8a9199" }}>
        {t("แสดงเฉพาะใบส่งสินค้าของใบสั่งขายเดียวกัน ({so}) ที่ยังไม่อยู่ในใบแจ้งหนี้อื่น", {
          so: invoice.salesOrder?.soNo ?? "—",
        })}
      </p>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        loading={pending.isLoading}
        options={options}
        value={picked}
        onChange={setPicked}
        placeholder={t("เลือกใบส่งสินค้า")}
        notFoundContent={t("ไม่มีใบส่งสินค้ารอตั้งหนี้ของใบสั่งขายนี้")}
      />
    </Modal>
  );
}
