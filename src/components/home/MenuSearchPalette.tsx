"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  EnterOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import {
  getSearchableMenuEntries,
  type SearchableMenuEntry,
} from "@/components/navbar/AppHeader";
import styles from "./MenuSearchPalette.module.css";

const RECENT_KEY = "erp:menu-search:recent";
const RECENT_MAX = 5;
const RESULT_MAX = 30;

const norm = (s: string) => s.toLocaleLowerCase("th-TH").trim();

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRecent(href: string) {
  try {
    const next = [href, ...readRecent().filter((h) => h !== href)].slice(
      0,
      RECENT_MAX,
    );
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ใช้งานต่อได้แม้เก็บประวัติไม่ได้ */
  }
}

function scoreEntry(entry: SearchableMenuEntry, tokens: string[]): number {
  const label = norm(entry.label);
  const parent = norm(entry.parent ?? "");
  const group = norm(entry.group);
  const href = norm(entry.href);
  let total = 0;
  for (const t of tokens) {
    if (label.startsWith(t)) total += 4;
    else if (label.includes(t)) total += 3;
    else if (parent.includes(t)) total += 2;
    else if (group.includes(t)) total += 1;
    else if (href.includes(t)) total += 1;
    else return 0; // ทุกคำต้องเจอ
  }
  return total;
}

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>;
  const pattern = new RegExp(
    `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={styles.mark}>
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

type Props = { open: boolean; onClose: () => void };

/** ช่องค้นหาเมนูแบบ command palette — ค้นจากเมนูที่ผู้ใช้มีสิทธิ์เท่านั้น */
export default function MenuSearchPalette({ open, onClose }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [entries, setEntries] = useState<SearchableMenuEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    setEntries(getSearchableMenuEntries());
    setRecent(readRecent());
    setQuery("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const tokens = useMemo(
    () => norm(query).split(/\s+/).filter(Boolean),
    [query],
  );

  const results = useMemo(() => {
    if (tokens.length === 0) {
      const byHref = new Map(entries.map((e) => [e.href, e]));
      return recent
        .map((h) => byHref.get(h))
        .filter((e): e is SearchableMenuEntry => Boolean(e));
    }
    return entries
      .map((entry, index) => ({ entry, index, score: scoreEntry(entry, tokens) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, RESULT_MAX)
      .map((r) => r.entry);
  }, [entries, recent, tokens]);

  const go = useCallback(
    (entry: SearchableMenuEntry) => {
      writeRecent(entry.href);
      onClose();
      router.push(entry.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open || typeof document === "undefined") return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      const target = results[active];
      if (target) {
        e.preventDefault();
        go(target);
      }
    }
  };

  const renderRow = (entry: SearchableMenuEntry, index: number): ReactNode => (
    <button
      key={entry.href}
      type="button"
      role="option"
      aria-selected={index === active}
      data-index={index}
      style={{ ["--i" as string]: Math.min(index, 12) }}
      className={`${styles.row} ${index === active ? styles.rowActive : ""}`}
      onMouseMove={() => setActive(index)}
      onClick={() => go(entry)}
    >
      <span className={styles.rowIcon}>{entry.icon}</span>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>
          <Highlight text={entry.label} tokens={tokens} />
        </span>
        <span className={styles.rowCrumb}>
          {entry.group}
          {entry.parent ? ` › ${entry.parent}` : ""}
        </span>
      </span>
      <span className={styles.rowGo}>
        {index === active ? <EnterOutlined /> : <ArrowRightOutlined />}
      </span>
    </button>
  );

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหาเมนู"
        onKeyDown={onKeyDown}
      >
        <div className={styles.inputWrap}>
          <SearchOutlined className={styles.inputIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเมนู เช่น ตั๋วชั่ง, ใบสั่งผลิต, ยอดคงเหลือ…"
            aria-label="ค้นหาเมนู"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>

        <div className={styles.body} ref={listRef} role="listbox">
          {tokens.length === 0 ? (
            results.length > 0 ? (
              <>
                <div className={styles.sectionTitle}>
                  <ClockCircleOutlined /> เปิดล่าสุด
                </div>
                {results.map(renderRow)}
              </>
            ) : (
              <div className={styles.hint}>
                <SearchOutlined className={styles.hintIcon} />
                <p>พิมพ์ชื่อเมนู หรือชื่อกลุ่มงาน เพื่อไปยังหน้านั้นทันที</p>
                <span>
                  ค้นเจอเฉพาะเมนูที่คุณมีสิทธิ์ใช้งาน
                  {entries.length > 0 ? ` · ทั้งหมด ${entries.length} เมนู` : ""}
                </span>
              </div>
            )
          ) : results.length === 0 ? (
            <div className={styles.hint}>
              <SearchOutlined className={styles.hintIcon} />
              <p>ไม่พบเมนูที่ตรงกับ “{query.trim()}”</p>
              <span>ลองใช้คำสั้นลง หรือค้นด้วยชื่อกลุ่มงาน เช่น คลัง · ผลิต · ขาย</span>
            </div>
          ) : (
            <>
              <div className={styles.sectionTitle}>
                ผลการค้นหา · {results.length} เมนู
              </div>
              {results.map(renderRow)}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <span>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd> เลือก
          </span>
          <span>
            <kbd className={styles.kbd}>Enter</kbd> เปิดหน้า
          </span>
          <span>
            <kbd className={styles.kbd}>Esc</kbd> ปิด
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
