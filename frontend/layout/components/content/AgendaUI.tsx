/**
 * La vista de agenda compartida por Planificación, Validación y Publicaciones:
 * el mismo selector Calendario/Lista (recordado por navegador) y el mismo calendario del mes.
 */

import React, { useState } from 'react';
import { CalendarClock, CalendarDays, CheckCheck, List } from 'lucide-react';
import * as api from '../../services/api';
import { PieceCover, pieceStage, monthLabel, formatFecha, FORMATO_ICON } from './ContentPieceUI';

export type ChipStatus = { icon: React.ElementType; label: string; color?: string; muted?: boolean };

export type AgendaView = 'calendario' | 'lista';
const VIEW_KEY = 'pixely_publicaciones_vista';

const timeOf = (p: api.ContentPiece) =>
    p.publicada_at ? new Date(p.publicada_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' }) : null;

/** Calendar or list, remembered per browser (shared by Próximas and Publicadas). */
export function useAgendaView(): [AgendaView, (v: AgendaView) => void] {
    const [view, setView] = useState<AgendaView>(() => {
        try { return (localStorage.getItem(VIEW_KEY) as AgendaView) || 'calendario'; } catch { return 'calendario'; }
    });
    const choose = (v: AgendaView) => {
        setView(v);
        try { localStorage.setItem(VIEW_KEY, v); } catch { /* per-viewer convenience only */ }
    };
    return [view, choose];
}

export const ViewToggle: React.FC<{ view: AgendaView; onChange: (v: AgendaView) => void }> = ({ view, onChange }) => (
    <div className="inline-flex gap-1 bg-card border border-edge rounded-xl p-1" role="group" aria-label="Vista">
        {([['calendario', 'Calendario', CalendarDays], ['lista', 'Lista', List]] as [AgendaView, string, React.ElementType][]).map(([key, label, Icon]) => (
            <button key={key} onClick={() => onChange(key)} aria-pressed={view === key}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === key ? 'bg-raised text-white' : 'text-text-3 hover:bg-raised'}`}>
                <Icon size={14} /> {label}
            </button>
        ))}
    </div>
);

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** The month as a grid on tablet and up; on phones the same month as a list grouped by day. */
export const AgendaCalendar: React.FC<{
    month: string;
    pieces: api.ContentPiece[];
    onOpen: (p: api.ContentPiece) => void;
    /** Published view: what each day's chip says instead of its time (e.g. its reach). */
    chipMeta?: (p: api.ContentPiece) => React.ReactNode;
    /** Plan and review views: the piece's state on its chip (icon, word, color) instead of its time. */
    chipStatus?: (p: api.ContentPiece) => ChipStatus;
    summary?: React.ReactNode;
    emptyText?: string;
}> = ({ month, pieces, onOpen, chipMeta, chipStatus, summary, emptyText }) => {
    const [year, mon] = month.split('-').map(Number);
    const days = new Date(year, mon, 0).getDate();
    const lead = (new Date(year, mon - 1, 1).getDay() + 6) % 7; // Monday first
    const today = new Date();
    const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === mon - 1 && today.getDate() === d;
    const byDay = new Map<number, api.ContentPiece[]>();
    [...pieces].sort((a, b) => (a.publicada_at ?? a.fecha).localeCompare(b.publicada_at ?? b.fecha)).forEach((p) => {
        const d = Number(p.fecha.slice(8, 10));
        byDay.set(d, [...(byDay.get(d) ?? []), p]);
    });
    const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

    const Chip: React.FC<{ p: api.ContentPiece }> = ({ p }) => {
        const status = chipStatus?.(p);
        const done = status ? !!status.muted : !chipMeta && pieceStage(p) === 'publicada';
        const time = timeOf(p);
        const Icon = status?.icon ?? (done ? CheckCheck : p.formato ? FORMATO_ICON[p.formato] : CalendarClock);
        const label = status?.label ?? (done ? 'Publicada' : time ?? 'Por confirmar');
        return (
            <button onClick={() => onOpen(p)} title={`${p.topico_angulo ?? ''} · ${label}`}
                className={`w-full text-left flex items-start gap-1.5 rounded-lg border border-edge p-1 hover:shadow-sm transition-shadow ${done ? 'bg-raised opacity-70' : 'bg-card'}`}>
                <PieceCover piece={p} className="w-7 aspect-[4/5] rounded overflow-hidden shrink-0" compact />
                <span className="min-w-0">
                    {!chipMeta && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-text-3">
                            <Icon size={10} className="shrink-0" style={{ color: status?.color }} />
                            {label}
                        </span>
                    )}
                    <span className="block text-[11px] leading-tight text-white line-clamp-2">{p.topico_angulo || 'Pieza'}</span>
                    {chipMeta && <span className="block mt-0.5">{chipMeta(p)}</span>}
                </span>
            </button>
        );
    };

    return (
        <div className="bg-card rounded-3xl border border-edge shadow-sm p-4 md:p-6">
            <p className="text-sm text-text-3 mb-4">
                {summary ?? <>
                    {pieces.filter((p) => pieceStage(p) !== 'publicada').length} por salir en {monthLabel(month).toLowerCase()}
                    {pieces.some((p) => pieceStage(p) === 'publicada') && <> · las ya publicadas se ven en gris</>}
                </>}
            </p>
            <div className="hidden md:grid grid-cols-7 gap-px bg-raised rounded-2xl overflow-hidden border border-edge">
                {WEEKDAYS.map((d) => <div key={d} className="bg-raised px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-3">{d}</div>)}
                {cells.map((day, i) => (
                    <div key={i} className={`min-h-[104px] p-1.5 ${day ? 'bg-card' : 'bg-raised/60'}`}>
                        {day && (
                            <p className={`text-xs font-semibold mb-1 ${isToday(day) ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-raised text-white' : 'text-text-3'}`}>{day}</p>
                        )}
                        <div className="space-y-1">{(day ? byDay.get(day) ?? [] : []).map((p) => <Chip key={p.id} p={p} />)}</div>
                    </div>
                ))}
            </div>
            <ul className="md:hidden divide-y divide-edge">
                {[...byDay.entries()].map(([day, items]) => (
                    <li key={day} className="py-3 flex gap-3">
                        <span className="w-10 shrink-0 text-center">
                            <span className="block text-lg font-bold text-white leading-none">{day}</span>
                            <span className="block text-[10px] font-semibold uppercase text-text-3 mt-0.5">{formatFecha(items[0].fecha, { weekday: 'short' })}</span>
                        </span>
                        <span className="flex-1 space-y-1.5">{items.map((p) => <Chip key={p.id} p={p} />)}</span>
                    </li>
                ))}
                {byDay.size === 0 && <li className="py-6 text-center text-sm text-text-3">{emptyText ?? (chipMeta ? 'Nada publicado este mes.' : 'Nada programado este mes.')}</li>}
            </ul>
            {byDay.size === 0 && <p className="hidden md:block mt-3 text-sm text-text-3 text-center">{emptyText ?? (chipMeta ? 'Nada publicado este mes.' : 'Nada programado este mes.')}</p>}
        </div>
    );
};

