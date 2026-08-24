"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreatePickingFromSalesOrderMutation } from "@/hooks/pickings/usePickingMutations";
import { useReadySalesOrdersForPickingQuery } from "@/hooks/pickings/usePickingsQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { ReadySalesOrder } from "@/types/pickings";
import styles from "./PickingsListPage.module.css";

export default function CreatePickingSelectSoPage() {
  const router = useRouter();
  const query = useReadySalesOrdersForPickingQuery();
  const createMutation = useCreatePickingFromSalesOrderMutation();
  const pickingActions = useScreenActionPermissions("PICKINGS");
  const canAdd = pickingActions.canAdd;
  const rows = query.data?.data ?? [];

  if (!canAdd) {
    return <AccessDenied screenCodes={["PICKINGS"]} />;
  }

  const columns: ColumnsType<ReadySalesOrder> = [
    {
      title: "เลขที่ SO",
      dataIndex: "soNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: "ลูกค้า",
      key: "customer",
      render: (_v, row) =>
        row.customerCode
          ? `${row.customerCode} — ${row.customerName ?? ""}`
          : (row.customerName ?? "—"),
    },
    {
      title: "วันที่",
      dataIndex: "soDate",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    { title: "รายการ", dataIndex: "itemCount", width: 90, align: "center" },
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
            const res = await createMutation.mutateAsync({
              salesOrderId: row.id,
            });
            router.push(`/pickings/${res.data.id}/edit`);
          }}
        >
          สร้างใบจ่าย
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <Link href="/pickings" className={styles.backLink ?? undefined}>
            <ArrowLeftOutlined /> กลับรายการ
          </Link>
          <p className={styles.eyebrow}>Picking · Create</p>
          <h1 className={styles.pageTitle}>เลือกใบสั่งขายที่พร้อมจ่าย</h1>
          <p className={styles.pageSubtitle}>
            เฉพาะ SO สถานะ STOCK_CHECKED ที่ยังไม่เคยออกใบจ่าย — ใบที่ยกเลิกแล้ว
            ก็ไม่แสดงในรายการนี้
          </p>
        </div>
      </header>
      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          locale={{ emptyText: "ไม่มี SO ที่พร้อมสร้างใบจ่าย" }}
        />
      </section>
    </div>
  );
}
