"use client";

import { useRouter } from "next/navigation";
import { Alert, Button } from "antd";
import {
  ArrowLeftOutlined,
  BuildOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import styles from "./ProductionOutputPendingTicketsPage.module.css";

/**
 * รับผลผลิตเข้าคลัง (FINISHED_GOODS) ต้องเริ่มจาก Production Order เท่านั้น
 * ไม่สร้างคำขอจากตั๋วชั่งรับซื้อยาง (PURCHASE_IN)
 */
export default function ProductionOutputPendingTicketsPage() {
  const router = useRouter();

  return (
    <MasterPageGate isLoading={false}>
      <section className={styles.page}>
        <div className={styles.card}>
          <div className={styles.listHeader}>
            <div>
              <h3>รับผลผลิตเข้าคลัง</h3>
              <p>
                Flow นี้แยกจากรับซื้อยางดิบ — สร้างคำขอรับผลผลิตจากใบสั่งผลิต
                (Production Order) เท่านั้น ไม่สร้างจากตั๋วชั่ง
              </p>
            </div>
            <div className={styles.listHeaderActions}>
              <Button
                icon={<ArrowLeftOutlined />}
                className={styles.backButton}
                onClick={() => router.push("/receiving")}
              >
                กลับรับซื้อยาง
              </Button>
              <Button
                type="primary"
                icon={<BuildOutlined />}
                className={styles.primaryButton}
                onClick={() => router.push("/production/production-orders")}
              >
                ไปใบสั่งผลิต
              </Button>
            </div>
          </div>

          <div style={{ padding: "0 20px 20px" }}>
            <Alert
              type="info"
              showIcon
              title="ไม่สร้างคำขอรับผลผลิตจากตั๋วชั่ง"
              description={
                <div>
                  <p style={{ marginBottom: 8 }}>
                    ตั๋วชั่งประเภทรับซื้อยาง (PURCHASE_IN) ใช้ flow
                    คัดแยก → ใบรับซื้อ → จ่ายเงิน → รับยางดิบเข้าคลังเท่านั้น
                  </p>
                  <p style={{ marginBottom: 0 }}>
                    หากต้องการรับน้ำมัน Pyrolysis / rCB / เศษลวดเหล็ก ฯลฯ
                    ให้เปิดใบสั่งผลิตแล้วกดขอรับผลผลิตจากหน้ารายละเอียดใบสั่งผลิต
                  </p>
                </div>
              }
            />
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}
