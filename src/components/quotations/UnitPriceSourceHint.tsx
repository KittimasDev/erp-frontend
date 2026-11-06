"use client";

import Link from "next/link";
import { Button, Popover, Tag } from "antd";

import { useLanguage } from "@/lib/i18n/language";
import { useT } from "@/lib/i18n/useT";
import type { Item } from "@/types/items";

import styles from "./UnitPriceSourceHint.module.css";

type Props = {
  /** สินค้าของบรรทัดนี้ — undefined = ยังไม่ได้เลือกสินค้า */
  item?: Item;
  /** ราคาที่กรอกอยู่ในบรรทัด */
  currentPrice?: number;
  /** มีสิทธิ์เข้าหน้าข้อมูลหลักสินค้าไหม — ไม่มี = ซ่อนลิงก์ */
  canViewItemMaster: boolean;
  /** เติมราคาตั้งต้นกลับลงช่องราคา */
  onUseBasePrice: () => void;
};

function formatMoney(value: number, lang: "th" | "en" = "th") {
  return value.toLocaleString(lang === "en" ? "en-GB" : "th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type HintState = "no-base" | "no-price" | "same" | "different";

const TAG_LABEL: Record<HintState, string> = {
  "no-base": "ยังไม่ได้ตั้งราคาขาย",
  "no-price": "ยังไม่ได้กรอกราคา",
  same: "ราคาจากข้อมูลหลักสินค้า",
  different: "ราคาต่างจากข้อมูลหลักสินค้า",
};

const TAG_COLOR: Record<HintState, string | undefined> = {
  "no-base": "warning",
  "no-price": "orange",
  same: undefined,
  different: "orange",
};

export default function UnitPriceSourceHint({
  item,
  currentPrice,
  canViewItemMaster,
  onUseBasePrice,
}: Props) {
  const t = useT();
  const lang = useLanguage();
  if (!item) {
    return null;
  }

  const basePrice = toFiniteNumber(item.sellingPrice);
  const price = toFiniteNumber(currentPrice);
  const unitLabel = item.unit?.nameTh ?? item.unit?.code ?? t("หน่วย");

  /*
    เทียบราคาแบบ string 4 ตำแหน่ง เพราะ sellingPrice จาก backend เป็น decimal(18,4)
    ที่ส่งมาเป็น string — เทียบ float ตรง ๆ จะเพี้ยนได้
  */
  const state: HintState =
    basePrice === null
      ? "no-base"
      : price === null
        ? "no-price"
        : basePrice.toFixed(4) === price.toFixed(4)
          ? "same"
          : "different";

  const diff =
    state === "different" && basePrice !== null && price !== null
      ? price - basePrice
      : null;
  const diffPercent =
    diff !== null && basePrice !== null && basePrice > 0
      ? (diff / basePrice) * 100
      : null;

  const masterLink = (
    <Link
      href={`/masters/items?code=${encodeURIComponent(item.itemCode)}`}
      target="_blank"
      rel="noreferrer"
    >
      {t("เปิดหน้าข้อมูลหลักสินค้า (แท็บใหม่)")}
    </Link>
  );

  const content = (
    <div className={styles.popoverBody}>
      <p className={styles.lead}>
        {t("ตั้งค่าที่")} <strong>{t("ข้อมูลหลักสินค้า")}</strong> → {t("ช่อง")} &ldquo;{t("ราคาขาย (ก่อน VAT)")}&rdquo;
      </p>

      <dl className={styles.detailList}>
        <div className={styles.detailRow}>
          <dt>{t("สินค้า")}</dt>
          <dd>
            {item.itemCode} — {item.itemNameTh}
          </dd>
        </div>
        <div className={styles.detailRow}>
          <dt>{t("ราคาตั้งต้น")}</dt>
          <dd>
            {basePrice === null
              ? t("ยังไม่กำหนด")
              : `${formatMoney(basePrice, lang)} ${t("บาท")} / ${unitLabel}`}
          </dd>
        </div>
        {state === "different" || state === "no-price" ? (
          <div className={styles.detailRow}>
            <dt>{t("ราคาที่ใช้ในใบนี้")}</dt>
            <dd>
              {price === null ? t("ยังไม่ได้กรอก") : `${formatMoney(price, lang)} ${t("บาท")}`}
            </dd>
          </div>
        ) : null}
        {diff !== null ? (
          <div className={styles.detailRow}>
            <dt>{t("ส่วนต่าง")}</dt>
            <dd className={diff > 0 ? styles.diffUp : styles.diffDown}>
              {diff > 0 ? "+" : "−"}
              {formatMoney(Math.abs(diff), lang)} {t("บาท")}
              {diffPercent !== null
                ? ` (${diff > 0 ? "+" : "−"}${Math.abs(diffPercent).toFixed(1)}%)`
                : ""}
            </dd>
          </div>
        ) : null}
      </dl>

      {state === "no-base" ? (
        <p className={styles.note}>
          {t("สินค้านี้ยังไม่มีราคาขายในข้อมูลหลัก ระบบจึงเติมราคาให้ไม่ได้ — กรอกราคาในใบนี้เองได้ หรือไปตั้งราคาที่ข้อมูลหลักสินค้าเพื่อให้ใบถัดไปเติมให้อัตโนมัติ")}
        </p>
      ) : null}

      {state === "different" ? (
        <p className={styles.note}>
          {t("อาจเกิดจากพิมพ์ราคาเอง หรือราคาในข้อมูลหลักถูกแก้ทีหลัง")}
        </p>
      ) : null}

      {basePrice !== null && state !== "same" ? (
        <Button
          size="small"
          block
          onClick={onUseBasePrice}
          className={styles.resetButton}
        >
          {t("ใช้ราคาตั้งต้น {price} บาท", { price: formatMoney(basePrice, lang) })}
        </Button>
      ) : null}

      <p className={styles.note}>
        {t("ระบบนี้ยังไม่มีตารางราคาหรือราคาเฉพาะลูกค้า — ราคาทุกใบอ้างจากข้อมูลหลักสินค้าจุดเดียว")}
      </p>

      <p className={styles.linkRow}>
        {canViewItemMaster
          ? masterLink
          : t("ตั้งค่าที่เมนูข้อมูลหลักสินค้า (บัญชีนี้ยังไม่มีสิทธิ์เข้าถึง)")}
      </p>
    </div>
  );

  return (
    <span className={styles.hintRow}>
      <Popover
        trigger="click"
        placement="bottomLeft"
        title={t("ที่มาของราคา")}
        content={content}
      >
        <Tag
          color={TAG_COLOR[state]}
          className={styles.hintTag}
          role="button"
          tabIndex={0}
        >
          {t(TAG_LABEL[state])} · {t("ดูที่มา")}
        </Tag>
      </Popover>
    </span>
  );
}
