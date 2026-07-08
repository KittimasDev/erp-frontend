import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <section className={styles.dashboard}>
      <div className={styles.heroCard}>
        <p className={styles.eyebrow}>Inventory Management</p>
        <h1>ภาพรวมระบบ ERP</h1>
        <p className={styles.description}>
          ยินดีต้อนรับสู่ระบบจัดการคลังสินค้า SMT Energy
          เลือกเมนูด้านบนเพื่อเริ่มทำงาน
        </p>
      </div>

      <div className={styles.statGrid}>
        <article className={styles.statCard}>
          <span>ใบขอซื้อ</span>
          <strong>41</strong>
          <small>รอดำเนินการ 5 รายการ</small>
        </article>
        <article className={styles.statCard}>
          <span>ใบสั่งซื้อ</span>
          <strong>28</strong>
          <small>อนุมัติแล้ว 24 รายการ</small>
        </article>
        <article className={styles.statCard}>
          <span>คลังสินค้า</span>
          <strong>12</strong>
          <small>คลังที่ใช้งานอยู่</small>
        </article>
      </div>
    </section>
  );
}
