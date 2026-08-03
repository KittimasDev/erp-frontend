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

export const DOCUMENT_TYPE_SALES_INVOICE = "SALES_INVOICE";
export const ATTACHMENT_GROUP_PAYMENT = "PAYMENT";
