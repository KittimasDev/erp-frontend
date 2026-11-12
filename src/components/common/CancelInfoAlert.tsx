"use client";

import { Alert } from "antd";
import dayjs from "dayjs";
import type { CSSProperties } from "react";

import { useT } from "@/lib/i18n/useT";
import type { CancelInfo } from "@/types/cancel-info";

type Props = {
  /** หัวข้อ เช่น "ใบขอซื้อนี้ถูกยกเลิกแล้ว" */
  title: string;
  info?: CancelInfo | null;
  style?: CSSProperties;
};

/**
 * แสดงข้อมูลการยกเลิก: เหตุผล ผู้ยกเลิก วันเวลา
 * เอกสารเก่าที่ยกเลิกก่อนมีการบันทึกเหตุผล → "ไม่ได้ระบุเหตุผล" (ไม่แก้ข้อมูลย้อนหลัง)
 */
export default function CancelInfoAlert({ title, info, style }: Props) {
  const t = useT();
  return (
    <Alert
      type="error"
      showIcon
      style={style}
      title={title}
      description={
        <div>
          <div>
            {t("เหตุผล")}: {info?.reason?.trim() ? info.reason : t("ไม่ได้ระบุเหตุผล")}
          </div>
          {info?.cancelledByName || info?.cancelledAt ? (
            <div>
              {t("ยกเลิกโดย")} {info.cancelledByName ?? "-"}
              {info.cancelledAt ? ` · ${dayjs(info.cancelledAt).format("DD/MM/BBBB HH:mm")}` : ""}
            </div>
          ) : null}
        </div>
      }
    />
  );
}
