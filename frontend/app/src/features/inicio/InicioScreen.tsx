import React, { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, Lightbulb, MessageSquare, Search, Target, SquareCheckBig } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { hasVoice, useBrand, useInterview, useMarket, useStrategyReview } from '@/lib/brand';
import { awaitsPlan, finalAssets, pieceStage, usePieces } from '@/lib/content';
import { daysUntil, formatDay, todayISO } from '@/lib/dates';
import { useStrategyIndex } from '@/lib/strategy';
import { Dot, ErrorState, ListRow, Loading, Section } from '@/ui';
import { networksOf } from '../validar/ValidarScreen';

interface Task { key: string; to: string; eyebrow: string; title: string; detail: string; icon: React.ReactNode; cta: string }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Inicio: in three seconds the client knows what to do. The most urgent thing they owe
 * goes in the pink card; the rest below; then what's coming out next.
 */
export const InicioScreen: React.FC = () => {
  const { session } = useAuth();
  const pieces = usePieces();
  const brand = useBrand();
  const review = useStrategyReview();
  const interview = useInterview();
  const { findings } = useMarket();
  const strategy = useStrategyIndex();

  const tasks = useMemo<Task[]>(() => {
    const list = pieces.data ?? [];
    const out: Task[] = [];
    const toReview = list.filter((p) => pieceStage(p) === 'revision').length;
    const ideas = list.filter(awaitsPlan);
    if (toReview) out.push({ key: 'validar', to: '/validar', eyebrow: 'Te toca a ti', title: `${plural(toReview, 'pieza espera', 'piezas esperan')} tu visto bueno`, detail: 'Apruébalas o pide cambios', icon: <SquareCheckBig size={22} />, cta: 'Revisar ahora' });
    if (ideas.length) {
      const month = new Date(`${ideas[0].fecha.slice(0, 7)}-01T12:00:00`).toLocaleDateString('es-PE', { month: 'long' }).toLowerCase();
      out.push({ key: 'plan', to: '/plan', eyebrow: 'Te toca a ti', title: `${plural(ideas.length, 'idea', 'ideas')} de ${month} por aprobar`, detail: 'Apruébalas una por una o todas juntas', icon: <Lightbulb size={22} />, cta: 'Ver las ideas' });
    }
    const voice = brand.data?.voice;
    if (hasVoice(voice) && (voice.voz_estado ?? 'Pendiente') === 'Pendiente') out.push({ key: 'voz', to: '/marca/voz', eyebrow: 'Te toca a ti', title: 'Revisa tu voz de marca', detail: 'Cómo hablará tu marca en cada publicación', icon: <MessageSquare size={22} />, cta: 'Ver mi voz' });
    if (review.data?.estado === 'Pendiente' && (strategy.data?.objectives.length ?? 0) > 0) out.push({ key: 'estrategia', to: '/marca/estrategia', eyebrow: 'Te toca a ti', title: 'Revisa tu estrategia', detail: 'Tus objetivos y de dónde nacen tus ideas', icon: <Target size={22} />, cta: 'Ver la estrategia' });
    return out;
  }, [pieces.data, brand.data, review.data, strategy.data]);

  const upcoming = useMemo(() => {
    const today = todayISO();
    return (pieces.data ?? [])
      .filter((p) => p.fecha.slice(0, 10) >= today && ['aprobada', 'programada'].includes(pieceStage(p)))
      .slice(0, 6);
  }, [pieces.data]);

  const fresh = (findings.data ?? []).filter((f) => daysUntil(f.fecha) >= -7);
  const business = typeof interview.data?.data?.businessName === 'string' ? (interview.data.data.businessName as string) : brand.data?.name;
  const name = session?.email.split('@')[0] ?? '';

  const [first, ...rest] = tasks;

  return (
    <div className="min-h-full px-5 pt-safe pb-36 lg:pb-14 flex flex-col gap-[18px]">
      <header className="pt-4 lg:pt-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-sm text-text-2 truncate">Hola{name ? `, ${name}` : ''}</p>
          <h1 className="m-0 mt-0.5 font-display font-bold text-2xl truncate">{business ?? 'Tu marca'}<Dot /></h1>
        </div>
        <Link to="/cuenta" aria-label="Tu cuenta" className="lg:hidden w-11 h-11 shrink-0 rounded-full border border-line bg-card flex items-center justify-center font-display font-bold text-[15px] text-white no-underline">
          {(business ?? session?.email ?? '?').charAt(0).toUpperCase()}
        </Link>
      </header>

      {pieces.isLoading ? <Loading /> : pieces.error ? <ErrorState message={pieces.error.message} onRetry={() => pieces.refetch()} /> : (
        <>
          {first ? (
            <Link to={first.to} className="relative overflow-hidden bg-pink-fill rounded-[28px] p-[22px] flex flex-col gap-3.5 text-white no-underline">
              <span aria-hidden className="absolute -right-[50px] -top-[50px] w-[170px] h-[170px] rounded-full border border-white/25" />
              <span aria-hidden className="absolute -right-2.5 -top-2.5 w-[90px] h-[90px] rounded-full border border-white/25" />
              <span className="text-xs font-extrabold tracking-[0.12em] uppercase">{first.eyebrow}</span>
              <span className="font-display font-bold text-[26px] leading-[1.08] pr-6">{first.title}</span>
              <span className="self-start h-12 px-5 rounded-[14px] bg-ink text-[15px] font-extrabold inline-flex items-center gap-2">{first.cta}<ArrowRight size={16} strokeWidth={2.5} /></span>
            </Link>
          ) : (
            <div className="bg-card border border-edge rounded-[28px] p-[22px] flex items-center gap-4">
              <span className="w-12 h-12 rounded-full bg-pink-fill flex items-center justify-center shrink-0"><Check size={24} strokeWidth={3} /></span>
              <span>
                <span className="block font-display font-bold text-xl">Estás al día<Dot /></span>
                <span className="block text-sm text-text-2 mt-1">Nada espera tu visto bueno. Te avisamos cuando llegue algo.</span>
              </span>
            </div>
          )}

          {(rest.length > 0 || fresh.length > 0) && (
            <div className="flex flex-col gap-2.5">
              {rest.map((t) => <ListRow key={t.key} to={t.to} icon={t.icon} accent title={t.title} detail={t.detail} />)}
              {fresh.length > 0 && <ListRow to="/marca/mercado" icon={<Search size={22} />} title="Mercado actualizado" detail={`${plural(fresh.length, 'hallazgo nuevo', 'hallazgos nuevos')} de tu competencia`} />}
            </div>
          )}

          <Section title="Lo próximo en salir" action={<Link to="/resultados" className="text-[13px] font-bold text-pink-text no-underline">Agenda</Link>}>
            {upcoming.length === 0 ? (
              <p className="m-0 text-sm text-text-3">Cuando apruebes piezas, aquí verás cuándo sale cada una.</p>
            ) : (
              <div className="-mx-5 px-5 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {upcoming.map((p) => {
                  const cover = finalAssets(p)[0];
                  return (
                    <Link key={p.id} to={`/validar/${p.id}`} className="w-[150px] shrink-0 bg-card border border-edge rounded-[22px] p-2 flex flex-col gap-2 text-white no-underline">
                      <span className="relative h-[110px] rounded-[16px] bg-raised overflow-hidden">
                        {cover && !/\.(mp4|mov|webm)/i.test(cover) && <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        <span className="absolute left-2 bottom-2 h-6 px-2 rounded-full bg-ink/75 text-[10px] font-extrabold inline-flex items-center">{p.formato ?? 'Pieza'}</span>
                      </span>
                      <span className="px-1 pb-1">
                        <span className="block text-[13px] font-extrabold">{formatDay(p.fecha)}</span>
                        <span className="block text-xs text-text-3 truncate">{networksOf(p) || 'Redes por definir'}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
};
