"use client";

import { useEffect, useState } from "react";
import ESignatureHistoryCard from "@/components/esign/ESignatureHistoryCard";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
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
  RollbackOutlined,
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
import type {
  DeliveryOrderItem,
  DeliveryOrderPackingRef,
  DeliveryResult,
} from "@/types/delivery-orders";
import {
  DELIVERY_RESULT_COLOR,
  DELIVERY_RESULT_LABEL,
  deliveryOrderStatusColor,
  deliveryOrderStatusLabel,
} from "@/types/delivery-orders";
import DeliveryResultModal from "./DeliveryResultModal";
import styles from "./DeliveryOrderFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

function formatWeightKg(value?: string) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function weightInputValue(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

type WeightField =
  | "vehicleWeightBeforeKg"
  | "vehicleWeightAfterKg"
  | "cargoNetWeightKg";

type Props = { id: string; mode: "view" | "edit" };

export default function DeliveryOrderFormPage({ id, mode }: Props) {
  const t = useT();
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
  const returnNoteActions = useScreenActionPermissions("RETURN_NOTES");
  const [resultModalOpen, setResultModalOpen] = useState(false);

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
    vehicleWeightBeforeKg: "",
    vehicleWeightAfterKg: "",
    cargoNetWeightKg: "",
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
      vehicleWeightBeforeKg: data.vehicleWeightBeforeKg ?? "",
      vehicleWeightAfterKg: data.vehicleWeightAfterKg ?? "",
      cargoNetWeightKg: data.cargoNetWeightKg ?? "",
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

  const statusLabel = deliveryOrderStatusLabel(data.status);

  const packingRefs: DeliveryOrderPackingRef[] = data.packings?.length
    ? data.packings
    : data.packingId
      ? [
          {
            packingId: data.packingId,
            packingNo: data.packingNo,
            pickingId: data.pickingId,
            pickingNo: data.pickingNo,
          },
        ]
      : [];
  const pickingRefs = packingRefs.filter(
    (ref, index, all) =>
      Boolean(ref.pickingId) &&
      all.findIndex((other) => other.pickingId === ref.pickingId) === index,
  );
  const roundSuffix = (roundNo?: number) => (roundNo ? t(" · รอบ {roundNo}", { roundNo }) : "");
  const packingNosText =
    packingRefs.map((ref) => ref.packingNo ?? ref.packingId).join(", ") || "—";

  const setWeight = (field: WeightField, value: number | null) => {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value == null ? "" : value.toFixed(3),
      };
      if (field === "cargoNetWeightKg") return next;
      const before = weightInputValue(next.vehicleWeightBeforeKg);
      const after = weightInputValue(next.vehicleWeightAfterKg);
      if (before != null && after != null) {
        next.cargoNetWeightKg = (after - before).toFixed(3);
      }
      return next;
    });
  };

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
        vehicleWeightBeforeKg: weightInputValue(form.vehicleWeightBeforeKg),
        vehicleWeightAfterKg: weightInputValue(form.vehicleWeightAfterKg),
        cargoNetWeightKg: weightInputValue(form.cargoNetWeightKg),
        remark: form.remark,
      },
    });
  };

  const columns: ColumnsType<DeliveryOrderItem> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("ใบบรรจุ"),
      key: "packing",
      width: 150,
      render: (_v, item) => {
        const packingId = item.packingId ?? data.packingId;
        const packingNo = item.packingId ? item.packingNo : data.packingNo;
        return packingId ? (
          <Link href={`/packings/${packingId}`}>{packingNo ?? "—"}</Link>
        ) : (
          "—"
        );
      },
    },
    {
      title: t("รอบ"),
      dataIndex: "roundNo",
      width: 80,
      render: (v?: number) => (v ? t("รอบที่ {v}", { v }) : "—"),
    },
    {
      title: t("สินค้า"),
      key: "item",
      render: (_v, item) => (
        <div>
          <div className={styles.itemCode}>{item.itemCode ?? "—"}</div>
          <div className={styles.itemName}>{item.itemNameTh}</div>
        </div>
      ),
    },
    {
      title: t("จำนวนส่ง"),
      dataIndex: "deliveredQty",
      align: "right",
      width: 120,
      render: (v: string) => Number(v).toLocaleString("th-TH"),
    },
    {
      title: t("หน่วย"),
      dataIndex: "unitCode",
      width: 90,
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("หมายเหตุ"),
      dataIndex: "remark",
      render: (v?: string) => v || "—",
    },
  ];

  const isReturnResult: boolean =
    data.deliveryResult === "FULL_RETURN" ||
    data.deliveryResult === "PARTIAL_RETURN";
  const canCreateReturnNote =
    mode === "view" &&
    data.status === "DELIVERED" &&
    isReturnResult &&
    data.returnToStock === true &&
    !data.returnNoteId &&
    returnNoteActions.canAdd;

  if (isReturnResult) {
    const afterDeliveredQty =
      columns.findIndex((col) => "dataIndex" in col && col.dataIndex === "deliveredQty") + 1;
    columns.splice(afterDeliveredQty, 0,
      {
        title: t("รับจริง"),
        dataIndex: "acceptedQty",
        align: "right",
        width: 110,
        render: (v?: string) =>
          v != null ? Number(v).toLocaleString("th-TH") : "—",
      },
      {
        title: t("ตีกลับ"),
        dataIndex: "returnedQty",
        align: "right",
        width: 110,
        render: (v?: string) =>
          v != null && Number(v) > 0 ? (
            <span style={{ color: "#d4380d", fontWeight: 600 }}>
              {Number(v).toLocaleString("th-TH")}
            </span>
          ) : (
            "0"
          ),
      },
    );
  }

  const showEditButton =
    mode === "view" &&
    canWrite &&
    data.status !== "DELIVERED" &&
    data.status !== "CANCELLED";

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={editable ? "Delivery · Edit" : "Delivery · Detail"}
        icon={<CarOutlined />}
        title={data.deliveryOrderNo}
        back={
          <>
<Link href="/delivery-orders" className={styles.backLink}>
            <ArrowLeftOutlined /> {t("กลับรายการ")}
          </Link>
          </>
        }
        meta={
          <>
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
            {packingRefs.map((ref) => (
              <Link
                key={`packing-${ref.packingId}`}
                href={`/packings/${ref.packingId}`}
                className={styles.docLink}
              >
                Packing {ref.packingNo ?? ref.packingId}
                {packingRefs.length > 1 ? roundSuffix(ref.roundNo) : ""}
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ))}
            {pickingRefs.map((ref) => (
              <Link
                key={`picking-${ref.pickingId}`}
                href={`/pickings/${ref.pickingId}`}
                className={styles.docLink}
              >
                {t("ใบจ่าย")} {ref.pickingNo ?? ref.pickingId}
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ))}
            {data.sourceDeliveryOrderId ? (
              <Link
                href={`/delivery-orders/${data.sourceDeliveryOrderId}`}
                className={styles.docLink}
              >
                <Tag color="volcano" style={{ marginInlineEnd: 0 }}>
                  {t("ส่งซ้ำจาก")} {data.sourceDeliveryOrderNo ?? t("ใบส่งเดิม")}
                </Tag>
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ) : null}
            <span className={styles.metaChip}>
              {t("ลูกค้า")}{" "}
              <span className={styles.metaChipMuted}>
                {data.customerName ?? "—"}
              </span>
            </span>
            <Tag color={deliveryOrderStatusColor(data.status)}>
              {statusLabel}
            </Tag>
          </div>
          </>
        }
        actions={
          <>
<Button
            className={styles.secondaryBtn}
            icon={<FilePdfOutlined />}
            onClick={async () => {
              const { generateDeliveryOrderPdf } = await import(
                "@/utils/generateDeliveryOrderPdf"
              );
              void generateDeliveryOrderPdf({
                deliveryOrderNo: data.deliveryOrderNo,
                deliveryDate: dayjs(data.deliveryDate).format("DD/MM/BBBB"),
                salesOrderNo: data.salesOrderNo ?? "—",
                packingNo: packingNosText,
                customerName: data.customerName ?? "—",
                shippingAddress: data.shippingAddress ?? "—",
                contactName: data.contactName ?? "—",
                contactPhone: data.contactPhone ?? "—",
                carrierName: data.carrierName ?? "—",
                vehiclePlate: data.vehiclePlate ?? "—",
                driverName: data.driverName ?? "—",
                vehicleWeightBeforeKg: formatWeightKg(data.vehicleWeightBeforeKg),
                vehicleWeightAfterKg: formatWeightKg(data.vehicleWeightAfterKg),
                cargoNetWeightKg: formatWeightKg(data.cargoNetWeightKg),
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
            {t("พิมพ์ PDF")}
          </Button>
          {editable ? (
            <Button
              className={styles.secondaryBtn}
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
              onClick={() => void save()}
            >
              {t("บันทึก")}
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
                  title: t("ยืนยันเตรียมส่ง?"),
                  onOk: async () => {
                    if (editable) await save();
                    await confirmMutation.mutateAsync(id);
                  },
                })
              }
            >
              {t("ยืนยันเตรียมส่ง")}
            </Button>
          ) : null}
          {data.status === "CONFIRMED" && canConfirm ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<SendOutlined />}
              loading={deliverMutation.isPending}
              onClick={() => setResultModalOpen(true)}
            >
              Mark Delivered
            </Button>
          ) : null}
          {canCreateReturnNote ? (
            <Button
              className={styles.secondaryBtn}
              icon={<RollbackOutlined />}
              onClick={() =>
                router.push(`/return-notes/create?deliveryOrderId=${id}`)
              }
            >
              {t("สร้างใบคืนสินค้า")}
            </Button>
          ) : null}
          {(data.status === "DRAFT" || data.status === "CONFIRMED") &&
          !data.sourceDeliveryOrderId &&
          canConfirm ? (
            <Button
              danger
              className={styles.secondaryBtn}
              icon={<CloseOutlined />}
              loading={cancelMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: t("ยกเลิกใบส่ง?"),
                  onOk: async () => {
                    await cancelMutation.mutateAsync(id);
                    router.push("/delivery-orders");
                  },
                })
              }
            >
              {t("ยกเลิก")}
            </Button>
          ) : null}
          {showEditButton ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<EditOutlined />}
              onClick={() => router.push(`/delivery-orders/${id}/edit`)}
            >
              {t("แก้ไข")}
            </Button>
          ) : null}
          </>
        }
      />

      <DeliveryResultModal
        open={resultModalOpen}
        items={data.items ?? []}
        loading={deliverMutation.isPending}
        onCancel={() => setResultModalOpen(false)}
        onConfirm={async (body) => {
          try {
            await deliverMutation.mutateAsync({ id, body });
          } catch {
            return;
          }
          setResultModalOpen(false);
          router.push(`/delivery-orders/${id}`);
        }}
      />

      {data.sourceDeliveryOrderId &&
      (data.status === "DRAFT" || data.status === "CONFIRMED") ? (
        <Alert
          type="info"
          showIcon
          title={t("ใบส่งซ้ำของ {no} — ส่งของชุดเดิมที่ตีกลับ ไม่ต้องจ่าย/บรรจุใหม่ และไม่ตัดสต๊อกซ้ำ", { no: data.sourceDeliveryOrderNo ?? t("ใบส่งเดิม") })}
          description={t("จำนวนล็อกตามยอดที่ตีกลับ · แก้วันที่ส่ง/ข้อมูลรถได้ แต่ยกเลิกใบนี้ไม่ได้")}
        />
      ) : null}

      {data.status === "DELIVERED" && !isReturnResult ? (
        <Alert
          type="success"
          showIcon
          title={t("ส่งมอบแล้ว — ไม่มีการตัดสต๊อกในขั้นตอนนี้")}
        />
      ) : null}

      {data.status === "DELIVERED" && isReturnResult ? (
        <section className={styles.formCard}>
          <h2 className={styles.sectionTitle}>{t("ผลการส่ง")}</h2>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <span>{t("ผลการส่ง")}</span>
              <div className={styles.fieldValue}>
                <Tag
                  color={
                    DELIVERY_RESULT_COLOR[data.deliveryResult as DeliveryResult] ??
                    "default"
                  }
                  style={{ fontWeight: 600 }}
                >
                  {t(DELIVERY_RESULT_LABEL[data.deliveryResult as DeliveryResult] ??
                    data.deliveryResult)}
                </Tag>
              </div>
            </div>
            <div className={styles.field}>
              <span>{t("สินค้าที่ตีกลับ")}</span>
              <div className={styles.fieldValue}>
                {data.returnToStock ? t("นำสินค้าคืนเข้าคลัง") : t("ไม่นำเข้าคลัง")}
                {data.returnNoteId ? (
                  <>
                    {` · ${t("ใบคืนสินค้า")} `}
                    <Link
                      href={`/return-notes/${data.returnNoteId}`}
                      className={styles.docLink}
                    >
                      {data.returnNoteNo ?? "—"}
                      <ExportOutlined className={styles.docLinkIcon} />
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
            <div className={styles.field}>
              <span>{t("ส่งสินค้าใหม่")}</span>
              <div className={styles.fieldValue}>
                {data.redeliverRequired ? (
                  <>
                    {t("ส่งใหม่")}
                    {data.redeliverDate
                      ? ` · ${dayjs(data.redeliverDate).format("DD/MM/BBBB")}`
                      : ""}
                    {data.redeliveryScheduleId ? (
                      <>
                        {" · "}
                        <Link
                          href={`/sales-orders/${data.salesOrderId}`}
                          className={styles.docLink}
                        >
                          {t("รอบที่")} {data.redeliveryRoundNo ?? "—"}
                          <ExportOutlined className={styles.docLinkIcon} />
                        </Link>
                      </>
                    ) : null}
                    {data.redeliveryDeliveryOrderId ? (
                      <>
                        {` · ${t("ใบส่งใหม่")} `}
                        <Link
                          href={`/delivery-orders/${data.redeliveryDeliveryOrderId}`}
                          className={styles.docLink}
                        >
                          {data.redeliveryDeliveryOrderNo ?? "—"}
                          <ExportOutlined className={styles.docLinkIcon} />
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : (
                  t("ไม่ส่งใหม่")
                )}
              </div>
            </div>
            <div className={styles.field}>
              <span>{t("ผู้บันทึก")}</span>
              <div className={styles.fieldValue}>
                {data.deliveredByName ?? "—"}
                {data.deliveredAt
                  ? ` · ${dayjs(data.deliveredAt).format("DD/MM/BBBB HH:mm")}`
                  : ""}
              </div>
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span>{t("เหตุผลการตีกลับ")}</span>
              <div className={styles.fieldValue}>{data.returnReason || "—"}</div>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>{t("เอกสารอ้างอิง")}</h2>
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
                <p className={styles.relatedLabel}>{t("ใบสั่งขาย")}</p>
                <p className={styles.relatedValue}>
                  {data.salesOrderNo ?? data.salesOrderId}
                </p>
                <p className={styles.relatedHint}>{t("คลิกเพื่อเปิดรายละเอียด SO")}</p>
              </div>
            </Link>
          ) : null}
          {pickingRefs.map((ref) => (
            <Link
              key={`picking-${ref.pickingId}`}
              href={`/pickings/${ref.pickingId}`}
              className={styles.relatedLink}
            >
              <div className={styles.relatedIcon}>
                <ShoppingCartOutlined />
              </div>
              <div className={styles.relatedBody}>
                <p className={styles.relatedLabel}>{t("ใบจ่ายสินค้า")}</p>
                <p className={styles.relatedValue}>
                  {ref.pickingNo ?? ref.pickingId}
                  {pickingRefs.length > 1 ? roundSuffix(ref.roundNo) : ""}
                </p>
                <p className={styles.relatedHint}>{t("คลิกเพื่อเปิดรายละเอียดใบจ่าย")}</p>
              </div>
            </Link>
          ))}
          {packingRefs.map((ref) => (
            <Link
              key={`packing-${ref.packingId}`}
              href={`/packings/${ref.packingId}`}
              className={styles.relatedLink}
            >
              <div className={styles.relatedIcon}>
                <InboxOutlined />
              </div>
              <div className={styles.relatedBody}>
                <p className={styles.relatedLabel}>{t("ใบบรรจุสินค้า")}</p>
                <p className={styles.relatedValue}>
                  {ref.packingNo ?? ref.packingId}
                  {packingRefs.length > 1 ? roundSuffix(ref.roundNo) : ""}
                </p>
                <p className={styles.relatedHint}>{t("คลิกเพื่อเปิดรายละเอียดใบบรรจุ")}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>{t("ข้อมูลจัดส่ง")}</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>{t("วันที่ส่ง")}</span>
            {editable ? (
              <DatePicker
                value={form.deliveryDate}
                onChange={(v) =>
                  setForm((f) => ({ ...f, deliveryDate: v ?? dayjs() }))
                }
                format="DD/MM/BBBB"
                style={{ width: "100%" }}
              />
            ) : (
              <div className={styles.fieldValue}>
                {form.deliveryDate.format("DD/MM/BBBB")}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>{t("ผู้ติดต่อ")}</span>
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
            <span>{t("เบอร์ติดต่อ")}</span>
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
            <span>{t("ที่อยู่จัดส่ง")}</span>
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
          {(
            [
              ["vehicleWeightBeforeKg", t("น้ำหนักรถก่อนบรรทุก (กก.)")],
              ["vehicleWeightAfterKg", t("น้ำหนักรถหลังบรรทุก (กก.)")],
              ["cargoNetWeightKg", t("น้ำหนักสินค้าสุทธิ (กก.)")],
            ] as const
          ).map(([field, label]) => (
            <label key={field} className={styles.field}>
              <span>{label}</span>
              {editable ? (
                <InputNumber
                  value={weightInputValue(form[field])}
                  min={0}
                  precision={3}
                  style={{ width: "100%" }}
                  onChange={(value) => setWeight(field, value)}
                />
              ) : (
                <div className={styles.fieldValue}>
                  {formatWeightKg(form[field])}
                </div>
              )}
            </label>
          ))}
        </div>
      </section>

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>{t("ขนส่ง / พาหนะ")}</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>{t("ขนส่ง")}</span>
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
            <span>{t("ทะเบียนรถ")}</span>
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
            <span>{t("คนขับ")}</span>
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
            <span>{t("เบอร์คนขับ")}</span>
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
            <span>{t("หมายเหตุ")}</span>
            {editable ? (
              <Input.TextArea
                rows={2}
                value={form.remark}
                placeholder={t("ระบุหมายเหตุเพิ่มเติม (ถ้ามี)")}
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
            <p className={styles.toolbarTitle}>{t("รายการสินค้าที่ส่ง")}</p>
            <p className={styles.toolbarHint}>
              {t("สินค้าและจำนวนดึงจากใบบรรจุที่อ้างอิง — แก้ไข เพิ่ม หรือลบรายการไม่ได้")}
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
          scroll={{ x: 860 }}
        />
      </section>

      <ESignatureHistoryCard documentId={id} style={{ marginTop: 16 }} />
    </div>
  );
}
