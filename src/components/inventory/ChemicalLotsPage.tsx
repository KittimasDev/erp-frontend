"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Checkbox, Input, Modal, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, SearchOutlined } from "@ant-design/icons";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import MasterPageGate from "@/components/common/MasterPageGate";
import { useT } from "@/lib/i18n/useT";
import { useLanguage } from "@/lib/i18n/language";
import { formatDateTime } from "@/lib/i18n/format";
import {
  useChemicalLotsQuery,
  useRejectLotCoaMutation,
  useVerifyLotCoaMutation,
} from "@/hooks/chemicals/useChemicals";
import {
  COA_STATUS_LABEL,
  DOCUMENT_TYPE_LOT_COA,
  type ChemicalLot,
  type CoaStatus,
} from "@/types/chemicals";
import styles from "@/components/masters/shared/master-page.module.css";
import PageHeader from "@/components/common/PageHeader";
import FilterCard, { FilterField } from "@/components/common/FilterCard";

type LotFilters = { coaStatus: string; expiringOnly: boolean; keyword: string };
const DEFAULT_FILTERS: LotFilters = { coaStatus: "PENDING", expiringOnly: false, keyword: "" };

const COA_COLOR: Record<CoaStatus, string> = {
  NOT_REQUIRED: "default",
  PENDING: "gold",
  VERIFIED: "green",
  REJECTED: "red",
};

const sum = (lot: ChemicalLot, key: "quantityOnHand" | "quantityAvailable" | "quantityOnHold") =>
  lot.balances.reduce((acc, b) => acc + Number(b[key] ?? 0), 0);

const daysLeft = (expiry?: string) =>
  expiry ? Math.ceil((new Date(expiry).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000) : undefined;

function ExpiryTag({ expiry }: { expiry?: string }) {
  const t = useT();
  if (!expiry) return <span>—</span>;
  const d = daysLeft(expiry) as number;
  if (d < 0) return <Tag color="red">{expiry} · {t("หมดอายุแล้ว")}</Tag>;
  if (d <= 30) return <Tag color="orange">{expiry} · {t("อีก {d} วัน", { d })}</Tag>;
  return <span>{expiry}</span>;
}

function CoaModal({ lot, onClose }: { lot: ChemicalLot; onClose: () => void }) {
  const t = useT();
  const lang = useLanguage();
  const verify = useVerifyLotCoaMutation();
  const reject = useRejectLotCoaMutation();
  const [note, setNote] = useState("");
  const pending = lot.coaStatus === "PENDING";

  return (
    <Modal
      open
      width={620}
      title={`COA — Lot ${lot.lotNo}`}
      onCancel={onClose}
      footer={
        pending ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <Button
              danger
              loading={reject.isPending}
              disabled={!note.trim()}
              title={!note.trim() ? t("ใส่เหตุผลก่อนปฏิเสธ") : undefined}
              onClick={() => reject.mutate({ id: lot.id, reason: note.trim() }, { onSuccess: onClose })}
            >
              {t("COA ไม่ผ่าน (ปฏิเสธ Lot)")}
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={onClose}>{t("ปิด")}</Button>
              <Button
                type="primary"
                loading={verify.isPending}
                disabled={lot.coaFileCount < 1}
                title={lot.coaFileCount < 1 ? t("ต้องแนบไฟล์ COA ก่อน") : undefined}
                onClick={() => verify.mutate({ id: lot.id, remark: note.trim() || undefined }, { onSuccess: onClose })}
              >
                {t("ยืนยัน COA ผ่าน")}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onClose}>{t("ปิด")}</Button>
        )
      }
    >
      <p style={{ marginTop: 0 }}>
        {lot.itemCode} — {lot.itemNameTh}
        {lot.batchNo ? ` · Batch ${lot.batchNo}` : ""}
        {lot.sourceDocumentNo ? ` · ${t("รับจาก {no}", { no: lot.sourceDocumentNo })}` : ""}
      </p>
      <Typography.Text strong>{t("ไฟล์ COA")}</Typography.Text>
      <DocumentAttachmentsPanel
        documentType={DOCUMENT_TYPE_LOT_COA}
        documentId={lot.id}
        canEdit={pending}
        emptyText={t("ยังไม่ได้แนบ COA — ต้องแนบก่อนยืนยัน")}
        uploadLabel={t("แนบไฟล์ COA")}
      />
      {pending ? (
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong>{t("หมายเหตุ / เหตุผล")}</Typography.Text>
          <Input.TextArea
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("หมายเหตุการตรวจ (ไม่บังคับ) — ถ้าปฏิเสธต้องใส่เหตุผล")}
          />
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            title={t("ยืนยันแล้วยอดที่รอตรวจ (Hold) จะกลายเป็นพร้อมใช้ · ปฏิเสธแล้วยอดถูก Block ห้ามใช้ · Lot ที่หมดอายุแล้วยืนยันไม่ได้")}
          />
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <Tag color={COA_COLOR[lot.coaStatus]}>{t(COA_STATUS_LABEL[lot.coaStatus])}</Tag>
          {lot.coaVerifiedByName ? <span> {t("โดย {name}", { name: lot.coaVerifiedByName })}</span> : null}
          {lot.coaVerifiedAt ? <span> · {formatDateTime(lot.coaVerifiedAt, lang)}</span> : null}
          {lot.coaRemark ? <p style={{ margin: "6px 0 0" }}>{lot.coaRemark}</p> : null}
        </div>
      )}
    </Modal>
  );
}

