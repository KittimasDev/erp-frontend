"use client";

import { useState, type MouseEvent } from "react";
import { Tooltip } from "antd";

import styles from "./CollapsibleItemList.module.css";

export type CollapsibleItem = {
  id: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
};

function itemParts(item: CollapsibleItem) {
  const code = item.itemCode?.trim() || "";
  const name = (item.itemNameTh ?? item.description)?.trim() || "";
  const full = code && name ? `${code} — ${name}` : code || name || "—";
  return { code, name: name || code || "—", full };
}

/** กันไม่ให้กดขยายแล้ว onRow ของตารางพาไปหน้ารายละเอียด */
function stopRowNav(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}

function ItemRow({ item }: { item: CollapsibleItem }) {
  const { code, name, full } = itemParts(item);
  return (
    <li className={styles.line}>
      <Tooltip title={full}>
        <span className={styles.lineInner}>
          {code ? <span className={styles.code}>{code}</span> : null}
          <span className={styles.name}>{code ? name : full}</span>
        </span>
      </Tooltip>
    </li>
  );
}

export default function CollapsibleItemList({
  items,
}: {
  items: CollapsibleItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return "—";
  }

  const extra = items.length - 1;
  const visible = expanded || extra <= 0 ? items : items.slice(0, 1);

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {visible.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </ul>
      {extra > 0 ? (
        <button
          type="button"
          className={styles.toggle}
          onClick={(event) => {
            stopRowNav(event);
            setExpanded((open) => !open);
          }}
          onMouseDown={stopRowNav}
        >
          {expanded ? "ย่อรายการ" : `+${extra} รายการเพิ่มเติม`}
        </button>
      ) : null}
    </div>
  );
}
