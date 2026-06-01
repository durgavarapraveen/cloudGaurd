import {
  NodeData,
  ResourceGraphEdge,
  ResourceGraphNode,
  ResourceMeta,
  ResourceRelationship,
} from "@/lib/props";
import {
  BaseEdge,
  EdgeProps,
  EdgeTypes,
  getBezierPath,
  Handle,
  MarkerType,
  NodeProps,
  NodeTypes,
  Position,
} from "@xyflow/react";
import { memo } from "react";

export function computeImpactLayout(
  focalId: string,
  relationships: ResourceRelationship[],
  width: number,
  height: number,
) {
  // Build adjacency: all neighbours of a node
  const adj = new Map<string, Set<string>>();
  const metaMap = new Map<string, ResourceMeta>();

  relationships.forEach((r) => {
    if (!adj.has(r.source_id)) adj.set(r.source_id, new Set());
    if (!adj.has(r.target_id)) adj.set(r.target_id, new Set());
    adj.get(r.source_id)!.add(r.target_id);
    adj.get(r.target_id)!.add(r.source_id);
    metaMap.set(r.source_id, r.source as ResourceMeta);
    metaMap.set(r.target_id, r.target as ResourceMeta);
  });

  // BFS from focalId to assign depth
  const depth = new Map<string, number>();
  depth.set(focalId, 0);
  const queue = [focalId];
  while (queue.length) {
    const cur = queue.shift()!;
    const curDepth = depth.get(cur)!;
    if (curDepth >= 3) continue; // max 3 hops shown
    for (const nb of adj.get(cur) ?? []) {
      if (!depth.has(nb)) {
        depth.set(nb, curDepth + 1);
        queue.push(nb);
      }
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  const radii = [0, 220, 420, 620];

  // Group nodes by depth
  const byDepth: Map<number, string[]> = new Map();
  for (const [id, d] of depth.entries()) {
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [d, ids] of byDepth.entries()) {
    ids.forEach((id, i) => {
      if (d === 0) {
        positions[id] = { x: cx - 76, y: cy - 30 };
      } else {
        const angle = (2 * Math.PI * i) / ids.length - Math.PI / 2;
        const r = radii[d] ?? 620;
        positions[id] = {
          x: cx + r * Math.cos(angle) - 76,
          y: cy + r * Math.sin(angle) - 30,
        };
      }
    });
  }

  const rfNodes: ResourceGraphNode[] = Array.from(depth.keys()).map((id) => {
    const meta = metaMap.get(id);
    const d = depth.get(id) ?? 0;
    const connCount = adj.get(id)?.size ?? 0;
    return {
      id,
      type: "resource",
      position: positions[id] ?? { x: cx, y: cy },
      data: {
        label: meta?.resource_name ?? id,
        resourceType: meta?.resource_type ?? id.split("-")[0] ?? "resource",
        resourceId: id,
        connectionCount: connCount,
        isFocal: id === focalId,
        depth: d,
      } as NodeData,
    };
  });

  // Only edges that connect nodes we're showing
  const visibleIds = new Set(depth.keys());
  const rfEdges: ResourceGraphEdge[] = relationships
    .filter((r) => visibleIds.has(r.source_id) && visibleIds.has(r.target_id))
    .map((r, i) => {
      const isFocalEdge = r.source_id === focalId || r.target_id === focalId;
      const { color } = getColorForString(r.relation || "default");
      const edgeColor = isFocalEdge ? "#f87171" : color;
      return {
        id: r.id ?? `edge-${i}`,
        source: r.source_id,
        target: r.target_id,
        type: "relation",
        animated: isFocalEdge,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: `${edgeColor}88`,
          width: 14,
          height: 14,
        },
        data: { relation: r.relation },
      };
    });

  return { rfNodes, rfEdges, depth };
}

export function getColorForString(str: string) {
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

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export const HUE_PALETTE = [
  4, 24, 48, 80, 150, 175, 200, 220, 250, 270, 290, 320, 340,
];

export function getIconForType(type: string): string {
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

export function getLabelForType(type: string): string {
  if (!type) return "Resource";
  return type
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 20);
}

const ResourceNode = memo(
  ({ data, selected }: NodeProps<ResourceGraphNode>) => {
    const d = data as NodeData;
    const { color, glow, bg, border } = getColorForString(d.resourceType);
    const icon = getIconForType(d.resourceType);
    const label = getLabelForType(d.resourceType);

    // Focal node gets an orange-red danger ring
    const focalRing = d.isFocal
      ? {
          boxShadow: `0 0 0 3px rgba(239,68,68,0.35), 0 0 32px rgba(239,68,68,0.25), 0 4px 16px #00000070`,
        }
      : {};

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
            border: d.isFocal
              ? "1.5px solid rgba(239,68,68,0.7)"
              : `1.5px solid ${selected ? color : border}`,
            borderRadius: 14,
            padding: "12px 16px",
            minWidth: 152,
            maxWidth: 210,
            boxShadow: d.isFocal
              ? focalRing.boxShadow
              : selected
                ? `0 0 0 3px ${glow}, 0 0 28px ${glow}, 0 4px 16px #00000070`
                : `0 0 14px ${glow}, 0 4px 12px #00000050`,
            transition: "all 0.2s ease",
            fontFamily: "'JetBrains Mono', monospace",
            position: "relative",
            opacity:
              d.depth !== undefined && d.depth > 0
                ? Math.max(0.55, 1 - d.depth * 0.12)
                : 1,
          }}
        >
          {/* Focal badge */}
          {d.isFocal && (
            <div
              style={{
                position: "absolute",
                top: -11,
                right: 8,
                padding: "1px 7px",
                borderRadius: 99,
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#f87171",
                whiteSpace: "nowrap",
              }}
            >
              ⚠ focal
            </div>
          )}

          {/* Type badge */}
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
                background: d.isFocal ? "rgba(239,68,68,0.1)" : `${color}18`,
                border: d.isFocal
                  ? "1px solid rgba(239,68,68,0.3)"
                  : `1px solid ${color}40`,
                flexShrink: 0,
                fontSize: 16,
                color: d.isFocal ? "#f87171" : color,
              }}
            >
              {icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                title={d.label}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: d.isFocal ? "#f87171" : color,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 114,
                }}
              >
                {d.label}
              </div>
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
  const {
    color: relColor,
    bg: relBg,
    border: relBorder,
  } = getColorForString(relation || "default");
  const strokeColor = selected ? relColor : `${relColor}55`;
  const glowColor = selected ? `${relColor}50` : "transparent";

  return (
    <>
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

export const NODE_TYPES: NodeTypes = { resource: ResourceNode };
export const EDGE_TYPES: EdgeTypes = { relation: RelationEdge };

export const GRAPH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
  .react-flow__attribution { display: none !important; }
  .react-flow__controls {
    background: #0d0d18 !important; border: 1px solid rgba(255,255,255,0.07) !important;
    border-radius: 10px !important; box-shadow: 0 4px 20px #00000060 !important; overflow: hidden;
  }
  .react-flow__controls-button {
    background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important;
    color: #64748b !important; fill: #64748b !important;
  }
  .react-flow__controls-button:hover { background: rgba(255,255,255,0.05) !important; fill: #94a3b8 !important; }
  .react-flow__minimap { background: #07070f !important; border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 10px !important; overflow: hidden; }
`;
