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
  InputNumber,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ExportOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  SaveOutlined,
  CarOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import CreateDeliveryFromPackingsModal from "@/components/delivery-orders/CreateDeliveryFromPackingsModal";
import { canCreateDeliveryFromPacking } from "@/lib/sales/sales-fulfillment-nav";
import {
  useCancelPackingMutation,
  useConfirmPackingMutation,
  useUpdatePackingMutation,
} from "@/hooks/packings/usePackingMutations";
import { usePackingQuery } from "@/hooks/packings/usePackingsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { isDeliveryScheduleDone } from "@/types/delivery-schedules";
import type { PackingItem } from "@/types/packings";
import { PACKING_STATUS_LABEL } from "@/types/packings";
import styles from "./PackingFormPage.module.css";

type Props = { id: string; mode: "view" | "edit" };

type RowEdit = {
  id: string;
  packedQty: number;
  packageNo?: string;
  remark?: string;
};

export default function PackingFormPage({ id, mode }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = usePackingQuery(id);
  const updateMutation = useUpdatePackingMutation();
  const confirmMutation = useConfirmPackingMutation();
  const cancelMutation = useCancelPackingMutation();

  const packingActions = useScreenActionPermissions("PACKINGS");
  const canView = packingActions.canView;
  const canEdit = packingActions.canEdit;
  const canConfirm = packingActions.canApprove;
  const canWrite = canEdit || canConfirm;
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canCreateDelivery = canCreateDeliveryFromPacking({
    delivery: deliveryActions,
    salesOrder: salesOrderActions,
  });
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const data = query.data?.data;
  const trackingQuery = useSalesTrackingDetailQuery(data?.salesOrderId);
  const isDraft = data?.status === "DRAFT";
  const editable = mode === "edit" && isDraft && canEdit;

  const deliveryStep = (() => {
    const rounds = trackingQuery.data?.data?.rounds ?? [];
    // รอบของใบบรรจุนี้ — อย่าใช้ timeline ระดับ SO (ชี้รอบถัดไป)
    const thisRound = rounds.find((round) =>
      round.timeline?.some(
        (step) => step.step === "Packing" && step.documentId === data?.id,
      ),
    );
    const step = thisRound?.timeline?.find((s) => s.step === "Delivery");
    return { step, roundStatus: thisRound?.roundStatus };
  })();
  const deliveryDoc = deliveryStep.step;
  const deliveryHref =
    deliveryDoc?.href && deliveryDoc.status !== "CANCELLED"
      ? deliveryDoc.status === "DRAFT" || deliveryDoc.status === "CONFIRMED"
        ? `${deliveryDoc.href}/edit`
        : deliveryDoc.href
      : undefined;
  const canCreateDeliveryFromThis =
    data?.status === "CONFIRMED" &&
    !deliveryHref &&
    deliveryStep.roundStatus === "PACKED";
  const deliveryRoundDone =
    data?.status === "CONFIRMED" &&
    (Boolean(deliveryHref) || isDeliveryScheduleDone(deliveryStep.roundStatus));

  const [packingDate, setPackingDate] = useState<dayjs.Dayjs | null>(null);
  const [packageType, setPackageType] = useState("");
  const [packageCount, setPackageCount] = useState<number | null>(null);
  const [grossWeight, setGrossWeight] = useState<number | null>(null);
  const [netWeight, setNetWeight] = useState<number | null>(null);
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<RowEdit[]>([]);

  const leavingEditMode = Boolean(
    data && data.status !== "DRAFT" && mode === "edit",
  );

  // เปลี่ยนหน้าเป็น side effect จริง ต้องอยู่ใน effect
  useEffect(() => {
    if (leavingEditMode && data) {
      router.replace(`/packings/${data.id}`);
    }
  }, [leavingEditMode, data, router]);

  /**
   * hydrate ฟอร์มจากข้อมูล server — ปรับ state ตอน render แทน effect
   * ข้าม hydrate ตอนกำลังเด้งออกจากโหมดแก้ไข ให้ตรงกับ early return ของเดิม
   * ตัวติดตามเริ่มจาก null ไม่ใช่ data เพราะถ้า query มี cache render แรก
   * จะได้ data ทันที แล้วเงื่อนไขไม่เข้า → ฟอร์มค้างว่าง
   */
  const [syncedData, setSyncedData] = useState<typeof data | null>(null);
  if (data && syncedData !== data && !leavingEditMode) {
    setSyncedData(data);
    setPackingDate(dayjs(data.packingDate));
    setPackageType(data.packageType ?? "");
    setPackageCount(data.packageCount ?? null);
    setGrossWeight(data.grossWeight ? Number(data.grossWeight) : null);
    setNetWeight(data.netWeight ? Number(data.netWeight) : null);
    setRemark(data.remark ?? "");
    setRows(
      data.items.map((item) => ({
        id: item.id,
        packedQty: Number(item.packedQty),
        packageNo: item.packageNo,
        remark: item.remark,
      })),
    );
  }

  const updateRow = (itemId: string, patch: Partial<RowEdit>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, ...patch } : row)),
    );
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id,
      body: {
        packingDate: packingDate?.format("YYYY-MM-DD"),
        packageType: packageType || undefined,
        packageCount: packageCount ?? undefined,
        grossWeight: grossWeight ?? undefined,
        netWeight: netWeight ?? undefined,
        remark,
        items: rows.map((row) => ({
          id: row.id,
          packedQty: row.packedQty,
          packageNo: row.packageNo,
          remark: row.remark,
        })),
      },
    });
  };

  if (query.isLoading || !data) {
    return (
      <div className={styles.page} style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!canView) {
    return <AccessDenied screenCodes={["PACKINGS"]} />;
  }

  const statusLabel =
    PACKING_STATUS_LABEL[data.status as keyof typeof PACKING_STATUS_LABEL] ??
    data.status;

  const columns: ColumnsType<PackingItem> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_v, item) => (
        <div>
          <div className={styles.itemCode}>{item.itemCode}</div>
          <div className={styles.itemName}>{item.itemNameTh}</div>
        </div>
      ),
    },
    {
      title: "จำนวนบรรจุ",
      key: "packedQty",
      width: 160,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) {
          return `${Number(item.packedQty).toLocaleString("th-TH")} ${item.unitCode ?? ""}`;
        }
        return (
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              min={0.001}
              value={row.packedQty}
              style={{ width: "100%" }}
              onChange={(v) =>
                updateRow(item.id, { packedQty: Number(v) || 0 })
              }
            />
            {item.unitCode ? (
              <Input
                style={{ width: 72 }}
                value={item.unitCode}
                disabled
              />
            ) : null}
          </Space.Compact>
        );
      },
    },
    {
      title: "เลขที่บรรจุภัณฑ์",
      key: "packageNo",
      width: 170,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) return item.packageNo ?? "—";
        return (
          <Input
            value={row.packageNo}
            placeholder="เช่น BOX-001"
            onChange={(e) => updateRow(item.id, { packageNo: e.target.value })}
          />
        );
      },
    },
    {
      title: "หมายเหตุ",
      key: "remark",
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) return item.remark ?? "—";
        return (
          <Input
            value={row.remark}
            onChange={(e) => updateRow(item.id, { remark: e.target.value })}
          />
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent}>
          <InboxOutlined />
        </div>
        <div className={styles.headerContent}>
          <div className={styles.backRow}>
            <Link href="/packings" className={styles.backLink}>
              <ArrowLeftOutlined /> กลับรายการใบบรรจุ
            </Link>
            <Link
              href={
                data.salesOrderId
                  ? `/sales-orders/${data.salesOrderId}`
                  : "/sales-orders"
              }
              className={styles.backLink}
            >
              <ShoppingCartOutlined /> กลับใบสั่งขาย
            </Link>
          </div>
          <p className={styles.eyebrow}>
            {editable ? "Packing · Edit" : "Packing · Detail"}
          </p>
          <h1 className={styles.pageTitle}>{data.packingNo}</h1>
          <div className={styles.metaRow}>
            {data.pickingId ? (
              <Link
                href={`/pickings/${data.pickingId}`}
                className={styles.docLink}
              >
                ใบจ่าย {data.pickingNo ?? data.pickingId}
                <ExportOutlined className={styles.docLinkIcon} />
              </Link>
            ) : (
              <span className={styles.metaChip}>
                ใบจ่าย{" "}
                <span className={styles.metaChipMuted}>—</span>
              </span>
            )}
            {data.salesOrderId ? (
              <Link
                href={`/sales-orders/${data.salesOrderId}`}
                className={styles.docLink}
              >
                SO {data.salesOrderNo ?? data.salesOrderId}
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
                data.status === "CONFIRMED"
                  ? "success"
                  : data.status === "CANCELLED"
                    ? "default"
                    : "processing"
              }
            >
              {statusLabel}
            </Tag>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            className={styles.secondaryBtn}
            icon={<ShoppingCartOutlined />}
            onClick={() =>
              router.push(
                data.salesOrderId
                  ? `/sales-orders/${data.salesOrderId}`
                  : "/sales-orders",
              )
            }
          >
            ไปใบสั่งขาย
          </Button>
          <Button
            className={styles.secondaryBtn}
            icon={<FilePdfOutlined />}
            onClick={async () => {
              const { generatePackingPdf } = await import(
                "@/utils/generatePackingPdf"
              );
              void generatePackingPdf({
                packingNo: data.packingNo,
                packingDate: dayjs(data.packingDate).format("DD/MM/YYYY"),
                pickingNo: data.pickingNo ?? "—",
                salesOrderNo: data.salesOrderNo ?? "—",
                customerName: data.customerName ?? "—",
                packageType: data.packageType ?? "—",
                packageCount:
                  data.packageCount != null ? String(data.packageCount) : "—",
                remark: data.remark?.trim() || "",
                items: (data.items ?? []).map((item, index) => ({
                  no: index + 1,
                  itemCode: item.itemCode ?? "—",
                  itemName: item.itemNameTh ?? "—",
                  unit: item.unitCode ?? "—",
                  qty: Number(item.packedQty) || 0,
                  extra: item.packageNo ?? "—",
                })),
              });
            }}
          >
            พิมพ์ PDF
          </Button>
          {editable ? (
            <>
              <Button
                className={styles.secondaryBtn}
                icon={<SaveOutlined />}
                loading={updateMutation.isPending}
                onClick={() => void handleSave()}
              >
                บันทึก DRAFT
              </Button>
              {canConfirm ? (
                <Button
                  type="primary"
                  className={styles.primaryBtn}
                  icon={<CheckOutlined />}
                  loading={confirmMutation.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: "ยืนยันใบบรรจุนี้?",
                      content: "จำนวนบรรจุต้องเท่ากับจำนวนที่หยิบในใบจ่ายสินค้า",
                      onOk: async () => {
                        await handleSave();
                        await confirmMutation.mutateAsync(id);
                        router.push(`/packings/${id}`);
                      },
                    })
                  }
                >
                  ยืนยันใบบรรจุ
                </Button>
              ) : null}
              <Button
                danger
                className={styles.secondaryBtn}
                icon={<CloseOutlined />}
                loading={cancelMutation.isPending}
                onClick={() =>
                  modal.confirm({
                    title: "ยกเลิกใบบรรจุ?",
                    onOk: async () => {
                      await cancelMutation.mutateAsync(id);
                      router.push("/packings");
                    },
                  })
                }
              >
                ยกเลิก
              </Button>
            </>
          ) : null}
          {mode === "view" && isDraft && canWrite ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<EditOutlined />}
              onClick={() => router.push(`/packings/${id}/edit`)}
            >
              แก้ไข
            </Button>
          ) : null}
        </div>
      </header>

      {data.status === "CONFIRMED" ? (
        <Alert
          type="success"
          showIcon
          /* ข้อความเดิมเขียนว่า "ใบสั่งขายเปลี่ยนสถานะเป็น PACKED" ซึ่งไม่จริงแล้ว —
             ตั้งแต่แบ่งส่งหลายรอบ so.status ค้างที่ CONFIRMED และ **รอบ** เป็น PACKED
             (ใบเดียวมีรอบที่ส่งจบแล้วกับรอบที่ยังรอของพร้อมกันได้)

             และปุ่มเดิมพากลับไปใบสั่งขาย ทำให้ไม่รู้ว่าต้องไปทำอะไรต่อ —
             งานถัดไปคือสร้าง/เปิดใบส่งสินค้าจากใบบรรจุนี้ (ของรอบนี้เท่านั้น) */
          title={
            deliveryHref
              ? "ยืนยันแล้ว — บรรจุครบตามรอบนี้แล้ว เปิดใบส่งสินค้าของรอบนี้ได้"
              : canCreateDeliveryFromThis
                ? "ยืนยันแล้ว — บรรจุครบตามรอบจัดส่งนี้แล้ว ขั้นถัดไปคือสร้างใบส่งสินค้า"
                : deliveryRoundDone
                  ? "ยืนยันแล้ว — รอบนี้ส่งของไปแล้ว ไม่สร้างใบส่งซ้ำจากใบบรรจุนี้"
                  : "ยืนยันแล้ว — บรรจุครบตามรอบจัดส่งนี้แล้ว"
          }
          action={
            deliveryHref ? (
              <Button
                size="small"
                type="primary"
                className={styles.primaryBtn}
                icon={<CarOutlined />}
                onClick={() => router.push(deliveryHref)}
              >
                เปิดใบส่งสินค้า
              </Button>
            ) : canCreateDeliveryFromThis ? (
              <Tooltip
                title={
                  canCreateDelivery ? undefined : "ไม่มีสิทธิ์สร้างใบส่งสินค้า"
                }
              >
                <span>
                  <Button
                    size="small"
                    type="primary"
                    className={styles.primaryBtn}
                    icon={<CarOutlined />}
                    disabled={!canCreateDelivery}
                    onClick={() => setDeliveryModalOpen(true)}
                  >
                    สร้างใบส่งสินค้า
                  </Button>
                </span>
              </Tooltip>
            ) : undefined
          }
        />
      ) : null}

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>เอกสารอ้างอิง</h2>
        <div className={styles.relatedCard}>
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
        </div>
      </section>

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>ข้อมูลใบบรรจุ</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>วันที่บรรจุ</span>
            {editable ? (
              <DatePicker
                value={packingDate}
                onChange={setPackingDate}
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
              />
            ) : (
              <div className={styles.fieldValue}>
                {dayjs(data.packingDate).format("DD/MM/YYYY")}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>ประเภทบรรจุภัณฑ์</span>
            {editable ? (
              <Input
                value={packageType}
                onChange={(e) => setPackageType(e.target.value)}
                placeholder="เช่น กล่อง, พาเลท"
              />
            ) : (
              <div className={styles.fieldValue}>{data.packageType || "—"}</div>
            )}
          </label>
          <label className={styles.field}>
            <span>จำนวนหน่วยบรรจุ</span>
            {editable ? (
              <InputNumber
                min={1}
                value={packageCount}
                onChange={setPackageCount}
                style={{ width: "100%" }}
              />
            ) : (
              <div className={styles.fieldValue}>
                {data.packageCount ?? "—"}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>น้ำหนักรวม (กก.)</span>
            {editable ? (
              <InputNumber
                min={0}
                value={grossWeight}
                onChange={setGrossWeight}
                style={{ width: "100%" }}
              />
            ) : (
              <div className={styles.fieldValue}>
                {data.grossWeight ?? "—"}
              </div>
            )}
          </label>
          <label className={styles.field}>
            <span>น้ำหนักสุทธิ (กก.)</span>
            {editable ? (
              <InputNumber
                min={0}
                value={netWeight}
                onChange={setNetWeight}
                style={{ width: "100%" }}
              />
            ) : (
              <div className={styles.fieldValue}>{data.netWeight ?? "—"}</div>
            )}
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>หมายเหตุ</span>
            {editable ? (
              <Input.TextArea
                rows={2}
                value={remark}
                placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                onChange={(e) => setRemark(e.target.value)}
              />
            ) : (
              <div className={styles.fieldValue}>{data.remark || "—"}</div>
            )}
          </label>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <p className={styles.toolbarTitle}>รายการสินค้าที่บรรจุ</p>
            <p className={styles.toolbarHint}>
              จำนวนบรรจุต้องเท่ากับจำนวนที่หยิบในใบจ่ายสินค้า
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
          scroll={{ x: 720 }}
        />
      </section>

      <CreateDeliveryFromPackingsModal
        open={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        anchorPackingId={id}
        salesOrderId={data.salesOrderId}
      />
    </div>
  );
}
