import React from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ArrowUpRight, Bookmark, Share2, Star, Users } from 'lucide-react';
import { finalAssets, usePieces } from '@/lib/content';
import { formatDay, monthOf } from '@/lib/dates';
import { fmt } from '@/lib/results';
import { pieceLinks, useStrategyIndex } from '@/lib/strategy';
import { DetailScreen, ErrorState, Loading, Section, Tag } from '@/ui';
import { PieceMedia } from '../shared/PieceMedia';
import { RutaEstrategica } from '../shared/RutaEstrategica';
import { useMonthStats } from './ResultadosScreens';

/** Resultados → una pieza: its numbers in plain words, compared with the month and the competition. */
export const ResultadosPieza: React.FC = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const pieces = usePieces();
  const piece = pieces.data?.find((p) => p.id === id);
  const month = params.get('mes') ?? (piece ? monthOf(piece.fecha) : '');
  const { stats, isLoading, error, refetch } = useMonthStats(month || '2000-01');
  const { data: index } = useStrategyIndex();
  const back = `/resultados/publicadas?mes=${month}`;

  if (pieces.isLoading || isLoading) return <DetailScreen back={back}><Loading /></DetailScreen>;
  if (error) return <DetailScreen back={back}><ErrorState message={error.message} onRetry={refetch} /></DetailScreen>;
  const s = piece ? stats?.byPiece.get(piece.id) : undefined;
  if (!piece || !s || !stats) return <DetailScreen back={back}><ErrorState message="Todavía no hay resultados de esta pieza." /></DetailScreen>;

  const isBest = [...stats.pieces].sort((a, b) => (stats.byPiece.get(b.id)?.interacciones ?? 0) - (stats.byPiece.get(a.id)?.interacciones ?? 0))[0]?.id === piece.id;
  const assets = finalAssets(piece);
  const likesComments = s.likes + s.comentarios;
  const topRival = stats.rivals.filter((r) => !r.me)[0];
  const links = pieceLinks(piece, index);

  const notes: { icon: React.ReactNode; text: React.ReactNode }[] = [];
  if (stats.avgSaved > 0 && s.guardados >= stats.avgSaved * 1.5) {
    notes.push({ icon: <Bookmark size={18} />, text: <><strong>{(s.guardados / stats.avgSaved).toFixed(1)} veces más guardados</strong> que tus publicaciones del mes. La gente la guarda para consultarla luego.</> });
  }
  if (topRival) {
    notes.push({ icon: <Users size={18} />, text: <><strong>{fmt(likesComments)} likes + comentarios</strong>, frente a {fmt(topRival.n)} por publicación de {topRival.name}, {likesComments >= topRival.n ? 'tu competidor más fuerte.' : 'tu competidor más fuerte este mes.'}</> });
  }

  const share = async () => {
    const url = s.url ?? assets[0];
    if (!url) return;
    try {
      if (navigator.share) await navigator.share({ title: piece.topico_angulo ?? 'Pixely', url });
      else await navigator.clipboard.writeText(url);
    } catch { /* closed */ }
  };

  const rows = [
    { label: 'Likes', n: fmt(s.likes) },
    { label: 'Comentarios', n: fmt(s.comentarios) },
    { label: 'Guardados', n: fmt(s.guardados), note: stats.avgSaved > 0 && s.guardados >= stats.avgSaved * 1.5 ? `${(s.guardados / stats.avgSaved).toFixed(1)}× tu promedio` : null },
    { label: 'Compartidos', n: fmt(s.compartidos) },
    { label: 'Nuevos seguidores', n: `+${fmt(s.nuevos_seguidores)}` },
  ];

  return (
    <DetailScreen back={back} right={(s.url || assets[0]) ? <button type="button" aria-label="Compartir" onClick={share} className="w-11 h-11 rounded-[14px] border border-line flex items-center justify-center"><Share2 size={19} /></button> : undefined}>
      <PieceMedia urls={assets} className="-mx-5 -mt-2 aspect-[4/5] max-h-[52vh]" />
      <div className="flex flex-col gap-2">
        <p className="m-0 text-xs font-bold text-text-3">{piece.formato} · Publicada {piece.publicada_at ? new Date(piece.publicada_at).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : formatDay(piece.fecha)}</p>
        <h1 className="m-0 font-display font-bold text-2xl leading-tight">{piece.topico_angulo}</h1>
        {isBest && <span className="self-start"><Tag tone="pink"><Star size={12} fill="currentColor" className="mr-1" />La mejor del mes</Tag></span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-edge rounded-[20px] p-4"><p className="m-0 text-xs font-bold text-text-3">Alcance</p><p className="m-0 mt-1.5 font-display font-bold text-[26px]">{fmt(s.alcance)}</p><p className="m-0 mt-0.5 text-xs text-text-2">cuentas la vieron</p></div>
        <div className="bg-card border border-edge rounded-[20px] p-4"><p className="m-0 text-xs font-bold text-text-3">Vistas</p><p className="m-0 mt-1.5 font-display font-bold text-[26px]">{fmt(s.vistas)}</p><p className="m-0 mt-0.5 text-xs text-text-2">veces se mostró</p></div>
      </div>

      <div className="bg-card border border-edge rounded-[24px] px-4 py-1.5">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex justify-between items-center py-3.5 ${i < rows.length - 1 ? 'border-b border-edge' : ''}`}>
            <span className="text-sm font-bold text-text-soft">{r.label}</span>
            <span className="flex items-center gap-2.5">{r.note && <span className="text-[11px] font-extrabold text-pink-text">{r.note}</span>}<span className="font-display font-bold">{r.n}</span></span>
          </div>
        ))}
      </div>

      {notes.length > 0 && (
        <Section title="Cómo le fue">
          <div className="bg-card border border-edge rounded-[24px] p-4 flex flex-col gap-3">
            {notes.map((n, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="w-9 h-9 rounded-[12px] bg-pink/15 text-pink-text flex items-center justify-center shrink-0">{n.icon}</span>
                <p className="m-0 text-sm leading-relaxed text-text-soft">{n.text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {s.url && (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="h-14 rounded-[16px] border border-line flex items-center justify-center gap-2 text-[15px] font-extrabold text-white no-underline">
          Ver la publicación <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      )}

      {links.length > 0 && (
        <Section title="Por qué la hicimos">
          <div className="bg-card border border-edge rounded-[22px] p-4"><RutaEstrategica links={links} /></div>
        </Section>
      )}
    </DetailScreen>
  );
};
