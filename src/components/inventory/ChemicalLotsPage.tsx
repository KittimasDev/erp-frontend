"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Checkbox, Input, Modal, Select, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ExperimentOutlined, SearchOutlined } from "@ant-design/icons";

import DocumentAttachmentsPanel from "@/components/common/DocumentAttachmentsPanel";
import MasterPageGate from "@/components/common/MasterPageGate";
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
  if (!expiry) return <span>—</span>;
  const d = daysLeft(expiry) as number;
  if (d < 0) return <Tag color="red">{expiry} · หมดอายุแล้ว</Tag>;
  if (d <= 30) return <Tag color="orange">{expiry} · อีก {d} วัน</Tag>;
  return <span>{expiry}</span>;
}

function CoaModal({ lot, onClose }: { lot: ChemicalLot; onClose: () => void }) {
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
              title={!note.trim() ? "ใส่เหตุผลก่อนปฏิเสธ" : undefined}
              onClick={() => reject.mutate({ id: lot.id, reason: note.trim() }, { onSuccess: onClose })}
            >
              COA ไม่ผ่าน (ปฏิเสธ Lot)
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={onClose}>ปิด</Button>
              <Button
                type="primary"
                loading={verify.isPending}
                disabled={lot.coaFileCount < 1}
                title={lot.coaFileCount < 1 ? "ต้องแนบไฟล์ COA ก่อน" : undefined}
                onClick={() => verify.mutate({ id: lot.id, remark: note.trim() || undefined }, { onSuccess: onClose })}
              >
                ยืนยัน COA ผ่าน
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onClose}>ปิด</Button>
        )
      }
    >
      <p style={{ marginTop: 0 }}>
        {lot.itemCode} — {lot.itemNameTh}
        {lot.batchNo ? ` · Batch ${lot.batchNo}` : ""}
        {lot.sourceDocumentNo ? ` · รับจาก ${lot.sourceDocumentNo}` : ""}
      </p>
      <Typography.Text strong>ไฟล์ COA</Typography.Text>
      <DocumentAttachmentsPanel
        documentType={DOCUMENT_TYPE_LOT_COA}
        documentId={lot.id}
        canEdit={pending}
        emptyText="ยังไม่ได้แนบ COA — ต้องแนบก่อนยืนยัน"
        uploadLabel="แนบไฟล์ COA"
      />
      {pending ? (
        <div style={{ marginTop: 12 }}>
          <Typography.Text strong>หมายเหตุ / เหตุผล</Typography.Text>
          <Input.TextArea
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="หมายเหตุการตรวจ (ไม่บังคับ) — ถ้าปฏิเสธต้องใส่เหตุผล"
          />
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 8 }}
            title="ยืนยันแล้วยอดที่รอตรวจ (Hold) จะกลายเป็นพร้อมใช้ · ปฏิเสธแล้วยอดถูก Block ห้ามใช้ · Lot ที่หมดอายุแล้วยืนยันไม่ได้"
          />
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <Tag color={COA_COLOR[lot.coaStatus]}>{COA_STATUS_LABEL[lot.coaStatus]}</Tag>
          {lot.coaVerifiedByName ? <span> โดย {lot.coaVerifiedByName}</span> : null}
          {lot.coaVerifiedAt ? <span> · {new Date(lot.coaVerifiedAt).toLocaleString("th-TH")}</span> : null}
          {lot.coaRemark ? <p style={{ margin: "6px 0 0" }}>{lot.coaRemark}</p> : null}
        </div>
      )}
    </Modal>
  );
}

