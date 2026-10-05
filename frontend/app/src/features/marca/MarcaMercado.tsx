import React, { useState } from 'react';
import { Download, Megaphone, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { downloadMarketPdf, useMarket } from '@/lib/brand';
import { formatDay } from '@/lib/dates';
import { Button, Card, DetailScreen, Dot, EmptyState, ErrorState, Loading, Section } from '@/ui';

function money(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mil`;
  return String(n);
}

/** Mercado: market size, the latest from the competition, who has more reviews, and the PDF. */
export const MarcaMercado: React.FC = () => {
  const { session } = useAuth();
  const { study, findings } = useMarket();
  const [pdf, setPdf] = useState<'idle' | 'busy' | 'error'>('idle');

  if (study.isLoading) return <DetailScreen back="/marca"><Loading /></DetailScreen>;
  if (study.error) return <DetailScreen back="/marca"><ErrorState message={study.error.message} onRetry={() => study.refetch()} /></DetailScreen>;
  const s = study.data;
  const list = findings.data ?? [];
  if (!s && list.length === 0) return <DetailScreen back="/marca"><EmptyState icon={<Search size={26} />} title="Tu estudio está en preparación" text="El equipo está analizando tu competencia. Te avisamos cuando esté listo." /></DetailScreen>;

  const range = s?.tamano_mercado?.rango_estimado;
  const universe = s?.universo_competidores;
  const prices = (s?.dossier_profundo ?? []).map((d) => d.estadisticas_precio?.promedio).filter((n): n is number => typeof n === 'number');
  const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  const rank = [...(universe?.listado ?? [])].filter((c) => c.reseñas).sort((a, b) => (b.reseñas ?? 0) - (a.reseñas ?? 0)).slice(0, 5);
  const maxRev = Math.max(1, ...rank.map((c) => c.reseñas ?? 0));
  const latest = list[0]?.fecha;
  const recent = latest ? list.filter((f) => f.fecha === latest).length : 0;

  const getPdf = async () => {
    setPdf('busy');
    try { await downloadMarketPdf(session!.clientId!); setPdf('idle'); } catch { setPdf('error'); }
  };

  return (
    <DetailScreen back="/marca" right={latest ? <span className="text-xs font-bold text-text-3">Actualizado el {formatDay(latest, { day: 'numeric', month: 'short' })}</span> : undefined}
      footer={s ? (
        <div className="flex flex-col gap-1.5">
          <Button block loading={pdf === 'busy'} icon={<Download size={18} strokeWidth={2.5} />} onClick={getPdf}>Descargar estudio en PDF</Button>
          {pdf === 'error' && <p role="alert" className="m-0 text-center text-[13px] font-semibold text-pink-text">No se pudo descargar. Intenta de nuevo.</p>}
        </div>
      ) : undefined}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display font-bold text-[30px] leading-[1.04]">Tu mercado<Dot /></h1>
        {(s?.rubro || s?.ciudad) && <p className="m-0 text-sm text-text-2">{[s?.rubro, s?.ciudad].filter(Boolean).join(' · ')}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {range?.min != null && range?.max != null && (
          <Card className="col-span-2 !p-4">
            <p className="m-0 text-xs font-bold text-text-3">Tamaño del mercado {range.periodo === 'anual' ? 'al año' : ''}</p>
            <p className="m-0 mt-1.5 font-display font-bold text-[30px] leading-none">{range.moneda === 'PEN' || !range.moneda ? 'S/ ' : `${range.moneda} `}{money(range.min)}–{money(range.max)}</p>
            {s?.tamano_mercado?.cruce_de_metodos && <p className="m-0 mt-2 text-xs leading-snug text-text-2 line-clamp-3">{s.tamano_mercado.cruce_de_metodos}</p>}
          </Card>
        )}
        {universe?.total_relevante_filtrado != null && (
          <Card className="!p-4"><p className="m-0 font-display font-bold text-2xl">{universe.total_relevante_filtrado}{universe.total_detectado_maps ? <span className="text-sm text-text-3"> de {universe.total_detectado_maps}</span> : null}</p><p className="m-0 mt-1 text-xs font-bold text-text-3">competidores que importan</p></Card>
        )}
        {avgPrice != null && (
          <Card className="!p-4"><p className="m-0 font-display font-bold text-2xl">S/ {avgPrice}</p><p className="m-0 mt-1 text-xs font-bold text-text-3">precio promedio de la zona</p></Card>
        )}
      </div>

      {list.length > 0 && (
        <Section title="Lo último que vimos" action={recent ? <span className="text-xs font-bold text-pink-text">{recent} {recent === 1 ? 'nuevo' : 'nuevos'}</span> : undefined}>
          {list.slice(0, 8).map((f) => (
            <article key={f.id} className="bg-card border border-edge rounded-[22px] p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center gap-2">
                {f.cluster ? <span className="inline-flex items-center h-6 px-2 rounded-full bg-edge text-[11px] font-extrabold">{f.cluster}</span> : <span />}
                <span className="text-[11px] font-bold text-text-3 truncate">{[f.fuente, formatDay(f.fecha, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}</span>
              </div>
              {f.tema && <h3 className="m-0 text-[15px] font-extrabold leading-snug">{f.tema}</h3>}
              {f.dato_o_angulo && <p className="m-0 text-[13px] leading-relaxed text-text-2">{f.dato_o_angulo}</p>}
              {f.tipo_senal === 'Competidor-pagado' && <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-pink-text"><Megaphone size={13} />Lo está pagando en anuncios</span>}
            </article>
          ))}
        </Section>
      )}

      {rank.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="eyebrow m-0">Quién tiene más reseñas</h2>
          {rank.map((c) => (
            <div key={c.nombre} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px] gap-2"><span className="font-bold truncate">{c.nombre.replace(/\s*\(demo\)$/i, '')}</span><span className="text-text-2 shrink-0"><strong className="text-white">{c.reseñas}</strong>{c.rating ? ` · ★ ${c.rating.toFixed(1)}` : ''}</span></div>
              <div className="h-2 rounded-full bg-ink"><div className="h-2 rounded-full bg-pink" style={{ width: `${Math.round(((c.reseñas ?? 0) / maxRev) * 100)}%` }} /></div>
            </div>
          ))}
        </Card>
      )}
    </DetailScreen>
  );
};
