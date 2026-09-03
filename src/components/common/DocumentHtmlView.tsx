"use client";

import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";

import styles from "./DocumentHtmlEditor.module.css";

type Props = {
  html?: string | null;
  emptyLabel?: string;
};

export default function DocumentHtmlView({
  html,
  emptyLabel = "—",
}: Props) {
  const safe = sanitizeDocumentHtml(html);
  if (!safe) {
    return <p className={styles.htmlBlock}>{emptyLabel}</p>;
  }
  return (
    <div
      className={styles.htmlBlock}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
