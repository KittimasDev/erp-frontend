export type TempCaseStatus = "OPEN" | "DONE";

export const TEMP_CASE_STATUS_LABEL: Record<TempCaseStatus, string> = {
  OPEN: "ยังไม่ทำ",
  DONE: "ทำแล้ว",
};

export type TempCaseCategory = {
  id: string;
  code: string;
  nameTh: string;
  sortOrder: number;
  isActive: boolean;
};

export type TempCase = {
  id: string;
  title: string;
  description: string;
  pageUrl: string;
  status: TempCaseStatus;
  categoryId: string;
  categoryCode?: string;
  categoryNameTh?: string;
  createdByUserId: string;
  createdByDisplayName?: string;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateTempCaseRequest = {
  title: string;
  description: string;
  pageUrl: string;
  categoryId: string;
  status?: TempCaseStatus;
};

export type UpdateTempCaseRequest = Partial<CreateTempCaseRequest>;

export type TempCaseApiResponse = {
  message: string;
  data: TempCase;
};

export type TempCaseListApiResponse = {
  message: string;
  data: TempCase[];
};

export type TempCaseCategoryListApiResponse = {
  message: string;
  data: TempCaseCategory[];
};

export type TempCaseCategorySummary = {
  categoryId: string;
  categoryCode: string;
  categoryNameTh: string;
  total: number;
  open: number;
  done: number;
};

export type TempCaseSummary = {
  total: number;
  open: number;
  done: number;
  withImages: number;
  byCategory: TempCaseCategorySummary[];
};

export type TempCaseSummaryApiResponse = {
  message: string;
  data: TempCaseSummary;
};

export type TempCaseImage = {
  id: string;
  documentType: string;
  documentId: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: string | number;
  createdAt: string;
};

export type TempCaseImageListApiResponse = {
  message: string;
  data: TempCaseImage[];
};
