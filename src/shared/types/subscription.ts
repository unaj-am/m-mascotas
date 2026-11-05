import type { Result } from './result';

export type Unsubscribe = () => void;
export type Observer<T> = (result: Result<T>) => void;
