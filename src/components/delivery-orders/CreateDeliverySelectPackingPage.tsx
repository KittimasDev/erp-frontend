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
  getPackingPreviewColumns,
  packingPreviewRowKey,
} from "./packingPreview";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

export default function CreateDeliverySelectPackingPage() {
  const t = useT();
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
    ? t("กำลังโหลดรายการใบบรรจุ")
    : !rows.length
      ? t("ยังไม่มีใบบรรจุที่พร้อมสร้างใบส่ง — ใบบรรจุต้องยืนยันแล้ว และยังไม่ถูกใช้ในใบส่งอื่น")
      : !selected.length
        ? t("ติ๊กเลือกใบบรรจุในตารางด้านบนอย่างน้อย 1 ใบ")
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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เลขที่ Packing"),
      dataIndex: "packingNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: "SO",
      dataIndex: "salesOrderNo",
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("รอบส่ง"),
      dataIndex: "roundNo",
      width: 90,
      render: (v?: number) => (v ? t("รอบที่ {v}", { v }) : "—"),
    },
    {
      title: t("ลูกค้า"),
      dataIndex: "customerName",
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("รายการ"),
      dataIndex: "itemCount",
      width: 80,
      align: "right",
    },
    {
      title: t("วันที่"),
      dataIndex: "packingDate",
      width: 110,
      render: (v: string) => dayjs(v).format("DD/MM/BBBB"),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Delivery · Create"
        title={t("เลือกใบบรรจุที่พร้อมส่ง")}
        subtitle={t("เลือกได้หลายใบบรรจุจากใบสั่งขายเดียวกัน (ต่างรอบได้) ระบบดึงสินค้าและจำนวนจากใบบรรจุให้อัตโนมัติ")}
        back={
          <>
<Link href="/delivery-orders" className={styles.backLink}>
            <ArrowLeftOutlined /> {t("กลับรายการ")}
          </Link>
          </>
        }
      />

      {preselectMissing ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={t("ใบบรรจุที่ส่งมาไม่อยู่ในรายการพร้อมส่ง")}
          description={t("อาจถูกใช้สร้างใบส่งสินค้าไปแล้ว หรือรอบส่งยังไม่พร้อม — เลือกใบบรรจุอื่นจากรายการด้านล่าง")}
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
                  title={t("ใบบรรจุนี้เป็นของ {so} — รวมในใบส่งเดียวกันได้เฉพาะใบบรรจุของ {selectedSo} · เอาติ๊กออกทั้งหมดก่อนถ้าจะเปลี่ยน SO", { so: row.salesOrderNo ?? t("SO อื่น"), selectedSo: selected[0]?.salesOrderNo ?? t("SO ที่เลือกไว้") })}
                >
                  <span>{node}</span>
                </Tooltip>
              ) : (
                node
              ),
          }}
          locale={{
            emptyText:
              t("ไม่มีใบบรรจุที่พร้อมสร้างใบส่ง — ใบบรรจุต้องยืนยันแล้ว และยังไม่ถูกใช้ในใบส่งอื่น (ยกเลิกใบส่งแล้วใบบรรจุจะกลับมาเลือกได้)"),
          }}
        />
      </section>

      <section className={styles.tableCard} style={{ marginTop: 16 }}>
        <div className={styles.tableToolbar}>
          <div className={styles.toolbarLeft}>
            <strong>{t("รายการสินค้าในใบส่ง")}</strong>
            {selected.length ? (
              <>
                <Tag color="blue">{selected[0].salesOrderNo ?? "—"}</Tag>
                <span>{selected[0].customerName ?? ""}</span>
                <Tag>{selected.length} {t("ใบบรรจุ")}</Tag>
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
                {t("สร้างใบส่งสินค้า ({n} ใบบรรจุ)", { n: selected.length })}
              </Button>
            </span>
          </Tooltip>
        </div>
        <Table
          rowKey={packingPreviewRowKey}
          columns={getPackingPreviewColumns(t)}
          dataSource={previewLines}
          pagination={false}
          size="small"
          locale={{ emptyText: t("เลือกใบบรรจุด้านบนเพื่อดูรายการสินค้า") }}
        />
      </section>
    </div>
  );
}
