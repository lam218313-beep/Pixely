import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
    X,
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

// --- Reading the tree: what each node is, in the client's words ---
type Role = 'brand' | 'objective' | 'strategy' | 'concept';

const ROLE_INFO: Record<Role, { name: string; explain: string }> = {
    brand: { name: 'Tu marca', explain: 'El centro del mapa: todo lo que sigue es para esta marca.' },
    objective: { name: 'Objetivo', explain: 'Lo que el negocio quiere lograr.' },
    strategy: { name: 'Estrategia', explain: 'Cómo vamos a lograr el objetivo.' },
    concept: { name: 'Concepto de contenido', explain: 'Un tipo de publicación que se repite. Cada mes, el plan lo convierte en piezas concretas.' },
};

const FORMAT_ES: Record<string, string> = { post: 'Post', story: 'Historia', reel: 'Reel', carousel: 'Carrusel', video: 'Video', live: 'En vivo', image: 'Imagen' };
const FREQ_ES: Record<string, string> = { high: '3–4 por semana', medium: '1–2 por semana', low: '1–2 al mes' };

// Placeholder texts older generators wrote instead of real content
const GENERIC_OBJECTIVE = /^objetivo (principal|secundario)$/i;
const FILLER_DESCRIPTIONS = new Set(['estrategia táctica', 'núcleo estratégico', 'estrategia general']);

const roleOf = (node: NodeData, byId: Map<string, NodeData>): Role => {
    if (node.type === 'main') return 'brand';
    if (node.type === 'concept' || node.type === 'post') return 'concept';
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    return !parent || parent.type === 'main' ? 'objective' : 'strategy';
};

const descriptionOf = (node: NodeData) =>
    node.description && !FILLER_DESCRIPTIONS.has(node.description.trim().toLowerCase()) ? node.description : '';

/** Objectives used to be titled just "Objetivo Principal"; their real aim lived in the description. */
const titleOf = (node: NodeData, role: Role): string => {
    if (role === 'strategy') return node.label.replace(/^estrategia:\s*/i, '');
    if (role === 'objective' && GENERIC_OBJECTIVE.test(node.label.trim()) && node.description) {
        const first = node.description.split(/[.;]\s/)[0].replace(/[.;]$/, '');
        return first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first;
    }
    if (role === 'brand' && node.label === 'Proyecto Marketing') return 'Tu estrategia';
    return node.label;
};

const priorityOf = (node: NodeData): 'principal' | 'secundario' | null => {
    const tag = node.tags?.find((t) => t === 'principal' || t === 'secundario');
    if (tag) return tag as 'principal' | 'secundario';
    const legacy = node.label.trim().match(GENERIC_OBJECTIVE);
    return legacy ? (legacy[1].toLowerCase() as 'principal' | 'secundario') : null;
};

/**
 * /01b_definir_estrategia writes the tree without positions (all at 0,0): lay it out as columns
 * (marca → objetivos → estrategias → conceptos), each parent centred on its children.
 */
const needsLayout = (nodes: NodeData[]) => nodes.length > 1 && nodes.every((n) => !n.x && !n.y);

const layoutTree = (nodes: NodeData[]): NodeData[] => {
    const kids = new Map<string | null, NodeData[]>();
    nodes.forEach((n) => kids.set(n.parentId, [...(kids.get(n.parentId) ?? []), n]));
    const rank = (n: NodeData) => (n.tags?.includes('principal') ? 0 : 1);
    const pos = new Map<string, { x: number; y: number }>();
    let slot = 0;
    const place = (n: NodeData, depth: number): number => {
        const children = [...(kids.get(n.id) ?? [])].sort((a, b) => rank(a) - rank(b));
        let y: number;
        if (children.length === 0) { y = slot * 110; slot += 1; }
        else { const ys = children.map((c) => place(c, depth + 1)); y = (ys[0] + ys[ys.length - 1]) / 2; slot += 0.5; }
        pos.set(n.id, { x: depth * 360, y });
        return y;
    };
    (kids.get(null) ?? []).forEach((root) => place(root, 0));
    return nodes.map((n) => ({ ...n, ...(pos.get(n.id) ?? {}) }));
};

