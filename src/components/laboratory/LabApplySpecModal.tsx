"use client";

import { useState } from "react";
import { Alert, App, Checkbox, Modal, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useQueryClient } from "@tanstack/react-query";

import {
  laboratoryQueryKey,
  useApplyCurrentSpecMutation,
} from "@/hooks/laboratory/useLaboratoryQuery";
import { ApiError } from "@/lib/api/client";
import { useT } from "@/lib/i18n/useT";
import {
  LAB_JUDGEMENT_COLOR,
  LAB_JUDGEMENT_LABEL,
  type LabSample,
} from "@/types/laboratory";
import {
  canApplyDirectly,
  isCriteriaChanged,
  showCriterion,
  type ChangedResult,
} from "./labSpecCheck";

type Props = {
  sample: LabSample;
  /** ไม่ส่ง = ทั้ง Sample (เฉพาะแถวที่มีผลตรวจแล้วและเกณฑ์ต่าง) · ส่ง = เฉพาะแถวที่เลือก */
  resultIds?: string[];
  onClose: () => void;
};

type Row = ChangedResult;

/** แสดง ก่อน → หลัง ของค่าหนึ่ง — เน้นเมื่อค่าเปลี่ยน */
function Arrow({
  before,
  after,
}: {
  before: string | null | undefined;
  after: string | null | undefined;
}) {
  const same = showCriterion(before) === showCriterion(after);
  return (
    <span style={same ? { color: "#8a94a6" } : undefined}>
      {showCriterion(before)} →{" "}
      {same ? showCriterion(after) : <strong>{showCriterion(after)}</strong>}
    </span>
  );
}

function JudgementTag({ value }: { value?: string }) {
  const t = useT();
  if (!value) return <>—</>;
  return (
    <Tag color={LAB_JUDGEMENT_COLOR[value]} style={{ marginInlineEnd: 0 }}>
      {t(LAB_JUDGEMENT_LABEL[value] ?? value)}
    </Tag>
  );
}

/**
 * ยืนยันใช้เกณฑ์ปัจจุบันของ Spec (รายแถวหรือทั้ง Sample) — เทียบ ชื่อ/หน่วย/Min/Max และผลประเมิน ก่อน → หลัง
 * ไม่เปลี่ยนค่าผลตรวจ · แถวที่หน่วยเปลี่ยนใช้ตรง ๆ ไม่ได้ (ต้องตรวจ/แปลงผลก่อน)
 * ส่ง fingerprint ของเกณฑ์ที่เห็นกลับไปด้วย — ถ้า Spec เปลี่ยนระหว่างเปิด Modal backend ตอบ 409
 * แล้ว Modal แสดงเกณฑ์ล่าสุดและต้องติ๊กยืนยันว่าตรวจแล้วอีกครั้งก่อนบันทึก
 */
