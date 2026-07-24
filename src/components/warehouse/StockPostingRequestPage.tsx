"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  InboxOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useCreateStockPostingRequestMutation } from "@/hooks/stock-posting/useStockPostingMutations";
import { useStockPostingRequestByReceiptQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { useRawTirePurchaseReceiptQuery } from "@/hooks/raw-tire-purchase/useRawTirePurchaseReceiptQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import type { StockPostingReceiptItem } from "@/types/stock-posting-request";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import {
  RECEIPT_STATUS_LABELS,
  STOCK_POSTING_STATUS_LABELS,
} from "@/types/raw-tire-purchase-receipt";
import styles from "@/components/weighbridge/WeighbridgeDashboardPage.module.css";

type FormValues = {
  warehouseId: string;
  warehouseLocationId: string;
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

export default function StockPostingRequestPage({ receiptId }: Props) {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const warehouseId = Form.useWatch("warehouseId", form);

  const canRequest = userHasRole(RoleCode.WAREHOUSE_OFFICER);
  const receiptQuery = useRawTirePurchaseReceiptQuery(receiptId);
  const existingQuery = useStockPostingRequestByReceiptQuery(receiptId);
  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    warehouseId ? { warehouseId, isActive: true } : undefined,
    { enabled: Boolean(warehouseId) },
  );
  const createMutation = useCreateStockPostingRequestMutation(receiptId);

  const receipt = receiptQuery.data?.data;
  const existing = existingQuery.data?.data;
  const pendingExists =
    existing?.status === StockPostingRequestStatus.PENDING_APPROVAL;
  const alreadyPosted =
    receipt?.stockPostingStatus === "POSTED" ||
    existing?.status === StockPostingRequestStatus.APPROVED;
  const rejected =
    existing?.status === StockPostingRequestStatus.REJECTED;
  const canSubmit =
    canRequest &&
    receipt?.status === "CONFIRMED" &&
    !pendingExists &&
    !alreadyPosted;

  useEffect(() => {
    form.setFieldsValue({
      postingDate: dayjs(),
    });
  }, [form]);

  useEffect(() => {
    form.setFieldValue("warehouseLocationId", undefined);
  }, [warehouseId, form]);

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? []).map((w) => ({
        value: w.id,
        label: `${w.warehouseCode} — ${w.warehouseName}`,
      })),
    [warehousesQuery.data?.data],
  );

  const locationOptions = useMemo(
    () =>
      (locationsQuery.data?.data ?? []).map((loc) => ({
        value: loc.id,
        label: `${loc.locationCode} — ${loc.locationName}`,
      })),
    [locationsQuery.data?.data],
  );

  const itemColumns: ColumnsType<StockPostingReceiptItem> = [
    {
      title: "ประเภทสินค้า",
      dataIndex: "classificationName",
      key: "classificationName",
    },
    {
      title: "น้ำหนัก (กก.)",
      dataIndex: "weightKg",
      key: "weightKg",
      align: "right",
      width: 120,
      render: (value: string) => formatWeight(value),
    },
    {
      title: "ราคา/กก.",
      dataIndex: "pricePerKg",
      key: "pricePerKg",
      align: "right",
      width: 110,
      render: (value: string) => formatMoney(value),
    },
    {
      title: "ยอดเงิน",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 120,
      render: (value: string) => formatMoney(value),
    },
  ];

  const handleSubmit = async () => {
    const values = await form.validateFields();
    createMutation.mutate(
      {
        warehouseId: values.warehouseId,
        warehouseLocationId: values.warehouseLocationId,
        postingDate: values.postingDate.format("YYYY-MM-DD"),
        remark: values.remark?.trim() || undefined,
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
    if (alreadyPosted) {
      return { color: "success" as const, label: "รับเข้าคลังแล้ว" };
    }
    if (pendingExists) {
      return { color: "processing" as const, label: "รออนุมัติเข้าคลัง" };
    }
    if (rejected) {
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
                          label="คลัง"
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
                        {existing.remark ? (
                          <DetailItem
                            label="หมายเหตุ"
                            value={existing.remark}
                            fullWidth
                          />
                        ) : null}
                      </div>
                      {pendingExists ? (
                        <Typography.Paragraph
                          type="secondary"
                          style={{ marginTop: 12, marginBottom: 0 }}
                        >
                          มีคำขอรออนุมัติอยู่แล้ว — ไม่สามารถส่งซ้ำได้ จนกว่าจะถูกอนุมัติหรือปฏิเสธ
                        </Typography.Paragraph>
                      ) : null}
                      {alreadyPosted ? (
                        <Typography.Paragraph
                          type="success"
                          style={{ marginTop: 12, marginBottom: 0 }}
                        >
                          อนุมัติและรับเข้าคลังแล้ว
                        </Typography.Paragraph>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {receipt.items?.length ? (
                  <div className={styles.card}>
                    <div className={styles.listHeader}>
                      <div>
                        <h3>รายการยางในใบรับซื้อ</h3>
                        <p>น้ำหนักที่จะรับเข้าสต๊อกตามรายการคัดแยก</p>
                      </div>
                    </div>
                    <Table
                      rowKey="id"
                      size="middle"
                      pagination={false}
                      columns={itemColumns}
                      dataSource={receipt.items.map((item) => ({
                        id: item.id,
                        classificationName:
                          item.classificationName ?? item.description ?? "-",
                        weightKg: item.weightKg,
                        pricePerKg: item.pricePerKg,
                        amount: item.amount,
                      }))}
                    />
                  </div>
                ) : null}

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>ข้อมูลคำขอรับเข้าคลัง</h3>
                    <p>
                      เลือกคลังและตำแหน่งจัดเก็บ แล้วส่งให้หัวหน้าคลังอนุมัติ
                    </p>
                  </div>
                  <div className={styles.cardBody}>
                    {canSubmit ? (
                      <Form
                        form={form}
                        layout="vertical"
                        requiredMark="optional"
                        onFinish={() => void handleSubmit()}
                      >
                        <div className={styles.detailGrid}>
                          <Form.Item
                            label="คลังสินค้า"
                            name="warehouseId"
                            rules={[
                              { required: true, message: "กรุณาเลือกคลัง" },
                            ]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder="เลือกคลัง"
                              options={warehouseOptions}
                              loading={warehousesQuery.isLoading}
                            />
                          </Form.Item>

                          <Form.Item
                            label="ตำแหน่งจัดเก็บ"
                            name="warehouseLocationId"
                            rules={[
                              {
                                required: true,
                                message: "กรุณาเลือกตำแหน่ง",
                              },
                            ]}
                          >
                            <Select
                              showSearch
                              optionFilterProp="label"
                              placeholder={
                                warehouseId ? "เลือกตำแหน่ง" : "เลือกคลังก่อน"
                              }
                              options={locationOptions}
                              loading={locationsQuery.isFetching}
                              disabled={!warehouseId}
                            />
                          </Form.Item>

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
                            disabled={isBusy}
                          >
                            ส่งคำขอรับเข้าคลัง
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
                      </Form>
                    ) : (
                      <div className={styles.slipLocked}>
                        <Typography.Text type="secondary">
                          {alreadyPosted
                            ? "รับเข้าคลังแล้ว — ไม่ต้องส่งคำขออีก"
                            : pendingExists
                              ? "มีคำขอรออนุมัติอยู่ — รอหัวหน้าคลังดำเนินการ"
                              : receipt.status !== "CONFIRMED"
                                ? "ยืนยันใบรับซื้อก่อน จึงจะส่งคำขอเข้าคลังได้"
                                : !canRequest
                                  ? "ไม่มีสิทธิ์ส่งคำขอรับเข้าคลัง"
                                  : "ยังไม่สามารถส่งคำขอได้ในสถานะนี้"}
                        </Typography.Text>
                        {alreadyPosted || pendingExists ? (
                          <div style={{ marginTop: 12 }}>
                            <Button
                              onClick={() =>
                                router.push("/warehouse/stock-posting-approvals")
                              }
                            >
                              ไปหน้ารายการอนุมัติเข้าคลัง
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
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
                    label="จำนวนรายการ"
                    value={`${receipt.items?.length ?? 0} รายการ`}
                  />
                </div>

                <Typography.Paragraph
                  type="secondary"
                  style={{ marginBottom: 0, fontSize: 13 }}
                >
                  ส่งคำขอแล้ว หัวหน้าคลังต้องอนุมัติก่อนระบบจะตัดรับเข้าสต๊อกจริง
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
