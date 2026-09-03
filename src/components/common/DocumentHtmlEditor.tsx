"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { Button } from "antd";
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  CheckSquareOutlined,
  ClearOutlined,
  CodeOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";

import styles from "./DocumentHtmlEditor.module.css";

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
};

function JustifyAlignIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden
    >
      <rect x="1" y="2" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="5.5" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="9" width="14" height="1.5" rx="0.5" />
      <rect x="1" y="12.5" width="14" height="1.5" rx="0.5" />
    </svg>
  );
}

function runCommand(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function closestInEditor(
  node: Node | null,
  selector: string,
  root: HTMLElement,
): HTMLElement | null {
  const start =
    node instanceof Element ? node : (node?.parentElement ?? null);
  const match = start?.closest(selector);
  if (match instanceof HTMLElement && root.contains(match)) {
    return match;
  }
  return null;
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

  const emit = () => {
    onChange?.(surfaceRef.current?.innerHTML ?? "");
  };

  const apply = (command: string, commandValue?: string) => {
    surfaceRef.current?.focus();
    runCommand(command, commandValue);
    emit();
  };

  const applyBlock = (tag: "h1" | "h2" | "pre" | "p") => {
    surfaceRef.current?.focus();
    runCommand("formatBlock", `<${tag}>`);
    emit();
  };

  const applyChecklist = () => {
    const root = surfaceRef.current;
    if (!root) {
      return;
    }
    root.focus();
    runCommand("insertUnorderedList");
    const selection = window.getSelection();
    const ul = closestInEditor(selection?.anchorNode ?? null, "ul", root);
    if (ul) {
      ul.setAttribute("data-task", "");
    }
    emit();
  };

  const clearFormatting = () => {
    surfaceRef.current?.focus();
    runCommand("removeFormat");
    runCommand("formatBlock", "<p>");
    emit();
  };

  const handleTaskClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    const root = surfaceRef.current;
    const target = event.target;
    if (!root || !(target instanceof Element)) {
      return;
    }
    const li = closestInEditor(target, 'ul[data-task] li', root);
    if (!li) {
      return;
    }
    const rect = li.getBoundingClientRect();
    if (event.clientX - rect.left > 22) {
      return;
    }
    event.preventDefault();
    if (li.getAttribute("data-checked") === "true") {
      li.removeAttribute("data-checked");
    } else {
      li.setAttribute("data-checked", "true");
    }
    emit();
  };

  return (
    <div className={styles.wrap}>
      {disabled ? null : (
        <div className={styles.toolbar} role="toolbar" aria-label="จัดรูปแบบข้อความ">
          <div className={styles.group}>
            <Button
              type="text"
              size="small"
              icon={<BoldOutlined />}
              aria-label="ตัวหนา"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("bold");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<ItalicOutlined />}
              aria-label="ตัวเอียง"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("italic");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<UnderlineOutlined />}
              aria-label="ขีดเส้นใต้"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("underline");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<StrikethroughOutlined />}
              aria-label="ขีดฆ่า"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("strikeThrough");
              }}
            />
          </div>
          <span className={styles.divider} aria-hidden />
          <div className={styles.group}>
            <Button
              type="text"
              size="small"
              className={styles.headingBtn}
              aria-label="หัวข้อใหญ่"
              onMouseDown={(event) => {
                event.preventDefault();
                applyBlock("h1");
              }}
            >
              H1
            </Button>
            <Button
              type="text"
              size="small"
              className={styles.headingBtn}
              aria-label="หัวข้อรอง"
              onMouseDown={(event) => {
                event.preventDefault();
                applyBlock("h2");
              }}
            >
              H2
            </Button>
          </div>
          <span className={styles.divider} aria-hidden />
          <div className={styles.group}>
            <Button
              type="text"
              size="small"
              icon={<UnorderedListOutlined />}
              aria-label="รายการหัวข้อ"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("insertUnorderedList");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<OrderedListOutlined />}
              aria-label="รายการลำดับ"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("insertOrderedList");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<CheckSquareOutlined />}
              aria-label="เช็กลิสต์"
              onMouseDown={(event) => {
                event.preventDefault();
                applyChecklist();
              }}
            />
          </div>
          <span className={styles.divider} aria-hidden />
          <div className={styles.group}>
            <Button
              type="text"
              size="small"
              icon={<AlignLeftOutlined />}
              aria-label="จัดชิดซ้าย"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("justifyLeft");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<AlignCenterOutlined />}
              aria-label="จัดกึ่งกลาง"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("justifyCenter");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<AlignRightOutlined />}
              aria-label="จัดชิดขวา"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("justifyRight");
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<JustifyAlignIcon />}
              aria-label="จัดชิดเสม่อ"
              onMouseDown={(event) => {
                event.preventDefault();
                apply("justifyFull");
              }}
            />
          </div>
          <span className={styles.divider} aria-hidden />
          <div className={styles.group}>
            <Button
              type="text"
              size="small"
              icon={<CodeOutlined />}
              aria-label="โค้ด"
              onMouseDown={(event) => {
                event.preventDefault();
                applyBlock("pre");
              }}
            />
          </div>
          <span className={styles.divider} aria-hidden />
          <div className={styles.group}>
            <Button
              type="text"
              size="small"
              icon={<ClearOutlined />}
              aria-label="ล้างรูปแบบ"
              onMouseDown={(event) => {
                event.preventDefault();
                clearFormatting();
              }}
            />
          </div>
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
          onChange?.(sanitizeDocumentHtml(surfaceRef.current?.innerHTML ?? ""));
        }}
        onInput={emit}
        onClick={handleTaskClick}
      />
    </div>
  );
}
