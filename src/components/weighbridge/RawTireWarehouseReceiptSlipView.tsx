"use client";

import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";
import type { WarehouseReceiptSlipData } from "@/utils/generateRawTireWarehouseReceiptPdf";

import styles from "./RawTireWarehouseReceiptSlipPage.module.css";

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

type Props = {
  data: WarehouseReceiptSlipData;
  /** ลดแถวว่างเมื่อฝังในหน้าอื่น */
  compact?: boolean;
};

export default function RawTireWarehouseReceiptSlipView({
  data,
  compact = false,
}: Props) {
  const minRows = compact
    ? Math.max(data.items.length, 1)
    : Math.max(8, data.items.length);
  const bahtText = numberToThaiBahtText(data.netAmountRaw);

  return (
    <article className={`${styles.slipPaper} ${compact ? styles.slipCompact : ""}`}>
      <div className={styles.header}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} alt="SMT Energy" className={styles.logo} />
        <div className={styles.company}>
          <p className={styles.companyName}>
            บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด
          </p>
          <p className={styles.companyAddress}>
            85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100
          </p>
          <p className={styles.companyAddress}>
            เบอร์ติดต่อ : 02-2359565-8 · เลขประจำตัวผู้เสียภาษี 0105563023124
          </p>
        </div>
      </div>

      <div className={styles.headerRule} />
      <h1 className={styles.docTitle}>ใบรับสินค้า</h1>

      <div className={styles.infoGrid}>
        <div className={styles.infoBox}>
          <div className={styles.infoCardTitle}>ข้อมูลผู้ขาย</div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>รหัสผู้ขาย</span>
            <span className={styles.infoValue}>{data.sellerCode}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>ชื่อผู้ขาย</span>
            <span className={styles.infoValue}>{data.sellerName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>ที่อยู่</span>
            <span className={styles.infoValue}>
              {data.sellerAddress || "—"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>เลขผู้เสียภาษี</span>
            <span className={styles.infoValue}>{data.sellerTaxId || "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>โทร</span>
            <span className={styles.infoValue}>{data.sellerPhone || "—"}</span>
          </div>
        </div>
        <div className={styles.infoBox}>
          <div className={styles.infoCardTitle}>ข้อมูลเอกสาร</div>
          <div className={styles.metaGrid}>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>เลขที่เอกสาร</span>
              <span className={styles.metaValue}>{data.documentNo}</span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>วันที่เอกสาร</span>
              <span className={styles.metaValue}>
                {data.documentDate || "—"}
              </span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>เลขที่อ้างอิง</span>
              <span className={styles.metaValue}>{data.receiptNo}</span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>วันที่ส่งสินค้า</span>
              <span className={styles.metaValue}>{data.deliveryDate}</span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>ทะเบียนรถ</span>
              <span className={styles.metaValue}>
                {data.licensePlate || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th style={{ width: 48 }}>ลำดับ</th>
            <th>รหัสสินค้า / รายละเอียด</th>
            <th style={{ width: 56 }}>หน่วย</th>
            <th style={{ width: 72 }}>จำนวน</th>
            <th style={{ width: 88 }}>ราคาต่อหน่วย</th>
            <th style={{ width: 100 }}>จำนวนเงินรวม</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: minRows }).map((_, index) => {
            const item = data.items[index];
            if (!item) {
              return (
                <tr key={`empty-${index}`}>
                  <td className={styles.empty} />
                  <td className={styles.empty} />
                  <td className={styles.empty} />
                  <td className={styles.empty} />
                  <td className={styles.empty} />
                  <td className={styles.empty} />
                </tr>
              );
            }
            return (
              <tr key={item.no}>
                <td className={styles.textCenter}>{item.no}</td>
                <td>
                  <div className={styles.itemPrimary}>
                    {item.productCode} {item.productName}
                  </div>
                  <div className={styles.warehouseLine}>
                    คลัง : {item.warehouse}
                  </div>
                  {item.lotNo ? (
                    <div className={styles.lotLine}>Lot : {item.lotNo}</div>
                  ) : null}
                </td>
                <td className={styles.textCenter}>{item.unit}</td>
                <td className={styles.textRight}>{item.quantity}</td>
                <td className={styles.textRight}>{item.unitPrice}</td>
                <td className={styles.textRight}>{item.amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.bottomGrid}>
        <div className={styles.remarkCard}>
          <div className={styles.remarkLabel}>หมายเหตุ</div>
          <div className={styles.remarkBody}>{data.remark}</div>
          <div className={styles.bahtText}>( {bahtText} )</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span>รวมเป็นเงิน</span>
            <strong>{data.subtotalAmount}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>ส่วนลด</span>
            <strong>{data.discountAmount}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>หลังหักส่วนลด</span>
            <strong>{data.afterDiscountAmount}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>ภาษีมูลค่าเพิ่ม 7%</span>
            <strong>{data.vatAmount}</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryNet}`}>
            <span>ยอดเงินสุทธิ</span>
            <strong>{data.netAmount}</strong>
          </div>
        </div>
      </div>

      <div className={styles.signatures}>
        <div className={styles.sig}>
          <div className={styles.sigLine} />
          <div className={styles.sigName}>{data.preparedBy}</div>
          <div className={styles.sigRole}>ผู้จัดทำ</div>
          <div className={styles.sigDate}>วันที่ ____ / ____ / ________</div>
        </div>
        <div className={styles.sig}>
          <div className={styles.sigLine} />
          <div className={styles.sigName}>{data.verifiedBy}</div>
          <div className={styles.sigRole}>ผู้ตรวจสอบ</div>
          <div className={styles.sigDate}>วันที่ ____ / ____ / ________</div>
        </div>
        <div className={styles.sig}>
          <div className={styles.sigLine} />
          <div className={styles.sigName}>{data.approvedBy}</div>
          <div className={styles.sigRole}>ผู้อนุมัติ</div>
          <div className={styles.sigDate}>วันที่ ____ / ____ / ________</div>
        </div>
      </div>
    </article>
  );
}
