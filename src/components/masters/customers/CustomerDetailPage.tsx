"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Descriptions, Popconfirm, Space, Spin, Tag, Typography } from "antd";
import { ArrowLeftOutlined, EditOutlined } from "@ant-design/icons";

import {
  useActivateCustomerMutation,
  useDeactivateCustomerMutation,
} from "@/hooks/customers/useActivateDeactivateCustomerMutation";
import { useCustomerQuery } from "@/hooks/customers/useCustomerQuery";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { RoleCode } from "@/lib/auth/role-codes";
import styles from "@/components/masters/shared/master-page.module.css";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  DOMESTIC: "ในประเทศ",
  EXPORT: "ส่งออก",
  DEALER: "ตัวแทนจำหน่าย",
  GENERAL: "ทั่วไป",
};

type Props = {
  id: string;
};

export default function CustomerDetailPage({ id }: Props) {
  const router = useRouter();
  const query = useCustomerQuery(id);
  const activateMutation = useActivateCustomerMutation();
  const deactivateMutation = useDeactivateCustomerMutation();

  const data = query.data?.data;
  const canManageCustomers =
    userHasRole(RoleCode.SALES_OFFICER) ||
    userHasRole(RoleCode.SALES_MANAGER) ||
    isAdministrator();

  if (query.isLoading) {
    return (
      <section className={styles.page}>
        <div className={styles.tableCard} style={{ textAlign: "center", padding: 48 }}>
          <Spin /> กำลังโหลดข้อมูลลูกค้า...
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className={styles.page}>
        <div className={styles.tableCard} style={{ textAlign: "center", padding: 48 }}>
          ไม่พบข้อมูลลูกค้า
          <div style={{ marginTop: 12 }}>
            <Link href="/customers">กลับรายการลูกค้า</Link>
          </div>
        </div>
      </section>
    );
  }

  const busy = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/customers")}
          className={styles.editButton}
        >
          กลับ
        </Button>

        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>CUSTOMER DETAIL</div>
          <Typography.Title level={2} className={styles.pageTitle}>
            {data.nameTh}
          </Typography.Title>
          <Typography.Text className={styles.pageSubtitle}>
            {data.customerCode}
          </Typography.Text>
        </div>

        {canManageCustomers ? (
          <Space>
            <Button
              icon={<EditOutlined />}
              className={styles.editButton}
              onClick={() => router.push(`/customers/${id}/edit`)}
            >
              แก้ไข
            </Button>

            {data.isActive ? (
              <Popconfirm
                title="ปิดใช้งานลูกค้า"
                description={`ต้องการปิดใช้งาน "${data.customerCode}" หรือไม่?`}
                okText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true }}
                onConfirm={() => deactivateMutation.mutate(id)}
              >
                <Button className={styles.deleteButton} loading={busy}>
                  ปิดใช้งาน
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
          </Space>
        ) : (
          <div />
        )}
      </div>

      <div className={styles.tableCard}>
        <div className={styles.sectionTitle}>
          <span className={styles.sectionLine} />
          <div>
            <strong>ข้อมูลลูกค้า</strong>
            <span>รายละเอียดทั้งหมดของลูกค้ารายนี้</span>
          </div>
        </div>

        <Descriptions bordered column={2} size="middle">
          <Descriptions.Item label="รหัสลูกค้า">
            <span className={styles.codeBadge}>{data.customerCode}</span>
          </Descriptions.Item>
          <Descriptions.Item label="สถานะ">
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
          </Descriptions.Item>
          <Descriptions.Item label="ชื่อลูกค้า" span={2}>
            {data.nameTh}
          </Descriptions.Item>
          <Descriptions.Item label="ประเภทลูกค้า">
            {data.customerType
              ? (CUSTOMER_TYPE_LABEL[data.customerType] ?? data.customerType)
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="เลขประจำตัวผู้เสียภาษี">
            {data.taxId || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="ที่อยู่" span={2}>
            {data.address || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="ชื่อผู้ติดต่อ">
            {data.contactName || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="เบอร์ติดต่อ">
            {data.contactPhone || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="อีเมล">
            {data.email || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="จำนวนวันเครดิต">
            {data.defaultCreditDays} วัน
          </Descriptions.Item>
          <Descriptions.Item label="สร้างเมื่อ">
            {new Date(data.createdAt).toLocaleString("th-TH")}
          </Descriptions.Item>
          <Descriptions.Item label="อัปเดตล่าสุด">
            {new Date(data.updatedAt).toLocaleString("th-TH")}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </section>
  );
}
