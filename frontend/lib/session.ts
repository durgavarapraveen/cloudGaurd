import { LoginResponse } from "./props";

import {
  ACCESS_TOKEN_KEY,
  EMAIL,
  LAST_SCAN_AT,
  PERMISSIONS_KEY,
  REFRESH_TOKEN_KEY,
  USER_ID_KEY,
  USERNAME,
} from "./session-keys";

export function saveSession(session: LoginResponse) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);

  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);

  window.localStorage.setItem(USER_ID_KEY, session.user_id);

  window.localStorage.setItem(
    PERMISSIONS_KEY,
    JSON.stringify(session.permissions ?? []),
  );
  window.localStorage.setItem(
    "GITHUB_CONNECTED",
    session.github_connected ? "true" : "false",
  );
  window.localStorage.setItem(
    "ORGANIZATION_CONNECTED",
    session.cloud_account_connected ? "true" : "false",
  );
  window.localStorage.setItem(USERNAME, session.username);
  window.localStorage.setItem(EMAIL, session.email);
}

export function encodeSessionForHandoff(session: LoginResponse) {
  return encodeURIComponent(btoa(JSON.stringify(session)));
}

export function consumeSessionHandoff() {
  if (typeof window === "undefined") return;

  const prefix = "#session=";

  if (!window.location.hash.startsWith(prefix)) return;

  try {
    const encodedSession = window.location.hash.slice(prefix.length);

    const session = JSON.parse(
      atob(decodeURIComponent(encodedSession)),
    ) as LoginResponse;

    saveSession(session);

    window.history.replaceState(
      null,
      document.title,
      `${window.location.pathname}${window.location.search}`,
    );
  } catch {
    clearSession();
  }
}

export function clearSession() {
  window.localStorage.clear();
}

export function hasSession() {
  if (typeof window === "undefined") return false;

  return Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY));
}

export function getCurrentUserId() {
  if (typeof window === "undefined") return null;

  return window.localStorage.getItem(USER_ID_KEY);
}

export function getPermissions() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(PERMISSIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export const githubConnected = () => {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem("GITHUB_CONNECTED") === "true";
};

export const organizationConnected = () => {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem("ORGANIZATION_CONNECTED") === "true";
};

export const get_username = () => {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(USERNAME);
};

export const get_email = () => {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(EMAIL);
};
