const ACCESS_TOKEN_KEY = "accessToken";

export function getAccessToken(): string {
  if (typeof window === "undefined") {
    throw new Error("ไม่ได้เข้าสู่ระบบ");
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token) {
    throw new Error("ไม่ได้เข้าสู่ระบบ");
  }

  return token;
}