/** หน้า /inventory/chemical-lots — Lot สารเคมี: ตรวจ COA ก่อนปล่อยใช้, วันหมดอายุ, Batch */
export default function ChemicalLotsPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<LotFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<LotFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string>();

  const query = useChemicalLotsQuery({
    coaStatus: applied.coaStatus || undefined,
    q: applied.keyword,
    expiringWithinDays: applied.expiringOnly ? 30 : undefined,
  });
  const applyFilters = () => {
    setApplied(draft);
    setPage(1);
  };
  const clearFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
  };
  const lots = query.data?.data ?? [];
  const selected = lots.find((l) => l.id === selectedId);

  const columns: ColumnsType<ChemicalLot> = [
    {
      title: t("ลำดับ"),
      key: "seq",
      width: 64,
      align: "center",
      render: (_, __, index) => (page - 1) * 20 + index + 1,
    },
    {
      title: "Lot",
      key: "lot",
      render: (_v, l) => (
        <div>
          <strong>{l.lotNo}</strong>
          <div style={{ fontSize: 12, color: "#8a94a6" }}>
            {[l.batchNo ? `Batch ${l.batchNo}` : null, l.sourceDocumentNo].filter(Boolean).join(" · ") || "—"}
          </div>
        </div>
      ),
    },
    {
      title: t("สารเคมี"),
      key: "item",
      render: (_v, l) => `${l.itemCode ?? ""} ${l.itemNameTh ?? ""}`.trim(),
    },
    { title: t("หมดอายุ"), key: "expiry", width: 200, render: (_v, l) => <ExpiryTag expiry={l.expiryDate} /> },
    {
      title: t("คงเหลือ / พร้อมใช้ / รอตรวจ"),
      key: "qty",
      width: 210,
      align: "right",
      render: (_v, l) =>
        `${sum(l, "quantityOnHand").toLocaleString()} / ${sum(l, "quantityAvailable").toLocaleString()} / ${sum(l, "quantityOnHold").toLocaleString()}`,
    },
    {
      title: "COA",
      key: "coa",
      width: 190,
      render: (_v, l) => (
        <div>
          <Tag color={COA_COLOR[l.coaStatus]}>{t(COA_STATUS_LABEL[l.coaStatus])}</Tag>
          <span style={{ fontSize: 12, color: "#8a94a6" }}>{t("{n} ไฟล์", { n: l.coaFileCount })}</span>
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_v, l) => (
        <Button size="small" type={l.coaStatus === "PENDING" ? "primary" : "default"} onClick={() => setSelectedId(l.id)}>
          {l.coaStatus === "PENDING" ? t("ตรวจ COA") : t("ดู COA")}
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <PageHeader
          eyebrow="INVENTORY · CHEMICAL"
          icon={<ExperimentOutlined />}
          title={t("Lot สารเคมี / ตรวจ COA")}
          subtitle={t("สารเคมีที่รับเข้าจะอยู่สถานะรอตรวจ (Hold) จนกว่าจะแนบ COA และยืนยัน — Lot ที่ COA ยังไม่ผ่าน เบิกไม่ได้")}
          actions={
            <>
<Link href="/inventory/chemical-issues">
            <Button size="large" type="primary">
              {t("เบิกสารเคมี")}
            </Button>
          </Link>
            </>
          }
        />

        <FilterCard onSearch={applyFilters} onClear={clearFilters} loading={query.isFetching}>
          <FilterField label={t("ค้นหา")}>
            <Input
              allowClear
              style={{ width: "100%" }}
              prefix={<SearchOutlined />}
              placeholder={t("ค้น Lot / Batch / สารเคมี")}
              value={draft.keyword}
              onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
            />
          </FilterField>
          <FilterField label="COA">
            <Select
              style={{ width: "100%" }}
              value={draft.coaStatus}
              onChange={(v) => setDraft((d) => ({ ...d, coaStatus: v }))}
              options={[
                { value: "", label: t("ทุกสถานะ COA") },
                { value: "PENDING", label: t(COA_STATUS_LABEL.PENDING) },
                { value: "VERIFIED", label: t(COA_STATUS_LABEL.VERIFIED) },
                { value: "REJECTED", label: t(COA_STATUS_LABEL.REJECTED) },
                { value: "NOT_REQUIRED", label: t("Lot เดิม (ไม่ต้องตรวจ)") },
              ]}
            />
          </FilterField>
          <FilterField label={t("หมดอายุ")}>
            <Checkbox
              checked={draft.expiringOnly}
              onChange={(e) => setDraft((d) => ({ ...d, expiringOnly: e.target.checked }))}
            >
              {t("เฉพาะใกล้หมดอายุ (≤ 30 วัน) / หมดอายุแล้ว")}
            </Checkbox>
          </FilterField>
        </FilterCard>

        <div className={styles.tableCard}>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={lots}
            loading={query.isFetching}
            pagination={{ current: page, onChange: setPage, pageSize: 20, showTotal: (total) => t("ทั้งหมด {n} Lot", { n: total }) }}
            scroll={{ x: 1000 }}
            locale={{ emptyText: t("ไม่มี Lot ตามเงื่อนไข") }}
          />
        </div>

        {selected ? <CoaModal key={selected.id} lot={selected} onClose={() => setSelectedId(undefined)} /> : null}
      </section>
    </MasterPageGate>
  );
}
