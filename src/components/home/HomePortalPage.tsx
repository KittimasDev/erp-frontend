"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Tooltip } from "antd";
import MenuSearchPalette from "./MenuSearchPalette";
import { ArrowRightOutlined, CalendarOutlined, SearchOutlined } from "@ant-design/icons";
import { moduleIcon } from "./module-icons";

import {
  getStoredPermissions,
  PERMISSIONS_UPDATED_EVENT,
} from "@/lib/auth/permissions-access";
import {
  clearActivePortalModule,
  setActivePortalModule,
  type PortalModuleKey,
} from "@/lib/auth/portal-module";
import {
  getStoredUser,
  type StoredUser,
} from "@/lib/auth/session";
import {
  badgeBreakdownForScreenCodes,
  badgeLabelForBreakdown,
  useMenuBadgeCounts,
} from "@/hooks/badges/useMenuBadgeCounts";
import {
  getVisiblePortalModules,
  resolvePortalHref,
  type PortalModuleDef,
  type PortalModuleTone,
} from "./portal-modules";
import TodayWorkCarousel from "./TodayWorkCarousel";
import styles from "./HomePortalPage.module.css";

const TONE_CLASS: Record<PortalModuleTone, string> = {
  green: styles.toneGreen,
  teal: styles.toneTeal,
  olive: styles.toneOlive,
  amber: styles.toneAmber,
  slate: styles.toneSlate,
  indigo: styles.toneIndigo,
  rose: styles.toneRose,
  cyan: styles.toneCyan,
  stone: styles.toneStone,
};

function formatThaiDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function HomePortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [todayLabel, setTodayLabel] = useState("");
  const [permsTick, setPermsTick] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  // จำนวนคอลัมน์จริงของกริด (เปลี่ยนตามความกว้างหน้าจอ) — ไว้ให้การ์ดแถวเดียวกันขึ้นพร้อมกัน
  const [cols, setCols] = useState(5);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
    setTodayLabel(formatThaiDate(new Date()));
    // หน้าแรก = ออกจากโหมดโมดูล เมนูด้านข้างจะว่างจนกดกล่องใหม่
    clearActivePortalModule();
  }, []);

  // ทางลัด: Ctrl/Cmd + K หรือ "/" (ตอนไม่ได้พิมพ์อยู่ในช่องอื่น) เปิดช่องค้นหาเมนู
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isCombo || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const n = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (n > 0) setCols(n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mounted, permsTick]);

  useEffect(() => {
    const onPermissionsUpdated = () => {
      setUser(getStoredUser());
      setPermsTick((n) => n + 1);
    };
    window.addEventListener(PERMISSIONS_UPDATED_EVENT, onPermissionsUpdated);
    return () => {
      window.removeEventListener(
        PERMISSIONS_UPDATED_EVENT,
        onPermissionsUpdated,
      );
    };
  }, []);

  const modules = useMemo(() => {
    if (!mounted) return [] as PortalModuleDef[];
    return getVisiblePortalModules();
  }, [mounted, user, permsTick]);

  /**
   * ยอดคิวค้างของทุกเมนูจากทะเบียนกลาง — กล่องรวมยอดเองจาก screenCodes
   * เดิมที่นี่เรียก hook ทีละตัวแล้วบวกมือ ทำให้ badge ที่เพิ่มใหม่ตกหล่นบ่อย
   */
  const badgeCounts = useMenuBadgeCounts({ enabled: mounted });

  const displayName = user?.displayName || user?.username || "ผู้ใช้งาน";

  const openModule = (mod: PortalModuleDef) => {
    setActivePortalModule(mod.key as PortalModuleKey);
    router.push(resolvePortalHref(mod));
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SMT ENERGY · PORTAL</p>
          <h1 className={styles.heroTitle}>
            สวัสดี, <span className={styles.heroName}>{displayName}</span>
          </h1>
          <p className={styles.heroLead}>
            เลือกโมดูลเพื่อเริ่มงาน — แสดงเฉพาะระบบที่คุณมีสิทธิ์
            แล้วเมนูด้านข้างจะเหลือเฉพาะโมดูลที่เลือก
          </p>
          <button
            type="button"
            className={styles.searchTrigger}
            onClick={() => setSearchOpen(true)}
            aria-label="ค้นหาเมนู"
            aria-keyshortcuts="Control+K Meta+K /"
          >
            <SearchOutlined className={styles.searchIcon} />
            <span className={styles.searchPlaceholder}>
              ค้นหาเมนู เช่น ตั๋วชั่ง · ใบสั่งผลิต · ยอดคงเหลือ
            </span>
            <span className={styles.searchKeys} aria-hidden>
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
          </button>
          {todayLabel ? (
            <p className={styles.heroDate}>
              <CalendarOutlined aria-hidden />
              {todayLabel}
            </p>
          ) : (
            <p className={styles.heroDate}>&nbsp;</p>
          )}
        </div>
        <div className={styles.heroMeta}>
          <TodayWorkCarousel counts={badgeCounts} />
        </div>
      </header>

      {!mounted ? (
        <div className={styles.grid} aria-busy="true" aria-label="กำลังโหลดเมนู">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.tileSkeleton} />
          ))}
        </div>
      ) : modules.length === 0 ? (
        <div className={styles.empty}>
          {getStoredPermissions()?.mode === "matrix" &&
          (getStoredPermissions()?.screenCodes?.length ?? 0) === 0
            ? "ยังไม่ได้ติ๊กสิทธิ์ใน Permission Matrix — ติดต่อผู้ดูแลระบบเพื่อกำหนดสิทธิ์หน้าจอ"
            : "ยังไม่มีโมดูลตามสิทธิ์ของคุณ — ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน"}
        </div>
      ) : (
        <div className={styles.grid} ref={gridRef}>
          {modules.map((mod, index) => {
            const breakdown = badgeBreakdownForScreenCodes(
              badgeCounts,
              mod.screenCodes,
            );
            const pendingBadgeCount = breakdown.reduce(
              (sum, item) => sum + item.count,
              0,
            );
            const showPendingBadge = pendingBadgeCount > 0;
            const pendingBadgeLabel = badgeLabelForBreakdown(breakdown);
            const breakdownText = breakdown
              .map((item) => `${item.label} ${item.count}`)
              .join(" · ");

            const tile = (
              <Badge
                count={showPendingBadge ? pendingBadgeCount : 0}
                overflowCount={99}
                offset={[-6, 8]}
                className={styles.tileBadgeWrap}
              >
                <button
                  type="button"
                  className={`${styles.tile} ${TONE_CLASS[mod.tone]}`}
                  style={{ ["--row" as string]: Math.floor(index / cols) }}
                  onClick={() => openModule(mod)}
                  aria-label={
                    showPendingBadge
                      ? `${mod.label} — ${mod.description} — ${pendingBadgeLabel} ${pendingBadgeCount} รายการ: ${breakdownText}`
                      : `${mod.label} — ${mod.description}`
                  }
                >
                  <span className={styles.tileTop}>
                    <span className={styles.tileIcon}>{moduleIcon(mod.key)}</span>
                    <span className={styles.tileCode}>{mod.code}</span>
                  </span>
                  <span className={styles.tileLabel}>{mod.label}</span>
                  <span className={styles.tileDesc}>{mod.description}</span>
                  <span className={styles.tileGo} aria-hidden>
                    <ArrowRightOutlined />
                  </span>
                </button>
              </Badge>
            );

            // กล่องที่รวมหลายคิว เลขเปล่า ๆ อ่านไม่รู้ว่ามาจากเมนูไหน
            return breakdown.length > 1 ? (
              <Tooltip
                key={mod.key}
                title={
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {pendingBadgeLabel} {pendingBadgeCount} รายการ
                    </div>
                    {breakdown.map((item) => (
                      <div key={item.menuKey}>
                        {item.label} · {item.count}
                      </div>
                    ))}
                  </div>
                }
              >
                <span className={styles.tileBadgeWrap}>{tile}</span>
              </Tooltip>
            ) : (
              <span key={mod.key}>{tile}</span>
            );
          })}
        </div>
      )}
      <MenuSearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </section>
  );
}
