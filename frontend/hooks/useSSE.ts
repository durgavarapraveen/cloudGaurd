"use client";

import { useEffect, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import {
  requireTenantSlug,
  authHeaders,
  getAccessTokenPayload,
  BASE,
  clearStoredSession,
  saveRefreshedSession,
  parseApiError,
} from "@/lib/api";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/lib/session-keys";
import { LoginResponse } from "@/lib/props";

type EventHandlers = Record<string, (data: any) => void>;

export function useSSE(
  handlers: EventHandlers,
  githubConnected: boolean, // Fix 3 — accept as props instead of stale module imports
  organizationConnected: boolean,
) {
  const handlersRef = useRef(handlers);
  const connectedRef = useRef(false); // Fix 4 — StrictMode double-invoke guard

  // always keep handlersRef in sync with latest handlers
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    // Fix 4 — prevent StrictMode from opening two SSE connections
    if (connectedRef.current) return;
    connectedRef.current = true;

    const controller = new AbortController();
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    async function refreshAccessToken(): Promise<void> {
      if (typeof window === "undefined") {
        throw new Error("Token refresh is only available in the browser");
      }

      const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

      console.debug(
        "[refresh] key:",
        REFRESH_TOKEN_KEY,
        "found:",
        !!refreshToken,
      );

      if (!refreshToken) {
        throw new Error("Missing refresh token");
      }

      const payload = getAccessTokenPayload();
      const refreshPath =
        payload?.privilege === "rootUser"
          ? "/root_user/refresh-token"
          : "/auth/refresh-token";

      const res = await fetch(`${BASE}${refreshPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearStoredSession();
        throw new Error(await parseApiError(res, "Session expired"));
      }

      const session = (await res.json()) as LoginResponse;
      saveRefreshedSession(session);
      // Fix 1 — removed connect() call here; caller (onopen) throws
      // "token_refreshed" which triggers a single reconnect via catch block
    }

    const connect = async () => {
      // wait for token before attempting connection
      const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        if (!controller.signal.aborted) {
          retryTimeout = setTimeout(connect, 500);
        }
        return;
      }

      // read headers fresh on every connect() call
      // so reconnects always use the latest token, including after refresh
      let currentHeaders: Record<string, string>;
      let tenantSlug: string;

      try {
        currentHeaders = authHeaders() as Record<string, string>;
        tenantSlug = requireTenantSlug();
      } catch (err) {
        console.warn("SSE: tenant slug not ready, retrying...", err);
        if (!controller.signal.aborted) {
          retryTimeout = setTimeout(connect, 500);
        }
        return;
      }

      // Fix 3 — githubConnected/organizationConnected now come from props,
      // not stale module-level imports, so this check is always fresh
      console.log(githubConnected, organizationConnected);
      if (!githubConnected && !organizationConnected) {
        console.info("SSE: github and org not connected, skipping connection");
        return;
      }

      try {
        // Fix 2 — use BASE instead of hardcoded localhost
        await fetchEventSource(`${BASE}/sse/stream`, {
          signal: controller.signal,
          headers: {
            ...currentHeaders,
            "X-Tenant-Slug": tenantSlug,
          },

          async onopen(response) {
            if (response.status === 403) {
              // user not eligible for SSE — do not retry
              console.info("SSE: user not eligible, aborting connection");
              controller.abort();
              return;
            }

            if (response.status === 401) {
              try {
                await refreshAccessToken();
              } catch (err) {
                console.error("SSE: token refresh failed", err);
              }
              // Fix 1 — single throw here triggers one reconnect in catch block
              // refreshAccessToken no longer calls connect() itself
              throw new Error("token_refreshed");
            }

            if (!response.ok) {
              throw new Error(
                `SSE open failed with status: ${response.status}`,
              );
            }

            console.info("SSE: connection opened");
          },

          onmessage(event) {
            console.log("SSE event received:", event);
            const type = event.event || "message";
            const handler = handlersRef.current[type];

            if (!handler) {
              console.warn("SSE: no handler for event type:", type);
              return;
            }

            const parsed = (() => {
              try {
                return JSON.parse(event.data);
              } catch {
                return event.data;
              }
            })();

            handler(parsed);
          },

          onclose() {
            // server closed connection cleanly — retry manually
            console.warn(
              "SSE: server closed connection, reconnecting in 3s...",
            );
            if (!controller.signal.aborted) {
              retryTimeout = setTimeout(connect, 3000);
            }
          },

          onerror(err) {
            // throw to stop fetchEventSource's internal retry
            // falls through to our catch block for controlled retry
            throw err;
          },
        });
      } catch (err: any) {
        if (controller.signal.aborted) {
          // intentional abort (unmount or 403) — do not retry
          return;
        }

        const delay = err?.message === "token_refreshed" ? 500 : 3000;
        console.error(`SSE: connection error, retrying in ${delay}ms`, err);
        retryTimeout = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      connectedRef.current = false; // reset so re-mount works correctly
      controller.abort();
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [githubConnected, organizationConnected]); // re-run if connection eligibility changes
}
