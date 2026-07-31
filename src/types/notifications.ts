export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  itemCodes?: string[];
  issueNo?: string;
  createdAt: string;
  read: boolean;
};

export type NotificationListApiResponse = {
  statusCode: number;
  message: string;
  data: AppNotification[];
};

export type NotificationUnreadCountApiResponse = {
  statusCode: number;
  message: string;
  data: { count: number };
};

export type NotificationMarkReadApiResponse = {
  statusCode: number;
  message: string;
  data: AppNotification;
};

export type NotificationMarkAllReadApiResponse = {
  statusCode: number;
  message: string;
  data: { updated: number };
};
