"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, Typography } from "antd";
import {
  ApartmentOutlined,
  BellOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import DepartmentsPage from "@/components/masters/departments/DepartmentsPage";
import PositionsPage from "@/components/masters/positions/PositionsPage";
import SectionsPage from "@/components/masters/sections/SectionsPage";
import PermissionMatrixPage from "@/components/permissions/PermissionMatrixPage";
import { isAdministrator } from "@/lib/auth/session";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import masterStyles from "@/components/masters/shared/master-page.module.css";

import NotificationSettingsPage from "./NotificationSettingsPage";
import RolesPage from "./RolesPage";
import UsersPage from "./UsersPage";
import { canAccessScreen } from "@/lib/auth/permissions-access";
import styles from "./UserManagementPage.module.css";
import PageHeader from "@/components/common/PageHeader";

type ManagementTab =
  | "users"
  | "departments"
  | "sections"
  | "positions"
  | "roles"
  | "notifications";

function resolveTab(raw: string | null): ManagementTab {
  if (
    raw === "departments" ||
    raw === "sections" ||
    raw === "positions" ||
    raw === "roles" ||
    raw === "notifications"
  ) {
    return raw;
  }
  return "users";
}

export default function UserManagementPage() {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const roleIdParam = searchParams.get("roleId");
  const isMatrixView = tabParam === "permissions" && Boolean(roleIdParam);
  /** ลายเซ็นย้ายไปหน้าโปรไฟล์แล้ว — คงไว้เพื่อ redirect ลิงก์เก่า/bookmark */
  const isSignatureView = tabParam === "signature";

  useEffect(() => {
    if (isSignatureView) {
      router.replace("/profile");
      return;
    }
    // แท็บที่เหลือเปิดให้ ADMINISTRATOR หรือคนที่ถูกติ๊กสิทธิ์หน้าผู้ใช้/สิทธิ์การใช้งาน
    // คนที่ไม่มีสิทธิ์ส่งไปหน้าโปรไฟล์ตัวเอง
    if (
      !isAdministrator() &&
      !canAccessScreen("USERS") &&
      !canAccessScreen("PERMISSIONS")
    ) {
      router.replace("/profile");
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

  return (
    <MasterPageGate>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow="SECURITY · ORGANIZATION"
          icon={<TeamOutlined />}
          title={t("บุคคล / ผู้ใช้งาน · แผนก · แผนกย่อย · ตำแหน่ง · บทบาท")}
          subtitle={t("บุคคล = ข้อมูล HR + บัญชี login ที่เดียวกัน · แผนก = ส่วนงาน · แผนกย่อย = หน่วยย่อยใต้แผนก · ตำแหน่ง = ตำแหน่งงาน · บทบาท = สิทธิ์ใช้งานระบบ")}
        />

        <div className={styles.hint}>
          {t("ลำดับที่แนะนำ: สร้าง")}<strong> {lang === "en" ? "Department" : "แผนก"} </strong>{t("(ถ้าต้องการ) → สร้าง")}
          <strong> {t("บทบาท")} </strong>{t("และกด")} <strong>{t("ตั้งสิทธิ์")}</strong> {t("→ จากนั้น")}
          <strong> {t("บุคคล/ผู้ใช้งาน")} </strong> {t("(กรอก HR + login ในฟอร์มเดียว)")}
          <br />
          {t("ปิด \"เปิด login ERP\" ได้สำหรับพนักงานที่ไม่ใช้ระบบ — ยังใช้ข้อมูลคนเดียวกันกับเวลางาน/OT/ลา")}
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
                  {lang === "en" ? "Departments" : "แผนก"}
                </span>
              ),
              children: <DepartmentsPage embedded />,
            },
            {
              key: "sections",
              label: (
                <span className={styles.tabLabel}>
                  <ApartmentOutlined />
                  {t("แผนกย่อย")}
                </span>
              ),
              children: <SectionsPage />,
            },
            {
              key: "positions",
              label: (
                <span className={styles.tabLabel}>
                  <IdcardOutlined />
                  {lang === "en" ? "Positions" : "ตำแหน่ง"}
                </span>
              ),
              children: <PositionsPage />,
            },
            {
              key: "roles",
              label: (
                <span className={styles.tabLabel}>
                  <SafetyCertificateOutlined />
                  {t("บทบาท")}
                </span>
              ),
              children: <RolesPage embedded />,
            },
            {
              key: "notifications",
              label: (
                <span className={styles.tabLabel}>
                  <BellOutlined />
                  {t("การแจ้งเตือน")}
                </span>
              ),
              children: <NotificationSettingsPage embedded />,
            },
            {
              key: "users",
              label: (
                <span className={styles.tabLabel}>
                  <TeamOutlined />
                  {t("ผู้ใช้งาน")}
                </span>
              ),
              children: <UsersPage embedded />,
            },
          ]}
        />
      </section>
    </MasterPageGate>
  );
}
