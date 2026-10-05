import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronLeft, ChevronRight, Search, CalendarX } from 'lucide-react';
import { awaitsPlan, canReviewPlan, planEstado, useApprovePending } from '@/lib/content';
import { monthName, parseDay, weekRow, weekdayShort } from '@/lib/dates';
import { mainBranch, useStrategyIndex } from '@/lib/strategy';
import type { ContentPiece, Formato, Pilar } from '@/lib/types';
import { Button, Card, EmptyState, ErrorState, Loading, Screen, Section, Segmented, Sheet, StatusChip } from '@/ui';
import { usePlanMonth } from './usePlanMonth';

const FORMATOS: { key: Formato; one: string; many: string }[] = [
  { key: 'Imagen', one: 'Imagen', many: 'Imágenes' },
  { key: 'Carrusel', one: 'Carrusel', many: 'Carruseles' },
  { key: 'Estado', one: 'Estado', many: 'Estados' },
  { key: 'Reel', one: 'Reel', many: 'Reels' },
];
const PILARES: { key: Pilar; hint: string }[] = [
  { key: 'Problema', hint: 'lo que le duele a tu cliente' },
  { key: 'Prueba', hint: 'lo que lo demuestra' },
  { key: 'Identidad', hint: 'quiénes son ustedes' },
];

type Tone = 'ok' | 'cambios' | 'pend';
function tone(p: ContentPiece): Tone {
  const e = planEstado(p);
  return e === 'Aprobada' ? 'ok' : e === 'Cambios solicitados' ? 'cambios' : 'pend';
}

const MonthSwitch: React.FC<{ month: string; go: (d: number) => void }> = ({ month, go }) => (
  <div className="flex items-center gap-0.5 bg-card border border-edge rounded-[14px] p-0.5">
    <button type="button" aria-label="Mes anterior" onClick={() => go(-1)} className="w-10 h-10 flex items-center justify-center text-text-2"><ChevronLeft size={18} strokeWidth={2.5} /></button>
    <span className="text-sm font-extrabold min-w-[84px] text-center">{monthName(month)}</span>
    <button type="button" aria-label="Mes siguiente" onClick={() => go(1)} className="w-10 h-10 flex items-center justify-center text-text-2"><ChevronRight size={18} strokeWidth={2.5} /></button>
  </div>
);

function useFrame() {
  const plan = usePlanMonth();
  const views = [{ to: `/plan${plan.search}`, label: 'Ideas' }, { to: `/plan/mezcla${plan.search}`, label: 'Mezcla' }];
  return { plan, views, action: <MonthSwitch month={plan.month} go={plan.go} /> };
}

const NoPlan: React.FC<{ month: string }> = ({ month }) => (
  <EmptyState icon={<CalendarX size={26} />} title={`Sin plan para ${monthName(month).toLowerCase()}`} text="Cuando el equipo arme las ideas de este mes, aparecerán aquí para que las apruebes." />
);

// ---------------------------------------------------------------- Ideas

