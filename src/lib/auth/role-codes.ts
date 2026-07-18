/**
 * Mirror of backend system RoleCode values.
 * Backend seeds these on every API boot — safe to hardcode in UI role checks.
 */
export const RoleCode = {
  ADMINISTRATOR: "ADMINISTRATOR",
  WEIGHBRIDGE_OFFICER: "WEIGHBRIDGE_OFFICER",
  PROCUREMENT_OFFICER: "PROCUREMENT_OFFICER",
  PROCUREMENT_MANAGER: "PROCUREMENT_MANAGER",
  WAREHOUSE_OFFICER: "WAREHOUSE_OFFICER",
  WAREHOUSE_MANAGER: "WAREHOUSE_MANAGER",
  ACCOUNTING_OFFICER: "ACCOUNTING_OFFICER",
  EXECUTIVE: "EXECUTIVE",
} as const;

export type RoleCodeValue = (typeof RoleCode)[keyof typeof RoleCode];
