"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import AccessDenied from "@/components/auth/AccessDenied";
import { useCreatePickingFromScheduleMutation } from "@/hooks/pickings/usePickingMutations";
import { useReadySalesOrdersForPickingQuery } from "@/hooks/pickings/usePickingsQuery";
import { useDeliveryScheduleStockStatusQuery } from "@/hooks/delivery-schedules/useDeliverySchedulesQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import type { ReadySalesOrder } from "@/types/pickings";
import styles from "./PickingsListPage.module.css";

/**
 * แถบ ต้องการ / มี / ขาด ของรอบที่กางออกดู
 *
 * แยกเป็น component เพราะต้องยิง query ต่อรอบ — เรียก hook ใน .map() ไม่ได้
 * (Rules of Hooks) และไม่อยากยิงทุกรอบพร้อมกันตอนเปิดหน้า
 */
function ScheduleStockPanel({ row }: { row: ReadySalesOrder }) {
  const query = useDeliveryScheduleStockStatusQuery(row.deliveryScheduleId);
  const data = query.data;

  if (query.isLoading) {
    return <div className={styles.pageSubtitle}>กำลังตรวจสอบสต๊อก…</div>;
  }
  if (!data) {
    return <div className={styles.pageSubtitle}>ตรวจสอบสต๊อกไม่สำเร็จ</div>;
  }

  const shortLines = data.lines.filter(
    (line) => Number(line.shortageQuantity) > 0,
  );

  return (
    <div>
      {data.canIssue ? (
        <Alert
          type="success"
          showIcon
          title="ของครบทั้งรอบ — เปิดใบจ่ายได้เลย"
        />
      ) : (
        <Alert
          type="warning"
          showIcon
          title="ของไม่ครบ เปิดใบจ่ายไม่ได้"
          description="กฎคือ 1 รอบต้องจ่ายให้ครบ ไม่จ่ายบางส่วน — ต้องเปิดใบขอผลิตสำหรับส่วนที่ขาดแล้วรอของก่อน"
        />
      )}

      <Table
        rowKey="deliveryScheduleItemId"
        size="small"
        pagination={false}
        style={{ marginTop: 12 }}
        dataSource={data.lines}
        columns={[
          {
            title: "สินค้า",
            key: "item",
            render: (_v, line) =>
              line.itemCode
                ? `${line.itemCode} — ${line.itemNameTh ?? ""}`
                : (line.itemNameTh ?? "—"),
          },
          {
            title: "ต้องการ",
            dataIndex: "requiredQuantity",
            align: "right",
            width: 110,
            render: (v: string, line) => `${v} ${line.unitCode ?? ""}`,
          },
          {
            title: "มี",
            dataIndex: "availableQuantity",
            align: "right",
            width: 110,
          },
          {
            title: "ขาด",
            dataIndex: "shortageQuantity",
            align: "right",
            width: 110,
            render: (v: string) =>
              Number(v) > 0 ? <Tag color="error">{v}</Tag> : <Tag>0.000</Tag>,
          },
          {
            title: "ขอผลิตไปแล้ว",
            dataIndex: "alreadyRequestedQuantity",
            align: "right",
            width: 130,
          },
          {
            title: "ยังต้องขอผลิต",
            dataIndex: "productionNeededQuantity",
            align: "right",
            width: 130,
            render: (v: string) =>
              Number(v) > 0 ? <strong>{v}</strong> : "—",
          },
        ]}
      />

      {shortLines.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {/* ส่งรอบไปด้วย — ใบขอผลิตจะผูกกับรอบนี้ ของที่ผลิตเสร็จจึงเข้ารอบ
              ที่ตั้งใจ ไม่ใช่รอบที่วันส่งเร็วสุดตอนของเข้าคลัง */}
          <Link
            href={
              `/production/production-requests/create?salesOrderId=${row.id}` +
              `&deliveryScheduleId=${row.deliveryScheduleId}`
            }
          >
            <Button icon={<ToolOutlined />}>
              เปิดใบขอผลิตสำหรับรอบนี้
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CreatePickingSelectSoPage() {
  const router = useRouter();
  const query = useReadySalesOrdersForPickingQuery();
  const createMutation = useCreatePickingFromScheduleMutation();
  const pickingActions = useScreenActionPermissions("PICKINGS");
  const canAdd = pickingActions.canAdd;
  const [expandedKeys, setExpandedKeys] = useState<readonly string[]>([]);
  const rows = query.data?.data ?? [];

  if (!canAdd) {
    return <AccessDenied screenCodes={["PICKINGS"]} />;
  }

  const columns: ColumnsType<ReadySalesOrder> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "เลขที่ SO",
      dataIndex: "soNo",
      render: (v: string) => <span className={styles.prNo}>{v}</span>,
    },
    {
      title: "รอบ",
      key: "round",
      width: 80,
      align: "center",
      render: (_v, row) => <Tag>รอบ {row.roundNo}</Tag>,
    },
    {
      title: "วันที่ต้องส่ง",
      dataIndex: "deliveryDate",
      width: 130,
      render: (v: string) => {
        const date = dayjs(v);
        const overdue = date.isBefore(dayjs(), "day");
        return (
          <Tooltip title={overdue ? "เลยกำหนดส่งแล้ว" : undefined}>
            <span style={overdue ? { color: "#cf1322", fontWeight: 600 } : undefined}>
              {date.format("DD/MM/YYYY")}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "ลูกค้า",
      key: "customer",
      render: (_v, row) =>
        row.customerCode
          ? `${row.customerCode} — ${row.customerName ?? ""}`
          : (row.customerName ?? "—"),
    },
    { title: "รายการ", dataIndex: "itemCount", width: 90, align: "center" },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, row) => (
        <Button
          type="primary"
          className={styles.primaryBtn}
          icon={<PlusOutlined />}
          loading={createMutation.isPending}
          onClick={async () => {
            const res = await createMutation.mutateAsync({
              scheduleId: row.deliveryScheduleId,
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
          <h1 className={styles.pageTitle}>เลือกรอบจัดส่งที่พร้อมจ่าย</h1>
          <p className={styles.pageSubtitle}>
            1 รอบ = 1 ใบจ่าย · ใบสั่งขายใบเดียวแบ่งส่งได้หลายรอบ จึงโผล่ได้หลายแถว
            — กางแถวเพื่อดูว่าของครบไหมก่อนกดสร้าง
          </p>
        </div>
      </header>

      <section className={styles.tableCard}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title="สต๊อกถูกจองตอนกดสร้างใบจ่าย ไม่ใช่ตอนยืนยันใบสั่งขาย"
          description="ของอาจถูกใบอื่นเอาไปหลังจากที่หน้านี้โหลดมา ถ้ากดสร้างแล้วขึ้นว่าของไม่พอ ให้กางแถวดูยอดล่าสุดอีกครั้ง"
        />
        <Table
          rowKey="deliveryScheduleId"
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          pagination={false}
          locale={{ emptyText: "ไม่มีรอบจัดส่งที่พร้อมสร้างใบจ่าย" }}
          expandable={{
            expandedRowKeys: expandedKeys as string[],
            onExpandedRowsChange: (keys) =>
              setExpandedKeys(keys as readonly string[]),
            expandedRowRender: (row) => <ScheduleStockPanel row={row} />,
            rowExpandable: () => true,
          }}
        />
      </section>
    </div>
  );
}
