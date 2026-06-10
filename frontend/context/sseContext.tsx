// context/SSEContext.tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { useSSE } from "@/hooks/useSSE";
import { githubConnected, organizationConnected } from "@/lib/session";

type Summary = Record<string, number>;
type Resource = { type: string; name: string; region: string; raw: any };

type SSEState = {
  lastFetchedAt: string | null;
  summary: Summary;
  resources: Resource[];
};

const SSEContext = createContext<{
  state: SSEState;
  setResources: (r: Resource[]) => void;
} | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SSEState>({
    lastFetchedAt: null,
    summary: {},
    resources: [],
  });

  const isGithubConnected = githubConnected();
  const isOrganizationConnected = organizationConnected();

  // listen for pushed events
  useSSE(
    {
      last_fetch_updated: (data) => {
        console.log("Received last_fetch_updated event:", data);
        setState((s) => ({ ...s, lastFetchedAt: data.last_fetched_at }));
      },
      summary_updated: (data) => {
        console.log("Received summary_updated event:", data);
        setState((s) => ({ ...s, summary: data }));
      },
      resources_updated: (data) => {
        console.log("Received resources_updated event:", data);
        setState((s) => ({ ...s, resources: data.resources }));
      },
      connected: (data) => {
        console.log("SSE connected:", data);
      },
      task_update: (data) => {
        console.log("Task update received:", data);
      },
    },
    isGithubConnected,
    isOrganizationConnected,
  );

  return (
    <SSEContext.Provider
      value={{
        state,
        setResources: (r) => setState((s) => ({ ...s, resources: r })),
      }}
    >
      {children}
    </SSEContext.Provider>
  );
}

export const useSSEContext = () => {
  const ctx = useContext(SSEContext);
  if (!ctx) throw new Error("useSSEContext must be inside SSEProvider");
  return ctx;
};
