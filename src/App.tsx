/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  MousePointer2, 
  Zap, 
  ZapOff,
  ChevronRight,
  Info,
  Settings2,
  Table as TableIcon,
  Activity,
  Send,
  Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { makeDefaultTopology, Node, Edge, NODE_COLORS } from './lib/defaultTopology';
import { 
  getShortestPath, 
  buildAllRoutingTables, 
  simulateDVStep 
} from './lib/routing';

// --- Types ---
type Mode = 'select' | 'add-node' | 'add-edge' | 'delete' | 'fail';
type Algo = 'dv' | 'ls';

export default function App() {
  // --- State ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<Mode>('select');
  const [algo, setAlgo] = useState<Algo>('dv');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [simSrc, setSimSrc] = useState<string>('');
  const [simDst, setSimDst] = useState<string>('');
  const [dvTables, setDvTables] = useState<any>({});
  const [dvStep, setDvStep] = useState(0);
  const [options, setOptions] = useState({
    splitHorizon: false,
    poisonReverse: false,
    maxCost: 16
  });
  const [showTables, setShowTables] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [packetPos, setPacketPos] = useState<number | null>(null); // 0 to 1 along the path

  const tableRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // --- Initialization ---
  useEffect(() => {
    const { nodes: dNodes, edges: dEdges } = makeDefaultTopology(800, 500);
    setNodes(dNodes);
    setEdges(dEdges);
  }, []);

  // --- Derived State ---
  const failedNodes = useMemo(() => new Set(nodes.filter(n => n.failed).map(n => n.id)), [nodes]);
  
  const routingTables = useMemo(() => {
    if (algo === 'ls') {
      return buildAllRoutingTables(nodes, edges, 'ls', failedNodes);
    }
    if (dvStep > 0) return dvTables;
    return buildAllRoutingTables(nodes, edges, 'dv', failedNodes);
  }, [nodes, edges, algo, failedNodes, dvStep, dvTables]);

  const shortestPath = useMemo(() => {
    if (!simSrc || !simDst) return { path: [], cost: Infinity };
    return getShortestPath(nodes.map(n => n.id), edges, simSrc, simDst, algo, failedNodes);
  }, [nodes, edges, simSrc, simDst, algo, failedNodes]);

  // --- Handlers ---
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode === 'add-node') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = `R${nodes.length}`;
      const color = NODE_COLORS[nodes.length % NODE_COLORS.length];
      setNodes([...nodes, { id, x, y, color }]);
    } else if (mode === 'select') {
      setSelectedNode(null);
      setEdgeSource(null);
    }
  };

  const scrollToTable = (id: string) => {
    const ref = tableRefs.current[id];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'delete') {
      setNodes(nodes.filter(n => n.id !== id));
      setEdges(edges.filter(e => e.source !== id && e.target !== id));
      if (selectedNode === id) setSelectedNode(null);
    } else if (mode === 'fail') {
      setNodes(nodes.map(n => n.id === id ? { ...n, failed: !n.failed } : n));
      setDvStep(0);
    } else if (mode === 'add-edge') {
      if (!edgeSource) {
        setEdgeSource(id);
      } else if (edgeSource !== id) {
        const edgeId = `e${edges.length}`;
        setEdges([...edges, { id: edgeId, source: edgeSource, target: id, weight: 1 }]);
        setEdgeSource(null);
      }
    } else if (mode === 'select') {
      setSelectedNode(id);
      scrollToTable(id);
    }
  };

  const handleEdgeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'delete') {
      setEdges(edges.filter(e => e.id !== id));
    } else {
      const weight = prompt('Enter link weight (cost):', '1');
      if (weight !== null) {
        const w = parseInt(weight);
        if (!isNaN(w)) {
          setEdges(edges.map(e => e.id === id ? { ...e, weight: w } : e));
          setDvStep(0);
        }
      }
    }
  };

  const handleDvStep = () => {
    let current;
    if (dvStep === 0) {
      current = {};
      nodes.forEach(n => {
        current[n.id] = {};
        nodes.forEach(m => {
          if (n.id === m.id) {
            current[n.id][m.id] = { cost: 0, nextHop: n.id };
          } else {
            const edge = edges.find(e => 
              (e.source === n.id && e.target === m.id) || 
              (e.target === n.id && e.source === m.id)
            );
            if (edge && !n.failed && !m.failed) {
              current[n.id][m.id] = { cost: edge.weight, nextHop: m.id };
            } else {
              current[n.id][m.id] = { cost: Infinity, nextHop: null };
            }
          }
        });
      });
    } else {
      current = dvTables;
    }

    const next = simulateDVStep(nodes, edges, current, options);
    setDvTables(next);
    setDvStep(dvStep + 1);
  };

  const handleReset = () => {
    setNodes([]);
    setEdges([]);
    setDvStep(0);
    setSimSrc('');
    setSimDst('');
    setSelectedNode(null);
  };

  const handleSendMessage = () => {
    if (shortestPath.path.length < 2) return;
    setIsSimulating(true);
    setPacketPos(0);
    
    let currentStep = 0;
    const totalSteps = shortestPath.path.length - 1;
    
    const interval = setInterval(() => {
      setPacketPos(prev => {
        if (prev === null) return 0;
        const next = prev + 0.05;
        if (next >= totalSteps) {
          clearInterval(interval);
          setIsSimulating(false);
          return null;
        }
        return next;
      });
    }, 50);
  };

  const getPacketCoords = () => {
    if (packetPos === null || shortestPath.path.length < 2) return null;
    const step = Math.floor(packetPos);
    const t = packetPos - step;
    const uId = shortestPath.path[step];
    const vId = shortestPath.path[step + 1];
    const u = nodes.find(n => n.id === uId);
    const v = nodes.find(n => n.id === vId);
    if (!u || !v) return null;
    return {
      x: u.x + (v.x - u.x) * t,
      y: u.y + (v.y - u.y) * t
    };
  };

  const packetCoords = getPacketCoords();

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* --- Header --- */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">NetSim <span className="text-blue-400 font-normal text-sm ml-1">v2.1</span></h1>
            <p className="text-xs text-slate-400 font-medium">Network Router Simulator</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button 
            onClick={() => { setAlgo('dv'); setDvStep(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${algo === 'dv' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            <Zap className="w-4 h-4" />
            Distance Vector
          </button>
          <button 
            onClick={() => { setAlgo('ls'); setDvStep(0); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${algo === 'ls' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}
          >
            <Activity className="w-4 h-4" />
            Link State
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Topology</span>
            <div className="flex gap-3 text-sm font-mono">
              <span className="text-blue-400">{nodes.length} <span className="text-slate-600">Nodes</span></span>
              <span className="text-emerald-400">{edges.length} <span className="text-slate-600">Links</span></span>
            </div>
          </div>
          <button 
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-500 transition-colors border border-red-500/20"
            title="Clear Canvas"
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* --- Sidebar (Tools) --- */}
        <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-10">
          <ToolButton active={mode === 'select'} onClick={() => setMode('select')} icon={<MousePointer2 />} label="Select" />
          <ToolButton active={mode === 'add-node'} onClick={() => setMode('add-node')} icon={<Plus />} label="Node" />
          <ToolButton active={mode === 'add-edge'} onClick={() => setMode('add-edge')} icon={<LinkIcon />} label="Link" />
          <ToolButton active={mode === 'fail'} onClick={() => setMode('fail')} icon={<ZapOff />} label="Fail" color="text-amber-500" />
          <div className="w-8 h-px bg-slate-800 my-2" />
          <ToolButton active={mode === 'delete'} onClick={() => setMode('delete')} icon={<Trash2 />} label="Delete" color="text-red-500" />
        </aside>

        {/* --- Main Canvas Area --- */}
        <main className="flex-1 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px]">
          <svg 
            className="w-full h-full cursor-crosshair"
            onClick={handleCanvasClick}
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Edges */}
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;
              
              const isPath = isSimulating && 
                             shortestPath.path.includes(edge.source) && 
                             shortestPath.path.includes(edge.target) &&
                             Math.abs(shortestPath.path.indexOf(edge.source) - shortestPath.path.indexOf(edge.target)) === 1;
              
              const isFailed = source.failed || target.failed;

              return (
                <g key={edge.id} onClick={(e) => handleEdgeClick(edge.id, e)}>
                  <line 
                    x1={source.x} y1={source.y} 
                    x2={target.x} y2={target.y} 
                    className={`transition-all duration-500 ${isPath ? 'stroke-emerald-400 stroke-[4px]' : 'stroke-slate-800 stroke-[1.5px]'} ${isFailed ? 'opacity-10 stroke-slate-900' : 'hover:stroke-slate-600 cursor-pointer'}`}
                    style={isPath ? { filter: 'url(#glow)' } : {}}
                  />
                  {/* Weight Label */}
                  <rect 
                    x={(source.x + target.x) / 2 - 12} 
                    y={(source.y + target.y) / 2 - 12} 
                    width="24" height="18" rx="4"
                    className="fill-slate-900/80 stroke-slate-800 stroke"
                  />
                  <text 
                    x={(source.x + target.x) / 2} 
                    y={(source.y + target.y) / 2 - 3} 
                    className="fill-amber-500 text-[10px] font-bold select-none pointer-events-none"
                    textAnchor="middle" alignmentBaseline="middle"
                  >
                    {edge.weight}
                  </text>
                </g>
              );
            })}

            {/* Packet Animation */}
            {packetCoords && (
              <g className="animate-packet-glow">
                <circle cx={packetCoords.x} cy={packetCoords.y} r="7" className="fill-white" />
                <circle cx={packetCoords.x} cy={packetCoords.y} r="12" className="fill-emerald-400/50 blur-sm" />
              </g>
            )}

            {/* Nodes */}
            {nodes.map(node => (
              <g 
                key={node.id} 
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => handleNodeClick(node.id, e)}
                className="cursor-pointer group"
              >
                {/* Concentric Rings */}
                <circle r="40" className="fill-none stroke-current opacity-10" style={{ color: node.color }} />
                <circle r="32" className="fill-none stroke-current opacity-30" style={{ color: node.color }} />
                
                {/* SRC/DST Node Glow */}
                {simSrc === node.id && (
                  <circle r="32" className="fill-emerald-500/20 blur-xl animate-pulse" />
                )}
                {simDst === node.id && (
                  <circle r="32" className="fill-purple-500/20 blur-xl animate-pulse" />
                )}

                {/* Main Circle */}
                <circle 
                  r="22" 
                  className={`transition-all duration-300 ${node.failed ? 'fill-slate-800 stroke-slate-700' : 'stroke-current'} stroke-2`}
                  style={{ fill: node.failed ? undefined : `${node.color}22`, color: node.color }}
                />
                
                {/* Hexagon Center */}
                {!node.failed && (
                  <g transform="scale(1.0)">
                    <path 
                      d="M0,-10 L8.66,-5 L8.66,5 L0,10 L-8.66,5 L-8.66,-5 Z" 
                      className="fill-none stroke-current stroke-1"
                      style={{ color: node.color }}
                    />
                    <circle r="2" className="fill-current" style={{ color: node.color }} />
                  </g>
                )}

                {/* Status Indicator */}
                {node.failed && (
                  <path d="M-6,-6 L6,6 M6,-6 L-6,6" className="stroke-red-500 stroke-2" />
                )}

                {/* Label Below */}
                <text 
                  y="55" 
                  className="text-sm font-bold select-none pointer-events-none text-center fill-current"
                  textAnchor="middle"
                  style={{ color: node.failed ? '#475569' : node.color }}
                >
                  {node.id}
                </text>

                {/* Selection Ring */}
                {edgeSource === node.id && (
                  <circle r="46" className="fill-none stroke-emerald-500 stroke-2 stroke-dasharray-4 animate-spin-slow" />
                )}

                {/* SRC/DST Markers */}
                {simSrc === node.id && (
                  <g transform="translate(0, -52)">
                    <rect x="-14" y="-8" width="28" height="14" rx="7" className="fill-slate-900 stroke-emerald-500 stroke" />
                    <text className="fill-emerald-400 text-[7px] font-bold" textAnchor="middle" y="2">SRC</text>
                  </g>
                )}
                {simDst === node.id && (
                  <g transform="translate(0, -52)">
                    <rect x="-14" y="-8" width="28" height="14" rx="7" className="fill-slate-900 stroke-purple-500 stroke" />
                    <text className="fill-purple-400 text-[7px] font-bold" textAnchor="middle" y="2">DST</text>
                  </g>
                )}
              </g>
            ))}
          </svg>

          {/* --- Simulation Controls Overlay --- */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none">
            <div className="flex flex-col gap-4 pointer-events-auto">
              {/* Simulation Configuration - Only show in SELECT mode */}
              <AnimatePresence>
                {mode === 'select' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-2xl w-80"
                  >
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                      <Play className="w-4 h-4 text-emerald-400" />
                      Path Simulation
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Source</label>
                        <select 
                          value={simSrc} 
                          onChange={(e) => setSimSrc(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none"
                        >
                          <option value="">Select</option>
                          {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Destination</label>
                        <select 
                          value={simDst} 
                          onChange={(e) => setSimDst(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-blue-500 outline-none"
                        >
                          <option value="">Select</option>
                          {nodes.map(n => <option key={n.id} value={n.id}>{n.id}</option>)}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleSendMessage}
                      disabled={!simSrc || !simDst || simSrc === simDst || shortestPath.path.length === 0 || isSimulating}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* DV Simulation - Only show in FAIL mode */}
              <AnimatePresence>
                {mode === 'fail' && algo === 'dv' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-2xl w-80"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-blue-400" />
                        DV Simulation
                      </h3>
                      <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Step {dvStep}</span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <OptionToggle 
                        active={options.splitHorizon} 
                        onClick={() => setOptions({...options, splitHorizon: !options.splitHorizon})} 
                        label="Split Horizon" 
                        description="Don't advertise routes back to source"
                      />
                      <OptionToggle 
                        active={options.poisonReverse} 
                        onClick={() => setOptions({...options, poisonReverse: !options.poisonReverse})} 
                        label="Poison Reverse" 
                        description="Advertise failed routes as Infinity"
                      />
                    </div>

                    <button 
                      onClick={handleDvStep}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                    >
                      <Play className="w-4 h-4" />
                      Next Simulation Step
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-end gap-4 pointer-events-auto">
               <button 
                 onClick={() => setShowTables(!showTables)}
                 className={`p-4 rounded-2xl shadow-2xl border transition-all ${showTables ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
               >
                 <TableIcon className="w-6 h-6" />
               </button>
            </div>
          </div>
        </main>

        {/* --- Right Panel (Routing Tables) --- */}
        <AnimatePresence>
          {showTables && (
            <motion.aside 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col z-10 shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-blue-400" />
                  Routing Tables
                </h2>
                <span className="text-[10px] font-mono text-slate-500">{algo === 'dv' ? 'Distance Vector' : 'Link State'}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar scroll-smooth">
                {nodes.map(node => {
                  const table = routingTables[node.id] || [];
                  const isSelected = selectedNode === node.id;
                  
                  return (
                    <div 
                      key={node.id} 
                      ref={el => tableRefs.current[node.id] = el}
                      className={`transition-all duration-300 ${isSelected ? 'scale-105' : 'opacity-80'}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${node.failed ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <h3 className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>Router {node.id}</h3>
                        {node.failed && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">FAILED</span>}
                      </div>
                      
                      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-900 text-slate-500 uppercase tracking-wider font-bold">
                            <tr>
                              <th className="px-4 py-2">Dest</th>
                              <th className="px-4 py-2">Cost</th>
                              <th className="px-4 py-2">Next Hop</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {Array.isArray(table) ? (
                              table.map((row: any) => (
                                <tr key={row.dest} className="hover:bg-slate-900/50 transition-colors">
                                  <td className="px-4 py-2 font-bold text-slate-300">{row.dest}</td>
                                  <td className={`px-4 py-2 font-mono ${row.cost === '∞' || row.cost === Infinity ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {row.cost === Infinity ? '∞' : row.cost}
                                  </td>
                                  <td className="px-4 py-2 text-slate-400">{row.nextHop}</td>
                                </tr>
                              ))
                            ) : (
                              Object.entries(table).map(([dest, data]: [string, any]) => (
                                <tr key={dest} className="hover:bg-slate-900/50 transition-colors">
                                  <td className="px-4 py-2 font-bold text-slate-300">{dest}</td>
                                  <td className={`px-4 py-2 font-mono ${data.cost === Infinity ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {data.cost === Infinity ? '∞' : data.cost}
                                  </td>
                                  <td className="px-4 py-2 text-slate-400">{data.nextHop || '—'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* --- Footer / Legend --- */}
      <footer className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] font-medium text-slate-500">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Selected Router</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active Router</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Failed Router</span>
          </div>
        </div>
        <div className="flex items-center gap-2 italic">
          <Info className="w-3 h-3" />
          <span>Click on a link to change its weight. Use "Fail" tool to simulate router outages.</span>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---

function ToolButton({ active, onClick, icon, label, color = "text-slate-400" }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 group transition-all duration-200 ${active ? 'scale-110' : 'hover:scale-105'}`}
    >
      <div className={`p-3 rounded-2xl transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : `bg-slate-800 ${color} hover:bg-slate-700`}`}>
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>{label}</span>
    </button>
  );
}

function OptionToggle({ active, onClick, label, description }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${active ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
    >
      <div>
        <p className={`text-xs font-bold ${active ? 'text-blue-400' : 'text-slate-300'}`}>{label}</p>
        <p className="text-[9px] text-slate-500 font-medium">{description}</p>
      </div>
      <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-slate-800'}`}>
        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${active ? 'left-4.5' : 'left-0.5'}`} />
      </div>
    </div>
  );
}