export default function LabApplySpecModal({ sample, resultIds, onClose }: Props) {
  const t = useT();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const apply = useApplyCurrentSpecMutation(sample.id);
  const [error, setError] = useState<string | null>(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const scope = resultIds ? new Set(resultIds) : null;
  const inScope = (sample.results ?? []).filter(
    (r) => !scope || scope.has(r.id),
  );
  const rows = inScope.filter(canApplyDirectly) as Row[];
  const blocked = inScope.filter(
    (r) => isCriteriaChanged(r) && !canApplyDirectly(r),
  );

  const submit = () => {
    setError(null);
    const expected: Record<string, string> = {};
    for (const r of rows) {
      if (r.specCheck.fingerprint) expected[r.id] = r.specCheck.fingerprint;
    }
    apply.mutate(
      { resultIds: rows.map((r) => r.id), expected },
      {
        onSuccess: (res) => {
          const { updated, skipped } = res.data;
          message.success(
            t("ใช้เกณฑ์ปัจจุบันแล้ว {n} รายการ", { n: updated.length }),
          );
          if (skipped.length > 0) {
            message.warning(
              t("ข้าม {n} รายการ: {names}", {
                n: skipped.length,
                names: skipped.map((s) => s.parameterName).join(", "),
              }),
            );
          }
          onClose();
        },
        onError: (e) => {
          // Spec เปลี่ยนระหว่างเปิด Modal → โหลดเกณฑ์ล่าสุดให้ผู้ใช้ตรวจใหม่ ยังไม่บันทึกอะไร
          void queryClient.invalidateQueries({ queryKey: laboratoryQueryKey });
          if (e instanceof ApiError && e.code === "LAB_SPEC_CHANGED") {
            setNeedsReview(true);
            setReviewed(false);
            setError(e.message);
            return;
          }
          setError(e instanceof ApiError ? e.message : t("ดำเนินการไม่สำเร็จ"));
        },
      },
    );
  };

  const columns: ColumnsType<Row> = [
    {
      title: t("พารามิเตอร์"),
      key: "name",
      render: (_v, r) => (
        <Arrow
          before={r.parameterName}
          after={r.specCheck.current?.parameterName}
        />
      ),
    },
    {
      title: t("หน่วย"),
      key: "unit",
      width: 130,
      render: (_v, r) => (
        <Arrow before={r.unit} after={r.specCheck.current?.unit} />
      ),
    },
    {
      title: "Min",
      key: "min",
      width: 110,
      render: (_v, r) => (
        <Arrow before={r.specMin} after={r.specCheck.current?.specMin} />
      ),
    },
    {
      title: "Max",
      key: "max",
      width: 110,
      render: (_v, r) => (
        <Arrow before={r.specMax} after={r.specCheck.current?.specMax} />
      ),
    },
    {
      title: t("ผลตรวจ"),
      dataIndex: "resultValue",
      width: 90,
    },
    {
      title: t("ผลประเมิน"),
      key: "judgement",
      width: 150,
      render: (_v, r) => (
        <span style={{ whiteSpace: "nowrap" }}>
          <JudgementTag value={r.judgement} /> →{" "}
          <JudgementTag value={r.specCheck.judgementAfter} />
        </span>
      ),
    },
  ];

  const nothing = rows.length === 0;
  const canConfirm = !nothing && (!needsReview || reviewed);

  return (
    <Modal
      open
      width={820}
      title={t("ใช้เกณฑ์ปัจจุบันของ Spec")}
      okText={t("ยืนยันใช้เกณฑ์ปัจจุบัน")}
      cancelText={t("ยกเลิก")}
      okButtonProps={{ disabled: !canConfirm }}
      confirmLoading={apply.isPending}
      maskClosable={false}
      onCancel={onClose}
      onOk={submit}
    >
      <Typography.Paragraph type="secondary">
        {t(
          "ระบบจะอัปเดตเกณฑ์ (ชื่อ/หน่วย/Min/Max) และคำนวณผลผ่าน/ไม่ผ่านใหม่ — ไม่เปลี่ยนค่าผลตรวจ · ตัวอย่างที่อนุมัติแล้วและ COA เดิมไม่ถูกแก้ไข · บันทึก Audit Log",
        )}
      </Typography.Paragraph>

      {error ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
          title={error}
          description={
            needsReview
              ? t("แสดงเกณฑ์ล่าสุดให้แล้ว — ตรวจสอบตารางด้านล่าง แล้วติ๊กยืนยันก่อนบันทึก")
              : undefined
          }
        />
      ) : null}

      {nothing ? (
        <Alert
          type="info"
          showIcon
          title={t("ไม่มีรายการที่ต้องอัปเดตเกณฑ์")}
        />
      ) : (
        <Table<Row>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          pagination={false}
          size="small"
          scroll={{ x: 720 }}
        />
      )}

      {blocked.length > 0 ? (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 12 }}
          title={t("ใช้เกณฑ์ปัจจุบันตรง ๆ ไม่ได้ {n} รายการ — หน่วยเปลี่ยน: {names}", {
            n: blocked.length,
            names: blocked.map((r) => r.parameterName).join(", "),
          })}
          description={t(
            "หน่วยเทียบกันไม่ได้ (เช่น % → mg/kg) ต้องตรวจสอบหรือแปลงผลตรวจให้ถูกต้องก่อน โดยแก้ค่าผลตรวจของแถวนั้น",
          )}
        />
      ) : null}

      {needsReview ? (
        <Checkbox
          style={{ marginTop: 12 }}
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        >
          {t("ฉันตรวจสอบเกณฑ์ล่าสุดแล้ว")}
        </Checkbox>
      ) : null}
    </Modal>
  );
}
