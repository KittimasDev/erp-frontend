"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreateDeliveryOrderFromPackingsMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useReadyPackingsForDeliveryQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { canCreateDeliveryFromPacking } from "@/lib/sales/sales-fulfillment-nav";
import type { ReadyPacking, ReadyPackingItem } from "@/types/delivery-orders";
import styles from "./DeliveryOrdersListPage.module.css";

type PreviewLine = ReadyPackingItem & {
  packingId: string;
  packingNo: string;
  roundNo?: number;
};

function fmtQty(value: string) {
  const n = Number(value);
  return Number.isNaN(n)
    ? value
    : n.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function byRoundThenNo(a: ReadyPacking, b: ReadyPacking) {
  return (
    (a.roundNo ?? Number.MAX_SAFE_INTEGER) -
      (b.roundNo ?? Number.MAX_SAFE_INTEGER) ||
    a.packingNo.localeCompare(b.packingNo)
  );
}

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

  const previewLines = useMemo<PreviewLine[]>(
    () =>
      selected.flatMap((packing) =>
        [...(packing.items ?? [])]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((item) => ({
            ...item,
            packingId: packing.id,
            packingNo: packing.packingNo,
            roundNo: packing.roundNo,
          })),
      ),
    [selected],
  );

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

  const previewColumns: ColumnsType<PreviewLine> = [
    {
      title: "ใบบรรจุ",
      dataIndex: "packingNo",
      width: 150,
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: "รอบ",
      dataIndex: "roundNo",
      width: 80,
      render: (v?: number) => (v ? `รอบที่ ${v}` : "—"),
    },
    {
      title: "สินค้า",
      key: "item",
      render: (_: unknown, line) => (
        <div style={{ lineHeight: 1.4 }}>
          <div>{line.itemNameTh ?? "—"}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {line.itemCode ?? "—"}
          </div>
        </div>
      ),
    },
    {
      title: "จำนวน",
      dataIndex: "packedQty",
      width: 110,
      align: "right",
      render: (v: string) => fmtQty(v),
    },
    {
      title: "หน่วย",
      dataIndex: "unitCode",
      width: 90,
      render: (v?: string) => v ?? "—",
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
              disabled: Boolean(selectedSoId) && row.salesOrderId !== selectedSoId,
            }),
          }}
          locale={{ emptyText: "ไม่มี Packing ที่พร้อมสร้างใบส่ง" }}
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
          <Button
            type="primary"
            className={styles.primaryBtn}
            icon={<PlusOutlined />}
            disabled={!selected.length}
            loading={createMutation.isPending}
            onClick={onCreate}
          >
            สร้างใบส่งสินค้า ({selected.length} ใบบรรจุ)
          </Button>
        </div>
        <Table
          rowKey={(line) => `${line.packingId}:${line.id}`}
          columns={previewColumns}
          dataSource={previewLines}
          pagination={false}
          size="small"
          locale={{ emptyText: "เลือกใบบรรจุด้านบนเพื่อดูรายการสินค้า" }}
        />
      </section>
    </div>
  );
}
