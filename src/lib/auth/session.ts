export type StoredUser = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  roles?: Array<{ id: string; roleCode: string; roleName: string }>;
};

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem("user");
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("user", JSON.stringify(user));
}

export function userHasRole(roleCode: string): boolean {
  const user = getStoredUser();
  return Boolean(
    user?.roles?.some(
      (role) =>
        role.roleCode === roleCode || role.roleCode === "ADMINISTRATOR",
    ),
  );
}

export function isAdministrator(): boolean {
  return userHasRole("ADMINISTRATOR");
}
