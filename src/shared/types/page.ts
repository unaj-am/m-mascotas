export type Page<T> = Readonly<{ items: readonly T[]; nextCursor: string | null }>;
