"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, Typography } from "antd";
import {
  ApartmentOutlined,
  BellOutlined,
  HighlightOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import DepartmentsPage from "@/components/masters/departments/DepartmentsPage";
import PermissionMatrixPage from "@/components/permissions/PermissionMatrixPage";
import { isAdministrator } from "@/lib/auth/session";
import masterStyles from "@/components/masters/shared/master-page.module.css";

import NotificationSettingsPage from "./NotificationSettingsPage";
import MySignaturePage from "./MySignaturePage";
import RolesPage from "./RolesPage";
import UsersPage from "./UsersPage";
import styles from "./UserManagementPage.module.css";

type ManagementTab =
  | "users"
  | "departments"
  | "roles"
  | "notifications"
  | "signature";

function resolveTab(raw: string | null): ManagementTab {
  if (
    raw === "departments" ||
    raw === "roles" ||
    raw === "notifications" ||
    raw === "signature"
  ) {
    return raw;
  }
  return "users";
}

export default function UserManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const roleIdParam = searchParams.get("roleId");
  const isMatrixView = tabParam === "permissions" && Boolean(roleIdParam);
  /** ลายเซ็นเป็น self-service — เปิดให้ทุกคนที่ login ไม่ใช่แค่ ADMINISTRATOR */
  const isSignatureView = tabParam === "signature";

  useEffect(() => {
    // แท็บอื่นยังเป็นของ ADMINISTRATOR เท่านั้น — คนอื่นส่งไปแท็บลายเซ็นของตัวเอง
    if (!isSignatureView && !isAdministrator()) {
      router.replace("/users?tab=signature");
    }
  }, [router, pathname, isSignatureView]);

  useEffect(() => {
    if (tabParam === "permissions" && !roleIdParam) {
      router.replace("/users?tab=roles");
    }
  }, [router, tabParam, roleIdParam]);

  const activeTab = useMemo(
    () => resolveTab(searchParams.get("tab")),
    [searchParams],
  );

  const setTab = (key: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (key === "users") {
      next.delete("tab");
    } else {
      next.set("tab", key);
    }
    ["q", "isActive", "code", "name", "roleId", "event"].forEach((keyName) =>
      next.delete(keyName),
    );
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  if (isMatrixView) {
    return (
      <MasterPageGate>
        <section className={masterStyles.page}>
          <PermissionMatrixPage embedded fromRoles />
        </section>
      </MasterPageGate>
    );
  }

  if (isSignatureView) {
    return (
      <MasterPageGate>
        <MySignaturePage />
      </MasterPageGate>
    );
  }

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>
            <TeamOutlined />
          </div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>SECURITY · ORGANIZATION</div>
            <Typography.Title level={2} className={masterStyles.pageTitle}>
              บุคคล / ผู้ใช้งาน · แผนก · บทบาท
            </Typography.Title>
            <Typography.Text className={masterStyles.pageSubtitle}>
              บุคคล = ข้อมูล HR + บัญชี login ที่เดียวกัน · แผนก = ส่วนงาน ·
              บทบาท = สิทธิ์ใช้งานระบบ
            </Typography.Text>
          </div>
          <div />
        </div>

        <div className={styles.hint}>
          ลำดับที่แนะนำ: สร้าง<strong> แผนก </strong>(ถ้าต้องการ) → สร้าง
          <strong> บทบาท </strong>และกด <strong>ตั้งสิทธิ์</strong> → จากนั้น
          <strong> บุคคล/ผู้ใช้งาน </strong> (กรอก HR + login ในฟอร์มเดียว)
          <br />
          ปิด &quot;เปิด login ERP&quot; ได้สำหรับพนักงานที่ไม่ใช้ระบบ — ยังใช้
          ข้อมูลคนเดียวกันกับเวลางาน/OT/ลา
        </div>

        <Tabs
          className={styles.tabs}
          activeKey={activeTab}
          onChange={setTab}
          destroyOnHidden
          items={[
            {
              key: "departments",
              label: (
                <span className={styles.tabLabel}>
                  <ApartmentOutlined />
                  แผนก
                </span>
              ),
              children: <DepartmentsPage embedded />,
            },
            {
              key: "roles",
              label: (
                <span className={styles.tabLabel}>
                  <SafetyCertificateOutlined />
                  บทบาท
                </span>
              ),
              children: <RolesPage embedded />,
            },
            {
              key: "notifications",
              label: (
                <span className={styles.tabLabel}>
                  <BellOutlined />
                  การแจ้งเตือน
                </span>
              ),
              children: <NotificationSettingsPage embedded />,
            },
            {
              key: "users",
              label: (
                <span className={styles.tabLabel}>
                  <TeamOutlined />
                  ผู้ใช้งาน
                </span>
              ),
              children: <UsersPage embedded />,
            },
            {
              key: "signature",
              label: (
                <span className={styles.tabLabel}>
                  <HighlightOutlined />
                  ลายเซ็นของฉัน
                </span>
              ),
              children: null,
            },
          ]}
        />
      </section>
    </MasterPageGate>
  );
}
