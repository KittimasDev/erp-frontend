export type LabSampleStatus =
  | "REGISTERED"
  | "TESTING"
  | "APPROVED"
  | "REJECTED"
  | string;

export const LAB_SAMPLE_STATUS_LABEL: Record<string, string> = {
  REGISTERED: "ลงทะเบียน",
  TESTING: "กำลังตรวจ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
};

export type LabTestResult = {
  id: string;
  parameterName: string;
  resultValue: string;
  unit?: string;
  specMin?: string;
  specMax?: string;
  remark?: string;
  testedById?: string;
  testedAt: string;
};

export type LabSample = {
  id: string;
  sampleNo: string;
  sampleType: string;
  referenceDocType?: string;
  referenceDocId?: string;
  referenceDocNo?: string;
  collectedDate: string;
  status: LabSampleStatus;
  remark?: string;
  collectedById?: string;
  reviewedById?: string;
  reviewedAt?: string;
  reviewRemark?: string;
  results: LabTestResult[];
  createdAt: string;
  updatedAt: string;
};

export type LabSampleCoa = {
  sample: LabSample;
  approvedByName?: string;
  approvedAt?: string;
};

export type LabSampleQrCode = {
  sampleNo: string;
  qrCodeDataUri: string;
};

export type LabSampleQueryParams = {
  sampleNo?: string;
  status?: string;
  sampleType?: string;
  referenceDocId?: string;
};

export type LabSampleListApiResponse = {
  statusCode: number;
  message: string;
  data: LabSample[];
};

export type LabSampleApiResponse = {
  statusCode: number;
  message: string;
  data: LabSample;
};

export type LabSampleCoaApiResponse = {
  statusCode: number;
  message: string;
  data: LabSampleCoa;
};

export type LabSampleQrCodeApiResponse = {
  statusCode: number;
  message: string;
  data: LabSampleQrCode;
};
