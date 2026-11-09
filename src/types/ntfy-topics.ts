export type NtfyTopic = {
  id: string;
  topic: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NtfyTopicQueryParams = {
  topic?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateNtfyTopicRequest = {
  topic: string;
  description: string;
  isActive?: boolean;
};

export type UpdateNtfyTopicRequest = Partial<CreateNtfyTopicRequest>;

export type NtfyTopicApiResponse = {
  message: string;
  data: NtfyTopic;
};

export type NtfyTopicListApiResponse = {
  message: string;
  data: NtfyTopic[];
};
