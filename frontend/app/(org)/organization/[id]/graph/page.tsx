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

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeData {
  label: string;
  resourceType: string;
  resourceId: string;
  connectionCount: number;
  [key: string]: unknown;
}

type ResourceGraphNode = Node<NodeData, "resource">;
type ResourceGraphEdge = Edge<{ relation?: string }, "relation">;

// ─── Deterministic color generator ───────────────────────────────────────────
// Given any string, returns a consistent hue. Same input → same color, always.

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Palette of hues that look good on dark backgrounds — spread evenly, avoiding
// muddy browns/greens that are hard to distinguish at small sizes.
const HUE_PALETTE = [
  4, // red
  24, // orange
  48, // amber
  80, // lime
  150, // emerald
  175, // teal
  200, // sky
  220, // blue
  250, // indigo
  270, // violet
  290, // purple
  320, // fuchsia
  340, // rose
];

function getColorForString(str: string): {
  color: string;
  glow: string;
  bg: string;
  border: string;
} {
  const normalized = (str ?? "default").toLowerCase().trim();
  const index = hashString(normalized) % HUE_PALETTE.length;
  const hue = HUE_PALETTE[index];

  return {
    color: `hsl(${hue}, 80%, 65%)`,
    glow: `hsla(${hue}, 80%, 65%, 0.18)`,
    bg: `hsl(${hue}, 40%, 6%)`,
    border: `hsl(${hue}, 60%, 22%)`,
  };
}

// Resource type icon — covers common AWS types; falls back gracefully
function getIconForType(type: string): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("ec2") || t.includes("instance")) return "⬡";
  if (t.includes("s3") || t.includes("bucket")) return "⬢";
  if (t.includes("iam") || t.includes("role") || t.includes("policy"))
    return "◈";
  if (t.includes("rds") || t.includes("database")) return "◉";
  if (t.includes("vpc")) return "⬡";
  if (t.includes("lambda") || t.includes("function")) return "λ";
  if (t.includes("sg") || t.includes("security")) return "⬟";
  if (t.includes("subnet")) return "◫";
  if (t.includes("elb") || t.includes("load")) return "⚖";
  if (t.includes("cloudfront") || t.includes("cdn")) return "◬";
  if (t.includes("route") || t.includes("dns")) return "◎";
  if (t.includes("sns") || t.includes("sqs")) return "◆";
  if (t.includes("eks") || t.includes("cluster")) return "⬡";
  if (t.includes("ecs") || t.includes("container")) return "▣";
  if (t.includes("kms") || t.includes("key")) return "◇";
  if (t.includes("secret") || t.includes("ssm")) return "⊕";
  if (t.includes("log") || t.includes("cloudwatch")) return "◐";
  if (t.includes("gateway") || t.includes("api")) return "◑";
  if (t.includes("dynamo") || t.includes("table")) return "▦";
  if (t.includes("elastic") || t.includes("cache")) return "◈";
  return "◆";
}

// Human-readable short label for any resource_type string
function getLabelForType(type: string): string {
  if (!type) return "Resource";
  // Convert snake_case / kebab-case / PascalCase → readable
  return type
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 20);
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

