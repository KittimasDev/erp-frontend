"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Alert, App, Button, Modal, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useAddSalesInvoiceDeliveriesMutation,
  useRemoveSalesInvoiceDeliveryMutation,
} from "@/hooks/sales-invoices/useSalesInvoiceMutations";
import {
  useAdvanceCandidatesQuery,
  usePendingSalesInvoicesQuery,
} from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { useT } from "@/lib/i18n/useT";
import type {
  SalesInvoice,
  SalesInvoiceApiResponse,
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
  const { modal, message } = App.useApp();
  const removeMutation = useRemoveSalesInvoiceDeliveryMutation();
  const [addOpen, setAddOpen] = useState(false);

  const deliveries: SalesInvoiceDeliveryOrderSummary[] =
    invoice.deliveryOrders && invoice.deliveryOrders.length > 0
      ? invoice.deliveryOrders
      : invoice.deliveryOrder
        ? [invoice.deliveryOrder]
        : [];
  const editable = canEdit && invoice.status === "DRAFT";

  // ยอดหักมัดจำ "ที่ user แก้เอง" = มียอดหักบนใบร่าง และไม่ตรงกับยอดแนะนำของชุด DN ปัจจุบัน
  // (ไม่มีข้อมูลแนะนำ/โหลดไม่ได้ → ถือว่าแก้เอง เพื่อเตือนไว้ก่อน)
  const hasDeductions = (invoice.advanceDeductions ?? []).length > 0;
  const candidatesQuery = useAdvanceCandidatesQuery(
    editable && hasDeductions ? invoice.salesOrderId : undefined,
    deliveries.map((d) => d.id),
    invoice.id,
  );
  const suggested = candidatesQuery.data?.data.suggestedAllocations;
  const deductionsEdited =
    hasDeductions &&
    (!suggested ||
      suggested.length !== (invoice.advanceDeductions ?? []).length ||
      (invoice.advanceDeductions ?? []).some((row) => {
        const hit = suggested.find((s) => s.advanceReceiptId === row.advanceReceiptId);
        return !hit || Math.abs(Number(hit.amount) - Number(row.amount)) > 0.004;
      }));
  const deductionTotalBefore = sumAdvanceDeductions(invoice);
  /** หลังเพิ่ม/เอา DN ออกสำเร็จ — ถ้ายอดหักมัดจำรวมเปลี่ยน ให้แจ้งยอดใหม่ */
  const notifyDeductionChange = (res: SalesInvoiceApiResponse) => {
    const after = sumAdvanceDeductions(res.data);
    if (Math.abs(after - deductionTotalBefore) > 0.004) {
      message.info(
        t("ยอดหักมัดจำถูกปรับ: {before} → {after}", {
          before: formatMoney(deductionTotalBefore),
          after: formatMoney(after),
        }),
      );
    }
  };

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
                      content: (
                        <div>
                          <p style={{ marginTop: 0 }}>
                            {t("รายการและยอดของ DN นี้จะถูกตัดออก แล้ว DN กลับไปรอตั้งหนี้")}
                          </p>
                          {deductionsEdited ? (
                            <Alert type="warning" showIcon title={t(ADVANCE_RECALC_WARNING)} />
                          ) : null}
                        </div>
                      ),
                      okText: t("เอาออก"),
                      cancelText: t("ยกเลิก"),
                      okButtonProps: { danger: true },
                      onOk: async () => {
                        try {
                          const res = await removeMutation.mutateAsync({
                            id: invoice.id,
                            deliveryOrderId: row.id,
                          });
                          notifyDeductionChange(res);
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
    [deliveries.length, editable, invoice.id, removeMutation.isPending, t, deductionsEdited, deductionTotalBefore],
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
        <AddDeliveriesModal
          invoice={invoice}
          deductionsEdited={deductionsEdited}
          onAdded={notifyDeductionChange}
          onClose={() => setAddOpen(false)}
        />
      ) : null}
    </div>
  );
}

const ADVANCE_RECALC_WARNING =
  "ยอดหักมัดจำที่คุณแก้ไขไว้ จะถูกคำนวณใหม่หรือปรับตามเพดานใหม่ของชุดใบส่งสินค้า — ตรวจสอบยอดหักอีกครั้งหลังบันทึก";

function sumAdvanceDeductions(invoice?: Pick<SalesInvoice, "advanceDeductions">) {
  return (invoice?.advanceDeductions ?? []).reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** เลือก DN รอตั้งหนี้ของใบสั่งขายเดียวกัน — mount เฉพาะตอนเปิด เพื่อไม่ยิง query โดยไม่จำเป็น */
function AddDeliveriesModal({
  invoice,
  deductionsEdited,
  onAdded,
  onClose,
}: {
  invoice: SalesInvoice;
  /** ยอดหักมัดจำบนใบร่างถูกแก้เอง — เตือนก่อนเพิ่ม DN */
  deductionsEdited: boolean;
  onAdded: (res: SalesInvoiceApiResponse) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { modal } = App.useApp();
  const addMutation = useAddSalesInvoiceDeliveriesMutation();
  const [picked, setPicked] = useState<string[]>([]);
  const pending = usePendingSalesInvoicesQuery({
    page: 1,
    limit: 100,
    salesOrderId: invoice.salesOrderId,
  });
  const options = (pending.data?.data.items ?? [])
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
        if (deductionsEdited) {
          const proceed = await new Promise<boolean>((resolve) => {
            modal.confirm({
              title: t("เพิ่มใบส่งสินค้า?"),
              content: t(ADVANCE_RECALC_WARNING),
              okText: t("เพิ่มต่อ"),
              cancelText: t("ยกเลิก"),
              onOk: () => resolve(true),
              onCancel: () => resolve(false),
            });
          });
          if (!proceed) return;
        }
        try {
          const res = await addMutation.mutateAsync({
            id: invoice.id,
            deliveryOrderIds: picked,
          });
          onAdded(res);
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
