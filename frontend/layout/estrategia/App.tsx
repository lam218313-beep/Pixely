import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeData, NodeType } from './types';
import {
    Plus,
    Target,
    Zap,
    FileText,
    MoreHorizontal,
    GripHorizontal,
    MousePointer2,
    Hand,
    Network,
    AlignLeft,
    Lightbulb,
    ArrowRight,
    Minus,
    Layers,
    TrendingUp,
    Save,
    Edit2,
    Check,
    Loader2,
    Maximize,
    Minimize,
    Trash2,
    RefreshCw,
    ChevronDown,
    Tag
} from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../services/api';

// --- Constants & Config ---
const MAX_MAIN_OBJECTIVES = 6;
const MAX_SECONDARY_PER_MAIN = 3;
const MAX_POSTS_PER_SECONDARY = 6;

// Initial Layout Config
const RADIUS_MAIN = 280;

// --- Helper Functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const getRadialPosition = (centerX: number, centerY: number, angleDeg: number, distance: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
        x: centerX + distance * Math.cos(angleRad),
        y: centerY + distance * Math.sin(angleRad)
    };
};

type InteractionMode = 'select' | 'pan';
type ViewMode = 'map' | 'list';

interface Recommendation {
    titulo: string;
    descripcion: string;
    prioridad: string;
    area: string;
    impacto: string;
}

