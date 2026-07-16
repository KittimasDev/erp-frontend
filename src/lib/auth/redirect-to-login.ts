import { clearAccessToken } from "@/lib/auth/token";

let redirectingToLogin = false;

export function redirectToLogin(nextPath?: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname.startsWith("/login")) {
    return;
  }

  if (redirectingToLogin) {
    return;
  }

  redirectingToLogin = true;
  clearAccessToken();

  const path =
    nextPath ??
    `${window.location.pathname}${window.location.search}`;
  const loginUrl =
    path && path !== "/"
      ? `/login?next=${encodeURIComponent(path)}`
      : "/login";

  window.location.replace(loginUrl);
}
