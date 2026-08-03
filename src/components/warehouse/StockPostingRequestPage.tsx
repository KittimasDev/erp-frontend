"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateStockPostingRequestMutation } from "@/hooks/stock-posting/useStockPostingMutations";
import { useStockPostingRequestByReceiptQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { ReceiptItem } from "@/types/raw-tire-purchase-receipt";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import {
  RECEIPT_STATUS_LABELS,
  STOCK_POSTING_STATUS_LABELS,
} from "@/types/raw-tire-purchase-receipt";
import styles from "@/components/weighbridge/WeighbridgeDashboardPage.module.css";
import lineStyles from "@/components/goods-receipts/GoodsReceiptFormPage.module.css";

type DestinationDraft = {
  key: string;
  warehouseId?: string;
  warehouseLocationId?: string;
  receivedWeightKg: number;
};

type LineDraft = {
  purchaseItemId: string;
  selected: boolean;
  destinations: DestinationDraft[];
};

type FormValues = {
  postingDate: dayjs.Dayjs;
  remark?: string;
};

type Props = {
  receiptId: string;
};

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(value?: string | number) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH");
}

function getRemainingKg(item: ReceiptItem) {
  if (item.remainingWeightKg !== undefined && item.remainingWeightKg !== "") {
    return Math.max(0, Number(item.remainingWeightKg) || 0);
  }
  const weight = Number(item.weightKg) || 0;
  const posted = Number(item.postedWeightKg ?? 0) || 0;
  return Math.max(0, Number((weight - posted).toFixed(3)));
}

function getPostedKg(item: ReceiptItem) {
  if (item.postedWeightKg !== undefined && item.postedWeightKg !== "") {
    return Math.max(0, Number(item.postedWeightKg) || 0);
  }
  const weight = Number(item.weightKg) || 0;
  const remaining = getRemainingKg(item);
  return Math.max(0, Number((weight - remaining).toFixed(3)));
}