/** หน้า /inventory/chemical-lots — Lot สารเคมี: ตรวจ COA ก่อนปล่อยใช้, วันหมดอายุ, Batch */
export default function ChemicalLotsPage() {
  const [page, setPage] = useState(1);
  const [coaStatus, setCoaStatus] = useState<string>("PENDING");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  const query = useChemicalLotsQuery({
    coaStatus: coaStatus || undefined,
    q: applied,
    expiringWithinDays: expiringOnly ? 30 : undefined,
  });
  const lots = query.data?.data ?? [];
  const selected = lots.find((l) => l.id === selectedId);

  const columns: ColumnsType<ChemicalLot> = [
    {
      title: "ลำดับ",
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
      title: "สารเคมี",
      key: "item",
      render: (_v, l) => `${l.itemCode ?? ""} ${l.itemNameTh ?? ""}`.trim(),
    },
    { title: "หมดอายุ", key: "expiry", width: 200, render: (_v, l) => <ExpiryTag expiry={l.expiryDate} /> },
    {
      title: "คงเหลือ / พร้อมใช้ / รอตรวจ",
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
          <Tag color={COA_COLOR[l.coaStatus]}>{COA_STATUS_LABEL[l.coaStatus]}</Tag>
          <span style={{ fontSize: 12, color: "#8a94a6" }}>{l.coaFileCount} ไฟล์</span>
        </div>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_v, l) => (
        <Button size="small" type={l.coaStatus === "PENDING" ? "primary" : "default"} onClick={() => setSelectedId(l.id)}>
          {l.coaStatus === "PENDING" ? "ตรวจ COA" : "ดู COA"}
        </Button>
      ),
    },
  ];

  return (
    <MasterPageGate isLoading={query.isLoading}>
      <section className={styles.page}>
        <div className={styles.pageHeader}>
          <div className={styles.headerAccent}>
            <ExperimentOutlined />
          </div>
          <div className={styles.headerContent}>
            <div className={styles.eyebrow}>INVENTORY · CHEMICAL</div>
            <Typography.Title level={2} className={styles.pageTitle}>
              Lot สารเคมี / ตรวจ COA
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              สารเคมีที่รับเข้าจะอยู่สถานะรอตรวจ (Hold) จนกว่าจะแนบ COA และยืนยัน — Lot ที่ COA ยังไม่ผ่าน เบิกไม่ได้
            </Typography.Text>
          </div>
          <Link href="/inventory/chemical-issues">
            <Button size="large" type="primary">
              เบิกสารเคมี
            </Button>
          </Link>
        </div>

        <div className={styles.tableCard}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Select
              style={{ width: 180 }}
              value={coaStatus}
              onChange={setCoaStatus}
              options={[
                { value: "", label: "ทุกสถานะ COA" },
                { value: "PENDING", label: COA_STATUS_LABEL.PENDING },
                { value: "VERIFIED", label: COA_STATUS_LABEL.VERIFIED },
                { value: "REJECTED", label: COA_STATUS_LABEL.REJECTED },
                { value: "NOT_REQUIRED", label: "Lot เดิม (ไม่ต้องตรวจ)" },
              ]}
            />
            <Checkbox checked={expiringOnly} onChange={(e) => setExpiringOnly(e.target.checked)}>
              เฉพาะใกล้หมดอายุ (≤ 30 วัน) / หมดอายุแล้ว
            </Checkbox>
            <Input
              allowClear
              style={{ width: 260 }}
              prefix={<SearchOutlined />}
              placeholder="ค้น Lot / Batch / สารเคมี"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => setApplied(keyword)}
              onBlur={() => setApplied(keyword)}
            />
          </div>
          <Table
            rowKey="id"
            className={styles.dataTable}
            columns={columns}
            dataSource={lots}
            loading={query.isFetching}
            pagination={{ pageSize: 20, showTotal: (t) => `ทั้งหมด ${t} Lot` }}
            scroll={{ x: 1000 }}
            locale={{ emptyText: "ไม่มี Lot ตามเงื่อนไข" }}
          />
        </div>

        {selected ? <CoaModal key={selected.id} lot={selected} onClose={() => setSelectedId(undefined)} /> : null}
      </section>
    </MasterPageGate>
  );
}
