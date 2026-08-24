"use client";

import type { ReactNode } from "react";
import { App, Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";

import styles from "./RowActionsMenu.module.css";

export type RowAction = {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** hint ตอน disabled — antd MenuItemType รองรับ title */
  disabledReason?: string;
  onClick: () => void;
  /** มี confirm = เปิด modal.confirm ก่อนเรียก onClick */
  confirm?: {
    title: string;
    content?: ReactNode;
    okText?: string;
    cancelText?: string;
    /** default = action.danger */
    dangerOk?: boolean;
  };
};

/** false/null/undefined = ซ่อน (เขียน permission inline ได้), "divider" = เส้นคั่น */
export type RowActionEntry = RowAction | "divider" | false | null | undefined;

export type RowActionsMenuProps = {
  actions: RowActionEntry[];
  /** ปุ่ม CTA หลักของ workflow — วางซ้ายเมนู ⋮ */
  primary?: ReactNode;
  /** อ่านให้ screen reader — ใส่รหัสเอกสารของแถวด้วย */
  ariaLabel: string;
  /** แสดงเมื่อไม่มีทั้ง primary และ action ที่มองเห็นได้ */
  emptyFallback?: ReactNode;
  placement?: "bottomRight" | "bottomLeft";
  className?: string;
};

export default function RowActionsMenu({
  actions,
  primary,
  ariaLabel,
  emptyFallback = null,
  placement = "bottomRight",
  className,
}: RowActionsMenuProps) {
  const { modal } = App.useApp();

  const items: NonNullable<MenuProps["items"]> = [];

  for (const entry of actions) {
    if (!entry) {
      continue;
    }

    if (entry === "divider") {
      // ยุบ divider ซ้ำ/นำหน้า เพื่อให้ permission gate ไม่ทำให้เมนูเพี้ยน
      if (items.length && items[items.length - 1]?.type !== "divider") {
        items.push({ type: "divider", key: `divider-${items.length}` });
      }
      continue;
    }

    items.push({
      key: entry.key,
      icon: entry.icon,
      label: entry.label,
      danger: entry.danger,
      disabled: entry.disabled,
      title: entry.disabled ? entry.disabledReason : undefined,
      onClick: (info) => {
        // portal ของ antd bubble ตาม React tree ไม่ใช่ DOM tree
        // ต้องหยุดที่นี่ด้วย ไม่ให้คลิกเมนูทะลุไปโดน onRow ของตาราง
        info.domEvent.stopPropagation();

        if (!entry.confirm) {
          entry.onClick();
          return;
        }

        modal.confirm({
          title: entry.confirm.title,
          content: entry.confirm.content,
          okText: entry.confirm.okText ?? "ยืนยัน",
          cancelText: entry.confirm.cancelText ?? "ยกเลิก",
          okButtonProps: {
            danger: entry.confirm.dangerOk ?? entry.danger,
          },
          onOk: entry.onClick,
        });
      },
    });
  }

  while (items.length && items[items.length - 1]?.type === "divider") {
    items.pop();
  }

  const hasItems = items.some((item) => item?.type !== "divider");

  if (!hasItems && !primary) {
    return <>{emptyFallback}</>;
  }

  return (
    <div
      className={className ? `${styles.wrap} ${className}` : styles.wrap}
      onClick={(event) => event.stopPropagation()}
    >
      {primary}

      {hasItems ? (
        <Dropdown trigger={["click"]} placement={placement} menu={{ items }}>
          <Button
            type="text"
            className={styles.actionMenuButton}
            icon={<MoreOutlined />}
            aria-label={ariaLabel}
          />
        </Dropdown>
      ) : null}
    </div>
  );
}
