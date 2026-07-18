"use client";

import type { ReactNode } from "react";

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
} as const;

export default function ProcurementFlowBadge({ source }: Props) {
  const { label, tone } = resolveListFlowBadge(source);
  return (
    <span className={`${styles.badge} ${TONE_CLASS[tone]}`}>
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
