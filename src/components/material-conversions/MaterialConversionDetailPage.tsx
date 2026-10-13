"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";

import MasterPageGate from "@/components/common/MasterPageGate";
import { useScreenActionPermissions } from "@/hooks/auth/useScreenActionPermissions";
import { useMaterialConversionQuery } from "@/hooks/material-conversions/useMaterialConversionQueries";
import {
  useCancelMaterialConversionMutation,
  useCompleteMaterialConversionMutation,
  useStartMaterialConversionMutation,
} from "@/hooks/material-conversions/useMaterialConversionMutations";
import type {
  MaterialConversionInputLine,
  MaterialConversionOutputLine,
} from "@/types/material-conversion";
import {
  COST_ALLOCATION_BASIS_LABEL,
  MASS_BALANCE_STATUS_LABEL,
  MATERIAL_CONVERSION_STATUS_COLOR,
  MATERIAL_CONVERSION_STATUS_LABEL,
  OUTPUT_TYPE_COLOR,
  OUTPUT_TYPE_LABEL,
  PACKAGING_TYPE_LABEL,
} from "@/types/material-conversion";
import masterStyles from "@/components/masters/shared/master-page.module.css";
import {
  CancelConversionModal,
  CompleteConversionModal,
  StartConversionModal,
} from "./MaterialConversionActionModals";
import styles from "./MaterialConversionPage.module.css";
import ChemicalUsagePanel from "./ChemicalUsagePanel";
import RunDowntimePanel from "./RunDowntimePanel";

const ROUTE_BASE = "/production/material-conversions";

