"use client";

import { github } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Branch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  created_at: string;
  updated_at: string;
  url: string;
  draft: boolean;
  merged_at?: string | null;
}

interface RepoStats {
  branches_count: number;
  pulls_count: number;
  commits_count: number;
  merged_pulls_count: number;
}

type Tab = "overview" | "branches" | "pulls" | "commits" | "merged";

export default function RepoDetailPage({
  params,
}: {
  params: { repoId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner") ?? "";
  const repoName = searchParams.get("repo") ?? "";

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [openPRs, setOpenPRs] = useState<PullRequest[]>([]);
  const [mergedPRs, setMergedPRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prFilter, setPrFilter] = useState<"open" | "closed">("open");
  const [branchSearch, setBranchSearch] = useState("");
  const [commitSearch, setCommitSearch] = useState("");

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const s: RepoStats = await github.getRepoStats(owner, repoName);
      setStats(s);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load repo stats",
      );
    } finally {
      setLoading(false);
    }
  }, [owner, repoName]);

  useEffect(() => {
    if (owner && repoName) loadStats();
  }, [loadStats, owner, repoName]);

  useEffect(() => {
    if (!owner || !repoName) return;
    (async () => {
      setTabLoading(true);
      try {
        if (tab === "branches" && branches.length === 0) {
          const data: Branch[] = await github.getBranches(owner, repoName);
          setBranches(data);
        }
        if (tab === "commits" && commits.length === 0) {
          const data: Commit[] = await github.getCommits(owner, repoName);
          setCommits(data);
        }
        if (tab === "pulls" && openPRs.length === 0) {
          const data: PullRequest[] = await github.getPulls(
            owner,
            repoName,
            "open",
          );
          setOpenPRs(data);
        }
        if (tab === "merged" && mergedPRs.length === 0) {
          const data: PullRequest[] = await github.getPulls(
            owner,
            repoName,
            "closed",
          );
          setMergedPRs(data.filter((pr) => pr.merged_at));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setTabLoading(false);
      }
    })();
  }, [
    tab,
    owner,
    repoName,
    branches.length,
    commits.length,
    openPRs.length,
    mergedPRs.length,
  ]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "branches", label: "Branches", count: stats?.branches_count },
    { id: "commits", label: "Commits", count: stats?.commits_count },
    { id: "pulls", label: "Open PRs", count: stats?.pulls_count },
    { id: "merged", label: "Merged PRs", count: stats?.merged_pulls_count },
  ];

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(branchSearch.toLowerCase()),
  );

  const filteredCommits = commits.filter(
    (c) =>
      c.message.toLowerCase().includes(commitSearch.toLowerCase()) ||
      c.author.toLowerCase().includes(commitSearch.toLowerCase()),
  );

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      {/* Header */}
      <div className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-[#8b949e] mb-3">
            <button
              onClick={() => router.push("/organization/github")}
              className="hover:text-[#58a6ff] transition-colors"
            >
              GitHub
            </button>
            <span>/</span>
            <span className="text-[#e6edf3] font-medium">{repoName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 16 16"
                className="w-5 h-5 fill-[#8b949e]"
                aria-hidden="true"
              >
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
              </svg>
              <h1 className="text-lg font-semibold">
                {owner} / {repoName}
              </h1>
            </div>
            <a
              href={`https://github.com/${owner}/${repoName}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#30363d] rounded-md bg-[#21262d] hover:bg-[#30363d] transition-colors text-[#e6edf3]"
            >
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4 fill-[#e6edf3]"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View on GitHub ↗
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "border-[#f78166] text-[#e6edf3]"
                  : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="bg-[#30363d] text-[#e6edf3] text-xs px-2 py-0.5 rounded-full">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-[#f85149]/40 bg-[#f85149]/10 px-4 py-3 text-sm text-[#ffb4ae]">
            {error}
          </div>
        )}

        {loading && tab === "overview" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 animate-pulse"
              >
                <div className="h-3 bg-[#30363d] rounded w-1/2 mb-3" />
                <div className="h-7 bg-[#30363d] rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Overview Tab */}
        {tab === "overview" && stats && !loading && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                {
                  label: "Branches",
                  value: stats.branches_count,
                  color: "#58a6ff",
                  icon: "⎇",
                  tab: "branches" as Tab,
                },
                {
                  label: "Open PRs",
                  value: stats.pulls_count,
                  color: "#3fb950",
                  icon: "⤴",
                  tab: "pulls" as Tab,
                },
                {
                  label: "Merged PRs",
                  value: stats.merged_pulls_count,
                  color: "#a371f7",
                  icon: "✓",
                  tab: "merged" as Tab,
                },
                {
                  label: "Commits",
                  value: stats.commits_count,
                  color: "#f78166",
                  icon: "◎",
                  tab: "commits" as Tab,
                },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => setTab(s.tab)}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 text-left hover:border-[#58a6ff] transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: s.color }} className="text-lg">
                      {s.icon}
                    </span>
                    <p className="text-[#8b949e] text-xs">{s.label}</p>
                  </div>
                  <p className="text-2xl font-semibold text-[#e6edf3]">
                    {s.value}
                  </p>
                  <p className="text-xs text-[#58a6ff] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View all →
                  </p>
                </button>
              ))}
            </div>

            {/* Quick previews */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Recent commits preview */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Recent Commits</h3>
                  <button
                    onClick={() => setTab("commits")}
                    className="text-xs text-[#58a6ff] hover:underline"
                  >
                    View all
                  </button>
                </div>
                {commits.length > 0 ? (
                  commits.slice(0, 3).map((c) => (
                    <div
                      key={c.sha}
                      className="flex items-start gap-2 py-2 border-t border-[#30363d] first:border-0"
                    >
                      <span className="font-mono text-xs text-[#58a6ff] mt-0.5 shrink-0">
                        {c.sha}
                      </span>
                      <span className="text-xs text-[#e6edf3] line-clamp-1 flex-1">
                        {c.message}
                      </span>
                      <span className="text-xs text-[#8b949e] shrink-0">
                        {timeAgo(c.date)}
                      </span>
                    </div>
                  ))
                ) : (
                  <button
                    onClick={() => setTab("commits")}
                    className="text-xs text-[#58a6ff] hover:underline py-2"
                  >
                    Load commits →
                  </button>
                )}
              </div>

              {/* Open PRs preview */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Open Pull Requests</h3>
                  <button
                    onClick={() => setTab("pulls")}
                    className="text-xs text-[#58a6ff] hover:underline"
                  >
                    View all
                  </button>
                </div>
                {openPRs.length > 0 ? (
                  openPRs.slice(0, 3).map((pr) => (
                    <div
                      key={pr.number}
                      className="flex items-start gap-2 py-2 border-t border-[#30363d] first:border-0"
                    >
                      <span className="text-xs text-[#8b949e] shrink-0 mt-0.5">
                        #{pr.number}
                      </span>
                      <span className="text-xs text-[#e6edf3] line-clamp-1 flex-1">
                        {pr.title}
                      </span>
                      <span className="text-xs text-[#8b949e] shrink-0">
                        {pr.author}
                      </span>
                    </div>
                  ))
                ) : (
                  <button
                    onClick={() => setTab("pulls")}
                    className="text-xs text-[#58a6ff] hover:underline py-2"
                  >
                    Load PRs →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Branches Tab */}
        {tab === "branches" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search branches..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
              <span className="text-sm text-[#8b949e]">
                {filteredBranches.length} branches
              </span>
            </div>
            {tabLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="border border-[#30363d] rounded-lg overflow-hidden">
                {filteredBranches.map((b, i) => (
                  <div
                    key={b.name}
                    className={`flex items-center justify-between px-4 py-3 bg-[#161b22] hover:bg-[#21262d] transition-colors ${i > 0 ? "border-t border-[#30363d]" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#8b949e] text-sm">⎇</span>
                      <span className="text-sm font-mono text-[#e6edf3]">
                        {b.name}
                      </span>
                      {b.protected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#388bfd1a] text-[#58a6ff] border border-[#388bfd33]">
                          protected
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-[#8b949e]">
                      {b.commit.sha.slice(0, 7)}
                    </span>
                  </div>
                ))}
                {filteredBranches.length === 0 && (
                  <div className="text-center py-10 text-[#8b949e] text-sm">
                    No branches found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Commits Tab */}
        {tab === "commits" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text"
                placeholder="Search commits..."
                value={commitSearch}
                onChange={(e) => setCommitSearch(e.target.value)}
                className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
              />
              <span className="text-sm text-[#8b949e]">
                {filteredCommits.length} commits
              </span>
            </div>
            {tabLoading ? (
              <LoadingSkeleton />
            ) : (
              <div className="border border-[#30363d] rounded-lg overflow-hidden">
                {filteredCommits.map((c, i) => (
                  <div
                    key={c.sha}
                    className={`flex items-start gap-4 px-4 py-3 bg-[#161b22] hover:bg-[#21262d] transition-colors ${i > 0 ? "border-t border-[#30363d]" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e6edf3] line-clamp-2">
                        {c.message}
                      </p>
                      <p className="text-xs text-[#8b949e] mt-1">
                        {c.author} · {timeAgo(c.date)}
                      </p>
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-xs text-[#58a6ff] hover:underline shrink-0 mt-0.5"
                    >
                      {c.sha}
                    </a>
                  </div>
                ))}
                {filteredCommits.length === 0 && (
                  <div className="text-center py-10 text-[#8b949e] text-sm">
                    No commits found.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Open PRs Tab */}
        {tab === "pulls" && (
          <PRList
            prs={openPRs}
            loading={tabLoading}
            timeAgo={timeAgo}
            emptyMsg="No open pull requests."
          />
        )}

        {/* Merged PRs Tab */}
        {tab === "merged" && (
          <PRList
            prs={mergedPRs}
            loading={tabLoading}
            timeAgo={timeAgo}
            emptyMsg="No merged pull requests."
            merged
          />
        )}
      </div>
    </div>
  );
}

function PRList({
  prs,
  loading,
  timeAgo,
  emptyMsg,
  merged = false,
}: {
  prs: PullRequest[];
  loading: boolean;
  timeAgo: (d: string) => string;
  emptyMsg: string;
  merged?: boolean;
}) {
  return (
    <div>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="border border-[#30363d] rounded-lg overflow-hidden">
          {prs.map((pr, i) => (
            <div
              key={pr.number}
              className={`flex items-start gap-4 px-4 py-3 bg-[#161b22] hover:bg-[#21262d] transition-colors ${i > 0 ? "border-t border-[#30363d]" : ""}`}
            >
              <div className="mt-0.5">
                {merged ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#8957e5]/20 text-[#a371f7] text-xs">
                    ✓
                  </span>
                ) : pr.draft ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#30363d] text-[#8b949e] text-xs">
                    ◎
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#238636]/20 text-[#3fb950] text-xs">
                    ⤴
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[#e6edf3] hover:text-[#58a6ff] line-clamp-1"
                >
                  {pr.title}
                </a>
                <p className="text-xs text-[#8b949e] mt-1">
                  #{pr.number} · {pr.author} ·{" "}
                  {merged
                    ? `merged ${timeAgo(pr.merged_at!)}`
                    : `opened ${timeAgo(pr.created_at)}`}
                  {pr.draft && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#30363d]">
                      Draft
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
          {prs.length === 0 && (
            <div className="text-center py-10 text-[#8b949e] text-sm">
              {emptyMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="border border-[#30363d] rounded-lg overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`px-4 py-3 bg-[#161b22] animate-pulse ${i > 0 ? "border-t border-[#30363d]" : ""}`}
        >
          <div className="h-3.5 bg-[#30363d] rounded w-2/3 mb-2" />
          <div className="h-3 bg-[#30363d] rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}
