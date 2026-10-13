"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  Progress,
  Tag,
  Tooltip,
} from "antd";
import { CheckOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import MasterPageGate from "@/components/common/MasterPageGate";
import ChemicalUsagePanel from "./ChemicalUsagePanel";
import RunTeamFields from "./RunTeamFields";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import {
  useCancelMaterialConversionJobMutation,
  useCloseMaterialConversionJobMutation,
  useMaterialConversionJobQuery,
  useReopenMaterialConversionJobMutation,
} from "@/hooks/material-conversions/useMaterialConversionJobs";
import {
  useCancelMaterialConversionMutation,
  useCompleteMaterialConversionMutation,
  useCreateMaterialConversionMutation,
  useStartMaterialConversionMutation,
} from "@/hooks/material-conversions/useMaterialConversionMutations";
import {
  useMaterialConversionQuery,
  useMaterialConversionRoutesQuery,
} from "@/hooks/material-conversions/useMaterialConversionQueries";
import type {
  MaterialConversionJob,
  MaterialConversionJobStep,
  MaterialConversionRouteStep,
} from "@/types/material-conversion";
import {
  JOB_STEP_STATE_COLOR,
  JOB_STEP_STATE_LABEL,
  MATERIAL_CONVERSION_JOB_PROGRESS_LABEL,
  MATERIAL_CONVERSION_JOB_STATUS_COLOR,
  MATERIAL_CONVERSION_JOB_STATUS_LABEL,
  MATERIAL_CONVERSION_STATUS_COLOR,
  MATERIAL_CONVERSION_STATUS_LABEL,
} from "@/types/material-conversion";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import {
  CancelConversionModal,
  CompleteConversionModal,
  StartConversionModal,
} from "./MaterialConversionActionModals";
import MaterialConversionRunLinesFields, {
  buildRunLinesPayload,
  EMPTY_INPUT,
  EMPTY_OUTPUT,
  useConversionLineData,
  type ConversionLineData,
  type InputLineValues,
  type OutputLineValues,
} from "./MaterialConversionRunLinesFields";
import styles from "./MaterialConversionPage.module.css";

const ROUTE_BASE = "/production/material-conversions";

type ActionKind = "start" | "complete" | "cancelRun";

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const day = dayjs(value);
  return day.isValid() ? day.format("DD/MM/YYYY") : value;
}

