export type NotificationEventSummary = {
  code: string;
  nameTh: string;
  descriptionTh: string;
  href: string;
};

export type NotificationEventRoleRow = {
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystemRole: boolean;
  isEnabled: boolean;
};

export type NotificationEventDetail = NotificationEventSummary & {
  roles: NotificationEventRoleRow[];
};

export type NotificationEventListApiResponse = {
  statusCode: number;
  message: string;
  data: NotificationEventSummary[];
};

export type NotificationEventDetailApiResponse = {
  statusCode: number;
  message: string;
  data: NotificationEventDetail;
};

export type UpdateNotificationEventRolesBody = {
  roles: Array<{ roleId: string; isEnabled: boolean }>;
};

export type NotificationEventTestResult = {
  notifiedRoleCodes: string[];
};

export type NotificationEventTestApiResponse = {
  statusCode: number;
  message: string;
  data: NotificationEventTestResult;
};