function fmtQty(value?: string | null) {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function fmtMoney(value?: string | null) {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  return Number.isNaN(num)
    ? value
    : num.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export default function MaterialConversionDetailPage({
  runId,
}: {
  runId: string;
}) {
  const router = useRouter();
  const actions = useScreenActionPermissions("MATERIAL_CONVERSIONS");
  const detailQuery = useMaterialConversionQuery(runId);
  const run = detailQuery.data?.data;

  const startMutation = useStartMaterialConversionMutation();
  const completeMutation = useCompleteMaterialConversionMutation();
  const cancelMutation = useCancelMaterialConversionMutation();

  const [startOpen, setStartOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canOperate = actions.canApprove || actions.canEdit;

  const inputColumns: ColumnsType<MaterialConversionInputLine> = useMemo(
    () => [
      {
        title: "สินค้า",
        key: "item",
        render: (_v, row) => (
          <div className={styles.cellStack}>
            <span>{row.itemNameTh ?? "-"}</span>
            <span className={styles.cellMuted}>{row.itemCode ?? "-"}</span>
          </div>
        ),
      },
      {
        title: "ตามแผน",
        key: "planned",
        width: 130,
        align: "right",
        render: (_v, row) => `${fmtQty(row.plannedQty)} ${row.unitCode ?? ""}`,
      },
      {
        title: "ตัดจริง",
        key: "actual",
        width: 130,
        align: "right",
        render: (_v, row) => `${fmtQty(row.actualQty)} ${row.unitCode ?? ""}`,
      },
      {
        title: "น้ำหนักเทียบ",
        key: "base",
        width: 130,
        align: "right",
        render: (_v, row) =>
          row.baseQty ? (
            fmtQty(row.baseQty)
          ) : (
            <Tooltip title="ไม่มีกฎแปลงหน่วยไปเป็นหน่วยเทียบร่วม">
              <span className={styles.cellMuted}>แปลงไม่ได้</span>
            </Tooltip>
          ),
      },
      {
        title: "ต้นทุน/หน่วย",
        key: "unitCost",
        width: 120,
        align: "right",
        render: (_v, row) => fmtMoney(row.unitCost),
      },
      {
        title: "หมายเหตุ",
        dataIndex: "remark",
        key: "remark",
        render: (value?: string) =>
          value ?? <span className={styles.cellMuted}>-</span>,
      },
    ],
    [],
  );

  const outputColumns: ColumnsType<MaterialConversionOutputLine> = useMemo(
    () => [
      {
        title: "ชนิด",
        dataIndex: "outputType",
        key: "outputType",
        width: 130,
        render: (value: string) => (
          <Tag color={OUTPUT_TYPE_COLOR[value] ?? "default"}>
            {OUTPUT_TYPE_LABEL[value] ?? value}
          </Tag>
        ),
      },
      {
        title: "สินค้า",
        key: "item",
        render: (_v, row) => (
          <div className={styles.cellStack}>
            <span>{row.itemNameTh ?? "-"}</span>
            <span className={styles.cellMuted}>{row.itemCode ?? "-"}</span>
          </div>
        ),
      },
      {
        title: "ตามแผน",
        key: "planned",
        width: 120,
        align: "right",
        render: (_v, row) => `${fmtQty(row.plannedQty)} ${row.unitCode ?? ""}`,
      },
      {
        title: "ได้จริง",
        key: "actual",
        width: 120,
        align: "right",
        render: (_v, row) =>
          row.actualQty === undefined ? (
            <span className={styles.cellMuted}>ยังไม่ปิดงาน</span>
          ) : (
            `${fmtQty(row.actualQty)} ${row.unitCode ?? ""}`
          ),
      },
      {
        title: "น้ำหนักจาก",
        key: "weightSource",
        width: 170,
        render: (_v, row) =>
          row.floorScaleTicketNo ? (
            <div className={styles.cellStack}>
              <span>
                <Tag color={row.weightSource === "SCALE_OVERRIDE" ? "orange" : "green"}>
                  {row.weightSource === "SCALE_OVERRIDE" ? "ตั๋วชั่ง (กรอกต่าง)" : "ตั๋วชั่ง"}
                </Tag>
                {row.floorScaleTicketNo}
              </span>
              {row.weightDiffReason ? (
                <span className={styles.cellMuted}>{row.weightDiffReason}</span>
              ) : null}
            </div>
          ) : row.weightSource === "MANUAL" ? (
            <span className={styles.cellMuted}>กรอกมือ</span>
          ) : (
            <span className={styles.cellMuted}>-</span>
          ),
      },
      {
        title: "ภาชนะบรรจุ",
        key: "packaging",
        width: 170,
        render: (_v, row) =>
          row.packagingType ? (
            <div className={styles.cellStack}>
              <span>
                {PACKAGING_TYPE_LABEL[row.packagingType] ?? row.packagingType}
                {row.packageCount ? ` × ${row.packageCount}` : ""}
              </span>
              {row.grossQty !== undefined ? (
                <span className={styles.cellMuted}>
                  รวม {fmtQty(row.grossQty)} − ภาชนะ {fmtQty(row.tareQty)}
                </span>
              ) : null}
            </div>
          ) : (
            <span className={styles.cellMuted}>-</span>
          ),
      },
      {
        title: "Lot ที่ได้",
        key: "lot",
        render: (_v, row) =>
          row.lotNo ? (
            <span>{row.lotNo}</span>
          ) : row.postsToStock ? (
            <span className={styles.cellMuted}>ยังไม่สร้าง</span>
          ) : (
            <Tooltip title="ของเสียไม่เข้าสต๊อก จึงไม่มี Lot">
              <span className={styles.cellMuted}>ไม่เข้าสต๊อก</span>
            </Tooltip>
          ),
      },
      {
        title: "มูลค่าที่ปันได้",
        key: "amount",
        width: 130,
        align: "right",
        render: (_v, row) => fmtMoney(row.amount),
      },
    ],
    [],
  );

  if (!run) {
    return <MasterPageGate isLoading={detailQuery.isLoading}>{null}</MasterPageGate>;
  }

  const isDraft = run.status === "DRAFT";
  const isInProgress = run.status === "IN_PROGRESS";
  const isCompleted = run.status === "COMPLETED";
  const massBalanceBad = run.massBalanceStatus === "EXCEEDS_INPUT";

  const massBalanceDiff =
    run.totalInputBaseQty !== undefined &&
    run.totalOutputBaseQty !== undefined &&
    run.totalWasteBaseQty !== undefined
      ? Number(run.totalInputBaseQty) -
        Number(run.totalOutputBaseQty) -
        Number(run.totalWasteBaseQty)
      : undefined;

  return (
    <MasterPageGate isLoading={detailQuery.isLoading}>
      <section className={masterStyles.page}>
        <div className={masterStyles.pageHeader}>
          <div className={masterStyles.headerAccent}>MC</div>
          <div className={masterStyles.headerContent}>
            <div className={masterStyles.eyebrow}>
              {run.routeNameTh ?? "PRODUCTION"} ·{" "}
              {run.stepNameTh ?? run.stepCode}
            </div>
            <h2 className={masterStyles.pageTitle}>{run.runNo}</h2>
            <span className={masterStyles.pageSubtitle}>
              วันที่ {run.runDate} · Batch {run.batchNo ?? "ไม่ระบุ"}{" "}
              <Tag
                color={
                  MATERIAL_CONVERSION_STATUS_COLOR[run.status] ?? "default"
                }
              >
                {MATERIAL_CONVERSION_STATUS_LABEL[run.status] ?? run.status}
              </Tag>
            </span>
          </div>
          <Button onClick={() => router.push(ROUTE_BASE)}>กลับ</Button>
        </div>

        {run.stepSkipWarning ? (
          <Alert
            className={styles.notice}
            type="warning"
            showIcon
            title="ข้ามขั้นตอนในเส้นทาง"
            description={run.stepSkipWarning}
          />
        ) : null}

        {massBalanceBad ? (
          <Alert
            className={styles.notice}
            type="error"
            showIcon
            title="ผลผลิตมากกว่าวัตถุดิบ — เป็นไปไม่ได้ทางกายภาพ"
            description={run.massBalanceMessage}
          />
        ) : run.massBalanceStatus === "NOT_COMPARABLE" ? (
          <Alert
            className={styles.notice}
            type="warning"
            showIcon
            title="รวมเป็นน้ำหนักเดียวกันไม่ได้"
            description={run.massBalanceMessage}
          />
        ) : null}

        {canOperate ? (
          <div className={styles.actionBar}>
            {isDraft ? (
              <Button type="primary" onClick={() => setStartOpen(true)}>
                เริ่มงาน (ตัดสต๊อกวัตถุดิบ)
              </Button>
            ) : null}
            {isInProgress ? (
              <Button type="primary" onClick={() => setCompleteOpen(true)}>
                ปิดงาน (รับผลผลิตเข้าคลัง)
              </Button>
            ) : null}
            {isDraft || isInProgress ? (
              <Button danger onClick={() => setCancelOpen(true)}>
                ยกเลิกเอกสาร
              </Button>
            ) : null}
          </div>
        ) : null}

        {isCompleted ? (
          <div className={styles.detailSection}>
            <h3>สมดุลมวลและ Yield</h3>
            <div className={styles.balanceRow}>
              <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>วัตถุดิบเข้า</span>
                <strong className={styles.balanceValue}>
                  {fmtQty(run.totalInputBaseQty)}
                </strong>
                <span className={styles.balanceHint}>
                  {run.baseUnitCode ?? "หน่วยเทียบร่วม"}
                </span>
              </div>
              <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>ผลผลิตเข้าคลัง</span>
                <strong className={styles.balanceValue}>
                  {fmtQty(run.totalOutputBaseQty)}
                </strong>
                <span className={styles.balanceHint}>ไม่รวมของเสีย</span>
              </div>
              <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>ของเสีย</span>
                <strong className={styles.balanceValue}>
                  {fmtQty(run.totalWasteBaseQty)}
                </strong>
                <span className={styles.balanceHint}>
                  {massBalanceDiff !== undefined
                    ? `อธิบายไม่ได้ ${massBalanceDiff.toLocaleString("th-TH", { maximumFractionDigits: 3 })} (ความชื้น/แก๊ส)`
                    : "-"}
                </span>
              </div>
              <div
                className={`${styles.balanceCard} ${styles.balanceCardStrong}`}
              >
                <span className={styles.balanceLabel}>Yield</span>
                <strong className={styles.balanceValue}>
                  {run.yieldPercent === null
                    ? "เทียบไม่ได้"
                    : `${run.yieldPercent.toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`}
                </strong>
                <span className={styles.balanceHint}>
                  {run.massBalanceStatus
                    ? (MASS_BALANCE_STATUS_LABEL[run.massBalanceStatus] ??
                      run.massBalanceStatus)
                    : "-"}
                </span>
              </div>
            </div>
            <div className={styles.infoGrid}>
              <InfoItem
                label="ต้นทุนวัตถุดิบรวม"
                value={`${fmtMoney(run.totalInputCost)} บาท`}
              />
              <InfoItem
                label="วิธีปันต้นทุน"
                value={
                  run.costAllocationBasis
                    ? (COST_ALLOCATION_BASIS_LABEL[run.costAllocationBasis] ??
                      run.costAllocationBasis)
                    : "-"
                }
              />
              <InfoItem
                label="ปิดงานโดย"
                value={run.completedBy?.displayName ?? "-"}
              />
              <InfoItem
                label="เวลาปิดงาน"
                value={
                  run.completedAt
                    ? new Date(run.completedAt).toLocaleString("th-TH")
                    : "-"
                }
              />
            </div>
          </div>
        ) : null}

        <div className={styles.detailSection}>
          <h3>วัตถุดิบเข้า ({run.inputs.length} รายการ)</h3>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            size="small"
            columns={inputColumns}
            dataSource={run.inputs}
            pagination={false}
            locale={{ emptyText: "ไม่มีบรรทัดวัตถุดิบ" }}
          />
        </div>

        <div className={styles.detailSection}>
          <h3>ผลผลิตออก ({run.outputs.length} รายการ)</h3>
          <Table
            className={masterStyles.dataTable}
            rowKey="id"
            size="small"
            columns={outputColumns}
            dataSource={run.outputs}
            pagination={false}
            locale={{ emptyText: "ไม่มีบรรทัดผลผลิต" }}
          />
        </div>

        <ChemicalUsagePanel
          runId={run.id}
          enabled={run.status !== "DRAFT" && run.status !== "CANCELLED"}
        />

        <RunDowntimePanel run={run} canEdit={canOperate} />

        <div className={styles.detailSection}>
          <h3>เครื่องจักรและผู้ปฏิบัติงาน</h3>
          <div className={styles.infoGrid}>
            <InfoItem
              label="เครื่องจักร"
              value={
                run.equipment
                  ? `${run.equipment.equipmentCode} — ${run.equipment.name}`
                  : "ไม่ได้ระบุ"
              }
            />
            <InfoItem
              label="ผู้ปฏิบัติงาน"
              value={
                run.operators && run.operators.length > 0
                  ? run.operators.map((o) => o.displayName).join(", ")
                  : "ไม่ได้ระบุ"
              }
            />
          </div>
        </div>

        <div className={styles.detailSection}>
          <h3>ผู้ดำเนินการ</h3>
          <div className={styles.infoGrid}>
            <InfoItem label="ผู้สร้าง" value={run.requestedBy?.displayName ?? "-"} />
            <InfoItem label="ผู้เริ่มงาน" value={run.startedBy?.displayName ?? "-"} />
            <InfoItem
              label="เวลาเริ่มงาน"
              value={
                run.startedAt
                  ? new Date(run.startedAt).toLocaleString("th-TH")
                  : "-"
              }
            />
            <InfoItem
              label="ผู้ยกเลิก"
              value={run.cancelledBy?.displayName ?? "-"}
            />
          </div>
          {run.cancelReason ? (
            <Alert
              style={{ marginTop: 12 }}
              type="error"
              showIcon
              title="เหตุผลการยกเลิก"
              description={run.cancelReason}
            />
          ) : null}
          {run.remark ? (
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              title="หมายเหตุ"
              description={
                <span style={{ whiteSpace: "pre-line" }}>{run.remark}</span>
              }
            />
          ) : null}
        </div>

        <StartConversionModal
          open={startOpen}
          run={run}
          loading={startMutation.isPending}
          onCancel={() => setStartOpen(false)}
          onConfirm={(payload) =>
            startMutation.mutate(
              { id: run.id, body: payload },
              { onSuccess: () => setStartOpen(false) },
            )
          }
        />
        <CompleteConversionModal
          open={completeOpen}
          run={run}
          loading={completeMutation.isPending}
          onCancel={() => setCompleteOpen(false)}
          onConfirm={(payload) =>
            completeMutation.mutate(
              { id: run.id, body: payload },
              { onSuccess: () => setCompleteOpen(false) },
            )
          }
        />
        <CancelConversionModal
          open={cancelOpen}
          requireReason={isInProgress}
          loading={cancelMutation.isPending}
          onCancel={() => setCancelOpen(false)}
          onConfirm={(payload) =>
            cancelMutation.mutate(
              { id: run.id, body: payload },
              { onSuccess: () => setCancelOpen(false) },
            )
          }
        />
      </section>
    </MasterPageGate>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
