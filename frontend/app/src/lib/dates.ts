/** Dates are 'YYYY-MM-DD' / 'YYYY-MM' and read as local days, so Lima never shifts a day back. */

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const monthOf = (iso: string) => iso.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString('es-PE', { month: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  const s = parseDay(iso).toLocaleDateString('es-PE', opts).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** 'JUE' for the date tile. */
export function weekdayShort(iso: string): string {
  return parseDay(iso).toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
}

export function daysUntil(iso: string, today = todayISO()): number {
  return Math.round((parseDay(iso).getTime() - parseDay(today).getTime()) / 86_400_000);
}

/** "Sale hoy", "Sale mañana", "Sale en 3 días"… */
export function dueLabel(iso: string): { text: string; urgent: boolean } {
  const days = daysUntil(iso);
  if (days < 0) return { text: 'Su fecha ya pasó', urgent: true };
  if (days === 0) return { text: 'Sale hoy', urgent: true };
  if (days === 1) return { text: 'Sale mañana', urgent: true };
  if (days <= 3) return { text: `Sale en ${days} días`, urgent: true };
  return { text: `Sale el ${formatDay(iso, { day: 'numeric', month: 'short' })}`, urgent: false };
}

/** Monday-first index of the week of the month the day falls in (0 = first row). */
export function weekRow(iso: string): number {
  const d = parseDay(iso);
  const offset = (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7;
  return Math.floor((d.getDate() - 1 + offset) / 7);
}