function fmtQty(value?: string | null) {
  if (value === undefined || value === null || value === "") return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function lineItemLabel(row: {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
}) {
  if (row.itemCode) {
    return `${row.itemCode} — ${row.itemNameTh ?? ""}`.trim();
  }
  return row.itemId;
}

function displayLineQty(
  status: string,
  plannedQty: string,
  actualQty?: string | null,
) {
  if (status !== "DRAFT" && actualQty != null && actualQty !== "") {
    return actualQty;
  }
  return plannedQty;
}

/**
 * หน้าใบงานแปรสภาพตามเส้นทาง — **พระเอกของฟีเจอร์นี้**
 *
 * เปิดใบเดียวแล้วเห็นทุกขั้นในหน้าเดียว ทยอยกรอกและเดินงานทีละขั้น
 * ตามวันที่เกิดจริง โดยเลข Batch ถูกบังคับให้เท่ากันทั้งสายให้เอง
 *
 * **ไม่ต่อขั้นอัตโนมัติ** — ผลผลิตของขั้นก่อนไม่กลายเป็นวัตถุดิบของขั้นถัดไปให้เอง
 * ผู้ใช้เลือก Lot เองทุกขั้น ตามที่เจ้าของระบบสั่งไว้
 *
 * โมดัลเริ่มงาน/ปิดงาน/ยกเลิก **ใช้ของเดิมทั้งดุ้น ไม่แก้แม้แต่บรรทัดเดียว**
 */
export default function MaterialConversionJobDetailPage({
  jobId,
}: {
  jobId: string;
}) {
  const router = useRouter();
  const { modal: modalApi } = App.useApp();
  const actions = useScreenActionPermissions("MATERIAL_CONVERSIONS");

  const jobQuery = useMaterialConversionJobQuery(jobId);
  const job = jobQuery.data?.data;

  const routesQuery = useMaterialConversionRoutesQuery({ isActive: true });
  const routeSteps = useMemo(() => {
    const route = (routesQuery.data?.data ?? []).find(
      (row) => row.id === job?.routeId,
    );
    return new Map(
      (route?.steps ?? []).map((step) => [step.id, step] as const),
    );
  }, [routesQuery.data, job?.routeId]);

  /*
    ส่ง Batch ของใบงานเข้าไป — Lot ที่เป็นผลผลิตของขั้นก่อนหน้าในสายเดียวกัน
    จะถูกดันขึ้นบนสุดของตัวเลือก **แต่ไม่ถูกเลือกให้อัตโนมัติ**
  */
  const lineData = useConversionLineData(job?.batchNo);

  const [fillStep, setFillStep] = useState<MaterialConversionJobStep | null>(
    null,
  );
  const [action, setAction] = useState<{
    kind: ActionKind;
    runId: string;
  } | null>(null);

  /*
    โหลดเอกสารเต็มเฉพาะตอนจะเปิดโมดัล — ไทม์ไลน์ไม่ต้องการบรรทัดสินค้า
    แต่โมดัลเริ่มงาน/ปิดงานต้องการทุกบรรทัดเพื่อให้ยืนยันจำนวนจริงได้
  */
  const actionRunQuery = useMaterialConversionQuery(action?.runId);
  const actionRun = actionRunQuery.data?.data;

  const startMutation = useStartMaterialConversionMutation();
  const completeMutation = useCompleteMaterialConversionMutation();
  const cancelRunMutation = useCancelMaterialConversionMutation();
  const closeJobMutation = useCloseMaterialConversionJobMutation();
  const reopenJobMutation = useReopenMaterialConversionJobMutation();
  const cancelJobMutation = useCancelMaterialConversionJobMutation();

  const closeAction = () => setAction(null);

  const askCloseJob = () => {
    if (!job) return;
    const incomplete = job.completedStepCount < job.plannedStepCount;
    let reason = "";
    modalApi.confirm({
      title: "ปิดใบงานนี้",
      okText: "ปิดใบงาน",
      cancelText: "ยกเลิก",
      content: (
        <div>
          <p style={{ marginTop: 0 }}>
            {incomplete
              ? `ทำไปแล้ว ${job.completedStepCount} จาก ${job.plannedStepCount} ขั้นตอน — ขั้นที่เหลือจะถือว่าไม่ทำแล้ว`
              : "ทำครบทุกขั้นตอนแล้ว ปิดใบงานได้เลย"}
          </p>
          <p style={{ color: "#8a9199", fontSize: 12 }}>
            ไม่มีการคืนวัตถุดิบเข้าคลัง — ของที่ตัดไปแล้วยังถูกตัดไปตามเดิม
          </p>
          {incomplete ? (
            <Input.TextArea
              rows={3}
              maxLength={2000}
              placeholder="เหตุผลที่ปิดทั้งที่ยังไม่ครบ (อย่างน้อย 10 ตัวอักษร)"
              onChange={(e) => {
                reason = e.target.value;
              }}
            />
          ) : null}
        </div>
      ),
      onOk: () =>
        closeJobMutation.mutateAsync({
          id: jobId,
          body: incomplete ? { closeReason: reason.trim() } : undefined,
        }),
    });
  };

  const askCancelJob = () => {
    if (!job) return;
    let reason = "";
    modalApi.confirm({
      title: "ยกเลิกใบงานทั้งใบ",
      okText: "ยกเลิกใบงาน",
      okButtonProps: { danger: true },
      cancelText: "ไม่ยกเลิก",
      content: (
        <div>
          {/*
            อธิบายข้อจำกัดตรงนี้ ไม่ใช่ปล่อยให้ผู้ใช้ไปเจอ error เอา —
            ยกเลิกทั้งใบทำได้ก็ต่อเมื่อยังไม่มีขั้นไหนแตะสต๊อกเลย
          */}
          <p style={{ marginTop: 0 }}>
            ทำได้ก็ต่อเมื่อ<strong>ยังไม่มีขั้นไหนตัดสต๊อก</strong> ·
            ถ้ามีขั้นที่เริ่มงานหรือปิดงานไปแล้ว ให้ปิดใบงานพร้อมเหตุผลแทน
          </p>
          <p style={{ color: "#8a9199", fontSize: 12 }}>
            เอกสารขั้นตอนที่ยังเป็นร่างจะถูกยกเลิกตามไปด้วย
          </p>
          <Input.TextArea
            rows={3}
            maxLength={2000}
            placeholder="เหตุผลการยกเลิก (อย่างน้อย 10 ตัวอักษร)"
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      onOk: () =>
        cancelJobMutation.mutateAsync({
          id: jobId,
          body: { cancelReason: reason.trim() || undefined },
        }),
    });
  };

  const isOpen = job?.status === "OPEN";
  const canEdit = actions.canEdit && isOpen;

  return (
    <MasterPageGate isLoading={jobQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>MCJ</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              PRODUCTION · MATERIAL CONVERSION JOB
            </div>
            <h2 className={masterStyles.pageTitle}>ใบงานแปรสภาพตามเส้นทาง</h2>
            <span className={masterStyles.pageSubtitle}>
              กรอกและเดินงานทีละขั้นในหน้าเดียว — Batch เดียวกันทั้งสาย
            </span>
          </div>
          <Button onClick={() => router.push(`${ROUTE_BASE}?tab=jobs`)}>
            กลับ
          </Button>
        </div>

        {!job ? (
          <Empty description="ไม่พบใบงานที่ต้องการ" />
        ) : (
          <>
            <JobHero
              job={job}
              canEdit={actions.canEdit}
              onClose={askCloseJob}
              onReopen={() => reopenJobMutation.mutate(jobId)}
              onCancel={askCancelJob}
              busy={
                closeJobMutation.isPending ||
                reopenJobMutation.isPending ||
                cancelJobMutation.isPending
              }
            />

            <ChemicalUsagePanel batchNo={job.batchNo} />

            {job.currentRouteStepCount !== undefined &&
            job.currentRouteStepCount !== job.plannedStepCount ? (
              <Alert
                className={styles.notice}
                type="info"
                showIcon
                title="เส้นทางถูกแก้หลังเปิดใบงานนี้"
                description={`แผนของใบงานนี้ถ่ายไว้ตอนเปิดใบว่ามี ${job.plannedStepCount} ขั้นตอน — เส้นทางปัจจุบันมี ${job.currentRouteStepCount} ขั้นตอน · ใบนี้ยังเดินตามแผนเดิมเพื่อให้ตรวจย้อนหลังได้`}
              />
            ) : null}

            {job.unplannedStepCodes.length > 0 ? (
              <Alert
                className={styles.notice}
                type="warning"
                showIcon
                title="มีเอกสารของขั้นที่ไม่อยู่ในแผนใบงานนี้"
                description={`รหัสขั้นตอน: ${job.unplannedStepCodes.join(", ")}`}
              />
            ) : null}

            {job.status === "CLOSED" && job.closeReason ? (
              <Alert
                className={styles.notice}
                type="warning"
                showIcon
                title="ใบงานนี้ปิดทั้งที่ยังทำไม่ครบ"
                description={job.closeReason}
              />
            ) : null}

            <div className={styles.timeline}>
              {job.steps.map((step, index) => (
                <div key={step.stepId} className={styles.timelineRow}>
                  <div className={styles.timelineRail}>
                    <span
                      className={`${styles.timelineDot} ${
                        step.state === "COMPLETED"
                          ? styles.timelineDotDone
                          : step.state === "IN_PROGRESS" ||
                              step.state === "DRAFT"
                            ? styles.timelineDotActive
                            : ""
                      }`}
                    >
                      {step.state === "COMPLETED" ? (
                        <CheckOutlined />
                      ) : (
                        step.stepOrder
                      )}
                    </span>
                    {index < job.steps.length - 1 ? (
                      <span className={styles.timelineLine} />
                    ) : null}
                  </div>
                  <StepCard
                    step={step}
                    canEdit={canEdit}
                    routeStep={routeSteps.get(step.stepId)}
                    onFill={() => setFillStep(step)}
                    onAction={(kind, runId) => setAction({ kind, runId })}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ─── ลิ้นชักกรอกข้อมูลขั้นตอน ───────────────────────────────────── */}
      <Drawer
        open={Boolean(fillStep)}
        onClose={() => setFillStep(null)}
        title={
          fillStep ? `กรอกข้อมูล — ${fillStep.stepOrder}. ${fillStep.nameTh}` : ""
        }
        size="large"
        /*
          destroyOnHidden + Body ที่ตั้งค่าตอน mount — ทางที่รีโปนี้ใช้แทน
          การ setState ใน effect ซึ่งติด eslint react-hooks/set-state-in-effect
        */
        destroyOnHidden
      >
        {fillStep && job ? (
          <FillStepDrawerBody
            job={job}
            step={fillStep}
            routeStep={routeSteps.get(fillStep.stepId)}
            lineData={lineData}
            onDone={() => setFillStep(null)}
          />
        ) : null}
      </Drawer>

      {/* ─── โมดัลเดินงาน — ใช้ของเดิมทั้งหมด ───────────────────────────── */}
      {action?.kind === "start" && actionRun ? (
        <StartConversionModal
          open
          run={actionRun}
          loading={startMutation.isPending}
          onCancel={closeAction}
          onConfirm={(payload) =>
            startMutation.mutate(
              { id: actionRun.id, body: payload },
              { onSuccess: closeAction },
            )
          }
        />
      ) : null}

      {action?.kind === "complete" && actionRun ? (
        <CompleteConversionModal
          open
          run={actionRun}
          loading={completeMutation.isPending}
          onCancel={closeAction}
          onConfirm={(payload) =>
            completeMutation.mutate(
              { id: actionRun.id, body: payload },
              { onSuccess: closeAction },
            )
          }
        />
      ) : null}

      {action?.kind === "cancelRun" && actionRun ? (
        <CancelConversionModal
          open
          requireReason={actionRun.status === "IN_PROGRESS"}
          loading={cancelRunMutation.isPending}
          onCancel={closeAction}
          onConfirm={(payload) =>
            cancelRunMutation.mutate(
              { id: actionRun.id, body: payload },
              { onSuccess: closeAction },
            )
          }
        />
      ) : null}
    </MasterPageGate>
  );
}

// ─── หัวใบงาน ───────────────────────────────────────────────────────────────

function JobHero({
  job,
  canEdit,
  onClose,
  onReopen,
  onCancel,
  busy,
}: {
  job: MaterialConversionJob;
  canEdit: boolean;
  onClose: () => void;
  onReopen: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const percent =
    job.plannedStepCount > 0
      ? Math.round((job.completedStepCount / job.plannedStepCount) * 100)
      : 0;

  return (
    <div className={styles.jobHero}>
      <div className={styles.jobHeroMain}>
        <div className={styles.jobHeroTitle}>
          <h2>{job.jobNo}</h2>
          <Tag color={MATERIAL_CONVERSION_JOB_STATUS_COLOR[job.status]}>
            {MATERIAL_CONVERSION_JOB_STATUS_LABEL[job.status] ?? job.status}
          </Tag>
          <Tag>
            {MATERIAL_CONVERSION_JOB_PROGRESS_LABEL[job.progressStatus] ??
              job.progressStatus}
          </Tag>
        </div>
        <span className={styles.cellMuted}>
          {job.routeNameTh ?? job.routeCode} · เริ่มตามแผน{" "}
          {fmtDate(job.plannedStartDate)}
          {job.requestedBy ? ` · เปิดโดย ${job.requestedBy.displayName}` : ""}
        </span>
        {job.remark ? (
          <span className={styles.subNote}>{job.remark}</span>
        ) : null}
      </div>

      <div className={styles.jobBatch}>
        <span className={styles.jobBatchLabel}>Batch</span>
        <strong className={styles.jobBatchValue}>{job.batchNo}</strong>
      </div>

      <div className={styles.jobProgress}>
        <div className={styles.jobProgressLabel}>
          <span>ความคืบหน้า</span>
          <span className={styles.jobProgressCount}>
            {job.completedStepCount} / {job.plannedStepCount} ขั้นตอน
          </span>
        </div>
        <Progress
          percent={percent}
          size="small"
          strokeColor="#739816"
          showInfo={false}
        />
        {job.openRunCount > 0 ? (
          <span className={styles.subNote}>
            มี {job.openRunCount} ขั้นตอนที่ยังเปิดค้างอยู่
          </span>
        ) : null}
      </div>

      {canEdit ? (
        <div className={styles.jobHeroActions}>
          {job.status === "OPEN" ? (
            <>
              <Button loading={busy} onClick={onClose}>
                ปิดใบงาน
              </Button>
              <Tooltip title="ทำได้ก็ต่อเมื่อยังไม่มีขั้นไหนตัดสต๊อก">
                <Button danger loading={busy} onClick={onCancel}>
                  ยกเลิกทั้งใบ
                </Button>
              </Tooltip>
            </>
          ) : null}
          {job.status === "CLOSED" ? (
            <Button loading={busy} onClick={onReopen}>
              เปิดใบงานกลับมา
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── การ์ดขั้นตอนบนไทม์ไลน์ ─────────────────────────────────────────────────

function StepCard({
  step,
  canEdit,
  routeStep,
  onFill,
  onAction,
}: {
  step: MaterialConversionJobStep;
  canEdit: boolean;
  routeStep?: MaterialConversionRouteStep;
  onFill: () => void;
  onAction: (kind: ActionKind, runId: string) => void;
}) {
  const cardClass =
    step.state === "COMPLETED"
      ? `${styles.stepCard} ${styles.stepCardDone}`
      : step.state === "NOT_STARTED"
        ? `${styles.stepCard} ${styles.stepCardIdle}`
        : styles.stepCard;

  const template = (routeStep?.lines ?? []).filter(
    (line) => line.lineRole === "OUTPUT",
  );

  return (
    <div className={cardClass}>
      <div className={styles.stepHead}>
        <span className={styles.stepTitle}>
          {step.stepOrder}. {step.nameTh}
          <Tag color={JOB_STEP_STATE_COLOR[step.state]}>
            {JOB_STEP_STATE_LABEL[step.state] ?? step.state}
          </Tag>
        </span>
        <div className={styles.stepActions}>
          {step.state === "NOT_STARTED" && canEdit ? (
            <Button type="primary" size="small" onClick={onFill}>
              กรอกข้อมูลขั้นตอนนี้
            </Button>
          ) : null}
          {step.state === "DRAFT" && step.runId ? (
            <>
              {canEdit ? (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onAction("start", step.runId as string)}
                >
                  เริ่มงาน (ตัดสต๊อก)
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  size="small"
                  danger
                  onClick={() => onAction("cancelRun", step.runId as string)}
                >
                  ยกเลิกขั้นตอนนี้
                </Button>
              ) : null}
            </>
          ) : null}
          {step.state === "IN_PROGRESS" && step.runId ? (
            <>
              {canEdit ? (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => onAction("complete", step.runId as string)}
                >
                  ปิดงาน (รับเข้าคลัง)
                </Button>
              ) : null}
              {canEdit ? (
                <Button
                  size="small"
                  danger
                  onClick={() => onAction("cancelRun", step.runId as string)}
                >
                  ยกเลิกขั้นตอนนี้
                </Button>
              ) : null}
            </>
          ) : null}
          {step.runId ? (
            <Link href={`${ROUTE_BASE}/${step.runId}`}>
              <Button size="small" type="link">
                เปิดใบเต็ม
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.stepMeta}>
        {step.runNo ? (
          <span className={styles.cellMuted}>
            {step.runNo} · {fmtDate(step.runDate)}
          </span>
        ) : (
          /*
            ขั้นที่ยังไม่ถึงยังคุ้มที่จะแสดงแม่แบบผลผลิต — ผู้ใช้จะได้รู้ว่า
            ขั้นนี้คาดว่าจะได้อะไรออกมาบ้างก่อนถึงคิว
          */
          <span className={styles.cellMuted}>
            {template.length > 0
              ? `คาดว่าจะได้: ${template
                  .map((line) => line.itemNameTh ?? line.itemCode ?? "-")
                  .join(" · ")}`
              : "ยังไม่มีเอกสารของขั้นนี้"}
          </span>
        )}
        {step.state === "COMPLETED" && step.yieldPercent !== null &&
        step.yieldPercent !== undefined ? (
          <span
            className={
              step.massBalanceStatus === "EXCEEDS_INPUT"
                ? `${styles.yieldPill} ${styles.yieldPillBad}`
                : styles.yieldPill
            }
          >
            Yield{" "}
            {step.yieldPercent.toLocaleString("th-TH", {
              maximumFractionDigits: 2,
            })}
            %
          </span>
        ) : null}
        {step.runs.length > 1 ? (
          <Tooltip
            title={step.runs
              .map(
                (run) =>
                  `${run.runNo} · ${MATERIAL_CONVERSION_STATUS_LABEL[run.status] ?? run.status}`,
              )
              .join("\n")}
          >
            <Tag color={MATERIAL_CONVERSION_STATUS_COLOR.CANCELLED}>
              มีเอกสาร {step.runs.length} ใบในขั้นนี้
            </Tag>
          </Tooltip>
        ) : null}
      </div>

      {step.runId ? <StepRunLines runId={step.runId} /> : null}
    </div>
  );
}

function StepRunLines({ runId }: { runId: string }) {
  const query = useMaterialConversionQuery(runId);
  const run = query.data?.data;
  if (!run) {
    return null;
  }

  return (
    <div className={styles.stepLines}>
      <div className={styles.stepLineGroup}>
        <span className={styles.stepLineLabel}>วัตถุดิบ</span>
        {run.inputs.length === 0 ? (
          <span className={styles.cellMuted}>ไม่มีบรรทัดวัตถุดิบ</span>
        ) : (
          run.inputs.map((line) => (
            <span key={line.id} className={styles.stepLineItem}>
              {lineItemLabel(line)}{" "}
              {fmtQty(
                displayLineQty(run.status, line.plannedQty, line.actualQty),
              )}{" "}
              {line.unitCode ?? ""}
            </span>
          ))
        )}
      </div>
      <div className={styles.stepLineGroup}>
        <span className={styles.stepLineLabel}>ผลผลิต</span>
        {run.outputs.length === 0 ? (
          <span className={styles.cellMuted}>ไม่มีบรรทัดผลผลิต</span>
        ) : (
          run.outputs.map((line) => (
            <span key={line.id} className={styles.stepLineItem}>
              {lineItemLabel(line)}{" "}
              {fmtQty(
                displayLineQty(run.status, line.plannedQty, line.actualQty),
              )}{" "}
              {line.unitCode ?? ""}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

// ─── ลิ้นชักกรอกข้อมูลขั้นตอน ───────────────────────────────────────────────

type FillFormValues = {
  runDate: Dayjs;
  equipmentId?: string;
  operatorIds?: string[];
  remark?: string;
  inputs: InputLineValues[];
  outputs: OutputLineValues[];
};

/**
 * Body ของลิ้นชัก — ตั้งค่าตั้งต้นตอน mount ผ่าน `initialValues`
 * ไม่ใช่ `setFieldsValue` ใน effect (ติดกฎ react-hooks/set-state-in-effect)
 */
function FillStepDrawerBody({
  job,
  step,
  routeStep,
  lineData,
  onDone,
}: {
  job: MaterialConversionJob;
  step: MaterialConversionJobStep;
  routeStep?: MaterialConversionRouteStep;
  lineData: ConversionLineData;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FillFormValues>();
  const createMutation = useCreateMaterialConversionMutation();

  const rawInputs = Form.useWatch("inputs", form);
  const rawOutputs = Form.useWatch("outputs", form);
  const watchedInputs = useMemo(() => rawInputs ?? [], [rawInputs]);
  const watchedOutputs = useMemo(() => rawOutputs ?? [], [rawOutputs]);

  // เติมบรรทัดผลผลิตจากแม่แบบของขั้นตอนตั้งแต่เปิดลิ้นชัก
  const initialOutputs = useMemo(() => {
    const template = (routeStep?.lines ?? []).filter(
      (line) => line.lineRole === "OUTPUT",
    );
    if (template.length === 0) return [{ ...EMPTY_OUTPUT }];
    return template.map((line) => ({
      outputType: line.outputType ?? "MAIN",
      itemId: line.itemId ?? undefined,
      unitId: line.itemId
        ? (lineData.itemById.get(line.itemId)?.unitId ??
          line.unitId ??
          undefined)
        : (line.unitId ?? undefined),
      plannedQty: null,
    }));
  }, [routeStep, lineData.itemById]);

  const submit = (values: FillFormValues) => {
    const payload = buildRunLinesPayload(
      values,
      lineData.lotById,
      lineData.itemById,
    );
    if ("error" in payload) {
      message.warning(payload.error);
      return;
    }

    createMutation.mutate(
      {
        routeId: job.routeId,
        stepId: step.stepId,
        runDate: values.runDate.format("YYYY-MM-DD"),
        jobId: job.id,
        equipmentId: values.equipmentId || undefined,
        operatorIds: values.operatorIds?.length ? values.operatorIds : undefined,
        // ไม่ส่ง batchNo — backend บังคับใช้ Batch ของใบงานอยู่แล้ว
        inputs: payload.inputs,
        outputs: payload.outputs,
        remark: values.remark?.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <Form
      form={form}
      layout="vertical"
      className={styles.drawerBody}
      initialValues={{
        runDate: dayjs(),
        inputs: [{ ...EMPTY_INPUT }],
        outputs: initialOutputs,
      }}
      onFinish={submit}
      disabled={createMutation.isPending}
    >
      <Alert
        className={styles.notice}
        type="info"
        showIcon
        title={`Batch ${job.batchNo}`}
        description="ระบบใส่เลข Batch ของใบงานให้เองทุกขั้น · บันทึกแล้วยังเป็นร่าง ยังไม่ตัดสต๊อกจนกว่าจะกดเริ่มงาน"
      />

      <div className={styles.formSection}>
        <Form.Item
          name="runDate"
          label="วันที่ทำงานของขั้นนี้"
          rules={[{ required: true, message: "เลือกวันที่" }]}
          extra="ขั้นตอนคนละวันกันได้ ใส่วันที่ทำจริงของขั้นนี้"
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
      </div>

      <MaterialConversionRunLinesFields
        form={form}
        data={lineData}
        selectedStep={routeStep}
        inputValues={watchedInputs}
        outputValues={watchedOutputs}
      />

      <RunTeamFields />

      <div className={styles.formSection}>
        <Form.Item name="remark" label="หมายเหตุ">
          <Input.TextArea rows={2} maxLength={2000} showCount />
        </Form.Item>
      </div>

      <div className={styles.drawerFooter}>
        <Button onClick={onDone}>ยกเลิก</Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={createMutation.isPending}
        >
          บันทึกเป็นร่าง
        </Button>
      </div>
    </Form>
  );
}
