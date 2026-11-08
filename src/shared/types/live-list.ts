export type LiveList<T> = Readonly<{ items: readonly T[]; fromCache: boolean; pendingWrites: boolean }>;
