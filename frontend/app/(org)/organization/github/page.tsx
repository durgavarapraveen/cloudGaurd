"use client";

import { github } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RepoStats {
  branches_count: number;
  pulls_count: number;
  commits_count: number;
  merged_pulls_count: number;
}

interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updated_at: string;
  html_url: string;
  stargazers_count?: number;
  forks_count?: number;
  stats?: RepoStats;
}

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
};

export default function GitHubPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [connectingInProgress, setConnectingInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("all");
  const [filterVisibility, setFilterVisibility] = useState("all");

  const loadRepos = useCallback(async ({ silent = false } = {}) => {
    try {
      setLoading(true);
      if (!silent) setError(null);
      const res: Repo[] = await github.loadRepos();
      // Load stats for each repo in parallel
      const reposWithStats = await Promise.all(
        res.map(async (repo) => {
          try {
            const [owner, name] = repo.full_name.split("/");
            const stats: RepoStats = await github.getRepoStats(owner, name);
            return { ...repo, stats };
          } catch {
            return repo;
          }
        }),
      );
      setRepos(reposWithStats);
      setConnected(true);
      setError(null);
      return true;
    } catch (err) {
      setConnected(false);
      if (!silent)
        setError(err instanceof Error ? err.message : "Failed to load repos");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCheckingConnection(true);
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "true") {
        window.history.replaceState({}, "", window.location.pathname);
        setConnectingInProgress(false);
      }
      await loadRepos({ silent: true });
      if (!cancelled) setCheckingConnection(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRepos]);

  useEffect(() => {
    if (!connectingInProgress) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res: Repo[] = await github.loadRepos();
        setRepos(res);
        setConnected(true);
        setConnectingInProgress(false);
        setError(null);
        clearInterval(interval);
      } catch (err) {
        if (attempts >= 20) {
          setConnectingInProgress(false);
          setError(
            err instanceof Error
              ? err.message
              : "GitHub installation was not completed",
          );
          clearInterval(interval);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [connectingInProgress]);

  async function connectGithub() {
    try {
      setLoading(true);
      setError(null);
      const url: string = await github.connectGithub();
      const tab = window.open(url);
      if (tab) {
        tab.focus();
        setConnectingInProgress(true);
      } else window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open GitHub");
    } finally {
      setLoading(false);
    }
  }

  const languages = [
    "all",
    ...Array.from(
      new Set(repos.map((r) => r.language).filter(Boolean) as string[]),
    ),
  ];

  const filtered = repos.filter((r) => {
    const matchSearch =
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase());
    const matchLang = filterLang === "all" || r.language === filterLang;
    const matchVis =
      filterVisibility === "all" ||
      (filterVisibility === "private" ? r.private : !r.private);
    return matchSearch && matchLang && matchVis;
  });

  if (checkingConnection) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
          <p className="text-[#8b949e] text-sm font-mono">
            Checking GitHub connection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Header */}
      <div className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 16 16"
              className="w-6 h-6 fill-[#e6edf3]"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="font-semibold text-lg">GitHub Integration</span>
          </div>
          {connected && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-[#3fb950]">
                <span className="w-2 h-2 rounded-full bg-[#3fb950] inline-block" />
                Connected
              </span>
              <button
                onClick={() => loadRepos()}
                disabled={loading}
                className="px-3 py-1.5 text-sm border border-[#30363d] rounded-md bg-[#21262d] hover:bg-[#30363d] transition-colors disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
              <button
                onClick={connectGithub}
                disabled={loading}
                className="px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Opening GitHub...
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 16 16"
                      className="w-4 h-4 fill-white"
                      aria-hidden="true"
                    >
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    Update GitHub Settings
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Not connected */}
        {!connected && !connectingInProgress && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="w-20 h-20 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center">
              <svg
                viewBox="0 0 16 16"
                className="w-10 h-10 fill-[#8b949e]"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                Connect your GitHub account
              </h2>
              <p className="text-[#8b949e] text-sm max-w-sm">
                Install the GitHub App to start syncing your repositories with
                this organization.
              </p>
            </div>
            {error && (
              <div className="max-w-lg rounded-md border border-[#f85149]/40 bg-[#f85149]/10 px-4 py-3 text-sm text-[#ffb4ae]">
                {error}
              </div>
            )}
            <button
              onClick={connectGithub}
              disabled={loading}
              className="px-5 py-2.5 bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Opening GitHub...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 16 16"
                    className="w-4 h-4 fill-white"
                    aria-hidden="true"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Connect GitHub
                </>
              )}
            </button>
          </div>
        )}

        {/* Waiting for install */}
        {connectingInProgress && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
            <p className="text-[#8b949e] text-sm">
              Waiting for GitHub installation to complete...
            </p>
            <p className="text-[#8b949e] text-xs">
              Complete the setup in the GitHub tab, then return here.
            </p>
            <button
              onClick={() => {
                setConnectingInProgress(false);
                setError(null);
              }}
              className="mt-2 text-xs text-[#58a6ff] hover:underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Connected — repo list */}
        {connected && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Repositories", value: repos.length },
                {
                  label: "Total Branches",
                  value: repos.reduce(
                    (a, r) => a + (r.stats?.branches_count ?? 0),
                    0,
                  ),
                },
                {
                  label: "Open PRs",
                  value: repos.reduce(
                    (a, r) => a + (r.stats?.pulls_count ?? 0),
                    0,
                  ),
                },
                {
                  label: "Merged PRs",
                  value: repos.reduce(
                    (a, r) => a + (r.stats?.merged_pulls_count ?? 0),
                    0,
                  ),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg p-4"
                >
                  <p className="text-[#8b949e] text-xs mb-1">{s.label}</p>
                  <p className="text-2xl font-semibold text-[#e6edf3]">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <input
                type="text"
                placeholder="Search repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-sm text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l === "all" ? "All languages" : l}
                  </option>
                ))}
              </select>
              <select
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-sm text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="all">All repos</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-[#8b949e] text-sm">
                {filtered.length} repositor{filtered.length !== 1 ? "ies" : "y"}
              </p>
            </div>

            {loading ? (
              <div className="grid gap-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-[#30363d] rounded-lg p-4 animate-pulse bg-[#161b22]"
                  >
                    <div className="h-4 bg-[#30363d] rounded w-1/3 mb-3" />
                    <div className="h-3 bg-[#30363d] rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((repo) => {
                  const [owner, name] = repo.full_name.split("/");
                  return (
                    <div
                      key={repo.id}
                      onClick={() =>
                        router.push(
                          `/organization/github/${repo.id}?owner=${owner}&repo=${name}`,
                        )
                      }
                      className="border border-[#30363d] rounded-lg p-4 bg-[#161b22] hover:border-[#58a6ff] transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[#58a6ff] group-hover:underline truncate">
                              {repo.full_name}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full border border-[#30363d] text-[#8b949e]">
                              {repo.private ? "Private" : "Public"}
                            </span>
                          </div>
                          {repo.description && (
                            <p className="text-sm text-[#8b949e] mt-1 line-clamp-2">
                              {repo.description}
                            </p>
                          )}

                          {/* Stats row */}
                          {repo.stats && (
                            <div className="flex flex-wrap gap-4 mt-3">
                              {[
                                {
                                  icon: "⎇",
                                  label: "Branches",
                                  value: repo.stats.branches_count,
                                },
                                {
                                  icon: "⤴",
                                  label: "Open PRs",
                                  value: repo.stats.pulls_count,
                                },
                                {
                                  icon: "✓",
                                  label: "Merged",
                                  value: repo.stats.merged_pulls_count,
                                },
                                {
                                  icon: "◎",
                                  label: "Commits",
                                  value: repo.stats.commits_count,
                                },
                              ].map((s) => (
                                <span
                                  key={s.label}
                                  className="flex items-center gap-1 text-xs text-[#8b949e]"
                                >
                                  <span className="text-[#58a6ff]">
                                    {s.icon}
                                  </span>
                                  <span className="font-medium text-[#e6edf3]">
                                    {s.value}
                                  </span>
                                  <span>{s.label}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-[#8b949e]">
                            {repo.language && (
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="w-3 h-3 rounded-full inline-block"
                                  style={{
                                    backgroundColor:
                                      languageColors[repo.language] ??
                                      "#8b949e",
                                  }}
                                />
                                {repo.language}
                              </span>
                            )}
                            {repo.stargazers_count !== undefined && (
                              <span>★ {repo.stargazers_count}</span>
                            )}
                            {repo.forks_count !== undefined && (
                              <span>⑂ {repo.forks_count}</span>
                            )}
                            <span>
                              Updated{" "}
                              {new Date(repo.updated_at).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="text-[#8b949e] group-hover:text-[#58a6ff] text-lg mt-1">
                          →
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-16 text-[#8b949e] text-sm">
                    No repositories match your filters.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
