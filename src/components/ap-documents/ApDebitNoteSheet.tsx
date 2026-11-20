"use client";

import { useEffect, useState } from "react";

import { ensureCompanyInfo, type CompanyInfoSnapshot } from "@/lib/company/company-info";
import type { ApDocument } from "@/types/ap-documents";

import { buildApDebitNoteSheetHtml } from "./apDebitNoteSheetHtml";

/** แผ่นเอกสารใบเพิ่มหนี้บนหน้ารายละเอียด — โครงเดียวกับไฟล์ PDF */
export default function ApDebitNoteSheet({ doc }: { doc: ApDocument }) {
  const [company, setCompany] = useState<CompanyInfoSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    void ensureCompanyInfo()
      .then((snapshot) => {
        if (active) setCompany(snapshot);
      })
      .catch(() => {
        if (active) setCompany(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: buildApDebitNoteSheetHtml(doc, company, "screen"),
      }}
    />
  );
}
