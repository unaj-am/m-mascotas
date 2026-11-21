import type { Walker } from '../../../../core/domain/entities/walker';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export function selectWalkers(walkers: readonly Walker[], uid: string | null, selected: Walker | null, search: string) {
  const available = walkers.filter((walker) => walker.userId !== uid);
  const current = selected ? available.find((walker) => walker.userId === selected.userId) : null;
  const query = normalize(search);
  const visible = available.filter((walker) => normalize(`${walker.serviceArea} ${walker.description}`).includes(query));
  return { available, current, visible };
}
