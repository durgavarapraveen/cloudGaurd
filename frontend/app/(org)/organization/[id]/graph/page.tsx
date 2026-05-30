"use client";

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import PathName from "@/components/PathName";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  getBezierPath,
  BaseEdge,
  useReactFlow,
  ReactFlowProvider,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { graph } from "@/lib/api";
import type { ResourceMeta, ResourceRelationship } from "@/lib/props";
import {
  computeImpactLayout,
  EDGE_TYPES,
  getColorForString,
  getIconForType,
  getLabelForType,
  GRAPH_STYLES,
  NODE_TYPES,
} from "@/components/computeImpactLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NodeData {
  label: string;
  resourceType: string;
  resourceId: string;
  connectionCount: number;
  isFocal?: boolean; // true for the blast-radius centre node
  depth?: number; // hop distance from focal node
  [key: string]: unknown;
}

export interface ResourceRow {
  id: string;
  name: string;
  type: string;
  connectionCount: number;
}

export type ResourceGraphNode = Node<NodeData, "resource">;
export type ResourceGraphEdge = Edge<{ relation?: string }, "relation">;
// "impact" = blast-radius / connection explorer view
export type ViewMode = "list" | "graph" | "impact";

// ─── Color helpers ────────────────────────────────────────────────────────────

// ─── Custom Node ──────────────────────────────────────────────────────────────

// ─── Custom Edge ──────────────────────────────────────────────────────────────

// ─── Layout helpers ───────────────────────────────────────────────────────────

function computeLayout(
  relationships: ResourceRelationship[],
  width: number,
  height: number,
) {
  const nodeMap = new Map<
    string,
    { name: string; type: string; connections: number }
  >();

  const upsert = (id: string, meta: ResourceMeta) => {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        name: meta.resource_name ?? id,
        type: meta.resource_type ?? id.split("-")[0] ?? "resource",
        connections: 0,
      });
    }
    nodeMap.get(id)!.connections++;
  };

  relationships.forEach((r) => {
    upsert(r.source_id, r.source as ResourceMeta);
    upsert(r.target_id, r.target as ResourceMeta);
  });

  const sorted = Array.from(nodeMap.entries()).sort(
    (a, b) => b[1].connections - a[1].connections,
  );
  const cx = width / 2;
  const cy = height / 2;
  const rings = [
    { r: 0, max: 1 },
    { r: 230, max: 6 },
    { r: 440, max: 16 },
    { r: 660, max: 999 },
  ];

  const positions: Record<string, { x: number; y: number }> = {};
  let placed = 0;
  for (const ring of rings) {
    const batch = sorted.slice(placed, placed + ring.max);
    if (!batch.length) break;
    batch.forEach(([id], i) => {
      if (ring.r === 0) {
        positions[id] = { x: cx - 76, y: cy - 30 };
      } else {
        const angle = (2 * Math.PI * i) / batch.length - Math.PI / 2;
        positions[id] = {
          x: cx + ring.r * Math.cos(angle) - 76,
          y: cy + ring.r * Math.sin(angle) - 30,
        };
      }
    });
    placed += batch.length;
  }

  const rfNodes: ResourceGraphNode[] = sorted.map(([id, meta]) => ({
    id,
    type: "resource",
    position: positions[id] ?? {
      x: Math.random() * width,
      y: Math.random() * height,
    },
    data: {
      label: meta.name,
      resourceType: meta.type,
      resourceId: id,
      connectionCount: meta.connections,
    } as NodeData,
  }));

  const rfEdges: ResourceGraphEdge[] = relationships.map((r, i) => {
    const { color } = getColorForString(r.relation || "default");
    return {
      id: r.id ?? `edge-${i}`,
      source: r.source_id,
      target: r.target_id,
      type: "relation",
      animated: false,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: `${color}88`,
        width: 14,
        height: 14,
      },
      data: { relation: r.relation },
    };
  });

  return { rfNodes, rfEdges };
}

// ─── Shared graph styles ──────────────────────────────────────────────────────

