import type {
  ExpenseType,
  ExpenseTypeQuery,
  SaveExpenseTypeRequest,
} from "@/types/expense-types";

import { apiFetch } from "./client";

const BASE = "/api/master-data/expense-types";

type Res<T> = { statusCode: number; message: string; data: T };

export function getExpenseTypes(token: string, params?: ExpenseTypeQuery) {
  const query =
    params?.isActive === undefined ? "" : `?isActive=${String(params.isActive)}`;
  return apiFetch<Res<ExpenseType[]>>(`${BASE}${query}`, { token });
}

export function createExpenseType(token: string, body: SaveExpenseTypeRequest) {
  return apiFetch<Res<ExpenseType>>(BASE, { method: "POST", token, body });
}

export function updateExpenseType(
  token: string,
  id: string,
  body: Partial<SaveExpenseTypeRequest>,
) {
  return apiFetch<Res<ExpenseType>>(`${BASE}/${id}`, { method: "PATCH", token, body });
}

export function deleteExpenseType(token: string, id: string) {
  return apiFetch<Res<ExpenseType>>(`${BASE}/${id}`, { method: "DELETE", token });
}
