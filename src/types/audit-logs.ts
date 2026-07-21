export type AuditLogPerformedBy = {
  id: string;
  username: string;
  displayName: string;
};

export type AuditLog = {
  id: string;
  action: string;
  moduleCode?: string;
  screenCode?: string;
  documentType?: string;
  documentId?: string;
  documentNo?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  performedById?: string;
  performedBy?: AuditLogPerformedBy;
  performedAt: string;
};

export type AuditLogQueryParams = {
  action?: string;
  moduleCode?: string;
  screenCode?: string;
  documentType?: string;
  performedById?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type AuditLogListData = {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
};

export type AuditLogListApiResponse = {
  statusCode?: number;
  message: string;
  data: AuditLogListData;
};
