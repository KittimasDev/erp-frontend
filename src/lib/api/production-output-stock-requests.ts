import { apiFetch } from "./client";
import type {
  AvailableMaterialIssueListApiResponse,
  CreateProductionOutputStockRequestBatchBody,
  CreateProductionOutputStockRequestBody,
  CreateProductionOutputStockRequestFromOrderBody,
  ProductionOutputReadyOrderListApiResponse,
  ProductionOutputStockRequestApiResponse,
  ProductionOutputStockRequestListApiResponse,
  ProductionOutputStockRequestQueryParams,
  QueryProductionOutputReadyOrdersParams,
  RejectProductionOutputStockRequestBody,
} from "@/types/production-output-stock-request";

function buildQuery(params?: ProductionOutputStockRequestQueryParams) {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();
  if (params.status?.trim()) {
    search.set("status", params.status.trim());
  }
  if (params.itemId) {
    search.set("itemId", params.itemId);
  }
  if (params.warehouseId) {
    search.set("warehouseId", params.warehouseId);
  }
  if (params.referenceDocType?.trim()) {
    search.set("referenceDocType", params.referenceDocType.trim());
  }
  if (params.referenceDocId) {
    search.set("referenceDocId", params.referenceDocId);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function getProductionOutputStockRequests(
  token: string,
  params?: ProductionOutputStockRequestQueryParams,
) {
  return apiFetch<ProductionOutputStockRequestListApiResponse>(
    `/api/production-output/stock-requests${buildQuery(params)}`,
    { method: "GET", token },
  );
}

export function getProductionOutputStockRequest(token: string, id: string) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/production-output/stock-requests/${id}`,
    { method: "GET", token },
  );
}

export function createProductionOutputStockRequest(
  token: string,
  body: CreateProductionOutputStockRequestBody,
) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    "/api/production-output/stock-requests",
    { method: "POST", token, body },
  );
}

export function createProductionOutputStockRequestBatch(
  token: string,
  body: CreateProductionOutputStockRequestBatchBody,
) {
  return apiFetch<ProductionOutputStockRequestListApiResponse>(
    "/api/production-output/stock-requests/batch",
    { method: "POST", token, body },
  );
}

export function getProductionOutputReadyOrders(
  token: string,
  params?: QueryProductionOutputReadyOrdersParams,
) {
  const search = new URLSearchParams();
  if (params?.from) {
    search.set("from", params.from);
  }
  if (params?.to) {
    search.set("to", params.to);
  }
  if (params?.all) {
    search.set("all", "true");
  }
  if (params?.q?.trim()) {
    search.set("q", params.q.trim());
  }
  const query = search.toString();
  return apiFetch<ProductionOutputReadyOrderListApiResponse>(
    `/api/production-output/stock-requests/ready-production-orders${
      query ? `?${query}` : ""
    }`,
    { method: "GET", token },
  );
}

export function createProductionOutputStockRequestFromOrder(
  token: string,
  productionOrderId: string,
  body: CreateProductionOutputStockRequestFromOrderBody,
) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/production-output/stock-requests/from-production-order/${productionOrderId}`,
    { method: "POST", token, body },
  );
}

export function getAvailableMaterialIssues(
  token: string,
  params?: { productionOrderId?: string },
) {
  const search = new URLSearchParams();
  if (params?.productionOrderId) {
    search.set("productionOrderId", params.productionOrderId);
  }
  const query = search.toString();
  return apiFetch<AvailableMaterialIssueListApiResponse>(
    `/api/production-output/stock-requests/available-material-issues${
      query ? `?${query}` : ""
    }`,
    { method: "GET", token },
  );
}

export function replaceProductionOutputMaterialIssues(
  token: string,
  id: string,
  materialIssueIds: string[],
) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/production-output/stock-requests/${id}/material-issues`,
    {
      method: "POST",
      token,
      body: { materialIssueIds },
    },
  );
}

export function cancelProductionOutputStockRequest(token: string, id: string) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/production-output/stock-requests/${id}/cancel`,
    { method: "POST", token },
  );
}

export function getProductionOutputApprovals(token: string) {
  return apiFetch<ProductionOutputStockRequestListApiResponse>(
    "/api/warehouse/production-output-approvals",
    { method: "GET", token },
  );
}

export function getProductionOutputApproval(token: string, id: string) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/warehouse/production-output-approvals/${id}`,
    { method: "GET", token },
  );
}

export function approveProductionOutputStockRequest(token: string, id: string) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/warehouse/production-output-approvals/${id}/approve`,
    { method: "POST", token },
  );
}

export function rejectProductionOutputStockRequest(
  token: string,
  id: string,
  body: RejectProductionOutputStockRequestBody,
) {
  return apiFetch<ProductionOutputStockRequestApiResponse>(
    `/api/warehouse/production-output-approvals/${id}/reject`,
    { method: "POST", token, body },
  );
}
