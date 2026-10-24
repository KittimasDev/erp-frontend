"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Popconfirm, Space, Spin, Table, Tag, Typography } from "antd";
import {
  EditOutlined,
  LeftOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import {
  useActivateCustomerMutation,
  useDeactivateCustomerMutation,
} from "@/hooks/customers/useActivateDeactivateCustomerMutation";
import { useCustomerQuery } from "@/hooks/customers/useCustomerQuery";
import { useSalesOrdersQuery } from "@/hooks/sales-orders/useSalesOrdersQuery";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { SALES_ORDER_STATUS_LABEL } from "@/types/sales-orders";
import type { SalesOrder, SalesOrderStatus } from "@/types/sales-orders";
import styles from "@/components/masters/shared/master-page.module.css";
import detailStyles from "./customer-detail.module.css";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

function statusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "CONFIRMED":
    case "STOCK_CHECKED":
    case "PICKING":
    case "PACKED":
    case "DELIVERED":
    case "PARTIALLY_ISSUED":
      return "processing";
    case "CANCELLED":
      return "default";
    default:
      return "warning";
  }
}

function formatLongDate(value?: string) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(value?: string) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "-";
  }
  return amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Props = {
  id: string;
};

type InfoRow = {
  label: string;
  value: ReactNode;
};

