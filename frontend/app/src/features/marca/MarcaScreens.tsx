import React, { useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, ChevronRight, Clock, Download, FileText, MessageSquare, Search, Target } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { downloadMarketPdf, hasVoice, useBrand, useInterview, useMarket, useStrategyReview } from '@/lib/brand';
import { formatDay } from '@/lib/dates';
import { useStrategyIndex } from '@/lib/strategy';
import { Dot, ErrorState, Loading, Screen, StatusChip } from '@/ui';

export const WHATSAPP = 'https://wa.me/51949268607';

const Tile: React.FC<{ to: string; icon: React.ReactNode; accent?: boolean; title: string; detail: string; badge: React.ReactNode }> = ({ to, icon, accent, title, detail, badge }) => (
  <Link to={to} className="bg-card border border-edge rounded-[22px] p-4 flex flex-col gap-2.5 min-h-[150px] text-white no-underline active:bg-raised transition">
    <span className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${accent ? 'bg-pink/15 text-pink-text' : 'bg-raised text-text-2'}`}>{icon}</span>
    <span className="flex-1"><span className="block text-base font-extrabold">{title}</span><span className="block text-xs text-text-3 mt-0.5">{detail}</span></span>
    <span className="self-start">{badge}</span>
  </Link>
);

const revisionChip = (estado: string | undefined) =>
  estado === 'Aprobada' ? <StatusChip status="aprobada" /> : estado === 'Cambios solicitados' ? <StatusChip status="cambios" label="Cambios pedidos" /> : <StatusChip status="te-toca" />;

/** Marca: the brand's foundations, to look up (and approve the voice and the strategy). */
export const MarcaScreen: React.FC = () => {
  const { session } = useAuth();
  const brand = useBrand();
  const interview = useInterview();
  const review = useStrategyReview();
  const strategy = useStrategyIndex();
  const { study, findings } = useMarket();
  const [pdf, setPdf] = useState<'idle' | 'busy' | 'error'>('idle');

  if (brand.isLoading) return <Screen title="Marca"><Loading /></Screen>;
  if (brand.error) return <Screen title="Marca"><ErrorState message={brand.error.message} onRetry={() => brand.refetch()} /></Screen>;

  const voice = brand.data?.voice;
  const voiceReady = hasVoice(voice);
  const voiceState = voice?.voz_estado ?? 'Pendiente';
  const objectives = strategy.data?.objectives.length ?? 0;
  const concepts = strategy.data?.concepts.size ?? 0;
  const business = (interview.data?.data?.businessName as string | undefined) ?? brand.data?.name ?? 'Tu marca';
  const city = (interview.data?.data?.audience as { location?: string } | undefined)?.location ?? study.data?.ciudad;
  const competitors = study.data?.universo_competidores?.total_relevante_filtrado ?? study.data?.universo_competidores?.listado?.length;
  const lastFinding = findings.data?.[0]?.fecha;

  const pending = voiceReady && voiceState === 'Pendiente'
    ? { to: '/marca/voz', text: 'Revisa y aprueba tu voz de marca' }
    : objectives > 0 && review.data?.estado === 'Pendiente' ? { to: '/marca/estrategia', text: 'Revisa y aprueba tu estrategia' } : null;

  const getPdf = async () => {
    setPdf('busy');
    try { await downloadMarketPdf(session!.clientId!); setPdf('idle'); } catch { setPdf('error'); }
  };

  return (
    <Screen title="Marca" action={<Link to="/cuenta" aria-label="Tu cuenta" className="w-11 h-11 rounded-full border border-line bg-card flex items-center justify-center font-display font-bold text-[15px] text-white no-underline">{business.charAt(0).toUpperCase()}</Link>}>
      <section className="relative overflow-hidden bg-card border border-edge rounded-[28px] p-[22px] flex flex-col gap-3">
        <span aria-hidden className="absolute -right-[70px] -top-[70px] w-[220px] h-[220px] rounded-full border border-edge" />
        <span aria-hidden className="absolute -right-5 -top-5 w-[120px] h-[120px] rounded-full border border-edge" />
        <span aria-hidden className="absolute right-[38px] top-[38px] w-3 h-3 rounded-full bg-pink shadow-[0_0_0_7px_rgba(235,12,110,0.18)]" />
        <p className="eyebrow m-0 relative">{business}{city ? ` · ${city}` : ''}</p>
        {voiceReady && voice?.archetype ? (
          <>
            <h2 className="relative m-0 font-display font-bold text-[30px] leading-[1.02] max-w-[250px]">{voice.archetype}<Dot /></h2>
            {voice.arquetipo_razon && <p className="relative m-0 text-sm leading-relaxed text-text-2">{voice.arquetipo_razon}</p>}
            {!!voice.tone_traits?.length && (
              <div className="relative flex flex-wrap gap-1.5">
                {voice.tone_traits.map((t) => <span key={t.trait} className="inline-flex items-center h-7 px-2.5 rounded-full bg-edge text-xs font-extrabold">{t.trait}</span>)}
              </div>
            )}
          </>
        ) : (
          <p className="relative m-0 text-sm leading-relaxed text-text-2 max-w-[260px]">Aquí verás la personalidad de tu marca cuando el equipo termine tu voz.</p>
        )}
      </section>

      {pending && (
        <Link to={pending.to} className="bg-pink-fill rounded-[22px] p-4 flex gap-3.5 items-center text-white no-underline">
          <span className="w-11 h-11 rounded-[14px] bg-ink/30 flex items-center justify-center shrink-0"><Clock size={22} /></span>
          <span className="flex-1"><span className="block text-xs font-extrabold tracking-[0.08em] uppercase">Te toca</span><span className="block text-[15px] font-extrabold">{pending.text}</span></span>
          <ChevronRight size={20} strokeWidth={2.5} />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <Tile to="/marca/voz" icon={<MessageSquare size={20} />} accent={voiceReady && voiceState === 'Pendiente'} title="Voz" detail="Cómo habla tu marca"
          badge={voiceReady ? revisionChip(voiceState) : <span className="text-[11px] font-bold text-text-3">En preparación</span>} />
        <Tile to="/marca/estrategia" icon={<Target size={20} />} accent={objectives > 0 && review.data?.estado === 'Pendiente'} title="Estrategia"
          detail={objectives ? `${objectives} ${objectives === 1 ? 'objetivo' : 'objetivos'} · ${concepts} conceptos` : 'Tus objetivos y conceptos'}
          badge={objectives ? revisionChip(review.data?.estado) : <span className="text-[11px] font-bold text-text-3">En preparación</span>} />
        <Tile to="/marca/mercado" icon={<Search size={20} />} title="Mercado"
          detail={competitors ? `${competitors} competidores · ${findings.data?.length ?? 0} hallazgos` : 'Tu competencia y tu zona'}
          badge={lastFinding ? <span className="text-[11px] font-extrabold text-pink-text">Nuevo: {formatDay(lastFinding, { day: 'numeric', month: 'short' })}</span> : <span className="text-[11px] font-bold text-text-3">En preparación</span>} />
        <Tile to="/marca/ficha" icon={<FileText size={20} />} title="Ficha" detail="Tu negocio, como nos lo contaste" badge={<span className="text-[11px] font-bold text-text-3">Solo consulta</span>} />
      </div>

      {study.data && (
        <button type="button" onClick={getPdf} disabled={pdf === 'busy'} className="flex items-center gap-3.5 bg-card border border-edge rounded-[22px] px-4 py-3.5 text-left active:bg-raised transition disabled:opacity-60">
          <span className="w-11 h-11 rounded-[14px] bg-raised flex items-center justify-center shrink-0"><Download size={20} /></span>
          <span className="flex-1"><span className="block text-[15px] font-extrabold">{pdf === 'busy' ? 'Preparando el PDF…' : 'Estudio de mercado en PDF'}</span><span className={`block text-[13px] ${pdf === 'error' ? 'text-pink-text font-semibold' : 'text-text-3'}`}>{pdf === 'error' ? 'No se pudo descargar. Intenta de nuevo.' : 'Para guardarlo o compartirlo'}</span></span>
        </button>
      )}

      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3.5 border border-dashed border-line rounded-[22px] px-4 py-3.5 text-white no-underline">
        <span className="w-11 h-11 rounded-full bg-pink-fill flex items-center justify-center shrink-0 font-display font-extrabold text-sm">p.</span>
        <span className="flex-1"><span className="block text-[15px] font-extrabold">Tu equipo Pixely</span><span className="block text-[13px] text-text-3">Escríbenos por WhatsApp</span></span>
        <ArrowUpRight size={20} className="text-text-3" />
      </a>
    </Screen>
  );
};

