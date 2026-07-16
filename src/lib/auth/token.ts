const ACCESS_TOKEN_KEY = "accessToken";

export function hasAccessToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return Boolean(token?.trim());
}

export function getAccessToken(): string {
  if (typeof window === "undefined") {
    throw new Error("ไม่ได้เข้าสู่ระบบ");
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token?.trim()) {
    throw new Error("ไม่ได้เข้าสู่ระบบ");
  }

  return token;
}

export function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem("user");
}
