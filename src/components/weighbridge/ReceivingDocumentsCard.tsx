"use client";

import { Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";

import styles from "./WeighbridgeDashboardPage.module.css";

export type ReceivingDocumentRow = {
  key: string;
  label: string;
  /** เลขที่เอกสาร — ไม่มี = ยังไม่ออก */
  docNo?: string;
  /** วันที่ของเอกสาร (จัดรูปแล้ว) */
  dateText?: string;
  /** สถานะสั้น ๆ ข้างเลขที่ */
  statusText?: string;
  /** ข้อความตอนยังไม่ออก — บอกว่ารอขั้นไหน */
  pendingHint: string;
  onOpen?: () => void;
  onPrint?: () => void;
  printing?: boolean;
  printDisabled?: boolean;
};

type Props = {
  rows: ReceivingDocumentRow[];
};

/** เอกสารของตั๋วใบนี้ที่เดียว: ใบรับซื้อ · ใบสำคัญจ่าย · ใบรับสินค้า (ใบที่ยังไม่ออกแสดงจางพร้อมบอกว่ารอขั้นไหน) */
export default function ReceivingDocumentsCard({ rows }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3>เอกสาร</h3>
        <p>ใบรับซื้อ · ใบสำคัญจ่าย · ใบรับสินค้า ของตั๋วใบนี้ — เปิดดูหรือพิมพ์ได้ที่นี่</p>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.stepDocList}>
          {rows.map((row) => {
            const issued = Boolean(row.docNo);
            return (
              <div
                key={row.key}
                className={[
                  styles.stepDocRow,
                  issued ? "" : styles.stepDocRowMuted,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.stepDocMain}>
                  <span className={styles.stepDocLabel}>{row.label}</span>
                  <span className={styles.stepDocValue}>
                    {issued ? row.docNo : row.pendingHint}
                    {issued && row.dateText ? (
                      <span className={styles.stepDocMeta}>ลว. {row.dateText}</span>
                    ) : null}
                    {issued && row.statusText ? (
                      <span className={styles.stepDocMeta}>{row.statusText}</span>
                    ) : null}
                  </span>
                </div>
                {issued ? (
                  <div className={styles.stepDocActions}>
                    {row.onPrint ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<PrinterOutlined />}
                        loading={row.printing}
                        disabled={row.printDisabled}
                        onClick={row.onPrint}
                      >
                        พิมพ์
                      </Button>
                    ) : null}
                    {row.onOpen ? (
                      <Button size="small" onClick={row.onOpen}>
                        เปิด
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