const ResourceNode = memo(
  ({ data, selected }: NodeProps<ResourceGraphNode>) => {
    const d = data as NodeData;
    const { color, glow, bg, border } = getColorForString(d.resourceType);
    const icon = getIconForType(d.resourceType);
    const label = getLabelForType(d.resourceType);

    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: color,
            border: "none",
            width: 8,
            height: 8,
            top: -4,
          }}
        />
        <div
          style={{
            background: bg,
            border: `1.5px solid ${selected ? color : border}`,
            borderRadius: 14,
            padding: "12px 16px",
            minWidth: 152,
            maxWidth: 210,
            boxShadow: selected
              ? `0 0 0 3px ${glow}, 0 0 28px ${glow}, 0 4px 16px #00000070`
              : `0 0 14px ${glow}, 0 4px 12px #00000050`,
            transition: "all 0.2s ease",
            fontFamily: "'JetBrains Mono', monospace",
            position: "relative",
          }}
        >
          {/* Resource type badge */}
          <div
            style={{
              position: "absolute",
              top: -10,
              left: 10,
              padding: "1px 7px",
              borderRadius: 99,
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: bg,
              border: `1px solid ${border}`,
              color,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>

          {/* Icon + name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `${color}18`,
                border: `1px solid ${color}40`,
                flexShrink: 0,
                fontSize: 16,
                color,
              }}
            >
              {icon}
            </div>
            <div style={{ minWidth: 0 }}>
              {/* resource_name */}
              <div
                title={d.label}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 114,
                }}
              >
                {d.label}
              </div>
              {/* resource_id */}
              <div
                title={d.resourceId}
                style={{
                  fontSize: 9,
                  color: "#475569",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 114,
                }}
              >
                {d.resourceId}
              </div>
            </div>
          </div>

          {/* Connection count */}
          {d.connectionCount > 0 && (
            <div
              style={{
                position: "absolute",
                bottom: -10,
                right: 10,
                padding: "1px 7px",
                borderRadius: 99,
                fontSize: 9,
                fontFamily: "monospace",
                background: bg,
                border: `1px solid ${border}`,
                color: "rgba(148,163,184,0.7)",
                whiteSpace: "nowrap",
              }}
            >
              {d.connectionCount} conn
            </div>
          )}
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: color,
            border: "none",
            width: 8,
            height: 8,
            bottom: -4,
          }}
        />
      </>
    );
  },
);
ResourceNode.displayName = "ResourceNode";

// ─── Custom Edge ──────────────────────────────────────────────────────────────

const RelationEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<ResourceGraphEdge>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relation = (data as { relation?: string })?.relation ?? "";

  // Edge color derived from the relation string
  const {
    color: relColor,
    bg: relBg,
    border: relBorder,
  } = getColorForString(relation || "default");

  const strokeColor = selected ? relColor : `${relColor}55`;
  const glowColor = selected ? `${relColor}50` : "transparent";

  return (
    <>
      {/* Glow blur layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={glowColor}
        strokeWidth={selected ? 8 : 4}
        style={{
          filter: selected ? "blur(4px)" : "none",
          transition: "all 0.2s",
        }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2.5 : 1.2,
          strokeDasharray: selected ? undefined : "5,4",
          transition: "stroke 0.2s, stroke-width 0.2s",
        }}
      />
      {/* Relation label — always visible (subtle when not selected) */}
      {relation && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-(relation.length * 3.2 + 10)}
            y={-9}
            width={relation.length * 6.4 + 20}
            height={18}
            rx={6}
            fill={selected ? relBg : "rgba(7,7,15,0.75)"}
            stroke={selected ? relBorder : "rgba(255,255,255,0.06)"}
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fill={selected ? relColor : "rgba(148,163,184,0.5)"}
            fontSize={8}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
            style={{ transition: "fill 0.2s" }}
          >
            {relation}
          </text>
        </g>
      )}
    </>
  );
};

// ─── Layout: hub-and-spoke radial ─────────────────────────────────────────────

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

// ─── Stable type maps ─────────────────────────────────────────────────────────

const NODE_TYPES: NodeTypes = { resource: ResourceNode };
const EDGE_TYPES: EdgeTypes = { relation: RelationEdge };

// ─── Inner graph ──────────────────────────────────────────────────────────────

