/** ผลตรวจก่อนส่งออกไป Express (สมุดรายวันซื้อ/จ่าย ใช้ร่วมกัน) */
export type ExpressExportPreview = {
  totalDocs: number;
  /** ยังไม่เคยส่ง */
  newCount: number;
  /** เคยส่งแล้ว (ส่งซ้ำ) */
  alreadyExportedCount: number;
  /** เคยส่งแต่ไม่มี snapshot เดิม — ส่งซ้ำจะคำนวณสดแล้วตรึงเป็น snapshot (เฉพาะฝั่งซื้อ) */
  legacyNoSnapshotCount: number;
};

export type ExportBatchKind = "NEW" | "REEXPORT" | "MIXED";
export type ExportBatchStatus = "SUCCESS" | "FAILED";

export type ExportHistoryBatch = {
  id: string;
  exportedAt: string;
  exportedByName?: string;
  docCount: number;
  newCount: number;
  reexportCount: number;
  exportKind: ExportBatchKind;
  status: ExportBatchStatus;
  errorMessage?: string;
};

export type ExportHistoryList = {
  items: ExportHistoryBatch[];
  total: number;
  page: number;
  limit: number;
};

/** ประวัติการส่งออกของเอกสาร/รายการ 1 ใบ */
export type DocumentExportHistory = {
  exportCount: number;
  lastExportedAt?: string;
  /** จำนวนครั้งที่ส่งก่อนมีระบบประวัติ (ไม่มีวันเวลา/ผู้ส่ง) */
  untrackedCount: number;
  entries: ExportHistoryBatch[];
};