export const PlanScreen: React.FC = () => {
  const { plan, views, action } = useFrame();
  const approveAll = useApprovePending();
  const [confirm, setConfirm] = useState(false);
  const { pieces, month } = plan;

  const counts = useMemo(() => ({
    ok: pieces.filter((p) => tone(p) === 'ok').length,
    cambios: pieces.filter((p) => tone(p) === 'cambios').length,
    pend: pieces.filter((p) => tone(p) === 'pend').length,
    waiting: pieces.filter(awaitsPlan).length,
  }), [pieces]);

  const weeks = useMemo(() => {
    const rows = new Map<number, ContentPiece[]>();
    pieces.forEach((p) => { const r = weekRow(p.fecha); rows.set(r, [...(rows.get(r) ?? []), p]); });
    return [...rows.entries()].sort((a, b) => a[0] - b[0]);
  }, [pieces]);

  if (plan.isLoading) return <Screen title="Plan" action={action}><Loading /></Screen>;
  if (plan.error) return <Screen title="Plan" action={action}><ErrorState message={plan.error.message} onRetry={() => plan.refetch()} /></Screen>;

  const doApproveAll = async () => {
    await approveAll.mutateAsync(month);
    setConfirm(false);
  };

  return (
    <Screen title="Plan" action={action}>
      <Segmented label="Vista del plan" items={views} />
      {pieces.length === 0 ? <NoPlan month={month} /> : (
        <>
          <Card className="flex flex-col gap-3.5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="m-0 font-display font-bold text-[34px] leading-none">{counts.ok}<span className="text-text-3 text-xl">/{pieces.length}</span></p>
                <p className="m-0 mt-1.5 text-[13px] text-text-2">ideas aprobadas</p>
              </div>
              <div className="text-right">
                {counts.waiting > 0
                  ? <><p className="m-0 text-[13px] font-extrabold text-pink-text">Te faltan {counts.waiting}</p><p className="m-0 mt-0.5 text-xs text-text-3">Con tu visto bueno las producimos</p></>
                  : <p className="m-0 text-[13px] font-extrabold">Nada pendiente</p>}
              </div>
            </div>
            <div className="flex gap-[3px]" aria-hidden>
              {pieces.map((p) => <span key={p.id} className={`flex-1 h-2 rounded-[3px] box-border ${tone(p) === 'ok' ? 'bg-pink' : tone(p) === 'cambios' ? 'border-[1.5px] border-pink-text' : 'bg-mute'}`} />)}
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-text-2">
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-pink" />Aprobadas {counts.ok}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] border-[1.5px] border-pink-text box-border" />Cambios {counts.cambios}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-[2px] bg-mute" />Pendientes {counts.pend}</span>
            </div>
            <div className="border-t border-edge pt-3 grid grid-cols-4 gap-1.5 text-center">
              {FORMATOS.map(({ key, one, many }) => {
                const n = pieces.filter((p) => p.formato === key).length;
                return <div key={key}><p className="m-0 font-display font-bold text-lg">{n}</p><p className="m-0 text-[11px] font-bold text-text-3">{n === 1 ? one : many}</p></div>;
              })}
            </div>
          </Card>

          <MonthCalendar month={month} pieces={pieces} />

          <div className="flex flex-col gap-4 mt-2">
            {weeks.map(([row, list]) => (
              <Section key={row} title={weekTitle(month, row)}>
                {list.map((p) => <IdeaRow key={p.id} piece={p} search={plan.search} />)}
              </Section>
            ))}
          </div>
        </>
      )}

      {counts.waiting > 0 && <div aria-hidden className="h-16" />}
      {counts.waiting > 0 && (
        <div className="fixed inset-x-0 lg:left-[260px] bottom-[96px] lg:bottom-8 z-30 px-5 flex justify-center pointer-events-none">
          <div className="w-full max-w-[440px] pointer-events-auto">
            <Button block icon={<Check size={18} strokeWidth={3} />} onClick={() => setConfirm(true)}>
              Aprobar {counts.waiting === 1 ? 'la pendiente' : `las ${counts.waiting} pendientes`}
            </Button>
          </div>
        </div>
      )}

      <Sheet open={confirm} title={`¿Apruebas ${counts.waiting === 1 ? 'esta idea' : `estas ${counts.waiting} ideas`}?`} onClose={() => setConfirm(false)}>
        <p className="m-0 text-[15px] leading-relaxed text-text-2">Empezaremos a producirlas. Las piezas terminadas te llegan a Validar para que las revises antes de publicar.</p>
        <ul className="m-0 p-0 list-none flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
          {pieces.filter(awaitsPlan).map((p) => (
            <li key={p.id} className="flex gap-3 items-baseline text-sm"><span className="w-12 shrink-0 text-xs font-extrabold text-text-3">{weekdayShort(p.fecha)} {parseDay(p.fecha).getDate()}</span><span className="font-bold">{p.topico_angulo ?? 'Idea sin título'}</span></li>
          ))}
        </ul>
        {approveAll.error && <p role="alert" className="m-0 text-[13px] font-semibold text-pink-text">{approveAll.error.message}</p>}
        <Button block loading={approveAll.isPending} icon={<Check size={18} strokeWidth={3} />} onClick={doApproveAll}>Sí, aprobarlas</Button>
        <Button block variant="ghost" onClick={() => setConfirm(false)}>Todavía no</Button>
      </Sheet>
    </Screen>
  );
};

