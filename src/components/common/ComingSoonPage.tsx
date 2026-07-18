"use client";

import styles from "./ComingSoonPage.module.css";

type Props = {
  title: string;
  description?: string;
};

export default function ComingSoonPage({ title, description }: Props) {
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Coming soon</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>
          {description ??
            "หน้านี้อยู่ระหว่างพัฒนา — จะเปิดใช้งานในรอบถัดไป"}
        </p>
      </div>
    </section>
  );
}
