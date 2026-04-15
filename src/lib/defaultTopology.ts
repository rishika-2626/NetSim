// src/lib/defaultTopology.ts

export const NODE_COLORS = [
  '#3b82f6', // blue
  '#10d9a0', // green
  '#f59e0b', // amber
  '#f43f5e', // red
  '#8b5cf6', // purple
  '#22d3ee', // cyan
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#d946ef'  // fuchsia
];

export interface Node {
  id: string;
  x: number;
  y: number;
  color: string;
  failed?: boolean;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export function makeDefaultTopology(w: number, h: number) {
  const cx = w / 2, cy = h / 2, rx = Math.min(w * 0.32, 240), ry = Math.min(h * 0.36, 200);
  const nodes: Node[] = [
    { id: 'R0', x: cx - rx,       y: cy - ry * 0.5,  color: '#60a5fa' },
    { id: 'R1', x: cx - rx * 0.3, y: cy - ry,         color: '#34d399' },
    { id: 'R2', x: cx + rx * 0.3, y: cy - ry,         color: '#f472b6' },
    { id: 'R3', x: cx + rx,       y: cy - ry * 0.5,  color: '#fb923c' },
    { id: 'R4', x: cx + rx * 0.5, y: cy + ry * 0.7,  color: '#a78bfa' },
    { id: 'R5', x: cx,            y: cy + ry,         color: '#38bdf8' },
    { id: 'R6', x: cx - rx * 0.5, y: cy + ry * 0.7,  color: '#fbbf24' },
  ];
  const edges: Edge[] = [
    { id: 'e0',  source: 'R0', target: 'R1', weight: 4 },
    { id: 'e1',  source: 'R1', target: 'R2', weight: 3 },
    { id: 'e2',  source: 'R2', target: 'R3', weight: 2 },
    { id: 'e3',  source: 'R3', target: 'R4', weight: 6 },
    { id: 'e4',  source: 'R4', target: 'R5', weight: 4 },
    { id: 'e5',  source: 'R5', target: 'R6', weight: 3 },
    { id: 'e6',  source: 'R6', target: 'R0', weight: 5 },
    { id: 'e7',  source: 'R0', target: 'R3', weight: 9 },
    { id: 'e8',  source: 'R1', target: 'R5', weight: 7 },
    { id: 'e9',  source: 'R2', target: 'R6', weight: 8 },
  ];
  return { nodes, edges };
}
