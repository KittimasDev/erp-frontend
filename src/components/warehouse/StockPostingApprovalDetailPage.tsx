"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  useApproveStockPostingRequestMutation,
  useRejectStockPostingRequestMutation,
} from "@/hooks/stock-posting/useStockPostingMutations";
import { useStockPostingApprovalQuery } from "@/hooks/stock-posting/useStockPostingQueries";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import {
  useCanApproveStockPostingApprovals,
} from "@/lib/auth/stock-posting-access";
import type { StockPostingReceiptItem } from "@/types/stock-posting-request";
import {
  STOCK_POSTING_REQUEST_STATUS_LABEL,
  StockPostingRequestStatus,
} from "@/types/stock-posting-request";
import styles from "@/components/weighbridge/WeighbridgeDashboardPage.module.css";

type Props = {
  requestId: string;
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

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("th-TH");
}

function statusTagColor(status: string) {
  switch (status) {
    case StockPostingRequestStatus.PENDING_APPROVAL:
      return "processing";
    case StockPostingRequestStatus.APPROVED:
      return "success";
    case StockPostingRequestStatus.REJECTED:
      return "warning";
    default:
      return "default";
  }
}

/** คลังเริ่มต้นสำหรับรับยางดิบ — ลดขั้นตอนเลือกคลัง */
const DEFAULT_RAW_TIRE_WAREHOUSE_CODE = "RAW_WH";

