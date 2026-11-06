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
  Select,
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
  ExportOutlined,
  FilePdfOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  ShoppingCartOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useCancelPickingMutation,
  useConfirmPickingMutation,
  useUpdatePickingMutation,
} from "@/hooks/pickings/usePickingMutations";
import { usePickingQuery } from "@/hooks/pickings/usePickingsQuery";
import { useSalesTrackingDetailQuery } from "@/hooks/sales-tracking/useSalesTrackingQuery";
import { useInventoryLotsQuery } from "@/hooks/inventory/useInventoryQueries";
import AccessDenied from "@/components/auth/AccessDenied";
import { ApiError } from "@/lib/api/client";
import { getFifoLotSuggestion } from "@/lib/api/dispatch-orders";
import { getAccessToken } from "@/lib/auth/token";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { isDeliveryScheduleDone } from "@/types/delivery-schedules";
import type { PickingItem } from "@/types/pickings";
import { PICKING_STATUS_LABEL } from "@/types/pickings";
import styles from "./PickingFormPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { statusT } from "@/lib/i18n/fulfillmentStatus";

type Props = { id: string; mode: "view" | "edit" };

/** คลัง/ตำแหน่ง/จำนวนยึดตามของที่จองไว้ — ในฟอร์มแก้ได้แค่ Lot */
type RowEdit = {
  id: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  lotNo?: string;
  pickedQty: number;
  availableHint?: string;
};

function formatQty(value?: string | number) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function FifoTooltip() {
  const t = useT();
  return (
  <div style={{ maxWidth: 280 }}>
    <strong>FIFO = First In, First Out</strong>
    <div style={{ marginTop: 6, lineHeight: 1.5 }}>
      {t("ระบบแนะนำ Lot ที่รับเข้าคลังเก่าสุดก่อน เพื่อใช้ของเก่าก่อนของใหม่")}
      {t("ลดความเสี่ยงสินค้าหมดอายุหรือค้างสต๊อกนาน")}
    </div>
  </div>
  );
}

