import React, { useEffect, useState } from 'react';
import { ArrowRight, Image as ImageIcon, Type, LayoutTemplate } from 'lucide-react';
import type { CambioTipo } from '@/lib/types';
import { Button, Sheet, TextArea } from '@/ui';

const TYPES: { value: CambioTipo; label: string; Icon: typeof ImageIcon }[] = [
  { value: 'imagen', label: 'Imagen', Icon: ImageIcon },
  { value: 'texto', label: 'Texto', Icon: Type },
  { value: 'ambos', label: 'Ambos', Icon: LayoutTemplate },
];

/**
 * "¿Qué cambiamos?". In Validar the client also says whether it's the image, the text or
 * both (each goes to a different person on the team). Quick suggestions fill the comment.
 */
export const ChangesSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSend: (comentario: string, tipo?: CambioTipo) => Promise<void> | void;
  withType?: boolean;
  suggestions?: string[];
  placeholder?: string;
  sending?: boolean;
}> = ({ open, onClose, onSend, withType = false, suggestions = [], placeholder, sending }) => {
  const [tipo, setTipo] = useState<CambioTipo | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setTipo(null); setText(''); setError(null); } }, [open]);

  const send = async () => {
    if (withType && !tipo) return setError('Elige qué hay que cambiar.');
    if (text.trim().length < 3) return setError('Cuéntanos qué cambiar, en una frase basta.');
    setError(null);
    try {
      await onSend(text.trim(), tipo ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar.');
    }
  };

  return (
    <Sheet open={open} title="¿Qué cambiamos?" onClose={onClose}>
      {withType && (
        <div role="radiogroup" aria-label="Qué hay que cambiar" className="grid grid-cols-3 gap-2.5">
          {TYPES.map(({ value, label, Icon }) => {
            const on = tipo === value;
            return (
              <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setTipo(value)}
                className={`h-[104px] rounded-[20px] flex flex-col items-center justify-center gap-2 transition ${on ? 'border-2 border-pink bg-pink/10 text-white' : 'border border-line bg-ink text-text-2'}`}>
                <Icon size={26} className={on ? 'text-pink-text' : ''} />
                <span className={`text-sm ${on ? 'font-extrabold' : 'font-bold'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      )}
      <TextArea label="Cuéntanos qué cambiar" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 -mt-1">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => setText((t) => (t.trim() ? `${t.trim()}. ${s}` : s))}
              className="h-9 px-3.5 rounded-full border border-line text-[13px] font-bold text-text-2 active:bg-raised">{s}</button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="m-0 text-[13px] font-semibold text-pink-text">{error}</p>}
      <Button block loading={sending} onClick={send} icon={!sending && <ArrowRight size={18} strokeWidth={2.5} />} className="flex-row-reverse">Enviar al equipo</Button>
      <p className="m-0 -mt-1 mb-1 text-center text-[13px] text-text-3">Te avisamos cuando esté corregida.</p>
    </Sheet>
  );
};
