"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Tooltip } from "antd";
import {
  ExperimentOutlined,
  FundOutlined,
  InboxOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TruckOutlined,
  WalletOutlined,
} from "@ant-design/icons";

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

function moduleIcon(key: string) {
  switch (key) {
    case "raw-tire":
      return <TruckOutlined aria-hidden />;
    case "purchase":
      return <ShoppingCartOutlined aria-hidden />;
    case "rm-warehouse":
      return <InboxOutlined aria-hidden />;
    case "production":
      return <ThunderboltOutlined aria-hidden />;
    case "fg-warehouse":
      return <ShoppingOutlined aria-hidden />;
    case "sales":
      return <TeamOutlined aria-hidden />;
    case "laboratory":
      return <ExperimentOutlined aria-hidden />;
    case "finance":
      return <WalletOutlined aria-hidden />;
    case "reports":
      return <FundOutlined aria-hidden />;
    case "master":
      return <SettingOutlined aria-hidden />;
    default:
      return <InboxOutlined aria-hidden />;
  }
}

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

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
    setTodayLabel(formatThaiDate(new Date()));
    // หน้าแรก = ออกจากโหมดโมดูล เมนูด้านข้างจะว่างจนกดกล่องใหม่
    clearActivePortalModule();
  }, []);

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
  const roleLabel =
    user?.roles?.[0]?.roleName ?? user?.roles?.[0]?.roleCode ?? "ERP";

  const openModule = (mod: PortalModuleDef) => {
    setActivePortalModule(mod.key as PortalModuleKey);
    router.push(resolvePortalHref(mod));
  };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>SMT ENERGY · PORTAL</p>
          <h1 className={styles.heroTitle}>สวัสดี, {displayName}</h1>
          <p className={styles.heroLead}>
            เลือกโมดูลเพื่อเริ่มงาน — แสดงเฉพาะระบบที่คุณมีสิทธิ์
            แล้วเมนูด้านข้างจะเหลือเฉพาะโมดูลที่เลือก
          </p>
          {todayLabel ? (
            <p className={styles.heroDate}>{todayLabel}</p>
          ) : (
            <p className={styles.heroDate}>&nbsp;</p>
          )}
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.roleChip}>{roleLabel}</span>
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
        <div className={styles.grid}>
          {modules.map((mod) => {
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
                  onClick={() => openModule(mod)}
                  aria-label={
                    showPendingBadge
                      ? `${mod.label} — ${mod.description} — ${pendingBadgeLabel} ${pendingBadgeCount} รายการ: ${breakdownText}`
                      : `${mod.label} — ${mod.description}`
                  }
                >
                  <span className={styles.tileIcon}>{moduleIcon(mod.key)}</span>
                  <span className={styles.tileCode}>{mod.code}</span>
                  <span className={styles.tileLabel}>{mod.label}</span>
                  <span className={styles.tileDesc}>{mod.description}</span>
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
    </section>
  );
}
