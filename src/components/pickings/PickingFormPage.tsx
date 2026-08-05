"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Input,
  InputNumber,
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
import { useAvailableLocationsQuery } from "@/hooks/dispatch-orders/useDispatchOrdersQuery";
import {
  useSalesOrderAvailableWarehousesQuery,
  useSalesOrderStockVerificationQuery,
} from "@/hooks/sales-orders/useSalesOrdersQuery";
import { getFifoLotSuggestion } from "@/lib/api/dispatch-orders";
import { getAccessToken } from "@/lib/auth/token";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { PickingItem } from "@/types/pickings";
import { PICKING_STATUS_LABEL } from "@/types/pickings";
import type { SalesOrderStockVerificationLine } from "@/types/sales-orders";
import styles from "./PickingFormPage.module.css";

type Props = { id: string; mode: "view" | "edit" };

type RowEdit = {
  id: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  lotNo?: string;
  pickedQty: number;
  availableHint?: string;
};

const FIFO_TOOLTIP = (
  <div style={{ maxWidth: 280 }}>
    <strong>FIFO = First In, First Out</strong>
    <div style={{ marginTop: 6, lineHeight: 1.5 }}>
      ระบบแนะนำ Lot ที่รับเข้าคลังเก่าสุดก่อน เพื่อใช้ของเก่าก่อนของใหม่
      ลดความเสี่ยงสินค้าหมดอายุหรือค้างสต๊อกนาน
    </div>
  </div>
);

function sourceFromVerification(
  line: SalesOrderStockVerificationLine | undefined,
  requiresLot?: boolean,
): Pick<
  RowEdit,
  "warehouseId" | "locationId" | "lotId" | "lotNo" | "availableHint"
> {
  if (!line) return {};
  if (requiresLot && line.availableLots?.length) {
    const lot = line.availableLots[0];
    return {
      warehouseId: lot.warehouseId,
      locationId: lot.locationId,
      lotId: lot.lotId,
      lotNo: lot.lotNo,
      availableHint: lot.availableQty,
    };
  }
  if (line.availableLocations?.length) {
    const loc = line.availableLocations[0];
    return {
      warehouseId: loc.warehouseId,
      locationId: loc.locationId,
      availableHint: loc.availableQty,
    };
  }
  if (line.availableLots?.length) {
    const lot = line.availableLots[0];
    return {
      warehouseId: lot.warehouseId,
      locationId: lot.locationId,
      lotId: lot.lotId,
      lotNo: lot.lotNo,
      availableHint: lot.availableQty,
    };
  }
  return {};
}

