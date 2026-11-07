"use client";

import { useT } from "@/lib/i18n/useT";

import styles from "./ComingSoonPage.module.css";

type Props = {
  title: string;
  description?: string;
};

export default function ComingSoonPage({ title, description }: Props) {
  const t = useT();
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Coming soon</p>
        <h1 className={styles.title}>{t(title)}</h1>
        <p className={styles.description}>
          {t(
            description ?? "หน้านี้อยู่ระหว่างพัฒนา — จะเปิดใช้งานในรอบถัดไป",
          )}
        </p>
      </div>
    </section>
  );
}
