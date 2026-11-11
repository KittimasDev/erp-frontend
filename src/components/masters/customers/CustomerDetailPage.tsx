"use client";

import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { formatDate } from "@/lib/i18n/format";
import type { Language } from "@/lib/i18n/translate";

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
import { salesOrderStatusColor, salesOrderStatusLabel } from "@/types/sales-orders";
import type { SalesOrder, SalesOrderStatus } from "@/types/sales-orders";
import styles from "@/components/masters/shared/master-page.module.css";
import detailStyles from "./customer-detail.module.css";
import PageHeader from "@/components/common/PageHeader";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

function formatMoney(value: string | undefined, lang: Language) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "-";
  }
  return amount.toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
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
  const t = useT();
  const lang = useLanguage();
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
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_: unknown, __: unknown, index: number) => index + 1,
    },
    {
      title: t("เลขที่ใบสั่งซื้อ"),
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
      title: t("วันที่ทำรายการ"),
      dataIndex: "soDate",
      key: "soDate",
      width: 150,
      render: (value?: string) => (
        <span className={styles.updatedText}>
          {value ? formatDate(value, lang) : "-"}
        </span>
      ),
    },
    {
      title: t("รายการสินค้า/บริการ"),
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
      title: t("จำนวนรายการ"),
      key: "itemCount",
      width: 130,
      align: "right",
      render: (_value, record) => (record.items?.length ?? 0).toLocaleString("th-TH"),
    },
    {
      title: t("จำนวนเงิน"),
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 140,
      align: "right",
      render: (value?: string) => formatMoney(value, lang),
    },
    {
      title: t("สถานะ"),
      dataIndex: "status",
      key: "status",
      width: 160,
      align: "center",
      render: (value: string) => (
        <Tag color={salesOrderStatusColor(value)}>
          {salesOrderStatusLabel(value, lang)}
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
          <Spin /> {t("กำลังโหลดข้อมูลลูกค้า...")}
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
          {t("ไม่พบข้อมูลลูกค้า")}
          <div style={{ marginTop: 12 }}>
            <Link href="/customers">{t("กลับรายการลูกค้า")}</Link>
          </div>
        </div>
      </section>
    );
  }

  const busy = activateMutation.isPending || deactivateMutation.isPending;
  const customerTypeLabel = data.customerType
    ? (t(CUSTOMER_TYPE_LABEL[data.customerType] ?? data.customerType))
    : "-";
  const salesOrders = salesOrdersQuery.data?.data ?? [];

  return (
    <section className={styles.page}>
      <PageHeader
        eyebrow="MASTER DATA"
        icon={<TeamOutlined />}
        title={data.nameTh}
        subtitle={t("ประเภทลูกค้า: {type} • ลงทะเบียนเมื่อวันที่ {date}", {
          type: customerTypeLabel,
          date: formatDate(data.createdAt, lang),
        })}
        back={
          <Button
          type="text"
          icon={<LeftOutlined />}
          className={detailStyles.backLink}
          onClick={() => router.push("/customers")}
        >
          {t("ย้อนกลับ")}
        </Button>
        }
        meta={
          <>{data.isActive ? (
              <Tag className={`${styles.statusTag} ${styles.statusActive}`}>
                <span className={styles.statusDot} />
                {t("ใช้งาน")}
              </Tag>
            ) : (
              <Tag className={`${styles.statusTag} ${styles.statusInactive}`}>
                <span className={styles.statusDot} />
                {t("ปิดใช้งาน")}
              </Tag>
            )}</>
        }
        actions={
          <>{canManageCustomers ? (
          <Space className={detailStyles.heroActions}>
            {data.isActive ? (
              <Popconfirm
                title={t("ปิดใช้งานลูกค้า")}
                description={t('ต้องการปิดใช้งาน "{code}" หรือไม่?', { code: data.customerCode })}
                okText={t("ปิดใช้งาน")}
                cancelText={t("ยกเลิก")}
                okButtonProps={{ danger: true }}
                onConfirm={() => deactivateMutation.mutate(id)}
              >
                <Button
                  className={styles.deleteButton}
                  icon={<StopOutlined />}
                  loading={busy}
                >
                  {t("ปิดการใช้งาน")}
                </Button>
              </Popconfirm>
            ) : (
              <Button
                className={styles.editButton}
                loading={busy}
                onClick={() => activateMutation.mutate(id)}
              >
                {t("เปิดใช้งาน")}
              </Button>
            )}

            <Button
              icon={<EditOutlined />}
              className={styles.editButton}
              onClick={() => router.push(`/customers/${id}/edit`)}
            >
              {t("แก้ไขข้อมูล")}
            </Button>
          </Space>
        ) : null}</>
        }
      />

      <div className={detailStyles.infoGrid}>
        <InfoCard
          eyebrow="GENERAL INFO"
          title={t("ข้อมูลทั่วไปและบัญชี")}
          rows={[
            {
              label: t("รหัสลูกค้า"),
              value: data.customerCode,
            },
            {
              label: t("ประเภทลูกค้า"),
              value: customerTypeLabel,
            },
            {
              label: t("เลขผู้เสียภาษี"),
              value: data.taxId || "-",
            },
            {
              label: t("ระยะเวลาการชำระเงิน"),
              value: t("{n} วัน (Credit Term)", { n: data.defaultCreditDays }),
            },
          ]}
        />

        <InfoCard
          eyebrow="CONTACT DETAIL"
          title={t("ข้อมูลผู้ติดต่อและการสื่อสาร")}
          rows={[
            {
              label: t("ชื่อผู้ติดต่อหลัก"),
              value: data.contactName || "-",
            },
            {
              label: t("เบอร์โทรศัพท์"),
              value: data.contactPhone || "-",
            },
            {
              label: t("อีเมลติดต่อ"),
              value: data.email || "-",
            },
            {
              label: t("ที่อยู่จัดส่งเอกสาร"),
              value: data.address || "-",
            },
          ]}
        />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <div className={styles.tableEyebrow}>TRANSACTION HISTORY</div>
            <h3>{t("ประวัติการซื้อขาย")}</h3>
            <p>{t("ประวัติการซื้อขาย และสถานะการดำเนินการของลูกค้า")}</p>

            {/* สิทธิ์ดูใบสั่งขายของคนอื่นไม่มี → backend คืนเฉพาะรายการที่ตัวเองสร้าง */}
            {canViewAllSalesOrders ? null : (
              <div className={detailStyles.historyNote}>
                {t("แสดงเฉพาะใบสั่งขายที่คุณเป็นผู้สร้าง")}
              </div>
            )}
          </div>

          <div className={styles.tableCount}>{t("{n} รายการ", { n: salesOrders.length })}</div>
        </div>

        {salesOrdersQuery.isError ? (
          <div className={styles.errorBox}>
            <Typography.Text type="danger">
              {salesOrdersQuery.error instanceof Error
                ? salesOrdersQuery.error.message
                : t("โหลดประวัติการซื้อขายไม่สำเร็จ")}
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
              showTotal: (total) => t("ทั้งหมด {total} รายการ", { total }),
            }}
            scroll={{ x: 900 }}
            locale={{ emptyText: t("ยังไม่มีประวัติการซื้อขาย") }}
          />
        )}
      </div>
    </section>
  );
}
