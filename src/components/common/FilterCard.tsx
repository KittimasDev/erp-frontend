"use client";

import type { FormEvent, ReactNode } from "react";
import { Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

import { useT } from "@/lib/i18n/useT";

import styles from "./FilterCard.module.css";

type FilterCardProps = {
  children: ReactNode;
  /** กด "ค้นหา" หรือ Enter ในช่องกรอก — ควรนำ draft filters ไปตั้งเป็น applied filters และรีเซ็ตหน้าเป็น 1 */
  onSearch: () => void;
  /** กด "ล้าง" — คืน draft + applied เป็นค่าเริ่มต้นของหน้า */
  onClear: () => void;
  /** ระหว่างโหลดผลค้นหา — ป้องกันกดค้นหาซ้ำ */
  loading?: boolean;
};

/** กล่องตัวกรองมาตรฐาน: ฟิลด์เรียงเป็นกริด + ปุ่ม ล้าง (secondary) / ค้นหา (primary) ชิดขวาล่าง */
export default function FilterCard({ children, onSearch, onClear, loading }: FilterCardProps) {
  const t = useT();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!loading) onSearch();
  };
  return (
    <form className={styles.card} onSubmit={submit} onReset={(e) => e.preventDefault()}>
      <div className={styles.grid}>{children}</div>
      <div className={styles.actions}>
        <Button onClick={onClear} disabled={loading}>
          {t("ล้าง")}
        </Button>
        <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
          {t("ค้นหา")}
        </Button>
      </div>
    </form>
  );
}

type FilterFieldProps = { label: ReactNode; children: ReactNode; wide?: boolean };

/** ช่องกรอกหนึ่งช่องในกริด — label เล็กอยู่บน, wide = กว้าง 2 คอลัมน์ (เช่น ช่วงวันที่) */
export function FilterField({ label, children, wide }: FilterFieldProps) {
  return (
    <div className={`${styles.item} ${wide ? styles.wide : ""}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
