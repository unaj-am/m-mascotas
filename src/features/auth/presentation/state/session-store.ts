import { createStore } from 'zustand/vanilla';
import type { Session } from '../../../../core/domain/entities/session';
import type { AppError } from '../../../../shared/types/result';

export type SessionState =
  | Readonly<{ status: 'unconfigured' }>
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'error'; error: AppError }>
  | Session;

export const createSessionStore = () => createStore<{ session: SessionState }>()(() => ({
  session: { status: 'unconfigured' },
}));
export type SessionStore = ReturnType<typeof createSessionStore>;
