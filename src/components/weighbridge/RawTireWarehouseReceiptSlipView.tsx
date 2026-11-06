"use client";

import { useCompanyProfileQuery } from "@/hooks/company-profile/useCompanyProfileQuery";
import { formatTaxId, peekCompanyInfo } from "@/lib/company/company-info";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";
import type { WarehouseReceiptSlipData } from "@/utils/generateRawTireWarehouseReceiptPdf";

import styles from "./RawTireWarehouseReceiptSlipPage.module.css";
import { useT } from "@/lib/i18n/useT";

type Props = {
  data: WarehouseReceiptSlipData;
  /** ลดแถวว่างเมื่อฝังในหน้าอื่น */
  compact?: boolean;
};

export default function RawTireWarehouseReceiptSlipView({
  data,
  compact = false,
}: Props) {
  const t = useT();
  const minRows = compact
    ? Math.max(data.items.length, 1)
    : Math.max(8, data.items.length);
  const bahtText = numberToThaiBahtText(data.netAmountRaw);

  // ระหว่างที่ query ยังไม่ตอบ ใช้ค่าที่โหลดไว้ก่อนหน้า (ถ้ามี) สลิปจึงไม่วูบเป็นค่าว่าง
  const companyProfile = useCompanyProfileQuery().data?.data;
  const companySnapshot = peekCompanyInfo();
  const company = companyProfile ?? companySnapshot;
  // โลโก้ที่อัปโหลดต้องแนบ token จึงใส่ url ตรง ๆ ไม่ได้ — ใช้ data URI ที่โหลดไว้
  const logoSrc = companySnapshot?.logoDataUrl || company?.logoUrl || "";
  // เลขภาษีต้องจัดกลุ่มให้ตรงกับ PDF คู่กัน (generateRawTireWarehouseReceiptPdf)
  const contactLine = [
    company?.phone ? `${t("เบอร์ติดต่อ")} : ${company.phone}` : null,
    company?.taxId
      ? `${t("เลขประจำตัวผู้เสียภาษี")} ${formatTaxId(company.taxId, "grouped")}`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={`${styles.slipPaper} ${compact ? styles.slipCompact : ""}`}>
      <div className={styles.header}>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={company?.nameTh ?? t("โลโก้บริษัท")}
            className={styles.logo}
          />
        ) : null}
        <div className={styles.company}>
          <p className={styles.companyName}>{company?.nameTh ?? ""}</p>
          <p className={styles.companyAddress}>{company?.addressText ?? ""}</p>
          {contactLine ? (
            <p className={styles.companyAddress}>{contactLine}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.headerRule} />
      <h1 className={styles.docTitle}>{t("ใบรับสินค้า")}</h1>

      <div className={styles.infoGrid}>
        <div className={styles.infoBox}>
          <div className={styles.infoCardTitle}>{t("ข้อมูลผู้ขาย")}</div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t("รหัสผู้ขาย")}</span>
            <span className={styles.infoValue}>{data.sellerCode}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t("ชื่อผู้ขาย")}</span>
            <span className={styles.infoValue}>{data.sellerName}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t("ที่อยู่")}</span>
            <span className={styles.infoValue}>
              {data.sellerAddress || "—"}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t("เลขผู้เสียภาษี")}</span>
            <span className={styles.infoValue}>{data.sellerTaxId || "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>{t("โทร")}</span>
            <span className={styles.infoValue}>{data.sellerPhone || "—"}</span>
          </div>
        </div>
        <div className={styles.infoBox}>
          <div className={styles.infoCardTitle}>{t("ข้อมูลเอกสาร")}</div>
          <div className={styles.metaGrid}>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>{t("เลขที่เอกสาร")}</span>
              <span className={styles.metaValue}>{data.documentNo}</span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>{t("วันที่เอกสาร")}</span>
              <span className={styles.metaValue}>
                {data.documentDate || "—"}
              </span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>{t("เลขที่อ้างอิง")}</span>
              <span className={styles.metaValue}>{data.receiptNo}</span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>{t("วันที่ส่งสินค้า")}</span>
              <span className={styles.metaValue}>{data.deliveryDate}</span>
            </div>
            <div className={styles.metaCell}>
              <span className={styles.metaLabel}>{t("ทะเบียนรถ")}</span>
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
            <th style={{ width: 48 }}>{t("ลำดับ")}</th>
            <th>{t("รหัสสินค้า / รายละเอียด")}</th>
            <th style={{ width: 56 }}>{t("หน่วย")}</th>
            <th style={{ width: 72 }}>{t("จำนวน")}</th>
            <th style={{ width: 88 }}>{t("ราคาต่อหน่วย")}</th>
            <th style={{ width: 100 }}>{t("จำนวนเงินรวม")}</th>
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
                    {t("คลัง")} : {item.warehouse}
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
          <div className={styles.remarkLabel}>{t("หมายเหตุ")}</div>
          <div className={styles.remarkBody}>{data.remark}</div>
          <div className={styles.bahtText}>( {bahtText} )</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span>{t("รวมเป็นเงิน")}</span>
            <strong>{data.subtotalAmount}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>{t("ยอดหัก")}</span>
            <strong>{data.discountAmount}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>{t("หลังหัก")}</span>
            <strong>{data.afterDiscountAmount}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>{t("ภาษีมูลค่าเพิ่ม 7%")}</span>
            <strong>{data.vatAmount}</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.summaryNet}`}>
            <span>{t("ยอดเงินสุทธิ")}</span>
            <strong>{data.netAmount}</strong>
          </div>
        </div>
      </div>

      <div className={styles.signatures}>
        <div className={styles.sig}>
          <div className={styles.sigLine} />
          <div className={styles.sigName}>{data.preparedBy}</div>
          <div className={styles.sigRole}>{t("ผู้จัดทำ")}</div>
          <div className={styles.sigDate}>{t("วันที่ ____ / ____ / ________")}</div>
        </div>
        <div className={styles.sig}>
          <div className={styles.sigLine} />
          <div className={styles.sigName}>{data.verifiedBy}</div>
          <div className={styles.sigRole}>{t("ผู้ตรวจสอบ")}</div>
          <div className={styles.sigDate}>{t("วันที่ ____ / ____ / ________")}</div>
        </div>
        <div className={styles.sig}>
          <div className={styles.sigLine} />
          <div className={styles.sigName}>{data.approvedBy}</div>
          <div className={styles.sigRole}>{t("ผู้อนุมัติ")}</div>
          <div className={styles.sigDate}>{t("วันที่ ____ / ____ / ________")}</div>
        </div>
      </div>
    </article>
  );
}
