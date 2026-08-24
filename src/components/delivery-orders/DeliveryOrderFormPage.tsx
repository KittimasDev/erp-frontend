"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  Spin,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ExportOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  SaveOutlined,
  SendOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelDeliveryOrderMutation,
  useConfirmDeliveryOrderMutation,
  useDeliverDeliveryOrderMutation,
  useUpdateDeliveryOrderMutation,
} from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useDeliveryOrderQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { DeliveryOrderItem } from "@/types/delivery-orders";
import { DELIVERY_ORDER_STATUS_LABEL } from "@/types/delivery-orders";
import styles from "./DeliveryOrderFormPage.module.css";

type Props = { id: string; mode: "view" | "edit" };

export default function DeliveryOrderFormPage({ id, mode }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = useDeliveryOrderQuery(id);
  const updateMutation = useUpdateDeliveryOrderMutation();
  const confirmMutation = useConfirmDeliveryOrderMutation();
  const deliverMutation = useDeliverDeliveryOrderMutation();
  const cancelMutation = useCancelDeliveryOrderMutation();

  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const canWrite = deliveryActions.canEdit;
  const canConfirm = deliveryActions.canApprove;

  const data = query.data?.data;
  const editable =
    mode === "edit" &&
    canWrite &&
    (data?.status === "DRAFT" || data?.status === "CONFIRMED");

  const [form, setForm] = useState({
    deliveryDate: dayjs(),
    shippingAddress: "",
    contactName: "",
    contactPhone: "",
    carrierName: "",
    vehiclePlate: "",
    driverName: "",
    driverPhone: "",
    remark: "",
  });

  // เปลี่ยนหน้าเป็น side effect จริง ต้องอยู่ใน effect
  useEffect(() => {
    if (!data) return;
    if (data.status === "DELIVERED" || data.status === "CANCELLED") {
      if (mode === "edit") router.replace(`/delivery-orders/${data.id}`);
    }
  }, [data, mode, router]);

  /**
   * hydrate ฟอร์มจากข้อมูล server — ปรับ state ตอน render แทน effect
   * ตัวติดตามต้องเริ่มจาก null ไม่ใช่ data เพราะถ้า query มี cache อยู่แล้ว
   * render แรกจะได้ data ทันที แล้วเงื่อนไขไม่เข้า → ฟอร์มค้างว่าง
   */
  const [syncedData, setSyncedData] = useState<typeof data | null>(null);
  if (data && syncedData !== data) {
    setSyncedData(data);
    setForm({
      deliveryDate: dayjs(data.deliveryDate),
      shippingAddress: data.shippingAddress ?? "",
      contactName: data.contactName ?? "",
      contactPhone: data.contactPhone ?? "",
      carrierName: data.carrierName ?? "",
      vehiclePlate: data.vehiclePlate ?? "",
      driverName: data.driverName ?? "",
      driverPhone: data.driverPhone ?? "",
      remark: data.remark ?? "",
    });
  }

  if (query.isLoading || !data) {
    return (
      <div className={styles.page} style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  const statusLabel =
    DELIVERY_ORDER_STATUS_LABEL[
      data.status as keyof typeof DELIVERY_ORDER_STATUS_LABEL
    ] ?? data.status;

  const save = async () => {
    await updateMutation.mutateAsync({
      id,
      body: {
        deliveryDate: form.deliveryDate.format("YYYY-MM-DD"),
        shippingAddress: form.shippingAddress,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        carrierName: form.carrierName,
        vehiclePlate: form.vehiclePlate,
        driverName: form.driverName,
        driverPhone: form.driverPhone,
        remark: form.remark,
      },
    });
  };

  const columns: ColumnsType<DeliveryOrderItem> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_v, item) => (
        <div>
          <div className={styles.itemCode}>{item.itemCode ?? "—"}</div>
          <div className={styles.itemName}>{item.itemNameTh}</div>
        </div>
      ),
    },
    {
      title: "จำนวนส่ง",
      dataIndex: "deliveredQty",
      align: "right",
      width: 120,
      render: (v: string) => Number(v).toLocaleString("th-TH"),
    },
    {
      title: "หน่วย",
      dataIndex: "unitCode",
      width: 90,
      render: (v?: string) => v ?? "—",
    },
    {
      title: "หมายเหตุ",
      dataIndex: "remark",
      render: (v?: string) => v || "—",
    },
  ];

  const showEditButton =
    mode === "view" &&
    canWrite &&
    data.status !== "DELIVERED" &&
    data.status !== "CANCELLED";

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent}>
          <CarOutlined />
        </div>
        <div className={styles.headerContent}>
          <Link href="/delivery-orders" className={styles.backLink}>
            <ArrowLeftOutlined /> กลับรายการ
          </Link>
          <p className={styles.eyebrow}>
            {editable ? "Delivery · Edit" : "Delivery · Detail"}
          </p>
          <h1 className={styles.pageTitle}>{data.deliveryOrderNo}</h1>
          <div className={styles.metaRow}>
            {data.salesOrderId ? (
              <Link
                href={`/sales-orders/${data.salesOrderId}`}
                className={styles.docLink}
              >
                SO {data.salesOrderNo ?? data.salesOrderId}
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ) : null}
            {data.packingId ? (
              <Link
                href={`/packings/${data.packingId}`}
                className={styles.docLink}
              >
                Packing {data.packingNo ?? data.packingId}
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ) : null}
            {data.pickingId ? (
              <Link
                href={`/pickings/${data.pickingId}`}
                className={styles.docLink}
              >
                ใบจ่าย {data.pickingNo ?? data.pickingId}
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ) : null}
            <span className={styles.metaChip}>
              ลูกค้า{" "}
              <span className={styles.metaChipMuted}>
                {data.customerName ?? "—"}
              </span>
            </span>
            <Tag
              color={
                data.status === "DELIVERED"
                  ? "success"
                  : data.status === "CONFIRMED"
                    ? "processing"
                    : data.status === "CANCELLED"
                      ? "default"
                      : "warning"
              }
            >
              {statusLabel}
            </Tag>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            className={styles.secondaryBtn}
            icon={<FilePdfOutlined />}
            onClick={async () => {
              const { generateDeliveryOrderPdf } = await import(
                "@/utils/generateDeliveryOrderPdf"
              );
              void generateDeliveryOrderPdf({
                deliveryOrderNo: data.deliveryOrderNo,
                deliveryDate: dayjs(data.deliveryDate).format("DD/MM/YYYY"),
                salesOrderNo: data.salesOrderNo ?? "—",
                packingNo: data.packingNo ?? "—",
                customerName: data.customerName ?? "—",
                shippingAddress: data.shippingAddress ?? "—",
                contactName: data.contactName ?? "—",
                contactPhone: data.contactPhone ?? "—",
                carrierName: data.carrierName ?? "—",
                vehiclePlate: data.vehiclePlate ?? "—",
                driverName: data.driverName ?? "—",
                remark: data.remark?.trim() || "",
                items: (data.items ?? []).map((item, index) => ({
                  no: index + 1,
                  itemCode: item.itemCode ?? "—",
                  itemName: item.itemNameTh ?? "—",
                  unit: item.unitCode ?? "—",
                  qty: Number(item.deliveredQty) || 0,
                })),
              });
            }}
          >
            พิมพ์ PDF
          </Button>
          {editable ? (
            <Button
              className={styles.secondaryBtn}
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
              onClick={() => void save()}
            >
              บันทึก
            </Button>
          ) : null}
          {data.status === "DRAFT" && canConfirm ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<CheckOutlined />}
              loading={confirmMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: "ยืนยันเตรียมส่ง?",
                  onOk: async () => {
                    if (editable) await save();
                    await confirmMutation.mutateAsync(id);
                  },
                })
              }
            >
              ยืนยันเตรียมส่ง
            </Button>
          ) : null}
          {data.status === "CONFIRMED" && canConfirm ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<SendOutlined />}
              loading={deliverMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: "ยืนยันส่งมอบแล้ว?",
                  content: "SO จะเป็น DELIVERED — ไม่ตัดสต๊อก",
                  onOk: async () => {
                    await deliverMutation.mutateAsync(id);
                    router.push(`/delivery-orders/${id}`);
                  },
                })
              }
            >
              Mark Delivered
            </Button>
          ) : null}
          {(data.status === "DRAFT" || data.status === "CONFIRMED") &&
          canConfirm ? (
            <Button
              danger
              className={styles.secondaryBtn}
              icon={<CloseOutlined />}
              loading={cancelMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: "ยกเลิกใบส่ง?",
                  onOk: async () => {
                    await cancelMutation.mutateAsync(id);
                    router.push("/delivery-orders");
                  },
                })
              }
            >
              ยกเลิก
            </Button>
          ) : null}
          {showEditButton ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<EditOutlined />}
              onClick={() => router.push(`/delivery-orders/${id}/edit`)}
            >
              แก้ไข
            </Button>
          ) : null}
        </div>
      </header>

      {data.status === "DELIVERED" ? (
        <Alert
          type="success"
          showIcon
          title="ส่งมอบแล้ว — ไม่มีการตัดสต๊อกในขั้นตอนนี้"
        />
      ) : null}

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>เอกสารอ้างอิง</h2>
        <div className={styles.relatedCard}>
          {data.salesOrderId ? (
            <Link
              href={`/sales-orders/${data.salesOrderId}`}
              className={styles.relatedLink}
            >
              <div className={styles.relatedIcon}>
                <FileTextOutlined />
              </div>
              <div className={styles.relatedBody}>
                <p className={styles.relatedLabel}>ใบสั่งขาย</p>
                <p className={styles.relatedValue}>
                  {data.salesOrderNo ?? data.salesOrderId}
                </p>
                <p className={styles.relatedHint}>คลิกเพื่อเปิดรายละเอียด SO</p>
              </div>
            </Link>
          ) : null}
          {data.pickingId ? (
            <Link
              href={`/pickings/${data.pickingId}`}
              className={styles.relatedLink}
            >
              <div className={styles.relatedIcon}>
                <ShoppingCartOutlined />
              </div>
              <div className={styles.relatedBody}>
                <p className={styles.relatedLabel}>ใบจ่ายสินค้า</p>
                <p className={styles.relatedValue}>
                  {data.pickingNo ?? data.pickingId}
                </p>
                <p className={styles.relatedHint}>คลิกเพื่อเปิดรายละเอียดใบจ่าย</p>
              </div>
            </Link>
          ) : null}
          {data.packingId ? (
            <Link
              href={`/packings/${data.packingId}`}
              className={styles.relatedLink}
            >
              <div className={styles.relatedIcon}>
                <InboxOutlined />
              </div>
              <div className={styles.relatedBody}>
                <p className={styles.relatedLabel}>ใบบรรจุสินค้า</p>
                <p className={styles.relatedValue}>
                  {data.packingNo ?? data.packingId}
                </p>
                <p className={styles.relatedHint}>คลิกเพื่อเปิดรายละเอียดใบบรรจุ</p>
              </div>
            </Link>
          ) : null}
        </div>
      </section>

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>ข้อมูลจัดส่ง</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>วันที่ส่ง</span>
            {editable ? (
              <DatePicker
                value={form.deliveryDate}
                onChange={(v) =>
                  setForm((f) => ({ ...f, deliveryDate: v ?? dayjs() }))
                }
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.deliveryDate.format("DD/MM/YYYY")}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>ผู้ติดต่อ</span>
            {editable ? (
              <Input
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.contactName || "—"}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>เบอร์ติดต่อ</span>
            {editable ? (
              <Input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPhone: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.contactPhone || "—"}
              </div>
            )}
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>ที่อยู่จัดส่ง</span>
            {editable ? (
              <Input.TextArea
                rows={2}
                value={form.shippingAddress}
                onChange={(e) =>
                  setForm((f) => ({ ...f, shippingAddress: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.shippingAddress || "—"}
              </div>
            )}
          </label>
        </div>
      </section>

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>ขนส่ง / พาหนะ</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>ขนส่ง</span>
            {editable ? (
              <Input
                value={form.carrierName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, carrierName: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.carrierName || "—"}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>ทะเบียนรถ</span>
            {editable ? (
              <Input
                value={form.vehiclePlate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, vehiclePlate: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.vehiclePlate || "—"}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>คนขับ</span>
            {editable ? (
              <Input
                value={form.driverName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, driverName: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.driverName || "—"}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>เบอร์คนขับ</span>
            {editable ? (
              <Input
                value={form.driverPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, driverPhone: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.driverPhone || "—"}
              </div>
            )}
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>หมายเหตุ</span>
            {editable ? (
              <Input.TextArea
                rows={2}
                value={form.remark}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
              />
            ) : (
              <div className={styles.fieldValue}>{form.remark || "—"}</div>
            )}
          </label>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <p className={styles.toolbarTitle}>รายการสินค้าที่ส่ง</p>
            <p className={styles.toolbarHint}>
              จำนวนส่งรวมต่อรายการสินค้าต้องเท่ากับจำนวนที่บรรจุ (รองรับแยกหลายแถว)
            </p>
          </div>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data.items}
          pagination={false}
          size="middle"
          className={styles.table}
          scroll={{ x: 640 }}
        />
      </section>
    </div>
  );
}
