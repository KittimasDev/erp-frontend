"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreateDeliveryOrderFromPackingMutation } from "@/hooks/delivery-orders/useDeliveryOrderMutations";
import { useReadyPackingsForDeliveryQuery } from "@/hooks/delivery-orders/useDeliveryOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { ReadyPacking } from "@/types/delivery-orders";
import styles from "./DeliveryOrdersListPage.module.css";

export default function CreateDeliverySelectPackingPage() {
  const router = useRouter();
  const query = useReadyPackingsForDeliveryQuery();
  const createMutation = useCreateDeliveryOrderFromPackingMutation();
  const deliveryActions = useScreenActionPermissions("DELIVERY_ORDERS");
  const canAdd = deliveryActions.canAdd;
  const rows = query.data?.data ?? [];

  if (!canAdd) {
    return <AccessDenied screenCodes={["DELIVERY_ORDERS"]} />;
  }

  const columns: ColumnsType<ReadyPacking> = [
    {
      title: "เลขที่ Packing",
      dataIndex: "packingNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    { title: "SO", dataIndex: "salesOrderNo", render: (v?: string) => v ?? "—" },
    { title: "ลูกค้า", dataIndex: "customerName", render: (v?: string) => v ?? "—" },
    {
      title: "วันที่",
      dataIndex: "packingDate",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      title: "",
      key: "action",
      width: 140,
      render: (_v, row) => (
        <Button
          type="primary"
          className={styles.primaryBtn}
          icon={<PlusOutlined />}
          loading={createMutation.isPending}
          onClick={async () => {
            const res = await createMutation.mutateAsync({ packingId: row.id });
            router.push(`/delivery-orders/${res.data.id}/edit`);
          }}
        >
          สร้างใบส่ง
        </Button>
      ),
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
        </div>
      </header>
      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: "ไม่มี Packing ที่พร้อมสร้างใบส่ง" }}
        />
      </section>
    </div>
  );
}
