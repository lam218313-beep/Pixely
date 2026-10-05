import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { awaitsPlan, usePieces } from '@/lib/content';
import { monthOf, shiftMonth, todayISO } from '@/lib/dates';

/**
 * The month shown in Plan lives in the address (?mes=2026-11), so Ideas, Mezcla and an
 * idea all agree and the back button keeps it. With no month chosen: the first month that
 * has ideas waiting for the client, else this month.
 */
export function usePlanMonth() {
  const [params, setParams] = useSearchParams();
  const query = usePieces();
  const pieces = query.data ?? [];
  const asked = params.get('mes');

  const month = useMemo(() => {
    if (asked && /^\d{4}-\d{2}$/.test(asked)) return asked;
    const waiting = pieces.find(awaitsPlan);
    return waiting ? monthOf(waiting.fecha) : monthOf(todayISO());
  }, [asked, pieces]);

  const inMonth = useMemo(() => pieces.filter((p) => p.fecha.startsWith(month)), [pieces, month]);
  const go = (delta: number) => setParams({ mes: shiftMonth(month, delta) }, { replace: true });

  return { ...query, month, pieces: inMonth, go, search: `?mes=${month}` };
}
