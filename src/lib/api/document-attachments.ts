import { apiDownloadBlob, apiFetch, apiUpload } from "./client";
import type {
  DocumentAttachmentApiResponse,
  DocumentAttachmentListApiResponse,
} from "@/types/document-attachments";

export function getDocumentAttachments(
  token: string,
  params: { documentType: string; documentId: string },
) {
  const search = new URLSearchParams({
    documentType: params.documentType,
    documentId: params.documentId,
  });
  return apiFetch<DocumentAttachmentListApiResponse>(
    `/api/documents/attachments?${search.toString()}`,
    { token },
  );
}

export function uploadDocumentAttachment(
  token: string,
  params: {
    file: File;
    documentType: string;
    documentId: string;
    attachmentGroup?: string;
    description?: string;
  },
) {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("documentType", params.documentType);
  formData.append("documentId", params.documentId);
  if (params.attachmentGroup) {
    formData.append("attachmentGroup", params.attachmentGroup);
  }
  if (params.description) {
    formData.append("description", params.description);
  }
  return apiUpload<DocumentAttachmentApiResponse>(
    "/api/documents/attachments",
    formData,
    { token },
  );
}

export function downloadDocumentAttachment(token: string, id: string) {
  return apiDownloadBlob(`/api/documents/attachments/${id}/download`, {
    token,
  });
}

export function deleteDocumentAttachment(token: string, id: string) {
  return apiFetch<DocumentAttachmentApiResponse>(
    `/api/documents/attachments/${id}`,
    { method: "DELETE", token },
  );
}