function weekTitle(month: string, row: number): string {
  const first = parseDay(`${month}-01`);
  const offset = (first.getDay() + 6) % 7;
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const start = Math.max(1, row * 7 - offset + 1);
  const end = Math.min(last, row * 7 - offset + 7);
  const mon = first.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  return `Semana ${row + 1} · ${start} – ${end} ${mon}`;
}

const IdeaRow: React.FC<{ piece: ContentPiece; search: string }> = ({ piece, search }) => {
  const t = tone(piece);
  const inProduction = t === 'ok' && !canReviewPlan(piece);
  return (
    <Link id={`idea-${piece.id}`} to={`/plan/${piece.id}${search}`} className="bg-card border border-edge rounded-[20px] p-3 flex gap-3 text-white no-underline scroll-mt-24 active:bg-raised transition">
      <span className="w-12 h-14 rounded-[14px] bg-raised flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] font-extrabold text-text-3">{weekdayShort(piece.fecha)}</span>
        <span className="font-display font-bold text-lg">{parseDay(piece.fecha).getDate()}</span>
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-1.5">
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-text-3 truncate">{[piece.formato, piece.pilar].filter(Boolean).join(' · ')}</span>
          {t === 'ok' ? <StatusChip status={inProduction ? 'produccion' : 'aprobada'} label={inProduction ? 'En producción' : undefined} /> : t === 'cambios' ? <StatusChip status="cambios" /> : <StatusChip status="te-toca" />}
        </span>
        <span className="text-[15px] font-extrabold leading-snug">{piece.topico_angulo ?? 'Idea sin título'}</span>
        {(piece.objetivo || piece.marcador === 'I') && (
          <span className="flex flex-wrap items-center gap-1.5">
            {piece.objetivo && <span className="text-[11px] font-bold text-text-2 bg-raised rounded-lg px-2 py-[3px] max-w-full truncate">{piece.objetivo}</span>}
            {piece.marcador === 'I' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-text"><Search size={12} strokeWidth={2.5} />Con dato de mercado</span>}
          </span>
        )}
        {t === 'cambios' && piece.plan_comentario && (
          <span className="block bg-ink rounded-xl p-2.5 text-[13px] leading-snug text-text-2">
            <strong className="text-white">Tu comentario:</strong> {piece.plan_comentario}
            <span className="block mt-1.5 text-xs font-bold text-pink-text">El equipo la está ajustando</span>
          </span>
        )}
      </span>
    </Link>
  );
};

const MonthCalendar: React.FC<{ month: string; pieces: ContentPiece[] }> = ({ month, pieces }) => {
  const first = parseDay(`${month}-01`);
  const offset = (first.getDay() + 6) % 7;
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const byDay = new Map<number, ContentPiece[]>();
  pieces.forEach((p) => { const d = parseDay(p.fecha).getDate(); byDay.set(d, [...(byDay.get(d) ?? []), p]); });
  const order: Tone[] = ['pend', 'cambios', 'ok'];
  const style: Record<Tone, string> = { ok: 'bg-pink text-ink', cambios: 'border-[1.5px] border-pink-text text-pink-text', pend: 'bg-mute text-white' };
  const jump = (p: ContentPiece) => document.getElementById(`idea-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <Card className="flex flex-col gap-2.5 !p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="eyebrow m-0">Tu mes</h2>
        <span className="text-xs text-text-3">Toca un día para ver su idea</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-text-3" aria-hidden>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: last }, (_, i) => {
          const day = i + 1;
          const list = byDay.get(day);
          if (!list) return <span key={day} className="h-[38px] flex items-center justify-center text-[13px] font-semibold text-[#5A5A66]">{day}</span>;
          const t = order.find((o) => list.some((p) => tone(p) === o))!;
          return (
            <button key={day} type="button" onClick={() => jump(list[0])} aria-label={`${day}: ${list.map((p) => p.topico_angulo).join(', ')}`}
              className={`h-[38px] rounded-[12px] flex items-center justify-center text-[13px] font-extrabold box-border ${style[t]}`}>{day}</button>
          );
        })}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------- Mezcla

const Bar: React.FC<{ n: number; max: number; h?: number; soft?: boolean }> = ({ n, max, h = 10, soft }) => (
  <div className="rounded-full bg-ink" style={{ height: h }}>
    <div className={`rounded-full ${soft ? 'bg-pink-text' : 'bg-pink'}`} style={{ height: h, width: `${max ? Math.max(4, Math.round((n / max) * 100)) : 0}%` }} />
  </div>
);

export const PlanMezclaScreen: React.FC = () => {
  const { plan, views, action } = useFrame();
  const { data: index } = useStrategyIndex();
  const { pieces, month } = plan;
  const total = pieces.length;

  const tree = useMemo(() => {
    const objectives = new Map<string, { label: string; principal: boolean; n: number; strategies: Map<string, { label: string; n: number; concepts: Map<string, { label: string; n: number }> }> }>();
    let other = 0;
    pieces.forEach((p) => {
      const b = mainBranch(p, index);
      const o = b.objectiveId ? index?.objectiveById.get(b.objectiveId) : undefined;
      const s = b.strategyId ? index?.strategies.get(b.strategyId) : undefined;
      const c = b.conceptId ? index?.concepts.get(b.conceptId) : undefined;
      if (!o || !s || !c) { other += 1; return; }
      const ob = objectives.get(o.id) ?? { label: o.label, principal: o.principal, n: 0, strategies: new Map() };
      ob.n += 1;
      const st = ob.strategies.get(s.id) ?? { label: s.label, n: 0, concepts: new Map() };
      st.n += 1;
      const co = st.concepts.get(c.id) ?? { label: c.label, n: 0 };
      co.n += 1;
      st.concepts.set(c.id, co); ob.strategies.set(s.id, st); objectives.set(o.id, ob);
    });
    return { list: [...objectives.values()].sort((a, b) => Number(b.principal) - Number(a.principal) || b.n - a.n), other };
  }, [pieces, index]);

  const weeks = useMemo(() => {
    const rows = new Map<number, number>();
    pieces.forEach((p) => rows.set(weekRow(p.fecha), (rows.get(weekRow(p.fecha)) ?? 0) + 1));
    const max = Math.max(1, ...rows.values());
    return { rows: [...rows.entries()].sort((a, b) => a[0] - b[0]), max };
  }, [pieces]);

  if (plan.isLoading) return <Screen title="Plan" action={action}><Loading /></Screen>;
  if (plan.error) return <Screen title="Plan" action={action}><ErrorState message={plan.error.message} onRetry={() => plan.refetch()} /></Screen>;

  const withData = pieces.filter((p) => p.marcador === 'I').length;
  const pilarMax = Math.max(1, ...PILARES.map(({ key }) => pieces.filter((p) => p.pilar === key).length));

  return (
    <Screen title="Plan" action={action}>
      <Segmented label="Vista del plan" items={views} />
      {total === 0 ? <NoPlan month={month} /> : (
        <>
          <section className="flex flex-col gap-2.5 px-0.5 pt-1 pb-1.5">
            <h2 className="m-0 font-display font-bold text-[30px] leading-[1.05]">{total} {total === 1 ? 'pieza' : 'piezas'}<br /><span className="text-text-3">en {monthName(month).toLowerCase()}</span></h2>
            <div className="flex gap-[3px] mt-1" aria-hidden>
              {withData > 0 && <span className="h-2.5 rounded-[4px] bg-pink" style={{ flex: withData }} />}
              {total - withData > 0 && <span className="h-2.5 rounded-[4px] bg-mute" style={{ flex: total - withData }} />}
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="inline-flex items-center gap-1.5"><Search size={14} strokeWidth={2.5} className="text-pink-text" /><strong>{withData}</strong> con dato de mercado</span>
              <span className="text-text-2"><strong className="text-white">{total - withData}</strong> creativas</span>
            </div>
          </section>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="eyebrow m-0">Ruta estratégica</h2>
              <p className="m-0 mt-1.5 text-[13px] leading-snug text-text-2">De tus objetivos a las ideas: cuántas piezas trabaja cada uno.</p>
            </div>
            {tree.list.map((o) => (
              <div key={o.label} className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline gap-2.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-pink-text">{o.principal ? 'Objetivo principal' : 'Objetivo'}</span>
                    <span className="font-display font-bold">{o.n}</span>
                  </div>
                  <p className="m-0 text-[15px] font-extrabold leading-snug">{o.label}</p>
                  <Bar n={o.n} max={total} />
                </div>
                <div className="flex flex-col gap-3 pl-3.5 ml-1 border-l-2 border-edge">
                  {[...o.strategies.values()].sort((a, b) => b.n - a.n).map((s) => (
                    <div key={s.label} className="flex flex-col gap-1.5">
                      <div className="flex justify-between gap-2.5 text-[13px]"><span className="font-bold text-text-soft leading-snug">{s.label}</span><span className="font-extrabold">{s.n}</span></div>
                      <Bar n={s.n} max={total} h={6} soft />
                      <div className="flex flex-wrap gap-1.5">
                        {[...s.concepts.values()].sort((a, b) => b.n - a.n).map((c) => (
                          <span key={c.label} className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-full bg-raised text-xs font-bold text-text-2">{c.label}<span className="min-w-5 h-5 px-1 rounded-full bg-line text-white text-[11px] font-extrabold flex items-center justify-center">{c.n}</span></span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {tree.other > 0 && <p className="m-0 text-xs text-text-3">{tree.other} {tree.other === 1 ? 'pieza no está' : 'piezas no están'} enlazadas a la estrategia actual.</p>}
          </Card>

          <Card className="flex flex-col gap-3.5">
            <h2 className="eyebrow m-0">Ritmo por semana</h2>
            <div className="flex items-end gap-2.5 h-[120px]">
              {weeks.rows.map(([row, n]) => (
                <div key={row} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                  <span className="text-[13px] font-extrabold">{n}</span>
                  <div className="w-full rounded-t-[8px] rounded-b-[4px] bg-pink" style={{ height: Math.round((n / weeks.max) * 84) }} />
                  <span className="text-[11px] font-bold text-text-3">S{row + 1}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="flex flex-col gap-3.5">
            <h2 className="eyebrow m-0">Pilares</h2>
            {PILARES.map(({ key, hint }) => {
              const n = pieces.filter((p) => p.pilar === key).length;
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline gap-2.5"><span className="text-sm font-extrabold">{key} <span className="text-xs font-semibold text-text-3">· {hint}</span></span><span className="text-sm font-extrabold">{n}</span></div>
                  <Bar n={n} max={pilarMax} h={8} />
                </div>
              );
            })}
          </Card>

          <Card className="flex flex-col gap-3.5">
            <h2 className="eyebrow m-0">Formatos</h2>
            <div className="grid grid-cols-2 gap-2">
              {FORMATOS.map(({ key, one, many }) => {
                const n = pieces.filter((p) => p.formato === key).length;
                return <div key={key} className="bg-ink rounded-[16px] p-3.5 flex justify-between items-center"><span className="text-[13px] font-bold text-text-2">{n === 1 ? one : many}</span><span className="font-display font-bold text-[22px]">{n}</span></div>;
              })}
            </div>
          </Card>
        </>
      )}
    </Screen>
  );
};