const ConceptMeta: React.FC<{ node: NodeData }> = ({ node }) => (
    <div className="flex flex-wrap items-center gap-1.5">
        {node.suggested_format && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">{FORMAT_ES[node.suggested_format] ?? node.suggested_format}</span>
        )}
        {node.suggested_frequency && FREQ_ES[node.suggested_frequency] && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary-50 text-primary-700">{FREQ_ES[node.suggested_frequency]}</span>
        )}
    </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</h4>
        {children}
    </section>
);

const Bullets: React.FC<{ items?: string[] }> = ({ items }) => (
    <ul className="space-y-1.5">
        {(items || []).map((it, i) => <li key={i} className="text-sm text-gray-700 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary-400">{it}</li>)}
    </ul>
);

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

    // Detail panel: the node whose full content is open on the right
    const [detailId, setDetailId] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    // Only save after a real edit: loading the page must never rewrite the stored tree
    const dirty = useRef(false);
    const clickStart = useRef<{ id: string; x: number; y: number } | null>(null);

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

    // The canvas scales from its top-left corner, so screen = point * scale + pan
    const zoomBy = (delta: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const next = Math.min(2, Math.max(0.3, Math.round((scale + delta) * 10) / 10));
        if (!rect) return setScale(next);
        const cx = rect.width / 2, cy = rect.height / 2;
        setPan({ x: cx - ((cx - pan.x) * next) / scale, y: cy - ((cy - pan.y) * next) / scale });
        setScale(next);
    };
    const zoomIn = () => zoomBy(0.1);
    const zoomOut = () => zoomBy(-0.1);

    const canvasRef = useRef<HTMLDivElement>(null);
    const hasFitted = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const panStartOffset = useRef({ x: 0, y: 0 });

    const CLIENT_ID = overrideClientId || localStorage.getItem('clientId');

    // Fetch Client Name
    useEffect(() => {
        const fetchClientInfo = async () => {
            if (!CLIENT_ID) return;
            try {
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
        if (nodes.length === 0 || !dirty.current) return;

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
                    const loaded = strategyData as any as NodeData[];
                    setNodes(needsLayout(loaded) ? layoutTree(loaded) : loaded);
                }
                setLoaded(true);
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
        dirty.current = true;
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
        dirty.current = true;
        if (detailId && nodesToDelete.has(detailId)) setDetailId(null);
        setNodes(prev => prev.filter(n => !nodesToDelete.has(n.id)));
        setSelectedNodeIds(new Set());
    }, [nodes, selectedNodeIds, detailId]);

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
        clickStart.current = e.shiftKey ? null : { id, x: e.clientX, y: e.clientY };
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
            if (Math.abs(dx) + Math.abs(dy) > 3) dirty.current = true;
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

    const handleMouseUp = useCallback((e: MouseEvent) => {
        // A press that barely moved is a click, not a drag: open that node's detail
        const start = clickStart.current;
        clickStart.current = null;
        if (start && Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) < 5) setDetailId(start.id);
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
            if (e.key === 'Escape') setDetailId(null);
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
        dirty.current = true;
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
        dirty.current = true;
        setNodes(prev => [...prev, newNode]);
        setDetailId(newNode.id);
    };

    /** Frame the whole tree in the visible canvas (cards are ~280×90, centred on their point). */
    const fitToView = useCallback(() => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0 || nodes.length === 0) return;
        const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
        const minX = Math.min(...xs) - 150, maxX = Math.max(...xs) + 150;
        const minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 60;
        const padTop = 90, padBottom = 100, padX = 40; // room for the toggle and the toolbar
        const s = Math.min(1, Math.max(0.3, Math.min((rect.width - 2 * padX) / (maxX - minX), (rect.height - padTop - padBottom) / (maxY - minY))));
        setScale(s);
        setPan({
            x: rect.width / 2 - ((minX + maxX) / 2) * s,
            y: padTop + (rect.height - padTop - padBottom) / 2 - ((minY + maxY) / 2) * s,
        });
    }, [nodes]);

    useEffect(() => {
        if (!hasFitted.current && nodes.length > 0) {
            hasFitted.current = true;
            requestAnimationFrame(fitToView);
        }
    }, [nodes, fitToView]);

    const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n] as [string, NodeData])), [nodes]);
    const childrenOf = (id: string) => nodes.filter((n) => n.parentId === id);

    const getPath = (source: NodeData, target: NodeData) => {
        const midX = (source.x + target.x) / 2;
        return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
    };

    const renderMapNode = (node: NodeData) => {
        const isEditing = editingNodeId === node.id;
        const isSelected = selectedNodeIds.has(node.id) || detailId === node.id;
        const role = roleOf(node, byId);
        const priority = role === 'objective' ? priorityOf(node) : null;
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
        const typeLabel = role === 'brand' ? 'MARCA' : role === 'objective' ? (priority ? `OBJETIVO ${priority.toUpperCase()}` : 'OBJETIVO') : role === 'strategy' ? 'ESTRATEGIA' : 'CONCEPTO';

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
                                    {FORMAT_ES[node.suggested_format] ?? node.suggested_format}
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
                                    className={`font-bold leading-tight line-clamp-2 ${isMain ? 'text-lg' : 'text-sm'}`}
                                    title="Clic: ver detalle · Doble clic: renombrar"
                                >
                                    {titleOf(node, role)}
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

    const openDetail = (id: string) => setDetailId(id);

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

        const objectives = nodes.filter(n => roleOf(n, byId) === 'objective');
        const strategies = nodes.filter(n => roleOf(n, byId) === 'strategy');
        const concepts = nodes.filter(n => roleOf(n, byId) === 'concept');
        const steps = [
            { icon: Target, n: objectives.length, name: 'Objetivos', text: 'Qué quiere lograr el negocio.' },
            { icon: TrendingUp, n: strategies.length, name: 'Estrategias', text: 'Cómo lo vamos a lograr.' },
            { icon: Lightbulb, n: concepts.length, name: 'Conceptos', text: 'Qué tipo de contenido publicamos. El plan del mes los convierte en piezas.' },
        ];

        return (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-16 space-y-8">
                    {/* How to read it */}
                    <section aria-label="Cómo leer tu estrategia">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-600 mb-3">Cómo leer tu estrategia</p>
                        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {steps.map((st, i) => (
                                <li key={st.name} className="relative bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0"><st.icon size={18} /></div>
                                    <div>
                                        <p className="font-bold text-gray-900">{i + 1}. {st.name} <span className="text-gray-400 font-semibold">· {st.n}</span></p>
                                        <p className="text-sm text-gray-500 leading-snug">{st.text}</p>
                                    </div>
                                    {i < 2 && <ArrowRight size={16} className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 text-gray-300 bg-brand-bg rounded-full" />}
                                </li>
                            ))}
                        </ol>
                    </section>

                    {mainNodes.map(main => {
                        const objs = childrenOf(main.id).sort((a, b) => (priorityOf(a) === 'principal' ? -1 : 0) - (priorityOf(b) === 'principal' ? -1 : 0));
                        return (
                            <div key={main.id} className="space-y-6">
                                {objs.map((objective, objIdx) => {
                                    const priority = priorityOf(objective);
                                    const why = descriptionOf(objective);
                                    return (
                                        <article key={objective.id} className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${priority === 'principal' ? 'border-primary-200' : 'border-gray-100'}`}>
                                            {/* 1. The objective */}
                                            <button onClick={() => openDetail(objective.id)} className="w-full text-left p-6 hover:bg-gray-50/60 transition-colors">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${priority === 'principal' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                        {priority === 'principal' ? 'Objetivo principal' : priority === 'secundario' ? 'Objetivo secundario' : `Objetivo ${objIdx + 1}`}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{titleOf(objective, 'objective')}</h3>
                                                {why && <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3"><span className="font-semibold text-gray-800">Por qué: </span>{why}</p>}
                                            </button>

                                            {/* 2. The strategies, 3. their concepts */}
                                            <div className="border-t border-gray-100 bg-gray-50/50 p-4 md:p-6 space-y-5">
                                                {childrenOf(objective.id).length === 0 && <p className="text-sm text-gray-400">Todavía sin estrategias para este objetivo.</p>}
                                                {childrenOf(objective.id).map((strategy) => {
                                                    const how = descriptionOf(strategy);
                                                    const kids = childrenOf(strategy.id);
                                                    return (
                                                        <div key={strategy.id}>
                                                            <button onClick={() => openDetail(strategy.id)} className="flex items-start gap-3 text-left w-full group">
                                                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5"><TrendingUp size={15} /></div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Cómo: estrategia</p>
                                                                    <p className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{titleOf(strategy, 'strategy')}</p>
                                                                    {how && <p className="text-sm text-gray-500 leading-snug">{how}</p>}
                                                                </div>
                                                            </button>
                                                            <div className="mt-3 md:pl-11 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {kids.map((concept) => (
                                                                    <button
                                                                        key={concept.id}
                                                                        onClick={() => openDetail(concept.id)}
                                                                        className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary-300 hover:shadow-sm transition-all flex flex-col gap-2"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Lightbulb size={14} className="text-primary-500 shrink-0" />
                                                                            <p className="font-semibold text-gray-900 leading-snug">{concept.label}</p>
                                                                        </div>
                                                                        {concept.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{concept.description}</p>}
                                                                        <div className="mt-auto flex items-center justify-between gap-2">
                                                                            <ConceptMeta node={concept} />
                                                                            <span className="text-[11px] font-semibold text-primary-600 shrink-0">Ver detalle</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                                {kids.length < MAX_POSTS_PER_SECONDARY && (
                                                                    <button
                                                                        onClick={() => addChildNode(strategy.id)}
                                                                        className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-600 transition-colors text-xs font-bold min-h-[88px]"
                                                                    >
                                                                        <Plus size={16} /> Agregar concepto
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- Detail panel: everything a node holds, in plain words ---
    const renderDetailPanel = () => {
        const node = detailId ? byId.get(detailId) : undefined;
        if (!node) return null;
        const role = roleOf(node, byId);
        const ancestors: NodeData[] = [];
        for (let p = node.parentId ? byId.get(node.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) ancestors.unshift(p);
        const kids = childrenOf(node.id);
        const priority = role === 'objective' ? priorityOf(node) : null;
        const g = node.execution_guidelines || {};
        const hooks = (node.creative_hooks || []).filter(Boolean);
        const kidsName = role === 'brand' ? 'Objetivos' : role === 'objective' ? 'Estrategias' : 'Conceptos de contenido';

        return (
            <aside
                className="absolute top-0 right-0 h-full w-full sm:w-[400px] bg-white border-l border-gray-200 shadow-2xl z-[60] flex flex-col animate-fade-in-up"
                aria-label="Detalle del nodo"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
                    <div className="min-w-0">
                        {ancestors.length > 0 && (
                            <nav className="flex flex-wrap items-center gap-1 text-xs text-gray-400 mb-2" aria-label="Ubicación en la estrategia">
                                {ancestors.map((a, i) => (
                                    <React.Fragment key={a.id}>
                                        {i > 0 && <span>›</span>}
                                        <button onClick={() => setDetailId(a.id)} className="hover:text-primary-600 truncate max-w-[150px]">{titleOf(a, roleOf(a, byId))}</button>
                                    </React.Fragment>
                                ))}
                            </nav>
                        )}
                        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-600">
                            {ROLE_INFO[role].name}{priority ? ` ${priority}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{ROLE_INFO[role].explain}</p>
                    </div>
                    <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 shrink-0" aria-label="Cerrar detalle">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                    <div className="space-y-2">
                        <input
                            value={role === 'objective' && GENERIC_OBJECTIVE.test(node.label.trim()) ? titleOf(node, role) : node.label}
                            onChange={(e) => updateNodeData(node.id, 'label', e.target.value)}
                            className="w-full text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-primary-400 outline-none pb-1"
                            aria-label="Nombre"
                        />
                        {role === 'concept' && <ConceptMeta node={node} />}
                    </div>

                    {role !== 'brand' && (
                        <Section title={role === 'concept' ? 'Qué es' : 'Por qué'}>
                            <textarea
                                value={descriptionOf(node)}
                                onChange={(e) => updateNodeData(node.id, 'description', e.target.value)}
                                rows={4}
                                placeholder={role === 'concept' ? 'Describe este tipo de contenido…' : 'Explica por qué importa…'}
                                className="w-full text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3 border border-transparent focus:border-primary-300 outline-none resize-y"
                            />
                        </Section>
                    )}

                    {role === 'concept' && node.strategic_rationale && (
                        <Section title="Por qué funciona"><p className="text-sm text-gray-700 leading-relaxed">{node.strategic_rationale}</p></Section>
                    )}
                    {role === 'concept' && hooks.length > 0 && (
                        <Section title="Ganchos para empezar la publicación"><Bullets items={hooks} /></Section>
                    )}
                    {role === 'concept' && g.structure && (
                        <Section title="Cómo armarlo"><p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{g.structure}</p></Section>
                    )}
                    {role === 'concept' && (g.key_elements?.length ?? 0) > 0 && (
                        <Section title="No puede faltar"><Bullets items={g.key_elements} /></Section>
                    )}
                    {role === 'concept' && ((g.dos?.length ?? 0) > 0 || (g.donts?.length ?? 0) > 0) && (
                        <div className="grid grid-cols-1 gap-4">
                            {(g.dos?.length ?? 0) > 0 && <Section title="Hacer"><Bullets items={g.dos} /></Section>}
                            {(g.donts?.length ?? 0) > 0 && <Section title="Evitar"><Bullets items={g.donts} /></Section>}
                        </div>
                    )}
                    {role === 'concept' && !node.strategic_rationale && hooks.length === 0 && !g.structure && (
                        <p className="text-xs text-gray-400 leading-relaxed">Este concepto no tiene guía de ejecución todavía. Se completa al regenerar la estrategia.</p>
                    )}
                    {role === 'concept' && (node.tags?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {node.tags!.map((t) => <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500"><Tag size={10} />{t}</span>)}
                        </div>
                    )}

                    {role !== 'concept' && (
                        <Section title={`${kidsName} · ${kids.length}`}>
                            <ul className="space-y-2">
                                {kids.map((k) => (
                                    <li key={k.id}>
                                        <button onClick={() => setDetailId(k.id)} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/40 transition-colors">
                                            <span className="text-sm font-semibold text-gray-800 leading-snug">{titleOf(k, roleOf(k, byId))}</span>
                                            <ArrowRight size={14} className="text-gray-400 shrink-0" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}
                </div>
            </aside>
        );
    };

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
                        <div className="absolute inset-0 w-full h-full origin-top-left transition-transform duration-75 ease-out will-change-transform pointer-events-none"
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

                {loaded && nodes.length === 0 && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-brand-bg px-6">
                        <div className="text-center max-w-md">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center"><Target size={26} /></div>
                            <h2 className="text-xl font-bold text-gray-900">Tu estrategia está en preparación</h2>
                            <p className="mt-2 text-sm text-gray-500 leading-relaxed">El equipo de Pixely la arma con tu Ficha y el estudio de tu mercado. Cuando esté lista, aparecerá aquí para que la revises y la apruebes.</p>
                        </div>
                    </div>
                )}

                {renderDetailPanel()}

                {viewMode === 'map' && !detailId && (
                    <p className="hidden md:block absolute bottom-4 left-4 z-30 text-xs text-gray-400 bg-white/90 px-3 py-1 rounded-full pointer-events-none">
                        Clic en un nodo: ver detalle · Doble clic: renombrar · Arrastrar: mover
                    </p>
                )}

                {/* BOTTOM TOOLBAR */}
                {viewMode === 'map' && nodes.length > 0 && (
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
                                <button onClick={fitToView} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all" title="Encuadrar todo el mapa"><Network size={18} /></button>
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