export default function PickingFormPage({ id, mode }: Props) {
  const t = useT();
  const router = useRouter();
  const { modal } = App.useApp();
  const query = usePickingQuery(id);
  const updateMutation = useUpdatePickingMutation();
  const confirmMutation = useConfirmPickingMutation();
  const cancelMutation = useCancelPickingMutation();

  const data = query.data?.data;
  const trackingQuery = useSalesTrackingDetailQuery(data?.salesOrderId);

  const pickingActions = useScreenActionPermissions("PICKINGS");
  const canView = pickingActions.canView;
  const canEdit = pickingActions.canEdit;
  const canConfirm = pickingActions.canApprove;
  /** สิทธิ์ดำเนินการบนใบร่าง (แก้ไข / ไปหน้าแก้ไข) */
  const canWrite = canEdit || canConfirm;

  const isDraft = data?.status === "DRAFT";
  const editable = mode === "edit" && isDraft && canEdit;

  const [pickingDate, setPickingDate] = useState<dayjs.Dayjs | null>(null);
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<RowEdit[]>([]);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const leavingEditMode = Boolean(
    data && data.status !== "DRAFT" && mode === "edit",
  );

  // เปลี่ยนหน้าเป็น side effect จริง ต้องอยู่ใน effect
  useEffect(() => {
    if (leavingEditMode && data) {
      router.replace(`/pickings/${data.id}`);
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
    setPickingDate(dayjs(data.pickingDate));
    setRemark(data.remark ?? "");
    setRows(
      data.items.map((item) => ({
        id: item.id,
        warehouseId: item.warehouseId,
        locationId: item.locationId,
        lotId: item.lotId,
        lotNo: item.lotNo,
        pickedQty: Number(item.pickedQty),
      })),
    );
  }

  const updateRow = (itemId: string, patch: Partial<RowEdit>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, ...patch } : row)),
    );
  };

  const suggestLot = async (item: PickingItem, row: RowEdit) => {
    if (!row.warehouseId || !row.locationId) return;
    setSuggestingId(row.id);
    try {
      const res = await getFifoLotSuggestion(getAccessToken(), {
        itemId: item.itemId,
        warehouseId: row.warehouseId,
        locationId: row.locationId,
        quantity: row.pickedQty,
      });
      const first = res.data?.[0];
      if (first) {
        updateRow(row.id, {
          lotId: first.lotId,
          lotNo: first.lotNo,
          availableHint: String(first.quantity ?? ""),
        });
      }
    } catch {
      /* ignore */
    } finally {
      setSuggestingId(null);
    }
  };

  /** คืน false ถ้าบันทึกไม่ผ่าน — toast แจ้งจาก mutation แล้ว */
  const handleSave = async (): Promise<boolean> => {
    const lotControlled = new Set(
      (data?.items ?? [])
        .filter((item) => item.requiresLotControl)
        .map((item) => item.id),
    );
    try {
      await updateMutation.mutateAsync({
        id,
        body: {
          pickingDate: pickingDate?.format("YYYY-MM-DD"),
          remark,
          items: rows
            .filter((row) => lotControlled.has(row.id) && row.lotId)
            .map((row) => ({ id: row.id, lotId: row.lotId })),
        },
      });
      return true;
    } catch (error) {
      // 409 = แถวถูกปรับตามยอดจองล่าสุดแล้ว ต้องโหลดใบใหม่ก่อน
      if (error instanceof ApiError && error.status === 409) {
        await query.refetch();
      }
      return false;
    }
  };

  if (query.isLoading || !data) {
    return (
      <div className={styles.page} style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!canView) {
    return <AccessDenied screenCodes={["PICKINGS"]} />;
  }

  const statusLabel = statusT(
    t,
    PICKING_STATUS_LABEL[data.status as keyof typeof PICKING_STATUS_LABEL] ??
      data.status,
  );

  const reservationReady =
    data.status === "DRAFT" &&
    data.items.length > 0 &&
    data.items.every((item) => {
      const row = rows.find((r) => r.id === item.id);
      const warehouseId = row?.warehouseId ?? item.warehouseId;
      const locationId = row?.locationId ?? item.locationId;
      const lotId = row?.lotId ?? item.lotId;
      if (!warehouseId || !locationId) return false;
      if (item.requiresLotControl && !lotId) return false;
      return true;
    });

  const packingStep = (() => {
    const rounds = trackingQuery.data?.data?.rounds ?? [];
    // ต้องใช้รอบของใบจ่ายนี้ — timeline ระดับ SO ชี้รอบถัดไป จะพาไปสร้างบรรจุซ้ำบนรอบที่จบแล้ว
    const thisRound = rounds.find((round) =>
      round.timeline?.some(
        (step) => step.step === "Picking" && step.documentId === data?.id,
      ),
    );
    const step = thisRound?.timeline?.find((s) => s.step === "Packing");
    const roundStatus = thisRound?.roundStatus;
    return { step, roundStatus };
  })();
  const packingDoc = packingStep.step;
  const packingHref =
    packingDoc?.href && packingDoc.status !== "CANCELLED"
      ? packingDoc.status === "DRAFT"
        ? `${packingDoc.href}/edit`
        : packingDoc.href
      : undefined;
  /** สร้างใบบรรจุใหม่ได้เฉพาะรอบที่เพิ่งจ่ายของ — รอบที่บรรจุ/ส่งแล้วห้ามโชว์ปุ่มสร้าง */
  const canCreatePackingFromThis =
    data?.status === "CONFIRMED" &&
    !packingHref &&
    packingStep.roundStatus === "ISSUED";
  const packingRoundDone =
    data?.status === "CONFIRMED" &&
    !packingHref &&
    (packingStep.roundStatus === "PACKED" ||
      isDeliveryScheduleDone(packingStep.roundStatus));

  const renderItemLotHint = (item: PickingItem) => {
    const row = rows.find((r) => r.id === item.id);
    const lotLabel =
      row?.lotNo ?? row?.lotId ?? item.lotNo ?? item.lotId ?? undefined;

    if (!item.requiresLotControl) return null;

    if (lotLabel) {
      return <span className={styles.lotInfo}>Lot {lotLabel}</span>;
    }

    if (editable) {
      return (
        <span className={styles.lotHint}>
          {t("สินค้าควบคุม Lot — เลือก Lot หรือกด \"แนะนำ FIFO\"")}
        </span>
      );
    }

    return null;
  };

  const columns: ColumnsType<PickingItem> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("สินค้า"),
      key: "item",
      render: (_v, item) => (
        <div>
          <div className={styles.itemCode}>{item.itemCode}</div>
          <div className={styles.itemName}>{item.itemNameTh}</div>
          {renderItemLotHint(item)}
        </div>
      ),
    },
    {
      title: t("สั่ง"),
      dataIndex: "orderedQty",
      width: 88,
      align: "right",
    },
    {
      title: t("หยิบ"),
      key: "picked",
      width: 110,
      align: "right",
      render: (_v, item) => formatQty(item.pickedQty),
    },
    {
      title: t("คลัง"),
      key: "wh",
      width: 140,
      render: (_v, item) => item.warehouseCode ?? "—",
    },
    {
      title: t("ตำแหน่ง"),
      key: "loc",
      width: 130,
      render: (_v, item) => item.locationCode ?? "—",
    },
    {
      title: (
        <span className={styles.colHelp}>
          Lot{editable ? t(" (แนะนำอัตโนมัติ)") : ""}
          {editable ? (
            <Tooltip title={<FifoTooltip />} placement="top">
              <QuestionCircleOutlined className={styles.helpIcon} />
            </Tooltip>
          ) : null}
        </span>
      ),
      key: "lot",
      width: 210,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row || !item.requiresLotControl) {
          return item.lotNo ?? item.lotId ?? "—";
        }
        return (
          <div>
            <LotSelect
              itemId={item.itemId}
              warehouseId={row.warehouseId}
              locationId={row.locationId}
              value={row.lotId}
              valueLabel={row.lotNo}
              onChange={(lotId, lotNo, onHand) =>
                updateRow(item.id, { lotId, lotNo, availableHint: onHand })
              }
            />
            {row.availableHint ? (
              <div className={styles.lotMeta}>
                {t("คงเหลือใน Lot")} {formatQty(row.availableHint)}
              </div>
            ) : null}
            <div className={styles.lotActions}>
              <Tooltip title={<FifoTooltip />} placement="topLeft">
                <Button
                  size="small"
                  className={styles.fifoBtn}
                  icon={<ThunderboltOutlined />}
                  loading={suggestingId === row.id}
                  disabled={!row.warehouseId || !row.locationId}
                  onClick={() => void suggestLot(item, row)}
                >
                  {t("แนะนำ FIFO")}
                </Button>
              </Tooltip>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={editable ? "Picking · Edit" : "Picking · Detail"}
        icon={<InboxOutlined />}
        title={data.pickingNo}
        back={
          <>
<div className={styles.backRow}>
            <Link href="/pickings" className={styles.backLink}>
              <ArrowLeftOutlined /> {t("กลับรายการใบจ่าย")}
            </Link>
            <Link
              href={
                data.salesOrderId
                  ? `/sales-orders/${data.salesOrderId}`
                  : "/sales-orders"
              }
              className={styles.backLink}
            >
              <ShoppingCartOutlined /> {t("กลับใบสั่งขาย")}
            </Link>
          </div>
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
            ) : (
              <span className={styles.metaChip}>
                SO <span className={styles.metaChipMuted}>—</span>
              </span>
            )}
            <span className={styles.metaChip}>
              {t("ลูกค้า")}{" "}
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
          </>
        }
        actions={
          <>
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
            {t("ไปใบสั่งขาย")}
          </Button>
          <Button
            className={styles.secondaryBtn}
            icon={<FilePdfOutlined />}
            onClick={async () => {
              const { generatePickingPdf } = await import(
                "@/utils/generatePickingPdf"
              );
              void generatePickingPdf({
                pickingNo: data.pickingNo,
                pickingDate: dayjs(data.pickingDate).format("DD/MM/YYYY"),
                salesOrderNo: data.salesOrderNo ?? "—",
                customerName: data.customerName ?? "—",
                remark: data.remark?.trim() || "",
                items: (data.items ?? []).map((item, index) => ({
                  no: index + 1,
                  itemCode: item.itemCode ?? "—",
                  itemName: item.itemNameTh ?? "—",
                  unit: item.unitCode ?? "—",
                  qty: Number(item.pickedQty) || 0,
                  warehouse: item.warehouseCode ?? item.locationCode,
                  lotNo: item.lotNo,
                })),
              });
            }}
          >
            {t("พิมพ์ PDF")}
          </Button>
          {editable ? (
            <>
              <Button
                className={styles.secondaryBtn}
                icon={<SaveOutlined />}
                loading={updateMutation.isPending}
                onClick={() => void handleSave()}
              >
                {t("บันทึก DRAFT")}
              </Button>
              {canConfirm ? (
                <Button
                  type="primary"
                  className={styles.primaryBtn}
                  icon={<CheckOutlined />}
                  loading={confirmMutation.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: t("ยืนยันตัดสต๊อกตามใบจ่ายนี้?"),
                      content: reservationReady
                        ? t("ของจองครบแล้ว — ระบบจะตัดจากของที่จองไว้สำหรับใบจ่ายนี้และสร้าง stock movement ไม่ได้ตัด available ซ้ำจากคลังว่าง")
                        : t("ยืนยันตัดสต๊อกจริงจากของที่จองไว้สำหรับใบจ่ายนี้ และสร้าง stock movement"),
                      onOk: async () => {
                        if (!(await handleSave())) return;
                        await confirmMutation.mutateAsync(id);
                        router.push(`/pickings/${id}`);
                      },
                    })
                  }
                >
                  {t("ยืนยันตัดสต๊อก")}
                </Button>
              ) : null}
              <Button
                danger
                className={styles.secondaryBtn}
                icon={<CloseOutlined />}
                loading={cancelMutation.isPending}
                onClick={() =>
                  modal.confirm({
                    title: t("ยกเลิกใบจ่าย?"),
                    onOk: async () => {
                      await cancelMutation.mutateAsync(id);
                      router.push("/pickings");
                    },
                  })
                }
              >
                {t("ยกเลิก")}
              </Button>
            </>
          ) : null}
          {!editable && data.status === "DRAFT" && canWrite ? (
            <Button
              type="primary"
              className={styles.primaryBtn}
              icon={<CheckOutlined />}
              onClick={() => router.push(`/pickings/${id}/edit`)}
            >
              {t("แก้ไขและยืนยันตัดสต๊อก")}
            </Button>
          ) : null}
          {!editable && data.status === "CONFIRMED" ? (
            packingHref ? (
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<InboxOutlined />}
                onClick={() => router.push(packingHref)}
              >
                {t("เปิดใบบรรจุสินค้า")}
              </Button>
            ) : canCreatePackingFromThis ? (
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<InboxOutlined />}
                onClick={() =>
                  router.push(`/packings/create-from-picking/${id}`)
                }
              >
                {t("สร้างใบบรรจุสินค้า")}
              </Button>
            ) : null
          ) : null}
          <Button
            className={styles.secondaryBtn}
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/pickings")}
          >
            {t("กลับรายการ")}
          </Button>
          </>
        }
      />

      {!editable && data.status === "DRAFT" ? (
        <Alert
          type="info"
          showIcon
          title={t("ใบจ่ายอยู่สถานะแบบร่างเอกสาร")}
          description={
            canWrite
              ? reservationReady
                ? t("ของจองครบแล้ว — กด «แก้ไขและยืนยันตัดสต๊อก» แล้วกดยืนยันได้ทันที ไม่ต้องเลือกคลัง/Lot ใหม่")
                : t("กด «แก้ไขและยืนยันตัดสต๊อก» — ของถูกจองไว้แล้ว ระบบจะจัดคลัง/Lot ตามที่จองให้อัตโนมัติ")
              : t("รอเจ้าหน้าที่คลังยืนยันตัดสต๊อกจริงจากของที่จองไว้")
          }
        />
      ) : null}

      {editable && reservationReady ? (
        <Alert
          type="success"
          showIcon
          title={t("ของจองครบแล้ว — กดยืนยันตัดสต๊อกได้ทันที")}
          description={t("แถวด้านล่างมาจากของที่จองไว้สำหรับใบสั่งขายนี้ ไม่ต้องกดแนะนำ FIFO อีกครั้ง")}
        />
      ) : null}

      {data.status === "CONFIRMED" ? (
        <Alert
          type="success"
          showIcon
          title={t("ยืนยันแล้ว — สต๊อกถูกตัดและมี stock movement ประเภท SALES_OUT (ขายออก)")}
          description={
            packingHref
              ? t("ขั้นถัดไป: เปิดใบบรรจุสินค้าเพื่อดำเนินการต่อ")
              : canCreatePackingFromThis
                ? t("ขั้นถัดไป: สร้างใบบรรจุสินค้าจากใบจ่ายนี้")
                : packingRoundDone
                  ? t("รอบจัดส่งนี้บรรจุหรือส่งของไปแล้ว — ไม่สร้างใบบรรจุซ้ำจากใบจ่ายนี้")
                  : t("ขั้นถัดไปของรอบนี้ดำเนินการไปแล้ว หรือรอเอกสารบรรจุจากรอบนี้")
          }
        />
      ) : null}

      {editable && !reservationReady ? (
        <aside className={styles.tipCard} aria-label={t("คำอธิบาย FIFO Lot")}>
          <div className={styles.tipIcon}>
            <InfoCircleOutlined />
          </div>
          <div className={styles.tipBody}>
            <h2 className={styles.tipTitle}>{t("FIFO Lot คืออะไร?")}</h2>
            <p className={styles.tipText}>
              <strong>FIFO (First In, First Out)</strong> =
              {t("ใช้ Lot ที่รับเข้าคลังก่อนเป็นลำดับแรก ระบบจะแนะนำ Lot")}
              {t("เก่าสุดที่มียอดพร้อมใช้ในตำแหน่งที่เลือก")}
              {t("เพื่อให้จ่ายของเก่าก่อนของใหม่")}
            </p>
            <div className={styles.tipSteps}>
              <span className={styles.tipStep}>
                <span className={styles.tipStepNum}>1</span>
                {t("ตรวจคลัง / ตำแหน่งที่จองไว้")}
              </span>
              <span className={styles.tipStep}>
                <span className={styles.tipStepNum}>2</span>
                {t("เลือก Lot หรือกด “แนะนำ FIFO”")}
              </span>
              <span className={styles.tipStep}>
                <span className={styles.tipStepNum}>3</span>
                {t("ตรวจ Lot แล้วยืนยันตัดสต๊อก")}
              </span>
            </div>
          </div>
        </aside>
      ) : null}

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>{t("ข้อมูลใบจ่าย")}</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>{t("วันที่จ่าย")}</span>
            <DatePicker
              value={pickingDate}
              disabled={!editable}
              onChange={setPickingDate}
              style={{ width: "100%" }}
            />
          </label>
          <label className={styles.field}>
            <span>{t("หมายเหตุ")}</span>
            <Input.TextArea
              rows={2}
              value={remark}
              disabled={!editable}
              placeholder={t("ระบุหมายเหตุเพิ่มเติม (ถ้ามี)")}
              onChange={(e) => setRemark(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <p className={styles.toolbarTitle}>{t("รายการสินค้าที่จะหยิบ")}</p>
            <p className={styles.toolbarHint}>
              {reservationReady
                ? t("คลัง / ตำแหน่ง / Lot ถูกจัดตามของที่จองไว้แล้ว — กดยืนยันตัดสต๊อกได้ทันที")
                : t("คลัง/ตำแหน่ง/จำนวนยึดตามของที่จองไว้ — เปลี่ยนได้เฉพาะ Lot ในตำแหน่งเดียวกัน")}
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
          scroll={{ x: 900 }}
        />
      </section>

      {!editable ? (
        <section className={styles.actionFooter}>
          <div className={styles.actionFooterText}>
            {data.status === "CONFIRMED"
              ? t("ดำเนินการต่อ — สร้างหรือเปิดใบบรรจุสินค้า")
              : data.status === "DRAFT" && canWrite
                ? t("แก้ไขใบจ่ายแล้วยืนยันตัดสต๊อกจริงเพื่อไปขั้นบรรจุ")
                : t("กลับไปรายการหรือใบสั่งขาย")}
          </div>
          <div className={styles.actionFooterButtons}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push("/pickings")}
            >
              {t("กลับรายการใบจ่าย")}
            </Button>
            {data.salesOrderId ? (
              <Button
                icon={<ShoppingCartOutlined />}
                onClick={() =>
                  router.push(`/sales-orders/${data.salesOrderId}`)
                }
              >
                {t("กลับใบสั่งขาย")}
              </Button>
            ) : null}
            {data.status === "DRAFT" && canWrite ? (
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<CheckOutlined />}
                onClick={() => router.push(`/pickings/${id}/edit`)}
              >
                {t("แก้ไขและยืนยันตัดสต๊อก")}
              </Button>
            ) : null}
            {data.status === "CONFIRMED" ? (
              packingHref ? (
                <Button
                  type="primary"
                  className={styles.primaryBtn}
                  icon={<InboxOutlined />}
                  onClick={() => router.push(packingHref)}
                >
                  {t("เปิดใบบรรจุสินค้า")}
                </Button>
              ) : canCreatePackingFromThis ? (
                <Button
                  type="primary"
                  className={styles.primaryBtn}
                  icon={<InboxOutlined />}
                  onClick={() =>
                    router.push(`/packings/create-from-picking/${id}`)
                  }
                >
                  {t("สร้างใบบรรจุสินค้า")}
                </Button>
              ) : null
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Lot ที่มีของอยู่ในคลัง/ตำแหน่งที่จองไว้ของแถวนั้น — backend ตรวจ onHand ซ้ำตอนบันทึก */
function LotSelect({
  itemId,
  warehouseId,
  locationId,
  value,
  valueLabel,
  onChange,
}: {
  itemId: string;
  warehouseId?: string;
  locationId?: string;
  value?: string;
  valueLabel?: string;
  onChange: (lotId: string, lotNo: string, onHand: string) => void;
}) {
  const t = useT();
  const lotsQuery = useInventoryLotsQuery(
    { itemId, warehouseId, locationId, hasStock: true },
    { enabled: Boolean(warehouseId && locationId) },
  );
  const lots = lotsQuery.data?.data ?? [];
  const options = lots.map((lot) => ({
    value: lot.lotId,
    label: t("{lotNo} (คงเหลือ {quantityOnHand})", { lotNo: lot.lotNo, quantityOnHand: formatQty(lot.quantityOnHand) }),
  }));
  if (value && !options.some((o) => o.value === value)) {
    options.unshift({ value, label: valueLabel ?? value });
  }
  return (
    <Select
      showSearch
      optionFilterProp="label"
      style={{ width: "100%" }}
      loading={lotsQuery.isFetching}
      disabled={!warehouseId || !locationId}
      placeholder={t("เลือก Lot")}
      value={value}
      options={options}
      onChange={(lotId: string) => {
        const lot = lots.find((row) => row.lotId === lotId);
        onChange(lotId, lot?.lotNo ?? lotId, lot?.quantityOnHand ?? "");
      }}
    />
  );
}
