"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";

import {
  ensureCompanyInfo,
  type CompanyInfoSnapshot,
} from "@/lib/company/company-info";
import { useT } from "@/lib/i18n/useT";

import styles from "./document-paper.module.css";

export type PaperField = {
  label: string;
  value: ReactNode;
};

export type PaperPanel = {
  title: string;
  rows: PaperField[];
};

type Props = {
  titleTh: string;
  titleEn?: string;
  meta: PaperField[];
  panels?: PaperPanel[];
  children?: ReactNode;
  /** false = ไม่แสดงเส้นเซ็น เช่น เอกสารที่เซ็นในระบบอยู่แล้วและไม่อยากซ้ำ */
  signatures?: [string, string, string] | false;
};

export default function DocumentPaper({
  titleTh,
  titleEn,
  meta,
  panels,
  children,
  signatures,
}: Props) {
  const t = useT();
  const [company, setCompany] = useState<CompanyInfoSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    void ensureCompanyInfo().then((snapshot) => {
      if (active) setCompany(snapshot);
    });
    return () => {
      active = false;
    };
  }, []);

  const signs = signatures === false
    ? null
    : (signatures ?? [t("ผู้จัดทำ"), t("ผู้ตรวจสอบ"), t("ผู้อนุมัติ")]);
  const contact = [
    company?.phone ? `${t("โทร.")} : ${company.phone}` : "",
    company?.taxId ? `${t("เลขประจำตัวผู้เสียภาษี")} ${company.taxId}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className={styles.paper}>
      <header className={styles.paperHeader}>
        <div className={styles.paperBrand}>
          {company?.logoDataUrl || company?.logoUrl ? (
            <img
              src={company.logoDataUrl || company.logoUrl}
              alt=""
              className={styles.paperLogo}
            />
          ) : (
            <div className={styles.paperSymbol} aria-hidden="true">
              ◈
            </div>
          )}
          <div>
            <div className={styles.paperCompany}>{company?.nameTh || "—"}</div>
            {(company?.addressText || "—").split("\n").map((line, index) => (
              <div key={`${index}-${line}`} className={styles.paperAddress}>
                {line}
              </div>
            ))}
            {contact ? <div className={styles.paperAddress}>{contact}</div> : null}
          </div>
        </div>
        <div className={styles.paperDocTitle}>
          <strong>{titleTh}</strong>
          {titleEn ? <small>{titleEn}</small> : null}
        </div>
      </header>

      <div className={styles.paperMeta}>
        {meta.map((cell) => (
          <div key={cell.label}>
            <span>{cell.label}</span>
            <strong>{cell.value}</strong>
          </div>
        ))}
      </div>

      {panels && panels.length > 0 ? (
        <div
          className={styles.paperInfo}
          style={panels.length === 1 ? { gridTemplateColumns: "1fr" } : undefined}
        >
          {panels.map((panel) => (
            <section key={panel.title}>
              <h2>{panel.title}</h2>
              <div className={styles.paperKv}>
                {panel.rows.map((row, index) => (
                  <Fragment key={`${panel.title}-${index}`}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </Fragment>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {children ? <div className={styles.paperBody}>{children}</div> : null}

      {signs ? (
        <div className={styles.paperSigns}>
          {signs.map((role) => (
            <div key={role}>
              <div className={styles.paperSignLine} />
              <strong>{role}</strong>
              <span>{t("วันที่ _____/_____/_____")}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
