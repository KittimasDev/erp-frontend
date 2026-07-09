"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, message } from "antd";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!username.trim()) {
      message.warning("กรุณากรอกชื่อผู้ใช้งาน");
      return;
    }

    if (!password.trim()) {
      message.warning("กรุณากรอกรหัสผ่าน");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "เข้าสู่ระบบไม่สำเร็จ");
      }

      /**
       * ปรับชื่อ field token ให้ตรงกับ backend ของคุณ
       * เช่น backend อาจส่ง access_token, accessToken หรือ token
       */
      const accessToken = data?.access_token || data?.accessToken || data?.token;

      if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
      }

      localStorage.setItem("user", JSON.stringify(data?.user || data));

      message.success("เข้าสู่ระบบสำเร็จ");

      router.push("/");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";

      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
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

              <h1>ระบบจัดการคลังสินค้า สำหรับ SMT Energy</h1>
              <p>
                เข้าสู่ระบบเพื่อจัดการใบขอซื้อ ตรวจสอบเอกสารอนุมัติ
                และติดตามข้อมูลสินค้าคงคลังได้จากศูนย์กลางเดียว
              </p>
            </div>
          </div>

          <div className={styles.dashboardPreview}>
            <div className={styles.previewTop}>
              <b>ภาพรวมการทำงานวันนี้</b>
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
            <div className={styles.mobileBrand}>
              <Brand isMobile />
            </div>

            <div className={styles.welcomeBadge}>
              <span className={styles.pulse} />
              Secure Login
            </div>

            <h2>ยินดีต้อนรับกลับ</h2>
            <p className={styles.subtitle}>
              กรุณากรอกบัญชีผู้ใช้งานเพื่อเข้าสู่ระบบ Inventory Management
            </p>

            <form onSubmit={handleLogin}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>ชื่อผู้ใช้งาน</label>
                <Input
                  size="large"
                  prefix="👤"
                  placeholder="กรอกชื่อผู้ใช้งาน"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>รหัสผ่าน</label>
                <Input.Password
                  size="large"
                  prefix="🔒"
                  placeholder="กรอกรหัสผ่าน"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="primary"
                size="large"
                htmlType="submit"
                className={styles.loginButton}
                block
                loading={loading}
              >
                เข้าสู่ระบบ
              </Button>
            </form>

            <div className={styles.helperGrid}>
              <Button className={styles.helperButton}>ติดต่อผู้ดูแลระบบ</Button>
              <Button className={styles.helperButton}>คู่มือการใช้งาน</Button>
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

function Brand({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <div className={`${styles.brand} ${isMobile ? styles.brandMobile : ""}`}>
      <div className={styles.logoMark} />
      <div className={styles.brandText}>
        <strong>SMT</strong>
        <span>ENERGY CO., LTD.</span>
      </div>
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