"use client";

import { Empty, Spin, Tag, Typography } from "antd";
import { IdcardOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import MySignaturePage from "@/components/users/MySignaturePage";
import { useMeQuery } from "@/hooks/auth/useMeQuery";
import { initialsFromUser } from "@/lib/auth/session";
import { getStoredLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";

import masterStyles from "@/components/masters/shared/master-page.module.css";
import styles from "./profile.module.css";
import PageHeader from "@/components/common/PageHeader";

const EMPTY = "—";

function formatDate(value?: string | null) {
  if (!value) {
    return EMPTY;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : EMPTY;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return EMPTY;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY HH:mm") : EMPTY;
}

function textOr(value?: string | null) {
  return value?.trim() || EMPTY;
}

export default function ProfilePage() {
  const t = useT();
  const meQuery = useMeQuery();
  const me = meQuery.data?.data;

  if (meQuery.isLoading) {
    return (
      <section className={masterStyles.page}>
        <div className={styles.loadingBox}>
          <Spin />
        </div>
      </section>
    );
  }

  if (meQuery.isError || !me) {
    return (
      <section className={masterStyles.page}>
        <Empty
          className={styles.loadingBox}
          description={t("โหลดข้อมูลของคุณไม่สำเร็จ")}
        />
      </section>
    );
  }

  const infoRows: Array<{ label: string; value: string }> = [
    { label: t("รหัสพนักงาน"), value: textOr(me.employeeCode) },
    { label: getStoredLanguage() === "en" ? "Department" : "แผนก", value: textOr(me.departmentName) },
    { label: getStoredLanguage() === "en" ? "Position" : "ตำแหน่ง", value: textOr(me.position) },
    { label: t("วันที่เริ่มงาน"), value: formatDate(me.hireDate) },
    { label: t("อีเมล"), value: textOr(me.email) },
    { label: t("เบอร์โทร"), value: textOr(me.phone) },
    { label: t("เข้าสู่ระบบล่าสุด"), value: formatDateTime(me.lastLoginAt) },
    {
      label: t("เปลี่ยนรหัสผ่านล่าสุด"),
      value: formatDateTime(me.passwordChangedAt),
    },
    { label: t("สร้างบัญชีเมื่อ"), value: formatDate(me.createdAt) },
  ];

  return (
    <section className={masterStyles.page}>
      <PageHeader
        eyebrow={t("โปรไฟล์ของฉัน")}
        title={me.displayName || me.username}
        subtitle={me.username}
        actions={
          <>
<div className={styles.profileAvatar}>{initialsFromUser(me)}</div>
          </>
        }
      >
<div className={styles.roleTags}>
            {(me.roles ?? []).length > 0 ? (
              (me.roles ?? []).map((role) => (
                <Tag key={role.id} color="green">
                  {role.roleName || role.roleCode}
                </Tag>
              ))
            ) : (
              <Tag>{t("ยังไม่ได้กำหนดบทบาท")}</Tag>
            )}
            <Tag color={me.isActive ? "success" : "default"}>
              {me.isActive ? t("ใช้งาน") : t("ปิดใช้งาน")}
            </Tag>
          </div>
      </PageHeader>

      <div className={masterStyles.tableCard}>
        <div className={masterStyles.tableHeader}>
          <div>
            <div className={masterStyles.tableEyebrow}>PROFILE</div>
            <h3>{t("ข้อมูลของฉัน")}</h3>
            <p>
              {t("ข้อมูลเหล่านี้แก้ไขเองไม่ได้ — ถ้าไม่ถูกต้องติดต่อผู้ดูแลระบบหรือฝ่ายบุคคล")}
            </p>
          </div>
        </div>

        <div className={styles.metaGrid}>
          {infoRows.map((row) => (
            <div key={row.label} className={styles.metaItem}>
              <span className={styles.metaLabel}>{row.label}</span>
              <div className={styles.metaValue}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.signatureSection}>
        <div className={styles.sectionTitle}>
          <IdcardOutlined />
          <span>{t("ลายเซ็นของฉัน")}</span>
        </div>
        <MySignaturePage embedded />
      </div>
    </section>
  );
}
