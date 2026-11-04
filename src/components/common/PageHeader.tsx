"use client";

import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { moduleIcon } from "@/components/home/module-icons";
import { inferPortalModuleFromPathname } from "@/lib/auth/portal-module";
import { PAGE_HEADER_EYEBROW } from "@/lib/page-header-meta";

import styles from "./PageHeader.module.css";

export type PageHeaderProps = {
  /** ชื่อหน้า — แสดงเป็น <h1> */
  title: ReactNode;
  subtitle?: ReactNode;
  /** ข้อความป้ายเล็กเหนือชื่อ — ไม่ส่ง = ชื่อโมดูลภาษาอังกฤษของเมนูที่หน้านี้สังกัด */
  eyebrow?: string;
  /** ไอคอนในป้าย — ไม่ส่ง = ไอคอนประจำโมดูล */
  icon?: ReactNode;
  /** แถวปุ่ม/ลิงก์ย้อนกลับเหนือป้าย (หน้ารายละเอียด/ฟอร์ม) */
  back?: ReactNode;
  /** แถว chip / Tag สถานะ / ลิงก์เอกสาร ใต้คำอธิบาย */
  meta?: ReactNode;
  /** ตัวควบคุมที่อยู่ระหว่างข้อความกับปุ่ม เช่น สวิตช์ วันนี้/ทั้งหมด */
  controls?: ReactNode;
  /** ปุ่มชิดขวา — ไม่ render กล่องถ้าว่าง */
  actions?: ReactNode;
  /** แถวพิเศษใต้ชื่อ (เช่น revisionStamp) */
  children?: ReactNode;
  className?: string;
};

/**
 * หัวหน้ามาตรฐานของทั้งระบบ — หน้าตาตามต้นแบบ /reports/receiving
 * ปุ่มทุกตัวของหน้าส่งผ่าน `actions` (ไม่แก้ handler/สิทธิ์ของหน้าเดิม)
 */
export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon,
  back,
  meta,
  controls,
  actions,
  children,
  className,
}: PageHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const moduleKey = pathname ? inferPortalModuleFromPathname(pathname, searchParams) : null;

  const badgeText = eyebrow ?? (moduleKey ? PAGE_HEADER_EYEBROW[moduleKey] : undefined);
  const badgeIcon = icon ?? (moduleKey ? moduleIcon(moduleKey) : null);

  return (
    <header className={[styles.hero, className].filter(Boolean).join(" ")}>
      <div className={styles.main}>
        {back ? <div className={styles.back}>{back}</div> : null}
        {badgeText ? (
          <div className={styles.badge}>
            {badgeIcon ? (
              <span className={styles.badgeIcon} aria-hidden>
                {badgeIcon}
              </span>
            ) : null}
            <span className={styles.badgeText}>{badgeText}</span>
          </div>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        {meta ? <div className={styles.meta}>{meta}</div> : null}
        {children}
      </div>
      {controls ? <div className={styles.controls}>{controls}</div> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
