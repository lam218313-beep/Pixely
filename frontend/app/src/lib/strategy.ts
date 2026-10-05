/**
 * How a piece hangs from the Estrategia tree (objetivo → estrategia → concepto).
 * Same rules as Partners de escritorio (frontend/layout/components/content/strategyLinks.ts).
 */
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useClientId } from './auth';
import type { ContentPiece, StrategyNode } from './types';

export interface Objective { id: string; label: string; principal: boolean }
export interface StrategyInfo { id: string; label: string; objectiveId: string }
export interface ConceptInfo { id: string; label: string; strategyId: string }
export interface StrategyIndex {
  objectives: Objective[];
  strategies: Map<string, StrategyInfo>;
  concepts: Map<string, ConceptInfo>;
  objectiveById: Map<string, Objective>;
}

const GENERIC = /^objetivo (principal|secundario)$/i;

function objectiveTitle(n: StrategyNode): string {
  if (GENERIC.test(n.label.trim()) && n.description) {
    const first = n.description.split(/[.;]\s/)[0].replace(/[.;]$/, '');
    return first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first;
  }
  return n.label;
}

const isPrincipal = (n: StrategyNode) => !!n.tags?.includes('principal') || /^objetivo principal$/i.test(n.label.trim());

export function buildStrategyIndex(nodes: StrategyNode[]): StrategyIndex {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const isTop = (n: StrategyNode) => {
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    return !parent || parent.type === 'main';
  };
  const objectives = nodes
    .filter((n) => n.type !== 'main' && n.type !== 'concept' && n.type !== 'post' && isTop(n))
    .sort((a, b) => Number(isPrincipal(b)) - Number(isPrincipal(a)) || a.id.localeCompare(b.id))
    .map((n) => ({ id: n.id, label: objectiveTitle(n), principal: isPrincipal(n) }));
  const objectiveById = new Map(objectives.map((o) => [o.id, o]));
  const strategies = new Map<string, StrategyInfo>();
  nodes.forEach((n) => {
    if (['concept', 'post', 'main'].includes(n.type)) return;
    if (n.parentId && objectiveById.has(n.parentId)) strategies.set(n.id, { id: n.id, label: n.label.replace(/^estrategia:\s*/i, ''), objectiveId: n.parentId });
  });
  const concepts = new Map<string, ConceptInfo>();
  nodes.forEach((n) => {
    if ((n.type === 'concept' || n.type === 'post') && n.parentId && strategies.has(n.parentId)) concepts.set(n.id, { id: n.id, label: n.label, strategyId: n.parentId });
  });
  return { objectives, strategies, concepts, objectiveById };
}

export function pieceConceptIds(p: ContentPiece): string[] {
  const ids = p.concepto_ids?.length ? p.concepto_ids : p.concepto_id ? [p.concepto_id] : [];
  return [...new Set(ids)];
}

export interface PieceLink { objective: string; principal: boolean; strategy: string | null; concepts: string[] }

/** The branches a piece serves, main concept first; falls back to the names copied into the piece. */
export function pieceLinks(p: ContentPiece, index: StrategyIndex | undefined): PieceLink[] {
  const links: PieceLink[] = [];
  const byStrategy = new Map<string, PieceLink>();
  pieceConceptIds(p).forEach((id) => {
    const concept = index?.concepts.get(id);
    const strategy = concept ? index!.strategies.get(concept.strategyId) : undefined;
    const objective = strategy ? index!.objectiveById.get(strategy.objectiveId) : undefined;
    if (!concept || !strategy || !objective) return;
    let link = byStrategy.get(strategy.id);
    if (!link) {
      link = { objective: objective.label, principal: objective.principal, strategy: strategy.label, concepts: [] };
      byStrategy.set(strategy.id, link);
      links.push(link);
    }
    link.concepts.push(concept.label);
  });
  if (links.length === 0 && (p.objetivo || p.concepto)) {
    links.push({ objective: p.objetivo || 'Objetivo sin nombre', principal: false, strategy: null, concepts: p.concepto ? [p.concepto] : [] });
  }
  return links;
}

/** Ids of the objective and strategy the main concept belongs to (for the month's mix). */
export function mainBranch(p: ContentPiece, index: StrategyIndex | undefined): { objectiveId: string | null; strategyId: string | null; conceptId: string | null } {
  const conceptId = pieceConceptIds(p)[0] ?? null;
  const concept = conceptId ? index?.concepts.get(conceptId) : undefined;
  const strategy = concept ? index?.strategies.get(concept.strategyId) : undefined;
  return { objectiveId: strategy?.objectiveId ?? null, strategyId: strategy?.id ?? null, conceptId: concept ? conceptId : null };
}

export function useStrategyIndex() {
  const clientId = useClientId();
  return useQuery({
    queryKey: ['strategy', clientId],
    queryFn: () => api.get<StrategyNode[]>(`/strategy/${clientId}`),
    select: buildStrategyIndex,
    staleTime: 10 * 60_000,
  });
}
