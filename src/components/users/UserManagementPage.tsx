"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, Typography } from "antd";
import {
  ApartmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import DepartmentsPage from "@/components/masters/departments/DepartmentsPage";
import { isAdministrator } from "@/lib/auth/session";
import masterStyles from "@/components/masters/shared/master-page.module.css";

import UsersPage from "./UsersPage";
import styles from "./UserManagementPage.module.css";

type ManagementTab = "users" | "departments";

function resolveTab(raw: string | null): ManagementTab {
  return raw === "departments" ? "departments" : "users";
}

export default function UserManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAdministrator()) {
      router.replace("/");
    }
  }, [router, pathname]);

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
    // Drop department/user filter params when switching tabs to avoid confusion
    ["q", "isActive", "roleId", "code", "name"].forEach((keyName) =>
      next.delete(keyName),
    );
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

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
              จัดการผู้ใช้งานและแผนก
            </Typography.Title>
            <Typography.Text className={masterStyles.pageSubtitle}>
              จัดแผนกองค์กรและบัญชีผู้ใช้ไว้ที่เดียวกัน เพื่อตั้งค่าได้ต่อเนื่อง
            </Typography.Text>
          </div>
          <div />
        </div>

        <div className={styles.hint}>
          แนะนำลำดับงาน: สร้าง<strong> แผนก </strong>ก่อน → จากนั้นไปแท็บ
          <strong> ผู้ใช้งาน </strong>เพื่อสร้างบัญชีและกำหนด Role
        </div>

        <Tabs
          className={styles.tabs}
          activeKey={activeTab}
          onChange={setTab}
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
              key: "users",
              label: (
                <span className={styles.tabLabel}>
                  <TeamOutlined />
                  ผู้ใช้งาน
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