// ─── Resource List View ───────────────────────────────────────────────────────

interface ResourceListProps {
  rows: ResourceRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onViewGraph: (mode: "all" | "selected") => void;
  onViewImpact: () => void;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
}

function ResourceList({
  rows,
  selected,
  onToggle,
  onSelectAll,
  onClearAll,
  onViewGraph,
  onViewImpact,
  loading,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}: ResourceListProps) {
  const uniqueTypes = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.type)))],
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (typeFilter !== "all") r = r.filter((x) => x.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.id.toLowerCase().includes(q) ||
          x.type.toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, typeFilter, searchQuery]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      filtered.forEach((r) => {
        if (selected.has(r.id)) onToggle(r.id);
      });
    } else {
      filtered.forEach((r) => {
        if (!selected.has(r.id)) onToggle(r.id);
      });
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-[#07070f] shrink-0 gap-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <circle
              cx="5"
              cy="5"
              r="3.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <line
              x1="8"
              y1="8"
              x2="11"
              y2="11"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search resources…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg bg-white/[0.04] border border-white/[0.07]
              text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:bg-emerald-500/5 transition-all"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
          {uniqueTypes.slice(0, 6).map((type) => {
            const cfg = type !== "all" ? getColorForString(type) : null;
            const active = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => onTypeFilterChange(type)}
                className="shrink-0 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wide font-semibold transition-all"
                style={
                  active
                    ? {
                        background: cfg?.bg ?? "#1e293b",
                        border: `1px solid ${cfg?.color ?? "#64748b"}`,
                        color: cfg?.color ?? "#94a3b8",
                      }
                    : {
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#475569",
                      }
                }
              >
                {type === "all" ? "All" : getLabelForType(type)}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {selected.size > 0 && (
            <span className="text-[10px] text-emerald-400 font-semibold px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              {selected.size} selected
            </span>
          )}

          <button
            onClick={() => onViewGraph("all")}
            disabled={loading || rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
              border border-white/[0.1] bg-white/[0.04] text-slate-300
              hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle
                cx="2.5"
                cy="5.5"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="8.5"
                cy="2"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="8.5"
                cy="9"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <line
                x1="4"
                y1="5"
                x2="7"
                y2="2.5"
                stroke="currentColor"
                strokeWidth="1"
              />
              <line
                x1="4"
                y1="6"
                x2="7"
                y2="8.5"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            All Graph
          </button>

          <button
            onClick={() => onViewGraph("selected")}
            disabled={loading || selected.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
              border border-emerald-500/30 bg-emerald-500/10 text-emerald-400
              hover:bg-emerald-500/20 hover:border-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle
                cx="2.5"
                cy="5.5"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="8.5"
                cy="2"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="8.5"
                cy="9"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <line
                x1="4"
                y1="5"
                x2="7"
                y2="2.5"
                stroke="currentColor"
                strokeWidth="1"
              />
              <line
                x1="4"
                y1="6"
                x2="7"
                y2="8.5"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
            Graph Selected
          </button>
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid px-6 py-2 border-b border-white/[0.06] bg-[#07070f] shrink-0 text-[9px] uppercase tracking-widest text-slate-600 select-none"
        style={{ gridTemplateColumns: "32px 1fr 180px 80px 80px" }}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAllFiltered}
            className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
          />
        </div>
        <div>Resource</div>
        <div>Type</div>
        <div className="text-right">Connections</div>
        <div className="text-right">ID</div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/15" />
              <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-slate-500 text-[12px]">No resources found</div>
            <div className="text-slate-700 text-[10px]">
              Try adjusting your search or filters
            </div>
          </div>
        ) : (
          filtered.map((row) => {
            const { color, bg, border } = getColorForString(row.type);
            const isSelected = selected.has(row.id);
            return (
              <div
                key={row.id}
                onClick={() => onToggle(row.id)}
                className="grid px-6 py-2.5 border-b border-white/[0.03] cursor-pointer transition-all hover:bg-white/[0.02]"
                style={{
                  gridTemplateColumns: "32px 1fr 180px 80px 80px",
                  background: isSelected ? "rgba(34,197,94,0.04)" : undefined,
                  borderLeft: isSelected
                    ? "2px solid rgba(34,197,94,0.4)"
                    : "2px solid transparent",
                }}
              >
                <div
                  className="flex items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(row.id)}
                    className="w-3 h-3 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      background: bg,
                      border: `1px solid ${border}`,
                      color,
                    }}
                  >
                    {getIconForType(row.type)}
                  </div>
                  <span
                    className="text-[11px] font-semibold truncate"
                    style={{ color: isSelected ? "#4ade80" : "#cbd5e1" }}
                  >
                    {row.name}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide truncate max-w-[160px]"
                    style={{
                      background: bg,
                      border: `1px solid ${border}`,
                      color,
                    }}
                  >
                    {getLabelForType(row.type)}
                  </span>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {row.connectionCount}
                  </span>
                </div>
                <div className="flex items-center justify-end">
                  <span
                    className="text-[9px] text-slate-700 font-mono truncate max-w-[68px]"
                    title={row.id}
                  >
                    {row.id.length > 8 ? `…${row.id.slice(-6)}` : row.id}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-white/[0.06] bg-[#07070f] shrink-0 text-[9px] text-slate-600">
        <span>
          {filtered.length} of {rows.length} resources
        </span>
        {selected.size > 0 && (
          <button
            onClick={onClearAll}
            className="text-slate-600 hover:text-slate-400 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Impact Explorer — resource picker + blast-radius graph ──────────────────

interface ImpactExplorerProps {
  cloudIdentifier: string;
  rows: ResourceRow[];
  onBack: () => void;
}

function ImpactExplorerInner({
  cloudIdentifier,
  rows,
  onBack,
}: ImpactExplorerProps) {
  const [phase, setPhase] = useState<"pick" | "graph">("pick");
  const [pickSearch, setPickSearch] = useState("");
  const [focalRow, setFocalRow] = useState<ResourceRow | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<ResourceGraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ResourceGraphEdge>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depthStats, setDepthStats] = useState<
    { hop: number; count: number }[]
  >([]);
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const { fitView } = useReactFlow();

  const filteredRows = useMemo(() => {
    const q = pickSearch.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    );
  }, [rows, pickSearch]);

  const loadImpact = useCallback(
    async (row: ResourceRow) => {
      setFocalRow(row);
      setPhase("graph");
      setLoading(true);
      setError(null);
      try {
        // Fetch connections for a specific resource ID from backend
        const data: ResourceRelationship[] = await graph.getResourceRelations(
          cloudIdentifier,
          row.id,
        );
        const { rfNodes, rfEdges, depth } = computeImpactLayout(
          row.id,
          data,
          1100,
          700,
        );
        setNodes(rfNodes);
        setEdges(rfEdges);
        setStats({ nodes: rfNodes.length, edges: rfEdges.length });

        // Build per-hop counts for the sidebar
        const hopMap = new Map<number, number>();
        for (const d of depth.values()) {
          hopMap.set(d, (hopMap.get(d) ?? 0) + 1);
        }
        setDepthStats(
          Array.from(hopMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([hop, count]) => ({ hop, count })),
        );

        setTimeout(() => fitView({ padding: 0.16, duration: 600 }), 100);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load connections");
      } finally {
        setLoading(false);
      }
    },
    [cloudIdentifier, fitView, setEdges, setNodes],
  );

  // ── Phase: resource picker ──
  if (phase === "pick") {
    return (
      <div
        className="flex flex-col h-full"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] bg-[#07070f] shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
              border border-white/[0.1] bg-white/[0.04] text-slate-400
              hover:bg-white/[0.08] hover:text-slate-200 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M7 5H3M3 5L5.5 2.5M3 5L5.5 7.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Resources
          </button>

          <div className="w-px h-4 bg-white/[0.08]" />

          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle
                cx="7"
                cy="7"
                r="5.5"
                stroke="#f87171"
                strokeWidth="1.2"
              />
              <circle
                cx="7"
                cy="7"
                r="2.2"
                stroke="#f87171"
                strokeWidth="1.2"
              />
              <line
                x1="7"
                y1="1"
                x2="7"
                y2="3.5"
                stroke="#f87171"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line
                x1="7"
                y1="10.5"
                x2="7"
                y2="13"
                stroke="#f87171"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line
                x1="1"
                y1="7"
                x2="3.5"
                y2="7"
                stroke="#f87171"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <line
                x1="10.5"
                y1="7"
                x2="13"
                y2="7"
                stroke="#f87171"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-[13px] font-semibold text-white tracking-tight">
              Impact Explorer
            </h1>
            <p className="text-[10px] text-slate-600">
              Select a resource to reveal its blast radius
            </p>
          </div>
        </div>

        {/* Instruction banner */}
        <div className="mx-6 mt-4 mb-2 px-4 py-3 rounded-xl bg-red-500/[0.06] border border-red-500/20 shrink-0">
          <div className="flex items-start gap-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="mt-0.5 shrink-0"
            >
              <circle
                cx="7"
                cy="7"
                r="5.5"
                stroke="#f87171"
                strokeWidth="1.2"
              />
              <path
                d="M7 4.5v3M7 9v.5"
                stroke="#f87171"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-[11px] text-red-400/80 leading-relaxed">
              Pick any resource below. The backend will fetch all its direct and
              indirect connections (up to 3 hops), helping you assess the blast
              radius if that resource is compromised.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-3 shrink-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <circle
                cx="5"
                cy="5"
                r="3.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <line
                x1="8"
                y1="8"
                x2="11"
                y2="11"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID or type…"
              value={pickSearch}
              onChange={(e) => setPickSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[11px] rounded-lg bg-white/[0.04] border border-white/[0.08]
                text-slate-300 placeholder-slate-600 focus:outline-none focus:border-red-500/40 focus:bg-red-500/5 transition-all"
            />
          </div>
        </div>

        {/* Resource list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 pb-4">
          {filteredRows.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-[11px]">
              No resources match
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filteredRows.map((row) => {
                const { color, bg, border } = getColorForString(row.type);
                return (
                  <button
                    key={row.id}
                    onClick={() => loadImpact(row)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left w-full
                      border border-white/[0.05] bg-white/[0.02]
                      hover:bg-red-500/[0.06] hover:border-red-500/25 transition-all group"
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        background: bg,
                        border: `1px solid ${border}`,
                        color,
                      }}
                    >
                      {getIconForType(row.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-slate-300 group-hover:text-red-300 truncate transition-colors">
                        {row.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{
                            background: bg,
                            border: `1px solid ${border}`,
                            color,
                          }}
                        >
                          {getLabelForType(row.type)}
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono truncate">
                          {row.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-600 tabular-nums">
                        {row.connectionCount} conn
                      </span>
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        className="text-slate-700 group-hover:text-red-400 transition-colors"
                      >
                        <path
                          d="M3 5h4M5.5 2.5L8 5l-2.5 2.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count */}
        <div className="px-6 py-2 border-t border-white/[0.06] bg-[#07070f] shrink-0 text-[9px] text-slate-600">
          {filteredRows.length} of {rows.length} resources
        </div>
      </div>
    );
  }

  // ── Phase: blast-radius graph ──
  const {
    color: focalColor,
    bg: focalBg,
    border: focalBorder,
  } = focalRow
    ? getColorForString(focalRow.type)
    : { color: "#f87171", bg: "#1c0a0a", border: "#7f1d1d" };

  const uniqueRelations = Array.from(
    new Set(
      edges
        .map((e) => (e.data as { relation?: string })?.relation ?? "")
        .filter(Boolean),
    ),
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <style>{GRAPH_STYLES}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-[#07070f] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase("pick")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
              border border-white/[0.1] bg-white/[0.04] text-slate-400
              hover:bg-white/[0.08] hover:text-slate-200 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M7 5H3M3 5L5.5 2.5M3 5L5.5 7.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Change Resource
          </button>

          <div className="w-px h-4 bg-white/[0.08]" />

          {/* Focal resource chip */}
          {focalRow && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  background: focalBg,
                  border: `1px solid ${focalBorder}`,
                  color: focalColor,
                }}
              >
                {getIconForType(focalRow.type)}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-red-300">
                  {focalRow.name}
                </div>
                <div className="text-[9px] text-red-500/60 font-mono">
                  {focalRow.id}
                </div>
              </div>
              <div
                className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider
                bg-red-500/10 border border-red-500/25 text-red-400"
              >
                focal
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {[
            { label: "Nodes", val: stats.nodes, c: "#f87171" },
            { label: "Edges", val: stats.edges, c: "#60a5fa" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
              style={{ background: `${s.c}0d`, border: `1px solid ${s.c}25` }}
            >
              <span className="text-slate-500">{s.label}</span>
              <span className="font-bold" style={{ color: s.c }}>
                {s.val}
              </span>
            </div>
          ))}
          <button
            onClick={() => focalRow && loadImpact(focalRow)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold
              border border-red-500/25 bg-red-500/10 text-red-400
              hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? (
              <span className="w-3 h-3 rounded-full border-2 border-red-500/25 border-t-red-400 animate-spin" />
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M9.5 5.5A4 4 0 1 1 5.5 1.5M5.5 1.5l2-1.5M5.5 1.5l1.5 2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-[#07070f] min-h-0">
        {error && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2
            px-4 py-2.5 rounded-xl text-[11px] border border-red-500/30 bg-red-500/10 text-red-400 shadow-lg"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle
                cx="6.5"
                cy="6.5"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M6.5 4v2.5M6.5 8.5v.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            {error}
            <button
              onClick={() => focalRow && loadImpact(focalRow)}
              className="underline opacity-70 hover:opacity-100"
            >
              retry
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07070f]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/15" />
                <div className="absolute inset-0 rounded-full border-2 border-t-red-400 animate-spin" />
              </div>
              <p className="text-[11px] text-slate-500">
                Mapping blast radius…
              </p>
            </div>
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="3"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[13px]">
                No connections found
              </div>
              <div className="text-slate-600 text-[11px] mt-1">
                This resource has no known relationships
              </div>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color="rgba(255,255,255,0.06)"
          />
          <Controls style={{ bottom: 24, left: 24 }} showInteractive={false} />
          <MiniMap
            style={{ bottom: 24, right: 24, width: 140, height: 90 }}
            nodeColor={(n) => {
              const d = n.data as NodeData;
              return d.isFocal
                ? "#f87171"
                : getColorForString(d.resourceType).color + "99";
            }}
            maskColor="rgba(7,7,15,0.85)"
          />

          {/* Right-side legend panel */}
          <Panel position="top-right">
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "rgba(7,7,15,0.92)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: "calc(100vh - 160px)",
                overflowY: "auto",
                minWidth: 155,
              }}
            >
              {/* Hop distance breakdown */}
              {depthStats.length > 0 && (
                <>
                  <div
                    style={{
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: 8,
                      marginBottom: 2,
                    }}
                  >
                    Blast Radius
                  </div>
                  {depthStats.map(({ hop, count }) => {
                    const hopColors = [
                      "#f87171",
                      "#fb923c",
                      "#facc15",
                      "#86efac",
                    ];
                    const c = hopColors[hop] ?? "#64748b";
                    const label = hop === 0 ? "Focal" : `Hop ${hop}`;
                    const barWidth = Math.min(
                      100,
                      (count / (depthStats[1]?.count || 1)) * 80 + 12,
                    );
                    return (
                      <div
                        key={hop}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 14,
                            borderRadius: 3,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 8,
                            fontWeight: 700,
                            background: `${c}18`,
                            border: `1px solid ${c}40`,
                            color: c,
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 99,
                            background: "rgba(255,255,255,0.04)",
                          }}
                        >
                          <div
                            style={{
                              width: `${barWidth}%`,
                              height: "100%",
                              borderRadius: 99,
                              background: c,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 9,
                            color: c,
                            minWidth: 18,
                            textAlign: "right",
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    );
                  })}
                  <div
                    style={{
                      height: 1,
                      background: "rgba(255,255,255,0.05)",
                      margin: "4px 0",
                    }}
                  />
                </>
              )}

              {/* Relation types */}
              {uniqueRelations.length > 0 && (
                <>
                  <div
                    style={{
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: 8,
                      marginBottom: 2,
                    }}
                  >
                    Relations
                  </div>
                  {uniqueRelations.map((rel) => {
                    const { color } = getColorForString(rel);
                    return (
                      <div
                        key={rel}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <svg width="20" height="10" style={{ flexShrink: 0 }}>
                          <line
                            x1="0"
                            y1="5"
                            x2="20"
                            y2="5"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeDasharray="3,2"
                          />
                          <polygon points="16,2 20,5 16,8" fill={color} />
                        </svg>
                        <span
                          style={{ color, whiteSpace: "nowrap", fontSize: 9 }}
                        >
                          {rel}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

function ImpactExplorer(props: ImpactExplorerProps) {
  return (
    <ReactFlowProvider>
      <ImpactExplorerInner {...props} />
    </ReactFlowProvider>
  );
}

// ─── Standard Graph View ──────────────────────────────────────────────────────

interface GraphInnerProps {
  cloudIdentifier: string;
  selectedIds: Set<string>;
  filterMode: "all" | "selected";
  onBack: () => void;
}

function GraphInner({
  cloudIdentifier,
  selectedIds,
  filterMode,
  onBack,
}: GraphInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ResourceGraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ResourceGraphEdge>([]);
  const [allNodes, setAllNodes] = useState<ResourceGraphNode[]>([]);
  const [allEdges, setAllEdges] = useState<ResourceGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, types: 0 });
  const [typeFilter, setTypeFilter] = useState("all");
  const { fitView } = useReactFlow();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graph.getAllRelations(cloudIdentifier);
      const { rfNodes, rfEdges } = computeLayout(data, 1100, 700);

      let visibleNodes = rfNodes;
      let visibleEdges = rfEdges;

      if (filterMode === "selected" && selectedIds.size > 0) {
        visibleNodes = rfNodes.filter((n) => selectedIds.has(n.id));
        const visible = new Set(visibleNodes.map((n) => n.id));
        visibleEdges = rfEdges.filter(
          (e) => visible.has(e.source) && visible.has(e.target),
        );
      }

      setAllNodes(visibleNodes);
      setAllEdges(visibleEdges);
      setNodes(visibleNodes);
      setEdges(visibleEdges);
      const types = new Set(visibleNodes.map((n) => n.data.resourceType)).size;
      setStats({
        nodes: visibleNodes.length,
        edges: visibleEdges.length,
        types,
      });
      setTimeout(() => fitView({ padding: 0.14, duration: 600 }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load relationships");
    } finally {
      setLoading(false);
    }
  }, [cloudIdentifier, filterMode, selectedIds, fitView, setEdges, setNodes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (typeFilter === "all") {
      setNodes(allNodes);
      setEdges(allEdges);
    } else {
      const visible = new Set(
        allNodes
          .filter((n) => n.data.resourceType === typeFilter)
          .map((n) => n.id),
      );
      setNodes(allNodes.filter((n) => visible.has(n.id)));
      setEdges(
        allEdges.filter((e) => visible.has(e.source) && visible.has(e.target)),
      );
    }
    setTimeout(() => fitView({ padding: 0.14, duration: 400 }), 50);
  }, [typeFilter, allNodes, allEdges, setEdges, setNodes, fitView]);

  const uniqueTypes = useMemo(
    () => [
      "all",
      ...Array.from(new Set(allNodes.map((n) => n.data.resourceType))),
    ],
    [allNodes],
  );

  const uniqueRelations = useMemo(
    () =>
      Array.from(
        new Set(
          allEdges
            .map((e) => (e.data as { relation?: string })?.relation ?? "")
            .filter(Boolean),
        ),
      ),
    [allEdges],
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <style>{GRAPH_STYLES}</style>

      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-[#07070f] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
              border border-white/[0.1] bg-white/[0.04] text-slate-400
              hover:bg-white/[0.08] hover:text-slate-200 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M7 5H3M3 5L5.5 2.5M3 5L5.5 7.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Resources
          </button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle
                  cx="2.5"
                  cy="6.5"
                  r="1.8"
                  stroke="#22c55e"
                  strokeWidth="1.1"
                />
                <circle
                  cx="10.5"
                  cy="2.5"
                  r="1.3"
                  stroke="#60a5fa"
                  strokeWidth="1.1"
                />
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="1.3"
                  stroke="#c084fc"
                  strokeWidth="1.1"
                />
                <line
                  x1="4.2"
                  y1="5.7"
                  x2="9.1"
                  y2="3.1"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="0.9"
                />
                <line
                  x1="4.2"
                  y1="7.3"
                  x2="9.1"
                  y2="9.9"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="0.9"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-[12px] font-semibold text-white tracking-tight">
                Resource Graph
                {filterMode === "selected" && (
                  <span className="ml-2 text-[9px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                    {selectedIds.size} selected
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-slate-600">
                {cloudIdentifier || "cloud account"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {[
            { label: "Nodes", val: stats.nodes, c: "#4ade80" },
            { label: "Edges", val: stats.edges, c: "#60a5fa" },
            { label: "Types", val: stats.types, c: "#c084fc" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
              style={{ background: `${s.c}0d`, border: `1px solid ${s.c}25` }}
            >
              <span className="text-slate-500">{s.label}</span>
              <span className="font-bold" style={{ color: s.c }}>
                {s.val}
              </span>
            </div>
          ))}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold
              border border-emerald-500/25 bg-emerald-500/10 text-emerald-400
              hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? (
              <span className="w-3 h-3 rounded-full border-2 border-emerald-500/25 border-t-emerald-400 animate-spin" />
            ) : (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path
                  d="M9.5 5.5A4 4 0 1 1 5.5 1.5M5.5 1.5l2-1.5M5.5 1.5l1.5 2"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-2 border-b border-white/[0.04] bg-[#07070f] overflow-x-auto shrink-0">
        <span className="text-[9px] text-slate-700 uppercase tracking-widest shrink-0 mr-1">
          Filter
        </span>
        {uniqueTypes.map((type) => {
          const cfg = type !== "all" ? getColorForString(type) : null;
          const active = typeFilter === type;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className="shrink-0 px-2.5 py-1 rounded-full text-[9px] uppercase tracking-wide font-semibold transition-all"
              style={
                active
                  ? {
                      background: cfg?.bg ?? "#1e293b",
                      border: `1px solid ${cfg?.color ?? "#64748b"}`,
                      color: cfg?.color ?? "#94a3b8",
                    }
                  : {
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#475569",
                    }
              }
            >
              {type === "all" ? "All" : getLabelForType(type)}
            </button>
          );
        })}
      </div>

      <div className="flex-1 relative bg-[#07070f] min-h-0">
        {error && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2
            px-4 py-2.5 rounded-xl text-[11px] border border-red-500/30 bg-red-500/10 text-red-400 shadow-lg"
          >
            {error}
            <button
              onClick={fetchData}
              className="underline opacity-70 hover:opacity-100"
            >
              retry
            </button>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07070f]/80 backdrop-blur-sm">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-500/15" />
              <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin" />
            </div>
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="text-slate-400 text-[13px]">
              No relationships found
            </div>
            <div className="text-slate-600 text-[11px]">
              {filterMode === "selected"
                ? "Selected resources have no connections between them"
                : "This account has no resource connections"}
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color="rgba(255,255,255,0.06)"
          />
          <Controls style={{ bottom: 24, left: 24 }} showInteractive={false} />
          <MiniMap
            style={{ bottom: 24, right: 24, width: 140, height: 90 }}
            nodeColor={(n) =>
              getColorForString((n.data as NodeData).resourceType).color + "99"
            }
            maskColor="rgba(7,7,15,0.85)"
          />
          <Panel position="top-right">
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: "rgba(7,7,15,0.92)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(12px)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: "calc(100vh - 160px)",
                overflowY: "auto",
                minWidth: 140,
              }}
            >
              <div
                style={{
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontSize: 8,
                  marginBottom: 4,
                }}
              >
                Resource Types
              </div>
              {uniqueTypes
                .filter((t) => t !== "all")
                .map((type) => {
                  const { color, bg, border } = getColorForString(type);
                  return (
                    <div
                      key={type}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 5,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          background: bg,
                          border: `1px solid ${border}`,
                          color,
                        }}
                      >
                        {getIconForType(type)}
                      </div>
                      <span style={{ color, whiteSpace: "nowrap" }}>
                        {getLabelForType(type)}
                      </span>
                    </div>
                  );
                })}
              {uniqueRelations.length > 0 && (
                <>
                  <div
                    style={{
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontSize: 8,
                      marginTop: 8,
                      marginBottom: 4,
                    }}
                  >
                    Relations
                  </div>
                  {uniqueRelations.map((rel) => {
                    const { color } = getColorForString(rel);
                    return (
                      <div
                        key={rel}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <svg width="20" height="10" style={{ flexShrink: 0 }}>
                          <line
                            x1="0"
                            y1="5"
                            x2="20"
                            y2="5"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeDasharray="3,2"
                          />
                          <polygon points="16,2 20,5 16,8" fill={color} />
                        </svg>
                        <span style={{ color, whiteSpace: "nowrap" }}>
                          {rel}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function RelationshipGraphPage() {
  const cloudIdentifier = PathName();

  const [view, setView] = useState<ViewMode>("list");
  const [graphFilterMode, setGraphFilterMode] = useState<"all" | "selected">(
    "all",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resourceRows, setResourceRows] = useState<ResourceRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    if (!cloudIdentifier) return;
    setListLoading(true);
    graph
      .getAllRelations(cloudIdentifier)
      .then((data: ResourceRelationship[]) => {
        const nodeMap = new Map<string, ResourceRow>();
        data.forEach((r) => {
          const upsert = (id: string, meta: ResourceMeta) => {
            const existing = nodeMap.get(id);
            if (!existing) {
              nodeMap.set(id, {
                id,
                name: meta.resource_name ?? id,
                type: meta.resource_type ?? id.split("-")[0] ?? "resource",
                connectionCount: 1,
              });
            } else {
              existing.connectionCount++;
            }
          };
          upsert(r.source_id, r.source as ResourceMeta);
          upsert(r.target_id, r.target as ResourceMeta);
        });
        const rows = Array.from(nodeMap.values()).sort(
          (a, b) => b.connectionCount - a.connectionCount,
        );
        setResourceRows(rows);
      })
      .catch(() => setResourceRows([]))
      .finally(() => setListLoading(false));
  }, [cloudIdentifier]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const handleViewGraph = useCallback((mode: "all" | "selected") => {
    setGraphFilterMode(mode);
    setView("graph");
  }, []);

  return (
    <div className="h-screen bg-[#07070f] overflow-hidden">
      {view === "list" && (
        <ResourceList
          rows={resourceRows}
          selected={selectedIds}
          onToggle={toggleSelection}
          onSelectAll={() =>
            setSelectedIds(new Set(resourceRows.map((r) => r.id)))
          }
          onClearAll={clearAll}
          onViewGraph={handleViewGraph}
          onViewImpact={() => setView("impact")}
          loading={listLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
      )}

      {view === "graph" && (
        <ReactFlowProvider>
          <GraphInner
            cloudIdentifier={cloudIdentifier ?? ""}
            selectedIds={selectedIds}
            filterMode={graphFilterMode}
            onBack={() => setView("list")}
          />
        </ReactFlowProvider>
      )}
    </div>
  );
}