export default function PickingFormPage({ id, mode }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const query = usePickingQuery(id);
  const updateMutation = useUpdatePickingMutation();
  const confirmMutation = useConfirmPickingMutation();
  const cancelMutation = useCancelPickingMutation();

  const data = query.data?.data;
  const warehousesQuery = useSalesOrderAvailableWarehousesQuery(
    data?.salesOrderId,
  );
  const verifyQuery = useSalesOrderStockVerificationQuery(data?.salesOrderId);

  const canWrite =
    userHasRole(RoleCode.WAREHOUSE_OFFICER) ||
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    isAdministrator();

  const isDraft = data?.status === "DRAFT";
  const editable = mode === "edit" && isDraft && canWrite;

  const [pickingDate, setPickingDate] = useState<dayjs.Dayjs | null>(null);
  const [remark, setRemark] = useState("");
  const [rows, setRows] = useState<RowEdit[]>([]);
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    if (data.status !== "DRAFT" && mode === "edit") {
      router.replace(`/pickings/${data.id}`);
      return;
    }
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
    prefilledRef.current = false;
  }, [data, mode, router]);

  useEffect(() => {
    if (!editable || !data || prefilledRef.current) return;
    const verify = verifyQuery.data?.data;
    if (!verify) return;

    const needsFill = data.items.some((item) => !item.warehouseId);
    if (!needsFill) {
      prefilledRef.current = true;
      return;
    }

    const bySoItem = new Map(
      verify.lines.map((line) => [line.salesOrderItemId, line]),
    );

    setRows((prev) =>
      prev.map((row) => {
        if (row.warehouseId) return row;
        const item = data.items.find((i) => i.id === row.id);
        if (!item) return row;
        const source = sourceFromVerification(
          bySoItem.get(item.salesOrderItemId),
          item.requiresLotControl,
        );
        return { ...row, ...source };
      }),
    );
    prefilledRef.current = true;
  }, [editable, data, verifyQuery.data]);

  const warehouses = warehousesQuery.data?.data ?? [];

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

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id,
      body: {
        pickingDate: pickingDate?.format("YYYY-MM-DD"),
        remark,
        items: rows.map((row) => ({
          id: row.id,
          warehouseId: row.warehouseId,
          locationId: row.locationId,
          lotId: row.lotId ?? null,
          pickedQty: row.pickedQty,
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

  const statusLabel =
    PICKING_STATUS_LABEL[data.status as keyof typeof PICKING_STATUS_LABEL] ??
    data.status;

  const columns: ColumnsType<PickingItem> = [
    {
      title: "สินค้า",
      key: "item",
      render: (_v, item) => (
        <div>
          <div className={styles.itemCode}>{item.itemCode}</div>
          <div className={styles.itemName}>{item.itemNameTh}</div>
          {item.requiresLotControl ? (
            <span className={styles.lotRequired}>ต้องระบุ Lot</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "สั่ง",
      dataIndex: "orderedQty",
      width: 88,
      align: "right",
    },
    {
      title: "หยิบ",
      key: "picked",
      width: 110,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) return item.pickedQty;
        return (
          <InputNumber
            min={0.001}
            value={row.pickedQty}
            style={{ width: "100%" }}
            onChange={(v) => updateRow(item.id, { pickedQty: Number(v) || 0 })}
          />
        );
      },
    },
    {
      title: "คลัง",
      key: "wh",
      width: 170,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) return item.warehouseCode ?? "—";
        const options = warehouses.map((w) => ({
          value: w.warehouseId,
          label: `${w.warehouseCode ?? ""} — ${w.warehouseName ?? ""}`,
        }));
        if (
          row.warehouseId &&
          !options.some((o) => o.value === row.warehouseId)
        ) {
          options.unshift({
            value: row.warehouseId,
            label: item.warehouseCode ?? row.warehouseId,
          });
        }
        return (
          <Select
            showSearch
            optionFilterProp="label"
            style={{ width: "100%" }}
            placeholder="คลังที่มีสต๊อก"
            value={row.warehouseId}
            options={options}
            onChange={(warehouseId) =>
              updateRow(item.id, {
                warehouseId,
                locationId: undefined,
                lotId: undefined,
                lotNo: undefined,
                availableHint: undefined,
              })
            }
          />
        );
      },
    },
    {
      title: "ตำแหน่ง",
      key: "loc",
      width: 150,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) return item.locationCode ?? "—";
        return (
          <LocationSelect
            itemId={item.itemId}
            warehouseId={row.warehouseId}
            value={row.locationId}
            onChange={(locationId) => {
              updateRow(item.id, {
                locationId,
                lotId: undefined,
                lotNo: undefined,
                availableHint: undefined,
              });
              void suggestLot(item, { ...row, locationId });
            }}
          />
        );
      },
    },
    {
      title: (
        <span className={styles.colHelp}>
          Lot
          <Tooltip title={FIFO_TOOLTIP} placement="top">
            <QuestionCircleOutlined className={styles.helpIcon} />
          </Tooltip>
        </span>
      ),
      key: "lot",
      width: 210,
      render: (_v, item) => {
        const row = rows.find((r) => r.id === item.id);
        if (!editable || !row) {
          return item.lotNo ?? item.lotId ?? "—";
        }
        const lotLabel = row.lotNo ?? row.lotId;
        return (
          <div>
            <span
              className={`${styles.lotBadge} ${
                lotLabel ? "" : styles.lotBadgeEmpty
              }`}
            >
              {lotLabel ?? "ยังไม่เลือก Lot"}
            </span>
            {row.availableHint ? (
              <div className={styles.lotMeta}>
                คงเหลือใน Lot {Number(row.availableHint).toLocaleString("th-TH")}
              </div>
            ) : null}
            <div className={styles.lotActions}>
              <Tooltip title={FIFO_TOOLTIP} placement="topLeft">
                <Button
                  size="small"
                  className={styles.fifoBtn}
                  icon={<ThunderboltOutlined />}
                  loading={suggestingId === row.id}
                  disabled={!row.warehouseId || !row.locationId}
                  onClick={() => void suggestLot(item, row)}
                >
                  แนะนำ FIFO
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
      <header className={styles.pageHeader}>
        <div className={styles.headerAccent}>
          <InboxOutlined />
        </div>
        <div className={styles.headerContent}>
          <div className={styles.backRow}>
            <Link href="/pickings" className={styles.backLink}>
              <ArrowLeftOutlined /> กลับรายการใบจ่าย
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
            {editable ? "Picking · Edit" : "Picking · Detail"}
          </p>
          <h1 className={styles.pageTitle}>{data.pickingNo}</h1>
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
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<CheckOutlined />}
                loading={confirmMutation.isPending}
                onClick={() =>
                  modal.confirm({
                    title: "ยืนยันตัดสต๊อกตามใบจ่ายนี้?",
                    content:
                      "ระบบจะตรวจสต๊อกอีกครั้งแล้วตัด quantity_available",
                    onOk: async () => {
                      await handleSave();
                      await confirmMutation.mutateAsync(id);
                      router.push(`/pickings/${id}`);
                    },
                  })
                }
              >
                ยืนยันตัดสต๊อก
              </Button>
              <Button
                danger
                className={styles.secondaryBtn}
                icon={<CloseOutlined />}
                loading={cancelMutation.isPending}
                onClick={() =>
                  modal.confirm({
                    title: "ยกเลิกใบจ่าย?",
                    onOk: async () => {
                      await cancelMutation.mutateAsync(id);
                      router.push("/pickings");
                    },
                  })
                }
              >
                ยกเลิก
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {data.status === "CONFIRMED" ? (
        <Alert
          type="success"
          showIcon
          title="ยืนยันแล้ว — สต๊อกถูกตัดและมี stock movement ประเภท SALES_OUT (ขายออก)"
        />
      ) : null}

      {editable ? (
        <aside className={styles.tipCard} aria-label="คำอธิบาย FIFO Lot">
          <div className={styles.tipIcon}>
            <InfoCircleOutlined />
          </div>
          <div className={styles.tipBody}>
            <h2 className={styles.tipTitle}>FIFO Lot คืออะไร?</h2>
            <p className={styles.tipText}>
              <strong>FIFO (First In, First Out)</strong> =
              ใช้ Lot ที่รับเข้าคลังก่อนเป็นลำดับแรก ระบบจะแนะนำ Lot
              เก่าสุดที่มียอดพร้อมใช้ในตำแหน่งที่เลือก
              เพื่อให้จ่ายของเก่าก่อนของใหม่
            </p>
            <div className={styles.tipSteps}>
              <span className={styles.tipStep}>
                <span className={styles.tipStepNum}>1</span>
                เลือกคลัง / ตำแหน่ง
              </span>
              <span className={styles.tipStep}>
                <span className={styles.tipStepNum}>2</span>
                กด “แนะนำ FIFO”
              </span>
              <span className={styles.tipStep}>
                <span className={styles.tipStepNum}>3</span>
                ตรวจ Lot แล้วยืนยันตัดสต๊อก
              </span>
            </div>
          </div>
        </aside>
      ) : null}

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>ข้อมูลใบจ่าย</h2>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>วันที่จ่าย</span>
            <DatePicker
              value={pickingDate}
              disabled={!editable}
              onChange={setPickingDate}
              style={{ width: "100%" }}
            />
          </label>
          <label className={styles.field}>
            <span>หมายเหตุ</span>
            <Input.TextArea
              rows={2}
              value={remark}
              disabled={!editable}
              placeholder="ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
              onChange={(e) => setRemark(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <p className={styles.toolbarTitle}>รายการสินค้าที่จะหยิบ</p>
            <p className={styles.toolbarHint}>
              คลังและตำแหน่งถูกเติมจากสต๊อกที่มีตอนตรวจสต๊อก —
              เปลี่ยนได้เฉพาะคลังที่มีของของใบนี้
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
    </div>
  );
}

function LocationSelect({
  itemId,
  warehouseId,
  value,
  onChange,
}: {
  itemId: string;
  warehouseId?: string;
  value?: string;
  onChange: (id: string) => void;
}) {
  const locationsQuery = useAvailableLocationsQuery({
    itemId,
    warehouseId,
  });
  const locations = locationsQuery.data?.data ?? [];
  const options = locations.map((loc) => ({
    value: loc.locationId,
    label: `${loc.locationCode ?? loc.locationId} (${loc.quantityAvailable})`,
  }));
  if (value && !options.some((o) => o.value === value)) {
    options.unshift({ value, label: value });
  }
  return (
    <Select
      showSearch
      optionFilterProp="label"
      style={{ width: "100%" }}
      disabled={!warehouseId}
      placeholder={warehouseId ? "ตำแหน่งที่มีสต๊อก" : "เลือกคลังก่อน"}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}
