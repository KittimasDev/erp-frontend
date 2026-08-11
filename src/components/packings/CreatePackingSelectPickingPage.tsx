"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreatePackingFromPickingMutation } from "@/hooks/packings/usePackingMutations";
import { useReadyPickingsForPackingQuery } from "@/hooks/packings/usePackingsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { ReadyPicking } from "@/types/packings";
import styles from "./PackingsListPage.module.css";

export default function CreatePackingSelectPickingPage() {
  const router = useRouter();
  const query = useReadyPickingsForPackingQuery();
  const createMutation = useCreatePackingFromPickingMutation();
  const packingActions = useScreenActionPermissions("PACKINGS");
  const canAdd = packingActions.canAdd;
  const rows = query.data?.data ?? [];

  if (!canAdd) {
    return <AccessDenied screenCodes={["PACKINGS"]} />;
  }

  const columns: ColumnsType<ReadyPicking> = [
    {
      title: "เลขที่ใบจ่ายสินค้า",
      dataIndex: "pickingNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: "ใบสั่งขาย",
      dataIndex: "salesOrderNo",
      render: (v?: string) => v ?? "—",
    },
    {
      title: "ลูกค้า",
      dataIndex: "customerName",
      render: (v?: string) => v ?? "—",
    },
    {
      title: "วันที่",
      dataIndex: "pickingDate",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    { title: "รายการ", dataIndex: "itemCount", width: 90, align: "center" },
    {
      title: "",
      key: "action",
      width: 160,
      render: (_v, row) => (
        <Button
          type="primary"
          className={styles.primaryBtn}
          icon={<PlusOutlined />}
          loading={createMutation.isPending}
          onClick={async () => {
            const res = await createMutation.mutateAsync({
              pickingId: row.id,
            });
            router.push(`/packings/${res.data.id}/edit`);
          }}
        >
          สร้างใบบรรจุ
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <Link href="/packings" className={styles.backLink}>
            <ArrowLeftOutlined /> กลับรายการ
          </Link>
          <p className={styles.eyebrow}>Packing · Create</p>
          <h1 className={styles.pageTitle}>เลือกใบจ่ายสินค้าที่พร้อมบรรจุ</h1>
          <p className={styles.pageSubtitle}>
            เฉพาะใบจ่ายสินค้าสถานะ CONFIRMED และยังไม่มีใบบรรจุที่ใช้งาน
          </p>
        </div>
      </header>
      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: "ไม่มีใบจ่ายสินค้าที่พร้อมสร้างใบบรรจุ" }}
        />
      </section>
    </div>
  );
}
