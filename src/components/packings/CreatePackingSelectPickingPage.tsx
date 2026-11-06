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
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";

export default function CreatePackingSelectPickingPage() {
  const t = useT();
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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เลขที่ใบจ่ายสินค้า"),
      dataIndex: "pickingNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: t("ใบสั่งขาย"),
      dataIndex: "salesOrderNo",
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("ลูกค้า"),
      dataIndex: "customerName",
      render: (v?: string) => v ?? "—",
    },
    {
      title: t("วันที่"),
      dataIndex: "pickingDate",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    { title: t("รายการ"), dataIndex: "itemCount", width: 90, align: "center" },
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
          {t("สร้างใบบรรจุ")}
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Packing · Create"
        title={t("เลือกใบจ่ายสินค้าที่พร้อมบรรจุ")}
        subtitle={t("เฉพาะใบจ่ายสินค้าสถานะ CONFIRMED และยังไม่มีใบบรรจุที่ใช้งาน")}
        back={
          <>
<Link href="/packings" className={styles.backLink}>
            <ArrowLeftOutlined /> {t("กลับรายการ")}
          </Link>
          </>
        }
      />
      <section className={styles.tableCard}>
        <Table
          rowKey="id"
          loading={query.isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: t("ไม่มีใบจ่ายสินค้าที่พร้อมสร้างใบบรรจุ") }}
        />
      </section>
    </div>
  );
}