export default function StockPostingApprovalDetailPage({ requestId }: Props) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const canApprove = useCanApproveStockPostingApprovals();
  const detailQuery = useStockPostingApprovalQuery(requestId);
  const approveMutation = useApproveStockPostingRequestMutation();
  const rejectMutation = useRejectStockPostingRequestMutation();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [warehouseLocationId, setWarehouseLocationId] = useState<
    string | undefined
  >();

  const warehousesQuery = useWarehousesQuery({ isActive: true });
  const locationsQuery = useWarehouseLocationsQuery(
    { warehouseId, isActive: true },
    { enabled: Boolean(warehouseId) },
  );

  const request = detailQuery.data?.data;
  const isPending =
    request?.status === StockPostingRequestStatus.PENDING_APPROVAL;
  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  const totals = useMemo(() => {
    const items = request?.items ?? [];
    const weight = items.reduce((sum, row) => sum + Number(row.weightKg || 0), 0);
    const amount = items.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    // ผูกแล้ว = มี itemId หรือจับคู่ได้ผ่าน itemCode (= classification_code)
    const unlinked = items.filter(
      (row) => !row.itemId && !row.itemCode && !row.classificationCode,
    );
    return { weight, amount, count: items.length, unlinked };
  }, [request?.items]);

  const hasUnlinkedItems = totals.unlinked.length > 0;
  const needsWarehousePick = isPending && !request?.warehouseId;
  const selectedWarehouseId = warehouseId ?? request?.warehouseId;
  const selectedLocationId =
    warehouseLocationId ?? request?.warehouseLocationId;
  const warehouseReady = Boolean(selectedWarehouseId && selectedLocationId);
  const approveBlockedByItems = hasUnlinkedItems;
  const approveBlockedByWarehouse = needsWarehousePick && !warehouseReady;

  /**
   * เลือกค่าเริ่มต้นให้ถ้าผู้ใช้ยังไม่ได้เลือก — ปรับ state ตอน render แทน effect
   * ทั้งสองก้อนมี guard อยู่แล้ว (ทำงานเฉพาะตอนช่องยังว่าง) จึงลู่เข้าใน render
   * เดียวและไม่วนซ้ำ · เดิมเป็น effect จึงเห็นช่องว่างหนึ่งเฟรมก่อนค่าจะเด้งมา
   */
  if (needsWarehousePick && !warehouseId) {
    const rawWarehouse = (warehousesQuery.data?.data ?? []).find(
      (row) => row.warehouseCode === DEFAULT_RAW_TIRE_WAREHOUSE_CODE,
    );
    if (rawWarehouse) {
      setWarehouseId(rawWarehouse.id);
    }
  }

  if (needsWarehousePick && warehouseId && !warehouseLocationId) {
    const locations = locationsQuery.data?.data ?? [];
    if (locations.length === 1) {
      setWarehouseLocationId(locations[0].id);
    }
  }

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? []).map((row) => ({
        value: row.id,
        label: `${row.warehouseCode} — ${row.warehouseName}`,
      })),
    [warehousesQuery.data?.data],
  );
  const locationOptions = useMemo(
    () =>
      (locationsQuery.data?.data ?? []).map((row) => ({
        value: row.id,
        label: `${row.locationCode} — ${row.locationName}`,
      })),
    [locationsQuery.data?.data],
  );

  const itemColumns: ColumnsType<StockPostingReceiptItem> = [
    {
      title: "ลำดับ",
      key: "index",
      width: 72,
      align: "center",
      render: (_value, _row, index) => index + 1,
    },
    {
      title: "ประเภทสินค้า",
      key: "classification",
      render: (_, row) => (
        <div>
          <strong>{row.classificationName || "-"}</strong>
          {row.classificationCode ? (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                รหัสประเภท: {row.classificationCode}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "สินค้าคลัง (Master Items)",
      key: "item",
      render: (_, row) =>
        row.itemCode ? (
          <div>
            <div>{row.itemCode}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.itemName || "-"}
            </Typography.Text>
          </div>
        ) : (
          <Typography.Text type="danger">
            ยังไม่ผูกสินค้า
            {row.classificationCode
              ? ` — แก้ประเภทยาง ${row.classificationCode} ให้เลือกสินค้าคลัง`
              : ""}
          </Typography.Text>
        ),
    },
    {
      title: "น้ำหนักขอรับเข้า (กก.)",
      dataIndex: "weightKg",
      key: "weightKg",
      align: "right",
      width: 140,
      render: (value: string) => formatWeight(value),
    },
    {
      title: "คลัง / ตำแหน่ง",
      key: "warehouse",
      width: 200,
      render: (_, row) =>
        row.warehouseName || row.locationName ? (
          <div>
            <div>
              {row.warehouseCode ? `${row.warehouseCode} · ` : ""}
              {row.warehouseName ?? "-"}
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.locationCode ? `${row.locationCode} · ` : ""}
              {row.locationName ?? "-"}
            </Typography.Text>
          </div>
        ) : (
          "-"
        ),
    },
    {
      title: "ราคา/กก.",
      dataIndex: "pricePerKg",
      key: "pricePerKg",
      align: "right",
      width: 120,
      render: (value: string) => formatMoney(value),
    },
    {
      title: "ยอดเงิน",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 130,
      render: (value: string) => (
        <strong>{formatMoney(value)}</strong>
      ),
    },
  ];

  const handleApprove = () => {
    if (!selectedWarehouseId || !selectedLocationId) {
      return Promise.reject(new Error("warehouse-required"));
    }
    return approveMutation.mutateAsync({
      id: requestId,
      body: {
        warehouseId: selectedWarehouseId,
        warehouseLocationId: selectedLocationId,
      },
    });
  };

  const handleApproveClick = () => {
    if (approveBlockedByItems) {
      message.warning("ผูก Master Items ให้ครบก่อนอนุมัติ");
      return;
    }
    if (approveBlockedByWarehouse) {
      message.warning("เลือกคลังและตำแหน่งจัดเก็บก่อนอนุมัติ");
      return;
    }
    modal.confirm({
      title: "อนุมัติรับเข้าคลัง",
      content: "ระบบจะ POST สต๊อกจริงทันทีหลังอนุมัติ",
      okText: "อนุมัติ",
      cancelText: "ยกเลิก",
      onOk: async () => {
        await handleApprove();
        await detailQuery.refetch();
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      return;
    }
    rejectMutation.mutate(
      { id: requestId, body: { rejectReason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason("");
          void detailQuery.refetch();
        },
      },
    );
  };

  return (
    <MasterPageGate isLoading={detailQuery.isLoading}>
      <section className={styles.page}>
        <div className={styles.detailToolbar}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/warehouse/stock-posting-approvals")}
          >
            กลับรายการอนุมัติ
          </Button>
          <div className={styles.detailTitleTags}>
            <Button
              icon={<ReloadOutlined />}
              loading={detailQuery.isFetching}
              onClick={() => void detailQuery.refetch()}
            >
              รีเฟรช
            </Button>
            {isPending && canApprove ? (
              <>
                {needsWarehousePick ? (
                  <>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      style={{ minWidth: 220 }}
                      placeholder="เลือกคลัง"
                      options={warehouseOptions}
                      loading={warehousesQuery.isLoading}
                      value={warehouseId}
                      onChange={(value) => {
                        setWarehouseId(value);
                        setWarehouseLocationId(undefined);
                      }}
                    />
                    <Select
                      showSearch
                      optionFilterProp="label"
                      style={{ minWidth: 220 }}
                      placeholder={
                        warehouseId ? "เลือกตำแหน่ง" : "เลือกคลังก่อน"
                      }
                      options={locationOptions}
                      loading={locationsQuery.isLoading}
                      disabled={!warehouseId}
                      value={warehouseLocationId}
                      onChange={setWarehouseLocationId}
                    />
                  </>
                ) : null}
                <Button
                  danger
                  icon={<CloseOutlined />}
                  disabled={isBusy}
                  onClick={() => setRejectOpen(true)}
                >
                  ไม่อนุมัติ
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  className={styles.submitButton}
                  loading={approveMutation.isPending}
                  disabled={isBusy || approveBlockedByItems}
                  onClick={handleApproveClick}
                  title={
                    approveBlockedByItems
                      ? "ผูก Master Items ให้ครบก่อนอนุมัติ"
                      : approveBlockedByWarehouse
                        ? "เลือกคลังและตำแหน่งก่อนอนุมัติ"
                        : undefined
                  }
                >
                  อนุมัติและรับเข้าคลัง
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {detailQuery.isError ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <Typography.Text type="danger">
                โหลดรายละเอียดคำขอไม่สำเร็จ
              </Typography.Text>
            </div>
          </div>
        ) : request ? (
          <>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.detailTitleRow}>
                  <div>
                    <h3>รายละเอียดคำขอรับเข้าคลัง</h3>
                    <p>
                      {request.requestNo} · ใบรับซื้อ{" "}
                      {request.receipt?.receiptNo ?? request.receiptId}
                    </p>
                  </div>
                  <div className={styles.detailTitleTags}>
                    <Tag
                      color={statusTagColor(request.status)}
                      className={styles.flowTag}
                    >
                      {STOCK_POSTING_REQUEST_STATUS_LABEL[request.status] ??
                        request.status}
                    </Tag>
                  </div>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.detailGrid}>
                  {needsWarehousePick ? (
                    <>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <Typography.Text type="secondary">
                          เลือกคลังและตำแหน่งจากแถบด้านบน (ข้างปุ่มอนุมัติ)
                          {warehouseId && !warehouseLocationId
                            ? " — เหลือเลือกตำแหน่งจัดเก็บ"
                            : ""}
                        </Typography.Text>
                      </div>
                    </>
                  ) : (
                    <>
                      <DetailItem
                        label="คลังสินค้า"
                        value={
                          request.warehouseName
                            ? `${request.warehouseCode ?? ""} · ${request.warehouseName}`
                            : "-"
                        }
                      />
                      <DetailItem
                        label="ตำแหน่งจัดเก็บ"
                        value={
                          request.locationName
                            ? `${request.locationCode ?? ""} · ${request.locationName}`
                            : "-"
                        }
                      />
                    </>
                  )}
                  <DetailItem
                    label="วันที่รับเข้า"
                    value={formatDate(request.postingDate)}
                  />
                  <DetailItem
                    label="ผู้ขอ"
                    value={
                      request.requestedBy?.displayName ||
                      request.requestedBy?.username ||
                      request.requestedById
                    }
                  />
                  <DetailItem
                    label="วันเวลาที่ขอ"
                    value={formatDateTime(request.requestedAt)}
                  />
                  <DetailItem
                    label="น้ำหนักรวม"
                    value={`${formatWeight(totals.weight)} กก.`}
                  />
                  <DetailItem
                    label="หมายเหตุ"
                    value={request.remark || "-"}
                    fullWidth
                  />
                  {request.rejectReason ? (
                    <DetailItem
                      label="เหตุผลไม่อนุมัติ"
                      value={request.rejectReason}
                      fullWidth
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.listHeader}>
                <div>
                  <h3>รายการรับเข้า</h3>
                  <p>
                    {totals.count} รายการ · น้ำหนักรวม{" "}
                    {formatWeight(totals.weight)} กก. · มูลค่า{" "}
                    {formatMoney(totals.amount)} บาท
                  </p>
                </div>
              </div>
              {totals.unlinked.length > 0 ? (
                <div className={styles.cardBody} style={{ paddingBottom: 0 }}>
                  <Typography.Paragraph type="danger" style={{ marginBottom: 12 }}>
                    มี {totals.unlinked.length} รายการยังไม่ผูก Master Items —
                    ไป Masters → ประเภท/กลุ่มยาง แล้วเลือกสินค้าคลังให้ครบ
                    {totals.unlinked[0]?.classificationCode
                      ? ` (เช่น ${totals.unlinked
                          .map((row) => row.classificationCode)
                          .filter(Boolean)
                          .join(", ")})`
                      : ""}
                  </Typography.Paragraph>
                </div>
              ) : null}
              <Table
                rowKey="id"
                size="middle"
                pagination={false}
                columns={itemColumns}
                dataSource={request.items ?? []}
                scroll={{ x: 860 }}
                locale={{ emptyText: "ไม่มีรายการรับเข้า" }}
                summary={() =>
                  totals.count > 0 ? (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <strong>รวม</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <strong>{formatWeight(totals.weight)}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4} />
                        <Table.Summary.Cell index={5} align="right">
                          <strong>{formatMoney(totals.amount)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  ) : null
                }
              />
            </div>

            {isPending && canApprove && approveBlockedByWarehouse ? (
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <Typography.Text type="warning">
                    เลือก <strong>คลังสินค้า</strong> และ{" "}
                    <strong>ตำแหน่งจัดเก็บ</strong> ที่แถบด้านบน
                    {warehouseId ? " แล้วเลือกตำแหน่งให้ครบ" : ""}{" "}
                    จากนั้นกด <strong>อนุมัติและรับเข้าคลัง</strong>
                  </Typography.Text>
                </div>
              </div>
            ) : null}

            {isPending && !canApprove ? (
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <Typography.Text type="warning">
                    ดูรายละเอียดได้ — การอนุมัติ/ไม่อนุมัติต้องเปิดสิทธิ์{" "}
                    <strong>STOCK_POSTING_APPROVALS · APPROVE</strong> ที่หน้า
                    ผู้ใช้งาน → การอนุญาต
                  </Typography.Text>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        <Modal
          title="ไม่อนุมัติคำขอรับเข้าคลัง"
          open={rejectOpen}
          okText="ยืนยันไม่อนุมัติ"
          cancelText="ปิด"
          okButtonProps={{
            danger: true,
            disabled: !rejectReason.trim(),
            loading: rejectMutation.isPending,
          }}
          onCancel={() => {
            setRejectOpen(false);
            setRejectReason("");
          }}
          onOk={handleReject}
          destroyOnHidden
        >
          <Typography.Paragraph>
            กรุณาระบุเหตุผลที่ไม่อนุมัติ
          </Typography.Paragraph>
          <Input.TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="เช่น ตำแหน่งจัดเก็บไม่ถูกต้อง"
          />
        </Modal>
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
