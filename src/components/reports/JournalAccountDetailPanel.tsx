"use client";

import type { ReactNode } from "react";
import { Button, Tag, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";

import type { JournalLine } from "@/types/purchase-journal";

import styles from "./JournalAccountDetailPanel.module.css";

const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyOrBlank = (value: number) => (value > 0 ? money.format(value) : "—");

function vatTag(line: JournalLine) {
  if (line.taxGroup === "VAT") {
    return <Tag color="green">{line.vatRate ? `มี VAT ${line.vatRate}%` : "มี VAT"}</Tag>;
  }
  if (line.taxGroup === "NON_VAT") return <Tag>ไม่มี VAT</Tag>;
  return null;
}

export type JournalAccountMetaItem = {
  label: string;
  value: ReactNode;
};

type Props = {
  docNo: ReactNode;
  typeTag?: ReactNode;
  meta: JournalAccountMetaItem[];
  references?: ReactNode;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  onClose: () => void;
};

export default function JournalAccountDetailPanel({
  docNo,
  typeTag,
  meta,
  references,
  lines,
  totalDebit,
  totalCredit,
  onClose,
}: Props) {
  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="ปิดรายละเอียด" onClick={onClose} />
      <aside className={styles.panel} aria-label="รายละเอียดเอกสาร">
        <header className={styles.panelHeader}>
          <div className={styles.panelTitleBlock}>
            <h3 className={styles.panelDocNo}>{docNo}</h3>
            {typeTag ? <div className={styles.panelTags}>{typeTag}</div> : null}
          </div>
          <Button type="text" icon={<CloseOutlined />} aria-label="ปิด" onClick={onClose} />
        </header>

        <div className={styles.panelBody}>
          <div className={styles.metaList}>
            {meta.map((item) => (
              <div key={item.label} className={styles.metaRow}>
                <span className={styles.metaLabel}>{item.label}</span>
                <div className={styles.metaValue}>{item.value ?? "—"}</div>
              </div>
            ))}
            {references ? (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>เอกสารอ้างอิง</span>
                <div className={styles.metaValue}>{references}</div>
              </div>
            ) : null}
          </div>

          <section>
            <h4 className={styles.sectionTitle}>รายละเอียดบัญชี</h4>
            {lines.length === 0 ? (
              <Typography.Text className={styles.emptyLines} type="secondary">
                ไม่มีบรรทัดบัญชี
              </Typography.Text>
            ) : (
              <div className={styles.lineList}>
                {lines.map((line) => (
                  <div key={line.no} className={styles.lineItem}>
                    <div className={styles.lineTop}>
                      <span className={styles.lineNo}>{line.no}</span>
                      <div className={styles.lineAccount}>
                        {line.accountCode ? (
                          <span className={styles.lineCode}>{line.accountCode}</span>
                        ) : (
                          <Tag color="red">ยังไม่ผูกบัญชี</Tag>
                        )}
                        <span className={styles.lineName}>{line.accountName ?? "—"}</span>
                      </div>
                      <div className={styles.lineAmounts}>
                        <div className={styles.lineDebit}>
                          <span className={styles.amountLabel}>Dr</span>
                          {moneyOrBlank(line.debit)}
                        </div>
                        <div className={styles.lineCredit}>
                          <span className={styles.amountLabel}>Cr</span>
                          {moneyOrBlank(line.credit)}
                        </div>
                      </div>
                    </div>
                    <div className={styles.lineDesc}>
                      <span>
                        {line.description}
                        {line.detail ? (
                          <Typography.Text type="secondary"> · {line.detail}</Typography.Text>
                        ) : null}
                      </span>
                      {vatTag(line)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className={styles.totals}>
            <div className={styles.totalChip}>
              <span className={styles.totalLabel}>ยอดรวม Debit</span>
              <span className={styles.totalValue}>{money.format(totalDebit)}</span>
            </div>
            <div className={styles.totalChip}>
              <span className={styles.totalLabel}>ยอดรวม Credit</span>
              <span className={styles.totalValue}>{money.format(totalCredit)}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export { styles as journalMasterDetailStyles };