const App: React.FC<{ overrideClientId?: string }> = ({ overrideClientId }) => {
    const [nodes, setNodes] = useState<NodeData[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('map');
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [showRecs, setShowRecs] = useState(true);
    const [brandName, setBrandName] = useState<string>("La Marca");

    // Interaction State
    const [mode, setMode] = useState<InteractionMode>('select');
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

    // Editing & Persistence State
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // List View Expansion State
    const [expandedConceptIds, setExpandedConceptIds] = useState<Set<string>>(new Set());

    // --- IMPROVED DRAG STATE ---
    const [isDraggingNodes, setIsDraggingNodes] = useState(false);
    const dragStartMouse = useRef<{ x: number, y: number } | null>(null);
    const initialNodePositions = useRef<{ [id: string]: { x: number, y: number } }>({});

    // Viewport State
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    const zoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

    const canvasRef = useRef<HTMLDivElement>(null);
    const panStart = useRef({ x: 0, y: 0 });
    const panStartOffset = useRef({ x: 0, y: 0 });

    const CLIENT_ID = overrideClientId || localStorage.getItem('clientId');

    // Fetch Client Name
    useEffect(() => {
        const fetchClientInfo = async () => {
            if (!CLIENT_ID) return;
            try {
                const status = await api.getClientStatus(CLIENT_ID); // Or getClient if available by ID
                // Since getClient by ID isn't directly exposed as a single fetch function (only getClients list), 
                // we might need to rely on what we can get.
                // Ideally we'd have api.getClient(id). 
                // Let's fallback to "La Marca" or try to find it in the list if we must.
                const clients = await api.getClients();
                const client = clients.find(c => c.id === CLIENT_ID);
                if (client) {
                    setBrandName(client.nombre); // Assuming 'nombre' property
                }
            } catch (e) {
                console.error("Could not fetch brand name", e);
            }
        };
        fetchClientInfo();
    }, [CLIENT_ID]);


    // --- Persistence Handlers (Autosave) ---
    const handleSaveStrategy = useCallback(async (currentNodes: NodeData[]) => {
        if (!CLIENT_ID) return;
        setIsSaving(true);

        console.log('💾 Strategy: Saving for CLIENT_ID:', CLIENT_ID, 'Nodes:', currentNodes.length);

        try {
            const cleanNodes = currentNodes.map(({ icon, color, ...rest }) => rest);
            await api.syncStrategy(CLIENT_ID, cleanNodes as any);
            console.log('✅ Strategy: Saved successfully');
            // toast.success("Guardado automáticamente"); // Optional: too spammy?
        } catch (error) {
            console.error("❌ Strategy: Error saving strategy:", error);
        } finally {
            setIsSaving(false);
        }
    }, [CLIENT_ID]);

    // Debounced Autosave
    useEffect(() => {
        if (nodes.length === 0) return; // Skip initial empty or don't save empty if acceptable

        const timeoutId = setTimeout(() => {
            handleSaveStrategy(nodes);
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timeoutId);
    }, [nodes, handleSaveStrategy]);

    useEffect(() => {
        // Load existing strategy nodes
        const loadStrategy = async () => {
            if (!CLIENT_ID) {
                console.warn('⚠️ Strategy: No CLIENT_ID found in localStorage');
                return;
            }

            console.log('🔍 Strategy: Loading for CLIENT_ID:', CLIENT_ID);

            try {
                const strategyData = await api.getStrategy(CLIENT_ID);
                console.log('📊 Strategy: Received data:', {
                    count: strategyData?.length || 0,
                    nodes: strategyData,
                    clientId: CLIENT_ID
                });

                if (strategyData && strategyData.length > 0) {
                    setNodes(strategyData as any);
                } else {
                    console.log('📝 Strategy: Empty data - creating initial root node');
                    // Empty state - Initialize with Root Node if empty
                    const viewportCenterX = window.innerWidth / 2;
                    const viewportCenterY = window.innerHeight / 2;
                    setNodes([{
                        id: generateId(),
                        type: 'main',
                        label: 'Proyecto Marketing',
                        description: 'Estrategia General',
                        parentId: null,
                        x: 0, // Centered via transform usually, logic below handles viewport center
                        y: 0
                    }]);
                }
            } catch (e) {
                console.error("❌ Strategy: Error fetching strategy:", e);
            }
        };
        loadStrategy();
    }, [CLIENT_ID]); // Removed brandName dependency to avoid reload loops, will update label separately if needed

    // Update root node label if brand name changes and it's still default? 
    // Maybe risky if user edited it. Let's leave it.

    // --- Logic: Data Management ---
    const updateNodeData = (id: string, field: keyof NodeData, value: any) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
    };

    const deleteSelectedNodes = useCallback(() => {
        if (selectedNodeIds.size === 0) return;
        const nodesToDelete = new Set(selectedNodeIds);
        let addedCount = 0;
        do {
            addedCount = 0;
            nodes.forEach(node => {
                if (!nodesToDelete.has(node.id) && node.parentId && nodesToDelete.has(node.parentId)) {
                    nodesToDelete.add(node.id);
                    addedCount++;
                }
            });
        } while (addedCount > 0);
        setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
        setSelectedNodeIds(new Set());
    }, [nodes, selectedNodeIds]);

    // --- Interaction Handlers (Map View) ---

    const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if ((e.button !== 0 && e.button !== 1) || mode === 'pan') return;

        const newSelected = new Set(selectedNodeIds);
        if (e.shiftKey) {
            if (newSelected.has(id)) newSelected.delete(id);
            else newSelected.add(id);
        } else {
            if (!newSelected.has(id)) {
                newSelected.clear();
                newSelected.add(id);
            }
        }
        setSelectedNodeIds(newSelected);
        setIsDraggingNodes(true);
        dragStartMouse.current = { x: e.clientX, y: e.clientY };
        const positions: { [id: string]: { x: number, y: number } } = {};
        nodes.forEach(n => {
            if (newSelected.has(n.id)) {
                positions[n.id] = { x: n.x, y: n.y };
            }
        });
        initialNodePositions.current = positions;
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 && e.button !== 1) return;
        if (mode === 'pan' || e.button === 1) {
            setIsPanning(true);
            panStart.current = { x: e.clientX, y: e.clientY };
            panStartOffset.current = { x: pan.x, y: pan.y };
        } else {
            if (!e.shiftKey) setSelectedNodeIds(new Set());
            const rect = canvasRef.current!.getBoundingClientRect();
            const startX = (e.clientX - rect.left - pan.x) / scale;
            const startY = (e.clientY - rect.top - pan.y) / scale;
            setSelectionBox({
                startX,
                startY,
                currentX: startX,
                currentY: startY
            });
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (viewMode !== 'map') return;
        if (isDraggingNodes && dragStartMouse.current) {
            const dx = (e.clientX - dragStartMouse.current.x) / scale;
            const dy = (e.clientY - dragStartMouse.current.y) / scale;
            setNodes(prev => prev.map(n => {
                if (initialNodePositions.current[n.id]) {
                    return {
                        ...n,
                        x: initialNodePositions.current[n.id].x + dx,
                        y: initialNodePositions.current[n.id].y + dy
                    };
                }
                return n;
            }));
        } else if (isPanning) {
            const dx = e.clientX - panStart.current.x;
            const dy = e.clientY - panStart.current.y;
            setPan({
                x: panStartOffset.current.x + dx,
                y: panStartOffset.current.y + dy
            });
        } else if (selectionBox && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const currentX = (e.clientX - rect.left - pan.x) / scale;
            const currentY = (e.clientY - rect.top - pan.y) / scale;
            setSelectionBox(prev => prev ? { ...prev, currentX, currentY } : null);
        }
    }, [isDraggingNodes, isPanning, selectionBox, pan, scale, viewMode]);

    const handleMouseUp = useCallback(() => {
        if (selectionBox) {
            const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
            const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
            const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
            const y2 = Math.max(selectionBox.startY, selectionBox.currentY);
            const newSelection = new Set(selectedNodeIds);
            nodes.forEach(node => {
                if (node.x > x1 && node.x < x2 && node.y > y1 && node.y < y2) {
                    newSelection.add(node.id);
                }
            });
            setSelectedNodeIds(newSelection);
            setSelectionBox(null);
        }
        setIsDraggingNodes(false);
        setIsPanning(false);
        dragStartMouse.current = null;
        initialNodePositions.current = {};
    }, [selectionBox, nodes, selectedNodeIds]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && viewMode === 'map') {
                if (document.activeElement === document.body || document.activeElement?.tagName === 'BUTTON') {
                    deleteSelectedNodes();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelectedNodes, viewMode]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    // --- Node Creation ---
    const addMainObjective = (overrideData?: Partial<NodeData>) => {
        const mainNodes = nodes.filter(n => n.type === 'main');
        if (mainNodes.length >= MAX_MAIN_OBJECTIVES) return;
        const count = mainNodes.length;

        const angleStep = 360 / Math.max(MAX_MAIN_OBJECTIVES, 3);
        const angle = -90 + (count * angleStep);
        const viewportCenterX = (window.innerWidth / 2 - pan.x) / scale;
        const viewportCenterY = (window.innerHeight / 2 - pan.y) / scale;
        const { x, y } = getRadialPosition(viewportCenterX, viewportCenterY, angle, RADIUS_MAIN);

        const newNode: NodeData = {
            id: generateId(),
            type: 'main',
            label: 'Proyecto Marketing',
            description: '',
            parentId: null,
            x: count === 0 ? viewportCenterX : x,
            y: count === 0 ? viewportCenterY : y,
            ...overrideData
        };
        setNodes(prev => [...prev, newNode]);
    };

    const addChildNode = (parentId: string) => {
        const parent = nodes.find(n => n.id === parentId);
        if (!parent) return;
        let newType: NodeType;
        let limit = 0;
        if (parent.type === 'main') {
            newType = 'secondary';
            limit = MAX_SECONDARY_PER_MAIN;
        } else if (parent.type === 'secondary') {
            newType = 'concept'; // Changed from 'post' to 'concept'
            limit = MAX_POSTS_PER_SECONDARY;
        } else { return; }

        const siblings = nodes.filter(n => n.parentId === parentId);
        if (siblings.length >= limit) return;

        // --- IMPROVED LAYOUT LOGIC to reduce overlap ---
        const childDist = parent.type === 'main' ? 320 : 300; // Increased distance for better spacing

        // Spread logic - More spacing for concepts to avoid overlap
        const spreadBase = parent.type === 'main' ? 40 : 80; // Increased spacing significantly
        const offsetAngle = siblings.length * spreadBase + 30;

        // Determine label based on type and sibling count
        let nodeLabel = '';
        if (newType === 'secondary') {
            // First secondary is "Principal", rest are "Secundario"
            nodeLabel = siblings.length === 0 ? 'Objetivo Principal' : 'Objetivo Secundario';
        } else {
            nodeLabel = 'Concepto';
        }

        const newNode: NodeData = {
            id: generateId(),
            type: newType,
            label: nodeLabel,
            description: '',
            parentId,
            x: parent.x + childDist,
            y: parent.y + (siblings.length % 2 === 0 ? offsetAngle : -offsetAngle),
        };
        setNodes(prev => [...prev, newNode]);
    };

    const getPath = (source: NodeData, target: NodeData) => {
        const midX = (source.x + target.x) / 2;
        return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
    };

    const renderMapNode = (node: NodeData) => {
        const isEditing = editingNodeId === node.id;
        const isSelected = selectedNodeIds.has(node.id);
        const isMain = node.type === 'main';
        const isSec = node.type === 'secondary';
        const isConcept = node.type === 'concept';
        const isPost = node.type === 'post'; // Keep for backwards compatibility
        const canAdd = (isMain && nodes.filter(n => n.parentId === node.id).length < MAX_SECONDARY_PER_MAIN) ||
            (isSec && nodes.filter(n => n.parentId === node.id).length < MAX_POSTS_PER_SECONDARY);

        let baseClasses = "relative flex items-center gap-4 p-5 rounded-[24px] border transition-all duration-300 backdrop-blur-md";
        let typeClasses = "";
        let iconClasses = "";

        if (isMain) {
            typeClasses = `w-[280px] glass-dark text-white border-white/10 ${isSelected ? 'ring-2 ring-accent-500 shadow-glow' : 'hover:border-white/20'}`;
            iconClasses = "bg-accent-500 text-white shadow-lg shadow-accent-600/30";
        } else if (isSec) {
            typeClasses = `w-[240px] glass-panel text-gray-800 border-white/60 ${isSelected ? 'ring-2 ring-accent-500 shadow-lg' : 'hover:shadow-float'}`;
            iconClasses = "bg-accent-50 text-accent-600";
        } else if (isConcept || isPost) {
            // Strategy v2 Concept Styling - Wider cards for full title visibility
            typeClasses = `w-[280px] bg-white text-gray-700 border-gray-100 shadow-sm ${isSelected ? 'ring-2 ring-brand-primary' : 'hover:shadow-md'}`;
            iconClasses = "bg-brand-primary/10 text-brand-primary";
        } else {
            // Fallback
            typeClasses = `w-[200px] bg-white text-gray-600 border-gray-100 shadow-sm ${isSelected ? 'ring-2 ring-accent-400' : 'hover:shadow-md'}`;
            iconClasses = "bg-gray-50 text-gray-400";
        }

        // Determine label text based on type
        let typeLabel = "ELEMENTO";
        if (isMain) typeLabel = "PROYECTO";
        else if (isSec) typeLabel = "OBJETIVO";
        else if (isConcept || isPost) typeLabel = "CONCEPTO";

        return (
            <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 hover:z-20 ${isSelected || isEditing ? 'z-30' : ''}`}
                style={{ left: node.x, top: node.y }}
            >
                <div className={`${baseClasses} ${typeClasses} group cursor-grab active:cursor-grabbing pointer-events-auto`}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-2xl shrink-0 transition-transform group-hover:scale-110 ${iconClasses}`}>
                        {isMain && <Target size={20} />}
                        {isSec && <Zap size={18} fill="currentColor" className="opacity-90" />}
                        {(isConcept || isPost) && <Lightbulb size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isMain ? 'text-gray-400' : 'text-gray-400'}`}>
                                {typeLabel}
                            </p>
                            {isConcept && node.suggested_format && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 uppercase font-bold tracking-tight">
                                    {node.suggested_format}
                                </span>
                            )}
                        </div>

                        {isEditing ? (
                            <input
                                autoFocus
                                type="text"
                                value={node.label}
                                onChange={(e) => updateNodeData(node.id, 'label', e.target.value)}
                                onBlur={() => setEditingNodeId(null)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setEditingNodeId(null);
                                    e.stopPropagation();
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="w-full bg-transparent border-b border-white/30 focus:border-accent-500 outline-none text-current font-bold"
                            />
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingNodeId(node.id);
                                    }}
                                    className={`font-bold truncate leading-tight ${isMain ? 'text-lg' : 'text-sm'}`}
                                    title="Doble clic para editar"
                                >
                                    {node.label}
                                </div>
                                {/* Tags / Frequency */}
                                {isConcept && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {node.suggested_frequency && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                                {node.suggested_frequency === 'high' ? 'Alta' : node.suggested_frequency === 'medium' ? 'Media' : 'Baja'}
                                            </span>
                                        )}
                                        {node.tags && node.tags.slice(0, 2).map((tag, i) => (
                                            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-full">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }}
                                className={`p-1.5 rounded-lg hover:bg-black/10 transition-colors ${isMain ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-800'}`}
                            >
                                <Edit2 size={12} />
                            </button>
                        </div>
                    )}

                    {canAdd && !isEditing && (
                        <button
                            onClick={(e) => { e.stopPropagation(); addChildNode(node.id); }}
                            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0
                    ${isMain ? 'bg-white text-brand-dark hover:bg-gray-50' : 'bg-brand-dark text-white hover:bg-gray-800'}`}
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const renderListView = () => {
        const mainNodes = nodes.filter(n => n.type === 'main');

        if (mainNodes.length === 0) return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Layers size={32} className="opacity-30 text-gray-900" />
                </div>
                <p className="text-xl font-bold text-gray-900">Tu plan está vacío</p>
                <p className="text-sm text-gray-500 mt-2">Cambia a la vista de Mapa para empezar.</p>
            </div>
        );

        return (
            <div className="max-w-7xl mx-auto px-4 pt-12 pb-40 space-y-8 overflow-y-auto h-full custom-scrollbar">
                {mainNodes.map(main => {
                    // Nivel 1: Objetivos (hijos directos del main)
                    const objectiveNodes = nodes.filter(n => n.parentId === main.id);

                    return (
                        <div key={main.id} className="space-y-8">
                            {/* Project Header */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-brand-dark text-white rounded-xl shadow-lg shadow-brand-dark/20">
                                    <Target size={20} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{main.label}</h3>
                                    {main.description && <p className="text-gray-500">{main.description}</p>}
                                </div>
                            </div>

                            {/* Objectives */}
                            {objectiveNodes.map((objective, objIdx) => {
                                // Nivel 2: Estrategias (hijos del objetivo)
                                const strategyNodes = nodes.filter(n => n.parentId === objective.id);

                                return (
                                    <div key={objective.id} className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 space-y-6">
                                        {/* Objective Header */}
                                        <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                                                <Zap size={18} fill="currentColor" className="opacity-90" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                    Objetivo {objIdx + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={objective.label}
                                                    onChange={(e) => updateNodeData(objective.id, 'label', e.target.value)}
                                                    className="text-lg font-bold text-gray-800 bg-transparent border-none focus:ring-0 p-0 w-full placeholder-gray-300"
                                                    placeholder="Nombre del Objetivo..."
                                                />
                                            </div>
                                        </div>

                                        {/* Strategies */}
                                        {strategyNodes.length === 0 && (
                                            <p className="text-sm text-gray-400 italic">Sin estrategias definidas para este objetivo.</p>
                                        )}

                                        {strategyNodes.map((strategy, stratIdx) => {
                                            // Nivel 3: Conceptos (hijos de la estrategia)
                                            const conceptNodes = nodes.filter(n => n.parentId === strategy.id);

                                            return (
                                                <div key={strategy.id} className="bg-gray-50/50 rounded-xl p-5 space-y-4">
                                                    {/* Strategy Header */}
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                                            <TrendingUp size={16} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                                Estrategia {stratIdx + 1}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={strategy.label}
                                                                onChange={(e) => updateNodeData(strategy.id, 'label', e.target.value)}
                                                                className="text-base font-semibold text-gray-700 bg-transparent border-none focus:ring-0 p-0 w-full placeholder-gray-300"
                                                                placeholder="Nombre de la Estrategia..."
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Concepts Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                                                        {conceptNodes.map(concept => {
                                                            const isExpanded = expandedConceptIds.has(concept.id);

                                                            const toggleExpanded = () => {
                                                                const newSet = new Set(expandedConceptIds);
                                                                if (isExpanded) {
                                                                    newSet.delete(concept.id);
                                                                } else {
                                                                    newSet.add(concept.id);
                                                                }
                                                                setExpandedConceptIds(newSet);
                                                            };

                                                            return (
                                                                <div
                                                                    key={concept.id}
                                                                    className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col group hover:border-brand-primary/30 transition-all overflow-hidden"
                                                                >
                                                                    {/* Concept Header - Clickable */}
                                                                    <div
                                                                        onClick={toggleExpanded}
                                                                        className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="p-1.5 bg-brand-primary/5 text-brand-primary rounded-md">
                                                                                <Lightbulb size={14} />
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Concepto</span>
                                                                                <ChevronDown
                                                                                    size={14}
                                                                                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <textarea
                                                                            value={concept.label}
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                updateNodeData(concept.id, 'label', e.target.value);
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="text-sm font-medium text-gray-700 bg-transparent border-none focus:ring-0 p-0 w-full resize-none h-10 leading-snug placeholder-gray-300"
                                                                            placeholder="Nombre del concepto..."
                                                                        />
                                                                    </div>

                                                                    {/* Expanded Details */}
                                                                    {isExpanded && (
                                                                        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                                                                            {/* Description */}
                                                                            {concept.description && (
                                                                                <div>
                                                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                                                        Descripción
                                                                                    </label>
                                                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                                                        {concept.description}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Tags */}
                                                                            {concept.tags && concept.tags.length > 0 && (
                                                                                <div>
                                                                                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                                                                        Tags
                                                                                    </label>
                                                                                    <div className="flex flex-wrap gap-1.5">
                                                                                        {concept.tags.map((tag, idx) => (
                                                                                            <span
                                                                                                key={idx}
                                                                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-primary/5 text-brand-primary rounded-md text-[10px] font-medium"
                                                                                            >
                                                                                                <Tag size={10} />
                                                                                                {tag}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Format & Frequency */}
                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                {concept.suggested_format && (
                                                                                    <div>
                                                                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                                                            Formato
                                                                                        </label>
                                                                                        <span className="text-xs text-gray-700 font-medium capitalize">
                                                                                            {concept.suggested_format}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {concept.suggested_frequency && (
                                                                                    <div>
                                                                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                                                            Frecuencia
                                                                                        </label>
                                                                                        <span className="text-xs text-gray-700 font-medium capitalize">
                                                                                            {concept.suggested_frequency}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Strategic Rationale */}
                                                                            {concept.strategic_rationale && (
                                                                                <div>
                                                                                    <label className="text-[9px] font-bold text-purple-500 uppercase tracking-wider mb-1 block">
                                                                                        🎯 Razón Estratégica
                                                                                    </label>
                                                                                    <p className="text-xs text-gray-600 leading-relaxed bg-purple-50/50 p-2 rounded-lg">
                                                                                        {concept.strategic_rationale}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Creative Hooks */}
                                                                            {concept.creative_hooks && concept.creative_hooks.length > 0 && (
                                                                                <div>
                                                                                    <label className="text-[9px] font-bold text-pink-500 uppercase tracking-wider mb-2 block">
                                                                                        💡 Hooks Creativos
                                                                                    </label>
                                                                                    <ul className="space-y-1.5">
                                                                                        {concept.creative_hooks.map((hook, idx) => (
                                                                                            <li
                                                                                                key={idx}
                                                                                                className="text-xs text-gray-600 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-pink-400"
                                                                                            >
                                                                                                {hook}
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}

                                                                            {/* Execution Guidelines */}
                                                                            {concept.execution_guidelines && (
                                                                                <div className="space-y-3">
                                                                                    <label className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">
                                                                                        📋 Guía de Ejecución
                                                                                    </label>

                                                                                    {/* Structure */}
                                                                                    {concept.execution_guidelines.structure && (
                                                                                        <div>
                                                                                            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                                                                                Estructura
                                                                                            </span>
                                                                                            <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/50 p-2 rounded-lg">
                                                                                                {concept.execution_guidelines.structure}
                                                                                            </p>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Key Elements */}
                                                                                    {concept.execution_guidelines.key_elements && concept.execution_guidelines.key_elements.length > 0 && (
                                                                                        <div>
                                                                                            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                                                                                Elementos Clave
                                                                                            </span>
                                                                                            <ul className="space-y-1">
                                                                                                {concept.execution_guidelines.key_elements.map((element, idx) => (
                                                                                                    <li
                                                                                                        key={idx}
                                                                                                        className="text-xs text-gray-600 pl-3 relative before:content-['✓'] before:absolute before:left-0 before:text-green-500"
                                                                                                    >
                                                                                                        {element}
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Dos and Don'ts */}
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        {/* Dos */}
                                                                                        {concept.execution_guidelines.dos && concept.execution_guidelines.dos.length > 0 && (
                                                                                            <div>
                                                                                                <span className="text-[9px] font-semibold text-green-600 uppercase tracking-wider block mb-1">
                                                                                                    ✅ Hacer
                                                                                                </span>
                                                                                                <ul className="space-y-1">
                                                                                                    {concept.execution_guidelines.dos.map((item, idx) => (
                                                                                                        <li
                                                                                                            key={idx}
                                                                                                            className="text-[10px] text-gray-600 leading-snug"
                                                                                                        >
                                                                                                            • {item}
                                                                                                        </li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Don'ts */}
                                                                                        {concept.execution_guidelines.donts && concept.execution_guidelines.donts.length > 0 && (
                                                                                            <div>
                                                                                                <span className="text-[9px] font-semibold text-red-600 uppercase tracking-wider block mb-1">
                                                                                                    ❌ Evitar
                                                                                                </span>
                                                                                                <ul className="space-y-1">
                                                                                                    {concept.execution_guidelines.donts.map((item, idx) => (
                                                                                                        <li
                                                                                                            key={idx}
                                                                                                            className="text-[10px] text-gray-600 leading-snug"
                                                                                                        >
                                                                                                            • {item}
                                                                                                        </li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Add Concept Button */}
                                                        <button
                                                            onClick={() => addChildNode(strategy.id)}
                                                            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-primary/50 hover:text-brand-primary hover:bg-brand-primary/5 transition-all gap-2 h-full min-h-[100px]"
                                                        >
                                                            <Plus size={20} />
                                                            <span className="text-xs font-bold">Agregar Concepto</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        );
    }

    // --- DRAG AND DROP HANDLERS (New) ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData("application/json");
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            if (data.type === 'recommendation') {
                const rect = canvasRef.current!.getBoundingClientRect();
                const dropX = (e.clientX - rect.left - pan.x) / scale;
                const dropY = (e.clientY - rect.top - pan.y) / scale;

                addMainObjective({
                    label: data.title,
                    description: data.description,
                    x: dropX,
                    y: dropY
                });
            }
        } catch (err) {
            console.error("Drop Error", err);
        }
    };

    return (
        <div ref={containerRef} className="relative flex h-full min-h-[600px] bg-brand-bg font-sans overflow-hidden text-brand-dark selection:bg-accent-100 selection:text-accent-700">
            <main className="flex-1 relative overflow-hidden flex flex-col">

                {/* Header Toggle */}
                <header className="absolute top-6 left-1/2 -translate-x-1/2 h-16 glass-panel rounded-full shadow-float flex items-center gap-4 px-2 z-40">
                    <div className="flex items-center bg-gray-100/50 p-1 rounded-full border border-gray-200/50">
                        <button onClick={() => setViewMode('map')} className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Mapa</button>
                        <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Lista</button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 relative h-full bg-brand-bg">

                    {/* MAP VIEW */}
                    <div
                        ref={canvasRef}
                        onMouseDown={handleCanvasMouseDown}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`absolute inset-0 w-full h-full overflow-hidden bg-white ${viewMode === 'map' ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'} ${mode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
                        style={{
                            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                            backgroundSize: '24px 24px'
                        }}
                    >
                        <div className="absolute inset-0 w-full h-full origin-center transition-transform duration-75 ease-out will-change-transform pointer-events-none"
                            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>

                            {/* Lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                                {nodes.map(node => {
                                    if (!node.parentId) return null;
                                    const parent = nodes.find(n => n.id === node.parentId);
                                    if (!parent) return null;
                                    return <path key={`edge-${node.id}`} d={getPath(parent, node)} fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" className="opacity-60" />;
                                })}
                            </svg>

                            {/* Empty State Placeholder */}
                            {nodes.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                    <div className="text-center">
                                        <h2 className="text-4xl font-extrabold text-gray-200 tracking-tight mb-3">
                                            Lienzo Infinito
                                        </h2>
                                        <p className="text-gray-300 text-sm">
                                            Haz clic en "Nuevo Objetivo" para comenzar
                                        </p>
                                    </div>
                                </div>
                            )}

                            {nodes.map(node => renderMapNode(node))}

                            {/* Selection Box Overlay */}
                            {selectionBox && (
                                <div
                                    className="absolute border border-accent-500 bg-accent-500/10 pointer-events-none z-50 rounded-sm"
                                    style={{
                                        left: Math.min(selectionBox.startX, selectionBox.currentX),
                                        top: Math.min(selectionBox.startY, selectionBox.currentY),
                                        width: Math.abs(selectionBox.currentX - selectionBox.startX),
                                        height: Math.abs(selectionBox.currentY - selectionBox.startY)
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* LIST VIEW */}
                    <div className={`absolute inset-0 w-full h-full overflow-hidden bg-brand-bg ${viewMode === 'list' ? 'opacity-100 visible z-10' : 'opacity-0 invisible pointer-events-none'}`}>
                        {renderListView()}
                    </div>
                </div>

                {/* BOTTOM TOOLBAR */}
                {viewMode === 'map' && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50">
                        <div className="glass-panel rounded-2xl p-2 shadow-float flex items-center gap-3 pr-6">
                            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl mr-2">
                                {/* Delete Button (Visible if selection) */}
                                {selectedNodeIds.size > 0 && (
                                    <button
                                        onClick={deleteSelectedNodes}
                                        className="p-2.5 rounded-lg transition-all text-red-400 hover:text-red-600 hover:bg-red-50"
                                        title="Eliminar seleccionados"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                <button
                                    onClick={toggleFullScreen}
                                    className={`p-2.5 rounded-lg transition-all ${isFullScreen ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                    title={isFullScreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
                                >
                                    {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                <button
                                    onClick={() => setMode('select')}
                                    className={`p-2.5 rounded-lg transition-all ${mode === 'select' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Seleccionar (V)"
                                >
                                    <MousePointer2 size={18} />
                                </button>
                                <button
                                    onClick={() => setMode('pan')}
                                    className={`p-2.5 rounded-lg transition-all ${mode === 'pan' ? 'bg-white shadow-sm text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Mover Lienzo (H)"
                                >
                                    <Hand size={18} />
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                <button onClick={zoomOut} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all" title="Zoom Out"><Minus size={18} /></button>
                                <span className="text-xs font-bold text-gray-400 w-8 text-center">{Math.round(scale * 100)}%</span>
                                <button onClick={zoomIn} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all" title="Zoom In"><Plus size={18} /></button>
                            </div>
                            <div className="w-px h-8 bg-gray-200 mx-2"></div>
                            {/* Save Button */}
                            <div className="flex items-center gap-2 px-3">
                                {isSaving ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                        <Loader2 size={12} className="animate-spin" />
                                        Guardando...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                        <Check size={12} className="text-green-500" />
                                        Guardado
                                    </div>
                                )}
                            </div>
                            <div className="w-px h-8 bg-gray-200 mx-2"></div>

                        </div>
                    </div>
                )}
            </main>

        </div >
    );
};

export default App;