function InfoCard({
  eyebrow,
  title,
  rows,
}: {
  eyebrow: string;
  title: string;
  rows: InfoRow[];
}) {
  return (
    <div className={detailStyles.infoCard}>
      <div className={detailStyles.infoEyebrow}>{eyebrow}</div>
      <h3 className={detailStyles.infoTitle}>{title}</h3>

      <div className={detailStyles.infoRows}>
        {rows.map((row) => (
          <div className={detailStyles.infoRow} key={row.label}>
            <span className={detailStyles.infoLabel}>{row.label}</span>
            <span className={detailStyles.infoValue}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomerDetailPage({ id }: Props) {
  const router = useRouter();
  const query = useCustomerQuery(id);
  const activateMutation = useActivateCustomerMutation();
  const deactivateMutation = useDeactivateCustomerMutation();

  // ประวัติการซื้อขาย — backend filter customerId อยู่แล้ว และ join items มาให้
  const salesOrdersQuery = useSalesOrdersQuery({ customerId: id });
  const canViewAllSalesOrders =
    useScreenActionPermissions("SALES_ORDERS").canViewAll;

  const data = query.data?.data;
  /** เพิ่ม/แก้ไขลูกค้า = สิทธิ์ของหน้าข้อมูลลูกค้าใน Permission Matrix */
  const customerActions = useScreenActionPermissions("MASTERS_CUSTOMERS");
  const canManageCustomers = customerActions.canAdd || customerActions.canEdit;

  const historyColumns: ColumnsType<SalesOrder> = [
    {
      title: "ลำดับ",
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: "เลขที่ใบสั่งซื้อ",
      dataIndex: "soNo",
      key: "soNo",
      width: 150,
      render: (value: string, record) => (
        <Link
          href={`/sales-orders/${record.id}`}
          className={detailStyles.historyLink}
        >
          {value}
        </Link>
      ),
    },
    {
      title: "วันที่ทำรายการ",
      dataIndex: "soDate",
      key: "soDate",
      width: 150,
      render: (value?: string) => (
        <span className={styles.updatedText}>
          {value ? new Date(value).toLocaleDateString("th-TH") : "-"}
        </span>
      ),
    },
    {
      title: "รายการสินค้า/บริการ",
      key: "items",
      render: (_value, record) => {
        const items = record.items ?? [];
        const first = items[0];
        const firstLabel = first
          ? (first.itemNameTh || first.itemCode || first.description || "-")
          : "-";

        return (
          <span>
            {firstLabel}
            {items.length > 1 ? (
              <span className={detailStyles.itemMore}>
                +{items.length - 1}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: "จำนวนรายการ",
      key: "itemCount",
      width: 130,
      align: "right",
      render: (_value, record) => (record.items?.length ?? 0).toLocaleString("th-TH"),
    },
    {
      title: "จำนวนเงิน",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right",
      render: (value?: string) => formatMoney(value),
    },
    {
      title: "สถานะ",
      dataIndex: "status",
      key: "status",
      width: 160,
      align: "center",
      render: (value: string) => (
        <Tag color={statusColor(value)}>
          {SALES_ORDER_STATUS_LABEL[value as SalesOrderStatus] ?? value}
        </Tag>
      ),
    },
  ];

  if (query.isLoading) {
    return (
      <section className={styles.page}>
        <div
          className={styles.tableCard}
          style={{ textAlign: "center", padding: 48 }}
        >
          <Spin /> กำลังโหลดข้อมูลลูกค้า...
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className={styles.page}>
        <div
          className={styles.tableCard}
          style={{ textAlign: "center", padding: 48 }}
        >
          ไม่พบข้อมูลลูกค้า
          <div style={{ marginTop: 12 }}>
            <Link href="/customers">กลับรายการลูกค้า</Link>
          </div>
        </div>
      </section>
    );
  }

  const busy = activateMutation.isPending || deactivateMutation.isPending;
  const customerTypeLabel = data.customerType
    ? (CUSTOMER_TYPE_LABEL[data.customerType] ?? data.customerType)
    : "-";
  const salesOrders = salesOrdersQuery.data?.data ?? [];

  return (
    <section className={styles.page}>
      <div className={detailStyles.backRow}>
        <Button
          type="text"
          icon={<LeftOutlined />}
          className={detailStyles.backLink}
          onClick={() => router.push("/customers")}
        >
          ย้อนกลับ
        </Button>
      </div>

      <div className={detailStyles.heroCard}>
        <div className={styles.headerAccent} aria-hidden>
          <TeamOutlined />
        </div>

        <div className={detailStyles.heroContent}>
          <div className={detailStyles.heroTitleRow}>
            <Typography.Title level={3} className={detailStyles.heroTitle}>
              {data.nameTh}
            </Typography.Title>

            {data.isActive ? (
              <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
                <span className={styles.statusDot} />
                ใช้งาน
              </Tag>
            ) : (
              <Tag className={`${styles.statusTag} ${styles.statusInactive}`}>
                <span className={styles.statusDot} />
                ปิดใช้งาน
              </Tag>
            )}
          </div>

          <span className={detailStyles.heroMeta}>
            ประเภทลูกค้า: {customerTypeLabel} • ลงทะเบียนเมื่อวันที่{" "}
            {formatLongDate(data.createdAt)}
          </span>
        </div>

        {canManageCustomers ? (
          <Space className={detailStyles.heroActions}>
            {data.isActive ? (
              <Popconfirm
                title="ปิดใช้งานลูกค้า"
                description={`ต้องการปิดใช้งาน "${data.customerCode}" หรือไม่?`}
                okText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true }}
                onConfirm={() => deactivateMutation.mutate(id)}
              >
                <Button
                  className={styles.deleteButton}
                  icon={<StopOutlined />}
                  loading={busy}
                >
                  ปิดการใช้งาน
                </Button>
              </Popconfirm>
            ) : (
              <Button
                className={styles.editButton}
                loading={busy}
                onClick={() => activateMutation.mutate(id)}
              >
                เปิดใช้งาน
              </Button>
            )}

            <Button
              icon={<EditOutlined />}
              className={styles.editButton}
              onClick={() => router.push(`/customers/${id}/edit`)}
            >
              แก้ไขข้อมูล
            </Button>
          </Space>
        ) : null}
      </div>

      <div className={detailStyles.infoGrid}>
        <InfoCard
          eyebrow="GENERAL INFO"
          title="ข้อมูลทั่วไปและบัญชี"
          rows={[
            {
              label: "รหัสลูกค้า",
              value: data.customerCode,
            },
            {
              label: "ประเภทลูกค้า",
              value: customerTypeLabel,
            },
            {
              label: "เลขผู้เสียภาษี",
              value: data.taxId || "-",
            },
            {
              label: "ระยะเวลาการชำระเงิน",
              value: `${data.defaultCreditDays} วัน (Credit Term)`,
            },
          ]}
        />

        <InfoCard
          eyebrow="CONTACT DETAIL"
          title="ข้อมูลผู้ติดต่อและการสื่อสาร"
          rows={[
            {
              label: "ชื่อผู้ติดต่อหลัก",
              value: data.contactName || "-",
            },
            {
              label: "เบอร์โทรศัพท์",
              value: data.contactPhone || "-",
            },
            {
              label: "อีเมลติดต่อ",
              value: data.email || "-",
            },
            {
              label: "ที่อยู่จัดส่งเอกสาร",
              value: data.address || "-",
            },
          ]}
        />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableEyebrow}>TRANSACTION HISTORY</div>
            <h3>ประวัติการซื้อขาย</h3>
            <p>ประวัติการซื้อขาย และสถานะการดำเนินการของลูกค้า</p>

            {/* สิทธิ์ดูใบสั่งขายของคนอื่นไม่มี → backend คืนเฉพาะรายการที่ตัวเองสร้าง */}
            {canViewAllSalesOrders ? null : (
              <div className={detailStyles.historyNote}>
                แสดงเฉพาะใบสั่งขายที่คุณเป็นผู้สร้าง
              </div>
            )}
          </div>

          <div className={styles.tableCount}>{salesOrders.length} รายการ</div>
        </div>

        {salesOrdersQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {salesOrdersQuery.error instanceof Error
                ? salesOrdersQuery.error.message
                : "โหลดประวัติการซื้อขายไม่สำเร็จ"}
            </Typography.Text>
          </div>
        ) : (
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={historyColumns}
            dataSource={salesOrders}
            loading={salesOrdersQuery.isLoading}
            pagination={{
              pageSize: 5,
              showSizeChanger: false,
              showTotal: (total) => `ทั้งหมด ${total} รายการ`,
            }}
            scroll={{ x: 900 }}
            locale={{ emptyText: "ยังไม่มีประวัติการซื้อขาย" }}
          />
        )}
      </div>
    </section>
  );
}
