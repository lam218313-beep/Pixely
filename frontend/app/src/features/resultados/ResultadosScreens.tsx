import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Bookmark, CalendarX, ChartColumn, ChevronLeft, ChevronRight, Heart, Send, Star, UserPlus } from 'lucide-react';
import { finalAssets, pieceStage, usePieces } from '@/lib/content';
import { formatDay, monthName, monthOf, parseDay, shiftMonth, todayISO, weekdayShort } from '@/lib/dates';
import { fmt, sumMetrics, useResults } from '@/lib/results';
import type { ContentPiece } from '@/lib/types';
import { Card, Dot, EmptyState, ErrorState, Loading, Screen, Section, Segmented, StatusChip } from '@/ui';
import { networksOf } from '../validar/ValidarScreen';

const views = (search = '') => [{ to: '/resultados', label: 'Próximas' }, { to: `/resultados/publicadas${search}`, label: 'Publicadas' }];

// ---------------------------------------------------------------- Próximas

const AGENDA_CHIP: Record<string, React.ReactNode> = {
  programada: <StatusChip status="programada" />,
  aprobada: <StatusChip status="aprobada" label="Aprobada" />,
  revision: <StatusChip status="te-toca" />,
  cambios: <StatusChip status="cambios" />,
  produccion: <StatusChip status="produccion" />,
};

