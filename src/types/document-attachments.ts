export type DocumentAttachment = {
  id: string;
  documentType: string;
  documentId: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: string | number;
  description?: string;
  attachmentGroup?: string;
  uploadedById?: string;
  uploadedByName?: string;
  createdAt: string;
};

export type DocumentAttachmentListApiResponse = {
  statusCode: number;
  message: string;
  data: DocumentAttachment[];
};

export type DocumentAttachmentApiResponse = {
  statusCode: number;
  message: string;
  data: DocumentAttachment;
};

export const DOCUMENT_TYPE_PO = "PO";
export const ATTACHMENT_GROUP_QUOTATION = "QUOTATION";

export const DOCUMENT_TYPE_SO = "SO";
export const ATTACHMENT_GROUP_CUSTOMER_PO = "CUSTOMER_PO";

export const DOCUMENT_TYPE_SALES_INVOICE = "SALES_INVOICE";
export const DOCUMENT_TYPE_SALES_CREDIT_NOTE = "SALES_CREDIT_NOTE";
export const ATTACHMENT_GROUP_PAYMENT = "PAYMENT";

export const DOCUMENT_TYPE_SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT";

/** ตั๋วชั่ง — รูป OCR / กล้อง T2900 */
export const DOCUMENT_TYPE_WEIGHBRIDGE_TICKET = "WEIGHBRIDGE_TICKET";
export const ATTACHMENT_GROUP_T2900_CAMERA = "T2900_CAMERA";
