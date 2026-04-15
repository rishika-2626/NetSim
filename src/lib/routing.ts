// lib/routing.js

export function dijkstra(nodeIds: string[], edges: any[], startId: string, failedNodes = new Set<string>()) {
  if (failedNodes.has(startId)) return { dist: {} as Record<string, number>, prev: {} as Record<string, string | null> };
  
  const dist: Record<string, number> = {}, prev: Record<string, string | null> = {}, Q = new Set<string>();
  nodeIds.forEach(id => {
    if (!failedNodes.has(id)) {
      dist[id] = Infinity;
      prev[id] = null;
      Q.add(id);
    }
  });
  
  if (!Q.has(startId)) return { dist, prev };
  dist[startId] = 0;

  while (Q.size > 0) {
    let u: string | null = null;
    Q.forEach(id => {
      if (u === null || dist[id] < dist[u]) u = id;
    });
    
    if (u === null || dist[u] === Infinity) break;
    Q.delete(u);

    edges.forEach(e => {
      if (failedNodes.has(e.source) || failedNodes.has(e.target)) return;
      
      let nbr: string | null = null;
      if (e.source === u && Q.has(e.target)) nbr = e.target;
      else if (e.target === u && Q.has(e.source)) nbr = e.source;
      
      if (nbr !== null) {
        const alt = dist[u!] + e.weight;
        if (alt < dist[nbr]) {
          dist[nbr] = alt;
          prev[nbr] = u;
        }
      }
    });
  }
  return { dist, prev };
}

/**
 * Standard Bellman-Ford for convergence
 */
export function bellmanFord(nodeIds: string[], edges: any[], startId: string, failedNodes = new Set<string>()) {
  if (failedNodes.has(startId)) return { dist: {} as Record<string, number>, prev: {} as Record<string, string | null> };

  const dist: Record<string, number> = {}, prev: Record<string, string | null> = {};
  nodeIds.forEach(id => {
    dist[id] = Infinity;
    prev[id] = null;
  });
  dist[startId] = 0;

  const activeEdges = edges.filter(e => !failedNodes.has(e.source) && !failedNodes.has(e.target));

  for (let i = 0; i < nodeIds.length - 1; i++) {
    let changed = false;
    activeEdges.forEach(e => {
      if (dist[e.source] !== Infinity && dist[e.source] + e.weight < dist[e.target]) {
        dist[e.target] = dist[e.source] + e.weight;
        prev[e.target] = e.source;
        changed = true;
      }
      if (dist[e.target] !== Infinity && dist[e.target] + e.weight < dist[e.source]) {
        dist[e.source] = dist[e.target] + e.weight;
        prev[e.source] = e.target;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return { dist, prev };
}

/**
 * Simulates one step of Distance Vector updates across all nodes.
 * This is used to demonstrate count-to-infinity.
 */
export function simulateDVStep(nodes: any[], edges: any[], currentTables: any, options: { splitHorizon?: boolean, poisonReverse?: boolean, maxCost?: number } = {}) {
  const { splitHorizon = false, poisonReverse = false, maxCost = 16 } = options;
  const newNodeIds = nodes.map(n => n.id);
  const nextTables: any = {};

  // Initialize next tables with current ones
  newNodeIds.forEach(id => {
    nextTables[id] = JSON.parse(JSON.stringify(currentTables[id] || {}));
  });

  // For each node, receive updates from neighbors
  nodes.forEach(u => {
    if (u.failed) return;

    // Find neighbors
    const neighbors = [];
    edges.forEach(e => {
      if (e.source === u.id && !nodes.find(n => n.id === e.target)?.failed) {
        neighbors.push({ id: e.target, weight: e.weight });
      } else if (e.target === u.id && !nodes.find(n => n.id === e.source)?.failed) {
        neighbors.push({ id: e.source, weight: e.weight });
      }
    });

    // Process updates from each neighbor v
    neighbors.forEach(v => {
      const neighborTable = currentTables[v.id];
      if (!neighborTable) return;

      Object.keys(neighborTable).forEach(dest => {
        if (dest === u.id) return;

        let advertisedCost = neighborTable[dest].cost;
        let advertisedNextHop = neighborTable[dest].nextHop;

        // Split Horizon / Poison Reverse Logic
        if (splitHorizon || poisonReverse) {
          if (advertisedNextHop === u.id) {
            if (poisonReverse) {
              advertisedCost = Infinity;
            } else {
              // Split Horizon: don't advertise back to the node we learned from
              return; 
            }
          }
        }

        const newCost = advertisedCost + v.weight;
        const currentEntry = nextTables[u.id][dest] || { cost: Infinity, nextHop: null };

        // Bellman-Ford update rule
        if (newCost < currentEntry.cost || currentEntry.nextHop === v.id) {
          // If the cost is different or we are updating through the same next hop
          if (newCost !== currentEntry.cost || currentEntry.nextHop !== v.id) {
             nextTables[u.id][dest] = {
               cost: newCost >= maxCost ? Infinity : newCost,
               nextHop: newCost >= maxCost ? null : v.id
             };
          }
        }
      });
    });
  });

  return nextTables;
}

export function getShortestPath(nodeIds: string[], edges: any[], src: string, dst: string, algo: string, failedNodes = new Set<string>()) {
  if (!src || !dst || src === dst || failedNodes.has(src) || failedNodes.has(dst)) {
    return { path: [], cost: Infinity };
  }
  
  const { dist, prev } = algo === 'ls' 
    ? dijkstra(nodeIds, edges, src, failedNodes) 
    : bellmanFord(nodeIds, edges, src, failedNodes);
    
  if (dist[dst] === Infinity) return { path: [], cost: Infinity };
  
  const path: string[] = [];
  let cur: string | null = dst;
  const visited = new Set<string>();
  
  while (cur !== null) {
    if (visited.has(cur)) break;
    visited.add(cur);
    path.unshift(cur);
    cur = prev[cur];
  }
  
  if (path[0] !== src) return { path: [], cost: Infinity };
  return { path, cost: dist[dst] };
}

export function buildRoutingTable(nodeIds: string[], edges: any[], startId: string, algo: string, failedNodes = new Set<string>()) {
  if (failedNodes.has(startId)) return [];
  
  const { dist, prev } = algo === 'ls' 
    ? dijkstra(nodeIds, edges, startId, failedNodes) 
    : bellmanFord(nodeIds, edges, startId, failedNodes);
    
  const table: any[] = [];
  nodeIds.forEach(id => {
    if (id === startId) return;
    if (failedNodes.has(id) || dist[id] === Infinity) {
      table.push({ dest: id, cost: '∞', nextHop: '—' });
      return;
    }
    
    // Find first hop
    let cur: string | null = id;
    const seen = new Set<string>();
    while (prev[cur!] && prev[cur!] !== startId && !seen.has(cur!)) {
      seen.add(cur!);
      cur = prev[cur!];
    }
    
    table.push({ 
      dest: id, 
      cost: dist[id], 
      nextHop: prev[cur!] === startId ? cur : (prev[id] || '—') 
    });
  });
  return table;
}

export function buildAllRoutingTables(nodes: any[], edges: any[], algo: string, failedNodes = new Set<string>()) {
  const nodeIds = nodes.map(n => n.id);
  const tables: any = {};
  nodes.forEach(n => {
    if (!failedNodes.has(n.id)) {
      tables[n.id] = buildRoutingTable(nodeIds, edges, n.id, algo, failedNodes);
    } else {
      tables[n.id] = [];
    }
  });
  return tables;
}
