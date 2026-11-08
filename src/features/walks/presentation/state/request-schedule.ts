/** Interpreta la fecha y hora locales sin aceptar fechas que Date normaliza silenciosamente. */
export function parseRequestSchedule(date: string, time: string): number {
  const day = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const hour = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!day || !hour) return NaN;
  const d = Number(day[1]), m = Number(day[2]), y = Number(day[3]), h = Number(hour[1]), minutes = Number(hour[2]);
  if (y < 2000 || m < 1 || m > 12 || d < 1 || h > 23 || minutes > 59) return NaN;
  const value = new Date(y, m - 1, d, h, minutes);
  return value.getFullYear() === y && value.getMonth() === m - 1 && value.getDate() === d && value.getHours() === h && value.getMinutes() === minutes ? value.getTime() : NaN;
}
