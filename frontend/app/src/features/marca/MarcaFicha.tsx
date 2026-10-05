import React from 'react';
import { FileText, MessageCircle } from 'lucide-react';
import { useInterview } from '@/lib/brand';
import { formatDay } from '@/lib/dates';
import { DetailScreen, Dot, EmptyState, ErrorState, Loading, Section } from '@/ui';
import { WHATSAPP } from './MarcaScreens';

/** Spanish names for the interview's fields. Anything not listed is shown with a readable version of its key. */
const LABELS: Record<string, string> = {
  businessName: 'Nombre', history: 'Historia', differentiator: 'Lo que los diferencia', vision: 'Visión', mission: 'Misión', values: 'Valores',
  audience: 'Tu cliente', ageRange: 'Edad', gender: 'Género', location: 'Zona', occupation: 'Ocupación', painPoints: 'Lo que le duele', incomeLevel: 'Nivel de ingresos',
  priceSensitivity: 'Sensibilidad al precio', frequency: 'Frecuencia', loyalty: 'Lealtad', idealPersona: 'Cliente ideal', antiPersona: 'Cliente que no buscamos',
  market: 'Tu mercado', priceRange: 'Rango de precios', promotions: 'Promociones', channels: 'Canales de venta', bestSellers: 'Lo más vendido', competitors: 'Competidores',
  brand: 'Tus redes', socialNetworks: 'Redes', socialManager: 'Quién las maneja', adsExperience: 'Experiencia con anuncios', bestContent: 'Lo que mejor funciona',
  platform: 'Red', link: 'Enlace', url: 'Enlace', name: 'Nombre',
  goals: 'Tus metas', salesGoals: 'Ventas', brandGoals: 'Marca', growthStrategy: 'Crecimiento', positioning: 'Posicionamiento',
};
const SECTIONS: { key: string | null; title: string; fields?: string[] }[] = [
  { key: null, title: 'Tu negocio', fields: ['businessName', 'history', 'differentiator', 'vision', 'mission', 'values'] },
  { key: 'audience', title: 'Tu cliente' },
  { key: 'market', title: 'Tu mercado' },
  { key: 'brand', title: 'Tus redes' },
  { key: 'goals', title: 'Tus metas' },
];
const HIDDEN = new Set(['attached_file_name']);

const label = (k: string) => LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

function Value({ v }: { v: unknown }): React.ReactElement | null {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
      return <span className="flex flex-wrap gap-1.5 mt-1">{v.map((x) => <span key={String(x)} className="inline-flex items-center min-h-7 px-2.5 py-1 rounded-full bg-raised text-xs font-bold text-text-soft">{String(x)}</span>)}</span>;
    }
    return <span className="flex flex-col gap-2 mt-1">{v.map((x, i) => <span key={i} className="block bg-ink rounded-[14px] p-3"><Value v={x} /></span>)}</span>;
  }
  if (typeof v === 'object') {
    return <span className="flex flex-col gap-1">{Object.entries(v as Record<string, unknown>).filter(([, x]) => x != null && x !== '').map(([k, x]) => (
      <span key={k} className="block text-[13px] leading-snug text-text-2"><strong className="text-white">{label(k)}:</strong> {typeof x === 'object' ? <Value v={x} /> : String(x)}</span>
    ))}</span>;
  }
  return <span className="block text-[15px] leading-relaxed text-text-soft whitespace-pre-line">{String(v)}</span>;
}

/** Ficha: the business as the client told it, to look up. Changes go through the team. */
export const MarcaFicha: React.FC = () => {
  const { data, isLoading, error, refetch } = useInterview();
  if (isLoading) return <DetailScreen back="/marca"><Loading /></DetailScreen>;
  if (error) return <DetailScreen back="/marca"><ErrorState message={error.message} onRetry={() => refetch()} /></DetailScreen>;
  const d = data?.data ?? {};
  if (Object.keys(d).length === 0) return <DetailScreen back="/marca"><EmptyState icon={<FileText size={26} />} title="Tu ficha aún está vacía" text="La completamos juntos en nuestra primera reunión." /></DetailScreen>;

  const used = new Set<string>();
  const blocks = SECTIONS.map((s) => {
    const source = s.key ? (d[s.key] as Record<string, unknown> | undefined) : d;
    if (!source || typeof source !== 'object') return null;
    const keys = s.fields ?? Object.keys(source);
    if (s.key) used.add(s.key); else keys.forEach((k) => used.add(k));
    const rows = keys.filter((k) => !HIDDEN.has(k) && source[k] != null && source[k] !== '' && !(Array.isArray(source[k]) && (source[k] as unknown[]).length === 0));
    return rows.length ? { title: s.title, rows: rows.map((k) => ({ k, v: source[k] })) } : null;
  }).filter(Boolean) as { title: string; rows: { k: string; v: unknown }[] }[];
  const extra = Object.keys(d).filter((k) => !used.has(k) && !HIDDEN.has(k) && d[k] != null && d[k] !== '');

  return (
    <DetailScreen back="/marca" right={data?.updated_at ? <span className="text-xs font-bold text-text-3">Al {formatDay(data.updated_at.slice(0, 10), { day: 'numeric', month: 'short' })}</span> : undefined}>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display font-bold text-[30px] leading-[1.04]">Tu ficha<Dot /></h1>
        <p className="m-0 text-sm text-text-2">Tu negocio, como nos lo contaste. De aquí parte todo lo que hacemos.</p>
      </div>
      {blocks.map((b) => (
        <Section key={b.title} title={b.title}>
          <div className="bg-card border border-edge rounded-[22px] p-4 flex flex-col gap-3.5">
            {b.rows.map(({ k, v }) => (
              <div key={k}>
                <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-text-3">{label(k)}</p>
                <div className="mt-1"><Value v={v} /></div>
              </div>
            ))}
          </div>
        </Section>
      ))}
      {extra.length > 0 && (
        <Section title="Más datos">
          <div className="bg-card border border-edge rounded-[22px] p-4 flex flex-col gap-3.5">
            {extra.map((k) => <div key={k}><p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-text-3">{label(k)}</p><div className="mt-1"><Value v={d[k]} /></div></div>)}
          </div>
        </Section>
      )}
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 py-1.5 text-sm font-extrabold text-pink-text no-underline">
        <MessageCircle size={18} /> ¿Algo cambió? Avísanos y la actualizamos
      </a>
    </DetailScreen>
  );
};
