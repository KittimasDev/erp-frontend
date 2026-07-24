"use client";

import { useRouter } from "next/navigation";
import { Typography } from "antd";
import {
  ArrowRightOutlined,
  DatabaseOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import MasterPageGate from "@/components/common/MasterPageGate";
import styles from "./WarehouseHubPage.module.css";

export type WarehouseHubCard = {
  key: string;
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  disabledHint?: string;
};

type WarehouseHubPageProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  cards: WarehouseHubCard[];
};

export default function WarehouseHubPage({
  eyebrow,
  title,
  subtitle,
  cards,
}: WarehouseHubPageProps) {
  const router = useRouter();

  return (
    <MasterPageGate>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <DatabaseOutlined />
          </div>
          <div className={styles.headerContent}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.cardGrid}>
          {cards.map((card) => {
            const disabled = Boolean(card.disabled || !card.href);

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
                <div className={styles.hubCardBody}>
                  <strong>{card.title}</strong>
                  <Typography.Paragraph
                    type="secondary"
                    className={styles.hubCardDesc}
                  >
                    {card.description}
                  </Typography.Paragraph>
                  {disabled && card.disabledHint ? (
                    <Typography.Text type="warning" className={styles.hubCardHint}>
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
      </section>
    </MasterPageGate>
  );
}
