"use client";

import { useState } from "react";
import Image from "next/image";
import { App, Button, Input } from "antd";

import LanguageFlag from "@/components/common/LanguageFlag";
import { useLoginMutation } from "@/hooks/auth/useLoginMutation";
import { setLanguage, useLanguage, type Language } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { message } = App.useApp();
  const t = useT();
  const language = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLoginMutation();

  const handleLogin = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!username.trim()) {
      message.warning(t("กรุณากรอกชื่อผู้ใช้งาน"));
      return;
    }

    if (!password.trim()) {
      message.warning(t("กรุณากรอกรหัสผ่าน"));
      return;
    }

    loginMutation.mutate({
      username: username.trim(),
      password,
    });
  };

  return (
    <main className={styles.page}>
      <section className={styles.loginLayout}>
        <aside className={styles.visualPanel}>
          <div className={styles.visualContent}>
            <Brand />

            <div className={styles.hero}>
              <div className={styles.eyebrow}>
                <span className={styles.pulse} />
                Inventory Management System
              </div>

              <h1>{t("ระบบจัดการคลังสินค้า สำหรับ SMT Energy")}</h1>
              <p>
                {t("เข้าสู่ระบบเพื่อจัดการใบขอซื้อ ตรวจสอบเอกสารอนุมัติ และติดตามข้อมูลสินค้าคงคลังได้จากศูนย์กลางเดียว")}
              </p>
            </div>
          </div>

          <div className={styles.dashboardPreview}>
            <div className={styles.previewTop}>
              <b>{t("ภาพรวมการทำงานวันนี้")}</b>
              <span className={styles.previewChip}>Online</span>
            </div>

            <div className={styles.statGrid}>
              <Stat title="Purchase Request" value="41" percent="78%" />
              <Stat title="Approved" value="36" percent="86%" />
              <Stat title="Pending" value="05" percent="34%" />
            </div>
          </div>
        </aside>

        <section className={styles.formPanel}>
          <div className={styles.loginCard}>
            <div className={styles.langSwitch} role="group" aria-label={t("ภาษา")}>
              {(["th", "en"] as Language[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`${styles.langOption} ${language === code ? styles.langOptionActive : ""}`}
                  aria-pressed={language === code}
                  onClick={() => setLanguage(code)}
                >
                  <LanguageFlag language={code} size={18} ring={false} />
                  <span>{code === "th" ? "ไทย" : "English"}</span>
                </button>
              ))}
            </div>

            <div className={styles.mobileBrand}>
              <Brand isMobile />
            </div>

            <div className={styles.welcomeBadge}>
              <span className={styles.pulse} />
              Secure Login
            </div>

            <h2>{t("ยินดีต้อนรับกลับ")}</h2>
            <p className={styles.subtitle}>
              {t("กรุณากรอกบัญชีผู้ใช้งานเพื่อเข้าสู่ระบบ Inventory Management")}
            </p>

            <form onSubmit={handleLogin}>
              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="login-username">
                  {t("ชื่อผู้ใช้งาน")}
                </label>
                <Input
                  id="login-username"
                  size="large"
                  prefix="👤"
                  placeholder={t("กรอกชื่อผู้ใช้งาน")}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel} htmlFor="login-password">
                  {t("รหัสผ่าน")}
                </label>
                <Input.Password
                  id="login-password"
                  size="large"
                  prefix="🔒"
                  placeholder={t("กรอกรหัสผ่าน")}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                />
              </div>

              <Button
                type="primary"
                size="large"
                htmlType="submit"
                className={styles.loginButton}
                block
                loading={loginMutation.isPending}
              >
                {t("เข้าสู่ระบบ")}
              </Button>
            </form>

            <div className={styles.helperGrid}>
              <Button className={styles.helperButton}>{t("ติดต่อผู้ดูแลระบบ")}</Button>
              <Button className={styles.helperButton}>{t("คู่มือการใช้งาน")}</Button>
            </div>

            <div className={styles.footer}>
              <span>© 2026 SMT Energy Co., Ltd.</span>
              <a href="#">Privacy & Terms</a>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

const COMPANY_LOGO_URL = "/smt-energy-logo.png";

function Brand({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <div className={`${styles.brand} ${isMobile ? styles.brandMobile : ""}`}>
      {/*
        width/height = ขนาดจริงของไฟล์ (174×91) ใส่ไว้ให้เบราว์เซอร์จองพื้นที่ตามอัตราส่วน
        ตั้งแต่ก่อนรูปโหลดเสร็จ — กัน layout ขยับ (CLS) ส่วนขนาดที่แสดงจริงคุมด้วย CSS
        (height 64px / width auto) เหมือนเดิม
        next/image แปลงเป็น WebP/AVIF ให้อัตโนมัติ · priority เพราะโลโก้อยู่ครึ่งบนของจอ
      */}
      <Image
        src={COMPANY_LOGO_URL}
        alt="SMT Energy Co., Ltd."
        className={styles.logoImage}
        width={174}
        height={91}
        priority
      />
    </div>
  );
}

function Stat({
  title,
  value,
  percent,
}: {
  title: string;
  value: string;
  percent: string;
}) {
  return (
    <div className={styles.stat}>
      <span>{title}</span>
      <strong>{value}</strong>
      <div className={styles.bar}>
        <i style={{ width: percent }} />
      </div>
    </div>
  );
}
