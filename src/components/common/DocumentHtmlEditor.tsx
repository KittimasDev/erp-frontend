"use client";

import { useEffect, useRef } from "react";
import { Button } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";

import styles from "./DocumentHtmlEditor.module.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
};

function runCommand(command: string) {
  document.execCommand(command, false);
}

export default function DocumentHtmlEditor({
  value,
  onChange,
  disabled,
  ariaLabel,
  placeholder,
}: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(false);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || focusedRef.current) {
      return;
    }
    const next = value || "";
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  const apply = (command: string) => {
    surfaceRef.current?.focus();
    runCommand(command);
    onChange(surfaceRef.current?.innerHTML ?? "");
  };

  return (
    <div className={styles.wrap}>
      {disabled ? null : (
        <div className={styles.toolbar} role="toolbar" aria-label="จัดรูปแบบข้อความ">
          <Button
            size="small"
            icon={<BoldOutlined />}
            aria-label="ตัวหนา"
            onMouseDown={(event) => {
              event.preventDefault();
              apply("bold");
            }}
          />
          <Button
            size="small"
            icon={<ItalicOutlined />}
            aria-label="ตัวเอียง"
            onMouseDown={(event) => {
              event.preventDefault();
              apply("italic");
            }}
          />
          <Button
            size="small"
            icon={<UnderlineOutlined />}
            aria-label="ขีดเส้นใต้"
            onMouseDown={(event) => {
              event.preventDefault();
              apply("underline");
            }}
          />
          <Button
            size="small"
            icon={<UnorderedListOutlined />}
            aria-label="รายการหัวข้อ"
            onMouseDown={(event) => {
              event.preventDefault();
              apply("insertUnorderedList");
            }}
          />
          <Button
            size="small"
            icon={<OrderedListOutlined />}
            aria-label="รายการลำดับ"
            onMouseDown={(event) => {
              event.preventDefault();
              apply("insertOrderedList");
            }}
          />
        </div>
      )}
      <div
        ref={surfaceRef}
        className={styles.surface}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          onChange(sanitizeDocumentHtml(surfaceRef.current?.innerHTML ?? ""));
        }}
        onInput={() => {
          onChange(surfaceRef.current?.innerHTML ?? "");
        }}
      />
    </div>
  );
}