/** What's coming out: today first, then day by day, with the state of each piece. */
export const ProximasScreen: React.FC = () => {
  const { data, isLoading, error, refetch } = usePieces();
  const today = todayISO();
  const upcoming = useMemo(() => (data ?? []).filter((p) => p.fecha.slice(0, 10) >= today && pieceStage(p, today) !== 'publicada'), [data, today]);

  if (isLoading) return <Screen title="Resultados"><Segmented label="Vista de resultados" items={views()} /><Loading /></Screen>;
  if (error) return <Screen title="Resultados"><ErrorState message={error.message} onRetry={() => refetch()} /></Screen>;

  const todays = upcoming.filter((p) => p.fecha.slice(0, 10) === today);
  const later = upcoming.filter((p) => p.fecha.slice(0, 10) !== today).slice(0, 30);
  const thisMonth = upcoming.filter((p) => p.fecha.startsWith(monthOf(today)));
  const scheduled = upcoming.filter((p) => pieceStage(p) === 'programada').length;
  const waiting = upcoming.filter((p) => pieceStage(p) === 'revision').length;

  return (
    <Screen title="Resultados">
      <Segmented label="Vista de resultados" items={views()} />
      {upcoming.length === 0 ? (
        <EmptyState icon={<CalendarX size={26} />} title="Nada programado aún" text="Cuando apruebes piezas, aquí verás qué sale cada día." />
      ) : (
        <>
          {todays.map((p) => (
            <Link key={p.id} to={`/validar/${p.id}`} className="relative overflow-hidden bg-pink-fill rounded-[24px] p-[18px] flex gap-3.5 items-center text-white no-underline">
              <span aria-hidden className="absolute -right-10 -top-10 w-[140px] h-[140px] rounded-full border border-white/25" />
              <span className="w-16 h-[72px] rounded-[16px] bg-ink/35 flex flex-col items-center justify-center shrink-0">
                <span className="text-[11px] font-extrabold">HOY</span>
                <span className="font-display font-bold text-[22px]">{parseDay(p.fecha).getDate()}</span>
              </span>
              <span className="relative flex flex-col gap-1 min-w-0">
                <span className="text-xs font-extrabold tracking-[0.08em] uppercase">Sale hoy{p.publicada_at ? ` · ${new Date(p.publicada_at).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}` : ''}</span>
                <span className="text-[15px] font-extrabold leading-snug">{p.topico_angulo}</span>
                <span className="text-xs font-bold text-pink-soft">{networksOf(p)}</span>
              </span>
            </Link>
          ))}

          <div className="grid grid-cols-3 gap-2">
            <Card className="!p-3"><p className="m-0 font-display font-bold text-xl">{thisMonth.length}</p><p className="m-0 text-[11px] font-bold text-text-3">por salir en {monthName(monthOf(today)).toLowerCase().slice(0, 3)}</p></Card>
            <Card className="!p-3"><p className="m-0 font-display font-bold text-xl">{scheduled}</p><p className="m-0 text-[11px] font-bold text-text-3">ya programadas</p></Card>
            <Card className="!p-3"><p className={`m-0 font-display font-bold text-xl ${waiting ? 'text-pink-text' : ''}`}>{waiting}</p><p className="m-0 text-[11px] font-bold text-text-3">esperan tu visto</p></Card>
          </div>

          <div className="flex flex-col gap-3">
            {later.map((p) => (
              <Link key={p.id} to={pieceStage(p) === 'revision' ? '/validar' : `/validar/${p.id}`} className="flex gap-3 text-white no-underline">
                <span className="w-11 shrink-0 flex flex-col items-center pt-2.5">
                  <span className="text-[10px] font-extrabold text-text-3">{weekdayShort(p.fecha)}</span>
                  <span className="font-display font-bold text-lg">{parseDay(p.fecha).getDate()}</span>
                </span>
                <span className="flex-1 min-w-0 bg-card border border-edge rounded-[20px] p-3 flex flex-col gap-1.5 active:bg-raised transition">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-3 truncate">{p.publicada_at ? `${new Date(p.publicada_at).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })} · ` : ''}{p.formato}</span>
                    {AGENDA_CHIP[pieceStage(p)]}
                  </span>
                  <span className="text-sm font-extrabold leading-snug">{p.topico_angulo}</span>
                  {networksOf(p) && <span className="text-xs text-text-3">{networksOf(p)}</span>}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
};

// ---------------------------------------------------------------- Publicadas

function usePublishedMonth() {
  const [params, setParams] = useSearchParams();
  const { data } = usePieces();
  const published = (data ?? []).filter((p) => pieceStage(p) === 'publicada');
  const asked = params.get('mes');
  const month = asked && /^\d{4}-\d{2}$/.test(asked) ? asked : published.length ? monthOf(published[published.length - 1].fecha) : monthOf(todayISO());
  return { month, go: (d: number) => setParams({ mes: shiftMonth(month, d) }, { replace: true }) };
}

export interface MonthStats {
  pieces: ContentPiece[];
  byPiece: Map<string, ReturnType<typeof sumMetrics> & { url: string | null }>;
  totals: ReturnType<typeof sumMetrics>;
  avgInter: number;
  avgSaved: number;
  rivals: { name: string; n: number; me?: boolean }[];
}

/** The month's published pieces with their numbers, shared by Publicadas and the piece detail. */
export function useMonthStats(month: string) {
  const pieces = usePieces();
  const results = useResults(month);
  const stats = useMemo<MonthStats | null>(() => {
    if (!pieces.data || !results.data) return null;
    const list = pieces.data.filter((p) => p.fecha.startsWith(month) && pieceStage(p) === 'publicada');
    const byPiece = new Map<string, ReturnType<typeof sumMetrics> & { url: string | null }>();
    list.forEach((p) => {
      const rows = results.data.metrics.filter((m) => m.piece_id === p.id);
      if (rows.length) byPiece.set(p.id, { ...sumMetrics(rows), url: rows.find((r) => r.red === 'instagram')?.post_url ?? rows[0].post_url });
    });
    const measured = list.filter((p) => byPiece.has(p.id));
    const totals = sumMetrics(results.data.metrics.filter((m) => measured.some((p) => p.id === m.piece_id)));
    const ig = results.data.metrics.filter((m) => m.red === 'instagram' && measured.some((p) => p.id === m.piece_id));
    const avgInter = ig.length ? Math.round(ig.reduce((s, m) => s + (m.likes ?? 0) + (m.comentarios ?? 0), 0) / ig.length) : 0;
    const avgSaved = measured.length ? totals.guardados / measured.length : 0;
    const rivals = results.data.competitors
      .filter((c) => c.red === 'instagram' && c.interacciones_prom != null)
      .map((c) => ({ name: `@${c.competidor.replace(/^@/, '')}`, n: Math.round(c.interacciones_prom!) }));
    const all = ig.length ? [{ name: 'Tú', n: avgInter, me: true }, ...rivals] : rivals;
    return { pieces: measured, byPiece, totals, avgInter, avgSaved, rivals: all.sort((a, b) => b.n - a.n) };
  }, [pieces.data, results.data, month]);
  return { stats, isLoading: pieces.isLoading || results.isLoading, error: pieces.error ?? results.error, refetch: () => { pieces.refetch(); results.refetch(); } };
}

function rivalHeadline(rivals: MonthStats['rivals']): string | null {
  const me = rivals.find((r) => r.me);
  const others = rivals.filter((r) => !r.me);
  if (!me || others.length === 0) return null;
  const beaten = others.filter((r) => me.n > r.n).length;
  if (beaten === others.length) return others.length === 1 ? `Superaste a ${others[0].name}` : `Superaste a tus ${others.length} competidores`;
  const top = others[0];
  if (beaten === 0) return me.n >= top.n * 0.8 ? `Estás cerca de ${top.name}` : `${top.name} va adelante este mes`;
  return `Superaste a ${beaten} de tus ${others.length} competidores`;
}

export const PublicadasScreen: React.FC = () => {
  const { month, go } = usePublishedMonth();
  const { stats, isLoading, error, refetch } = useMonthStats(month);
  const search = `?mes=${month}`;
  const action = (
    <div className="flex items-center gap-0.5 bg-card border border-edge rounded-[14px] p-0.5">
      <button type="button" aria-label="Mes anterior" onClick={() => go(-1)} className="w-9 h-10 flex items-center justify-center text-text-2"><ChevronLeft size={18} strokeWidth={2.5} /></button>
      <span className="text-[13px] font-extrabold min-w-[78px] text-center">{monthName(month)}</span>
      <button type="button" aria-label="Mes siguiente" onClick={() => go(1)} className="w-9 h-10 flex items-center justify-center text-text-2"><ChevronRight size={18} strokeWidth={2.5} /></button>
    </div>
  );

  if (isLoading) return <Screen title="Resultados" action={action}><Segmented label="Vista de resultados" items={views(search)} /><Loading /></Screen>;
  if (error || !stats) return <Screen title="Resultados" action={action}><ErrorState message={error?.message ?? 'No se pudieron cargar los resultados.'} onRetry={refetch} /></Screen>;

  const { pieces, byPiece, totals, avgSaved, rivals } = stats;
  const best = [...pieces].sort((a, b) => (byPiece.get(b.id)?.interacciones ?? 0) - (byPiece.get(a.id)?.interacciones ?? 0))[0];
  const bestStats = best ? byPiece.get(best.id) : undefined;
  const headline = rivalHeadline(rivals);
  const max = Math.max(1, ...rivals.map((r) => r.n));

  return (
    <Screen title="Resultados" action={action}>
      <Segmented label="Vista de resultados" items={views(search)} />
      {pieces.length === 0 ? (
        <EmptyState icon={<ChartColumn size={26} />} title={`Sin resultados en ${monthName(month).toLowerCase()}`} text="Los resultados de cada publicación llegan unos días después de que sale." />
      ) : (
        <>
          <section className="flex flex-col gap-1.5 px-0.5 pt-1 pb-1.5">
            <h2 className="eyebrow m-0">Alcance del mes</h2>
            <p className="m-0 font-display font-bold text-5xl leading-none">{fmt(totals.alcance)}</p>
            <p className="m-0 text-sm leading-snug text-text-2">cuentas vieron tus <strong className="text-white">{pieces.length} {pieces.length === 1 ? 'publicación' : 'publicaciones'}</strong> de {monthName(month).toLowerCase()}.</p>
          </section>

          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Heart size={18} />, n: fmt(totals.interacciones), label: 'Interacciones' },
              { icon: <Bookmark size={18} />, n: fmt(totals.guardados), label: 'Guardados' },
              { icon: <Send size={18} />, n: fmt(totals.compartidos), label: 'Compartidos' },
              { icon: <UserPlus size={18} />, n: `+${fmt(totals.nuevos_seguidores)}`, label: 'Nuevos seguidores' },
            ].map((k) => (
              <Card key={k.label} className="!p-3.5 flex flex-col gap-1">
                <span className="text-pink-text">{k.icon}</span>
                <span className="font-display font-bold text-[22px] mt-1">{k.n}</span>
                <span className="text-xs font-bold text-text-3">{k.label}</span>
              </Card>
            ))}
          </div>

          {rivals.length > 1 && (
            <Card className="flex flex-col gap-3.5">
              <div>
                <h2 className="eyebrow m-0">Tú vs tu competencia</h2>
                {headline && <p className="m-0 mt-2 font-display font-bold text-lg leading-tight">{headline}<Dot /></p>}
                <p className="m-0 mt-1.5 text-xs text-text-3">Likes + comentarios por publicación en Instagram.</p>
              </div>
              {rivals.map((r) => (
                <div key={r.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[13px]"><span className={r.me ? 'font-extrabold' : 'font-bold text-text-2'}>{r.name}</span><span className="font-extrabold">{fmt(r.n)}</span></div>
                  <div className="h-3 rounded-full bg-ink"><div className={`h-3 rounded-full ${r.me ? 'bg-pink' : 'bg-mute'}`} style={{ width: `${Math.max(4, Math.round((r.n / max) * 100))}%` }} /></div>
                </div>
              ))}
            </Card>
          )}

          {best && bestStats && (
            <Link to={`/resultados/${best.id}${search}`} className="bg-card border border-edge rounded-[24px] p-2 flex gap-3 text-white no-underline">
              <span className="relative w-[104px] h-32 rounded-[18px] bg-raised overflow-hidden shrink-0">
                {finalAssets(best)[0] && <img src={finalAssets(best)[0]} alt="" className="w-full h-full object-cover" />}
                <span className="absolute left-2 top-2 h-6 px-2 rounded-full bg-pink-fill text-[11px] font-extrabold inline-flex items-center gap-1"><Star size={11} fill="currentColor" />La mejor</span>
              </span>
              <span className="flex-1 min-w-0 py-1.5 pr-1.5 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-text-3">{best.formato} · {formatDay(best.fecha)}</span>
                <span className="text-[15px] font-extrabold leading-snug">{best.topico_angulo}</span>
                <span className="text-[13px] leading-snug text-text-2">{bestLine(bestStats, avgSaved)}</span>
              </span>
            </Link>
          )}

          <Section title="Todas las publicadas">
            {pieces.map((p) => {
              const s = byPiece.get(p.id)!;
              return (
                <Link key={p.id} to={`/resultados/${p.id}${search}`} className="bg-card border border-edge rounded-[20px] p-2.5 flex gap-3 items-center text-white no-underline active:bg-raised transition">
                  <span className="w-14 h-[68px] rounded-[14px] bg-raised overflow-hidden shrink-0">{finalAssets(p)[0] && <img src={finalAssets(p)[0]} alt="" className="w-full h-full object-cover" loading="lazy" />}</span>
                  <span className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-xs font-bold text-text-3">{p.formato} · {formatDay(p.fecha)}</span>
                    <span className="text-sm font-extrabold leading-snug">{p.topico_angulo}</span>
                    <span className="text-xs text-text-2"><strong className="text-white">{fmt(s.alcance)}</strong> alcance · <strong className="text-white">{fmt(s.interacciones)}</strong> interacciones</span>
                  </span>
                </Link>
              );
            })}
          </Section>
        </>
      )}
    </Screen>
  );
};

function bestLine(s: { guardados: number; interacciones: number }, avgSaved: number): string {
  if (avgSaved > 0 && s.guardados >= avgSaved * 1.5) {
    const x = s.guardados / avgSaved;
    return `${fmt(s.guardados)} guardados, ${x >= 2 ? 'más del doble de' : `${x.toFixed(1)} veces`} tu promedio: la gente la quiere tener a mano.`;
  }
  return `${fmt(s.interacciones)} interacciones, la que más conversación generó este mes.`;
}
