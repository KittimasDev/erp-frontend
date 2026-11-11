"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useT } from "@/lib/i18n/useT";
import {
  resolveListFlowBadge,
  type ListFlowSource,
} from "./procurementFlow";
import styles from "./ProcurementFlow.module.css";

type Props = {
  source: ListFlowSource;
};

const TONE_CLASS = {
  active: styles.toneActive,
  done: styles.toneDone,
  error: styles.toneError,
  wait: styles.toneWait,
  rejected: styles.toneRejected,
} as const;

export default function ProcurementFlowBadge({ source }: Props) {
  const t = useT();
  const { label, tone, href } = resolveListFlowBadge(source);
  const className = `${styles.badge} ${TONE_CLASS[tone]}${
    href ? ` ${styles.badgeLink}` : ""
  }`;

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        title={t("ไปสร้างใบสั่งซื้อ")}
        onClick={(e) => e.stopPropagation()}
      >
        <span className={styles.badgeDot} aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <span className={className}>
      <span className={styles.badgeDot} aria-hidden />
      {label}
    </span>
  );
}

export function DocNoWithFlowBadge({
  no,
  source,
}: {
  no: ReactNode;
  source: ListFlowSource;
}) {
  return (
    <div className={styles.cellWithBadge}>
      {no}
      <ProcurementFlowBadge source={source} />
    </div>
  );
}
