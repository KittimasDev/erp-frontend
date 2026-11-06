"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RightOutlined } from "@ant-design/icons";

import { PRODUCTION_OUTPUT_ENABLED } from "@/config/feature-flags";
import {
  canAccessScreen,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import {
  setActivePortalModule,
  type PortalModuleKey,
} from "@/lib/auth/portal-module";
import { SCREEN_CODE_HUB_HREF } from "@/lib/auth/screen-routes";
import { MENU_BADGE_REGISTRY } from "@/hooks/badges/menu-badge-registry";
import type { MenuBadgeCounts } from "@/hooks/badges/useMenuBadgeCounts";
import { getVisiblePortalModules, PORTAL_MODULES } from "./portal-modules";
import { useT } from "@/lib/i18n/useT";
import styles from "./TodayWorkCarousel.module.css";

const PAGE_SIZE = 4;

const DOT_CLASS = [
  styles.dotGreen,
  styles.dotBlue,
  styles.dotOrange,
  styles.dotPurple,
];

const PRODUCTION_OUTPUT_MENU_KEYS = new Set([
  "production-output-stock-requests",
  "production-output-approvals",
]);

type WorkItem = {
  menuKey: string;
  label: string;
  count: number;
  href: string;
  moduleKey: PortalModuleKey;
};

function isPortalModuleKey(value: string): value is PortalModuleKey {
  return PORTAL_MODULES.some((mod) => mod.key === value);
}

function canSeeBadgeMenu(
  screenCode: string,
  menuKey: string,
  visibleCodes: Set<string>,
) {
  if (!PRODUCTION_OUTPUT_ENABLED && PRODUCTION_OUTPUT_MENU_KEYS.has(menuKey)) {
    return false;
  }
  if (isMatrixPermissionMode()) {
    return canAccessScreen(screenCode);
  }
  return visibleCodes.has(screenCode);
}

function moduleKeyForScreen(screenCode: string): PortalModuleKey | null {
  const owner = PORTAL_MODULES.find((mod) =>
    mod.screenCodes.includes(screenCode),
  );
  if (!owner || !isPortalModuleKey(owner.key)) {
    return null;
  }
  return owner.key;
}

type Props = {
  counts: MenuBadgeCounts;
};

export default function TodayWorkCarousel({ counts }: Props) {
  const router = useRouter();
  const t = useT();
  const [page, setPage] = useState(0);

  const items = useMemo(() => {
    const visibleCodes = new Set(
      getVisiblePortalModules().flatMap((mod) => mod.screenCodes),
    );
    const rows: WorkItem[] = [];
    for (const entry of MENU_BADGE_REGISTRY) {
      if (entry.hidden) {
        continue;
      }
      const count = counts[entry.menuKey] ?? 0;
      if (count <= 0) {
        continue;
      }
      if (!canSeeBadgeMenu(entry.screenCode, entry.menuKey, visibleCodes)) {
        continue;
      }
      const href = SCREEN_CODE_HUB_HREF[entry.screenCode];
      const moduleKey = moduleKeyForScreen(entry.screenCode);
      if (!href || !moduleKey) {
        continue;
      }
      rows.push({
        menuKey: entry.menuKey,
        label: entry.label,
        count,
        href,
        moduleKey,
      });
    }
    return rows;
  }, [counts]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const slide = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const openItem = (item: WorkItem) => {
    setActivePortalModule(item.moduleKey);
    router.push(item.href);
  };

  return (
    <section className={styles.card} aria-label={t("งานของคุณวันนี้")}>
      <h2 className={styles.title}>{t("งานของคุณวันนี้")}</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>{t("ไม่มีงานค้างวันนี้")}</p>
      ) : (
        <>
          <ul className={styles.list}>
            {slide.map((item, index) => (
              <li key={item.menuKey}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => openItem(item)}
                  aria-label={`${t(item.label)} ${t("{n} รายการ", { n: item.count })}`}
                >
                  <span
                    className={`${styles.dot} ${DOT_CLASS[index % DOT_CLASS.length]}`}
                    aria-hidden
                  />
                  <span className={styles.label}>{t(item.label)}</span>
                  <span className={styles.count}>
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                  <RightOutlined className={styles.chevron} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {pageCount > 1 ? (
            <div className={styles.pager} role="tablist" aria-label={t("หน้างานค้าง")}>
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === page}
                  aria-label={t("หน้า {n}", { n: i + 1 })}
                  className={`${styles.pageDot} ${i === page ? styles.pageDotActive : ""}`}
                  onClick={() => setPage(i)}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
