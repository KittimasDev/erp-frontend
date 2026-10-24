"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreateDeliveryOrderFromPackingsMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useReadyPackingsForDeliveryQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { canCreateDeliveryFromPacking } from "@/lib/sales/sales-fulfillment-nav";
import type { ReadyPacking } from "@/types/delivery-orders";
import styles from "./DeliveryOrdersListPage.module.css";
import {
  buildPackingPreviewLines,
  byRoundThenNo,
  packingPreviewColumns,
  packingPreviewRowKey,
} from "./packingPreview";

export default function CreateDeliverySelectPackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectId = searchParams.get("packingId") ?? undefined;

  const query = useReadyPackingsForDeliveryQuery();
  const createMutation = useCreateDeliveryOrderFromPackingsMutation();
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const salesOrderActions = useScreenActionPermissions("SALES_ORDERS");
  const canCreate = canCreateDeliveryFromPacking({
    delivery: deliveryActions,
    salesOrder: salesOrderActions,
  });

  const [pickedIds, setPickedIds] = useState<string[]>(() =>
    preselectId ? [preselectId] : [],
  );

  const rows = useMemo(() => query.data?.data ?? [], [query.data]);

  // ใบบรรจุที่ถูกคนอื่นใช้ไปแล้วจะหายจากรายการหลัง refetch — ตัดออกจากที่เลือกเอง
  const selected = useMemo(
    () =>
      rows.filter((row) => pickedIds.includes(row.id)).sort(byRoundThenNo),
    [rows, pickedIds],
  );
  const selectedSoId = selected[0]?.salesOrderId;
  const preselectMissing =
    Boolean(preselectId) &&
    query.isSuccess &&
    !rows.some((row) => row.id === preselectId);

  const previewLines = useMemo(
    () => buildPackingPreviewLines(selected),
    [selected],
  );

  const isOtherSo = (row: ReadyPacking) =>
    Boolean(selectedSoId) && row.salesOrderId !== selectedSoId;

  const createBlockedReason = query.isLoading
    ? "กำลังโหลดรายการใบบรรจุ"
    : !rows.length
      ? "ยังไม่มีใบบรรจุที่พร้อมสร้างใบส่ง — ใบบรรจุต้องยืนยันแล้ว และยังไม่ถูกใช้ในใบส่งอื่น"
      : !selected.length
        ? "ติ๊กเลือกใบบรรจุในตารางด้านบนอย่างน้อย 1 ใบ"
        : undefined;

  if (!canCreate) {
    return <AccessDenied screenCodes={["DELIVERY_ORDERS", "SALES_ORDERS"]} />;
  }

  const onCreate = async () => {
    if (!selected.length) return;
    try {
      const res = await createMutation.mutateAsync({
        packingIds: selected.map((row) => row.id),
      });
      router.push(`/delivery-orders/${res.data.id}/edit`);
    } catch {
      /* แจ้งผ่าน message ใน hook แล้ว · 409 → hook โหลดรายการใหม่ */
    }
  };

  const columns: ColumnsType<ReadyPacking> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "เลขที่ Packing",
      dataIndex: "packingNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: "SO",
      dataIndex: "salesOrderNo",
      render: (v?: string) => v ?? "—",
    },
    {
      title: "รอบส่ง",
      dataIndex: "roundNo",
      width: 90,
      render: (v?: number) => (v ? `รอบที่ ${v}` : "—"),
    },
    {
      title: "ลูกค้า",
      dataIndex: "customerName",
      render: (v?: string) => v ?? "—",
    },
    {
      title: "รายการ",
      dataIndex: "itemCount",
      width: 80,
      align: "right",
    },
    {
      title: "วันที่",
      dataIndex: "packingDate",
      width: 110,
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <Link href="/delivery-orders" className={styles.backLink}>
            <ArrowLeftOutlined /> กลับรายการ
          </Link>
          <p className={styles.eyebrow}>Delivery · Create</p>
          <h1 className={styles.pageTitle}>เลือกใบบรรจุที่พร้อมส่ง</h1>
          <p className={styles.pageSubtitle}>
            เลือกได้หลายใบบรรจุจากใบสั่งขายเดียวกัน (ต่างรอบได้)
            ระบบดึงสินค้าและจำนวนจากใบบรรจุให้อัตโนมัติ
          </p>
        </div>
      </header>

      {preselectMissing ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="ใบบรรจุที่ส่งมาไม่อยู่ในรายการพร้อมส่ง"
          description="อาจถูกใช้สร้างใบส่งสินค้าไปแล้ว หรือรอบส่งยังไม่พร้อม — เลือกใบบรรจุอื่นจากรายการด้านล่าง"
        />
      ) : null}

      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          rowSelection={{
            hideSelectAll: true,
            selectedRowKeys: selected.map((row) => row.id),
            onChange: (keys) => setPickedIds(keys.map(String)),
            getCheckboxProps: (row) => ({
              disabled: isOtherSo(row),
            }),
            renderCell: (_checked, row, _index, node) =>
              isOtherSo(row) ? (
                <Tooltip
                  title={`ใบบรรจุนี้เป็นของ ${row.salesOrderNo ?? "SO อื่น"} — รวมในใบส่งเดียวกันได้เฉพาะใบบรรจุของ ${selected[0]?.salesOrderNo ?? "SO ที่เลือกไว้"} · เอาติ๊กออกทั้งหมดก่อนถ้าจะเปลี่ยน SO`}
                >
                  <span>{node}</span>
                </Tooltip>
              ) : (
                node
              ),
          }}
          locale={{
            emptyText:
              "ไม่มีใบบรรจุที่พร้อมสร้างใบส่ง — ใบบรรจุต้องยืนยันแล้ว และยังไม่ถูกใช้ในใบส่งอื่น (ยกเลิกใบส่งแล้วใบบรรจุจะกลับมาเลือกได้)",
          }}
        />
      </section>

      <section className={styles.tableCard} style={{ marginTop: 16 }}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <strong>รายการสินค้าในใบส่ง</strong>
            {selected.length ? (
              <>
                <Tag color="blue">{selected[0].salesOrderNo ?? "—"}</Tag>
                <span>{selected[0].customerName ?? ""}</span>
                <Tag>{selected.length} ใบบรรจุ</Tag>
              </>
            ) : null}
          </div>
          <Tooltip title={createBlockedReason}>
            <span>
              <Button
                type="primary"
                className={styles.primaryBtn}
                icon={<PlusOutlined />}
                disabled={Boolean(createBlockedReason)}
                loading={createMutation.isPending}
                onClick={onCreate}
              >
                สร้างใบส่งสินค้า ({selected.length} ใบบรรจุ)
              </Button>
            </span>
          </Tooltip>
        </div>
        <Table
          rowKey={packingPreviewRowKey}
          columns={packingPreviewColumns}
          dataSource={previewLines}
          pagination={false}
          size="small"
          locale={{ emptyText: "เลือกใบบรรจุด้านบนเพื่อดูรายการสินค้า" }}
        />
      </section>
    </div>
  );
}
