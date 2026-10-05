/**
 * How a content piece hangs from the Estrategia tree (strategy_nodes):
 * objetivo → estrategia → concepto. A piece names the concepts it combines
 * (content_pieces.concepto_ids, written by /05_planificacion); the objective and
 * strategy are read from the live tree, falling back to the names copied into the
 * piece when the tree no longer has that concept.
 */

import { useEffect, useState } from 'react';
import * as api from '../../services/api';

// Objective identity. Validated all-pairs with the dataviz palette validator (light); kept apart
// from the pilar hues so the two never read as the same thing. Always shown beside a text label.
const OBJECTIVE_COLORS = ['#E4E4EA', '#B4B4BE', '#EB0C6E'];
export const OTHER_COLOR = '#8A8A96';

const GENERIC_OBJECTIVE = /^objetivo (principal|secundario)$/i;

export interface ObjectiveInfo { id: string; label: string; principal: boolean; color: string }
export interface StrategyInfo { id: string; label: string; objectiveId: string }
export interface ConceptInfo { id: string; label: string; strategyId: string }

export interface StrategyIndex {
    objectives: ObjectiveInfo[];
    strategies: Map<string, StrategyInfo>;
    concepts: Map<string, ConceptInfo>;
    objectiveById: Map<string, ObjectiveInfo>;
}

/** Objectives used to be titled just "Objetivo Principal"; their real aim lived in the description. */
function objectiveTitle(node: api.StrategyNode): string {
    if (GENERIC_OBJECTIVE.test(node.label.trim()) && node.description) {
        const first = node.description.split(/[.;]\s/)[0].replace(/[.;]$/, '');
        return first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first;
    }
    return node.label;
}

function isPrincipal(node: api.StrategyNode): boolean {
    return !!node.tags?.includes('principal') || /^objetivo principal$/i.test(node.label.trim());
}

export function buildStrategyIndex(nodes: api.StrategyNode[]): StrategyIndex {
    const byId = new Map(nodes.map((n) => [n.id, n] as [string, api.StrategyNode]));
    const isTop = (n: api.StrategyNode) => {
        const parent = n.parentId ? byId.get(n.parentId) : undefined;
        return !parent || parent.type === 'main';
    };
    const objectiveNodes = nodes
        .filter((n) => n.type !== 'main' && n.type !== 'concept' && n.type !== 'post' && isTop(n))
        .sort((a, b) => Number(isPrincipal(b)) - Number(isPrincipal(a)) || a.id.localeCompare(b.id));
    const objectives = objectiveNodes.map((n, i) => ({
        id: n.id,
        label: objectiveTitle(n),
        principal: isPrincipal(n),
        color: OBJECTIVE_COLORS[i] ?? OTHER_COLOR,
    }));
    const objectiveById = new Map(objectives.map((o) => [o.id, o] as [string, ObjectiveInfo]));

    const strategies = new Map<string, StrategyInfo>();
    nodes.forEach((n) => {
        if (n.type === 'concept' || n.type === 'post' || n.type === 'main') return;
        if (n.parentId && objectiveById.has(n.parentId)) {
            strategies.set(n.id, { id: n.id, label: n.label.replace(/^estrategia:\s*/i, ''), objectiveId: n.parentId });
        }
    });
    const concepts = new Map<string, ConceptInfo>();
    nodes.forEach((n) => {
        if ((n.type === 'concept' || n.type === 'post') && n.parentId && strategies.has(n.parentId)) {
            concepts.set(n.id, { id: n.id, label: n.label, strategyId: n.parentId });
        }
    });
    return { objectives, strategies, concepts, objectiveById };
}

/** The concept ids a piece combines, main one first. */
export function pieceConceptIds(piece: api.ContentPiece): string[] {
    const ids = piece.concepto_ids?.length ? piece.concepto_ids : piece.concepto_id ? [piece.concepto_id] : [];
    return [...new Set(ids)];
}

export interface PieceLink {
    objective: { label: string; principal: boolean; color: string };
    strategy: string | null;
    concepts: string[];
}

/** Groups the concepts a piece combines under their strategy and objective, main concept's branch first. */
export function pieceLinks(piece: api.ContentPiece, index: StrategyIndex | null): PieceLink[] {
    const links: PieceLink[] = [];
    const byKey = new Map<string, PieceLink>();
    pieceConceptIds(piece).forEach((id) => {
        const concept = index?.concepts.get(id);
        const strategy = concept ? index!.strategies.get(concept.strategyId) : undefined;
        const objective = strategy ? index!.objectiveById.get(strategy.objectiveId) : undefined;
        if (!concept || !strategy || !objective) return;
        const key = strategy.id;
        let link = byKey.get(key);
        if (!link) {
            link = { objective: { label: objective.label, principal: objective.principal, color: objective.color }, strategy: strategy.label, concepts: [] };
            byKey.set(key, link);
            links.push(link);
        }
        link.concepts.push(concept.label);
    });
    // The tree changed since the plan was made: show the names copied into the piece.
    if (links.length === 0 && (piece.objetivo || piece.concepto)) {
        links.push({
            objective: { label: piece.objetivo || 'Objetivo sin nombre', principal: false, color: OTHER_COLOR },
            strategy: null,
            concepts: piece.concepto ? [piece.concepto] : [],
        });
    }
    return links;
}

// One request per client, shared by every view and modal that needs the tree.
const cache = new Map<string, Promise<api.StrategyNode[]>>();

export function useStrategyIndex(clientId: string | null | undefined): StrategyIndex | null {
    const [index, setIndex] = useState<StrategyIndex | null>(null);
    useEffect(() => {
        if (!clientId) return;
        let cancelled = false;
        let request = cache.get(clientId);
        if (!request) {
            request = api.getStrategy(clientId).catch(() => {
                cache.delete(clientId);
                return [] as api.StrategyNode[];
            });
            cache.set(clientId, request);
        }
        request.then((nodes) => { if (!cancelled) setIndex(buildStrategyIndex(nodes)); });
        return () => { cancelled = true; };
    }, [clientId]);
    return index;
}