function newDestKey() {
  return `dest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StockPostingRequestPage({ receiptId }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [lineDrafts, setLineDrafts] = useState<Record<string, LineDraft>>({});

  const canRequest = userHasRole(RoleCode.WAREHOUSE_OFFICER);
  const receiptQuery = useRawTirePurchaseReceiptQuery(receiptId);
  const existingQuery = useStockPostingRequestByReceiptQuery(receiptId);
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery({ isActive: true });
  const createMutation = useCreateStockPostingRequestMutation(receiptId);

  const receipt = receiptQuery.data?.data;
  const existing = existingQuery.data?.data;
  const pendingExists =
    existing?.status === StockPostingRequestStatus.PENDING_APPROVAL;
  const fullyPosted = receipt?.stockPostingStatus === "POSTED";
  const canSubmit =
    canRequest &&
    receipt?.status === "CONFIRMED" &&
    !pendingExists &&
    !fullyPosted;

  const warehouses = warehousesQuery.data?.data ?? [];
  const locations = locationsQuery.data?.data ?? [];

  const receivableItems = useMemo(() => {
    const items = receipt?.items ?? [];
    return items
      .map((item) => ({
        item,
        remaining: getRemainingKg(item),
        posted: getPostedKg(item),
      }))
      .filter(({ remaining }) => remaining > 1e-9);
  }, [receipt?.items]);

  useEffect(() => {
    if (!receipt || !canSubmit) {
      return;
    }
    form.setFieldsValue({
      postingDate: dayjs(),
    });
  }, [receipt, canSubmit, form]);

  useEffect(() => {
    if (!canSubmit) {
      setLineDrafts({});
      return;
    }

    const next: Record<string, LineDraft> = {};
    for (const { item, remaining } of receivableItems) {
      next[item.id] = {
        purchaseItemId: item.id,
        selected: true,
        destinations: [
          {
            key: newDestKey(),
            warehouseId: undefined,
            warehouseLocationId: undefined,
            receivedWeightKg: remaining,
          },
        ],
      };
    }
    setLineDrafts(next);
  }, [canSubmit, receivableItems]);

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehouses],
  );

  const selectedRequestWeight = useMemo(
    () =>
      Object.values(lineDrafts)
        .filter((line) => line.selected)
        .reduce(
          (sum, line) =>
            sum +
            line.destinations.reduce(
              (s, dest) => s + (Number(dest.receivedWeightKg) || 0),
              0,
            ),
          0,
        ),
    [lineDrafts],
  );

  const updateLine = (purchaseItemId: string, patch: Partial<LineDraft>) => {
    setLineDrafts((prev) => {
      const current = prev[purchaseItemId];
      if (!current) return prev;
      return {
        ...prev,
        [purchaseItemId]: { ...current, ...patch },
      };
    });
  };

  const updateDest = (
    purchaseItemId: string,
    destKey: string,
    patch: Partial<DestinationDraft>,
  ) => {
    setLineDrafts((prev) => {
      const current = prev[purchaseItemId];
      if (!current) return prev;
      return {
        ...prev,
        [purchaseItemId]: {
          ...current,
          destinations: current.destinations.map((dest) =>
            dest.key === destKey ? { ...dest, ...patch } : dest,
          ),
        },
      };
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const selectedLines = Object.values(lineDrafts).filter(
      (line) => line.selected,
    );

    if (!selectedLines.length) {
      message.warning("กรุณาเลือกรายการที่ต้องการรับเข้าคลังอย่างน้อย 1 รายการ");
      return;
    }

    const payloadItems: Array<{
      purchaseItemId: string;
      receivedWeightKg: number;
      warehouseId: string;
      warehouseLocationId: string;
    }> = [];

    for (const line of selectedLines) {
      const meta = receivableItems.find(
        (row) => row.item.id === line.purchaseItemId,
      );
      const remaining = meta?.remaining ?? 0;
      const label =
        meta?.item.classificationName ??
        meta?.item.description ??
        line.purchaseItemId;

      if (!line.destinations.length) {
        message.error(`${label}: ต้องมีปลายทางอย่างน้อย 1 คลัง`);
        return;
      }

      let destSum = 0;
      for (const [index, dest] of line.destinations.entries()) {
        const qty = Number(dest.receivedWeightKg) || 0;
        if (!(qty > 0)) {
          message.error(
            `${label} ปลายทางที่ ${index + 1}: น้ำหนักต้องมากกว่า 0`,
          );
          return;
        }
        if (!dest.warehouseId || !dest.warehouseLocationId) {
          message.error(
            `${label} ปลายทางที่ ${index + 1}: กรุณาเลือกคลังและตำแหน่ง`,
          );
          return;
        }
        destSum = Number((destSum + qty).toFixed(3));
        payloadItems.push({
          purchaseItemId: line.purchaseItemId,
          receivedWeightKg: Number(qty.toFixed(3)),
          warehouseId: dest.warehouseId,
          warehouseLocationId: dest.warehouseLocationId,
        });
      }

      if (destSum > remaining + 1e-9) {
        message.error(
          `${label}: รวมน้ำหนักปลายทาง ${formatWeight(destSum)} เกินคงเหลือ ${formatWeight(remaining)} กก.`,
        );
        return;
      }
    }

    const first = payloadItems[0];
    createMutation.mutate(
      {
        warehouseId: first.warehouseId,
        warehouseLocationId: first.warehouseLocationId,
        postingDate: values.postingDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
        items: payloadItems,
      },
      {
        onSuccess: () => {
          router.push("/warehouse/stock-posting-approvals");
        },
      },
    );
  };

  const isBusy =
    createMutation.isPending ||
    receiptQuery.isFetching ||
    existingQuery.isFetching;

  const statusTag = (() => {
    if (fullyPosted) {
      return { color: "success" as const, label: "รับเข้าคลังแล้ว" };
    }
    if (pendingExists) {
      return { color: "processing" as const, label: "รออนุมัติเข้าคลัง" };
    }
    if (receipt?.stockPostingStatus === "PARTIALLY_POSTED") {
      return { color: "warning" as const, label: "รับเข้าบางส่วน — ส่งต่อได้" };
    }
    if (existing?.status === StockPostingRequestStatus.REJECTED) {
      return { color: "warning" as const, label: "ไม่อนุมัติ — ส่งใหม่ได้" };
    }
    if (receipt?.status === "CONFIRMED") {
      return { color: "processing" as const, label: "พร้อมส่งคำขอ" };
    }
    return { color: "default" as const, label: "ยังไม่พร้อม" };
  })();

  return (
    <MasterPageGate
      isLoading={existingQuery.isLoading || receiptQuery.isLoading}
    >
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/receiving/receipts/${receiptId}`)}
          >
            กลับใบรับซื้อ
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={receiptQuery.isFetching || existingQuery.isFetching}
              onClick={() => {
                void receiptQuery.refetch();
                void existingQuery.refetch();
              }}
            >
              รีเฟรช
            </Button>
          </div>
        </div>

        {receiptQuery.isError || existingQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                โหลดข้อมูลคำขอเข้าคลังไม่สำเร็จ
              </Typography.Text>
            </div>
          </div>
        ) : receipt ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>ส่งคำขอรับเข้าคลัง</h3>
                    <p>
                      ใบรับซื้อ {receipt.receiptNo} ·{" "}
                      {receipt.seller?.sellerName ?? "-"} · น้ำหนักจ่ายได้{" "}
                      {formatWeight(receipt.payableWeightKg)} กก. · ยอด{" "}
                      {formatMoney(receipt.totalAmount)} บาท
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag className={styles.flowTag}>
                      {RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status}
                    </Tag>
                    <Tag color={statusTag.color} className={styles.flowTag}>
                      {statusTag.label}
                    </Tag>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.classificationLayout}>
              <div className={styles.classificationMain}>
                {!canRequest ? (
                  <div className={styles.card}>
                    <div className={styles.cardBody}>
                      <Typography.Text type="warning">
                        ต้องมีสิทธิ์เจ้าหน้าที่คลัง (WAREHOUSE_OFFICER)
                        เพื่อส่งคำขอรับเข้าคลัง
                      </Typography.Text>
                    </div>
                  </div>
                ) : null}

                {receipt.status !== "CONFIRMED" ? (
                  <div className={styles.card}>
                    <div className={styles.cardBody}>
                      <Typography.Text type="danger">
                        ใบรับซื้อต้องสถานะยืนยันแล้วก่อนส่งคำขอรับเข้าคลัง
                      </Typography.Text>
                    </div>
                  </div>
                ) : null}

                {existing ? (
                  <div className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h3>คำขอล่าสุด</h3>
                      <p>
                        {existing.requestNo} ·{" "}
                        {STOCK_POSTING_REQUEST_STATUS_LABEL[existing.status] ??
                          existing.status}
                      </p>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.detailGrid}>
                        <DetailItem
                          label="คลัง (หัวคำขอ)"
                          value={
                            existing.warehouseName
                              ? `${existing.warehouseCode ?? ""} · ${existing.warehouseName}`
                              : "-"
                          }
                        />
                        <DetailItem
                          label="ตำแหน่ง"
                          value={
                            existing.locationName
                              ? `${existing.locationCode ?? ""} · ${existing.locationName}`
                              : "-"
                          }
                        />
                        <DetailItem
                          label="วันที่รับเข้า"
                          value={formatDate(existing.postingDate)}
                        />
                        <DetailItem
                          label="ผู้ขอ"
                          value={
                            existing.requestedBy?.displayName ||
                            existing.requestedBy?.username ||
                            "-"
                          }
                        />
                        {existing.rejectReason ? (
                          <DetailItem
                            label="เหตุผลไม่อนุมัติ"
                            value={existing.rejectReason}
                            fullWidth
                          />
                        ) : null}
                      </div>
                      {pendingExists ? (
                        <Typography.Paragraph
                          type="secondary"
                          style={{ marginTop: 12, marginBottom: 0 }}
                        >
                          มีคำขอรออนุมัติอยู่แล้ว — ไม่สามารถส่งซ้ำได้
                          จนกว่าจะถูกอนุมัติหรือปฏิเสธ
                        </Typography.Paragraph>
                      ) : null}
                      {fullyPosted ? (
                        <Typography.Paragraph
                          type="success"
                          style={{ marginTop: 12, marginBottom: 0 }}
                        >
                          อนุมัติและรับเข้าคลังครบแล้ว
                        </Typography.Paragraph>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className={styles.card}>
                  <div className={styles.listHeader}>
                    <div>
                      <h3>เลือกรายการและคลังปลายทาง</h3>
                      <p>
                        แยกรายการเดียวเข้าได้หลายคลัง — รวมน้ำหนักห้ามเกินคงเหลือ
                      </p>
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    {(canSubmit ? receivableItems : []).length === 0 ? (
                      <Typography.Text type="secondary">
                        {fullyPosted
                          ? "รับเข้าคลังครบทุกรายการแล้ว"
                          : "ไม่มีรายการคงเหลือให้รับเข้า"}
                      </Typography.Text>
                    ) : (
                      <div className={lineStyles.lineList}>
                        {receivableItems.map(({ item, remaining, posted }) => {
                          const draft = lineDrafts[item.id];
                          const destinations = draft?.destinations ?? [];
                          const destSum = Number(
                            destinations
                              .reduce(
                                (s, d) => s + Number(d.receivedWeightKg ?? 0),
                                0,
                              )
                              .toFixed(3),
                          );
                          const label =
                            item.classificationName ?? item.description ?? "-";

                          return (
                            <div key={item.id} className={lineStyles.lineCard}>
                              <div className={lineStyles.lineCardHeader}>
                                <Checkbox
                                  checked={draft?.selected ?? false}
                                  disabled={!canSubmit}
                                  onChange={(event) =>
                                    updateLine(item.id, {
                                      selected: event.target.checked,
                                    })
                                  }
                                >
                                  <strong>{label}</strong>
                                </Checkbox>
                                <span className={lineStyles.sectionHint}>
                                  รวม {formatWeight(item.weightKg)} · รับแล้ว{" "}
                                  {formatWeight(posted)} · เหลือ{" "}
                                  {formatWeight(remaining)} กก.
                                </span>
                              </div>

                              {draft?.selected && canSubmit ? (
                                <div className={lineStyles.destList}>
                                  {destinations.map((dest, destIndex) => {
                                    const locs = locations.filter(
                                      (loc) =>
                                        loc.warehouseId === dest.warehouseId,
                                    );
                                    const otherSum = Number(
                                      destinations
                                        .reduce((s, d, i) => {
                                          if (i === destIndex) return s;
                                          return (
                                            s + Number(d.receivedWeightKg ?? 0)
                                          );
                                        }, 0)
                                        .toFixed(3),
                                    );
                                    const maxForThis = Number(
                                      Math.max(
                                        0.001,
                                        remaining - otherSum,
                                      ).toFixed(3),
                                    );

                                    return (
                                      <div
                                        key={dest.key}
                                        className={lineStyles.destCard}
                                      >
                                        <div className={lineStyles.destCardHead}>
                                          <span>
                                            ปลายทางที่ {destIndex + 1}
                                          </span>
                                          {destinations.length > 1 ? (
                                            <Button
                                              type="text"
                                              danger
                                              size="small"
                                              icon={<DeleteOutlined />}
                                              onClick={() =>
                                                updateLine(item.id, {
                                                  destinations:
                                                    destinations.filter(
                                                      (d) => d.key !== dest.key,
                                                    ),
                                                })
                                              }
                                            >
                                              ลบ
                                            </Button>
                                          ) : null}
                                        </div>
                                        <div className={styles.detailGrid}>
                                          <div>
                                            <Typography.Text
                                              type="secondary"
                                              style={{
                                                fontSize: 12,
                                                display: "block",
                                                marginBottom: 4,
                                              }}
                                            >
                                              น้ำหนัก (กก.)
                                            </Typography.Text>
                                            <InputNumber
                                              style={{ width: "100%" }}
                                              min={0.001}
                                              max={maxForThis}
                                              step={0.001}
                                              precision={3}
                                              value={dest.receivedWeightKg}
                                              onChange={(value) => {
                                                const nextValue = Number(
                                                  value ?? 0,
                                                );
                                                updateDest(item.id, dest.key, {
                                                  receivedWeightKg: Number(
                                                    Math.min(
                                                      Math.max(nextValue, 0),
                                                      maxForThis,
                                                    ).toFixed(3),
                                                  ),
                                                });
                                              }}
                                            />
                                          </div>
                                          <div>
                                            <Typography.Text
                                              type="secondary"
                                              style={{
                                                fontSize: 12,
                                                display: "block",
                                                marginBottom: 4,
                                              }}
                                            >
                                              คลังสินค้า
                                            </Typography.Text>
                                            <Select
                                              showSearch
                                              optionFilterProp="label"
                                              style={{ width: "100%" }}
                                              placeholder="เลือกคลัง"
                                              options={warehouseOptions}
                                              loading={
                                                warehousesQuery.isLoading
                                              }
                                              value={dest.warehouseId}
                                              onChange={(value) =>
                                                updateDest(item.id, dest.key, {
                                                  warehouseId: value,
                                                  warehouseLocationId:
                                                    undefined,
                                                })
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Typography.Text
                                              type="secondary"
                                              style={{
                                                fontSize: 12,
                                                display: "block",
                                                marginBottom: 4,
                                              }}
                                            >
                                              ตำแหน่งจัดเก็บ
                                            </Typography.Text>
                                            <Select
                                              showSearch
                                              optionFilterProp="label"
                                              style={{ width: "100%" }}
                                              placeholder={
                                                dest.warehouseId
                                                  ? "เลือกตำแหน่ง"
                                                  : "เลือกคลังก่อน"
                                              }
                                              disabled={!dest.warehouseId}
                                              loading={
                                                locationsQuery.isFetching
                                              }
                                              value={dest.warehouseLocationId}
                                              options={locs.map((loc) => ({
                                                value: loc.id,
                                                label: `${loc.locationCode} — ${loc.locationName}`,
                                              }))}
                                              onChange={(value) =>
                                                updateDest(item.id, dest.key, {
                                                  warehouseLocationId: value,
                                                })
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  <div className={lineStyles.destFooter}>
                                    <Button
                                      type="dashed"
                                      icon={<PlusOutlined />}
                                      disabled={destSum >= remaining - 1e-9}
                                      onClick={() => {
                                        const leftover = Number(
                                          Math.max(
                                            0,
                                            remaining - destSum,
                                          ).toFixed(3),
                                        );
                                        updateLine(item.id, {
                                          destinations: [
                                            ...destinations,
                                            {
                                              key: newDestKey(),
                                              warehouseId: undefined,
                                              warehouseLocationId: undefined,
                                              receivedWeightKg: leftover || 0.001,
                                            },
                                          ],
                                        });
                                      }}
                                    >
                                      เพิ่มคลัง
                                    </Button>
                                    <Typography.Text type="secondary">
                                      รวมรับ {formatWeight(destSum)} / เหลือ{" "}
                                      {formatWeight(remaining)} กก.
                                    </Typography.Text>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>ข้อมูลคำขอรับเข้าคลัง</h3>
                    <p>ระบุวันที่รับเข้า แล้วส่งให้หัวหน้าคลังอนุมัติ</p>
                  </div>
                  <div className={styles.cardBody}>
                    <Form
                      form={form}
                      layout="vertical"
                      requiredMark="optional"
                      onFinish={() => {
                        if (canSubmit) {
                          void handleSubmit();
                        }
                      }}
                    >
                      {canSubmit ? (
                        <>
                          <div className={styles.detailGrid}>
                            <Form.Item
                              label="วันที่รับเข้า"
                              name="postingDate"
                              rules={[
                                {
                                  required: true,
                                  message: "กรุณาเลือกวันที่",
                                },
                              ]}
                            >
                              <DatePicker
                                style={{ width: "100%" }}
                                format="DD/MM/YYYY"
                              />
                            </Form.Item>
                          </div>

                          <Form.Item label="หมายเหตุ" name="remark">
                            <Input.TextArea
                              rows={3}
                              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                            />
                          </Form.Item>

                          <div className={styles.classificationActions}>
                            <Button
                              type="primary"
                              htmlType="submit"
                              className={styles.submitButton}
                              icon={<InboxOutlined />}
                              loading={createMutation.isPending}
                              disabled={
                                isBusy ||
                                receivableItems.length === 0 ||
                                selectedRequestWeight <= 0
                              }
                            >
                              ส่งคำขอรับเข้าคลัง (
                              {formatWeight(selectedRequestWeight)} กก.)
                            </Button>
                            <Button
                              disabled={isBusy}
                              onClick={() =>
                                router.push(`/receiving/receipts/${receiptId}`)
                              }
                            >
                              ยกเลิก
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className={styles.slipLocked}>
                          <Typography.Text type="secondary">
                            {fullyPosted
                              ? "รับเข้าคลังครบแล้ว — ไม่ต้องส่งคำขออีก"
                              : pendingExists
                                ? "มีคำขอรออนุมัติอยู่ — รอหัวหน้าคลังดำเนินการ"
                                : receipt.status !== "CONFIRMED"
                                  ? "ยืนยันใบรับซื้อก่อน จึงจะส่งคำขอเข้าคลังได้"
                                  : !canRequest
                                    ? "ไม่มีสิทธิ์ส่งคำขอรับเข้าคลัง"
                                    : "ยังไม่สามารถส่งคำขอได้ในสถานะนี้"}
                          </Typography.Text>
                          {fullyPosted || pendingExists ? (
                            <div style={{ marginTop: 12 }}>
                              <Button
                                onClick={() =>
                                  router.push(
                                    "/warehouse/stock-posting-approvals",
                                  )
                                }
                              >
                                ไปหน้ารายการอนุมัติเข้าคลัง
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </Form>
                  </div>
                </div>
              </div>

              <aside className={styles.classificationSummarySticky}>
                <div>
                  <p className={styles.classificationSummaryEyebrow}>
                    สรุปเข้าคลัง
                  </p>
                  <h3 style={{ margin: "4px 0 8px", fontSize: 18 }}>
                    {receipt.receiptNo}
                  </h3>
                  <Typography.Text type="secondary">
                    {receipt.seller?.sellerName ?? "ผู้ขาย"}
                  </Typography.Text>
                </div>

                <div className={styles.detailGrid}>
                  <DetailItem
                    label="สถานะใบรับซื้อ"
                    value={
                      RECEIPT_STATUS_LABELS[receipt.status] ?? receipt.status
                    }
                  />
                  <DetailItem
                    label="สถานะสต๊อก"
                    value={
                      STOCK_POSTING_STATUS_LABELS[
                        receipt.stockPostingStatus
                      ] ??
                      receipt.stockPostingStatus ??
                      "-"
                    }
                  />
                  <DetailItem
                    label="น้ำหนักจ่ายได้"
                    value={`${formatWeight(receipt.payableWeightKg)} กก.`}
                  />
                  <DetailItem
                    label="ยอดเงิน"
                    value={`${formatMoney(receipt.totalAmount)} บาท`}
                  />
                  <DetailItem
                    label="รายการคงเหลือ"
                    value={`${receivableItems.length} รายการ`}
                  />
                  {canSubmit ? (
                    <DetailItem
                      label="น้ำหนักที่ขอรอบนี้"
                      value={`${formatWeight(selectedRequestWeight)} กก.`}
                    />
                  ) : null}
                </div>

                <Typography.Paragraph
                  type="secondary"
                  style={{ marginBottom: 0, fontSize: 13 }}
                >
                  กด &quot;เพิ่มคลัง&quot; เพื่อแยกน้ำหนักเข้าหลายคลัง
                  รวมแล้วต้องไม่เกินคงเหลือ
                </Typography.Paragraph>
              </aside>
            </div>
          </>
        ) : null}
      </section>
    </MasterPageGate>
  );
}

function DetailItem({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={
        fullWidth
          ? `${styles.detailItem} ${styles.detailItemFull}`
          : styles.detailItem
      }
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
