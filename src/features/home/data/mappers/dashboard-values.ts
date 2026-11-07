export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid document');
  return value as Record<string, unknown>;
}
export const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export const nonnegative = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export const strings = (value: unknown): readonly string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
export const imageUrl = (value: unknown) => /^https:\/\//i.test(text(value)) ? text(value) : null;
export function timestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const milliseconds = Date.parse(value);
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    const milliseconds: unknown = value.toMillis();
    return typeof milliseconds === 'number' && Number.isFinite(milliseconds) ? milliseconds : null;
  }
  return null;
}