function GraphInner({ cloudIdentifier }: { cloudIdentifier: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ResourceGraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ResourceGraphEdge>([]);
  const [allNodes, setAllNodes] = useState<ResourceGraphNode[]>([]);
  const [allEdges, setAllEdges] = useState<ResourceGraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodes: 0, edges: 0, types: 0 });
  const [filterType, setFilterType] = useState("all");
  const { fitView } = useReactFlow();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graph.getAllRelations(cloudIdentifier);
      const { rfNodes, rfEdges } = computeLayout(data, 1100, 700);
      setAllNodes(rfNodes);
      setAllEdges(rfEdges);
      setNodes(rfNodes);
      setEdges(rfEdges);
      const types = new Set(rfNodes.map((n) => n.data.resourceType)).size;
      setStats({ nodes: rfNodes.length, edges: rfEdges.length, types });
      setTimeout(() => fitView({ padding: 0.14, duration: 600 }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load relationships");
    } finally {
      setLoading(false);
    }
  }, [cloudIdentifier, fitView, setEdges, setNodes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (filterType === "all") {
      setNodes(allNodes);
      setEdges(allEdges);
    } else {
      const visible = new Set(
        allNodes
          .filter((n) => n.data.resourceType === filterType)
          .map((n) => n.id),
      );
      setNodes(allNodes.filter((n) => visible.has(n.id)));
      setEdges(
        allEdges.filter((e) => visible.has(e.source) && visible.has(e.target)),
      );
    }
    setTimeout(() => fitView({ padding: 0.14, duration: 400 }), 50);
  }, [filterType, allNodes, allEdges, setEdges, setNodes, fitView]);

  const uniqueTypes = useMemo(
    () => [
      "all",
      ...Array.from(new Set(allNodes.map((n) => n.data.resourceType))),
    ],
    [allNodes],
  );

  // Unique relation types for the legend
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        .react-flow__attribution { display: none !important; }
        .react-flow__controls {
          background: #0d0d18 !important;
          border: 1px solid rgba(255,255,255,0.07) !important;
          border-radius: 10px !important;
          box-shadow: 0 4px 20px #00000060 !important;
          overflow: hidden;
        }
        .react-flow__controls-button {
          background: transparent !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          color: #64748b !important;
          fill: #64748b !important;
        }
        .react-flow__controls-button:hover { background: rgba(255,255,255,0.05) !important; fill: #94a3b8 !important; }
        .react-flow__minimap { background: #07070f !important; border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 10px !important; overflow: hidden; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-[#07070f] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle
                cx="3"
                cy="7.5"
                r="2"
                stroke="#22c55e"
                strokeWidth="1.2"
              />
              <circle
                cx="12"
                cy="3"
                r="1.5"
                stroke="#60a5fa"
                strokeWidth="1.2"
              />
              <circle
                cx="12"
                cy="12"
                r="1.5"
                stroke="#c084fc"
                strokeWidth="1.2"
              />
              <line
                x1="5"
                y1="6.8"
                x2="10.4"
                y2="3.5"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
              />
              <line
                x1="5"
                y1="8.2"
                x2="10.4"
                y2="11.5"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-[13px] font-semibold text-white tracking-tight">
              Resource Graph
            </h1>
            <p className="text-[10px] text-slate-600">
              {cloudIdentifier || "cloud account"}
            </p>
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
              hover:bg-emerald-500/20 hover:border-emerald-500/40
              disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
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

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-white/[0.04] bg-[#07070f] overflow-x-auto shrink-0">
        <span className="text-[9px] text-slate-700 uppercase tracking-widest shrink-0 mr-1">
          Filter
        </span>
        {uniqueTypes.map((type) => {
          const cfg = type !== "all" ? getColorForString(type) : null;
          const active = filterType === type;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
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

      {/* ── Canvas ── */}
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
              onClick={fetchData}
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
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500/15" />
                <div className="absolute inset-0 rounded-full border-2 border-t-emerald-400 animate-spin" />
              </div>
              <p className="text-[11px] text-slate-500">
                Building relationship graph…
              </p>
            </div>
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="4"
                  cy="10"
                  r="2.5"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <circle
                  cx="16"
                  cy="4"
                  r="2.5"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="2.5"
                  stroke="#334155"
                  strokeWidth="1.5"
                />
                <line
                  x1="6.5"
                  y1="9.1"
                  x2="13.5"
                  y2="4.9"
                  stroke="#1e293b"
                  strokeWidth="1.2"
                />
                <line
                  x1="6.5"
                  y1="10.9"
                  x2="13.5"
                  y2="15.1"
                  stroke="#1e293b"
                  strokeWidth="1.2"
                />
              </svg>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[13px]">
                No relationships found
              </div>
              <div className="text-slate-600 text-[11px] mt-1">
                This account has no resource connections
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

          {/* ── Legend panel ── */}
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
              {/* Node types */}
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

              {/* Relation types */}
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
                        {/* Dashed line swatch */}
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
  return (
    <div className="h-screen bg-[#07070f] overflow-hidden">
      <ReactFlowProvider>
        <GraphInner cloudIdentifier={cloudIdentifier ?? ""} />
      </ReactFlowProvider>
    </div>
  );
}
