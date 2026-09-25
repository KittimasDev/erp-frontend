"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Typography } from "antd";
import {
  ArrowRightOutlined,
  DatabaseOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import {
  canAccessAnyScreen,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { useMenuBadgeCounts } from "@/hooks/badges/useMenuBadgeCounts";
import styles from "./WarehouseHubPage.module.css";

export type WarehouseHubCard = {
  key: string;
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  disabledHint?: string;
  icon?: ReactNode;
  /** matrix mode: ซ่อนการ์ดถ้าไม่มีสิทธิ์สักตัว — ไม่ระบุ = แสดงเสมอ */
  screenCodes?: string[];
  /** legacy mode (ยังไม่ได้ตั้ง Permission Matrix) — ไม่ระบุ = แสดงเสมอ */
  roles?: string[];
  /** ยอดคิวค้างจาก MENU_BADGE_REGISTRY รวมได้หลาย key */
  badgeMenuKeys?: string[];
};

export type WarehouseHubSection = {
  key: string;
  /** เว้นว่าง = ไม่แสดงหัวข้อ (กริดเดียวแบบเดิม) */
  title: string;
  description?: string;
  cards: WarehouseHubCard[];
};

type WarehouseHubBaseProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  /** บล็อกที่แทรกเหนือกริดการ์ด เช่น KPI / กราฟ */
  headerExtra?: ReactNode;
  isLoading?: boolean;
};

type WarehouseHubPageProps = WarehouseHubBaseProps &
  (
    | { cards: WarehouseHubCard[]; sections?: never }
    | { sections: WarehouseHubSection[]; cards?: never }
  );

/**
 * การ์ดที่ไม่ผูกสิทธิ์ = แสดงเสมอ (พฤติกรรมเดิมของ hub) · ผูกแล้วแต่ไม่มีสิทธิ์ = **ซ่อน**
 * ไม่ใช่ disable — ให้ตรงกับ `filterMenus` ของ sidebar
 *
 * legacy mode (ยังไม่ได้ตั้ง Permission Matrix) ใช้ `roles` ถ้าระบุ ถ้าไม่ระบุให้แสดง
 * เพราะ `screenCodes` เป็นภาษาของ matrix ล้วน — เอามาตัดสินในโหมด legacy ไม่ได้
 * ตัวบังคับจริงยังเป็น backend เหมือนเดิม
 */
function canSeeCard(card: WarehouseHubCard): boolean {
  if (!card.screenCodes?.length && !card.roles?.length) {
    return true;
  }
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return card.screenCodes?.length
      ? canAccessAnyScreen(card.screenCodes)
      : false;
  }
  return card.roles?.length
    ? card.roles.some((role) => userHasRole(role))
    : true;
}

export default function WarehouseHubPage({
  eyebrow,
  title,
  subtitle,
  icon,
  headerExtra,
  isLoading,
  cards,
  sections,
}: WarehouseHubPageProps) {
  const router = useRouter();

  /*
    สิทธิ์อยู่ใน localStorage — กรองตั้งแต่ render แรกจะไม่ตรงกับ markup ฝั่ง server
    รอ mount ก่อนค่อยกรอง (MasterPageGate ซ่อน content อยู่ 2 เฟรมอยู่แล้ว ไม่เห็นกระพริบ)
  */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const badgeCounts = useMenuBadgeCounts({ enabled: mounted });

  const resolvedSections: WarehouseHubSection[] = sections ?? [
    { key: "__default", title: "", cards: cards ?? [] },
  ];

  const visibleSections = resolvedSections
    .map((section) => ({
      ...section,
      cards: mounted ? section.cards.filter(canSeeCard) : section.cards,
    }))
    .filter((section) => section.cards.length > 0);

  return (
    <MasterPageGate isLoading={isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>{icon ?? <DatabaseOutlined />}</div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>
        </div>

        {headerExtra}

        {visibleSections.length === 0 ? (
          <div className={styles.emptyState}>
            <Typography.Text type="secondary">
              ยังไม่มีเมนูที่คุณมีสิทธิ์เข้าใช้งานในหน้านี้
            </Typography.Text>
          </div>
        ) : (
          visibleSections.map((section) => (
            <div key={section.key} className={styles.section}>
              {section.title ? (
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  {section.description ? (
                    <p className={styles.sectionDesc}>{section.description}</p>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.cardGrid}>
                {section.cards.map((card) => {
                  const disabled = Boolean(card.disabled || !card.href);
                  const count = (card.badgeMenuKeys ?? []).reduce(
                    (sum, key) => sum + (badgeCounts[key] ?? 0),
                    0,
                  );

                  return (
                    <button
                      key={card.key}
                      type="button"
                      className={`${styles.hubCard} ${disabled ? styles.hubCardDisabled : ""}`}
                      disabled={disabled}
                      onClick={() => {
                        if (card.href) {
                          router.push(card.href);
                        }
                      }}
                    >
                      {card.icon ? (
                        <span className={styles.hubCardIcon} aria-hidden>
                          {card.icon}
                        </span>
                      ) : null}
                      <div className={styles.hubCardBody}>
                        <strong>
                          {card.title}
                          {count > 0 ? (
                            <span
                              className={styles.hubCardBadge}
                              aria-label={`${count} รายการรอดำเนินการ`}
                            >
                              {count > 99 ? "99+" : count}
                            </span>
                          ) : null}
                        </strong>
                        <Typography.Paragraph
                          type="secondary"
                          className={styles.hubCardDesc}
                        >
                          {card.description}
                        </Typography.Paragraph>
                        {disabled && card.disabledHint ? (
                          <Typography.Text
                            type="warning"
                            className={styles.hubCardHint}
                          >
                            {card.disabledHint}
                          </Typography.Text>
                        ) : null}
                      </div>
                      <span className={styles.hubCardArrow} aria-hidden>
                        {disabled ? <SwapOutlined /> : <ArrowRightOutlined />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </MasterPageGate>
  );
}
