"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Popconfirm, Progress, Tag, Tooltip } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import { useWarehousesQuery } from "@/hooks/warehouses/useWarehousesQuery";
import { useWarehouseLocationsQuery } from "@/hooks/warehouse-locations/useWarehouseLocationsQuery";
import { useStageRunQuery } from "@/hooks/production-stages/useStageRunQueries";
import {
  useCancelStageRunMutation,
  useCompleteStageRunMutation,
  useStartStageRunMutation,
} from "@/hooks/production-stages/useStageRunMutations";
import {
  STAGE_RUN_STATUS_COLOR,
  STAGE_RUN_STATUS_LABEL,
} from "@/types/production-stage-run";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import { stageTypeLabel, type StageModuleConfig } from "./stage-modules";
import {
  StageRunCancelModal,
  StageRunCompleteModal,
} from "./StageRunActionModals";
import styles from "./StageRunPage.module.css";
import PageHeader from "@/components/common/PageHeader";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { tConvStatusLabel } from "@/types/material-conversion";

const GREEN = "#739816";
const AMBER = "#F9BB0C";

function fmtQty(value?: string) {
  if (!value) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function fmtDateTime(value?: string) {
  return value ? dayjs(value).format("DD/MM/BBBB HH:mm") : "-";
}

export default function StageRunDetailPage({
  config,
  runId,
}: {
  config: StageModuleConfig;
  runId: string;
}) {
  const t = useT();
  const lang = useLanguage();
  const router = useRouter();
  const actions = useScreenActionPermissions(config.screenCode);
  const runQuery = useStageRunQuery(config, runId);
  const run = runQuery.data?.data;

  const startMutation = useStartStageRunMutation(config);
  const completeMutation = useCompleteStageRunMutation(config);
  const cancelMutation = useCancelStageRunMutation(config);

  /* hook ต้องอยู่ก่อน early-return ของ MasterPageGate ไม่งั้นจำนวน hook จะไม่คงที่ */
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  /*
    response DTO คืนคลัง ตำแหน่ง และหน่วยมาเป็น id ล้วน ไม่มีชื่อ
    ถ้าโชว์ตรง ๆ ผู้ใช้จะเห็น UUID — map ชื่อฝั่งนี้แทนการแก้ response shape
  */
  const warehousesQuery = useWarehousesQuery();
  const unitsQuery = useUnitsQuery();
  const inputLocationsQuery = useWarehouseLocationsQuery(
    run?.inputWarehouseId ? { warehouseId: run.inputWarehouseId } : undefined,
  );
  const outputLocationsQuery = useWarehouseLocationsQuery(
    run?.outputWarehouseId ? { warehouseId: run.outputWarehouseId } : undefined,
  );

  const warehouseName = useMemo(() => {
    const map = new Map<string, string>();
    for (const wh of warehousesQuery.data?.data ?? []) {
      map.set(wh.id, `${wh.warehouseCode} — ${wh.warehouseName}`);
    }
    return map;
  }, [warehousesQuery.data]);

  const unitCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of unitsQuery.data?.data ?? []) {
      map.set(unit.id, unit.code);
    }
    return map;
  }, [unitsQuery.data]);

  const locationName = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of [
      ...(inputLocationsQuery.data?.data ?? []),
      ...(outputLocationsQuery.data?.data ?? []),
    ]) {
      map.set(loc.id, `${loc.locationCode} — ${loc.locationName}`);
    }
    return map;
  }, [inputLocationsQuery.data, outputLocationsQuery.data]);

  if (!run) {
    return <MasterPageGate isLoading={runQuery.isLoading}>{null}</MasterPageGate>;
  }

  const isDraft = run.status === "DRAFT";
  const isInProgress = run.status === "IN_PROGRESS";
  const canOperate = actions.canApprove || actions.canEdit;

  // Yield มาจาก backend ไม่คิดเองบนหน้าจอ — สูตรอยู่ที่ stage-run-yield.util.ts
  const isPlannedYield = !run.outputActualQty;
  const inputUnit = unitCode.get(run.inputUnitId) ?? "";
  const outputUnit = unitCode.get(run.outputUnitId) ?? "";

  const busy =
    startMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  return (
    <MasterPageGate isLoading={runQuery.isLoading}>
      <section className={masterStyles.page}>
        <PageHeader
          eyebrow={config.eyebrow}
          title={<>{run.runNo}{" "}
              <Tag color={STAGE_RUN_STATUS_COLOR[run.status] ?? "default"}>
                {tConvStatusLabel(STAGE_RUN_STATUS_LABEL[run.status] ?? run.status)}
              </Tag></>}
          subtitle={<>{stageTypeLabel(config, run.stageType)} ·{" "}
              {dayjs(run.runDate).format("DD/MM/BBBB")}</>}
          actions={
            <>
<Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(config.routeBase)}
          >
            {t("กลับ")}
          </Button>
            </>
          }
        />

        <div className={styles.actionBar}>
          {isDraft && canOperate ? (
            <Popconfirm
              title={t("เริ่มงานและตัดสต๊อกจริง?")}
              description={
                t("จะตัด {qty} {unit} ออกจาก {warehouse} · ย้อนกลับไม่ได้", {
                  qty: fmtQty(run.inputQty),
                  unit: inputUnit,
                  warehouse: warehouseName.get(run.inputWarehouseId) ?? t("คลัง"),
                })
              }
              okText={lang === "en" ? "Start work" : "เริ่มงาน"}
              cancelText={t("ยกเลิก")}
              onConfirm={() => startMutation.mutate(run.id)}
            >
              <Button type="primary" icon={<PlayCircleOutlined />} loading={busy}>
                {t("เริ่มงาน (ตัดสต๊อก)")}
              </Button>
            </Popconfirm>
          ) : null}

          {isInProgress && canOperate ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={busy}
              onClick={() => setCompleteOpen(true)}
            >
              {t("ยืนยันเสร็จงาน (รับเข้าคลัง)")}
            </Button>
          ) : null}

          {/* เดิมยกเลิกได้เฉพาะร่าง — คนที่กดเริ่มผิดจึงไม่มีทางออกเลย */}
          {(isDraft || isInProgress) && canOperate ? (
            <Button
              danger
              ghost
              icon={<StopOutlined />}
              loading={busy}
              onClick={() => setCancelOpen(true)}
            >
              {isInProgress ? t("ยกเลิกกลางคัน") : t("ยกเลิกรอบ")}
            </Button>
          ) : null}
        </div>

        <StageRunCompleteModal
          open={completeOpen}
          run={run}
          loading={completeMutation.isPending}
          inputUnit={inputUnit}
          outputUnit={outputUnit}
          warehouseName={warehouseName.get(run.outputWarehouseId) ?? t("คลัง")}
          onCancel={() => setCompleteOpen(false)}
          onConfirm={(body) =>
            completeMutation.mutate(
              { id: run.id, body },
              { onSuccess: () => setCompleteOpen(false) },
            )
          }
        />

        <StageRunCancelModal
          open={cancelOpen}
          runNo={run.runNo}
          loading={cancelMutation.isPending}
          started={isInProgress}
          onCancel={() => setCancelOpen(false)}
          onConfirm={(body) =>
            cancelMutation.mutate(
              { id: run.id, body },
              { onSuccess: () => setCancelOpen(false) },
            )
          }
        />

        {run.status === "CANCELLED" && run.cancelReason ? (
          <Alert
            type="warning"
            showIcon
            title={t("รอบนี้ถูกยกเลิก")}
            description={run.cancelReason}
          />
        ) : null}

        <div className={styles.yieldCard}>
          {run.yieldComparable && run.yieldPercent !== null ? (
            <Progress
              type="dashboard"
              size={130}
              percent={Math.min(100, run.yieldPercent)}
              strokeColor={isPlannedYield ? AMBER : GREEN}
              format={() => <span>{run.yieldPercent}%</span>}
            />
          ) : (
            <Tooltip title={t("หน่วยของวัตถุดิบกับผลผลิตต่างกัน (เช่น เส้น → กิโลกรัม) จึงคิดเป็นเปอร์เซ็นต์ไม่ได้")}>
              <Progress
                type="dashboard"
                size={130}
                percent={0}
                strokeColor="#d9d9d9"
                format={() => <span style={{ fontSize: 12 }}>{t("เทียบไม่ได้")}</span>}
              />
            </Tooltip>
          )}
          <div className={styles.yieldCardBody}>
            <span className={styles.yieldCardLabel}>
              {isPlannedYield ? t("Yield ตามแผน (ยังไม่ปิดงาน)") : t("Yield จริง")}
            </span>
            <span>
              {t("วัตถุดิบ")} {fmtQty(run.inputQty)} {inputUnit}
              {Number(run.inputActualQty) > 0
                ? ` · ${t("ตัดจริง")} ${fmtQty(run.inputActualQty)} ${inputUnit}`
                : ""}
            </span>
            <span>
              {t("ผลผลิตตามแผน")} {fmtQty(run.outputQty)} {outputUnit}
              {run.outputActualQty
                ? ` · ${t("รับเข้าคลังจริง")} ${fmtQty(run.outputActualQty)} ${outputUnit}`
                : ""}
              {run.outputLotNo ? ` · Lot ${run.outputLotNo}` : ""}
            </span>
            {run.byproductQty ? (
              <span className={styles.yieldCardLabel}>
                {t(config.byproductLabel)} {fmtQty(run.byproductQty)} — {t("บันทึกอ้างอิง ไม่ได้เข้าสต๊อก")}
              </span>
            ) : null}
          </div>
        </div>

        <div className={styles.detailSection}>
          <h3>{t("วัตถุดิบเข้า")}</h3>
          <div className={styles.infoGrid}>
            <Info
              label={t("สินค้า")}
              value={
                run.inputItemCode
                  ? `${run.inputItemCode} — ${run.inputItemNameTh ?? ""}`
                  : "-"
              }
            />
            <Info
              label={t("คลัง")}
              value={warehouseName.get(run.inputWarehouseId) ?? "-"}
            />
            <Info
              label={t("ตำแหน่ง")}
              value={locationName.get(run.inputLocationId) ?? "-"}
            />
            <Info label={t("จำนวนตามแผน")} value={`${fmtQty(run.inputQty)} ${inputUnit}`} />
            <Info
              label={t("ตัดสต๊อกจริง")}
              value={
                Number(run.inputActualQty) > 0
                  ? `${fmtQty(run.inputActualQty)} ${inputUnit}`
                  : t("ยังไม่เริ่มงาน")
              }
            />
          </div>
        </div>

        <div className={styles.detailSection}>
          <h3>{t("ผลผลิตออก")}</h3>
          <div className={styles.infoGrid}>
            <Info
              label={t("สินค้า")}
              value={
                run.outputItemCode
                  ? `${run.outputItemCode} — ${run.outputItemNameTh ?? ""}`
                  : "-"
              }
            />
            <Info
              label={t("คลัง")}
              value={warehouseName.get(run.outputWarehouseId) ?? "-"}
            />
            <Info
              label={t("ตำแหน่ง")}
              value={locationName.get(run.outputLocationId) ?? "-"}
            />
            <Info label={t("จำนวน")} value={`${fmtQty(run.outputQty)} ${outputUnit}`} />
            <Info label={t("Lot ที่ได้")} value={run.outputLotNo ?? t("ยังไม่เสร็จงาน")} />
          </div>
        </div>

        <div className={styles.detailSection}>
          <h3>{t("ผู้ดำเนินการ")}</h3>
          <div className={styles.infoGrid}>
            <Info label={t("ผู้สร้าง")} value={run.requestedBy?.displayName ?? "-"} />
            <Info
              label={t("เริ่มงาน")}
              value={run.startedAt ? fmtDateTime(run.startedAt) : "-"}
            />
            <Info
              label={t("เสร็จงาน")}
              value={run.completedAt ? fmtDateTime(run.completedAt) : "-"}
            />
            <Info label={t("หมายเหตุ")} value={run.remark || "-"} />
          </div>
        </div>
      </section>
    </MasterPageGate>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
