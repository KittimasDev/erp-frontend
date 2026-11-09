import { apiFetch } from "./client";
import type {
  CreateNtfyTopicRequest,
  NtfyTopicApiResponse,
  NtfyTopicListApiResponse,
  NtfyTopicQueryParams,
  UpdateNtfyTopicRequest,
} from "@/types/ntfy-topics";

function buildNtfyTopicsQuery(params?: NtfyTopicQueryParams) {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.topic?.trim()) {
    search.set("topic", params.topic.trim());
  }
  if (params.description?.trim()) {
    search.set("description", params.description.trim());
  }
  if (params.isActive !== undefined && params.isActive !== null) {
    search.set("isActive", String(params.isActive));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getNtfyTopics(token: string, params?: NtfyTopicQueryParams) {
  return apiFetch<NtfyTopicListApiResponse>(
    `/api/master-data/ntfy-topics${buildNtfyTopicsQuery(params)}`,
    { method: "GET", token },
  );
}

export function createNtfyTopic(token: string, body: CreateNtfyTopicRequest) {
  return apiFetch<NtfyTopicApiResponse>("/api/master-data/ntfy-topics", {
    method: "POST",
    token,
    body,
  });
}

export function updateNtfyTopic(
  token: string,
  id: string,
  body: UpdateNtfyTopicRequest,
) {
  return apiFetch<NtfyTopicApiResponse>(`/api/master-data/ntfy-topics/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteNtfyTopic(token: string, id: string) {
  return apiFetch<NtfyTopicApiResponse>(`/api/master-data/ntfy-topics/${id}`, {
    method: "DELETE",
    token,
  });
}
